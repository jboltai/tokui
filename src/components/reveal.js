/**
 * TokUI 滚动入场组件（T3.2 摘出实施）
 * reveal（容器：IntersectionObserver 一次性入场）/ reveal-item（可选包装容器）。
 *
 * 渐进增强契约（内容永不见丢失）：
 * - 默认不隐藏任何内容——JS 绑定 IO 时才加 --arm（初始隐藏态），进入视口换 --in（动画进场）；
 * - prefers-reduced-motion / 无 IntersectionObserver / 无 document → 永不 --arm，内容直接可见；
 * - stagger 纯 CSS nth-child 1~12 档递增 80ms（零 JS 内联样式，dom-mock 可测）；
 * - 流式（克制版）：流式中的相交不烧一次性入场，仅记「已看过」（seen），内容随流可见（不 arm）；
 *   _streamCloseHook 闭合核对（亦为测试直调入口）——已在视口或流式期间看过 → 直接定格可见态
 *   （补 --in 完成标记、断开观察、不重放动画，用户正看着的内容不得闪跳重演）；
 *   从未见过的折叠区组保留 IO，滚动相交时一次性入场；「可见」判定含祖先滚动容器
 *   裁剪（scroll-area 等内层折叠区里的组不算可见，等内层滚动触发）；
 * - observer 经 renderer._registerCleanup 登记，destroy() 幂等解绑。
 */
'use strict';

/**
 * 注册滚动入场组件到渲染器
 * @param {TokUIRenderer} renderer - 渲染器实例
 */
