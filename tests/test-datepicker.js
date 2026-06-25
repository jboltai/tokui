'use strict';

var assert = require('assert');

// ===== Parser tests =====
var { TokUIParser, CONTAINERS } = require('../src/core/parser');

// ===== Renderer 交互测试 =====
var { setupDOM } = require('./helpers/dom-mock');
setupDOM();
// dom-mock 只设 document，补一个最小 window（事件派发 + TokUI 命名空间）
var _winEvents = {};
global.window = {
  innerWidth: 1024,
  addEventListener: function(type, fn) { (_winEvents[type] = _winEvents[type] || []).push(fn); },
  dispatchEvent: function(e) { (_winEvents[e.type] || []).forEach(function(fn) { fn(e); }); },
  TokUI: { _internal: {} }
};
var { TokUIRenderer } = require('../src/core/renderer');
var { registerFormComponents } = require('../src/components/form');
var { registerBasicComponents } = require('../src/components/basic');

function makeRenderer() {
  var rc = new TokUIRenderer();
  registerFormComponents(rc);
  registerBasicComponents(rc);
  return rc;
}

// 模拟派发 click：调用元素上挂载的 click 监听器（this 绑定到元素）
function fireClick(el) {
  var fns = (el._events && el._events.click) || [];
  var evt = { target: el, stopPropagation: function() {} };
  fns.forEach(function(fn) { fn.call(el, evt); });
}

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }
function run() {
  var passed = 0, failed = 0;
  tests.forEach(function(t) {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + e.message); }
  });
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}

test('datepicker is NOT in CONTAINERS (self-closing)', function() {
  assert.strictEqual(CONTAINERS.has('datepicker'), false);
});

test('timepicker is NOT in CONTAINERS (self-closing)', function() {
  assert.strictEqual(CONTAINERS.has('timepicker'), false);
});

test('datetimepicker is NOT in CONTAINERS (self-closing)', function() {
  assert.strictEqual(CONTAINERS.has('datetimepicker'), false);
});

test('parse datepicker with label, clk, fmt', function() {
  var nodes = [];
  var parser = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  parser.parse('[datepicker l:"选择日期" clk:onDate fmt:"YYYY-MM-DD"]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'datepicker');
  assert.strictEqual(nodes[0].attrs.l, '选择日期');
  assert.strictEqual(nodes[0].attrs.clk, 'onDate');
  assert.strictEqual(nodes[0].attrs.fmt, 'YYYY-MM-DD');
});

test('parse timepicker with label and clk', function() {
  var nodes = [];
  var parser = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  parser.parse('[timepicker l:"选择时间" clk:onTime fmt:"HH:mm"]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'timepicker');
  assert.strictEqual(nodes[0].attrs.l, '选择时间');
  assert.strictEqual(nodes[0].attrs.fmt, 'HH:mm');
});

test('parse datetimepicker', function() {
  var nodes = [];
  var parser = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  parser.parse('[datetimepicker l:"选择日期时间" clk:onPick fmt:"YYYY-MM-DD HH:mm"]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'datetimepicker');
  assert.strictEqual(nodes[0].attrs.l, '选择日期时间');
});

test('parse datepicker with v (initial value)', function() {
  var nodes = [];
  var parser = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  parser.parse('[datepicker v:"2025-06-15"]');
  assert.strictEqual(nodes[0].attrs.v, '2025-06-15');
});

test('parse datepicker with dis (disabled)', function() {
  var nodes = [];
  var parser = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  parser.parse('[datepicker dis]');
  assert.strictEqual(nodes[0].attrs.dis, true);
});

// ===== Builder tests =====
var { TokUIBuilder } = require('../src/server/tokui-builder');

test('builder datepicker() produces correct DSL', function() {
  var b = new TokUIBuilder();
  b.datepicker({ l: '选择日期', clk: 'onDate', fmt: 'YYYY-MM-DD' });
  var result = b.toString();
  assert.ok(result.indexOf('[datepicker') === 0);
  assert.ok(result.indexOf('l:选择日期') !== -1);
  assert.ok(result.indexOf('clk:onDate') !== -1);
  assert.ok(result.indexOf('fmt:YYYY-MM-DD') !== -1);
});

test('builder timepicker() produces correct DSL', function() {
  var b = new TokUIBuilder();
  b.timepicker({ l: '选择时间', clk: 'onTime', fmt: 'HH:mm' });
  var result = b.toString();
  assert.ok(result.indexOf('[timepicker') === 0);
  assert.ok(result.indexOf('l:选择时间') !== -1);
  assert.ok(result.indexOf('clk:onTime') !== -1);
});

test('builder datetimepicker() produces correct DSL', function() {
  var b = new TokUIBuilder();
  b.datetimepicker({ l: '选择日期时间', clk: 'onPick', fmt: 'YYYY-MM-DD HH:mm' });
  var result = b.toString();
  assert.ok(result.indexOf('[datetimepicker') === 0);
  assert.ok(result.indexOf('l:') !== -1);
  assert.ok(result.indexOf('clk:onPick') !== -1);
});

test('builder datepicker() with initial value', function() {
  var b = new TokUIBuilder();
  b.datepicker({ l: '日期', v: '2025-06-15', fmt: 'YYYY-MM-DD' });
  var result = b.toString();
  assert.ok(result.indexOf('v:2025-06-15') !== -1);
});

test('builder datepicker() with dis', function() {
  var b = new TokUIBuilder();
  b.datepicker({ l: '日期', dis: true });
  var result = b.toString();
  assert.ok(result.indexOf('dis') !== -1);
});

test('builder timepicker() with id and n', function() {
  var b = new TokUIBuilder();
  b.timepicker({ id: 't1', n: 'time', l: '时间' });
  var result = b.toString();
  assert.ok(result.indexOf('id:t1') !== -1);
  assert.ok(result.indexOf('n:time') !== -1);
});

// ===== 时间列点击交互（回归：原先点击 item 无响应，仅靠滚动）=====
test('timepicker: 每个时间项都绑定了 click 处理器', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'timepicker', attrs: { l: '时间', fmt: 'HH:mm' }, children: [] });
  var items = dom.querySelectorAll('.tokui-timepicker-column-item');
  assert.ok(items.length >= 24, '应有至少 24 个小时项');
  // 每项都应挂载 click（回归 bug：原本无 click handler）
  items.slice(0, 24).forEach(function(item) {
    assert.ok(item._events && item._events.click && item._events.click.length > 0,
      '时间项必须绑 click 处理器');
  });
});

