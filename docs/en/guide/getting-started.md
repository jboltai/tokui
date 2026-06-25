# Quick Start

## Install

TokUI has zero runtime dependencies — just clone:

```bash
git clone https://github.com/jboltai/tokui.git tokui
cd tokui
```

## Browser usage (build artifact)

Include the build artifacts and mount to a container:

```html
<link rel="stylesheet" href="./dist/tokui.css">
<script src="./dist/tokui.umd.js"></script>

<div id="app"></div>
<script>
  const tokui = new TokUI.TokUI({ container: '#app' });
  tokui.render('[h1 Hello TokUI][p Some text]');
</script>
```

## Three rendering modes

### 1. One-shot render

```js
const tokui = new TokUI.TokUI({ container: '#app' });
tokui.render('[h1 Hello TokUI][p Some text]');
```

<Playground dsl='[h1 Hello TokUI][p Rendered in one shot][btn tx:Click v:primary]' />

### 2. Streaming render (`feed()`)

Feed chunks as they arrive — great for typewriter effects or streaming sources:

```js
const tokui = new TokUI.TokUI({ container: '#app' });
tokui.startStream();
tokui.feed('[card tt:');
tokui.feed('Streaming card]');
tokui.feed('[p Content renders as it arrives]');
tokui.feed('[/card]');
tokui.endStream();
```

See [Streaming](./streaming).

### 3. SSE connection

```js
const tokui = new TokUI.TokUI({
  container: '#chat',
  onEvent: (type, data) => {
    if (type === 'streamEnd') console.log('done');
  },
});
tokui.connect('/api/chat', { prompt: 'Draw a login card' });
```

SSE protocol: each `data:` line is JSON — the `tokui` field is fed to the parser; `[DONE]` marks the end.

## Framework integration (Vue / React / Svelte)

TokUI renders raw DOM and is framework-agnostic. Integration boils down to one rule: **pass the container DOM node to TokUI, and call `disconnect()` on unmount** (removes internal DOM, aborts SSE, flushes buffers).

Three equivalent snippets below — pick your framework.

### React

```jsx
import { useEffect, useRef } from 'react';

function TokUIView() {
  const ref = useRef(null);
  useEffect(() => {
    const tokui = new TokUI.TokUI({ container: ref.current });
    tokui.render('[h1 Hello TokUI][p React integration]');
    return () => tokui.disconnect();   // cleanup on unmount
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

const el = ref(null);
let tokui;
onMounted(() => {
  tokui = new TokUI.TokUI({ container: el.value });
  tokui.render('[h1 Hello TokUI][p Vue integration]');
});
onBeforeUnmount(() => tokui.disconnect());
</script>
```

### Svelte

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  let el, tokui;
  onMount(() => {
    tokui = new TokUI.TokUI({ container: el });
    tokui.render('[h1 Hello TokUI][p Svelte integration]');
  });
  onDestroy(() => tokui.disconnect());
</script>

<div bind:this={el} />
```

> Streaming / SSE works the same way: call `startStream()` or `connect()` inside the mount lifecycle, and `disconnect()` on unmount.
>
> Note: TokUI takes over the mount point's inner DOM. Don't let the host framework render children into the same container (virtual DOM and TokUI would clobber each other).

## Node.js (server-side Builder)

```js
const TokUIBuilder = require('./src/server/tokui-builder');
const b = new TokUIBuilder();
b.card({ tt: 'Title' }).h2('Content').p('Desc').end();
console.log(b.toString());
// [card tt:Title][h2 Content][p Desc][/card]
```

Full Builder API in [API · Builder](/en/api/builder).
