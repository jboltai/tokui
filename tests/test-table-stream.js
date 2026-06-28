'use strict';
/**
 * 表格 tr 流式 cell 级渲染测试套件
 * 目标：tr 不再等完整 ] 才整行渲染，而是
 *   1) [tr 开标签到达即建 <tr> 占位；
 *   2) 单元格按「引号 + 括号深度」感知的逗号逐个流式 fill；
 *   3) 末格文本字符级渐显；组件格未完成时骨架、完成时渲染；
 *   4) ] 闭合时 finalize 复用同一 <tr>，不重复行。
 * 覆盖边界：双引号包裹、引号内含逗号、引号内含 DSL 文本 [p]、
 *           深度感知（不引号的 [btn]/[img] 内层 ] 不截断 tr）、多组件列、多行。
 */
const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

setupDOM();
const TokUI = require('../src/index');

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

/** 建一条流式管线，返回 { container, t }；调用方 t.feed(...) 增量喂入 */
function stream() {
  const container = document.createElement('div');
  const t = new TokUI({ container: container, streaming: true });
  t.startStream(container);
  return { container: container, t: t };
}

/** 取 tbody 元素 */
function tbodyOf(container) {
  const list = container.querySelectorAll('tbody');
  return list.length ? list[0] : null;
}
/** tbody 内的 body 行（排除 thead 行） */
function bodyRows(container) {
  const tb = tbodyOf(container);
  return tb ? tb.querySelectorAll('tr') : [];
}
/** 某行的 td 数 */
function tdCount(tr) {
  return tr ? tr.querySelectorAll('td').length : 0;
}

// ===== A. 占位 + finalize 复用 =====

test('streaming: [tr 开标签即建占位 <tr>（不等 ] ）', () => {
  const { container, t } = stream();
  t.feed('[table][thead cols:a,b][tbody][tr ');
  const rows = bodyRows(container);
  assert.strictEqual(rows.length, 1, '占位 tr 应已存在');
});

test('streaming: 完整 [tr a,b] finalize 后仍是 1 行 2 格', () => {
  const { container, t } = stream();
  t.feed('[table][thead cols:a,b][tbody][tr a,b][/tbody][/table]');
  const rows = bodyRows(container);
  assert.strictEqual(rows.length, 1, '不重复行');
  assert.strictEqual(tdCount(rows[0]), 2, '2 单元格');
});

// ===== B. 逐 cell 流式 =====

test('streaming: 逐 cell 流式——[tr a, 时首格"a"已 fill，补 b] 后 2 格', () => {
  const { container, t } = stream();
  t.feed('[table][thead cols:a,b][tbody][tr a,');
  const rows = bodyRows(container);
  assert.strictEqual(rows.length, 1, '占位行在');
  // "a," split → ["a", ""]：首格 "a" 已渲染（末尾空 partial 占位下一列，保持列布局稳定）
  assert.strictEqual(tdCount(rows[0]), 2, '首格 + 末格占位 = 2 td');
  assert.strictEqual(rows[0].querySelectorAll('td')[0].textContent, 'a', '首格文本 a');
  t.feed('b]');
  const tds = rows[0].querySelectorAll('td');
  assert.strictEqual(tds.length, 2, '2 格');
  assert.strictEqual(tds[1].textContent, 'b', '次格 b');
});

test('streaming: 末格文本字符级渐显——[tr 张 → 1 格文本"张"，补 三] → "张三"', () => {
  const { container, t } = stream();
  t.feed('[table][thead cols:name][tbody][tr 张');
  const rows = bodyRows(container);
  assert.strictEqual(tdCount(rows[0]), 1, '末格 partial 也建 td');
  const td = rows[0].querySelectorAll('td')[0];
  assert.strictEqual(td.textContent, '张', '字符级：当前文本"张"');
  t.feed('三]');
  assert.strictEqual(rows[0].querySelectorAll('td')[0].textContent, '张三', '完整 → "张三"');
});

// ===== C. 引号 / 深度感知容错 =====

test('streaming: 引号内逗号不切——[tr "x,y",z] → 2 格 ["x,y","z"]', () => {
  const { container, t } = stream();
  t.feed('[table][thead cols:a,b][tbody][tr "x');
  const rows = bodyRows(container);
  // "x 残缺引号期间不应把后续 ,y 当分隔；此处仅断最终态
  t.feed(',y",z]');
  const tds = rows[0].querySelectorAll('td');
  assert.strictEqual(tds.length, 2, '引号内逗号被保护 → 2 格');
  assert.strictEqual(tds[0].textContent, 'x,y', '首格保留逗号');
  assert.strictEqual(tds[1].textContent, 'z', '次格');
});

