/**
 * TokUI [btn] icon 图标测试
 * 覆盖：SVG icon:NAME、emoji i:、icon-only tooltip/aria、_update 不 wipe icon。
 */
'use strict';
const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { ICONS, iconSvg } = require('../src/components/icons');
const { TokUIRenderer } = require('../src/core/renderer');
const { registerBasicComponents } = require('../src/components/basic');
const { registerFormComponents } = require('../src/components/form');

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
  if (failed > 0) process.exit(1);
}

// ===== icons 注册表 =====
test('iconSvg returns svg string for known name', () => {
  const svg = iconSvg('view', 16);
  assert.ok(svg.indexOf('<svg') === 0, 'should start with <svg');
  assert.ok(svg.indexOf('tokui-icon--view') > -1, 'should carry icon name class');
  assert.ok(svg.indexOf('stroke="currentColor"') > -1, 'should use currentColor');
});

test('iconSvg returns empty for unknown name', () => {
  assert.strictEqual(iconSvg('nonexistent_xyz'), '');
});

test('ICONS registry has 24 icons', () => {
  const keys = Object.keys(ICONS);
  assert.ok(keys.length >= 24, 'expected >=24 icons, got ' + keys.length);
  ['view', 'edit', 'delete', 'add', 'copy', 'search'].forEach(k => {
    assert.ok(ICONS[k], 'missing core icon: ' + k);
  });
});

// ===== [btn] icon 渲染 =====
function renderBtn(rc, attrs) {
  return rc.render({ type: 'btn', attrs: attrs, children: [] });
}
function freshRenderer() {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  registerFormComponents(rc);
  return rc;
}

test('[btn icon:view] injects SVG icon span', () => {
  const rc = freshRenderer();
  const btn = renderBtn(rc, { icon: 'view', tx: '详情', clk: 'view' });
  const iconSpan = btn.querySelector('.tokui-btn__icon');
  assert.ok(iconSpan, 'missing .tokui-btn__icon span');
  assert.ok(iconSpan.innerHTML.indexOf('<svg') === 0, 'icon span should contain <svg>');
  assert.ok(iconSpan.innerHTML.indexOf('tokui-icon--view') > -1, 'svg should carry view class');
  assert.ok(!btn.classList.contains('tokui-btn--icon-only'), 'has tx → not icon-only');
});

test('[btn i:🔍] injects emoji icon span', () => {
  const rc = freshRenderer();
  const btn = renderBtn(rc, { i: '🔍', tx: '搜索', clk: 's' });
  const iconSpan = btn.querySelector('.tokui-btn__icon--emoji');
  assert.ok(iconSpan, 'missing emoji icon span');
  assert.strictEqual(iconSpan.textContent, '🔍');
});

test('[btn icon-only] adds icon-only class + aria-label + data-tokui-tip', () => {
  const rc = freshRenderer();
  const btn = renderBtn(rc, { icon: 'delete', l: '删除', t: 'danger', clk: 'del' });
  assert.ok(btn.classList.contains('tokui-btn--icon-only'), 'should be icon-only');
  assert.strictEqual(btn.getAttribute('aria-label'), '删除');
  assert.strictEqual(btn.getAttribute('data-tokui-tip'), '删除');
  assert.ok(!btn.querySelector('.tokui-btn__text'), 'icon-only should have no text span');
});

test('[btn icon-only] aria-label falls back to icon name when no l:', () => {
  const rc = freshRenderer();
  const btn = renderBtn(rc, { icon: 'edit', clk: 'e' });
  assert.strictEqual(btn.getAttribute('aria-label'), 'edit');
});

test('[btn] text renders inside .tokui-btn__text span', () => {
  const rc = freshRenderer();
  const btn = renderBtn(rc, { tx: '提交', t: 'primary' });
  const ts = btn.querySelector('.tokui-btn__text');
  assert.ok(ts, 'missing text span');
  assert.strictEqual(ts.textContent, '提交');
});

test('[btn] _update(tx) does not wipe icon', () => {
  const rc = freshRenderer();
  const btn = renderBtn(rc, { icon: 'view', tx: '详情', clk: 'v' });
  assert.ok(btn._update, 'btn should expose _update');
  btn._update({ tx: '查看' });
  const ts = btn.querySelector('.tokui-btn__text');
  assert.strictEqual(ts.textContent, '查看');
  assert.ok(btn.querySelector('.tokui-btn__icon'), 'icon should survive _update');
});

test('[btn] unknown icon name degrades gracefully (no crash, empty svg)', () => {
  const rc = freshRenderer();
  const btn = renderBtn(rc, { icon: 'nope_xyz', tx: 'x' });
  const iconSpan = btn.querySelector('.tokui-btn__icon');
  assert.ok(iconSpan, 'icon span still created');
  assert.strictEqual(iconSpan.innerHTML, '');
});

run();
