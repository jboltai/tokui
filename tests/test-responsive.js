/**
 * TokUI 响应式断点系统测试套件（T0.3 容器查询）
 * 覆盖 col/grid 断点属性的 data 落点、值校验（钳制/丢弃）、
 * CSS 段完整性（@supports 包裹、@container 规则、变量桥接枚举）。
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { registerLayoutComponents } = require('../src/components/layout');
const { TokUIParser } = require('../src/core/parser');
const TokUIClass = require('../src/index');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) { tests.push({ name, fn }); }

async function run() {
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${t.name}\n    ${e.message}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  teardownDOM();
  if (failed > 0) process.exit(1);
}

function makeRenderer() {
  const r = new TokUIRenderer(null);
  registerLayoutComponents(r);
  return r;
}

/** 深度优先在节点树中查找指定类型 */
function findType(node, type) {
  if (node.type === type) return node;
  for (const c of (node.children || [])) {
    const f = findType(c, type);
    if (f) return f;
  }
  return null;
}

/** 解析 DSL 返回首个指定类型节点渲染后的 DOM */
function renderFirst(dsl, type) {
  const roots = [];
  new TokUIParser(n => roots.push(n)).parse(dsl);
  let target = null;
  for (const root of roots) {
    target = findType(root, type);
    if (target) break;
  }
  assert.ok(target, `DSL 应含 ${type} 节点: ${dsl}`);
  return makeRenderer().render(target);
}

// ========== col 断点属性落点 ==========

test('col：xs/sm/md/lg/xl 断点 span 落 data-bp-* 属性', () => {
  const col = renderFirst('[row][col span:4 xs:12 sm:6 md:4 lg:3 xl:2 内容][/row]', 'col');
  assert.strictEqual(col.getAttribute('data-bp-xs'), '12');
  assert.strictEqual(col.getAttribute('data-bp-sm'), '6');
  assert.strictEqual(col.getAttribute('data-bp-md'), '4');
  assert.strictEqual(col.getAttribute('data-bp-lg'), '3');
  assert.strictEqual(col.getAttribute('data-bp-xl'), '2');
  // 基础 span 行为不变（内联 gridColumn）
  assert.strictEqual(col.style.gridColumn, 'span 4');
});

test('col：断点值支持 "span/offset" 组合（须双引号）', () => {
  const col = renderFirst('[row][col span:6 xs:"12/0" sm:"6/2" 内容][/row]', 'col');
  assert.strictEqual(col.getAttribute('data-bp-xs'), '12');
  assert.strictEqual(col.getAttribute('data-bp-sm'), '6');
  assert.strictEqual(col.getAttribute('data-bp-sm-off'), '2');
  assert.strictEqual(col.getAttribute('data-bp-xs-off'), null); // offset 0 非法 → 不落
});

test('col：非法断点值静默丢弃（越界/非数字），合法档不受影响', () => {
  const col = renderFirst('[row][col span:4 xs:0 sm:13 md:abc lg:6 内容][/row]', 'col');
  assert.strictEqual(col.getAttribute('data-bp-xs'), null); // 0 越界
  assert.strictEqual(col.getAttribute('data-bp-sm'), null); // 13 越界
  assert.strictEqual(col.getAttribute('data-bp-md'), null); // 非数字
  assert.strictEqual(col.getAttribute('data-bp-lg'), '6');  // 合法
});

test('col：断点 offset 越界（0/12）不落，span 仍生效', () => {
  const col = renderFirst('[row][col span:6 xs:"8/12" sm:"8/0" 内容][/row]', 'col');
  assert.strictEqual(col.getAttribute('data-bp-xs'), '8');
  assert.strictEqual(col.getAttribute('data-bp-xs-off'), null);
  assert.strictEqual(col.getAttribute('data-bp-sm'), '8');
  assert.strictEqual(col.getAttribute('data-bp-sm-off'), null);
});

test('col：不写断点属性时行为与旧版完全一致（无 data-bp-*）', () => {
  const col = renderFirst('[row][col span:6 offset:2 内容][/row]', 'col');
  assert.strictEqual(col.getAttribute('data-bp-xs'), null);
  assert.strictEqual(col.className, 'tokui-col tokui-col--6');
});

// ========== grid 断点列数 ==========

