/**
 * TokUI Notification 组件测试
 * 覆盖：渲染卡片、类型图标/色条、标题描述、手动关闭、堆叠排列
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
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
  registerBasicComponents(rc);
  return rc;
}

// === 测试用例 ===

test('renders notification card with correct class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'notification', attrs: { t: 'info', tt: '提示', tx: '描述' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-notification') !== -1, 'should have tokui-notification class');
  assert.strictEqual(dom.getAttribute('role'), 'alert');
});

test('type applies correct icon and border color class', () => {
  const rc = makeRenderer();
  var types = ['success', 'error', 'warning', 'info'];
  var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  types.forEach(function (t) {
    var dom = rc.render({ type: 'notification', attrs: { t: t, tt: '标题' }, children: [] });
    assert.ok(dom.className.indexOf('tokui-notification--' + t) !== -1, 'missing class for type ' + t);
    var iconEl = dom.querySelector('.tokui-notification__icon');
    assert.ok(iconEl, 'missing icon element for type ' + t);
    assert.strictEqual(iconEl.textContent, icons[t], 'wrong icon for type ' + t);
  });
});

test('title and description text present', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'notification', attrs: { tt: '提交成功', tx: '数据已保存' }, children: [] });
  var titleEl = dom.querySelector('.tokui-notification__title');
  var descEl = dom.querySelector('.tokui-notification__desc');
  assert.ok(titleEl, 'title element should exist');
  assert.strictEqual(titleEl.textContent, '提交成功');
  assert.ok(descEl, 'desc element should exist');
  assert.strictEqual(descEl.textContent, '数据已保存');
});

test('duration 0 means no auto-hide timer', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'notification', attrs: { tt: '永久通知', duration: '0' }, children: [] });
  // duration=0 => _notifTimer should not be set (or undefined)
  assert.strictEqual(dom._notifTimer, undefined, 'should not have auto-hide timer when duration is 0');
});

test('close button exists', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'notification', attrs: { tt: '可关闭' }, children: [] });
  var closeBtn = dom.querySelector('.tokui-notification__close');
  assert.ok(closeBtn, 'close button should exist');
  assert.strictEqual(closeBtn.textContent, '×');
});

test('multiple notifications can stack', () => {
  const rc = makeRenderer();
  var dom1 = rc.render({ type: 'notification', attrs: { id: 'n1', tt: '通知1' }, children: [] });
  var dom2 = rc.render({ type: 'notification', attrs: { id: 'n2', tt: '通知2' }, children: [] });
  // Both should have the notification class
  assert.ok(dom1.className.indexOf('tokui-notification') !== -1, 'notif1 should have class');
  assert.ok(dom2.className.indexOf('tokui-notification') !== -1, 'notif2 should have class');
  // Both should have distinct titles
  var t1 = dom1.querySelector('.tokui-notification__title');
  var t2 = dom2.querySelector('.tokui-notification__title');
  assert.strictEqual(t1.textContent, '通知1');
  assert.strictEqual(t2.textContent, '通知2');
});

test('clk attribute creates action button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'notification', attrs: { tt: '操作', clk: 'handleAction' }, children: [] });
  var actionBtn = dom.querySelector('.tokui-notification__action');
  assert.ok(actionBtn, 'action button should exist when clk is provided');
  assert.strictEqual(actionBtn.getAttribute('data-tokui-clk'), 'handleAction');
});

test('notification without clk has no action button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'notification', attrs: { tt: '无操作' }, children: [] });
  var actionBtn = dom.querySelector('.tokui-notification__action');
  assert.strictEqual(actionBtn, null, 'action button should not exist without clk');
});

test('id is set as data-notif-id', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'notification', attrs: { id: 'notif1', tt: '测试' }, children: [] });
  assert.strictEqual(dom.getAttribute('data-notif-id'), 'notif1');
});

test('default type is info', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'notification', attrs: { tt: '默认' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-notification--info') !== -1);
});

// 运行所有测试
run();
