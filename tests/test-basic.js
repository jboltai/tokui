/**
 * TokUI 基础组件测试
 * 覆盖：progress、pagination、backtop、breadcrumb、tooltip、
 *       countdown、skeleton、popover
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
  // 强制退出：countdown 等组件注册了 setInterval（流式框架无组件销毁钩子），不强制退出会令进程挂起、卡死 test:all。
  process.exit(failed ? 1 : 0);
}

function makeRenderer() {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  return rc;
}

// === progress ===
test('progress renders with role progressbar', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'progress', attrs: { v: 60 }, children: [] });
  assert.ok(dom.className.indexOf('tokui-progress') !== -1);
  assert.strictEqual(dom.getAttribute('role'), 'progressbar');
});

test('progress has aria-valuenow/min/max', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'progress', attrs: { v: 75 }, children: [] });
  assert.strictEqual(dom.getAttribute('aria-valuenow'), '75');
  assert.strictEqual(dom.getAttribute('aria-valuemin'), '0');
  assert.strictEqual(dom.getAttribute('aria-valuemax'), '100');
});

// === pagination ===
test('pagination renders nav with role navigation', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pagination', attrs: { page: '1', total: '5' }, children: [] });
  assert.strictEqual(dom.tagName, 'NAV');
  assert.strictEqual(dom.getAttribute('role'), 'navigation');
  assert.strictEqual(dom.getAttribute('aria-label'), '分页');
});

test('pagination renders page buttons', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pagination', attrs: { page: '1', total: '3' }, children: [] });
  const btns = dom.querySelectorAll('[data-page]');
  assert.ok(btns.length >= 3);
});

// === backtop ===
test('backtop renders with aria-label', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'backtop', attrs: {}, children: [] });
  assert.strictEqual(dom.getAttribute('role'), 'button');
  assert.strictEqual(dom.getAttribute('aria-label'), '回到顶部');
  assert.strictEqual(dom.getAttribute('tabindex'), '0');
});

// === breadcrumb ===
test('breadcrumb renders items', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'breadcrumb', attrs: { items: '首页,产品,详情' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-breadcrumb') !== -1);
  const spans = dom.querySelectorAll('span');
  assert.ok(spans.length >= 3);
});

// === tooltip ===
test('tooltip renders with role tooltip and tabindex', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tooltip', attrs: { tt: '提示文字', tx: '触发' }, children: [] });
  assert.strictEqual(dom.getAttribute('role'), 'tooltip');
  assert.strictEqual(dom.getAttribute('tabindex'), '0');
  assert.strictEqual(dom.textContent, '触发');
});

test('tooltip registers keydown listener for Escape', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tooltip', attrs: { tt: '提示' }, children: [] });
  assert.ok(dom._events['keydown']);
  assert.ok(dom._events['keydown'].length > 0);
});

// === skeleton ===
test('skeleton renders with role status', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'skeleton', attrs: { t: 'text', rows: '3' }, children: [] });
  assert.strictEqual(dom.getAttribute('role'), 'status');
  assert.strictEqual(dom.getAttribute('aria-live'), 'polite');
});

test('skeleton text type renders rows', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'skeleton', attrs: { t: 'text', rows: '4' }, children: [] });
  const rows = dom.querySelectorAll('.tokui-skeleton__row');
  assert.strictEqual(rows.length, 4);
});

// === countdown ===
test('countdown renders with role timer', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'countdown', attrs: { target: '9999999999999' }, children: [] });
  assert.strictEqual(dom.getAttribute('role'), 'timer');
  assert.strictEqual(dom.getAttribute('aria-live'), 'polite');
});

// === popover ===
test('popover renders with trigger and panel', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'popover', attrs: { tx: '点击', tt: '标题' }, children: [
    { type: '_text', content: '内容' }
  ]});
  const trigger = dom.querySelector('.tokui-popover__trigger');
  assert.notStrictEqual(trigger, null);
  assert.strictEqual(trigger.getAttribute('role'), 'button');
  assert.strictEqual(trigger.getAttribute('aria-haspopup'), 'true');
});

test('popover registers keydown for Escape close', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'popover', attrs: { tx: '触发' }, children: [
    { type: '_text', content: '内容' }
  ]});
  assert.ok(dom._events['keydown']);
});

// === input-tag ===
test('input-tag renders with role group', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input-tag', attrs: { tags: 'a,b' }, children: [] });
  assert.strictEqual(dom.getAttribute('role'), 'group');
});

test('input-tag tag list has role list', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input-tag', attrs: { tags: 'x,y' }, children: [] });
  const list = dom.querySelector('.tokui-input-tag__list');
  assert.strictEqual(list.getAttribute('role'), 'list');
});

// === el() style filter ===
test('el() filters style attribute', () => {
  const { el } = require('../src/core/renderer');
  const dom = el('div', { class: 'test', style: 'color:red' });
  assert.strictEqual(dom.getAttribute('style'), null);
  assert.strictEqual(dom.getAttribute('class'), 'test');
});

// === renderer error boundary ===
test('renderer catches component errors', () => {
  const rc = makeRenderer();
  rc.register('bad', function() { throw new Error('boom'); });
  const dom = rc.render({ type: 'bad', attrs: {}, children: [] });
  assert.ok(dom.className.indexOf('tokui-error') !== -1);
  var summary = dom.querySelector('summary');
  assert.ok(summary && summary.textContent.indexOf('bad') !== -1);
});

// === 行内格式组件 b/strong/em/mark/del/sub/sup ===
test('inline b 渲染为 <strong class="tokui-b">', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'b', attrs: {}, content: '关键词', children: [] });
  assert.strictEqual(dom.tagName, 'STRONG');
  assert.strictEqual(dom.className, 'tokui-b');
  assert.strictEqual(dom.textContent, '关键词');
});

test('item 内嵌 [b 关键词] 渲染为 li 内联 strong', () => {
  const { TokUIParser } = require('../src/core/parser');
  const { registerLayoutComponents } = require('../src/components/layout');
  const r = new TokUIRenderer();
  registerBasicComponents(r); registerLayoutComponents(r);
  const root = document.createElement('div');
  const p = new TokUIParser(n => r.mountStreaming(n, root), { streaming: true });
  p.feed('[list][item]普通文本 [b 关键词] 后文[/item][/list]');
  p.endStream();
  const li = root.querySelector('.tokui-list-item');
  assert.ok(li, 'li 存在');
  const strong = li.querySelector('.tokui-b');
  assert.ok(strong, 'li 内有 .tokui-b');
  assert.strictEqual(strong.tagName, 'STRONG');
  assert.strictEqual(strong.textContent, '关键词');
});

run();
