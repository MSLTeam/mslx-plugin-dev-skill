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
2. **前端独立路由**：若需享受宿主背景壁纸与 `.design-card` 高质感磨砂半透明卡片样式，使用 `PLUGINS_PUBLIC_LAYOUT` 专属公共布局；**必须在父级路由声明 `meta: { hidden: true }`（防止宿主侧边菜单渲染空白占位菜单）**，并在子路由 `meta` 中配置 `anonymous: true` 与 `hidden: true`：

```ts
import PublicWhitelistPage from './views/PublicWhitelistPage.vue';

{
  path: '/public/whitelist',
  component: 'PLUGINS_PUBLIC_LAYOUT', // 核心：使用公共页面专属布局，自动继承壁纸与 design-card
  meta: {
    hidden: true, // 核心：父路由必须声明 hidden，防止在后台侧边菜单渲染空白项
  },
  children: [
    {
      path: '',
      name: 'PublicWhitelist',
      component: PublicWhitelistPage,
      meta: {
        title: '玩家白名单自助申请',
        anonymous: true, // 核心：声明支持免登录公开访问
        hidden: true,    // 隐藏在后台侧边菜单之外
      },
    },
  ],
}
```

> [!NOTE]
> 若页面为纯自绘 WebGL/三维 Canvas 或纯独立页面，不需 MSLX 壁纸与卡片样式，亦可直接使用单层组件（不包 `PLUGINS_PUBLIC_LAYOUT`）或使用 `HOST_BLANK_LAYOUT`。

> [!TIP]
> **宿主管理员双重开关保障**：插件安装启用后，宿主后台「插件管理」界面会自动展示专属的 **“公开页面”** 开关。只有服主/管理员主动开启后，外部未登录玩家方可访问该页面。

---

## 3. 10 大官方扩展插槽 (Extensions / Slots)

MSLX 允许插件将 UI 组件深度注入至宿主控制台的关键槽位：

| 插槽名称 | 注入位置 | 必要属性 / 触发事件 | 接收 Props |
| :--- | :--- | :--- | :--- |
| `header-action` | 面板顶部导航栏右侧快捷操作区 (v1.7.9+) | `id`, `label`, `type` (`'drawer'` | `'floating'` | `'route'` | `'link'` | `'action'` | `'dropdown'`)，支持 `placement: 'header' | 'more'` 与 `roleCode` | `drawer` / `floating`: `props: { visible: boolean }`，关闭派发 `emit('update:visible', false)`；`action`: `run(context)` 接收 `MSLX_NodeContext` |
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

### 3.2 顶部快捷操作插槽实战 (`header-action`, v1.7.9+)

`header-action` 允许插件在面板顶部全局导航栏（Header 右侧操作区）注册快捷入口，支持侧滑抽屉、可拖拽悬浮窗、页面快速跳转、外部安全链接、异步操作回调以及多级下拉菜单。

#### 1. 双端自适应排版规则
* **桌面端 (宽度 ≥ 1024px)**：直显**第一个**符合权限且未显式指定 `placement: 'more'` 的入口作为顶部独立操作按钮或下拉菜单；其余项和指定了 `placement: 'more'` 的入口收纳在「更多操作」下拉菜单中。
* **移动端 (宽度 < 1024px)**：所有插件入口统一整合在「更多操作」菜单中，并与宿主移动端原生功能（GitHub、CNB、后台任务、帮助文档、系统设置）无缝融合。

#### 2. 6 大动作类型 (`type`)
* **`drawer`**：侧滑抽屉。`component` 接收 `props: { visible: Boolean }`，关闭时发送 `emit('update:visible', false)`。推荐使用 `<t-drawer attach="body">`。
* **`floating`**：悬浮窗。`component` 同样接收 `visible` prop 与 `update:visible` 事件。推荐使用 `<teleport to="body">` 搭配 `fixed` 定位与指针捕获拖拽手柄。
* **`route`**：站内路由跳转。`to` 接收绝对站内路径（以 `/` 开头）或 Vue Router 路由对象，在子节点环境下自动继承 `query.node`。
* **`link`**：外部安全链接。`href` 必须为以 `http://` 或 `https://` 开头的绝对 URL，`target` 默认 `_blank`。
* **`action`**：执行回调操作。`run(context)` 接收当前节点上下文 `MSLX_NodeContext`，支持异步返回 `Promise`，执行期间按钮自动禁用防重复点击，完成或切换节点时自动释放。
* **`dropdown`**：多级下拉菜单。`items` 包含上述除 dropdown 之外的叶子动作项数组。

