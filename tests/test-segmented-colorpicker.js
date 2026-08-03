'use strict';

// segmented 分段控制器 + color-picker 颜色选择器（Phase 4）
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
var registerFormComponents = require('../src/components/form').registerFormComponents;
require('../src/core/i18n').setLocale('zh-CN');

function makeRenderer() {
  var rc = new TokUIRenderer();
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

// ============ segmented ============

test('segmented: opt 简写渲染为 radio 项，v 命中项 checked', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('segmented', { n: 'view', v: 'grid', opt: 'list:列表;grid:宫格;table:表格' }));
  assert.strictEqual(dom._tokuiType, 'segmented');
  var items = dom.querySelectorAll('.tokui-segmented__item');
  assert.strictEqual(items.length, 3);
  var inputs = dom.querySelectorAll('input[type=radio]');
  assert.strictEqual(inputs.length, 3);
  assert.strictEqual(inputs[0].name, 'view');
  assert.strictEqual(inputs[1].checked, true);
  assert.strictEqual(inputs[0].checked, false);
});

test('segmented: 无 v 时 opt chk 兜底选中', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('segmented', { opt: 'a:A;b:B' }, [
    { type: 'opt', attrs: { v: 'a', tx: 'A' }, content: '', children: [] },
    { type: 'opt', attrs: { v: 'b', tx: 'B', chk: true }, content: '', children: [] }
  ]));
  // opt 简写合成追加在真实子节点后；chk 来自真实子节点
  var inputs = dom.querySelectorAll('input[type=radio]');
  var checkedVal = null;
  inputs.forEach(function (i) { if (i.checked) checkedVal = i.value; });
  assert.strictEqual(checkedVal, 'b');
});

test('segmented: change 事件上报 value/name', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('segmented', { n: 'view', v: 'list', opt: 'list:列表;grid:宫格' }));
  var group = dom.querySelector('.tokui-segmented');
  var inputs = dom.querySelectorAll('input[type=radio]');
  inputs[1].checked = true;
  fire(group, 'change', { target: inputs[1] });
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].type, 'segmented');
  assert.strictEqual(events[0].event, 'change');
  assert.strictEqual(events[0].detail.value, 'grid');
  assert.strictEqual(events[0].detail.name, 'view');
});

test('segmented: upd v 程序化选中且不上报', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('segmented', { id: 'seg1', v: 'list', opt: 'list:列表;grid:宫格' }));
  dom._update({ v: 'grid' });
  var inputs = dom.querySelectorAll('input[type=radio]');
  assert.strictEqual(inputs[1].checked, true);
  assert.strictEqual(inputs[0].checked, false);
  assert.strictEqual(events.length, 0);
});

test('segmented: dis 禁用 + upd dis:false 恢复', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('segmented', { opt: 'a:A;b:B', dis: true }));
  var group = dom.querySelector('.tokui-segmented');
  assert.ok(group.classList.contains('tokui-segmented--disabled'));
  var inputs = dom.querySelectorAll('input[type=radio]');
  assert.strictEqual(inputs[0].getAttribute('disabled'), 'disabled');
  dom._update({ dis: false });
  assert.ok(!group.classList.contains('tokui-segmented--disabled'));
  assert.strictEqual(inputs[0].disabled, false);
});

test('segmented: _tokuiReset 恢复初始值', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('segmented', { v: 'list', opt: 'list:列表;grid:宫格' }));
  dom._update({ v: 'grid' });
  dom._tokuiReset();
  var inputs = dom.querySelectorAll('input[type=radio]');
  assert.strictEqual(inputs[0].checked, true);
  assert.strictEqual(inputs[1].checked, false);
});

test('segmented: l 标签渲染', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('segmented', { l: '视图', opt: 'a:A' }));
  var label = dom.querySelector('.tokui-label');
  assert.ok(label);
  assert.strictEqual(label.textContent, '视图');
});

// ============ color-picker ============

test('color-picker: 初始值渲染（swatch/hex/hidden）', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('color-picker', { n: 'color', v: '#FF0000' }));
  assert.strictEqual(dom._tokuiType, 'color-picker');
  assert.strictEqual(dom.querySelector('.tokui-color-picker__hex').textContent, '#ff0000');
  assert.strictEqual(dom.querySelector('.tokui-color-picker__input').value, '#ff0000');
  assert.strictEqual(dom.querySelector('.tokui-color-picker__input').name, 'color');
});

test('color-picker: 无 v 默认 #1677ff；非法 v 回退默认', () => {
  var rc = makeRenderer();
  var d1 = rc.render(node('color-picker', {}));
  assert.strictEqual(d1.querySelector('.tokui-color-picker__hex').textContent, '#1677ff');
  var d2 = rc.render(node('color-picker', { v: 'not-a-color' }));
  assert.strictEqual(d2.querySelector('.tokui-color-picker__hex').textContent, '#1677ff');
});

