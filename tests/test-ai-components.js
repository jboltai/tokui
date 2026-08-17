'use strict';
const assert = require('assert');
const { setupDOM, teardownDOM, createElement } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { TokUIParser } = require('../src/core/parser');
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

function makeRenderer(bus) {
  const rc = new TokUIRenderer(bus);
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

// diff 行序列序列化（class|行号|代码文本），供流式 vs 一次性渲染结构比对
function serializeDiff(dom) {
  var lines = dom.querySelectorAll('.tokui-diff__line');
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    out.push(lines[i].className + '|' +
      lines[i].querySelector('.tokui-diff__num').textContent + '|' +
      lines[i].querySelector('.tokui-diff__code').textContent);
  }
  return out.join('\n');
}

test('diff 流式多 chunk feed → 行渐增、首行 class、末行生长', () => {
  const rc = makeRenderer();
  const root = document.createElement('div');
  const parser = new TokUIParser((n) => rc.mountStreaming(n, root), { streaming: true });
  parser.startStream();
  parser.feed('[diff]');
  parser.feed('- old li');
  parser.feed('ne\n+ new line\n');
  parser.feed('  context');
  var contentEl = root.querySelector('.tokui-diff__content');
  var lines = contentEl.querySelectorAll('.tokui-diff__line');
  assert.strictEqual(lines.length, 3, '两个 \\n → 2 冻结行 + 1 生长行');
  assert.ok(lines[0].className.indexOf('tokui-diff__line--remove') !== -1, '首行 remove class');
  assert.strictEqual(lines[0].querySelector('.tokui-diff__code').textContent, '- old line');
  assert.ok(lines[1].className.indexOf('tokui-diff__line--add') !== -1, '次行 add class');
  // 末行是生长行，文本随 chunk 原地增长，不新增行
  assert.strictEqual(lines[2].querySelector('.tokui-diff__code').textContent, '  context');
  var frozenFirst = lines[0];
  parser.feed(' tail');
  lines = contentEl.querySelectorAll('.tokui-diff__line');
  assert.strictEqual(lines.length, 3, '无 \\n 不新增行');
  assert.strictEqual(lines[2].querySelector('.tokui-diff__code').textContent, '  context tail');
  // 已冻结行元素不被重建（纯 append 增量的核心断言）
  assert.strictEqual(lines[0], frozenFirst, '冻结行元素引用不变');
  parser.feed('\n+ another');
  lines = contentEl.querySelectorAll('.tokui-diff__line');
  assert.strictEqual(lines.length, 4, '新 \\n 冻结一行，新增生长行');
  assert.strictEqual(lines[0], frozenFirst, '冻结行仍不被触碰');
  parser.endStream();
});

test('diff 流式 close 后 DOM 与一次性渲染完全一致', () => {
  const raw = '- removed\n+ added\n  same\n+ added2';
  // 一次性渲染
  const oneShot = makeRenderer().render({ type: 'diff', attrs: {}, content: raw, children: [] });
  // 流式渲染（碎片 chunk + close 收尾）
  const rc = makeRenderer();
  const root = document.createElement('div');
  const parser = new TokUIParser((n) => rc.mountStreaming(n, root), { streaming: true });
  parser.startStream();
  parser.feed('[diff]');
  parser.feed('- remo');
  parser.feed('ved\n+ ad');
  parser.feed('ded\n  same\n');
  parser.feed('+ added2');
  parser.feed('[/diff]');
  parser.endStream();
  const streamed = root.querySelector('.tokui-diff');
  assert.ok(streamed, '流式 diff 应渲染');
  assert.strictEqual(serializeDiff(streamed), serializeDiff(oneShot),
    'close 后行数/class/行号/文本与一次性渲染逐字节一致');
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

// =============================================
// P0 缺陷修复回归（T0.2/T0.3/T0.5/T0.6/T0.7）
// =============================================

// dom-mock 无 dispatchEvent：直接触发存储的监听器
function fire(el, type, evt) {
  (el._events && el._events[type] || []).forEach(fn => fn(evt || { preventDefault() {} }));
}

// 流式驱动辅助：parser + mountStreaming 全通路
function streamInto(rc, root) {
  const parser = new TokUIParser((n) => rc.mountStreaming(n, root), { streaming: true });
  parser.startStream();
  return parser;
}

// --- T0.2 artifact 复制保留换行 ---
test('artifact 复制按钮写剪贴板留档原文（含换行）', () => {
  const rc = makeRenderer();
  const dom = rc.render({
    type: 'artifact', attrs: { tt: 'A', lang: 'text' },
    children: [{ type: 'artifact-code', attrs: {}, children: [{ type: '_text', content: 'line1\nline2\nline3' }] }]
  });
  const btn = dom.querySelector('.tokui-artifact__code-copy');
  assert.ok(btn, '复制按钮存在');
  var copied = null;
  var origNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: function (t) { copied = t; } } },
    configurable: true, writable: true
  });
  try {
    fire(btn, 'click');
  } finally {
    if (origNav) Object.defineProperty(globalThis, 'navigator', origNav);
  }
  assert.strictEqual(copied, 'line1\nline2\nline3', '复制保留换行（不读 wrapLines 后的 textContent）');
});