#### 3. 生命周期与多节点机制
* **状态持久**：抽屉与悬浮窗在用户首次打开时按需挂载，同节点内关闭后**保留组件实例与内部响应式状态**。
* **自动清理**：切换节点（`?node=...`）、登出或重载插件时，宿主自动销毁所有面板并中止进行中的 `action` 回调（`context.signal.abort()`）。
* **节点上下文**：组件内可直接使用 `(window as any).MSLX_NodeContext.use()` 获取当前绑定的目标节点上下文。

#### 4. 前端入口配置示例 (`pluginEntry.ts`)

```ts
import { MessagePlugin } from 'tdesign-vue-next';
import ExampleDrawer from './views/ExampleDrawer.vue';
import ExampleFloating from './views/ExampleFloating.vue';

export const pluginConfig = {
  name: 'mslx-plugin-header-example',
  version: '1.0.0',
  routes: [ /* 路由配置 */ ],
  extensions: [
    // 1. 顶层下拉工具菜单：桌面端默认直显为顶部快捷图标按钮
    {
      slot: 'header-action',
      type: 'dropdown',
      id: 'tools',
      label: '示例工具',
      icon: 'app',
      items: [
        // 侧滑抽屉（仅管理员可见）
        {
          type: 'drawer',
          id: 'drawer',
          label: '示例抽屉',
          icon: 'view-list',
          component: ExampleDrawer,
          roleCode: ['admin'],
        },
        // 站内安全路由跳转
        {
          type: 'route',
          id: 'page',
          label: '示例页面',
          icon: 'jump',
          to: { name: 'MyPluginPage', query: { source: 'header' } },
        },
        // 外部帮助链接
        {
          type: 'link',
          id: 'docs',
          label: '开发文档',
          icon: 'help-circle',
          href: 'https://mslx.mslmc.cn/plugin-dev/',
          target: '_blank',
        },
        // 异步回调执行操作
        {
          type: 'action',
          id: 'message',
          label: '发送示例消息',
          icon: 'chat',
          run: async ({ nodeId }) => {
            MessagePlugin.success(`当前节点 ${nodeId} 操作已触发`);
          },
        },
      ],
    },

    // 2. 悬浮窗入口：显式指定 placement: 'more'，收纳到「更多操作」中
    {
      slot: 'header-action',
      type: 'floating',
      id: 'floating',
      label: '示例悬浮窗',
      icon: 'desktop',
      component: ExampleFloating,
      placement: 'more',
    },
  ],
};
```

#### 5. 抽屉组件示例 (`ExampleDrawer.vue`)

```vue
<script setup lang="ts">
import { Drawer as TDrawer } from 'tdesign-vue-next';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', visible: boolean): void }>();
const node = (window as any).MSLX_NodeContext?.use();

const handleClose = () => {
  emit('update:visible', false);
};
</script>

<template>
  <t-drawer
    :visible="visible"
    attach="body"
    header="示例抽屉"
    :footer="false"
    size="min(360px, 100vw)"
    @close="handleClose"
  >
    <div class="p-4 flex flex-col gap-2">
      <p class="text-[var(--td-text-color-primary)]">当前节点：{{ node?.nodeId }}</p>
      <p class="text-xs text-[var(--td-text-color-secondary)]">
        抽屉关闭后状态保留，切换节点或重载插件时自动释放。
      </p>
    </div>
  </t-drawer>
</template>
```

#### 6. 可拖拽与无障碍悬浮窗组件示例 (`ExampleFloating.vue`)

