---
name: mslx-plugin-dev
description: >-
  Comprehensive guide and rules for MSLX plugin full-stack development (.NET 10 C# backend + Vue 3/TDesign/UnoCSS frontend).
  Mandatory whenever developing, designing, refactoring, or auditing MSLX plugins.
  Prioritizes official live documentation (https://mslx.mslmc.cn/llms.txt & llms-full.txt) for all host APIs and SDK methods.
  Enforces strict reuse of the design-card visual system, dark mode & host theme opacity inheritance,
  responsive PC & mobile UX adaptation, zero-conflict CSS isolation, SDK event loop async safety, and security audits.
---

# MSLX 插件全栈开发与前端视觉规范 Skill

本指南是 MSLX 插件开发的**权威指导规范**。作为 AI Agent 或开发者，当编写、修改、重构或审查 MSLX 插件时，**必须严格遵循以下铁律与设计准则**。

> [!IMPORTANT]
> **最高优先准则：官方实时在线文档优先**
> 当涉及 MSLX 宿主后端 API、SDK 接口、模型结构、前端 Store 或路由调用时，**必须优先以官方实时在线文档为最高基准**：
> - 📄 **核心文档索引**：`https://mslx.mslmc.cn/llms.txt`
> - 📚 **全量开发者文档**：`https://mslx.mslmc.cn/llms-full.txt`
> - 🌐 **在线开发者手册**：`https://mslx.mslmc.cn/plugin-dev/`
> 
> 在编写具体业务逻辑或不确定参数时，AI Agent 应主动参考上述文档内容，避免臆造不存在的参数或方法。

---

## 核心开发准则 (Golden Rules)

### 0. 官方文档权威优先：接口与 SDK 必须对齐官方源
* 编写任何 Controller 路由、SignalR Hub、SDK 事件与配置方法时，必须优先以 `https://mslx.mslmc.cn/llms-full.txt` 及 `https://mslx.mslmc.cn/llms.txt` 中记录的最新方法签名为准，严禁凭空猜测宿主 API。

### 1. 宿主视觉融入：分场景排版与 TDesign 语义变量
MSLX 插件界面根据挂载场景分为**三大形态**，严禁混淆：
* **形态 A：独立页面与卡片插槽 (Card Views)**
  * 适用场景：单页路由（`/mslx-plugin-xxx`）、仪表盘插槽（`dashboard-index-after-system-status`）、设置页底部插槽（`settings-*-bottom`）。
  * **规范**：顶层容器**必须且只需**声明 `class="design-card relative flex flex-col rounded-2xl border border-[var(--td-component-border)] shadow-sm p-5 sm:p-6"`。宿主 WebPanel 布局引擎通过 `:deep(.design-card)` 会自动注入动态半透明底色与边框（亮色模式 `--comp-op-light`、暗色模式 `--comp-op-dark`）。**卡片容器本身无需手写任何背景色类（无需写 `bg-white` 或 `bg-[var(...)]`）**。
* **形态 B：弹窗与模态框 (Modal / Dialogs)**
  * 适用场景：控制台下拉弹窗（`instance-console-dropdown`）及页面内弹窗。
  * **规范**：以 `<t-dialog>` 为根容器，**严禁在弹窗外层包裹 `design-card`**；必须声明 `attach="body"`（防止被父级截断），宽度使用自适应 `width="min(580px, 92vw)"`。
* **形态 C：宿主选项卡面板 (Settings Tabs)**
  * 适用场景：实例设置侧边栏选项卡（`instance-settings-tab`）、穿透服务商切换页（`frp-create-provider`）。
  * **规范**：宿主弹窗内部已有统一背景和内边距，面板顶层容器使用扁平流式容器 `<div class="flex flex-col mx-auto w-full pb-8">`，**严禁外层嵌套 `design-card`**；使用小节标题条排版。
* **绝对杜绝硬编码白底**：**严禁**使用 `bg-white`、`#ffffff`、`style="background: white"`！在暗黑模式或用户自定义毛玻璃壁纸下，硬编码白底会导致灾难性的视觉割裂。
* **统一语义变量**：次级嵌套容器可使用 `bg-[var(--td-bg-color-secondarycontainer)]`，**严禁使用 UnoCSS 不支持的 `bg-[var(...)]/80` 斜杠透明度写法**；文本使用 `text-[var(--td-text-color-primary)]` 与 `text-[var(--td-text-color-secondary)]`，边框使用 `border-[var(--td-component-border)]`。
* **标准品牌标识条**：模块与小节标题栏左侧统一配置胶囊竖条（卡片主标题使用带柔和光晕版，Tab 面板内嵌小节标题使用扁平微型版 `w-1 h-4`）：
  ```html
  <div class="w-1.5 h-5 bg-[var(--color-primary)] rounded-full shadow-[0_0_8px_var(--color-primary-light)] opacity-90"></div>
  ```

### 2. 双端体验自适应：必须兼顾 PC 宽屏与手机端
* **头部栏自适应折叠**：头部操作区必须使用 `flex-col sm:flex-row sm:items-center justify-between gap-4`。移动端纵向堆叠，PC 端横向对齐。
* **表格防爆容器**：数据表格外层**必须**包裹 `<div class="overflow-x-auto">`，避免在手机屏幕上强行撑宽整个页面。
* **弹窗穿透与响应式宽度**：使用 `<t-dialog>` 必须配置 `attach="body"`，且弹窗宽度必须响应式设置 `width="min(580px, 92vw)"`。

### 3. 样式零污染与无冲突打包
* **Vue 样式强隔离**：组件所有 `<style>` **必须且只能**为 `<style scoped>`，严禁书写未隔离的全局选择器。
* **UnoCSS 安全预设**：`uno.config.ts` 中必须设置 `presetUno({ preflight: false })`，禁止开启预设 reset 污染宿主基础排版；`vite.config.ts` 必须配置 `UnoCSS({ mode: 'vue-scoped' })`。
* **CSS 注入与单文件打包**：`vite.config.ts` 必须配置 `vite-plugin-css-injected-by-js`（宿主仅加载 JS 文件），并且 `build.lib.fileName` 必须固定返回 `'mslx-plugin-entry.js'`。
* **路由命名唯一性**：路由 `name` 和 `path` 必须附带插件前缀（如 `name: 'MslxPluginDemoPage'`），避免覆盖宿主路由。
* **生命周期清理**：前端 `addEventListener` 与 `setInterval` 必须在 `onBeforeUnmount` 中注销；后端 C# 必须在 `OnUnload` 中释放资源。

### 4. SDK 事件循环防阻塞、HTTP 与多插件联动
* **事件异步化**：监听 `SDK.MSLX.Events`（如 `OnBackupCompleted`, `OnServerStarted`）时，事件处理器是在宿主主线程中同步调用的。**任何耗时 IO、文件压缩或网络请求必须使用 `Task.Run(async () => { ... })` 执行**，绝不允许阻塞宿主！
* **统一 HTTP 与工具库**：插件发起 HTTP 请求应优先复用轻量的 `SDK.MSLX.Http.GetAsync/PostAsync`，文件下载复用 `SDK.MSLX.Downloader.DownloadFileAsync`。
* **宿主配置桥接**：利用 `SDK.MSLX.Config` 提供的强类型桥梁（`Servers` 服务器列表、`Main` 主配置、`Frp` 穿透、`Tasks` 任务、`Users` 用户鉴权）与 `GetPluginConfig("目标插件Id")`，实现与宿主和其他插件的解耦联动。

### 5. 路径穿越与安全防线
* **数据目录沙箱**：插件文件 IO 必须以 `this.Config().GetDataPath()` 为唯一合法沙箱根目录。
* **路径逃逸防御**：拼接用户传入的文件名时，必须通过 `Path.GetFullPath(target).StartsWith(basePath)` 校验，严防 `../../` 路径穿越。
* **API 统一网关与鉴权**：Controller 路由统一为 `/api/plugins/{plugin-id}/...`，入口显式声明 `[assembly: ApplicationPart("程序集名称")]`，敏感管理接口添加 `[Authorize(Roles = "admin")]`。

---

## 常用开发命令

### 1. 脚手架与环境初始化
```bash
# 1. 安装官方 .NET 插件脚手架模板
dotnet new install MSLX.Plugin.Templates

# 2. 创建插件工程 (.NET 10)
dotnet new mslx-plugin -n MSLX.Plugin.MyDemo --plugin-id mslx-plugin-demo --plugin-name "示例插件" --plugin-author "开发者名称"

# 3. 前端热重载调试 (在插件 Frontend 目录下)
pnpm install
pnpm dev:plugin
```

### 2. 生产打包与依赖合并
```bash
# 后端构建并自动将 Frontend/dist 嵌入 DLL，通过 ILRepack 合并为单 DLL 文件
dotnet build -c Release
```

### 3. 自动化工程合规审计 (Pre-flight Audit)
```bash
# 在插件工程根目录下运行自动化审计
npx @mslteam/mslx-plugin-dev-skill audit
```

---

## 规范文档与官方在线源

> [!IMPORTANT]
> **官方权威文档索引优先准则**：
> 编写插件业务逻辑、调用 SDK 函数或对接 API 路由时，**必须优先以官方实时在线文档为最高基准**。AI Agent 与开发者可直接读取专为大语言模型优化的文档索引端点：
> - 📄 **核心文档索引**：[https://mslx.mslmc.cn/llms.txt](https://mslx.mslmc.cn/llms.txt)
> - 📚 **全量开发者文档**：[https://mslx.mslmc.cn/llms-full.txt](https://mslx.mslmc.cn/llms-full.txt)
> - 🌐 **官方在线开发文档**：[https://mslx.mslmc.cn/plugin-dev/](https://mslx.mslmc.cn/plugin-dev/)

根据具体开发任务，查阅本 Skill 本地对应的参考规范：

* **视觉规范与 3 大布局形态**：查阅 [frontend-design-system.md](./references/frontend-design-system.md)
* **前端路由、9 大扩展插槽、宿主 Store 与 useFileUpload**：查阅 [frontend-integration.md](./references/frontend-integration.md)
* **后端架构、SDK 核心桥接、事件总线与后台任务池**：查阅 [backend-architecture.md](./references/backend-architecture.md)
* **全方位自我审查指南与合规打分表**：查阅 [self-audit-guide.md](./references/self-audit-guide.md)
* **.NET 10 脚手架、单文件打包与发布流程**：查阅 [project-scaffold-publish.md](./references/project-scaffold-publish.md)

---

## 生产级标杆示例代码

* **前端标杆 Vue 3 组件**：[examples/DesignCardExample.vue](./examples/DesignCardExample.vue)
  * 内置完整 `design-card`、自适应头部（PC 横排 / 手机纵折叠）、2/4 列统计磁贴、过滤工具栏、数据卡片流与暗黑模式适配。
* **前端标杆注册入口**：[examples/pluginEntry.ts](./examples/pluginEntry.ts)
  * 包含 `name`、`version` 元数据、单页路由、宿主一级菜单注入与实例控制台扩展插槽。
* **后端标杆 C# 入口**：[examples/MSLXPluginEntry.cs](./examples/MSLXPluginEntry.cs)
  * 包含 `ApplicationPart` 特性、DI 服务注册、安全数据目录初始化以及事件监听异步化范式。

---

## 发布前自检清单 (Checklist)

在提交插件或完成开发前，逐项核对：
- [ ] 运行 `npx @mslteam/mslx-plugin-dev-skill audit` 并确保 **0 个严重违规**。
- [ ] 视图场景是否正确选择形态（独立卡片声明 `design-card`，模态框使用 `<t-dialog attach="body">`，Tab 面板扁平流式）。
- [ ] 在 375px（手机宽度）与 1440px（PC 桌面）视口下分别检查了界面折叠与排版。
- [ ] 表格外部包裹了 `overflow-x-auto`，弹窗添加了 `attach="body"`。
- [ ] 所有的 `<style>` 标签都带上了 `scoped` 限制。
- [ ] 前端构建配置包含 `vite-plugin-css-injected-by-js` 且产物固定为 `mslx-plugin-entry.js`。
- [ ] C# 文件读写均在 `this.Config().GetDataPath()` 沙箱内，无路径穿越漏洞。
- [ ] 事件处理器均使用 `Task.Run` 异步化，未阻塞宿主主执行流。
