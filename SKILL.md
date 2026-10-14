---
name: mslx-plugin-dev
description: >-
  Comprehensive guide and rules for MSLX plugin full-stack development (.NET 8/9 C# backend + Vue 3/TDesign/UnoCSS frontend).
  Mandatory whenever developing, designing, refactoring, or auditing MSLX plugins.
  Enforces strict reuse of the design-card visual system, dark mode & host theme opacity inheritance,
  responsive PC & mobile UX adaptation, zero-conflict CSS isolation, SDK event loop async safety, and security audits.
---

# MSLX 插件全栈开发与前端视觉规范 Skill

本指南是 MSLX 插件开发的**唯一权威指导规范**。作为 AI Agent 或开发者，当编写、修改、重构或审查 MSLX 插件时，**必须严格遵循以下铁律与设计准则**。

---

## 核心开发准则 (Golden Rules)

### 1. 宿主视觉融入：强制复用 `design-card` 与 TDesign 变量
* **卡片顶层类名**：所有卡片容器**必须**声明 `class="design-card ..."`。宿主 WebPanel 布局引擎通过 `:deep(.design-card)` 为亮色模式动态注入透明度 `--comp-op-light`、暗色模式注入 `--comp-op-dark`。
* **绝对杜绝硬编码白底**：**严禁**使用 `bg-white`、`#ffffff`、`style="background: white"`！在暗黑模式或用户自定义毛玻璃壁纸下，硬编码白底会导致灾难性的视觉割裂。
* **统一语义变量**：卡片底色强制使用 `bg-[var(--td-bg-color-container)]/80`，文本强制使用 `text-[var(--td-text-color-primary)]` 与 `text-[var(--td-text-color-secondary)]`，边框使用 `border-[var(--td-component-border)]`。
* **标准品牌标识条**：模块标题栏左侧统一配置胶囊竖条：
  ```html
  <div class="w-1.5 h-5 bg-[var(--color-primary)] rounded-full shadow-[0_0_8px_var(--color-primary-light)] opacity-90"></div>
  ```

### 2. 双端体验自适应：必须兼顾 PC 宽屏与手机端
* **头部栏自适应折叠**：头部操作区必须使用 `flex-col sm:flex-row sm:items-center justify-between gap-4`。移动端纵向堆叠，PC 端横向对齐。
* **表格防爆容器**：数据表格外层**必须**包裹 `<div class="overflow-x-auto">`，避免在手机屏幕上强行撑宽整个页面。
* **弹窗穿透与响应式宽度**：使用 `<t-dialog>` 必须配置 `attach="body"`（防止被父级卡片的 `overflow-hidden` 截断），且弹窗宽度必须响应式设置 `width="min(580px, 92vw)"`。

### 3. 样式零污染与无冲突设计
* **Vue 样式强隔离**：组件所有 `<style>` **必须且只能**为 `<style scoped>`，严禁书写未隔离的全局选择器。
* **UnoCSS 安全预设**：`uno.config.ts` 中必须设置 `presetUno({ preflight: false })`，禁止开启预设 reset 污染宿主基础排版；`vite.config.ts` 必须配置 `UnoCSS({ mode: 'vue-scoped' })`。
* **路由命名唯一性**：路由 `name` 和 `path` 必须附带插件前缀（如 `name: 'MslxPluginDemoPage'`），避免覆盖宿主路由。
* **生命周期清理**：前端 `addEventListener` 与 `setInterval` 必须在 `onBeforeUnmount` 中注销；后端 C# 必须在 `OnUnload` 中释放资源。

### 4. SDK 事件循环防阻塞与跨插件解耦
* **事件异步化**：监听 `SDK.MSLX.Events`（如 `OnBackupCompleted`, `OnServerStarted`）时，事件处理器是在宿主主线程中同步调用的。**任何耗时 IO、文件压缩或网络请求必须使用 `Task.Run(async () => { ... })` 执行**，绝不允许阻塞宿主！
* **零耦合配置联动**：需要检测其他插件时，使用 `SDK.MSLX.Config.GetPluginConfig("目标插件Id")` 动态读取配置，严禁强引用未发布的 DLL。

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

# 2. 创建插件工程
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

## 规范文档索引

根据具体开发任务，查阅对应的参考规范：

* **视觉规范与 design-card 深度解析**：查阅 [frontend-design-system.md](./references/frontend-design-system.md)
* **前端路由、9 大扩展插槽与 Host API**：查阅 [frontend-integration.md](./references/frontend-integration.md)
* **后端生命周期、事件总线与全局任务池**：查阅 [backend-architecture.md](./references/backend-architecture.md)
* **全方位自我审查指南与合规打分表**：查阅 [self-audit-guide.md](./references/self-audit-guide.md)
* **脚手架、ILRepack 单文件打包与发布流程**：查阅 [project-scaffold-publish.md](./references/project-scaffold-publish.md)

---

## 生产级标杆示例代码

* **前端标杆 Vue 3 组件**：[examples/DesignCardExample.vue](./examples/DesignCardExample.vue)
  * 内置完整 `design-card`、自适应头部（PC 横排 / 手机纵折叠）、2/4 列统计磁贴、过滤工具栏、数据卡片流与暗黑模式适配。
* **前端标杆注册入口**：[examples/pluginEntry.ts](./examples/pluginEntry.ts)
  * 包含单页路由、宿主一级菜单注入与实例控制台扩展插槽。
* **后端标杆 C# 入口**：[examples/MSLXPluginEntry.cs](./examples/MSLXPluginEntry.cs)
  * 包含 `ApplicationPart` 特性、DI 服务注册、安全数据目录初始化以及事件监听异步化范式。

---

## 发布前自检清单 (Checklist)

在提交插件或完成开发前，逐项核对：
- [ ] 运行 `npx @mslteam/mslx-plugin-dev-skill audit` 并确保 **0 个严重违规**。
- [ ] 根容器是否使用了 `design-card`，并在暗黑模式和白昼模式下分别验证过。
- [ ] 在 375px（手机宽度）与 1440px（PC 桌面）视口下分别检查了界面折叠与排版。
- [ ] 表格外部包裹了 `overflow-x-auto`，弹窗添加了 `attach="body"`。
- [ ] 所有的 `<style>` 标签都带上了 `scoped` 限制。
- [ ] C# 文件读写均在 `this.Config().GetDataPath()` 沙箱内，无路径穿越漏洞。
- [ ] 事件处理器均使用 `Task.Run` 异步化，未阻塞宿主主执行流。