test('color-picker: 触发器开合面板', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('color-picker', { v: '#ff0000' }));
  var root = dom.querySelector('.tokui-color-picker');
  var panel = dom.querySelector('.tokui-color-picker__panel');
  var trigger = dom.querySelector('.tokui-color-picker__trigger');
  assert.strictEqual(panel.style.display, 'none');
  fire(trigger, 'click');
  assert.strictEqual(panel.style.display, '');
  assert.ok(root.classList.contains('tokui-color-picker--open'));
  fire(trigger, 'click');
  assert.strictEqual(panel.style.display, 'none');
});

test('color-picker: 预设色点击换色并上报', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('color-picker', { n: 'c', v: '#ff0000', presets: '#00ff00,#0000ff,invalid' }));
  var presets = dom.querySelectorAll('.tokui-color-picker__preset');
  assert.strictEqual(presets.length, 2); // 非法预设被过滤
  var panel = dom.querySelector('.tokui-color-picker__panel');
  fire(panel, 'click', { target: presets[1] });
  assert.strictEqual(dom.querySelector('.tokui-color-picker__hex').textContent, '#0000ff');
  assert.strictEqual(dom.querySelector('.tokui-color-picker__input').value, '#0000ff');
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].type, 'color-picker');
  assert.strictEqual(events[0].detail.value, '#0000ff');
});

test('color-picker: hue 滑条改色相', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('color-picker', { v: '#ff0000' }));
  var hue = dom.querySelector('.tokui-color-picker__hue');
  hue.value = '120';
  fire(hue, 'input');
  assert.strictEqual(dom.querySelector('.tokui-color-picker__hex').textContent, '#00ff00');
});

test('color-picker: hex 输入合法生效 / 非法回退', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('color-picker', { v: '#ff0000' }));
  var hexInput = dom.querySelector('.tokui-color-picker__hex-input');
  hexInput.value = '0000ff'; // 缺 # 也接受
  fire(hexInput, 'change');
  assert.strictEqual(dom.querySelector('.tokui-color-picker__hex').textContent, '#0000ff');
  hexInput.value = 'zzz';
  fire(hexInput, 'change');
  assert.strictEqual(hexInput.value, '#0000ff');
});

test('color-picker: 清除按钮置空并上报', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('color-picker', { n: 'c', v: '#ff0000' }));
  fire(dom.querySelector('.tokui-color-picker__clear'), 'click');
  assert.strictEqual(dom.querySelector('.tokui-color-picker__input').value, '');
  assert.strictEqual(dom.querySelector('.tokui-color-picker__hex').textContent, '');
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].detail.value, '');
});

test('color-picker: upd v 程序化设置不上报；dis 禁用', () => {
  var rc = makeRenderer();
  var events = [];
  rc._onComponentEvent = function (evt) { events.push(evt); };
  var dom = rc.render(node('color-picker', { id: 'cp1', v: '#ff0000' }));
  dom._update({ v: '#00ff00' });
  assert.strictEqual(dom.querySelector('.tokui-color-picker__hex').textContent, '#00ff00');
  assert.strictEqual(events.length, 0);
  dom._update({ dis: true });
  assert.ok(dom.querySelector('.tokui-color-picker').classList.contains('tokui-color-picker--disabled'));
  // 禁用后触发器不可开面板
  fire(dom.querySelector('.tokui-color-picker__trigger'), 'click');
  assert.strictEqual(dom.querySelector('.tokui-color-picker__panel').style.display, 'none');
});

test('color-picker: _tokuiReset 恢复初始色', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('color-picker', { v: '#ff0000' }));
  dom._update({ v: '#00ff00' });
  dom._tokuiReset();
  assert.strictEqual(dom.querySelector('.tokui-color-picker__hex').textContent, '#ff0000');
});

// ============ Builder ============

test('builder: segmented/colorPicker/anchor/tourStep 链式生成', () => {
  var TokUIBuilder = require('../src/server/tokui-builder');
  var B = TokUIBuilder.TokUIBuilder || TokUIBuilder;
  var b = new B();
  b.segmented({ n: 'view', v: 'grid', opt: 'list:列表;grid:宫格' })
    .colorPicker({ n: 'c', v: '#ff0000' })
    .anchor({ opt: 's1:第一节' })
    .tourStep({ tgt: '#x', tt: 'T', tx: 'C' });
  var dsl = b.toString();
  assert.ok(dsl.indexOf('[segmented n:view v:grid opt:"list:列表;grid:宫格"]') !== -1);
  assert.ok(dsl.indexOf('[color-picker n:c v:#ff0000]') !== -1);
  assert.ok(dsl.indexOf('[anchor opt:"s1:第一节"]') !== -1);
  assert.ok(dsl.indexOf('[tour-step tgt:#x tt:T tx:C]') !== -1);
});

test('builder: affix/tour/previewGroup 容器闭合', () => {
  var TokUIBuilder = require('../src/server/tokui-builder');
  var B = TokUIBuilder.TokUIBuilder || TokUIBuilder;
  var b = new B();
  b.affix({ top: '0' }).btn({ tx: '固定' }).end()
    .tour({ open: true }).tourStep({ tt: 'A' }).end()
    .previewGroup({}).img({ s: 'a.png' }).end();
  var dsl = b.toString();
  assert.ok(dsl.indexOf('[affix top:0]') !== -1);
  assert.ok(dsl.indexOf('[/affix]') !== -1);
  assert.ok(dsl.indexOf('[tour open]') !== -1);
  assert.ok(dsl.indexOf('[/tour]') !== -1);
  assert.ok(dsl.indexOf('[preview-group]') !== -1);
  assert.ok(dsl.indexOf('[/preview-group]') !== -1);
});

