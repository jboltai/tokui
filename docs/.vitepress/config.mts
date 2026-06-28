// TokUI — VitePress 配置
// 双语：中文默认（root /），英文 /en/
// srcExclude 排除 superpowers 内部文档与审查报告，避免污染路由/侧边栏
import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';

// TokUI 构建产物别名 —— Playground 动态 import('@tokui-umd') 接入实时渲染。
// 用 dist UMD：VitePress build 走 Rollup，无法 interop src 的 CJS default import，
// 故引已构建的 dist（运行时挂 window.TokUI）。改 src/ 后需 `pnpm dev:lib` 重产 dist。
const tokuiUmd = fileURLToPath(new URL('../../dist/tokui.umd.js', import.meta.url));
const tokuiCss = fileURLToPath(new URL('../../dist/tokui.css', import.meta.url));

export default defineConfig({
  title: 'TokUI',
  description: '零依赖的流式 UI 描述与渲染框架 · Streaming UI DSL Framework',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,

  // 排除非文档内容：superpowers 工具的 plan/spec + 项目审查报告
  srcExclude: ['superpowers/**', 'superpowers', 'TokUI 项目全面审查报告.md'],

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: 'https://assets.vdata.chat/jboltai/aiimg/logo_60.png' }],
    ['meta', { name: 'keywords', content: 'TokUI, 流式UI, DSL, SSE, streaming UI, VitePress' }],
    // 百度统计：后台「管理 → 代码获取」拿到 hm.js?xxx 的 xxx 填到下方 src（替换 你的百度统计ID）
    ['script', {}, 'var _hmt = _hmt || [];'],
    ['script', { src: 'https://hm.baidu.com/hm.js?c5e3079db99f07a30d54e2915132bb16', async: true }],
  ],

  vite: {
    resolve: {
      alias: {
        '@tokui-umd': tokuiUmd,
        '@tokui-css': tokuiCss,
      },
    },
  },

  // 代码块语言别名：TokUI DSL 非标准语言，Shiki 无内置 grammar 会 fallback 到 txt 并告警。
  // alias 到 ini（方括号 section + key:val 与 DSL 的 [tag attr:val] 形态最接近）。
  markdown: {
    languageAlias: {
      dsl: 'ini',
      tokui: 'ini',
    },
  },

  locales: {
    // 中文（默认，根路径）
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: zhNav(),
        sidebar: zhSidebar(),
        docFooter: { prev: '上一页', next: '下一页' },
        outline: { label: '本页目录', level: [2, 3] },
        lastUpdated: { text: '最后更新' },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
      },
    },
    // 英文
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: enNav(),
        sidebar: enSidebar(),
        outline: { label: 'On this page', level: [2, 3] },
        lastUpdated: { text: 'Last updated' },
        returnToTopLabel: 'Back to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Theme',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme',
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jboltai/tokui' },
      {
        icon: {
          svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296Z"/></svg>',
        },
        link: 'https://gitee.com/jboltai_main/tokui',
        ariaLabel: 'Gitee',
      },
    ],
    search: { provider: 'local' },
    footer: {
      message: '由 <a href="https://jboltai.com" target="_blank" rel="noopener noreferrer">JBoltAI 团队</a> 开源贡献',
      copyright: 'MIT License · TokUI',
    },
  },
});

// ============ 中文导航 / 侧边栏 ============
function zhNav() {
  return [
    { text: '指南', link: '/guide/introduction', activeMatch: '/guide/' },
    { text: '组件', link: '/components/basic', activeMatch: '/components/' },
    { text: '演示平台', link: 'https://tokui_demo.jboltai.com' },
    { text: 'API', link: '/api/builder', activeMatch: '/api/' },
    { text: 'JBoltAI', link: 'https://jboltai.com' },
    { text: '关于我们', link: 'https://vecspc.com/about.html' },
    { text: '视频站', link: 'https://www.bilibili.com/video/BV1GDJw61ENJ' },
    { text: '加入社群', link: '/community' },
  ];
}

