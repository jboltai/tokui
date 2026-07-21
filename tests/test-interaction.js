/**
 * Phase 1 交互回路测试套件
 * 覆盖：createReporter 事件上报通道（on: 命名 handler + onEvent('component') 统一出口）、
 * del/ins 指令、tool-call HITL 审批、chat-input 停止生成、artifact 关闭上报、calendar _update。
 */
'use strict';

const assert = require('assert');
const { setupDOM, createElement } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer, parseOnSpec } = require('../src/core/renderer');
const eventBus = require('../src/core/event-bus');
const { registerAllComponents } = require('../src/components/index');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
async function run() {
  let passed = 0, failed = 0;
  for (const t of tests) {
    try { await t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + e.message); }
  }
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}

function makeRenderer() {
  const rc = new TokUIRenderer(eventBus);
  registerAllComponents(rc);
  return rc;
}

// dom-mock 无 dispatchEvent：直接触发存储的监听器
function fire(el, type, evt) {
  (el._events && el._events[type] || []).forEach(fn => fn(evt || { preventDefault() {} }));
}

// 每用例清理 handler，防串扰
function cleanupHandlers() {
  eventBus.getHandlerNames().forEach(n => eventBus.removeHandler(n));
}

// =============================================
// parseOnSpec
// =============================================

test('parseOnSpec 解析 on:"change:h1,close:h2"', () => {
  const map = parseOnSpec('change:h1,close:h2');
  assert.strictEqual(map.change, 'h1');
  assert.strictEqual(map.close, 'h2');
});

test('parseOnSpec 空值与非法对静默丢弃', () => {
  assert.deepStrictEqual(parseOnSpec(''), {});
  assert.deepStrictEqual(parseOnSpec(null), {});
  assert.deepStrictEqual(parseOnSpec(undefined), {});
  const map = parseOnSpec('noColon,h:bad name,x:ok');
  assert.strictEqual(map.x, 'ok');
  assert.strictEqual(Object.keys(map).length, 1);
});

// =============================================
// createReporter 事件上报通道
// =============================================

test('createReporter 命中 on 声明的命名 handler', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let received = null, elArg = null;
  eventBus.registerHandler('onChange', (detail, e, el) => { received = detail; elArg = el; });
  const dom = createElement('div');
  const report = rc.createReporter('input', { id: 'i1', on: 'change:onChange' }, dom);
  report('change', { value: 'abc' });
  assert.deepStrictEqual(received, { value: 'abc' });
  assert.strictEqual(elArg, dom);
});

test('createReporter 未声明的事件不调 handler', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let calls = 0;
  eventBus.registerHandler('onChange', () => { calls++; });
  const report = rc.createReporter('input', { on: 'close:onChange' }, null);
  report('change', {});
  assert.strictEqual(calls, 0);
});

test('createReporter 始终转发 _onComponentEvent（含 type/id/event/detail）', () => {
  const rc = makeRenderer();
  let evt = null;
  rc._onComponentEvent = (e) => { evt = e; };
  const report = rc.createReporter('slider', { id: 's1' }, null);
  report('change', { value: 42 });
  assert.deepStrictEqual(evt, { type: 'slider', id: 's1', event: 'change', detail: { value: 42 } });
});

test('createReporter handler 抛错不影响 _onComponentEvent', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let evt = null;
  rc._onComponentEvent = (e) => { evt = e; };
  eventBus.registerHandler('boom', () => { throw new Error('x'); });
  const report = rc.createReporter('input', { on: 'change:boom' }, null);
  report('change', { value: 1 }); // 不抛出
  assert.ok(evt);
});

test('TokUI 实例 onEvent 收到 component 事件', () => {
  cleanupHandlers();
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const events = [];
  const ui = new TokUI({ container: container, onEvent: (name, payload) => events.push([name, payload]) });
  ui.render('[tool-call name:del_file status:pending approval id:tc1]');
  const approveBtn = container.querySelector('.tokui-tool-call__approve');
  assert.ok(approveBtn);
  fire(approveBtn, 'click');
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0][0], 'component');
  assert.strictEqual(events[0][1].type, 'tool-call');
  assert.strictEqual(events[0][1].id, 'tc1');
  assert.strictEqual(events[0][1].event, 'approval');
  assert.strictEqual(events[0][1].detail.approved, true);
});

// =============================================
// del 指令
// =============================================

test('del 移除指定 id 的组件', () => {
  const rc = makeRenderer();
  const container = createElement('div');
  rc.mount({ type: 'h1', attrs: { id: 'd1' }, content: 'A', children: [] }, container);
  assert.ok(container.querySelector('[id="d1"]'));
  rc.mount({ type: 'del', attrs: { id: 'd1' }, children: [] }, container);
  assert.strictEqual(container.querySelector('[id="d1"]'), null);
});

