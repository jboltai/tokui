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

test('pagination 翻页重绘保持焦点（聚焦等价按钮）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pagination', attrs: { page: '2', total: '5' }, children: [] });
  // 模拟键盘用户：焦点在「下一页」钮上
  const nextBtn = dom.querySelector('.tokui-pagination__next');
  nextBtn.focus();
  assert.strictEqual(document.activeElement, nextBtn);
  // click 委托在 nav 上：经 nav 派发（真实浏览器 click 冒泡路径）
  (dom._events['click'] || []).forEach(function (fn) { fn({ target: nextBtn, preventDefault: function () {} }); });
  // 翻页后 pagesWrap 重建，焦点应还到同 data-page=3 的按钮（新的当前页项）
  const active = document.activeElement;
  assert.ok(active && active.getAttribute('data-page') === '3', '焦点应保持在 data-page=3，实际 ' + (active && active.getAttribute('data-page')));
  assert.ok(active.classList.contains('tokui-pagination__item--active'), '落点是新的当前页项');
  assert.strictEqual(active.getAttribute('aria-current'), 'page');
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
test('tooltip renders with tabindex; popup carries role tooltip on focus', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'tooltip', attrs: { tt: '提示文字', tx: '触发' }, children: [] });
  // role=tooltip 应在弹层上（APG），触发器只带 tabindex；focus 时弹层挂 body 并回链 aria-describedby
  assert.strictEqual(dom.getAttribute('role'), null);
  assert.strictEqual(dom.getAttribute('tabindex'), '0');
  assert.strictEqual(dom.textContent, '触发');
  // mock document 无 body，补最小桩承载弹层挂载
  if (!document.body) {
    document.body = { childNodes: [], appendChild: function (c) { c.parentNode = this; this.childNodes.push(c); }, removeChild: function (c) { var i = this.childNodes.indexOf(c); if (i > -1) this.childNodes.splice(i, 1); } };
  }
  var _needWindowStub = typeof window === 'undefined';
  if (_needWindowStub) global.window = { innerWidth: 1024 };
  dom._events['focus'][0]();
  if (_needWindowStub) delete global.window; // 桩即用即删，防泄漏到后续用例
  const tip = dom._tooltipEl;
  assert.ok(tip, 'focus 后应创建弹层');
  assert.strictEqual(tip.getAttribute('role'), 'tooltip');
  assert.strictEqual(dom.getAttribute('aria-describedby'), tip.id);
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

// === video 尺寸 / 比例 / 封面同盒 ===
test('video ratio 设 aspect-ratio + cover + 解除 max-height', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'video', attrs: { s: 'x.mp4', ratio: '16:9' }, children: [] });
  const v = dom.querySelector('.tokui-video__player');
  assert.strictEqual(v.style.aspectRatio, '16 / 9', 'ratio 16:9 → aspect-ratio 16 / 9');
  assert.strictEqual(v.style.objectFit, 'cover', '有尺寸时默认 cover');
  assert.strictEqual(v.style.maxHeight, 'none', 'ratio 设了解除 max-height');
});

test('video h 显式高度 + cover', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'video', attrs: { s: 'x.mp4', h: '240' }, children: [] });
  const v = dom.querySelector('.tokui-video__player');
  assert.strictEqual(v.style.height, '240px', '纯数字 h → px');
  assert.strictEqual(v.style.objectFit, 'cover');
});

test('video w 设容器宽度', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'video', attrs: { s: 'x.mp4', w: '50%' }, children: [] });
  assert.strictEqual(dom.style.width, '50%', 'w 落到 wrapper');
});

test('video fit 覆盖默认', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'video', attrs: { s: 'x.mp4', ratio: '1:1', fit: 'contain' }, children: [] });
  const v = dom.querySelector('.tokui-video__player');
  assert.strictEqual(v.style.objectFit, 'contain', 'fit:contain 覆盖默认 cover');
});

