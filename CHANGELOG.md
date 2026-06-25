# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-06-26

文档站主题交互与指南完善，附带一处多实例主题装配的 bug 修复。

### 修复

- **多实例主题装配**：`new TokUI({ theme })` 现在对 `'default'` 也调用 `setTheme`，修复连续构造 `dark` → `default` 实例时后者容器残留 `data-tokui-theme="dark"` 的问题。根因：主题管理是单例，`init()` 会把「上一次实例残留的 `currentTheme`」写到新容器，而构造器原先对 `'default'` 跳过了 `setTheme`。`ThemeShowcase` 切回 default 不生效即此因。新增 `test-theme.js` 多实例回归用例。
- **DSL 语法示例**：动态更新章节的 Playground 原为无关的 `stat` 示例，改为 `[progress]` + `[upd]` 序列，并提示 ⚡ 流式可重放 0% → 50% → 100% 跳动。

### 新增

- **主题切换演示器**（`ThemeShowcase`）：theming 页可实时切换风格族（default / modern）× 明暗（light / dark），驱动同一份 DSL 在四套主题下的渲染对比。Playground 新增 `theme` prop。

### 变更

- **Playground 跟随站点明暗**：渲染主题默认跟随 VitePress header 的 light/dark 切换（站点 dark → `'dark'`，light → `'default'`）；显式传 `theme` 则覆盖、不再跟随。
- **快速开始指南重写**：补全 npm 安装 / CDN / 浏览器示例 / 三种渲染方式 / React · Vue · Svelte · Next.js(Nuxt) SSR 集成 / 服务端 Builder 命名导出 `{ TokUIBuilder }` / 引入与样式路径。
- **主题指南重写**：4 套内置主题（default / dark / modern / modern-dark）、三层令牌体系、运行时 `setSeedColor` 自定义色板、构建期 `generateThemeTokens`、自定义主题步骤与三个坑（`color-scheme` / 二级语义变量 / `--danger` 别名）。

## [0.1.0] - 2026-06-25

首个公开 npm 发布版本（开源就绪）。零依赖流式 UI 描述与渲染框架。

### 新增

- **多格式构建产物**：`dist/tokui.{mjs,cjs}` + `dist/tokui.umd.js` + `tokui.css`，均带 sourcemap。`.mjs`/`.cjs` 用标准扩展名显式声明模块类型（消除 Node `MODULE_TYPELESS` 警告），ESM（打包器）/ UMD（CDN/`<script>`）/ CJS（Node `require`）三全。
- **框架适配器 monorepo**（pnpm workspace）：
  - `@jboltai/tokui-react` — `<TokUIView>` 组件 + `useTokUIStream()` hook
  - `@jboltai/tokui-vue` — `<TokUIView>` 组件 + `useTokUIStream()` 组合式
  - `@jboltai/tokui-svelte` — `use:tokui` action + `<TokUI>` 组件
  - `@jboltai/tokui-webc` — `<tokui-view>` 自定义元素（框架无关）
- **SSR 安全**：核心入口懒解析 + 三态守卫（Node CJS / 浏览器 / SSR no-op），`import` 不依赖 `window`/`document`，可在 Next.js / Nuxt / SvelteKit 服务端导入。
- **测试基建**：`npm test` 改为全量 `test:all`（24 文件 / 866+ 用例）；新增 `typecheck`（tsc，含反向断言）与 `coverage`（c8，核心模块 ~91%）。
- **发布防护**：`package.json` 的 `exports` 分流（import/require/browser/node）、`files` 白名单、`.npmignore`、`sideEffects`、`publishConfig.provenance`。
- **CDN 支持**：unpkg / jsdelivr 直接引用 UMD + CSS。

### 变更

- 包名从内部 `tokui` 改为 scoped `@jboltai/tokui`。
- `exports.require` 由 UMD 改指真 CJS（`tokui.cjs`），消除 Node `require` 的 UMD/伪 CJS 歧义。
- `engines.node` 提升到 `>=18`。
- DOM mock 的 `textContent`/`innerHTML` 改为 DOM 忠实行为（getter 聚合后代 / setter 以文本节点替换子节点），修复 `p v:muted` 变体与代码块未知语言回退两处测试。

### 修复

- `test-basic.js` 因 countdown 组件 `setInterval` 无销毁钩子导致进程挂起 —— runner 改为强制 `process.exit`。
- `test-layout.js` 的 `item content + nested list` 断言改为符合真实 DOM 聚合语义。
- `src/index.js` 与 `src/components/index.js` 的模块求值期裸读 `window.TokUI._internal` 改为运行期懒解析，SSR 导入不再依赖 bundler 保留 `require` 的怪癖。

[0.1.1]: https://github.com/jboltai/tokui/releases/tag/v0.1.1
[0.1.0]: https://github.com/jboltai/tokui/releases/tag/v0.1.0
