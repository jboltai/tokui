/**
 * DSL 校验规则测试套件（Phase 2）
 * 覆盖：evaluateRules 规则引擎、提交闸门（_checkFormValidity 拦截 + 错误态绘制）、
 * msg 自定义文案、live blur 实时校验、select 原生 required、多组件挂载。
 */
'use strict';

const assert = require('assert');
const { setupDOM, createElement } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer, evaluateRules } = require('../src/core/renderer');
const eventBus = require('../src/core/event-bus');
const { registerAllComponents } = require('../src/components/index');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function run() {
  let passed = 0, failed = 0;
  tests.forEach(t => {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + e.message); }
  });
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}

function makeRenderer() {
  const rc = new TokUIRenderer(eventBus);
  registerAllComponents(rc);
  return rc;
}

function fire(el, type, evt) {
  (el._events && el._events[type] || []).forEach(fn => fn(evt || { preventDefault() {} }));
}

function cleanupHandlers() {
  eventBus.getHandlerNames().forEach(n => eventBus.removeHandler(n));
}

// =============================================
// evaluateRules 规则引擎
// =============================================

test('required：空值失败、非空通过', () => {
  assert.deepStrictEqual(evaluateRules('', 'required'), { name: 'required' });
  assert.deepStrictEqual(evaluateRules('  ', 'required'), { name: 'required' });
  assert.strictEqual(evaluateRules('a', 'required'), null);
});

test('email/url/number 格式校验', () => {
  assert.deepStrictEqual(evaluateRules('bad', 'email'), { name: 'email' });
  assert.strictEqual(evaluateRules('a@b.co', 'email'), null);
  assert.deepStrictEqual(evaluateRules('ftp://x', 'url'), { name: 'url' });
  assert.strictEqual(evaluateRules('https://a.b', 'url'), null);
  assert.deepStrictEqual(evaluateRules('abc', 'number'), { name: 'number' });
  assert.strictEqual(evaluateRules('3.14', 'number'), null);
});

test('len/min/max 长度校验（带参数）', () => {
  assert.deepStrictEqual(evaluateRules('abc', 'len:4'), { name: 'len', n: 4 });
  assert.strictEqual(evaluateRules('abcd', 'len:4'), null);
  assert.deepStrictEqual(evaluateRules('a', 'min:2'), { name: 'min', n: 2 });
  assert.deepStrictEqual(evaluateRules('abcde', 'max:3'), { name: 'max', n: 3 });
});

test('re 正则校验 + 非法正则跳过', () => {
  assert.strictEqual(evaluateRules('123', 're:^\\d+$'), null);
  assert.deepStrictEqual(evaluateRules('ab', 're:^\\d+$'), { name: 're' });
  assert.strictEqual(evaluateRules('x', 're:(['), null, '非法正则跳过');
});

test('空值跳过非 required 规则（HTML5 同语义）', () => {
  assert.strictEqual(evaluateRules('', 'email'), null);
  assert.strictEqual(evaluateRules('', 'min:5'), null);
  assert.deepStrictEqual(evaluateRules('', 'required|email'), { name: 'required' });
});

test('管道多规则按序短路', () => {
  assert.deepStrictEqual(evaluateRules('bad', 'required|email'), { name: 'email' });
  assert.strictEqual(evaluateRules('a@b.co', 'required|email'), null);
});

test('未知规则名跳过不炸', () => {
  const origWarn = console.warn;
  console.warn = function () {};
  try {
    assert.strictEqual(evaluateRules('x', 'fly'), null);
  } finally {
    console.warn = origWarn;
  }
});

// =============================================
// 提交闸门：拦截 + 错误态绘制
// =============================================

function buildLoginForm(rc, rule, msg) {
  const container = createElement('div');
  const attrs = { n: 'email', l: '邮箱', id: 'em', rule: rule };
  if (msg) attrs.msg = msg;
  rc.mount({
    type: 'form', attrs: { id: 'f1', sub: 'onSub' },
    children: [
      { type: 'input', attrs: attrs, children: [] },
      { type: 'btn', attrs: { tx: '提交', t: 'submit' }, children: [] }
    ]
  }, container);
  return container;
}