test('artifact 流式（artifact-code 子容器）close 后复制内容完整含换行', () => {
  const rc = makeRenderer();
  const root = document.createElement('div');
  const parser = streamInto(rc, root);
  parser.feed('[artifact tt:A lang:text]');
  parser.feed('[artifact-code]');
  parser.feed('a = 1\nb = 2');
  parser.feed('\nc = 3');
  parser.feed('[/artifact-code]');
  parser.feed('[/artifact]');
  parser.endStream();
  const dom = root.querySelector('.tokui-artifact');
  assert.ok(dom, 'artifact 流式渲染');
  var copied = null;
  var origNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: function (t) { copied = t; } } },
    configurable: true, writable: true
  });
  try {
    fire(dom.querySelector('.tokui-artifact__code-copy'), 'click');
  } finally {
    if (origNav) Object.defineProperty(globalThis, 'navigator', origNav);
  }
  assert.strictEqual(copied, 'a = 1\nb = 2\nc = 3', '流式 close 后留档为完整原文');
});

// --- artifact 复制上报统一事件出口（与 close 共用 reporter） ---
test('artifact 复制钮经 onEvent 上报 copy 事件', () => {
  const rc = makeRenderer();
  const events = [];
  rc._onComponentEvent = (evt) => events.push(evt);
  const dom = rc.render({
    type: 'artifact', attrs: { tt: 'A', lang: 'text' },
    children: [{ type: 'artifact-code', attrs: {}, children: [{ type: '_text', content: 'x = 1' }] }]
  });
  fire(dom.querySelector('.tokui-artifact__code-copy'), 'click');
  const copyEvt = events.find((e) => e && e.type === 'artifact' && e.event === 'copy');
  assert.ok(copyEvt, 'onEvent 收到 artifact copy 事件');
});

// --- T0.3 callout / agent 流式落位 ---
test('callout 盖 _tokuiType 且流式子节点落 content 内', () => {
  const rc = makeRenderer();
  const root = document.createElement('div');
  const parser = streamInto(rc, root);
  parser.feed('[callout tt:提示]');
  parser.feed('[p 内容文本]');
  parser.feed('[/callout]');
  parser.endStream();
  const dom = root.querySelector('.tokui-callout');
  assert.ok(dom, 'callout 流式渲染');
  assert.strictEqual(dom._tokuiType, 'callout', '组件根盖章');
  assert.strictEqual(dom._slot._tokuiType, 'callout', 'slot 元素盖章（与 _slot 同元素）');
  const content = dom.querySelector('.tokui-callout__content');
  assert.ok(content.querySelector('.tokui-p'), '流式子节点 p 落 content 内');
  assert.strictEqual(content.querySelector('.tokui-p').textContent, '内容文本');
});

