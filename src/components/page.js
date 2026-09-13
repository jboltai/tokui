/**
 * TokUI 后台应用壳组件（M2 Admin Pack / T2.1）
 * page（grid areas 应用壳）/ page-header（面包屑+动作区页头）/ page-sidebar（可折叠侧栏）
 * / page-content（主区）/ page-tabs + page-tab（多页签）。
 * 面向「列表页 + 弹窗 + 详情」的后台 CRUD 布局；样式全走主题令牌，四主题通用。
 *
 * 布局契约（文档同步面勿漏）：
 * - page 宿主需有确定高度时自动铺满（height:100%），否则按内容自然高度（min-height 兜底）；
 * - page 直接子元素约定为 page-header / page-sidebar / page-content 三件，其余子元素落主区（CSS 兜底）；
 * - page-tab 根为 display:contents 包装器（按钮+面板一体）——[del id:tabX] 整签移除天然生效。
 */
'use strict';

/**
 * 注册应用壳组件到渲染器
 * @param {TokUIRenderer} renderer - 渲染器实例
 */
function registerPageComponents(renderer) {
  const { el } = (typeof require === 'function')
    ? require('../core/renderer')
    : window.TokUI._internal;

  var _t = (typeof require === 'function')
    ? require('../core/i18n').t
    : (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal && window.TokUI._internal.t)
    || function (key) { return key; };

  function _iconSvg(name, size) {
    if (typeof require === 'function') {
      try { return require('./icons').iconSvg(name, size); } catch (e) { return ''; }
    }
    var i = (typeof window !== 'undefined') && window.TokUI && window.TokUI._internal;
    return (i && i.iconSvg) ? i.iconSvg(name, size) : '';
  }

  function _applyTheme(dom, attrs) {
    var t = attrs && attrs.theme;
    if (t && /^(default|dark|modern|modern-dark|tech)$/.test(t)) dom.setAttribute('data-tokui-theme', t);
  }

  // === page：应用壳（grid areas：header 横贯顶部 / sidebar + content 两列） ===
  // attrs: w(侧栏宽 px 默认 240，落 CSS 变量 --tokui-page-aside-w) theme(子树主题)
  // 子元素：page-header / page-sidebar / page-content；未知子元素 CSS 兜底落主区。
  renderer.register('page', (node, rc) => {
    const attrs = node.attrs || {};
    const wrap = el('div', { class: 'tokui-page' });
    _applyTheme(wrap, attrs);
    var w = parseInt(attrs.w, 10);
    if (!isNaN(w) && w >= 140 && w <= 480) wrap.style.setProperty('--tokui-page-aside-w', w + 'px');
    if (node.content) wrap.textContent = node.content;
    rc(node.children).forEach(child => {
      if (child && child.nodeType) wrap.appendChild(child);
    });
    wrap._slot = wrap;
    wrap._tokuiType = 'page';
    return wrap;
  });

  // === page-header：页头（面包屑 + 标题 + 右侧动作插槽） ===
  // attrs: tt(页面标题) bc:"首页,系统,用户"(逗号分级面包屑，复用 breadcrumb 样式) sticky(吸顶)
  // 子节点（btn 等）→ 右侧动作区；[upd id:x tt/bc:...] 就地更新。
  renderer.register('page-header', (node, rc) => {
    const attrs = node.attrs || {};
    const head = el('div', { class: 'tokui-page-header' + (attrs.sticky !== undefined ? ' tokui-page-header--sticky' : '') });
    _applyTheme(head, attrs);

    const main = el('div', { class: 'tokui-page-header__main' });
    head.appendChild(main);

    const actions = el('div', { class: 'tokui-page-header__actions' });
    head.appendChild(actions);

    function renderBc(text) {
      var nav = el('nav', { class: 'tokui-breadcrumb', 'aria-label': 'breadcrumb' });
      String(text).split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (item, idx, arr) {
        var isLast = idx === arr.length - 1;
        var itemEl = el('span', { class: 'tokui-breadcrumb__item' + (isLast ? ' tokui-breadcrumb__item--active' : '') });
        itemEl.textContent = item;
        if (isLast) itemEl.setAttribute('aria-current', 'page');
        nav.appendChild(itemEl);
        if (!isLast) nav.appendChild(el('span', { class: 'tokui-breadcrumb__sep' }, '/'));
      });
      return nav;
    }
    function syncBc(text) {
      var old = main.querySelector('.tokui-breadcrumb');
      if (old) main.removeChild(old);
      if (text) main.insertBefore(renderBc(text), main.childNodes[0] || null);
    }
    function syncTt(text) {
      var old = main.querySelector('.tokui-page-header__title');
      if (old) main.removeChild(old);
      if (text) main.appendChild(el('div', { class: 'tokui-page-header__title' }, text));
    }
    if (attrs.bc) syncBc(attrs.bc);
    if (attrs.tt) syncTt(attrs.tt);

    rc(node.children).forEach(child => {
      if (child && child.nodeType) actions.appendChild(child);
    });

    head._update = function (uAttrs) {
      if (uAttrs.bc !== undefined) syncBc(String(uAttrs.bc));
      if (uAttrs.tt !== undefined) syncTt(String(uAttrs.tt));
    };
    head._slot = actions;
    head._tokuiType = 'page-header';
    return head;
  });

  // === page-sidebar：侧栏（品牌行 + 折叠钮 + 滚动主体） ===
  // attrs: tt(品牌/栏标题)。折叠钮 icon:panel-left，联动最近 .tokui-page 的列宽过渡；
  // 脱离 page 单独使用时折叠自身 class（宿主可自行接管样式），均上报 toggle {folded}。
  renderer.register('page-sidebar', (node, rc) => {
    const attrs = node.attrs || {};
    const side = el('aside', { class: 'tokui-page-sidebar' });
    _applyTheme(side, attrs);

    const headEl = el('div', { class: 'tokui-page-sidebar__head' });
    if (attrs.tt) headEl.appendChild(el('span', { class: 'tokui-page-sidebar__brand' }, attrs.tt));
    var report = renderer.createReporter('page-sidebar', attrs, side);
    var toggle = el('button', {
      class: 'tokui-page-sidebar__toggle',
      type: 'button',
      'aria-label': _t('page.toggleAside'),
      'aria-expanded': 'true'
    });
    toggle.innerHTML = _iconSvg('panel-left', 16);
    toggle.addEventListener('click', function () {
      var host = typeof side.closest === 'function' ? side.closest('.tokui-page') : null;
      if (host) host.classList.toggle('tokui-page--folded');
      else side.classList.toggle('tokui-page-sidebar--folded');
      var folded = host ? host.classList.contains('tokui-page--folded')
        : side.classList.contains('tokui-page-sidebar--folded');
      toggle.setAttribute('aria-expanded', String(!folded));
      report('toggle', { folded: folded });
    });
    headEl.appendChild(toggle);
    side.appendChild(headEl);

    const body = el('div', { class: 'tokui-page-sidebar__body' });
    if (node.content) body.textContent = node.content;
    rc(node.children).forEach(child => {
      if (child && child.nodeType) body.appendChild(child);
    });
    side.appendChild(body);

    side._slot = body;
    side._tokuiType = 'page-sidebar';
    return side;
  });

  // === page-content：主区薄包装（grid area 落位 + 自滚动 + overflow 裁剪防护） ===
  renderer.register('page-content', (node, rc) => {
    const attrs = node.attrs || {};
    const main = el('main', { class: 'tokui-page-content' });
    _applyTheme(main, attrs);
    if (node.content) main.textContent = node.content;
    rc(node.children).forEach(child => {
      if (child && child.nodeType) main.appendChild(child);
    });
    main._slot = main;
    main._tokuiType = 'page-content';
    return main;
  });

  // === page-tabs：多页签容器（flex-wrap + order 单容器布局，配合 page-tab 的 display:contents） ===
  // attrs: act(初始激活页签 key = page-tab 的 n)  on:"change:h|close:h"
  // 激活收口：用户点击上报 change；[upd id:x act:key] 程序化切换静默。
  // 交互：页签按钮关闭（closeable）/ [del id:tabX] 整签移除 / ArrowLeft·Right 键盘导航。
  renderer.register('page-tabs', (node, rc) => {
    const attrs = node.attrs || {};
    const wrap = el('div', { class: 'tokui-page-tabs' });
    _applyTheme(wrap, attrs);
    var report = renderer.createReporter('page-tabs', attrs, wrap);
    wrap._tokuiReport = report;

    function tabWrappers() {
      var out = [];
      for (var i = 0; i < wrap.childNodes.length; i++) {
        var c = wrap.childNodes[i];
        if (c.nodeType === 1 && (c.className || '').split(' ').indexOf('tokui-page-tab') !== -1) out.push(c);
      }
      return out;
    }
    function setActive(wrapper, on) {
      wrapper.classList[on ? 'add' : 'remove']('tokui-page-tab--active');
      var btn = wrapper.querySelector('.tokui-page-tab__btn');
      if (btn) {
        btn.setAttribute('aria-selected', String(on));
        btn.setAttribute('tabindex', on ? '0' : '-1');
      }
    }
    function activate(key, silent) {
      var hit = null;
      tabWrappers().forEach(function (w) { if (w._tokuiTabKey === String(key)) hit = w; });
      if (!hit) return false;
      tabWrappers().forEach(function (w) { setActive(w, w === hit); });
      if (!silent) report('change', { key: hit._tokuiTabKey, title: hit._tokuiTabTitle });
      return true;
    }
    function resolveInitial() {
      var wrappers = tabWrappers();
      if (!wrappers.length) return;
      var act = attrs.act || attrs.v || '';
      if (!act || !activate(act, true)) {
        var first = null;
        for (var i = 0; i < wrappers.length; i++) {
          if (!wrappers[i]._tokuiTabDisabled) { first = wrappers[i]; break; }
        }
        if (first) activate(first._tokuiTabKey, true);
      }
    }
    function closeTab(wrapper) {
      var key = wrapper._tokuiTabKey, title = wrapper._tokuiTabTitle;
      var wasActive = (wrapper.className || '').split(' ').indexOf('tokui-page-tab--active') !== -1;
      var siblings = tabWrappers().filter(function (w) { return w !== wrapper; });
      var next = null;
      var wrappers = tabWrappers();
      for (var i = 0; i < wrappers.length; i++) {
        if (wrappers[i] === wrapper) {
          next = wrappers[i + 1] || wrappers[i - 1] || null;
          break;
        }
      }
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      if (wasActive && next) activate(next._tokuiTabKey, true);
      report('close', { key: key, title: title });
    }
    wrap._tokuiActivate = activate;
    wrap._tokuiCloseTab = closeTab;
    wrap._tokuiTabsAct = attrs.act || attrs.v || '';

    rc(node.children).forEach(child => {
      if (child && child.nodeType) wrap.appendChild(child);
    });
    resolveInitial(); // 一次性渲染：子元素已就位，立即解析初始激活

    // 键盘导航：ArrowLeft/Right 在页签间移动（激活 + 聚焦）
    wrap.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var btns = wrap.querySelectorAll('.tokui-page-tab__btn:not([disabled])');
      if (!btns.length) return;
      var target = e.target.closest ? e.target.closest('.tokui-page-tab__btn') : null;
      if (!target) return;
      e.preventDefault();
      var idx = Array.prototype.indexOf.call(btns, target);
      var nextIdx = e.key === 'ArrowRight' ? (idx + 1) % btns.length : (idx - 1 + btns.length) % btns.length;
      var nb = btns[nextIdx];
      if (nb && nb._tokuiTabKey !== undefined && wrap._tokuiActivate) wrap._tokuiActivate(nb._tokuiTabKey);
      if (nb && typeof nb.focus === 'function') nb.focus();
    });

    // 流式跟随：新页签 wrapper 挂载即激活（输出到哪个页签就显示哪个，静默）——
    // register 时机 wrapper 未挂载、激活找不到目标（旧实现的坑），故由 MO 在挂载后驱动；
    // 一次性渲染不跟随（_tokuiStreamActive false），由 resolveInitial 统一解析初始激活。
    function followLatest() {
      if (!wrap._tokuiStreamActive) return;
      var wrappers = tabWrappers();
      if (!wrappers.length) return;
      var last = wrappers[wrappers.length - 1];
      if (last._tokuiTabDisabled) return;
      activate(last._tokuiTabKey, true);
    }
    wrap._tokuiFollowCheck = followLatest; // dom-mock 无 MO：测试直调入口
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      var _tabsMo = new MutationObserver(function () { followLatest(); });
      _tabsMo.observe(wrap, { childList: true });
      if (renderer && typeof renderer._registerCleanup === 'function') {
        renderer._registerCleanup(wrap, function () { _tabsMo.disconnect(); });
      }
    }

    // 流式闭合：页签到齐后按 act 解析初始激活（流式期间新页签跟随激活，见 page-tab）
    wrap._streamCloseHook = function () {
      if (!wrap._tokuiStreamActive) return;
      resolveInitial();
    };
    wrap._update = function (uAttrs) {
      var key = uAttrs.act !== undefined ? uAttrs.act : uAttrs.v;
      if (key !== undefined) activate(String(key), true); // 程序化切换静默
    };
    wrap._slot = wrap;
    wrap._tokuiType = 'page-tabs';
    return wrap;
  });

  // === page-tab：单页签（display:contents 包装器：按钮 + 面板一体） ===
  // attrs: n(页签 key，缺省用 tt) tt(标题) closeable/closable(可关闭) dis(禁用)
  // [del id:x] 删包装器 = 页签整体（按钮+面板）移除；关闭钮走 page-tabs 的 _tokuiCloseTab。
  renderer.register('page-tab', (node, rc) => {
    const attrs = node.attrs || {};
    const key = String(attrs.n || attrs.tt || 'tab');
    const title = String(attrs.tt || key);
    const disabled = attrs.dis !== undefined;
    const closable = attrs.closeable !== undefined || attrs.closable !== undefined;

    const wrap = el('div', { class: 'tokui-page-tab' + (disabled ? ' tokui-page-tab--disabled' : '') });

    const btn = el('button', {
      class: 'tokui-page-tab__btn',
      type: 'button',
      role: 'tab',
      tabindex: '-1',
      'aria-selected': 'false'
    }, title);
    btn._tokuiTabKey = key;
    if (disabled) btn.setAttribute('disabled', '');
    btn.addEventListener('click', function () {
      var host = typeof btn.closest === 'function' ? btn.closest('.tokui-page-tabs') : null;
      if (host && host._tokuiActivate) host._tokuiActivate(key);
    });
    if (closable && !disabled) {
      const closeBtn = el('span', {
        class: 'tokui-page-tab__close',
        role: 'button',
        tabindex: '-1',
        'aria-label': _t('page.closeTab')
      }, '×');
      closeBtn.addEventListener('click', function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        var host = typeof closeBtn.closest === 'function' ? closeBtn.closest('.tokui-page-tabs') : null;
        if (host && host._tokuiCloseTab) host._tokuiCloseTab(wrap);
      });
      btn.appendChild(closeBtn);
    }
    wrap.appendChild(btn);

    const panel = el('div', {
      class: 'tokui-page-tab__panel',
      role: 'tabpanel'
    });
    if (node.content) panel.textContent = node.content;
    rc(node.children).forEach(child => {
      if (child && child.nodeType) panel.appendChild(child);
    });
    wrap.appendChild(panel);

    wrap._tokuiTabKey = key;
    wrap._tokuiTabTitle = title;
    wrap._tokuiTabDisabled = disabled;

    // 流式跟随（修正版）：不在 register 时机激活——此刻 wrapper 尚未挂载到 page-tabs
    // （renderer 返回后才 append），按 key 找不到 wrapper 静默失败；
    // 改由 page-tabs 的 MutationObserver 在「新 wrapper 挂载」时激活（见容器注册处）。

    wrap._slot = panel;
    wrap._tokuiType = 'page-tab';
    return wrap;
  });
}

// UMD 双模式导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerPageComponents = registerPageComponents;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerPageComponents: registerPageComponents };
}