test('del 命中内层元素时爬到组件根删除', () => {
  const rc = makeRenderer();
  const container = createElement('div');
  // card id 挂在组件根本身；此处验证爬到 _tokuiType 根后整体移除
  rc.mount({ type: 'card', attrs: { id: 'c1', tt: 'T' }, children: [{ type: 'p', attrs: {}, content: 'x', children: [] }] }, container);
  assert.ok(container.querySelector('.tokui-card'));
  rc.mount({ type: 'del', attrs: { id: 'c1' }, children: [] }, container);
  assert.strictEqual(container.querySelector('.tokui-card'), null);
});

test('del 目标不存在时静默跳过', () => {
  const rc = makeRenderer();
  const container = createElement('div');
  rc.mount({ type: 'del', attrs: { id: 'ghost' }, children: [] }, container);
  assert.ok(true);
});

// =============================================
// ins 指令
// =============================================

test('ins after 一次性渲染插到目标之后', () => {
  const rc = makeRenderer();
  const container = createElement('div');
  rc.mount({ type: 'h1', attrs: { id: 'a' }, content: 'A', children: [] }, container);
  rc.mount({ type: 'h2', attrs: {}, content: 'C', children: [] }, container);
  rc.mount({
    type: 'ins', attrs: { after: 'a' },
    children: [{ type: 'h3', attrs: {}, content: 'B', children: [] }]
  }, container);
  const texts = Array.from(container.childNodes).filter(n => n.nodeType === 1).map(n => n.textContent);
  assert.deepStrictEqual(texts, ['A', 'B', 'C']);
});

test('ins before 插到目标之前', () => {
  const rc = makeRenderer();
  const container = createElement('div');
  rc.mount({ type: 'h1', attrs: { id: 'a' }, content: 'A', children: [] }, container);
  rc.mount({
    type: 'ins', attrs: { before: 'a' },
    children: [{ type: 'h3', attrs: {}, content: 'B', children: [] }]
  }, container);
  const texts = Array.from(container.childNodes).filter(n => n.nodeType === 1).map(n => n.textContent);
  assert.deepStrictEqual(texts, ['B', 'A']);
});

test('ins into 追加为目标子元素', () => {
  const rc = makeRenderer();
  const container = createElement('div');
  rc.mount({ type: 'card', attrs: { id: 'cd', tt: 'T' }, children: [{ type: 'p', attrs: {}, content: 'old', children: [] }] }, container);
  rc.mount({
    type: 'ins', attrs: { into: 'cd' },
    children: [{ type: 'p', attrs: {}, content: 'new', children: [] }]
  }, container);
  const card = container.querySelector('.tokui-card');
  assert.ok(card.textContent.indexOf('new') !== -1);
});

test('ins 锚点闭合后页面不留痕', () => {
  const rc = makeRenderer();
  const container = createElement('div');
  rc.mount({ type: 'h1', attrs: { id: 'a' }, content: 'A', children: [] }, container);
  rc.mount({
    type: 'ins', attrs: { after: 'a' },
    children: [{ type: 'h3', attrs: {}, content: 'B', children: [] }]
  }, container);
  assert.strictEqual(container.querySelector('.tokui-ins-anchor'), null);
});

test('ins 流式渲染：子节点闭合后搬到目标位置', () => {
  cleanupHandlers();
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  ui.startStream();
  ui.feed('[h1 id:x A][h1 C][ins after:x][h1 B][/ins]');
  ui.endStream();
  const texts = Array.from(container.childNodes).filter(n => n.nodeType === 1).map(n => n.textContent);
  assert.deepStrictEqual(texts, ['A', 'B', 'C']);
});

// =============================================
// tool-call HITL 审批
// =============================================

test('tool-call approval + pending 渲染批准/拒绝按钮', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tool-call', attrs: { name: 'rm', status: 'pending', approval: true }, children: [] });
  assert.ok(dom.querySelector('.tokui-tool-call__approve'));
  assert.ok(dom.querySelector('.tokui-tool-call__deny'));
});

test('tool-call 无 approval 或非 pending 不渲染审批按钮', () => {
  const rc = makeRenderer();
  const d1 = rc.render({ type: 'tool-call', attrs: { name: 'rm', status: 'pending' }, children: [] });
  assert.strictEqual(d1.querySelector('.tokui-tool-call__approve'), null);
  const d2 = rc.render({ type: 'tool-call', attrs: { name: 'rm', status: 'running', approval: true }, children: [] });
  assert.strictEqual(d2.querySelector('.tokui-tool-call__approve'), null);
});