test('video 无尺寸默认 contain（兼容旧行为）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'video', attrs: { s: 'x.mp4' }, children: [] });
  const v = dom.querySelector('.tokui-video__player');
  assert.strictEqual(v.style.objectFit, 'contain');
  assert.ok(!v.style.aspectRatio, '无 ratio 不设 aspect-ratio');
});

test('audio w 设容器宽度', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'audio', attrs: { s: 'x.mp3', w: '300' }, children: [] });
  assert.strictEqual(dom.style.width, '300px', 'audio w 纯数字 → px');
});

// === terminal 复制按钮 ===
test('terminal 标题栏右侧有复制按钮（文案走 i18n）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'terminal', attrs: { title: 'bash' }, content: 'echo hi', children: [] });
  const btn = dom.querySelector('.tokui-terminal__copy');
  assert.ok(btn, '应有复制按钮');
  assert.strictEqual(btn.textContent, '复制', '默认 zh-CN 文案');
  // 按钮在标题栏内（dots + title + copy）
  const titlebar = dom.querySelector('.tokui-terminal__titlebar');
  assert.strictEqual(titlebar.querySelector('.tokui-terminal__copy'), btn, '按钮应挂在标题栏');
});

test('terminal 点击复制按钮调 clipboard.writeText 并 Copied 反馈', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'terminal', attrs: {}, content: 'echo hello', children: [] });
  const btn = dom.querySelector('.tokui-terminal__copy');
  var copied = null;
  var origNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: function (t) { copied = t; } } },
    configurable: true, writable: true
  });
  try {
    btn._events.click[btn._events.click.length - 1]({});
  } finally {
    if (origNav) Object.defineProperty(globalThis, 'navigator', origNav);
  }
  assert.strictEqual(copied, 'echo hello', '应复制终端全文');
  assert.strictEqual(btn.textContent, '已复制', '点击后文案变为「已复制」');
  assert.ok(btn.classList.contains('tokui-terminal__copy--done'), '应有 done 态 class');
});

test('terminal 无 clipboard 时点击不报错', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'terminal', attrs: {}, content: 'ls', children: [] });
  const btn = dom.querySelector('.tokui-terminal__copy');
  var origNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });
  try {
    btn._events.click[btn._events.click.length - 1]({});
  } finally {
    if (origNav) Object.defineProperty(globalThis, 'navigator', origNav);
  }
  assert.strictEqual(btn.textContent, '已复制', '无 clipboard 仍有文案反馈');
});

// === code 行号（现状：wrapLines + CSS counter，已内置）===
test('code 组件输出行包装 .code-line（CSS counter 行号载体）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'text' }, content: 'line1\nline2\nline3', children: [] });
  const codeEl = dom.querySelector('code');
  assert.ok(codeEl, '应有 code 元素');
  var html = codeEl.innerHTML;
  var count = html.split('class="code-line"').length - 1;
  assert.strictEqual(count, 3, '每行应包一个 .code-line（行号由 CSS counter 生成）');
});

// === stat 底部标签（l 属性）===
test('stat l 属性渲染底部 .tokui-stat__label；缺省不渲染', () => {
  const rc = makeRenderer();
  const withL = rc.render({ type: 'stat', attrs: { v: '1.2km', l: '距离' }, children: [] });
  const label = withL.querySelector('.tokui-stat__label');
  assert.ok(label, 'l 属性应生成底部标签');
  assert.strictEqual(label.textContent, '距离');
  const withoutL = rc.render({ type: 'stat', attrs: { v: '42' }, children: [] });
  assert.ok(!withoutL.querySelector('.tokui-stat__label'), '无 l 不渲染标签');
  // tt 顶部标题与 l 底部标签可共存
  const both = rc.render({ type: 'stat', attrs: { tt: '本周', v: '99', l: '新增' }, children: [] });
  assert.ok(both.querySelector('.tokui-stat__title'), 'tt 顶部标题保留');
  assert.ok(both.querySelector('.tokui-stat__label'), 'l 底部标签同在');
});

run();
