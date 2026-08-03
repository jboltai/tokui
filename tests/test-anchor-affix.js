'use strict';

// anchor 锚点导航 + affix 固钉（Phase 4）
var assert = require('assert');
var { setupDOM, teardownDOM, createElement } = require('./helpers/dom-mock');

setupDOM();
global.document._body = createElement('body');
global.document.body = global.document._body;

// window mock：可捕获 scroll 监听并手动触发（仿 test-datepicker）
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
function fireWindow(type) {
  (winListeners[type] || []).slice().forEach(function (fn) { fn({}); });
}

var TokUIRenderer = require('../src/core/renderer').TokUIRenderer;
var registerLayoutComponents = require('../src/components/layout').registerLayoutComponents;
var registerBasicComponents = require('../src/components/basic').registerBasicComponents;
require('../src/core/i18n').setLocale('zh-CN');

function makeRenderer() {
  var rc = new TokUIRenderer();
  registerBasicComponents(rc);
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
// 注册带 id 元素到 mock document 的 id 注册表
function registerId(el, id) {
  el.setAttribute('id', id);
  return el;
}

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

// ============ anchor ============

test('anchor: opt 简写渲染锚点项，首项默认激活', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('anchor', { opt: 's1:第一节;s2:第二节;s3:第三节' }));
  assert.strictEqual(dom._tokuiType, 'anchor');
  assert.strictEqual(dom.getAttribute('aria-label'), '锚点导航');
  var items = dom.querySelectorAll('.tokui-anchor__item');
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0]._anchorValue, 's1');
  assert.strictEqual(items[0].textContent, '第一节');
  assert.ok(items[0].classList.contains('tokui-anchor__item--active'));
});

test('anchor: opt 目标 id 剥 # 前缀', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('anchor', { opt: '#sec-a:A节' }));
  assert.strictEqual(dom.querySelectorAll('.tokui-anchor__item')[0]._anchorValue, 'sec-a');
});

test('anchor: 点击激活并上报 change', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('anchor', { opt: 's1:一;s2:二' }));
  var items = dom.querySelectorAll('.tokui-anchor__item');
  fire(items[1], 'click');
  assert.ok(items[1].classList.contains('tokui-anchor__item--active'));
  assert.ok(!items[0].classList.contains('tokui-anchor__item--active'));
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].type, 'anchor');
  assert.strictEqual(events[0].event, 'change');
  assert.strictEqual(events[0].detail.value, 's2');
});

test('anchor: 键盘 Enter 触发激活', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('anchor', { opt: 's1:一;s2:二' }));
  var items = dom.querySelectorAll('.tokui-anchor__item');
  fire(items[1], 'keydown', { key: 'Enter' });
  assert.ok(items[1].classList.contains('tokui-anchor__item--active'));
});

test('anchor: upd v 程序化高亮不上报', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('anchor', { id: 'a1', opt: 's1:一;s2:二' }));
  dom._update({ v: 's2' });
  var items = dom.querySelectorAll('.tokui-anchor__item');
  assert.ok(items[1].classList.contains('tokui-anchor__item--active'));
  assert.strictEqual(events.length, 0);
});

test('anchor: scroll-spy 高亮最近过顶项（silent）', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('anchor', { opt: 's1:一;s2:二' }));
  // 挂载滚动监听（rAF 同步执行后 spy 首次运行，目标不存在 → 保持首项）
  var items = dom.querySelectorAll('.tokui-anchor__item');
  // 打桩目标元素：s1 在顶线下方 50px，s2 已过顶 -5px → 应激活 s2
  var sec1 = registerId(createElement('div'), 's1');
  var sec2 = registerId(createElement('div'), 's2');
  sec1.getBoundingClientRect = function () { return { top: 50 }; };
  sec2.getBoundingClientRect = function () { return { top: -5 }; };
  fireWindow('scroll');
  assert.ok(items[1].classList.contains('tokui-anchor__item--active'));
  assert.ok(!items[0].classList.contains('tokui-anchor__item--active'));
  assert.strictEqual(events.length, 0); // spy 走 silent 不上报
});

// ============ affix ============

test('affix: 容器渲染 + 子节点挂载', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('affix', { top: '10', id: 'af1' }, [
    node('p', { content: '' }, [])
  ]));
  assert.strictEqual(dom._tokuiType, 'affix');
  assert.strictEqual(dom.id, 'af1');
  assert.ok(dom.classList.contains('tokui-affix'));
  assert.ok(dom.querySelector('p'));
});