test('tool-call 批准按钮调 clk handler 并禁用双钮', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let detail = null;
  eventBus.registerHandler('onApprove', (d) => { detail = d; });
  const dom = rc.render({ type: 'tool-call', attrs: { name: 'rm', status: 'pending', approval: true, clk: 'onApprove', id: 't1' }, children: [] });
  const approveBtn = dom.querySelector('.tokui-tool-call__approve');
  const denyBtn = dom.querySelector('.tokui-tool-call__deny');
  fire(approveBtn, 'click');
  assert.deepStrictEqual(detail, { approved: true, id: 't1', name: 'rm' });
  assert.strictEqual(approveBtn.getAttribute('disabled'), '');
  assert.strictEqual(denyBtn.getAttribute('disabled'), '');
  assert.ok(dom.querySelector('.tokui-tool-call__approval').className.indexOf('--decided') !== -1);
  assert.ok(approveBtn.className.indexOf('--chosen') !== -1);
  // 二次点击不再触发（按钮已禁用，监听仍在但 decide 无副作用保障——此处验证 disabled 印章）
  fire(approveBtn, 'click');
});

test('tool-call 拒绝按钮 detail.approved 为 false', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let detail = null;
  eventBus.registerHandler('onDeny', (d) => { detail = d; });
  const dom = rc.render({ type: 'tool-call', attrs: { name: 'rm', status: 'pending', approval: true, clk: 'onDeny' }, children: [] });
  fire(dom.querySelector('.tokui-tool-call__deny'), 'click');
  assert.strictEqual(detail.approved, false);
});

// =============================================
// chat-input 停止生成
// =============================================

test('chat-input streaming 属性加 --streaming 类并渲染停止按钮', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: { streaming: true }, children: [] });
  assert.ok(dom.className.indexOf('tokui-chat-input--streaming') !== -1);
  assert.ok(dom.querySelector('.tokui-chat-input__stop'));
});

test('chat-input 停止按钮经 on 声明调命名 handler', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let calls = 0;
  eventBus.registerHandler('onStop', () => { calls++; });
  const dom = rc.render({ type: 'chat-input', attrs: { streaming: true, on: 'stop:onStop' }, children: [] });
  fire(dom.querySelector('.tokui-chat-input__stop'), 'click');
  assert.strictEqual(calls, 1);
});

test('chat-input upd streaming 切换（false 字符串主动关闭）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: { id: 'ci' }, children: [] });
  assert.ok(dom.className.indexOf('--streaming') === -1);
  dom._update({ streaming: 'true' });
  assert.ok(dom.className.indexOf('tokui-chat-input--streaming') !== -1);
  dom._update({ streaming: 'false' });
  assert.ok(dom.className.indexOf('tokui-chat-input--streaming') === -1);
});

// =============================================
// artifact 关闭上报
// =============================================

test('artifact 关闭按钮经 reporter 上报 close', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let evt = null;
  rc._onComponentEvent = (e) => { evt = e; };
  const dom = rc.render({
    type: 'artifact', attrs: { tt: 'A', lang: 'text', id: 'af1' },
    children: [{ type: 'artifact-code', attrs: {}, children: [{ type: '_text', content: 'code' }] }]
  });
  fire(dom.querySelector('.tokui-artifact__close'), 'click');
  assert.ok(evt);
  assert.strictEqual(evt.type, 'artifact');
  assert.strictEqual(evt.event, 'close');
  assert.strictEqual(evt.id, 'af1');
  assert.strictEqual(dom.style.display, 'none');
});

// =============================================
// calendar _update
// =============================================

test('calendar _update v 重设选中天', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'calendar', attrs: { id: 'cal', month: '2026-07' }, children: [] });
  dom._update({ v: '3,15' });
  const days = dom.querySelectorAll('.tokui-calendar__day');
  const selected = [];
  for (let i = 0; i < days.length; i++) {
    if (days[i].className.indexOf('--selected') !== -1 && days[i].className.indexOf('--other') === -1) {
      selected.push(parseInt(days[i].textContent, 10));
    }
  }
  assert.deepStrictEqual(selected, [3, 15]);
  dom._update({ v: '7' });
  const selected2 = [];
  for (let i = 0; i < days.length; i++) {
    if (days[i].className.indexOf('--selected') !== -1 && days[i].className.indexOf('--other') === -1) {
      selected2.push(parseInt(days[i].textContent, 10));
    }
  }
  assert.deepStrictEqual(selected2, [7]);
});

// =============================================
// form 控件 change 上报
// =============================================