function zhSidebar() {
  return {
    '/guide/': [
      {
        text: '入门',
        items: [
          { text: '介绍', link: '/guide/introduction' },
          { text: '快速开始', link: '/guide/getting-started' },
        ],
      },
      {
        text: '核心',
        items: [
          { text: 'DSL 语法', link: '/guide/dsl-syntax' },
          { text: '流式渲染', link: '/guide/streaming' },
          { text: '主题系统', link: '/guide/theming' },
        ],
      },
    ],
    '/components/': [
      {
        text: '组件',
        items: [
          { text: '基础组件', link: '/components/basic' },
          { text: '表单控件', link: '/components/form' },
          { text: '数据展示', link: '/components/data' },
          { text: '布局容器', link: '/components/layout' },
          { text: '图表', link: '/components/chart' },
          { text: 'AI 对话', link: '/components/ai-chat' },
          { text: '综合案例', link: '/components/showcase' },
        ],
      },
    ],
    '/api/': [
      {
        text: 'API',
        items: [{ text: 'Builder（服务端）', link: '/api/builder' }],
      },
      {
        text: '多语言 SDK（开发中）',
        collapsed: true,
        items: [
          { text: 'Python 🚧', link: '/api/python' },
          { text: 'Rust 🚧', link: '/api/rust' },
          { text: 'Java 🚧', link: '/api/java' },
          { text: 'Go 🚧', link: '/api/go' },
          { text: 'C# / .NET 🚧', link: '/api/csharp' },
        ],
      },
    ],
  };
}

// ============ 英文导航 / 侧边栏 ============
function enNav() {
  return [
    { text: 'Guide', link: '/en/guide/introduction', activeMatch: '/en/guide/' },
    { text: 'Components', link: '/en/components/basic', activeMatch: '/en/components/' },
    { text: 'Demo', link: 'https://tokui_demo.jboltai.com' },
    { text: 'API', link: '/en/api/builder', activeMatch: '/en/api/' },
    { text: 'JBoltAI', link: 'https://jboltai.com' },
    { text: 'About', link: 'https://vecspc.com/about.html' },
    { text: 'Video', link: 'https://www.bilibili.com/video/BV1GDJw61ENJ' },
    { text: 'Community', link: '/en/community' },
  ];
}

function enSidebar() {
  return {
    '/en/guide/': [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/en/guide/introduction' },
          { text: 'Quick Start', link: '/en/guide/getting-started' },
        ],
      },
      {
        text: 'Core',
        items: [
          { text: 'DSL Syntax', link: '/en/guide/dsl-syntax' },
          { text: 'Streaming', link: '/en/guide/streaming' },
          { text: 'Theming', link: '/en/guide/theming' },
        ],
      },
    ],
    '/en/components/': [
      {
        text: 'Components',
        items: [
          { text: 'Basic', link: '/en/components/basic' },
          { text: 'Form', link: '/en/components/form' },
          { text: 'Data Display', link: '/en/components/data' },
          { text: 'Layout', link: '/en/components/layout' },
          { text: 'Chart', link: '/en/components/chart' },
          { text: 'AI Chat', link: '/en/components/ai-chat' },
          { text: 'Showcase', link: '/en/components/showcase' },
        ],
      },
    ],
    '/en/api/': [
      {
        text: 'API',
        items: [{ text: 'Builder (Server)', link: '/en/api/builder' }],
      },
      {
        text: 'Multi-language SDKs (WIP)',
        collapsed: true,
        items: [
          { text: 'Python 🚧', link: '/en/api/python' },
          { text: 'Rust 🚧', link: '/en/api/rust' },
          { text: 'Java 🚧', link: '/en/api/java' },
          { text: 'Go 🚧', link: '/en/api/go' },
          { text: 'C# / .NET 🚧', link: '/en/api/csharp' },
        ],
      },
    ],
  };
}
