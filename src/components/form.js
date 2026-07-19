/**
 * TokUI 表单组件模块
 * 注册表单相关组件：form、input、pwd、select、radio、opt、checkbox、btn。
 * 支持表单提交事件绑定（sub）和按钮点击事件绑定（clk）。
 *
 * DSL 示例：
 * [form id:login sub:handleLogin]
 *   [input t:text l:用户名 id:username req]
 *   [pwd l:密码 id:password req]
 *   [btn tx:登录 t:submit clk:handleLogin]
 * [/form]
 */
'use strict';

/**
 * 解析 opt 简写串：";" 分隔选项，每项首个 ":" 分隔 value:label；
 * 缺冒号则 v = tx = 该 token。trim 后过滤空项。
 * @param {string} str - 如 "1:男;2:女" 或 "篮球;足球"
 * @returns {Array<{v: string, tx: string}>}
 */
function _parseOptShorthand(str) {
  if (!str || typeof str !== 'string') return [];
  return str.split(';')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; })
    .map(function (item) {
      var idx = item.indexOf(':');
      if (idx === -1) return { v: item, tx: item };
      return { v: item.substring(0, idx).trim(), tx: item.substring(idx + 1).trim() };
    });
}

/**
 * CSS 尺寸值白名单校验：仅允许 数字+px/%/em/rem/vw/vh。
 * 用于 btn 的 w/radius 等直拼 style 的属性，防 LLM 输出注入任意 CSS。
 * @param {*} v - 原始属性值
 * @returns {string|null} 合法返回原值，非法返回 null
 */
function _safeCssSize(v) {
  var s = String(v == null ? '' : v).trim();
  return /^\d+(\.\d+)?(px|%|em|rem|vw|vh)$/.test(s) ? s : null;
}

/**
 * upd 校验反馈：切换输入框 error/success 状态样式。
 * 联动三处：输入框变体类（tokui-{base}--error/success）、hint 配色类、aria-invalid。
 * status 非 error/success（如空串）→ 清除状态回到中性。
 * @param {HTMLElement} ctrl - 输入控件元素（_variantTarget）
 * @param {HTMLElement|null} hintEl - hint 元素（可无）
 * @param {*} status - 'error' | 'success' | 其他（清除）
 * @param {string} base - 变体类基名（'tokui-input'）
 */
function _applyFieldStatus(ctrl, hintEl, status, base) {
  var st = (status === 'error' || status === 'success') ? status : '';
  ctrl.classList.remove(base + '--error');
  ctrl.classList.remove(base + '--success');
  if (st) ctrl.classList.add(base + '--' + st);
  if (st === 'error') ctrl.setAttribute('aria-invalid', 'true');
  else if (ctrl.removeAttribute) ctrl.removeAttribute('aria-invalid');
  if (hintEl) {
    hintEl.classList.remove('tokui-field__hint--error');
    hintEl.classList.remove('tokui-field__hint--success');
    if (st) hintEl.classList.add('tokui-field__hint--' + st);
  }
}

/**
 * live 纯前端实时校验（零网络）：本地 checkValidity，结果写入 hint + 状态样式。
 * 两种模式：
 * - `live`（布尔）      → blur 触发；error 态下继续输入会即时重检，改对立即转 success
 * - `live:input`        → 即时模式：每次 input 事件（键入/粘贴/拖拽/自动填充）都校验
 * 通过 → success 样式 + ok 文案（默认 '✓ 格式正确'）；失败 → error 样式 + err 文案（缺省回落 hint 原文）；
 * 空值且非必填 → 回中性。
 * 注：监听 input 事件而非 keyup/keypress——后者覆盖不了粘贴/拖拽/自动填充，keypress 已废弃。
 * @param {HTMLElement} ctrl - 输入控件元素
 * @param {HTMLElement|null} hintEl - hint 元素（live 模式渲染时必须已创建）
 * @param {Object} attrs - DSL attrs（req/err/ok/hint/live）
 * @param {string} base - 变体类基名（'tokui-input'）
 */
function _attachLiveValidation(ctrl, hintEl, attrs, base) {
  if (typeof ctrl.addEventListener !== 'function') return;
  var neutralHint = attrs.hint || '';
  var instant = attrs.live === 'input';
  function validate() {
    if (typeof ctrl.checkValidity !== 'function') return;
    if (!ctrl.value && attrs.req === undefined) {
      _applyFieldStatus(ctrl, hintEl, '', base);
      if (hintEl) hintEl.textContent = neutralHint;
      return;
    }
    if (ctrl.checkValidity()) {
      _applyFieldStatus(ctrl, hintEl, 'success', base);
      if (hintEl) hintEl.textContent = attrs.ok || '✓ 格式正确';
    } else {
      _applyFieldStatus(ctrl, hintEl, 'error', base);
      if (hintEl) hintEl.textContent = attrs.err || neutralHint;
    }
  }
  ctrl.addEventListener('blur', validate);
  ctrl.addEventListener('input', function () {
    if (instant || ctrl.classList.contains(base + '--error')) validate();
  });
}

/**
 * opt:"..." 简写展开：若 node 带 opt 属性，把 _parseOptShorthand 结果合成 opt 子节点
 * 追加到 children 末尾（返回新 node，不 mutate 原 node）；否则原样返回。
 * select/radio/checkbox 三处共用，避免展开逻辑重复。
 * @param {Object} node - 组件节点
 * @returns {Object} 可能含合成 opt 子节点的新 node
 */
function _expandOptChildren(node) {
  if (!node || !node.attrs || !node.attrs.opt) return node;
  var expanded = _parseOptShorthand(node.attrs.opt).map(function (o) {
    return { type: 'opt', attrs: { v: o.v, tx: o.tx } };
  });
  return Object.assign({}, node, { children: (node.children || []).concat(expanded) });
}

/**
 * 注册表单组件到渲染器
 * @param {TokUIRenderer} renderer - 渲染器实例
 */
