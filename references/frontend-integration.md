# MSLX 前端接入指南 (Frontend Integration)

> **核心目标**：指导开发者如何在前端注册菜单路由、注入扩展插槽、与宿主 Pinia 状态树通信以及调用宿主内置请求库。

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

宿主将全部 Pinia Store 挂载在全局 `window.MSLX_Stores` 对象上：

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

// 3. 监听主题与颜色模式
const settingStore = stores?.getSettingStore?.() || stores?.useSettingStore?.();
const isDarkMode = computed(() => settingStore?.mode === 'dark');
```

---

## 5. 宿主请求实例 (`mslxRequest`)

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

// 2. 发起 POST 请求（支持子节点路由与自动重试）
const saveConfig = async (payload: any) => {
  await request.post({
    url: '/api/plugins/mslx-plugin-cloud-backup/config',
    data: payload
  }, {
    requestToSlaveNode: 'auto', // 自动通过路径路由至当前激活的子节点
    retry: { count: 3, delay: 1000 } // 失败自动重试 3 次
  });
};
```