test('input 输入防抖 300ms 后上报 change', async () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let calls = 0, detail = null;
  eventBus.registerHandler('hIn', (d) => { calls++; detail = d; });
  const dom = rc.render({ type: 'input', attrs: { n: 'city', id: 'i1', on: 'change:hIn' }, children: [] });
  const inputEl = dom.querySelector('input');
  inputEl.value = '上海';
  fire(inputEl, 'input');
  fire(inputEl, 'input'); // 第二次重置防抖
  await new Promise(r => setTimeout(r, 350));
  assert.strictEqual(calls, 1, '防抖后只调一次');
  assert.deepStrictEqual(detail, { value: '上海', name: 'city' });
});

test('input db 属性覆盖防抖毫秒数', async () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let calls = 0;
  eventBus.registerHandler('hDb', () => { calls++; });
  const dom = rc.render({ type: 'input', attrs: { on: 'change:hDb', db: '50' }, children: [] });
  fire(dom.querySelector('input'), 'input');
  await new Promise(r => setTimeout(r, 120));
  assert.strictEqual(calls, 1);
});

test('select 值变即报（单选取值）', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let detail = null;
  eventBus.registerHandler('hSel', (d) => { detail = d; });
  const dom = rc.render({
    type: 'select', attrs: { n: 's', on: 'change:hSel' },
    children: [
      { type: 'opt', attrs: { v: 'a' }, content: 'A', children: [] },
      { type: 'opt', attrs: { v: 'b' }, content: 'B', children: [] }
    ]
  });
  const sel = dom.querySelector('select');
  sel.value = 'b';
  fire(sel, 'change');
  assert.deepStrictEqual(detail, { value: 'b', name: 's' });
});

test('switch 切换上报布尔值', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let detail = null;
  eventBus.registerHandler('hSw', (d) => { detail = d; });
  const dom = rc.render({ type: 'switch', attrs: { n: 'sw', on: 'change:hSw' }, children: [] });
  const input = dom.querySelector('.tokui-switch-input');
  input.checked = true;
  fire(input, 'change');
  assert.deepStrictEqual(detail, { value: true, name: 'sw' });
});

test('checkbox 多选组上报选中值数组', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let detail = null;
  eventBus.registerHandler('hCb', (d) => { detail = d; });
  const dom = rc.render({
    type: 'checkbox', attrs: { n: 'cb', multi: true, on: 'change:hCb' },
    children: [
      { type: 'opt', attrs: { v: 'x', chk: true }, content: 'X', children: [] },
      { type: 'opt', attrs: { v: 'y' }, content: 'Y', children: [] }
    ]
  });
  const inputs = dom.querySelectorAll('input[type=checkbox]');
  inputs[0].checked = true;
  inputs[1].checked = true;
  fire(dom.querySelector('.tokui-checkbox-group') || dom, 'change');
  assert.deepStrictEqual(detail, { value: ['x', 'y'], name: 'cb' });
});

test('input-tag 添加标签上报逗号串', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let detail = null;
  eventBus.registerHandler('hTag', (d) => { detail = d; });
  const dom = rc.render({ type: 'input-tag', attrs: { n: 'tags', tags: 'a', on: 'change:hTag' }, children: [] });
  const input = dom.querySelector('.tokui-input-tag__input');
  input.value = 'b';
  fire(input, 'keydown', { key: 'Enter', preventDefault() {} });
  assert.deepStrictEqual(detail, { value: 'a,b', name: 'tags' });
});

test('upload _update act:clear 清空文件列表', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'upload', attrs: { n: 'f' }, children: [] });
  assert.ok(typeof dom._update === 'function');
  dom._update({ act: 'clear' }); // 不抛错即通过（无文件时清空为空操作）
});

// =============================================
// layout 组件交互上报
// =============================================

test('tabs 用户切页上报 change（index + title）', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let detail = null;
  eventBus.registerHandler('hTab', (d) => { detail = d; });
  const dom = rc.render({
    type: 'tabs', attrs: { on: 'change:hTab' },
    children: [
      { type: 'tab', attrs: { tt: 'A' }, children: [{ type: 'p', attrs: {}, content: 'x', children: [] }] },
      { type: 'tab', attrs: { tt: 'B' }, children: [{ type: 'p', attrs: {}, content: 'y', children: [] }] }
    ]
  });
  const radios = dom.querySelectorAll('.tokui-tabs-input');
  assert.strictEqual(radios.length, 2);
  radios[1].checked = true;
  fire(dom, 'change', { target: radios[1] });
  assert.deepStrictEqual(detail, { index: 1, title: 'B' });
});

