# Quick Start

Get TokUI running in 5 minutes: install → import → three render modes → framework integration → server-side Builder.

TokUI is published to npm as **`@jboltai/tokui`** and has zero runtime dependencies.

## Install

Pick the option that matches your setup.

### 1. npm / pnpm / yarn (recommended, with a bundler)

```bash
npm install @jboltai/tokui
# or
pnpm add @jboltai/tokui
yarn add @jboltai/tokui
```

### 2. CDN (no build step, direct in HTML)

For static pages, demos, CodePen. Use `unpkg` or `jsdelivr`:

```html
<link rel="stylesheet" href="https://unpkg.com/@jboltai/tokui/dist/tokui.css">
<script src="https://unpkg.com/@jboltai/tokui/dist/tokui.umd.js"></script>
```

UMD exposes the whole library as the global `window.TokUI` namespace — see the [browser example](#browser-cdn-example) below.

### 3. Clone the source (only for hacking / contributing)

```bash
git clone https://github.com/jboltai/tokui.git
cd tokui
npm install
npm run build      # produces dist/tokui.{mjs,cjs,umd.js} + tokui.css
```

> The demo pages (`demo/*.html`) reference build artifacts — run `npm run build` first after cloning.

## Import

TokUI ships both a **default namespace export** and **named exports** — they are equivalent:

```js
// Option A: default namespace (matches the UMD/CDN usage)
import TokUI from '@jboltai/tokui';
const ui = new TokUI.TokUI({ container: '#app' });

// Option B: named export (recommended, more concise)
import { TokUI } from '@jboltai/tokui';
const ui = new TokUI({ container: '#app' });
```

Don't forget the styles. Either way works:

```js
// Option 1: explicit CSS import (recommended; resolves via the ./css export)
import '@jboltai/tokui/css';

// Option 2: the JS entry already imports the CSS internally, so Vite/Webpack
//           will bundle it automatically (import TokUI from '@jboltai/tokui').
//           Explicit is clearer though.
```

Available named exports: `TokUI` (the class), `registerHandler` / `removeHandler` (events), `setTheme` / `getTheme` (themes), `el` (DOM helper).

## Browser (CDN) example

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
    // Under UMD the library lives on window.TokUI
    const ui = new TokUI.TokUI({ container: '#app' });
    ui.render('[h1 Hello TokUI][p Some text][btn tx:Click v:primary]');
  </script>
</body>
</html>
```

## Three rendering modes

### 1. One-shot render with `render()`

Pass a complete DSL string and render it at once:

```js
import { TokUI } from '@jboltai/tokui';
import '@jboltai/tokui/css';

const ui = new TokUI({ container: '#app' });
ui.render('[h1 Hello TokUI][p Rendered in one shot]');
```

<Playground dsl='[h1 Hello TokUI][p Rendered in one shot][btn tx:Click v:primary]' />

### 2. Manual streaming with `startStream()` + `feed()` + `endStream()`

Render as chunks arrive — great for typewriter effects or WebSocket / chunked sources:

```js
const ui = new TokUI({ container: '#app' });
ui.startStream();
ui.feed('[card tt:');
ui.feed('Streaming card]');
ui.feed('[p Content renders as it arrives]');
ui.feed('[/card]');
ui.endStream();   // flush the remaining buffer
```

Chunks split at any position parse correctly — that's the state-machine parser at work. See [Streaming](./streaming).

### 3. SSE auto-connect with `connect()`

Wraps `EventSource` to talk to an SSE endpoint:

```js
const ui = new TokUI({
  container: '#chat',
  onEvent: (type, data) => {
    if (type === 'streamEnd') console.log('done', data);
  },
});
ui.connect('/api/chat/stream', { prompt: 'Draw a login card' });
```

**SSE protocol**:

- Each `data:` line is JSON — its `tokui` field is fed to the parser as a DSL chunk.
- `[DONE]` marks the end of the stream.

On the server, use `TokUIBuilder.toChunks()` to split the DSL into a chunk array and push each one as a `data:` line. Full example in [API · Builder](/en/api/builder).

## Framework integration

TokUI touches raw DOM and is framework-agnostic. There's one rule:

> **Hand the container DOM node to TokUI, and call `disconnect()` on unmount** (removes internal DOM, aborts SSE, flushes buffers).
>
> TokUI takes over the mount point's inner DOM — **don't let the host framework render children into the same container**, or its virtual DOM and TokUI will clobber each other. Give TokUI an empty, dedicated container.

### React

```jsx
import { useEffect, useRef } from 'react';
import { TokUI } from '@jboltai/tokui';
import '@jboltai/tokui/css';

function TokUIView() {
  const ref = useRef(null);
  useEffect(() => {
    const ui = new TokUI({ container: ref.current });
    ui.render('[h1 Hello TokUI][p React integration]');
    return () => ui.disconnect();   // cleanup on unmount
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
  ui.render('[h1 Hello TokUI][p Vue integration]');
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
    ui.render('[h1 Hello TokUI][p Svelte integration]');
  });
  onDestroy(() => ui.disconnect());
</script>

<div bind:this={el} />
```

> Streaming / SSE work the same way: call `startStream()` or `connect()` inside the mount lifecycle, and `disconnect()` on unmount.

### SSR frameworks (Next.js / Nuxt)

TokUI needs `document` at construction time, so it **runs browser-side only**. In SSR frameworks, make sure the component renders only on the client:

```tsx
// Next.js (App Router) — mark the component as a client component,
// and construct inside useEffect so it never runs on the server
'use client';
import { useEffect, useRef } from 'react';
import { TokUI } from '@jboltai/tokui';
import '@jboltai/tokui/css';

export default function TokUIView() {
  const ref = useRef(null);
  useEffect(() => {
    const ui = new TokUI({ container: ref.current });
    ui.render('[h1 Hello TokUI][p Next.js integration]');
    return () => ui.disconnect();
  }, []);
  return <div ref={ref} />;
}
```

Nuxt and other SSR frameworks are the same: wrap with `<ClientOnly>`, or dynamic-import with `{ ssr: false }`, so `new TokUI()` only runs in the browser.

## Server-side Builder (Node.js)

On the server, use `TokUIBuilder` to chain-build DSL strings and push them over SSE. Import it via the `@jboltai/tokui/builder` subpath (**note: it's a named export**):

```js
// CommonJS
const { TokUIBuilder } = require('@jboltai/tokui/builder');

// ESM (Node ≥20 detects CJS named exports automatically)
import { TokUIBuilder } from '@jboltai/tokui/builder';

const b = new TokUIBuilder();
b.card({ tt: 'Title' }).h2('Content').p('Desc').end();
console.log(b.toString());
// [card tt:Title][h2 Content][p Desc][/card]

// Streaming output: split into a chunk array, push each over SSE data: lines
const chunks = b.toChunks();
```

Full Builder API in [API · Builder](/en/api/builder).

## Next steps

- [DSL Syntax](./dsl-syntax) — components, attributes, containers, variants
- [Streaming](./streaming) — state-machine parsing and SSE details
- [Theming](./theming) — CSS variables, light/dark, custom palettes
- [Component Showcase](/en/components/showcase) — gallery of 150+ components
