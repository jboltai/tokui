/**
 * TokUI 表格组件测试套件
 * 测试 table、thead、tbody、tr 组件的渲染逻辑。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

// 在引入 renderer 之前设置 DOM mock
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { registerTableComponents } = require('../src/components/table');

/** 测试用例存储 */
const tests = [];
let passed = 0;
let failed = 0;

/**
 * 注册测试用例
 * @param {string} name - 测试名称
 * @param {Function} fn - 测试函数
 */
function test(name, fn) {
  tests.push({ name, fn });
}

/** 运行所有测试用例并输出结果 */
function run() {
  passed = 0;
  failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${t.name}`);
      console.log(`    ${e.message}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  teardownDOM();
  if (failed > 0) process.exit(1);
}

// ===== table 组件测试 =====

// 测试：table 基本渲染 - 生成 div.tokui-table-wrapper 包含 table.tokui-table
test('table basic render - wrapper with table element', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: 'Name' }, children: [] },
      { type: 'tbody', children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-table-wrapper'), 'missing tokui-table-wrapper');
  const table = dom.querySelector('table');
  assert.notStrictEqual(table, null, 'table element not found');
  assert.ok(table.classList.contains('tokui-table'), 'missing tokui-table class');
});

// 测试：table 带 stripe 布尔属性 - table 元素添加 tokui-table--stripe 类
test('table with stripe boolean attr - adds stripe class', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: { stripe: true },
    children: [
      { type: 'thead', attrs: { cols: 'Name' }, children: [] },
      { type: 'tbody', children: [] }
    ]
  };
  const dom = rc.render(node);
  const table = dom.querySelector('table');
  assert.ok(table.classList.contains('tokui-table--stripe'), 'missing tokui-table--stripe');
});

// 测试：table 带 caption 属性 - 生成 caption 子元素
test('table with caption attr - has caption element', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: { cap: 'Employee List' },
    children: [
      { type: 'thead', attrs: { cols: 'Name' }, children: [] },
      { type: 'tbody', children: [] }
    ]
  };
  const dom = rc.render(node);
  const caption = dom.querySelector('caption');
  assert.notStrictEqual(caption, null, 'caption element not found');
  assert.strictEqual(caption.textContent, 'Employee List');
});

// ===== thead 组件测试 =====

// 测试：thead 带 cols 属性 - 按逗号分割成 th 单元格
test('thead with cols attr - splits into th cells', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      {
        type: 'thead',
        attrs: { cols: 'Name,Age,City' },
        children: []
      },
      { type: 'tbody', children: [] }
    ]
  };
  const dom = rc.render(node);
  const thead = dom.querySelector('thead');
  assert.notStrictEqual(thead, null, 'thead element not found');
  const ths = thead.querySelectorAll('th');
  assert.strictEqual(ths.length, 3, 'expected 3 th cells');
  assert.strictEqual(ths[0].textContent, 'Name');
  assert.strictEqual(ths[1].textContent, 'Age');
  assert.strictEqual(ths[2].textContent, 'City');
});

// 测试：thead cols 中包含 chk - 创建带 tokui-chk-all 类的 checkbox th
test('thead with chk in cols - creates checkbox th with tokui-chk-all', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      {
        type: 'thead',
        attrs: { cols: 'chk,Name,Age' },
        children: []
      },
      { type: 'tbody', children: [] }
    ]
  };
  const dom = rc.render(node);
  const thead = dom.querySelector('thead');
  const ths = thead.querySelectorAll('th');
  // First th should be checkbox column
  assert.strictEqual(ths.length, 3);
  const chkInput = ths[0].querySelector('input');
  assert.notStrictEqual(chkInput, null, 'checkbox input not found in first th');
  assert.strictEqual(chkInput.getAttribute('type'), 'checkbox');
  assert.ok(chkInput.classList.contains('tokui-chk-all'), 'missing tokui-chk-all class');
  assert.ok(ths[0].classList.contains('tokui-col-chk'), 'missing tokui-col-chk on th');
});

// 测试：thead cols 中包含 # - 创建序号列 th
test('thead with # in cols - creates sequence number th', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      {
        type: 'thead',
        attrs: { cols: '#,Name,Age' },
        children: []
      },
      { type: 'tbody', children: [] }
    ]
  };
  const dom = rc.render(node);
  const thead = dom.querySelector('thead');
  const ths = thead.querySelectorAll('th');
  assert.strictEqual(ths.length, 3);
  assert.strictEqual(ths[0].textContent, '#');
  assert.ok(ths[0].classList.contains('tokui-col-seq'), 'missing tokui-col-seq on th');
});

