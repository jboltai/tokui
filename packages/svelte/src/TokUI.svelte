<script>
  // TokUI Svelte 组件（需 svelte 编译器）。无需编译的 action 版见 ./index.js。
  import { onMount, onDestroy } from 'svelte';
  import { TokUI, setTheme } from '@jboltai/tokui';

  /** @type {string} DSL 文本 */
  export let dsl = '';
  /** @type {string} 主题名 */
  export let theme = '';

  let container;
  /** @type {any} */
  let ui;

  onMount(() => {
    ui = new TokUI({ container });
    if (theme) setTheme(theme);
    if (dsl) ui.render(dsl);
  });

  // dsl 响应式变化 → 重新渲染
  $: if (ui && dsl) ui.render(dsl);
  // theme 响应式变化 → 切换主题
  $: if (theme) { try { setTheme(theme); } catch (e) { /* ignore */ } }

  onDestroy(() => { if (ui && ui.disconnect) ui.disconnect(); });
</script>

<div bind:this={container} class="tokui-svelte-view"></div>