test('streaming: 引号内 DSL 文本 [p]hi[/p] 不截断 tr', () => {
  const { container, t } = stream();
  t.feed('[table][thead cols:a,b][tbody][tr "[p]hi[/p]",z]');
  const rows = bodyRows(container);
  assert.strictEqual(rows.length, 1, '引号内 ] 不关闭 tr → 1 行');
  const tds = rows[0].querySelectorAll('td');
  assert.strictEqual(tds.length, 2, '2 格（引号整体为 1 cell）');
});

test('streaming: 多组件列（引号包，推荐写法）——按钮/标签/文本逐格流式', () => {
  const { container, t } = stream();
  // 带属性的组件 cell 须引号包（parseTag 按空格切 token，否则属性被吃进 tr.attrs）
  t.feed('[table][thead cols:op,tag,name][tbody][tr "btn:编辑",');
  const rows = bodyRows(container);
  assert.strictEqual(tdCount(rows[0]), 2, 'btn 格 + 末格占位 = 2 td');
  t.feed('"tag:新",');
  assert.strictEqual(tdCount(rows[0]), 3, 'tag 格到位 = 3 td');
  t.feed('张三]');
  const tds = rows[0].querySelectorAll('td');
  assert.strictEqual(tds.length, 3, '3 格');
  assert.ok(tds[0].querySelectorAll('button').length >= 1, '首格按钮');
  assert.ok(tds[1].querySelectorAll('.tokui-tag').length >= 1, '次格标签');
  assert.strictEqual(tds[2].textContent, '张三', '末格文本');
});

test('streaming: 深度感知——不引号的 [hr] 内层 ] 不截断 tr', () => {
  const { container, t } = stream();
  // [hr] 无空格属性 → 可不引号；其内层 ] 须按深度跳过，否则误关 tr
  t.feed('[table][thead cols:a,b][tbody][tr [hr]');
  const rows = bodyRows(container);
  assert.strictEqual(rows.length, 1, '内层 ] 未提前关 tr，占位行在');
  t.feed(',张三]');
  const tds = rows[0].querySelectorAll('td');
  assert.strictEqual(tds.length, 2, '2 格（深度感知让 [hr] 完整保留为 1 cell）');
  assert.ok(tds[0].querySelectorAll('.tokui-hr').length >= 1, '首格渲染为 hr 组件（非字面文本）');
  assert.strictEqual(tds[1].textContent, '张三', '次格文本');
});

// ===== D. 多行 + 端到端 =====

test('streaming: 多行逐行流式——2 个 tr → 2 行', () => {
  const { container, t } = stream();
  t.feed('[table][thead cols:a,b][tbody][tr 1,2]');
  assert.strictEqual(bodyRows(container).length, 1, '第 1 行');
  t.feed('[tr 3,4][/tbody][/table]');
  assert.strictEqual(bodyRows(container).length, 2, '第 2 行');
  assert.strictEqual(tdCount(bodyRows(container)[1]), 2, '第 2 行 2 格');
});

test('streaming: 端到端——thead + 2 行，每行 3 cell 逐段到齐', () => {
  const { container, t } = stream();
  t.feed('[table stripe][thead cols:#,name,score][tbody]');
  t.feed('[tr 1,张三,98]');
  t.feed('[tr 2,');
  assert.strictEqual(bodyRows(container).length, 2, '第 2 行占位已建');
  t.feed('李四,76]');
  t.endStream();
  const rows = bodyRows(container);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(tdCount(rows[0]), 3);
  assert.strictEqual(tdCount(rows[1]), 3);
  // 第 2 行第 2 格文本
  assert.strictEqual(rows[1].querySelectorAll('td')[1].textContent, '李四');
});

// ===== E. 回归对照（一次性渲染，必须始终通过）=====

test('one-shot: [tr a,b] 一次性渲染 2 格（回归）', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container: container });
  t.render('[table][thead cols:a,b][tbody][tr a,b][/tbody][/table]', container);
  const rows = bodyRows(container);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(tdCount(rows[0]), 2);
});

test('one-shot: 文本格 + btn: 操作格一次性渲染（回归）', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container: container });
  // btn: 不能在首格（会被 parseTag 当 tr 属性），须前导纯文本格进入 content 模式；
  // 多按钮用 | 分隔，clk 等带空格的按钮属性须整体引号包（parseTag 按空格切 token）
  t.render('[table][thead cols:name,op][tbody][tr 张三,btn:编辑|btn:删除][/tbody][/table]', container);
  const rows = bodyRows(container);
  const tds = rows[0].querySelectorAll('td');
  assert.strictEqual(tds.length, 2, '2 格');
  assert.strictEqual(tds[0].textContent, '张三', '首格文本');
  assert.ok(tds[1].querySelectorAll('button').length >= 2, '操作列 2 按钮');
});

run();