// 测试：thead 不带 cols 属性 - 通过子节点渲染
test('thead without cols - renders thead with children', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      {
        type: 'thead',
        attrs: {},
        children: [
          { type: 'tcol', attrs: { n: 'Col1' }, children: [] },
          { type: 'tcol', attrs: { n: 'Col2' }, children: [] }
        ]
      },
      { type: 'tbody', children: [] }
    ]
  };
  const dom = rc.render(node);
  const thead = dom.querySelector('thead');
  assert.notStrictEqual(thead, null, 'thead not found');
  const ths = thead.querySelectorAll('th');
  assert.strictEqual(ths.length, 2);
  assert.strictEqual(ths[0].textContent, 'Col1');
  assert.strictEqual(ths[1].textContent, 'Col2');
});

// ===== tbody 组件测试 =====

// 测试：tbody 渲染 tbody 元素并包含子节点
test('tbody renders tbody element with children', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: 'Name' }, children: [] },
      {
        type: 'tbody',
        children: [
          { type: 'tr', content: 'Alice', children: [] },
          { type: 'tr', content: 'Bob', children: [] }
        ]
      }
    ]
  };
  const dom = rc.render(node);
  const tbody = dom.querySelector('tbody');
  assert.notStrictEqual(tbody, null, 'tbody not found');
  assert.ok(tbody.classList.contains('tokui-tbody'), 'missing tokui-tbody');
  const rows = tbody.querySelectorAll('tr');
  assert.strictEqual(rows.length, 2, 'expected 2 rows');
});

// ===== tr 组件测试 =====

// 测试：tr 按逗号分割 content 为 td 单元格
test('tr with comma-separated content - splits into td cells', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: 'Name,Age,City' }, children: [] },
      {
        type: 'tbody',
        children: [
          { type: 'tr', content: 'Alice,30,NYC', children: [] }
        ]
      }
    ]
  };
  const dom = rc.render(node);
  const tr = dom.querySelector('tbody tr');
  assert.notStrictEqual(tr, null, 'tr not found');
  const tds = tr.querySelectorAll('td');
  assert.strictEqual(tds.length, 3, 'expected 3 td cells');
  assert.strictEqual(tds[0].textContent, 'Alice');
  assert.strictEqual(tds[1].textContent, '30');
  assert.strictEqual(tds[2].textContent, 'NYC');
});

// 测试：tr 带 colspan 属性 (cs) - 第一个 td 具有 colspan 属性
test('tr with colspan attr (cs) - first td has colspan attribute', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: 'Name,Age,City' }, children: [] },
      {
        type: 'tbody',
        children: [
          { type: 'tr', content: 'Merged,skip,skip', attrs: { cs: '2' }, children: [] }
        ]
      }
    ]
  };
  const dom = rc.render(node);
  const tr = dom.querySelector('tbody tr');
  const tds = tr.querySelectorAll('td');
  // With cs=2, first td gets colspan=2, second td is skipped (idx 1 < cs=2)
  assert.strictEqual(tds.length, 2, 'expected 2 td cells (second skipped by colspan)');
  assert.strictEqual(tds[0].getAttribute('colspan'), '2');
  assert.strictEqual(tds[0].textContent, 'Merged');
  assert.strictEqual(tds[1].textContent, 'skip');
});

// 测试：tr 带双引号字段 - 尊引号内的逗号不分割
test('tr with quoted content - respects double-quoted fields with commas', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: 'Name,Desc,Price' }, children: [] },
      {
        type: 'tbody',
        children: [
          { type: 'tr', content: 'Apple,"Sweet, red fruit",5', children: [] }
        ]
      }
    ]
  };
  const dom = rc.render(node);
  const tr = dom.querySelector('tbody tr');
  const tds = tr.querySelectorAll('td');
  assert.strictEqual(tds.length, 3, 'expected 3 td cells');
  assert.strictEqual(tds[0].textContent, 'Apple');
  assert.strictEqual(tds[1].textContent, 'Sweet, red fruit');
  assert.strictEqual(tds[2].textContent, '5');
});

