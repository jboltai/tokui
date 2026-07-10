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
    try {
      t.fn();
      passed++;
      console.log('  \x1b[32m✓\x1b[0m ' + t.name);
    } catch (e) {
      failed++;
      console.log('  \x1b[31m✗\x1b[0m ' + t.name);
      console.log('    ' + e.message);
    }
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

// =============================================
// Phase 1: P0 核心 AI 聊天组件
// =============================================

// --- tool-call ---
test('tool-call renders container with status class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tool-call', attrs: { name: 'search', status: 'running' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-tool-call') !== -1);
  assert.ok(dom.className.indexOf('tokui-tool-call--running') !== -1);
});

test('tool-call renders name and status badge', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tool-call', attrs: { name: 'get_data', status: 'done' }, children: [] });
  assert.ok(dom.querySelector('.tokui-tool-call__name'));
  assert.strictEqual(dom.querySelector('.tokui-tool-call__name').textContent, 'get_data');
  assert.ok(dom.querySelector('.tokui-tool-call__status'));
});

test('tool-call renders duration when provided', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tool-call', attrs: { name: 'test', status: 'done', duration: '2s' }, children: [] });
  assert.ok(dom.querySelector('.tokui-tool-call__duration'));
  assert.strictEqual(dom.querySelector('.tokui-tool-call__duration').textContent, '2s');
});

test('tool-call renders content as params', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tool-call', attrs: { name: 'test', status: 'running' }, content: '{q:"hello"}', children: [] });
  assert.ok(dom.querySelector('.tokui-tool-call__params'));
  assert.strictEqual(dom.querySelector('.tokui-tool-call__params').textContent, '{q:"hello"}');
});

test('tool-call has _update method for dynamic status', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tool-call', attrs: { name: 'test', status: 'running', duration: '1s' }, children: [] });
  assert.strictEqual(typeof dom._update, 'function');
  dom._update({ status: 'done' });
  assert.ok(dom.className.indexOf('tokui-tool-call--done') !== -1);
});

test('tool-call all 5 status variants', () => {
  const rc = makeRenderer();
  ['pending', 'running', 'done', 'error', 'denied'].forEach(s => {
    const dom = rc.render({ type: 'tool-call', attrs: { name: 't', status: s }, children: [] });
    assert.ok(dom.className.indexOf('tokui-tool-call--' + s) !== -1);
  });
});

// --- typing ---
test('typing renders with dots', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'typing', attrs: {}, children: [] });
  assert.ok(dom.className.indexOf('tokui-typing') !== -1);
  assert.ok(dom.querySelector('.tokui-typing__dots'));
  const dots = dom.querySelectorAll('.tokui-typing__dot');
  assert.strictEqual(dots.length, 3);
});

test('typing renders text label when provided', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'typing', attrs: { text: '思考中...' }, children: [] });
  assert.ok(dom.querySelector('.tokui-typing__text'));
  assert.strictEqual(dom.querySelector('.tokui-typing__text').textContent, '思考中...');
});

test('typing no text label when not provided', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'typing', attrs: {}, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-typing__text'), null);
});

// --- quick-reply ---
test('quick-reply renders items from comma-separated string', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'quick-reply', attrs: { items: '翻译,总结,续写' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-quick-reply') !== -1);
  const items = dom.querySelectorAll('.tokui-quick-reply__item');
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0].textContent, '翻译');
  assert.strictEqual(items[1].textContent, '总结');
  assert.strictEqual(items[2].textContent, '续写');
});

test('quick-reply renders container mode with children', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'quick-reply', attrs: {}, children: [
    { type: '_text', content: 'Hello', attrs: {} }
  ]});
  assert.ok(dom.querySelector('.tokui-quick-reply__items'));
});

// --- source ---
test('source renders with numbered badge', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'source', attrs: { n: '1', tt: 'Test Title', sn: 'A snippet' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-source') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-source__num').textContent, '1');
  assert.strictEqual(dom.querySelector('.tokui-source__title').textContent, 'Test Title');
  assert.strictEqual(dom.querySelector('.tokui-source__snippet').textContent, 'A snippet');
});

