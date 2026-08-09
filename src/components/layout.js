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
 * modal.confirm 命令式确认对话框（宿主侧 JS API，不经 DSL）。
 * 与 showNotification 同先例：组件模块把全局函数挂到 window.TokUI。
 * TokUI.modal.confirm(opts) / TokUI.confirm(opts) → Promise<boolean>
 * opts: { tt, tx, t('danger'|'primary'), 'ok-text', 'cancel-text', onOk, onCancel }
 */
function mountModalConfirm() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.TokUI = window.TokUI || {};
  if (window.TokUI.modal && window.TokUI.modal.confirm) return;

  function confirmModal(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var doc = document;
      var overlay = doc.createElement('div');
      overlay.className = 'tokui-modal__overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', opts.tt || _t('modal.aria'));

      var panel = doc.createElement('div');
      panel.className = 'tokui-modal__panel';

      var header = doc.createElement('div');
      header.className = 'tokui-modal__header';
      var title = doc.createElement('div');
      title.className = 'tokui-modal__title';
      title.textContent = opts.tt || _t('modal.aria');
      header.appendChild(title);
      panel.appendChild(header);

      if (opts.tx) {
        var body = doc.createElement('div');
        body.className = 'tokui-modal__body';
        body.textContent = opts.tx;
        panel.appendChild(body);
      }

      var footer = doc.createElement('div');
      footer.className = 'tokui-modal__footer';
      var cancelBtn = doc.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'tokui-btn tokui-modal__cancel';
      cancelBtn.textContent = opts['cancel-text'] || _t('common.cancel');
      var okBtn = doc.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'tokui-btn tokui-modal__ok' + (opts.t === 'danger' ? ' tokui-btn--danger' : ' tokui-btn--primary');
      okBtn.textContent = opts['ok-text'] || _t('common.ok');
      footer.appendChild(cancelBtn);
      footer.appendChild(okBtn);
      panel.appendChild(footer);
      overlay.appendChild(panel);

      var settled = false;
      // 焦点管理：记录打开前焦点，关闭还原
      var prevFocus = doc.activeElement || null;
      function cleanup() {
        doc.removeEventListener('keydown', onKey, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (prevFocus && typeof prevFocus.focus === 'function') {
          try { prevFocus.focus(); } catch (_) { /* ignore */ }
        }
      }
      function done(val) {
        if (settled) return;
        settled = true;
        cleanup();
        var cb = val ? opts.onOk : opts.onCancel;
        if (typeof cb === 'function') { try { cb(); } catch (_) {} }
        resolve(val);
      }
      function onKey(e) {
        if (e.key === 'Escape') {
          if (typeof e.stopPropagation === 'function') e.stopPropagation();
          done(false);
        }
        // focus trap：Tab 在取消/确认两钮间循环
        if (e.key === 'Tab') {
          var active = doc.activeElement;
          if (e.shiftKey && active === cancelBtn) {
            e.preventDefault();
            okBtn.focus();
          } else if (!e.shiftKey && active === okBtn) {
            e.preventDefault();
            cancelBtn.focus();
          }
        }
      }
      okBtn.addEventListener('click', function () { done(true); });
      cancelBtn.addEventListener('click', function () { done(false); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) done(false); });
      doc.addEventListener('keydown', onKey, true);

      if (doc.body) doc.body.appendChild(overlay);
      if (typeof okBtn.focus === 'function') okBtn.focus();
    });
  }

  window.TokUI.modal = { confirm: confirmModal };
  if (!window.TokUI.confirm) window.TokUI.confirm = confirmModal;
}

/**
 * 注册布局组件到渲染器
 * @param {TokUIRenderer} renderer - 渲染器实例
 */
