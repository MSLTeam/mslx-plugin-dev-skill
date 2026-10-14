<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';
import {
  RefreshIcon,
  AddIcon,
  ServerIcon,
  TimeIcon,
  CheckCircleFilledIcon,
  SearchIcon,
  DeleteIcon,
  SettingIcon
} from 'tdesign-icons-vue-next';

// 模拟数据接口
interface ItemData {
  id: number;
  name: string;
  category: string;
  status: 'active' | 'idle' | 'error';
  updatedAt: string;
}

const loading = ref(false);
const searchQuery = ref('');
const activeCategory = ref('all');
const showEditModal = ref(false);

const rawList = ref<ItemData[]>([
  { id: 1, name: '主生存服自动同步', category: 'survival', status: 'active', updatedAt: '2026-10-14 10:30' },
  { id: 2, name: '空岛服定时灾备', category: 'skyblock', status: 'idle', updatedAt: '2026-10-14 09:15' },
  { id: 3, name: '模组服异地归档', category: 'modded', status: 'active', updatedAt: '2026-10-13 23:40' },
]);

// 过滤后的数据列表
const filteredList = computed(() => {
  return rawList.value.filter(item => {
    const matchCat = activeCategory.value === 'all' || item.category === activeCategory.value;
    const matchQuery = !searchQuery.value || item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchCat && matchQuery;
  });
});

// 刷新数据
const refreshData = async () => {
  loading.value = true;
  try {
    // 模拟请求延迟
    await new Promise(resolve => setTimeout(resolve, 600));
    MessagePlugin.success('数据已更新');
  } finally {
    loading.value = false;
  }
};

// 删除二次确认
const handleDelete = (item: ItemData) => {
  const confirmDialog = DialogPlugin.confirm({
    header: '确认删除?',
    body: `确定要移除任务 "${item.name}" 吗？此操作不可恢复。`,
    theme: 'danger',
    confirmBtn: { content: '确认删除', theme: 'danger' },
    onConfirm: () => {
      rawList.value = rawList.value.filter(i => i.id !== item.id);
      confirmDialog.hide();
      MessagePlugin.success('已删除');
    },
    onClose: () => confirmDialog.hide()
  });
};

onMounted(() => {
  // 组件加载初始化
});

onBeforeUnmount(() => {
  // 妥善清理所有可能残留的 DOM 监听或定时器
});
</script>

