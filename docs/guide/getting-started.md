# 快速开始

## 安装

TokUI 运行时零依赖，克隆即用：

```bash
git clone https://github.com/jboltai/tokui.git tokui
cd tokui
```

## 浏览器使用（CDN / 构建产物）

在 HTML 中引入构建产物，挂载到容器：

```html
<link rel="stylesheet" href="./dist/tokui.css">
<script src="./dist/tokui.umd.js"></script>

<div id="app"></div>
<script>
  const tokui = new TokUI.TokUI({ container: '#app' });
  tokui.render('[h1 Hello TokUI][p 这是一段文本]');
</script>
```

> 若用源码直引（无构建产物），按顺序引入 `src/core/*` → `src/components/*` → `src/index.js`，详见 README。

## 三种渲染方式

### 1. 一次性渲染

```js
const tokui = new TokUI.TokUI({ container: '#app' });
tokui.render('[h1 Hello TokUI][p 这是一段文本]');
```

<Playground dsl='[h1 Hello TokUI][p 这是一次性渲染的段落][btn tx:点击 v:primary]' />

### 2. 流式渲染（`feed()` 逐步输入）

边收边渲染，适合模拟打字机效果或对接流式数据源：

```js
const tokui = new TokUI.TokUI({ container: '#app' });
tokui.startStream();
tokui.feed('[card tt:');
tokui.feed('流式卡片]');
tokui.feed('[p 内容边到边渲染]');
tokui.feed('[/card]');
tokui.endStream();   // 刷出缓冲区
```

详见 [流式渲染](./streaming)。

### 3. SSE 连接（服务端推流）

```js
const tokui = new TokUI.TokUI({
  container: '#chat',
  onEvent: (type, data) => {
    if (type === 'streamEnd') console.log('流结束');
  },
});
tokui.connect('/api/chat', { prompt: '画一个登录卡片' });
```

SSE 协议约定：`data:` 行内为 JSON，取 `tokui` 字段喂给解析器；`[DONE]` 标记流结束。

## 框架集成（Vue / React / Svelte）

TokUI 直接渲染原生 DOM，与上层框架无关。集成要点只有一个：**拿到容器 DOM 节点传给 TokUI，并在组件卸载时调 `disconnect()` 清理**（移除内部 DOM、中止 SSE、刷缓冲区）。

下面三段等价写法，任选其一。

### React

```jsx
import { useEffect, useRef } from 'react';

function TokUIView() {
  const ref = useRef(null);
  useEffect(() => {
    const tokui = new TokUI.TokUI({ container: ref.current });
    tokui.render('[h1 Hello TokUI][p React 集成]');
    return () => tokui.disconnect();   // 卸载清理
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
  tokui.render('[h1 Hello TokUI][p Vue 集成]');
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
    tokui.render('[h1 Hello TokUI][p Svelte 集成]');
  });
  onDestroy(() => tokui.disconnect());
</script>

<div bind:this={el} />
```

> 流式 / SSE 场景同理：在挂载生命周期里 `startStream()` 或 `connect()`，卸载时 `disconnect()`。
>
> 注意：TokUI 接管挂载点内部 DOM，请勿让宿主框架再渲染同一容器的子节点（避免虚拟 DOM 与 TokUI 互相覆盖）。

## Node.js 使用（服务端 Builder）

```js
const TokUIBuilder = require('./src/server/tokui-builder');
const b = new TokUIBuilder();
b.card({ tt: '标题' }).h2('内容').p('描述').end();
console.log(b.toString());
// [card tt:标题][h2 内容][p 描述][/card]
```

完整 Builder API 见 [API · Builder](/api/builder)。
