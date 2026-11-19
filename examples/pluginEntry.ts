/**
 * MSLX 前端插件标准注册入口示例
 */
import { AppIcon, SettingIcon, GitBranchIcon, ViewListIcon, DesktopIcon, JumpIcon, HelpCircleIcon } from 'tdesign-icons-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import DesignCardExample from './DesignCardExample.vue';

import './style.css';

export const pluginConfig = {
  name: 'MSLX.Plugin.Awesome',
  version: '1.0.0',

  // 1. 路由注册清单
  routes: [
    // 注册独立一级单页
    {
      path: '/mslx-plugin-awesome',
      name: 'MslxPluginAwesomeBase',
      component: 'HOST_LAYOUT',
      meta: { title: '我的插件', icon: 'app', roleCode: ['admin', 'user'] },
      children: [
        {
          path: '',
          name: 'MslxPluginAwesome',
          component: DesignCardExample,
          meta: { title: '我的插件', hidden: true, roleCode: ['admin', 'user'] },
        },
      ],
    },
    // 注入到宿主现有一级菜单（例如：服务端管理子菜单）
    {
      parentName: 'instance',
      path: 'mslx-plugin-extra-setting',
      name: 'MslxPluginExtraSetting',
      component: DesignCardExample,
      meta: { title: '插件高级管理', icon: 'setting', roleCode: ['admin'] },
    }
  ],

  // 2. 界面扩展插槽注入清单
  extensions: [
    // 2.1 顶部导航栏快捷操作 (v1.7.9+)：下拉工具菜单（桌面端直显快捷按钮）
    {
      slot: 'header-action',
      type: 'dropdown',
      id: 'quick-tools',
      label: '快捷工具',
      icon: AppIcon,
      items: [
        // 侧滑抽屉
        {
          type: 'drawer',
          id: 'drawer-panel',
          label: '状态抽屉',
          icon: ViewListIcon,
          component: DesignCardExample,
          roleCode: ['admin'],
        },
        // 站内路由跳转
        {
          type: 'route',
          id: 'route-page',
          label: '插件管理页',
          icon: JumpIcon,
          to: { name: 'MslxPluginAwesome' },
        },
        // 外部链接
        {
          type: 'link',
          id: 'docs-link',
          label: '官方文档',
          icon: HelpCircleIcon,
          href: 'https://mslx.mslmc.cn/plugin-dev/',
          target: '_blank',
        },
        // 回调动作函数 (自动绑定节点上下文)
        {
          type: 'action',
          id: 'sync-action',
          label: '触发数据同步',
          icon: SettingIcon,
          run: async ({ nodeId }) => {
            MessagePlugin.success(`正在同步节点 ${nodeId} 的数据...`);
          },
        },
      ],
    },
    // 2.2 顶部快捷操作 (v1.7.9+)：悬浮窗（收纳至「更多操作」中）
    {
      slot: 'header-action',
      type: 'floating',
      id: 'floating-monitor',
      label: '监控悬浮窗',
      icon: DesktopIcon,
      component: DesignCardExample,
      placement: 'more',
    },
    // 2.3 注入到实例控制台“更多功能”下拉菜单
    {
      slot: 'instance-console-dropdown',
      component: DesignCardExample,
      label: '插件功能面板',
      icon: GitBranchIcon,
    },
    // 2.4 注入到实例配置页面左侧选项卡
    {
      slot: 'instance-settings-tab',
      component: DesignCardExample,
      label: '插件扩展配置',
      icon: SettingIcon,
    }
  ]
};

export default pluginConfig;
