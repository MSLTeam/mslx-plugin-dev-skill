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
├── ILRepack.targets                    # 空 targets 文件 (用于屏蔽 NuGet 默认 target 避免重复执行)
└── MSLX.Plugin.MyAwesome.csproj        # 项目工程文件 (包含 MergeDependencies 合并任务)
```

---

## 3. 关键配置文件规范 (Critical Configurations)

### 3.1 C# 工程文件 (`MSLX.Plugin.MyAwesome.csproj`) 标杆模板
为了让插件能够将前端静态文件作为资源嵌入并合并所有第三方 NuGet 依赖，`.csproj` 必须包含以下配置：

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <!-- 1. 必须开启嵌入文件清单生成，否则宿主 ManifestEmbeddedFileProvider 无法定位前端产物 -->
    <GenerateEmbeddedFilesManifest>true</GenerateEmbeddedFilesManifest>
    <OutputType>Library</OutputType>
    <GenerateDependencyFile>false</GenerateDependencyFile>
    <DebugType>none</DebugType>
    <CopyLocalLockFileAssemblies>true</CopyLocalLockFileAssemblies>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="ILRepack.Lib.MSBuild.Task" Version="2.0.44.2">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Microsoft.Extensions.FileProviders.Embedded" Version="10.0.7" />
    <!-- 2. 关键：MSLX.SDK 必须声明 ExcludeAssets="runtime"，防止宿主核心库被 ILRepack 重复合并造成类型混淆 -->
    <PackageReference Include="MSLX.SDK" Version="1.6.4" ExcludeAssets="runtime"/>
  </ItemGroup>

  <ItemGroup>
    <!-- 3. 将前端构建产物作为嵌入式资源打入程序集 -->
    <EmbeddedResource Include="Frontend\dist\**\*" />
  </ItemGroup>

  <!-- 4. Release 构建时自动合并第三方依赖 DLL 为单个产物 -->
  <Target Name="MergeDependencies" AfterTargets="Build" Condition="'$(Configuration)' == 'Release'">
    <ItemGroup>
      <AllDlls Include="$(OutputPath)*.dll" />
      <DependenciesToMerge Include="@(AllDlls)" Exclude="$(OutputPath)$(AssemblyName).dll" />
      <FinalInputAssemblies Include="$(OutputPath)$(AssemblyName).dll" />
      <FinalInputAssemblies Include="@(DependenciesToMerge)" />

      <GarbageFiles Include="$(OutputPath)$(AssemblyName).staticwebassets.endpoints.json" />
      <GarbageFiles Include="$(OutputPath)appsettings*.json" />
      <GarbageFiles Include="$(OutputPath)$(AssemblyName).deps.json" />
    </ItemGroup>

    <ILRepack Condition="'@(DependenciesToMerge)' != ''" Parallel="true" Internalize="false" CopyAttributes="true" InputAssemblies="@(FinalInputAssemblies)" TargetKind="SameAsPrimaryAssembly" OutputFile="$(OutputPath)$(AssemblyName).dll" LibraryPath="$(OutputPath)" />

    <Delete Files="@(DependenciesToMerge)" Condition="'@(DependenciesToMerge)' != ''" />
    <Delete Files="@(GarbageFiles)" />
  </Target>

</Project>
```

> [!NOTE]
> 项目根目录下的 `ILRepack.targets` 应当保持为一个只包含空的 `<Project></Project>` 的文件。它的唯一用途是覆写 `ILRepack.Lib.MSBuild.Task` 包内置的自动化 Target，防止其与我们自定义的 `MergeDependencies` 重复执行。

### 3.2 前端构建配置 (`Frontend/vite.config.ts`) 标杆模板
宿主微前端加载器在启动时仅通过动态 `import` 加载单一 JS 入口（`/plugins/{id}/{version}/mslx-plugin-entry.js`），并不加载独立的 CSS 文件：

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import createExternal from 'vite-plugin-external';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  plugins: [
    // 1. 将公共库 external 排除，复用宿主全局提供的实例
    createExternal({
      externals: {
        vue: 'Vue',
        'vue-router': 'VueRouter',
        pinia: 'Pinia',
        'tdesign-vue-next': 'TDesign',
        'mslx-request': 'mslxRequest'
      }
    }),

    vue({
      template: { compilerOptions: { hoistStatic: false } }
    }),
    UnoCSS({
      mode: 'vue-scoped'
    }),
    // 2. 关键：必须注入 CSS 到 JS，否则组件样式将无法被宿主加载！
    cssInjectedByJsPlugin(),
  ],

  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/pluginEntry.ts'),
      name: 'MslxPlugin',
      formats: ['es'],
      // 3. 关键：产物文件名必须固定为 mslx-plugin-entry.js，严格匹配宿主扫描规则
      fileName: () => 'mslx-plugin-entry.js'
    },
    rollupOptions: {
      external: ['vue', 'vue-router', 'pinia', 'tdesign-vue-next', 'mslx-request'],
    }
  }
});
```

---

## 4. 本地开发与调试流程

### 4.1 前端热重载开发
进入 `Frontend` 目录：
```bash
cd Frontend
pnpm install

# 启动监听编译与预览服务 (端口 5001)
pnpm dev:plugin
```
* 在宿主 MSLX 插件管理中，将该插件配置为本地调试模式，即可实时看到前端代码修改。

### 4.2 后端编译与依赖合并
```bash
# 日常调试编译
dotnet build

# 生产环境发布打包 (Release)
dotnet build -c Release
```

### 4.3 产物分发
在 `Release` 构建完成后：
1. `Frontend/dist` 产物被作为 `EmbeddedResource` 直接编译进 C# 程序集。
2. `ILRepack` 会将引用的所有第三方 NuGet DLL 完整合入插件主程序集。
3. 输出目录 `bin/Release/net10.0/` 下生成独立的 `MSLX.Plugin.MyAwesome.dll` 单文件，将其放入 MSLX 守护进程的 `Plugins/` 目录即可部署。

---

## 5. 发布插件至 MSLX 官方插件市场

官方插件市场站点：[https://mslx-plugins.mslmc.net](https://mslx-plugins.mslmc.net)

### 5.1 提交流程
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
