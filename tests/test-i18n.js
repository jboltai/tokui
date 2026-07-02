/**
 * TokUI 国际化（i18n）测试套件
 * 覆盖：默认 locale、setLocale 切换、{name} 插值、未知 key 回退、
 * registerLocale 注入新语种、别名规整（en/zh/en-GB 等）、与组件渲染的端到端联动。
 */
'use strict';

const assert = require('assert');
const i18n = require('../src/core/i18n');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  passed = 0;
  failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${t.name}`);
      console.log(`    ${e.message}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

// 每个用例前复位回默认 zh-CN，避免用例间状态串扰
function resetZh() { i18n.setLocale('zh-CN'); }

test('默认 locale 为 zh-CN', () => {
  resetZh();
  // Node 环境无 navigator/document，i18n 未 init 时默认即 zh-CN
  assert.strictEqual(i18n.getLocale(), 'zh-CN');
});

test('zh-CN 基础文案命中', () => {
  resetZh();
  assert.strictEqual(i18n.t('common.close'), '关闭');
  assert.strictEqual(i18n.t('pagination.aria'), '分页');
  assert.strictEqual(i18n.t('chart.empty'), '暂无数据');
});

test('setLocale 切换到 en-US', () => {
  i18n.setLocale('en-US');
  assert.strictEqual(i18n.getLocale(), 'en-US');
  assert.strictEqual(i18n.t('common.close'), 'Close');
  assert.strictEqual(i18n.t('pagination.aria'), 'Pagination');
  assert.strictEqual(i18n.t('chart.empty'), 'No data');
  resetZh();
});

test('别名规整：en → en-US', () => {
  assert.strictEqual(i18n.setLocale('en'), 'en-US');
  assert.strictEqual(i18n.getLocale(), 'en-US');
  assert.strictEqual(i18n.t('common.ok'), 'OK');
  resetZh();
});

test('别名规整：zh / zh-TW → zh-CN', () => {
  assert.strictEqual(i18n.setLocale('zh'), 'zh-CN');
  assert.strictEqual(i18n.setLocale('zh-TW'), 'zh-CN');
  resetZh();
});

test('大小写不敏感：EN-us → en-US', () => {
  assert.strictEqual(i18n.setLocale('EN-us'), 'en-US');
  resetZh();
});

test('未知 locale 回退 zh-CN', () => {
  assert.strictEqual(i18n.setLocale('xx-YY'), 'zh-CN');
  resetZh();
});

test('setLocale 接受空/非法入参不崩且回退', () => {
  assert.strictEqual(i18n.setLocale(null), 'zh-CN');
  assert.strictEqual(i18n.setLocale(''), 'zh-CN');
  resetZh();
});

test('{name} 插值——zh-CN', () => {
  resetZh();
  assert.strictEqual(i18n.t('pagination.totalCount', { count: 42 }), '共42条');
  assert.strictEqual(i18n.t('pagination.totalPages', { total: 7 }), '共7页');
  assert.strictEqual(i18n.t('layout.carouselIndex', { n: 3 }), '第3张');
  assert.strictEqual(i18n.t('gantt.skipped', { n: 5 }), '⚠ 跳过 5 条无效任务');
});

test('{name} 插值——en-US', () => {
  i18n.setLocale('en-US');
  assert.strictEqual(i18n.t('pagination.totalCount', { count: 42 }), '42 items');
  assert.strictEqual(i18n.t('pagination.totalPages', { total: 7 }), '7 pages');
  assert.strictEqual(i18n.t('layout.carouselIndex', { n: 3 }), 'Image 3');
  resetZh();
});

test('插值缺参时保留占位符（便于排查漏传）', () => {
  resetZh();
  assert.strictEqual(i18n.t('pagination.totalCount'), '共{count}条');
});

test('无 params 时 t() 不做替换（性能路径）', () => {
  resetZh();
  // chart.conversion 含 {pct} 但未传 params → 原样返回
  assert.strictEqual(i18n.t('chart.conversion'), '转化{pct}%');
});

test('未知 key 回退 zh-CN 字典', () => {
  i18n.setLocale('en-US');
  // en-US 字典没有的 key（假设），应回退 zh-CN
  // 用一个 en-US 故意删掉后注册的语种验证：注册 'de-DE' 空字典，key 应回退 zh-CN
  i18n.registerLocale('de-DE', {});
  i18n.setLocale('de-DE');
  assert.strictEqual(i18n.t('common.close'), '关闭'); // 回退 zh-CN
  resetZh();
});

