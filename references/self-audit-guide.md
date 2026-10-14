# MSLX 插件全方位自我审查指南 (Self-Audit Guide)

> **目标**：在提交插件至官方插件市场或合并代码前，帮助开发者系统性排查与宿主 MSLX 的契合度、视觉破坏、功能冲突、响应式体验缺陷及高危安全漏洞。

开发者可以直接在插件根目录下运行命令行工具执行自动化诊断：
```bash
npx mslx-plugin-dev-skill audit
```
同时，请结合以下 5 大审查维度进行人工深度复核。

---

## 维度一：与宿主 MSLX 符合程度审查 (Visual & Host Coherence)

MSLX WebPanel 拥有高度统一的现代毛玻璃与卡片视觉风格。当用户开启了自定义透明度或切换至暗黑模式时，硬编码样式的组件会产生极度违和的视觉破碎感。

### 1.1 审查清单
| 审查项 | 判定标准 | 严重级别 | 常见违规写法 | 正确合规写法 |
| :--- | :--- | :--- | :--- | :--- |
| **卡片类名标记** | 独立内容块与视图根容器必须声明 `design-card` 类 | **严重** | `<div class="my-card">` | `<div class="design-card relative flex flex-col ...">` |
| **背景色透明度** | 严禁硬编码纯白背景 `#fff` / `bg-white`，必须使用变量 | **严重** | `class="bg-white"`<br>`style="background:#fff;"` | `class="bg-[var(--td-bg-color-container)]/80"` |
| **标题标杆装饰** | 模块标题栏左侧使用 MSLX 专属品牌胶囊指示条 | **建议** | 自行绘制图标或无修饰纯文本 | `<div class="w-1.5 h-5 bg-[var(--color-primary)] rounded-full shadow-[0_0_8px_var(--color-primary-light)] opacity-90"></div>` |
| **统一圆角规范** | 主卡片统一使用 `rounded-2xl`，统计小卡片使用 `rounded-xl` | **建议** | `rounded-none`, `rounded-sm` | `rounded-2xl` 或 `rounded-xl` |
| **主题边框继承** | 使用 TDesign 语义边框或 Zinc 半透明边框 | **建议** | `border-black`, `border-gray-300` | `border border-[var(--td-component-border)]` |
| **弹窗遮罩穿透** | `<t-dialog>` 必须配置 `attach="body"` | **严重** | `<t-dialog :visible="v">` | `<t-dialog attach="body" :visible="v">` |

### 1.2 为什么必须使用 `design-card`？
在宿主布局（`MSLX.WebPanel/src/layouts/index.vue`）中，底层注入了如下动态控制规则：
```scss
// 白天模式：根据用户个性化设置动态注入透明度
:deep(.design-card) {
  background-color: rgba(255, 255, 255, var(--comp-op-light)) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

// 黑夜模式：根据用户设置注入暗色透明度
&.dark {
  :deep(.design-card) {
    background-color: rgba(20, 20, 20, var(--comp-op-dark)) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
}
```
**若漏写 `design-card` 或硬编码了 `bg-white`**，宿主将无法控制该组件的透明度与暗色转换，用户切换壁纸时该卡片会呈现一块突兀死板的不透明方块。

---

## 维度二：样式隔离与零冲突设计审查 (Zero Conflicts)

插件前端通过 Native ESM 动态挂载到宿主单页面应用中。若样式未隔离，将直接污染宿主全局。

### 2.1 审查清单
- [ ] **`<style>` 强隔离**：检查工程内每一个 `.vue` 文件的 `<style>` 标签，必须标注 `scoped`（如 `<style scoped>` 或 `<style scoped lang="less">`）。严禁无 scoped 的全局样式！
- [ ] **UnoCSS 预设安全检查**：检查 `uno.config.ts`，**必须**显式指定 `presetUno({ preflight: false })`。若开启 preflight，会全局覆盖宿主已有标签的默认样式（如重置所有 `h1~h6`、`button`、`input`）。
- [ ] **UnoCSS 编译模式**：检查 `vite.config.ts`，必须配置 `UnoCSS({ mode: 'vue-scoped' })`，确保生成的原子化样式作用域在组件内。
- [ ] **路由名称与路径命名空间**：插件导出的路由 `name` 与 `path` 必须带插件唯一标识前缀（例如 `name: 'MslxPluginCloudBackupIndex'`），禁止使用 `Settings`、`Dashboard` 等通用名称，防止冲掉宿主内置路由。
- [ ] **DOM 监听与定时器销毁**：检查前端代码中是否存在 `window.addEventListener`、`setInterval`、`setTimeout`。所有全局监听器必须在 `onBeforeUnmount` 或 `onUnmounted` 中成对调用 `removeEventListener` / `clearInterval`。

---

## 维度三：PC 端与移动端双端响应式审查 (Responsive UX)

现代运维场景中，大量服主通过手机浏览器或平板访问 MSLX WebPanel 控制台。插件界面绝不能假设用户永远处在 1920x1080 桌面屏幕下。

### 3.1 审查清单
- [ ] **双视口实测验证**：必须分别在桌面视口（>=1024px）与移动视口（375px~430px）下完整体验核心操作流程。
- [ ] **头部操作栏自适应**：
  - PC 端：标题在左，操作按钮在右（横向对齐）。
  - 移动端：操作按钮纵向折叠到标题下方，或者流式换行，禁止把屏幕横向撑破。
  - 标准响应式类组合：`class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"`
