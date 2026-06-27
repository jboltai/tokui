/**
 * TokUI 表单重置测试
 * 覆盖：自定义控件 _tokuiReset 契约 + data-tokui-resettable 印章 + reset 按钮点击→表单复位端到端。
 * 设计：原生 input 由 form.reset() 复位；自定义控件（slider/rate/numinput/transfer/picker/switch）
 *       暴露 _tokuiReset()，renderer 在 reset 动作中遍历 [data-tokui-resettable] 统一调用，
 *       并向 form 广播 tokuireset 事件供外部监听。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM, createElement } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { registerFormComponents } = require('../src/components/form');
const { registerBasicComponents } = require('../src/components/basic');

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
  const rc = new TokUIRenderer();
  registerFormComponents(rc);
  registerBasicComponents(rc);
  return rc;
}

function installGetElementById(map) {
  global.document.getElementById = function (id) { return map[id] || null; };
}

// 拿到组件根 wrapper 上的 hidden input（表单提交载体）
function hiddenOf(wrapper) {
  return wrapper.querySelector('input[type="hidden"]');
}

// === 各自定义控件：_tokuiReset 契约 ===

test('slider 盖 data-tokui-resettable 印章并暴露 _tokuiReset', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'slider', attrs: { v: '50', id: 'vol' }, children: [] });
  assert.strictEqual(dom.hasAttribute('data-tokui-resettable'), true);
  assert.strictEqual(typeof dom._tokuiReset, 'function');
});

test('slider _tokuiReset 复原 hidden 值与视觉（_update 改动后）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'slider', attrs: { min: '0', max: '100', v: '50', id: 'vol' }, children: [] });
  dom._update({ v: '80' });
  assert.strictEqual(String(hiddenOf(dom).value), '80');
  assert.strictEqual(dom.querySelector('.tokui-slider__value').textContent, '80');
  dom._tokuiReset();
  assert.strictEqual(String(hiddenOf(dom).value), '50');
  assert.strictEqual(dom.querySelector('.tokui-slider__value').textContent, '50');
});

test('rate _tokuiReset 复原评分', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'rate', attrs: { max: '5', v: '3', id: 'r' }, children: [] });
  dom._update({ v: '5' });
  assert.strictEqual(String(hiddenOf(dom).value), '5');
  dom._tokuiReset();
  assert.strictEqual(String(hiddenOf(dom).value), '3');
  assert.strictEqual(dom.querySelector('.tokui-rate__text').textContent, '3/5');
});

test('numinput _tokuiReset 复原数字', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'numinput', attrs: { v: '5', id: 'n' }, children: [] });
  dom._update({ v: '12' });
  assert.strictEqual(Number(hiddenOf(dom).value), 12);
  dom._tokuiReset();
  assert.strictEqual(String(hiddenOf(dom).value), '5');
  assert.strictEqual(dom.querySelector('.tokui-numinput__input').getAttribute('value'), '5');
});

test('switch _tokuiReset 复原开关态', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'switch', attrs: { chk: true, id: 'sw' }, children: [] });
  dom._update({ chk: false });
  assert.strictEqual(dom.querySelector('input').checked, false);
  dom._tokuiReset();
  assert.strictEqual(dom.querySelector('input').checked, true);
});

test('transfer _tokuiReset 复原穿梭项归属（按初始栏位归位）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'transfer', attrs: { id: 't' }, children: [
    { type: 'opt', attrs: { v: '1', tx: 'A' }, children: [] },
    { type: 'opt', attrs: { v: '2', tx: 'B', chk: true }, children: [] }
  ]});
  const panels = dom.querySelectorAll('.tokui-transfer__panel');
  const leftPanel = panels[0];
  const rightPanel = panels[1];
  // 初始：A 左、B 右
  assert.strictEqual(rightPanel._items.length, 1);
  assert.strictEqual(leftPanel._items.length, 1);
  // 模拟用户把 B 移回左栏（直接操作 DOM + _items，等效 moveChecked 后果）
  const bItem = rightPanel._items[0];
  leftPanel._body.appendChild(bItem);
  leftPanel._items.push(bItem);
  rightPanel._items.splice(0, 1);
  assert.strictEqual(rightPanel._items.length, 0);
  assert.strictEqual(leftPanel._items.length, 2);
  // reset：B 按 data-tokui-init-side 归回右栏
  dom._tokuiReset();
  assert.strictEqual(rightPanel._items.length, 1, 'B 应归回右栏');
  assert.strictEqual(leftPanel._items.length, 1, 'A 保持左栏');
});

test('picker _tokuiReset 复原单选值', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'picker', attrs: { id: 'p', ph: '选' }, children: [
    { type: 'opt', attrs: { v: 'a', tx: 'A' }, children: [] },
    { type: 'opt', attrs: { v: 'b', tx: 'B', chk: true }, children: [] }
  ]});
  // 破坏：改为 a
  const hidden = dom.querySelector('input[type=hidden]');
  hidden.value = 'a';
  dom._tokuiReset();
  // 复原回初始预选 b（_tokuiReset 直接写 hidden.value）
  assert.strictEqual(hidden.value, 'b');
});

// === reset 按钮端到端：click → 表单内所有 resettable 复位 ===
function makeBus() {
  return { getHandler: () => null };
}

test('reset 按钮 click 复位绑定表单内的自定义控件', () => {
  const rc = new TokUIRenderer(makeBus());
  registerFormComponents(rc);
  registerBasicComponents(rc);
  const form = rc.render({ type: 'form', attrs: { id: 'f1', sub: 'h' }, children: [] });
  const slider = rc.render({ type: 'slider', attrs: { v: '50', id: 'vol' }, children: [] });
  const rate = rc.render({ type: 'rate', attrs: { v: '3', id: 'r' }, children: [] });
  form.appendChild(slider);
  form.appendChild(rate);
  // 改动值
  slider._update({ v: '90' });
  rate._update({ v: '5' });
  // reset 按钮在表单外，靠 form:ID 绑定
  const resetBtn = rc.render({ type: 'btn', attrs: { tx: '重置', reset: true, form: 'f1' }, children: [] });
  const root = createElement('div');
  root.appendChild(form);
  root.appendChild(resetBtn);
  installGetElementById({ f1: form });
  // 绑定事件（bindEvents 内部按 data-tokui-act 分发 reset）
  rc.bindEvents(root);
  // 手动触发 reset 按钮 click 监听器（mock 不派发真实事件）
  const clickFn = resetBtn._events.click[resetBtn._events.click.length - 1];
  clickFn({ preventDefault() {} });
  // 断言表单内自定义控件已复位
  assert.strictEqual(String(hiddenOf(slider).value), '50', 'slider 应复位回 50');
  assert.strictEqual(String(hiddenOf(rate).value), '3', 'rate 应复位回 3');
});

test('reset 按钮无绑定表单时 click 不抛错', () => {
  const rc = new TokUIRenderer(makeBus());
  registerFormComponents(rc);
  registerBasicComponents(rc);
  const resetBtn = rc.render({ type: 'btn', attrs: { tx: '重置', reset: true }, children: [] });
  const root = createElement('div');
  root.appendChild(resetBtn);
  installGetElementById({});
  rc.bindEvents(root);
  const clickFn = resetBtn._events.click[resetBtn._events.click.length - 1];
  // 不应抛错（无 form 可绑即空操作）
  assert.doesNotThrow(() => clickFn({ preventDefault() {} }));
});

run();
