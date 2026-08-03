'use strict';

// tour 漫游引导 + modal.confirm 命令式确认（Phase 4）
var assert = require('assert');
var { setupDOM, teardownDOM, createElement } = require('./helpers/dom-mock');

setupDOM();
global.document._body = createElement('body');
global.document.body = global.document._body;
global.requestAnimationFrame = function (fn) { return fn && fn({}); };
if (typeof global.window === 'undefined') global.window = global;
global.addEventListener = global.addEventListener || function () {};
global.removeEventListener = global.removeEventListener || function () {};
global.window.innerWidth = 1024;
global.window.innerHeight = 768;

var TokUIRenderer = require('../src/core/renderer').TokUIRenderer;
var layoutMod = require('../src/components/layout');
var registerLayoutComponents = layoutMod.registerLayoutComponents;
var mountModalConfirm = layoutMod.mountModalConfirm;
require('../src/core/i18n').setLocale('zh-CN');

function makeRenderer() {
  var rc = new TokUIRenderer();
  registerLayoutComponents(rc);
  return rc;
}
function node(type, attrs, children) {
  return { type: type, attrs: attrs || {}, content: '', children: children || [] };
}
function fire(el, type, evt) {
  var fns = (el._events && el._events[type]) || [];
  evt = evt || {};
  if (!evt.target) evt.target = el;
  if (!evt.stopPropagation) evt.stopPropagation = function () {};
  if (!evt.preventDefault) evt.preventDefault = function () {};
  fns.forEach(function (fn) { fn(evt); });
}
function fireDocument(type, evt) {
  // slice 快照：浏览器事件派发期间增删监听不影响本轮派发（handler 内 removeEventListener 常见）
  var fns = ((global.document._events && global.document._events[type]) || []).slice();
  evt = evt || {};
  if (!evt.stopPropagation) evt.stopPropagation = function () {};
  fns.forEach(function (fn) { fn(evt); });
}
function resetBody() {
  global.document._body = createElement('body');
  global.document.body = global.document._body;
}
function bodyLayers(cls) {
  var out = [];
  (global.document.body.childNodes || []).forEach(function (c) {
    if (c.classList && c.classList.contains(cls)) out.push(c);
  });
  return out;
}
function tourNode(attrs, steps) {
  return node('tour', attrs, (steps || []).map(function (s) {
    return { type: 'tour-step', attrs: s, content: s.content || '', children: [] };
  }));
}

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }
function run() {
  var i = 0;
  function next() {
    if (i >= tests.length) {
      console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
      teardownDOM();
      if (failed > 0) process.exit(1);
      return;
    }
    var t = tests[i++];
    Promise.resolve()
      .then(function () { return t.fn(); })
      .then(function () { passed++; console.log('  ✓ ' + t.name); next(); })
      .catch(function (e) { failed++; console.log('  ✗ ' + t.name + '\n    ' + (e && e.message) + '\n' + (e && e.stack ? e.stack.split('\n').slice(1, 8).join('\n') : '')); next(); });
  }
  next();
}
var passed = 0, failed = 0;

// ============ tour ============

test('tour: 步骤收集（tgt 剥 # / tx 正文兜底 / pos 默认 bottom）', () => {
  var rc = makeRenderer();
  var dom = rc.render(tourNode({}, [
    { tgt: '#btn1', tt: '第一步', tx: '说明一' },
    { tt: '第二步', content: '正文说明' }
  ]));
  assert.strictEqual(dom._tokuiType, 'tour');
  var steps = dom._collectSteps();
  assert.strictEqual(steps.length, 2);
  assert.strictEqual(steps[0].tgt, 'btn1');
  assert.strictEqual(steps[1].tx, '正文说明');
  assert.strictEqual(steps[1].pos, 'bottom');
});

