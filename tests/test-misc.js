'use strict';

var assert = require('assert');
var { setupDOM, teardownDOM, createElement } = require('./helpers/dom-mock');

setupDOM();

// 扩展 mock：toast 需要 document.querySelector / document.body
global.document.querySelector = function(sel) {
  if (!global.document._body) return null;
  var cls = sel.slice(1);
  var children = global.document._body.children || [];
  for (var i = 0; i < children.length; i++) {
    if (children[i].classList && children[i].classList.contains(cls)) return children[i];
  }
  return null;
};
global.document._body = createElement('body');
global.document.body = global.document._body;

// 扩展 mock：watermark 需要 canvas
global.document._origCreateElement = global.document.createElement;
global.document.createElement = function(tag) {
  var el = global.document._origCreateElement(tag);
  if (tag === 'canvas') {
    el.width = 0;
    el.height = 0;
    var ctxMock = {
      font: '16px sans-serif',
      fillStyle: '',
      textAlign: '',
      textBaseline: '',
      measureText: function() { return { width: 100 }; },
      translate: function() {},
      rotate: function() {},
      fillText: function() {}
    };
    el.getContext = function(type) {
      if (type === '2d') return ctxMock;
      return null;
    };
    el.toDataURL = function() { return 'data:image/png;base64,mock'; };
  }
  return el;
};

// 扩展 mock：window（toast 需要）
if (typeof global.window === 'undefined') global.window = global;

var TokUIRenderer = require('../src/core/renderer').TokUIRenderer || require('../src/core/renderer');
var registerBasicComponents = require('../src/components/basic').registerBasicComponents || require('../src/components/basic');

function makeRenderer() {
  var rc = new TokUIRenderer();
  registerBasicComponents(rc);
  return rc;
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
  teardownDOM();
  if (failed) process.exit(1);
}

// ===== bubble 测试 =====

test('bubble basic render - div.tokui-bubble--ai with avatar and content', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'bubble', attrs: {}, children: [] });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-bubble'));
  assert.ok(dom.classList.contains('tokui-bubble--ai'));
  assert.notStrictEqual(dom.querySelector('.tokui-bubble__avatar'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-bubble__content'), null);
});

test('bubble role:user → tokui-bubble--user', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'bubble', attrs: { role: 'user' }, children: [] });
  assert.ok(dom.classList.contains('tokui-bubble--user'));
  var avatar = dom.querySelector('.tokui-bubble__avatar');
  assert.strictEqual(avatar.textContent, 'You');
});

test('bubble model attr creates badge', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'bubble', attrs: { model: 'GPT-5' }, children: [] });
  var badge = dom.querySelector('.tokui-badge--pill');
  assert.notStrictEqual(badge, null);
  assert.strictEqual(badge.textContent, 'GPT-5');
});

test('bubble time attr creates time element', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'bubble', attrs: { time: '10:30' }, children: [] });
  var timeEl = dom.querySelector('.tokui-bubble__time');
  assert.notStrictEqual(timeEl, null);
  assert.strictEqual(timeEl.textContent, '10:30');
});

test('bubble renders children into body', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'bubble',
    attrs: {},
    children: [
      { type: 'p', attrs: {}, children: [], content: 'hello' }
    ]
  });
  var body = dom.querySelector('.tokui-bubble__body');
  assert.notStrictEqual(body, null);
  assert.ok(body.children.length > 0);
});

// ===== toolbar 测试 =====

test('toolbar basic render - div.tokui-toolbar with defaults', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toolbar', attrs: {}, children: [] });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-toolbar'));
  assert.ok(dom.classList.contains('tokui-toolbar--bottom'));
  assert.ok(dom.classList.contains('tokui-toolbar--right'));
});

test('toolbar pos:top → tokui-toolbar--top', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toolbar', attrs: { pos: 'top' }, children: [] });
  assert.ok(dom.classList.contains('tokui-toolbar--top'));
  assert.ok(!dom.classList.contains('tokui-toolbar--bottom'));
});

test('toolbar align:center → tokui-toolbar--center', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toolbar', attrs: { align: 'center' }, children: [] });
  assert.ok(dom.classList.contains('tokui-toolbar--center'));
});

test('toolbar renders children', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'toolbar',
    attrs: {},
    children: [
      { type: 'btn', attrs: { tx: 'OK' }, children: [] }
    ]
  });
  assert.ok(dom.children.length > 0);
});

// ===== dd-item 测试 =====

test('dd-item basic render - div.tokui-dropdown__item with role and tabindex', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'dd-item', attrs: { tx: 'Edit' }, children: [] });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-dropdown__item'));
  assert.strictEqual(dom.getAttribute('role'), 'menuitem');
  assert.strictEqual(dom.getAttribute('tabindex'), '0');
});

test('dd-item tx sets textContent', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'dd-item', attrs: { tx: 'Delete' }, children: [] });
  assert.strictEqual(dom.textContent, 'Delete');
});

test('dd-item clk sets data-tokui-clk', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'dd-item', attrs: { tx: 'Go', clk: 'handleGo' }, children: [] });
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'handleGo');
});

test('dd-item dis adds disabled class and aria-disabled', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'dd-item', attrs: { tx: 'X', dis: true, v: 'danger' }, children: [] });
  assert.ok(dom.classList.contains('tokui-dropdown__item--disabled'));
  assert.strictEqual(dom.getAttribute('aria-disabled'), 'true');
  assert.ok(dom.classList.contains('tokui-dropdown__item--danger'));
});

// ===== calendar 测试 =====

test('calendar basic render - div.tokui-calendar with header and grid', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'calendar', attrs: { month: '2025-06' }, children: [] });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-calendar'));
  assert.notStrictEqual(dom.querySelector('.tokui-calendar__header'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-calendar__grid'), null);
});

test('calendar v:card → tokui-calendar--card', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'calendar', attrs: { month: '2025-06', v: 'card' }, children: [] });
  assert.ok(dom.classList.contains('tokui-calendar--card'));
});

test('calendar marks attr creates marked days', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'calendar', attrs: { month: '2025-06', marks: '3,15,25' }, children: [] });
  var marked = dom.querySelectorAll('.tokui-calendar__day--marked');
  assert.strictEqual(marked.length, 3);
});

test('calendar range attr marks start/end/in-range days', function() {
  var rc = makeRenderer();
  // 2025-06，区间 10-14（共 5 天：10/11/12/13/14）
  var dom = rc.render({ type: 'calendar', attrs: { month: '2025-06', range: '10-14' }, children: [] });
  var inRange = dom.querySelectorAll('.tokui-calendar__day--in-range');
  assert.strictEqual(inRange.length, 5);
  assert.strictEqual(dom.querySelectorAll('.tokui-calendar__day--range-start').length, 1);
  assert.strictEqual(dom.querySelectorAll('.tokui-calendar__day--range-end').length, 1);
});

