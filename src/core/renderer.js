/**
 * TokUI 渲染器模块
 * 将解析器输出的节点树渲染为 DOM 元素。
 * 支持一次性挂载（mount）和流式挂载（mountStreaming）两种模式。
 * 通过组件注册机制，每种标签类型对应一个渲染函数。
 */
'use strict';

/**
 * 创建 DOM 元素的快捷方法
 *
 * @param {string} tag - HTML 标签名
 * @param {Object} [attrs] - 属性键值对（值为 true 时设置空属性，false 时跳过）
 * @param {string} [textContent] - 元素文本内容
 * @returns {HTMLElement} 创建的 DOM 元素
 */
function el(tag, attrs, textContent) {
  const element = document.createElement(tag);

  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      // 过滤危险属性名，防止 XSS 和 CSS 注入
      if (key.startsWith('on') || key === 'formaction') return;
      if (key === 'style') { element.style.cssText = String(value); return; }
      if (value === true) {
        element.setAttribute(key, '');
      } else if (value === false) {
        // 布尔值为 false 时不设置属性
      } else {
        element.setAttribute(key, String(value));
      }
    });
  }

  if (textContent !== undefined && textContent !== null) {
    element.textContent = textContent;
  }

  return element;
}

/**
 * 组件变体白名单
 * key = 组件类型, value = 允许的变体名 Set
 * DSL: v:variant1,variant2 → CSS: tokui-{type}--{variant}
 */
const VARIANTS = {
  img:    new Set(['avatar', 'rounded', 'bordered']),
  card:   new Set(['highlight', 'flat', 'bordered', 'center', 'right']),
  btn:    new Set(['primary', 'danger', 'success', 'warning', 'ghost', 'sm', 'lg', 'pill', 'square', 'block']),
  btngroup: new Set(['vertical', 'pill']),
  table:  new Set(['bordered', 'compact']),
  input:  new Set(['error', 'success', 'sm', 'lg', 'underline', 'pill']),
  pwd:    new Set(['error', 'success', 'sm', 'lg', 'underline', 'pill']),
  select: new Set(['error', 'success']),
  picker: new Set(['error', 'success']),
  h1: new Set(['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill']),
  h2: new Set(['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill']),
  h3: new Set(['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill']),
  h4: new Set(['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill']),
  h5: new Set(['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill']),
  h6: new Set(['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill']),
  p:  new Set(['left', 'center', 'right', 'muted', 'bold', 'sm', 'lg']),
  a:  new Set(['muted', 'danger', 'success', 'underline']),
  ft: new Set(['left', 'center', 'right']),
  row: new Set(['left', 'center', 'right', 'inline']),
  dv: new Set(['dashed', 'dotted', 'sm', 'md', 'lg', 'vert', 'plain']),
  dot: new Set(['sm', 'lg']),
  avatar: new Set(['sm', 'md', 'lg', 'xl']),
  tooltip: new Set(['top', 'bottom', 'left', 'right']),
  pagination: new Set(['sm', 'lg']),
  switch: new Set(['sm', 'lg']),
  drawer: new Set(['left', 'right', 'top', 'bottom']),
  breadcrumb: new Set(['arrow']),
  slider: new Set(['sm', 'lg']),
  rate: new Set(['sm', 'lg']),
  transfer: new Set(['sm', 'lg']),
  cascader: new Set(['error', 'success']),
  upload:   new Set(['sm', 'lg']),
  tree:     new Set(['sm', 'lg']),
};

/**
 * TokUI 渲染器类
 * 通过 register() 注册各类组件的渲染函数，
 * 通过 render() 将节点树转换为 DOM 元素。
 *
 * 流式渲染使用 slotStack（插槽栈）管理容器嵌套：
 * 每个容器 DOM 上标记 _slot（内容插入点）和 _tokuiType（组件类型），
 * 新元素挂载到栈顶容器的 _slot 中。
 */
class TokUIRenderer {
  /**
   * @param {Object} eventBus - 事件总线，用于绑定组件交互事件
   */
  constructor(eventBus) {
    this.registry = {};   // 组件渲染函数注册表
    this.eventBus = eventBus;
    this.slotStack = [];  // 流式渲染时的插槽栈
    this._boundElements = []; // 记录绑定过事件的元素，用于 destroy
    this._onError = null; // 全局错误回调
  }