test('agent 空 children 流式 open 后流入子节点挂载在 __body 内', () => {
  // 注：agent 不在 parser CONTAINERS（DSL 层不作容器），此处按审计 B5 场景在 renderer 层
  // 直接模拟流式 open → 子节点流入 → close，验证 _slot/__body 落位
  const rc = makeRenderer();
  const root = document.createElement('div');
  rc.mountStreaming({ type: 'agent', attrs: { name: 'Bot', status: 'running' }, children: [], _stream: 'open' }, root);
  const dom = root.querySelector('.tokui-agent');
  assert.ok(dom, 'agent open 即渲染');
  const body = dom.querySelector('.tokui-agent__body');
  assert.ok(body, '无 children 也建 __body');
  assert.strictEqual(dom._slot, body, '_slot 无条件指向 __body');
  rc.mountStreaming({ type: 'p', attrs: {}, content: '正在执行', children: [] }, root);
  rc.mountStreaming({ type: 'agent', _stream: 'close' }, root);
  const p = body.querySelector('.tokui-p');
  assert.ok(p, '流入子节点落 __body 内（非 wrapper 根）');
  assert.strictEqual(p.textContent, '正在执行');
});

// --- T0.5 sandbox 流式 ---
test('sandbox html 流式：srcdoc 仅 close 后写一次且内容完整', () => {
  const rc = makeRenderer();
  const root = document.createElement('div');
  const parser = streamInto(rc, root);
  parser.feed('[sandbox lang:html]');
  const iframe = root.querySelector('.tokui-sandbox__iframe');
  assert.ok(iframe, 'open 后即建 iframe');
  assert.strictEqual(iframe.getAttribute('srcdoc'), null, '流式期间不写 srcdoc');
  // 计数 srcdoc 写入次数
  let writes = 0;
  const origSet = iframe.setAttribute.bind(iframe);
  iframe.setAttribute = function (k, v) { if (k === 'srcdoc') writes++; return origSet(k, v); };
  parser.feed('<h1>He');
  parser.feed('llo</h1><p>');
  parser.feed('world</p>');
  assert.strictEqual(iframe.getAttribute('srcdoc'), null, 'chunk 到达不重写 srcdoc');
  parser.feed('[/sandbox]');
  parser.endStream();
  assert.strictEqual(writes, 1, 'srcdoc 仅 close 后写入一次');
  assert.strictEqual(iframe.getAttribute('srcdoc'), '<h1>Hello</h1><p>world</p>', '写入内容完整');
});

test('sandbox 非 html 流式：文本落 pre 内 code 元素', () => {
  const rc = makeRenderer();
  const root = document.createElement('div');
  const parser = streamInto(rc, root);
  parser.feed('[sandbox lang:python]');
  parser.feed('print(');
  parser.feed('1)');
  parser.feed('[/sandbox]');
  parser.endStream();
  const pre = root.querySelector('.tokui-sandbox__code');
  assert.ok(pre, 'pre 存在');
  const codeInner = pre.querySelector('code');
  assert.ok(codeInner, 'pre 内嵌 code 元素');
  assert.strictEqual(codeInner.textContent, 'print(1)', '流式文本落 code 内（非 preview 根）');
  assert.strictEqual(pre.textContent, 'print(1)', 'pre textContent 聚合一致');
});

// --- T0.6 tool-call result/error upd 幂等 ---
test('tool-call upd result/error 幂等：重复推送不堆叠', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tool-call', attrs: { name: 't', status: 'running' }, children: [] });
  dom._update({ result: 'r1' });
  dom._update({ result: 'r2' });
  const results = dom.querySelectorAll('.tokui-tool-call__result');
  assert.strictEqual(results.length, 1, 'result 元素唯一');
  assert.strictEqual(results[0].textContent, 'r2', '内容更新为最新值');
  dom._update({ error: 'e1' });
  dom._update({ error: 'e2' });
  const errors = dom.querySelectorAll('.tokui-tool-call__error');
  assert.strictEqual(errors.length, 1, 'error 元素唯一');
  assert.strictEqual(errors[0].textContent, 'e2', 'error 内容更新为最新值');
});