test('提交闸门：rule 校验失败拦截提交并绘制错误态', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let submitted = 0;
  eventBus.registerHandler('onSub', () => { submitted++; });
  const container = buildLoginForm(rc, 'required|email');
  const form = container.querySelector('form');
  const inputEl = container.querySelector('input[type="text"], input:not([type])') || container.querySelector('input');
  // 空值提交 → 拦截
  rc.bindEvents(container);
  fire(form, 'submit');
  assert.strictEqual(submitted, 0, '空值应被拦截');
  assert.ok(inputEl.className.indexOf('tokui-input--error') !== -1, '错误变体类');
  const hint = container.querySelector('.tokui-field__hint');
  assert.ok(hint && hint.textContent.indexOf('必填') !== -1, '默认 i18n 错误文案');
  // 非法邮箱 → 仍拦截
  inputEl.value = 'bad';
  fire(form, 'submit');
  assert.strictEqual(submitted, 0);
  assert.ok(hint.textContent.indexOf('邮箱') !== -1);
  // 合法 → 放行
  inputEl.value = 'a@b.co';
  fire(form, 'submit');
  assert.strictEqual(submitted, 1);
  assert.ok(inputEl.className.indexOf('tokui-input--error') === -1, '通过后错误态清除');
});

test('msg 自定义文案覆盖默认', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  eventBus.registerHandler('onSub', () => {});
  const container = buildLoginForm(rc, 'required', '邮箱不能不填');
  const form = container.querySelector('form');
  rc.bindEvents(container);
  fire(form, 'submit');
  const hint = container.querySelector('.tokui-field__hint');
  assert.strictEqual(hint.textContent, '邮箱不能不填');
});

test('校验失败聚焦首个错误字段', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  eventBus.registerHandler('onSub', () => {});
  const container = buildLoginForm(rc, 'required');
  const form = container.querySelector('form');
  const inputEl = container.querySelector('input');
  let focused = 0;
  inputEl.focus = function () { focused++; };
  rc.bindEvents(container);
  fire(form, 'submit');
  assert.strictEqual(focused, 1);
});

// =============================================
// live blur 实时校验
// =============================================

test('rule + live：blur 校验，error 态输入即时重检', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const container = createElement('div');
  rc.mount({
    type: 'input', attrs: { n: 'em', rule: 'required|email', live: true, hint: '邮箱' }, children: []
  }, container);
  const inputEl = container.querySelector('input');
  const hint = container.querySelector('.tokui-field__hint');
  inputEl.value = 'bad';
  fire(inputEl, 'blur');
  assert.ok(inputEl.className.indexOf('tokui-input--error') !== -1, 'blur 后错误态');
  inputEl.value = 'a@b.co';
  fire(inputEl, 'input'); // error 态下输入即时重检
  assert.ok(inputEl.className.indexOf('tokui-input--error') === -1, '改对即清除');
  assert.strictEqual(hint.textContent, '邮箱', '恢复中性 hint');
});

// =============================================
// select / textarea 挂载
// =============================================

test('select req 写原生 required 属性（单选）', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const dom = rc.render({
    type: 'select', attrs: { n: 's', req: true },
    children: [{ type: 'opt', attrs: { v: 'a' }, content: 'A', children: [] }]
  });
  const select = dom.querySelector('select');
  assert.strictEqual(select.getAttribute('required'), 'required');
});

test('select rule:required 空选拦截、选择后放行', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let submitted = 0;
  eventBus.registerHandler('onSub2', () => { submitted++; });
  const container = createElement('div');
  rc.mount({
    type: 'form', attrs: { sub: 'onSub2' },
    children: [
      {
        type: 'select', attrs: { n: 'city', ph: '请选择', rule: 'required' },
        children: [{ type: 'opt', attrs: { v: 'sh' }, content: '上海', children: [] }]
      },
      { type: 'btn', attrs: { tx: '提交', t: 'submit' }, children: [] }
    ]
  }, container);
  const form = container.querySelector('form');
  const select = container.querySelector('select');
  rc.bindEvents(container);
  fire(form, 'submit');
  assert.strictEqual(submitted, 0, '空选应拦截');
  assert.ok(select.className.indexOf('tokui-select--error') !== -1);
  select.value = 'sh';
  fire(form, 'submit');
  assert.strictEqual(submitted, 1);
});

test('textarea rule 挂载并拦截', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let submitted = 0;
  eventBus.registerHandler('onSub3', () => { submitted++; });
  const container = createElement('div');
  rc.mount({
    type: 'form', attrs: { sub: 'onSub3' },
    children: [
      { type: 'textarea', attrs: { n: 'bio', rule: 'required|min:5' }, children: [] },
      { type: 'btn', attrs: { tx: '提交', t: 'submit' }, children: [] }
    ]
  }, container);
  const form = container.querySelector('form');
  const ta = container.querySelector('textarea');
  rc.bindEvents(container);
  fire(form, 'submit');
  assert.strictEqual(submitted, 0);
  ta.value = 'abc';
  fire(form, 'submit');
  assert.strictEqual(submitted, 0, 'min:5 不满足');
  ta.value = 'abcdef';
  fire(form, 'submit');
  assert.strictEqual(submitted, 1);
});

cleanupHandlers();
run();
