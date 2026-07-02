// TokUI —— 自定义主题
// 全局注册 Playground / Demo 组件 + 引入文档站专属样式
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import '@tokui-css'; // TokUI 库样式（dist/tokui.css，config alias）
import './styles.css';
import pkg from '../../../package.json'; // 版本胶囊（hero h1 .name 注入）自动同步
import Playground from './components/Playground.vue';
import Demo from './components/Demo.vue';
import ThemeShowcase from './components/ThemeShowcase.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('Playground', Playground);
    app.component('Demo', Demo);
    app.component('ThemeShowcase', ThemeShowcase);
    // 首页 hero h1（.name = "TokUI"）右侧追加版本胶囊 <a> —— 跳 npm 包页。
    // hero.name 在 frontmatter 是纯文本，::after 伪元素不可点，故运行时插入真 <a>。
    // enhanceApp 在客户端水合时跑（DOMContentLoaded 已触发），故立即调用 + SPA 路由切换补注入。
    if (typeof window !== 'undefined') {
      const injectVersion = () => {
        const nameEl = document.querySelector('.VPHero .name');
        if (!nameEl || nameEl.querySelector('.vp-version-link')) return; // 非首页 / 已注入则跳过
        const a = document.createElement('a');
        a.className = 'vp-version-link';
        a.href = 'https://www.npmjs.com/package/@jboltai/tokui';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = `v${pkg.version}`;
        nameEl.appendChild(a);
      };
      requestAnimationFrame(injectVersion); // 首次加载：等 SSR DOM 水合后再注入（避免 hydration 清理多余子节点）
      // 百度统计 SPA PV 上报 + 版本胶囊补注入：合并到同一 onAfterRouteChanged（勿覆盖）
      const _hmt = (window as any)._hmt = (window as any)._hmt || [];
      if (router) {
        router.onAfterRouteChanged = (to) => {
          _hmt.push(['_trackPageview', to]);
          // SPA 切到首页时 hero 是新挂载的 Vue 节点，原 <a> 丢失，需重新注入；
          // 等下一帧 DOM 更新落地后再查
          requestAnimationFrame(injectVersion);
        };
      }
    }
  },
} satisfies Theme;