// --- T0.7 command 键盘导航 / emit 单出口 ---
test('command mouseenter 悬浮后键盘导航从悬浮项起跳', () => {
  const rc = makeRenderer();
  const dom = rc.render({
    type: 'command', attrs: {},
    children: [{
      type: 'command-group', attrs: {},
      children: [
        { type: 'command-item', attrs: { tx: '甲' }, children: [] },
        { type: 'command-item', attrs: { tx: '乙' }, children: [] },
        { type: 'command-item', attrs: { tx: '丙' }, children: [] }
      ]
    }]
  });
  dom._openCommand();
  const items = dom.querySelectorAll('.tokui-command__item');
  assert.strictEqual(items.length, 3);
  // 打开后默认选中首项
  assert.ok(items[0].classList.contains('tokui-command__item--selected'), '打开默认选中首项');
  // 悬浮第三项 → 选中态跟随
  fire(items[2], 'mouseenter');
  assert.ok(items[2].classList.contains('tokui-command__item--selected'), '悬浮项选中');
  assert.ok(!items[0].classList.contains('tokui-command__item--selected'), '原选中项让位');
  // 按 ↓：从悬浮下标(2)起跳 → 回绕到首项
  const input = dom.querySelector('.tokui-command__input');
  fire(input, 'keydown', { key: 'ArrowDown', preventDefault() {} });
  assert.ok(items[0].classList.contains('tokui-command__item--selected'), '↓ 回绕到首项');
  assert.ok(!items[2].classList.contains('tokui-command__item--selected'), '第三项取消选中');
  // 按 ↑：从 0 回绕到末项
  fire(input, 'keydown', { key: 'ArrowUp', preventDefault() {} });
  assert.ok(items[2].classList.contains('tokui-command__item--selected'), '↑ 回绕到末项');
  dom._closeCommand();
});

test('command 选中 emit 仅一次（item 级 + command 级 clk 各一次）', () => {
  const eventBus = require('../src/core/event-bus');
  // clk emit 走渲染器注入的 eventBus（多实例安全），与生产 TokUI 构造方式一致
  let itemCalls = 0, cmdCalls = 0, itemDetail = null, cmdDetail = null;
  eventBus.registerHandler('onItem', (d) => { itemCalls++; itemDetail = d; });
  eventBus.registerHandler('onCmd', (d) => { cmdCalls++; cmdDetail = d; });
  const rc = makeRenderer(eventBus);
  const dom = rc.render({
    type: 'command', attrs: { clk: 'onCmd' },
    children: [{
      type: 'command-group', attrs: {},
      children: [
        { type: 'command-item', attrs: { tx: '打开', v: 'open', clk: 'onItem', shortcut: 'Ctrl+O' }, children: [] }
      ]
    }]
  });
  dom._openCommand();
  const item = dom.querySelector('.tokui-command__item');
  fire(item, 'click');
  assert.strictEqual(itemCalls, 1, 'item 级 clk emit 仅一次');
  assert.strictEqual(cmdCalls, 1, 'command 级 clk emit 仅一次');
  assert.strictEqual(itemDetail.value, 'open');
  assert.strictEqual(itemDetail.text, '打开', 'text 取 item-text，不混 shortcut');
  assert.strictEqual(cmdDetail.clk, 'onItem', 'command 级 detail 带 item clk 名');
  // 键盘 Enter 路径同出口，同样仅一次
  dom._openCommand();
  fire(dom.querySelector('.tokui-command__input'), 'keydown', { key: 'Enter', preventDefault() {} });
  assert.strictEqual(itemCalls, 2, 'Enter 再次选中 item 级仍单次');
  assert.strictEqual(cmdCalls, 2, 'Enter 再次选中 command 级仍单次');
  eventBus.removeHandler('onItem');
  eventBus.removeHandler('onCmd');
});

// =============================================
// P3 能力补齐（T3.1 plan-step upd / T3.2 id 落地 / T3.5 tool-call 折叠）
// =============================================

