/**
 * TokUI 表格组件模块
 * 注册表格相关组件：table、thead、tbody、tr。
 * 支持斑马纹效果、表头简写（cols 属性）、特殊列（chk/序号/操作）。
 *
 * DSL 示例：
 * [table stripe]
 *   [thead cols:chk,#,姓名,部门,操作]
 *   [tbody]
 *     [tr chk,1,张三,技术部,btn:编辑 clk:edit|btn:删除 clk:del]
 *   [/tbody]
 * [/table]
 */
'use strict';

/**
 * 解析操作列按钮语法：btn:文本 clk:handler v:variant key:value|btn:...
 * 以 | 分隔多个按钮，空格分隔属性
 */
function parseActionCells(content, el, iconSvg) {
  const container = el('div', {});
  // inline-flex：作为 inline 级元素，受父 td 的 text-align 影响（操作列居中对齐才生效）；
  // 纯 flex 是 block 级，text-align:center 无法居中它。
  container.style.display = 'inline-flex';
  container.style.gap = '6px';
  container.style.alignItems = 'center';
  content.split('|').forEach(seg => {
    const trimmed = seg.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    let text = '';
    let iconName = '';
    let emoji = '';
    let label = '';
    const attrs = { class: 'tokui-tbtn', type: 'button' };
    parts.forEach((part, i) => {
      if (i === 0 && part.startsWith('btn:')) {
        text = part.slice(4);
      } else if (part.startsWith('clk:')) {
        attrs['data-tokui-clk'] = part.slice(4);
      } else if (part.startsWith('v:')) {
        attrs.class += ' tokui-tbtn--' + part.slice(2);
      } else if (part.startsWith('icon:')) {
        iconName = part.slice(5);
      } else if (part.startsWith('i:')) {
        emoji = part.slice(2);
      } else if (part.startsWith('l:')) {
        label = part.slice(2);
      } else if (part.includes(':')) {
        const ci = part.indexOf(':');
        const key = part.slice(0, ci);
        // 已有 data- 前缀则不加，否则加 data- 前缀
        attrs[key.startsWith('data-') ? key : 'data-' + key] = part.slice(ci + 1);
      }
    });
    const iconHtml = iconName ? iconSvg(iconName, 14) : '';
    const hasIcon = !!(iconName || emoji);
    // 流式增量：段尚无可见内容（无文字/图标/emoji）则跳过，避免空钮闪烁。
    // 流式推进中（icon 名补全、文字到达）自然转正；多钮按 | 逐个现形。
    if (!text && !iconHtml && !emoji) return;
    const iconOnly = !text && hasIcon;
    if (iconOnly) {
      attrs.class += ' tokui-tbtn--icon-only';
      const tip = label || iconName || '';
      if (tip) {
        attrs['aria-label'] = tip;
        attrs['data-tokui-tip'] = tip;
      }
    }
    const btn = el('button', attrs);
    if (iconName) {
      const iconSpan = el('span', { class: 'tokui-tbtn__icon' });
      iconSpan.innerHTML = iconHtml;
      btn.appendChild(iconSpan);
      btn.classList.add('tokui-tbtn--has-icon');
    } else if (emoji) {
      btn.appendChild(el('span', { class: 'tokui-tbtn__icon tokui-tbtn__icon--emoji' }, emoji));
      btn.classList.add('tokui-tbtn--has-icon');
    }
    if (text) btn.appendChild(el('span', { class: 'tokui-tbtn__text' }, text));
    container.appendChild(btn);
  });
  return container;
}

/**
 * 注册表格组件到渲染器
 * @param {TokUIRenderer} renderer - 渲染器实例
 */
