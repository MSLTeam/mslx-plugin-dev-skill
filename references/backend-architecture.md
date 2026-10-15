# MSLX 后端架构与 SDK 指南 (Backend Architecture & SDK)

> **核心目标**：指导 C# 后端开发者理解插件生命周期、正确映射 Controller 与 SignalR 路由、安全使用事件总线、长耗时任务池以及跨插件生态通信。
> 
> [!IMPORTANT]
> **官方实时文档优先**：接口签名、模型与 SDK 方法请以官方 LLM 知识库为最高准则：
> - 核心文档：[https://mslx.mslmc.cn/llms.txt](https://mslx.mslmc.cn/llms.txt)
> - 全量文档：[https://mslx.mslmc.cn/llms-full.txt](https://mslx.mslmc.cn/llms-full.txt)

---

## 1. 插件入口与生命周期 (`MSLXPluginEntry.cs`)

每个 MSLX 插件必须实现 `MSLX.SDK.IPlugin` 接口，并在文件顶部声明程序集扫描特性：

```csharp
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using MSLX.SDK;
using MSLX.SDK.Interfaces;

// 必须声明 ApplicationPart，否则宿主无法扫描注册插件中的 Controller
[assembly: ApplicationPart("MSLX.Plugin.MyAwesome")]

namespace MSLX.Plugin.MyAwesome;

public class MSLXPluginEntry : IPlugin
{
    public static MSLXPluginEntry Instance { get; private set; } = null!;

    public string Id => "mslx-plugin-my-awesome";
    public string Name => "示例插件";
    public string Description => "插件功能简介...";
    public string Version => "1.0.0";
    public string Icon => "icon.png";
    public string MinSDKVersion => "1.6.4";
    public string Developer => "开发者ID";
    public string AuthorUrl => "https://github.com/your-username";
    public string PluginUrl => "https://mslx-plugins.mslmc.net/plugins/mslx-plugin-my-awesome";

    public void OnPluginInitialize(IServiceProvider serviceProvider)
    {
        Instance = this;
        // 初始化专属数据目录
        string dataDir = this.Config().GetDataPath();
        if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
    }

    public void OnLoad()
    {
        SDK.MSLX.Logger.Info("[MyAwesome] 插件已加载，开始监听宿主事件...");
        // 订阅宿主事件
        SDK.MSLX.Events.OnBackupCompleted += HandleBackupCompleted;
    }

    public void OnUnload()
    {
        // 显式注销事件，释放资源
        SDK.MSLX.Events.OnBackupCompleted -= HandleBackupCompleted;
        SDK.MSLX.Logger.Info("[MyAwesome] 插件已安全卸载。");
    }

    public void OnRegisterServices(IServiceCollection services)
    {
        // 注册依赖注入服务
        services.AddSingleton<MyCustomService>();
    }

    public void OnRegisterEndpoints(IEndpointRouteBuilder endpoints)
    {
        // 注册 SignalR Hub 实时推送
        endpoints.MapHub<MyHub>("/api/hubs/plugin/mslx-plugin-my-awesome/stream");
    }

    private void HandleBackupCompleted(object? sender, SDK.Events.BackupCompletedEventArgs e)
    {
        // 必须异步执行，切勿阻塞宿主同步主线程
        Task.Run(async () =>
        {
            try
            {
                SDK.MSLX.Logger.Info($"[MyAwesome] 捕获到备份生成: {e.BackupFileName}");
            }
            catch (Exception ex)
            {
                SDK.MSLX.Logger.Error($"[MyAwesome] 处理异常: {ex.Message}");
            }
        });
    }
}
```

### 1.1 生命周期调用时序 (Lifecycle Order)
宿主加载与卸载插件时，严格按照以下次序调用 `IPlugin` 接口方法：
1. **`OnRegisterServices(IServiceCollection services)`**：宿主启动构建 IoC 容器阶段调用，用于向全局容器注册插件业务服务（如 Singleton/Scoped 服务）。
2. **`OnPluginInitialize(IServiceProvider serviceProvider)`**：宿主构建完成全局 `ServiceProvider` 后调用，用于保存插件单例、初始化插件私有数据目录或执行环境准备。
3. **`OnRegisterEndpoints(IEndpointRouteBuilder endpoints)`**：宿主映射 Web API 与路由端点时调用，用于挂载 Minimal API、SignalR Hub 等。
4. **`OnLoad()`**：插件正式挂载运行，在此处订阅全局事件总线（`SDK.MSLX.Events`）、启动后台监控或定时任务。
5. **`OnUnload()`**：插件卸载时调用，开发者应在此显式注销事件（`-=`）、停止后台循环任务并释放非托管资源。

> [!TIP]
> **宿主自动注销兜底机制**：除了在 `OnUnload()` 中手动注销事件外，宿主底层在卸载插件程序集时，会自动调用 `SDK.MSLX.Events.UnregisterPlugin(pluginAssembly)` 移除该插件注册的所有事件处理器，杜绝内存泄漏与悬挂引用。

---

## 2. API 控制器与路由规范

插件的 Controller 必须继承 `ControllerBase`，路由前缀受到统一网关管制：

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MSLX.Plugin.MyAwesome.Controllers;

[ApiController]
// 路由规范：必须以 api/plugins/{plugin-id}/ 为前缀
[Route("api/plugins/mslx-plugin-my-awesome/[controller]")]
public class ConfigController : ControllerBase
{
    [HttpGet]
    public IActionResult GetConfig()
    {
        return Ok(new { code = 200, data = new { enabled = true }, message = "成功" });
    }

    // 敏感操作必须强制声明 admin 角色鉴权
    [HttpPost]
    [Authorize(Roles = "admin")]
    public IActionResult UpdateConfig([FromBody] MyConfigDto dto)
    {
        return Ok(new { code = 200, message = "更新成功" });
    }
}
```

### 2.1 降权凭据授权与白名单特性 (AllowTokenScope)

在需要通过 URL Query 传递鉴权凭据的场景（例如地图切片图层、图片展示、大文件下载与长视频流播放），前端无法携带自定义 Header。为防范主 Token 泄露，宿主网关提供了降权凭据（Scoped Token）访问机制：

* **核心防护规则**：
  1. **只读拦截**：所有携带降权凭据的请求**严格仅允许 `GET` 与 `HEAD` 方法**，写操作（`POST`/`PUT`/`DELETE`）直接被网关拦截返回 403。
  2. **Scope 白名单校验**：端点方法必须使用 `[AllowTokenScope(...)]` 显式声明允许的凭据类型，否则网关默认拒绝访问。

```csharp
using Microsoft.AspNetCore.Mvc;
using MSLX.SDK.Attributes;
using MSLX.SDK.Constants;

namespace MSLX.Plugin.MyAwesome.Controllers;

[ApiController]
[Route("api/plugins/mslx-plugin-my-awesome/[controller]")]
public class MediaController : ControllerBase
{
    /// <summary>
    /// 地图瓦片切片/图片接口：允许 Media Token 访问 (24h长效、持久化缓存、强缓存命中)
    /// </summary>
    [HttpGet("tile/{z}/{x}/{y}")]
    [AllowTokenScope(TokenScopes.Media)]
    public IActionResult GetTile(int z, int x, int y)
    {
        // 返回地图切片图片流...
        return PhysicalFile(tilePath, "image/png");
    }

    /// <summary>
    /// 文件导出/备份打包下载接口：允许 Download Token 访问 (2h短效、标签页销毁、断点续传)
    /// </summary>
    [HttpGet("download")]
    [AllowTokenScope(TokenScopes.Download)]
    public IActionResult DownloadBackup([FromQuery] string file)
    {
        // 返回文件下载流...
        return PhysicalFile(filePath, "application/zip", file);
    }
}
```

---

## 3. 全局事件总线 (`SDK.MSLX.Events`)

MSLX 提供了完备的系统级生命周期钩子：

### 3.1 常用事件清单
| 事件分类 | 事件名 | 触发时机与关键数据 |
| :--- | :--- | :--- |
| **备份管理** | `OnBackupStarting`<br>`OnBackupCompleted`<br>`OnBackupFailed`<br>`OnBackupDeleted` | 备份前（支持 `e.Cancel = true` 拦截）、写入完成（附带大小、时间、路径）、失败告警、备份删除（`e.IsAutoRoll` 标记是否因超出份数自动滚动删除） |
| **服务器实例** | `OnServerStarting`<br>`OnServerStarted`<br>`OnServerStopping`<br>`OnServerStopped`<br>`OnServerCrashed` | 实例启动校验（支持 `e.Cancel` 拦截）、进程启动获得 PID、准备停止（附带 `e.StopCommand`）、完全退出（附带 `e.ExitCode` 与 `e.Uptime`）、崩溃非0告警 |
| **控制台指令** | `OnServerLogReceived`<br>`OnServerCommandExecuting` | 服务端日志输出监听（群服互通）、发送后台指令拦截（屏蔽危险 op） |
| **计划任务** | `OnTaskExecuting`<br>`OnTaskExecuted` | 宿主内部定时器触发追踪与结果监控（附带 `e.TaskId`, `e.TaskName`, `e.Success`） |
| **FRP 隧道** | `OnFrpStarting`<br>`OnFrpStarted`<br>`OnFrpStopping`<br>`OnFrpStopped`<br>`OnFrpLogReceived` | 穿透核心启动（附带配置）、进程 PID、准备停止、完全退出、代理建立日志流捕获 |

> [!WARNING]
> **绝对准则**：事件处理器内部耗时的文件读写、压缩或网络请求**必须转移到 `Task.Run`**，绝不能同步占用宿主触发线程。

---

## 4. 全局后台任务池与进度条 (`SDK.MSLX.Tasks`)

长时间运行的任务（如大文件云同步、整机导入导出）必须接入宿主任务池，直观在 WebPanel 右上角抽屉中呈现：

```csharp
// 1. 创建任务 (TaskType.Plugin 表示插件任务，instanceId 为 uint 类型，0 表示非特定实例)
var (task, token) = SDK.MSLX.Tasks.CreateTask(
    userId: "", 
    instanceId: 0u, 
    type: MSLX.SDK.Models.Files.TaskType.Plugin, 
    title: "正在备份数据至云端", 
    targetName: "backup.zip"
);

Task.Run(async () =>
{
    try
    {
        // 2. 更新进度百分比 (0-100) 与描述文字，支持指定 TaskState 状态（默认 TaskState.Running）
        SDK.MSLX.Tasks.UpdateProgress(task.Id, 25, "正在分片上传...", MSLX.SDK.Models.Files.TaskState.Running);
        await DoWorkAsync(token);

        SDK.MSLX.Tasks.UpdateProgress(task.Id, 100, "同步完成");
        // 3. 标记成功
        SDK.MSLX.Tasks.SetSuccess(task.Id, "云端备份已成功同步");
    }
    catch (OperationCanceledException)
    {
        SDK.MSLX.Tasks.SetFailed(task.Id, "任务已由用户手动取消");
    }
    catch (Exception ex)
    {
        // 4. 标记失败
        SDK.MSLX.Tasks.SetFailed(task.Id, $"任务异常失败: {ex.Message}");
    }
});
```

---

## 5. 插件专属配置读写与跨插件通信 (`IPluginConfigBridge`)

### 5.1 插件私有配置持久化 (`this.Config()`)
插件无需自行处理底层 JSON 文件流与路径拼凑，通过扩展方法 `this.Config()` 即可读写专属的配置数据：

```csharp
var myConfig = this.Config();

// 1. 读取单个键
var isAutoSync = myConfig.ReadConfigKey("AutoSync")?.Value<bool>() ?? false;

// 2. 写入单个键并持久化落盘
myConfig.WriteConfigKey("AutoSync", true);
myConfig.WriteConfigKey("LastSyncTime", DateTime.UtcNow.ToString("O"));

// 3. 读取完整配置为 JObject
var fullJson = myConfig.ReadConfig();

// 4. 批量修改后完整写回
fullJson["Version"] = "1.2.0";
myConfig.WriteConfig(fullJson);
```

### 5.2 跨插件解耦通信 (`SDK.MSLX.Config.GetPluginConfig`)
当需要检测或读取宿主安装的其他插件时，使用动态桥接，无需直接引用目标程序集：

```csharp
// 零耦合读取另一个插件 (例如 GFS 备份插件) 的配置
var gfsBridge = SDK.MSLX.Config.GetPluginConfig("mslx-plugin-gfs-backup");
if (gfsBridge != null)
{
    var rawConfig = gfsBridge.ReadConfigKey($"instance_gfs_config_{instanceId}");
    if (rawConfig != null)
    {
        SDK.MSLX.Logger.Info("检测到目标实例启用了 GFS 备份插件！");
    }
}
```

---

## 6. HTTP 网络客户端 (`SDK.MSLX.Http`)

插件无需自行引入 `HttpClient` 或第三方库，SDK 提供了轻量且自动管理连接池的 HTTP 客户端：

```csharp
// 1. GET 请求 (返回 PluginHttpResponse)
var getRes = await SDK.MSLX.Http.GetAsync("https://api.mslmc.cn/v3/query/notice");
if (getRes.IsSuccessStatusCode)
{
    // Content 为 string?，直接获取响应文本
    SDK.MSLX.Logger.Info($"状态码: {getRes.StatusCode}, 内容: {getRes.Content}");
    // 支持读取响应 Headers 与 Cookies 字典
    var serverHeader = getRes.Headers.GetValueOrDefault("Server");
}
else
{
    // 请求失败时，可通过 ResponseException 查看具体异常信息
    SDK.MSLX.Logger.Error($"请求失败 [{getRes.StatusCode}]: {getRes.ResponseException?.Message}");
}

// 2. POST 请求 (支持 Json / FormUrlEncoded / Text / Octet)
var postRes = await SDK.MSLX.Http.PostAsync(
    "https://api.example.com/webhook",
    PluginHttpContentType.Json,
    new { serverId = 1, status = "running" },
    headers: new Dictionary<string, string> { { "Authorization", "Bearer xxx" } },
    timeout: TimeSpan.FromSeconds(10)
);
```

---

## 7. 宿主核心配置桥接 (`SDK.MSLX.Config`)

通过 `SDK.MSLX.Config`，插件可直接读取或联动宿主的核心业务数据，无需自行读写 JSON 文件：

```csharp
// 1. 服务器实例列表 (Servers)
var serverList = SDK.MSLX.Config.Servers.GetServerList();
var specificServer = SDK.MSLX.Config.Servers.GetServer(serverId: 1);

// 2. 宿主主配置 (Main)
var mainObj = SDK.MSLX.Config.Main.ReadConfig();
var apiPort = SDK.MSLX.Config.Main.ReadConfigKey("Port");

// 3. FRP 穿透列表 (Frp)
var tunnels = SDK.MSLX.Config.Frp.GetFrpList();

// 4. 定时计划任务 (Tasks)
var tasks = SDK.MSLX.Config.Tasks.GetTasksByInstanceId(instanceId: 1);

// 5. 用户与权限查询 (Users)
var users = SDK.MSLX.Config.Users.GetAllUsers();
bool hasPerm = SDK.MSLX.Config.Users.HasResourcePermission(userId, "server", 1);

// 6. 全局 AppData 路径与独立数据目录
string appDataDir = SDK.MSLX.Config.GetAppDataPath();
string myPluginDir = this.Config().GetDataPath();
```

---

## 8. 端点安全与 Minimal API 降权访问 (`AllowTokenScope`)

在 `OnRegisterEndpoints` 注册自定义路由端点时，可配合 `AllowTokenScope` 声明细粒度的 Token 权限范围：

```csharp
public void OnRegisterEndpoints(IEndpointRouteBuilder endpoints)
{
    // 限制仅具有 'server:read' 权限范围的 Token 访问该端点
    endpoints.MapGet("/api/plugins/mslx-plugin-my-awesome/ping", () => "pong")
             .AllowTokenScope("server:read");
}
```

---

## 9. 核心工具与文件下载

* **文件下载管理器**：
  ```csharp
  var (success, errorMsg) = await SDK.MSLX.Downloader.DownloadFileAsync(
      url, 
      targetPath, 
      (progress, speed) => SDK.MSLX.Logger.Debug($"下载进度: {progress:F1}% [{speed}]")
  );
  ```
* **统一日志输出**：`SDK.MSLX.Logger.Info(...)` / `Warn(...)` / `Error(...)` / `Debug(...)`