<template>
  <!-- 核心卡片容器：必须使用 design-card 类以继承宿主透明度与主题底色 -->
  <div
    class="design-card relative flex flex-col bg-[var(--td-bg-color-container)]/80 rounded-2xl border border-[var(--td-component-border)] shadow-sm transition-all duration-300 p-5 sm:p-6"
  >
    <!-- 头部栏：PC 横排 / 手机纵向折叠 -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-dashed border-zinc-200/70 dark:border-zinc-700/60"
    >
      <!-- 模块标题与标准指示条 -->
      <div class="flex items-center gap-3">
        <div
          class="w-1.5 h-5 bg-[var(--color-primary)] rounded-full shadow-[0_0_8px_var(--color-primary-light)] opacity-90"
        ></div>
        <div class="flex flex-col">
          <h2 class="text-lg font-bold text-[var(--td-text-color-primary)] m-0 leading-none tracking-tight">
            插件任务控制台
          </h2>
          <span class="text-xs text-[var(--td-text-color-placeholder)] mt-1.5">
            符合 MSLX 视觉规范与双端自适应的标杆组件示例
          </span>
        </div>
      </div>

      <!-- 右侧操作栏：移动端自适应换行，避免撑爆宽度 -->
      <div class="flex flex-wrap items-center gap-2">
        <t-button variant="outline" theme="default" size="small" :loading="loading" @click="refreshData">
          <template #icon><refresh-icon /></template>
          刷新
        </t-button>
        <t-button theme="primary" size="small" @click="showEditModal = true">
          <template #icon><add-icon /></template>
          新建策略
        </t-button>
      </div>
    </div>

    <!-- 统计指标网格：手机端 2 列，桌面端 4 列 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
        <server-icon class="text-base text-[var(--color-primary)] opacity-80" />
        <div class="flex flex-col">
          <span class="text-xs text-[var(--td-text-color-placeholder)]">总策略数</span>
          <span class="text-sm font-bold text-[var(--td-text-color-primary)]">{{ rawList.length }} 个</span>
        </div>
      </div>
      <div class="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
        <check-circle-filledIcon class="text-base text-emerald-500 opacity-80" />
        <div class="flex flex-col">
          <span class="text-xs text-[var(--td-text-color-placeholder)]">活跃同步</span>
          <span class="text-sm font-bold text-[var(--td-text-color-primary)]">
            {{ rawList.filter(i => i.status === 'active').length }} 个
          </span>
        </div>
      </div>
    </div>

    <!-- 过滤与搜索栏：响应式流式布局 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div class="w-full sm:w-64">
        <t-input
          v-model="searchQuery"
          placeholder="搜索任务名称..."
          clearable
          size="small"
        >
          <template #prefix-icon><search-icon /></template>
        </t-input>
      </div>

      <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <t-radio-group v-model="activeCategory" variant="default-filled" size="small">
          <t-radio-button value="all">全部</t-radio-button>
          <t-radio-button value="survival">生存服</t-radio-button>
          <t-radio-button value="skyblock">空岛服</t-radio-button>
        </t-radio-group>
      </div>
    </div>

    <!-- 数据表格：外层强制包裹 overflow-x-auto 防止手机端撑破宽度 -->
    <div class="w-full overflow-x-auto rounded-xl border border-[var(--td-component-border)] bg-[var(--td-bg-color-container)]">
      <table class="w-full text-left text-xs text-[var(--td-text-color-secondary)] border-collapse min-w-[500px]">
        <thead>
          <tr class="border-b border-[var(--td-component-border)] bg-zinc-50/50 dark:bg-zinc-800/20">
            <th class="p-3 font-semibold text-[var(--td-text-color-primary)]">策略名称</th>
            <th class="p-3 font-semibold text-[var(--td-text-color-primary)]">分类</th>
            <th class="p-3 font-semibold text-[var(--td-text-color-primary)]">运行状态</th>
            <th class="p-3 font-semibold text-[var(--td-text-color-primary)]">最近执行</th>
            <th class="p-3 font-semibold text-[var(--td-text-color-primary)] text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredList"
            :key="item.id"
            class="border-b border-[var(--td-component-border)]/60 hover:bg-zinc-500/5 transition-colors"
          >
            <td class="p-3 font-medium text-[var(--td-text-color-primary)]">{{ item.name }}</td>
            <td class="p-3 font-mono">{{ item.category }}</td>
            <td class="p-3">
              <t-tag
                v-if="item.status === 'active'"
                theme="success"
                variant="light-outline"
                size="small"
                shape="round"
              >
                运行中
              </t-tag>
              <t-tag
                v-else
                theme="default"
                variant="light-outline"
                size="small"
                shape="round"
              >
                就绪
              </t-tag>
            </td>
            <td class="p-3 text-[var(--td-text-color-placeholder)] font-mono">{{ item.updatedAt }}</td>
            <td class="p-3 text-right">
              <t-button variant="text" theme="danger" size="small" @click="handleDelete(item)">
                <template #icon><delete-icon /></template>
                删除
              </t-button>
            </td>
          </tr>
          <tr v-if="filteredList.length === 0">
            <td colspan="5" class="p-8 text-center text-[var(--td-text-color-placeholder)]">
              暂无匹配的任务数据
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 弹窗示范：必须配置 attach="body"，宽度使用响应式 min(580px, 92vw) -->
    <t-dialog
      attach="body"
      v-model:visible="showEditModal"
      header="新建策略配置"
      width="min(580px, 92vw)"
      :confirm-btn="{ content: '保存提交', theme: 'primary' }"
      @confirm="showEditModal = false"
    >
      <div class="py-2 flex flex-col gap-4 text-xs text-[var(--td-text-color-secondary)]">
        <p class="m-0 leading-relaxed">
          弹窗组件已设置 <code>attach="body"</code>，有效规避了在卡片内部被 <code>overflow-hidden</code> 截断层级的问题。
        </p>
      </div>
    </t-dialog>
  </div>
</template>

<style scoped>
/* 严格保持 scoped，防止样式泄露污染外部宿主 */
</style>
