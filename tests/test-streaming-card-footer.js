/**
 * 流式渲染 card/ft 挂载位置测试套件
 * 回归：ft（含 tx 自闭合模式）流式挂载时必须落在 card 下，而非 card-body slot。
 * 触发条件：parser 对带 tx 的 ft 触发容器自闭合逃逸 → 走 _streamChild 而非 _streamOpen，
 *           故 renderer 必须在 _streamChild 内对 ft 做与 _streamOpen 对称的特殊处理。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

// 在引入 renderer 之前设置 DOM mock
setupDOM();

const TokUI = require('../src/index');

/** 测试用例存储 */
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

/** 深度优先查找第一个含指定 class 的元素 */
function findByClass(root, cls) {
  for (const c of (root.childNodes || [])) {
    if (c.nodeType === 1 && c.className && c.className.indexOf(cls) >= 0) return c;
    const found = findByClass(c, cls);
    if (found) return found;
  }
  return null;
}

/** 走 TokUI 流式管线渲染一段 DSL，返回根容器 */
function streamRender(dsl) {
  const container = document.createElement('div');
  const t = new TokUI({ container: container, streaming: true });
  t.startStream(container);
  t.feed(dsl);
  t.endStream();
  return container;
}

// === 失败用例（修复前 RED）：tx 自闭合 ft 流式应落在 card 下 ===
test('streaming: tx self-closing ft mounts under card, not card-body', () => {
  const container = streamRender('[card tt:标题][p]正文[/p][ft tx:底部说明][/card]');
  const card = findByClass(container, 'tokui-card');
  const body = findByClass(container, 'tokui-card-body');
  const footer = findByClass(container, 'tokui-card-footer');
  assert.ok(card, 'card 存在');
  assert.ok(footer, 'footer 存在');
  assert.strictEqual(footer.parentNode, card,
    'tx 自闭合 ft 必须挂在 card 元素下，而非 card-body（实际父：' + (footer.parentNode && footer.parentNode.className) + '）');
  assert.notStrictEqual(footer.parentNode, body,
    'footer 不应嵌在 card-body 内');
  assert.strictEqual(footer.textContent, '底部说明', 'tx 文本保留');
});

// === 回归保护：容器模式 ft 流式仍正确 ===
test('streaming: container-mode ft still mounts under card (regression)', () => {
  const container = streamRender('[card tt:标题][p]正文[/p][ft][btn 确定 clk:x][btn 取消 clk:y][/ft][/card]');
  const card = findByClass(container, 'tokui-card');
  const footer = findByClass(container, 'tokui-card-footer');
  assert.ok(footer, 'footer 存在');
  assert.strictEqual(footer.parentNode, card,
    '容器模式 ft 必须挂在 card 下');
  const btns = Array.from(footer.childNodes || []).filter(c => c.nodeType === 1);
  assert.strictEqual(btns.length, 2, 'footer 含两个按钮');
});

// === 回归保护：ft 嵌套在 row/col 之后，仍挂 card 下 ===
test('streaming: tx ft after row/col mounts under card (regression)', () => {
  const container = streamRender('[card tt:标题][row][col span:12][p]正文[/p][/col][/row][ft tx:说明文字][/card]');
  const card = findByClass(container, 'tokui-card');
  const body = findByClass(container, 'tokui-card-body');
  const footer = findByClass(container, 'tokui-card-footer');
  assert.ok(footer, 'footer 存在');
  assert.strictEqual(footer.parentNode, card,
    'row/col 之后的 ft 必须挂 card 下，栈顶回弹到 card');
  assert.notStrictEqual(footer.parentNode, body);
});

// === 回归保护：card 外的 ft 仍按普通子节点处理（不应误挂到不存在的 card） ===
test('streaming: ft outside any card mounts to root container', () => {
  const container = streamRender('[ft tx:独立页脚]');
  const footer = findByClass(container, 'tokui-card-footer');
  assert.ok(footer, 'footer 存在');
  assert.strictEqual(footer.parentNode, container,
    'card 外的 ft 挂到根容器');
});

// === 一次性渲染对照组（必须始终通过）===
test('one-shot: tx ft mounts under card (control)', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container: container });
  t.render('[card tt:标题][p]正文[/p][ft tx:底部说明][/card]', container);
  const card = findByClass(container, 'tokui-card');
  const footer = findByClass(container, 'tokui-card-footer');
  assert.ok(footer, 'footer 存在');
  assert.strictEqual(footer.parentNode, card,
    '一次性渲染 tx ft 应挂 card 下');
});

/**
 * 运行所有测试
 */
function run() {
  console.log('');
  tests.forEach(t => {
    try {
      t.fn();
      passed++;
      console.log('  ✓ ' + t.name);
    } catch (e) {
      failed++;
      console.log('  ✗ ' + t.name);
      console.log('    ' + (e.message || e));
    }
  });
  console.log('');
  console.log('  ' + passed + ' passed, ' + failed + ' failed (of ' + tests.length + ')');
  if (failed > 0) {
    process.exit(1);
  }
}

run();