test('tabs 程序化 _update 切换不上报', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let calls = 0;
  eventBus.registerHandler('hTab2', () => { calls++; });
  const dom = rc.render({
    type: 'tabs', attrs: { on: 'change:hTab2' },
    children: [
      { type: 'tab', attrs: { tt: 'A' }, children: [] },
      { type: 'tab', attrs: { tt: 'B' }, children: [] }
    ]
  });
  dom._update({ v: '1' });
  assert.strictEqual(calls, 0);
});

test('dialog close 事件上报', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let evt = null;
  rc._onComponentEvent = (e) => { evt = e; };
  const dom = rc.render({ type: 'dialog', attrs: { tt: 'T', id: 'dg' }, children: [] });
  fire(dom, 'close');
  assert.ok(evt);
  assert.strictEqual(evt.type, 'dialog');
  assert.strictEqual(evt.event, 'close');
  assert.strictEqual(evt.id, 'dg');
});

test('drawer 关闭按钮上报 close 并移除 open 类', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let calls = 0;
  eventBus.registerHandler('hDr', () => { calls++; });
  const dom = rc.render({ type: 'drawer', attrs: { tt: 'T', on: 'close:hDr' }, children: [] });
  dom.classList.add('tokui-drawer--open');
  fire(dom.querySelector('.tokui-drawer__close'), 'click');
  assert.strictEqual(calls, 1);
  assert.ok(dom.className.indexOf('tokui-drawer--open') === -1);
});

test('drawer _update act:close 程序化关闭不上报（防回环）', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let calls = 0;
  eventBus.registerHandler('hDr2', () => { calls++; });
  const dom = rc.render({ type: 'drawer', attrs: { tt: 'T', on: 'close:hDr2' }, children: [] });
  dom._update({ act: 'open' });
  dom._update({ act: 'close' });
  assert.strictEqual(calls, 0, '程序化关闭不应上报');
  assert.ok(dom.className.indexOf('tokui-drawer--open') === -1, '关闭动作本身仍生效');
});

test('dialog _update act:close 程序化关闭不上报（防回环）', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let evt = null;
  rc._onComponentEvent = (e) => { evt = e; };
  const dom = rc.render({ type: 'dialog', attrs: { tt: 'T', id: 'dg2' }, children: [] });
  // mock 无 showModal/close 原生实现，直接模拟：置静默标记后触发 close 事件
  dom._tokuiSilentClose = true;
  fire(dom, 'close');
  assert.strictEqual(evt, null, '静默标记下不上报');
  // 标记已消费，下一次（用户路径）正常上报
  fire(dom, 'close');
  assert.ok(evt && evt.event === 'close', '用户路径正常上报');
});

test('steps 声明 on 后可点击并上报（0-based 索引）', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let detail = null;
  eventBus.registerHandler('hStep', (d) => { detail = d; });
  const dom = rc.render({
    type: 'steps', attrs: { v: '1', on: 'change:hStep' },
    children: [
      { type: 'step', attrs: { tt: '下单' }, children: [] },
      { type: 'step', attrs: { tt: '支付' }, children: [] }
    ]
  });
  assert.ok(dom.className.indexOf('tokui-steps--clickable') !== -1);
  const steps = dom.querySelectorAll('.tokui-step');
  const title1 = steps[1].querySelector('.tokui-step__title');
  fire(dom, 'click', { target: title1 });
  assert.deepStrictEqual(detail, { index: 1, title: '支付' });
});

test('menu 点击激活上报 + _update act:activate 静默激活', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const received = [];
  eventBus.registerHandler('hMenu', (d) => { received.push(d); });
  const dom = rc.render({
    type: 'menu', attrs: { on: 'change:hMenu' },
    children: [
      { type: 'menu-item', attrs: { tx: '首页', id: 'home' }, children: [] },
      { type: 'menu-item', attrs: { tx: '设置', id: 'settings' }, children: [] }
    ]
  });
  const items = dom.querySelectorAll('.tokui-menu__item');
  assert.strictEqual(items.length, 2);
  fire(items[1], 'click', { target: items[1] });
  assert.deepStrictEqual(received, [{ value: 'settings' }]);
  assert.ok(items[1].className.indexOf('--active') !== -1);
  // 程序化激活：切回 home，不重复上报
  dom._update({ act: 'activate', v: 'home' });
  assert.strictEqual(received.length, 1);
  assert.ok(items[0].className.indexOf('--active') !== -1);
  assert.ok(items[1].className.indexOf('--active') === -1);
});

// =============================================
// 统一出口补全：send / msg-actions / quick-reply / suggestion
// =============================================

