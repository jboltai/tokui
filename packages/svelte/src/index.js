'use strict';

// TokUI Svelte 适配器：use:tokui action（纯 JS，无需 svelte 预处理即可用）。
// 组件版见 ./TokUI.svelte（需 svelte 编译器）。
import { TokUI, setTheme } from '@jboltai/tokui';

/**
 * Svelte action：<div use:tokui={{ dsl, theme }}></div>
 * @param {HTMLElement} node 挂载节点
 * @param {{dsl?:string, theme?:string, onEvent?:function}} [options]
 */
export function tokui(node, options) {
  let ui = null;

  const ensure = (opts) => {
    if (ui) return ui;
    ui = new TokUI({ container: node });
    return ui;
  };

  // 初始渲染
  if (options) {
    const ui0 = ensure(options);
    if (options.theme) { try { setTheme(options.theme); } catch (e) { /* ignore */ } }
    if (options.dsl) ui0.render(options.dsl);
  }

  return {
    update(opts) {
      const u = ensure(opts);
      if (opts && opts.theme) { try { setTheme(opts.theme); } catch (e) { /* ignore */ } }
      if (opts && opts.dsl != null) u.render(opts.dsl);
    },
    destroy() {
      if (ui && ui.disconnect) ui.disconnect();
      ui = null;
    }
  };
}

export default tokui;
