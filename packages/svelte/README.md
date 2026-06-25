# @jboltai/tokui-svelte

> TokUI 的 Svelte 适配器：`use:tokui` action + `<TokUI>` 组件。

## 安装

```bash
npm install @jboltai/tokui-svelte svelte
```

## Action（无需编译，最简）

```svelte
<script>
  import { tokui } from '@jboltai/tokui-svelte';
  const dsl = '[card tt:你好 TokUI][p 流式 UI，零依赖][/card]';
</script>

<div use:tokui={{ dsl, theme: 'default' }}></div>
```

`dsl` 变化时 action 的 `update` 自动重新渲染。

## 组件（需 svelte 编译器）

```svelte
<script>
  import TokUI from '@jboltai/tokui-svelte/src/TokUI.svelte';
  const dsl = '[card tt:你好][p 内容][/card]';
</script>

<TokUI {dsl} theme="default" />
```

## CSS

样式随 `@jboltai/tokui` 自动注入，无需手动引 CSS。

License: MIT