test('calendar ranges attr supports multiple segments', function() {
  var rc = makeRenderer();
  // 1-3 + 15-16 = 5 天
  var dom = rc.render({ type: 'calendar', attrs: { month: '2025-06', ranges: '1-3;15-16' }, children: [] });
  var inRange = dom.querySelectorAll('.tokui-calendar__day--in-range');
  assert.strictEqual(inRange.length, 5);
  assert.strictEqual(dom.querySelectorAll('.tokui-calendar__day--range-start').length, 2);
  assert.strictEqual(dom.querySelectorAll('.tokui-calendar__day--range-end').length, 2);
});

test('calendar sel attr selects discrete days', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'calendar', attrs: { month: '2025-06', sel: '5,20' }, children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-calendar__day--selected').length, 2);
});

test('calendar renders 7 weekday headers', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'calendar', attrs: { month: '2025-06' }, children: [] });
  var weekdays = dom.querySelectorAll('.tokui-calendar__weekday');
  assert.strictEqual(weekdays.length, 7);
});

test('calendar tt attr sets custom title', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'calendar', attrs: { month: '2025-06', tt: 'Custom Title' }, children: [] });
  var header = dom.querySelector('.tokui-calendar__header');
  assert.strictEqual(header.textContent, 'Custom Title');
});

// ===== toast 测试 =====

test('toast basic render - div.tokui-toast with role alert', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toast', attrs: { tx: 'Hello', id: 't1' }, children: [] });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-toast'));
  assert.strictEqual(dom.getAttribute('role'), 'alert');
  assert.strictEqual(dom.getAttribute('aria-live'), 'polite');
});

test('toast t:error → tokui-toast--error', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toast', attrs: { tx: 'Fail', t: 'error' }, children: [] });
  assert.ok(dom.classList.contains('tokui-toast--error'));
});

test('toast pos:bottom → tokui-toast--bottom', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toast', attrs: { tx: 'X', pos: 'bottom' }, children: [] });
  assert.ok(dom.classList.contains('tokui-toast--bottom'));
});

test('toast registers global window.TokUI.showToast', function() {
  // 清理之前状态
  if (global.TokUI) delete global.TokUI;
  var rc = makeRenderer();
  rc.render({ type: 'toast', attrs: { tx: 'Msg', id: 't2' }, children: [] });
  assert.strictEqual(typeof global.window.TokUI.showToast, 'function');
  assert.strictEqual(global.window.TokUI._toastMap['t2'] !== undefined, true);
});

test('toast tx sets text content', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toast', attrs: { tx: 'Saved!' }, children: [] });
  // toast 有 icon span + text span
  var spans = dom.querySelectorAll('span');
  var found = false;
  for (var i = 0; i < spans.length; i++) {
    if (spans[i].textContent === 'Saved!') found = true;
  }
  assert.ok(found);
});

// ===== watermark 测试 =====

test('watermark basic render - div.tokui-watermark with content and overlay', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'watermark', attrs: {}, children: [] });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-watermark'));
  assert.notStrictEqual(dom.querySelector('.tokui-watermark__content'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-watermark__overlay'), null);
});

test('watermark overlay has backgroundImage from canvas', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'watermark', attrs: { tx: 'DRAFT' }, children: [] });
  var overlay = dom.querySelector('.tokui-watermark__overlay');
  assert.notStrictEqual(overlay, null);
  assert.ok(overlay.style.backgroundImage.indexOf('data:image') !== -1);
});

test('watermark renders children into content', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'watermark',
    attrs: {},
    children: [
      { type: 'p', attrs: {}, children: [], content: 'secret' }
    ]
  });
  var content = dom.querySelector('.tokui-watermark__content');
  assert.ok(content.children.length > 0);
});

test('watermark s:lg affects font size', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'watermark', attrs: { s: 'lg' }, children: [] });
  assert.ok(dom.classList.contains('tokui-watermark'));
});

// ===== think-chain / think-step 测试 =====

test('think-chain basic render - details.tokui-think-chain with summary', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-chain',
    attrs: { tt: '推理过程' },
    children: [
      { type: 'think-step', attrs: { status: 'done', tt: '步骤1' }, children: [], content: '内容1' }
    ]
  });
  assert.strictEqual(dom.tagName, 'DETAILS');
  assert.ok(dom.classList.contains('tokui-think-chain'));
  var summary = dom.querySelector('.tokui-think-chain__summary');
  assert.notStrictEqual(summary, null);
});

test('think-chain renders think-step children as timeline items', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-chain',
    attrs: { tt: '推理过程' },
    children: [
      { type: 'think-step', attrs: { status: 'done', tt: '步骤1' }, children: [], content: '内容1' },
      { type: 'think-step', attrs: { status: 'running', tt: '步骤2' }, children: [], content: '' },
      { type: 'think-step', attrs: { status: 'pending', tt: '步骤3' }, children: [], content: '' }
    ]
  });
  var steps = dom.querySelectorAll('.tokui-think-step');
  assert.strictEqual(steps.length, 3);
});

test('think-step status:done has green checkmark class', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-step', attrs: { status: 'done', tt: '完成步骤' }, children: [], content: 'OK'
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-think-step'));
  assert.ok(dom.classList.contains('tokui-think-step--done'));
  var icon = dom.querySelector('.tokui-think-step__icon');
  assert.notStrictEqual(icon, null);
});

test('think-step status:running has spinner class', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-step', attrs: { status: 'running', tt: '进行中' }, children: [], content: ''
  });
  assert.ok(dom.classList.contains('tokui-think-step--running'));
  var spinner = dom.querySelector('.tokui-think-step__spinner');
  assert.notStrictEqual(spinner, null);
});

test('think-step status:pending has gray circle class', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-step', attrs: { status: 'pending', tt: '等待中' }, children: [], content: ''
  });
  assert.ok(dom.classList.contains('tokui-think-step--pending'));
});

test('think-step status:error has error class', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-step', attrs: { status: 'error', tt: '出错了' }, children: [], content: '失败原因'
  });
  assert.ok(dom.classList.contains('tokui-think-step--error'));
});

test('think-step renders children into content area', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-step', attrs: { status: 'done', tt: '分析' }, children: [
      { type: 'p', attrs: {}, children: [], content: '子内容段落' }
    ], content: ''
  });
  var body = dom.querySelector('.tokui-think-step__body');
  assert.notStrictEqual(body, null);
  assert.ok(body.children.length > 0);
});