// 测试：tr 带 chk 列 - 渲染 checkbox td
test('tr with chk column - renders checkbox td when colTypes includes chk', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: 'chk,Name' }, children: [] },
      {
        type: 'tbody',
        children: [
          { type: 'tr', content: ',Alice', children: [] }
        ]
      }
    ]
  };
  const dom = rc.render(node);
  const tr = dom.querySelector('tbody tr');
  const tds = tr.querySelectorAll('td');
  assert.strictEqual(tds.length, 2);
  // First td is checkbox column
  assert.ok(tds[0].classList.contains('tokui-col-chk'), 'missing tokui-col-chk');
  const chkInput = tds[0].querySelector('input');
  assert.notStrictEqual(chkInput, null, 'checkbox input not found');
  assert.strictEqual(chkInput.getAttribute('type'), 'checkbox');
  assert.ok(chkInput.classList.contains('tokui-chk-row'), 'missing tokui-chk-row');
  assert.strictEqual(tds[1].textContent, 'Alice');
});

// 测试：tr 带 btn: 操作列 - 渲染带 data-tokui-clk 的操作按钮
test('tr with btn: action column - renders action buttons with data-tokui-clk', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: 'Name,Age,Action' }, children: [] },
      {
        type: 'tbody',
        children: [
          { type: 'tr', content: 'Alice,30,btn:Edit clk:edit|btn:Delete clk:del', children: [] }
        ]
      }
    ]
  };
  const dom = rc.render(node);
  const tr = dom.querySelector('tbody tr');
  const tds = tr.querySelectorAll('td');
  assert.strictEqual(tds.length, 3);
  // Third td is action column
  assert.ok(tds[2].classList.contains('tokui-col-action'), 'missing tokui-col-action');
  const buttons = tds[2].querySelectorAll('button');
  assert.strictEqual(buttons.length, 2, 'expected 2 action buttons');
  assert.strictEqual(buttons[0].textContent, 'Edit');
  assert.strictEqual(buttons[0].getAttribute('data-tokui-clk'), 'edit');
  assert.strictEqual(buttons[1].textContent, 'Delete');
  assert.strictEqual(buttons[1].getAttribute('data-tokui-clk'), 'del');
});

// ===== smartSplit 间接测试 =====

// 测试：smartSplit 基本逗号分割（通过 tr 渲染间接测试）
test('smartSplit basic comma split (via tr)', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: 'A,B,C,D' }, children: [] },
      {
        type: 'tbody',
        children: [
          { type: 'tr', content: 'one,two,three,four', children: [] }
        ]
      }
    ]
  };
  const dom = rc.render(node);
  const tds = dom.querySelector('tbody tr').querySelectorAll('td');
  assert.strictEqual(tds.length, 4);
  assert.strictEqual(tds[0].textContent, 'one');
  assert.strictEqual(tds[1].textContent, 'two');
  assert.strictEqual(tds[2].textContent, 'three');
  assert.strictEqual(tds[3].textContent, 'four');
});

// 测试：首尾单元格各自引号（混合引号）不被误剥外层引号 → 正确多格（回归 bug）
// 场景：[tr "酸汤肥牛（已退菜）",1,¥58.00,"-¥58.00"] 曾被合并成单格
test('tr with first and last cells quoted (mixed quotes) - no false outer-strip', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: '菜名,份数,单价,金额' }, children: [] },
      {
        type: 'tbody',
        children: [
          { type: 'tr', content: '"酸汤肥牛（已退菜）",1,¥58.00,"-¥58.00"', children: [] }
        ]
      }
    ]
  };
  const dom = rc.render(node);
  const tds = dom.querySelector('tbody tr').querySelectorAll('td');
  assert.strictEqual(tds.length, 4, '应拆成 4 格，首格带引号不能误剥外层');
  assert.strictEqual(tds[0].textContent, '酸汤肥牛（已退菜）');
  assert.strictEqual(tds[1].textContent, '1');
  assert.strictEqual(tds[2].textContent, '¥58.00');
  assert.strictEqual(tds[3].textContent, '-¥58.00');
});

// 测试：整体包裹（首尾各一个 "、中间无 "）仍剥外层引号 → 多格（保留旧 demo 写法）
test('tr fully wrapped single-pair quotes - still strips to multi-cell', () => {
  const rc = new TokUIRenderer();
  registerTableComponents(rc);
  const node = {
    type: 'table',
    attrs: {},
    children: [
      { type: 'thead', attrs: { cols: '姓名,角色,状态' }, children: [] },
      {
        type: 'tbody',
        children: [
          { type: 'tr', content: '"李明,管理员,正常"', children: [] }
        ]
      }
    ]
  };
  const dom = rc.render(node);
  const tds = dom.querySelector('tbody tr').querySelectorAll('td');
  assert.strictEqual(tds.length, 3, '整体包裹应剥外层后拆 3 格');
  assert.strictEqual(tds[0].textContent, '李明');
  assert.strictEqual(tds[1].textContent, '管理员');
  assert.strictEqual(tds[2].textContent, '正常');
});

run();
