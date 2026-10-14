/**
 * MSLX 前端插件标准注册入口示例
 */
import { AppIcon, SettingIcon, GitBranchIcon } from 'tdesign-icons-vue-next';
import DesignCardExample from './DesignCardExample.vue';

export const pluginConfig = {
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
    // 注入到实例控制台“更多功能”下拉菜单
    {
      slot: 'instance-console-dropdown',
      component: DesignCardExample,
      label: '插件功能面板',
      icon: GitBranchIcon,
    },
    // 注入到实例配置页面左侧选项卡
    {
      slot: 'instance-settings-tab',
      component: DesignCardExample,
      label: '插件扩展配置',
      icon: SettingIcon,
    }
  ]
};

export default pluginConfig;