test('source renders title as link when url provided', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'source', attrs: { n: '2', u: 'https://tokui.jboltai.com', tt: 'Link Title' }, children: [] });
  var titleEl = dom.querySelector('.tokui-source__title');
  assert.notStrictEqual(titleEl, null);
  // In DOM mock, the element is created with el() which sets attributes
  assert.strictEqual(titleEl.textContent, 'Link Title');
});

test('source renders without url', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'source', attrs: { n: '3', tt: 'No URL' }, children: [] });
  var titleEl = dom.querySelector('.tokui-source__title');
  assert.notStrictEqual(titleEl, null);
});

// --- diff ---
test('diff renders header with title and lang', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'diff', attrs: { lang: 'js', title: 'Changes' }, content: '', children: [] });
  assert.ok(dom.className.indexOf('tokui-diff') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-diff__title').textContent, 'Changes');
  assert.strictEqual(dom.querySelector('.tokui-diff__lang').textContent, 'js');
});

test('diff parses add/remove/context lines', () => {
  const rc = makeRenderer();
  const content = '- old line\n+ new line\n  context';
  const dom = rc.render({ type: 'diff', attrs: {}, content: content, children: [] });
  assert.ok(dom.querySelector('.tokui-diff__line--remove'));
  assert.ok(dom.querySelector('.tokui-diff__line--add'));
  assert.ok(dom.querySelector('.tokui-diff__line--context'));
  var lines = dom.querySelectorAll('.tokui-diff__line');
  assert.strictEqual(lines.length, 3);
});

test('diff line numbers increment correctly', () => {
  const rc = makeRenderer();
  const content = '- removed\n+ added\n  same';
  const dom = rc.render({ type: 'diff', attrs: {}, content: content, children: [] });
  var nums = dom.querySelectorAll('.tokui-diff__num');
  assert.strictEqual(String(nums[0].textContent), '1'); // old line 1
  assert.strictEqual(String(nums[1].textContent), '1'); // new line 1
  assert.strictEqual(String(nums[2].textContent), '2'); // old+new line 2
});

// =============================================
// Phase 2: P1 Agent/代码助手组件
// =============================================

// --- plan ---
test('plan renders with title', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'plan', attrs: { tt: 'Implementation Plan' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-plan') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-plan__title').textContent, 'Implementation Plan');
});

test('plan renders with steps container', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'plan', attrs: {}, children: [] });
  assert.ok(dom.querySelector('.tokui-plan__steps'));
});

// --- plan-step ---
test('plan-step renders with status class', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'plan-step', attrs: { status: 'done', tt: 'Step 1' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-plan-step--done') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-plan-step__title').textContent, 'Step 1');
});

test('plan-step all status variants', () => {
  const rc = makeRenderer();
  ['pending', 'doing', 'done', 'error', 'skipped'].forEach(s => {
    var dom = rc.render({ type: 'plan-step', attrs: { status: s }, children: [] });
    assert.ok(dom.className.indexOf('tokui-plan-step--' + s) !== -1, 'Missing class for status: ' + s);
  });
});

test('plan-step normalizes status aliases (running→doing etc.)', () => {
  const rc = makeRenderer();
  var aliases = { running: 'doing', active: 'doing', 'in-progress': 'doing', complete: 'done', completed: 'done', wait: 'pending', failed: 'error' };
  Object.keys(aliases).forEach(raw => {
    var dom = rc.render({ type: 'plan-step', attrs: { status: raw }, children: [] });
    assert.ok(dom.className.indexOf('tokui-plan-step--' + aliases[raw]) !== -1,
      'alias ' + raw + ' should map to ' + aliases[raw]);
  });
  // 未知值回退到 pending，不产生无效 class
  var unknown = rc.render({ type: 'plan-step', attrs: { status: 'running-fast' }, children: [] });
  assert.ok(unknown.className.indexOf('tokui-plan-step--pending') !== -1);
});

test('plan-step renders desc', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'plan-step', attrs: { status: 'pending', tt: 'Title', desc: 'Description' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-plan-step__desc').textContent, 'Description');
});

// --- agent ---
test('agent renders with status class', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'agent', attrs: { name: 'Bot', status: 'running' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-agent') !== -1);
  assert.ok(dom.className.indexOf('tokui-agent--running') !== -1);
});

