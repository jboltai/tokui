// TokUI —— 自定义主题
// 全局注册 Playground / Demo 组件 + 引入文档站专属样式
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import '@tokui-css'; // TokUI 库样式（dist/tokui.css，config alias）
import './styles.css';
import Playground from './components/Playground.vue';
import Demo from './components/Demo.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('Playground', Playground);
    app.component('Demo', Demo);
    // 百度统计 SPA PV 上报：VitePress 是单页应用，路由切换默认只统计首次加载；
    // 监听 onAfterRouteChanged 手动 _trackPageview，每次切文档页都计一次 PV。
    if (typeof window !== 'undefined' && router) {
      const _hmt = (window as any)._hmt = (window as any)._hmt || [];
      router.onAfterRouteChanged = (to) => _hmt.push(['_trackPageview', to]);
    }
  },
} satisfies Theme;
