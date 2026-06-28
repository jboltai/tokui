'use strict';
/**
 * 表格合并单元格测试套件（最小 token DSL：cell 尾缀 =cN/=rN/=cNrM + thead ; 分行）
 * 横向 colspan / 纵向 rowspan，表头 + 表体均支持。浏览器原生 table 布局自动追踪列位。
 */
const assert = require('assert');
const { setupDOM } = require('./helpers/dom-mock');

setupDOM();
const { TokUIRenderer } = require('../src/core/renderer');
const { registerTableComponents } = require('../src/components/table');

const tests = [];
let passed = 0, failed = 0;
function test(name, fn) { tests.push({ name, fn }); }
function run() {
  passed = 0; failed = 0;
  for (const t of tests) {
    try { t.fn(); passed++; console.log('  ✓ ' + t.name); }
    catch (e) { failed++; console.log('  ✗ ' + t.name + '\n    ' + (e.message || e)); }
  }
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed (of ' + tests.length + ')');
  if (failed > 0) process.exit(1);
}

function newRC() { const r = new TokUIRenderer(); registerTableComponents(r); return r; }
/** 渲染一行 tr，返回其 td 数组 */
function rowTds(rc, content, colTypes) {
  const tr = rc.render({ type: 'tr', attrs: {}, content: content, children: [], _colTypes: colTypes || [] });
  return tr.querySelectorAll('td');
}

// ===== 单元格 span 修饰符（body）=====

test('body: 任意格 colspan — [tr a,b=c3,c] → td1 colspan=3', () => {
  const tds = rowTds(newRC(), 'a,b=c3,c');
  assert.strictEqual(tds.length, 3, '3 td');
  assert.strictEqual(tds[1].getAttribute('colspan'), '3', '次格 colspan=3');
  assert.strictEqual(tds[1].textContent, 'b', '次格文本 b');
  assert.ok(!tds[0].getAttribute('colspan'), '首格无 colspan');
});

test('body: 首格 colspan — [tr 合计=c4,540] → td0 colspan=4', () => {
  const tds = rowTds(newRC(), '合计=c4,540');
  assert.strictEqual(tds.length, 2, '2 td（无需 ,,, 占位）');
  assert.strictEqual(tds[0].getAttribute('colspan'), '4');
  assert.strictEqual(tds[0].textContent, '合计');
  assert.strictEqual(tds[1].textContent, '540');
});

test('body: rowspan — 单格 =r2 不崩，属性正确', () => {
  const tds = rowTds(newRC(), 'a=r2,b,c');
  assert.strictEqual(tds.length, 3);
  assert.strictEqual(tds[0].getAttribute('rowspan'), '2', '首格 rowspan=2');
  assert.strictEqual(tds[0].textContent, 'a');
});

test('body: combined =c2r2 — 同时横纵跨', () => {
  const tds = rowTds(newRC(), 'x=c2r2,y');
  assert.strictEqual(tds[0].getAttribute('colspan'), '2');
  assert.strictEqual(tds[0].getAttribute('rowspan'), '2');
  assert.strictEqual(tds[0].textContent, 'x');
});

test('body: =r2c3 顺序无关（r 在前）', () => {
  const tds = rowTds(newRC(), 'x=r2c3,y');
  assert.strictEqual(tds[0].getAttribute('rowspan'), '2');
  assert.strictEqual(tds[0].getAttribute('colspan'), '3');
});

test('守卫: 公式=x=2 不误判（无 c/r 前缀）', () => {
  const tds = rowTds(newRC(), '公式=x=2');
  assert.strictEqual(tds.length, 1);
  assert.strictEqual(tds[0].textContent, '公式=x=2', '原样保留');
  assert.ok(!tds[0].getAttribute('colspan'));
});

test('守卫: 版本=v2 不误判（v 非 c/r）', () => {
  const tds = rowTds(newRC(), '版本=v2');
  assert.strictEqual(tds[0].textContent, '版本=v2');
  assert.ok(!tds[0].getAttribute('colspan'));
});

test('守卫: 纯 =c 无数字不误判', () => {
  const tds = rowTds(newRC(), 'a=c,b');
  assert.strictEqual(tds.length, 2);
  assert.strictEqual(tds[0].textContent, 'a=c', '=c 无数字 → 字面');
});

// ===== 表头多行 + 合并 =====

function theadRows(rc, cols) {
  const thead = rc.render({ type: 'thead', attrs: { cols: cols }, content: '', children: [] });
  return thead.querySelectorAll('tr');
}

test('thead: ; 分两行 — cols:"a=c2,b;cd,e" → 2 tr', () => {
  const rows = theadRows(newRC(), 'a=c2,b;cd,e');
  assert.strictEqual(rows.length, 2, '2 行表头');
  const r0th = rows[0].querySelectorAll('th');
  assert.strictEqual(r0th.length, 2, 'row1 2 th（a 跨2 + b）');
  assert.strictEqual(r0th[0].getAttribute('colspan'), '2', 'a colspan=2');
  assert.strictEqual(r0th[0].textContent, 'a');
});

