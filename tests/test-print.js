/**
 * TokUI 打印区/打印按钮测试
 * 覆盖：resolvePrintScope（按 ID / self 最近祖先 print-area/card）、
 *       _triggerPrint 作用域印章与 body[data-tokui-printing] 标记、Node 环境安全降级。
 * 1:1 还原由 CSS @media print 的 visibility 作用域实现（见 tokui.css），JS 仅负责作用域标记 + window.print。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM, createElement } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer, resolvePrintScope } = require('../src/core/renderer');
const { registerFormComponents } = require('../src/components/form');
const { registerBasicComponents } = require('../src/components/basic');
const { registerLayoutComponents } = require('../src/components/layout');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function run() {
  let passed = 0, failed = 0;
  tests.forEach(t => {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + e.message); }
  });
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  teardownDOM();
  if (failed) process.exit(1);
}

function makeRenderer() {
  const rc = new TokUIRenderer({ getHandler: () => null });
  registerFormComponents(rc);
  registerBasicComponents(rc);
  registerLayoutComponents(rc);
  return rc;
}

function installGetElementById(map) {
  global.document.getElementById = function (id) { return map[id] || null; };
}

// === resolvePrintScope ===
test('resolvePrintScope: 按 ID 命中指定 print-area', () => {
  const rc = makeRenderer();
  const area = rc.render({ type: 'print-area', attrs: { id: 'pa1', tt: 'T' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa1' }, children: [] });
  installGetElementById({ pa1: area });
  assert.strictEqual(resolvePrintScope(btn, 'pa1'), area);
});

test('resolvePrintScope: self → 最近祖先 print-area', () => {
  const rc = makeRenderer();
  const area = rc.render({ type: 'print-area', attrs: { id: 'pa2' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'self' }, children: [] });
  area.querySelector('.tokui-print-area__body').appendChild(btn);
  installGetElementById({});
  assert.strictEqual(resolvePrintScope(btn, 'self'), area);
});

test('resolvePrintScope: self 无 print-area 祖先时降级到最近 card', () => {
  const rc = makeRenderer();
  const card = rc.render({ type: 'card', attrs: { tt: 'C' }, children: [
    { type: 'btn', attrs: { tx: '打印', print: 'self' }, children: [] }
  ]});
  const btn = card.querySelector('button[data-tokui-act="print"]');
  assert.notStrictEqual(btn, null);
  installGetElementById({});
  const scope = resolvePrintScope(btn, 'self');
  assert.strictEqual(scope, card);
});

test('resolvePrintScope: ID 不存在返回 null（不抛错）', () => {
  const rc = makeRenderer();
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'missing' }, children: [] });
  installGetElementById({});
  assert.strictEqual(resolvePrintScope(btn, 'missing'), null);
});

// === _triggerPrint：作用域印章 + body 标记 ===
function withWindow(fn) {
  const win = { printCalls: 0, print() { this.printCalls++; }, addEventListener() {}, removeEventListener() {} };
  global.window = win;
  global.document.body = createElement('div');
  try { fn(win); } finally {
    delete global.window;
    delete global.document.body;
  }
}

test('_triggerPrint: 给作用域加 tokui-print-target 类 + body[data-tokui-printing]', () => {
  const rc = makeRenderer();
  const area = rc.render({ type: 'print-area', attrs: { id: 'pa3', tt: 'T' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa3' }, children: [] });
  installGetElementById({ pa3: area });
  withWindow((win) => {
    rc._triggerPrint(btn);
    assert.strictEqual(area.classList.contains('tokui-print-target'), true, '作用域应加 tokui-print-target 类');
    assert.strictEqual(global.document.body.getAttribute('data-tokui-printing'), '1', 'body 应标记 printing');
    assert.ok(win.printCalls >= 1, '应调用 window.print');
  });
});

test('_triggerPrint: 无目标作用域时不打印', () => {
  const rc = makeRenderer();
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'missing' }, children: [] });
  installGetElementById({});
  withWindow((win) => {
    rc._triggerPrint(btn);
    assert.strictEqual(win.printCalls, 0, '无作用域不应调 print');
    assert.strictEqual(global.document.body.hasAttribute('data-tokui-printing'), false);
  });
});

test('_triggerPrint: Node 环境无 window 时安全跳过（不抛错）', () => {
  const rc = makeRenderer();
  const area = rc.render({ type: 'print-area', attrs: { id: 'pa4' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa4' }, children: [] });
  installGetElementById({ pa4: area });
  // 不安装 window
  assert.doesNotThrow(() => rc._triggerPrint(btn));
});

// === 空白页消除：隐藏不含目标的 body 顶层节点 ===
function withWindowAndBody(body, fn) {
  const listeners = [];
  const win = {
    printCalls: 0,
    print() { this.printCalls++; },
    addEventListener(type, l) { listeners.push({ type, fn: l }); },
    removeEventListener() {},
  };
  global.window = win;
  global.document.body = body;
  try { fn(win, listeners); } finally {
    delete global.window;
    delete global.document.body;
  }
}

test('_triggerPrint 隐藏不含目标的 body 顶层节点（消除空白页）', () => {
  const rc = makeRenderer();
  const scope = rc.render({ type: 'print-area', attrs: { id: 'pa' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa' }, children: [] });
  installGetElementById({ pa: scope });
  // body 顶层：A（无关）、B（含目标）、C（无关）
  const A = createElement('div'); A.setAttribute('class', 'A');
  const B = createElement('div');
  const C = createElement('div'); C.setAttribute('class', 'C');
  B.appendChild(scope);
  const body = createElement('div');
  body.appendChild(A); body.appendChild(B); body.appendChild(C);
  withWindowAndBody(body, () => {
    rc._triggerPrint(btn);
    assert.strictEqual(A.hasAttribute('data-tokui-print-hidden'), true, 'A 不含目标应被隐藏');
    assert.strictEqual(C.hasAttribute('data-tokui-print-hidden'), true, 'C 不含目标应被隐藏');
    assert.strictEqual(B.hasAttribute('data-tokui-print-hidden'), false, 'B 含目标不得隐藏');
    assert.strictEqual(scope.classList.contains('tokui-print-target'), true);
  });
});

test('_triggerPrint cleanup 恢复被隐藏的节点', () => {
  const rc = makeRenderer();
  const scope = rc.render({ type: 'print-area', attrs: { id: 'pa2' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa2' }, children: [] });
  installGetElementById({ pa2: scope });
  const A = createElement('div');
  const B = createElement('div');
  B.appendChild(scope);
  const body = createElement('div');
  body.appendChild(A); body.appendChild(B);
  withWindowAndBody(body, (_win, listeners) => {
    rc._triggerPrint(btn);
    assert.strictEqual(A.hasAttribute('data-tokui-print-hidden'), true);
    // 模拟 afterprint 事件触发 cleanup
    const afterprint = listeners.find(l => l.type === 'afterprint');
    assert.ok(afterprint, '应注册 afterprint 监听');
    afterprint.fn();
    assert.strictEqual(A.hasAttribute('data-tokui-print-hidden'), false, 'cleanup 后应恢复显示');
    assert.strictEqual(scope.classList.contains('tokui-print-target'), false, 'cleanup 后应移除作用域类');
  });
});

// === 祖主链 containing-block 复位（修复打印内容偏右/左侧大片留白）===
// 宿主页常把 print-area 套在 position:relative / transform 的容器里（文档站侧栏、
// 居中列、带动画的气泡），令 .tokui-print-target 的 position:absolute;left:0 锚到
// 该祖主而非页面。_triggerPrint 临时把这些祖主复位为 static/none，cleanup 后还原。
function withWindowBodyGC(body, computedMap, fn) {
  const listeners = [];
  const win = {
    printCalls: 0, print() { this.printCalls++; },
    addEventListener(type, l) { listeners.push({ type, fn: l }); },
    removeEventListener() {},
  };
  const prevGC = global.getComputedStyle;
  global.getComputedStyle = function (el) {
    return { getPropertyValue(k) { return (computedMap.get(el) || {})[k] || ''; } };
  };
  global.window = win;
  global.document.body = body;
  try { fn(win, listeners); } finally {
    delete global.window;
    delete global.document.body;
    if (prevGC === undefined) delete global.getComputedStyle; else global.getComputedStyle = prevGC;
  }
}

test('_triggerPrint 复位祖主 position:relative → static', () => {
  const rc = makeRenderer();
  const scope = rc.render({ type: 'print-area', attrs: { id: 'pa' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa' }, children: [] });
  installGetElementById({ pa: scope });
  const wrapper = createElement('div');   // 罪魁祖主
  const body = createElement('div');
  wrapper.appendChild(scope); body.appendChild(wrapper);
  const computed = new Map();
  computed.set(wrapper, { position: 'relative' });
  withWindowBodyGC(body, computed, () => {
    rc._triggerPrint(btn);
    assert.strictEqual(wrapper.style.getPropertyValue('position'), 'static', '祖主 position 应临时复位为 static');
    assert.strictEqual(wrapper.style.getPropertyPriority('position'), 'important', '应以 !important 压过类规则');
  });
});

test('_triggerPrint 复位祖主 transform → none', () => {
  const rc = makeRenderer();
  const scope = rc.render({ type: 'print-area', attrs: { id: 'pa' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa' }, children: [] });
  installGetElementById({ pa: scope });
  const fx = createElement('div');
  const body = createElement('div');
  fx.appendChild(scope); body.appendChild(fx);
  const computed = new Map();
  computed.set(fx, { transform: 'translateY(8px)' });
  withWindowBodyGC(body, computed, () => {
    rc._triggerPrint(btn);
    assert.strictEqual(fx.style.getPropertyValue('transform'), 'none', 'transform 应复位为 none');
  });
});

test('_triggerPrint cleanup 还原祖主被复位的样式', () => {
  const rc = makeRenderer();
  const scope = rc.render({ type: 'print-area', attrs: { id: 'pa' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa' }, children: [] });
  installGetElementById({ pa: scope });
  const wrapper = createElement('div');
  const body = createElement('div');
  wrapper.appendChild(scope); body.appendChild(wrapper);
  const computed = new Map();
  computed.set(wrapper, { position: 'relative' });
  withWindowBodyGC(body, computed, (_w, listeners) => {
    rc._triggerPrint(btn);
    assert.strictEqual(wrapper.style.getPropertyValue('position'), 'static');
    const afterprint = listeners.find(l => l.type === 'afterprint');
    assert.ok(afterprint, '应注册 afterprint');
    afterprint.fn();
    assert.strictEqual(wrapper.style.getPropertyValue('position'), '', 'cleanup 后应移除内联覆盖');
    assert.strictEqual(wrapper.style.getPropertyPriority('position'), '', 'cleanup 后应清掉 !important');
  });
});

test('_triggerPrint 不触碰静态祖主（无副作用）', () => {
  const rc = makeRenderer();
  const scope = rc.render({ type: 'print-area', attrs: { id: 'pa' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa' }, children: [] });
  installGetElementById({ pa: scope });
  const wrap = createElement('div');
  const body = createElement('div');
  wrap.appendChild(scope); body.appendChild(wrap);
  withWindowBodyGC(body, new Map(), () => {
    rc._triggerPrint(btn);
    assert.strictEqual(wrap.style.getPropertyValue('position'), '', '静态祖主不应被设内联');
    assert.strictEqual(wrap.style.getPropertyValue('transform'), '', '静态祖主 transform 不应被设');
  });
});

run();