- [ ] **表格与横向防爆**：
  - 数据表格（`<t-table>`）或宽幅代码块外部**必须**包裹 `<div class="overflow-x-auto">`。
  - 在移动端严禁出现整个页面横向左右晃动或产生全页水平滚动条。
- [ ] **统计磁贴网格**：
  - 必须采用响应式栅格：PC 端 4 列，手机端 2 列：`class="grid grid-cols-2 sm:grid-cols-4 gap-3"`。
- [ ] **弹窗与抽屉宽度自适应**：
  - 弹窗宽度严禁硬编码桌面固定像素（如 `width="650px"`）。
  - 必须采用响应式表达式：`width="min(580px, 92vw)"` 或结合屏幕宽度切换为底部抽屉。
- [ ] **触摸操作热区**：
  - 移动端可点击元素的有效点击高度应不小于 36px，按钮间距保持至少 8px，防止误触。

---

## 维度四：安全防线与高危漏洞排查 (Security & Vulnerabilities)

插件拥有对底层宿主操作系统和服务器文件的交互权限，存在极高的安全敏感度。

### 4.1 路径穿越防范 (Path Traversal) - **高危**
* **威胁场景**：攻击者通过参数传入 `../../../../Windows/System32` 或 `../../config.json`，试图逃出插件目录读写宿主关键数据。
* **审查标准**：
  1. 插件独立数据读写必须以 `this.Config().GetDataPath()` 为唯一合法沙箱基准目录。
  2. 凡涉及拼接用户传入的文件名/路径，**必须执行严格的归属校验**：
  ```csharp
  string sandboxBase = Path.GetFullPath(this.Config().GetDataPath());
  string targetPath = Path.GetFullPath(Path.Combine(sandboxBase, userSuppliedFilename));

  // 严格防穿越校验：目标绝对路径必须以沙箱目录开头
  if (!targetPath.StartsWith(sandboxBase, StringComparison.OrdinalIgnoreCase))
  {
      SDK.MSLX.Logger.Error($"[安全拦截] 潜在的路径穿越攻击已阻止: {userSuppliedFilename}");
      return BadRequest("非法的文件访问路径");
  }
  ```

### 4.2 API 路由网关与未授权访问
* **审查标准**：
  1. 所有 Controller 路由前缀必须为 `/api/plugins/{plugin-id}/...`，受宿主反向代理与身份网关保护。
  2. 敏感的增删改查、命令下发接口，必须明确标记 `[Authorize(Roles = "admin")]`，禁止匿名或越权调用。

### 4.3 XSS 跨站脚本防范
* **审查标准**：
  1. 严禁使用未过滤的 `v-html` 直接渲染 Minecraft 游戏内聊天日志、外部文件名或玩家昵称。
  2. 若确实需要富文本渲染，必须通过 `DOMPurify` 库进行严格消毒。

### 4.4 敏感资产加密与日志脱敏
* **审查标准**：
  1. 远端存储凭据（如 S3 SecretKey、WebDAV 密码、FRP Token）严禁明文保存在磁盘配置中。应使用 AES-256 加密后再落盘。
  2. 控制台日志流中若包含用户 Token，必须在输出前打码处理（例如 `tok_***`）。

---

## 维度五：事件总线、线程安全与打包生命周期 (Lifecycle & Packaging)

### 5.1 事件线程防阻塞
* **问题本质**：`SDK.MSLX.Events`（如 `OnBackupCompleted`, `OnServerStarted`）是在宿主的主业务执行流中**同步触发**的。
* **审查标准**：
  - 严禁在事件回调函数内执行同步等待（`Thread.Sleep`、耗时压缩、同步网络请求）。
  - **必须全部包裹在 `Task.Run(async () => { ... })` 中执行**，确保即使插件执行耗时较长的 IO 或网络任务，宿主主线程依然保持即时响应与流畅运行。

### 5.2 程序集扫描与单文件合并
* **审查标准**：
  - 入口文件顶部必须声明 `[assembly: ApplicationPart("程序集名称")]`，否则宿主无法反射发现插件的 Controller，导致所有 API 报 404。
  - 发布构建必须使用 `dotnet build -c Release`，验证 `ILRepack` 是否成功将第三方 DLL 合并到单个插件 DLL 中，前端 `Frontend/dist` 是否作为嵌入式资源打入。

---

## 自检评分表 (Scorecard)

| 审查维度 | 检查项数 | 状态 | 责任人确认 |
| :--- | :--- | :--- | :--- |
| **维度一：宿主视觉契合度** | 6 项 | [ ] PASS |  |
| **维度二：样式隔离与零冲突** | 5 项 | [ ] PASS |  |
| **维度三：PC / 移动端双端体验** | 6 项 | [ ] PASS |  |
| **维度四：安全防线与漏洞防范** | 4 项 | [ ] PASS |  |
| **维度五：事件异步化与生命周期** | 3 项 | [ ] PASS |  |

> **通过标准**：所有“严重”级别与安全项必须 100% 达成；无未解决的控制台报错或样式覆盖破坏。
