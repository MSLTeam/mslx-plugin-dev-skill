# MSLX 前端接入指南 (Frontend Integration)

> **核心目标**：指导开发者如何在前端注册菜单路由、注入扩展插槽、与宿主 Pinia 状态树通信以及调用宿主内置请求库。
> 
> [!IMPORTANT]
> **官方实时文档优先**：前端 Pinia Store 状态树、路由格式与扩展插槽定义以官方 LLM 知识库为最高准则：
> - 核心文档：[https://mslx.mslmc.cn/llms.txt](https://mslx.mslmc.cn/llms.txt)
> - 全量文档：[https://mslx.mslmc.cn/llms-full.txt](https://mslx.mslmc.cn/llms-full.txt)

---

## 1. 插件前端入口文件 (`pluginEntry.ts`)

插件的前端注册集中在 `Frontend/src/pluginEntry.ts`，导出名为 `pluginConfig` 的配置对象：

```ts
import { type PluginConfig } from './types';
import DemoPage from './views/DemoPage.vue';
import InstanceDropdownModal from './views/InstanceDropdownModal.vue';
import InstanceSettingsTab from './views/InstanceSettingsTab.vue';
import { GitBranchIcon, SettingIcon } from 'tdesign-icons-vue-next';

export const pluginConfig: PluginConfig = {
  name: 'MSLX.Plugin.MyAwesome',
  version: '1.0.0',
  routes: [ /* 路由配置 */ ],
  extensions: [ /* 插槽配置 */ ]
};
```

---

## 2. 路由注册规范

### 2.1 新增一级单页菜单
```ts
{
  path: '/mslx-plugin-demo',
  name: 'MslxPluginDemoBase',
  component: 'HOST_LAYOUT',
  meta: { title: '插件单页', icon: 'app', roleCode: ['admin', 'user'] },
  children: [
    {
      path: '',
      name: 'MslxPluginDemo',
      component: DemoPage,
      meta: { title: '插件单页', hidden: true, roleCode: ['admin', 'user'] },
    },
  ],
}
```
* **注意**：一级菜单顶层组件必须填写 `'HOST_LAYOUT'`，子路由 `path` 留空并将 `hidden` 设为 `true`。

### 2.2 嵌套进宿主现有菜单
若插件属于特定业务模块（如实例运维、隧道设置），推荐注入到宿主现有一级菜单中：
* `parentName: 'instance'` (服务端管理)
* `parentName: 'frp'` (隧道管理)
* `parentName: 'settingsBase'` (系统设置)

```ts
{
  parentName: 'instance',
  path: 'mslx-plugin-my-tab',
  name: 'MslxPluginInstanceExtra',
  component: DemoPage,
  meta: { title: '实例扩展功能', icon: 'control-platform', roleCode: ['admin'] },
}
```

### 2.3 新增免登录全屏独立页面 (v1.7.3+)
适用于向外部普通玩家公开展示的**全屏单页**（如网页世界地图、对外服务器大屏看板、状态大屏等）。此类页面**不包含**宿主顶部 Header 导航栏与侧边 SideNav 菜单，且**允许未登录访客直接访问**。

1. **后端声明契约**：在 `MSLXPluginEntry.cs` 中声明 `public bool HasPublicPages => true;`；
2. **前端独立路由**：直接以全屏 Vue 组件作为根 `component`（**严禁**包裹 `HOST_LAYOUT`），并在 `meta` 中配置 `anonymous: true` 与 `hidden: true`：

```ts
import PublicMapPage from './views/PublicMapPage.vue';

{
  path: '/mslx-plugin-map-render/public',
  name: 'MslxPluginMapRenderPublic',
  component: PublicMapPage, // 全屏 Vue 独立组件，不包 HOST_LAYOUT
  meta: {
    title: '服务器世界地图',
    anonymous: true, // 核心：声明支持免登录公开访问
    hidden: true,    // 隐藏在后台侧边菜单之外
  },
}
```

> [!TIP]
> **宿主管理员双重开关保障**：插件安装启用后，宿主后台「插件管理」界面会自动展示专属的 **“公开页面”** 开关。只有服主/管理员主动开启后，外部未登录玩家方可访问该页面。

---

## 3. 9 大官方扩展插槽 (Extensions / Slots)

MSLX 允许插件将 UI 组件深度注入至宿主控制台的关键槽位：

| 插槽名称 | 注入位置 | 必要属性 / 触发事件 | 接收 Props |
| :--- | :--- | :--- | :--- |
| `instance-console-dropdown` | 实例控制台“更多功能”下拉菜单 | `label`, `icon`，组件内需 `defineExpose({ open })` | `serverId: number` |
| `instance-console-overview-bottom` | 实例控制台玩家卡片下方 | - | `serverId: number`, `status: number` |
| `instance-setting-more` | 实例设置“更多功能”区域 | - | `serverId: number` |
| `instance-settings-tab` | 实例配置侧边栏最底部选项卡 | `label`, `icon`，支持 `emits('saved')` | `serverId: number`, `instanceId: number` |
| `dashboard-index-after-system-status` | 仪表盘系统状态监控卡片下方 | - | - |
| `frp-console-control-panel-bottom` | FRP 隧道控制台信息卡片下方 | - | `frpId: number`, `isRunning: boolean` |
| `frp-create-provider` | FRP 创建隧道服务商切换卡 | `label` | - |
| `settings-profile-bottom` | 设置-基础设置页面底部卡片 | - | - |
| `settings-daemon-bottom` | 设置-系统守护进程页面底部卡片 | - | - |

> [!NOTE]
> **插槽 Props 说明**：
> - `instance-settings-tab`：宿主同时传递 `:server-id="instanceId"` 与 `:instance-id="instanceId"`，两者数值完全一致（均为路由中的数值型实例 ID），插件组件在 `defineProps` 声明其中任意一个即可。
> - `instance-setting-more`：注入在实例设置“更多功能”区域末尾，通过 `:server-id` 接收当前实例 ID。

### 3.1 弹窗插槽实战示例 (`instance-console-dropdown`)
在入口注册：
```ts
{
  slot: 'instance-console-dropdown',
  component: InstanceDropdownModal,
  label: '备份策略',
  icon: GitBranchIcon,
}
```
在组件内暴露 `open` 方法以接收宿主点击触发，并务必指定 `attach="body"`：
```vue
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ serverId: number }>();
const visible = ref(false);

defineExpose({
  open: () => {
    visible.value = true;
  }
});
</script>

<template>
  <t-dialog
    attach="body"
    v-model:visible="visible"
    header="备份策略配置"
    width="min(580px, 92vw)"
  >
    <div class="text-sm">实例 ID: {{ serverId }}</div>
  </t-dialog>
</template>
```

---

## 4. 宿主状态透传 (MSLX_Stores)

宿主将全部 Pinia Store 挂载在全局 `window.MSLX_Stores` 对象上，插件可随时读取或调用：

### 宿主 9 大 Pinia Store 完整清单

| Store 模块 | 导出函数 / Hook | 常用状态与核心方法 |
| :--- | :--- | :--- |
| **user** | `getUserStore()`, `useUserStore()` | `userInfo`（用户名、角色、系统信息）、`token`、`baseUrl`、`isAdmin`；媒体与下载降权凭据 (v1.7.3+)：`getMediaToken()`、`getSyncMediaToken()`、`getMediaTokenParam()`、`getDownloadToken()`、`getSyncDownloadToken()` |
| **setting** | `getSettingStore()`, `useSettingStore()` | `mode` ('light' \| 'dark' \| 'auto')、`brandTheme` 主题色、`changeMode()` |
| **permission** | `getPermissionStore()`, `usePermissionStore()` | `routers` 动态路由清单、`whiteListRouters` |
| **instance** | `useInstanceListStore()` | `instanceList` 实例数组、`totalInstanceCount`、`refreshInstanceList()` |
| **node** | `useNodeStore()` | `slaveNodes` 子节点清单、`activeNodeId` 当前激活节点、`fetchNodes(force?)` 拉取节点列表、`setActiveNode()` 切换激活节点 |
| **frp** | `useTunnelsStore()` | `frpList` 隧道列表、`getTunnels()` 刷新数据 |
| **pluginUI** | `usePluginUIStore()` | `extensions` 插槽注册表、`registerExtension()` |
| **webpanel** | `useWebpanelStore()` | `settings`（深/浅色背景与组件透明度、终端模糊度等）、`fetchSettings()`、`saveSettings()`、`uploadImage(file)` |
| **update** | `useUpdateStore()` | `updateInfo` 最新版本信息、`checkAppUpdate()` |

```ts
import { computed } from 'vue';

const stores = (window as any).MSLX_Stores;

// 1. 获取当前登录用户信息
const userStore = stores?.getUserStore?.() || stores?.useUserStore?.();
const userInfo = computed(() => userStore?.userInfo || { name: '访客' });
const isAdmin = computed(() => userStore?.isAdmin || false);

// 2. 获取宿主实例列表并刷新
const instanceStore = stores?.useInstanceListStore?.();
await instanceStore?.refreshInstanceList();
console.log('所有实例:', instanceStore?.instanceList);

// 3. 读取当前子节点
const nodeStore = stores?.useNodeStore?.();
console.log('当前激活子节点:', nodeStore?.activeNodeId);

// 4. 监听主题与颜色模式
const settingStore = stores?.getSettingStore?.() || stores?.useSettingStore?.();
const isDarkMode = computed(() => settingStore?.mode === 'dark');

// 5. 获取受保护媒体资源降权凭据 (Media Token, v1.7.3+)
// 优先使用 ?media_token=xxx，无则回退 ?x-user-token=yyy
const tokenParam = userStore?.getMediaTokenParam?.() || '';
const tileUrl = `${userStore?.baseUrl}/api/plugin/mslx-plugin-map-render/map/1/0/0${tokenParam}`;

// 6. 获取文件下载专用凭据 (Download Token, v1.7.3+)
const dlToken = await userStore?.getDownloadToken?.();
const downloadUrl = `${userStore?.baseUrl}/api/plugins/my-plugin/backups/download?file=world.zip&download_token=${encodeURIComponent(dlToken)}`;
```

---

## 5. 降权凭据规范：Media Token 与 Download Token (v1.7.3+)

在前端界面中，`<img>`、`<video>`、`<a>` 下载链接以及地图瓦片切片（如 Leaflet / OpenLayers）等原生 HTTP 请求无法自定义请求头（`Authorization: Bearer <token>`），通常必须将鉴权信息以 URL Query 参数形式传递。

> [!CAUTION]
> **严禁将管理员主凭据 (`x-user-token`) 暴露在公开 URL 中**！
> 主 Token 拥有全局管理权限（包括修改配置、执行控制台指令、删除数据等全量写操作）。若直接拼接到 URL 中，会在浏览器历史记录、Referer 头、服务端代理与访问日志中泄露。
> 为此，MSLX 提供了 **降权凭据 (Scoped Token)** 机制：**仅限 `GET` 和 `HEAD` 只读操作**，任何写入行为（`POST`/`PUT`/`DELETE`）直接返回 `403 Forbidden`。

MSLX 提供两种不同生命周期与权限边界的降权凭据，开发者必须根据具体业务场景选择：

### 5.1 什么时候使用 Media Token (媒体资源凭据)？

* **核心定位**：专为页面轻量、高频展示的多媒体资源设计。
* **适用典型场景**：
  1. **世界地图瓦片切片渲染**：例如 Leaflet 瓦片图层加载的世界地图切片（如 `/map/{z}/{x}/{y}?media_token=...`）。
  2. **实例图标与世界缩略图**：例如服务器实例 Icon、世界存档缩略图（如 `/api/instance/icon?media_token=...`）。
  3. **玩家皮肤、头像与徽标展示**：在 `<img>` 标签中展示的只读图片素材。
  4. **轻量级音频与音效播放**：Web 页面背景提示音等小体积静态资源。
* **核心机制与为什么选它**：
  * **存储策略**：存储于 `localStorage`（持久化）。
  * **生命周期**：与当前用户登录会话（最长 24 小时）对齐，页面刷新不丢失。
  * **强缓存友好**：由于刷新页面不会重新生成 token，切片与图像资源能**稳定命中浏览器的 HTTP 强缓存**（304 Not Modified 或 memory/disk cache），避免每次刷新因 Token 变动导致全量切片重新下载与画面闪烁。
* **前端调用方式**：
  ```ts
  const stores = (window as any).MSLX_Stores;
  const userStore = stores?.getUserStore?.() || stores?.useUserStore?.();

  // 方式 A（一键拼接，最推荐）：获取 URL 查询参数字符串
  // 优先返回 '?media_token=xxx'，若尚未缓存则安全回退 '?x-user-token=yyy'
  const tokenParam = userStore?.getMediaTokenParam?.() || '';
  const tileLayerUrl = `${userStore?.baseUrl}/api/plugin/mslx-plugin-map-render/map/{z}/{x}/{y}${tokenParam}`;

  // 方式 B：异步获取最新有效媒体凭据（内置防在途并发与过期静默刷新）
  const mediaToken = await userStore?.getMediaToken?.();

  // 方式 C：同步读取本地已缓存凭据
  const cachedMediaToken = userStore?.getSyncMediaToken?.();
  ```

---

### 5.2 什么时候使用 Download Token (下载专用凭据)？

* **核心定位**：专为大体积文件导出下载、备份数据打包与长视频流播放设计。
* **适用典型场景**：
  1. **实例备份包下载**：例如插件打包生成的 `.zip`、`.tar.gz` 备份文件导出（通过 `window.open(url)` 或 `<a :href="url" download>`）。
  2. **游戏世界存档与模组包导出**：向客户端投递大容量压缩包文件。
  3. **运行日志与诊断报告下载**：服务器完整日志导出。
  4. **长视频流媒体播放**：例如使用 `<video>` 或 ArtPlayer 播放游戏回放与长视频（支持 HTTP 206 Partial Content 断点续传与 Range 请求）。
* **核心机制与为什么选它**：
  * **存储策略**：存储于 `sessionStorage`（会话级存储）。
  * **生命周期**：短效临时凭据（默认有效时间 2 小时，提前 10 分钟在前端自动刷新缓冲），**随当前浏览器标签页关闭即刻销毁**。
  * **高危资产隔离**：备份和核心文件属于高价值敏感资产，采用短效会话凭据能够最大化压缩凭据截获后的重放利用窗口。
  * **单次请求聚合**：在 2 小时会话内，无论同一标签页下下载多少个文件或连续播放多少个视频，前端只向后端请求 1 次签名，兼顾安全与性能。
* **前端调用方式**：
  ```ts
  const stores = (window as any).MSLX_Stores;
  const userStore = stores?.getUserStore?.() || stores?.useUserStore?.();

  // 异步获取当前有效下载凭据（若快到期会自动静默换新）
  const downloadToken = await userStore?.getDownloadToken?.();

  // 构造下载链接并触发浏览器下载
  const downloadUrl = `${userStore?.baseUrl}/api/plugins/my-plugin/backups/download?file=world.zip&download_token=${encodeURIComponent(downloadToken)}`;
  window.open(downloadUrl);
  ```

---

### 5.3 Media Token 与 Download Token 选型决策表

| 维度 | Media Token (媒体凭据) | Download Token (下载凭据) |
| :--- | :--- | :--- |
| **主要业务场景** | 地图切片瓦片、实例图标、缩略图、头像、UI 图片展示 | 备份文件下载、存档打包导出、日志导出、长视频播放流 |
| **URL 参数名** | `?media_token=xxx` | `?download_token=xxx` |
| **存储介质** | `localStorage`（跨页面刷新保留） | `sessionStorage`（标签页关闭即销毁） |
| **有效期** | 与当前登录会话一致（最长 24 小时） | 短效 2 小时（提前 10 分钟自动缓冲刷新） |
| **HTTP 缓存目标** | 必须稳定命中浏览器强缓存（避免地图切片闪烁） | 一次性下载或按需 Range 请求，不依赖长期强缓存 |
| **对应后端 Scope** | `[AllowTokenScope(TokenScopes.Media)]` | `[AllowTokenScope(TokenScopes.Download)]` |
| **请求方法限制** | 严格仅允许 `GET` 与 `HEAD` | 严格仅允许 `GET` 与 `HEAD` |

---

### 5.4 后端 Controller 如何声明 Scope 白名单？

当客户端使用 Scoped Token 访问插件接口时，宿主身份网关（`AuthMiddleware`）会检查目标端点是否显式声明了对应的 Scope 白名单：

```csharp
using Microsoft.AspNetCore.Mvc;
using MSLX.SDK.Attributes;
using MSLX.SDK.Constants;

namespace MSLX.Plugin.MyAwesome.Controllers;

[ApiController]
[Route("api/plugins/mslx-plugin-my-awesome/[controller]")]
public class MediaController : ControllerBase
{
    // 允许通过 Media Token 访问（如地图切片或图片展示）
    [HttpGet("tile/{z}/{x}/{y}")]
    [AllowTokenScope(TokenScopes.Media)]
    public IActionResult GetTile(int z, int x, int y)
    {
        // 业务逻辑...
        return PhysicalFile(tilePath, "image/png");
    }

    // 允许通过 Download Token 访问（如大文件下载）
    [HttpGet("download")]
    [AllowTokenScope(TokenScopes.Download)]
    public IActionResult DownloadBackup([FromQuery] string filename)
    {
        // 业务逻辑...
        return PhysicalFile(backupPath, "application/zip", filename);
    }
}
```

---

## 6. 宿主请求实例 (`mslxRequest`)

插件无需自行引入 Axios，直接复用宿主配置好的请求客户端（`import request from 'mslx-request'` 或 `(window as any).mslxRequest`）：

> [!TIP]
> **自动解包机制**：宿主拦截器会在接口返回 `code === 200` 时，**自动提取并返回 `data` 属性**。插件接收到的 `res` 即为纯粹的数据本体，**严禁再书写 `res.data`**。

```ts
import request from 'mslx-request';

interface BackupItem {
  fileName: string;
  sizeBytes: number;
}

// 1. 发起 GET 请求 (支持 TypeScript 泛型约束)
const fetchBackups = async () => {
  try {
    const list = await request.get<BackupItem[]>({
      url: '/api/plugins/mslx-plugin-cloud-backup/backups',
    });
    // 直接使用 list 数组，无需 list.data
    console.log('获取到的备份清单:', list.length);
  } catch (err: any) {
    MessagePlugin.error(err.message || '获取失败');
  }
};

// 2. 发起 POST 请求（支持显式指定子节点路由）
const saveConfig = async (payload: any) => {
  await request.post({
    url: '/api/plugins/mslx-plugin-cloud-backup/config',
    data: payload
  }, {
    // 关键参数：若请求需定向到当前激活的分布式子节点，显式声明 true
    // 若请求宿主主守护进程，声明 false 或留空
    requestToSlaveNode: true
  });
};
```

---

## 6. 宿主大文件分片上传工具 (`window.useFileUpload`)

若插件涉及上传大文件（如备份包、整合包、模组或自定义核心），可直接复用宿主全局暴露的 `useFileUpload` Hook，具备自动分片、动态并发、指数退避重试与实时进度追踪能力：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';

// 从全局 window 获取上传 Hook
const useUploadHook = (window as any).useFileUpload;
const {
  isUploading,
  uploadProgress,
  uploadedFileName,
  uploadedFileSize,
  startUpload
} = useUploadHook ? useUploadHook() : { isUploading: ref(false), uploadProgress: ref(0), startUpload: async () => '' };

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    // startUpload 自动处理切片、计算并发与进度，完成后返回文件 Key
    const fileKey = await startUpload(file);
    MessagePlugin.success(`上传成功，文件存储 Key: ${fileKey}`);
  } catch (err: any) {
    MessagePlugin.error(`上传失败: ${err.message || err}`);
  }
};
</script>

<template>
  <div v-if="isUploading" class="flex flex-col gap-2 my-2">
    <div class="flex justify-between text-xs text-[var(--td-text-color-secondary)]">
      <span>正在上传: {{ uploadedFileName }} ({{ uploadedFileSize }})</span>
      <span>{{ uploadProgress }}%</span>
    </div>
    <t-progress :percentage="uploadProgress" theme="circle" :stroke-width="4" />
  </div>
  <input v-else type="file" @change="handleFileChange" />
</template>
```