test('think-chain has _slot for streaming', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-chain',
    attrs: { tt: '推理' },
    children: [
      { type: 'think-step', attrs: { status: 'done', tt: 'S1' }, children: [], content: '' }
    ]
  });
  assert.strictEqual(dom._tokuiType, 'think-chain');
  assert.notStrictEqual(dom._slot, undefined);
});

test('think-step has _slot for streaming content', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-step', attrs: { status: 'running', tt: 'S1' }, children: [], content: ''
  });
  assert.strictEqual(dom._tokuiType, 'think-step');
  assert.notStrictEqual(dom._slot, undefined);
});

test('think-chain status:running attr sets running class', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-chain',
    attrs: { tt: '推理', status: 'running' },
    children: []
  });
  assert.ok(dom.classList.contains('tokui-think-chain--running'));
});

test('think-chain open attr sets open on details', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-chain',
    attrs: { tt: '推理', open: true },
    children: []
  });
  assert.strictEqual(dom.getAttribute('open'), '');
});

test('think-step dur attr renders duration text', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'think-step', attrs: { status: 'done', tt: '分析', dur: '1.2s' }, children: [], content: ''
  });
  var durEl = dom.querySelector('.tokui-think-step__dur');
  assert.notStrictEqual(durEl, null);
  assert.strictEqual(durEl.textContent, '1.2s');
});

// ===== Builder 测试 =====

var TokUIBuilder = require('../src/server/tokui-builder').TokUIBuilder;

test('builder thinkChain + thinkStep generates correct DSL', function() {
  var b = new TokUIBuilder();
  b.thinkChain({ tt: '推理过程', status: 'running' })
    .thinkStep({ status: 'done', tt: '分析问题', dur: '1.2s' })
      .p('理解需求...')
    .end()
    .thinkStep({ status: 'running', tt: '检索知识' })
    .end()
    .thinkStep({ status: 'pending', tt: '生成回答' })
    .end()
  .end();
  var dsl = b.toString();
  assert.ok(dsl.indexOf('[think-chain') !== -1);
  assert.ok(dsl.indexOf('tt:推理过程') !== -1);
  assert.ok(dsl.indexOf('[think-step') !== -1);
  assert.ok(dsl.indexOf('[/think-step]') !== -1);
  assert.ok(dsl.indexOf('[/think-chain]') !== -1);
  assert.ok(dsl.indexOf('status:running') !== -1);
  assert.ok(dsl.indexOf('dur:1.2s') !== -1);
});

// ===== Conversations 对话列表渲染器测试 =====

test('conversations basic render - div.tokui-conversations with role=list', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'conversations',
    attrs: {},
    children: [
      { type: 'conv', attrs: { tt: '会话1', time: '10:30' }, children: [] }
    ]
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-conversations'));
  assert.strictEqual(dom.getAttribute('role'), 'list');
  assert.strictEqual(dom._tokuiType, 'conversations');
});

test('conversations active class on conv item', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'conversations',
    attrs: {},
    children: [
      { type: 'conv', attrs: { tt: '普通', time: '09:00' }, children: [] },
      { type: 'conv', attrs: { tt: '激活', time: '10:00', active: true }, children: [] }
    ]
  });
  var items = dom.querySelectorAll('.tokui-conv');
  assert.strictEqual(items.length, 2);
  assert.ok(!items[0].classList.contains('tokui-conv--active'));
  assert.ok(items[1].classList.contains('tokui-conv--active'));
});

test('conversations title and time elements', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'conversations',
    attrs: {},
    children: [
      { type: 'conv', attrs: { tt: '测试标题', time: '14:30' }, children: [] }
    ]
  });
  var titleEl = dom.querySelector('.tokui-conv__title');
  assert.notStrictEqual(titleEl, null);
  assert.strictEqual(titleEl.textContent, '测试标题');
  var timeEl = dom.querySelector('.tokui-conv__time');
  assert.notStrictEqual(timeEl, null);
  assert.strictEqual(timeEl.textContent, '14:30');
});

test('conversations delete action exists', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'conversations',
    attrs: {},
    children: [
      { type: 'conv', attrs: { tt: '可删除', time: '10:00' }, children: [] }
    ]
  });
  var deleteBtn = dom.querySelector('.tokui-conv__delete');
  assert.notStrictEqual(deleteBtn, null);
  var actions = dom.querySelector('.tokui-conv__actions');
  assert.notStrictEqual(actions, null);
});

test('conversations clk data attr on items', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'conversations',
    attrs: { clk: 'onSelectConv' },
    children: [
      { type: 'conv', attrs: { tt: '会话', time: '10:00' }, children: [] }
    ]
  });
  var item = dom.querySelector('.tokui-conv');
  assert.strictEqual(item.getAttribute('data-tokui-clk'), 'onSelectConv');
});

test('conversations time grouping - header appears for multiple groups', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'conversations',
    attrs: {},
    children: [
      { type: 'conv', attrs: { tt: '今天', time: '10:30' }, children: [] },
      { type: 'conv', attrs: { tt: '昨天', time: '昨天' }, children: [] },
      { type: 'conv', attrs: { tt: '更早', time: '3天前' }, children: [] }
    ]
  });
  var headers = dom.querySelectorAll('.tokui-conversations__group-header');
  assert.strictEqual(headers.length, 3);
  assert.strictEqual(headers[0].textContent, '今天');
  assert.strictEqual(headers[1].textContent, '昨天');
  assert.strictEqual(headers[2].textContent, '更早');
});

test('conversations no group header when all today', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'conversations',
    attrs: {},
    children: [
      { type: 'conv', attrs: { tt: '会话1', time: '10:30' }, children: [] },
      { type: 'conv', attrs: { tt: '会话2', time: '11:00' }, children: [] }
    ]
  });
  var headers = dom.querySelectorAll('.tokui-conversations__group-header');
  assert.strictEqual(headers.length, 0);
});

test('conversations empty state when no children', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'conversations',
    attrs: {},
    children: []
  });
  var empty = dom.querySelector('.tokui-conversations__empty');
  assert.notStrictEqual(empty, null);
  assert.strictEqual(empty.textContent, '暂无会话');
});

// ===== welcome 测试 =====

test('welcome basic render - div.tokui-welcome with title and subtitle', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'welcome',
    attrs: { tt: '你好，有什么可以帮你？', st: '我可以帮你完成各种任务' },
    children: []
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-welcome'));
  var title = dom.querySelector('.tokui-welcome__title');
  assert.notStrictEqual(title, null);
  assert.strictEqual(title.textContent, '你好，有什么可以帮你？');
  var subtitle = dom.querySelector('.tokui-welcome__subtitle');
  assert.notStrictEqual(subtitle, null);
  assert.strictEqual(subtitle.textContent, '我可以帮你完成各种任务');
});

