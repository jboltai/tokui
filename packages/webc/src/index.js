'use strict';

// TokUI Web Component —— 框架无关的 <tokui-view> 自定义元素。
// 在 React / Vue / Svelte / Angular / 原生 HTML 中均可使用同一套 DSL。
import { TokUI, setTheme } from '@jboltai/tokui';

// SSR 安全：Node 无 HTMLElement，用空基类兜底，避免 `extends HTMLElement` 在 import 求值期崩。
// 方法体内访问的 DOM API 仅在浏览器调用时执行，SSR 不会触发。
const BaseElement = (typeof HTMLElement !== 'undefined') ? HTMLElement : class {};

/**
 * <tokui-view> 自定义元素：把 TokUI 实例封装为标准 Custom Element。
 * 属性：dsl（一次性渲染）、theme（主题切换）。
 * 方法：render / startStream / feed / endStream / connect（透传到内部 TokUI 实例）。
 */
class TokUIViewElement extends BaseElement {
  constructor() {
    super();
    this._ui = null;
  }

  static get observedAttributes() {
    return ['dsl', 'theme'];
  }

  connectedCallback() {
    if (this._ui) return;
    this._ui = new TokUI({ container: this });
    const theme = this.getAttribute('theme');
    if (theme) { try { setTheme(theme); } catch (e) { /* 主题可能未注册 */ } }
    const dsl = this.getAttribute('dsl');
    if (dsl) this.render(dsl);
  }

  disconnectedCallback() {
    if (this._ui && this._ui.disconnect) this._ui.disconnect();
    this._ui = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'theme' && newVal) { try { setTheme(newVal); } catch (e) { /* ignore */ } }
    if (name === 'dsl' && this._ui && newVal) this.render(newVal);
  }

  // —— 透传 TokUI 实例方法 ——
  render(dsl) { if (this._ui) this._ui.render(dsl); }
  startStream() { if (this._ui) this._ui.startStream(); return this._ui; }
  feed(chunk) { if (this._ui) this._ui.feed(chunk); }
  endStream() { if (this._ui) this._ui.endStream(); }
  connect(url, body) {
    return this._ui ? this._ui.connect(url, body)
      : Promise.reject(new Error('@jboltai/tokui-webc: element not connected yet'));
  }
}

/**
 * 注册 <tokui-view>（或自定义元素名）。
 * SSR 环境下 customElements 不存在，会给出告警并返回类本身（不注册）。
 * @param {string} [name='tokui-view'] 自定义元素名（须含连字符）
 * @returns {typeof TokUIViewElement}
 */
export function defineTokuiElement(name) {
  name = name || 'tokui-view';
  if (typeof customElements === 'undefined') {
    console.warn('@jboltai/tokui-webc: customElements 不可用（SSR？）。请在浏览器环境调用 defineTokuiElement()。');
    return TokUIViewElement;
  }
  if (!customElements.get(name)) customElements.define(name, TokUIViewElement);
  return TokUIViewElement;
}

export { TokUIViewElement };
export default defineTokuiElement;