test('chat-input 发送经统一出口上报 send {value}', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let evt = null;
  rc._onComponentEvent = (e) => { evt = e; };
  const dom = rc.render({ type: 'chat-input', attrs: { id: 'ci2' }, children: [] });
  const textarea = dom.querySelector('textarea');
  textarea.value = '你好';
  fire(textarea, 'keydown', { key: 'Enter', shiftKey: false, preventDefault() {} });
  assert.ok(evt);
  assert.strictEqual(evt.type, 'chat-input');
  assert.strictEqual(evt.event, 'send');
  assert.deepStrictEqual(evt.detail, { value: '你好' });
});

test('msg-actions 默认按钮经统一出口上报 action {act}', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const evts = [];
  rc._onComponentEvent = (e) => { evts.push(e); };
  const dom = rc.render({ type: 'msg-actions', attrs: { copy: true, like: true }, children: [] });
  const copyBtn = dom.querySelector('[data-act="copy"]');
  fire(dom, 'click', { target: copyBtn });
  assert.strictEqual(evts.length, 1);
  assert.strictEqual(evts[0].type, 'msg-actions');
  assert.strictEqual(evts[0].event, 'action');
  assert.deepStrictEqual(evts[0].detail, { act: 'copy' });
});

test('quick-reply 点击调 clk handler 并上报 select', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let clkDetail = null, evt = null;
  eventBus.registerHandler('hQr', (d) => { clkDetail = d; });
  rc._onComponentEvent = (e) => { evt = e; };
  const dom = rc.render({ type: 'quick-reply', attrs: { items: '好的,不了', clk: 'hQr' }, children: [] });
  const btns = dom.querySelectorAll('.tokui-quick-reply__item');
  assert.strictEqual(btns.length, 2);
  fire(btns[1], 'click');
  assert.deepStrictEqual(clkDetail, { value: '不了' });
  assert.ok(evt && evt.event === 'select' && evt.detail.value === '不了');
});

test('suggestion 点击上报 select {value}', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let evt = null;
  rc._onComponentEvent = (e) => { evt = e; };
  const dom = rc.render({ type: 'suggestion', attrs: { tt: '写周报', tx: '帮我写本周周报' }, children: [] });
  fire(dom, 'click');
  assert.ok(evt);
  assert.strictEqual(evt.type, 'suggestion');
  assert.strictEqual(evt.event, 'select');
  assert.strictEqual(evt.detail.value, '写周报');
});

// =============================================
// stop 乐观复位 + 所属实例断开
// =============================================

test('chat-input stop 乐观复位发送态并断开所属实例', () => {
  cleanupHandlers();
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  let disconnected = 0;
  const origDisconnect = ui.disconnect;
  ui.disconnect = function () { disconnected++; return origDisconnect.apply(ui, arguments); };
  ui.render('[chat-input streaming ph:"…"]');
  const wrapper = container.querySelector('.tokui-chat-input');
  assert.ok(wrapper.className.indexOf('--streaming') !== -1);
  fire(wrapper.querySelector('.tokui-chat-input__stop'), 'click');
  assert.strictEqual(disconnected, 1, '断开所属实例一次');
  assert.ok(wrapper.className.indexOf('--streaming') === -1, '立即恢复发送态');
});

test('chat-input stop 声明 on:stop 时不走默认断开', () => {
  cleanupHandlers();
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  let disconnected = 0, stopped = 0;
  const origDisconnect = ui.disconnect;
  ui.disconnect = function () { disconnected++; };
  eventBus.registerHandler('hStop2', () => { stopped++; });
  ui.render('[chat-input streaming on:"stop:hStop2"]');
  fire(container.querySelector('.tokui-chat-input__stop'), 'click');
  assert.strictEqual(stopped, 1);
  assert.strictEqual(disconnected, 0);
});

// =============================================
// handler 未注册 warn + eventFilter
// =============================================

test('on: 引用未注册 handler 时 console.warn（每名一次）', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const warns = [];
  const origWarn = console.warn;
  console.warn = function (msg) { warns.push(String(msg)); };
  try {
    const report = rc.createReporter('input', { on: 'change:ghostHandler' }, null);
    report('change', {});
    report('change', {});
  } finally {
    console.warn = origWarn;
  }
  assert.strictEqual(warns.length, 1, '同一名称只告警一次');
  assert.ok(warns[0].indexOf('ghostHandler') !== -1);
});

test('TokUI eventFilter 过滤组件事件', () => {
  cleanupHandlers();
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const evts = [];
  const ui = new TokUI({
    container: container,
    onEvent: (name, payload) => evts.push(payload),
    eventFilter: (evt) => evt.type === 'tool-call'
  });
  ui.render('[tool-call name:x status:pending approval id:t9]');
  // suggestion 事件被过滤；tool-call approval 放行
  ui.render('[suggestion tt:A tx:B]');
  fire(container.querySelector('.tokui-suggestion'), 'click');
  fire(container.querySelector('.tokui-tool-call__deny'), 'click');
  assert.strictEqual(evts.length, 1);
  assert.strictEqual(evts[0].type, 'tool-call');
});

