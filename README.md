# MSLX Plugin Dev Skill (`@mslteam/mslx-plugin-dev-skill`)

> **MSLX 官方全栈插件开发规范与视觉设计系统 Skill**  
> 面向 AI Agent（Codex、Google Antigravity、Cursor、Workbuddy、Trae 等）与开发者的 MSLX 插件全栈开发规范体系，涵盖宿主交互契合度、双端自适应布局、`.design-card` 视觉组件复用及自动化工程自检。

---

## 安装与接入 (Installation)

### 安装 Skill 至 AI Agent

```bash
npx @mslteam/mslx-plugin-dev-skill install
```

### 工程规范自检 (Audit)

在插件工程根目录下执行自动化合规审计：

```bash
npx @mslteam/mslx-plugin-dev-skill audit
```

---

## 官方实时在线文档与 LLM 上下文源

在编写插件业务逻辑、调用 SDK 函数或对接 API 路由时，**优先以官方实时在线文档为准**。AI Agent 可直接读取针对大模型调优的纯文本上下文字典：
- 📄 **核心文档索引**：[https://mslx.mslmc.cn/llms.txt](https://mslx.mslmc.cn/llms.txt)
- 📚 **全量开发者文档**：[https://mslx.mslmc.cn/llms-full.txt](https://mslx.mslmc.cn/llms-full.txt)
- 🌐 **在线开发手册**：[https://mslx.mslmc.cn/plugin-dev/](https://mslx.mslmc.cn/plugin-dev/)

---

## 核心知识库与规范清单

| 文档模块 | 重点说明 |
| :--- | :--- |
| **[SKILL.md](./SKILL.md)** | **Agent 核心指令与开发准则**：触发时机、开发全流程索引、核心开发准则与发布前自检。 |
| **[self-audit-guide.md](./references/self-audit-guide.md)** | **全方位自我审查指南**：宿主视觉契合度、无冲突样式隔离、双端响应式、高危安全漏洞防御 5 大维度检查表。 |
| **[frontend-design-system.md](./references/frontend-design-system.md)** | **前端视觉规范**：`design-card` 运作机理、暗黑模式透明度注入、PC/移动端断点、TDesign 语义色彩字典。 |
| **[frontend-integration.md](./references/frontend-integration.md)** | **前端接入指南**：单页/多页路由、9 大扩展插槽规范、Pinia 状态透传与 `mslxRequest` 自动解包。 |
| **[backend-architecture.md](./references/backend-architecture.md)** | **后端架构与 SDK**：`IPlugin` 生命周期、`SDK.MSLX.Events` 异步化、全局任务进度条、跨插件配置联动。 |
| **[project-scaffold-publish.md](./references/project-scaffold-publish.md)** | **脚手架与发布流程**：`.NET` 模板脚手架、`ILRepack` 单文件合并编译与插件市场审核流程。 |

---

## 标杆示例工程 (Production-ready Examples)

在 `examples/` 目录下提供了生产级代码模板：
- **`examples/DesignCardExample.vue`**：完整复用 `.design-card`、适配暗黑透明度、双端自适应（PC 横排 / 手机纵向折叠）、统计网格与操作工具栏。
- **`examples/pluginEntry.ts`**：标准前端插件注册入口，包含单页路由、宿主子菜单注入与扩展插槽注册。
- **`examples/MSLXPluginEntry.cs`**：规范 C# 插件后端入口，包含生命周期钩子、`ApplicationPart` 特性、事件异步订阅与安全沙箱数据目录初始化。

---

## 维护与自动化更新

本项目托管于 [mslx-plugin-dev-skill](https://github.com/MSLTeam/mslx-plugin-dev-skill) 仓库中。当代码更新并推送至 `main` 或 `master` 分支时，GitHub Actions 会自动递增 Patch 版本并通过 Trusted Publishing (OIDC) 发布至 npm 官方仓库。