test('agent renders name and action', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'agent', attrs: { name: 'CodeBot', status: 'running', action: 'Refactoring' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-agent__name').textContent, 'CodeBot');
  assert.strictEqual(dom.querySelector('.tokui-agent__action').textContent, 'Refactoring');
});

test('agent all status variants', () => {
  const rc = makeRenderer();
  ['idle', 'running', 'paused', 'done', 'error'].forEach(s => {
    var dom = rc.render({ type: 'agent', attrs: { name: 't', status: s }, children: [] });
    assert.ok(dom.className.indexOf('tokui-agent--' + s) !== -1, 'Missing class for: ' + s);
  });
});

test('agent has _update method', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'agent', attrs: { name: 't', status: 'running' }, children: [] });
  assert.strictEqual(typeof dom._update, 'function');
});

// --- file-tree ---
test('file-tree renders container', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'file-tree', attrs: {}, children: [] });
  assert.ok(dom.className.indexOf('tokui-file-tree') !== -1);
});

test('ft-folder renders with name and toggle', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'ft-folder', attrs: { name: 'src', open: '' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-file-tree__folder') !== -1);
  assert.ok(dom.className.indexOf('tokui-file-tree__folder--open') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-file-tree__name').textContent, 'src');
});

test('ft-folder closed by default', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'ft-folder', attrs: { name: 'lib' }, children: [] });
  assert.strictEqual(dom.className.indexOf('tokui-file-tree__folder--open'), -1);
});

test('ft-file renders with name', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'ft-file', attrs: { name: 'index.js' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-file-tree__file') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-file-tree__name').textContent, 'index.js');
});

test('ft-file renders badge', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'ft-file', attrs: { name: 'a.js', badge: 'M' }, children: [] });
  assert.ok(dom.querySelector('.tokui-file-tree__file-badge'));
  assert.strictEqual(dom.querySelector('.tokui-file-tree__file-badge').textContent, 'M');
});

// --- terminal ---
test('terminal renders with titlebar', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'terminal', attrs: { title: 'bash', status: '0' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-terminal') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-terminal__title').textContent, 'bash');
});

test('terminal error status adds error class', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'terminal', attrs: { title: 'npm', status: '1' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-terminal--error') !== -1);
});

test('terminal renders content', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'terminal', attrs: { title: 'sh' }, content: '$ echo hello\nhello', children: [] });
  assert.ok(dom.querySelector('.tokui-terminal__content'));
});

// --- shimmer ---
test('shimmer renders text type with rows', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'shimmer', attrs: { t: 'text', rows: '4' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-shimmer--text') !== -1);
  var rows = dom.querySelectorAll('.tokui-shimmer__row');
  assert.strictEqual(rows.length, 4);
});

test('shimmer renders card type', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'shimmer', attrs: { t: 'card' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-shimmer--card') !== -1);
  assert.ok(dom.querySelector('.tokui-shimmer__circle'));
});

test('shimmer renders avatar type', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'shimmer', attrs: { t: 'avatar' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-shimmer--avatar') !== -1);
  assert.ok(dom.querySelector('.tokui-shimmer__circle'));
});

// --- latency ---
test('latency renders value', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'latency', attrs: { v: '12s', t: 'thinking' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-latency') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-latency__value').textContent, '12s');
});

test('latency renders type-specific class', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'latency', attrs: { v: '5s', t: 'total' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-latency--total') !== -1);
  assert.ok(dom.querySelector('.tokui-latency__icon'));
  assert.ok(dom.querySelector('.tokui-latency__label'));
});

// =============================================
// Phase 3: P2 高级组件
// =============================================

// --- video ---
test('video renders with player', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'video', attrs: { s: 'https://tokui.jboltai.com/v.mp4' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-video') !== -1);
  assert.ok(dom.querySelector('.tokui-video__player'));
});

// --- audio ---
test('audio renders with title and player', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'audio', attrs: { s: 'https://tokui.jboltai.com/a.mp3', tt: 'Voice Reply', duration: '0:35' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-audio') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-audio__title').textContent, 'Voice Reply');
  assert.strictEqual(dom.querySelector('.tokui-audio__duration').textContent, '0:35');
  assert.ok(dom.querySelector('.tokui-audio__player'));
});