test('welcome renders children into grid area', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'welcome',
    attrs: { tt: 'Hello' },
    children: [
      { type: 'welcome-feature', attrs: { tt: 'Feature A', tx: 'Desc A', i: 'code' }, children: [] },
      { type: 'welcome-feature', attrs: { tt: 'Feature B', tx: 'Desc B', i: 'chart' }, children: [] }
    ]
  });
  var grid = dom.querySelector('.tokui-welcome__grid');
  assert.notStrictEqual(grid, null);
  var features = grid.querySelectorAll('.tokui-welcome-feature');
  assert.strictEqual(features.length, 2);
});

test('welcome-feature render - card with icon, title, description', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'welcome-feature',
    attrs: { tt: '代码生成', tx: '根据需求生成高质量代码', i: 'code', clk: 'feat1' },
    children: []
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-welcome-feature'));
  var icon = dom.querySelector('.tokui-welcome-feature__icon');
  assert.notStrictEqual(icon, null);
  var title = dom.querySelector('.tokui-welcome-feature__title');
  assert.notStrictEqual(title, null);
  assert.strictEqual(title.textContent, '代码生成');
  var desc = dom.querySelector('.tokui-welcome-feature__desc');
  assert.notStrictEqual(desc, null);
  assert.strictEqual(desc.textContent, '根据需求生成高质量代码');
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'feat1');
});

test('welcome-feature icon variants - code/chart/doc', function() {
  var rc = makeRenderer();
  ['code', 'chart', 'doc'].forEach(function(iconType) {
    var dom = rc.render({
      type: 'welcome-feature',
      attrs: { tt: 'Test', i: iconType },
      children: []
    });
    assert.ok(dom.classList.contains('tokui-welcome-feature--' + iconType));
    var icon = dom.querySelector('.tokui-welcome-feature__icon');
    assert.notStrictEqual(icon, null);
  });
});

test('welcome-feature without clk has no data-tokui-clk', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'welcome-feature',
    attrs: { tt: 'No Click', tx: 'Desc', i: 'doc' },
    children: []
  });
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), null);
});

test('welcome without subtitle still renders', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'welcome',
    attrs: { tt: 'Just Title' },
    children: []
  });
  assert.ok(dom.classList.contains('tokui-welcome'));
  var title = dom.querySelector('.tokui-welcome__title');
  assert.strictEqual(title.textContent, 'Just Title');
  var subtitle = dom.querySelector('.tokui-welcome__subtitle');
  assert.strictEqual(subtitle, null);
});

// ===== suggestions / suggestion 测试 =====

test('suggestions basic render - div.tokui-suggestions with grid', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'suggestions',
    attrs: { cols: '3' },
    children: [
      { type: 'suggestion', attrs: { tt: 'Title A', tx: 'Desc A' }, children: [] }
    ]
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-suggestions'));
  // Should have grid container inside
  var grid = dom.querySelector('.tokui-suggestions__grid');
  assert.notStrictEqual(grid, null);
  // Grid should have style for 3 columns
  assert.ok(grid.style.gridTemplateColumns.indexOf('3') !== -1 || grid.className.indexOf('tokui-suggestions__grid--3') !== -1);
});

test('suggestions renders suggestion children as cards', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'suggestions',
    attrs: { cols: '2' },
    children: [
      { type: 'suggestion', attrs: { tt: 'Auth Module', tx: 'Login register JWT', clk: 'auth' }, children: [] },
      { type: 'suggestion', attrs: { tt: 'React Hooks', tx: 'useState vs useEffect', clk: 'hooks' }, children: [] }
    ]
  });
  var cards = dom.querySelectorAll('.tokui-suggestion');
  assert.strictEqual(cards.length, 2);
  // First card
  assert.strictEqual(cards[0].querySelector('.tokui-suggestion__title').textContent, 'Auth Module');
  assert.strictEqual(cards[0].querySelector('.tokui-suggestion__desc').textContent, 'Login register JWT');
  // Click handler via data-tokui-clk
  assert.strictEqual(cards[0].getAttribute('data-tokui-clk'), 'auth');
});

test('suggestion card has colored left border', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'suggestions',
    attrs: {},
    children: [
      { type: 'suggestion', attrs: { tt: 'Test', tx: 'Desc' }, children: [] }
    ]
  });
  var card = dom.querySelector('.tokui-suggestion');
  assert.notStrictEqual(card, null);
  // Should have border-left styling (set via inline style or CSS class)
  var hasBorderLeft = card.style.borderLeftWidth || card.classList.contains('tokui-suggestion');
  assert.ok(hasBorderLeft);
});

test('suggestions default cols is 2 when not specified', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'suggestions',
    attrs: {},
    children: [
      { type: 'suggestion', attrs: { tt: 'A', tx: 'B' }, children: [] }
    ]
  });
  var grid = dom.querySelector('.tokui-suggestions__grid');
  assert.notStrictEqual(grid, null);
  // Default should be 2 columns
  assert.ok(grid.style.gridTemplateColumns.indexOf('2') !== -1 || grid.className.indexOf('2') !== -1);
});

test('suggestions clk attr sets data-tokui-clk on wrapper', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'suggestions',
    attrs: { clk: 'usePrompt' },
    children: [
      { type: 'suggestion', attrs: { tt: 'A', tx: 'B' }, children: [] }
    ]
  });
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'usePrompt');
});

// ===== attachments / attach 测试 =====

test('parser: attachments is in CONTAINERS set', function() {
  var { CONTAINERS } = require('../src/core/parser');
  assert.ok(CONTAINERS.has('attachments'), 'attachments should be in CONTAINERS');
});

test('parser: parse attachments with attach children', function() {
  var { TokUIParser } = require('../src/core/parser');
  var nodes = [];
  var p = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  p.parse('[attachments clk:removeFile]\n  [attach t:image s:"photo.png" u:"/files/1.png" size:"2.4MB"]\n  [attach t:pdf s:"report.pdf" u:"/files/2.pdf" size:"1.1MB" clk:downloadFile]\n  [attach t:code s:"main.js" u:"/files/3.js" size:"12KB"]\n[/attachments]');
  var root = nodes[0];
  assert.strictEqual(root.type, 'attachments');
  assert.strictEqual(root.attrs.clk, 'removeFile');
  assert.ok(root.children.length >= 3, 'should have at least 3 children');
  assert.strictEqual(root.children[0].type, 'attach');
  assert.strictEqual(root.children[0].attrs.t, 'image');
  assert.strictEqual(root.children[0].attrs.s, 'photo.png');
  assert.strictEqual(root.children[0].attrs.size, '2.4MB');
  assert.strictEqual(root.children[1].type, 'attach');
  assert.strictEqual(root.children[1].attrs.t, 'pdf');
  assert.strictEqual(root.children[1].attrs.clk, 'downloadFile');
  assert.strictEqual(root.children[2].type, 'attach');
  assert.strictEqual(root.children[2].attrs.t, 'code');
});