test('thead: rowspan — cols:"a=r2,b;c" → row1 th0 rowspan2, row2 仅 1 th', () => {
  const rows = theadRows(newRC(), 'a=r2,b;c');
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].querySelectorAll('th')[0].getAttribute('rowspan'), '2');
  assert.strictEqual(rows[1].querySelectorAll('th').length, 1, 'row2 只 1 th（a 占住 col0）');
  assert.strictEqual(rows[1].querySelectorAll('th')[0].textContent, 'c');
});

test('thead: 单行无 ; 向后兼容 — cols:"a,b,c" → 1 tr 3 th', () => {
  const rows = theadRows(newRC(), 'a,b,c');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].querySelectorAll('th').length, 3);
});

test('thead: colTypes 从末行推导（分组行不污染）', () => {
  const rc = newRC();
  // 分组行「组=c2,数量」(数量是文本不是 colType) → 末行「#,姓名」才推导 colTypes
  rc.render({ type: 'thead', attrs: { cols: '组=c2,数量;#,姓名' }, content: '', children: [] });
  const tr = rc.render({ type: 'tr', attrs: {}, content: 'x,y', children: [] });
  const tds = tr.querySelectorAll('td');
  // 末行首列 # → body 首格应为序号格；分组行的「数量」未污染 colTypes
  assert.ok(tds[0].className.indexOf('tokui-col-seq') >= 0, '末行 # 列 → body 首格序号');
});

// ===== 端到端：完整表格（表头合并 + 表体合并）=====

test('e2e: 两行表头 + 表体 rowspan 分组 + colspan 总计', () => {
  const rc = newRC();
  const table = rc.render({
    type: 'table', attrs: { stripe: true }, content: '', children: [
      { type: 'thead', attrs: { cols: '大区=c2,客户=r2,金额=c2;城市,联系人,数量,单价' }, content: '', children: [] },
      { type: 'tbody', attrs: {}, content: '', children: [
        { type: 'tr', attrs: {}, content: '华北区=r2,北京,字节,5,1280', children: [] },
        { type: 'tr', attrs: {}, content: '上海,星辰,8,320', children: [] },
        { type: 'tr', attrs: {}, content: '合计=c2,--,13,1600', children: [] },
      ] },
    ]
  });
  const rows = table.querySelectorAll('tbody')[0].querySelectorAll('tr');
  assert.strictEqual(rows.length, 3, '3 body 行');
  // row0: 华北区(r2) + 北京 + 字节 + 5 + 1280 = 5 td，首格 rowspan2
  const r0 = rows[0].querySelectorAll('td');
  assert.strictEqual(r0.length, 5);
  assert.strictEqual(r0[0].getAttribute('rowspan'), '2', '华北区 rowspan2');
  assert.strictEqual(r0[0].textContent, '华北区');
  // row1: 华北区占住 col0 → 只 4 td
  assert.strictEqual(rows[1].querySelectorAll('td').length, 4, '下行少 1 格（rs 占位）');
  // row2: 合计 colspan2
  const r2 = rows[2].querySelectorAll('td');
  assert.strictEqual(r2[0].getAttribute('colspan'), '2', '合计 colspan2');
});

// ===== 向后兼容：旧 cs:N 仍工作 =====

test('兼容: 旧 tr cs:4 首格 colspan 仍工作', () => {
  const rc = newRC();
  const tr = rc.render({ type: 'tr', attrs: { cs: '4' }, content: '合计,,,,540', children: [] });
  const tds = tr.querySelectorAll('td');
  // cs:4 → 首格 colspan4，覆盖的 idx1-3 跳过 → 仅 2 td（合计 + 540）
  assert.strictEqual(tds.length, 2, '2 td（3 个覆盖格跳过）');
  assert.strictEqual(tds[0].getAttribute('colspan'), '4', 'cs:4 → 首格 colspan4');
  assert.strictEqual(tds[1].textContent, '540');
});

// ===== 流式：rowspan 行 + 下行少格 =====

test('streaming: 流式 rowspan — row0 a=r2,b,c → row1 d,e 渐显', () => {
  const { setupDOM: s2 } = {}; // 已 setupDOM
  const TokUI = require('../src/index');
  const container = document.createElement('div');
  const t = new TokUI({ container: container, streaming: true });
  t.startStream(container);
  t.feed('[table][thead cols:"x,y,z"][tbody][tr a=r2,b,c]');
  const rows = container.querySelectorAll('tbody')[0].querySelectorAll('tr');
  assert.strictEqual(rows.length, 1, 'row0 占位在');
  const r0 = rows[0].querySelectorAll('td');
  assert.strictEqual(r0[0].getAttribute('rowspan'), '2', 'row0 首格 rowspan2');
  t.feed('[tr d,e][/tbody][/table]');
  const rows2 = container.querySelectorAll('tbody')[0].querySelectorAll('tr');
  assert.strictEqual(rows2.length, 2, '2 行');
  assert.strictEqual(rows2[1].querySelectorAll('td').length, 2, 'row1 2 格（col0 被 rs 占）');
});