function registerRevealComponents(renderer) {
  const { el } = (typeof require === 'function')
    ? require('../core/renderer')
    : window.TokUI._internal;

  function prefersReducedMotion() {
    return !!(typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // === reveal：滚动入场容器 ===
  // attrs: v:up|left|right|zoom(方向，默认 up) delay:N(基础延迟 ms，落 --tokui-reveal-delay)
  // 子元素（任意组件或 reveal-item）按序 stagger 递增 80ms（CSS nth-child 前 12 档）。
  renderer.register('reveal', (node, rc) => {
    const attrs = node.attrs || {};
    const wrap = el('div', { class: 'tokui-reveal' });

    var delay = parseInt(attrs.delay, 10);
    if (!isNaN(delay) && delay >= 0 && delay <= 4000) {
      wrap.style.setProperty('--tokui-reveal-delay', delay + 'ms');
    }

    if (node.content) wrap.appendChild(document.createTextNode(node.content));
    rc(node.children).forEach(child => {
      if (child && child.nodeType) wrap.appendChild(child);
    });

    var io = null;
    var closed = false; // 流式是否已闭合（闭合后才允许入场；流式中的相交不烧一次性动画）
    var seen = false;   // 克制版：流式期间进入过视口（用户已看过内容随流出现，不再重演）
    function activate() {
      // 激活 = arm(隐藏态) → 强制回流 → in(进场态) 同帧完成：
      // 过渡从 opacity 0 起播；无需预隐藏——首次相交前元素必然不在视口，预隐藏毫无意义。
      wrap.classList.add('tokui-reveal--arm');
      try { void wrap.offsetHeight; } catch (e) { /* dom-mock 无几何：跳过回流 */ }
      if (io) { io.disconnect(); io = null; }
      wrap.classList.add('tokui-reveal--in');
    }
    function settle() {
      // 克制定格：内容全程可见（从未 arm），不重放入场；补 --in 完成标记并断开观察。
      // 仅加 --in 不加 --arm：子项本就在默认可见态，无属性变化即不触发过渡。
      if (io) { io.disconnect(); io = null; }
      wrap.classList.add('tokui-reveal--in');
    }
    function clipOverflow(node) {
      // 祖先是否为滚动/裁剪容器（overflow ≠ visible）——dom-mock/老环境无 getComputedStyle 时视为不裁剪
      try {
        if (typeof window === 'undefined' || !window.getComputedStyle) return false;
        var cs = window.getComputedStyle(node);
        var ov = (cs && (cs.overflow + ' ' + cs.overflowY)) || '';
        return /(auto|scroll|hidden|clip)/.test(ov);
      } catch (e) { return false; }
    }
    function inViewportSync() {
      try {
        var r = wrap.getBoundingClientRect();
        var vh = (typeof window !== 'undefined' && window.innerHeight) || 0;
        if (!(r.height > 0 && r.top < vh && r.bottom > 0)) return false;
        // 祖先滚动/裁剪容器逐层收窄可见矩形：被内层折叠区（如 scroll-area 视口）裁掉的组
        // 几何上仍在窗口内，但用户实际看不见——不算「可见」，保留一次性入场等滚动触发。
        // 常见陷阱：scroll-area 外层 overflow:hidden + 内层 __viewport overflow:auto，两层都要能命中。
        var node = wrap.parentElement;
        while (node && node.nodeType === 1 && node.tagName !== 'BODY' && node.tagName !== 'HTML') {
          var cr = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
          if (cr && cr.height > 0 && clipOverflow(node) &&
              (node.scrollHeight === undefined || node.scrollHeight > node.clientHeight)) {
            var top = Math.max(r.top, cr.top);
            var bottom = Math.min(r.bottom, cr.bottom);
            if (bottom - top <= 0) return false;
            r = { top: top, bottom: bottom };
          }
          node = node.parentElement;
        }
        return true;
      } catch (e) { return false; }
    }
    function bind() {
      if (prefersReducedMotion()) return;                 // 减动效：内容直接可见
      if (typeof IntersectionObserver === 'undefined') return; // 老环境降级：直接可见
      try {
        io = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (!entries[i].isIntersecting) continue;
            // 流式输出中（自动滚屏 transit 视口）不烧掉一次性入场——仅记「已看过」，
            // 闭合钩子据此克制定格（看过的内容永不重演）
            if (!closed && wrap._tokuiStreamActive) { seen = true; return; }
            if (wrap.classList.contains('tokui-reveal--in')) return;
            activate();
            return;
          }
        }, { threshold: 0.05 });
        io.observe(wrap);
        if (renderer && typeof renderer._registerCleanup === 'function') {
          renderer._registerCleanup(wrap, function () {
            if (io) { io.disconnect(); io = null; }
          });
        }
      } catch (e) { io = null; }                          // 环境 IO 不可用：保持可见
    }

    bind();

    // 流式闭合（克制版）：内容到齐。此刻在视口内（用户正看着）或流式期间已看过 →
    // 直接定格可见态，不重放动画（重放=瞬隐再整段 stagger 重演，观感为闪跳）；
    // 从未见过（上下方折叠区）→ 保持未激活，等用户滚动相交时由 IO 触发一次性入场。
    wrap._streamCloseHook = function () {
      closed = true;
      if (wrap.classList.contains('tokui-reveal--in')) return;
      if (seen || inViewportSync()) settle();
    };

    wrap._slot = wrap;
    wrap._tokuiType = 'reveal';
    return wrap;
  });

  // === reveal-item：可选包装容器（分组语义 + 间距，作为 reveal 直接子元素参与 stagger） ===
  // 不写 reveal-item 直接放组件同样参与 stagger（按直接子元素序号）。
  renderer.register('reveal-item', (node, rc) => {
    const item = el('div', { class: 'tokui-reveal-item' });
    if (node.content) item.appendChild(document.createTextNode(node.content));
    rc(node.children).forEach(child => {
      if (child && child.nodeType) item.appendChild(child);
    });
    item._slot = item;
    item._tokuiType = 'reveal-item';
    return item;
  });
}

// UMD 双模式导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerRevealComponents = registerRevealComponents;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerRevealComponents: registerRevealComponents };
}