// ============ segmented 容器模式（Phase 4 增强）============

test('segmented: 容器模式 opt 子节点（单项 dis/i 图标/chk）', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('segmented', { n: 'view' }, [
    { type: 'opt', attrs: { v: 'list', tx: '列表', i: '☰' }, content: '', children: [] },
    { type: 'opt', attrs: { v: 'grid', tx: '宫格', chk: true }, content: '', children: [] },
    { type: 'opt', attrs: { v: 'table', tx: '表格', dis: true }, content: '', children: [] }
  ]));
  var items = dom.querySelectorAll('.tokui-segmented__item');
  assert.strictEqual(items.length, 3);
  var inputs = dom.querySelectorAll('input[type=radio]');
  assert.strictEqual(inputs[0].name, 'view');
  // chk 默认选中
  assert.strictEqual(inputs[1].checked, true);
  // 单项禁用：input disabled + label 禁用类
  assert.strictEqual(inputs[2].getAttribute('disabled'), 'disabled');
  assert.ok(items[2].classList.contains('tokui-segmented__item--disabled'));
  assert.ok(!items[0].classList.contains('tokui-segmented__item--disabled'));
  // 图标
  var icon = items[0].querySelector('.tokui-segmented__icon');
  assert.ok(icon);
  assert.strictEqual(icon.textContent, '☰');
});

test('segmented: 容器模式 + v 命中覆盖 chk', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('segmented', { v: 'table' }, [
    { type: 'opt', attrs: { v: 'list', tx: '列表', chk: true }, content: '', children: [] },
    { type: 'opt', attrs: { v: 'table', tx: '表格' }, content: '', children: [] }
  ]));
  var inputs = dom.querySelectorAll('input[type=radio]');
  assert.strictEqual(inputs[1].checked, true);
  assert.strictEqual(inputs[0].checked, false);
});

test('segmented: 变体 token 与值组合（pill/vertical + 值）', () => {
  var rc = makeRenderer();
  var d1 = rc.render(node('segmented', { v: 'pill,grid', opt: 'list:列表;grid:宫格' }));
  assert.ok(d1.classList.contains('tokui-segmented--pill'));
  var inputs1 = d1.querySelectorAll('input[type=radio]');
  assert.strictEqual(inputs1[1].checked, true);
  var d2 = rc.render(node('segmented', { v: 'vertical', opt: 'a:A;b:B' }));
  assert.ok(d2.classList.contains('tokui-segmented--vertical'));
  // 纯变体无值 → 无选中
  assert.strictEqual(d2.querySelectorAll('input[type=radio]')[0].checked, false);
});

test('color-picker: 面板 portal 到 body + fixed（免父容器裁切）', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('color-picker', { v: '#ff0000' }));
  var root = dom.querySelector('.tokui-color-picker');
  var panel = dom.querySelector('.tokui-color-picker__panel');
  var trigger = dom.querySelector('.tokui-color-picker__trigger');
  // 关闭态：面板留在组件内
  assert.strictEqual(panel.parentNode, root);
  fire(trigger, 'click');
  // 开启态：portal 到 document.body
  assert.strictEqual(panel.parentNode, global.document.body);
  assert.ok(root.classList.contains('tokui-color-picker--open'));
  // 面板内点击不关（root.contains 为 false 但 panel.contains 为 true）
  var inner = panel.querySelector('.tokui-color-picker__clear');
  (global.document._events['click'] || []).slice().forEach(function (fn) { fn({ target: inner }); });
  assert.ok(root.classList.contains('tokui-color-picker--open'));
  // 面板外点击关闭
  (global.document._events['click'] || []).slice().forEach(function (fn) { fn({ target: global.document.body }); });
  assert.ok(!root.classList.contains('tokui-color-picker--open'));
});

test('segmented: parser 双模式（opt 简写原子自闭合 / 容器嵌套）', () => {
  var P = require('../src/core/parser').TokUIParser;
  // 简写：原子节点，不吞后续兄弟
  var nodes1 = [];
  new P(function (n) { nodes1.push(n); }).parse('[segmented n:v opt:"a:A;b:B"][p 后续]');
  assert.strictEqual(nodes1.length, 2);
  assert.strictEqual(nodes1[0].type, 'segmented');
  assert.strictEqual(nodes1[1].type, 'p');
  // 容器：opt 收为子节点
  var nodes2 = [];
  new P(function (n) { nodes2.push(n); }).parse('[segmented n:v][opt v:a tx:A][opt v:b tx:B dis][/segmented]');
  assert.strictEqual(nodes2.length, 1);
  assert.strictEqual(nodes2[0].children.length, 2);
  assert.strictEqual(nodes2[0].children[1].attrs.dis, true);
});

run();

teardownDOM();