// --- T3.1 plan-step upd ---
test('plan-step upd 经 DSL [upd id:] 全通路：status 别名归一 + tt/desc 更新', () => {
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  ui.render('[plan tt:发布计划][plan-step id:step1 tt:拉取数据 status:doing][/plan]');
  const dom = container.querySelector('.tokui-plan-step');
  assert.ok(dom, 'plan-step 渲染');
  assert.strictEqual(dom.getAttribute('id'), 'step1', 'plan-step id 落 DOM（upd 定位前提）');
  assert.ok(dom.className.indexOf('tokui-plan-step--doing') !== -1, '初始 doing 类');
  ui.render('[upd id:step1 status:done]');
  assert.ok(dom.className.indexOf('tokui-plan-step--done') !== -1, 'upd 后类名切到 done（dot ✓ 图标是该类的 CSS 伪元素，随类名联动）');
  assert.ok(dom.className.indexOf('tokui-plan-step--doing') === -1, '旧状态类移除');
  // 别名归一化：running → doing
  ui.render('[upd id:step1 status:running]');
  assert.ok(dom.className.indexOf('tokui-plan-step--doing') !== -1, '别名 running 经归一化表落到 doing');
  // tt/desc：desc 初始缺失时 upd 补建
  ui.render('[upd id:step1 tt:拉取完成 desc:"共 3 条"]');
  assert.strictEqual(dom.querySelector('.tokui-plan-step__title').textContent, '拉取完成', 'tt 更新');
  const desc = dom.querySelector('.tokui-plan-step__desc');
  assert.ok(desc, 'desc 缺失时 upd 补建');
  assert.strictEqual(desc.textContent, '共 3 条');
});

// --- T3.2 id 落地（del/ins 锚点；bubble/think/msg-actions 在各自测试文件） ---
test('AI 组件 attrs.id 落 DOM（T3.2）', () => {
  const rc = makeRenderer();
  const cases = [
    [{ type: 'typing', attrs: { id: 'tid' }, children: [] }, '.tokui-typing'],
    [{ type: 'quick-reply', attrs: { id: 'qid', items: 'a,b' }, children: [] }, '.tokui-quick-reply'],
    [{ type: 'diff', attrs: { id: 'did' }, content: '+a', children: [] }, '.tokui-diff'],
    [{ type: 'terminal', attrs: { id: 'teid' }, children: [] }, '.tokui-terminal'],
    [{ type: 'artifact', attrs: { id: 'aid', tt: 'A' }, children: [] }, '.tokui-artifact'],
    [{ type: 'plan-step', attrs: { id: 'pid', tt: 's' }, children: [] }, '.tokui-plan-step']
  ];
  cases.forEach(function (c) {
    const dom = rc.render(c[0]);
    assert.ok(dom, c[1] + ' 渲染');
    assert.strictEqual(dom.getAttribute('id'), c[0].attrs.id, c[1] + ' id 落 DOM');
  });
});

// --- T3.5 tool-call 可折叠 ---
test('tool-call collapsed 初始收起，header 点击/键盘切换收展（aria-expanded 同步）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tool-call', attrs: { name: 't', status: 'running', collapsed: true }, children: [] });
  const header = dom.querySelector('.tokui-tool-call__header');
  assert.ok(dom.classList.contains('tokui-tool-call--collapsed'), 'collapsed 属性初始收起');
  assert.strictEqual(header.getAttribute('aria-expanded'), 'false', '收起态 aria-expanded=false');
  assert.strictEqual(header.getAttribute('role'), 'button', 'header 按钮语义');
  fire(header, 'click');
  assert.ok(!dom.classList.contains('tokui-tool-call--collapsed'), '点击后展开');
  assert.strictEqual(header.getAttribute('aria-expanded'), 'true');
  fire(header, 'keydown', { key: 'Enter', preventDefault() {} });
  assert.ok(dom.classList.contains('tokui-tool-call--collapsed'), 'Enter 键再次收起');
  assert.strictEqual(header.getAttribute('aria-expanded'), 'false');
  fire(header, 'keydown', { key: ' ', preventDefault() {} });
  assert.ok(!dom.classList.contains('tokui-tool-call--collapsed'), 'Space 键展开');
});

