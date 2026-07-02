/**
 * TokUI rerender() 测试套件
 * 验证实例缓存最近 DSL，rerender() 按当前 locale 就地重画——
 * 覆盖 render() 一次性路径与 startStream()+feed() 流式累积路径。
 */
'use strict';

const assert = require('assert');
const { setupDOM, createElement } = require('./helpers/dom-mock');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) { tests.push({ name, fn }); }
function run() {
  passed = 0; failed = 0;
  for (const t of tests) {
    try { t.fn(); passed++; console.log(`  ✓ ${t.name}`); }
    catch (e) { failed++; console.log(`  ✗ ${t.name}`); console.log(`    ${e.message}`); }
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

// 每用例前重置 DOM + locale
function beforeEach() {
  setupDOM();
  require('../src/core/i18n').setLocale('zh-CN');
}

// 渲染并取容器内首个 pagination 的 aria-label（探测 chrome locale）
function paginationAria(container) {
  function walk(n) {
    if (!n) return null;
    if (n.attributes && n.attributes.class && n.attributes.class.indexOf('tokui-pagination') >= 0) return n;
    const kids = n.childNodes || [];
    for (const k of kids) { const f = walk(k); if (f) return f; }
    return null;
  }
  const el = walk(container);
  return el && el.attributes ? el.attributes['aria-label'] : null;
}

test('render() 后 rerender() 用新 locale 就地重画', () => {
  beforeEach();
  const TokUI = require('../src/index.js');
  const i18n = require('../src/core/i18n');
  const container = createElement('div');
  const ui = new TokUI({ container: container });

  ui.render('[pagination total:5 count:42 show-total clk:x]');
  assert.strictEqual(paginationAria(container), '分页');

  i18n.setLocale('en-US');
  const ok = ui.rerender();
  assert.strictEqual(ok, true);
  assert.strictEqual(paginationAria(container), 'Pagination');
});

test('rerender() 无缓存内容返回 false', () => {
  beforeEach();
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  assert.strictEqual(ui.rerender(), false);
});

test('startStream()+feed() 累积后 rerender() 重放完整内容', () => {
  beforeEach();
  const TokUI = require('../src/index.js');
  const i18n = require('../src/core/i18n');
  const container = createElement('div');
  const ui = new TokUI({ container: container });

  ui.startStream(container);
  // 模拟分块到达
  ui.feed('[pagination ');
  ui.feed('total:3 count:9 ');
  ui.feed('show-total clk:y]');
  ui.endStream();
  assert.strictEqual(paginationAria(container), '分页');

  i18n.setLocale('en-US');
  assert.strictEqual(ui.rerender(), true);
  assert.strictEqual(paginationAria(container), 'Pagination');
});

test('rerender() 切回 zh 双向生效', () => {
  beforeEach();
  const TokUI = require('../src/index.js');
  const i18n = require('../src/core/i18n');
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  ui.render('[pagination total:1 count:1 show-total clk:z]');

  i18n.setLocale('en-US'); ui.rerender();
  assert.strictEqual(paginationAria(container), 'Pagination');

  i18n.setLocale('zh-CN'); ui.rerender();
  assert.strictEqual(paginationAria(container), '分页');
});

test('rerender() 清空旧 DOM 后重画（不残留）', () => {
  beforeEach();
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  ui.render('[h1 Hello][h1 World]');
  // 容器应有两个 h1 子节点（粗略计 childNodes）
  const before = container.childNodes.length;
  assert.ok(before >= 2, 'render 后应有子节点');
  ui.rerender();
  const after = container.childNodes.length;
  assert.strictEqual(after, before, 'rerender 后子节点数应一致（清空重画，不翻倍）');
});

test('rerender() 支持显式传入目标容器', () => {
  beforeEach();
  const TokUI = require('../src/index.js');
  const i18n = require('../src/core/i18n');
  const c1 = createElement('div');
  const c2 = createElement('div');
  const ui = new TokUI({ container: c1 });
  ui.render('[pagination total:1 count:1 show-total clk:k]');
  // 重画到另一个容器
  ui.rerender(c2);
  assert.strictEqual(paginationAria(c2), '分页');
});

run();
