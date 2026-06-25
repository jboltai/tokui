'use strict';

var assert = require('assert');
var { setupDOM, teardownDOM, createElement } = require('./helpers/dom-mock');

setupDOM();

// 扩展 mock：popconfirm 需要 document.body 和 requestAnimationFrame
global.document._body = createElement('body');
global.document.body = global.document._body;
global.document.querySelector = function() { return null; };

// requestAnimationFrame mock
global.requestAnimationFrame = function(fn) { return fn && fn({}); };

// window mock
if (typeof global.window === 'undefined') global.window = global;
global.window.innerWidth = 1024;

var TokUIRenderer = require('../src/core/renderer').TokUIRenderer || require('../src/core/renderer');
var registerBasicComponents = require('../src/components/basic').registerBasicComponents || require('../src/components/basic');

function makeRenderer() {
  var rc = new TokUIRenderer();
  registerBasicComponents(rc);
  return rc;
}

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }
function resetBody() {
  // 清理 document.body 中的残留 popup
  global.document._body = createElement('body');
  global.document.body = global.document._body;
}
function run() {
  var passed = 0, failed = 0;
  tests.forEach(function(t) {
    resetBody();
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + e.message); }
  });
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  teardownDOM();
  if (failed) process.exit(1);
}

// ===== popconfirm 渲染测试 =====

test('renders trigger element with correct text', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tx: '删除', tt: '确认删除？' }, children: [] });
  var trigger = dom.querySelector('.tokui-popconfirm__trigger');
  assert.notStrictEqual(trigger, null);
  assert.strictEqual(trigger.textContent, '删除');
});

test('trigger has correct default text when tx not specified', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？' }, children: [] });
  var trigger = dom.querySelector('.tokui-popconfirm__trigger');
  assert.strictEqual(trigger.textContent, '确认');
});

test('wrapper has correct class tokui-popconfirm', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？' }, children: [] });
  assert.ok(dom.classList.contains('tokui-popconfirm'));
});

test('clk attribute stored on wrapper', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？', clk: 'handleConfirm' }, children: [] });
  // clk should be stored internally; trigger button should have aria attributes
  var trigger = dom.querySelector('.tokui-popconfirm__trigger');
  assert.strictEqual(trigger.getAttribute('aria-haspopup'), 'true');
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'false');
});

test('pos attribute stored for positioning', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？', pos: 'bottom' }, children: [] });
  assert.strictEqual(dom._tokuiPopconfirmPos, 'bottom');
});

test('pos defaults to top', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？' }, children: [] });
  assert.strictEqual(dom._tokuiPopconfirmPos, 'top');
});

test('_tokuiType is popconfirm', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？' }, children: [] });
  assert.strictEqual(dom._tokuiType, 'popconfirm');
});

test('click trigger creates popup with message and buttons', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认删除？', clk: 'handleDel', tx: '删除', t: 'danger' }, children: [] });
  var trigger = dom.querySelector('.tokui-popconfirm__trigger');

  // 模拟点击触发
  var clickEvents = trigger._events['click'];
  assert.ok(clickEvents && clickEvents.length > 0);

  // 执行点击
  clickEvents[0]({ stopPropagation: function() {} });

  // popup should be added to body
  var body = global.document.body;
  var popup = null;
  for (var i = 0; i < body.children.length; i++) {
    if (body.children[i].classList && body.children[i].classList.contains('tokui-popconfirm__popup')) {
      popup = body.children[i];
      break;
    }
  }
  assert.notStrictEqual(popup, null);

  // 检查消息文本
  var msg = popup.querySelector('.tokui-popconfirm__message');
  assert.notStrictEqual(msg, null);
  assert.strictEqual(msg.textContent, '确认删除？');

  // 检查按钮
  var cancelBtn = popup.querySelector('.tokui-popconfirm__btn--cancel');
  assert.notStrictEqual(cancelBtn, null);
  assert.strictEqual(cancelBtn.textContent, '取消');

  var confirmBtn = popup.querySelector('.tokui-popconfirm__btn--danger');
  assert.notStrictEqual(confirmBtn, null);
  assert.strictEqual(confirmBtn.textContent, '确定');
  assert.strictEqual(confirmBtn.getAttribute('data-tokui-clk'), 'handleDel');
});

test('ok-text defaults when not specified', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？' }, children: [] });
  var trigger = dom.querySelector('.tokui-popconfirm__trigger');

  var clickEvents = trigger._events['click'];
  clickEvents[0]({ stopPropagation: function() {} });

  var body = global.document.body;
  var popup = null;
  for (var i = 0; i < body.children.length; i++) {
    if (body.children[i].classList && body.children[i].classList.contains('tokui-popconfirm__popup')) {
      popup = body.children[i];
      break;
    }
  }
  assert.notStrictEqual(popup, null);
  // Default confirm button text is "确定"
  var confirmBtn = popup.querySelector('.tokui-popconfirm__btn--primary');
  assert.notStrictEqual(confirmBtn, null);
  assert.strictEqual(confirmBtn.textContent, '确定');
});

