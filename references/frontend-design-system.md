# MSLX 前端视觉与设计系统规范 (Frontend Design System)

> **核心目标**：确保所有第三方插件在界面质感、排版规律、主题响应及移动端交互上，与 MSLX 官方 WebPanel 达到 100% 的原生契合度。

---

## 1. `.design-card` 底层运作机理

在 MSLX 宿主架构中，`.design-card` 是视觉融合的核心桥梁。

### 1.1 宿主透明度与主题控制机制
MSLX 允许用户在设置中自定义面板背景壁纸与透明度。在宿主 `MSLX.WebPanel/src/layouts/index.vue` 中，定义了对 `.design-card` 的全局渗透规则：

```scss
// 亮色模式：根据用户透明度偏好注入组件透明背景
:deep(.design-card) {
  background-color: rgba(255, 255, 255, var(--comp-op-light)) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  backdrop-filter: none !important;
  transition: background-color 0.3s, border-color 0.3s;
}

// 暗黑模式：自动换为深色高质感半透明底色
&.dark {
  :deep(.design-card) {
    background-color: rgba(20, 20, 20, var(--comp-op-dark)) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
}
```

### 1.2 插件卡片标准 Class 组合
在编写插件的根卡片或独立模块容器时，**必须且严格**采用以下类名组合：

```html
<div
  class="design-card relative flex flex-col bg-[var(--td-bg-color-container)]/80 rounded-2xl border border-[var(--td-component-border)] shadow-sm transition-all duration-300 p-5 sm:p-6"
>
  <!-- 卡片内容 -->
</div>
```

* **`design-card`**：允许宿主布局引擎控制毛玻璃与透明度。
* **`bg-[var(--td-bg-color-container)]/80`**：提供兜底主题底色（暗黑/亮色自适应），并支持 80% 微微透光。
* **`rounded-2xl`**：标准 16px 大圆角，符合现代桌面/移动端 UI 趋势。
* **`border border-[var(--td-component-border)]`**：细腻的语义边框，亮色模式下浅灰，暗色模式下深灰微透。
* **`shadow-sm hover:shadow-md`**：轻量投影，悬浮增强交互反馈。

---

## 2. PC 端与移动端双端自适应规范

所有的插件页面必须支持两种核心屏幕形态：
- **桌面宽屏 (Desktop)**：屏幕宽度 $\ge 1024\text{px}$（`lg:` / `xl:`），信息充实、多列横排。
- **移动竖屏 (Mobile)**：屏幕宽度 $< 640\text{px}$（手机端），纵向流式折叠、防爆横滚。

### 2.1 头部操作栏 (Header Bar) 自适应
```html
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-dashed border-zinc-200/70 dark:border-zinc-700/60">
  <!-- 左侧：标题与标识竖条 -->
  <div class="flex items-center gap-3">
    <div class="w-1.5 h-5 bg-[var(--color-primary)] rounded-full shadow-[0_0_8px_var(--color-primary-light)] opacity-90"></div>
    <h2 class="text-lg font-bold text-[var(--td-text-color-primary)] m-0 leading-none tracking-tight">
      模块标题
    </h2>
  </div>

  <!-- 右侧：操作按钮组 (手机端自适应折叠/换行) -->
  <div class="flex flex-wrap items-center gap-2">
    <t-button variant="outline" theme="default" size="small" @click="refresh">
      <template #icon><refresh-icon /></template>
      刷新
    </t-button>
    <t-button theme="primary" size="small" @click="handleAction">
      <template #icon><add-icon /></template>
      新建任务
    </t-button>
  </div>
</div>
```

* **断点规律**：在手机上默认 `flex-col`（标题与按钮纵向排列，避免按钮被挤出屏幕边缘）；在桌面端通过 `sm:flex-row sm:items-center` 恢复横向两端对齐。

