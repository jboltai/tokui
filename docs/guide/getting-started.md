# 快速开始

本页用 5 分钟把 TokUI 跑起来：安装 → 引入 → 三种渲染方式 → 框架集成 → 服务端 Builder。

TokUI 已发布到 npm，包名为 **`@jboltai/tokui`**，运行时零依赖。

## 安装

按你的场景三选一。

### 1. npm / pnpm / yarn（推荐，配合打包器）

```bash
npm install @jboltai/tokui
# 或
pnpm add @jboltai/tokui
yarn add @jboltai/tokui
```

### 2. CDN（无需构建，HTML 直引）

适合静态页、Demo、CodePen。`unpkg` 与 `jsdelivr` 任选：

```html
<link rel="stylesheet" href="https://unpkg.com/@jboltai/tokui/dist/tokui.css">
<script src="https://unpkg.com/@jboltai/tokui/dist/tokui.umd.js"></script>
```

UMD 把整个库挂到全局 `window.TokUI` 命名空间，用法见下方[浏览器示例](#浏览器-cdn-示例)。

### 3. 源码克隆（仅二次开发 / 贡献代码）

```bash
git clone https://github.com/jboltai/tokui.git
cd tokui
npm install
npm run build      # 产出 dist/tokui.{mjs,cjs,umd.js} + tokui.css
```

> Demo 页（`demo/*.html`）引用构建产物，clone 后需先 `npm run build` 才能打开。

## 引入

TokUI 同时提供 **默认命名空间导出** 和 **命名导出**，二者等价：

```js
// 方式 A：默认命名空间（与 UMD/CDN 写法一致）
import TokUI from '@jboltai/tokui';
const ui = new TokUI.TokUI({ container: '#app' });

// 方式 B：命名导出（推荐，更简洁）
import { TokUI } from '@jboltai/tokui';
const ui = new TokUI({ container: '#app' });
```

别忘了样式。两种方式任选其一：

```js
// 方式 1：显式引入 CSS（推荐，路径走 package.json 的 ./css 导出）
import '@jboltai/tokui/css';

// 方式 2：库 JS 入口内部已 import 样式，Vite/Webpack 会自动打包
//        （import TokUI from '@jboltai/tokui' 即可，但建议显式写一遍更清晰）
```

可用的具名导出：`TokUI`（核心类）、`registerHandler` / `removeHandler`（事件）、`setTheme` / `getTheme`（主题）、`el`（DOM 快捷方法）。

## 浏览器 CDN 示例

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://unpkg.com/@jboltai/tokui/dist/tokui.css">
  <script src="https://unpkg.com/@jboltai/tokui/dist/tokui.umd.js"></script>
</head>
<body>
  <div id="app"></div>
  <script>
    // UMD 下库挂在 window.TokUI 命名空间
    const ui = new TokUI.TokUI({ container: '#app' });
    ui.render('[h1 Hello TokUI][p 这是一段文本][btn tx:点我 v:primary]');
  </script>
</body>
</html>
```

## 三种渲染方式

### 1. 一次性渲染 `render()`

拿到完整 DSL 字符串，一次画出：

```js
import { TokUI } from '@jboltai/tokui';
import '@jboltai/tokui/css';

const ui = new TokUI({ container: '#app' });
ui.render('[h1 Hello TokUI][p 这是一次性渲染的段落]');
```

<Playground dsl='[h1 Hello TokUI][p 这是一次性渲染的段落][btn tx:点击 v:primary]' />

### 2. 手动流式 `startStream()` + `feed()` + `endStream()`

边收边画，适合打字机效果、对接 WebSocket / 分块数据源：

```js
const ui = new TokUI({ container: '#app' });
ui.startStream();
ui.feed('[card tt:');
ui.feed('流式卡片]');
ui.feed('[p 内容边到边渲染]');
ui.feed('[/card]');
ui.endStream();   // 刷出缓冲区残余
```

任意位置切断的分片都能正确解析，这是状态机解析器的能力。详见 [流式渲染](./streaming)。

### 3. SSE 自动连接 `connect()`

封装 `EventSource`，对接服务端 SSE 流：

```js
const ui = new TokUI({
  container: '#chat',
  onEvent: (type, data) => {
    if (type === 'streamEnd') console.log('流结束', data);
  },
});
ui.connect('/api/chat/stream', { prompt: '画一个登录卡片' });
```

**SSE 协议约定**：

- 每个 `data:` 行内为 JSON，取其中的 `tokui` 字段作为 DSL 分片喂给解析器。
- `[DONE]` 标记流结束。

服务端可用 `TokUIBuilder.toChunks()` 把 DSL 切成分块数组逐块推送，完整示例见 [API · Builder](/api/builder)。

## 框架集成

TokUI 直接操作原生 DOM，与上层框架无关。集成只有一条规则：

> **拿到容器 DOM 节点交给 TokUI，组件卸载时调 `disconnect()` 清理**（移除内部 DOM、中止 SSE、刷缓冲区）。
>
> TokUI 会接管挂载点内部 DOM —— **不要让宿主框架再往同一容器渲染子节点**，否则虚拟 DOM 与 TokUI 会互相覆盖。给 TokUI 一个空的、独占的容器即可。

### React

```jsx
import { useEffect, useRef } from 'react';
import { TokUI } from '@jboltai/tokui';
import '@jboltai/tokui/css';

function TokUIView() {
  const ref = useRef(null);
  useEffect(() => {
    const ui = new TokUI({ container: ref.current });
    ui.render('[h1 Hello TokUI][p React 集成]');
    return () => ui.disconnect();   // 卸载清理
  }, []);
  return <div ref={ref} />;
}
```

### Vue 3

```vue
<template>
  <div ref="el" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { TokUI } from '@jboltai/tokui';
import '@jboltai/tokui/css';

const el = ref(null);
let ui;
onMounted(() => {
  ui = new TokUI({ container: el.value });
  ui.render('[h1 Hello TokUI][p Vue 集成]');
});
onBeforeUnmount(() => ui.disconnect());
</script>
```

### Svelte

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { TokUI } from '@jboltai/tokui';
  import '@jboltai/tokui/css';

  let el, ui;
  onMount(() => {
    ui = new TokUI({ container: el });
    ui.render('[h1 Hello TokUI][p Svelte 集成]');
  });
  onDestroy(() => ui.disconnect());
</script>

<div bind:this={el} />
```

> 流式 / SSE 场景同理：在挂载生命周期里 `startStream()` 或 `connect()`，卸载时 `disconnect()`。

### SSR 框架（Next.js / Nuxt）

TokUI 构造时依赖 `document`，**只能在浏览器端运行**。在 SSR 框架里需确保组件仅客户端渲染：

```tsx
// Next.js（App Router）—— 整个组件标为 client 组件，
// 构造放在 useEffect 里，不会在服务端执行
'use client';
import { useEffect, useRef } from 'react';
import { TokUI } from '@jboltai/tokui';
import '@jboltai/tokui/css';

export default function TokUIView() {
  const ref = useRef(null);
  useEffect(() => {
    const ui = new TokUI({ container: ref.current });
    ui.render('[h1 Hello TokUI][p Next.js 集成]');
    return () => ui.disconnect();
  }, []);
  return <div ref={ref} />;
}
```

Nuxt / 其他 SSR 框架同理：用 `<ClientOnly>` 包裹，或用动态导入 `{ ssr: false }`，确保 `new TokUI()` 只在浏览器执行。

## 服务端 Builder（Node.js）

服务端用 `TokUIBuilder` 链式生成 DSL 字符串，配合 SSE 推送。通过 `@jboltai/tokui/builder` 子路径引入（**注意是命名导出**）：

```js
// CommonJS
const { TokUIBuilder } = require('@jboltai/tokui/builder');

// ESM（Node ≥20 会自动识别 CJS 命名导出）
import { TokUIBuilder } from '@jboltai/tokui/builder';

const b = new TokUIBuilder();
b.card({ tt: '标题' }).h2('内容').p('描述').end();
console.log(b.toString());
// [card tt:标题][h2 内容][p 描述][/card]

// 流式输出：切成分块数组，逐块走 SSE data: 推送
const chunks = b.toChunks();
```

完整 Builder API 见 [API · Builder](/api/builder)。

## 下一步

- [DSL 语法](./dsl-syntax) —— 组件、属性、容器、变体速查
- [流式渲染](./streaming) —— 状态机解析与 SSE 接入细节
- [主题](./theming) —— CSS 变量、深浅色、自定义色阶
- [组件总览](/components/showcase) —— 150+ 组件画廊
