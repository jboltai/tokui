'use strict';

// TokUI React 适配器：<TokUIView> 组件 + useTokUIStream() 流式 hook。
// 用 createElement 避免 JSX 运行时依赖，兼容任意 React 16.8+ 项目。
import { useEffect, useRef, useCallback, createElement } from 'react';
import { TokUI, setTheme } from '@jboltai/tokui';

/**
 * 声明式渲染一段 TokUI DSL。
 * @param {object} props
 * @param {string} [props.dsl] DSL 文本（变化时重新渲染）
 * @param {string} [props.theme] 主题名
 * @param {function} [props.onEvent] 事件回调 (name, data)
 */
export function TokUIView(props) {
  const { dsl, theme, onEvent, ...rest } = props;
  const ref = useRef(null);
  const uiRef = useRef(null);

  // 挂载时创建 TokUI 实例；卸载时断开清理
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ui = new TokUI({ container: el, theme, onEvent });
    uiRef.current = ui;
    if (theme) { try { setTheme(theme); } catch (e) { /* ignore */ } }
    if (dsl) ui.render(dsl);
    return () => {
      try { if (ui.disconnect) ui.disconnect(); } catch (e) { /* ignore */ }
      uiRef.current = null;
    };
    // 仅挂载时初始化（theme/onEvent 变化不重建实例）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dsl 变化 → 重新渲染
  useEffect(() => {
    const ui = uiRef.current;
    if (ui && dsl != null) ui.render(dsl);
  }, [dsl]);

  return createElement('div', { ref, ...rest });
}

/**
 * 流式渲染 hook（手动 feed / SSE connect）。
 * @param {object} [options] TokUI 构造选项（theme/onEvent 等）
 * @returns {{ref, ui, start, feed, end, connect, disconnect}}
 */
export function useTokUIStream(options) {
  const ref = useRef(null);
  const uiRef = useRef(null);

  const get = useCallback(() => {
    if (!uiRef.current && ref.current) {
      uiRef.current = new TokUI({ container: ref.current, ...(options || {}) });
    }
    return uiRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback((container) => {
    const ui = get();
    if (ui) ui.startStream(container || ref.current);
  }, [get]);

  const feed = useCallback((chunk) => {
    const ui = get();
    if (ui) ui.feed(chunk);
  }, [get]);

  const end = useCallback(() => {
    if (uiRef.current) uiRef.current.endStream();
  }, []);

  const connect = useCallback((url, body) => {
    const ui = get();
    return ui ? ui.connect(url, body) : Promise.resolve();
  }, [get]);

  const disconnect = useCallback(() => {
    if (uiRef.current && uiRef.current.disconnect) uiRef.current.disconnect();
  }, []);

  return { ref, ui: uiRef, start, feed, end, connect, disconnect };
}

export default TokUIView;