```vue
<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue';
import { Button as TButton } from 'tdesign-vue-next';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', visible: boolean): void }>();
const node = (window as any).MSLX_NodeContext?.use();
const panel = ref<HTMLElement | null>(null);
const handle = ref<HTMLButtonElement | null>(null);
const position = ref({ x: Infinity, y: 72 });
const dragging = ref(false);

let drag: { id: number; handle: HTMLElement; x: number; y: number } | undefined;
let observer: ResizeObserver | undefined;

function move(x: number, y: number) {
  const box = panel.value?.getBoundingClientRect();
  if (!box) return;
  position.value = {
    x: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
    y: Math.max(8, Math.min(y, window.innerHeight - box.height - 8)),
  };
}

function resize() {
  move(position.value.x, position.value.y);
}

function stopDrag() {
  if (drag && drag.handle.hasPointerCapture(drag.id)) {
    drag.handle.releasePointerCapture(drag.id);
  }
  drag = undefined;
  dragging.value = false;
}

function startDrag(event: PointerEvent) {
  if (event.button !== 0 || !event.isPrimary) return;
  const box = panel.value?.getBoundingClientRect();
  if (!box) return;
  const target = event.currentTarget as HTMLElement;
  drag = {
    id: event.pointerId,
    handle: target,
    x: event.clientX - box.left,
    y: event.clientY - box.top,
  };
  target.setPointerCapture(event.pointerId);
  dragging.value = true;
}

function dragMove(event: PointerEvent) {
  if (drag && drag.id === event.pointerId) {
    move(event.clientX - drag.x, event.clientY - drag.y);
  }
}

function finishDrag(event: PointerEvent) {
  if (drag?.id !== event.pointerId) return;
  stopDrag();
}

function moveWithKeys(event: KeyboardEvent) {
  const offsets: Record<string, [number, number]> = {
    ArrowLeft: [-15, 0],
    ArrowRight: [15, 0],
    ArrowUp: [0, -15],
    ArrowDown: [0, 15],
  };
  const offset = offsets[event.key];
  if (!offset) return;
  event.preventDefault();
  move(position.value.x + offset[0], position.value.y + offset[1]);
}

function cleanup() {
  stopDrag();
  window.removeEventListener('resize', resize);
  observer?.disconnect();
}

const close = () => emit('update:visible', false);

watch(
  () => props.visible,
  async (visible) => {
    cleanup();
    if (!visible) return;
    await nextTick();
    if (!panel.value || !props.visible) return;
    resize();
    window.addEventListener('resize', resize);
    observer = new ResizeObserver(resize);
    observer.observe(panel.value);
    handle.value?.focus();
  },
  { immediate: true },
);

onBeforeUnmount(cleanup);
</script>

<template>
  <teleport to="body">
    <section
      v-if="visible"
      ref="panel"
      role="dialog"
      aria-label="示例悬浮窗"
      :style="{
        position: 'fixed',
        zIndex: 1500,
        left: `${Number.isFinite(position.x) ? position.x : 8}px`,
        top: `${position.y}px`,
        width: 'min(340px, calc(100vw - 16px))',
        maxHeight: 'calc(100dvh - 16px)',
        overflow: 'auto',
        padding: '12px',
        border: '1px solid var(--td-component-border)',
        borderRadius: 'var(--td-radius-large)',
        background: 'var(--td-bg-color-container)',
        color: 'var(--td-text-color-primary)',
        boxShadow: 'var(--td-shadow-2)',
      }"
      @keydown.esc.stop="close"
    >
      <div style="display: flex; gap: 8px; align-items: center">
        <button
          ref="handle"
          type="button"
          aria-label="移动悬浮窗，可使用方向键"
          :style="{
            cursor: dragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none',
            padding: '6px',
          }"
          @pointerdown="startDrag"
          @pointermove="dragMove"
          @pointerup="finishDrag"
          @pointercancel="finishDrag"
          @lostpointercapture="finishDrag"
          @keydown="moveWithKeys"
        >
          ⠿
        </button>
        <strong style="flex: 1">示例悬浮窗</strong>
        <t-button variant="text" size="small" @click="close">关闭</t-button>
      </div>

      <p class="mt-2 text-sm text-[var(--td-text-color-primary)]">
        当前节点 ID: {{ node?.nodeId }}
      </p>
    </section>
  </teleport>
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
| **pluginUI** | `usePluginUIStore()` | `extensions` 插槽注册表、`registerExtension()`（管理页面插槽与 `header-action` 顶部快捷入口） |
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
const downloadUrl = `${userStore?.baseUrl}/api/plugin/my-plugin/backups/download?file=world.zip&download_token=${encodeURIComponent(dlToken)}`;
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
  const downloadUrl = `${userStore?.baseUrl}/api/plugin/my-plugin/backups/download?file=world.zip&download_token=${encodeURIComponent(downloadToken)}`;
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
[Route("api/plugin/mslx-plugin-my-awesome/[controller]")]
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
      url: '/api/plugin/mslx-plugin-cloud-backup/backups',
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
    url: '/api/plugin/mslx-plugin-cloud-backup/config',
    data: payload
  }, {
    // 关键参数：若请求需定向到当前激活的分布式子节点，显式声明 true
    // 若请求宿主主守护进程，声明 false 或留空
    requestToSlaveNode: true
  });
};
```

