/**
 * TokUI Message-actions 组件测试
 * 覆盖：基本渲染、copy/regenerate/like 标志、clk 绑定、全部标志
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
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
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  return rc;
}

// Helper: get all buttons with data-act from a wrapper
function getActionBtns(wrapper) {
  var btns = [];
  for (var i = 0; i < wrapper.children.length; i++) {
    var child = wrapper.children[i];
    if (child.tagName === 'BUTTON' && child.getAttribute('data-act')) {
      btns.push(child);
    }
  }
  return btns;
}

// === 1. Renders action bar wrapper ===
test('msg-actions renders wrapper div', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'msg-actions', attrs: {}, children: [] });
  assert.strictEqual(dom._tokuiType, 'msg-actions');
  assert.ok(dom.className.indexOf('tokui-msg-actions') !== -1, 'wrapper has tokui-msg-actions class');
});

// === 2. copy flag generates copy button with correct data-act ===
test('msg-actions copy flag generates copy button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'msg-actions', attrs: { copy: true }, children: [] });
  var btns = getActionBtns(dom);
  assert.strictEqual(btns.length, 1, 'exactly 1 button');
  assert.strictEqual(btns[0].getAttribute('data-act'), 'copy');
  assert.strictEqual(btns[0].getAttribute('aria-label'), '复制');
  assert.ok(btns[0].className.indexOf('tokui-msg-actions__btn') !== -1);
});

// === 3. regenerate flag generates regenerate button ===
test('msg-actions regenerate flag generates regenerate button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'msg-actions', attrs: { regenerate: true }, children: [] });
  var btns = getActionBtns(dom);
  assert.strictEqual(btns.length, 1, 'exactly 1 button');
  assert.strictEqual(btns[0].getAttribute('data-act'), 'regenerate');
  assert.strictEqual(btns[0].getAttribute('aria-label'), '重新生成');
});

// === 4. like flag generates both like and dislike buttons ===
test('msg-actions like flag generates like and dislike buttons', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'msg-actions', attrs: { like: true }, children: [] });
  var btns = getActionBtns(dom);
  assert.strictEqual(btns.length, 2, 'like produces 2 buttons');
  var acts = btns.map(function(b) { return b.getAttribute('data-act'); });
  assert.ok(acts.indexOf('like') !== -1, 'has like button');
  assert.ok(acts.indexOf('dislike') !== -1, 'has dislike button');
});

// === 5. clk attribute set on wrapper ===
test('msg-actions clk attribute sets data-tokui-clk', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'msg-actions', attrs: { clk: 'handleAction', copy: true }, children: [] });
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'handleAction');
});

// === 6. All four flags generates 4 buttons ===
test('msg-actions with all flags generates 4 buttons', () => {
  const rc = makeRenderer();
  const dom = rc.render({
    type: 'msg-actions',
    attrs: { copy: true, regenerate: true, like: true },
    children: []
  });
  var btns = getActionBtns(dom);
  assert.strictEqual(btns.length, 4, 'copy + regenerate + like/dislike = 4 buttons');
  var acts = btns.map(function(b) { return b.getAttribute('data-act'); });
  assert.ok(acts.indexOf('copy') !== -1);
  assert.ok(acts.indexOf('regenerate') !== -1);
  assert.ok(acts.indexOf('like') !== -1);
  assert.ok(acts.indexOf('dislike') !== -1);
});

// === 7. No flags renders empty wrapper ===
test('msg-actions with no flags renders empty wrapper', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'msg-actions', attrs: {}, children: [] });
  assert.strictEqual(dom.children.length, 0, 'no children when no flags');
});

// === 8. _slot points to wrapper ===
test('msg-actions _slot points to wrapper', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'msg-actions', attrs: { copy: true }, children: [] });
  assert.strictEqual(dom._slot, dom);
});

// === 9. Button contains SVG icon via innerHTML ===
test('msg-actions buttons contain icon span', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'msg-actions', attrs: { copy: true }, children: [] });
  var btn = getActionBtns(dom)[0];
  // The icon is inside a span.tokui-msg-actions__icon
  var hasIcon = false;
  for (var i = 0; i < btn.children.length; i++) {
    if (btn.children[i].className && btn.children[i].className.indexOf('tokui-msg-actions__icon') !== -1) {
      hasIcon = true;
      break;
    }
  }
  assert.ok(hasIcon, 'button has icon span');
});

run();