### 2.2 数据统计磁贴 (Stats Grid) 自适应
```html
<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
  <div class="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
    <server-icon class="text-base text-[var(--color-primary)] opacity-80" />
    <div class="flex flex-col">
      <span class="text-xs text-[var(--td-text-color-placeholder)]">运行实例</span>
      <span class="text-sm font-bold text-[var(--td-text-color-primary)]">12 个</span>
    </div>
  </div>
  <!-- 更多统计小卡片 ... -->
</div>
```

* **断点规律**：移动端双列排列（`grid-cols-2`），桌面端四列平铺（`sm:grid-cols-4`）。

### 2.3 数据表格横向防爆 (Table Overflow)
在手机屏幕上，数据表格由于字段众多极易产生布局溢出，甚至导致整个页面左右晃动：

```html
<!-- 必须在外层包裹 overflow-x-auto -->
<div class="w-full overflow-x-auto rounded-xl border border-[var(--td-component-border)]">
  <t-table
    :data="tableData"
    :columns="columns"
    row-key="id"
    size="small"
    hover
  />
</div>
```

---

## 3. TDesign 与 MSLX 语义色彩字典

严禁使用绝对 Hex 色值（如 `#333`, `#fff`, `#f0f0f0`），所有样式必须绑定系统级 CSS 变量：

### 3.1 容器与背景变量
| 变量名 | 用途 | 适用场景 |
| :--- | :--- | :--- |
| `var(--td-bg-color-container)` | 主容器底色 | 卡片、弹窗、下拉菜单的背景 |
| `var(--td-bg-color-secondarycontainer)` | 次级容器底色 | 表格斑马纹、嵌套卡片、徽章背景 |
| `var(--td-bg-color-page)` | 页面底色 | 页面大背景兜底 |

### 3.2 文本与排版变量
| 变量名 | 用途 | 适用场景 |
| :--- | :--- | :--- |
| `var(--td-text-color-primary)` | 主文字颜色 | 标题、核心数值、高亮文字 |
| `var(--td-text-color-secondary)` | 次级文字颜色 | 描述文字、表格普通单元格、副标题 |
| `var(--td-text-color-placeholder)` | 弱化提示文字 | 占位符、小标签、时间戳 |
| `var(--td-text-color-disabled)` | 禁用文字颜色 | 禁用按钮、不可操作项 |

### 3.3 边框与分割线变量
| 变量名 | 用途 | 适用场景 |
| :--- | :--- | :--- |
| `var(--td-component-border)` | 组件边框 | 卡片外框、输入框边框、弹窗描边 |
| `border-zinc-200/70 dark:border-zinc-700/60` | 装饰分割线 | 配合 `border-dashed` 制作卡片内部分区线 |

### 3.4 品牌与状态色彩
| 变量名 | 语义 | 适用场景 |
| :--- | :--- | :--- |
| `var(--color-primary)` | 品牌主色 | 主按钮、选中高亮、标题竖条装饰 |
| `var(--color-success)` | 成功/在线 | 运行正常、已同步标签、成功提示 |
| `var(--color-warning)` | 警告/待办 | 未保存提示、到期提醒、待确认 |
| `var(--color-danger)` | 危险/错误 | 停止运行、删除危险操作、报错提示 |

---

## 4. 样式隔离与 UnoCSS 规范

为保证插件样式不影响宿主与其他第三方插件：

1. **UnoCSS 预设配置 (`uno.config.ts`)**：
   ```ts
   import { defineConfig, presetUno } from 'unocss';

   export default defineConfig({
     presets: [
       presetUno({ preflight: false }) // 必须禁用 preflight 重置
     ],
   });
   ```
2. **Vite 配置 (`vite.config.ts`)**：
   ```ts
   UnoCSS({
     mode: 'vue-scoped' // 仅生成带有 vue-scoped 属性选择器的样式
   })
   ```
3. **单文件组件 `<style>`**：
   所有样式定义必须置于 `<style scoped>` 块中。若需微调 TDesign 组件样式，必须使用 `:deep(.t-xxx)` 穿透，严禁写成全局无作用域的 `.t-xxx`。