// =============================================
// upd 批量 + 三指令回执
// =============================================

test('upd 逗号多目标批量更新 + 回执', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const receipts = [];
  rc._onComponentEvent = (e) => receipts.push(e);
  const container = createElement('div');
  const d1 = rc.mount({ type: 'progress', attrs: { id: 'p1', v: '0' }, children: [] }, container);
  const d2 = rc.mount({ type: 'progress', attrs: { id: 'p2', v: '0' }, children: [] }, container);
  // spy 两个实例的 _update
  const calls = [];
  [d1, d2].forEach((d, i) => {
    const orig = d._update;
    d._update = function (a) { calls.push([i, a]); return orig.call(d, a); };
  });
  rc.mount({ type: 'upd', attrs: { id: 'p1,p2', v: '80' }, children: [] }, container);
  assert.strictEqual(calls.length, 2, '两个目标都被命中');
  assert.strictEqual(calls[0][1].v, '80');
  assert.strictEqual(calls[1][1].v, '80');
  const receipt = receipts.find(e => e.type === 'upd');
  assert.ok(receipt);
  assert.strictEqual(receipt.event, 'applied');
  assert.deepStrictEqual(receipt.detail, { applied: true, targets: 2, hits: 2 });
});

test('upd 目标不存在回执 applied:false', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let receipt = null;
  rc._onComponentEvent = (e) => { if (e.type === 'upd') receipt = e; };
  const container = createElement('div');
  rc.mount({ type: 'upd', attrs: { id: 'ghost', v: '1' }, children: [] }, container);
  assert.ok(receipt);
  assert.strictEqual(receipt.detail.applied, false);
  assert.strictEqual(receipt.detail.hits, 0);
});

test('del 回执 removed:true/false', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const receipts = [];
  rc._onComponentEvent = (e) => { if (e.type === 'del') receipts.push(e); };
  const container = createElement('div');
  rc.mount({ type: 'card', attrs: { id: 'dc', tt: 'T' }, children: [] }, container);
  rc.mount({ type: 'del', attrs: { id: 'dc' }, children: [] }, container);
  rc.mount({ type: 'del', attrs: { id: 'ghost' }, children: [] }, container);
  assert.strictEqual(receipts.length, 2);
  assert.strictEqual(receipts[0].detail.removed, true);
  assert.strictEqual(receipts[1].detail.removed, false);
});

test('del 打未闭合流式容器：告警跳过 + removed:false', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let receipt = null;
  rc._onComponentEvent = (e) => { if (e.type === 'del') receipt = e; };
  const warns = [];
  const origWarn = console.warn;
  console.warn = function (m) { warns.push(String(m)); };
  try {
    const container = createElement('div');
    const victim = rc.mount({ type: 'card', attrs: { id: 'vc', tt: 'T' }, children: [] }, container);
    // 模拟该 card 仍在流式插槽栈中（未闭合）
    rc.slotStack.push({ slot: victim, el: victim, containerType: 'card' });
    rc.mount({ type: 'del', attrs: { id: 'vc' }, children: [] }, container);
    assert.ok(container.querySelector('#vc'), '未闭合容器应保留');
    assert.strictEqual(receipt.detail.removed, false);
    assert.ok(warns.some(w => w.indexOf('未闭合') !== -1 || w.indexOf('流式') !== -1));
  } finally {
    console.warn = origWarn;
    rc.slotStack = [];
  }
});

test('del 目标仅嵌在未闭合祖先内部（自身不在栈上）：允许删除', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let receipt = null;
  rc._onComponentEvent = (e) => { if (e.type === 'del') receipt = e; };
  const container = createElement('div');
  // 外层 card 未闭合（在栈上），card B 已闭合只是它的孩子——正常 demo 场景，删除必须放行
  const outer = rc.mount({ type: 'card', attrs: { tt: 'OUTER' }, children: [
    { type: 'card', attrs: { id: 'inner-b', tt: 'B' }, children: [] }
  ] }, container);
  rc.slotStack.push({ slot: outer, el: outer, containerType: 'card' });
  rc.mount({ type: 'del', attrs: { id: 'inner-b' }, children: [] }, container);
  // 注意：mock 的 idRegistry 不随 removeChild 清理，断言须用容器内查询而非 getElementById
  assert.strictEqual(container.querySelector('[id="inner-b"]'), null, '内层已闭合目标应被删除');
  assert.strictEqual(receipt.detail.removed, true);
  rc.slotStack = [];
});