test('timepicker: 点击某项后该项获得 --selected 高亮', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'timepicker', attrs: { fmt: 'HH:mm' }, children: [] });
  var hourCol = dom.querySelector('.tokui-timepicker-column');
  var list = hourCol.querySelector('.tokui-timepicker-column-list');
  var items = list.querySelectorAll('.tokui-timepicker-column-item');
  // 初始第 0 项选中
  assert.ok(items[0].classList.contains('tokui-timepicker-column-item--selected'));
  // 点击第 5 项
  fireClick(items[5]);
  assert.ok(items[5].classList.contains('tokui-timepicker-column-item--selected'),
    '点击后该项应高亮');
  assert.ok(!items[0].classList.contains('tokui-timepicker-column-item--selected'),
    '原选中项应取消高亮');
});

test('datetimepicker: 下拉面板为 日期(左)+时间(右) 横排结构', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'datetimepicker', attrs: { fmt: 'YYYY-MM-DD HH:mm' }, children: [] });
  var body = dom.querySelector('.tokui-datetimepicker-body');
  assert.ok(body, '应存在 body 容器');
  var dateSec = body.querySelectorAll('.tokui-datetimepicker-date');
  var timeSec = body.querySelectorAll('.tokui-datetimepicker-time');
  assert.strictEqual(dateSec.length, 1, 'body 内一个日期面板');
  assert.strictEqual(timeSec.length, 1, 'body 内一个时间面板');
  // 日期面板内仍有日历网格
  assert.ok(body.querySelector('.tokui-datepicker-grid'), '日期面板含网格');
  // 时间面板内仍有滚轮列
  assert.ok(timeSec[0].querySelector('.tokui-timepicker-column-item'), '时间面板含可选时间项');
});

test('datetimepicker: 时间项点击可选中（与 timepicker 一致）', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'datetimepicker', attrs: { fmt: 'YYYY-MM-DD HH:mm' }, children: [] });
  var items = dom.querySelectorAll('.tokui-timepicker-column-item');
  assert.ok(items.length > 0);
  var target = items[10];
  fireClick(target);
  assert.ok(target.classList.contains('tokui-timepicker-column-item--selected'),
    'datetimepicker 时间项点击应选中');
});

// ===== 单例 + 滚动关闭 =====
var fakeRect = function() { return { left: 10, top: 10, width: 200, height: 36, right: 210, bottom: 46 }; };

test('打开新面板时自动关闭其它已开面板（同时仅一个）', function() {
  var rc = makeRenderer();
  var domA = rc.render({ type: 'datepicker', attrs: { fmt: 'YYYY-MM-DD' }, children: [] });
  var domB = rc.render({ type: 'timepicker', attrs: { fmt: 'HH:mm' }, children: [] });
  var ctrlA = domA.querySelector('.tokui-datepicker-control');
  var ctrlB = domB.querySelector('.tokui-timepicker-control');
  var ddA = domA.querySelector('.tokui-datepicker-dropdown');
  var ddB = domB.querySelector('.tokui-timepicker-dropdown');
  ctrlA.getBoundingClientRect = fakeRect;
  ctrlB.getBoundingClientRect = fakeRect;
  fireClick(ctrlA);              // 开 A
  assert.strictEqual(ddA.style.display, '', 'A 展开时 display 为空');
  fireClick(ctrlB);              // 开 B → 应自动关 A
  assert.strictEqual(ddA.style.display, 'none', 'A 应被自动关闭');
  assert.strictEqual(ddB.style.display, '', 'B 展开');
  // 全局注册表只剩 B
  assert.strictEqual(window.TokUI._internal._datePickers.size, 1, '注册表仅留一个');
});

test('页面滚动关闭所有打开的面板', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'datepicker', attrs: { fmt: 'YYYY-MM-DD' }, children: [] });
  var ctrl = dom.querySelector('.tokui-datepicker-control');
  var dd = dom.querySelector('.tokui-datepicker-dropdown');
  ctrl.getBoundingClientRect = fakeRect;
  fireClick(ctrl);               // 开
  assert.strictEqual(dd.style.display, '');
  window.dispatchEvent(new Event('scroll'));  // 模拟页面滚动
  assert.strictEqual(dd.style.display, 'none', '滚动后面板应关闭');
  assert.strictEqual(window.TokUI._internal._datePickers.size, 0, '注册表清空');
});

run();