// --- quote ---
test('quote renders with role badge and text', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'quote', attrs: { tx: 'Original message', role: 'user' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-quote') !== -1);
  assert.ok(dom.querySelector('.tokui-quote__role'));
  assert.strictEqual(dom.querySelector('.tokui-quote__text').textContent, 'Original message');
});

test('quote renders container mode with children', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'quote', attrs: { role: 'ai' }, children: [
    { type: '_text', content: 'Response text', attrs: {} }
  ]});
  assert.ok(dom.querySelector('.tokui-quote__content'));
});

test('quote renders bar element', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'quote', attrs: {}, children: [] });
  assert.ok(dom.querySelector('.tokui-quote__bar'));
});

// --- sandbox ---
test('sandbox renders with header and preview', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'sandbox', attrs: { lang: 'html', title: 'Preview', height: '200' }, content: '<h1>Hi</h1>', children: [] });
  assert.ok(dom.className.indexOf('tokui-sandbox') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-sandbox__title').textContent, 'Preview');
  assert.strictEqual(dom.querySelector('.tokui-sandbox__lang').textContent, 'html');
  assert.ok(dom.querySelector('.tokui-sandbox__preview'));
});

test('sandbox html mode creates iframe', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'sandbox', attrs: { lang: 'html' }, content: '<p>test</p>', children: [] });
  assert.ok(dom.querySelector('.tokui-sandbox__iframe'));
});

test('sandbox non-html mode creates pre', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'sandbox', attrs: { lang: 'js' }, content: 'console.log(1)', children: [] });
  assert.ok(dom.querySelector('.tokui-sandbox__code'));
});

// --- commit ---
test('commit renders hash, msg, author', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'commit', attrs: { hash: 'abc12345def', msg: 'feat: add tool-call', author: 'Bot', branch: 'main' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-commit') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-commit__hash').textContent, 'abc1234');
  assert.strictEqual(dom.querySelector('.tokui-commit__msg').textContent, 'feat: add tool-call');
  assert.strictEqual(dom.querySelector('.tokui-commit__author').textContent, 'Bot');
  assert.strictEqual(dom.querySelector('.tokui-commit__branch').textContent, 'main');
});

test('commit renders additions and deletions', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'commit', attrs: { hash: 'aaa', additions: '12', deletions: '3' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-commit__additions').textContent, '+12');
  assert.strictEqual(dom.querySelector('.tokui-commit__deletions').textContent, '-3');
});

// --- test-result ---
test('test-result renders summary with counts', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'test-result', attrs: { pass: '10', fail: '2', skip: '1', total: '13', duration: '3.2s' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-test-result') !== -1);
  assert.ok(dom.querySelector('.tokui-test-result__count--pass'));
  assert.ok(dom.querySelector('.tokui-test-result__count--fail'));
  assert.ok(dom.querySelector('.tokui-test-result__count--skip'));
  assert.ok(dom.querySelector('.tokui-test-result__duration'));
});

test('test-result renders cases container', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'test-result', attrs: {}, children: [] });
  assert.ok(dom.querySelector('.tokui-test-result__cases'));
});

// --- test-case ---
test('test-case renders with status class', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'test-case', attrs: { name: 'unit.test', status: 'pass', duration: '0.1s' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-test-case--pass') !== -1);
  assert.strictEqual(dom.querySelector('.tokui-test-case__name').textContent, 'unit.test');
  assert.strictEqual(dom.querySelector('.tokui-test-case__duration').textContent, '0.1s');
});

test('test-case fail renders error message', () => {
  const rc = makeRenderer();
  var dom = rc.render({ type: 'test-case', attrs: { name: 'fail.test', status: 'fail', error: 'Expected true' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-test-case--fail') !== -1);
  assert.ok(dom.querySelector('.tokui-test-case__error'));
  assert.strictEqual(dom.querySelector('.tokui-test-case__error').textContent, 'Expected true');
});

test('test-case all status variants', () => {
  const rc = makeRenderer();
  ['pass', 'fail', 'skip'].forEach(s => {
    var dom = rc.render({ type: 'test-case', attrs: { name: 't', status: s }, children: [] });
    assert.ok(dom.className.indexOf('tokui-test-case--' + s) !== -1, 'Missing class for: ' + s);
  });
});

// Run all tests
run();
