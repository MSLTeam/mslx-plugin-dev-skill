using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using MSLX.SDK;
using MSLX.SDK.Events;
using MSLX.SDK.Interfaces;

// 必须声明 ApplicationPart，以便宿主发现并加载插件的 Controller
[assembly: ApplicationPart("MSLX.Plugin.Awesome")]

namespace MSLX.Plugin.Awesome;

public class MSLXPluginEntry : IPlugin
{
    public static MSLXPluginEntry Instance { get; private set; } = null!;

    public string Id => "mslx-plugin-awesome";
    public string Name => "我的超棒插件";
    public string Description => "基于 MSLX 全栈规范打造的生产级示例插件";
    public string Version => "1.0.0";
    public string Icon => "icon.png";
    public string MinSDKVersion => "1.6.4";
    public string Developer => "MSLTeam";
    public string AuthorUrl => "https://github.com/MSLTeam";
    public string PluginUrl => "https://mslx-plugins.mslmc.net/plugins/mslx-plugin-awesome";

    public void OnPluginInitialize(IServiceProvider serviceProvider)
    {
        Instance = this;
        SDK.MSLX.Logger.Info("[AwesomePlugin] 插件初始化中...");

        // 初始化专属数据沙箱目录
        string dataDir = this.Config().GetDataPath();
        if (!Directory.Exists(dataDir))
        {
            Directory.CreateDirectory(dataDir);
        }
    }

    public void OnLoad()
    {
        SDK.MSLX.Logger.Info("[AwesomePlugin] 插件加载完成，挂载事件总线...");

        // 监听宿主事件
        SDK.MSLX.Events.OnBackupCompleted += HandleBackupCompleted;
    }

    public void OnUnload()
    {
        // 显式释放资源并注销事件监听
        SDK.MSLX.Events.OnBackupCompleted -= HandleBackupCompleted;
        SDK.MSLX.Logger.Info("[AwesomePlugin] 插件已安全卸载。");
    }

    public void OnRegisterServices(IServiceCollection services)
    {
        // 注册业务依赖注入服务
    }

    public void OnRegisterEndpoints(IEndpointRouteBuilder endpoints)
    {
        // 映射 SignalR 或自定义端点
    }

    /// <summary>
    /// 事件处理方法：必须使用 Task.Run 异步转移至后台线程，避免阻塞宿主主执行流
    /// </summary>
    private void HandleBackupCompleted(object? sender, BackupCompletedEventArgs e)
    {
        Task.Run(async () =>
        {
            try
            {
                SDK.MSLX.Logger.Info($"[AwesomePlugin] 检测到实例 [{e.InstanceId}] 备份生成: {e.BackupFileName} ({e.FormattedSize})");
                // 模拟耗时处理...
                await Task.Delay(100);
            }
            catch (Exception ex)
            {
                SDK.MSLX.Logger.Error($"[AwesomePlugin] 处理备份事件异常: {ex.Message}");
            }
        });
    }

    /// <summary>
    /// 安全文件访问辅助方法：严格防范 ../../ 路径穿越
    /// </summary>
    public string GetSafeFilePath(string userFilename)
    {
        string sandboxBase = Path.GetFullPath(this.Config().GetDataPath());
        string targetPath = Path.GetFullPath(Path.Combine(sandboxBase, userFilename));

        if (!targetPath.StartsWith(sandboxBase, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException($"[安全拦截] 潜在的路径穿越攻击已阻止: {userFilename}");
        }

        return targetPath;
    }
}