---

## 7. 宿主大文件分片上传工具 (`window.useFileUpload`)

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

---

## 8. 节点上下文工具与多节点适配 (`MSLX_NodeContext`, v1.7.6+)

### 8.1 背景与核心定位

自 MSLX `v1.7.6` 起，面板支持了分布式子节点的插件运行与同步（通过 URL `?node=<id>` 切换目标节点）。

在多节点环境下：
* **Token 与 BaseUrl 错位**：旧插件若直接读取主节点 `useUserStore().baseUrl` 或主 `token`，操作会误发到主节点；而在子节点页面上，主节点 Token 无法通过子节点的安全校验。
* **SignalR Hub 路径与重连**：直接使用 `new HubConnectionBuilder().withUrl(...)` 无法自适应子节点的基础地址与动态 Token 工厂（`accessTokenFactory`）。
* **生命周期与连接泄漏**：在节点间快速切换或离开页面时，未及时 `stop()` 的 Hub 连接与未取消的请求会造成内存泄露与后台幽灵连接。

宿主全局暴露了 `(window as any).MSLX_NodeContext`：
```ts
(window as any).MSLX_NodeContext = { 
  create: createPluginNodeContext, 
  use: usePluginNodeContext 
};
```

> [!TIP]
> **多节点适配是完全可选的！**
> 如果开发者**不想适配多节点**，或者插件逻辑仅属于主节点独有功能，**前端无需任何修改**。只需在后端 C# 入口声明：
> ```csharp
> public PluginMultiNodeSupport SupportsMultiNode => PluginMultiNodeSupport.Unsupported;
> ```
> 标记为 `Unsupported`（元数据 `"false"`）后，宿主在子节点（`?node=<id>`）下会**直接跳过加载该插件的前端路由与插槽**，并在面板显示「仅主节点界面」，零报错风险。

---

### 8.2 两个方法：`use()` vs `create()`

```ts
const { use, create } = (window as any).MSLX_NodeContext;
```

1. **`use()`（强烈推荐）**：
   - 在 Vue 插件组件的 `<script setup>` 顶层调用，通过 Vue `inject` 获取宿主预先注入的目标节点上下文。
   - **全生命周期自动托管**：组件卸载（`onBeforeUnmount`）时，宿主自动终止在途 HTTP 请求（`AbortController`），并优雅断开由此创建的全部 SignalR Hub 连接。
2. **`create(nodeId?, pluginId?)`**：
   - 手动创建指定节点的独立上下文，用于组件外或跨节点特殊任务。
   - **必须由调用方自行调用 `dispose()` 释放**。

---

### 8.3 上下文对象核心能力

通过 `const node = (window as any).MSLX_NodeContext.use()` 获取到的实例包含：