  /**
   * 注册组件渲染函数
   *
   * @param {string} type - 标签类型名
   * @param {Function} renderFn - 渲染函数 (node, rc, parentType) => HTMLElement
   *   - node: 当前节点
   *   - rc: 递归渲染子节点的函数
   *   - parentType: 父节点类型（用于特殊处理如 opt 在 radio 中的行为）
   */
  register(type, renderFn) {
    this.registry[type] = renderFn;
  }

  /**
   * 注册全局错误回调
   * 组件渲染异常时调用，用于日志上报或自定义错误处理。
   *
   * @param {Function} fn - 错误回调 (type, error, node) => void
   */
  onError(fn) {
    this._onError = fn;
  }

  /**
   * 渲染单个节点为 DOM 元素
   * 文本节点创建文本节点，其他节点查找注册的渲染函数处理，
   * 未注册的类型渲染为带警告样式的 div。
   *
   * @param {Object} node - 解析器输出的节点
   * @param {string} [parentType] - 父节点类型
   * @returns {HTMLElement|Text} 渲染后的 DOM 元素
   */
  render(node, parentType, depth) {
    // 渲染深度限制，防止栈溢出
    if ((depth || 0) > 50) {
      console.warn('TokUI Renderer: 渲染深度超过 50，可能存在循环嵌套');
      return document.createTextNode('');
    }

    // 文本节点直接创建 Text 节点
    if (node.type === '_text') {
      return document.createTextNode(node.content);
    }

    // 查找已注册的渲染函数
    const handler = this.registry[node.type];
    if (!handler) {
      // 未注册类型渲染为警告样式的 div
      const div = el('div', { class: 'tokui-unknown', 'data-tokui-type': node.type });
      if (node.content) div.textContent = node.content;
      return div;
    }

    var self = this;
    var currentDepth = depth || 0;
    // 子节点递归渲染函数
    const rc = (children) => {
      return children.map(child => self.render(child, node.type, currentDepth + 1));
    };

    var dom;
    try {
      dom = handler(node, rc, parentType);
    } catch (err) {
      console.warn('TokUI Renderer: 组件渲染异常', node.type, err);
      if (self._onError) {
        try { self._onError(node.type, err, node); } catch (_) { /* ignore callback errors */ }
      }
      var details = el('details', { class: 'tokui-error', 'data-tokui-type': node.type });
      var summary = el('summary', { class: 'tokui-error__summary' });
      summary.textContent = '[' + node.type + '] 渲染失败';
      details.appendChild(summary);
      var errMsg = el('div', { class: 'tokui-error__detail' });
      errMsg.textContent = String(err.message || err);
      details.appendChild(errMsg);
      dom = details;
    }
    this._applyVariants(dom, node);
    // 在每个组件根元素盖 data-tokui-tag 源标签印章（文档 Playground / E2E 定位用）。
    // 只盖普通元素（nodeType===1），文本节点 / fragment / null 跳过。
    if (dom && dom.nodeType === 1 && node.type && node.type !== '_text') {
      dom.setAttribute('data-tokui-tag', node.type);
    }
    return dom;
  }