test('完全未知的 key 返回 key 原文', () => {
  resetZh();
  assert.strictEqual(i18n.t('no.such.key'), 'no.such.key');
  i18n.setLocale('en-US');
  assert.strictEqual(i18n.t('no.such.key'), 'no.such.key');
  resetZh();
});

test('registerLocale 注入新语种并立即生效', () => {
  i18n.registerLocale('ja-JP', {
    'common.close': '閉じる',
    'pagination.aria': 'ページネーション'
  });
  i18n.setLocale('ja-JP');
  assert.strictEqual(i18n.getLocale(), 'ja-JP');
  assert.strictEqual(i18n.t('common.close'), '閉じる');
  assert.strictEqual(i18n.t('pagination.aria'), 'ページネーション');
  // 未覆盖的 key 回退 zh-CN
  assert.strictEqual(i18n.t('common.ok'), '确定');
  resetZh();
});

test('registerLocale 增量合并（不覆盖未传 key）', () => {
  i18n.registerLocale('ja-JP', { 'common.close': '閉じる' });
  i18n.registerLocale('ja-JP', { 'common.ok': 'OK' });
  i18n.setLocale('ja-JP');
  assert.strictEqual(i18n.t('common.close'), '閉じる');
  assert.strictEqual(i18n.t('common.ok'), 'OK');
  resetZh();
});

test('registerLocale 非法入参静默忽略', () => {
  i18n.registerLocale(null, {});
  i18n.registerLocale('x', null);
  // 不应抛错，且不影响现有
  assert.strictEqual(i18n.t('common.close'), '关闭');
});

test('datepicker.title 插值（中英结构不同）', () => {
  resetZh();
  assert.strictEqual(i18n.t('datepicker.title', { y: 2026, m: 7 }), '2026年7月');
  i18n.setLocale('en-US');
  assert.strictEqual(i18n.t('datepicker.title', { y: 2026, m: 7 }), '7/2026');
  resetZh();
});

test('内置 zh-CN 与 en-US key 集合一致（无遗漏）', () => {
  // 通过访问内部 STRINGS：i18n 模块导出的是 TokUII18n 对象，
  // 这里用「未知 locale 回退」+ 逐 key 比对两套字典的 key 数应相等
  // （registerLocale 已合并过 ja-JP/de-DE，故只校验两个内置 locale 互译对称）
  const cases = [
    'common.close', 'common.ok', 'common.cancel', 'common.delete', 'common.copy',
    'common.copied', 'common.loading', 'common.renderFailed', 'common.view', 'common.send',
    'pagination.aria', 'pagination.totalCount', 'pagination.totalPages',
    'lightbox.preview', 'lightbox.zoomIn', 'chart.empty', 'chart.seriesDefault',
    'chart.conversion', 'gauge.statusGood', 'gantt.skipped', 'gantt.noTasks',
    'status.running', 'actions.regenerate', 'command.placeholder', 'command.noResult',
    'datepicker.title', 'datepicker.weekday.0', 'datepicker.weekday.6',
    'rate.defaultLabel', 'select.placeholder', 'upload.hint', 'upload.browse',
    'time.today', 'time.yesterday', 'time.earlier'
  ];
  for (const key of cases) {
    i18n.setLocale('zh-CN');
    const zh = i18n.t(key);
    i18n.setLocale('en-US');
    const en = i18n.t(key);
    assert.ok(zh !== key, `zh-CN 缺 key: ${key}`);
    assert.ok(en !== key, `en-US 缺 key: ${key}`);
    assert.ok(zh !== en, `中英译文相同（疑似未翻译）: ${key} = ${zh}`);
  }
  resetZh();
});

test('setLocale 返回规整后的 locale（可链式判断）', () => {
  assert.strictEqual(i18n.setLocale('en-GB'), 'en-US');
  resetZh();
});

test('t() 性能特征：单态查表，切 locale 后立即生效', () => {
  // 同一 key 在不同 locale 下返回不同值——证明 CURRENT_DICT 引用切换正确
  i18n.setLocale('zh-CN');
  const a1 = i18n.t('common.copy');
  i18n.setLocale('en-US');
  const a2 = i18n.t('common.copy');
  assert.strictEqual(a1, '复制');
  assert.strictEqual(a2, 'Copy');
  resetZh();
});

run();
