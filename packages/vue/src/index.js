'use strict';

// TokUI Vue 3 适配器：<TokUIView> 组件 + useTokUIStream() 组合式。
// 用 h() 渲染函数（ref 对象直接传入），避免模板编译依赖，兼容任意 Vue 3 项目。
import { defineComponent, h, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { TokUI, setTheme } from '@jboltai/tokui';

/**
 * 声明式渲染一段 TokUI DSL。
 * @param {object} props
 * @param {string} [props.dsl] DSL 文本（变化时重新渲染）
 * @param {string} [props.theme] 主题名
 * @param {function} [props.onEvent] 事件回调 (name, data)
 */
export const TokUIView = defineComponent({
  name: 'TokUIView',
  props: {
    dsl: { type: String, default: '' },
    theme: { type: String, default: '' },
    onEvent: { type: Function, default: null }
  },
  setup(props) {
    const container = ref(null);
    let ui = null;

    onMounted(() => {
      if (!container.value) return;
      ui = new TokUI({
        container: container.value,
        theme: props.theme || undefined,
        onEvent: props.onEvent || undefined
      });
      if (props.theme) { try { setTheme(props.theme); } catch (e) { /* ignore */ } }
      if (props.dsl) ui.render(props.dsl);
    });

    watch(() => props.dsl, (v) => { if (ui && v) ui.render(v); });

    onBeforeUnmount(() => {
      if (ui && ui.disconnect) ui.disconnect();
      ui = null;
    });

    // Vue 3 渲染函数：把 ref 对象直接作为 ref 传入，元素挂载后自动绑定到 container。
    return () => h('div', { ref: container, class: 'tokui-vue-view' });
  }
});

/**
 * 流式渲染组合式（手动 feed / SSE connect）。
 * @param {object} [options] TokUI 构造选项（theme/onEvent 等）
 * @returns {{container, start, feed, end, connect, disconnect}}
 */
export function useTokUIStream(options) {
  const container = ref(null);
  let ui = null;

  const ensure = () => {
    if (!ui && container.value) {
      ui = new TokUI({ container: container.value, ...(options || {}) });
    }
    return ui;
  };
  const start = (c) => { const u = ensure(); if (u) u.startStream(c || container.value); };
  const feed = (chunk) => { const u = ensure(); if (u) u.feed(chunk); };
  const end = () => { if (ui) ui.endStream(); };
  const connect = (url, body) => { const u = ensure(); return u ? u.connect(url, body) : Promise.resolve(); };
  const disconnect = () => { if (ui && ui.disconnect) ui.disconnect(); };

  onBeforeUnmount(() => disconnect());

  return { container, start, feed, end, connect, disconnect };
}

export default TokUIView;