* **`node.request`（相对路径 HTTP 客户端）**：
  - 包含 `request/get/post/put/patch/delete`；
  - **强制相对路径**：仅接受 `/api/...` 形式相对地址，防止意外跨域；
  - **自动路由定向**：自动追加 `targetNodeId: nodeId`，指向当前激活节点；
  - **继承自动解包**：直接返回 `code === 200` 解包后的 `data` 数据本体。
* **`node.createHub(path)`（SignalR 托管工厂）**：
  - 传入 Hub 相对地址（如 `/api/hubs/plugin/mslx-plugin-stun/stun`）；
  - 自动根据当前节点计算最终 BaseUrl 与 `x-node-id` 参数；
  - 自动绑定子节点动态凭据获取工厂（`accessTokenFactory`）与 `.withAutomaticReconnect()`；
  - 自动纳入当前上下文的销毁集合，组件卸载自动停止。
  > [!WARNING]
  > **重连后业务订阅边界**：`node.createHub` 负责底层连通与重连底座。但 SignalR 重连后的业务逻辑（如重新 `hub.invoke('JoinGroup', ...)`）仍由插件代码自行在 `hub.onreconnected` 中处理。
  > 此外，旧插件自己写死 SignalR 地址的代码不会自动变更，需主动迁移至此 API。
* **`node.resourceUrl(path, scope)`（节点专属降权资源 URL）**：
  - `scope: 'media'`（默认）：向当前节点申请 `media_token`，生成适用于 `<img>` 或切片图层的带凭据链接；
  - `scope: 'download'`：向当前节点申请 `download_token`，生成大文件/备份下载链接；
  - 后端接口仍需对应标注 `[AllowTokenScope]`。
* **`node.nodeId` / `node.pluginId` / `node.getTarget()` / `node.dispose()`**。

---

### 8.4 实战组件标杆示例 (STUN 隧道插件)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';

// 1. setup 顶层获取节点上下文
const node = (window as any).MSLX_NodeContext?.use();

const runningData = ref<any>(null);
let hubConnection: any = null;

// 2. 发起当前节点的接口请求 (相对路径，自动路由到目标节点)
const fetchStatus = async () => {
  try {
    const res = await node.request.get({
      url: '/api/plugin/mslx-plugin-stun/status'
    });
    runningData.value = res;
  } catch (err: any) {
    MessagePlugin.error(`获取状态失败: ${err.message}`);
  }
};

// 3. 建立多节点自适应的 SignalR Hub 连接
const setupHub = async () => {
  if (!node) return;

  // 宿主自动处理当前节点的 BaseUrl、Token 协商与自动重连
  const hub = node.createHub('/api/hubs/plugin/mslx-plugin-stun/stun');
  hubConnection = hub;

  // 监听服务端数据推送
  hub.on('TrafficUpdate', (data: any) => {
    console.log('[STUN] 当前节点流量更新:', data);
  });

  // 处理业务级重连与重新订阅
  hub.onreconnected(async () => {
    console.log('[STUN] SignalR 已重连，重新加入业务监控组...');
    try {
      await hub.invoke('SubscribeTunnelTraffic', 'default');
    } catch (e) {
      console.error('重新加入业务组失败:', e);
    }
  });

  try {
    await hub.start();
    await hub.invoke('SubscribeTunnelTraffic', 'default');
    console.log('[STUN] SignalR 连接成功并已订阅！');
  } catch (err) {
    console.error('[STUN] SignalR 连接失败:', err);
  }
};

onMounted(() => {
  fetchStatus();
  setupHub();
  // 宿主在组件卸载时会自动清理 node 上的在途请求与 Hub，无需手动 dispose
});
</script>

<template>
  <div class="design-card p-5">
    <div class="text-sm text-[var(--td-text-color-secondary)]">当前运行节点: {{ node?.nodeId }}</div>
    <div class="mt-2 text-base font-bold text-[var(--td-text-color-primary)]">{{ runningData }}</div>
  </div>
</template>
```