test('tour: open → 面板文案/计数；next → 末步变完成', () => {
  resetBody();
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(tourNode({ id: 't1' }, [
    { tt: '第一步', tx: '说明一' },
    { tt: '第二步', tx: '说明二' }
  ]));
  dom._update({ act: 'open' }); // 程序化 open：silent
  var layers = bodyLayers('tokui-tour__layer');
  assert.strictEqual(layers.length, 1);
  var layer = layers[0];
  assert.strictEqual(layer.querySelector('.tokui-tour__title').textContent, '第一步');
  assert.strictEqual(layer.querySelector('.tokui-tour__body').textContent, '说明一');
  assert.strictEqual(layer.querySelector('.tokui-tour__counter').textContent, '1 / 2');
  assert.strictEqual(layer.querySelector('.tokui-tour__next').textContent, '下一步');
  assert.strictEqual(events.length, 0);
  // 用户点击下一步 → change 上报
  fire(layer.querySelector('.tokui-tour__next'), 'click');
  assert.strictEqual(layer.querySelector('.tokui-tour__title').textContent, '第二步');
  assert.strictEqual(layer.querySelector('.tokui-tour__counter').textContent, '2 / 2');
  assert.strictEqual(layer.querySelector('.tokui-tour__next').textContent, '完成');
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].event, 'change');
  assert.strictEqual(events[0].detail.index, 1);
});

test('tour: 末步点完成 → finish 上报并关层', () => {
  resetBody();
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(tourNode({}, [{ tt: '唯一', tx: 'x' }]));
  dom._update({ act: 'open' });
  var layer = bodyLayers('tokui-tour__layer')[0];
  fire(layer.querySelector('.tokui-tour__next'), 'click'); // 只有一步 → 完成
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].event, 'finish');
  assert.strictEqual(bodyLayers('tokui-tour__layer').length, 0);
});

test('tour: 跳过/✕ → close 上报；Esc 关闭', () => {
  resetBody();
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(tourNode({}, [{ tt: 'A', tx: 'a' }, { tt: 'B', tx: 'b' }]));
  dom._update({ act: 'open' });
  var layer = bodyLayers('tokui-tour__layer')[0];
  fire(layer.querySelector('.tokui-tour__skip'), 'click');
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].event, 'close');
  assert.strictEqual(bodyLayers('tokui-tour__layer').length, 0);
  // 重开后 Esc
  dom._update({ act: 'open' });
  assert.strictEqual(bodyLayers('tokui-tour__layer').length, 1);
  fireDocument('keydown', { key: 'Escape' });
  assert.strictEqual(bodyLayers('tokui-tour__layer').length, 0);
  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[1].event, 'close');
});

test('tour: open 属性 → _streamCloseHook 自动开启（幂等）', () => {
  resetBody();
  var rc = makeRenderer();
  var dom = rc.render(tourNode({ open: true }, [{ tt: 'A', tx: 'a' }]));
  assert.strictEqual(typeof dom._streamCloseHook, 'function');
  dom._streamCloseHook();
  assert.strictEqual(bodyLayers('tokui-tour__layer').length, 1);
  dom._streamCloseHook(); // 幂等：不重复开
  assert.strictEqual(bodyLayers('tokui-tour__layer').length, 1);
});

test('tour: upd act:goto 跳步（silent）；act:close 关层（silent）', () => {
  resetBody();
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(tourNode({}, [{ tt: 'A', tx: 'a' }, { tt: 'B', tx: 'b' }, { tt: 'C', tx: 'c' }]));
  dom._update({ act: 'open' });
  dom._update({ act: 'goto', v: '2' });
  var layer = bodyLayers('tokui-tour__layer')[0];
  assert.strictEqual(layer.querySelector('.tokui-tour__title').textContent, 'C');
  dom._update({ act: 'close' });
  assert.strictEqual(bodyLayers('tokui-tour__layer').length, 0);
  assert.strictEqual(events.length, 0);
});