  /**
   * 为 DOM 元素应用组件变体修饰符类
   * 读取 node.attrs.v，按白名单添加 tokui-{type}--{variant} 类。
   * 支持 _variantTarget 委托（用于 input/pwd/select 等有包装器的组件）。
   *
   * @param {HTMLElement} dom - 渲染函数返回的 DOM 元素
   * @param {Object} node - 解析器输出的节点
   */
  _applyVariants(dom, node) {
    var v = node.attrs && node.attrs.v;
    if (!v || !dom || dom.nodeType !== 1) return;
    var allowed = VARIANTS[node.type];
    if (!allowed) return;
    var target = dom._variantTarget || dom;
    v.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (name) {
      if (allowed.has(name)) {
        target.classList.add('tokui-' + node.type + '--' + name);
      }
    });
  }

  /**
   * 一次性挂载：渲染节点并添加到容器
   * 为元素添加淡入动画，并绑定事件。
   *
   * @param {Object} node - 要渲染的节点
   * @param {HTMLElement} targetContainer - 目标容器
   * @returns {HTMLElement} 挂载的 DOM 元素
   */
  mount(node, targetContainer) {
    const dom = this.render(node);
    if (dom.nodeType === 1) {
      dom.style.animation = 'tokuiFadeIn 0.3s ease';
    }
    targetContainer.appendChild(dom);
    this.bindEvents(dom);
    // 触发容器的延迟初始化 hook（如 picker 的交互绑定）
    if (dom._streamCloseHook) dom._streamCloseHook();
    return dom;
  }

  /**
   * 流式挂载：根据节点的 _stream 标记分发处理
   * - 'open': 容器开始，创建 DOM 并压入插槽栈
   * - 'close': 容器结束，弹出栈并绑定事件
   * - 其他: 普通子节点，挂载到栈顶容器
   *
   * @param {Object} node - 解析器输出的节点（带 _stream 标记）
   * @param {HTMLElement} rootContainer - 根容器
   * @returns {HTMLElement|null} 挂载的 DOM 元素
   */
  mountStreaming(node, rootContainer) {
    // chart 自闭合流式预览：半成品 attrs 到达即更新 pending wrapper（渐增重绘）
    if (node._streamPreview) {
      return this._streamChartPreview(node, rootContainer);
    }
    if (node._stream === 'open') {
      return this._streamOpen(node, rootContainer);
    }
    if (node._stream === 'close') {
      return this._streamClose(node);
    }
    // 自闭合 chart 最终到达：复用 pending wrapper（避免与预览重复渲染）
    if (node.type === 'chart' && node._previewKey !== undefined) {
      return this._streamChartFinalize(node, rootContainer);
    }
    return this._streamChild(node, rootContainer);
  }

  // chart 自闭合流式预览：首次创建 pending wrapper 挂到当前 slot，后续用新 attrs 重绘
  _streamChartPreview(node, rootContainer) {
    this._pendingCharts = this._pendingCharts || {};
    const key = node._previewKey;
    const pending = this._pendingCharts[key];
    if (pending) {
      if (pending._tokuiChartUpdate) pending._tokuiChartUpdate(node.attrs);
      return pending;
    }
    const dom = this.render(node);
    const parentEntry = this.slotStack.length > 0 ? this.slotStack[this.slotStack.length - 1] : null;
    const target = parentEntry ? parentEntry.slot : rootContainer;
    if (dom.nodeType === 1) dom.style.animation = 'tokuiFadeIn 0.3s ease';
    target.appendChild(dom);
    this._pendingCharts[key] = dom;
    return dom;
  }

  // chart 自闭合最终到达（] 闭合）：复用 pending 用最终 attrs 更新一次，清理登记
  _streamChartFinalize(node, rootContainer) {
    this._pendingCharts = this._pendingCharts || {};
    const key = node._previewKey;
    const pending = this._pendingCharts[key];
    if (pending) {
      if (pending._tokuiChartUpdate) pending._tokuiChartUpdate(node.attrs);
      delete this._pendingCharts[key];
      return pending;
    }
    // 无 pending（预览未触发，如 buffer 极短直接到 ]）：按普通子节点渲染
    return this._streamChild(node, rootContainer);
  }

  /**
   * 流式渲染：打开容器
   * 渲染容器 DOM，添加淡入动画，挂载到栈顶的插槽位置，
   * 然后将自身压入插槽栈（使用 _slot 作为新的插入点）。
   */
  _streamOpen(node, rootContainer) {
    const dom = this.render(node);
    // 跳过隐藏元素的 fadeIn 动画（如 hover-content 临时容器）
    if (dom.nodeType === 1 && !dom.classList.contains('tokui-hover-card__content-temp')) {
      dom.style.animation = 'tokuiFadeIn 0.3s ease';
    }
    // 确定父级插槽：栈顶的 slot 或根容器
    let parentSlot = this.slotStack.length > 0
      ? this.slotStack[this.slotStack.length - 1].slot
      : rootContainer;
    // ft 在 card / dialog / drawer 内时，直接追加到容器元素而非 body 插槽（作页脚）
    if (node.type === 'ft' && this.slotStack.length > 0) {
      const parentEntry = this.slotStack[this.slotStack.length - 1];
      if (parentEntry.containerType === 'card' || parentEntry.containerType === 'dialog' || parentEntry.containerType === 'drawer') {
        parentSlot = parentEntry.el;
      }
    }
    // tab 在 tabs 内时：在 tabs 容器上插入 input + label，panel 追加到 tabs 本身
    if (node.type === 'tab' && dom._isTab && this.slotStack.length > 0) {
      const parentEntry = this.slotStack[this.slotStack.length - 1];
      if (parentEntry.containerType === 'tabs' && parentEntry.el._tabId) {
        const tabsEl = parentEntry.el;
        const tabId = tabsEl._tabId;
        const idx = tabsEl._tabCount || 0;
        // 创建 radio input
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = tabId;
        input.className = 'tokui-tabs-input';
        input.id = tabId + '-' + idx;
        input.setAttribute('data-index', String(idx));
        if (idx === 0) input.checked = true;
        tabsEl.appendChild(input);
        // 创建 label
        const label = document.createElement('label');
        label.className = 'tokui-tabs-label';
        label.setAttribute('for', tabId + '-' + idx);
        label.setAttribute('data-index', String(idx));
        label.setAttribute('data-tokui-tag', 'tab');
        label.textContent = dom._tabTitle || ('Tab ' + (idx + 1));
        tabsEl.appendChild(label);
        // 面板追加到 tabs 容器
        dom.setAttribute('data-index', String(idx));
        tabsEl.appendChild(dom);
        tabsEl._tabCount = idx + 1;
        // panel 的 slot 是自身，子内容追加到 panel 内
        this.slotStack.push({ slot: dom._slot || dom, el: dom, containerType: node.type });
        return dom;
      }
    }
    parentSlot.appendChild(dom);
    // 记录插槽信息：_slot 为内容插入点，_tokuiType 为组件类型
    const slot = dom._slot || dom;
    this.slotStack.push({ slot: slot, el: dom, containerType: node.type });
    return dom;
  }

  /**
   * 流式渲染：关闭容器
   * 从栈顶向下查找匹配的容器，逐层弹出并绑定事件。
   * 事件绑定延迟到容器关闭时执行，确保内部元素已全部就绪。
   */
  _streamClose(node) {
    while (this.slotStack.length > 0) {
      const entry = this.slotStack.pop();
      this.bindEvents(entry.el);
      // 容器关闭回调（用于流式模式下延迟初始化）
      if (entry.el._streamCloseHook) {
        entry.el._streamCloseHook();
      }
      // 匹配到对应类型的容器时停止
      if (entry.el._tokuiType === node.type || this._getNodeType(entry.el) === node.type) {
        break;
      }
    }
    return null;
  }

  /**
   * 流式渲染：处理子节点
   * 将节点渲染为 DOM 并挂载到栈顶容器的插槽位置。
   * 特殊处理：opt 在 radio 容器内时，渲染为 radio 选项项。
   */
  _streamChild(node, rootContainer) {
    var parentEntry = this.slotStack.length > 0 ? this.slotStack[this.slotStack.length - 1] : null;
    var parentType = parentEntry ? parentEntry.containerType : undefined;
    var target = parentEntry ? parentEntry.slot : rootContainer;

    // chart 容器内的 pt/task/ms 子节点 → 喂给图表增量重绘，不渲染为 DOM
    if (parentEntry && parentEntry.containerType === 'chart' && parentEntry.el._tokuiChartAppend) {
      parentEntry.el._tokuiChartAppend(node);
      return null;
    }

    // ft 自闭合节点（tx 纯文字页脚）在 card / dialog / drawer 内时，挂到容器元素而非 body 插槽。
    // 与 _streamOpen 的 ft 特殊处理对称：容器模式 ft 走 _streamOpen，
    // parser 对带 tx 的 ft 触发容器自闭合逃逸使其走 _streamChild，此处补齐兜底。
    if (node.type === 'ft' && parentEntry && (parentEntry.containerType === 'card' || parentEntry.containerType === 'dialog' || parentEntry.containerType === 'drawer')) {
      target = parentEntry.el;
    }

    // 特殊处理：opt 在 radio 内 → 渲染为 radio 选项
    if (node.type === 'opt' && parentEntry && parentEntry.el._slot && parentEntry.el._slot._radioName) {
      var radioName = parentEntry.el._slot._radioName;
      var radioLabel = this.render(node, 'radio');
      if (radioName && radioLabel.querySelector) {
        var radioInput = radioLabel.querySelector('input[type=radio]');
        if (radioInput) radioInput.name = radioName;
      }
      if (radioLabel.nodeType === 1) radioLabel.style.animation = 'tokuiFadeIn 0.3s ease';
      target.appendChild(radioLabel);
      return radioLabel;
    }

    // 特殊处理：opt 在 picker 内 → 渲染为 li 并追加到 dropdown
    if (node.type === 'opt' && parentEntry && parentEntry.containerType === 'picker') {
      var pickerDropdown = parentEntry.slot;
      var optLi = this.render(node, 'picker');
      if (optLi.nodeType === 1) optLi.style.animation = 'tokuiFadeIn 0.3s ease';
      var emptyTip = pickerDropdown.querySelector('.tokui-picker-empty');
      if (emptyTip) {
        pickerDropdown.insertBefore(optLi, emptyTip);
      } else {
        pickerDropdown.appendChild(optLi);
      }
      return optLi;
    }

    // 特殊处理：opt 在 transfer 内 → 立即追加为穿梭项到对应栏（真流式，边收边显）
    if (node.type === 'opt' && parentEntry && parentEntry.containerType === 'transfer' && parentEntry.el._tokuiTransferAppend) {
      var transferItem = parentEntry.el._tokuiTransferAppend(node);
      if (transferItem && transferItem.nodeType === 1) transferItem.style.animation = 'tokuiFadeIn 0.3s ease';
      return null; // 不进 staging，避免重复
    }

    var dom = this.render(node, parentType);
    if (dom.nodeType === 1) {
      dom.style.animation = 'tokuiFadeIn 0.3s ease';
    }
    target.appendChild(dom);
    // 原始内容容器（code 等）流式逐字追加子文本时，同步触发增量重绘 hook
    // （代码块边收边重新高亮 + 重排行号），实现真流式而非等到闭合才渲染。
    if (parentEntry && parentEntry.el && parentEntry.el._streamAppendHook) {
      parentEntry.el._streamAppendHook(node);
    }
    // 容器内的子元素延迟到容器关闭时统一绑定事件，确保能感知完整 DOM 结构
    if (this.slotStack.length === 0) {
      this.bindEvents(dom);
    }
    return dom;
  }

  /**
   * 收集表单数据，支持多值字段（如 checkbox 组）
   * 同名字段自动转为数组，单值字段保持字符串
   */
  _collectFormData(form) {
    const data = {};
    for (const [key, value] of new FormData(form)) {
      if (data[key] !== undefined) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    }
    return data;
  }

  /**
   * 从 DOM 元素获取其 TokUI 组件类型
   * 优先读取 _tokuiType 标记，其次从 CSS 类名中提取。
   */
  _getNodeType(el) {
    if (el._tokuiType) return el._tokuiType;
    const m = el.className && el.className.match && el.className.match(/tokui-(\w+)/);
    return m ? m[1] : '';
  }

  /**
   * 销毁渲染器，清理所有事件绑定和状态
   * 移除已绑定元素的 DOM 事件监听器，清空插槽栈。
   */
  destroy() {
    // 清理绑定过事件的元素
    this._boundElements.forEach(function (entry) {
      entry.listeners.forEach(function (listener) {
        entry.element.removeEventListener(listener.type, listener.fn);
      });
      delete entry.element._tokuiBound;
      delete entry.element._tokuiClickBound;
    });
    this._boundElements = [];
    this.slotStack = [];
  }

  /**
   * 重置插槽栈
   * 流式解析结束时调用，为栈中所有未关闭的容器绑定事件。
   */
  resetSlotStack() {
    while (this.slotStack.length > 0) {
      const entry = this.slotStack.pop();
      this.bindEvents(entry.el);
    }
  }

  /**
   * 为 DOM 元素及其子元素绑定 TokUI 事件
   * 处理两种事件：
   * 1. 点击事件（data-tokui-clk）：查找元素上的 clk 属性，调用事件总线中注册的处理函数
   * 2. 表单提交事件（data-tokui-sub）：拦截表单提交，收集表单数据后调用处理函数
   *
   * 使用 _tokuiBound 标记避免重复绑定。
   *
   * @param {HTMLElement} dom - 需要绑定事件的 DOM 元素
   */
  bindEvents(dom) {
    if (!this.eventBus || dom.nodeType !== 1) return;
    if (dom._tokuiBound) return;
    dom._tokuiBound = true;

    var self = this;

    // 绑定所有带 data-tokui-clk 属性的元素的点击事件
    const clickElements = dom.querySelectorAll('[data-tokui-clk]');
    clickElements.forEach((element) => {
      if (element._tokuiBound) return;
      element._tokuiBound = true;
      const handlerName = element.getAttribute('data-tokui-clk');
      if (!handlerName) return;
      // 提交按钮在 form 外时，click 中自动查找并收集附近 form 数据
      var nearbyFormForSubmit = null;
      if (element.getAttribute('type') === 'submit' && !element.closest('form')) {
        var ancestor = element.parentElement;
        while (ancestor && ancestor !== dom.parentElement) {
          var found = ancestor.querySelector('form[data-tokui-sub]');
          if (found) { nearbyFormForSubmit = found; break; }
          ancestor = ancestor.parentElement;
        }
      }
      var clickFn = function (e) {
        e.preventDefault();
        // 提交按钮在 form 外：用附近 form 的 sub handler 处理
        if (nearbyFormForSubmit) {
          const subName = nearbyFormForSubmit.getAttribute('data-tokui-sub');
          const handler = subName ? self.eventBus.getHandler(subName) : null;
          if (handler) {
            handler(self._collectFormData(nearbyFormForSubmit), e, nearbyFormForSubmit);
          }
          return;
        }
        const handler = self.eventBus.getHandler(handlerName);
        if (handler) {
          // 如果在表单内，自动收集表单数据
          const form = element.closest('form');
          const data = form ? self._collectFormData(form) : null;
          handler(data, e, element);
        }
      };
      element.addEventListener('click', clickFn);
      self._boundElements.push({ element: element, listeners: [{ type: 'click', fn: clickFn }] });
    });

    // 绑定表单提交事件
    const formList = [];
    if (dom.tagName === 'FORM' && (dom.hasAttribute('data-tokui-sub') || dom.hasAttribute('data-tokui-clk'))) formList.push(dom);
    dom.querySelectorAll('form[data-tokui-sub], form[data-tokui-clk]').forEach(f => formList.push(f));
    formList.forEach((form) => {
      if (form._tokuiFormBound) return;
      form._tokuiFormBound = true;
      const handlerName = form.getAttribute('data-tokui-sub') || form.getAttribute('data-tokui-clk');
      if (!handlerName) return;
      var submitFn = function (e) {
        e.preventDefault();
        const handler = self.eventBus.getHandler(handlerName);
        if (handler) {
          const data = self._collectFormData(form);
          handler(data, e, form);
        }
      };
      form.addEventListener('submit', submitFn);
      self._boundElements.push({ element: form, listeners: [{ type: 'submit', fn: submitFn }] });
    });

    // 处理根元素自身的点击事件（当根元素本身带 data-tokui-clk 时）
    if (dom.hasAttribute && dom.hasAttribute('data-tokui-clk') && !dom._tokuiClickBound) {
      dom._tokuiClickBound = true;
      const handlerName = dom.getAttribute('data-tokui-clk');
      if (handlerName) {
        var domClickFn = function (e) {
          e.preventDefault();
          const handler = self.eventBus.getHandler(handlerName);
          if (handler) {
            const form = dom.closest('form');
            const data = form ? self._collectFormData(form) : null;
            handler(data, e, dom);
          }
        };
        dom.addEventListener('click', domClickFn);
        self._boundElements.push({ element: dom, listeners: [{ type: 'click', fn: domClickFn }] });
      }
    }
  }
}

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.el = el;
  window.TokUI._internal.VARIANTS = VARIANTS;
  window.TokUI._internal.TokUIRenderer = TokUIRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { el, TokUIRenderer, VARIANTS };
}