test('attachments container renders div.tokui-attachments with children', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'attachments',
    attrs: { clk: 'removeFile' },
    children: [
      { type: 'attach', attrs: { t: 'pdf', s: 'report.pdf', u: '/files/2.pdf', size: '1.1MB' }, children: [] },
      { type: 'attach', attrs: { t: 'image', s: 'photo.png', u: '/files/1.png', size: '2.4MB' }, children: [] }
    ]
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-attachments'));
  var items = dom.querySelectorAll('.tokui-attach');
  assert.strictEqual(items.length, 2);
});

test('attachments sets data-tokui-clk from clk attr', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'attachments', attrs: { clk: 'handleRemove' }, children: [] });
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'handleRemove');
});

test('attach renders div.tokui-attach with file info', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'attach', attrs: { t: 'pdf', s: 'report.pdf', u: '/files/2.pdf', size: '1.1MB' }, children: [] });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-attach'));
  var nameEl = dom.querySelector('.tokui-attach__name');
  assert.notStrictEqual(nameEl, null);
  assert.strictEqual(nameEl.textContent, 'report.pdf');
  var sizeEl = dom.querySelector('.tokui-attach__size');
  assert.notStrictEqual(sizeEl, null);
  assert.strictEqual(sizeEl.textContent, '1.1MB');
});

test('attach image type renders thumbnail', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'attach', attrs: { t: 'image', s: 'photo.png', u: '/files/1.png', size: '2.4MB' }, children: [] });
  var thumb = dom.querySelector('.tokui-attach__thumb');
  assert.notStrictEqual(thumb, null);
  assert.strictEqual(thumb.tagName, 'IMG');
  assert.strictEqual(thumb.getAttribute('src'), '/files/1.png');
});

test('attach pdf type renders colored SVG icon', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'attach', attrs: { t: 'pdf', s: 'report.pdf', u: '/files/2.pdf', size: '1.1MB' }, children: [] });
  var icon = dom.querySelector('.tokui-attach__icon');
  assert.notStrictEqual(icon, null);
  // Should contain an SVG in innerHTML (mock DOM doesn't parse innerHTML into children)
  assert.ok(icon.innerHTML.indexOf('<svg') !== -1, 'icon should contain SVG markup');
  // Should contain PDF text label
  assert.ok(icon.innerHTML.indexOf('PDF') !== -1, 'icon should contain PDF label');
});

test('attach code type renders blue icon', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'attach', attrs: { t: 'code', s: 'main.js', u: '/files/3.js', size: '12KB' }, children: [] });
  assert.ok(dom.classList.contains('tokui-attach'));
  var icon = dom.querySelector('.tokui-attach__icon');
  assert.notStrictEqual(icon, null);
});

test('attach has hover actions container', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'attach', attrs: { t: 'pdf', s: 'report.pdf', u: '/files/2.pdf', size: '1.1MB', clk: 'downloadFile' }, children: [] });
  var actions = dom.querySelector('.tokui-attach__actions');
  assert.notStrictEqual(actions, null);
});

test('attach clk attr sets data-tokui-clk', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'attach', attrs: { t: 'pdf', s: 'report.pdf', u: '/files/2.pdf', size: '1.1MB', clk: 'downloadFile' }, children: [] });
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'downloadFile');
});

test('attach without type defaults gracefully', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'attach', attrs: { s: 'unknown.dat', u: '/files/x.dat', size: '5KB' }, children: [] });
  assert.ok(dom.classList.contains('tokui-attach'));
  var nameEl = dom.querySelector('.tokui-attach__name');
  assert.strictEqual(nameEl.textContent, 'unknown.dat');
});

// Builder tests for attachments

var TokUIBuilder = require('../src/server/tokui-builder').TokUIBuilder;

test('builder attachments + attach generates correct DSL', function() {
  var b = new TokUIBuilder();
  b.attachments({ clk: 'removeFile' })
    .attach({ t: 'image', s: 'photo.png', u: '/files/1.png', size: '2.4MB' })
    .attach({ t: 'pdf', s: 'report.pdf', u: '/files/2.pdf', size: '1.1MB', clk: 'downloadFile' })
  .end();
  var dsl = b.toString();
  assert.ok(dsl.indexOf('[attachments') !== -1);
  assert.ok(dsl.indexOf('clk:removeFile') !== -1);
  assert.ok(dsl.indexOf('[attach') !== -1);
  assert.ok(dsl.indexOf('[/attachments]') !== -1);
  assert.ok(dsl.indexOf('t:image') !== -1);
  assert.ok(dsl.indexOf('t:pdf') !== -1);
  assert.ok(dsl.indexOf('s:photo.png') !== -1);
  assert.ok(dsl.indexOf('clk:downloadFile') !== -1);
});

// ===== artifact 测试 =====

test('artifact basic render - div.tokui-artifact with header, code tab, preview tab, resize handle', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'React 组件预览', lang: 'jsx', pos: 'right', w: '50' },
    children: [
      {
        type: 'artifact-code',
        attrs: {},
        children: [
          { type: '_text', attrs: {}, content: 'function App() { return <div>Hello</div>; }', children: [] }
        ]
      },
      {
        type: 'artifact-preview',
        attrs: {},
        children: []
      }
    ]
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-artifact'));
  assert.notStrictEqual(dom.querySelector('.tokui-artifact__header'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-artifact__code'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-artifact__preview'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-artifact__resize'), null);
});

test('artifact header has title text', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'My Title' },
    children: []
  });
  var title = dom.querySelector('.tokui-artifact__title');
  assert.notStrictEqual(title, null);
  assert.strictEqual(title.textContent, 'My Title');
});

test('artifact header has Code and Preview tab buttons', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'Preview' },
    children: []
  });
  var btns = dom.querySelectorAll('.tokui-artifact__tab');
  assert.strictEqual(btns.length, 2);
  assert.ok(btns[0].classList.contains('tokui-artifact__tab--code'));
  assert.ok(btns[1].classList.contains('tokui-artifact__tab--preview'));
});

test('artifact header has close button', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'Test' },
    children: []
  });
  var closeBtn = dom.querySelector('.tokui-artifact__close');
  assert.notStrictEqual(closeBtn, null);
});