function registerTableComponents(renderer) {
  const _mod = (typeof require === 'function')
    ? require('../core/renderer')
    : window.TokUI._internal;
  const { el } = _mod;
  // parseTag 用于把单元格内泄漏的方括号组件重建为节点内联渲染
  const _parseTag = (typeof require === 'function')
    ? require('../core/parser').parseTag
    : window.TokUI._internal.parseTag;
  const iconSvg = (typeof require === 'function')
    ? require('./icons').iconSvg
    : window.TokUI._internal.iconSvg;

  /**
   * 将单元格内泄漏的方括号组件（如 [tag 5%]、[progress v:98]）重建并内联渲染。
   * 解析器遇到 tr 这类叶子节点时，内层 [tag ...] 的 ] 会被外层 tr 截断，
   * 导致字面文本泄漏。此处兜底：识别 [type ... 形态，补全后渲染。
   * @returns {HTMLElement|null} 渲染成功的 DOM，失败返回 null
   */
  function renderInlineCell(cellStr) {
    const m = cellStr.match(/^\[([a-zA-Z][\w-]*)\b([\s\S]*)$/);
    if (!m) return null;
    // 去除可能残留的尾部 ]，再补全为完整组件描述交给 parseTag
    let inner = (m[1] + (m[2] || '')).replace(/\]\s*$/, '').trim();
    if (!inner) return null;
    try {
      const sub = _parseTag(inner);
      if (!sub || !sub.type) return null;
      const dom = renderer.render(sub);
      return (dom && dom.nodeType) ? dom : null;
    } catch (e) {
      return null;
    }
  }

  // 列类型映射，thead cols 中使用
  const COL_TYPES = {
    chk: { label: '', cls: 'tokui-col-chk' },
    '#':  { label: '#', cls: 'tokui-col-seq' }
  };

  // 解析列定义：name | name/align | chk | #/align | name:旧语法
  // align 支持 c/center、r/right、l/left
  // 解析列定义：name | name/align | name/align/color | name/color（单段也认，先对齐表后配色表）
  //   align: c/center r/right l/left   color: primary/success/warning/danger/info
  // 复用 parseCellSuffix（与 body cell 级尾缀同解析），保证 col spec 与 body cell 覆盖语法一致。
  // 注：head 可能含 =cN[rM] span 修饰符（由调用方 parseSpanModifier 剥），故此处 name 不剥 span
  function parseColSpec(col) {
    var suffix = parseCellSuffix(col);
    var head = suffix.text;
    var colonIdx = head.indexOf(':');
    var name = colonIdx > 0 ? head.slice(0, colonIdx) : head;
    return { name: name, align: suffix.align, color: suffix.color };
  }

  // 当前表格的列类型 / 对齐 / 颜色（流式渲染时通过模块变量传递）
  let _tableColTypes = [];
  let _tableColAligns = [];
  let _tableColColors = [];
  let _tableSeqNum = 0;
  let _lastTableEl = null;   // 最近渲染的 table 元素，供 thead 设响应式 min-width

  // checkbox 列联动：表头全选框 ↔ 各行框（主流全选 / 半选 indeterminate 行为）
  function syncChkAll(table) {
    const all = table.querySelector('.tokui-chk-all');
    if (!all) return;
    const rows = table.querySelectorAll('.tokui-chk-row');
    const checked = table.querySelectorAll('.tokui-chk-row:checked');
    all.checked = rows.length > 0 && checked.length === rows.length;
    all.indeterminate = checked.length > 0 && checked.length < rows.length;
  }

  // === 表格容器 ===
  renderer.register('table', (node, rc) => {
    const attrs = { class: 'tokui-table', role: 'table' };
    if (node.attrs.id) attrs.id = node.attrs.id;
    if (node.attrs.stripe !== undefined) {
      attrs.class += ' tokui-table--stripe';
    }
    const wrapper = el('div', { class: 'tokui-table-wrapper' });
    const table = el('table', attrs);
    if (node.attrs.cap || node.attrs.caption) {
      table.appendChild(el('caption', {}, node.attrs.cap || node.attrs.caption));
    }

    // colTypes / colAligns / colColors 由 thead 渲染器按列位推导并写入模块变量
    // （thead 先于 tbody 渲染，rc 按序），tbody/tr 读取。勿在此旧式单行注入（不识别 ; 多行 + =cN span）。

    // 记录当前 table 元素：thead 渲染器据此设响应式 min-width（流式下 thead 到达时才有列数）
    _lastTableEl = table;

    rc(node.children).forEach(child => {
      if (child && child.nodeType) table.appendChild(child);
    });
    wrapper.appendChild(table);
    wrapper._slot = table;
    wrapper._tokuiType = 'table';
    return wrapper;
  });

  // === 表头 ===
  renderer.register('thead', (node) => {
    const thead = el('thead', { class: 'tokui-thead' });

    if (node.attrs.cols) {
      // 重置列类型 / 对齐 / 颜色 / 序号
      _tableColTypes = [];
      _tableColAligns = [];
      _tableColColors = [];
      _tableSeqNum = 0;

      // 多行表头：cols 用 ; 分行。每行 smartSplit（引号感知，含逗号列标题须 " 包）。
      // cell 顺序：parseColSpec（剥 /align）→ parseSpanModifier（剥 =cN[rM]）。
      // placeRow 列位追踪：colAligns/colTypes 按【列号】记录——某格(rowIdx, rowspan) 覆盖到末行
      //   (rowIdx + rowspan - 1 >= lastRowIdx) 即为该列叶子定义，写入 col..col+colspan-1。
      //   故 rowspan 表头列（如 大区=r2）的对齐/类型也能传导到 body。
      const headerRows = node.attrs.cols.split(';');
      const lastRowIdx = headerRows.length - 1;
      const parsedRows = headerRows.map(function (rowStr) {
        return smartSplit(rowStr).map(function (col) {
          const spec = parseColSpec(col);
          const sp = parseSpanModifier(spec.name);
          return { text: sp.text, align: spec.align, color: spec.color, colspan: sp.colspan || 1, rowspan: sp.rowspan || 1 };
        });
      });
      const maxCols = parsedRows.length ? parsedRows[0].reduce(function (s, c) { return s + c.colspan; }, 0) : 0;
      // 响应式：按列数设 table min-width（每列 ≈ var(--tokui-table-min-col-w, 96px)），窄屏不挤压；
      // 配合 .tokui-table-wrapper 的 overflow-x:auto → 横向滚动。桌面 width:100% 仍填满。
      // 放 thead（流式下 thead 到达时才有列数；一次性/流式都覆盖）。
      if (_lastTableEl && maxCols > 0) {
        _lastTableEl.style.minWidth = 'calc(' + maxCols + ' * var(--tokui-table-min-col-w, 96px))';
      }
      const occ = [];
      parsedRows.forEach(function (cells, rowIdx) {
        const placed = placeRow(cells, occ, maxCols);
        const tr = el('tr', { class: 'tokui-thead-row' });
        placed.forEach(function (p) {
          const cell = p.cell;
          const alignCls = cell.align ? 'tokui-col-' + cell.align : '';
          const colorCls = cell.color ? 'tokui-text--' + cell.color : '';
          const thAttrs = { scope: 'col' };
          if (p.colspan >= 2) thAttrs.colspan = String(p.colspan);
          if (p.rowspan >= 2) thAttrs.rowspan = String(p.rowspan);
          // 覆盖末行 → 记录列位 align/colType/color（rowspan 表头列也写入，传导到 body）
          if (rowIdx + p.rowspan - 1 >= lastRowIdx) {
            for (var k = 0; k < p.colspan; k++) {
              _tableColAligns[p.col + k] = cell.align || '';
              _tableColTypes[p.col + k] = COL_TYPES[cell.text] ? cell.text : null;
              _tableColColors[p.col + k] = cell.color || '';
            }
          }
          if (cell.text === 'chk') {
            thAttrs.class = 'tokui-col-chk' + (alignCls ? ' ' + alignCls : '') + (colorCls ? ' ' + colorCls : '');
            const chk = el('input', { type: 'checkbox', class: 'tokui-chk-all' });
            chk.addEventListener('change', function () {
              const table = chk.closest('table');
              if (!table) return;
              table.querySelectorAll('.tokui-chk-row').forEach(function (r) { r.checked = chk.checked; });
              chk.indeterminate = false;
            });
            const th = el('th', thAttrs); th.appendChild(chk); tr.appendChild(th); return;
          }
          if (cell.text === '#') {
            thAttrs.class = 'tokui-col-seq' + (alignCls ? ' ' + alignCls : '') + (colorCls ? ' ' + colorCls : '');
            tr.appendChild(el('th', thAttrs, '#')); return;
          }
          thAttrs.class = (alignCls + ' ' + colorCls).trim();
          tr.appendChild(el('th', thAttrs, cell.text));
        });
        thead.appendChild(tr);
      });
    } else {
      const tr = el('tr', { class: 'tokui-thead-row' });
      node.children.forEach(tcol => {
        const text = (tcol.attrs && tcol.attrs.n) || '';
        // tcol 占位渲染器返回空文本，这里才是它真正的 DOM（th 单元格）；
        // 盖 data-tokui-tag=tcol 印章，供文档 Playground 点击 [tcol] 代码行定位。
        tr.appendChild(el('th', { scope: 'col', 'data-tokui-tag': tcol.type === 'tcol' ? 'tcol' : null }, text));
      });
      thead.appendChild(tr);
    }

    thead._slot = thead.lastChild || thead;
    thead._tokuiType = 'thead';
    return thead;
  });

  // === 表格主体 ===
  renderer.register('tbody', (node, rc) => {
    const tbody = el('tbody', { class: 'tokui-tbody' });
    const colTypes = node._colTypes || _tableColTypes;
    const colAligns = node._colAligns || _tableColAligns;
    const colColors = node._colColors || _tableColColors;
    // 列位追踪状态：tr 据此算 td-idx→col-idx（修正 body rowspan 偏移），实现按列对齐/配色
    tbody._tokuiOccupancy = [];
    tbody._tokuiMaxCols = colAligns.length || colTypes.length;
    node.children.forEach(child => {
      child._colTypes = colTypes;
      child._colAligns = colAligns;
      child._colColors = colColors;
      child._seqNum = ++_tableSeqNum;
      child._tbodyEl = tbody;
    });

    rc(node.children).forEach(row => {
      if (row && row.nodeType) {
        tbody.appendChild(row);
      }
    });
    // mousedown 记录 shift 状态（change 事件本身不带 shiftKey）
    tbody.addEventListener('mousedown', function (e) {
      const t = e.target;
      tbody.__tokuiShift = !!(t && t.classList && t.classList.contains('tokui-chk-row') && e.shiftKey);
    });
    // 行 checkbox 变化（事件委托，流式新增行也生效）→ 区间选择 / 同步表头
    tbody.addEventListener('change', function (e) {
      const t = e.target;
      if (!t || !t.classList || !t.classList.contains('tokui-chk-row')) return;
      const table = tbody.closest('table');
      if (!table) return;
      const rows = Array.prototype.slice.call(table.querySelectorAll('.tokui-chk-row'));
      const idx = rows.indexOf(t);
      const shifted = tbody.__tokuiShift;
      tbody.__tokuiShift = false;
      const anchor = table.__tokuiChkAnchor;
      // shift + 有效锚点：以当前行新状态覆盖 [anchor, idx] 区间（锚点不动，可连续扩展）
      if (shifted && anchor != null && anchor >= 0 && idx >= 0 && anchor !== idx) {
        const from = Math.min(anchor, idx);
        const to = Math.max(anchor, idx);
        const target = t.checked; // change 时已是最终态
        for (let i = from; i <= to; i++) rows[i].checked = target;
      } else if (idx >= 0) {
        table.__tokuiChkAnchor = idx; // 普通点击：更新锚点
      }
      syncChkAll(table);
    });
    tbody._slot = tbody;
    tbody._tokuiType = 'tbody';
    return tbody;
  });

  // === 表格行 ===
  function smartSplit(str) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  // === tr 流式 cell 切分 / 渲染辅助 ===

  // 整体引号剥离：仅当 content 首尾各一个 " 且中间无任何 " 时剥外层。
  // 否则首尾引号分属不同 cell，误剥破坏配对（与原 tr 渲染逻辑一致）。
  function stripWholeContentQuotes(content) {
    if (content.length > 1 && content.charAt(0) === '"' && content.charAt(content.length - 1) === '"'
        && content.indexOf('"', 1) === content.length - 1) {
      return content.slice(1, -1);
    }
    return content;
  }

  // 引号 + 括号深度双感知的 cell 切分：逗号仅在「引号外 && 深度 0」处为分隔符。
  // 引号内的 [ ] , 一律字面（引号本身不入 cell，与 smartSplit 一致）；
  // 深度感知让 [btn]/[img]/[hr] 等内联组件 cell 的内层 ] 不被当分隔、其内部逗号也不误切。
  function splitCellsDepthAware(str) {
    var result = [];
    var current = '';
    var inQuotes = false;
    var depth = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (inQuotes) {
        current += ch;
      } else if (ch === '[') {
        depth++; current += ch;
      } else if (ch === ']') {
        depth--; current += ch;
      } else if (ch === ',' && depth === 0) {
        // 千分位逗号保护：仅当「本格已含货币符号 ¥ ￥ $ € £ ₩ ₹」+ 逗号构成千分组
        // （前 1-3 位数字、后「恰好 3 位数字 + 第4位非数字」，如 ¥2,688.00 / $1,234,567）时，
        // 判为格式化金额内的千分位、不切。
        // 关键：必须「恰好 3 位 + 第4位非数字」——排除 ¥1,280.00,5（,5 只 1 位，是 cell 分隔，切）、
        // ¥620.00,12（,12 只 2 位，切）。current 在每次切后重置 → 币符只保护本格内、不跨格泄漏。
        // 无币符裸数字（8,320）有「一格 vs 多格」歧义 → 一律切；合并后缀（=c4）后逗号恒切。
        var prev = str[i - 1];
        var n1 = str[i + 1], n2 = str[i + 2], n3 = str[i + 3], n4 = str[i + 4];
        var isMergeSuffix = /=([cr]\d+){1,2}$/.test(current);
        var hasCurrency = /[¥￥$€£₩₹]/.test(current);
        var isThousands = !isMergeSuffix
          && hasCurrency
          && prev >= '0' && prev <= '9'
          && n1 >= '0' && n1 <= '9'
          && n2 >= '0' && n2 <= '9'
          && n3 >= '0' && n3 <= '9'
          && !(n4 >= '0' && n4 <= '9');
        if (isThousands) current += ch;
        else { result.push(current); current = ''; }
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  // skeleton 占位 td（组件 cell 流式未完成时显示）
  function buildSkeletonTd(idx, ctx) {
    var tdAttrs = { class: 'tokui-td tokui-td--skeleton' };
    var align = ctx.colAligns[idx];
    if (align) tdAttrs.class += ' tokui-col-' + align;
    var td = el('td', tdAttrs);
    td.appendChild(el('span', { class: 'tokui-skeleton' }));
    return td;
  }

  // 列位追踪：逐行左→右放置 cell，跳过被上方 rowspan 占住的列（hole），返回每格的列位。
  // 浏览器原生排版会自动让 rowspan 占位，但「按列对齐 / colType」需 JS 知道每格真实列号（td-idx 在
  // rowspan 下会偏移）。occupancy[col] = 该列还被上方 rowspan 阻塞的剩余行数；本函数原地更新。
  function placeRow(cells, occupancy, maxCols) {
    var placed = [];
    var col = 0;
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var c = cell.colspan || 1;
      var r = cell.rowspan || 1;
      while (col < maxCols && occupancy[col] > 0) { occupancy[col] -= 1; col++; }   // 跳过 hole
      placed.push({ cell: cell, col: col, colspan: c, rowspan: r });
      for (var k = 0; k < c; k++) occupancy[col + k] = r > 1 ? r - 1 : 0;            // 本格占列；rs>1 阻塞后续行
      col += c;
    }
    while (col < maxCols && occupancy[col] > 0) { occupancy[col] -= 1; col++; }      // 行尾剩余 hole
    return placed;
  }

  // 据 tbody 列位占用状态，算本行 cells 的 td-idx→col-idx 映射（修正 rowspan 偏移）。
  // one-shot 直接 mutate occ（行按序持久化）；流式 preview 由调用方传副本。
  function computeCellCols(cells, tbodyEl, occ) {
    if (!tbodyEl || !occ) return null;
    var parsed = cells.map(function (c) { var sp = parseSpanModifier(c); return { colspan: sp.colspan || 1, rowspan: sp.rowspan || 1 }; });
    var placed = placeRow(parsed, occ, tbodyEl._tokuiMaxCols || cells.length);
    return placed.map(function (p) { return p.col; });
  }

  // cell 尾缀 span 修饰符：剥 =cN[rM]（横向 colspan / 纵向 rowspan），返回 {text, colspan, rowspan}。
  // 严格正则 =([cr]\d+){1,2}$：仅匹配尾缀，c/r 须带数字；公式=x=2 / 版本=v2 / a=c 等不误判为 span。
  // 浏览器原生 table 布局据 colspan/rowspan 属性自动追踪列位，JS 无需占位映射。
  function parseSpanModifier(str) {
    str = String(str);
    var m = str.match(/=([cr]\d+){1,2}$/);
    if (!m) return { text: str, colspan: 0, rowspan: 0 };
    var spanPart = m[0];
    var text = str.slice(0, str.length - spanPart.length);
    var colspan = 0, rowspan = 0;
    var cm = spanPart.match(/c(\d+)/);
    var rm = spanPart.match(/r(\d+)/);
    if (cm) colspan = parseInt(cm[1], 10) || 0;
    if (rm) rowspan = parseInt(rm[1], 10) || 0;
    return { text: text, colspan: colspan, rowspan: rowspan };
  }

  // cell 尾缀对齐/配色修饰符：从右逐段剥最多 2 个 /word（对齐词表 + 配色词表），返回 {text, align, color}。
  // 与 col spec 顺序 `列名[=cN[rM]][/对齐][/配色]` 一致；单段也支持（先查对齐表，未中查配色表），
  // 即 `金额/danger`（仅红）、`金额/r`（仅右）均合法。词不在两表即停、不切 str——
  // 防误切日期 `2026/07/04`（末段 04 非词）、路径 `api/v2`、版本 `v1.2.3`、组件格 `tag:x t:success`。
  // col spec 与 body cell 共用此解析；body cell 级结果在 buildCell 覆盖列级 colAligns/colColors。
  function parseCellSuffix(str) {
    var ALIGNS = { c: 'center', center: 'center', r: 'right', right: 'right', l: 'left', left: 'left' };
    var COLORS = { primary: 'primary', success: 'success', warning: 'warning', danger: 'danger', info: 'info' };
    var align = '', color = '';
    for (var i = 0; i < 2; i++) {
      var m = String(str).match(/\/([A-Za-z]+)$/);
      if (!m) break;
      var w = m[1].toLowerCase();
      if (ALIGNS[w] && !align) align = ALIGNS[w];
      else if (COLORS[w] && !color) color = COLORS[w];
      else break;                 // 词不在表 / 该位已填 → 停，保留 str 不切
      str = String(str).slice(0, m.index);
    }
    return { text: str, align: align, color: color };
  }

  // 渲染单个 cell → td。合并：旧 tr cs:N 首格 colspan（,,,占位写法）+ 新 =cN[rM] 任意格 span。
  function buildCell(val, idx, ctx) {
    var colTypes = ctx.colTypes, colAligns = ctx.colAligns, seqNum = ctx.seqNum, colspanVal = ctx.colspanVal;
    var colIdx = (ctx.cellCols && ctx.cellCols[idx] != null) ? ctx.cellCols[idx] : idx;  // rowspan 偏移修正
    var tdAttrs = { class: 'tokui-td' };
    // 先剥 cell 级 /align/color 尾缀（在末尾），再剥 =cN[rM] span（新末尾）——
    // col spec 顺序 `值[=cN[rM]][/对齐][/配色]`，剥须从右向左：suffix 先、span 后。
    // cell 级 align/color 覆盖列级 colAligns/colColors
    var suffix = parseCellSuffix(val);
    var sp = parseSpanModifier(suffix.text);
    var trimmed = sp.text.trim();
    var align = suffix.align || colAligns[colIdx];
    if (align) tdAttrs.class += ' tokui-col-' + align;
    var color = suffix.color || (ctx.colColors && ctx.colColors[colIdx]);
    if (color) tdAttrs.class += ' tokui-text--' + color;
    if (idx === 0 && colspanVal >= 2) tdAttrs.colspan = String(colspanVal);   // 旧 cs: 首格
    if (idx > 0 && idx < colspanVal) return null;   // 旧 cs: 覆盖格跳过

    if (sp.colspan >= 2) tdAttrs.colspan = String(sp.colspan);
    if (sp.rowspan >= 2) tdAttrs.rowspan = String(sp.rowspan);

    if (colTypes[colIdx] === 'chk') {
      tdAttrs.class += ' tokui-col-chk';
      var chkTd = el('td', tdAttrs);
      chkTd.appendChild(el('input', { type: 'checkbox', class: 'tokui-chk-row' }));
      return chkTd;
    }
    if (colTypes[colIdx] === '#') {
      tdAttrs.class += ' tokui-col-seq';
      return el('td', tdAttrs, String(seqNum));
    }
    var inlineDom = renderInlineCell(trimmed);
    if (inlineDom) {
      tdAttrs.class += ' tokui-td--inline';
      var inTd = el('td', tdAttrs);
      inTd.appendChild(inlineDom);
      return inTd;
    }
    if (trimmed.startsWith('btn:')) {
      tdAttrs.class += ' tokui-col-action';
      var btnTd = el('td', tdAttrs);
      btnTd.appendChild(parseActionCells(trimmed, el, iconSvg));
      return btnTd;
    }
    if (trimmed.startsWith('tag:')) {
      var tagTd = el('td', tdAttrs);
      var parts = trimmed.split(/\s+/);
      var tagText = '';
      var tagAttrs = { class: 'tokui-tag' };
      parts.forEach(function (part) {
        if (part.startsWith('tag:')) tagText = part.slice(4);
        else if (part.startsWith('t:')) tagAttrs.class += ' tokui-tag--' + part.slice(2);
      });
      tagTd.appendChild(el('span', tagAttrs, tagText));
      return tagTd;
    }
    if (trimmed.startsWith('progress')) {
      var progTd = el('td', tdAttrs);
      var pparts = trimmed.split(/\s+/);
      var progressVal = 0, progressType = 'span', progressStatus = '';
      pparts.forEach(function (part) {
        if (part.startsWith('v:')) progressVal = parseInt(part.slice(2)) || 0;
        else if (part.startsWith('t:')) progressType = part.slice(2);
        else if (part.startsWith('status:')) progressStatus = part.slice(7);
      });
      if (progressType === 'span') {
        var barOuter = el('span', { class: 'tokui-progress tokui-progress--span' });
        var miniBar = el('span', { class: 'tokui-progress__mini-bar' });
        var fillCls = 'tokui-progress__mini-fill';
        if (progressStatus === 'error') fillCls += ' tokui-progress--error';
        else if (progressVal >= 80) fillCls += ' tokui-progress--success';
        var miniFill = el('span', { class: fillCls });
        miniFill.style.width = progressVal + '%';
        miniBar.appendChild(miniFill);
        barOuter.appendChild(miniBar);
        var ptext = el('span', { class: 'tokui-progress__span-text' });
        ptext.textContent = progressVal + '%';
        barOuter.appendChild(ptext);
        progTd.appendChild(barOuter);
      }
      return progTd;
    }
    return el('td', tdAttrs, trimmed);
  }

  // 流式 reconcile：按当前 cells 增量更新 tr 的 td。
  // 策略——文本格未变跳过（字符级渐显靠 val 变化驱动重建末格）；组件格未完成显示骨架、完成转正。
  function attachTrReconcile(tr, ctx) {
    tr._tokuiCellText = [];   // 每 cell-idx 的 renderKey（cell 值 或 SKELETON 哨兵）
    tr._tokuiCellTds = [];    // 每 cell-idx 对应的 td（colspan 跳过为 null）
    var SKELETON = ' SKELETON ';

    function placeTd(td, idx) {
      if (!td) return;
      // 找下一个仍挂载的 td 作插入锚点，保持列序
      var ref = null;
      for (var j = idx + 1; j < tr._tokuiCellTds.length; j++) {
        if (tr._tokuiCellTds[j] && tr._tokuiCellTds[j].parentNode === tr) { ref = tr._tokuiCellTds[j]; break; }
      }
      if (ref) tr.insertBefore(td, ref);
      else tr.appendChild(td);
    }

    tr._tokuiTrReconcile = function (content, finalized, attrs) {
      // 行变体类（v 在 tag 末尾，流式下 finalize 才完整；preview 也尝试，classList.add 幂等）
      if (attrs && attrs.v) {
        String(attrs.v).split(',').forEach(function (vv) { vv = vv.trim(); if (vv) tr.classList.add('tokui-table-row--' + vv); });
      }
      var c = stripWholeContentQuotes(content || '');
      var cells = splitCellsDepthAware(c);
      // 列位映射：preview 用 occ 副本（不污染，本行 finalize 才持久化给下行）
      var occ = ctx.tbodyEl && ctx.tbodyEl._tokuiOccupancy;
      if (occ) {
        ctx.cellCols = computeCellCols(cells, ctx.tbodyEl, finalized ? occ : occ.slice());
      }
      for (var idx = 0; idx < cells.length; idx++) {
        var val = cells[idx];
        var trimmed = val.trim();
        var isLast = idx === cells.length - 1;
        // 组件形态：方括号内联组件，或 btn:/tag:/progress 前缀语法
        var componentShaped = /^\[/.test(trimmed) || /^(btn|tag|progress)\b/.test(trimmed);
        // btn: 操作列支持逐钮真流式（parseActionCells 按 | 增量渲染，跳过未成形段）；
        // 其余组件格（[ 内联 / tag: / progress）partial 渲染无意义且闪烁，仍走骨架到 finalize。
        var isStreamableBtn = /^btn:/.test(trimmed);
        var showSkeleton = componentShaped && isLast && !finalized && !isStreamableBtn;
        var renderKey = showSkeleton ? SKELETON : val;

        if (tr._tokuiCellText[idx] === renderKey) continue;   // 未变 → 复用现有 td

        var oldTd = tr._tokuiCellTds[idx];
        if (oldTd && oldTd.parentNode === tr) tr.removeChild(oldTd);

        var newTd = showSkeleton ? buildSkeletonTd(idx, ctx) : buildCell(val, idx, ctx);
        placeTd(newTd, idx);
        tr._tokuiCellTds[idx] = newTd || null;
        tr._tokuiCellText[idx] = renderKey;
      }
      // cells 缩短 → 裁剪多余 td
      for (var k = cells.length; k < tr._tokuiCellTds.length; k++) {
        var extra = tr._tokuiCellTds[k];
        if (extra && extra.parentNode === tr) tr.removeChild(extra);
        tr._tokuiCellTds[k] = null;
      }
      tr._tokuiCellTds.length = cells.length;
      tr._tokuiCellText.length = cells.length;
    };
    return tr;
  }

  renderer.register('tr', (node) => {
    const tr = el('tr', { class: 'tokui-table-row', role: 'row' });
    // 行变体（如 v:total 汇总行 → .tokui-table-row--total，CSS 控加粗/对齐/配色）
    if (node.attrs && node.attrs.v) {
      String(node.attrs.v).split(',').forEach(function (vv) { vv = vv.trim(); if (vv) tr.classList.add('tokui-table-row--' + vv); });
    }
    var colspanVal = node.attrs && node.attrs.cs ? parseInt(node.attrs.cs) : 0;
    const colTypes = node._colTypes || _tableColTypes;
    const colAligns = node._colAligns || _tableColAligns;
    const colColors = node._colColors || _tableColColors;
    const seqNum = node._seqNum || ++_tableSeqNum;
    const ctx = { colTypes: colTypes, colAligns: colAligns, colColors: colColors, seqNum: seqNum, colspanVal: colspanVal, tbodyEl: node._tbodyEl };

    // 流式 open：建占位 <tr> 并挂 reconcile；cell 由 renderer 的 preview/finalize 增量填。
    if (node._stream === 'open') {
      attachTrReconcile(tr, ctx);
      return tr;
    }

    // 一次性渲染：从完整 content 一次建所有 cell
    if (node.content) {
      var content = stripWholeContentQuotes(node.content);
      const cells = splitCellsDepthAware(content);
      // 列位映射（修正 rowspan 偏移）→ buildCell 按 colIdx 对齐/识别列类型
      ctx.cellCols = computeCellCols(cells, ctx.tbodyEl, ctx.tbodyEl && ctx.tbodyEl._tokuiOccupancy);
      var hasSpan = cells.some(function (c) { return /=([cr]\d+)/.test(c); });
      // rowspan 偏移行（cellCols 非连续 0,1,2...）cell 数本就少于列数，属正常，不报错位
      var shifted = ctx.cellCols && ctx.cellCols.some(function (col, i) { return col !== i; });
      var overflow = content.indexOf('[tr') !== -1;
      if (!hasSpan && !shifted && colTypes.length > 0 && cells.length !== colTypes.length && colspanVal < 2) {
        console.warn(
          'TokUI Table: tr 单元格数 ' + cells.length + ' != 列数 ' + colTypes.length + ' → 列错位。' +
          (overflow
            ? '⚠️ 内容含 [tr 残留，疑似 tr 未正确闭合（引号未配对/含字面 [ ] 未引号包）→ parser 标签断裂、串行。'
            : cells.length > colTypes.length
              ? '疑似单元格内含逗号未用双引号包裹（如 12,800.00、"a,b,c"）。'
              : '疑似列标题(thead cols)含逗号被切散、或该行缺格。') +
          '规则：tr 不要外层引号、含逗号单元格直引号包。tr 原文: ' + content
        );
      }
      cells.forEach((val, idx) => {
        const td = buildCell(val, idx, ctx);
        if (td) tr.appendChild(td);
      });
    }
    return tr;
  });

  // tcol 占位渲染器：仅 thead 内部消费 attrs，流式独立出现时返回空文本
  renderer.register('tcol', () => {
    return document.createTextNode('');
  });
}

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerTableComponents = registerTableComponents;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerTableComponents };
}