function registerFormComponents(renderer) {
  const { el, resolveButtonAction } = (typeof require === 'function')
    ? require('../core/renderer')
    : window.TokUI._internal;
  const resolveColor = (typeof require === 'function')
    ? require('./basic').resolveColor
    : window.TokUI._internal.resolveColor;
  const iconSvg = (typeof require === 'function')
    ? require('./icons').iconSvg
    : window.TokUI._internal.iconSvg;
  const _t = (typeof require === 'function')
    ? require('../core/i18n').t
    : window.TokUI._internal.t;

  /**
   * 解析 pre/app 属性值：文本 或 文本|variant
   * @param {string} val
   * @returns {{ text: string, variant: string|null }}
   */
  function parsePreAppValue(val) {
    if (!val) return null;
    var pipeIdx = val.indexOf('|');
    if (pipeIdx === -1) return { text: val, variant: null };
    return { text: val.substring(0, pipeIdx), variant: val.substring(pipeIdx + 1) };
  }

  /**
   * 解析 prebtn/appbtn 属性值：文本:handler 或 文本:handler|variant
   * @param {string} val
   * @returns {{ text: string, handler: string|null, variant: string|null }}
   */
  function parseBtnValue(val) {
    if (!val) return null;
    var pipeIdx = val.indexOf('|');
    var mainPart = pipeIdx === -1 ? val : val.substring(0, pipeIdx);
    var variant = pipeIdx === -1 ? null : val.substring(pipeIdx + 1);
    var colonIdx = mainPart.indexOf(':');
    if (colonIdx === -1) return { text: mainPart, handler: null, variant: variant };
    return { text: mainPart.substring(0, colonIdx), handler: mainPart.substring(colonIdx + 1), variant: variant };
  }

  /**
   * 检测节点是否包含 input-group 属性
   * @param {Object} node
   * @returns {boolean}
   */
  function hasInputGroup(node) {
    var a = node.attrs;
    return !!(a.pre || a.app || a.prebtn || a.appbtn);
  }

  /**
   * 构建 input-group 容器及子元素
   * @param {Object} node
   * @param {HTMLElement} inputEl
   * @returns {HTMLElement}
   */
  function buildInputGroup(node, inputEl) {
    var group = el('div', { class: 'tokui-input-group' });
    if (node.attrs.pre) {
      var parsed = parsePreAppValue(node.attrs.pre);
      var cls = parsed.variant ? 'tokui-input-pre tokui-input-pre--' + parsed.variant : 'tokui-input-pre';
      group.appendChild(el('span', { class: cls }, parsed.text));
    }
    if (node.attrs.prebtn) {
      var parsed = parseBtnValue(node.attrs.prebtn);
      var cls = parsed.variant ? 'tokui-input-prebtn tokui-input-prebtn--' + parsed.variant : 'tokui-input-prebtn';
      var btnAttrs = { class: cls, type: 'button' };
      if (parsed.handler) btnAttrs['data-tokui-clk'] = parsed.handler;
      group.appendChild(el('button', btnAttrs, parsed.text));
    }
    group.appendChild(inputEl);
    if (node.attrs.appbtn) {
      var parsed = parseBtnValue(node.attrs.appbtn);
      var cls = parsed.variant ? 'tokui-input-appbtn tokui-input-appbtn--' + parsed.variant : 'tokui-input-appbtn';
      var btnAttrs = { class: cls, type: 'button' };
      if (parsed.handler) btnAttrs['data-tokui-clk'] = parsed.handler;
      group.appendChild(el('button', btnAttrs, parsed.text));
    }
    if (node.attrs.app) {
      var parsed = parsePreAppValue(node.attrs.app);
      var cls = parsed.variant ? 'tokui-input-app tokui-input-app--' + parsed.variant : 'tokui-input-app';
      group.appendChild(el('span', { class: cls }, parsed.text));
    }
    return group;
  }

  // === 表单容器 ===
  // attrs.act = action 地址, attrs.mtd = method, attrs.sub = 提交事件处理函数名
  renderer.register('form', (node, rc) => {
    const attrs = { class: 'tokui-form' };
    if (node.attrs.id) attrs.id = node.attrs.id;
    if (node.attrs.act) {
      var actUrl = node.attrs.act;
      if (/^javascript:/i.test(actUrl)) actUrl = '#';
      attrs.action = actUrl;
    }
    if (node.attrs.mtd) attrs.method = node.attrs.mtd;
    if (node.attrs.sub) attrs['data-tokui-sub'] = node.attrs.sub;
    if (node.attrs.clk) attrs['data-tokui-clk'] = node.attrs.clk;
    const form = el('form', attrs);
    rc(node.children).forEach(child => {
      if (child && child.nodeType) form.appendChild(child);
    });
    form._slot = form;
    form._tokuiType = 'form';
    return form;
  });

  // === 输入框组件 ===
  // attrs.t = type（默认 text）, attrs.l = 标签, attrs.ph = placeholder
  // attrs.req = 必填, attrs.dis = 禁用, attrs.ro = 只读
  // attrs.v = 变体 (inline/error/success/sm/lg/underline/pill，逗号分隔组合)
  // attrs.val = 初始值, attrs.w = 宽度, attrs.hint = 提示文字
  // attrs.search = 搜索图标（true=左侧, 'right'=右侧）
  // pre/app/prebtn/appbtn 支持 input-group
  var svgSearch = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  renderer.register('input', (node) => {
    var vList = node.attrs.v ? node.attrs.v.split(',').map(function(s) { return s.trim(); }) : [];
    var isInline = vList.indexOf('inline') !== -1;
    var hasSearch = node.attrs.search !== undefined;
    var searchRight = node.attrs.search === 'right';
    var wrapperClass = isInline ? 'tokui-field tokui-field--inline' : 'tokui-field';
    var wrapper = el('div', { class: wrapperClass });
    if (node.attrs.l) {
      var labelAttrs = { class: 'tokui-label' };
      if (node.attrs.id) labelAttrs.for = node.attrs.id;
      if (node.attrs.req !== undefined) labelAttrs.class += ' tokui-label--req';
      wrapper.appendChild(el('label', labelAttrs, node.attrs.l));
    }
    var inputAttrs = { class: 'tokui-input', type: node.attrs.t || 'text' };
    if (node.attrs.id) inputAttrs.id = node.attrs.id;
    if (node.attrs.n) inputAttrs.name = node.attrs.n;
    else if (node.attrs.id) inputAttrs.name = node.attrs.id;
    if (node.attrs.ph) inputAttrs.placeholder = node.attrs.ph;
    if (node.attrs.ml) inputAttrs.maxlength = node.attrs.ml;
    if (node.attrs.min !== undefined) inputAttrs.min = node.attrs.min;
    if (node.attrs.max !== undefined) inputAttrs.max = node.attrs.max;
    if (node.attrs.step !== undefined) inputAttrs.step = node.attrs.step;
    if (node.attrs.req !== undefined) inputAttrs.required = 'required';
    if (node.attrs.dis !== undefined) inputAttrs.disabled = 'disabled';
    if (node.attrs.ro !== undefined) inputAttrs.readonly = 'readonly';
    if (node.attrs.req !== undefined) inputAttrs['aria-required'] = 'true';
    if (vList.indexOf('error') !== -1) inputAttrs['aria-invalid'] = 'true';
    if (node.attrs.pat) inputAttrs.pattern = node.attrs.pat;
    if (node.attrs.val !== undefined) inputAttrs.value = node.attrs.val;
    var inputEl = el('input', inputAttrs);
    // err = 自定义校验错误文案：invalid 时写入 setCustomValidity，输入时清除恢复原生校验
    if (node.attrs.err && typeof inputEl.addEventListener === 'function') {
      inputEl.addEventListener('invalid', function () {
        if (typeof inputEl.setCustomValidity === 'function' && inputEl.validity && !inputEl.validity.customError) {
          inputEl.setCustomValidity(node.attrs.err);
        }
      });
      inputEl.addEventListener('input', function () {
        if (typeof inputEl.setCustomValidity === 'function') inputEl.setCustomValidity('');
      });
    }
    if (node.attrs.w) inputEl.style.width = node.attrs.w;
    // 搜索图标包装
    var searchWrap = null;
    if (hasSearch) {
      searchWrap = el('div', { class: 'tokui-search-input' });
      if (searchRight) searchWrap.classList.add('tokui-search-input--right');
      var iconSpan = el('span', { class: 'tokui-search-input__icon' });
      iconSpan.innerHTML = svgSearch;
      searchWrap.appendChild(iconSpan);
      searchWrap.appendChild(inputEl);
    }
    // 决定挂载内容：searchWrap 或 inputEl
    var mountTarget = searchWrap || inputEl;
    if (hasInputGroup(node)) {
      var group = buildInputGroup(node, mountTarget);
      if (vList.indexOf('pill') !== -1) group.classList.add('tokui-input-group--pill');
      wrapper.appendChild(group);
    } else {
      wrapper.appendChild(mountTarget);
    }
    var hintEl = null;
    if (node.attrs.hint || node.attrs.live !== undefined) {
      hintEl = el('div', { class: 'tokui-field__hint' }, node.attrs.hint || '');
      if (vList.indexOf('error') !== -1) hintEl.classList.add('tokui-field__hint--error');
      else if (vList.indexOf('success') !== -1) hintEl.classList.add('tokui-field__hint--success');
      wrapper.appendChild(hintEl);
    }
    // live 纯前端实时校验：blur 本地 checkValidity，结果写入 hint（零网络）
    if (node.attrs.live !== undefined) _attachLiveValidation(inputEl, hintEl, node.attrs, 'tokui-input');
    wrapper._update = function(uAttrs) {
      if (uAttrs.v !== undefined) inputEl.value = uAttrs.v;
      if (uAttrs.dis === true || uAttrs.dis === 'true') inputEl.disabled = true;
      else if (uAttrs.dis === false || uAttrs.dis === 'false') inputEl.disabled = false;
      if (uAttrs.ph !== undefined) inputEl.placeholder = uAttrs.ph;
      if (uAttrs.ro === true || uAttrs.ro === 'true') inputEl.readOnly = true;
      else if (uAttrs.ro === false || uAttrs.ro === 'false') inputEl.readOnly = false;
      if (uAttrs.hint !== undefined && hintEl) hintEl.textContent = uAttrs.hint;
      // status:error/success → 校验反馈样式（输入框变体类 + hint 配色 + aria-invalid）；其他值清除
      if (uAttrs.status !== undefined) _applyFieldStatus(inputEl, hintEl, uAttrs.status, 'tokui-input');
    };
    wrapper._variantTarget = inputEl;
    return wrapper;
  });

  // === 密码输入框组件 ===
  // 与 input 类似，但 type 固定为 password
  // 支持 v:inline/error/success/sm/lg/underline, pre/app/prebtn/appbtn input-group
  // toggle = 密码显示/隐藏切换按钮, val/w/hint 同 input
  renderer.register('pwd', (node) => {
    var vList = node.attrs.v ? node.attrs.v.split(',').map(function(s) { return s.trim(); }) : [];
    var isInline = vList.indexOf('inline') !== -1;
    var wrapperClass = isInline ? 'tokui-field tokui-field--inline' : 'tokui-field';
    var wrapper = el('div', { class: wrapperClass });
    if (node.attrs.l) {
      var labelAttrs = { class: 'tokui-label' };
      if (node.attrs.id) labelAttrs.for = node.attrs.id;
      if (node.attrs.req !== undefined) labelAttrs.class += ' tokui-label--req';
      wrapper.appendChild(el('label', labelAttrs, node.attrs.l));
    }
    var inputAttrs = { class: 'tokui-input', type: 'password' };
    if (node.attrs.id) inputAttrs.id = node.attrs.id;
    if (node.attrs.n) inputAttrs.name = node.attrs.n;
    else if (node.attrs.id) inputAttrs.name = node.attrs.id;
    if (node.attrs.ph) inputAttrs.placeholder = node.attrs.ph;
    if (node.attrs.ml) inputAttrs.maxlength = node.attrs.ml;
    if (node.attrs.min !== undefined) inputAttrs.min = node.attrs.min;
    if (node.attrs.max !== undefined) inputAttrs.max = node.attrs.max;
    if (node.attrs.req !== undefined) inputAttrs.required = 'required';
    if (node.attrs.dis !== undefined) inputAttrs.disabled = 'disabled';
    if (node.attrs.ro !== undefined) inputAttrs.readonly = 'readonly';
    if (node.attrs.req !== undefined) inputAttrs['aria-required'] = 'true';
    if (vList.indexOf('error') !== -1) inputAttrs['aria-invalid'] = 'true';
    if (node.attrs.val !== undefined) inputAttrs.value = node.attrs.val;
    var inputEl = el('input', inputAttrs);
    if (node.attrs.w) inputEl.style.width = node.attrs.w;
    // 密码显示/隐藏切换按钮
    var toggleBtn = null;
    if (node.attrs.toggle !== undefined && !node.attrs.dis) {
      toggleBtn = el('button', { class: 'tokui-pwd-toggle', type: 'button', tabindex: '-1' });
      toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
      // 睁眼 SVG（密码可见）
      var svgEyeOpen = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      // 闭眼 SVG（密码隐藏）
      var svgEyeClosed = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>';
      toggleBtn.innerHTML = svgEyeClosed; // 默认隐藏密码
      toggleBtn.addEventListener('click', function() {
        var isPassword = inputEl.type === 'password';
        inputEl.type = isPassword ? 'text' : 'password';
        toggleBtn.innerHTML = isPassword ? svgEyeOpen : svgEyeClosed;
        toggleBtn.classList.toggle('tokui-pwd-toggle--active', isPassword);
      });
    }
    if (hasInputGroup(node) || toggleBtn) {
      var group = buildInputGroup(node, inputEl);
      if (toggleBtn) {
        var next = inputEl.nextSibling;
        if (next) group.insertBefore(toggleBtn, next);
        else group.appendChild(toggleBtn);
      }
      wrapper.appendChild(group);
    } else {
      wrapper.appendChild(inputEl);
    }
    var hintEl = null;
    if (node.attrs.hint || node.attrs.live !== undefined) {
      hintEl = el('div', { class: 'tokui-field__hint' }, node.attrs.hint || '');
      if (vList.indexOf('error') !== -1) hintEl.classList.add('tokui-field__hint--error');
      else if (vList.indexOf('success') !== -1) hintEl.classList.add('tokui-field__hint--success');
      wrapper.appendChild(hintEl);
    }
    // live 纯前端实时校验：blur 本地 checkValidity，结果写入 hint（零网络）
    if (node.attrs.live !== undefined) _attachLiveValidation(inputEl, hintEl, node.attrs, 'tokui-input');
    wrapper._update = function(uAttrs) {
      if (uAttrs.v !== undefined) inputEl.value = uAttrs.v;
      if (uAttrs.dis === true || uAttrs.dis === 'true') inputEl.disabled = true;
      else if (uAttrs.dis === false || uAttrs.dis === 'false') inputEl.disabled = false;
      if (uAttrs.ph !== undefined) inputEl.placeholder = uAttrs.ph;
      if (uAttrs.ro === true || uAttrs.ro === 'true') inputEl.readOnly = true;
      else if (uAttrs.ro === false || uAttrs.ro === 'false') inputEl.readOnly = false;
      if (uAttrs.hint !== undefined && hintEl) hintEl.textContent = uAttrs.hint;
      // status:error/success → 校验反馈样式（输入框变体类 + hint 配色 + aria-invalid）；其他值清除
      if (uAttrs.status !== undefined) _applyFieldStatus(inputEl, hintEl, uAttrs.status, 'tokui-input');
    };
    wrapper._variantTarget = inputEl;
    return wrapper;
  });

  // === 多行文本框组件 ===
  // attrs.ph = placeholder, attrs.rows = 行数, attrs.maxrows = 自动高度最大行数
  // attrs.maxlen = 最大字数, attrs.auto = 自动高度, attrs.tx = 初始内容
  // attrs.ro/dis/req 同 input
  renderer.register('textarea', (node, rc) => {
    const wrapper = el('div', { class: 'tokui-field' });
    if (node.attrs.l) {
      const labelAttrs = { class: 'tokui-label' };
      if (node.attrs.id) labelAttrs.for = node.attrs.id;
      if (node.attrs.req !== undefined) labelAttrs.class += ' tokui-label--req';
      wrapper.appendChild(el('label', labelAttrs, node.attrs.l));
    }

    const maxlen = node.attrs.maxlen ? parseInt(node.attrs.maxlen, 10) : 0;
    const isAuto = node.attrs.auto !== undefined;
    const defaultRows = parseInt(node.attrs.rows, 10) || 4;
    const maxRows = node.attrs.maxrows ? parseInt(node.attrs.maxrows, 10) : 0;

    // textarea 容器（用于定位字数统计）
    const box = (maxlen > 0 || isAuto)
      ? el('div', { class: 'tokui-textarea-box' })
      : null;
    if (box) wrapper.appendChild(box);

    const taAttrs = { class: 'tokui-input', rows: String(defaultRows) };
    if (node.attrs.id) taAttrs.id = node.attrs.id;
    if (node.attrs.n) taAttrs.name = node.attrs.n;
    else if (node.attrs.id) taAttrs.name = node.attrs.id;
    if (node.attrs.ph) taAttrs.placeholder = node.attrs.ph;
    if (node.attrs.req !== undefined) taAttrs.required = 'required';
    if (node.attrs.dis !== undefined) taAttrs.disabled = 'disabled';
    if (node.attrs.ro !== undefined) taAttrs.readonly = 'readonly';
    if (node.attrs.req !== undefined) taAttrs['aria-required'] = 'true';
    if (/(^|,)\s*error\s*(,|$)/.test(node.attrs.v || '')) taAttrs['aria-invalid'] = 'true';
    if (maxlen > 0) taAttrs.maxlength = String(maxlen);
    const ta = el('textarea', taAttrs);
    // 内容：children > content > tx 属性
    const text = (node.children && node.children.length > 0)
      ? node.children.map(c => c.content || '').join('')
      : (node.content || node.attrs.tx || '');
    ta.textContent = text;

    // 自动高度：根据内容自适应，最小为默认 rows，maxrows 限制最大行数
    if (isAuto) {
      ta.classList.add('tokui-textarea--auto');
      var minPx = 0;
      var maxPx = 0;
      function autoResize() {
        if (!minPx) {
          // 首次：用 rows 计算最小高度，用 maxrows 计算最大高度
          var savedRows = ta.getAttribute('rows');
          ta.setAttribute('rows', '1');
          var lineH = ta.scrollHeight;
          minPx = lineH * defaultRows;
          maxPx = maxRows > 0 ? lineH * maxRows : 0;
          ta.setAttribute('rows', savedRows);
          // 考虑 padding/border 差异，用实际 scrollHeight 校准
          ta.style.height = 'auto';
          var emptyH = ta.scrollHeight;
          minPx = Math.max(minPx, emptyH);
          ta.style.height = minPx + 'px';
        }
        ta.style.height = 'auto';
        var newH = ta.scrollHeight;
        newH = Math.max(newH, minPx);
        if (maxPx > 0) newH = Math.min(newH, maxPx);
        ta.style.height = newH + 'px';
        // 超过最大高度时出现滚动条
        ta.style.overflow = (maxPx > 0 && ta.scrollHeight > maxPx) ? 'auto' : 'hidden';
      }
      if (ta.addEventListener) {
        ta.addEventListener('input', autoResize);
      }
      setTimeout(autoResize, 0);
    }

    if (box) {
      box.appendChild(ta);
      if (maxlen > 0) {
        const counter = el('span', { class: 'tokui-textarea-counter' });
        counter.textContent = text.length + '/' + maxlen;
        if (text.length > maxlen) counter.classList.add('tokui-textarea-counter--over');
        box.appendChild(counter);
        ta.addEventListener('input', function () {
          var len = ta.value.length;
          counter.textContent = len + '/' + maxlen;
          if (len > maxlen) counter.classList.add('tokui-textarea-counter--over');
          else counter.classList.remove('tokui-textarea-counter--over');
        });
      }
    } else {
      wrapper.appendChild(ta);
    }

    wrapper._update = function(uAttrs) {
      if (uAttrs.v !== undefined) ta.value = uAttrs.v;
      if (uAttrs.dis === true || uAttrs.dis === 'true') ta.disabled = true;
      else if (uAttrs.dis === false || uAttrs.dis === 'false') ta.disabled = false;
      if (uAttrs.ro === true || uAttrs.ro === 'true') ta.readOnly = true;
      else if (uAttrs.ro === false || uAttrs.ro === 'false') ta.readOnly = false;
    };
    wrapper._variantTarget = ta;
    wrapper._slot = ta;
    wrapper._tokuiType = 'textarea';
    return wrapper;
  });

  // === 自定义选择器组件 ===
  // 基于 div/ul/li 实现，支持搜索过滤、键盘导航、单选/多选、标签胶囊
  renderer.register('picker', (node, rc) => {
    const isMulti = node.attrs.multi !== undefined;
    const isDisabled = node.attrs.dis !== undefined;
    const name = node.attrs.n || node.attrs.id || 'picker';
    const placeholder = node.attrs.ph || '';

    const vList = node.attrs.v ? node.attrs.v.split(',').map(s => s.trim()) : [];
    const isInline = vList.indexOf('inline') !== -1;
    const wrapperClass = isInline ? 'tokui-field tokui-field--inline' : 'tokui-field';
    const wrapper = el('div', { class: wrapperClass });
    if (node.attrs.l) {
      const labelAttrs = { class: 'tokui-label' };
      if (node.attrs.id) labelAttrs.for = node.attrs.id;
      wrapper.appendChild(el('label', labelAttrs, node.attrs.l));
    }

    const pickerClasses = ['tokui-picker'];
    if (isMulti) pickerClasses.push('tokui-picker--multi');
    if (isDisabled) pickerClasses.push('tokui-picker--disabled');
    const pickerEl = el('div', { class: pickerClasses.join(' '), 'data-tokui-picker': node.attrs.id || '', role: 'listbox', 'aria-expanded': 'false' });

    // 计算预选初始值
    var initialSingleValue = '';
    var initialSingleText = '';
    if (!isMulti) {
      node.children.forEach(optNode => {
        if (optNode.attrs && optNode.attrs.chk !== undefined) {
          initialSingleValue = optNode.attrs.v || '';
          initialSingleText = (optNode.attrs && optNode.attrs.tx) || initialSingleValue;
        }
      });
    }

    // 控制区
    const control = el('div', { class: 'tokui-picker-control' });
    if (isMulti) {
      node.children.forEach(optNode => {
        if (optNode.attrs && optNode.attrs.chk !== undefined) {
          control.appendChild(_buildPickerTag(optNode, pickerEl, name));
        }
      });
    }
    const searchAttrs = { class: 'tokui-picker-search', type: 'text', autocomplete: 'off' };
    if (placeholder && !initialSingleText) searchAttrs.placeholder = placeholder;
    if (isDisabled) searchAttrs.disabled = 'disabled';
    if (initialSingleText) searchAttrs.value = initialSingleText;
    control.appendChild(el('input', searchAttrs));
    control.appendChild(el('span', { class: 'tokui-picker-arrow' }));
    pickerEl.appendChild(control);

    // 下拉列表
    const dropdown = el('ul', { class: 'tokui-picker-dropdown' });
    node.children.forEach(optNode => {
      dropdown.appendChild(_renderPickerOpt(optNode));
    });
    var pickerEmpty = el('li', { class: 'tokui-picker-empty' }, _t('picker.noMatch'));
    pickerEmpty.style.display = 'none';
    dropdown.appendChild(pickerEmpty);
    pickerEl.appendChild(dropdown);

    // 隐藏 inputs 用于表单提交
    if (!isMulti) {
      pickerEl.appendChild(el('input', { type: 'hidden', name: name, value: initialSingleValue }));
    } else {
      node.children.forEach(optNode => {
        if (optNode.attrs && optNode.attrs.chk !== undefined) {
          pickerEl.appendChild(el('input', { type: 'hidden', name: name, value: optNode.attrs.v || '' }));
        }
      });
    }

    wrapper.appendChild(pickerEl);
    wrapper._variantTarget = pickerEl;
    wrapper._slot = dropdown;
    wrapper._tokuiType = 'picker';

    // 通过 _streamCloseHook 在容器关闭时初始化交互
    // hook 必须挂在 wrapper 上（_streamClose 从 slotStack 取 entry.el = wrapper）
    wrapper._streamCloseHook = function() {
      // 流式模式下 children 在 render 时为空，此处 opt 已全部到达，同步预选状态
      var preselected = dropdown.querySelectorAll('.tokui-picker-option--selected');
      if (!isMulti && preselected.length > 0) {
        var firstSel = preselected[0];
        var search = pickerEl.querySelector('.tokui-picker-search');
        var hidden = pickerEl.querySelector('input[type=hidden]');
        if (search && !search.value) search.value = firstSel.getAttribute('data-text');
        if (hidden && !hidden.value) hidden.value = firstSel.getAttribute('data-value');
      }
      if (isMulti && preselected.length > 0) {
        preselected.forEach(function (opt) {
          var tagText = opt.getAttribute('data-text');
          var tagValue = opt.getAttribute('data-value');
          var tag = el('span', { class: 'tokui-picker-tag', 'data-value': tagValue }, tagText + ' ');
          var close = el('span', { class: 'tokui-picker-tag-close' }, '×');
          tag.appendChild(close);
          control.insertBefore(tag, control.querySelector('.tokui-picker-search'));
          pickerEl.appendChild(el('input', { type: 'hidden', name: name, value: tagValue }));
        });
      }
      if (!isDisabled && typeof document !== 'undefined') {
        _initPickerBehavior(pickerEl, { multi: isMulti, name: name });
      }
    };

    // 重置契约：单选复原 hidden/search/选中项；多选按 data-selected-initial 复原标签与 hidden
    wrapper.setAttribute('data-tokui-resettable', '');
    wrapper._tokuiReset = function () {
      var s = pickerEl.querySelector('.tokui-picker-search');
      var h = pickerEl.querySelector('input[type=hidden]');
      var allOpts = dropdown.querySelectorAll('.tokui-picker-option');
      if (!isMulti) {
        if (s) s.value = initialSingleText;
        if (h) h.value = initialSingleValue;
        allOpts.forEach(function (o) {
          var isSel = !!initialSingleValue && o.getAttribute('data-value') === initialSingleValue;
          o.classList.toggle('tokui-picker-option--selected', isSel);
        });
      } else {
        // 清用户标签与多余 hidden
        control.querySelectorAll('.tokui-picker-tag').forEach(function (t) { control.removeChild(t); });
        pickerEl.querySelectorAll('input[type=hidden][name="' + name + '"]').forEach(function (inp) { pickerEl.removeChild(inp); });
        allOpts.forEach(function (o) {
          var isSel = o.getAttribute('data-selected-initial') === '1';
          o.classList.toggle('tokui-picker-option--selected', isSel);
          if (isSel) {
            var tv = o.getAttribute('data-text');
            var vv = o.getAttribute('data-value');
            var tag = el('span', { class: 'tokui-picker-tag', 'data-value': vv }, tv + ' ');
            tag.appendChild(el('span', { class: 'tokui-picker-tag-close' }, '×'));
            control.insertBefore(tag, s);
            pickerEl.appendChild(el('input', { type: 'hidden', name: name, value: vv }));
          }
        });
      }
    };

    return wrapper;
  });

  /**
   * 渲染 picker 单个选项 li
   */
  function _renderPickerOpt(optNode) {
    const value = (optNode.attrs && optNode.attrs.v) || '';
    const text = (optNode.attrs && optNode.attrs.tx) || value || optNode.content || '';
    const isChecked = optNode.attrs && optNode.attrs.chk !== undefined;
    const liAttrs = { class: 'tokui-picker-option', 'data-value': value, 'data-text': text, 'data-tokui-tag': 'opt', role: 'option', 'aria-selected': String(isChecked) };
    const li = el('li', liAttrs, text);
    if (isChecked) li.classList.add('tokui-picker-option--selected');
    // 记录初始选中态（reset 时按此复原，区别于用户后续交互）
    if (isChecked) li.setAttribute('data-selected-initial', '1');
    return li;
  }

  /**
   * 构建多选标签胶囊
   */
  function _buildPickerTag(optNode, pickerEl, name) {
    const text = (optNode.attrs && optNode.attrs.tx) || (optNode.attrs && optNode.attrs.v) || optNode.content || '';
    const value = (optNode.attrs && optNode.attrs.v) || optNode.content || '';
    const tag = el('span', { class: 'tokui-picker-tag', 'data-value': value }, text + ' ');
    const close = el('span', { class: 'tokui-picker-tag-close' }, '×');
    tag.appendChild(close);
    return tag;
  }

  /**
   * 初始化 picker 交互行为
   */
  function _initPickerBehavior(pickerEl, options) {
    var multi = options.multi;
    var name = options.name;
    var control = pickerEl.querySelector('.tokui-picker-control');
    var search = pickerEl.querySelector('.tokui-picker-search');
    var dropdown = pickerEl.querySelector('.tokui-picker-dropdown');
    var emptyTip = pickerEl.querySelector('.tokui-picker-empty');
    var isOpen = false;
    var activeIndex = -1;

    function getVisibleOptions() {
      return Array.from(dropdown.querySelectorAll('.tokui-picker-option')).filter(function(li) {
        return li.style.display !== 'none';
      });
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      pickerEl.classList.add('tokui-picker--open');
      // fixed 定位：根据 control 的视口位置动态设置 dropdown
      var rect = control.getBoundingClientRect();
      dropdown.style.left = rect.left + 'px';
      dropdown.style.top = (rect.bottom + 4) + 'px';
      dropdown.style.width = rect.width + 'px';
      search.focus();
      activeIndex = -1;
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      pickerEl.classList.remove('tokui-picker--open');
      if (multi) search.value = '';
      filterOptions('');
      resetActive();
    }

    function toggle() {
      if (isOpen) close(); else open();
    }

    function resetActive() {
      var opts = getVisibleOptions();
      opts.forEach(function(li) { li.classList.remove('tokui-picker-option--active'); });
      activeIndex = -1;
    }

    function setActive(idx) {
      var opts = getVisibleOptions();
      resetActive();
      if (idx < 0 || idx >= opts.length) return;
      activeIndex = idx;
      opts[idx].classList.add('tokui-picker-option--active');
      opts[idx].scrollIntoView({ block: 'nearest' });
    }

    function filterOptions(query) {
      var q = query.toLowerCase();
      var allOpts = dropdown.querySelectorAll('.tokui-picker-option');
      var visibleCount = 0;
      allOpts.forEach(function(li) {
        var match = !q || li.getAttribute('data-text').toLowerCase().indexOf(q) !== -1;
        li.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });
      emptyTip.style.display = visibleCount === 0 ? '' : 'none';
      resetActive();
    }

    function selectOption(li) {
      var value = li.getAttribute('data-value');
      var text = li.getAttribute('data-text');
      if (multi) {
        toggleMultiSelect(li, value, text);
      } else {
        singleSelect(li, value, text);
      }
    }

    function singleSelect(li, value, text) {
      dropdown.querySelectorAll('.tokui-picker-option--selected').forEach(function(opt) {
        opt.classList.remove('tokui-picker-option--selected');
      });
      li.classList.add('tokui-picker-option--selected');
      search.value = text;
      var hidden = pickerEl.querySelector('input[type=hidden]');
      if (hidden) hidden.value = value;
      close();
    }

    function toggleMultiSelect(li, value, text) {
      var isSelected = li.classList.toggle('tokui-picker-option--selected');
      if (isSelected) {
        addTag(value, text);
        addHiddenInput(value);
      } else {
        removeTag(value);
        removeHiddenInput(value);
      }
      search.value = '';
      search.focus();
    }

    function addTag(value, text) {
      var tag = el('span', { class: 'tokui-picker-tag', 'data-value': value }, text + ' ');
      var closeBtn = el('span', { class: 'tokui-picker-tag-close' }, '×');
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var opt = dropdown.querySelector('.tokui-picker-option[data-value="' + value + '"]');
        if (opt) opt.classList.remove('tokui-picker-option--selected');
        removeTag(value);
        removeHiddenInput(value);
      });
      tag.appendChild(closeBtn);
      control.insertBefore(tag, search);
    }

    function removeTag(value) {
      var tag = control.querySelector('.tokui-picker-tag[data-value="' + value + '"]');
      if (tag) control.removeChild(tag);
    }

    function addHiddenInput(value) {
      pickerEl.appendChild(el('input', { type: 'hidden', name: name, value: value }));
    }

    function removeHiddenInput(value) {
      var inputs = pickerEl.querySelectorAll('input[type=hidden][name="' + name + '"]');
      inputs.forEach(function(inp) {
        if (inp.value === value) pickerEl.removeChild(inp);
      });
    }

    // 点击控制区展开/收起
    control.addEventListener('click', function(e) {
      if (e.target.classList.contains('tokui-picker-tag-close')) return;
      toggle();
    });

    // 搜索过滤
    search.addEventListener('input', function() {
      if (!isOpen) open();
      filterOptions(search.value);
    });

    // 键盘导航
    search.addEventListener('keydown', function(e) {
      var opts = getVisibleOptions();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) open();
        setActive(activeIndex < opts.length - 1 ? activeIndex + 1 : 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) open();
        setActive(activeIndex > 0 ? activeIndex - 1 : opts.length - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < opts.length) {
          selectOption(opts[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        close();
      } else if (e.key === 'Backspace' && multi && search.value === '') {
        var tags = control.querySelectorAll('.tokui-picker-tag');
        if (tags.length > 0) {
          var lastTag = tags[tags.length - 1];
          var val = lastTag.getAttribute('data-value');
          var opt = dropdown.querySelector('.tokui-picker-option[data-value="' + val + '"]');
          if (opt) opt.classList.remove('tokui-picker-option--selected');
          removeTag(val);
          removeHiddenInput(val);
        }
      }
    });

    // 点击选项
    dropdown.addEventListener('click', function(e) {
      var li = e.target.closest('.tokui-picker-option');
      if (li) selectOption(li);
    });

    // 点击外部关闭
    document.addEventListener('click', function(e) {
      if (!pickerEl.contains(e.target)) close();
    });

    // 为初始预选标签绑定 close 事件
    control.querySelectorAll('.tokui-picker-tag-close').forEach(function(closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var tag = closeBtn.parentElement;
        var value = tag.getAttribute('data-value');
        var opt = dropdown.querySelector('.tokui-picker-option[data-value="' + value + '"]');
        if (opt) opt.classList.remove('tokui-picker-option--selected');
        removeTag(value);
        removeHiddenInput(value);
      });
    });
  }

  // === 下拉选择组件 ===
  // 子节点为 opt 选项，multi 属性启用多选
  renderer.register('select', (node, rc) => {
    // opt:"..." 简写 → 合成 opt 子节点（一次性渲染路径）
    node = _expandOptChildren(node);
    const isMulti = node.attrs.multi !== undefined;
    const vList = node.attrs.v ? node.attrs.v.split(',').map(s => s.trim()) : [];
    const isInline = vList.indexOf('inline') !== -1;
    const wrapperClass = isInline ? 'tokui-field tokui-field--inline' : 'tokui-field';
    const wrapper = el('div', { class: wrapperClass });
    if (node.attrs.l) {
      const labelAttrs = { class: 'tokui-label' };
      if (node.attrs.id && !isMulti) labelAttrs.for = node.attrs.id;
      if (node.attrs.req !== undefined) labelAttrs.class += ' tokui-label--req';
      wrapper.appendChild(el('label', labelAttrs, node.attrs.l));
    }
    const selectAttrs = { class: 'tokui-select' };
    if (isMulti) selectAttrs.multiple = true;
    if (node.attrs.id) selectAttrs.id = node.attrs.id;
    if (node.attrs.n) selectAttrs.name = node.attrs.n;
    else if (node.attrs.id) selectAttrs.name = node.attrs.id;
    if (node.attrs.req !== undefined) selectAttrs['aria-required'] = 'true';
    if (vList.indexOf('error') !== -1) selectAttrs['aria-invalid'] = 'true';
    const select = el('select', selectAttrs);
    if (node.attrs.ph) {
      const phOpt = el('option', { value: '', disabled: '', selected: '' }, node.attrs.ph);
      select.appendChild(phOpt);
    }
    rc(node.children).forEach(child => {
      if (child && child.nodeType) select.appendChild(child);
    });
    wrapper.appendChild(select);
    wrapper._update = function(uAttrs) {
      if (uAttrs.v !== undefined) select.value = uAttrs.v;
      if (uAttrs.dis === true || uAttrs.dis === 'true') select.disabled = true;
      else if (uAttrs.dis === false || uAttrs.dis === 'false') select.disabled = false;
    };
    wrapper._variantTarget = select;
    wrapper._slot = select;        // 插槽指向 select 元素
    wrapper._tokuiType = 'select';
    return wrapper;
  });

  // === 单选按钮组组件 ===
  // 子节点为 opt 选项，同一组 radio 共享 name 属性
  renderer.register('radio', (node, rc) => {
    // opt:"..." 简写 → 合成 opt 子节点
    node = _expandOptChildren(node);
    const vList = node.attrs.v ? node.attrs.v.split(',').map(s => s.trim()) : [];
    const isInline = vList.indexOf('inline') !== -1;
    const wrapperClass = isInline ? 'tokui-field tokui-field--inline' : 'tokui-field';
    const wrapper = el('div', { class: wrapperClass });
    if (node.attrs.l) {
      wrapper.appendChild(el('div', { class: 'tokui-label' }, node.attrs.l));
    }
    const isVertical = vList.indexOf('vertical') !== -1;
    const group = el('div', { class: 'tokui-radio-group' + (isVertical ? ' tokui-radio-group--vertical' : ''), role: 'radiogroup' });
    if (node.attrs.id) group.id = node.attrs.id;
    const radioName = node.attrs.n || node.attrs.id || 'radio';
    group._radioName = radioName; // 存储共享 name，供子 opt 渲染时读取
    node.children.forEach(optNode => {
      group.appendChild(_renderRadioOpt(optNode, radioName));
    });
    wrapper.appendChild(group);
    wrapper._slot = group;
    wrapper._tokuiType = 'radio';
    return wrapper;
  });

  /**
   * 渲染单个 radio 选项
   * @param {Object} optNode - opt 节点
   * @param {string} radioName - radio 的 name 属性值
   * @returns {HTMLElement} label 元素（包含 input 和文本）
   */
  function _renderRadioOpt(optNode, radioName) {
    const label = el('label', { class: 'tokui-radio-item' });
    // opt 在 radio 内不走 render()（radio 需注入共享 name），手动补 data-tokui-tag 印章，
    // 供文档 Playground 点击代码行定位（见 src/core/renderer.js render() 统一盖章逻辑）。
    label.setAttribute('data-tokui-tag', 'opt');
    const inputAttrs = { type: 'radio', name: radioName, class: 'tokui-radio-input' };
    if (optNode.attrs && optNode.attrs.v) inputAttrs.value = optNode.attrs.v;
    if (optNode.attrs && optNode.attrs.chk !== undefined) inputAttrs.checked = 'checked';
    label.appendChild(el('input', inputAttrs));
    const displayText = (optNode.attrs && optNode.attrs.tx) || (optNode.attrs && optNode.attrs.v) || optNode.content || '';
    label.appendChild(el('span', { class: 'tokui-radio-text' }, displayText));
    return label;
  }

  /**
   * 渲染单个 checkbox 选项（多选组用）
   * @param {Object} optNode - opt 节点 { attrs: { v, tx, chk } }
   * @param {string} cbName - 共享 name
   * @returns {HTMLElement} label 元素
   */
  function _renderCheckboxOpt(optNode, cbName) {
    const label = el('label', { class: 'tokui-checkbox-item' });
    label.setAttribute('data-tokui-tag', 'opt');
    const inputAttrs = { type: 'checkbox', name: cbName, class: 'tokui-checkbox-input' };
    if (optNode.attrs && optNode.attrs.v !== undefined) inputAttrs.value = optNode.attrs.v;
    if (optNode.attrs && optNode.attrs.chk !== undefined) inputAttrs.checked = 'checked';
    label.appendChild(el('input', inputAttrs));
    const displayText = (optNode.attrs && optNode.attrs.tx) || (optNode.attrs && optNode.attrs.v) || optNode.content || '';
    label.appendChild(el('span', { class: 'tokui-checkbox-text' }, displayText));
    return label;
  }

  // === 选项组件 ===
  // 根据父级类型自动适配：
  // - 在 radio 内 → 渲染为 radio 选项
  // - 在 picker 内 → 渲染为 picker 选项 li
  // - 在 select 内 → 渲染为 <option>
  renderer.register('opt', (node, rc, parentType) => {
    if (parentType === 'radio') {
      return _renderRadioOpt(node, '');
    }
    if (parentType === 'checkbox') {
      return _renderCheckboxOpt(node, '');
    }
    if (parentType === 'picker') {
      return _renderPickerOpt(node);
    }
    const value = node.attrs ? node.attrs.v : '';
    const text = (node.attrs && node.attrs.tx) || value || node.content || '';
    return el('option', { value: value }, text);
  });

  // === 复选框组件（三态）===
  // 1) 无 opt 属性且无子节点 → 单布尔复选框（legacy）
  // 2) opt:"v:label;..." 属性 → 简写多选（原子展开）
  // 3) 有子节点（容器模式，multi 标记触发）→ 多选组
  renderer.register('checkbox', (node, rc) => {
    // opt:"..." 简写 → 合成 opt 子节点（与 radio/select 共用 _expandOptChildren）
    node = _expandOptChildren(node);
    // 多选组判定：有子节点 / 显式 multi 标记（multi 无子节点也渲染空组，见 spec §9）
    var isGroup = (node.children && node.children.length > 0) || node.attrs.multi !== undefined;

    if (!isGroup) {
      // —— 单布尔（legacy，保持原逻辑）——
      const vList = node.attrs.v ? node.attrs.v.split(',').map(s => s.trim()) : [];
      const isInline = vList.indexOf('inline') !== -1;
      var cb = el('label', { class: 'tokui-checkbox' + (isInline ? ' tokui-checkbox--inline' : ''), role: 'checkbox', 'aria-checked': String(node.attrs.chk !== undefined) });
      const inputAttrs = { type: 'checkbox', class: 'tokui-checkbox-input' };
      if (node.attrs.id) inputAttrs.id = node.attrs.id;
      if (node.attrs.n) inputAttrs.name = node.attrs.n;
      else if (node.attrs.id) inputAttrs.name = node.attrs.id;
      if (node.attrs.chk !== undefined) inputAttrs.checked = 'checked';
      const input = el('input', inputAttrs);
      cb.appendChild(input);
      cb.appendChild(el('span', { class: 'tokui-checkbox-text' }, node.attrs.l || ''));
      input.addEventListener('change', function() { cb.setAttribute('aria-checked', String(input.checked)); });
      if (!isInline) {
        var field = el('div', { class: 'tokui-field' });
        field.appendChild(cb);
        return field;
      }
      return cb;
    }

    // —— 多选组 ——
    const vList = node.attrs.v ? node.attrs.v.split(',').map(s => s.trim()) : [];
    const isInline = vList.indexOf('inline') !== -1;
    const wrapperClass = isInline ? 'tokui-field tokui-field--inline' : 'tokui-field';
    const wrapper = el('div', { class: wrapperClass });
    if (node.attrs.l) {
      wrapper.appendChild(el('div', { class: 'tokui-label' }, node.attrs.l));
    }
    const cbName = node.attrs.n || node.attrs.id || 'checkbox';
    const isVertical = vList.indexOf('vertical') !== -1;
    const group = el('div', { class: 'tokui-checkbox-group' + (isVertical ? ' tokui-checkbox-group--vertical' : ''), role: 'group' });
    group._checkboxName = cbName; // 供流式 opt 注入共享 name（见 renderer.js）
    if (node.attrs.id) group.id = node.attrs.id;
    // 统一遍历 opt 子节点（简写合成的 + 容器真实的；流式路径由 renderer.js 特判挂载）
    // 与 radio 对称：直接遍历并注入共享 cbName（不走 rc()，否则 opt 分发只能拿到空 name）
    if (node.children && node.children.length) {
      node.children.forEach(function (optNode) {
        group.appendChild(_renderCheckboxOpt(optNode, cbName));
      });
    }
    wrapper.appendChild(group);
    wrapper._slot = group;
    wrapper._tokuiType = 'checkbox';
    return wrapper;
  });

  // === 开关组件 ===
  // attrs.l = 标签文本, attrs.chk = 默认选中, attrs.dis = 禁用
  // attrs.clk = change handler, attrs.id, attrs.n, attrs.v
  renderer.register('switch', (node) => {
    var wrapper = el('label', { class: 'tokui-switch' });
    // label 已包裹 input，无需 for 属性；否则若把 id 移到 wrapper 会导致 for 指向自己
    var inputAttrs = { type: 'checkbox', class: 'tokui-switch-input' };
    if (node.attrs.n) inputAttrs.name = node.attrs.n;
    else if (node.attrs.id) inputAttrs.name = node.attrs.id;
    if (node.attrs.v) inputAttrs.value = node.attrs.v;
    if (node.attrs.chk !== undefined) inputAttrs.checked = 'checked';
    if (node.attrs.dis !== undefined) inputAttrs.disabled = 'disabled';
    wrapper.appendChild(el('input', inputAttrs));
    var track = el('span', { class: 'tokui-switch__track', role: 'switch', 'aria-checked': String(!!inputAttrs.checked) });
    wrapper.appendChild(track);
    if (node.attrs.l) {
      wrapper.appendChild(el('span', { class: 'tokui-switch__label' }, node.attrs.l));
    }
    var input = wrapper.querySelector('.tokui-switch-input');
    input.addEventListener('change', function() {
      track.setAttribute('aria-checked', String(input.checked));
    });
    if (node.attrs.clk && renderer.eventBus) {
      var handler = renderer.eventBus.getHandler(node.attrs.clk);
      if (handler) {
        input.addEventListener('change', function(e) {
          handler(null, e, wrapper);
        });
      }
    }
    wrapper._update = function(uAttrs) {
      if (uAttrs.chk === true || uAttrs.chk === 'true') { input.checked = true; track.setAttribute('aria-checked', 'true'); }
      else if (uAttrs.chk === false || uAttrs.chk === 'false') { input.checked = false; track.setAttribute('aria-checked', 'false'); }
      if (uAttrs.dis === true || uAttrs.dis === 'true') input.disabled = true;
      else if (uAttrs.dis === false || uAttrs.dis === 'false') input.disabled = false;
    };
    // 让 upd 指令通过 id 找到 wrapper（upd 用 getElementById）
    if (node.attrs.id) {
      wrapper.id = node.attrs.id;
    }
    var switchInit = node.attrs.chk !== undefined;
    wrapper.setAttribute('data-tokui-resettable', '');
    wrapper._tokuiReset = function () {
      input.checked = switchInit;
      track.setAttribute('aria-checked', String(switchInit));
    };
    return wrapper;
  });

  // === 滑块组件 ===
  // attrs.l = 标签, attrs.min/max/step/v = 范围参数, attrs.dis = 禁用
  // attrs.clk = change handler, attrs.id, attrs.n
  renderer.register('slider', (node) => {
    var min = parseFloat(node.attrs.min) || 0;
    var max = parseFloat(node.attrs.max) || 100;
    var step = parseFloat(node.attrs.step) || 1;
    var value = parseFloat(node.attrs.v) || 0;
    if (value < min) value = min;
    if (value > max) value = max;

    var field = el('div', { class: 'tokui-field' });
    if (node.attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label', for: node.attrs.id || '' }, node.attrs.l));
    }

    var slider = el('div', { class: 'tokui-slider' });
    var track = el('div', { class: 'tokui-slider__track' });
    var fill = el('div', { class: 'tokui-slider__fill' });
    var thumb = el('div', { class: 'tokui-slider__thumb', role: 'slider', 'aria-valuemin': String(min), 'aria-valuemax': String(max), 'aria-valuenow': String(value), 'aria-label': node.attrs.l || 'Slider', tabindex: '0' });
    var valSpan = el('span', { class: 'tokui-slider__value' }, String(value));
    var hidden = el('input', { type: 'hidden' });
    if (node.attrs.id) hidden.id = node.attrs.id;
    if (node.attrs.n) hidden.name = node.attrs.n;
    else if (node.attrs.id) hidden.name = node.attrs.id;
    hidden.value = value;

    track.appendChild(fill);
    track.appendChild(thumb);
    slider.appendChild(track);
    slider.appendChild(valSpan);
    slider.appendChild(hidden);

    var pct = ((value - min) / (max - min)) * 100;
    fill.style.width = pct + '%';
    thumb.style.left = pct + '%';

    if (node.attrs.dis !== undefined) {
      slider.classList.add('tokui-slider--disabled');
    } else {
      var onDrag = function(e) {
        e.preventDefault();
        var rect = track.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var ratio = (clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio));
        var raw = min + ratio * (max - min);
        var snapped = Math.round(raw / step) * step;
        snapped = Math.max(min, Math.min(max, snapped));
        var floatFix = step < 1 ? Math.pow(10, Math.ceil(-Math.log10(step))) : 1;
        snapped = Math.round(snapped * floatFix) / floatFix;
        value = snapped;
        var p = ((value - min) / (max - min)) * 100;
        fill.style.width = p + '%';
        thumb.style.left = p + '%';
        valSpan.textContent = String(value);
        hidden.value = value;
        thumb.setAttribute('aria-valuenow', String(value));
      };
      var onEnd = function() {
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', onEnd);
        thumb.classList.remove('tokui-slider__thumb--dragging');
        if (node.attrs.clk) {
          var handler = renderer.eventBus ? renderer.eventBus.getHandler(node.attrs.clk) : null;
          if (handler) handler({ value: value, id: node.attrs.id });
        }
      };
      var onStart = function(e) {
        e.preventDefault();
        onDrag(e);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onDrag);
        document.addEventListener('touchend', onEnd);
        thumb.classList.add('tokui-slider__thumb--dragging');
      };
      slider.addEventListener('mousedown', onStart);
      slider.addEventListener('touchstart', onStart, { passive: false });
    }

    field._update = function(uAttrs) {
      if (uAttrs.v !== undefined) {
        var newVal = parseFloat(uAttrs.v) || 0;
        if (!isNaN(min)) newVal = Math.max(min, newVal);
        if (!isNaN(max)) newVal = Math.min(max, newVal);
        value = newVal;
        var p = ((value - min) / (max - min)) * 100;
        fill.style.width = p + '%';
        thumb.style.left = p + '%';
        valSpan.textContent = String(value);
        hidden.value = value;
        thumb.setAttribute('aria-valuenow', String(value));
      }
      if (uAttrs.dis === true || uAttrs.dis === 'true') {
        slider.classList.add('tokui-slider--disabled');
      } else if (uAttrs.dis === false || uAttrs.dis === 'false') {
        slider.classList.remove('tokui-slider--disabled');
      }
    };
    // 重置契约：复原初始值（hidden + 视觉）
    var sliderInit = value;
    field.setAttribute('data-tokui-resettable', '');
    field._tokuiReset = function () {
      value = sliderInit;
      var p = ((value - min) / (max - min)) * 100;
      fill.style.width = p + '%';
      thumb.style.left = p + '%';
      valSpan.textContent = String(value);
      hidden.value = value;
      thumb.setAttribute('aria-valuenow', String(value));
    };
    slider._variantTarget = slider;
    field.appendChild(slider);
    return field;
  });

  // === 评分组件 ===
  // attrs.l = 标签, attrs.v = 初始值, attrs.max = 最大星数(默认5)
  // attrs.clk = click handler, attrs.dis = 禁用, attrs.tx = 自定义字符
  renderer.register('rate', (node) => {
    var max = parseInt(node.attrs.max) || 5;
    var current = parseInt(node.attrs.v) || 0;
    var charOn = node.attrs.tx || '★';
    var charOff = '☆';

    var field = el('div', { class: 'tokui-field' });
    if (node.attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label', for: node.attrs.id || '' }, node.attrs.l));
    }

    var rate = el('div', { class: 'tokui-rate', role: 'radiogroup', 'aria-label': node.attrs.l || _t('rate.defaultLabel'), tabindex: '0' });
    var hidden = el('input', { type: 'hidden' });
    if (node.attrs.id) hidden.id = node.attrs.id;
    if (node.attrs.n) hidden.name = node.attrs.n;
    else if (node.attrs.id) hidden.name = node.attrs.id;
    hidden.value = current;

    var stars = [];
    for (var i = 0; i < max; i++) {
      var star = el('span', { class: 'tokui-rate__star', 'data-index': String(i + 1), role: 'radio', 'aria-checked': String(i < current) });
      star.textContent = i < current ? charOn : charOff;
      if (i < current) star.classList.add('tokui-rate__star--active');
      stars.push(star);
      rate.appendChild(star);
    }
    var textSpan = el('span', { class: 'tokui-rate__text' });
    if (current > 0) textSpan.textContent = current + '/' + max;
    rate.appendChild(textSpan);
    rate.appendChild(hidden);

    if (node.attrs.ro !== undefined) {
      // 只读模式：报告/结果展示用，不可操作（不加 opacity 暗化，配色由 --readonly 规则保证可读）
      rate.classList.add('tokui-rate--readonly');
    } else if (node.attrs.dis === undefined) {
      rate.addEventListener('mouseover', function(e) {
        var t = e.target;
        if (!t.classList.contains('tokui-rate__star')) return;
        var idx = parseInt(t.getAttribute('data-index'));
        for (var j = 0; j < stars.length; j++) {
          stars[j].textContent = j < idx ? charOn : charOff;
          stars[j].classList.toggle('tokui-rate__star--hover', j < idx);
        }
      });
      rate.addEventListener('mouseout', function() {
        for (var j = 0; j < stars.length; j++) {
          stars[j].textContent = j < current ? charOn : charOff;
          stars[j].classList.remove('tokui-rate__star--hover');
        }
      });
      rate.addEventListener('click', function(e) {
        var t = e.target;
        if (!t.classList.contains('tokui-rate__star')) return;
        var idx = parseInt(t.getAttribute('data-index'));
        current = (current === idx) ? 0 : idx;
        hidden.value = current;
        textSpan.textContent = current > 0 ? current + '/' + max : '';
        for (var j = 0; j < stars.length; j++) {
          stars[j].textContent = j < current ? charOn : charOff;
          stars[j].classList.toggle('tokui-rate__star--active', j < current);
          stars[j].setAttribute('aria-checked', String(j < current));
        }
        if (node.attrs.clk) {
          var handler = renderer.eventBus ? renderer.eventBus.getHandler(node.attrs.clk) : null;
          if (handler) handler({ value: current, max: max, id: node.attrs.id });
        }
      });
      // 键盘导航：ArrowRight/Up 增，ArrowLeft/Down 减
      rate.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          current = Math.min(current + 1, max);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          current = Math.max(current - 1, 0);
        } else {
          return;
        }
        hidden.value = current;
        textSpan.textContent = current > 0 ? current + '/' + max : '';
        for (var j = 0; j < stars.length; j++) {
          stars[j].textContent = j < current ? charOn : charOff;
          stars[j].classList.toggle('tokui-rate__star--active', j < current);
          stars[j].setAttribute('aria-checked', String(j < current));
        }
      });
    } else {
      rate.classList.add('tokui-rate--disabled');
    }

    field._update = function(uAttrs) {
      if (uAttrs.v !== undefined) {
        current = parseInt(uAttrs.v) || 0;
        if (current > max) current = max;
        if (current < 0) current = 0;
        hidden.value = current;
        textSpan.textContent = current > 0 ? current + '/' + max : '';
        for (var j = 0; j < stars.length; j++) {
          stars[j].textContent = j < current ? charOn : charOff;
          stars[j].classList.toggle('tokui-rate__star--active', j < current);
          stars[j].setAttribute('aria-checked', String(j < current));
        }
      }
      if (uAttrs.dis === true || uAttrs.dis === 'true') {
        rate.classList.add('tokui-rate--disabled');
      } else if (uAttrs.dis === false || uAttrs.dis === 'false') {
        rate.classList.remove('tokui-rate--disabled');
      }
    };
    var rateInit = current;
    field.setAttribute('data-tokui-resettable', '');
    field._tokuiReset = function () {
      current = rateInit;
      hidden.value = current;
      textSpan.textContent = current > 0 ? current + '/' + max : '';
      for (var j = 0; j < stars.length; j++) {
        stars[j].textContent = j < current ? charOn : charOff;
        stars[j].classList.toggle('tokui-rate__star--active', j < current);
        stars[j].setAttribute('aria-checked', String(j < current));
      }
    };
    rate._variantTarget = rate;
    field.appendChild(rate);
    return field;
  });

  // === 穿梭框组件 ===
  // attrs.l = 标签, attrs.tt = 左标题, attrs.tt2 = 右标题
  // attrs.clk = change handler, attrs.id, attrs.dis
  // 子节点: opt(v, tx, chk)
  renderer.register('transfer', (node, rc) => {
    var field = el('div', { class: 'tokui-field' });
    if (node.attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label' }, node.attrs.l));
    }

    var transfer = el('div', { class: 'tokui-transfer' });

    function makePanel(title) {
      var panel = el('div', { class: 'tokui-transfer__panel', role: 'listbox' });
      var header = el('div', { class: 'tokui-transfer__header' });
      var checkAll = el('input', { type: 'checkbox', class: 'tokui-transfer__check-all' });
      header.appendChild(checkAll);
      header.appendChild(el('span', {}, title));
      var count = el('span', { class: 'tokui-transfer__count' }, '0/0');
      header.appendChild(count);
      panel.appendChild(header);
      var body = el('div', { class: 'tokui-transfer__body' });
      panel.appendChild(body);
      panel._body = body;
      panel._header = header;
      panel._checkAll = checkAll;
      panel._count = count;
      panel._items = [];
      // 全选/取消全选
      checkAll.addEventListener('change', function() {
        var checked = checkAll.checked;
        panel._items.forEach(function(item) { item._cb.checked = checked; });
        updateCount(panel);
      });
      return panel;
    }

    function makeItem(val, text, optIdx) {
      var label = el('label', { class: 'tokui-transfer__item', role: 'option', 'aria-selected': 'false' });
      // transfer 按 chk 把 opt 拆到左右两栏，DOM 序 ≠ DSL 序；盖 data-tokui-tag + data-tokui-idx，
      // Playground 按 idx 排序后定位（见 docs Playground onLineClick）。
      label.setAttribute('data-tokui-tag', 'opt');
      if (optIdx !== undefined) label.setAttribute('data-tokui-idx', String(optIdx));
      var cb = el('input', { type: 'checkbox', value: val });
      label.appendChild(cb);
      label.appendChild(el('span', {}, text));
      label._cb = cb;
      // 单个 checkbox 变化时同步全选状态和计数
      cb.addEventListener('change', function() {
        var panel = label.closest('.tokui-transfer__panel');
        if (panel) {
          updateCount(panel);
        }
      });
      return label;
    }

    var leftTitle = node.attrs.tt || 'Source';
    var rightTitle = node.attrs.tt2 || 'Target';
    var leftPanel = makePanel(leftTitle);
    var rightPanel = makePanel(rightTitle);

    // 高度属性：h=固定高度（min/max/height 三者同值，内容滚动）；
    // mh=最大高度（覆盖默认 320px，少内容时仍按 min-height 收缩）。
    // 纯数字按 px，其余（如 40vh）原样透传。
    function normSize(v) { return /^\d+$/.test(String(v).trim()) ? (String(v).trim() + 'px') : String(v).trim(); }
    [leftPanel, rightPanel].forEach(function(panel) {
      if (node.attrs.h) {
        var hv = normSize(node.attrs.h);
        panel.style.height = hv;
        panel.style.minHeight = hv;
        panel.style.maxHeight = hv;
      } else if (node.attrs.mh) {
        panel.style.maxHeight = normSize(node.attrs.mh);
      }
    });

    var actions = el('div', { class: 'tokui-transfer__actions' });
    var btnRight = el('button', { class: 'tokui-transfer__btn', type: 'button' }, '→');
    var btnLeft = el('button', { class: 'tokui-transfer__btn', type: 'button' }, '←');
    actions.appendChild(btnRight);
    actions.appendChild(btnLeft);

    var hidden = el('input', { type: 'hidden' });
    if (node.attrs.id) hidden.id = node.attrs.id;
    if (node.attrs.n) hidden.name = node.attrs.n;
    else if (node.attrs.id) hidden.name = node.attrs.id;

    function updateHidden() {
      var vals = rightPanel._items.map(function(item) { return item._cb.value; });
      hidden.value = vals.join(',');
    }

    function updateCount(panel) {
      var checked = panel._items.filter(function(item) { return item._cb.checked; }).length;
      panel._count.textContent = checked + '/' + panel._items.length;
      panel._checkAll.checked = checked > 0 && checked === panel._items.length;
    }

    function moveChecked(from, to) {
      var moved = [];
      from._items = from._items.filter(function(item) {
        if (item._cb.checked) {
          item._cb.checked = false;
          to._body.appendChild(item);
          to._items.push(item);
          moved.push(item);
          return false;
        }
        return true;
      });
      updateCount(from);
      updateCount(to);
      updateHidden();
      if (node.attrs.clk && moved.length > 0) {
        var handler = renderer.eventBus ? renderer.eventBus.getHandler(node.attrs.clk) : null;
        if (handler) handler({ values: rightPanel._items.map(function(i) { return i._cb.value; }), id: node.attrs.id });
      }
    }

    function populatePanels(children) {
      // opt 在本 transfer 内的出现序（= DSL 内 opt 序），供 Playground 定位。
      // 计数器挂在 field 上，与流式追加 _tokuiTransferAppend 共享（两者互斥：mount 整批 vs 流式逐个）。
      (children || []).forEach(function(child) {
        if (child.type === 'opt') {
          appendOpt(child);
        }
      });
      updateCount(leftPanel);
      updateCount(rightPanel);
      updateHidden();
    }

    // 单个 opt 追加到对应栏（chk→右，否则→左）。mount 整批与流式逐个共用，保证 idx 连续。
    function appendOpt(optNode) {
      var val = (optNode.attrs && optNode.attrs.v) || '';
      var text = (optNode.attrs && optNode.attrs.tx) || val;
      var chk = optNode.attrs && optNode.attrs.chk !== undefined;
      var item = makeItem(val, text, field._transferOptIdx++);
      // 记录初始栏位（reset 时按此归位）
      item.setAttribute('data-tokui-init-side', chk ? 'right' : 'left');
      if (chk) {
        rightPanel._body.appendChild(item);
        rightPanel._items.push(item);
      } else {
        leftPanel._body.appendChild(item);
        leftPanel._items.push(item);
      }
      updateCount(leftPanel);
      updateCount(rightPanel);
      updateHidden();
      return item;
    }

    btnRight.addEventListener('click', function() { moveChecked(leftPanel, rightPanel); });
    btnLeft.addEventListener('click', function() { moveChecked(rightPanel, leftPanel); });

    // opt 出现序计数器（mount 整批 / 流式逐个共用），供 data-tokui-idx 定位
    field._transferOptIdx = 0;

    // 隐藏的暂存区：流式期间 opt 已被 _streamChild 提前拦截走 appendOpt（不进 staging），
    // staging 仅兜底拦截可能的非 opt 子节点渲染，避免误显。
    var staging = el('div', {});
    staging.style.display = 'none';

    transfer.appendChild(leftPanel);
    transfer.appendChild(actions);
    transfer.appendChild(rightPanel);
    transfer.appendChild(hidden);
    transfer.appendChild(staging);

    if (node.attrs.dis !== undefined) {
      transfer.classList.add('tokui-transfer--disabled');
    }

    // 真流式追加钩子：流式模式下每个 opt 子节点到达时由 renderer._streamChild 调用，
    // 立即追加到对应栏并更新计数/hidden，边收边显（不再等 [/transfer] 整批渲染）。
    field._tokuiTransferAppend = function(optNode) {
      return appendOpt(optNode);
    };

    // mount 模式（节点带完整 children）：直接整批填充
    if (node.children && node.children.length) {
      populatePanels(node.children);
    }

    // 容器关闭：仅清暂存区。流式 opt 已逐个追加，无需整批重填（否则与 mount 路径双重填充）。
    field._streamCloseHook = function() {
      staging.innerHTML = '';
    };

    field._slot = staging;
    field._tokuiType = 'transfer';
    transfer._variantTarget = transfer;
    // 重置契约：每项按 data-tokui-init-side 归位，清空勾选，重算计数/hidden
    field.setAttribute('data-tokui-resettable', '');
    field._tokuiReset = function () {
      var allItems = leftPanel._items.concat(rightPanel._items);
      allItems.forEach(function (item) {
        var side = item.getAttribute('data-tokui-init-side') || 'left';
        var target = side === 'right' ? rightPanel : leftPanel;
        var current = (rightPanel._items.indexOf(item) !== -1) ? rightPanel : leftPanel;
        if (current !== target) {
          current._items.splice(current._items.indexOf(item), 1);
          target._body.appendChild(item);
          target._items.push(item);
        }
        if (item._cb) item._cb.checked = false;
      });
      updateCount(leftPanel);
      updateCount(rightPanel);
      updateHidden();
    };
    field.appendChild(transfer);
    return field;
  });

  // === 数字输入框组件（自闭合）===
  // attrs.v = 值(默认0), attrs.min = 最小值, attrs.max = 最大值, attrs.step = 步长(默认1)
  // attrs.dis = 禁用, attrs.n = name, attrs.id, attrs.l = 标签
  renderer.register('numinput', (node) => {
    var min = parseFloat(node.attrs.min);
    var max = parseFloat(node.attrs.max);
    var step = parseFloat(node.attrs.step) || 1;
    var value = parseFloat(node.attrs.v) || 0;
    if (!isNaN(min)) value = Math.max(min, value);
    if (!isNaN(max)) value = Math.min(max, value);
    var isDisabled = node.attrs.dis !== undefined;

    var field = el('div', { class: 'tokui-field' });
    if (node.attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label' }, node.attrs.l));
    }

    var wrapper = el('div', { class: 'tokui-numinput' + (isDisabled ? ' tokui-numinput--disabled' : '') });

    // 减少按钮
    var minusBtn = el('button', {
      class: 'tokui-numinput__btn tokui-numinput__btn--minus',
      type: 'button'
    });
    minusBtn.textContent = '−'; // minus sign
    wrapper.appendChild(minusBtn);

    // 数字输入
    var inputAttrs = {
      class: 'tokui-numinput__input',
      type: 'text',
      value: String(value)
    };
    if (node.attrs.id) inputAttrs.id = node.attrs.id;
    // 不设 name，表单提交由 hidden input 负责
    if (isDisabled) inputAttrs.disabled = 'disabled';
    var input = el('input', inputAttrs);
    wrapper.appendChild(input);

    // 增加按钮
    var plusBtn = el('button', {
      class: 'tokui-numinput__btn tokui-numinput__btn--plus',
      type: 'button'
    });
    plusBtn.textContent = '+'; // plus sign
    wrapper.appendChild(plusBtn);

    // hidden input 用于表单
    var hiddenAttrs = { type: 'hidden' };
    if (node.attrs.n) hiddenAttrs.name = node.attrs.n;
    else if (node.attrs.id) hiddenAttrs.name = node.attrs.id;
    hiddenAttrs.value = String(value);
    var hidden = el('input', hiddenAttrs);
    wrapper.appendChild(hidden);

    if (!isDisabled) {
      function clamp(val) {
        if (!isNaN(min)) val = Math.max(min, val);
        if (!isNaN(max)) val = Math.min(max, val);
        return val;
      }

      function updateValue(newVal) {
        var floatFix = step < 1 ? Math.pow(10, Math.ceil(-Math.log10(step))) : 1;
        newVal = Math.round(newVal * floatFix) / floatFix;
        newVal = clamp(newVal);
        value = newVal;
        input.value = String(value);
        hidden.value = value;
      }

      minusBtn.addEventListener('click', function() {
        updateValue(value - step);
      });

      plusBtn.addEventListener('click', function() {
        updateValue(value + step);
      });

      input.addEventListener('change', function() {
        var parsed = parseFloat(input.value);
        if (isNaN(parsed)) parsed = 0;
        updateValue(parsed);
      });
    }

    field._update = function(uAttrs) {
      if (uAttrs.v !== undefined) {
        var newVal = parseFloat(uAttrs.v) || 0;
        if (!isNaN(min)) newVal = Math.max(min, newVal);
        if (!isNaN(max)) newVal = Math.min(max, newVal);
        value = newVal;
        input.value = String(value);
        hidden.value = value;
      }
      if (uAttrs.dis === true || uAttrs.dis === 'true') {
        input.disabled = true;
        wrapper.classList.add('tokui-numinput--disabled');
      } else if (uAttrs.dis === false || uAttrs.dis === 'false') {
        input.disabled = false;
        wrapper.classList.remove('tokui-numinput--disabled');
      }
    };
    var numInit = value;
    field.setAttribute('data-tokui-resettable', '');
    field._tokuiReset = function () {
      value = numInit;
      input.value = String(value);
      input.setAttribute('value', String(value));
      hidden.value = value;
    };
    field.appendChild(wrapper);
    field._variantTarget = wrapper;
    return field;
  });

  // === 按钮组件 ===
  // attrs.t = 样式类型(primary/danger/...) 或语义 submit, attrs.tx = text
  // 内置动作（renderer 自动解析，无需 registerHandler）：
  //   sub:H       → 提交绑定表单 + 收集数据 + 调 handler H
  //   t:'submit'  → 提交语义（type=submit + _doSubmit 校验闸门）；clk:H 作提交 handler，
  //                 无 clk 时回退表单自身 sub；不在 form 内时退化为普通点击
  //   reset[:H]   → 重置绑定表单（+ post-reset 回调 H）
  //   print:T     → 打印 target 指定的 print-area/card（T='self' 表最近祖先）
  //   clk:H       → 普通点击 handler（走 event-bus）
  // attrs.form:ID = 显式绑定表单（优先于 DOM 祖先推断）
  // attrs.w/bg/fc/radius = 自定义样式
  var BTN_STYLES = new Set(['primary', 'danger', 'success', 'warning', 'ghost', 'sm', 'lg', 'pill', 'square', 'block']);

  renderer.register('btn', (node) => {
    // 统一动作解析：btn 渲染与 renderer.bindEvents 分发共用同一来源
    const action = resolveButtonAction(node.attrs);
    var btnType = action.act === 'submit' ? 'submit'
      : action.act === 'reset' ? 'reset' : 'button';
    var cls = 'tokui-btn';
    // t 属性映射为 CSS 变体 class
    if (node.attrs.t && BTN_STYLES.has(node.attrs.t)) {
      cls += ' tokui-btn--' + node.attrs.t;
    }
    // 打印动作加语义类（样式可区分 + 打印预览隐藏用 data-tokui-print-trigger）
    if (action.act === 'print') cls += ' tokui-btn--print';
    const attrs = { class: cls, type: btnType };
    // 显式表单绑定
    if (action.formId) attrs['data-tokui-form'] = action.formId;
    // 内置动作印章（renderer.bindEvents 按 act 分发）
    if (action.act) attrs['data-tokui-act'] = action.act;
    if (action.act === 'submit' && action.handler) attrs['data-tokui-sub'] = action.handler; // 向后兼容旧 sub 链路
    if (action.act === 'reset' && action.handler) attrs['data-tokui-handler'] = action.handler;
    if (action.act === 'print') {
      attrs['data-tokui-target'] = action.target;
      // 触发器印章：@media print 时隐藏自身，不进打印预览
      attrs['data-tokui-print-trigger'] = '';
    }
    // 无内置动作的普通点击
    if (!action.act && action.handler) attrs['data-tokui-clk'] = action.handler;
    if (node.attrs.id) attrs.id = node.attrs.id;
    if (node.attrs.dis !== undefined) attrs.disabled = 'disabled';
    Object.keys(node.attrs).forEach(key => {
      if (key.startsWith('data-')) attrs[key] = node.attrs[key];
    });
    let style = '';
    const safeW = _safeCssSize(node.attrs.w);
    if (safeW) style += 'width:' + safeW + ';';
    const bgColor = resolveColor(node.attrs.bg);
    if (bgColor) style += 'background:' + bgColor + ';';
    const textColor = resolveColor(node.attrs.fc);
    if (textColor) style += 'color:' + textColor + ';';
    const safeRadius = _safeCssSize(node.attrs.radius);
    if (safeRadius) style += 'border-radius:' + safeRadius + ';';
    if (style) attrs.style = style;
    const text = node.attrs.tx || node.content || '';
    const iconName = node.attrs.icon;
    const emoji = node.attrs.i;
    const iconHtml = iconName ? iconSvg(iconName, 16) : '';
    const hasIcon = !!(iconName || emoji);

    const btn = el('button', attrs);
    btn._tokuiType = 'btn';

    // icon-only 模式：无文字但有图标 → 紧凑钮 + aria-label + CSS tooltip
    const iconOnly = !text && hasIcon;
    if (iconOnly) {
      btn.classList.add('tokui-btn--icon-only');
      const label = node.attrs.l || node.attrs.tt || iconName || '';
      if (label) {
        btn.setAttribute('aria-label', label);
        btn.setAttribute('data-tokui-tip', label);
      }
    }

    // 注图标 span（SVG 优先，否则 emoji；icon 属性存在即建 span，未知名留空不崩）
    if (iconName) {
      const iconSpan = el('span', { class: 'tokui-btn__icon' });
      iconSpan.innerHTML = iconHtml;
      btn.appendChild(iconSpan);
      btn.classList.add('tokui-btn--has-icon');
    } else if (emoji) {
      const iconSpan = el('span', { class: 'tokui-btn__icon tokui-btn__icon--emoji' }, emoji);
      btn.appendChild(iconSpan);
      btn.classList.add('tokui-btn--has-icon');
    }

    // 注文字 span（引用存档，供 _update 精准更新）
    let textSpan = null;
    if (text) {
      textSpan = el('span', { class: 'tokui-btn__text' }, text);
      btn.appendChild(textSpan);
    }
    btn._tokuiTextSpan = textSpan;

    btn._update = function (uAttrs) {
      if (uAttrs.dis === true || uAttrs.dis === 'true') btn.disabled = true;
      else if (uAttrs.dis === false || uAttrs.dis === 'false') btn.disabled = false;
      if (uAttrs.tx !== undefined && textSpan) textSpan.textContent = uAttrs.tx;
    };
    return btn;
  });

  // === 打印区容器 ===
  // 标记一块 1:1 打印区域。配合 [btn print:ID] 触发，打印时仅该区可见。
  // attrs.id = 打印区标识（btn print:ID 引用），attrs.tt = 可选标题
  renderer.register('print-area', (node, rc) => {
    const attrs = { class: 'tokui-print-area' };
    if (node.attrs.id) attrs.id = node.attrs.id;
    const area = el('div', attrs);
    if (node.attrs.tt) {
      area.appendChild(el('div', { class: 'tokui-print-area__title' }, node.attrs.tt));
    }
    const body = el('div', { class: 'tokui-print-area__body' });
    rc(node.children).forEach(child => {
      if (child && child.nodeType) body.appendChild(child);
    });
    area.appendChild(body);
    area._slot = body;       // 子内容插槽指向 body
    area._tokuiType = 'print-area';
    return area;
  });

  // === 按钮组容器 ===
  renderer.register('btngroup', (node, rc) => {
    const attrs = { class: 'tokui-btn-group' };
    if (node.attrs.id) attrs.id = node.attrs.id;
    const group = el('div', attrs);
    rc(node.children).forEach(child => {
      if (child && child.nodeType) group.appendChild(child);
    });
    group._slot = group;
    group._tokuiType = 'btngroup';
    return group;
  });

  // === 级联选择器 ===
  // 容器组件，子节点为扁平 opt，通过 p 属性指定父级
  // attrs: id, l(标签), ph(placeholder), dis(禁用), clk(事件), v(预选路径), n(name)
  renderer.register('cascader', (node, rc) => {
    var isDisabled = node.attrs.dis !== undefined;
    var placeholder = node.attrs.ph || _t('select.placeholder');

    var field = el('div', { class: 'tokui-field' });
    if (node.attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label' }, node.attrs.l));
    }
    if (node.attrs.id) field.id = node.attrs.id;

    var cascaderEl = el('div', { class: 'tokui-cascader' + (isDisabled ? ' tokui-cascader--disabled' : ''), role: 'combobox', 'aria-expanded': 'false' });

    // 控制栏（显示选中路径）
    var control = el('div', { class: 'tokui-cascader-control' });
    var searchInput = el('input', {
      class: 'tokui-cascader-input',
      type: 'text',
      readonly: 'readonly',
      placeholder: placeholder
    });
    var arrow = el('span', { class: 'tokui-cascader-arrow' });
    control.appendChild(searchInput);
    control.appendChild(arrow);
    cascaderEl.appendChild(control);

    // 下拉面板容器
    var menus = el('div', { class: 'tokui-cascader-menus', role: 'listbox' });
    cascaderEl.appendChild(menus);

    // hidden input 用于表单提交
    var hidden = el('input', { type: 'hidden' });
    if (node.attrs.n) hidden.name = node.attrs.n;
    else if (node.attrs.id) hidden.name = node.attrs.id;
    cascaderEl.appendChild(hidden);

    // 流式 staging
    var staging = el('div', {});
    staging.style.display = 'none';
    cascaderEl.appendChild(staging);

    field.appendChild(cascaderEl);

    // 构建级联树数据
    function buildCascaderTree(children) {
      var map = {};
      var roots = [];
      (children || []).forEach(function(child) {
        if (child.type !== 'opt') return;
        var val = child.attrs.v || '';
        var text = child.attrs.tx || val;
        var parent = child.attrs.p || '';
        map[val] = { v: val, tx: text, p: parent, children: [] };
      });
      Object.keys(map).forEach(function(key) {
        var item = map[key];
        if (item.p && map[item.p]) {
          map[item.p].children.push(item);
        } else {
          roots.push(item);
        }
      });
      return roots;
    }

    // 渲染菜单列
    function renderMenuColumn(items) {
      var col = el('div', { class: 'tokui-cascader-menu' });
      items.forEach(function(item) {
        var optEl = el('div', {
          class: 'tokui-cascader-option' + (item.children.length ? ' tokui-cascader-option--expand' : ''),
          'data-value': item.v,
          'data-text': item.tx
        });
        optEl.textContent = item.tx;
        col.appendChild(optEl);
      });
      return col;
    }

    // 高亮列中指定值的选项
    function highlightOption(col, val) {
      col.querySelectorAll('.tokui-cascader-option').forEach(function(o) {
        o.classList.toggle('tokui-cascader-option--active', o.getAttribute('data-value') === val);
      });
    }

    // 沿树查找节点，返回从根到该节点的完整路径（含自身）
    function findPathToNode(tree, targetVal) {
      function search(nodes, path) {
        for (var i = 0; i < nodes.length; i++) {
          var newPath = path.concat([{ v: nodes[i].v, tx: nodes[i].tx, node: nodes[i] }]);
          if (nodes[i].v === targetVal) return newPath;
          var found = search(nodes[i].children, newPath);
          if (found) return found;
        }
        return null;
      }
      return search(tree, []);
    }

    // 根据已选路径重建菜单列
    // activeValues: 已选中的各级值数组（如 ['zhejiang', 'hangzhou']）
    function rebuildMenus(tree, activeValues) {
      menus.innerHTML = '';
      var currentNodes = tree;
      // 渲染每一级已选的列
      for (var i = 0; i < activeValues.length; i++) {
        var col = renderMenuColumn(currentNodes);
        highlightOption(col, activeValues[i]);
        menus.appendChild(col);
        // 进入下一级
        var found = false;
        for (var j = 0; j < currentNodes.length; j++) {
          if (currentNodes[j].v === activeValues[i]) {
            currentNodes = currentNodes[j].children;
            found = true;
            break;
          }
        }
        if (!found) break;
      }
      // 渲染当前级（可选项）
      if (currentNodes && currentNodes.length) {
        menus.appendChild(renderMenuColumn(currentNodes));
      }
    }

    // 交互状态（挂在 cascaderEl 上避免重复绑定）
    var state = cascaderEl._cascaderState = cascaderEl._cascaderState || { isOpen: false, activeValues: [], tree: null };

    function openMenus(tree) {
      if (isDisabled) return;
      state.isOpen = true;
      state.tree = tree;
      cascaderEl.classList.add('tokui-cascader--open');
      cascaderEl.setAttribute('aria-expanded', 'true');
      var rect = control.getBoundingClientRect();
      menus.style.left = rect.left + 'px';
      menus.style.top = (rect.bottom + 4) + 'px';
      menus.style.minWidth = rect.width + 'px';
      rebuildMenus(tree, state.activeValues);
    }

    function closeMenus() {
      state.isOpen = false;
      state.activeValues = [];
      cascaderEl.classList.remove('tokui-cascader--open');
      cascaderEl.setAttribute('aria-expanded', 'false');
    }

    // 只绑定一次事件（检查标记避免重复绑定）
    if (!cascaderEl._cascaderBindDone) {
      cascaderEl._cascaderBindDone = true;

      control.addEventListener('click', function(e) {
        e.stopPropagation();
        if (state.isOpen) closeMenus();
        else if (state.tree) openMenus(state.tree);
      });

      menus.addEventListener('click', function(e) {
        e.stopPropagation();
        var optEl = e.target.closest('.tokui-cascader-option');
        if (!optEl) return;
        var val = optEl.getAttribute('data-value');
        var tx = optEl.getAttribute('data-text');
        if (!state.tree) return;

        var path = findPathToNode(state.tree, val);
        if (!path) return;
        var clickedNode = path[path.length - 1].node;

        // 高亮当前选项
        var col = optEl.parentElement;
        highlightOption(col, val);

        if (clickedNode.children.length > 0) {
          // 非叶子：更新路径到当前节点，展开下一级
          state.activeValues = path.map(function(p) { return p.v; });
          rebuildMenus(state.tree, state.activeValues);
        } else {
          // 叶子：选中完成
          var pathText = path.map(function(p) { return p.tx; }).join(' / ');
          var pathValue = path.map(function(p) { return p.v; }).join('/');
          searchInput.value = pathText;
          hidden.value = pathValue;
          closeMenus();
          if (node.attrs.clk) {
            var handler = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal && window.TokUI._internal.TokUIEventBus)
              ? window.TokUI._internal.TokUIEventBus.getHandler(node.attrs.clk) : null;
            if (handler) handler({ id: node.attrs.id, value: pathValue, text: pathText, path: path });
          }
        }
      });

      // 外部点击关闭
      if (typeof document !== 'undefined') {
        document.addEventListener('click', function() {
          if (state.isOpen) closeMenus();
        });
      }
    }

    // 设置树数据并初始化
    var cascaderInit = { hidden: '', text: '' };
    function setupTree(tree) {
      state.tree = tree;
      // 预选值
      if (node.attrs.v) {
        var prePath = String(node.attrs.v).split('/');
        var valid = true;
        var pathTexts = [];
        var currentNodes = tree;
        for (var pi = 0; pi < prePath.length; pi++) {
          var found = false;
          for (var ci = 0; ci < currentNodes.length; ci++) {
            if (currentNodes[ci].v === prePath[pi]) {
              pathTexts.push(currentNodes[ci].tx);
              currentNodes = currentNodes[ci].children;
              found = true;
              break;
            }
          }
          if (!found) { valid = false; break; }
        }
        if (valid && pathTexts.length === prePath.length) {
          searchInput.value = pathTexts.join(' / ');
          hidden.value = node.attrs.v;
        }
      }
      // 捕获初始值供 reset 复原（mount 与流式关闭均会走到）
      cascaderInit.hidden = hidden.value;
      cascaderInit.text = searchInput.value;
    }

    // mount 模式
    if (node.children && node.children.length) {
      setupTree(buildCascaderTree(node.children));
    }

    // 流式模式
    field._streamCloseHook = function() {
      staging.innerHTML = '';
      setupTree(buildCascaderTree(node.children));
    };
    field._slot = staging;
    field._tokuiType = 'cascader';
    field._variantTarget = cascaderEl;
    // 重置契约：复原 hidden/搜索文本并关闭面板
    field.setAttribute('data-tokui-resettable', '');
    field._tokuiReset = function () {
      hidden.value = cascaderInit.hidden;
      searchInput.value = cascaderInit.text;
      if (state.isOpen) closeMenus();
    };

    return field;
  });

  // === 文件上传 ===
  // 自闭合组件，拖拽/点击上传
  // attrs: id, l(标签), ph(提示文字), accept(文件类型), multi(多选), dis(禁用), clk(事件), max(最大数), n(name)
  renderer.register('upload', (node) => {
    var isDisabled = node.attrs.dis !== undefined;
    var isMulti = node.attrs.multi !== undefined;
    var maxFiles = parseInt(node.attrs.max) || 0;
    var placeholder = node.attrs.ph || _t('upload.hint');
    var accept = node.attrs.accept || '';

    var field = el('div', { class: 'tokui-field' });
    if (node.attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label' }, node.attrs.l));
    }
    if (node.attrs.id) field.id = node.attrs.id;

    var upload = el('div', { class: 'tokui-upload' + (isDisabled ? ' tokui-upload--disabled' : '') });

    // 拖拽区域
    var dropzone = el('div', { class: 'tokui-upload-dropzone', role: 'button', 'aria-label': placeholder, tabindex: '0' });
    var icon = el('div', { class: 'tokui-upload-icon' });
    icon.innerHTML = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 32V12"/><path d="M16 20l8-8 8 8"/><path d="M8 36h32"/></svg>';
    dropzone.appendChild(icon);
    var text = el('div', { class: 'tokui-upload-text' });
    text.textContent = placeholder;
    dropzone.appendChild(text);
    var browseBtn = el('button', { class: 'tokui-upload-btn', type: 'button' });
    browseBtn.textContent = _t('upload.browse');
    dropzone.appendChild(browseBtn);
    upload.appendChild(dropzone);

    // 隐藏的 file input
    var fileInputAttrs = { type: 'file', style: 'display:none' };
    if (accept) fileInputAttrs.accept = accept;
    if (isMulti) fileInputAttrs.multiple = 'multiple';
    var fileInput = el('input', fileInputAttrs);
    upload.appendChild(fileInput);

    // 文件列表
    var fileList = el('div', { class: 'tokui-upload-filelist' });
    upload.appendChild(fileList);

    // hidden input 用于表单
    var hidden = el('input', { type: 'hidden' });
    if (node.attrs.n) hidden.name = node.attrs.n;
    else if (node.attrs.id) hidden.name = node.attrs.id;
    upload.appendChild(hidden);

    // 工具函数
    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    }

    var selectedFiles = [];

    function renderFileList() {
      fileList.innerHTML = '';
      selectedFiles.forEach(function(f, idx) {
        var item = el('div', { class: 'tokui-upload-file' });
        var fileIcon = el('span', { class: 'tokui-upload-file-icon' });
        fileIcon.textContent = '📄';
        item.appendChild(fileIcon);
        var name = el('span', { class: 'tokui-upload-file-name' });
        name.textContent = f.name;
        name.title = f.name;
        item.appendChild(name);
        var size = el('span', { class: 'tokui-upload-file-size' });
        size.textContent = formatSize(f.size);
        item.appendChild(size);
        var remove = el('span', { class: 'tokui-upload-file-remove' });
        remove.textContent = '✕';
        remove.setAttribute('data-idx', idx);
        item.appendChild(remove);
        fileList.appendChild(item);
      });
      hidden.value = selectedFiles.map(function(f) { return f.name; }).join(',');
    }

    function addFiles(files) {
      for (var i = 0; i < files.length; i++) {
        if (maxFiles && selectedFiles.length >= maxFiles) break;
        selectedFiles.push({ name: files[i].name, size: files[i].size, type: files[i].type });
      }
      renderFileList();
      if (node.attrs.clk) {
        var handler = renderer.eventBus ? renderer.eventBus.getHandler(node.attrs.clk) : null;
        if (handler) handler({ id: node.attrs.id, files: selectedFiles });
      }
    }

    if (!isDisabled) {
      // 点击浏览
      dropzone.addEventListener('click', function(e) {
        if (e.target === browseBtn || dropzone.contains(e.target)) {
          fileInput.click();
        }
      });
      browseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        fileInput.click();
      });

      fileInput.addEventListener('change', function() {
        if (fileInput.files && fileInput.files.length) {
          addFiles(fileInput.files);
          fileInput.value = '';
        }
      });

      // 拖拽
      dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        upload.classList.add('tokui-upload--dragover');
      });
      dropzone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        upload.classList.remove('tokui-upload--dragover');
      });
      dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        upload.classList.remove('tokui-upload--dragover');
        if (e.dataTransfer && e.dataTransfer.files.length) {
          addFiles(e.dataTransfer.files);
        }
      });

      // 删除文件
      fileList.addEventListener('click', function(e) {
        var removeBtn = e.target.closest('.tokui-upload-file-remove');
        if (!removeBtn) return;
        var idx = parseInt(removeBtn.getAttribute('data-idx'));
        if (!isNaN(idx) && idx >= 0 && idx < selectedFiles.length) {
          selectedFiles.splice(idx, 1);
          renderFileList();
        }
      });
    }

    field.appendChild(upload);
    field._variantTarget = upload;
    return field;
  });

  // === 日期时间工具函数 ===

  /**
   * 解析日期字符串（支持 YYYY-MM-DD 和 YYYY-MM-DD HH:mm 等格式）
   */
  function parseDateValue(val) {
    if (!val) return null;
    var match = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }

  function parseDateTimeValue(val) {
    if (!val) return null;
    var match = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), parseInt(match[4]), parseInt(match[5]));
  }

  /**
   * 按格式化模板格式化日期
   * 支持 YYYY, MM, DD, HH, mm, ss 占位符
   */
  function formatDate(date, fmt) {
    var y = date.getFullYear();
    var M = date.getMonth() + 1;
    var d = date.getDate();
    var H = date.getHours();
    var m = date.getMinutes();
    var s = date.getSeconds();
    return fmt
      .replace('YYYY', String(y))
      .replace('MM', M < 10 ? '0' + M : String(M))
      .replace('DD', d < 10 ? '0' + d : String(d))
      .replace('HH', H < 10 ? '0' + H : String(H))
      .replace('mm', m < 10 ? '0' + m : String(m))
      .replace('ss', s < 10 ? '0' + s : String(s));
  }

  /**
   * 格式化时间
   */
  function formatTime(h, m, s, fmt) {
    return fmt
      .replace('HH', h < 10 ? '0' + h : String(h))
      .replace('mm', m < 10 ? '0' + m : String(m))
      .replace('ss', s < 10 ? '0' + s : String(s));
  }

  /**
   * 构建时间选择滚轮列
   * @param {string} label - 列标签
   * @param {number} count - 总数 (24 或 60)
   * @param {number} selected - 初始选中值
   * @returns {HTMLElement} 列容器
   */
  /**
   * 只更新高亮项（滚动中调用：只读，绝不写 scrollTop → 不与手势/原生 snap 打架）
   */
  function highlightColumn(col, index) {
    var list = col.querySelector('.tokui-timepicker-column-list');
    if (!list) return;
    var items = list.querySelectorAll('.tokui-timepicker-column-item');
    if (!items.length) return;
    if (index < 0) index = 0;
    if (index > items.length - 1) index = items.length - 1;
    items.forEach(function(item, i) {
      item.classList.toggle('tokui-timepicker-column-item--selected', i === index);
    });
  }

  /**
   * 设置列选中项：高亮 + 滚动使其居中（点击/打开回填，单次写入）
   * 自适应公式：scrollTop = offsetTop + h/2 - clientHeight/2
   * 配合 CSS（border-box 可见窗 + ::before/::after 占位 + scroll-padding + snap-align:center），
   * 居中点与原生 snap 目标天然一致，无需硬编码常数
   */
  function setColumnSelected(col, index) {
    highlightColumn(col, index);
    var list = col.querySelector('.tokui-timepicker-column-list');
    if (!list) return;
    var items = list.querySelectorAll('.tokui-timepicker-column-item');
    if (!items.length) return;
    if (index < 0) index = 0;
    if (index > items.length - 1) index = items.length - 1;
    var item = items[index];
    var h = item.offsetHeight || 32;
    // offsetTop 相对 list（list 设 position:relative）；clientHeight = 可见窗高
    if (list.clientHeight && item.offsetTop !== undefined) {
      var target = item.offsetTop + h / 2 - list.clientHeight / 2;
      if (Math.abs(list.scrollTop - target) > 1) list.scrollTop = target;
    }
  }

  /**
   * 读取列当前居中项索引（基于几何，自适应 padding/高度）
   */
  function getColumnIndex(col) {
    var list = col.querySelector('.tokui-timepicker-column-list');
    if (!list) return 0;
    var items = list.querySelectorAll('.tokui-timepicker-column-item');
    if (!items.length) return 0;
    // 优先几何法：找最接近列表可视中线的 item（精确，含所有几何）
    if (items[0].getBoundingClientRect && list.getBoundingClientRect) {
      var lc = list.getBoundingClientRect();
      var center = lc.top + lc.height / 2;
      var best = 0, bestDist = Infinity;
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        var d = Math.abs((r.top + r.height / 2) - center);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best;
    }
    // 兜底（Node 测试环境无几何）：按 scrollTop 估算
    var itemHeight = items[0].offsetHeight || 32;
    var idx = Math.round((list.scrollTop + (list.clientHeight || 192) / 2) / itemHeight) - 0;
    return Math.max(0, Math.min(idx, items.length - 1));
  }

  function buildTimeColumn(label, count, selected) {
    var col = el('div', { class: 'tokui-timepicker-column' });
    var list = el('div', { class: 'tokui-timepicker-column-list' });
    for (var i = 0; i < count; i++) {
      var item = el('div', {
        class: 'tokui-timepicker-column-item' + (i === selected ? ' tokui-timepicker-column-item--selected' : ''),
        'data-value': String(i)
      }, i < 10 ? '0' + i : String(i));
      // 关键修复：点击直接选中该项（原先仅靠滚动，点击无任何响应）
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(this.getAttribute('data-value'), 10);
        setColumnSelected(col, idx);
      });
      list.appendChild(item);
    }
    col.appendChild(list);
    // 滚动时（滚轮/拖拽）实时同步高亮项
    var scrollRaf = 0;
    var raf = (typeof window !== 'undefined' && window.requestAnimationFrame)
      ? window.requestAnimationFrame : function(cb) { setTimeout(cb, 16); };
    list.addEventListener('scroll', function() {
      if (scrollRaf) return;
      scrollRaf = 1;
      // 仅高亮，不写 scrollTop（交给原生 scroll-snap 顺滑吸附）
      raf(function() { scrollRaf = 0; highlightColumn(col, getColumnIndex(col)); });
    });
    col._label = label;
    return col;
  }

  /**
   * 获取列当前选中值（确认时调用，读取滚动位置并回填高亮）
   */
  function getSelectedValue(col) {
    var index = getColumnIndex(col);
    highlightColumn(col, index);
    var list = col.querySelector('.tokui-timepicker-column-list');
    var items = list.querySelectorAll('.tokui-timepicker-column-item');
    return parseInt(items[index].getAttribute('data-value')) || 0;
  }

  /**
   * 滚动到选中值（打开时调用，复用居中逻辑）
   */
  function scrollToSelected(col, value) {
    setColumnSelected(col, value);
  }

  /**
   * 全局面板注册表：实现"同时仅一个打开" + "页面滚动关闭"
   * 存放各 picker 实例的 closePanel 函数引用
   */
  var _datePickers = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
    ? (window.TokUI._internal._datePickers = window.TokUI._internal._datePickers || new Set())
    : new Set();

  // 打开新面板前调用：关闭其它已开面板，再登记自己
  function registerOpenPicker(closeFn) {
    var others = [];
    _datePickers.forEach(function(fn) { if (fn !== closeFn) others.push(fn); });
    others.forEach(function(fn) { try { fn(); } catch (e) {} });
    _datePickers.add(closeFn);
  }
  function unregisterPicker(closeFn) { _datePickers.delete(closeFn); }
  function closeAllPickers() {
    var all = [];
    _datePickers.forEach(function(fn) { all.push(fn); });
    _datePickers.clear();
    all.forEach(function(fn) { try { fn(); } catch (e) {} });
  }

  // 页面滚动 → 关闭所有面板（scroll 不冒泡，window 监听仅接视口滚动，
  // 不会误关时间列内部滚动）。全局只绑一次。
  if (typeof window !== 'undefined' && !window.TokUI._internal._dateScrollBound) {
    window.addEventListener('scroll', closeAllPickers);
    window.TokUI._internal._dateScrollBound = true;
  }

  // 视口宽度（右溢出保护用），各环境兜底
  function getViewportWidth() {
    if (typeof window !== 'undefined' && window.innerWidth) return window.innerWidth;
    if (typeof document !== 'undefined' && document.documentElement && document.documentElement.clientWidth) {
      return document.documentElement.clientWidth;
    }
    return 1024;
  }

  /**
   * 渲染日历网格（复用于 datepicker 和 datetimepicker）
   * @param {number} year - 年
   * @param {number} month - 月(0-based)
   * @param {Date} selectedDate - 已选日期
   * @param {Date} now - 当前时间
   * @param {HTMLElement} container - 要追加到的容器
   * @returns {{ prevBtn: HTMLElement, nextBtn: HTMLElement }}
   */
  function renderCalendarGrid(year, month, selectedDate, now, container) {
    // 头部导航
    var header = el('div', { class: 'tokui-datepicker-header' });
    var prevBtn = el('button', { class: 'tokui-datepicker-nav tokui-datepicker-nav--prev', type: 'button' });
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    var nextBtn = el('button', { class: 'tokui-datepicker-nav tokui-datepicker-nav--next', type: 'button' });
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    var titleEl = el('span', { class: 'tokui-datepicker-title' }, _t('datepicker.title', { y: year, m: month + 1 }));
    header.appendChild(prevBtn);
    header.appendChild(titleEl);
    header.appendChild(nextBtn);
    container.appendChild(header);

    // 星期头
    var weekdays = [_t('datepicker.weekday.0'), _t('datepicker.weekday.1'), _t('datepicker.weekday.2'), _t('datepicker.weekday.3'), _t('datepicker.weekday.4'), _t('datepicker.weekday.5'), _t('datepicker.weekday.6')];
    var weekdayRow = el('div', { class: 'tokui-datepicker-weekdays' });
    weekdays.forEach(function(d) {
      weekdayRow.appendChild(el('span', { class: 'tokui-datepicker-weekday' }, d));
    });
    container.appendChild(weekdayRow);

    // 日期网格
    var grid = el('div', { class: 'tokui-datepicker-grid' });
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevMonthDays = new Date(year, month, 0).getDate();
    var todayDate = now.getDate();
    var isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

    // 上月填充
    for (var i = firstDay - 1; i >= 0; i--) {
      grid.appendChild(el('span', { class: 'tokui-datepicker-day tokui-datepicker-day--other' }, String(prevMonthDays - i)));
    }
    // 本月
    for (var d = 1; d <= daysInMonth; d++) {
      var dayClasses = ['tokui-datepicker-day'];
      if (isCurrentMonth && d === todayDate) dayClasses.push('tokui-datepicker-day--today');
      if (selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === d) {
        dayClasses.push('tokui-datepicker-day--selected');
      }
      var dayEl = el('span', { class: dayClasses.join(' '), 'data-day': String(d) }, String(d));
      grid.appendChild(dayEl);
    }
    // 下月填充（补齐到 6 行 42 格）
    var totalCells = 42;
    var remaining = totalCells - firstDay - daysInMonth;
    for (var n = 1; n <= remaining; n++) {
      grid.appendChild(el('span', { class: 'tokui-datepicker-day tokui-datepicker-day--other' }, String(n)));
    }
    container.appendChild(grid);

    return { prevBtn: prevBtn, nextBtn: nextBtn };
  }

  // === DatePicker 日期选择器（自闭合）===
  // attrs.l = 标签, attrs.ph = placeholder, attrs.fmt = 格式(默认 YYYY-MM-DD)
  // attrs.v = 初始值, attrs.clk = 选择回调, attrs.dis = 禁用
  // attrs.id, attrs.n
  // 点击输入框展开日历下拉面板，选择日期后回填并触发 clk
  renderer.register('datepicker', (node) => {
    var attrs = node.attrs || {};
    var isDisabled = attrs.dis !== undefined;
    var fmt = attrs.fmt || 'YYYY-MM-DD';
    var placeholder = attrs.ph || fmt;
    var value = attrs.v || '';

    var field = el('div', { class: 'tokui-field' });
    if (attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label' }, attrs.l));
    }

    var classes = ['tokui-datepicker'];
    if (isDisabled) classes.push('tokui-datepicker--disabled');
    var picker = el('div', { class: classes.join(' ') });

    // 输入控制区
    var control = el('div', { class: 'tokui-datepicker-control' });
    var inputAttrs = {
      class: 'tokui-datepicker-input',
      type: 'text',
      readonly: 'readonly',
      placeholder: placeholder
    };
    if (attrs.id) inputAttrs.id = attrs.id;
    if (isDisabled) inputAttrs.disabled = 'disabled';
    if (value) inputAttrs.value = value;
    var input = el('input', inputAttrs);
    control.appendChild(input);

    // 日历图标（SVG inline）
    var icon = el('span', { class: 'tokui-datepicker-icon' });
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    control.appendChild(icon);
    picker.appendChild(control);

    // 下拉日历面板
    var dropdown = el('div', { class: 'tokui-datepicker-dropdown' });

    // 解析当前日期状态
    var now = new Date();
    var currentYear, currentMonth, selectedDate;
    if (value) {
      selectedDate = parseDateValue(value);
      if (selectedDate) {
        currentYear = selectedDate.getFullYear();
        currentMonth = selectedDate.getMonth();
      }
    }
    if (!currentYear) {
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
    }

    // 隐藏 input
    var hidden = el('input', { type: 'hidden' });
    if (attrs.n) hidden.name = attrs.n;
    else if (attrs.id) hidden.name = attrs.id;
    hidden.value = value;
    picker.appendChild(hidden);

    // 渲染日历
    function renderCalendar(year, month) {
      dropdown.innerHTML = '';
      var nav = renderCalendarGrid(year, month, selectedDate, now, dropdown);

      // 月份导航事件
      nav.prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar(currentYear, currentMonth);
      });
      nav.nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar(currentYear, currentMonth);
      });
    }

    renderCalendar(currentYear, currentMonth);
    dropdown.style.display = 'none';
    picker.appendChild(dropdown);

    // 交互
    var isOpen = false;

    function openPanel() {
      if (isDisabled || isOpen) return;
      registerOpenPicker(closePanel);
      isOpen = true;
      dropdown.style.display = '';
      picker.classList.add('tokui-datepicker--open');
      var rect = control.getBoundingClientRect();
      dropdown.style.left = rect.left + 'px';
      dropdown.style.top = (rect.bottom + 4) + 'px';
      // 宽度不跟随输入框：内容自适应，最小宽度由 CSS（300px）兜底
      dropdown.style.width = 'auto';
      var vw = getViewportWidth();
      if (rect.left + dropdown.offsetWidth > vw - 8) {
        dropdown.style.left = Math.max(8, vw - dropdown.offsetWidth - 8) + 'px';
      }
    }

    function closePanel() {
      if (!isOpen) return;
      isOpen = false;
      dropdown.style.display = 'none';
      picker.classList.remove('tokui-datepicker--open');
      unregisterPicker(closePanel);
    }

    if (!isDisabled) {
      control.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isOpen) closePanel(); else openPanel();
      });

      dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
        var dayEl = e.target.closest('.tokui-datepicker-day');
        if (!dayEl || dayEl.classList.contains('tokui-datepicker-day--other')) return;
        var day = parseInt(dayEl.getAttribute('data-day'));
        selectedDate = new Date(currentYear, currentMonth, day);
        var formatted = formatDate(selectedDate, fmt);
        input.value = formatted;
        hidden.value = formatted;
        closePanel();
        renderCalendar(currentYear, currentMonth);
        if (attrs.clk) {
          var handler = renderer.eventBus ? renderer.eventBus.getHandler(attrs.clk) : null;
          if (handler) handler({ value: formatted, date: selectedDate, id: attrs.id });
        }
      });

      if (typeof document !== 'undefined') {
        document.addEventListener('click', function(e) {
          if (!picker.contains(e.target)) closePanel();
        });
      }
    }

    field.appendChild(picker);
    field._variantTarget = picker;
    return field;
  });

  // === TimePicker 时间选择器（自闭合）===
  // attrs.l = 标签, attrs.ph = placeholder, attrs.fmt = 格式(默认 HH:mm)
  // attrs.v = 初始值, attrs.clk = 选择回调, attrs.dis = 禁用
  // attrs.id, attrs.n
  renderer.register('timepicker', (node) => {
    var attrs = node.attrs || {};
    var isDisabled = attrs.dis !== undefined;
    var fmt = attrs.fmt || 'HH:mm';
    var placeholder = attrs.ph || fmt;
    var value = attrs.v || '';

    var field = el('div', { class: 'tokui-field' });
    if (attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label' }, attrs.l));
    }

    var classes = ['tokui-timepicker'];
    if (isDisabled) classes.push('tokui-timepicker--disabled');
    var picker = el('div', { class: classes.join(' ') });

    // 输入控制区
    var control = el('div', { class: 'tokui-timepicker-control' });
    var inputAttrs = {
      class: 'tokui-timepicker-input',
      type: 'text',
      readonly: 'readonly',
      placeholder: placeholder
    };
    if (attrs.id) inputAttrs.id = attrs.id;
    if (isDisabled) inputAttrs.disabled = 'disabled';
    if (value) inputAttrs.value = value;
    var input = el('input', inputAttrs);
    control.appendChild(input);

    // 时钟图标
    var icon = el('span', { class: 'tokui-timepicker-icon' });
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    control.appendChild(icon);
    picker.appendChild(control);

    // 解析初始时间
    var currentHour = 0, currentMinute = 0, currentSecond = 0;
    if (value) {
      var timeParts = value.split(':');
      currentHour = parseInt(timeParts[0]) || 0;
      currentMinute = parseInt(timeParts[1]) || 0;
      currentSecond = parseInt(timeParts[2]) || 0;
    }

    // 下拉时间面板
    var dropdown = el('div', { class: 'tokui-timepicker-dropdown' });

    // 构建滚轮列
    var showSeconds = fmt.indexOf('ss') !== -1 || fmt.indexOf('s') !== -1;
    var columns = el('div', { class: 'tokui-timepicker-columns' });

    var hourCol = buildTimeColumn(_t('duration.hour'), 24, currentHour);
    var minuteCol = buildTimeColumn(_t('duration.minute'), 60, currentMinute);
    columns.appendChild(hourCol);
    columns.appendChild(minuteCol);
    var secondCol = null;
    if (showSeconds) {
      secondCol = buildTimeColumn(_t('duration.second'), 60, currentSecond);
      columns.appendChild(secondCol);
    }
    dropdown.appendChild(columns);

    // 确认按钮
    var footer = el('div', { class: 'tokui-timepicker-footer' });
    var confirmBtn = el('button', { class: 'tokui-timepicker-confirm', type: 'button' }, _t('common.ok'));
    footer.appendChild(confirmBtn);
    dropdown.appendChild(footer);

    // 隐藏 input
    var hidden = el('input', { type: 'hidden' });
    if (attrs.n) hidden.name = attrs.n;
    else if (attrs.id) hidden.name = attrs.id;
    hidden.value = value;
    picker.appendChild(hidden);

    dropdown.style.display = 'none';
    picker.appendChild(dropdown);

    // 交互
    var isOpen = false;

    function openPanel() {
      if (isDisabled || isOpen) return;
      registerOpenPicker(closePanel);
      isOpen = true;
      dropdown.style.display = '';
      picker.classList.add('tokui-timepicker--open');
      var rect = control.getBoundingClientRect();
      dropdown.style.left = rect.left + 'px';
      dropdown.style.top = (rect.bottom + 4) + 'px';
      // 宽度不跟随输入框：内容自适应，最小宽度由 CSS（300px）兜底
      dropdown.style.width = 'auto';
      var vw = getViewportWidth();
      if (rect.left + dropdown.offsetWidth > vw - 8) {
        dropdown.style.left = Math.max(8, vw - dropdown.offsetWidth - 8) + 'px';
      }
      // 滚动到当前值
      scrollToSelected(hourCol, currentHour);
      scrollToSelected(minuteCol, currentMinute);
      if (showSeconds && secondCol) scrollToSelected(secondCol, currentSecond);
    }

    function closePanel() {
      if (!isOpen) return;
      isOpen = false;
      dropdown.style.display = 'none';
      picker.classList.remove('tokui-timepicker--open');
      unregisterPicker(closePanel);
    }

    if (!isDisabled) {
      control.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isOpen) closePanel(); else openPanel();
      });

      confirmBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        currentHour = getSelectedValue(hourCol);
        currentMinute = getSelectedValue(minuteCol);
        if (showSeconds && secondCol) currentSecond = getSelectedValue(secondCol);
        var formatted = formatTime(currentHour, currentMinute, currentSecond, fmt);
        input.value = formatted;
        hidden.value = formatted;
        closePanel();
        if (attrs.clk) {
          var handler = renderer.eventBus ? renderer.eventBus.getHandler(attrs.clk) : null;
          if (handler) handler({ value: formatted, hour: currentHour, minute: currentMinute, second: currentSecond, id: attrs.id });
        }
      });

      if (typeof document !== 'undefined') {
        document.addEventListener('click', function(e) {
          if (!picker.contains(e.target)) closePanel();
        });
      }
    }

    field.appendChild(picker);
    field._variantTarget = picker;
    return field;
  });

  // === DateTimePicker 日期时间选择器（自闭合）===
  // attrs.l = 标签, attrs.ph = placeholder, attrs.fmt = 格式(默认 YYYY-MM-DD HH:mm)
  // attrs.v = 初始值, attrs.clk = 选择回调, attrs.dis = 禁用
  // attrs.id, attrs.n
  // DatePicker 在上 + TimePicker 在下，合并为一个面板
  renderer.register('datetimepicker', (node) => {
    var attrs = node.attrs || {};
    var isDisabled = attrs.dis !== undefined;
    var fmt = attrs.fmt || 'YYYY-MM-DD HH:mm';
    var placeholder = attrs.ph || fmt;
    var value = attrs.v || '';

    var field = el('div', { class: 'tokui-field' });
    if (attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label' }, attrs.l));
    }

    var classes = ['tokui-datetimepicker'];
    if (isDisabled) classes.push('tokui-datetimepicker--disabled');
    var picker = el('div', { class: classes.join(' ') });

    // 输入控制区
    var control = el('div', { class: 'tokui-datetimepicker-control' });
    var inputAttrs = {
      class: 'tokui-datetimepicker-input',
      type: 'text',
      readonly: 'readonly',
      placeholder: placeholder
    };
    if (attrs.id) inputAttrs.id = attrs.id;
    if (isDisabled) inputAttrs.disabled = 'disabled';
    if (value) inputAttrs.value = value;
    var input = el('input', inputAttrs);
    control.appendChild(input);

    // 日历图标
    var icon = el('span', { class: 'tokui-datetimepicker-icon' });
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    control.appendChild(icon);
    picker.appendChild(control);

    // 解析初始值
    var now = new Date();
    var currentYear, currentMonth, selectedDate;
    var currentHour = 0, currentMinute = 0, currentSecond = 0;
    if (value) {
      selectedDate = parseDateTimeValue(value) || parseDateValue(value);
      if (selectedDate) {
        currentYear = selectedDate.getFullYear();
        currentMonth = selectedDate.getMonth();
        currentHour = selectedDate.getHours();
        currentMinute = selectedDate.getMinutes();
        currentSecond = selectedDate.getSeconds();
      }
    }
    if (!currentYear) {
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
    }

    // 隐藏 input
    var hidden = el('input', { type: 'hidden' });
    if (attrs.n) hidden.name = attrs.n;
    else if (attrs.id) hidden.name = attrs.id;
    hidden.value = value;
    picker.appendChild(hidden);

    // 下拉面板（日期 + 时间）
    var dropdown = el('div', { class: 'tokui-datetimepicker-dropdown' });

    // 日期面板
    var dateSection = el('div', { class: 'tokui-datetimepicker-date' });
    // 时间面板
    var showSeconds = fmt.indexOf('ss') !== -1 || fmt.indexOf('s') !== -1;
    var timeSection = el('div', { class: 'tokui-datetimepicker-time' });
    var timeColumns = el('div', { class: 'tokui-timepicker-columns' });
    var hourCol = buildTimeColumn(_t('duration.hour'), 24, currentHour);
    var minuteCol = buildTimeColumn(_t('duration.minute'), 60, currentMinute);
    timeColumns.appendChild(hourCol);
    timeColumns.appendChild(minuteCol);
    var secondCol = null;
    if (showSeconds) {
      secondCol = buildTimeColumn(_t('duration.second'), 60, currentSecond);
      timeColumns.appendChild(secondCol);
    }
    timeSection.appendChild(timeColumns);

    function renderDateSection(year, month) {
      dateSection.innerHTML = '';
      var nav = renderCalendarGrid(year, month, selectedDate, now, dateSection);

      nav.prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderDateSection(currentYear, currentMonth);
      });
      nav.nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderDateSection(currentYear, currentMonth);
      });
    }

    // 确认按钮
    var footer = el('div', { class: 'tokui-datetimepicker-footer' });
    var confirmBtn = el('button', { class: 'tokui-timepicker-confirm', type: 'button' }, _t('common.ok'));
    footer.appendChild(confirmBtn);

    // 日期面板 + 时间面板横向并排（主流布局：日期为主，时间滚轮列居右侧栏）
    var body = el('div', { class: 'tokui-datetimepicker-body' });
    body.appendChild(dateSection);
    body.appendChild(timeSection);
    dropdown.appendChild(body);
    dropdown.appendChild(footer);

    renderDateSection(currentYear, currentMonth);
    dropdown.style.display = 'none';
    picker.appendChild(dropdown);

    // 交互
    var isOpen = false;

    function openPanel() {
      if (isDisabled || isOpen) return;
      registerOpenPicker(closePanel);
      isOpen = true;
      dropdown.style.display = '';
      picker.classList.add('tokui-datetimepicker--open');
      var rect = control.getBoundingClientRect();
      dropdown.style.left = rect.left + 'px';
      dropdown.style.top = (rect.bottom + 4) + 'px';
      // 宽度不跟随输入框：由内容自适应（日期+时间横排），最小宽度由 CSS（300px）兜底
      dropdown.style.width = 'auto';
      // 右溢出保护：贴右边则左移
      var dw = dropdown.offsetWidth;
      var vw = getViewportWidth();
      if (rect.left + dw > vw - 8) {
        dropdown.style.left = Math.max(8, vw - dw - 8) + 'px';
      }
      scrollToSelected(hourCol, currentHour);
      scrollToSelected(minuteCol, currentMinute);
      if (showSeconds && secondCol) scrollToSelected(secondCol, currentSecond);
    }

    function closePanel() {
      if (!isOpen) return;
      isOpen = false;
      dropdown.style.display = 'none';
      picker.classList.remove('tokui-datetimepicker--open');
      unregisterPicker(closePanel);
    }

    if (!isDisabled) {
      control.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isOpen) closePanel(); else openPanel();
      });

      dateSection.addEventListener('click', function(e) {
        e.stopPropagation();
        var dayEl = e.target.closest('.tokui-datepicker-day');
        if (!dayEl || dayEl.classList.contains('tokui-datepicker-day--other')) return;
        var day = parseInt(dayEl.getAttribute('data-day'));
        selectedDate = new Date(currentYear, currentMonth, day);
        renderDateSection(currentYear, currentMonth);
      });

      confirmBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!selectedDate) selectedDate = new Date(currentYear, currentMonth, now.getDate());
        currentHour = getSelectedValue(hourCol);
        currentMinute = getSelectedValue(minuteCol);
        if (showSeconds && secondCol) currentSecond = getSelectedValue(secondCol);
        selectedDate.setHours(currentHour, currentMinute, currentSecond);
        var dateStr = formatDate(selectedDate, fmt);
        input.value = dateStr;
        hidden.value = dateStr;
        closePanel();
        if (attrs.clk) {
          var handler = renderer.eventBus ? renderer.eventBus.getHandler(attrs.clk) : null;
          if (handler) handler({ value: dateStr, date: selectedDate, id: attrs.id });
        }
      });

      if (typeof document !== 'undefined') {
        document.addEventListener('click', function(e) {
          if (!picker.contains(e.target)) closePanel();
        });
      }
    }

    field.appendChild(picker);
    field._variantTarget = picker;
    return field;
  });
}

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerFormComponents = registerFormComponents;
  window.TokUI._internal._parseOptShorthand = _parseOptShorthand;
  window.TokUI._internal._expandOptChildren = _expandOptChildren;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerFormComponents, _parseOptShorthand, _expandOptChildren };
}