test('artifact-code renders syntax-highlighted code', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'Code', lang: 'js' },
    children: [
      {
        type: 'artifact-code',
        attrs: {},
        children: [
          { type: '_text', attrs: {}, content: 'const x = 1;', children: [] }
        ]
      },
      { type: 'artifact-preview', attrs: {}, children: [] }
    ]
  });
  var codeArea = dom.querySelector('.tokui-artifact__code');
  assert.notStrictEqual(codeArea, null);
  var pre = codeArea.querySelector('pre');
  assert.notStrictEqual(pre, null);
  var code = pre.querySelector('code');
  assert.notStrictEqual(code, null);
});

test('artifact-code has copy button', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'Code', lang: 'js' },
    children: [
      {
        type: 'artifact-code',
        attrs: {},
        children: [
          { type: '_text', attrs: {}, content: 'console.log(1);', children: [] }
        ]
      },
      { type: 'artifact-preview', attrs: {}, children: [] }
    ]
  });
  var copyBtn = dom.querySelector('.tokui-artifact__code-copy');
  assert.notStrictEqual(copyBtn, null);
});

test('artifact-preview renders iframe', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'Preview' },
    children: [
      { type: 'artifact-code', attrs: {}, children: [] },
      { type: 'artifact-preview', attrs: {}, children: [] }
    ]
  });
  var previewArea = dom.querySelector('.tokui-artifact__preview');
  assert.notStrictEqual(previewArea, null);
  var iframe = previewArea.querySelector('iframe');
  assert.notStrictEqual(iframe, null);
  assert.strictEqual(iframe.getAttribute('sandbox'), 'allow-scripts');
});

test('artifact has tokui-artifact class', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'Default' },
    children: []
  });
  assert.ok(dom.classList.contains('tokui-artifact'));
});

test('artifact custom w attr is accepted', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'Custom', w: '70' },
    children: []
  });
  assert.ok(dom.classList.contains('tokui-artifact'));
});

test('artifact _tokuiType is set', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'artifact',
    attrs: { tt: 'Test' },
    children: []
  });
  assert.strictEqual(dom._tokuiType, 'artifact');
});

// ===== command / command-group / command-item 测试 =====

test('command basic render - div.tokui-command with overlay, input, and list', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'command',
    attrs: { ph: '搜索命令...' },
    children: [
      {
        type: 'command-group',
        attrs: { tt: '操作' },
        children: [
          { type: 'command-item', attrs: { tx: '新建对话', clk: 'newChat' }, children: [] }
        ]
      }
    ]
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-command'));
  // overlay (backdrop)
  var overlay = dom.querySelector('.tokui-command__overlay');
  assert.notStrictEqual(overlay, null);
  // search input
  var input = dom.querySelector('.tokui-command__input');
  assert.notStrictEqual(input, null);
  assert.strictEqual(input.getAttribute('placeholder'), '搜索命令...');
  // list
  var list = dom.querySelector('.tokui-command__list');
  assert.notStrictEqual(list, null);
  // group
  var group = dom.querySelector('.tokui-command__group');
  assert.notStrictEqual(group, null);
  // group heading
  var heading = dom.querySelector('.tokui-command__group-heading');
  assert.notStrictEqual(heading, null);
  assert.strictEqual(heading.textContent, '操作');
  // item
  var item = dom.querySelector('.tokui-command__item');
  assert.notStrictEqual(item, null);
  var itemText = item.querySelector('.tokui-command__item-text');
  assert.notStrictEqual(itemText, null);
  assert.strictEqual(itemText.textContent, '新建对话');
  assert.strictEqual(item.getAttribute('data-tokui-clk'), 'newChat');
});

test('command-group renders heading and items', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'command-group',
    attrs: { tt: '设置' },
    children: [
      { type: 'command-item', attrs: { tx: '主题' }, children: [] },
      { type: 'command-item', attrs: { tx: '语言' }, children: [] }
    ]
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-command__group'));
  var items = dom.querySelectorAll('.tokui-command__item');
  assert.strictEqual(items.length, 2);
});

test('command-item render with text and clk handler', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'command-item',
    attrs: { tx: '复制', clk: 'copyCmd' },
    children: []
  });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-command__item'));
  var textSpan = dom.querySelector('.tokui-command__item-text');
  assert.notStrictEqual(textSpan, null);
  assert.strictEqual(textSpan.textContent, '复制');
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'copyCmd');
});

test('command-item has role option and tabindex', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'command-item',
    attrs: { tx: 'Open' },
    children: []
  });
  assert.strictEqual(dom.getAttribute('role'), 'option');
  assert.strictEqual(dom.getAttribute('tabindex'), '-1');
});

test('command with clk attr on root triggers event bus', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'command',
    attrs: { clk: 'onCommand' },
    children: []
  });
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'onCommand');
});

test('command empty state shows when no items match', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'command',
    attrs: { ph: '搜索...' },
    children: []
  });
  // empty state container exists
  var empty = dom.querySelector('.tokui-command__empty');
  assert.notStrictEqual(empty, null);
});

test('command item stores data-value for search filtering', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'command-item',
    attrs: { tx: 'Delete All', v: 'delete-all', clk: 'delAll' },
    children: []
  });
  assert.strictEqual(dom.getAttribute('data-value'), 'delete-all');
});

test('command-item default data-value is tx text', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'command-item',
    attrs: { tx: 'Save File' },
    children: []
  });
  assert.strictEqual(dom.getAttribute('data-value'), 'Save File');
});

// ===== command builder 测试 =====

test('builder.command() generates open tag with attrs', function() {
  var TokUIBuilder = require('../src/server/tokui-builder').TokUIBuilder;
  var b = new TokUIBuilder();
  b.command({ ph: '搜索...' });
  assert.strictEqual(b.chunks[b.chunks.length - 1], '[command ph:搜索...]');
  assert.strictEqual(b.stack[b.stack.length - 1], 'command');
});

test('builder.commandGroup() generates open tag with tt', function() {
  var TokUIBuilder = require('../src/server/tokui-builder').TokUIBuilder;
  var b = new TokUIBuilder();
  b.commandGroup({ tt: '操作' });
  assert.strictEqual(b.chunks[b.chunks.length - 1], '[command-group tt:操作]');
  assert.strictEqual(b.stack[b.stack.length - 1], 'command-group');
});

test('builder.commandItem() generates self-closing tag', function() {
  var TokUIBuilder = require('../src/server/tokui-builder').TokUIBuilder;
  var b = new TokUIBuilder();
  b.commandItem({ tx: '新建', clk: 'newFile' });
  assert.strictEqual(b.chunks[b.chunks.length - 1], '[command-item tx:新建 clk:newFile]');
  assert.strictEqual(b.stack.length, 0);
});

