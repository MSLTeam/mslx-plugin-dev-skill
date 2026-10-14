# MSLX 插件脚手架与发布流程 (Scaffold & Publishing)

> **核心目标**：指导开发者使用官方脚手架模板创建标准工程，掌握 `ILRepack` 单文件打包机制，并将插件发布到 MSLX 官方插件市场。

---

## 1. 使用官方脚手架创建项目

为了避免手动创建时遗漏元数据、路由 404 或样式冲突，推荐使用官方 .NET CLI 模板：

### 1.1 安装脚手架模板
```bash
dotnet new install MSLX.Plugin.Templates
```

### 1.2 创建全新插件工程
```bash
dotnet new mslx-plugin -n MSLX.Plugin.MyAwesome \
  --plugin-id mslx-plugin-awesome \
  --plugin-name "示例插件" \
  --plugin-author "开发者名称" \
  --description "插件简短描述"
```

| 参数 | 说明 | 规范要求 |
| :--- | :--- | :--- |
| `-n, --name` | C# 程序集与项目名称 | PascalCase 命名，如 `MSLX.Plugin.Backup` |
| `--plugin-id` | 插件全局唯一标识 | 全小写中划线，**必须**以 `mslx-plugin-` 开头 |
| `--plugin-name`| 插件显示名称 | 中文友好名称，如 `云端备份同步` |
| `--plugin-author`| 开发者名称 | 您的开发者 ID |

---

## 2. 工程目录结构说明

生成的项目结构如下：
```text
MSLX.Plugin.MyAwesome/
├── Frontend/                           # 前端子工程 (Vue 3 + Vite + UnoCSS + TDesign)
│   ├── src/
│   │   ├── views/                      # 页面与弹窗组件 (必须使用 design-card)
│   │   ├── pluginEntry.ts              # 前端插件入口 (导出 routes 与 extensions)
│   │   └── App.vue
│   ├── package.json                    # 前端依赖配置 (name 必须与 plugin-id 一致)
│   ├── uno.config.ts                   # UnoCSS 配置 (preflight: false)
│   └── vite.config.ts                  # 构建与 external 排除配置
├── Controllers/                        # 后端 Web API 控制器
│   └── DemoController.cs
├── Services/                           # 后端业务逻辑与任务处理
├── MSLXPluginEntry.cs                  # C# 插件总入口 (生命周期与 DI 注册)
├── ILRepack.targets                    # ILRepack 单文件合并任务配置
└── MSLX.Plugin.MyAwesome.csproj        # 项目工程文件
```

---

## 3. 本地开发与调试流程

### 3.1 前端热重载开发
进入 `Frontend` 目录：
```bash
cd Frontend
pnpm install

# 启动监听编译与预览服务 (端口 5001)
pnpm dev:plugin
```
* 在宿主 MSLX 插件管理中，将该插件配置为本地调试模式，即可实时看到前端代码修改。

### 3.2 后端编译与依赖合并
```bash
# 日常调试编译
dotnet build

# 生产环境发布打包 (Release)
dotnet build -c Release
```

### 3.3 什么是 ILRepack 自动化单文件合并？
在 `Release` 模式下，项目内置的 MSBuild 任务会自动触发：
1. **前端产物内嵌**：`Frontend/dist/**` 的静态 JS/CSS 产物被作为 `EmbeddedResource` 直接编译进 C# 程序集。
2. **第三方依赖合并**：`ILRepack` 会将插件引用的第三方 NuGet DLL（例如七牛云、AWS SDK、SSH 库等）完整打包压入插件主 DLL 中。
3. **分发产物**：输出目录 `bin/Release/net10.0/` 下生成独立的 `.dll` 文件，将其直接放入 MSLX 插件目录即可完成部署。

---

## 4. 发布插件至 MSLX 官方插件市场

官方插件市场站点：[https://mslx-plugins.mslmc.net](https://mslx-plugins.mslmc.net)

### 4.1 提交流程
1. **登录授权**：访问市场首页，使用 MSL 用户中心账号登录。
2. **填写基本信息**：
   - 进入“插件管理 -> 插件发布”。
   - 填写插件 ID（必须与 `MSLXPluginEntry.cs` 中的 `Id` 完全一致，且以 `mslx-plugin-` 开头）。
   - 上传插件图标（如无专用图标，可填默认图标：`https://www.mslmc.cn/logo.png`）。
   - 编写 Markdown 介绍（支持贴图）。
3. **发布首个版本**：
   - 填写版本号（如 `1.0.0`，必须与代码元数据一致）。
   - 提供下载直链（可从 GitHub Releases 资产复制文件下载链接，**严禁使用网盘**）。
   - 编写更新日志。
4. **审核与上架**：
   - 提交后等待官方审核。审核通过后，MSLX 用户可在客户端“插件市场”中安装与更新。
   - 迭代新版本时，直接在插件详情中“发布新版”即可。