// ===== 列对齐：rowspan 下按列位（非 td-idx）=====

test('align: body 列对齐按列位 — 大区=r2 header 居中，body 下行偏移格仍按真实列对齐', () => {
  const rc = newRC();
  const table = rc.render({
    type: 'table', attrs: {}, content: '', children: [
      { type: 'thead', attrs: { cols: '大区=r2/c,客户,数量/c,单价/r' }, content: '', children: [] },
      { type: 'tbody', attrs: {}, content: '', children: [
        { type: 'tr', attrs: {}, content: '华北=r2,x,5,100', children: [] },
        { type: 'tr', attrs: {}, content: 'y,6,200', children: [] },
      ] },
    ]
  });
  const rows = table.querySelectorAll('tbody')[0].querySelectorAll('tr');
  // row1 大区省略：y→col1(客户,left), 6→col2(数量,center), 200→col3(单价,right)
  const r1 = rows[1].querySelectorAll('td');
  assert.ok(r1[2].className.indexOf('tokui-col-right') >= 0, 'row1 td2(200,单价) 应右对齐（按列位非 td-idx）');
  assert.ok(r1[1].className.indexOf('tokui-col-center') >= 0, 'row1 td1(6,数量) 居中');
  // y→客户列，默认 left（无 center/right 类）
  assert.ok(r1[0].className.indexOf('tokui-col-center') === -1 && r1[0].className.indexOf('tokui-col-right') === -1,
    'row1 td0(y,客户) 左对齐（不被大区的 center 污染）');
});

test('align: rowspan 表头列对齐传导到 body（大区列居中）', () => {
  const rc = newRC();
  const table = rc.render({
    type: 'table', attrs: {}, content: '', children: [
      { type: 'thead', attrs: { cols: '大区=r2/c,数据' }, content: '', children: [] },
      { type: 'tbody', attrs: {}, content: '', children: [
        { type: 'tr', attrs: {}, content: '华北,a' },
      ] },
    ]
  });
  const td0 = table.querySelectorAll('tbody')[0].querySelectorAll('tr')[0].querySelectorAll('td')[0];
  assert.ok(td0.className.indexOf('tokui-col-center') >= 0, '大区列 body 格居中（rowspan 表头对齐传导）');
});

// ===== 汇总行变体 v:total =====

test('v:total: tr 加汇总行变体类', () => {
  const rc = newRC();
  const tr = rc.render({ type: 'tr', attrs: { v: 'total' }, content: '汇总=c8,¥100', children: [] });
  assert.ok(tr.className.indexOf('tokui-table-row--total') >= 0, 'v:total → tr 加 --total 类');
  // cell 仍正常渲染（汇总 colspan8 + 金额）
  const tds = tr.querySelectorAll('td');
  assert.strictEqual(tds[0].getAttribute('colspan'), '8');
  assert.strictEqual(tds[1].textContent, '¥100');
});

// ===== 列配色 + 操作列居中 =====

test('color: 列第三段 /color 传导 body（数量primary 单价warning 金额danger）', () => {
  const rc = newRC();
  const table = rc.render({
    type: 'table', attrs: {}, content: '', children: [
      { type: 'thead', attrs: { cols: '名称,数量/c/primary,单价/r/warning,金额/r/danger' }, content: '', children: [] },
      { type: 'tbody', attrs: {}, content: '', children: [
        { type: 'tr', attrs: {}, content: 'A,5,1280,6400' },
      ] },
    ]
  });
  const tds = table.querySelectorAll('tbody')[0].querySelectorAll('tr')[0].querySelectorAll('td');
  assert.ok(tds[1].className.indexOf('tokui-text--primary') >= 0, '数量列 primary');
  assert.ok(tds[1].className.indexOf('tokui-col-center') >= 0, '数量列居中');
  assert.ok(tds[2].className.indexOf('tokui-text--warning') >= 0, '单价列 warning');
  assert.ok(tds[2].className.indexOf('tokui-col-right') >= 0, '单价列右');
  assert.ok(tds[3].className.indexOf('tokui-text--danger') >= 0, '金额列 danger');
  assert.ok(tds[0].className.indexOf('tokui-text--') === -1, '名称列无色');
});

test('align: 操作列(btn)居中传导 body', () => {
  const rc = newRC();
  const table = rc.render({
    type: 'table', attrs: {}, content: '', children: [
      { type: 'thead', attrs: { cols: '数据,操作=r2/c;客户' }, content: '', children: [] },
      { type: 'tbody', attrs: {}, content: '', children: [
        { type: 'tr', attrs: {}, content: 'a,btn:编辑|btn:删除' },
      ] },
    ]
  });
  const td = table.querySelectorAll('tbody')[0].querySelectorAll('tr')[0].querySelectorAll('td')[1];
  assert.ok(td.className.indexOf('tokui-col-center') >= 0, '操作列 body 居中');
  assert.ok(td.className.indexOf('tokui-col-action') >= 0, '操作列 action 类保留');
  assert.ok(td.querySelectorAll('button').length >= 2, '2 按钮');
});

run();