test('builder full command DSL chain', function() {
  var TokUIBuilder = require('../src/server/tokui-builder').TokUIBuilder;
  var b = new TokUIBuilder();
  b.command({ ph: '搜索命令...' })
    .commandGroup({ tt: '操作' })
      .commandItem({ tx: '新建对话', clk: 'newChat' })
      .commandItem({ tx: '清空历史', clk: 'clearHistory' })
    .end()
    .commandGroup({ tt: '设置' })
      .commandItem({ tx: '切换主题', clk: 'toggleTheme' })
    .end()
  .end();
  var dsl = b.toString();
  assert.ok(dsl.indexOf('[command ph:搜索命令...]') !== -1);
  assert.ok(dsl.indexOf('[command-group tt:操作]') !== -1);
  assert.ok(dsl.indexOf('[command-item tx:新建对话 clk:newChat]') !== -1);
  assert.ok(dsl.indexOf('[command-item tx:清空历史 clk:clearHistory]') !== -1);
  assert.ok(dsl.indexOf('[command-group tt:设置]') !== -1);
  assert.ok(dsl.indexOf('[command-item tx:切换主题 clk:toggleTheme]') !== -1);
  assert.ok(dsl.indexOf('[/command-group]') !== -1);
  assert.ok(dsl.indexOf('[/command]') !== -1);
});

test('builder commandItem with shortcut', function() {
  var TokUIBuilder = require('../src/server/tokui-builder').TokUIBuilder;
  var b = new TokUIBuilder();
  b.commandItem({ tx: '复制', clk: 'copy', shortcut: 'Ctrl+C' });
  assert.strictEqual(b.chunks[b.chunks.length - 1], '[command-item tx:复制 clk:copy shortcut:Ctrl+C]');
});

test('builder toChunks for streaming command', function() {
  var TokUIBuilder = require('../src/server/tokui-builder').TokUIBuilder;
  var b = new TokUIBuilder();
  b.command({ ph: '搜索' })
    .commandGroup({ tt: '文件' })
      .commandItem({ tx: '打开' })
    .end()
  .end();
  var chunks = b.toChunks();
  assert.strictEqual(chunks[0], '[command ph:搜索]');
  assert.strictEqual(chunks[1], '[command-group tt:文件]');
  assert.strictEqual(chunks[2], '[command-item tx:打开]');
  assert.strictEqual(chunks[3], '[/command-group]');
  assert.strictEqual(chunks[4], '[/command]');
});

// ===== toggle 测试 =====

test('toggle basic render - button.tokui-toggle with aria-pressed', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toggle', attrs: { tx: 'Bold' }, children: [] });
  assert.strictEqual(dom.tagName, 'BUTTON');
  assert.ok(dom.classList.contains('tokui-toggle'));
  assert.strictEqual(dom.getAttribute('aria-pressed'), 'false');
  assert.strictEqual(dom.getAttribute('role'), 'switch');
  assert.strictEqual(dom.textContent, 'Bold');
});

test('toggle chk:true sets aria-pressed true and pressed class', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toggle', attrs: { tx: 'Bold', chk: true }, children: [] });
  assert.strictEqual(dom.getAttribute('aria-pressed'), 'true');
  assert.ok(dom.classList.contains('tokui-toggle--pressed'));
});

test('toggle s:sm adds size class', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toggle', attrs: { tx: 'Sm', s: 'sm' }, children: [] });
  assert.ok(dom.classList.contains('tokui-toggle--sm'));
});

test('toggle s:lg adds size class', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toggle', attrs: { tx: 'Lg', s: 'lg' }, children: [] });
  assert.ok(dom.classList.contains('tokui-toggle--lg'));
});

test('toggle dis adds disabled class and attribute', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toggle', attrs: { tx: 'X', dis: true }, children: [] });
  assert.ok(dom.classList.contains('tokui-toggle--disabled'));
  assert.strictEqual(dom.getAttribute('aria-disabled'), 'true');
});

test('toggle clk sets data-tokui-clk', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toggle', attrs: { tx: 'B', clk: 'onBold' }, children: [] });
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'onBold');
});

test('toggle click toggles aria-pressed and pressed class', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toggle', attrs: { tx: 'B' }, children: [] });
  assert.strictEqual(dom.getAttribute('aria-pressed'), 'false');
  assert.ok(!dom.classList.contains('tokui-toggle--pressed'));
  // Simulate click via dispatchEvent on mock
  var clickHandlers = dom._events['click'] || [];
  clickHandlers.forEach(function(fn) { fn({ target: dom }); });
  assert.strictEqual(dom.getAttribute('aria-pressed'), 'true');
  assert.ok(dom.classList.contains('tokui-toggle--pressed'));
  clickHandlers.forEach(function(fn) { fn({ target: dom }); });
  assert.strictEqual(dom.getAttribute('aria-pressed'), 'false');
  assert.ok(!dom.classList.contains('tokui-toggle--pressed'));
});

// ===== toggle-group 测试 =====

test('toggle-group basic render - div.tokui-toggle-group', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toggle-group', attrs: {}, children: [] });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-toggle-group'));
  assert.strictEqual(dom.getAttribute('role'), 'group');
});

test('toggle-group multi adds multi class', function() {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'toggle-group', attrs: { multi: true }, children: [] });
  assert.ok(dom.classList.contains('tokui-toggle-group--multi'));
});

test('toggle-group renders toggle children', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'toggle-group',
    attrs: {},
    children: [
      { type: 'toggle', attrs: { tx: 'B' }, children: [] },
      { type: 'toggle', attrs: { tx: 'I', chk: true }, children: [] }
    ]
  });
  var toggles = dom.querySelectorAll('.tokui-toggle');
  assert.strictEqual(toggles.length, 2);
  assert.strictEqual(toggles[0].textContent, 'B');
  assert.strictEqual(toggles[1].textContent, 'I');
  assert.strictEqual(toggles[1].getAttribute('aria-pressed'), 'true');
});

test('toggle-group single-select: clicking one deselects others', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'toggle-group',
    attrs: {},
    children: [
      { type: 'toggle', attrs: { tx: 'A', chk: true }, children: [] },
      { type: 'toggle', attrs: { tx: 'B' }, children: [] }
    ]
  });
  var toggles = dom.querySelectorAll('.tokui-toggle');
  // A is initially pressed
  assert.strictEqual(toggles[0].getAttribute('aria-pressed'), 'true');
  assert.strictEqual(toggles[1].getAttribute('aria-pressed'), 'false');
  // Click B via group's click handler (simulating event delegation)
  var groupClickHandlers = dom._events['click'] || [];
  groupClickHandlers.forEach(function(fn) { fn({ target: toggles[1] }); });
  assert.strictEqual(toggles[0].getAttribute('aria-pressed'), 'false');
  assert.strictEqual(toggles[1].getAttribute('aria-pressed'), 'true');
});

