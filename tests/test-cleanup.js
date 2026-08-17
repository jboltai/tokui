/**
 * 组件级清理机制测试（T0.4 监听器泄漏修复）
 * 覆盖：renderer._registerCleanup / destroy 通用清理机制，
 * affix / backtop / command(hotkey) / artifact 拖拽的 window·document 级监听解绑。
 */
'use strict';

var assert = require('assert');
var { setupDOM, teardownDOM, createElement } = require('./helpers/dom-mock');

setupDOM();
global.document._body = createElement('body');
global.document.body = global.document._body;

// window mock：可捕获 scroll/resize 监听并计数（仿 test-anchor-affix）
var winListeners = {};
global.window = {
  innerWidth: 1024,
  innerHeight: 768,
  TokUI: { _internal: {} },
  requestAnimationFrame: function (fn) { return fn && fn({}); },
  addEventListener: function (type, fn) {
    (winListeners[type] = winListeners[type] || []).push(fn);
  },
  removeEventListener: function (type, fn) {
    var arr = winListeners[type] || [];
    var i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
};
global.requestAnimationFrame = global.window.requestAnimationFrame;

var TokUIRenderer = require('../src/core/renderer').TokUIRenderer;
var registerBasicComponents = require('../src/components/basic').registerBasicComponents;
require('../src/core/i18n').setLocale('zh-CN');

function makeRenderer() {
  var rc = new TokUIRenderer();
  registerBasicComponents(rc);
  return rc;
}
function node(type, attrs, children) {
  return { type: type, attrs: attrs || {}, content: '', children: children || [] };
}
function fire(el, type, evt) {
  var fns = (el._events && el._events[type]) || [];
  evt = evt || {};
  if (!evt.preventDefault) evt.preventDefault = function () {};
  fns.slice().forEach(function (fn) { fn(evt); });
}
function winCount(type) { return (winListeners[type] || []).length; }
function docCount(type) { return (global.document._events[type] || []).length; }

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }
function run() {
  var passed = 0, failed = 0;
  for (var t of tests) {
    try { t.fn(); passed++; console.log('  ✓ ' + t.name); }
    catch (e) { failed++; console.log('  ✗ ' + t.name + '\n    ' + e.message); }
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
  if (failed > 0) process.exit(1);
}

// ============ 通用机制 ============

test('_registerCleanup 登记后 destroy 调用清理函数（且幂等）', () => {
  var rc = makeRenderer();
  var el = createElement('div');
  var calls = 0;
  rc._registerCleanup(el, function () { calls++; });
  rc._registerCleanup(el, function () { calls++; });
  assert.strictEqual(rc._cleanupElements.length, 1, '同元素只登记一次');
  rc.destroy();
  assert.strictEqual(calls, 2, '两个清理函数都被调用');
  assert.ok(!el._tokuiCleanupFns, '销毁后元素清理表已摘除');
  rc.destroy(); // 二次 destroy 不重复调用
  assert.strictEqual(calls, 2, 'destroy 幂等');
});

test('_registerCleanup 对非法入参静默跳过', () => {
  var rc = makeRenderer();
  rc._registerCleanup(null, function () {});
  rc._registerCleanup(createElement('div'), null);
  assert.strictEqual(rc._cleanupElements.length, 0);
  rc.destroy(); // 不抛错
});

test('清理函数抛错不影响其余清理与 destroy 流程', () => {
  var rc = makeRenderer();
  var el1 = createElement('div');
  var el2 = createElement('div');
  var called = 0;
  rc._registerCleanup(el1, function () { throw new Error('boom'); });
  rc._registerCleanup(el2, function () { called++; });
  rc.destroy();
  assert.strictEqual(called, 1, '首个清理抛错不阻断后续');
});

// ============ affix ============

test('destroy 移除 affix 的 window scroll/resize 监听', () => {
  var rc = makeRenderer();
  var scrollBefore = winCount('scroll');
  var resizeBefore = winCount('resize');
  var dom = rc.render(node('affix', { top: '0' }));
  assert.strictEqual(winCount('scroll'), scrollBefore + 1, 'affix 挂 scroll 监听');
  assert.strictEqual(winCount('resize'), resizeBefore + 1, 'affix 挂 resize 监听');
  assert.strictEqual(typeof dom._affixCleanup, 'function', '_affixCleanup 属性保留（宿主可手动调）');
  rc.destroy();
  assert.strictEqual(winCount('scroll'), scrollBefore, 'destroy 后 scroll 监听移除');
  assert.strictEqual(winCount('resize'), resizeBefore, 'destroy 后 resize 监听移除');
});

// ============ backtop ============

test('destroy 移除 backtop 的 scroll 监听', () => {
  var rc = makeRenderer();
  var scrollBefore = winCount('scroll');
  // 不挂载到容器：btn 无父级 → scrollEl 落 window（mock 无 getComputedStyle，避免探测祖先分支）
  var dom = rc.render(node('backtop', {}));
  assert.strictEqual(winCount('scroll'), scrollBefore + 1, 'backtop 挂 scroll 监听');
  assert.strictEqual(typeof dom._backtopCleanup, 'function', '_backtopCleanup 属性保留（demo.js 调用契约）');
  rc.destroy();
  assert.strictEqual(winCount('scroll'), scrollBefore, 'destroy 后 scroll 监听移除');
});

// ============ command hotkey ============

test('destroy 解绑 command hotkey 的 document keydown', () => {
  var rc = makeRenderer();
  var before = docCount('keydown');
  rc.render(node('command', { hotkey: true }, [
    node('command-group', {}, [node('command-item', { tx: '打开' })])
  ]));
  assert.strictEqual(docCount('keydown'), before + 1, 'hotkey 声明后 document 挂 keydown');
  rc.destroy();
  assert.strictEqual(docCount('keydown'), before, 'destroy 后 keydown 解绑');
});

test('command 无 hotkey 属性不挂 document keydown', () => {
  var rc = makeRenderer();
  var before = docCount('keydown');
  rc.render(node('command', {}, [
    node('command-group', {}, [node('command-item', { tx: '打开' })])
  ]));
  assert.strictEqual(docCount('keydown'), before, '无 hotkey 不挂监听');
  rc.destroy();
  assert.strictEqual(docCount('keydown'), before);
});

// ============ artifact 拖拽 ============

test('destroy 清理 artifact 拖拽中的 document 级 mousemove/mouseup', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('artifact', { tt: 'A', lang: 'text' }, [
    node('artifact-code', {}, [{ type: '_text', content: 'code' }])
  ]));
  var moveBefore = docCount('mousemove');
  var upBefore = docCount('mouseup');
  // 按下拖拽手柄 → document 级监听挂上
  fire(dom.querySelector('.tokui-artifact__resize'), 'mousedown');
  assert.strictEqual(docCount('mousemove'), moveBefore + 1, 'mousedown 后挂 mousemove');
  assert.strictEqual(docCount('mouseup'), upBefore + 1, 'mousedown 后挂 mouseup');
  // 拖拽中销毁（无 mouseup）：清理机制兜底解绑
  rc.destroy();
  assert.strictEqual(docCount('mousemove'), moveBefore, 'destroy 后 mousemove 解绑');
  assert.strictEqual(docCount('mouseup'), upBefore, 'destroy 后 mouseup 解绑');
});

test('artifact 正常 mouseup 结束拖拽后 destroy 无残留', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('artifact', { tt: 'A', lang: 'text' }, [
    node('artifact-code', {}, [{ type: '_text', content: 'code' }])
  ]));
  var moveBefore = docCount('mousemove');
  var upBefore = docCount('mouseup');
  fire(dom.querySelector('.tokui-artifact__resize'), 'mousedown');
  // 正常 mouseup：onDragEnd 自行解绑
  (global.document._events.mouseup || []).slice().forEach(function (fn) { fn({}); });
  assert.strictEqual(docCount('mousemove'), moveBefore, 'mouseup 后 mousemove 已解绑');
  assert.strictEqual(docCount('mouseup'), upBefore, 'mouseup 后自身解绑');
  rc.destroy(); // 清理函数幂等，不抛错
  assert.strictEqual(docCount('mousemove'), moveBefore);
  assert.strictEqual(docCount('mouseup'), upBefore);
});

run();
