/**
 * TokUI 图标体系测试套件（T0.4）
 * 覆盖 registerIcon API（校验/别名/覆盖缓存）、内置图标扩充、emoji 清零语义。
 */
'use strict';

const assert = require('assert');

const { ICONS, iconSvg, registerIcon } = require('../src/components/icons');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) { tests.push({ name, fn }); }

function run() {
  for (const t of tests) {
    try { t.fn(); passed++; console.log(`  ✓ ${t.name}`); }
    catch (e) { failed++; console.log(`  ✗ ${t.name}\n    ${e.message}`); }
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

// ========== 内置注册表 ==========

test('内置图标总数 ≥ 60（原 27 + T0.4 扩充 33+）', () => {
  const names = Object.keys(ICONS);
  assert.ok(names.length >= 60, `实际 ${names.length}`);
});

test('T0.4 扩充图标可用：folder/circle-check/chevron 系/zap/panel-left 等', () => {
  for (const n of ['folder', 'folder-open', 'file-text', 'volume-high', 'volume-x',
    'circle-check', 'circle-x', 'circle-alert', 'circle-info', 'circle-help',
    'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right',
    'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down',
    'plus', 'minus', 'user', 'users', 'home', 'inbox', 'bell', 'calendar', 'clock',
    'map-pin', 'trending-up', 'trending-down', 'external-link', 'panel-left',
    'play', 'pause', 'terminal', 'zap']) {
    assert.ok(ICONS[n], `缺图标 ${n}`);
    assert.ok(iconSvg(n).indexOf('<svg') === 0 && iconSvg(n).indexOf(n) !== -1, `${n} SVG 生成异常`);
  }
});

test('iconSvg：未知名返回空串；size 参数生效', () => {
  assert.strictEqual(iconSvg('no-such-icon'), '');
  assert.ok(iconSvg('folder', 20).indexOf('width="20"') !== -1);
});

// ========== registerIcon API ==========

test('registerIcon：合法注册 + 别名', () => {
  const ok = registerIcon('my-triangle', '<polygon points="12 3 21 19 3 19"/>', { alias: ['tri'] });
  assert.strictEqual(ok, true);
  assert.ok(ICONS['my-triangle']);
  assert.ok(ICONS['tri']);
  assert.ok(iconSvg('my-triangle').indexOf('polygon') !== -1);
  assert.ok(iconSvg('tri').indexOf('polygon') !== -1);
});

test('registerIcon：非法图标名拒绝（数字开头/空/超长/非法字符）', () => {
  assert.strictEqual(registerIcon('1abc', '<path d="M1 1"/>'), false);
  assert.strictEqual(registerIcon('', '<path d="M1 1"/>'), false);
  assert.strictEqual(registerIcon(new Array(70).join('a'), '<path d="M1 1"/>'), false);
  assert.strictEqual(registerIcon('bad name', '<path d="M1 1"/>'), false);
});

test('registerIcon：注入防御（script/onload 属性/foreignObject/文本节点）拒绝', () => {
  assert.strictEqual(registerIcon('evil1', '<script>alert(1)</script>'), false);
  assert.strictEqual(registerIcon('evil2', '<path d="M1 1" onload="alert(1)"/>'), false);
  assert.strictEqual(registerIcon('evil3', '<foreignObject width="10"/>'), false);
  assert.strictEqual(registerIcon('evil4', '纯文本无标签'), false);
  assert.strictEqual(ICONS['evil1'], undefined);
  assert.strictEqual(ICONS['evil4'], undefined);
});

test('registerIcon：覆盖内置图标生效（缓存刷新）', () => {
  const before = iconSvg('folder');
  registerIcon('folder', '<rect x="4" y="4" width="16" height="16"/>');
  const after = iconSvg('folder');
  assert.notStrictEqual(before, after);
  assert.ok(after.indexOf('rect') !== -1);
  // 还原内置，避免影响其他测试
  registerIcon('folder', before.match(/<svg[^>]*>(.*)<\/svg>/)[1]);
});

run();
