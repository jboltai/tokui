/**
 * TokUI Chat-input 组件测试
 * 覆盖：基本渲染、发送按钮、clk 绑定、dis 禁用、rows、容器模式
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const TokUIEventBus = require('../src/core/event-bus');
const { registerBasicComponents } = require('../src/components/basic');

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
  const rc = new TokUIRenderer(TokUIEventBus);
  registerBasicComponents(rc);
  return rc;
}

// === 1. Renders wrapper with textarea ===
test('chat-input renders wrapper div with textarea', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: {}, children: [] });
  assert.strictEqual(dom._tokuiType, 'chat-input');
  assert.ok(dom.className.indexOf('tokui-chat-input') !== -1, 'wrapper has tokui-chat-input class');
  var textarea = dom.querySelector('textarea');
  assert.ok(textarea, 'textarea element exists');
  assert.ok(textarea.className.indexOf('tokui-chat-input__textarea') !== -1, 'textarea has correct class');
});

// === 2. Send button present ===
test('chat-input has send button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: {}, children: [] });
  var sendBtn = dom.querySelector('button');
  assert.ok(sendBtn, 'button element exists');
  assert.ok(sendBtn.className.indexOf('tokui-chat-input__send') !== -1, 'send button has correct class');
  assert.strictEqual(sendBtn.getAttribute('aria-label'), '发送');
});

// === 3. wrapper 不再盖 data-tokui-clk（回归：旧实现点击 textarea 也误触发 handler） ===
test('chat-input does not stamp data-tokui-clk on wrapper', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: { clk: 'handleSend' }, children: [] });
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), null);
});

// === 3b. Enter 发送直调 handler（回归：旧实现 Enter 路径无 click 事件 → handler 不触发） ===
test('chat-input Enter key invokes handler with value', () => {
  const rc = makeRenderer();
  let calls = 0, received = null;
  rc.eventBus.registerHandler('handleSend', (data) => { calls++; received = data; });
  const dom = rc.render({ type: 'chat-input', attrs: { clk: 'handleSend' }, children: [] });
  var textarea = dom.querySelector('textarea');
  textarea.value = '你好 TokUI';
  (textarea._events.keydown || []).forEach(fn => fn({ key: 'Enter', shiftKey: false, preventDefault() {} }));
  assert.strictEqual(calls, 1, 'Enter 应恰好触发一次 handler');
  assert.deepStrictEqual(received, { value: '你好 TokUI' });
  assert.strictEqual(textarea.value, '', '发送后应清空输入');
  assert.strictEqual(dom.getAttribute('data-tokui-clk-value'), '你好 TokUI', '保留 value 属性盖章（向后兼容）');
});

// === 3c. 点击发送按钮同样触发且只触发一次 ===
test('chat-input send button click invokes handler exactly once', () => {
  const rc = makeRenderer();
  let calls = 0, received = null;
  rc.eventBus.registerHandler('handleSend', (data) => { calls++; received = data; });
  const dom = rc.render({ type: 'chat-input', attrs: { clk: 'handleSend' }, children: [] });
  var textarea = dom.querySelector('textarea');
  var sendBtn = dom.querySelector('button');
  textarea.value = 'hi';
  (sendBtn._events.click || []).forEach(fn => fn({ preventDefault() {} }));
  assert.strictEqual(calls, 1, '点击发送应恰好触发一次 handler（无冒泡双触发）');
  assert.deepStrictEqual(received, { value: 'hi' });
});

// === 4. dis attribute adds disabled state ===
test('chat-input dis attribute disables textarea and send button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: { dis: true }, children: [] });
  var textarea = dom.querySelector('textarea');
  var sendBtn = dom.querySelector('button');
  assert.ok(textarea.hasAttribute('disabled'), 'textarea has disabled attribute');
  assert.ok(textarea.className.indexOf('tokui-chat-input__textarea--disabled') !== -1);
  assert.ok(sendBtn.hasAttribute('disabled'), 'send button has disabled attribute');
  assert.ok(sendBtn.className.indexOf('tokui-chat-input__send--disabled') !== -1);
});

// === 5. rows attribute sets textarea rows ===
test('chat-input rows attribute sets textarea rows', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: { rows: '4' }, children: [] });
  var textarea = dom.querySelector('textarea');
  assert.strictEqual(textarea.getAttribute('rows'), '4');
});

// === 6. Default rows is 2 ===
test('chat-input default rows is 2', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: {}, children: [] });
  var textarea = dom.querySelector('textarea');
  assert.strictEqual(textarea.getAttribute('rows'), '2');
});

// === 7. Container mode: children rendered alongside send button ===
test('chat-input container mode renders children', () => {
  const rc = makeRenderer();
  const dom = rc.render({
    type: 'chat-input',
    attrs: { ph: '输入消息...' },
    children: [
      { type: 'btn', attrs: { tx: '附件' }, children: [] },
      { type: 'btn', attrs: { tx: '发送', t: 'primary' }, children: [] }
    ]
  });
  // Should have the 2 child buttons + the default send button = 3 buttons in actions
  var actionsWrap = dom.querySelector('.tokui-chat-input__actions') || dom.children[1];
  assert.ok(actionsWrap, 'actions wrapper exists');
  // The actionsWrap should contain the children + the default send button
  var childCount = 0;
  for (var i = 0; i < actionsWrap.children.length; i++) {
    childCount++;
  }
  assert.strictEqual(childCount, 3, 'actions wrap has 2 children + 1 send button = 3');
});

// === 8. ph attribute sets placeholder ===
test('chat-input ph attribute sets placeholder', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: { ph: '输入消息...' }, children: [] });
  var textarea = dom.querySelector('textarea');
  assert.strictEqual(textarea.getAttribute('placeholder'), '输入消息...');
});

// === 9. _update toggles disabled state ===
test('chat-input _update toggles disabled state', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: {}, children: [] });
  var textarea = dom.querySelector('textarea');
  var sendBtn = dom.querySelector('button');
  // Initially enabled
  assert.ok(!textarea.hasAttribute('disabled'), 'initially not disabled');
  // Disable
  dom._update({ dis: true });
  assert.ok(textarea.hasAttribute('disabled'), 'textarea disabled after _update');
  assert.ok(sendBtn.hasAttribute('disabled'), 'send button disabled after _update');
  // Re-enable
  dom._update({ dis: false });
  assert.ok(!textarea.hasAttribute('disabled'), 'textarea re-enabled');
  assert.ok(!sendBtn.hasAttribute('disabled'), 'send button re-enabled');
});

// === 10. _slot points to textarea ===
test('chat-input _slot points to textarea', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'chat-input', attrs: {}, children: [] });
  var textarea = dom.querySelector('textarea');
  assert.strictEqual(dom._slot, textarea);
});

run();
