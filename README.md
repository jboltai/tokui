# TokUI

**[English](./README_EN.md)** | 简体中文

> 零运行时依赖的流式 UI 描述与渲染框架。后端用简洁 DSL 字符串描述 UI，经 SSE 流式推送，前端实时增量解析并渲染为真实 DOM。核心场景：AI 对话中的流式 UI 生成。

[![npm version](https://img.shields.io/npm/v/@jboltai/tokui.svg)](https://www.npmjs.com/package/@jboltai/tokui)
[![CI](https://github.com/jboltai/tokui/actions/workflows/ci.yml/badge.svg)](https://github.com/jboltai/tokui/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/@jboltai/tokui.svg)](https://www.npmjs.com/package/@jboltai/tokui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![零运行时依赖](https://img.shields.io/badge/runtime%20deps-0-brightgreen.svg)](#)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@jboltai/tokui.svg)](https://bundlephobia.com/package/@jboltai/tokui)

[在线体验（StackBlitz）](https://stackblitz.com/github/jboltai/tokui) · [组件画廊演示](./demo/index.html) · [DSL 完整参考](./demo/TOKUI_DSL_REFERENCE.md) · [文档站](https://tokui.jboltai.com/)

---

## 目录

- [特性](#特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [在框架中使用](#在框架中使用)
- [架构](#架构)
- [DSL 语法速查](#dsl-语法速查)
- [组件清单](#组件清单)
- [Builder API（服务端）](#builder-api服务端)
- [主题系统](#主题系统)
- [扩展组件](#扩展组件)
- [测试](#测试)
- [项目结构](#项目结构)
- [路线图](#路线图)
- [License](#license)

---

## 特性

- **零运行时依赖** —— 前后端均为原生 API，不引入任何运行时 npm 包；产物自包含，gzip 后 ~86KB（ESM）。
- **流式优先** —— 状态机增量解析，边收边渲染，首个字符到达即开始绘制 DOM。
- **简洁 DSL** —— `[card tt:标题][p 内容][/card]` 一行描述一个组件，AI 易生成、人易读。
- **框架无关** —— 原生 JS 可用，另提供 React / Vue / Svelte / Web Component 官方适配器。
- **插件化组件** —— `renderer.register(type, fn)` 注册，开箱即用 30+ 组件（卡片、表格、表单、图表、Markdown、代码高亮等）。
- **事件安全** —— 事件处理器为命名引用（`clk:`/`sub:`），需预先 `registerHandler` 注册，禁止注入可执行代码。
- **主题驱动** —— CSS 变量 + `data-tokui-theme` 切换，内置 HSB 算法的 10 级色阶生成器。
- **SSR 友好** —— `import` 不依赖 `window`/`document`，可在 Next.js / Nuxt / SvelteKit 等服务端导入（渲染在客户端进行）。
- **容错降级** —— 未注册组件渲染为 `div.tokui-unknown`，渲染抛错生成 `details.tokui-error`，单点错误不炸整页。
- **资源防护** —— `maxBuffer`（1MB）与 `maxDepth`（100）防止恶意/超长输入耗尽资源。

---

## 安装

```bash
# npm
npm install @jboltai/tokui

# pnpm
pnpm add @jboltai/tokui

# yarn
yarn add @jboltai/tokui
```

### CDN（零构建）

```html
<link rel="stylesheet" href="https://unpkg.com/@jboltai/tokui/dist/tokui.css">
<script src="https://unpkg.com/@jboltai/tokui/dist/tokui.umd.js"></script>
<!-- 挂载到 window.TokUI 命名空间 -->
```

> jsdelivr 同样可用：把 `unpkg.com` 换成 `cdn.jsdelivr.net/npm`。

---

## 快速开始

### 引入样式（npm 项目）

```js
import '@jboltai/tokui/css';   // 必须显式引入一次（库样式合一）
```

### 三种渲染方式

**1. 一次性渲染**

```js
import { TokUI } from '@jboltai/tokui';

const tokui = new TokUI({ container: '#app' });
tokui.render('[h1 Hello TokUI][p 这是一段文本]');
```

**2. 流式渲染（`feed()` 逐步输入）**

```js
const tokui = new TokUI({ container: '#app' });
tokui.startStream();
tokui.feed('[card tt:');
tokui.feed('流式卡片]');
tokui.feed('[p 内容边到边渲染]');
tokui.feed('[/card]');
tokui.endStream();   // 刷出缓冲区
```

**3. SSE 连接（服务端推流）**

```js
const tokui = new TokUI({
  container: '#chat',
  onEvent: (type, data) => {
    if (type === 'streamEnd') console.log('流结束');
  }
});
tokui.connect('/api/chat', { prompt: '画一个登录卡片' });
```

> SSE 协议约定：`data:` 行内为 JSON，取 `tokui` 字段喂给解析器；`[DONE]` 标记流结束。

### Node.js（服务端 Builder）

```js
import { TokUIBuilder } from '@jboltai/tokui/builder';

const b = new TokUIBuilder();
b.card({ tt: '标题' }).h2('内容').p('描述').end();
console.log(b.toString());  // [card tt:标题][h2 内容][p 描述][/card]
```

> Builder 是纯逻辑模块，可在任意 Node 运行时（含 Edge / Serverless）使用，无需 DOM。

---

## 在框架中使用

TokUI 提供官方框架适配器，让你用熟悉的声明式 API 渲染 DSL。适配器均 peer-depend 对应框架（不重复打包），并随 `@jboltai/tokui` 自动引入样式。

| 包 | 适用 | 入口 |
|------|------|------|
| [`@jboltai/tokui-react`](./packages/react) | React 16.8+ | `<TokUIView dsl={...} />` + `useTokUIStream()` |
| [`@jboltai/tokui-vue`](./packages/vue) | Vue 3 | `<TokUIView :dsl="..." />` + `useTokUIStream()` |
| [`@jboltai/tokui-svelte`](./packages/svelte) | Svelte 3.46+ | `use:tokui={{ dsl }}` action + `<TokUI />` |
| [`@jboltai/tokui-webc`](./packages/webc) | 任意框架 / 无框架 | `<tokui-view dsl="..."></tokui-view>` 自定义元素 |

### React

```jsx
import { TokUIView } from '@jboltai/tokui-react';

export function App() {
  return <TokUIView dsl="[card tt:你好][p 流式 UI][/card]" theme="default" />;
}
```

### Vue 3

```vue
<script setup>
import { TokUIView } from '@jboltai/tokui-vue';
const dsl = '[card tt:你好][p 流式 UI][/card]';
</script>
<template><TokUIView :dsl="dsl" /></template>
```

### Svelte

```svelte
<script>
  import { tokui } from '@jboltai/tokui-svelte';
</script>
<div use:tokui={{ dsl: '[card tt:你好][p 流式 UI][/card]' }}></div>
```

### Web Component（框架无关）

```js
import defineTokuiElement from '@jboltai/tokui-webc';
defineTokuiElement(); // 注册 <tokui-view>
```
```html
<tokui-view dsl="[card tt:你好][p 流式 UI][/card]"></tokui-view>
```

各适配器的流式 / SSE 用法见对应包 README。

---

## 架构

### 三层数据流

```
后端 TokUIBuilder 生成 DSL  →  SSE 推送  →  前端 TokUIParser 增量解析  →  TokUIRenderer 渲染 DOM
```

### 核心模块

| 模块 | 职责 |
|------|------|
| `core/parser.js` | 基于状态机（TEXT / TAG_OPEN / TAG_CLOSE）的流式解析器，支持 `feed()` 增量与 `parse()` 一次性 |
| `core/renderer.js` | 组件渲染引擎，`slotStack` 管理嵌套容器插槽，`VARIANTS` 白名单校验变体，深度上限 50 |
| `core/event-bus.js` | 事件总线单例，`registerHandler(name, fn)` 注册，DSL 用 `clk:`/`sub:` 绑定 |
| `core/theme.js` | CSS 变量驱动主题管理，`data-tokui-theme` 切换 |
| `core/color-generator.js` | 基于 HSB 算法的 10 级色板与主题 token 生成器 |
| `components/*` | 按类型分文件的组件库，`index.js` 统一注册 |
| `server/tokui-builder.js` | 链式 API 生成 DSL，支持 `toString()` 与 `toChunks()` 两种输出 |
| `server/sse-server.js` | Node.js 原生 http 实现的 SSE 演示服务器 |

---

## DSL 语法速查

```tokui
[组件类型 属性:值 内容文本]           ; 自闭合
[card tt:标题][p 内容][/card]         ; 容器嵌套
ph:"含空格的值"                       ; 值含空格用双引号
v:"primary,sm"                        ; 多变体逗号分隔
stripe                                ; 布尔属性（只写 key）
```

### 常用属性简写

| 简写 | 含义 | 简写 | 含义 |
|------|------|------|------|
| `tt` | title | `tx` | text |
| `l`  | label | `ph` | placeholder |
| `u`  | url   | `s`  | src / source |
| `n`  | name  | `v`  | value / variant |
| `act`| action | `mtd`| method |
| `clk`| onclick 处理器名 | `sub`| onsubmit 处理器名 |
| `dis`| disabled | `ro` | readonly |
| `req`| required | `chk`| checked |
| `id` | 元素 ID（也作 `upd` 更新目标） | `w/h/bg/fc` | 宽/高/背景/字色 |

### 布尔属性（只写 key）

`stripe` `dis` `ro` `req` `chk` `multi` `auto` `plain` `round` `closable` `bordered` `open` `pill` `dot` `leaf` `inline` `rounded` `container`

完整列表以 `parser.js` 的 `BOOLEAN_ATTRS` Set 为准。

### 变体系统

DSL 写 `v:primary`，渲染器生成 CSS 类 `tokui-btn--primary`。变体名经 `VARIANTS` 白名单校验，未知变体静默丢弃。

### 动态更新

```tokui
[upd id:目标ID v/act/tt/tx:新值]    ; 更新已渲染组件的值/动作/标题/文本
```

### 完整参考

详细属性表与容器类型清单见 [`demo/TOKUI_DSL_REFERENCE.md`](./demo/TOKUI_DSL_REFERENCE.md)。

---

## 组件清单

按文件分组，开箱即用：

| 文件 | 组件 |
|------|------|
| `basic.js` | 标题 h1–h6、段落、链接、Markdown、代码块、代码高亮、徽标、按钮、提示、分隔线等 |
| `table.js` | 表格（`table` / `thead` / `tbody` / `tr` / `desc`） |
| `form.js` | 表单、输入框、文本域、下拉、单选/复选、开关、日期选择器、标签输入等 |
| `layout.js` | 卡片、栅格行/列、列表、图片集、描述列表等 |
| `chart.js` | 纯 SVG 零依赖图表：bar / line / pie / radar / donut / scatter / gantt / funnel |
| `lightbox.js` | 图片灯箱预览 |

容器类型（需 `[/type]` 闭合，完整列表见 `parser.js` 的 `CONTAINERS` Set）：

```
form table thead tbody card ft row col list select radio code imgs md textarea
tabs tab accordion collapse dialog btngroup picker timeline steps drawer ol ul i
item think bubble toolbar badge-box dropdown transfer cascader tree tn step desc
carousel popover input-tag watermark menu
```

---

## Builder API（服务端）

`TokUIBuilder` 提供链式调用生成 DSL，两种输出方式：

```js
const b = new TokUIBuilder();

// toString() —— 一次性输出完整字符串
b.card({ tt: '卡片' }).p('内容').end();
const dsl = b.toString();

// toChunks() —— 分块数组，配合 SSE 逐块推送
const chunks = b.reset().card({ tt: '卡片' }).p('内容').end().toChunks();
```

**自动闭合**：`toString()` / `toChunks()` 内部调用 `_finalizeChunks()`，未关闭容器会自动补全，无需手动 `endAll()`。

**双行为方法**：`thead()`、`inputTag()`、`quickReply()`、`agent()` 根据参数自动选择自闭合或容器模式。

**命名避让**：布局用 `row_layout()` / `col_layout()` 以避让表格的 `row()`。

---

## 主题系统

通过 CSS 变量 + `data-tokui-theme` 属性切换：

```js
import { setTheme } from '@jboltai/tokui';
setTheme('dark');   // 切换为暗色主题
```

自定义主题色可用色阶生成器：

```js
import { generatePalette, generateThemeTokens } from '@jboltai/tokui';
const tokens = generateThemeTokens({ primary: '#1677ff', danger: '#ff4d4f' });
// 输出 { '--tokui-primary-1' ... '--tokui-primary-10' } 共 10 级 CSS 变量映射
```

---

## 扩展组件

新增一个组件需四步：

1. **注册渲染函数**（`src/components/*.js`）：

   ```js
   renderer.register('mycard', (node, rc, parentType) => {
     const el = renderer.el('div', { class: 'tokui-mycard' });
     el.textContent = node.attrs.tt || '';
     rc(node.children, el);   // 递归渲染子节点
     return el;
   });
   ```

2. **若为容器类型**，加入 `src/core/parser.js` 的 `CONTAINERS` Set。若内容含 `[` 不应被解析（如代码），同时加入 `_isRawContent()` 类型列表。

3. **添加 Builder 方法**（`src/server/tokui-builder.js`）：自闭合用 `_selfClosing()`，容器用 `_open()` / `end()`。

4. **添加样式**（`src/styles/tokui.css`）：类名 `.tokui-mycard`，变体用 `.tokui-mycard--{variant}` 并加入 `renderer.js` 的 `VARIANTS` 白名单。

最后在 `tests/` 补测试（见下）。

---

## 测试

基于 Node.js 内置 `assert` 的自定义 runner，零测试框架依赖：

```bash
npm test            # 全量 24 个测试文件，866+ 用例
npm run test:parser # 仅解析器
npm run test:builder
npm run test:core   # event-bus + theme + renderer
npm run typecheck   # tsc 类型检查（含反向 @ts-expect-error 断言）
npm run coverage    # c8 覆盖率（核心模块 ~91%）

node tests/test-xxx.js          # 跑单个测试文件
```

renderer 测试依赖 `tests/helpers/dom-mock.js` 提供的最小化 DOM mock。断言失败进程退出码为 1。

---

## 项目结构

```
.
├── src/
│   ├── core/              # 解析器、渲染器、事件总线、主题、色阶生成器
│   ├── components/        # 组件库（basic/table/form/layout/chart/lightbox）
│   ├── server/            # Builder 链式 API + SSE 演示服务器
│   ├── styles/            # tokui.css + themes/（default, dark）
│   └── index.js           # 主入口，整合 TokUI 类
├── packages/              # 框架适配器 monorepo（pnpm workspace）
│   ├── react/             # @jboltai/tokui-react
│   ├── vue/               # @jboltai/tokui-vue
│   ├── svelte/            # @jboltai/tokui-svelte
│   ├── webc/              # @jboltai/tokui-webc（Web Component）
├── demo/                  # 组件画廊演示
├── tests/                 # 自定义 runner 测试套件（24 文件 / 866+ 用例）
├── docs/                  # VitePress 文档站
└── package.json
```

---

## 路线图

TokUI 正在向多语言后端 SDK 与多样式库前端主题演进。

> 图例：✅ 已支持　·　🚧 规划中

### 后端 SDK 多语言支持

| 语言 / 运行时 | 状态 | 说明 |
|---------------|:----:|------|
| Node.js | ✅ | `TokUIBuilder` 链式 API + SSE 演示服务器（当前唯一实现） |
| Python | 🚧 | 规划中 |
| Rust | 🚧 | 规划中 |
| Java | 🚧 | 规划中 |
| Go | 🚧 | 规划中 |
| 跨语言 DSL 规范固化 | 🚧 | 共享解析契约，保证各 SDK 输出一致 |

### 前端集成

| 能力 | 状态 | 说明 |
|------|:----:|------|
| React / Vue / Svelte / Web Component 适配器 | ✅ | `@jboltai/tokui-{react,vue,svelte,webc}` |
| CSS 变量主题（`default` / `dark`） | ✅ | `data-tokui-theme` 切换 |
| HSB 色板生成器 | ✅ | 任意主色生成 10 级色阶 |
| TailwindCSS 适配 | 🚧 | 原子类映射 / 主题 token 桥接 |
| UnoCSS 适配 | 🚧 | 规划中 |
| 主题市场 / 主题分享 | 🚧 | 社区可分享主题包 |

---

## License

[MIT](./LICENSE)