test('tour: 无目标元素时面板居中兜底', () => {
  resetBody();
  var rc = makeRenderer();
  var dom = rc.render(tourNode({}, [{ tgt: '#not-exist', tt: 'A', tx: 'a' }]));
  dom._update({ act: 'open' });
  var panel = bodyLayers('tokui-tour__layer')[0].querySelector('.tokui-tour__panel');
  assert.strictEqual(panel.style.left, '50%');
  assert.strictEqual(panel.style.transform, 'translate(-50%, -50%)');
});

// ============ modal.confirm ============

test('modal.confirm: 挂载到 window.TokUI（幂等）', () => {
  mountModalConfirm();
  assert.ok(global.window.TokUI.modal);
  assert.strictEqual(typeof global.window.TokUI.modal.confirm, 'function');
  assert.strictEqual(global.window.TokUI.confirm, global.window.TokUI.modal.confirm);
  var ref = global.window.TokUI.modal;
  mountModalConfirm(); // 幂等不覆盖
  assert.strictEqual(global.window.TokUI.modal, ref);
});

test('modal.confirm: 渲染结构 + i18n 默认文案', async () => {
  resetBody();
  mountModalConfirm();
  var p = global.window.TokUI.modal.confirm({ tt: '删除文件', tx: '确定要删除吗？' });
  var overlay = bodyLayers('tokui-modal__overlay')[0];
  assert.ok(overlay);
  assert.strictEqual(overlay.getAttribute('role'), 'dialog');
  assert.strictEqual(overlay.querySelector('.tokui-modal__title').textContent, '删除文件');
  assert.strictEqual(overlay.querySelector('.tokui-modal__body').textContent, '确定要删除吗？');
  assert.strictEqual(overlay.querySelector('.tokui-modal__ok').textContent, '确定');
  assert.strictEqual(overlay.querySelector('.tokui-modal__cancel').textContent, '取消');
  fire(overlay.querySelector('.tokui-modal__ok'), 'click');
  var v = await p;
  assert.strictEqual(v, true);
  assert.strictEqual(bodyLayers('tokui-modal__overlay').length, 0);
});

test('modal.confirm: 取消 → false；自定义按钮文案；danger 类型', async () => {
  resetBody();
  mountModalConfirm();
  var p = global.window.TokUI.modal.confirm({ tt: 'x', t: 'danger', 'ok-text': '删除', 'cancel-text': '再想想' });
  var overlay = bodyLayers('tokui-modal__overlay')[0];
  var okBtn = overlay.querySelector('.tokui-modal__ok');
  assert.strictEqual(okBtn.textContent, '删除');
  assert.ok(okBtn.classList.contains('tokui-btn--danger'));
  assert.strictEqual(overlay.querySelector('.tokui-modal__cancel').textContent, '再想想');
  fire(overlay.querySelector('.tokui-modal__cancel'), 'click');
  assert.strictEqual(await p, false);
});

test('modal.confirm: Esc 与遮罩点击 → false；onOk/onCancel 回调', async () => {
  resetBody();
  mountModalConfirm();
  var calls = [];
  var p1 = global.window.TokUI.confirm({ tt: 'x', onCancel: function () { calls.push('cancel'); } });
  fireDocument('keydown', { key: 'Escape' });
  assert.strictEqual(await p1, false);
  assert.deepStrictEqual(calls, ['cancel']);
  var p2 = global.window.TokUI.confirm({ tt: 'x', onOk: function () { calls.push('ok'); } });
  var overlay = bodyLayers('tokui-modal__overlay')[0];
  fire(overlay, 'click', { target: overlay }); // 点遮罩
  assert.strictEqual(await p2, false);
  var p3 = global.window.TokUI.confirm({ tt: 'x', onOk: function () { calls.push('ok'); } });
  fire(bodyLayers('tokui-modal__overlay')[0].querySelector('.tokui-modal__ok'), 'click');
  assert.strictEqual(await p3, true);
  assert.deepStrictEqual(calls, ['cancel', 'ok']);
});

run();
