/**
 * TokUI 布局组件模块
 * 注册布局相关组件：card（卡片）、row/col（栅格布局）、
 * list/item（列表）。
 *
 * DSL 示例：
 * [row]
 *   [col span:6][p 左侧内容][/col]
 *   [col span:6][p 右侧内容][/col]
 * [/row]
 * [card tt:标题][p 卡片内容][/card]
 * [list t:ul][item 第一项][item 第二项][/list]
 */
'use strict';

// i18n 取串（aria-label / carousel 索引 / collapse 默认标题等）。
var _t = (typeof require === 'function')
  ? require('../core/i18n').t
  : (window.TokUI && window.TokUI._internal && window.TokUI._internal.t)
    || function (key) { return key; };

/**
 * 注册布局组件到渲染器
 * @param {TokUIRenderer} renderer - 渲染器实例
 */
function registerLayoutComponents(renderer) {
  const { el } = (typeof require === 'function')
    ? require('../core/renderer')
    : window.TokUI._internal;

  // === 卡片组件 ===
  // attrs.tt = 标题文本, attrs.tx = body文本（自闭合模式）, attrs.id = 标识
  // 两种用法：
  //   容器模式：[card tt:标题][p 内容][/card]
  //   自闭合：  [card tt:标题 tx:内容]
  // 子节点中的 ft 类型会被渲染为独立的页脚区域
  var _SAFE_STYLE_PROPS = /^(background-color|color|border(-radius|-top|-bottom|-left|-right)?|padding(-top|-bottom|-left|-right)?|margin(-top|-bottom|-left|-right)?|text-align|max-width|min-height|box-shadow|opacity|font-size|font-weight|line-height|border-radius|overflow|cursor|gap|display|flex-wrap|align-items|justify-content|width|height|float|clear|visibility|white-space|word-break|text-overflow|text-decoration|list-style|vertical-align|transition|transform)$/;

  function _filterStyle(raw) {
    if (!raw) return undefined;
    return raw.split(';').filter(function (s) {
      var prop = s.split(':')[0].trim().toLowerCase();
      return prop && _SAFE_STYLE_PROPS.test(prop);
    }).join(';') || undefined;
  }

  renderer.register('card', (node, rc) => {
    const attrs = { class: 'tokui-card' };
    if (node.attrs.id) attrs.id = node.attrs.id;
    var safeStyle = _filterStyle(node.attrs.style);
    if (safeStyle) attrs.style = safeStyle;
    const card = el('div', attrs);
    if (node.attrs.w) card.style.width = /^\d+$/.test(node.attrs.w) ? node.attrs.w + 'px' : node.attrs.w;
    if (node.attrs.tt) {
      var headerCls = 'tokui-card-header';
      var hc = node.attrs.hc || '';
      if (node.attrs.ht) headerCls += ' tokui-card-header--' + node.attrs.ht;
      if (hc && ['primary','danger','success','warning','info','dark'].indexOf(hc) !== -1 && node.attrs.ht) {
        headerCls += ' tokui-card-header--' + node.attrs.ht + '--' + hc;
      }
      var headerEl = el('div', { class: headerCls, role: 'heading', 'aria-level': '3' }, node.attrs.tt);
      // 自定义色值：inline style
      if (hc && ['primary','danger','success','warning','info','dark'].indexOf(hc) === -1) {
        var ht = node.attrs.ht || '';
        if (ht === 'fill') {
          headerEl.style.background = hc;
          headerEl.style.color = '#fff';
        } else if (ht === 'accent') {
          headerEl.style.borderLeftColor = hc;
        } else if (ht === 'underline') {
          headerEl.style.setProperty('--tokui-card-header-underline-color', hc);
        } else if (ht === 'dot') {
          headerEl.style.setProperty('--tokui-card-header-dot-color', hc);
        } else if (ht === 'pill') {
          headerEl.style.background = hc;
          headerEl.style.color = '#fff';
        }
      }
      card.appendChild(headerEl);
    }
    // 分离 ft 子节点和普通子节点
    const bodyChildren = [];
    const ftChildren = [];
    (node.children || []).forEach(child => {
      if (child.type === 'ft') {
        ftChildren.push(child);
      } else {
        bodyChildren.push(child);
      }
    });
    const body = el('div', { class: 'tokui-card-body' });
    // tx 属性作为 body 文本（自闭合模式）
    if (node.attrs.tx) {
      body.textContent = node.attrs.tx;
    }
    var renderedChildren = rc(bodyChildren);
    renderedChildren.forEach(child => {
      if (child && child.nodeType) body.appendChild(child);
    });
    card.appendChild(body);
    rc(ftChildren).forEach(child => {
      if (child && child.nodeType) card.appendChild(child);
    });
    card._slot = body;
    card._tokuiType = 'card';
    card._update = function (uAttrs) {
      if (uAttrs.tt !== undefined) {
        var header = card.querySelector('.tokui-card-header');
        if (header) header.textContent = uAttrs.tt;
      }
      if (uAttrs.tx !== undefined) {
        var cardBody = card.querySelector('.tokui-card-body');
        if (cardBody) cardBody.textContent = uAttrs.tx;
      }
    };
    // 流式关闭时检测 artifact 子节点，重构为 flex 分栏
    card._streamCloseHook = function() {};
    if (node._dsl !== undefined) card._dslNode = node;
    return card;
  });

  // === 卡片页脚组件 ===
  // 作为 card 的子容器，渲染为 .tokui-card-footer
  renderer.register('ft', (node, rc) => {
    var text = node.attrs.tx || node.content || '';
    const footer = el('div', { class: 'tokui-card-footer' });
    if (text) footer.textContent = text;
    rc(node.children || []).forEach(child => {
      if (child && child.nodeType) footer.appendChild(child);
    });
    // 非流式：children 已渲染完毕，若无内容则不渲染（避免空白页脚条）
    // 流式 open：children 尚未到达，乐观创建，由 _streamCloseHook 在关闭时兜底移除
    var isStreamingOpen = node._stream === 'open';
    if (!isStreamingOpen && !footer.childNodes.length && !text) return null;
    footer._slot = footer;
    footer._tokuiType = 'ft';
    footer._streamCloseHook = function () {
      if (!footer.childNodes.length && !text) {
        if (footer.parentNode) footer.parentNode.removeChild(footer);
      }
    };
    return footer;
  });

  // === 行容器组件（栅格行）===
  renderer.register('row', (node, rc) => {
    const row = el('div', { class: 'tokui-row' });
    rc(node.children).forEach(child => {
      if (child && child.nodeType) row.appendChild(child);
    });
    row._slot = row;
    row._tokuiType = 'row';
    return row;
  });

  // === 列容器组件（栅格列）===
  // attrs.span = 列宽占比（1-12，基于 12 栅格系统）。超界 clamp 到 [1,12]，
  // 避免误用 24 列思维（span:14/24）时静默塌缩成 1 列破坏布局。
  renderer.register('col', (node, rc) => {
    const spanVal = (node.attrs && (node.attrs.span || node.attrs.cols));
    const col = el('div', { class: 'tokui-col' });
    if (spanVal) {
      const n = parseInt(spanVal);
      const span = isNaN(n) ? 1 : Math.min(12, Math.max(1, n));
      col.classList.add('tokui-col--' + span);
      col.style.gridColumn = `span ${span}`;
    }
    // 处理列内直接文本内容
    if (node.content) {
      col.textContent = node.content;
    }
    rc(node.children).forEach(child => {
      if (child && child.nodeType) col.appendChild(child);
    });
    col._slot = col;
    col._tokuiType = 'col';
    return col;
  });

  // === 列表容器组件 ===
  // attrs.t = 列表类型（'ol' 有序列表，默认 'ul' 无序列表）
  // attrs.plain = 隐藏序号/圆点前缀，左对齐
  renderer.register('list', (node, rc) => {
    const tag = (node.attrs && node.attrs.t === 'ol') ? 'ol' : 'ul';
    const cls = node.attrs && node.attrs.plain ? 'tokui-list tokui-list--plain' : 'tokui-list';
    const list = el(tag, { class: cls });
    rc(node.children).forEach(child => {
      if (child && child.nodeType) list.appendChild(child);
    });
    list._slot = list;
    list._tokuiType = 'list';
    return list;
  });

  // === 列表项组件（支持嵌套列表）===
  // 构建 desc 描述项 DOM（desc 的子节点，标签可以是 desc-item 或 item）。
  // 盖 data-tokui-tag=node.type 印章，让 Playground 按 [item]/[desc-item] 各自的代码行定位。
  // cols 用于限制 span 上限（mount 模式 desc 已知 cols；流式模式不传则不限制）。
  function buildDescItem(node, cols) {
    var attrs = node.attrs || {};
    var span = parseInt(attrs.span) || 1;
    var itemEl = el('div', { class: 'tokui-desc__item', 'data-tokui-tag': node.type });
    if (span > 1) {
      var limit = cols ? Math.min(span, cols) : span;
      itemEl.style.gridColumn = 'span ' + limit;
    }
    var label = el('div', { class: 'tokui-desc__label' });
    label.textContent = attrs.l || '';
    itemEl.appendChild(label);
    var val = el('div', { class: 'tokui-desc__value' });
    val.textContent = attrs.tx || node.content || '';
    itemEl.appendChild(val);
    return itemEl;
  }

  // item 视父级自适应：desc 内 → 描述项；list/ol/ul 内 → <li> 列表项。
  renderer.register('item', (node, rc, parentType) => {
    var dom;
    if (parentType === 'desc') dom = buildDescItem(node);
    else if (parentType === 'carousel') dom = buildCarouselSlide(node, rc);
    else if (parentType === 'command-group') {
      // buildCommandItem 定义在 basic.js，经 window.TokUI._internal 跨模块共享（同 el）
      var bci = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal && window.TokUI._internal.buildCommandItem) || null;
      if (bci) dom = bci(node);
    }
    if (!dom) {
      // 默认：list/ol/ul 内 → <li> 列表项；无特殊父级也兜底为 li
      dom = el('li', { class: 'tokui-list-item' });
      var text = node.content || (node.attrs && node.attrs.tx) || '';
      if (text) {
        dom.textContent = text;
      }
      rc(node.children || []).forEach(child => {
        if (child && child.nodeType) dom.appendChild(child);
      });
      dom._slot = dom;
    }
    // 统一盖 item 类型印章：流式 _streamClose 按 _tokuiType 匹配容器闭合，
    // 而 desc__item / 幻灯片 / 命令项 的 className 不含 "tokui-item"（desc__item 会被
    // _getNodeType 误判成 'desc'），不盖印章 → 关闭兄弟 item 时匹配失败、过度弹栈，
    // 把父级 desc 一起弹出，后续 item 悬空到 root 变成游离 li。
    if (dom.nodeType === 1) dom._tokuiType = 'item';
    return dom;
  });

  // === 标签页容器 ===
  // 纯 CSS 实现：radio/label/panel 平铺为兄弟元素，:checked 选择器控制切换
  // 一次性渲染：tabs 遍历 tab 子节点生成 input+label+panel
  // 流式渲染：tab 子组件自行生成 input+label+panel，追加到 tabs 容器
  renderer.register('tabs', (node, rc) => {
    const container = el('div', { class: 'tokui-tabs', role: 'tablist' });
    const tabId = 'tokui-tab-' + Math.random().toString(36).slice(2, 8);
    // 存储到 DOM 属性，供 tab 子组件读取
    container._tabId = tabId;
    container._tabCount = 0;

    (node.children || []).forEach((child, idx) => {
      if (child.type !== 'tab') return;
      _appendTabItem(container, child, rc, tabId, idx);
      container._tabCount = idx + 1;
    });

    container._slot = container;
    container._tokuiType = 'tabs';
    // 键盘导航：ArrowLeft/Right 切换 tab
    container.addEventListener('keydown', function(e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var labels = Array.from(container.querySelectorAll('.tokui-tabs-label'));
      var idx = labels.indexOf(e.target);
      if (idx === -1) return;
      e.preventDefault();
      var next = e.key === 'ArrowRight' ? (idx + 1) % labels.length : (idx - 1 + labels.length) % labels.length;
      var radio = container.querySelector('#' + labels[next].getAttribute('for'));
      if (radio) { radio.checked = true; labels[next].focus(); }
    });
    container._update = function(uAttrs) {
      if (uAttrs.v !== undefined) {
        var radio = container.querySelector('input[data-index="' + uAttrs.v + '"]');
        if (radio) radio.checked = true;
      }
    };
    // 流式结束复位：所有 tab 渲染完后默认切回首项（_streamClose 触发，仅流式生效）
    container._streamCloseHook = function () {
      if (!container._tokuiStreamActive) return; // 一次性 render 不复位
      var first = container.querySelector('input[data-index="0"]');
      if (first) first.checked = true;
    };
    return container;
  });
  /**
   * 向 tabs 容器追加一个完整的 tab 项（input + label + panel）
   */
  function _appendTabItem(container, tabNode, rc, tabId, idx) {
    // radio input
    var inputAttrs = { type: 'radio', name: tabId, class: 'tokui-tabs-input', 'data-index': String(idx) };
    if (idx === 0) inputAttrs.checked = 'checked';
    var input = el('input', inputAttrs);
    input.id = tabId + '-' + idx;
    container.appendChild(input);

    // label 作为 tab 导航项（盖 data-tokui-tag=tab 印章，供 Playground 点击 [tab] 代码行定位）
    var label = el('label', { class: 'tokui-tabs-label', for: tabId + '-' + idx, 'data-index': String(idx), 'data-tokui-tag': 'tab', role: 'tab', tabindex: '0' }, tabNode.attrs.tt || ('Tab ' + (idx + 1)));
    container.appendChild(label);

    // panel 内容区
    var panel = el('div', { class: 'tokui-tabs-panel', role: 'tabpanel', 'data-index': String(idx) });
    rc(tabNode.children || []).forEach(c => {
      if (c && c.nodeType) panel.appendChild(c);
    });
    container.appendChild(panel);
  }

  // === 单个标签页（tabs 的子容器）===
  // 流式渲染时：生成 input + label + panel 三件套，追加到父 tabs 容器
  renderer.register('tab', (node, rc) => {
    var panel = el('div', { class: 'tokui-tabs-panel', role: 'tabpanel' });
    rc(node.children || []).forEach(c => {
      if (c && c.nodeType) panel.appendChild(c);
    });
    panel._slot = panel;
    panel._tokuiType = 'tab';
    // 流式渲染标记：记录 tab 的标题和索引
    panel._tabTitle = (node.attrs && node.attrs.tt) || '';
    panel._isTab = true;
    return panel;
  });

  // === 手风琴容器 ===
  renderer.register('accordion', (node, rc) => {
    var container = el('div', { class: 'tokui-accordion' });
    rc(node.children || []).forEach(child => {
      if (child && child.nodeType) container.appendChild(child);
    });
    container._slot = container;
    container._tokuiType = 'accordion';
    // 流式结束复位：展开首项 collapse、收起其余（手风琴单展开语义，_streamClose 触发，仅流式生效）
    container._streamCloseHook = function () {
      if (!container._tokuiStreamActive) return; // 一次性 render 不复位
      var items = container.querySelectorAll('.tokui-collapse');
      for (var i = 0; i < items.length; i++) {
        if (i === 0) { items[i].setAttribute('open', ''); items[i].setAttribute('aria-expanded', 'true'); }
        else { items[i].removeAttribute('open'); items[i].setAttribute('aria-expanded', 'false'); }
      }
    };
    return container;
  });

  // === 折叠面板（details/summary 原生实现）===
  renderer.register('collapse', (node, rc) => {
    var cAttrs = { class: 'tokui-collapse', 'aria-expanded': node.attrs.open !== undefined ? 'true' : 'false' };
    if (node.attrs.id) cAttrs.id = node.attrs.id;
    var details = el('details', cAttrs);
    var summary = el('summary', { class: 'tokui-collapse-title' }, node.attrs.tt || _t('layout.collapseDefault'));
    details.appendChild(summary);
    var body = el('div', { class: 'tokui-collapse-body' });
    rc(node.children || []).forEach(child => {
      if (child && child.nodeType) body.appendChild(child);
    });
    details.appendChild(body);
    if (node.attrs.open !== undefined) details.setAttribute('open', '');
    details.addEventListener('toggle', function() {
      details.setAttribute('aria-expanded', String(details.hasAttribute('open')));
    });
    details._slot = body;
    details._tokuiType = 'collapse';
    details._update = function (uAttrs) {
      if (uAttrs.act === 'open') details.setAttribute('open', '');
      else if (uAttrs.act === 'close') details.removeAttribute('open');
      if (uAttrs.tt !== undefined) {
        var summ = details.querySelector('.tokui-collapse-title');
        if (summ) summ.textContent = uAttrs.tt;
      }
      if (uAttrs.tx !== undefined) {
        var body = details.querySelector('.tokui-collapse-body');
        if (body) {
          var firstP = body.querySelector('p');
          if (firstP) firstP.textContent = uAttrs.tx;
          else body.textContent = uAttrs.tx;
        }
      }
    };
    return details;
  });

  // === 对话框（dialog 原生元素）===
  renderer.register('dialog', (node, rc) => {
    var attrs = { class: 'tokui-dialog' };
    if (node.attrs.id) attrs.id = node.attrs.id;
    var dialog = el('dialog', attrs);
    if (node.attrs.tt) {
      var header = el('div', { class: 'tokui-dialog-header' });
      var titleSpan = el('span', {}, node.attrs.tt);
      header.appendChild(titleSpan);
      var closeBtn = el('button', { class: 'tokui-dialog-close', 'aria-label': _t('common.close') }, '✕');
      closeBtn.addEventListener('click', function () { dialog.close(); });
      header.appendChild(closeBtn);
      dialog.appendChild(header);
    }
    // 分离 ft 子节点和普通子节点：ft 作为对话框页脚追加到 dialog（body 之后），其余进 body
    var bodyChildren = [];
    var ftChildren = [];
    (node.children || []).forEach(child => {
      if (child.type === 'ft') ftChildren.push(child);
      else bodyChildren.push(child);
    });
    var body = el('div', { class: 'tokui-dialog-body' });
    rc(bodyChildren).forEach(child => {
      if (child && child.nodeType) body.appendChild(child);
    });
    dialog.appendChild(body);
    rc(ftChildren).forEach(child => {
      if (child && child.nodeType) dialog.appendChild(child);
    });
    if (node.attrs.clk) dialog.setAttribute('data-tokui-clk', node.attrs.clk);
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });
    dialog._slot = body;
    dialog._tokuiType = 'dialog';
    // 焦点陷阱
    dialog.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = dialog.querySelectorAll('button, [tabindex], input, select, textarea');
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    dialog._update = function (uAttrs) {
      if (uAttrs.act === 'open') dialog.showModal();
      else if (uAttrs.act === 'close') dialog.close();
      if (uAttrs.tt !== undefined) {
        var hdr = dialog.querySelector('.tokui-dialog-header span');
        if (hdr) hdr.textContent = uAttrs.tt;
      }
    };
    return dialog;
  });

  // === 抽屉组件 ===
  // attrs.tt = 标题, attrs.pos = 位置(left/right/top/bottom), attrs.w = 宽度, attrs.h = 高度
  // attrs.id, attrs.clk
  renderer.register('drawer', (node, rc) => {
    var pos = node.attrs.pos || 'right';
    var wrapper = el('div', { class: 'tokui-drawer tokui-drawer--' + pos, role: 'dialog', 'aria-modal': 'true' });
    if (node.attrs.id) wrapper.id = node.attrs.id;
    if (node.attrs.clk) wrapper.setAttribute('data-tokui-clk', node.attrs.clk);

    var overlay = el('div', { class: 'tokui-drawer__overlay' });
    overlay.addEventListener('click', function () {
      wrapper.classList.remove('tokui-drawer--open');
    });
    wrapper.appendChild(overlay);

    var panelAttrs = { class: 'tokui-drawer__panel' };
    var panel = el('div', panelAttrs);
    var w = node.attrs.w || '360px';
    var h = node.attrs.h || '300px';
    if (pos === 'left' || pos === 'right') {
      panel.style.width = w;
      panel.style.height = '100%';
    } else {
      panel.style.height = h;
      panel.style.width = '100%';
    }

    if (node.attrs.tt) {
      var header = el('div', { class: 'tokui-drawer__header' });
      header.appendChild(el('span', {}, node.attrs.tt));
      var closeBtn = el('button', { class: 'tokui-drawer__close', 'aria-label': _t('common.close') }, '✕');
      closeBtn.addEventListener('click', function () {
        wrapper.classList.remove('tokui-drawer--open');
      });
      header.appendChild(closeBtn);
      panel.appendChild(header);
    }

    // 分离 ft 子节点和普通子节点：ft 作为抽屉页脚追加到 panel（body 之后），其余进 body
    var dBodyChildren = [];
    var dFtChildren = [];
    (node.children || []).forEach(function (child) {
      if (child.type === 'ft') dFtChildren.push(child);
      else dBodyChildren.push(child);
    });
    var body = el('div', { class: 'tokui-drawer__body' });
    rc(dBodyChildren).forEach(function (child) {
      if (child && child.nodeType) body.appendChild(child);
    });
    panel.appendChild(body);
    rc(dFtChildren).forEach(function (child) {
      if (child && child.nodeType) panel.appendChild(child);
    });
    wrapper.appendChild(panel);

    wrapper._slot = body;
    wrapper._tokuiType = 'drawer';
    // Escape 关闭
    wrapper.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { wrapper.classList.remove('tokui-drawer--open'); e.stopPropagation(); }
    });
    wrapper._update = function (uAttrs) {
      if (uAttrs.act === 'open') wrapper.classList.add('tokui-drawer--open');
      else if (uAttrs.act === 'close') wrapper.classList.remove('tokui-drawer--open');
      if (uAttrs.tt !== undefined) {
        var hdr = wrapper.querySelector('.tokui-drawer__header span');
        if (hdr) hdr.textContent = uAttrs.tt;
      }
    };
    return wrapper;
  });

  // === 多图容器组件 ===
  // 支持两种模式：
  // 1. 简写版：attrs.s 包含逗号分隔的 URL，自动生成子 img
  // 2. 完整版：子节点为 img 标签（一次性渲染或流式追加）
  // 根据子图片数量动态设置 CSS 类实现九宫格布局
  renderer.register('imgs', (node, rc) => {
    const container = el('div', { class: 'tokui-imgs', role: 'group', 'aria-label': _t('layout.gallery') });
    let childNodes = node.children || [];

    // 简写版：从 s: 属性拆分生成虚拟 img 子节点
    if (node.attrs && node.attrs.s) {
      const urls = node.attrs.s.split(',').map(u => u.trim()).filter(Boolean);
      childNodes = urls.map(url => ({
        type: 'img',
        attrs: { s: url },
        content: '',
        children: []
      }));
    }

    // 渲染子 img 节点（一次性模式）
    const rendered = rc(childNodes);
    rendered.forEach(child => {
      if (child && child.nodeType) container.appendChild(child);
    });

    // 根据图片数量设置布局类
    const count = rendered.length;
    if (count >= 1) {
      container.classList.add('tokui-imgs--' + Math.min(count, 9));
    }

    container._slot = container;
    container._tokuiType = 'imgs';

    // 收集所有 img src 供灯箱导航
    const sources = childNodes
      .filter(n => n.type === 'img' && n.attrs && n.attrs.s)
      .map(n => n.attrs.s);
    container._imgSources = sources;

    // 为已有的 img 绑定灯箱点击
    function bindLightbox(parent, srcList) {
      const imgEls = parent.querySelectorAll('.tokui-img');
      imgEls.forEach((imgEl) => {
        if (imgEl._lbBound) return;
        imgEl._lbBound = true;
        const cloned = imgEl.cloneNode(true);
        imgEl.parentNode.replaceChild(cloned, imgEl);
        cloned.style.cursor = 'pointer';
        cloned.addEventListener('click', function () {
          const { getLightbox } = (typeof require === 'function')
            ? require('./lightbox')
            : window.TokUI._internal;
          const lb = getLightbox(typeof document !== 'undefined' ? document : undefined);
          lb.open(cloned.getAttribute('src'), srcList);
        });
      });
    }

    bindLightbox(container, sources);

    // 流式模式：子节点通过 _streamChild 逐个追加，close 时补设布局类和灯箱
    container._streamCloseHook = function () {
      const imgCount = container.querySelectorAll(':scope > .tokui-img').length;
      if (imgCount >= 1) {
        container.classList.add('tokui-imgs--' + Math.min(imgCount, 9));
      }
      // 收集实际渲染的图片 src
      const actualSrcs = [];
      container.querySelectorAll(':scope > .tokui-img').forEach(el => {
        actualSrcs.push(el.getAttribute('src'));
      });
      bindLightbox(container, actualSrcs);
    };

    return container;
  });

  // === Timeline 时间轴组件 ===
  // 容器 [timeline]，子项 [ti tm:"时间" t:success 内容]
  // attrs.v = variant (horizontal/alternate/card)
  renderer.register('timeline', (node, rc) => {
    const attrs = node.attrs || {};
    const classes = ['tokui-timeline'];
    const variant = attrs.v || '';
    const isAlternate = (variant === 'alternate' || variant === 'alt');
    if (variant === 'h' || variant === 'horizontal') classes.push('tokui-timeline--horizontal');
    if (isAlternate) classes.push('tokui-timeline--alternate');
    if (variant === 'card') classes.push('tokui-timeline--card');
    const wrapper = el('div', { class: classes.join(' ') });
    if (node.children && node.children.length > 0) {
      const children = rc(node.children);
      children.forEach(child => wrapper.appendChild(child));
    }
    // 交替排列：按 ti 在兄弟中的"真实序号"打左右类，而非 :nth-child。
    // 否则 AI 在 timeline 里前置一个 [h3]/[p] 标题元素会把 nth-child 顶偏，
    // 导致第一项跑到右侧、整体左右翻转（demo 不加标题所以正常，AI 常加）。
    if (isAlternate) {
      const assignSides = () => {
        const tis = wrapper.querySelectorAll(':scope > .tokui-ti');
        tis.forEach((ti, i) => {
          ti.classList.toggle('tokui-ti--alt-left', i % 2 === 0);
          ti.classList.toggle('tokui-ti--alt-right', i % 2 === 1);
        });
      };
      assignSides(); // 非流式：子项已全部在 wrapper 内
      // 流式：每来一个 ti 就实时重算左右（MutationObserver 在 paint 前触发 microtask），
      // 保证流式过程中每个 ti 一挂载就出现在正确的左/右位置，而不是等 [/timeline] 闭合才生效。
      const mo = new MutationObserver(() => assignSides());
      mo.observe(wrapper, { childList: true });
      wrapper._streamCloseHook = () => { assignSides(); mo.disconnect(); };
    }
    return wrapper;
  });

  // === Timeline Item ===
  // attrs.tm = timestamp, attrs.t = type (primary/success/warning/error/info)
  // attrs.tt = title, content = body text
  renderer.register('ti', (node) => {
    const attrs = node.attrs || {};
    const itemClasses = ['tokui-ti'];
    const tagType = attrs.t || '';
    if (tagType) itemClasses.push('tokui-ti--' + tagType);
    const item = el('div', { class: itemClasses.join(' ') });

    // dot/indicator
    const dot = el('div', { class: 'tokui-ti__dot' });
    item.appendChild(dot);

    // content area
    const content = el('div', { class: 'tokui-ti__content' });
    if (attrs.tt) {
      const title = el('div', { class: 'tokui-ti__title' });
      title.textContent = attrs.tt;
      content.appendChild(title);
    }
    const body = el('div', { class: 'tokui-ti__body' });
    body.textContent = node.content || '';
    content.appendChild(body);
    if (attrs.tm) {
      const time = el('div', { class: 'tokui-ti__time' });
      time.textContent = attrs.tm;
      content.appendChild(time);
    }
    item.appendChild(content);
    return item;
  });

  // === Steps 步骤条容器 ===
  // attrs.v = 当前步骤(1-based), attrs.s = 尺寸(sm/lg), attrs.vd = 方向(horizontal/vertical)
  renderer.register('steps', (node, rc) => {
    const attrs = node.attrs || {};
    const current = parseInt(attrs.v) || 1;
    const size = attrs.s || '';
    const direction = attrs.vd || '';
    const classes = ['tokui-steps'];
    if (size === 'sm' || size === 'small') classes.push('tokui-steps--sm');
    if (direction === 'vertical' || direction === 'v') classes.push('tokui-steps--vertical');
    const wrapperAttrs = { class: classes.join(' ') };
    if (attrs.id) wrapperAttrs.id = attrs.id;
    const wrapper = el('div', wrapperAttrs);

    const stepNodes = (node.children || []).filter(c => c.type === 'step');
    stepNodes.forEach(function (child, idx) {
      const stepIdx = idx + 1;
      const stepAttrs = child.attrs || {};
      const stepClasses = ['tokui-step'];
      if (stepAttrs.status === 'error' || stepAttrs.status === 'danger') {
        stepClasses.push('tokui-step--error');
        if (stepIdx <= current) stepClasses.push('tokui-step--current');
      } else if (stepIdx < current) {
        stepClasses.push('tokui-step--done');
      } else if (stepIdx === current) {
        stepClasses.push('tokui-step--active');
      } else {
        stepClasses.push('tokui-step--pending');
      }

      const stepEl = el('div', { class: stepClasses.join(' '), 'data-tokui-tag': 'step' });
      const circle = el('div', { class: 'tokui-step__circle' });
      if (stepAttrs.status === 'error' || stepAttrs.status === 'danger') {
        circle.textContent = '✕';
      } else if (stepIdx < current) {
        circle.textContent = '✓';
      } else {
        circle.textContent = String(stepIdx);
      }
      stepEl.appendChild(circle);

      const body = el('div', { class: 'tokui-step__body' });
      if (stepAttrs.tt) {
        const title = el('div', { class: 'tokui-step__title' });
        title.textContent = stepAttrs.tt;
        body.appendChild(title);
      }
      if (child.content) {
        const desc = el('div', { class: 'tokui-step__desc' });
        desc.textContent = child.content;
        body.appendChild(desc);
      }
      stepEl.appendChild(body);
      wrapper.appendChild(stepEl);
    });

    wrapper._slot = wrapper;
    wrapper._tokuiType = 'steps';
    wrapper._currentStep = current;

    // 重新计算所有 step 状态的通用方法
    function _applyStepStates(cur) {
      const stepEls = wrapper.querySelectorAll(':scope > .tokui-step');
      const total = stepEls.length;
      const complete = cur >= total;
      if (complete) {
        wrapper.classList.add('tokui-steps--complete');
      } else {
        wrapper.classList.remove('tokui-steps--complete');
      }
      stepEls.forEach(function (stepEl, idx) {
        const stepIdx = idx + 1;
        const circle = stepEl.querySelector('.tokui-step__circle');
        const isError = stepEl.getAttribute('data-step-status') === 'error';
        stepEl.className = 'tokui-step';
        if (isError) {
          stepEl.classList.add('tokui-step--error');
          if (stepIdx <= cur) stepEl.classList.add('tokui-step--current');
          if (circle) circle.textContent = '✕';
        } else if (complete) {
          stepEl.classList.add('tokui-step--done');
          if (circle) circle.textContent = '✓';
        } else if (stepIdx < cur) {
          stepEl.classList.add('tokui-step--done');
          if (circle) circle.textContent = '✓';
        } else if (stepIdx === cur) {
          stepEl.classList.add('tokui-step--active');
          if (circle) circle.textContent = String(stepIdx);
        } else {
          stepEl.classList.add('tokui-step--pending');
          if (circle) circle.textContent = String(stepIdx);
        }
      });
    }

    // 流式模式：关闭时重新设置所有 step 的状态和序号
    wrapper._streamCloseHook = function () {
      _applyStepStates(wrapper._currentStep);
    };

    // 动态更新方法：供 [upd id:xxx v:3] 调用
    wrapper._update = function (uAttrs) {
      if (uAttrs.v === undefined) return;
      var newCurrent = parseInt(uAttrs.v) || 1;
      wrapper._currentStep = newCurrent;
      _applyStepStates(newCurrent);
    };

    return wrapper;
  });

  // === Step 步骤项（流式模式使用）===
  renderer.register('step', (node) => {
    const attrs = node.attrs || {};
    const stepEl = el('div', { class: 'tokui-step tokui-step--pending' });
    if (attrs.status === 'error' || attrs.status === 'danger') {
      stepEl.setAttribute('data-step-status', 'error');
    }
    const circle = el('div', { class: 'tokui-step__circle' });
    circle.textContent = '?';
    stepEl.appendChild(circle);
    const body = el('div', { class: 'tokui-step__body' });
    if (attrs.tt) {
      const title = el('div', { class: 'tokui-step__title' });
      title.textContent = attrs.tt;
      body.appendChild(title);
    }
    if (node.content) {
      const desc = el('div', { class: 'tokui-step__desc' });
      desc.textContent = node.content;
      body.appendChild(desc);
    }
    stepEl.appendChild(body);
    return stepEl;
  });

  // === Description List 描述列表（容器）===
  // 重算 desc 最后一行 item 的 border：多列时最后一行整体去边框（不止 :last-child）。
  // 双策略：
  //   1) 测量法（getBoundingClientRect().top 同行）—— 支持任意 span 跨列，但需已布局（top≠0）。
  //   2) 计数法兜底（据 --tokui-desc-cols 算末行起点 index）—— 确定性、不依赖布局，
  //      覆盖 Node/SSR/隐藏容器/detached/流式未稳定等测量失效场景（此时单行只 :last-child 去边框的 bug）。
  function _markDescLastRow(wrapper) {
    var prev = wrapper.querySelectorAll('.tokui-desc__item--last-row');
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove('tokui-desc__item--last-row');
    var items = wrapper.querySelectorAll('.tokui-desc__item');
    if (!items.length) return;

    // 读 cols（渲染时写入 --tokui-desc-cols）
    var colsRaw = '';
    try { colsRaw = (wrapper.style.getPropertyValue('--tokui-desc-cols') || '').trim(); } catch (e) {}
    var cols = parseInt(colsRaw, 10) || 3;

    // 策略 1：测量法（已布局时用，支持 span）
    var measured = false;
    var lastEl = items[items.length - 1];
    if (lastEl.getBoundingClientRect) {
      var lastTop = lastEl.getBoundingClientRect().top;
      if (lastTop !== 0) {
        for (var j = items.length - 1; j >= 0; j--) {
          if (Math.abs(items[j].getBoundingClientRect().top - lastTop) < 1) {
            items[j].classList.add('tokui-desc__item--last-row');
          } else break;
        }
        measured = true;
      }
    }
    // 策略 2：计数法兜底（测量不可用/未布局）
    if (!measured) {
      var lastRowStart = (Math.ceil(items.length / cols) - 1) * cols;
      for (var k = lastRowStart; k < items.length; k++) items[k].classList.add('tokui-desc__item--last-row');
    }
  }

  // 监听 desc 子项增减（流式逐 item 追加），每次重算末行边框；wrapper 卸载自断开。
  // 同步首标（计数法立即正确）+ rAF/observer 测量精修（span/动态 cols）。
  function _watchDescRows(wrapper) {
    _markDescLastRow(wrapper); // 同步首次：计数法兜底，渲染返回时即可正确（不等布局）
    if (typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(function () {
      if (!wrapper.isConnected) { obs.disconnect(); return; }
      _markDescLastRow(wrapper);
    });
    obs.observe(wrapper, { childList: true });
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () { if (wrapper.isConnected) _markDescLastRow(wrapper); });
    }
  }

  // attrs.cols = 每行列数(默认3), attrs.stripe = 斑马纹, attrs.bordered = 带边框
  // attrs.v = 布局: horizontal/h(label和value左右排列), 默认上下排列
  // attrs.lw = label宽度(如 '120px'，horizontal模式生效)
  // 子节点为 desc-item，grid 直接在 wrapper 上，流式和非流式通用
  renderer.register('desc', (node, rc) => {
    var attrs = node.attrs || {};
    var cols = parseInt(attrs.cols) || 3;
    var classes = ['tokui-desc'];
    if (attrs.stripe !== undefined) classes.push('tokui-desc--stripe');
    if (attrs.bordered !== undefined) classes.push('tokui-desc--bordered');
    var isHorizontal = attrs.v === 'horizontal' || attrs.v === 'h';
    if (isHorizontal) classes.push('tokui-desc--horizontal');

    var wrapper = el('div', { class: classes.join(' ') });
    wrapper.style.setProperty('--tokui-desc-cols', String(cols));
    if (attrs.lw) wrapper.style.setProperty('--tokui-desc-label-w', attrs.lw);

    // 非流式：有 children 时直接渲染。子节点标签可以是 desc-item 或 item（item 在 desc 内按描述项处理）。
    var items = (node.children || []).filter(function(c) { return c.type === 'desc-item' || c.type === 'item'; });
    if (items.length > 0) {
      items.forEach(function(childNode) {
        wrapper.appendChild(buildDescItem(childNode, cols));
      });
    }

    // 末行边框智能处理（多列时整行去 border-bottom，含流式追加自适应）
    _watchDescRows(wrapper);

    wrapper._slot = wrapper;
    wrapper._tokuiType = 'desc';
    return wrapper;
  });

  // === Description Item（自闭合）===
  // attrs.l = 标签, attrs.tx = 值, attrs.span = 列跨距
  // 流式模式下由 slot 机制 append 到 desc wrapper，自动参与 grid 布局
  renderer.register('desc-item', (node) => {
    return buildDescItem(node);
  });

  // 构建 carousel 幻灯片 DOM（carousel 的子节点，标签可以是 carousel-item 或 item）。
  // 盖 data-tokui-tag=node.type 印章，让 Playground 按 [item]/[carousel-item] 各自代码行定位。
  // carousel-item 与 item 在 carousel 内等价（item 同名按父级区分：list→<li>、desc→描述项、carousel→幻灯片）。
  function buildCarouselSlide(node, rc) {
    var attrs = node.attrs || {};
    var slide = el('div', { class: 'tokui-carousel__slide', 'data-tokui-tag': node.type });
    if (attrs.s) {
      var img = el('img', { src: attrs.s, alt: attrs.tt || '' });
      img.style.width = '100%';
      img.style.display = 'block';
      slide.appendChild(img);
    }
    rc(node.children || []).forEach(function (c) {
      if (c && c.nodeType) slide.appendChild(c);
    });
    if (attrs.tt || attrs.tx) {
      var body = el('div', { class: 'tokui-carousel__slide-body' });
      if (attrs.tt) body.appendChild(el('div', { class: 'tokui-carousel__slide-title' }, attrs.tt));
      if (attrs.tx) body.appendChild(el('div', { class: 'tokui-carousel__slide-desc' }, attrs.tx));
      slide.appendChild(body);
    }
    return slide;
  }

  // === Carousel 轮播图容器 ===
  // attrs: id, auto(自动播放间隔ms), thumb(显示缩略图图例)
  // 子节点为 carousel-item / item（等价）/ img 类型
  renderer.register('carousel', (node, rc) => {
    var attrs = node.attrs || {};
    var useThumb = attrs.thumb !== undefined;
    var wrapperAttrs = { class: 'tokui-carousel' + (useThumb ? ' tokui-carousel--thumb' : '') };
    if (attrs.id) wrapperAttrs.id = attrs.id;
    wrapperAttrs['data-carousel'] = attrs.id || ('carousel-' + Math.random().toString(36).slice(2, 8));
    var wrapper = el('div', wrapperAttrs);

    // viewport：包裹 track+箭头+圆点，提供圆角裁剪与箭头/圆点定位上下文
    var viewport = el('div', { class: 'tokui-carousel__viewport' });
    var track = el('div', { class: 'tokui-carousel__track' });

    // 尺寸：w 宽（纯数字→px，亦支持 %/vw/rem）；h 高（px）；ratio 宽高比（如 16:9 / 4:3 / 1）。
    // 设了 h 或 ratio 时加 --sized，track/slide/img 撑满视口高度（img object-fit:cover）。
    function sizeVal(v) {
      v = String(v).trim();
      return /^\d+(\.\d+)?$/.test(v) ? v + 'px' : v;
    }
    function parseRatio(v) {
      var parts = String(v).split(':');
      if (parts.length === 2) {
        var a = parseFloat(parts[0]), b = parseFloat(parts[1]);
        return a && b ? a / b : 0;
      }
      var n = parseFloat(v);
      return n > 0 ? n : 0;
    }
    if (attrs.w) wrapper.style.width = sizeVal(attrs.w);
    if (attrs.h) {
      viewport.style.height = sizeVal(attrs.h);
      wrapper.classList.add('tokui-carousel--sized');
    } else if (attrs.ratio) {
      var ar = parseRatio(attrs.ratio);
      if (ar) {
        viewport.style.aspectRatio = String(ar);
        wrapper.classList.add('tokui-carousel--sized');
      }
    }

    // 收集 carousel-item / item（等价）/ img 子节点
    var itemNodes = (node.children || []).filter(function(c) {
      return c.type === 'carousel-item' || c.type === 'item' || c.type === 'img';
    });

    // 一次性渲染所有子节点
    itemNodes.forEach(function(child) {
      if (child.type === 'carousel-item' || child.type === 'item') {
        track.appendChild(buildCarouselSlide(child, rc));
      } else if (child.type === 'img') {
        var slide = el('div', { class: 'tokui-carousel__slide' });
        rc([child]).forEach(function(c) {
          if (c && c.nodeType) slide.appendChild(c);
        });
        track.appendChild(slide);
      }
    });

    viewport.appendChild(track);

    // 左右箭头
    var prevBtn = el('button', {
      class: 'tokui-carousel__arrow tokui-carousel__arrow--prev',
      'aria-label': _t('layout.carouselPrev'),
      'data-dir': 'prev'
    });
    prevBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    viewport.appendChild(prevBtn);

    var nextBtn = el('button', {
      class: 'tokui-carousel__arrow tokui-carousel__arrow--next',
      'aria-label': _t('layout.carouselNext'),
      'data-dir': 'next'
    });
    nextBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>';
    viewport.appendChild(nextBtn);

    wrapper.appendChild(viewport);

    // 指示器（圆点 / 缩略图）延迟构建：流式下子节点经 _slot 后续追加到 track，
    // render 时 node.children 为空，须等 track 实际有 slide 后（一次性立即 / 流式在 close hook）再建。
    var dots = null;
    var thumbs = null;
    var indicatorsBuilt = false;
    // track 的直接 slide 子节点（用 .children 过滤，规避某些环境 :scope> 支持差异）
    function getSlides() {
      return Array.prototype.filter.call(track.children, function (c) {
        return c && c.nodeType === 1 && /\btokui-carousel__slide\b/.test(c.className || '');
      });
    }
    function ensureIndicators() {
      if (indicatorsBuilt) return;
      var slideEls = getSlides();
      if (!slideEls.length) return; // 等待子节点到达（流式）
      indicatorsBuilt = true;
      if (useThumb) {
        // 缩略图图例：track 下方一排可点击小图，点击丝滑切换（复用 track transform 过渡）
        thumbs = el('div', { class: 'tokui-carousel__thumbs' });
        slideEls.forEach(function(slide, ti) {
          var imgEl = slide.querySelector('img');
          var src = imgEl ? imgEl.getAttribute('src') : '';
          var titleEl = slide.querySelector('.tokui-carousel__slide-title');
          var alt = titleEl ? (titleEl.textContent || '').trim() : '';
          var thumb = el('button', {
            class: 'tokui-carousel__thumb' + (ti === 0 ? ' tokui-carousel__thumb--active' : ''),
            'aria-label': _t('layout.carouselIndex', { n: ti + 1 }),
            'data-index': String(ti)
          });
          if (src) {
            var tImg = el('img', { src: src, alt: alt });
            tImg.style.width = '100%';
            tImg.style.height = '100%';
            tImg.style.objectFit = 'cover';
            thumb.appendChild(tImg);
          } else {
            thumb.textContent = String(ti + 1); // 无图幻灯片：序号占位
          }
          thumbs.appendChild(thumb);
        });
        wrapper.appendChild(thumbs);
      } else {
        dots = el('div', { class: 'tokui-carousel__dots' });
        slideEls.forEach(function(slide, di) {
          var dot = el('button', {
            class: 'tokui-carousel__dot' + (di === 0 ? ' tokui-carousel__dot--active' : ''),
            'aria-label': _t('layout.carouselIndex', { n: di + 1 }),
            'data-index': String(di)
          });
          dots.appendChild(dot);
        });
        viewport.appendChild(dots);
      }
    }

    wrapper._slot = track;
    wrapper._tokuiType = 'carousel';

    // 交互行为绑定
    function initCarouselBehavior() {
      ensureIndicators(); // 先构建指示器（一次性/流式统一入口）
      var currentIndex = 0;
      var slideEls = getSlides();
      var dotEls = dots ? dots.querySelectorAll('.tokui-carousel__dot') : [];
      var thumbEls = thumbs ? thumbs.querySelectorAll('.tokui-carousel__thumb') : [];
      var autoInterval = null;

      function setActive() {
        if (dotEls.forEach) {
          dotEls.forEach(function(d, di) {
            if (di === currentIndex) d.classList.add('tokui-carousel__dot--active');
            else d.classList.remove('tokui-carousel__dot--active');
          });
        }
        if (thumbEls.forEach) {
          thumbEls.forEach(function(t, ti) {
            if (ti === currentIndex) {
              t.classList.add('tokui-carousel__thumb--active');
              // active 缩略图滚入可视区
              if (t.scrollIntoView) {
                t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
              }
            } else {
              t.classList.remove('tokui-carousel__thumb--active');
            }
          });
        }
      }

      function goTo(index) {
        if (index < 0) index = slideEls.length - 1;
        if (index >= slideEls.length) index = 0;
        currentIndex = index;
        track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
        setActive();
      }

      prevBtn.addEventListener('click', function() {
        goTo(currentIndex - 1);
        resetAuto();
      });
      nextBtn.addEventListener('click', function() {
        goTo(currentIndex + 1);
        resetAuto();
      });
      if (dots) {
        dots.addEventListener('click', function(e) {
          var dot = e.target.closest('.tokui-carousel__dot');
          if (!dot) return;
          goTo(parseInt(dot.getAttribute('data-index')));
          resetAuto();
        });
      }
      if (thumbs) {
        thumbs.addEventListener('click', function(e) {
          var thumb = e.target.closest('.tokui-carousel__thumb');
          if (!thumb) return;
          goTo(parseInt(thumb.getAttribute('data-index')));
          resetAuto();
        });
      }

      function startAuto() {
        var interval = parseInt(attrs.auto);
        if (interval && interval > 0) {
          autoInterval = setInterval(function() {
            goTo(currentIndex + 1);
          }, interval);
        }
      }
      function resetAuto() {
        if (autoInterval) clearInterval(autoInterval);
        startAuto();
      }

      startAuto();

      // 键盘导航
      wrapper.setAttribute('tabindex', '0');
      wrapper.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') { goTo(currentIndex - 1); resetAuto(); }
        else if (e.key === 'ArrowRight') { goTo(currentIndex + 1); resetAuto(); }
      });

      // 拖动/滑动切换
      var dragStartX = 0;
      var dragDelta = 0;
      var isDragging = false;

      track.addEventListener('mousedown', function(e) {
        isDragging = true;
        dragStartX = e.clientX;
        dragDelta = 0;
        track.style.transition = 'none';
        resetAuto();
      });
      track.addEventListener('touchstart', function(e) {
        isDragging = true;
        dragStartX = e.touches[0].clientX;
        dragDelta = 0;
        track.style.transition = 'none';
        resetAuto();
      }, { passive: true });

      function onMove(clientX) {
        if (!isDragging) return;
        dragDelta = clientX - dragStartX;
        var offset = -(currentIndex * wrapper.offsetWidth) + dragDelta;
        track.style.transform = 'translateX(' + offset + 'px)';
      }
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('mousemove', function(e) { onMove(e.clientX); });
        document.addEventListener('touchmove', function(e) { onMove(e.touches[0].clientX); }, { passive: true });
      }

      function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        track.style.transition = '';
        var threshold = wrapper.offsetWidth * 0.2;
        if (dragDelta < -threshold) {
          goTo(currentIndex + 1);
        } else if (dragDelta > threshold) {
          goTo(currentIndex - 1);
        } else {
          goTo(currentIndex);
        }
      }
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
      }
    }

    // 一次性渲染：立即绑定
    if (itemNodes.length > 0) {
      initCarouselBehavior();
    }

    // 流式模式：关闭时绑定
    wrapper._streamCloseHook = function() {
      initCarouselBehavior();
    };

    return wrapper;
  });

  // === Carousel Item 轮播图子项 ===
  // 自闭合：attrs.s=图片URL, attrs.tt=标题, attrs.tx=描述
  // 也支持 img 子节点
  renderer.register('carousel-item', (node, rc) => {
    return buildCarouselSlide(node, rc);
  });

  // === 树节点 ===
  // 容器组件，可递归嵌套子 tn
  // attrs: v(值), tx(显示文本), open(默认展开), leaf(叶节点), chk(选中), dis(禁用)
  renderer.register('tn', (node, rc) => {
    var isLeaf = node.attrs.leaf !== undefined;
    var isOpen = node.attrs.open !== undefined;
    var isDisabled = node.attrs.dis !== undefined;

    var nodeEl = el('div', {
      class: 'tokui-tree-node' +
        (isLeaf ? ' tokui-tree-node--leaf' : '') +
        (isOpen ? ' tokui-tree-node--open' : '') +
        (isDisabled ? ' tokui-tree-node--disabled' : ''),
      role: 'treeitem',
      'aria-expanded': !isLeaf ? String(isOpen) : undefined
    });
    nodeEl.setAttribute('data-value', node.attrs.v || '');
    nodeEl.setAttribute('data-text', node.attrs.tx || node.attrs.v || '');

    var header = el('div', { class: 'tokui-tree-node-header', tabindex: '0' });

    var arrow = el('span', { class: 'tokui-tree-arrow' });
    arrow.textContent = '▶';
    header.appendChild(arrow);

    var icon = el('span', { class: 'tokui-tree-icon' });
    icon.textContent = isLeaf ? '📄' : '📁';
    header.appendChild(icon);

    var text = el('span', { class: 'tokui-tree-text' }, node.attrs.tx || node.attrs.v || '');
    header.appendChild(text);

    nodeEl.appendChild(header);

    // 子节点容器（非叶节点才有）
    var childContainer = null;
    if (!isLeaf) {
      childContainer = el('div', { class: 'tokui-tree-node-children' });
      if (!isOpen) childContainer.style.display = 'none';
      if (node.children && node.children.length) {
        rc(node.children).forEach(function(child) {
          if (child && child.nodeType) childContainer.appendChild(child);
        });
      }
      nodeEl.appendChild(childContainer);
      nodeEl._slot = childContainer;
    }
    nodeEl._tokuiType = 'tn';

    return nodeEl;
  });

  // === 树形控件 ===
  // 容器组件，子节点为 tn
  // attrs: id, l(标签), clk(点击事件), chk(复选框模式), dis(禁用)
  renderer.register('tree', (node, rc) => {
    var isChkMode = node.attrs.chk !== undefined;
    var isDisabled = node.attrs.dis !== undefined;

    var field = el('div', { class: 'tokui-field' });
    if (node.attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label' }, node.attrs.l));
    }
    if (node.attrs.id) field.id = node.attrs.id;

    var tree = el('div', {
      class: 'tokui-tree' +
        (isChkMode ? ' tokui-tree--checkable' : '') +
        (isDisabled ? ' tokui-tree--disabled' : ''),
      role: 'tree'
    });

    // mount 模式：立即渲染子节点
    if (node.children && node.children.length) {
      rc(node.children).forEach(function(child) {
        if (child && child.nodeType) tree.appendChild(child);
      });
    }

    field.appendChild(tree);

    // 是否已绑定过事件
    var behaviorBound = false;

    // 初始化交互行为
    function initTreeBehavior() {
      if (isDisabled || behaviorBound) return;
      behaviorBound = true;

      // 展开/折叠（委托到 tree，支持动态添加的节点）
      tree.addEventListener('click', function(e) {
        var arrow = e.target.closest('.tokui-tree-arrow');
        if (!arrow) return;
        e.stopPropagation();
        var nodeEl = arrow.closest('.tokui-tree-node');
        if (!nodeEl || nodeEl.classList.contains('tokui-tree-node--leaf')) return;
        var children = nodeEl.querySelector(':scope > .tokui-tree-node-children');
        if (!children) return;
        var isOpen = nodeEl.classList.contains('tokui-tree-node--open');
        if (isOpen) {
          nodeEl.classList.remove('tokui-tree-node--open');
          children.style.display = 'none';
        } else {
          nodeEl.classList.add('tokui-tree-node--open');
          children.style.display = '';
        }
      });

      // 节点选中（委托）
      tree.addEventListener('click', function(e) {
        var textEl = e.target.closest('.tokui-tree-text');
        if (!textEl) return;
        e.stopPropagation();
        var nodeEl = textEl.closest('.tokui-tree-node');
        if (!nodeEl) return;
        tree.querySelectorAll('.tokui-tree-node--selected').forEach(function(n) {
          n.classList.remove('tokui-tree-node--selected');
        });
        nodeEl.classList.add('tokui-tree-node--selected');

        if (node.attrs.clk) {
          var handler = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal && window.TokUI._internal.TokUIEventBus)
            ? window.TokUI._internal.TokUIEventBus.getHandler(node.attrs.clk) : null;
          if (handler) handler({
            id: node.attrs.id,
            value: nodeEl.getAttribute('data-value'),
            text: nodeEl.getAttribute('data-text')
          });
        }
      });

      // 复选框模式
      if (isChkMode) {
        tree.querySelectorAll('.tokui-tree-node-header').forEach(function(header) {
          var cb = el('input', { type: 'checkbox', class: 'tokui-tree-checkbox' });
          var nodeEl = header.closest('.tokui-tree-node');
          if (nodeEl && nodeEl.classList.contains('tokui-tree-node--disabled')) {
            cb.disabled = true;
          }
          header.insertBefore(cb, header.firstChild);
        });

        tree.addEventListener('change', function(e) {
          if (!e.target.classList.contains('tokui-tree-checkbox')) return;
          var nodeEl = e.target.closest('.tokui-tree-node');
          if (!nodeEl) return;
          var checked = e.target.checked;
          nodeEl.querySelectorAll('.tokui-tree-checkbox').forEach(function(cb) {
            if (cb !== e.target) {
              cb.checked = checked;
              cb.indeterminate = false;
            }
          });
          updateParentCheckboxes(tree);
        });
      }

      // 键盘导航：Enter/Space toggle，ArrowDown/Up 同级导航
      tree.addEventListener('keydown', function(e) {
        var header = e.target.closest('.tokui-tree-node-header');
        if (!header) return;
        var nodeEl = header.closest('.tokui-tree-node');
        if (!nodeEl) return;

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var arrow = header.querySelector('.tokui-tree-arrow');
          if (arrow && !nodeEl.classList.contains('tokui-tree-node--leaf')) {
            arrow.click();
          }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          var siblings = Array.from(tree.querySelectorAll(':scope .tokui-tree-node-header'));
          var idx = siblings.indexOf(header);
          if (e.key === 'ArrowDown' && idx < siblings.length - 1) {
            siblings[idx + 1].focus();
          } else if (e.key === 'ArrowUp' && idx > 0) {
            siblings[idx - 1].focus();
          }
        }
      });
    }

    function updateParentCheckboxes(treeEl) {
      treeEl.querySelectorAll('.tokui-tree-node').forEach(function(nodeEl) {
        var children = nodeEl.querySelector(':scope > .tokui-tree-node-children');
        if (!children) return;
        var childBoxes = children.querySelectorAll(':scope > .tokui-tree-node > .tokui-tree-node-header > .tokui-tree-checkbox');
        if (childBoxes.length === 0) return;
        var parentBox = nodeEl.querySelector(':scope > .tokui-tree-node-header > .tokui-tree-checkbox');
        if (!parentBox) return;
        var total = childBoxes.length;
        var checked = 0;
        childBoxes.forEach(function(cb) { if (cb.checked) checked++; });
        if (checked === 0) {
          parentBox.checked = false;
          parentBox.indeterminate = false;
        } else if (checked === total) {
          parentBox.checked = true;
          parentBox.indeterminate = false;
        } else {
          parentBox.checked = false;
          parentBox.indeterminate = true;
        }
      });
    }

    // mount 模式
    if (node.children && node.children.length) {
      initTreeBehavior();
    }

    // 流式模式：tree 关闭时绑定事件
    field._streamCloseHook = function() {
      initTreeBehavior();
    };
    // 直接指向 tree，子节点流式追加到可见区域
    field._slot = tree;
    field._tokuiType = 'tree';
    field._variantTarget = tree;

    return field;
  });
  // === Menu 菜单容器 ===
  // attrs.v = 变体(vertical/horizontal/inline), attrs.act = 默认选中项 clk 值
  // attrs.bg = 背景色, attrs.fc = 文字色
  // 子节点为 menu-item（自闭合），渲染为菜单项列表
  renderer.register('menu', (node, rc) => {
    var attrs = node.attrs || {};
    var variant = attrs.v || 'vertical';
    var classes = ['tokui-menu'];
    if (variant === 'horizontal' || variant === 'h') classes.push('tokui-menu--horizontal');
    else if (variant === 'inline') classes.push('tokui-menu--inline');

    var menuAttrs = { class: classes.join(' '), role: 'menu' };
    if (attrs.id) menuAttrs.id = attrs.id;
    var menu = el('div', menuAttrs);

    // 背景和文字色
    if (attrs.bg) menu.style.setProperty('--tokui-menu-bg', attrs.bg);
    if (attrs.fc) menu.style.setProperty('--tokui-menu-fc', attrs.fc);

    var activeClk = attrs.act || '';

    // 非流式：渲染 menu-item 子节点
    var itemNodes = (node.children || []).filter(function(c) { return c.type === 'menu-item'; });
    itemNodes.forEach(function(childNode) {
      var itemEl = _buildMenuItem(childNode, activeClk);
      menu.appendChild(itemEl);
    });

    menu._slot = menu;
    menu._tokuiType = 'menu';
    menu._activeClk = activeClk;

    // 键盘导航：ArrowDown/Up 在 menu-item 间移动，Enter 选择
    menu.addEventListener('keydown', function(e) {
      var item = e.target.closest('.tokui-menu__item');
      if (!item) return;
      var items = Array.from(menu.querySelectorAll('.tokui-menu__item:not(.tokui-menu__item--disabled)'));
      var idx = items.indexOf(item);
      if (e.key === 'ArrowDown' && idx < items.length - 1) {
        e.preventDefault();
        items[idx + 1].focus();
      } else if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        items[idx - 1].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });

    return menu;
  });

  function _buildMenuItem(childNode, activeClk) {
    var itemAttrs = childNode.attrs || {};
    var itemClasses = ['tokui-menu__item'];
    if (itemAttrs.dis !== undefined) itemClasses.push('tokui-menu__item--disabled');
    if (activeClk && itemAttrs.clk === activeClk) itemClasses.push('tokui-menu__item--active');

    var elAttrs = { class: itemClasses.join(' '), role: 'menuitem', tabindex: '0' };
    var itemEl = el('div', elAttrs);

    // 图标
    if (itemAttrs.i) {
      var icon = el('span', { class: 'tokui-menu__icon' }, itemAttrs.i);
      itemEl.appendChild(icon);
    }

    // 文字
    var text = el('span', { class: 'tokui-menu__text' }, itemAttrs.tx || childNode.content || '');
    itemEl.appendChild(text);

    // 点击事件
    if (itemAttrs.clk && itemAttrs.dis === undefined) {
      itemEl.setAttribute('data-tokui-clk', itemAttrs.clk);
      itemEl.addEventListener('click', function() {
        // 更新激活状态
        var menu = itemEl.closest('.tokui-menu');
        if (menu) {
          menu.querySelectorAll('.tokui-menu__item--active').forEach(function(el) {
            el.classList.remove('tokui-menu__item--active');
          });
        }
        itemEl.classList.add('tokui-menu__item--active');
      });
    }

    return itemEl;
  }

  // === Menu Item 菜单项（自闭合）===
  // attrs.tx = 文字, attrs.clk = 点击事件, attrs.i = 图标字符
  // attrs.dis = 禁用, attrs.act = 选中激活
  // 流式模式下由 slot 机制 append 到 menu wrapper
  renderer.register('menu-item', (node) => {
    // 需要找到最近的 menu 容器来获取 activeClk
    var attrs = node.attrs || {};
    var itemClasses = ['tokui-menu__item'];
    if (attrs.dis !== undefined) itemClasses.push('tokui-menu__item--disabled');
    if (attrs.act !== undefined) itemClasses.push('tokui-menu__item--active');

    var elAttrs = { class: itemClasses.join(' '), role: 'menuitem', tabindex: '0' };
    var itemEl = el('div', elAttrs);

    if (attrs.i) {
      itemEl.appendChild(el('span', { class: 'tokui-menu__icon' }, attrs.i));
    }
    itemEl.appendChild(el('span', { class: 'tokui-menu__text' }, attrs.tx || node.content || ''));

    if (attrs.clk && attrs.dis === undefined) {
      itemEl.setAttribute('data-tokui-clk', attrs.clk);
      itemEl.addEventListener('click', function() {
        var menu = itemEl.closest('.tokui-menu');
        if (menu) {
          menu.querySelectorAll('.tokui-menu__item--active').forEach(function(el) {
            el.classList.remove('tokui-menu__item--active');
          });
        }
        itemEl.classList.add('tokui-menu__item--active');
      });
    }

    return itemEl;
  });

  // === Resizable 分割面板 ===
  // attrs.dir = 方向(h水平/v竖直, 默认h), attrs.min = 最小尺寸(px, 默认100)
  // attrs.max = 最大尺寸(px, 默认800), attrs.default = 初始尺寸(px, 默认300)
  // attrs.w = 容器宽度
  // 两个子面板之间有可拖拽的分割手柄，支持鼠标和触摸
  renderer.register('resizable', (node, rc) => {
    var attrs = node.attrs || {};
    var dir = attrs.dir || 'h';
    var minSize = parseInt(attrs.min) || 100;
    var maxSize = parseInt(attrs.max) || 800;
    var defaultSize = parseInt(attrs['default']) || 300;

    var isHorizontal = dir !== 'v';
    var classes = ['tokui-resizable'];
    classes.push(isHorizontal ? 'tokui-resizable--h' : 'tokui-resizable--v');

    var wrapperAttrs = { class: classes.join(' ') };
    if (attrs.w) wrapperAttrs.style = 'width:' + attrs.w;
    var wrapper = el('div', wrapperAttrs);

    // 第一面板 — flex:none 使 width/height 不被 flex:1 覆盖
    var panel1 = el('div', { class: 'tokui-resizable__panel' });
    panel1.style.flex = 'none';
    if (isHorizontal) {
      panel1.style.width = defaultSize + 'px';
      panel1.style.minWidth = minSize + 'px';
      panel1.style.maxWidth = maxSize + 'px';
    } else {
      panel1.style.height = defaultSize + 'px';
      panel1.style.minHeight = minSize + 'px';
      panel1.style.maxHeight = maxSize + 'px';
      panel1.style.overflow = 'auto';
    }

    // 拖拽手柄
    var handle = el('div', {
      class: 'tokui-resizable__handle',
      role: 'separator',
      'aria-orientation': isHorizontal ? 'vertical' : 'horizontal',
      tabindex: '0'
    });

    // 第二面板
    var panel2 = el('div', { class: 'tokui-resizable__panel' });
    if (!isHorizontal) panel2.style.overflow = 'auto';

    wrapper.appendChild(panel1);
    wrapper.appendChild(handle);
    wrapper.appendChild(panel2);

    // 拖拽逻辑
    function onStart(e) {
      e.preventDefault();
      var clientPos = isHorizontal
        ? (e.touches ? e.touches[0].clientX : e.clientX)
        : (e.touches ? e.touches[0].clientY : e.clientY);
      startPos = clientPos;
      startSize = isHorizontal ? panel1.offsetWidth : panel1.offsetHeight;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
      handle.classList.add('tokui-resizable__handle--active');
    }
    var startPos = 0;
    var startSize = 0;

    function onMove(e) {
      e.preventDefault();
      var clientPos = isHorizontal
        ? (e.touches ? e.touches[0].clientX : e.clientX)
        : (e.touches ? e.touches[0].clientY : e.clientY);
      var delta = clientPos - startPos;
      var newSize = startSize + delta;
      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      if (isHorizontal) {
        panel1.style.width = newSize + 'px';
      } else {
        panel1.style.height = newSize + 'px';
      }
    }

    function onEnd() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      handle.classList.remove('tokui-resizable__handle--active');
    }

    handle.addEventListener('mousedown', onStart);
    handle.addEventListener('touchstart', onStart, { passive: false });

    // 键盘支持
    handle.addEventListener('keydown', function(e) {
      var step = 10;
      var currentSize = isHorizontal ? panel1.offsetWidth : panel1.offsetHeight;
      if (isHorizontal && e.key === 'ArrowLeft') {
        e.preventDefault();
        panel1.style.width = Math.max(minSize, currentSize - step) + 'px';
      } else if (isHorizontal && e.key === 'ArrowRight') {
        e.preventDefault();
        panel1.style.width = Math.min(maxSize, currentSize + step) + 'px';
      } else if (!isHorizontal && e.key === 'ArrowUp') {
        e.preventDefault();
        panel1.style.height = Math.max(minSize, currentSize - step) + 'px';
      } else if (!isHorizontal && e.key === 'ArrowDown') {
        e.preventDefault();
        panel1.style.height = Math.min(maxSize, currentSize + step) + 'px';
      }
    });

    // 非流式模式：通过 rc() 渲染子节点并分发到两个面板
    var rendered = rc(node.children || []);
    var children = [];
    rendered.forEach(function(child) {
      if (child && child.nodeType) children.push(child);
    });
    if (children[0]) panel1.appendChild(children[0]);
    for (var i = 1; i < children.length; i++) {
      panel2.appendChild(children[i]);
    }

    // 流式关闭钩子：将流式追加到 wrapper 的子节点分发到两个面板
    wrapper._streamCloseHook = function() {
      var items = [];
      for (var i = 0; i < wrapper.children.length; i++) {
        var c = wrapper.children[i];
        if (c !== panel1 && c !== handle && c !== panel2) {
          items.push(c);
        }
      }
      if (items.length > 0) {
        panel1.appendChild(items[0]);
        for (var j = 1; j < items.length; j++) {
          panel2.appendChild(items[j]);
        }
      }
    };

    // 不设 _slot，流式子节点追加到 wrapper 自身，由 _streamCloseHook 分发
    wrapper._tokuiType = 'resizable';
    return wrapper;
  });

  // === Scroll Area 自定义滚动区域 ===
  // 容器组件， attrs.h = 高度(px), attrs.w = 宽度
  // 外层 overflow:hidden 固定尺寸，内层 overflow:auto 可滚动
  // 自定义滚动条样式（webkit + Firefox）
  renderer.register('scroll-area', (node, rc) => {
    var attrs = node.attrs || {};
    var outerAttrs = { class: 'tokui-scroll-area' };
    if (attrs.id) outerAttrs.id = attrs.id;
    var outer = el('div', outerAttrs);

    // 设置外层尺寸
    if (attrs.h) outer.style.height = String(attrs.h).match(/^\d+$/) ? attrs.h + 'px' : attrs.h;
    if (attrs.w) outer.style.width = attrs.w;

    // 内层可滚动视口
    var viewport = el('div', { class: 'tokui-scroll-area__viewport' });

    // 渲染子节点到视口
    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) viewport.appendChild(child);
    });

    outer.appendChild(viewport);
    outer._slot = viewport;
    outer._tokuiType = 'scroll-area';
    return outer;
  });

  // === Sidebar 侧边栏容器 ===
  // attrs.w = 宽度(px, 默认260), attrs.pos = 位置(left/right, 默认left)
  // attrs.collapsible = 可折叠, attrs.tt = 标题/logo文本
  // attrs.bg = 背景色, attrs.fc = 文字色
  // 子容器: sidebar-content(内容区), sidebar-footer(页脚)
  renderer.register('sidebar', (node, rc) => {
    var attrs = node.attrs || {};
    var width = attrs.w || '260';
    var pos = attrs.pos || 'left';
    var isCollapsible = attrs.collapsible !== undefined;
    var bg = attrs.bg || '';
    var fc = attrs.fc || '';

    var classes = ['tokui-sidebar', 'tokui-sidebar--' + pos];
    if (isCollapsible) classes.push('tokui-sidebar--collapsible');

    var sidebarAttrs = { class: classes.join(' ') };
    if (attrs.id) sidebarAttrs.id = attrs.id;
    var sidebar = el('div', sidebarAttrs);
    sidebar.style.setProperty('--tokui-sidebar-w', width + 'px');
    if (bg) sidebar.style.setProperty('--tokui-sidebar-bg', bg);
    if (fc) sidebar.style.setProperty('--tokui-sidebar-fc', fc);
    if (bg) sidebar.style.setProperty('--tokui-sidebar-footer-bg', 'rgba(0,0,0,0.15)');
    if (bg) sidebar.style.setProperty('--tokui-sidebar-header-bg', 'rgba(0,0,0,0.15)');
    if (bg) sidebar.style.setProperty('--tokui-sidebar-border', 'rgba(255,255,255,0.1)');

    // 分离子节点
    var contentChildren = [];
    var footerChildren = [];
    var otherChildren = [];
    (node.children || []).forEach(function(child) {
      if (child.type === 'sidebar-content') {
        contentChildren.push(child);
      } else if (child.type === 'sidebar-footer') {
        footerChildren.push(child);
      } else {
        otherChildren.push(child);
      }
    });

    // Header 区域
    if (attrs.tt || isCollapsible) {
      var header = el('div', { class: 'tokui-sidebar__header' });
      if (attrs.tt) {
        var title = el('div', { class: 'tokui-sidebar__title' }, attrs.tt);
        header.appendChild(title);
      }
      if (isCollapsible) {
        var toggle = el('button', {
          class: 'tokui-sidebar__toggle',
          'aria-label': 'Toggle sidebar',
          type: 'button'
        });
        toggle.textContent = '☰'; // hamburger character ☰
        toggle.addEventListener('click', function() {
          sidebar.classList.toggle('tokui-sidebar--collapsed');
          // Update aria-expanded
          var isCollapsed = sidebar.classList.contains('tokui-sidebar--collapsed');
          sidebar.setAttribute('aria-expanded', String(!isCollapsed));
        });
        header.appendChild(toggle);
      }
      sidebar.appendChild(header);
    }
    sidebar.setAttribute('aria-expanded', 'true');

    // Content 区域
    var contentDiv = el('div', { class: 'tokui-sidebar__content' });
    // Render sidebar-content children into content div
    contentChildren.forEach(function(cNode) {
      rc(cNode.children || []).forEach(function(child) {
        if (child && child.nodeType) contentDiv.appendChild(child);
      });
    });
    // Also render any non-sidebar children into content (backward compat)
    rc(otherChildren).forEach(function(child) {
      if (child && child.nodeType) contentDiv.appendChild(child);
    });
    sidebar.appendChild(contentDiv);

    // Footer 区域
    if (footerChildren.length > 0) {
      var footer = el('div', { class: 'tokui-sidebar__footer' });
      footerChildren.forEach(function(fNode) {
        rc(fNode.children || []).forEach(function(child) {
          if (child && child.nodeType) footer.appendChild(child);
        });
      });
      sidebar.appendChild(footer);
    }

    sidebar._slot = contentDiv;
    sidebar._tokuiType = 'sidebar';
    sidebar._update = function(uAttrs) {
      if (uAttrs.tt !== undefined) {
        var t = sidebar.querySelector('.tokui-sidebar__title');
        if (t) t.textContent = uAttrs.tt;
      }
      if (uAttrs.act === 'collapse') sidebar.classList.add('tokui-sidebar--collapsed');
      else if (uAttrs.act === 'expand') sidebar.classList.remove('tokui-sidebar--collapsed');
      else if (uAttrs.act === 'toggle') sidebar.classList.toggle('tokui-sidebar--collapsed');
    };
    if (node._dsl !== undefined) sidebar._dslNode = node;
    return sidebar;
  });

  // === Sidebar Content 侧边栏内容区 ===
  renderer.register('sidebar-content', (node, rc) => {
    var content = el('div', { class: 'tokui-sidebar__content' });
    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) content.appendChild(child);
    });
    content._slot = content;
    content._tokuiType = 'sidebar-content';
    return content;
  });

  // === Sidebar Footer 侧边栏页脚 ===
  renderer.register('sidebar-footer', (node, rc) => {
    var footer = el('div', { class: 'tokui-sidebar__footer' });
    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) footer.appendChild(child);
    });
    footer._slot = footer;
    footer._tokuiType = 'sidebar-footer';
    return footer;
  });
}

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerLayoutComponents = registerLayoutComponents;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerLayoutComponents };
}