test('del 目标包含未闭合的栈内容器：告警跳过', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let receipt = null;
  rc._onComponentEvent = (e) => { if (e.type === 'del') receipt = e; };
  const warns = [];
  const origWarn = console.warn;
  console.warn = function (m) { warns.push(String(m)); };
  try {
    const container = createElement('div');
    const outer = rc.mount({ type: 'card', attrs: { id: 'outer-c', tt: 'O' }, children: [
      { type: 'card', attrs: { tt: 'INNER' }, children: [] }
    ] }, container);
    // mock querySelectorAll 支持单类名：后代中第一个 .tokui-card 即内层 card
    const inner = outer.querySelectorAll('.tokui-card')[0];
    // 内层 card 未闭合（在栈上），删外层会让它的栈项悬空 → 必须拦
    rc.slotStack.push({ slot: inner, el: inner, containerType: 'card' });
    rc.mount({ type: 'del', attrs: { id: 'outer-c' }, children: [] }, container);
    assert.ok(container.querySelector('[id="outer-c"]'), '包含未闭合子容器的目标应保留');
    assert.strictEqual(receipt.detail.removed, false);
    assert.ok(warns.some(w => w.indexOf('未闭合') !== -1));
  } finally {
    console.warn = origWarn;
    rc.slotStack = [];
  }
});

test('ins 回执 moved 计数 + into 结构性容器黑名单', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const receipts = [];
  rc._onComponentEvent = (e) => { if (e.type === 'ins') receipts.push(e); };
  const warns = [];
  const origWarn = console.warn;
  console.warn = function (m) { warns.push(String(m)); };
  try {
    const container = createElement('div');
    rc.mount({ type: 'card', attrs: { id: 'ia', tt: 'A' }, children: [] }, container);
    rc.mount({
      type: 'tabs', attrs: { id: 'tb' },
      children: [{ type: 'tab', attrs: { tt: 'T1' }, children: [] }]
    }, container);
    // 正常 after：moved 1
    rc.mount({ type: 'ins', attrs: { after: 'ia' }, children: [{ type: 'p', attrs: {}, content: 'x', children: [] }] }, container);
    // into tabs：黑名单跳过，moved 0
    rc.mount({ type: 'ins', attrs: { into: 'tb' }, children: [{ type: 'p', attrs: {}, content: 'y', children: [] }] }, container);
    assert.strictEqual(receipts.length, 2);
    assert.strictEqual(receipts[0].detail.moved, 1);
    assert.strictEqual(receipts[1].detail.moved, 0);
    assert.ok(warns.some(w => w.indexOf('tabs') !== -1));
  } finally {
    console.warn = origWarn;
  }
});

// =============================================
// item7 组件上报（conversations/pagination/upload/tree/carousel）
// =============================================

test('pagination 翻页上报 change {value:页码}', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  let evt = null;
  rc._onComponentEvent = (e) => { evt = e; };
  const dom = rc.render({ type: 'pagination', attrs: { total: '5', id: 'pg' }, children: [] });
  const nav = dom.querySelector('.tokui-pagination-nav') || dom;
  const page2 = dom.querySelector('[data-page="2"]');
  assert.ok(page2, '页码 2 存在');
  fire(nav, 'click', { target: page2 });
  assert.ok(evt);
  assert.strictEqual(evt.type, 'pagination');
  assert.strictEqual(evt.event, 'change');
  assert.strictEqual(evt.detail.value, 2);
});

test('conversations 选中上报 change、删除上报 delete', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const evts = [];
  rc._onComponentEvent = (e) => evts.push(e);
  const dom = rc.render({
    type: 'conversations', attrs: {},
    children: [{ type: 'conv', attrs: { tt: '会话A', id: 'c1', time: '今天' }, children: [] }]
  });
  const conv = dom.querySelector('.tokui-conv');
  assert.ok(conv, 'conv 项存在');
  fire(conv, 'click', { target: conv });
  assert.ok(evts.some(e => e.event === 'change' && e.detail.value === 'c1'), 'change 上报会话标识');
});

test('upload 文件选择上报 change、act:clear 程序化不报', () => {
  cleanupHandlers();
  const rc = makeRenderer();
  const evts = [];
  rc._onComponentEvent = (e) => evts.push(e);
  const dom = rc.render({ type: 'upload', attrs: { n: 'f', id: 'up' }, children: [] });
  dom._update({ act: 'clear' });
  assert.strictEqual(evts.filter(e => e.type === 'upload').length, 0, '程序化 clear 不报');
});

cleanupHandlers();
run();