test('affix: 越过偏移量固定，回滚释放', () => {
  var rc = makeRenderer();
  var parent = createElement('div');
  var dom = rc.render(node('affix', { top: '0' }, [node('btn', { tx: 'x' })]));
  parent.appendChild(dom);
  // 首次 check 已运行（无 getBoundingClientRect → 跳过），打桩后触发
  dom.getBoundingClientRect = function () { return { top: -5, height: 20, width: 100, left: 0 }; };
  fireWindow('scroll');
  assert.ok(dom.classList.contains('tokui-affix--fixed'));
  assert.strictEqual(dom.style.top, '0px');
  // 占位元素插入防跳动
  var ph = parent.querySelector('.tokui-affix__placeholder');
  assert.ok(ph);
  assert.strictEqual(ph.style.height, '20px');
  // 回滚：占位回到顶线下方 → 释放
  ph.getBoundingClientRect = function () { return { top: 10 }; };
  fireWindow('scroll');
  assert.ok(!dom.classList.contains('tokui-affix--fixed'));
  assert.strictEqual(dom.style.top, '');
  assert.ok(!parent.querySelector('.tokui-affix__placeholder'));
});

test('affix: cleanup 解绑滚动监听', () => {
  var rc = makeRenderer();
  var before = (winListeners['scroll'] || []).length;
  var dom = rc.render(node('affix', {}, [node('btn', { tx: 'x' })]));
  assert.ok((winListeners['scroll'] || []).length > before);
  assert.strictEqual(typeof dom._affixCleanup, 'function');
  dom._affixCleanup();
  assert.strictEqual((winListeners['scroll'] || []).length, before);
});

test('affix: bottom 固底语义（低于底线固定，回探释放）', () => {
  var rc = makeRenderer();
  var parent = createElement('div');
  var dom = rc.render(node('affix', { bottom: '8' }, [node('p', { content: '' })]));
  parent.appendChild(dom);
  // window 语义（无可滚动祖先）：底线 = innerHeight(768) - 8 - 高(40) = 720
  dom.getBoundingClientRect = function () { return { top: 700, height: 40, width: 100, left: 0 }; };
  fireWindow('scroll');
  assert.ok(!dom.classList.contains('tokui-affix--fixed')); // 700 < 720 未越线
  dom.getBoundingClientRect = function () { return { top: 750, height: 40, width: 100, left: 0 }; };
  fireWindow('scroll');
  assert.ok(dom.classList.contains('tokui-affix--fixed')); // 750 > 720 越线
  assert.strictEqual(dom.style.top, '720px');
  // 回探：占位回到 700 → 释放
  var ph = parent.querySelector('.tokui-affix__placeholder');
  ph.getBoundingClientRect = function () { return { top: 700, height: 40 }; };
  fireWindow('scroll');
  assert.ok(!dom.classList.contains('tokui-affix--fixed'));
});

test('affix: change 事件上报 fixed 状态切换', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var parent = createElement('div');
  var dom = rc.render(node('affix', { top: '0' }, [node('p', { content: '' })]));
  parent.appendChild(dom);
  dom.getBoundingClientRect = function () { return { top: -5, height: 20, width: 100, left: 0 }; };
  fireWindow('scroll');
  var ph = parent.querySelector('.tokui-affix__placeholder');
  ph.getBoundingClientRect = function () { return { top: 10 }; };
  fireWindow('scroll');
  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[0].type, 'affix');
  assert.strictEqual(events[0].event, 'change');
  assert.strictEqual(events[0].detail.fixed, true);
  assert.strictEqual(events[1].detail.fixed, false);
});

test('affix: target 显式指定滚动容器', () => {
  var rc = makeRenderer();
  var fakeContainer = createElement('div');
  fakeContainer.getBoundingClientRect = function () { return { top: 100, bottom: 500 }; };
  var prevQS = global.document.querySelector;
  global.document.querySelector = function (sel) { return sel === '#mysc' ? fakeContainer : null; };
  try {
    var parent = createElement('div');
    var dom = rc.render(node('affix', { top: '10', target: '#mysc' }, [node('p', { content: '' })]));
    parent.appendChild(dom);
    dom.getBoundingClientRect = function () { return { top: 105, height: 20, width: 100, left: 0 }; };
    fireWindow('scroll');
    // 105 - 100 = 5 < 10 → 越线固定，固定 top = 100 + 10 = 110
    assert.ok(dom.classList.contains('tokui-affix--fixed'));
    assert.strictEqual(dom.style.top, '110px');
  } finally {
    global.document.querySelector = prevQS;
  }
});

