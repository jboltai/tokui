'use strict';

// P2 组件：kbd / editable / float-button / masonry
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
var registerBasicComponents = require('../src/components/basic').registerBasicComponents;
var registerLayoutComponents = require('../src/components/layout').registerLayoutComponents;
var registerFormComponents = require('../src/components/form').registerFormComponents;
require('../src/core/i18n').setLocale('zh-CN');

function makeRenderer() {
  var rc = new TokUIRenderer();
  registerBasicComponents(rc);
  registerLayoutComponents(rc);
  registerFormComponents(rc);
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

// ============ kbd ============

test('kbd: 渲染 KBD 元素与文本', () => {
  var rc = makeRenderer();
  var d1 = rc.render({ type: 'kbd', attrs: {}, content: 'Ctrl', children: [] });
  assert.strictEqual(d1.tagName, 'KBD');
  assert.strictEqual(d1.textContent, 'Ctrl');
  assert.ok(d1.classList.contains('tokui-kbd'));
  var d2 = rc.render({ type: 'kbd', attrs: { tx: '⌘' }, content: '', children: [] });
  assert.strictEqual(d2.textContent, '⌘');
});

test('kbd: 变体 sm/lg 白名单落类', () => {
  var rc = makeRenderer();
  var d = rc.render({ type: 'kbd', attrs: { v: 'sm' }, content: 'A', children: [] });
  assert.ok(d.classList.contains('tokui-kbd--sm'));
});

// ============ editable ============

test('editable: 初始文本与占位渲染', () => {
  var rc = makeRenderer();
  var d1 = rc.render(node('editable', { tx: '点我改' }));
  assert.strictEqual(d1._tokuiType, 'editable');
  assert.strictEqual(d1.querySelector('.tokui-editable__text').textContent, '点我改');
  var d2 = rc.render(node('editable', { ph: '未填写' }));
  var disp = d2.querySelector('.tokui-editable__text');
  assert.strictEqual(disp.textContent, '未填写');
  assert.ok(disp.classList.contains('tokui-editable__text--ph'));
});

test('editable: 点击进编辑态，Enter 提交并上报 change', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('editable', { tx: '旧值', n: 'bio' }));
  var display = dom.querySelector('.tokui-editable__text');
  fire(display, 'click');
  var input = dom.querySelector('.tokui-editable__input');
  assert.ok(input);
  assert.strictEqual(input.value, '旧值');
  input.value = '新值';
  fire(input, 'keydown', { key: 'Enter' });
  assert.strictEqual(display.textContent, '新值');
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].type, 'editable');
  assert.strictEqual(events[0].event, 'change');
  assert.strictEqual(events[0].detail.value, '新值');
  assert.strictEqual(events[0].detail.name, 'bio');
});

test('editable: Esc 还原不上报；值未变不上报', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('editable', { tx: '原样' }));
  var display = dom.querySelector('.tokui-editable__text');
  // Esc 路径
  fire(display, 'click');
  var input = dom.querySelector('.tokui-editable__input');
  input.value = '改了一半';
  fire(input, 'keydown', { key: 'Escape' });
  assert.strictEqual(display.textContent, '原样');
  assert.strictEqual(events.length, 0);
  // 值未变路径（blur 提交同值）
  fire(display, 'click');
  var input2 = dom.querySelector('.tokui-editable__input');
  fire(input2, 'blur');
  assert.strictEqual(events.length, 0);
});

test('editable: dis 禁用不可编辑 + upd 契约', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('editable', { tx: '锁定', dis: true }));
  var display = dom.querySelector('.tokui-editable__text');
  fire(display, 'click');
  assert.strictEqual(dom.querySelector('.tokui-editable__input'), null);
  dom._update({ dis: false });
  fire(display, 'click');
  assert.ok(dom.querySelector('.tokui-editable__input'));
  dom._update({ tx: '服务器改' });
  assert.strictEqual(display.textContent, '服务器改');
});

// ============ float-button ============

test('float-button: 容器渲染 + pos 类 + offset 变量', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('float-button', { pos: 'left-top', offset: '40' }, [
    node('btn', { tx: '💬' })
  ]));
  assert.strictEqual(dom._tokuiType, 'float-button');
  assert.ok(dom.classList.contains('tokui-float-button--left-top'));
  assert.strictEqual(dom.style.getPropertyValue('--tokui-float-offset'), '40px');
  assert.ok(dom.querySelector('.tokui-btn'));
});

