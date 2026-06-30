/**
 * 流式"跟随光标"UX 测试
 * tabs：流式渲染到某个 tab 即激活该 tab（用户随流看到当前输出），全部渲染完复位首项。
 * accordion：流式渲染到某个 collapse 即展开它、收起兄弟，全部渲染完仅展开首项。
 * 仅流式生效；一次性 render() 行为不变（对照组）。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const TokUI = require('../src/index');

const tests = [];
let passed = 0, failed = 0;
function test(name, fn) { tests.push({ name, fn }); }

function findByClass(root, cls) {
  for (const c of (root.childNodes || [])) {
    if (c.nodeType === 1 && c.className && c.className.indexOf(cls) >= 0) return c;
    const found = findByClass(c, cls);
    if (found) return found;
  }
  return null;
}

// === tabs 流式跟随 ===
test('streaming tabs: 流式中激活正在输出的 tab（idx 1）', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true });
  t.startStream(container);
  // tab B（idx 1）未闭合，正在输出 → 应被激活
  t.feed('[tabs][tab tt:A]内容A[/tab][tab tt:B]内容B');
  const tabs = findByClass(container, 'tokui-tabs');
  assert.ok(tabs, 'tabs 容器存在');
  const active = tabs.querySelector('input[data-index="1"]');
  assert.ok(active, 'tab B 的 radio input 存在');
  assert.strictEqual(active.checked, true, '正在输出的 tab B 应被激活（跟随）');
  t.endStream();
});

test('streaming tabs: 全部渲染完复位到首项（idx 0）', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true });
  t.startStream(container);
  t.feed('[tabs][tab tt:A]A[/tab][tab tt:B]B[/tab][tab tt:C]C[/tab][/tabs]');
  t.endStream();
  const tabs = findByClass(container, 'tokui-tabs');
  const first = tabs.querySelector('input[data-index="0"]');
  const last = tabs.querySelector('input[data-index="2"]');
  assert.strictEqual(first.checked, true, '流式结束后应复位激活首项');
  // radio 同组互斥由浏览器负责；此处仅断言首项被勾选（mock 不模拟互斥）
  assert.ok(first && last, '三项 radio 均存在');
});

// === accordion 流式跟随 ===
test('streaming accordion: 流式中展开当前 collapse、收起兄弟', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true });
  t.startStream(container);
  // collapse B（第二项）未闭合，正在输出 → B 展开、A 收起
  t.feed('[accordion][collapse tt:A]内容A[/collapse][collapse tt:B]内容B');
  const acc = findByClass(container, 'tokui-accordion');
  assert.ok(acc, 'accordion 容器存在');
  const items = acc.querySelectorAll('.tokui-collapse');
  assert.ok(items.length >= 2, '至少两项 collapse');
  const a = items[0], b = items[1];
  assert.strictEqual(b.hasAttribute('open'), true, '正在输出的 collapse B 应展开');
  assert.strictEqual(b.getAttribute('aria-expanded'), 'true', 'B 的 aria-expanded=true');
  assert.strictEqual(a.hasAttribute('open'), false, '兄弟 collapse A 应被收起');
  assert.strictEqual(a.getAttribute('aria-expanded'), 'false', 'A 的 aria-expanded=false');
  t.endStream();
});

test('streaming accordion: 全部渲染完仅展开首项', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true });
  t.startStream(container);
  t.feed('[accordion][collapse tt:A]A[/collapse][collapse tt:B]B[/collapse][collapse tt:C]C[/collapse][/accordion]');
  t.endStream();
  const acc = findByClass(container, 'tokui-accordion');
  const items = acc.querySelectorAll('.tokui-collapse');
  assert.strictEqual(items[0].hasAttribute('open'), true, '首项应展开');
  assert.strictEqual(items[0].getAttribute('aria-expanded'), 'true');
  assert.strictEqual(items[1].hasAttribute('open'), false, '第二项应收起');
  assert.strictEqual(items[2].hasAttribute('open'), false, '第三项应收起');
});

// === 一次性渲染对照组（不得被跟随逻辑污染）===
test('one-shot tabs: 首项默认激活，无流式跟随副作用（control）', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container });
  t.render('[tabs][tab tt:A]A[/tab][tab tt:B]B[/tab][/tabs]', container);
  const tabs = findByClass(container, 'tokui-tabs');
  const first = tabs.querySelector('input[data-index="0"]');
  const second = tabs.querySelector('input[data-index="1"]');
  // 一次性渲染经 _appendTabItem 走 setAttribute('checked')，非 .checked 属性
  assert.strictEqual(first.hasAttribute('checked'), true, '一次性渲染首项默认激活（checked 属性）');
  assert.strictEqual(second.hasAttribute('checked'), false, '第二项不应激活（无流式跟随）');
});

test('one-shot accordion: 无 open 属性时全部收起（control）', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container });
  t.render('[accordion][collapse tt:A]A[/collapse][collapse tt:B]B[/collapse][/accordion]', container);
  const acc = findByClass(container, 'tokui-accordion');
  const items = acc.querySelectorAll('.tokui-collapse');
  // 一次性渲染不强制单展开：无 open 属性则全收起
  assert.strictEqual(items[0].hasAttribute('open'), false, '一次性无 open 时首项应收起');
  assert.strictEqual(items[1].hasAttribute('open'), false, '第二项应收起');
});

// === checkbox 容器多选流式 ===
test('streaming checkbox multi: opt 边到边挂入组并注入共享 name', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true });
  t.startStream(container);
  t.feed('[checkbox n:brand l:品牌 multi][opt v:1 tx:篮球][opt v:2 tx:足球]');
  const group = findByClass(container, 'tokui-checkbox-group');
  assert.ok(group, 'checkbox-group 存在');
  const inputs = group.querySelectorAll('input[type=checkbox][name=brand]');
  assert.ok(inputs.length >= 2, '至少挂入 2 个 checkbox');
  assert.strictEqual(inputs[0].value, '1');
  assert.strictEqual(inputs[1].value, '2');
  // 共享 name 必须真实注入（DOM mock 的 querySelectorAll 不严格解析无引号属性选择器，
  // 故直接读 .name IDL 以确保流式 opt 注入了共享 name，而非空字符串）
  assert.strictEqual(inputs[0].name, 'brand', 'opt #1 共享 name=brand');
  assert.strictEqual(inputs[1].name, 'brand', 'opt #2 共享 name=brand');
  t.endStream();
});

function run() {
  console.log('');
  tests.forEach(t => {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + (e.message || e)); }
  });
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed (of ' + tests.length + ')');
  teardownDOM();
  if (failed > 0) process.exit(1);
}
run();
