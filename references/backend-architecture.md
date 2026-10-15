# MSLX 后端架构与 SDK 指南 (Backend Architecture & SDK)

> **核心目标**：指导 C# 后端开发者理解插件生命周期、正确映射 Controller 与 SignalR 路由、安全使用事件总线、长耗时任务池以及跨插件生态通信。

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

---

## 3. 全局事件总线 (`SDK.MSLX.Events`)

MSLX 提供了完备的系统级生命周期钩子：

### 3.1 常用事件清单
| 事件分类 | 事件名 | 触发时机与关键数据 |
| :--- | :--- | :--- |
| **备份管理** | `OnBackupStarting`<br>`OnBackupCompleted`<br>`OnBackupFailed` | 备份前（支持 `e.Cancel = true` 拦截）、写入完成（附带大小、时间、路径） |
| **服务器实例** | `OnServerStarting`<br>`OnServerStarted`<br>`OnServerStopped`<br>`OnServerCrashed` | 实例启动校验（支持 `e.Cancel` 拦截）、进程启动获得 PID、完全退出、崩溃非0告警 |
| **控制台指令** | `OnServerLogReceived`<br>`OnServerCommandExecuting` | 服务端日志输出监听（群服互通）、发送后台指令拦截（屏蔽危险 op） |
| **计划任务** | `OnTaskExecuting`<br>`OnTaskExecuted` | 宿主内部定时器触发追踪与结果监控 |
| **FRP 隧道** | `OnFrpStarting`<br>`OnFrpStarted`<br>`OnFrpStopped`<br>`OnFrpLogReceived` | 穿透核心启动、进程 PID、代理建立日志流捕获 |

> [!WARNING]
> **绝对准则**：事件处理器内部耗时的文件读写、压缩或网络请求**必须转移到 `Task.Run`**，绝不能同步占用宿主触发线程。

---

## 4. 全局后台任务池与进度条 (`SDK.MSLX.Tasks`)

长时间运行的任务（如大文件云同步、整机导入导出）必须接入宿主任务池，直观在 WebPanel 右上角抽屉中呈现：

```csharp
// 1. 创建任务 (TaskType.Plugin 表示插件任务)
var (task, token) = SDK.MSLX.Tasks.CreateTask(
    userId: "", 
    instanceId: 0, 
    type: MSLX.SDK.Models.Files.TaskType.Plugin, 
    title: "正在备份数据至云端", 
    targetName: "backup.zip"
);

Task.Run(async () =>
{
    try
    {
        // 2. 更新进度百分比 (0-100) 与描述文字
        SDK.MSLX.Tasks.UpdateProgress(task.Id, 25, "正在分片上传...");
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

## 5. 跨插件解耦通信 (`SDK.MSLX.Config.GetPluginConfig`)

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
// 1. GET 请求
var getRes = await SDK.MSLX.Http.GetAsync("https://api.mslmc.cn/v3/query/notice");
if (getRes.IsSuccessStatusCode)
{
    SDK.MSLX.Logger.Info($"收到响应: {getRes.Content}");
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