test('grid：xs/sm/md/lg/xl 断点列数落 data-bp-cols-*（外包 .tokui-grid-cq 容器 wrapper）', () => {
  const wrap = renderFirst('[grid cols:"auto:280px" xs:1 sm:2 md:3 lg:4 xl:6]x[/grid]', 'grid');
  assert.strictEqual(wrap.className, 'tokui-grid-cq');
  const grid = wrap.querySelector('.tokui-grid');
  assert.strictEqual(grid.getAttribute('data-bp-cols-xs'), '1');
  assert.strictEqual(grid.getAttribute('data-bp-cols-sm'), '2');
  assert.strictEqual(grid.getAttribute('data-bp-cols-md'), '3');
  assert.strictEqual(grid.getAttribute('data-bp-cols-lg'), '4');
  assert.strictEqual(grid.getAttribute('data-bp-cols-xl'), '6');
});

test('grid：非法断点列数丢弃（0/13/abc），无合法档时不包 wrapper', () => {
  const dom = renderFirst('[grid xs:0 sm:13 md:xx]x[/grid]', 'grid');
  assert.strictEqual(dom.className, 'tokui-grid'); // 全部非法 → 无 wrapper，结构不变
  const wrap = renderFirst('[grid xs:0 sm:13 md:xx lg:3]x[/grid]', 'grid');
  const grid = wrap.querySelector('.tokui-grid');
  assert.strictEqual(grid.getAttribute('data-bp-cols-xs'), null);
  assert.strictEqual(grid.getAttribute('data-bp-cols-sm'), null);
  assert.strictEqual(grid.getAttribute('data-bp-cols-md'), null);
  assert.strictEqual(grid.getAttribute('data-bp-cols-lg'), '3');
});

// ========== CSS 段完整性（静态扫描） ==========

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'tokui.css'), 'utf8');

test('CSS：row/grid-cq 声明 container-type，断点段整体 @supports 包裹', () => {
  assert.ok(/\.tokui-row, \.tokui-grid-cq \{ container-type: inline-size; \}/.test(css), '缺 container-type 声明');
  assert.ok(/@supports \(container-type: inline-size\)/.test(css), '缺 @supports 包裹');
});

test('CSS：@container 递增覆盖（sm/md/lg/xl min-width）与 xs 基础档', () => {
  for (const bp of ['sm', 'md', 'lg', 'xl']) {
    assert.ok(new RegExp(`@container \\(min-width: [\\d.]+px\\)`).test(css), '缺 @container 规则');
  }
  assert.ok(/\.tokui-col\[data-bp-xs\] \{ grid-column: span var\(--bp-xs\) !important; \}/.test(css), '缺 xs 基础档应用规则');
});

test('CSS：span×12 / offset×11 变量桥接 + grid×12 逐值枚举齐全（每档）', () => {
  const bpCount = (re) => (css.match(re) || []).length;
  // 5 档 × 12 值（col span 变量桥接）
  assert.strictEqual(bpCount(/--bp-(?:xs|sm|md|lg|xl): \d+;/g), 60);
  // 5 档 × 11 offset 值
  assert.strictEqual(bpCount(/--bp-(?:xs|sm|md|lg|xl)-off: \d+;/g), 55);
  // 5 档 × 12 grid 列数（枚举完整声明——repeat() 计数位不接受 var()，Chromium 整条 invalid）
  assert.strictEqual(bpCount(/\.tokui-grid\[data-bp-cols-(?:xs|sm|md|lg|xl)="\d+"\] \{ grid-template-columns: repeat\(\d+, minmax\(0, 1fr\)\) !important; \}/g), 60);
});

test('CSS：断点应用规则用 !important 压过内联与 640 兜底', () => {
  assert.ok(/\.tokui-col\[data-bp-sm\] \{ grid-column: span var\(--bp-sm\) !important; \}/.test(css));
  assert.ok(/\.tokui-grid\[data-bp-cols-lg="4"\] \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important; \}/.test(css));
});

// ========== 流式路径 ==========

test('流式：feed 分片下断点属性完整落点', () => {
  const container = document.createElement('div');
  const tokui = new TokUIClass({ container, streaming: true });
  tokui.startStream(container);
  tokui.feed('[row][col span:4 xs');
  tokui.feed(':12 sm:6 卡片][/col][/row]');
  tokui.endStream();
  const col = (function find(root) {
    for (const c of (root.childNodes || [])) {
      if (c.nodeType === 1 && c.className && c.className.indexOf('tokui-col') >= 0) return c;
      const f = find(c);
      if (f) return f;
    }
    return null;
  })(container);
  assert.ok(col, 'col 应已渲染');
  assert.strictEqual(col.getAttribute('data-bp-xs'), '12');
  assert.strictEqual(col.getAttribute('data-bp-sm'), '6');
});

run();