test('custom ok-text and cancel-text', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？', 'ok-text': 'Yes', 'cancel-text': 'No' }, children: [] });
  var trigger = dom.querySelector('.tokui-popconfirm__trigger');

  var clickEvents = trigger._events['click'];
  clickEvents[0]({ stopPropagation: function() {} });

  var body = global.document.body;
  var popup = null;
  for (var i = 0; i < body.children.length; i++) {
    if (body.children[i].classList && body.children[i].classList.contains('tokui-popconfirm__popup')) {
      popup = body.children[i];
      break;
    }
  }
  assert.notStrictEqual(popup, null);
  var cancelBtn = popup.querySelector('.tokui-popconfirm__btn--cancel');
  assert.strictEqual(cancelBtn.textContent, 'No');
  var confirmBtn = popup.querySelector('.tokui-popconfirm__btn--primary');
  assert.strictEqual(confirmBtn.textContent, 'Yes');
});

test('popup has correct pos class', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？', pos: 'left' }, children: [] });
  var trigger = dom.querySelector('.tokui-popconfirm__trigger');

  var clickEvents = trigger._events['click'];
  clickEvents[0]({ stopPropagation: function() {} });

  var body = global.document.body;
  var popup = null;
  for (var i = 0; i < body.children.length; i++) {
    if (body.children[i].classList && body.children[i].classList.contains('tokui-popconfirm__popup')) {
      popup = body.children[i];
      break;
    }
  }
  assert.notStrictEqual(popup, null);
  assert.ok(popup.classList.contains('tokui-popconfirm__popup--left'));
});

test('popup has arrow element', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？' }, children: [] });
  var trigger = dom.querySelector('.tokui-popconfirm__trigger');

  var clickEvents = trigger._events['click'];
  clickEvents[0]({ stopPropagation: function() {} });

  var body = global.document.body;
  var popup = null;
  for (var i = 0; i < body.children.length; i++) {
    if (body.children[i].classList && body.children[i].classList.contains('tokui-popconfirm__popup')) {
      popup = body.children[i];
      break;
    }
  }
  var arrow = popup.querySelector('.tokui-popconfirm__arrow');
  assert.notStrictEqual(arrow, null);
});

test('cancel click closes popup', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'popconfirm', attrs: { tt: '确认？' }, children: [] });
  var trigger = dom.querySelector('.tokui-popconfirm__trigger');

  // Open
  var clickEvents = trigger._events['click'];
  clickEvents[0]({ stopPropagation: function() {} });

  assert.notStrictEqual(dom._popconfirmPopup, null);
  var popup = dom._popconfirmPopup;

  // Find and click cancel button
  var cancelBtn = popup.querySelector('.tokui-popconfirm__btn--cancel');
  var cancelClickEvents = cancelBtn._events['click'];
  assert.ok(cancelClickEvents && cancelClickEvents.length > 0);
  cancelClickEvents[0]({ stopPropagation: function() {} });

  // Popup should be removed after close
  assert.strictEqual(dom._popconfirmPopup, null);
});

// ===== Builder 测试 =====

test('builder popconfirm generates correct DSL', function() {
  var { TokUIBuilder } = require('../src/server/tokui-builder');
  var b = new TokUIBuilder();
  b.popconfirm({ tt: '确认删除？', clk: 'handleConfirm', tx: '删除', t: 'danger', pos: 'top' });
  var dsl = b.toString();
  assert.ok(dsl.indexOf('[popconfirm') !== -1);
  assert.ok(dsl.indexOf('tt:确认删除？') !== -1);
  assert.ok(dsl.indexOf('clk:handleConfirm') !== -1);
  assert.ok(dsl.indexOf('tx:删除') !== -1);
  assert.ok(dsl.indexOf('t:danger') !== -1);
  assert.ok(dsl.indexOf('pos:top') !== -1);
  assert.ok(dsl.indexOf('[/popconfirm]') === -1, 'should be self-closing');
});

test('builder popconfirm with ok-text and cancel-text', function() {
  var { TokUIBuilder } = require('../src/server/tokui-builder');
  var b = new TokUIBuilder();
  b.popconfirm({ tt: 'Sure?', 'ok-text': 'Yes', 'cancel-text': 'No' });
  var dsl = b.toString();
  assert.ok(dsl.indexOf('ok-text:Yes') !== -1);
  assert.ok(dsl.indexOf('cancel-text:No') !== -1);
});

run();