function registerLayoutComponents(renderer) {
  const { el } = (typeof require === 'function')
    ? require('../core/renderer')
    : window.TokUI._internal;

  // 命令式确认对话框 API（幂等挂载）
  mountModalConfirm();

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
      // 自定义色值：inline style（fill/pill 同语义色体系浅化：10% 底 + 主色字 + 22% 描边）
      if (hc && ['primary','danger','success','warning','info','dark'].indexOf(hc) === -1) {
        var ht = node.attrs.ht || '';
        // 色值白名单：#hex / rgb()/颜色名，防 color-mix 拼接注入
        var hcSafe = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|[a-zA-Z]+)$/.test(hc) ? hc : '';
        if (ht === 'fill' || ht === 'pill') {
          if (hcSafe) {
            headerEl.style.background = 'color-mix(in srgb, ' + hcSafe + ' 10%, transparent)';
            headerEl.style.color = hcSafe;
            if (ht === 'fill') {
              headerEl.style.borderBottom = '1px solid color-mix(in srgb, ' + hcSafe + ' 22%, transparent)';
            } else {
              headerEl.style.borderColor = 'color-mix(in srgb, ' + hcSafe + ' 22%, transparent)';
            }
          }
        } else if (ht === 'accent') {
          headerEl.style.borderLeftColor = hc;
        } else if (ht === 'underline') {
          headerEl.style.setProperty('--tokui-card-header-underline-color', hc);
        } else if (ht === 'dot') {
          headerEl.style.setProperty('--tokui-card-header-dot-color', hc);
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
    // 盖 id：upd（v 切页）/ del / ins 指令按 id 定位的前提
    if (node.attrs.id) container.id = node.attrs.id;
    const tabId = 'tokui-tab-' + Math.random().toString(36).slice(2, 8);
    // 存储到 DOM 属性，供 tab 子组件读取
    container._tabId = tabId;
    container._tabCount = 0;
    // 交互上报：on:"change:handler" / options.onEvent 统一出口
    var report = renderer.createReporter('tabs', node.attrs, container);

    (node.children || []).forEach((child, idx) => {
      if (child.type !== 'tab') return;
      _appendTabItem(container, child, rc, tabId, idx);
      container._tabCount = idx + 1;
    });

    container._slot = container;
    container._tokuiType = 'tabs';
    // aria 状态同步：激活 tab 的 aria-selected + roving tabindex（点击/键盘/upd 一切切换路径收口于此）
    function _syncTabAria(activeIdx) {
      container.querySelectorAll('.tokui-tabs-label').forEach(function (lb) {
        var isActive = lb.getAttribute('data-index') === String(activeIdx);
        lb.setAttribute('aria-selected', String(isActive));
        lb.setAttribute('tabindex', isActive ? '0' : '-1');
      });
    }
    container._syncTabAria = _syncTabAria;
    // 键盘导航：ArrowLeft/Right 切换 tab
    container.addEventListener('keydown', function(e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var labels = Array.from(container.querySelectorAll('.tokui-tabs-label'));
      var idx = labels.indexOf(e.target);
      if (idx === -1) return;
      e.preventDefault();
      var next = e.key === 'ArrowRight' ? (idx + 1) % labels.length : (idx - 1 + labels.length) % labels.length;
      var radio = container.querySelector('#' + labels[next].getAttribute('for'));
      if (radio) { radio.checked = true; _syncTabAria(next); labels[next].focus(); }
    });
    // 用户切换 tab 时上报 change：radio input 的原生 change 事件冒泡到容器。
    // 程序化切换（_update / _streamCloseHook / 键盘导航的 checked 赋值）不触发原生 change，
    // 天然不会误报——不要手动 dispatch。
    container.addEventListener('change', function(e) {
      var target = e.target;
      if (!target || !target.classList || !target.classList.contains('tokui-tabs-input')) return;
      var index = parseInt(target.getAttribute('data-index'), 10);
      _syncTabAria(index);
      var label = container.querySelector('.tokui-tabs-label[data-index="' + index + '"]');
      report('change', { index: index, title: label ? label.textContent : '' });
    });
    container._update = function(uAttrs) {
      if (uAttrs.v !== undefined) {
        var radio = container.querySelector('input[data-index="' + uAttrs.v + '"]');
        if (radio) { radio.checked = true; _syncTabAria(uAttrs.v); }
      }
    };
    // 流式结束复位：所有 tab 渲染完后默认切回首项（_streamClose 触发，仅流式生效）
    container._streamCloseHook = function () {
      if (!container._tokuiStreamActive) return; // 一次性 render 不复位
      var first = container.querySelector('input[data-index="0"]');
      if (first) { first.checked = true; _syncTabAria(0); }
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
    // a11y：aria-selected + aria-controls 关联 panel；roving tabindex（仅激活项在 Tab 序）
    var labelId = tabId + '-label-' + idx;
    var panelId = tabId + '-panel-' + idx;
    var label = el('label', {
      class: 'tokui-tabs-label', for: tabId + '-' + idx, id: labelId, 'data-index': String(idx), 'data-tokui-tag': 'tab',
      role: 'tab', tabindex: idx === 0 ? '0' : '-1',
      'aria-selected': idx === 0 ? 'true' : 'false', 'aria-controls': panelId
    }, tabNode.attrs.tt || ('Tab ' + (idx + 1)));
    container.appendChild(label);

    // panel 内容区
    var panel = el('div', { class: 'tokui-tabs-panel', role: 'tabpanel', id: panelId, 'data-index': String(idx), 'aria-labelledby': labelId });
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
    // 交互上报：原生 <dialog> 的 close 事件覆盖全部用户关闭路径
    //（关闭按钮 / 点击背板 dialog.close() / Esc）；
    // _update act:close 的程序化关闭置静默标记跳过上报（防「upd → 回报 → 再 upd」回环）
    var report = renderer.createReporter('dialog', node.attrs, dialog);
    dialog.addEventListener('close', function () {
      if (dialog._tokuiSilentClose) { dialog._tokuiSilentClose = false; return; }
      report('close', {});
    });
    if (node.attrs.tt) {
      var header = el('div', { class: 'tokui-dialog-header' });
      var titleSpan = el('span', {}, node.attrs.tt);
      // accessible name：标题关联 aria-labelledby（无标题时退回 aria-label）
      var dlgTitleId = 'tokui-dlg-title-' + Math.random().toString(36).slice(2, 8);
      titleSpan.id = dlgTitleId;
      dialog.setAttribute('aria-labelledby', dlgTitleId);
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
      else if (uAttrs.act === 'close') {
        // 程序化关闭：置静默标记，close 事件监听器跳过上报（与用户主动关闭区分）
        dialog._tokuiSilentClose = true;
        dialog.close();
      }
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

    // 交互上报 + 统一关闭入口：overlay 点击 / close 按钮 / Escape 三条用户路径经 closeDrawer() 上报；
    // _update act:close 走 closeDrawer(true)（程序化关闭不上报，防「服务端 upd → 前端回报 → 再 upd」回环）
    var report = renderer.createReporter('drawer', node.attrs, wrapper);
    function closeDrawer(silent) {
      if (!silent) report('close', {});
      wrapper.classList.remove('tokui-drawer--open');
      // 焦点管理：关闭还焦到打开前元素
      var prev = wrapper._prevFocus;
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus(); } catch (_) { /* ignore */ }
      }
      wrapper._prevFocus = null;
    }
    // 打开：记录触发焦点并移入抽屉（Esc 监听在 wrapper，焦点须在内部才生效）
    function openDrawer() {
      wrapper._prevFocus = (typeof document !== 'undefined' && document.activeElement) || null;
      wrapper.classList.add('tokui-drawer--open');
      var closeBtnEl = wrapper.querySelector('.tokui-drawer__close');
      var target = closeBtnEl || panel;
      if (!closeBtnEl && !panel.getAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
      if (target && typeof target.focus === 'function') {
        try { target.focus(); } catch (_) { /* ignore */ }
      }
    }

    var overlay = el('div', { class: 'tokui-drawer__overlay' });
    overlay.addEventListener('click', function () {
      closeDrawer();
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
      var drawerTitle = el('span', {}, node.attrs.tt);
      // accessible name：标题关联 aria-labelledby
      var drawerTitleId = 'tokui-drawer-title-' + Math.random().toString(36).slice(2, 8);
      drawerTitle.id = drawerTitleId;
      wrapper.setAttribute('aria-labelledby', drawerTitleId);
      header.appendChild(drawerTitle);
      var closeBtn = el('button', { class: 'tokui-drawer__close', 'aria-label': _t('common.close') }, '✕');
      closeBtn.addEventListener('click', function () {
        closeDrawer();
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
    // Escape 关闭 + focus trap（焦点循环在 panel 内）
    wrapper.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { closeDrawer(); e.stopPropagation(); }
      if (e.key === 'Tab' && wrapper.classList.contains('tokui-drawer--open')) {
        var focusables = panel.querySelectorAll('button, [tabindex], input, select, textarea, a[href]');
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        var active = typeof document !== 'undefined' ? document.activeElement : null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    wrapper._update = function (uAttrs) {
      if (uAttrs.act === 'open') openDrawer();
      else if (uAttrs.act === 'close') closeDrawer(true);
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
        // cloneNode 不可用（Node 测试 mock）时退化为直接加监听
        if (typeof imgEl.cloneNode !== 'function' || !imgEl.parentNode) {
          imgEl.style.cursor = 'pointer';
          imgEl.addEventListener('click', function () {
            const { getLightbox } = (typeof require === 'function')
              ? require('./lightbox')
              : window.TokUI._internal;
            const lb = getLightbox(typeof document !== 'undefined' ? document : undefined);
            lb.open(imgEl.getAttribute('src'), srcList);
          });
          return;
        }
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
        // 键盘可达：clone 丢监听，补回 tabindex + Enter/Space 开灯箱
        if (!cloned.getAttribute('tabindex')) cloned.setAttribute('tabindex', '0');
        if (!cloned.getAttribute('role')) cloned.setAttribute('role', 'button');
        cloned.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const { getLightbox } = (typeof require === 'function')
              ? require('./lightbox')
              : window.TokUI._internal;
            const lb = getLightbox(typeof document !== 'undefined' ? document : undefined);
            lb.open(cloned.getAttribute('src'), srcList);
          }
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

  // === Preview Group 图片预览组（容器）===
  // 子节点为 img；点击任意图打开灯箱并带入整组 src 列表（左右切换/缩放/旋转/计数由 lightbox 提供）
  // 与 imgs 的差别：imgs 是九宫格简写布局，preview-group 是显式「一组图共享预览会话」语义。
  renderer.register('preview-group', (node, rc) => {
    var attrs = node.attrs || {};
    var container = el('div', { class: 'tokui-preview-group', role: 'group', 'aria-label': _t('previewGroup.aria') });
    if (attrs.id) container.id = attrs.id;
    var rendered = rc(node.children || []);
    rendered.forEach(function (child) { if (child && child.nodeType) container.appendChild(child); });
    container._slot = container;
    container._tokuiType = 'preview-group';

    // 绑定组内所有 img：整组 src 列表 + 点击开灯箱
    function bindGroup(parent) {
      var imgEls = parent.querySelectorAll('.tokui-img');
      var srcList = [];
      imgEls.forEach(function (im) { var s = im.getAttribute('src'); if (s) srcList.push(s); });
      imgEls.forEach(function (imgEl) {
        if (imgEl._pgBound) return;
        imgEl._pgBound = true;
        var target = imgEl;
        // clone 替换以摘除 img 自带的单图灯箱绑定；cloneNode 不可用（Node 测试）则直接加监听
        if (typeof imgEl.cloneNode === 'function' && imgEl.parentNode) {
          target = imgEl.cloneNode(true);
          target._pgBound = true;
          imgEl.parentNode.replaceChild(target, imgEl);
        }
        target.style.cursor = 'zoom-in';
        // 键盘可达：clone 丢监听，补 tabindex/role + Enter/Space
        if (!target.getAttribute('tabindex')) target.setAttribute('tabindex', '0');
        if (!target.getAttribute('role')) target.setAttribute('role', 'button');
        function _openGroup() {
          var getLightbox = (typeof require === 'function')
            ? require('./lightbox').getLightbox
            : window.TokUI._internal.getLightbox;
          var lb = getLightbox(typeof document !== 'undefined' ? document : undefined);
          // 点击时按当前 DOM 惰性收集（流式后到的图也进列表）
          var cur = [];
          container.querySelectorAll('.tokui-img').forEach(function (im) {
            var s = im.getAttribute('src');
            if (s) cur.push(s);
          });
          lb.open(target.getAttribute('src'), cur.length ? cur : srcList);
        }
        target.addEventListener('click', _openGroup);
        target.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            _openGroup();
          }
        });
      });
    }

    bindGroup(container);
    // 流式：子图逐个到达，close 时按实际 DOM 重收列表重绑
    container._streamCloseHook = function () { bindGroup(container); };
    return container;
  });

  // === Tour 漫游引导（容器）===
  // 子节点为 tour-step 标记（不可见）；attrs.open = 挂载后自动开启, attrs.mask = 遮罩（默认开）
  // 事件：change(切步) / finish(完成) / close(跳过或✕关闭)；upd act:open/close/goto v:步号
  renderer.register('tour', (node, rc) => {
    var attrs = node.attrs || {};
    var root = el('div', { class: 'tokui-tour' });
    if (attrs.id) root.id = attrs.id;
    rc(node.children || []).forEach(function (c) { if (c && c.nodeType) root.appendChild(c); });
    root._slot = root;
    root._tokuiType = 'tour';
    root._report = renderer.createReporter('tour', attrs, root);
    // mask 默认开；显式 mask:false 关闭
    root._tourMask = attrs.mask !== 'false';

    // 收集步骤标记（.tokui-tour-step 由 tour-step 渲染，随流式追加）
    root._collectSteps = function () {
      var steps = [];
      root.querySelectorAll('.tokui-tour-step').forEach(function (m) {
        steps.push({
          tgt: m.getAttribute('data-tgt') || '',
          tt: m.getAttribute('data-tt') || '',
          tx: m.getAttribute('data-tx') || '',
          pos: m.getAttribute('data-pos') || 'bottom'
        });
      });
      return steps;
    };

    var layer = null;
    var current = 0;
    var doc = typeof document !== 'undefined' ? document : null;

    function _findTarget(tgt) {
      if (!tgt || !doc || typeof doc.getElementById !== 'function') return null;
      return doc.getElementById(String(tgt).replace(/^#/, ''));
    }

    // 面板定位：贴目标边（pos 四向 + 8px 间距 + 视口 8px 边界修正）；无目标 → 视口居中
    function _positionPanel(panel, highlight, step) {
      var target = _findTarget(step.tgt);
      if (!target || typeof target.getBoundingClientRect !== 'function' ||
          typeof panel.getBoundingClientRect !== 'function' || typeof window === 'undefined') {
        highlight.style.display = 'none';
        panel.style.left = '50%';
        panel.style.top = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        return;
      }
      panel.style.transform = '';
      var rect = target.getBoundingClientRect();
      highlight.style.display = '';
      highlight.style.left = (rect.left - 4) + 'px';
      highlight.style.top = (rect.top - 4) + 'px';
      highlight.style.width = (rect.width + 8) + 'px';
      highlight.style.height = (rect.height + 8) + 'px';
      var pw = panel.offsetWidth || 280;
      var ph = panel.offsetHeight || 120;
      var vw = window.innerWidth || 1024;
      var vh = window.innerHeight || 768;
      var left = rect.left;
      var top = rect.bottom + 8;
      if (step.pos === 'top') { top = rect.top - ph - 8; }
      else if (step.pos === 'left') { left = rect.left - pw - 8; top = rect.top; }
      else if (step.pos === 'right') { left = rect.right + 8; top = rect.top; }
      left = Math.max(8, Math.min(left, vw - pw - 8));
      top = Math.max(8, Math.min(top, vh - ph - 8));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
    }

    function _showStep(idx, silent) {
      var steps = root._collectSteps();
      if (!layer || steps.length === 0) return;
      current = Math.max(0, Math.min(idx, steps.length - 1));
      var step = steps[current];
      var titleEl = layer.querySelector('.tokui-tour__title');
      var bodyEl = layer.querySelector('.tokui-tour__body');
      var counterEl = layer.querySelector('.tokui-tour__counter');
      var prevBtn = layer.querySelector('.tokui-tour__prev');
      var nextBtn = layer.querySelector('.tokui-tour__next');
      var highlight = layer.querySelector('.tokui-tour__highlight');
      var panel = layer.querySelector('.tokui-tour__panel');
      if (titleEl) titleEl.textContent = step.tt;
      if (bodyEl) bodyEl.textContent = step.tx;
      if (counterEl) counterEl.textContent = _t('tour.stepCounter', { cur: current + 1, total: steps.length });
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.textContent = current === steps.length - 1 ? _t('tour.finish') : _t('tour.next');
      _positionPanel(panel, highlight, step);
      if (!silent) root._report('change', { index: current, target: step.tgt || undefined });
    }

    function _closeTour(reason, silent) {
      if (!layer) return;
      if (doc) doc.removeEventListener('keydown', _onKey, true);
      if (layer.parentNode) layer.parentNode.removeChild(layer);
      layer = null;
      // 焦点管理：关闭还焦到打开前元素
      var prev = root._tourPrevFocus;
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus(); } catch (_) { /* ignore */ }
      }
      root._tourPrevFocus = null;
      if (!silent) root._report(reason === 'finish' ? 'finish' : 'close', { index: current });
    }

    function _onKey(e) {
      if (!layer) return;
      if (e.key === 'Escape') _closeTour('close', false);
      else if (e.key === 'ArrowRight') _showStep(current + 1, false);
      else if (e.key === 'ArrowLeft') _showStep(current - 1, false);
      else if (e.key === 'Tab') {
        // focus trap：面板按钮间循环
        var focusables = layer.querySelectorAll('.tokui-tour__panel button');
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        var active = doc ? doc.activeElement : null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function _openTour(startIdx, silent) {
      var steps = root._collectSteps();
      if (!doc || !doc.body || steps.length === 0) return;
      _closeTour('close', true); // 幂等：重开先清旧层
      layer = el('div', { class: 'tokui-tour__layer', role: 'dialog', 'aria-modal': 'true', 'aria-label': _t('tour.aria') });
      var highlight = el('div', { class: 'tokui-tour__highlight' + (root._tourMask ? ' tokui-tour__highlight--mask' : '') });
      var panel = el('div', { class: 'tokui-tour__panel' });
      var header = el('div', { class: 'tokui-tour__header' });
      header.appendChild(el('span', { class: 'tokui-tour__title' }));
      header.appendChild(el('span', { class: 'tokui-tour__counter' }));
      var closeBtn = el('button', { class: 'tokui-tour__close', type: 'button', 'aria-label': _t('common.close') }, '×');
      header.appendChild(closeBtn);
      panel.appendChild(header);
      panel.appendChild(el('div', { class: 'tokui-tour__body' }));
      var footer = el('div', { class: 'tokui-tour__footer' });
      var skipBtn = el('button', { class: 'tokui-tour__skip', type: 'button' }, _t('tour.skip'));
      var prevBtn = el('button', { class: 'tokui-tour__prev', type: 'button' }, _t('tour.prev'));
      var nextBtn = el('button', { class: 'tokui-tour__next', type: 'button' }, _t('tour.next'));
      footer.appendChild(skipBtn);
      footer.appendChild(prevBtn);
      footer.appendChild(nextBtn);
      panel.appendChild(footer);
      layer.appendChild(highlight);
      layer.appendChild(panel);
      closeBtn.addEventListener('click', function () { _closeTour('close', false); });
      skipBtn.addEventListener('click', function () { _closeTour('close', false); });
      prevBtn.addEventListener('click', function () { _showStep(current - 1, false); });
      nextBtn.addEventListener('click', function () {
        var steps2 = root._collectSteps();
        if (current >= steps2.length - 1) _closeTour('finish', false);
        else _showStep(current + 1, false);
      });
      doc.addEventListener('keydown', _onKey, true);
      doc.body.appendChild(layer);
      _showStep(startIdx || 0, silent);
      // 焦点管理：记录触发焦点并移入面板（键盘用户立即处于面板上下文）
      root._tourPrevFocus = doc.activeElement || null;
      if (typeof nextBtn.focus === 'function') {
        try { nextBtn.focus(); } catch (_) { /* ignore */ }
      }
    }

    // upd 契约：act:open（v 可选起始步）/ act:goto v:N / act:close —— 程序化全部 silent 防回环
    root._update = function (uAttrs) {
      if (uAttrs.act === 'open') _openTour(uAttrs.v !== undefined ? parseInt(uAttrs.v) || 0 : 0, true);
      else if (uAttrs.act === 'goto' && uAttrs.v !== undefined) _showStep(parseInt(uAttrs.v) || 0, true);
      else if (uAttrs.act === 'close') _closeTour('close', true);
    };

    // open 属性：容器闭合（流式末步到达 / 一次性挂载）后自动开启
    if (attrs.open !== undefined) {
      root._streamCloseHook = function () {
        if (!layer) _openTour(0, true);
      };
    }

    return root;
  });

  // === Tour Step 引导步骤（自闭合标记，不可见）===
  // attrs.tgt = 目标元素 id（可带 #）, attrs.tt = 步骤标题, attrs.tx = 步骤说明（或正文）, attrs.pos = 面板方位(top/bottom/left/right)
  renderer.register('tour-step', (node) => {
    var a = node.attrs || {};
    var marker = el('span', { class: 'tokui-tour-step' });
    if (a.tgt) marker.setAttribute('data-tgt', String(a.tgt).replace(/^#/, ''));
    if (a.tt) marker.setAttribute('data-tt', a.tt);
    marker.setAttribute('data-tx', a.tx || node.content || '');
    if (a.pos) marker.setAttribute('data-pos', a.pos);
    return marker;
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

    // 交互上报：声明 on 时给容器加 clickable 类（样式由 CSS 侧补充，此处只加类名逻辑）
    const report = renderer.createReporter('steps', attrs, wrapper);
    if (attrs.on) wrapper.classList.add('tokui-steps--clickable');

    // 点击某个 step 时上报 change：事件委托在容器上，保持 step 的 DOM 结构不变（不改成 button）
    function _fireStepChange(stepEl) {
      const stepEls = wrapper.querySelectorAll('.tokui-step');
      const index = Array.prototype.indexOf.call(stepEls, stepEl);
      if (index === -1) return;
      const titleEl = stepEl.querySelector('.tokui-step__title');
      report('change', { index: index, title: titleEl ? titleEl.textContent : '' });
    }
    wrapper.addEventListener('click', function (e) {
      const stepEl = e.target && e.target.closest ? e.target.closest('.tokui-step') : null;
      if (!stepEl) return;
      _fireStepChange(stepEl);
    });
    // 键盘可达（仅交互模式）：Enter/Space 触发同一 change
    wrapper.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const stepEl = e.target && e.target.closest ? e.target.closest('.tokui-step') : null;
      if (!stepEl) return;
      e.preventDefault();
      _fireStepChange(stepEl);
    });

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
      // 交互模式：step 可聚焦 + button 语义（keydown 委托在容器）
      if (attrs.on) {
        stepEl.setAttribute('tabindex', '0');
        stepEl.setAttribute('role', 'button');
      }
      // 当前步骤语义标记
      if (stepClasses.indexOf('tokui-step--active') !== -1) stepEl.setAttribute('aria-current', 'step');
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
        // aria-current 与激活态同步
        if (stepEl.classList.contains('tokui-step--active')) stepEl.setAttribute('aria-current', 'step');
        else stepEl.removeAttribute('aria-current');
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
  // observer 回调 rAF 合帧：流式逐 item 到达一帧多次变化只测一次（无 rAF 同步兜底，与项目降级一致）。
  function _watchDescRows(wrapper) {
    _markDescLastRow(wrapper); // 同步首次：计数法兜底，渲染返回时即可正确（不等布局）
    if (typeof MutationObserver === 'undefined') return;
    var markScheduled = false;
    function scheduleMark() {
      if (markScheduled) return;
      markScheduled = true;
      var run = (typeof requestAnimationFrame === 'function')
        ? requestAnimationFrame
        : function (fn) { fn(); };
      run(function () {
        markScheduled = false;
        if (wrapper.isConnected) _markDescLastRow(wrapper);
      });
    }
    var obs = new MutationObserver(function () {
      if (!wrapper.isConnected) { obs.disconnect(); return; }
      scheduleMark();
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

    // 交互上报：用户切换幻灯（指示点/箭头/键盘/拖动）经 report 收口，自动轮播不报
    var report = renderer.createReporter('carousel', attrs, wrapper);

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
            if (di === currentIndex) {
              d.classList.add('tokui-carousel__dot--active');
              d.setAttribute('aria-current', 'true');
            } else {
              d.classList.remove('tokui-carousel__dot--active');
              d.removeAttribute('aria-current');
            }
          });
        }
        if (thumbEls.forEach) {
          thumbEls.forEach(function(t, ti) {
            if (ti === currentIndex) {
              t.classList.add('tokui-carousel__thumb--active');
              t.setAttribute('aria-current', 'true');
              // active 缩略图滚入可视区
              if (t.scrollIntoView) {
                t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
              }
            } else {
              t.classList.remove('tokui-carousel__thumb--active');
              t.removeAttribute('aria-current');
            }
          });
        }
      }

      function goTo(index, fromUser) {
        if (index < 0) index = slideEls.length - 1;
        if (index >= slideEls.length) index = 0;
        currentIndex = index;
        track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
        setActive();
        // 仅用户交互路径上报；自动轮播（程序化语义）不传 fromUser，不上报
        if (fromUser) report('change', { index: currentIndex });
      }

      prevBtn.addEventListener('click', function() {
        goTo(currentIndex - 1, true);
        resetAuto();
      });
      nextBtn.addEventListener('click', function() {
        goTo(currentIndex + 1, true);
        resetAuto();
      });
      if (dots) {
        dots.addEventListener('click', function(e) {
          var dot = e.target.closest('.tokui-carousel__dot');
          if (!dot) return;
          goTo(parseInt(dot.getAttribute('data-index')), true);
          resetAuto();
        });
      }
      if (thumbs) {
        thumbs.addEventListener('click', function(e) {
          var thumb = e.target.closest('.tokui-carousel__thumb');
          if (!thumb) return;
          goTo(parseInt(thumb.getAttribute('data-index')), true);
          resetAuto();
        });
      }

      function startAuto() {
        if (autoInterval) return; // 幂等：防 mouseleave/focusout 重复建
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
      function stopAuto() {
        if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
      }

      startAuto();

      // 自动播放可暂停（WCAG 2.2.2）：hover/聚焦时停，离开恢复
      wrapper.addEventListener('mouseenter', stopAuto);
      wrapper.addEventListener('mouseleave', startAuto);
      wrapper.addEventListener('focusin', stopAuto);
      wrapper.addEventListener('focusout', startAuto);

      // 键盘导航（可聚焦容器带 region 语义与名称，AT 聚焦时可播报）
      wrapper.setAttribute('tabindex', '0');
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-roledescription', 'carousel');
      wrapper.setAttribute('aria-label', _t('carousel.aria'));
      wrapper.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') { goTo(currentIndex - 1, true); resetAuto(); }
        else if (e.key === 'ArrowRight') { goTo(currentIndex + 1, true); resetAuto(); }
      });

      // 拖动/滑动切换
      var dragStartX = 0;
      var dragDelta = 0;
      var dragWidth = 0;   // 拖拽起点缓存的 wrapper 宽（拖拽全程恒定，move 不再读 offsetWidth）
      var isDragging = false;
      var moveRaf = 0;     // rAF 合帧：多次 mousemove 合并为每帧一次 transform 写
      var pendingX = null;
      var dragRaf = (typeof window !== 'undefined' && window.requestAnimationFrame)
        ? function(cb) { window.requestAnimationFrame(cb); }
        : function(cb) { cb(); }; // 无 rAF 环境同步兜底（与项目既有降级一致）

      function applyMove(clientX) {
        dragDelta = clientX - dragStartX;
        var offset = -(currentIndex * dragWidth) + dragDelta;
        track.style.transform = 'translateX(' + offset + 'px)';
      }
      function onDragStart(clientX) {
        isDragging = true;
        dragStartX = clientX;
        dragDelta = 0;
        pendingX = null;
        dragWidth = wrapper.offsetWidth; // 每次拖拽开始读一次（resize 后首次拖拽自然刷新）
        track.style.transition = 'none';
        resetAuto();
      }
      track.addEventListener('mousedown', function(e) { onDragStart(e.clientX); });
      track.addEventListener('touchstart', function(e) { onDragStart(e.touches[0].clientX); }, { passive: true });

      function onMove(clientX) {
        if (!isDragging) return;
        pendingX = clientX;
        if (moveRaf) return;
        moveRaf = 1;
        dragRaf(function() {
          moveRaf = 0;
          if (isDragging && pendingX !== null) applyMove(pendingX);
        });
      }
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('mousemove', function(e) { onMove(e.clientX); });
        document.addEventListener('touchmove', function(e) { onMove(e.touches[0].clientX); }, { passive: true });
      }

      function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        // flush：rAF 未执行的末帧位移先补上（dragDelta 是阈值判定依据，最终位移与现状一致）
        if (pendingX !== null) { applyMove(pendingX); pendingX = null; }
        track.style.transition = '';
        var threshold = dragWidth * 0.2;
        if (dragDelta < -threshold) {
          goTo(currentIndex + 1, true);
        } else if (dragDelta > threshold) {
          goTo(currentIndex - 1, true);
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
  // attrs: v(值), tx(显示文本), open(默认展开), leaf(叶节点), chk(选中), dis(禁用),
  //        load(懒加载数据 handler 名：无子节点且带 load 时渲染为可展开态，
  //             首次展开调 handler 取子节点，见 tree 组件的懒加载逻辑)
  renderer.register('tn', (node, rc) => {
    var isLeaf = node.attrs.leaf !== undefined;
    var isOpen = node.attrs.open !== undefined;
    var isDisabled = node.attrs.dis !== undefined;
    // 懒加载：无静态子节点且声明了 load handler
    var lazyLoadName = (node.attrs.load && !(node.children && node.children.length))
      ? String(node.attrs.load) : null;

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
    if (node.attrs.id) nodeEl.setAttribute('data-id', node.attrs.id);

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
    // 懒加载状态挂在 DOM 节点上，由 tree 的展开逻辑消费
    if (lazyLoadName) {
      nodeEl._lazyLoad = lazyLoadName; // 数据 handler 名
      nodeEl._lazyLoaded = false;      // 已加载标记（加载成功后不再重复请求）
      nodeEl._lazyLoading = false;     // 加载中标记（防并发重复请求）
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

    // 交互上报：节点选中（change）/ 复选选中态变化（check）经 report 收口
    var report = renderer.createReporter('tree', node.attrs, field);

    // 是否已绑定过事件
    var behaviorBound = false;

    // 复选框模式下给（懒加载）新挂载的节点头补插 checkbox
    function injectCheckbox(nodeEl) {
      if (!isChkMode) return;
      var header = nodeEl.querySelector(':scope > .tokui-tree-node-header');
      if (!header || header.querySelector('.tokui-tree-checkbox')) return;
      var cb = el('input', { type: 'checkbox', class: 'tokui-tree-checkbox' });
      if (nodeEl.classList.contains('tokui-tree-node--disabled')) cb.disabled = true;
      header.insertBefore(cb, header.firstChild);
    }

    // tn 懒加载：首次展开无子节点且带 load 的节点时请求子数据。
    // handler 签名：fn({id, value}) → 节点对象数组 或 Promise<节点对象数组>，
    // 形如 [{type:'tn', attrs:{tt:'子'}, children:[...]}]；返回非数组按空处理。
    function maybeLazyLoad(nodeEl, children) {
      var loadName = nodeEl._lazyLoad;
      if (!loadName || nodeEl._lazyLoaded || nodeEl._lazyLoading) return;
      var handler = renderer.eventBus ? renderer.eventBus.getHandler(loadName) : null;
      if (!handler) {
        renderer._warnMissingHandler(loadName);
        return;
      }
      nodeEl._lazyLoading = true;
      nodeEl.classList.add('tokui-tree__loading');
      var loadingEl = el('div', { class: 'tokui-tree-loading' }, _t('common.loading'));
      children.appendChild(loadingEl);

      var finish = function(childNodes) {
        nodeEl._lazyLoading = false;
        nodeEl._lazyLoaded = true; // 标记已加载：再折叠/展开不重复请求
        nodeEl.classList.remove('tokui-tree__loading');
        if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
        var list = Array.isArray(childNodes) ? childNodes : [];
        var count = 0;
        list.forEach(function(childNode) {
          if (!childNode || typeof childNode !== 'object') return;
          var dom = renderer.render(childNode, 'tree');
          if (dom && dom.nodeType) {
            injectCheckbox(dom);
            children.appendChild(dom);
            count++;
          }
        });
        report('load', { value: nodeEl.getAttribute('data-value'), count: count });
      };

      var result;
      try {
        result = handler({
          id: nodeEl.getAttribute('data-id') || undefined,
          value: nodeEl.getAttribute('data-value')
        });
      } catch (e) {
        result = []; // handler 抛错按空数据处理
      }
      if (result && typeof result.then === 'function') {
        result.then(finish, function() { finish([]); });
      } else {
        finish(result);
      }
    }

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
          nodeEl.setAttribute('aria-expanded', 'false'); // 折叠同步
          children.style.display = 'none';
        } else {
          nodeEl.classList.add('tokui-tree-node--open');
          nodeEl.setAttribute('aria-expanded', 'true'); // 展开同步
          children.style.display = '';
          maybeLazyLoad(nodeEl, children);
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
          n.removeAttribute('aria-selected');
        });
        nodeEl.classList.add('tokui-tree-node--selected');
        nodeEl.setAttribute('aria-selected', 'true');

        if (node.attrs.clk) {
          var handler = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal && window.TokUI._internal.TokUIEventBus)
            ? window.TokUI._internal.TokUIEventBus.getHandler(node.attrs.clk) : null;
          if (handler) handler({
            id: node.attrs.id,
            value: nodeEl.getAttribute('data-value'),
            text: nodeEl.getAttribute('data-text')
          });
        }
        report('change', {
          value: nodeEl.getAttribute('data-value'),
          id: nodeEl.getAttribute('data-id') || undefined
        });
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
          // 上报当前所有选中节点的 value 数组（级联与父框回写完成后取终态）
          var checkedValues = [];
          Array.prototype.forEach.call(tree.querySelectorAll('.tokui-tree-checkbox'), function(cb) {
            if (cb.checked) {
              var cbNode = cb.closest('.tokui-tree-node');
              if (cbNode) checkedValues.push(cbNode.getAttribute('data-value'));
            }
          });
          report('check', { value: checkedValues });
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
    // v 走 VARIANTS 白名单统一挂类（horizontal/inline；vertical 默认无类）。
    // 历史别名 h 归一为 horizontal 交白名单识别。
    if (attrs.v === 'h') attrs.v = 'horizontal';
    var classes = ['tokui-menu'];

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

    // 交互上报：激活项变化时 report('change', { value: 项标识 })
    var report = renderer.createReporter('menu', attrs, menu);
    menu._report = report;

    // 程序化激活：[upd id:xxx act:activate v:项标识]，复用同一激活函数（silent：不重复上报）
    menu._update = function (uAttrs) {
      if (uAttrs.act !== 'activate' || uAttrs.v === undefined) return;
      var items = menu.querySelectorAll('.tokui-menu__item');
      for (var i = 0; i < items.length; i++) {
        if (_menuItemValue(items[i]) === String(uAttrs.v)) { _setMenuItemActive(items[i], true); break; }
      }
    };

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

  // 取菜单项标识：构建时记录的 id 属性，无则 v，再退文本
  function _menuItemValue(itemEl) {
    if (itemEl._menuValue !== undefined) return itemEl._menuValue;
    var textEl = itemEl.querySelector('.tokui-menu__text');
    return textEl ? textEl.textContent : itemEl.textContent;
  }

  // 激活指定菜单项：切换激活 class（用户点击与程序化 activate 共用）；silent 为 true 时不上报 change
  function _setMenuItemActive(itemEl, silent) {
    var menu = itemEl.closest('.tokui-menu');
    if (menu) {
      menu.querySelectorAll('.tokui-menu__item--active').forEach(function(el) {
        el.classList.remove('tokui-menu__item--active');
        el.removeAttribute('aria-current');
      });
    }
    itemEl.classList.add('tokui-menu__item--active');
    itemEl.setAttribute('aria-current', 'true');
    if (!silent && menu && menu._report) {
      menu._report('change', { value: _menuItemValue(itemEl) });
    }
  }

  function _buildMenuItem(childNode, activeClk) {
    var itemAttrs = childNode.attrs || {};
    var itemClasses = ['tokui-menu__item'];
    var isDisabled = itemAttrs.dis !== undefined;
    if (isDisabled) itemClasses.push('tokui-menu__item--disabled');
    if (activeClk && itemAttrs.clk === activeClk) itemClasses.push('tokui-menu__item--active');

    // 禁用项出 Tab 序 + aria-disabled；激活项 aria-current
    var elAttrs = { class: itemClasses.join(' '), role: 'menuitem', tabindex: isDisabled ? '-1' : '0' };
    if (isDisabled) elAttrs['aria-disabled'] = 'true';
    if (activeClk && itemAttrs.clk === activeClk) elAttrs['aria-current'] = 'true';
    var itemEl = el('div', elAttrs);
    itemEl._tokuiKeySelf = true; // 键盘分发由 menu 容器统一处理（↑↓/Enter），renderer 通用兜底跳过

    // 图标
    if (itemAttrs.i) {
      var icon = el('span', { class: 'tokui-menu__icon' }, itemAttrs.i);
      itemEl.appendChild(icon);
    }

    // 文字
    var text = el('span', { class: 'tokui-menu__text' }, itemAttrs.tx || childNode.content || '');
    itemEl.appendChild(text);

    // 记录菜单项标识（id > v > 文本），供激活上报与程序化 activate 匹配
    itemEl._menuValue = itemAttrs.id || itemAttrs.v || itemAttrs.tx || childNode.content || '';

    // 点击事件：clk 仅决定是否盖事件印章；激活切换 + change 上报始终绑定（禁用项除外）
    if (itemAttrs.dis === undefined) {
      if (itemAttrs.clk) itemEl.setAttribute('data-tokui-clk', itemAttrs.clk);
      itemEl.addEventListener('click', function() {
        // 更新激活状态并上报 change
        _setMenuItemActive(itemEl);
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
    var isDisabled = attrs.dis !== undefined;
    if (isDisabled) itemClasses.push('tokui-menu__item--disabled');
    if (attrs.act !== undefined) itemClasses.push('tokui-menu__item--active');

    // 禁用项出 Tab 序 + aria-disabled；激活项 aria-current
    var elAttrs = { class: itemClasses.join(' '), role: 'menuitem', tabindex: isDisabled ? '-1' : '0' };
    if (isDisabled) elAttrs['aria-disabled'] = 'true';
    if (attrs.act !== undefined) elAttrs['aria-current'] = 'true';
    var itemEl = el('div', elAttrs);
    itemEl._tokuiKeySelf = true; // 键盘分发由 menu 容器统一处理，renderer 通用兜底跳过

    if (attrs.i) {
      itemEl.appendChild(el('span', { class: 'tokui-menu__icon' }, attrs.i));
    }
    itemEl.appendChild(el('span', { class: 'tokui-menu__text' }, attrs.tx || node.content || ''));

    // 记录菜单项标识（id > v > 文本），供激活上报与程序化 activate 匹配
    itemEl._menuValue = attrs.id || attrs.v || attrs.tx || node.content || '';

    // 点击事件：clk 仅决定是否盖事件印章；激活切换 + change 上报始终绑定（禁用项除外）
    if (attrs.dis === undefined) {
      if (attrs.clk) itemEl.setAttribute('data-tokui-clk', attrs.clk);
      itemEl.addEventListener('click', function() {
        // 更新激活状态并上报 change
        _setMenuItemActive(itemEl);
      });
    }

    return itemEl;
  });

  // === Anchor 锚点导航（双模式）===
  // 简写（原子自闭合）：[anchor opt:"s1:第一章;s2:第二章" on:"change:h"]
  // 容器（支持层级）：[anchor][lk h:s1 tx:第一章][lk h:s1-1 tx:1.1 小节 d:1][lk h:s2 tx:第二章][/anchor]
  // attrs.top = scroll-spy 激活偏移(px，缺省 12)；变体 horizontal（横向模式）
  // 点击平滑滚动到目标，滚动时自动高亮最近过顶项（spy offset 内）
  renderer.register('anchor', (node, rc) => {
    var attrs = node.attrs || {};
    var nav = el('nav', { class: 'tokui-anchor', 'aria-label': _t('anchor.aria') });
    if (attrs.id) nav.id = attrs.id;
    nav._anchorOffset = parseInt(attrs.top) || 12;
    var report = renderer.createReporter('anchor', attrs, nav);
    nav._report = report;

    // opt 简写子项（平铺，depth 0）
    _parseAnchorOpt(attrs.opt).forEach(function (it) {
      nav.appendChild(_buildAnchorItem(nav, it.v, it.tx, 0));
    });
    // 容器模式 lk 子节点（一次性渲染；流式经 slot 追加，lk 自绑 closest(nav)）
    rc(node.children || []).forEach(function (c) {
      if (c && c.nodeType) nav.appendChild(c);
    });
    nav._slot = nav;
    nav._tokuiType = 'anchor';

    // 初始高亮首项（流式 close 时再兜底一次）
    function activateFirst() {
      if (nav.querySelector('.tokui-anchor__item--active')) return;
      var first = nav.querySelector('.tokui-anchor__item');
      if (first) {
        first.classList.add('tokui-anchor__item--active');
        first.setAttribute('aria-current', 'true');
      }
    }
    activateFirst();
    nav._streamCloseHook = activateFirst;

    // upd v:目标id → 程序化高亮（silent 不上报，防回环）
    nav._update = function (uAttrs) {
      if (uAttrs.v === undefined) return;
      var target = String(uAttrs.v).replace(/^#/, '');
      var nodes = nav.querySelectorAll('.tokui-anchor__item');
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i]._anchorValue === target) {
          _setAnchorActive(nav, nodes[i], true);
          nav._spySuppressUntil = Date.now() + 900;
          break;
        }
      }
    };

    // scroll-spy：capture 监听 window（scroll 不冒泡，捕获阶段才能收到嵌套容器滚动）；
    // 惰性探测可滚动祖先（渲染期内容常未撑高探测不到 → 每次 spy 重探直到命中）
    if (typeof window !== 'undefined') {
      var raf = window.requestAnimationFrame || function (fn) { return fn(); };
      raf(function () {
        var scrollEl = null;
        function detectScrollEl() {
          var parent = nav.parentElement;
          while (parent) {
            if (typeof getComputedStyle === 'function') {
              var style = getComputedStyle(parent);
              if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
                return parent;
              }
            }
            parent = parent.parentElement;
          }
          return null;
        }
        var spy = function () {
          // 点击/程序化激活后的抑制窗内不覆盖用户选择（平滑滚动途中位置未到位）
          if (nav._spySuppressUntil && Date.now() < nav._spySuppressUntil) return;
          if (!scrollEl) scrollEl = detectScrollEl();
          var baseTop = scrollEl ? scrollEl.getBoundingClientRect().top : 0;
          var offset = nav._anchorOffset || 12;
          var nodes = nav.querySelectorAll('.tokui-anchor__item');
          var activeItem = null;
          for (var i = 0; i < nodes.length; i++) {
            var t = document.getElementById(nodes[i]._anchorValue);
            if (!t || typeof t.getBoundingClientRect !== 'function') continue;
            // 目标越过（容器顶 + top 偏移）→ 记为候选，取最后一个
            if (t.getBoundingClientRect().top - baseTop <= offset) activeItem = nodes[i];
          }
          // 全部目标都在顶线下方 → 高亮首项；无任何可定位目标 → 保持现状
          if (!activeItem && nodes.length > 0) {
            var first = document.getElementById(nodes[0]._anchorValue);
            if (first && typeof first.getBoundingClientRect === 'function') activeItem = nodes[0];
          }
          if (activeItem) _setAnchorActive(nav, activeItem, true);
        };
        var ticking = false;
        var onScroll = function () {
          if (ticking) return;
          ticking = true;
          raf(function () { ticking = false; spy(); });
        };
        if (window.addEventListener) {
          window.addEventListener('scroll', onScroll, { capture: true, passive: true });
        }
        spy();
        nav._anchorCleanup = function () {
          if (window.removeEventListener) window.removeEventListener('scroll', onScroll, { capture: true });
        };
      });
    }

    return nav;
  });

  // === Anchor Link 锚点子项（自闭合，anchor 容器模式用）===
  // attrs.h = 目标元素 id（可带 #）, attrs.tx = 显示文本（或正文）, attrs.d = 层级深度(1-3，缩进)
  renderer.register('lk', (node) => {
    var a = node.attrs || {};
    var value = String(a.h || '').replace(/^#/, '');
    var depth = Math.min(parseInt(a.d) || 0, 3);
    var item = el('div', {
      class: 'tokui-anchor__item' + (depth > 0 ? ' tokui-anchor__item--depth-' + depth : ''),
      role: 'link', tabindex: '0', 'data-target': value
    }, a.tx || node.content || value);
    item._anchorValue = value;
    function go() {
      // 挂载后经 closest 取 nav（流式追加时渲染先于挂载，不能闭包捕获 nav）
      var nav = item.closest('.tokui-anchor');
      if (!nav) return;
      _setAnchorActive(nav, item, false);
      // 平滑滚动途中 spy 会把高亮抢回「当前过顶项」——点击后抑制一个滚动动画窗口
      nav._spySuppressUntil = Date.now() + 900;
      _anchorScrollTo(value);
    }
    item.addEventListener('click', go);
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
    return item;
  });

  // 构建平铺锚点项（opt 简写用；lk 经 register 自渲染，行为对称）
  function _buildAnchorItem(nav, value, text, depth) {
    depth = Math.min(depth || 0, 3);
    var item = el('div', {
      class: 'tokui-anchor__item' + (depth > 0 ? ' tokui-anchor__item--depth-' + depth : ''),
      role: 'link', tabindex: '0', 'data-target': value
    }, text);
    item._anchorValue = value;
    function go() {
      _setAnchorActive(nav, item, false);
      // 平滑滚动途中 spy 会把高亮抢回「当前过顶项」——点击后抑制一个滚动动画窗口
      nav._spySuppressUntil = Date.now() + 900;
      _anchorScrollTo(value);
    }
    item.addEventListener('click', go);
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
    return item;
  }

  // 解析 anchor 的 opt 简写："s1:第一节;s2:第二节" → [{v:'s1', tx:'第一节'},...]
  function _parseAnchorOpt(str) {
    if (!str || typeof str !== 'string') return [];
    return str.split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (item) {
      var idx = item.indexOf(':');
      if (idx === -1) return { v: item.replace(/^#/, ''), tx: item };
      return { v: item.substring(0, idx).trim().replace(/^#/, ''), tx: item.substring(idx + 1).trim() };
    });
  }

  // 高亮指定锚点项（单例激活）；silent 为 true 时不上报 change（scroll-spy 与程序化走 silent）
  function _setAnchorActive(nav, itemEl, silent) {
    nav.querySelectorAll('.tokui-anchor__item--active').forEach(function (el2) {
      el2.classList.remove('tokui-anchor__item--active');
      el2.removeAttribute('aria-current');
    });
    itemEl.classList.add('tokui-anchor__item--active');
    itemEl.setAttribute('aria-current', 'true');
    if (!silent && nav._report) nav._report('change', { value: itemEl._anchorValue });
  }

  // 平滑滚动到锚点目标（scrollIntoView 不存在时静默跳过，如 Node 测试环境）
  function _anchorScrollTo(id) {
    var t = document.getElementById(id);
    if (t && typeof t.scrollIntoView === 'function') {
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // === Masonry 瀑布流（容器）===
  // attrs.cols = 固定列数(1-6，缺省 2), attrs.minw = 自动列模式：子项最小宽度(px)，
  // 列数随容器宽度自适应（与 cols 二选一，minw 优先）, attrs.gap = 间距(px，缺省 8)
  // CSS columns 实现：子项自动分列平衡，流式追加自然流动，零 JS 布局计算
  renderer.register('masonry', (node, rc) => {
    var attrs = node.attrs || {};
    var gap = parseInt(attrs.gap) || 8;
    var wrap = el('div', { class: 'tokui-masonry' });
    if (attrs.id) wrap.id = attrs.id;
    var minw = parseInt(attrs.minw);
    if (minw > 0) {
      // 自动列模式：column-width 驱动，浏览器按容器宽度算列数（响应式）
      wrap.classList.add('tokui-masonry--auto');
      wrap.style.columnWidth = minw + 'px';
    } else {
      var cols = Math.min(Math.max(parseInt(attrs.cols) || 2, 1), 6);
      wrap.style.columnCount = String(cols);
    }
    wrap.style.columnGap = gap + 'px';
    wrap.style.setProperty('--tokui-masonry-gap', gap + 'px');
    rc(node.children || []).forEach(function (c) {
      if (c && c.nodeType) wrap.appendChild(c);
    });
    wrap._slot = wrap;
    wrap._tokuiType = 'masonry';
    return wrap;
  });


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

    // 拖拽手柄（APG window splitter：aria-valuenow 表达当前尺寸，拖动/键盘时同步）
    var handle = el('div', {
      class: 'tokui-resizable__handle',
      role: 'separator',
      'aria-orientation': isHorizontal ? 'vertical' : 'horizontal',
      'aria-valuenow': String(defaultSize),
      'aria-valuemin': String(minSize),
      'aria-valuemax': String(maxSize),
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
      handle.setAttribute('aria-valuenow', String(Math.round(newSize)));
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
      var newKeySize = null;
      if (isHorizontal && e.key === 'ArrowLeft') {
        e.preventDefault();
        newKeySize = Math.max(minSize, currentSize - step);
        panel1.style.width = newKeySize + 'px';
      } else if (isHorizontal && e.key === 'ArrowRight') {
        e.preventDefault();
        newKeySize = Math.min(maxSize, currentSize + step);
        panel1.style.width = newKeySize + 'px';
      } else if (!isHorizontal && e.key === 'ArrowUp') {
        e.preventDefault();
        newKeySize = Math.max(minSize, currentSize - step);
        panel1.style.height = newKeySize + 'px';
      } else if (!isHorizontal && e.key === 'ArrowDown') {
        e.preventDefault();
        newKeySize = Math.min(maxSize, currentSize + step);
        panel1.style.height = newKeySize + 'px';
      }
      if (newKeySize !== null) handle.setAttribute('aria-valuenow', String(Math.round(newKeySize)));
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
  // attrs.virtual = 虚拟滚动模式（均匀行高假设：attrs.ih = 行高 px，默认 36；
  //   不等高的子项不适用本模式）。全部子项保留在脱离文档的容器里，
  //   仅可视窗口（前后各 5 行 buffer）挂进 DOM，顶部/底部 spacer 撑出总高。
  // 滚动到可滚距离底部 80% 阈值内上报一次 loadmore（离开阈值区后重置，可再次触发），
  // 可用 on:"loadmore:handler名" 接命名 handler。
  renderer.register('scroll-area', (node, rc) => {
    var attrs = node.attrs || {};
    var isVirtual = attrs.virtual !== undefined;
    var outerAttrs = { class: 'tokui-scroll-area' + (isVirtual ? ' tokui-scroll-area--virtual' : '') };
    if (attrs.id) outerAttrs.id = attrs.id;
    var outer = el('div', outerAttrs);

    // 设置外层尺寸
    if (attrs.h) outer.style.height = String(attrs.h).match(/^\d+$/) ? attrs.h + 'px' : attrs.h;
    if (attrs.w) outer.style.width = attrs.w;

    // 内层可滚动视口（tabindex=0：键盘用户可聚焦后方向键滚动，WCAG 2.1.1）
    var viewport = el('div', { class: 'tokui-scroll-area__viewport', tabindex: '0' });

    if (!isVirtual) {
      // 普通模式：渲染全部子节点到视口（行为与历史版本一致）
      rc(node.children || []).forEach(function(child) {
        if (child && child.nodeType) viewport.appendChild(child);
      });

      outer.appendChild(viewport);
      outer._slot = viewport;
      outer._tokuiType = 'scroll-area';
      return outer;
    }

    // ===== 虚拟滚动模式 =====
    var itemHeight = parseInt(attrs.ih, 10) > 0 ? parseInt(attrs.ih, 10) : 36;
    var BUFFER = 5; // 可视窗口前后各多挂 5 行
    // 视口高度：优先实测 clientHeight，Node 测试等无布局环境回退 attrs.h
    function viewHeight() {
      return viewport.clientHeight || parseInt(attrs.h, 10) || itemHeight;
    }

    // 全部子项渲染进脱离文档的容器，快照为数组后按需挂载。
    // 流式场景：_slot 指向 pool（见末尾），子节点随流直接进 pool；
    // 故 items 不做一次性快照，renderWindow 每次动态取 pool.children（slice 开销可忽略）。
    var pool = document.createElement('div');
    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) pool.appendChild(child);
    });
    var items = [];

    // 顶部/底部 spacer：撑出总高，保持滚动条比例正确
    var topSpacer = el('div', { class: 'tokui-scroll-area__spacer' });
    var bottomSpacer = el('div', { class: 'tokui-scroll-area__spacer' });
    viewport.appendChild(topSpacer);
    viewport.appendChild(bottomSpacer);

    var mountedStart = -1;
    var mountedEnd = -1;
    var mountedTotal = -1;

    // 按 scrollTop 计算可视窗口并重挂（均匀行高假设，O(1) 定位）
    function renderWindow() {
      // 把新到达的子项（一次性渲染 rc 的 / 流式进 _slot=pool 的）并入管理数组
      while (pool.childNodes.length > 0) {
        items.push(pool.removeChild(pool.childNodes[0]));
      }
      var total = items.length;
      var scrollTop = viewport.scrollTop || 0;
      var start = Math.max(0, Math.floor(scrollTop / itemHeight) - BUFFER);
      var end = Math.min(total, Math.ceil((scrollTop + viewHeight()) / itemHeight) + BUFFER);
      if (start === mountedStart && end === mountedEnd && total === mountedTotal) return;
      mountedStart = start;
      mountedEnd = end;
      mountedTotal = total;
      // 摘下上一轮挂载的行（childNodes 是类数组，倒序 removeChild）
      for (var i = viewport.children.length - 1; i >= 0; i--) {
        var c = viewport.children[i];
        if (c !== topSpacer && c !== bottomSpacer) viewport.removeChild(c);
      }
      topSpacer.style.height = (start * itemHeight) + 'px';
      bottomSpacer.style.height = ((total - end) * itemHeight) + 'px';
      for (var j = start; j < end; j++) {
        viewport.insertBefore(items[j], bottomSpacer);
      }
    }

    // 触底上报：到底一次报一次，离开阈值区重置
    var report = renderer.createReporter('scroll-area', attrs, outer);
    var atBottom = false;
    function onScroll() {
      renderWindow();
      var maxScroll = items.length * itemHeight - viewHeight();
      var nearBottom = maxScroll <= 0 ? true : (viewport.scrollTop || 0) >= maxScroll * 0.8;
      if (nearBottom && !atBottom) {
        atBottom = true;
        report('loadmore', {});
      } else if (!nearBottom) {
        atBottom = false;
      }
    }

    // scroll 用 requestAnimationFrame 节流；无 rAF 环境（Node 测试）退化为直接计算
    var raf = (typeof requestAnimationFrame === 'function')
      ? function(fn) { requestAnimationFrame(fn); }
      : function(fn) { fn(); };
    var rafScheduled = false;
    viewport.addEventListener('scroll', function() {
      if (rafScheduled) return;
      rafScheduled = true;
      raf(function() {
        rafScheduled = false;
        onScroll();
      });
    });

    renderWindow(); // 初始窗口

    outer.appendChild(viewport);
    // 虚拟模式插槽指向 pool（脱离文档）：流式子节点先进 pool，
    // 闭合时统一重排窗口——避免子项绕过虚拟化直挂视口
    outer._slot = pool;
    // 流式逐子项到达即重排窗口（真流式虚拟滚动，边收边显）
    outer._streamAppendHook = function () { renderWindow(); };
    outer._streamCloseHook = function () { renderWindow(); };
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
          'aria-label': _t('sidebar.toggle'),
          // aria-expanded 挂 toggle 按钮本体（控制者），非容器 div（generic div 不支持该属性）
          'aria-expanded': 'true',
          type: 'button'
        });
        toggle.textContent = '☰'; // hamburger character ☰
        toggle.addEventListener('click', function() {
          sidebar.classList.toggle('tokui-sidebar--collapsed');
          // Update aria-expanded
          var isCollapsed = sidebar.classList.contains('tokui-sidebar--collapsed');
          toggle.setAttribute('aria-expanded', String(!isCollapsed));
        });
        sidebar._toggleBtn = toggle; // _update 同步用
        header.appendChild(toggle);
      }
      sidebar.appendChild(header);
    }

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
      // 程序化开合同步 toggle 的 aria-expanded
      if (uAttrs.act && sidebar._toggleBtn) {
        sidebar._toggleBtn.setAttribute('aria-expanded', String(!sidebar.classList.contains('tokui-sidebar--collapsed')));
      }
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
  // 浏览器直载（非打包）场景：模块求值即挂 modal.confirm，不等渲染器初始化
  mountModalConfirm();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerLayoutComponents, mountModalConfirm };
}
