# @jboltai/tokui-vue

> TokUI 的 Vue 3 适配器：`<TokUIView>` 组件 + `useTokUIStream()` 组合式。

## 安装

```bash
npm install @jboltai/tokui-vue vue
```

## 声明式渲染

```vue
<script setup>
import { TokUIView } from '@jboltai/tokui-vue';
const dsl = '[card tt:你好 TokUI][p 流式 UI，零依赖][/card]';
</script>

<template>
  <TokUIView :dsl="dsl" theme="default" />
</template>
```

`dsl` 变化时自动重新渲染；组件卸载时自动断开清理。

## 流式 / SSE

```vue
<script setup>
import { useTokUIStream } from '@jboltai/tokui-vue';
const { container, start, feed, end, connect } = useTokUIStream();

function render() {
  start();
  feed('[card tt:');
  feed('流式卡片]');
  end();
}
</script>

<template>
  <div ref="container" />
  <button @click="render">渲染</button>
  <button @click="connect('/api/chat', { prompt: '画登录卡片' })">SSE 连接</button>
</template>
```

## CSS

样式随 `@jboltai/tokui` 自动注入，无需手动引 CSS。

License: MIT