// ============ anchor 容器模式与增强 ============

test('anchor: 容器模式 lk 子项（层级缩进 + 点击上报）', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  // id 注册表跨用例共享：用独立 id，避免被前序用例的 rect 桩命中
  var dom = rc.render(node('anchor', {}, [
    { type: 'lk', attrs: { h: 'lk-a', tx: '第一章' }, content: '', children: [] },
    { type: 'lk', attrs: { h: 'lk-a1', tx: '背景', d: '1' }, content: '', children: [] },
    { type: 'lk', attrs: { h: '#lk-b', tx: '第二章' }, content: '', children: [] }
  ]));
  var items = dom.querySelectorAll('.tokui-anchor__item');
  assert.strictEqual(items.length, 3);
  assert.ok(items[1].classList.contains('tokui-anchor__item--depth-1'));
  assert.strictEqual(items[2]._anchorValue, 'lk-b'); // # 剥前缀
  assert.ok(items[0].classList.contains('tokui-anchor__item--active')); // 首项默认
  fire(items[2], 'click');
  assert.ok(items[2].classList.contains('tokui-anchor__item--active'));
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].detail.value, 'lk-b');
});

test('anchor: top 属性控制 spy 激活偏移', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('anchor', { top: '40', opt: 's1:一;s2:二' }));
  assert.strictEqual(dom._anchorOffset, 40);
  var items = dom.querySelectorAll('.tokui-anchor__item');
  var sec2 = registerId(createElement('div'), 's2');
  // 目标在顶线下 50px > 40 偏移 → 不激活
  sec2.getBoundingClientRect = function () { return { top: 50 }; };
  fireWindow('scroll');
  assert.ok(!items[1].classList.contains('tokui-anchor__item--active'));
  // 目标进到 30px < 40 偏移 → 激活
  sec2.getBoundingClientRect = function () { return { top: 30 }; };
  fireWindow('scroll');
  assert.ok(items[1].classList.contains('tokui-anchor__item--active'));
});

test('anchor: v:horizontal 横向变体类', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('anchor', { v: 'horizontal', opt: 'a:A;b:B' }));
  assert.ok(dom.classList.contains('tokui-anchor--horizontal'));
});

test('anchor: parser 双模式（opt 原子自闭合 / lk 容器嵌套）', () => {
  var P = require('../src/core/parser').TokUIParser;
  var nodes1 = [];
  new P(function (n) { nodes1.push(n); }).parse('[anchor opt:"s1:一"][p 后续]');
  assert.strictEqual(nodes1.length, 2);
  assert.strictEqual(nodes1[0].type, 'anchor');
  var nodes2 = [];
  new P(function (n) { nodes2.push(n); }).parse('[anchor top:20][lk h:s1 tx:第一章][lk h:s1-1 tx:小节 d:1][/anchor]');
  assert.strictEqual(nodes2.length, 1);
  assert.strictEqual(nodes2[0].children.length, 2);
  assert.strictEqual(nodes2[0].children[1].attrs.d, '1');
});

test('builder: anchor 双模式 + lk', () => {
  var TokUIBuilder = require('../src/server/tokui-builder');
  var B = TokUIBuilder.TokUIBuilder || TokUIBuilder;
  var b = new B();
  b.anchor({ opt: 's1:一' });
  assert.ok(b.toString().indexOf('[anchor opt:"s1:一"]') !== -1);
  var b2 = new B();
  b2.anchor({ top: '20' }).lk({ h: 's1', tx: '第一章' }).lk({ h: 's1-1', tx: '小节', d: '1' }).end();
  var dsl = b2.toString();
  assert.ok(dsl.indexOf('[anchor top:20]') !== -1);
  assert.ok(dsl.indexOf('[lk h:s1 tx:第一章]') !== -1);
  assert.ok(dsl.indexOf('[lk h:s1-1 tx:小节 d:1]') !== -1);
  assert.ok(dsl.indexOf('[/anchor]') !== -1);
});

run();

teardownDOM();