test('tool-call 默认展开 + 收展不销毁 body + upd 状态切换保留收展态', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tool-call', attrs: { name: 't', status: 'running' }, content: '{q:1}', children: [] });
  const header = dom.querySelector('.tokui-tool-call__header');
  assert.ok(!dom.classList.contains('tokui-tool-call--collapsed'), '默认展开');
  assert.strictEqual(header.getAttribute('aria-expanded'), 'true');
  fire(header, 'click');
  assert.ok(dom.classList.contains('tokui-tool-call--collapsed'));
  assert.ok(dom.querySelector('.tokui-tool-call__params'), '收起只切 display，body 内容不销毁');
  dom._update({ status: 'done' });
  assert.ok(dom.classList.contains('tokui-tool-call--collapsed'), 'upd 状态切换后收展态保留');
  assert.ok(dom.className.indexOf('tokui-tool-call--done') !== -1, '状态类正常切换');
});

test('tool-call collapsed 流式：收起态下子节点仍挂进 body（_slot=body）', () => {
  const rc = makeRenderer();
  const root = document.createElement('div');
  const parser = streamInto(rc, root);
  parser.feed('[tool-call name:search status:running collapsed]');
  parser.feed('[tag tx:参数]');
  parser.feed('[/tool-call]');
  parser.endStream();
  const dom = root.querySelector('.tokui-tool-call');
  assert.ok(dom, 'tool-call 流式渲染');
  assert.ok(dom.classList.contains('tokui-tool-call--collapsed'), 'collapsed 布尔属性经 DSL 解析初始收起');
  const body = dom.querySelector('.tokui-tool-call__body');
  assert.ok(body.querySelector('.tokui-tag'), '收起态（display:none）不影响子节点挂载进 body');
});

// =============================================
// P5 测试补全（T5.1：terminal/think 流式全路径）
// =============================================

// --- terminal raw 流式：多 chunk 追加内容完整 ---
test('terminal raw 流式：open → 多 chunk → close 内容完整落 content', () => {
  const rc = makeRenderer();
  const root = document.createElement('div');
  const parser = streamInto(rc, root);
  parser.feed('[terminal title:"构建日志"]');
  parser.feed('$ npm run build\n');
  parser.feed('vite v8 building for production...\n');
  parser.feed('✓ built in 1.2s');
  parser.feed('[/terminal]');
  parser.endStream();
  const dom = root.querySelector('.tokui-terminal');
  assert.ok(dom, 'terminal 流式渲染');
  const content = dom.querySelector('.tokui-terminal__content');
  assert.strictEqual(content.textContent, '$ npm run build\nvite v8 building for production...\n✓ built in 1.2s',
    '多 chunk 追加后内容完整且顺序正确');
  assert.strictEqual(dom.querySelector('.tokui-terminal__title').textContent, '构建日志', 'title 属性生效');
});

// --- think 流式：open → chunk → close 内容落 body ---
test('think 流式：open → 多 chunk → close 内容落 __body', () => {
  const rc = makeRenderer();
  const root = document.createElement('div');
  const parser = streamInto(rc, root);
  parser.feed('[think tt:推理过程]');
  parser.feed('先分析用户需求，');
  parser.feed('再检索相关资料，');
  parser.feed('最后给出结论。');
  parser.feed('[/think]');
  parser.endStream();
  const dom = root.querySelector('.tokui-think');
  assert.ok(dom, 'think 流式渲染');
  const body = dom.querySelector('.tokui-think__body');
  assert.ok(body, 'think body 存在');
  assert.strictEqual(body.textContent, '先分析用户需求，再检索相关资料，最后给出结论。',
    '多 chunk 文本完整落 body（_slot 指向 body 而非 details 根）');
  assert.strictEqual(dom.querySelector('.tokui-think__title').textContent, '推理过程', 'summary 标题不受流入文本影响');
});

// Run all tests
run();