test('float-button: 非法 pos 回退 right-bottom；缺省 offset 不写变量', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('float-button', { pos: 'weird' }, []));
  assert.ok(dom.classList.contains('tokui-float-button--right-bottom'));
  assert.strictEqual(dom.style.getPropertyValue('--tokui-float-offset'), '');
});

// ============ masonry ============

test('masonry: cols/gap 内联样式 + 子项挂载', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('masonry', { cols: '3', gap: '12' }, [
    node('card', { tt: 'A' }, []),
    node('card', { tt: 'B' }, []),
    node('card', { tt: 'C' }, [])
  ]));
  assert.strictEqual(dom._tokuiType, 'masonry');
  assert.strictEqual(dom.style.columnCount, '3');
  assert.strictEqual(dom.style.columnGap, '12px');
  assert.strictEqual(dom.style.getPropertyValue('--tokui-masonry-gap'), '12px');
  assert.strictEqual(dom.childNodes.length, 3);
});

test('masonry: cols 越界钳制（1-6）+ 缺省值', () => {
  var rc = makeRenderer();
  var d1 = rc.render(node('masonry', { cols: '99' }, []));
  assert.strictEqual(d1.style.columnCount, '6');
  var d2 = rc.render(node('masonry', {}, []));
  assert.strictEqual(d2.style.columnCount, '2');
  assert.strictEqual(d2.style.columnGap, '8px');
});

test('masonry: parser 层 cols 不再误判自闭合（容器语义）', () => {
  var P = require('../src/core/parser').TokUIParser;
  var nodes = [];
  new P(function (n) { nodes.push(n); }).parse('[masonry cols:3][card tt:A][p 甲][/card][/masonry]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'masonry');
  assert.strictEqual(nodes[0].children.length, 1);
  assert.strictEqual(nodes[0].children[0].type, 'card');
});

test('masonry: minw 自动列模式（column-width 驱动，无 columnCount）', () => {
  var rc = makeRenderer();
  var d = rc.render(node('masonry', { minw: '220', gap: '12' }, [node('card', { tt: 'A' }, [])]));
  assert.ok(d.classList.contains('tokui-masonry--auto'));
  assert.strictEqual(d.style.columnWidth, '220px');
  assert.strictEqual(d.style.columnCount, undefined);
  assert.strictEqual(d.style.columnGap, '12px');
  // minw 优先于 cols
  var d2 = rc.render(node('masonry', { minw: '200', cols: '4' }, []));
  assert.strictEqual(d2.style.columnWidth, '200px');
  assert.strictEqual(d2.style.columnCount, undefined);
});

test('masonry: 非法 minw 回退 cols 模式', () => {
  var rc = makeRenderer();
  var d = rc.render(node('masonry', { minw: 'abc' }, []));
  assert.ok(!d.classList.contains('tokui-masonry--auto'));
  assert.strictEqual(d.style.columnCount, '2');
});

// ============ Builder ============

test('builder: kbd/editable/floatButton/masonry 链式生成', () => {
  var TokUIBuilder = require('../src/server/tokui-builder');
  var B = TokUIBuilder.TokUIBuilder || TokUIBuilder;
  var b = new B();
  b.kbd('Ctrl')
    .editable({ tx: '点我改', n: 'bio' })
    .floatButton({ pos: 'right-bottom' }).backtop().end()
    .masonry({ cols: '3' }).card({ tt: 'A' }).end().end();
  var dsl = b.toString();
  assert.ok(dsl.indexOf('[kbd Ctrl]') !== -1);
  assert.ok(dsl.indexOf('[editable tx:点我改 n:bio]') !== -1);
  assert.ok(dsl.indexOf('[float-button pos:right-bottom]') !== -1);
  assert.ok(dsl.indexOf('[/float-button]') !== -1);
  assert.ok(dsl.indexOf('[masonry cols:3]') !== -1);
  assert.ok(dsl.indexOf('[/masonry]') !== -1);
});

run();

teardownDOM();