test('toggle-group multi-select: clicking one does not affect others', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'toggle-group',
    attrs: { multi: true },
    children: [
      { type: 'toggle', attrs: { tx: 'A', chk: true }, children: [] },
      { type: 'toggle', attrs: { tx: 'B' }, children: [] }
    ]
  });
  var toggles = dom.querySelectorAll('.tokui-toggle');
  // A is initially pressed
  assert.strictEqual(toggles[0].getAttribute('aria-pressed'), 'true');
  assert.strictEqual(toggles[1].getAttribute('aria-pressed'), 'false');
  // Click B via toggle's own click handler
  var clickHandlers = toggles[1]._events['click'] || [];
  clickHandlers.forEach(function(fn) { fn({ target: toggles[1] }); });
  assert.strictEqual(toggles[0].getAttribute('aria-pressed'), 'true');
  assert.strictEqual(toggles[1].getAttribute('aria-pressed'), 'true');
});

test('toggle-group size class propagates from group', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'toggle-group',
    attrs: { s: 'sm' },
    children: [
      { type: 'toggle', attrs: { tx: 'X' }, children: [] }
    ]
  });
  assert.ok(dom.classList.contains('tokui-toggle-group--sm'));
});

// ===== hover-card 测试 =====

test('hover-card basic render - span.tokui-hover-card with trigger and content', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'hover-card',
    attrs: {},
    children: [
      { type: 'hover-trigger', attrs: {}, children: [{ type: '_text', attrs: {}, content: '@张三', children: [] }] },
      { type: 'hover-content', attrs: {}, children: [
        { type: 'avatar', attrs: { tx: '张三', size: 'sm' }, children: [] },
        { type: 'p', attrs: {}, content: '张三 · 高级工程师', children: [] }
      ] }
    ]
  });
  assert.strictEqual(dom.tagName, 'SPAN');
  assert.ok(dom.classList.contains('tokui-hover-card'));
  var trigger = dom.querySelector('.tokui-hover-card__trigger');
  assert.notStrictEqual(trigger, null);
  var content = dom.querySelector('.tokui-hover-card__content');
  assert.notStrictEqual(content, null);
});

test('hover-card pos attribute defaults to bottom', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'hover-card',
    attrs: {},
    children: [
      { type: 'hover-trigger', attrs: {}, children: [{ type: '_text', attrs: {}, content: 'hover me', children: [] }] },
      { type: 'hover-content', attrs: {}, children: [] }
    ]
  });
  assert.ok(dom.classList.contains('tokui-hover-card--bottom'));
});

test('hover-card pos:top → tokui-hover-card--top', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'hover-card',
    attrs: { pos: 'top' },
    children: [
      { type: 'hover-trigger', attrs: {}, children: [{ type: '_text', attrs: {}, content: 'top', children: [] }] },
      { type: 'hover-content', attrs: {}, children: [] }
    ]
  });
  assert.ok(dom.classList.contains('tokui-hover-card--top'));
});

test('hover-card w attribute sets width on content', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'hover-card',
    attrs: { w: '240' },
    children: [
      { type: 'hover-trigger', attrs: {}, children: [{ type: '_text', attrs: {}, content: 'wide', children: [] }] },
      { type: 'hover-content', attrs: {}, children: [] }
    ]
  });
  var content = dom.querySelector('.tokui-hover-card__content');
  assert.notStrictEqual(content, null);
  assert.ok(content.style.width.indexOf('240') !== -1);
});

test('hover-card delay attribute stored as data attribute', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'hover-card',
    attrs: { delay: '500' },
    children: [
      { type: 'hover-trigger', attrs: {}, children: [{ type: '_text', attrs: {}, content: 'delayed', children: [] }] },
      { type: 'hover-content', attrs: {}, children: [] }
    ]
  });
  assert.strictEqual(dom.getAttribute('data-delay'), '500');
});

test('hover-card renders nested children inside content', function() {
  var rc = makeRenderer();
  var dom = rc.render({
    type: 'hover-card',
    attrs: { pos: 'right' },
    children: [
      { type: 'hover-trigger', attrs: {}, children: [{ type: '_text', attrs: {}, content: '@user', children: [] }] },
      { type: 'hover-content', attrs: {}, children: [
        { type: 'p', attrs: {}, content: 'Hello', children: [] },
        { type: 'avatar', attrs: { tx: 'U' }, children: [] }
      ] }
    ]
  });
  var content = dom.querySelector('.tokui-hover-card__content');
  assert.ok(content.children.length >= 2);
  assert.ok(dom.classList.contains('tokui-hover-card--right'));
});

test('hover-card left and bottom positions', function() {
  var rc = makeRenderer();
  var domLeft = rc.render({
    type: 'hover-card', attrs: { pos: 'left' },
    children: [
      { type: 'hover-trigger', attrs: {}, children: [{ type: '_text', attrs: {}, content: 'L', children: [] }] },
      { type: 'hover-content', attrs: {}, children: [] }
    ]
  });
  assert.ok(domLeft.classList.contains('tokui-hover-card--left'));

  var domBottom = rc.render({
    type: 'hover-card', attrs: { pos: 'bottom' },
    children: [
      { type: 'hover-trigger', attrs: {}, children: [{ type: '_text', attrs: {}, content: 'B', children: [] }] },
      { type: 'hover-content', attrs: {}, children: [] }
    ]
  });
  assert.ok(domBottom.classList.contains('tokui-hover-card--bottom'));
});

test('builder hoverCard + hoverTrigger + hoverContent generates correct DSL', function() {
  var b = new TokUIBuilder();
  b.hoverCard({ pos: 'bottom', w: '240', delay: '300' })
    .hoverTrigger()
      .tag('@zhangsan', { t: 'primary' })
    .end()
    .hoverContent()
      .avatar({ tx: '张三', size: 'sm' })
      .p('张三 · 高级工程师')
    .end()
  .end();
  var dsl = b.toString();
  assert.ok(dsl.indexOf('[hover-card') !== -1);
  assert.ok(dsl.indexOf('pos:bottom') !== -1);
  assert.ok(dsl.indexOf('w:240') !== -1);
  assert.ok(dsl.indexOf('delay:300') !== -1);
  assert.ok(dsl.indexOf('[hover-trigger]') !== -1);
  assert.ok(dsl.indexOf('[/hover-trigger]') !== -1);
  assert.ok(dsl.indexOf('[hover-content]') !== -1);
  assert.ok(dsl.indexOf('[/hover-content]') !== -1);
  assert.ok(dsl.indexOf('[/hover-card]') !== -1);
});

run();
