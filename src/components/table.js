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
function parseActionCells(content, el) {
  const container = el('div', {});
  container.style.display = 'flex';
  container.style.gap = '6px';
  container.style.alignItems = 'center';
  content.split('|').forEach(seg => {
    const trimmed = seg.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    let text = '';
    const attrs = { class: 'tokui-tbtn', type: 'button' };
    parts.forEach((part, i) => {
      if (i === 0 && part.startsWith('btn:')) {
        text = part.slice(4);
      } else if (part.startsWith('clk:')) {
        attrs['data-tokui-clk'] = part.slice(4);
      } else if (part.startsWith('v:')) {
        attrs.class += ' tokui-tbtn--' + part.slice(2);
      } else if (part.includes(':')) {
        const ci = part.indexOf(':');
        const key = part.slice(0, ci);
        // 已有 data- 前缀则不加，否则加 data- 前缀
        attrs[key.startsWith('data-') ? key : 'data-' + key] = part.slice(ci + 1);
      }
    });
    container.appendChild(el('button', attrs, text));
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
  function parseColSpec(col) {
    var slashIdx = col.indexOf('/');
    var head = slashIdx > 0 ? col.slice(0, slashIdx) : col;
    var alignRaw = slashIdx > 0 ? col.slice(slashIdx + 1).trim().toLowerCase() : '';
    var colonIdx = head.indexOf(':');
    var name = colonIdx > 0 ? head.slice(0, colonIdx) : head;
    var ALIGNS = { c: 'center', center: 'center', r: 'right', right: 'right', l: 'left', left: 'left' };
    return { name: name, align: ALIGNS[alignRaw] || '' };
  }

  // 当前表格的列类型 / 对齐（流式渲染时通过模块变量传递）
  let _tableColTypes = [];
  let _tableColAligns = [];
  let _tableSeqNum = 0;

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

    // 提取列类型 / 对齐定义，注入到子解析节点供 tbody/tr 使用
    const colTypes = [];
    const colAligns = [];
    const theadNode = node.children.find(c => c.type === 'thead');
    if (theadNode && theadNode.attrs.cols) {
      theadNode.attrs.cols.split(',').forEach(col => {
        const spec = parseColSpec(col);
        colTypes.push(COL_TYPES[spec.name] ? spec.name : null);
        colAligns.push(spec.align);
      });
    }
    // 将 colTypes / colAligns 传递给子节点
    node.children.forEach(child => {
      child._colTypes = colTypes;
      child._colAligns = colAligns;
    });

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
    const tr = el('tr', { class: 'tokui-thead-row' });

    if (node.attrs.cols) {
      // 重置列类型 / 对齐 / 序号
      _tableColTypes = [];
      _tableColAligns = [];
      _tableSeqNum = 0;

      node.attrs.cols.split(',').forEach(col => {
        const spec = parseColSpec(col);
        const name = spec.name;
        const alignCls = spec.align ? 'tokui-col-' + spec.align : '';
        const thAttrs = { scope: 'col' };

        // 记录列类型 / 对齐
        _tableColTypes.push(COL_TYPES[name] ? name : null);
        _tableColAligns.push(spec.align);

        // 特殊列类型
        if (name === 'chk') {
          // checkbox 列：表头放全选 checkbox
          thAttrs.class = 'tokui-col-chk' + (alignCls ? ' ' + alignCls : '');
          const chk = el('input', { type: 'checkbox', class: 'tokui-chk-all' });
          // 点击表头全选：切换所有行；半选态清零
          chk.addEventListener('change', function () {
            const table = chk.closest('table');
            if (!table) return;
            table.querySelectorAll('.tokui-chk-row').forEach(function (r) {
              r.checked = chk.checked;
            });
            chk.indeterminate = false;
          });
          const th = el('th', thAttrs);
          th.appendChild(chk);
          tr.appendChild(th);
          return;
        }
        if (name === '#') {
          thAttrs.class = 'tokui-col-seq' + (alignCls ? ' ' + alignCls : '');
          tr.appendChild(el('th', thAttrs, '#'));
          return;
        }

        thAttrs.class = alignCls;
        tr.appendChild(el('th', thAttrs, name));
      });
    } else {
      node.children.forEach(tcol => {
        const text = (tcol.attrs && tcol.attrs.n) || '';
        // tcol 占位渲染器返回空文本，这里才是它真正的 DOM（th 单元格）；
        // 盖 data-tokui-tag=tcol 印章，供文档 Playground 点击 [tcol] 代码行定位。
        tr.appendChild(el('th', { scope: 'col', 'data-tokui-tag': tcol.type === 'tcol' ? 'tcol' : null }, text));
      });
    }

    thead.appendChild(tr);
    thead._slot = tr;
    thead._tokuiType = 'thead';
    return thead;
  });

  // === 表格主体 ===
  renderer.register('tbody', (node, rc) => {
    const tbody = el('tbody', { class: 'tokui-tbody' });
    const colTypes = node._colTypes || _tableColTypes;
    const colAligns = node._colAligns || _tableColAligns;
    node.children.forEach(child => {
      child._colTypes = colTypes;
      child._colAligns = colAligns;
      child._seqNum = ++_tableSeqNum;
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

  renderer.register('tr', (node) => {
    const tr = el('tr', { class: 'tokui-table-row', role: 'row' });
    var colspanVal = node.attrs && node.attrs.cs ? parseInt(node.attrs.cs) : 0;
    const colTypes = node._colTypes || _tableColTypes;
    const colAligns = node._colAligns || _tableColAligns;
    const seqNum = node._seqNum || ++_tableSeqNum;

    if (node.content) {
      // parseTag 对含空格的引用内容恢复双引号，tr 需要去掉外层引号以正确分割逗号
      var content = node.content;
      if (content.length > 1 && content.charAt(0) === '"' && content.charAt(content.length - 1) === '"') {
        content = content.slice(1, -1);
      }
      const cells = smartSplit(content);
      cells.forEach((val, idx) => {
        const tdAttrs = { class: 'tokui-td' };
        // 列对齐类（来自 thead cols 的 /align）
        const align = colAligns[idx];
        if (align) tdAttrs.class += ' tokui-col-' + align;
        if (idx === 0 && colspanVal >= 2) {
          tdAttrs.colspan = String(colspanVal);
        }
        if (idx > 0 && idx < colspanVal) return;

        const trimmed = val.trim();

        // 特殊列：checkbox
        if (colTypes[idx] === 'chk') {
          tdAttrs.class += ' tokui-col-chk';
          const td = el('td', tdAttrs);
          td.appendChild(el('input', { type: 'checkbox', class: 'tokui-chk-row' }));
          tr.appendChild(td);
          return;
        }

        // 特殊列：序号
        if (colTypes[idx] === '#') {
          tdAttrs.class += ' tokui-col-seq';
          tr.appendChild(el('td', tdAttrs, String(seqNum)));
          return;
        }

        // 内联组件泄漏修复：[tag 5%] / [progress v:98] / [badge ...] 等方括号组件
        const inlineDom = renderInlineCell(trimmed);
        if (inlineDom) {
          tdAttrs.class += ' tokui-td--inline';
          const td = el('td', tdAttrs);
          td.appendChild(inlineDom);
          tr.appendChild(td);
          return;
        }

        // 操作列：内容以 btn: 开头
        if (trimmed.startsWith('btn:')) {
          tdAttrs.class += ' tokui-col-action';
          const td = el('td', tdAttrs);
          td.appendChild(parseActionCells(trimmed, el));
          tr.appendChild(td);
          return;
        }

        // 标签列：内容以 tag: 开头，格式 tag:文本 t:类型
        if (trimmed.startsWith('tag:')) {
          const td = el('td', tdAttrs);
          const parts = trimmed.split(/\s+/);
          let tagText = '';
          const tagAttrs = { class: 'tokui-tag' };
          parts.forEach(part => {
            if (part.startsWith('tag:')) {
              tagText = part.slice(4);
            } else if (part.startsWith('t:')) {
              tagAttrs.class += ' tokui-tag--' + part.slice(2);
            }
          });
          const span = el('span', tagAttrs, tagText);
          td.appendChild(span);
          tr.appendChild(td);
          return;
        }

        // 进度列：内容以 progress 开头，格式 progress v:N t:span
        if (trimmed.startsWith('progress')) {
          const td = el('td', tdAttrs);
          const parts = trimmed.split(/\s+/);
          let progressVal = 0;
          let progressType = 'span';
          let progressStatus = '';
          parts.forEach(part => {
            if (part.startsWith('v:')) {
              progressVal = parseInt(part.slice(2)) || 0;
            } else if (part.startsWith('t:')) {
              progressType = part.slice(2);
            } else if (part.startsWith('status:')) {
              progressStatus = part.slice(7);
            }
          });
          if (progressType === 'span') {
            // 与 progress 组件 span 变体保持一致：mini-bar + mini-fill
            const barOuter = el('span', { class: 'tokui-progress tokui-progress--span' });
            const miniBar = el('span', { class: 'tokui-progress__mini-bar' });
            let fillCls = 'tokui-progress__mini-fill';
            if (progressStatus === 'error') fillCls += ' tokui-progress--error';
            else if (progressVal >= 80) fillCls += ' tokui-progress--success';
            const miniFill = el('span', { class: fillCls });
            miniFill.style.width = progressVal + '%';
            miniBar.appendChild(miniFill);
            barOuter.appendChild(miniBar);
            const text = el('span', { class: 'tokui-progress__span-text' });
            text.textContent = progressVal + '%';
            barOuter.appendChild(text);
            td.appendChild(barOuter);
          }
          tr.appendChild(td);
          return;
        }

        tr.appendChild(el('td', tdAttrs, trimmed));
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
