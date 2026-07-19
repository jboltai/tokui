/**
 * TokUI 表单动作绑定测试
 * 覆盖：form:ID 显式绑定、submit/reset/print 三类内置动作印章、resolveButtonAction / resolveTargetForm 纯函数。
 * 设计要点：按钮与表单/打印区的关系由 data-tokui-form / data-tokui-act / data-tokui-target 显式声明，
 *           不再依赖脆弱的 DOM 祖先推断。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer, resolveButtonAction, resolveTargetForm } = require('../src/core/renderer');
const { TokUIParser } = require('../src/core/parser');
const TokUIEventBus = require('../src/core/event-bus');
const { registerFormComponents } = require('../src/components/form');
const { registerBasicComponents } = require('../src/components/basic');
const { registerLayoutComponents } = require('../src/components/layout');

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
  registerFormComponents(rc);
  registerBasicComponents(rc);
  registerLayoutComponents(rc);
  return rc;
}

// 给 mock document 补 getElementById：在已渲染根树内按 id 递归查找
function installGetElementById(rootMap) {
  global.document.getElementById = function (id) {
    return rootMap[id] || null;
  };
}

// === resolveButtonAction 纯函数：动作决策 ===
test('resolveButtonAction: 无动作仅 clk', () => {
  const r = resolveButtonAction({ clk: 'onClick' });
  assert.strictEqual(r.act, null);
  assert.strictEqual(r.handler, 'onClick');
  assert.strictEqual(r.formId, null);
});

test('resolveButtonAction: sub → submit', () => {
  const r = resolveButtonAction({ sub: 'onLogin' });
  assert.strictEqual(r.act, 'submit');
  assert.strictEqual(r.handler, 'onLogin');
});

test('resolveButtonAction: reset 裸写 → reset 无 handler', () => {
  const r = resolveButtonAction({ reset: true });
  assert.strictEqual(r.act, 'reset');
  assert.strictEqual(r.handler, null);
});

test('resolveButtonAction: reset:H → reset 带 handler', () => {
  const r = resolveButtonAction({ reset: 'onReset' });
  assert.strictEqual(r.act, 'reset');
  assert.strictEqual(r.handler, 'onReset');
});

test('resolveButtonAction: print:T → print 带 target', () => {
  const r = resolveButtonAction({ print: 'pa1' });
  assert.strictEqual(r.act, 'print');
  assert.strictEqual(r.target, 'pa1');
  assert.strictEqual(r.trigger, true);
});

test('resolveButtonAction: print:self 打印最近祖先区', () => {
  const r = resolveButtonAction({ print: 'self' });
  assert.strictEqual(r.act, 'print');
  assert.strictEqual(r.target, 'self');
});

test('resolveButtonAction: form:ID 透传到任意动作', () => {
  assert.strictEqual(resolveButtonAction({ sub: 'h', form: 'f1' }).formId, 'f1');
  assert.strictEqual(resolveButtonAction({ reset: true, form: 'f1' }).formId, 'f1');
  assert.strictEqual(resolveButtonAction({ clk: 'h', form: 'f1' }).formId, 'f1');
});

test('resolveButtonAction: 动作优先级 print > reset > submit', () => {
  // 同时给出多个时，高优先级动作胜出（防御性：DSL 不应混写，但解析须确定）
  assert.strictEqual(resolveButtonAction({ print: 'pa', reset: true }).act, 'print');
  assert.strictEqual(resolveButtonAction({ reset: true, sub: 'h' }).act, 'reset');
});

test('resolveButtonAction: 未知 act 值不产生内置动作（降级 clk）', () => {
  const r = resolveButtonAction({ clk: 'safe' });
  assert.strictEqual(r.act, null);
});

// === btn 渲染印章 ===
test('btn form:ID 渲染 data-tokui-form', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'btn', attrs: { tx: '提交', form: 'login', sub: 'onLogin' }, children: [] });
  assert.strictEqual(dom.getAttribute('data-tokui-form'), 'login');
  assert.strictEqual(dom.getAttribute('data-tokui-act'), 'submit');
});

test('btn sub 渲染 submit 类型 + act 印章（向后兼容 data-tokui-sub）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'btn', attrs: { tx: '登录', sub: 'onLogin' }, children: [] });
  assert.strictEqual(dom.getAttribute('type'), 'submit');
  assert.strictEqual(dom.getAttribute('data-tokui-act'), 'submit');
  assert.strictEqual(dom.getAttribute('data-tokui-sub'), 'onLogin');
});

test('btn reset 裸写渲染 reset 类型 + act 印章', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'btn', attrs: { tx: '重置', reset: true, form: 'f' }, children: [] });
  assert.strictEqual(dom.getAttribute('type'), 'reset');
  assert.strictEqual(dom.getAttribute('data-tokui-act'), 'reset');
  assert.strictEqual(dom.getAttribute('data-tokui-handler'), null);
});

test('btn reset:H 渲染 handler 回调', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'btn', attrs: { tx: '重置', reset: 'onReset', form: 'f' }, children: [] });
  assert.strictEqual(dom.getAttribute('data-tokui-act'), 'reset');
  assert.strictEqual(dom.getAttribute('data-tokui-handler'), 'onReset');
});

test('btn print:T 渲染 print 印章 + 触发器标记（预览时隐藏用）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'btn', attrs: { tx: '打印', print: 'pa1' }, children: [] });
  assert.strictEqual(dom.getAttribute('type'), 'button');
  assert.strictEqual(dom.getAttribute('data-tokui-act'), 'print');
  assert.strictEqual(dom.getAttribute('data-tokui-target'), 'pa1');
  assert.strictEqual(dom.hasAttribute('data-tokui-print-trigger'), true);
});

test('btn 普通点击不挂 act 印章', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'btn', attrs: { tx: '点击', clk: 'onClick' }, children: [] });
  assert.strictEqual(dom.getAttribute('data-tokui-act'), null);
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'onClick');
});

// === resolveTargetForm：表单解析（显式 ID > 祖先兜底）===
test('resolveTargetForm: form:ID 命中指定表单（非祖先）', () => {
  const rc = makeRenderer();
  const formA = rc.render({ type: 'form', attrs: { id: 'fa', sub: 'a' }, children: [] });
  const formB = rc.render({ type: 'form', attrs: { id: 'fb', sub: 'b' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: 'x', form: 'fb', sub: 'b' }, children: [] });
  installGetElementById({ fa: formA, fb: formB });
  assert.strictEqual(resolveTargetForm(btn, 'fb'), formB);
});

test('resolveTargetForm: 无 ID 时兜底最近祖先 form', () => {
  const rc = makeRenderer();
  const form = rc.render({ type: 'form', attrs: { id: 'f', sub: 'h' }, children: [] });
  const btn = rc.render({ type: 'btn', attrs: { tx: 'x', sub: 'h' }, children: [] });
  form.appendChild(btn);
  installGetElementById({ f: form });
  assert.strictEqual(resolveTargetForm(btn, null), form);
});

test('resolveTargetForm: ID 指向非 form 元素时降级祖先（防伪造）', () => {
  const rc = makeRenderer();
  const form = rc.render({ type: 'form', attrs: { id: 'real', sub: 'h' }, children: [] });
  const fakeDiv = rc.render({ type: 'div', attrs: {}, children: [] }); // 非 form
  const btn = rc.render({ type: 'btn', attrs: { tx: 'x', sub: 'h' }, children: [] });
  form.appendChild(btn);
  installGetElementById({ spoofed: fakeDiv, real: form });
  // form:spoofed 指向 div，不得返回它；降级到祖先 form
  assert.strictEqual(resolveTargetForm(btn, 'spoofed'), form);
});

test('resolveTargetForm: 无表单可绑返回 null（不抛错）', () => {
  const rc = makeRenderer();
  const btn = rc.render({ type: 'btn', attrs: { tx: 'x', clk: 'h' }, children: [] });
  installGetElementById({});
  assert.strictEqual(resolveTargetForm(btn, null), null);
});

// === print-area 容器渲染 ===
test('print-area 渲染为容器并带 body 插槽', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'print-area', attrs: { id: 'pa1', tt: '订单详情' }, children: [
    { type: 'p', attrs: {}, children: [], content: '内容' }
  ]});
  assert.ok(dom.classList.contains('tokui-print-area'));
  assert.strictEqual(dom.getAttribute('id'), 'pa1');
  assert.strictEqual(dom._tokuiType, 'print-area');
  // 标题
  const header = dom.querySelector('.tokui-print-area__title');
  assert.notStrictEqual(header, null);
  assert.strictEqual(header.textContent, '订单详情');
  // 子内容挂进 body
  const body = dom.querySelector('.tokui-print-area__body');
  assert.notStrictEqual(body, null);
});

test('print-area 无 tt 时不渲染标题', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'print-area', attrs: { id: 'pa2' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-print-area__title'), null);
});

// === checkbox 多选取值：数组聚合 + btn 在 form 内/外两种绑定方式 ===
// 场景：[checkbox multi] + 多个 [opt]，部分 chk；提交应按 name 收集为数组。
function makeRendererWithBus() {
  const rc = new TokUIRenderer(TokUIEventBus);
  registerFormComponents(rc);
  registerBasicComponents(rc);
  registerLayoutComponents(rc);
  return rc;
}
const CB_MULTI = '[checkbox n:hobby l:爱好 multi][opt v:read tx:阅读 chk][opt v:music tx:音乐][opt v:sport tx:运动 chk][opt v:travel tx:旅行][/checkbox]';

test('_collectFormData: checkbox 多选按 name 聚合为数组', () => {
  const rc = makeRendererWithBus();
  const p = new TokUIParser(); const n = []; p.onNode = x => n.push(x);
  p.parse('[form id:f]' + CB_MULTI + '[/form]');
  const form = rc.render(n[0]);
  assert.deepStrictEqual(rc._collectFormData(form), { hobby: ['read', 'sport'] });
});

test('clk btn 在 form 内 → 收集 checkbox 数组', () => {
  const rc = makeRendererWithBus();
  let captured = null;
  TokUIEventBus.registerHandler('getVal', d => { captured = d; });
  const p = new TokUIParser(); const n = []; p.onNode = x => n.push(x);
  p.parse('[card][form id:f sub:getVal]' + CB_MULTI + '[btn tx:获取所选 clk:getVal v:primary][/form][/card]');
  const dom = rc.render(n[0]);
  global.document.getElementById = () => null;
  rc.bindEvents(dom);
  const btn = dom.querySelector('button');
  btn._events.click[btn._events.click.length - 1]({ preventDefault() {} });
  assert.deepStrictEqual(captured, { hobby: ['read', 'sport'] });
  TokUIEventBus.clearAll();
});

test('clk btn 在 form 外 + form:ID → 收集 checkbox 数组（clk 路径回退 data-tokui-form）', () => {
  const rc = makeRendererWithBus();
  let captured = null;
  TokUIEventBus.registerHandler('getVal', d => { captured = d; });
  const p = new TokUIParser(); const n = []; p.onNode = x => n.push(x);
  p.parse('[card][form id:f sub:getVal]' + CB_MULTI + '[/form][btn tx:获取所选 form:f clk:getVal v:primary][/card]');
  const dom = rc.render(n[0]);
  const form = dom.querySelector('form');
  global.document.getElementById = id => (id === 'f' ? form : null);
  rc.bindEvents(dom);
  const btn = dom.querySelector('button');
  btn._events.click[btn._events.click.length - 1]({ preventDefault() {} });
  assert.deepStrictEqual(captured, { hobby: ['read', 'sport'] });
  TokUIEventBus.clearAll();
});

test('sub btn 在 form 外 + form:ID → 收集 checkbox 数组（submit 动作路径）', () => {
  const rc = makeRendererWithBus();
  let captured = null;
  TokUIEventBus.registerHandler('getVal', d => { captured = d; });
  const p = new TokUIParser(); const n = []; p.onNode = x => n.push(x);
  p.parse('[card][form id:f sub:getVal]' + CB_MULTI + '[/form][btn tx:获取所选 form:f sub:getVal v:primary][/card]');
  const dom = rc.render(n[0]);
  const form = dom.querySelector('form');
  global.document.getElementById = id => (id === 'f' ? form : null);
  rc.bindEvents(dom);
  const btn = dom.querySelector('button');
  btn._events.click[btn._events.click.length - 1]({ preventDefault() {} });
  assert.deepStrictEqual(captured, { hobby: ['read', 'sport'] });
  TokUIEventBus.clearAll();
});

// === t:'submit' 语义化：提交按钮走 _doSubmit 校验闸门 ===

test('resolveButtonAction: t:submit + clk → submit 语义，clk 作 handler', () => {
  const r = resolveButtonAction({ t: 'submit', clk: 'h' });
  assert.strictEqual(r.act, 'submit');
  assert.strictEqual(r.handler, 'h');
  const bare = resolveButtonAction({ t: 'submit' });
  assert.strictEqual(bare.act, 'submit');
  assert.strictEqual(bare.handler, null);
});

test('btn t:submit 渲染 type=submit + act 印章，不挂 data-tokui-clk', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'btn', attrs: { tx: '提交', t: 'submit', clk: 'h' }, children: [] });
  assert.strictEqual(dom.getAttribute('type'), 'submit');
  assert.strictEqual(dom.getAttribute('data-tokui-act'), 'submit');
  assert.strictEqual(dom.getAttribute('data-tokui-sub'), 'h');
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), null);
});

test('t:submit 按钮在 form 内 → reportValidity 闸门 + 收集提交', () => {
  const rc = makeRendererWithBus();
  let calls = 0, captured = null;
  TokUIEventBus.registerHandler('getVal', d => { calls++; captured = d; });
  const p = new TokUIParser(); const n = []; p.onNode = x => n.push(x);
  p.parse('[form id:f]' + CB_MULTI + '[btn tx:提交 t:submit clk:getVal v:primary][/form]');
  const form = rc.render(n[0]);
  rc.bindEvents(form);
  const btn = form.querySelector('button');
  const fire = () => btn._events.click[btn._events.click.length - 1]({ preventDefault() {} });
  form.reportValidity = () => false;
  fire();
  assert.strictEqual(calls, 0, '校验失败不应提交');
  form.reportValidity = () => true;
  fire();
  assert.strictEqual(calls, 1, '校验通过应提交');
  assert.deepStrictEqual(captured, { hobby: ['read', 'sport'] });
  TokUIEventBus.clearAll();
});

test('t:submit 按钮无 clk → 回退表单自身 sub handler', () => {
  const rc = makeRendererWithBus();
  let captured = null;
  TokUIEventBus.registerHandler('getVal', d => { captured = d; });
  const p = new TokUIParser(); const n = []; p.onNode = x => n.push(x);
  p.parse('[form id:f sub:getVal][input id:nm n:nm val:abc][btn tx:提交 t:submit][/form]');
  const form = rc.render(n[0]);
  rc.bindEvents(form);
  const btn = form.querySelector('button');
  btn._events.click[btn._events.click.length - 1]({ preventDefault() {} });
  assert.deepStrictEqual(captured, { nm: 'abc' }, '应回退到 form 的 sub handler 并收集数据');
  TokUIEventBus.clearAll();
});

test('t:submit 按钮在 form 外 → 退化为普通点击（handler 收 null data）', () => {
  const rc = makeRendererWithBus();
  let called = 0, captured = 'unset';
  TokUIEventBus.registerHandler('getVal', d => { called++; captured = d; });
  const btn = rc.render({ type: 'btn', attrs: { tx: 'x', t: 'submit', clk: 'getVal' }, children: [] });
  installGetElementById({});
  rc.bindEvents(btn);
  btn._events.click[btn._events.click.length - 1]({ preventDefault() {} });
  assert.strictEqual(called, 1);
  assert.strictEqual(captured, null, 'form 外无数据可收集');
  TokUIEventBus.clearAll();
});

run();
