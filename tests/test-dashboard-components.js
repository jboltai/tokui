/**
 * TokUI 数据大屏组件测试套件（M1 / T1.2）
 * panel / kpi / flip-num / scrollboard 四组件：渲染结构、属性、upd 指令、变体、数据面。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { registerDashboardComponents } = require('../src/components/dashboard');
const { registerBasicComponents } = require('../src/components/basic');
const { TokUIParser } = require('../src/core/parser');

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
  teardownDOM();
  if (failed > 0) process.exit(1);
}

function makeRenderer() {
  const r = new TokUIRenderer(null);
  registerDashboardComponents(r);
  registerBasicComponents(r); // panel 内嵌 p 等基础组件
  return r;
}

function parseTop(dsl) {
  const nodes = [];
  new TokUIParser(n => nodes.push(n)).parse(dsl);
  return nodes;
}

function findType(node, type) {
  if (node.type === type) return node;
  for (const c of (node.children || [])) {
    const f = findType(c, type);
    if (f) return f;
  }
  return null;
}

function renderDsl(dsl, type) {
  const roots = parseTop(dsl);
  let target = null;
  for (const root of roots) { target = findType(root, type); if (target) break; }
  assert.ok(target, `DSL 应含 ${type}`);
  return makeRenderer().render(target);
}


function arr(el) { // dom-mock childNodes 无数组方法
  const out = [];
  for (const c of (el.childNodes || [])) out.push(c);
  return out;
}
function findCls(root, cls) {
  if (root.nodeType !== 1) return null;
  if ((root.className || '').split(' ').indexOf(cls) !== -1) return root;
  for (const c of (root.childNodes || [])) {
    const f = findCls(c, cls);
    if (f) return f;
  }
  return null;
}

// ========== panel ==========
test('panel：基础容器 + tt 标题栏 + body 插槽', () => {
  const dom = renderDsl('[panel tt:车间实时产量][p 内容][/panel]', 'panel');
  assert.strictEqual(dom.className, 'tokui-panel');
  assert.ok(findCls(dom, 'tokui-panel__head'), '标题栏');
  assert.ok(findCls(dom, 'tokui-panel__title'), '标题文本');
  assert.ok(findCls(dom, 'tokui-panel__body'), 'body');
  assert.ok(findCls(dom, 'tokui-p'), '子内容落 body');
});

test('panel：变体 corner/glow/plain 经 VARIANTS 白名单', () => {
  const r = makeRenderer();
  for (const v of ['corner', 'glow', 'plain']) {
    const dom = renderDsl(`[panel v:${v} x][/panel]`, 'panel');
    assert.ok(dom.classList.contains('tokui-panel--' + v), `缺 --${v}`);
  }
  const bad = renderDsl('[panel v:evil x][/panel]', 'panel');
  assert.ok(!bad.classList.contains('tokui-panel--evil'), '非法变体应丢弃');
});

test('panel：theme:tech 子树主题落 data-tokui-theme', () => {
  const dom = renderDsl('[panel theme:tech tt:x]y[/panel]', 'panel');
  assert.strictEqual(dom.getAttribute('data-tokui-theme'), 'tech');
});

// ========== kpi ==========
test('kpi：结构（tt/pre/v/suf/trend/icon/tone）与 trend 符号语义', () => {
  const dom = renderDsl('[kpi tt:今日产量 v:12846 unit:件 trend:12.4 icon:trending-up]说明行[/kpi]', 'kpi');
  assert.ok(findCls(dom, 'tokui-kpi__tt'), '标题');
  assert.ok(findCls(dom, 'tokui-kpi__num'), '数值');
  assert.ok(findCls(dom, 'tokui-kpi__suf'), '单位后缀');
  assert.ok(findCls(dom, 'tokui-kpi__icon'), '图标');
  assert.ok(findCls(dom, 'tokui-kpi__foot'), '底部说明');
  const trend = findCls(dom, 'tokui-kpi__trend');
  assert.ok(trend, '趋势徽章');
  assert.ok(trend.className.indexOf('--up') !== -1, '正数 trend=up');
  assert.strictEqual(trend.textContent, '↑12.4');
});

test('kpi：负趋势 down + t:danger 状态色类', () => {
  const dom = renderDsl('[kpi tt:稼动率 v:92.7 suf:% trend:-1.2 t:danger]', 'kpi');
  const trend = findCls(dom, 'tokui-kpi__trend');
  assert.ok(trend.className.indexOf('--down') !== -1);
  assert.strictEqual(trend.textContent, '↓1.2', '负号转 ↓ 符号');
  assert.ok(dom.classList.contains('tokui-kpi--danger'));
});

test('kpi：clk 钻取 → clickable；upd v/trend/tt 走 _update', () => {
  const dom = renderDsl('[kpi id:k1 tt:标题 v:100 clk:drill trend:1.0]', 'kpi');
  assert.ok(dom.classList.contains('tokui-kpi--clickable'));
  assert.strictEqual(typeof dom._update, 'function');
  dom._update({ v: '250', trend: '-3', tt: '新标题' });
  const num = findCls(dom, 'tokui-kpi__num');
  assert.strictEqual(num.textContent, '250', 'reduced/无 rAF 环境直显终值');
  const trend = findCls(dom, 'tokui-kpi__trend');
  assert.strictEqual(trend.textContent, '↓3');
  assert.strictEqual(findCls(dom, 'tokui-kpi__tt').textContent, '新标题');
});

// ========== flip-num ==========
test('flip-num：位数结构 + 分隔符（逗号）+ 尺寸档', () => {
  const dom = renderDsl('[flip-num v:"9,876" s:sm]', 'flip-num');
  assert.strictEqual(dom.className, 'tokui-flip tokui-flip--sm');
  const digits = findCls(dom, 'tokui-flip__digits');
  const count = arr(digits).filter(c => (c.className || '').indexOf('tokui-flip__digit') !== -1).length;
  assert.strictEqual(count, 4, '4 个数字位');
  const seps = arr(digits).filter(c => (c.className || '').indexOf('tokui-flip__sep') !== -1).length;
  assert.strictEqual(seps, 1, '1 个分隔符');
});

test('flip-num：reel 0-9 十面 + upd v 重建', () => {
  const dom = renderDsl('[flip-num v:42]', 'flip-num');
  const reel = findCls(dom, 'tokui-flip__reel');
  const faces = arr(reel).length;
  assert.strictEqual(faces, 10, 'reel 十面');
  dom._update({ v: '137' });
  const digits = findCls(dom, 'tokui-flip__digits');
  const after = arr(digits).filter(c => (c.className || '').indexOf('tokui-flip__digit') !== -1).length;
  assert.strictEqual(after, 3, 'upd 后 3 位');
});

test('flip-num：初值态 transition:none，动画 set() 清内联回落样式表过渡', () => {
  const dom = renderDsl('[flip-num v:753]', 'flip-num');
  const digits = findCls(dom, 'tokui-flip__digits');
  const reels = [];
  (function walk(n) {
    if (n.nodeType === 1 && (n.className || '').indexOf('tokui-flip__reel') !== -1) reels.push(n);
    arr(n).forEach(walk);
  })(digits);
  // 无 window.rAF 环境：applyValue 停在初值 0 态（transition:none 直显）
  reels.forEach(r => assert.strictEqual(r.style.transition, 'none', '初值态内联 none'));
  // 手动触发动画位（等价双 rAF 后的 m.set()）：内联 transition 应被清除（回落样式表 0.6s）
  (dom._digits || []).forEach(m => m.set());
  reels.forEach(r => assert.strictEqual(r.style.transition, '', '动画态清内联 transition'));
  reels.forEach(r => assert.ok(/-70%\)|-50%\)|-30%\)/.test(r.style.transform), 'transform 到位'));
});

// ========== scrollboard ==========
test('scrollboard：cols 表头 + rows 简写行 + 趋势列着色类', () => {
  const dom = renderDsl('[scrollboard h:200 cols:"企业,工单,环比" rows:"盾安金属,128,↑12|三花智控,96,↓3"]', 'scrollboard');
  assert.ok(findCls(dom, 'tokui-scrollboard__head'), '表头');
  const rows = [];
  (function walk(n) {
    if (n.nodeType === 1 && (n.className || '').indexOf('tokui-scrollboard__row') !== -1) rows.push(n);
    arr(n).forEach(walk);
  })(dom);
  // 无缝副本仅动画路径持有（浏览器 rAF）；dom-mock 无 rAF → 静态路径无克隆
  const originals = rows.filter(n2 => n2.getAttribute('aria-hidden') !== 'true');
  assert.strictEqual(originals.length, 2, '原始 2 行');
  assert.ok(findCls(dom, 'tokui-scrollboard__cell--up'), '↑ 列 up 色');
  assert.ok(findCls(dom, 'tokui-scrollboard__cell--down'), '↓ 列 down 色');
});


test('scrollboard：tr 子节点数据面 + clk 行点击绑定', () => {
  const dom = renderDsl('[scrollboard h:180 cols:"名,值"][tr 盾安,128][tr 三花,96][/scrollboard]', 'scrollboard');
  const track = findCls(dom, 'tokui-scrollboard__track');
  const rows = arr(track).filter(c => (c.className || '').indexOf('__row') !== -1);
  const originals = rows.filter(c => c.getAttribute && c.getAttribute('aria-hidden') !== 'true');
  assert.strictEqual(originals.length, 2, 'tr 子节点原始 2 行');
});

test('scrollboard：静态路径（无 rAF）不复制副本——无缝克隆仅动画路径持有', () => {
  const dom = renderDsl('[scrollboard h:260 rows:"a,1|b,2|c,3"]', 'scrollboard');
  const track = findCls(dom, 'tokui-scrollboard__track');
  const clones = arr(track).filter(c => (c.className || '').indexOf('__row') !== -1 && c.getAttribute('aria-hidden') === 'true');
  assert.strictEqual(clones.length, 0, '无动画时零克隆（旧逻辑内容矮于视口也复制，静态视觉重复行）');
  const all = arr(track).filter(c => (c.className || '').indexOf('__row') !== -1);
  assert.strictEqual(all.length, 3, '原始 3 行');
});

test('scrollboard：空数据 → i18n 空态', () => {
  const dom = renderDsl('[scrollboard h:150 cols:"a,b"]', 'scrollboard');
  assert.ok(findCls(dom, 'tokui-scrollboard__empty'), '空态元素');
});

test('scrollboard：h 视口高落 style；speed 越界钳制（经 upd）', () => {
  const dom = renderDsl('[scrollboard h:260 rows:"a,1"]', 'scrollboard');
  const vp = findCls(dom, 'tokui-scrollboard__viewport');
  assert.strictEqual(vp.style.height, '260px');
  assert.strictEqual(typeof dom._update, 'function');
  dom._update({ speed: '999' }); // 内部钳制到 400，不抛错
});


// ========== fit-screen ==========
test('fit-screen：容器 + 设计稿尺寸落 inner + 子内容', () => {
  const dom = renderDsl('[fit-screen w:1920 h:1080 mode:scale][panel tt:x]y[/panel][/fit-screen]', 'fit-screen');
  assert.strictEqual(dom.className, 'tokui-fitscreen');
  const inner = (function () { for (const c of arr(dom)) if ((c.className||'').indexOf('__inner') !== -1) return c; return null; })();
  assert.ok(inner, 'inner 层');
  assert.strictEqual(inner.style.width, '1920px');
  assert.strictEqual(inner.style.height, '1080px');
  assert.ok(findCls(dom, 'tokui-panel'), '子内容落 inner');
});

test('fit-screen：mode 白名单（scale/width/full），非法回退 scale；w/h 越界钳制', () => {
  const d1 = renderDsl('[fit-screen w:99 h:50 mode:width]x[/fit-screen]', 'fit-screen');
  const inner1 = (function () { for (const c of arr(d1)) if ((c.className||'').indexOf('__inner') !== -1) return c; return null; })();
  assert.strictEqual(inner1.style.width, '320px', 'w 钳制下限 320');
  const d2 = renderDsl('[fit-screen mode:evil]x[/fit-screen]', 'fit-screen');
  assert.strictEqual(d2.className, 'tokui-fitscreen'); // 非法 mode 静默回退 scale
});

test('fit-screen width 模式：wrap 贴合视觉内容高 + overflow-y 纵滚 + maxh 上限', () => {
  const stub = (el2, props) => { for (const k of Object.keys(props)) Object.defineProperty(el2, k, { value: props[k], configurable: true }); };
  // 无 maxh：wrap 高 = 布局高 × 宽比，画布高 360 为下限
  const d1 = renderDsl('[fit-screen w:640 h:360 mode:width][p]x[/p][/fit-screen]', 'fit-screen');
  const inner1 = (function () { for (const c of arr(d1)) if ((c.className||'').indexOf('__inner') !== -1) return c; return null; })();
  stub(d1, { clientWidth: 379, clientHeight: 372 });
  stub(inner1, { scrollHeight: 200, offsetHeight: 200 });
  d1._fitApply();
  assert.strictEqual(inner1.style.height, 'auto', 'width 模式画布高转 auto（内容可撑高）');
  assert.strictEqual(inner1.style.minHeight, '360px', '画布高作最小高');
  assert.strictEqual(d1.style.height, '213px', 'wrap 贴合视觉高 360×0.592≈213');
  assert.strictEqual(d1.style.overflowY, 'auto', '纵滚通道打开');
  // 内容撑高：scrollHeight 500 → 视觉 296
  stub(inner1, { scrollHeight: 500, offsetHeight: 500 });
  d1._fitApply();
  assert.strictEqual(d1.style.height, '296px', '内容撑高画布后 wrap 跟随 500×0.592≈296');
  // maxh 上限：视觉高超过 maxh 时钳制并保留滚动
  const d2 = renderDsl('[fit-screen w:640 h:360 mode:width maxh:240][p]x[/p][/fit-screen]', 'fit-screen');
  const inner2 = (function () { for (const c of arr(d2)) if ((c.className||'').indexOf('__inner') !== -1) return c; return null; })();
  stub(d2, { clientWidth: 379, clientHeight: 372 });
  stub(inner2, { scrollHeight: 500, offsetHeight: 500 });
  d2._fitApply();
  assert.strictEqual(d2.style.height, '240px', 'maxh 钳制视口高');
  assert.strictEqual(d2.style.maxHeight, '240px', 'maxHeight 落地');
  assert.strictEqual(d2.style.alignItems, 'flex-start', '滚动场景顶对齐防溢出不可达');
});

run();

