/**
 * TokUI 滚动入场组件测试套件（T3.2 摘出）
 * reveal / reveal-item：渲染结构、变体白名单、delay、渐进增强降级（无 IO / reduced-motion）、
 * mock IO 进出场、流式分片、_streamCloseHook 克制定格（视口内/已看过不重放、折叠区保留）、
 * destroy 清理、builder 链式。
 * 另覆盖四视觉变体白名单：btn v:gradient / h1-h6 v:gradient / card v:glass / v:gradient-border。
 */
'use strict';

const assert = require('assert');
const { setupDOM, createElement } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const eventBus = require('../src/core/event-bus');
const { registerRevealComponents } = require('../src/components/reveal');
const { registerBasicComponents } = require('../src/components/basic');
const { registerLayoutComponents } = require('../src/components/layout');
const { registerFormComponents } = require('../src/components/form');
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
  teardownDOMSafe();
  if (failed > 0) process.exit(1);
}

function teardownDOMSafe() {
  try { require('./helpers/dom-mock').teardownDOM(); } catch (e) { /* ignore */ }
}

function makeRenderer() {
  const r = new TokUIRenderer(eventBus);
  registerBasicComponents(r);
  registerLayoutComponents(r);
  registerFormComponents(r);
  registerRevealComponents(r);
  return r;
}

function parseTop(dsl) {
  const nodes = [];
  new TokUIParser(n => nodes.push(n)).parse(dsl);
  return nodes;
}

// —— mock IntersectionObserver：构造即记录实例，回调由测试手动驱动 ——
function installMockIO() {
  const instances = [];
  global.IntersectionObserver = function (cb, opts) {
    this.cb = cb; this.opts = opts;
    this.observing = []; this.disconnected = false;
    instances.push(this);
  };
  global.IntersectionObserver.prototype.observe = function (t) { this.observing.push(t); };
  global.IntersectionObserver.prototype.disconnect = function () { this.disconnected = true; };
  global.IntersectionObserver.prototype.fire = function (intersecting) {
    const self = this;
    self.cb(self.observing.map(t => ({ target: t, isIntersecting: intersecting })));
  };
  return instances;
}

function uninstallMockIO() { delete global.IntersectionObserver; }

// =============================================
// 渲染结构 / 属性
// =============================================

test('reveal：渲染结构 + 子元素挂载 + _tokuiType 盖章', () => {
  const r = makeRenderer();
  const nodes = parseTop('[reveal][card tt:A][/card][card tt:B][/card][/reveal]');
  const dom = r.render(nodes[0]);
  assert.strictEqual(dom.className, 'tokui-reveal');
  assert.strictEqual(dom._tokuiType, 'reveal');
  assert.strictEqual(dom._slot, dom);
  const cards = dom.querySelectorAll('.tokui-card');
  assert.strictEqual(cards.length, 2, '两个 card 子元素应挂载');
});

test('reveal：方向变体 v:zoom/left/right 落类；非法 v:foo 静默丢弃', () => {
  const r = makeRenderer();
  const dom = r.render(parseTop('[reveal v:zoom][p x][/reveal]')[0]);
  assert.ok(dom.classList.contains('tokui-reveal--zoom'));
  const dom2 = r.render(parseTop('[reveal v:left][p x][/reveal]')[0]);
  assert.ok(dom2.classList.contains('tokui-reveal--left'));
  const bad = r.render(parseTop('[reveal v:foo][p x][/reveal]')[0]);
  assert.strictEqual(bad.className, 'tokui-reveal', '非法变体不得落类');
});

test('reveal：delay:N 落 CSS 变量；非法 delay（负数/超限/非数字）丢弃', () => {
  const r = makeRenderer();
  const dom = r.render(parseTop('[reveal delay:120][p x][/reveal]')[0]);
  assert.strictEqual(dom.style['--tokui-reveal-delay'], '120ms');
  const neg = r.render(parseTop('[reveal delay:-50][p x][/reveal]')[0]);
  assert.strictEqual(neg.style['--tokui-reveal-delay'], undefined);
  const over = r.render(parseTop('[reveal delay:99999][p x][/reveal]')[0]);
  assert.strictEqual(over.style['--tokui-reveal-delay'], undefined);
});

test('reveal-item：可选包装容器渲染 + 子内容挂载', () => {
  const r = makeRenderer();
  const dom = r.render(parseTop('[reveal][reveal-item][card tt:A][/card][/reveal-item][/reveal]')[0]);
  const item = dom.querySelector('.tokui-reveal-item');
  assert.ok(item, 'reveal-item 应渲染');
  assert.strictEqual(item._tokuiType, 'reveal-item');
  assert.strictEqual(item.querySelectorAll('.tokui-card').length, 1);
});

// =============================================
// 渐进增强：降级路径（内容永不见丢失）
// =============================================

test('降级：无 IntersectionObserver 环境不加 --arm（内容直接可见）', () => {
  const r = makeRenderer();
  const dom = r.render(parseTop('[reveal][p 内容][/reveal]')[0]);
  assert.ok(!dom.classList.contains('tokui-reveal--arm'));
  assert.ok(!dom.classList.contains('tokui-reveal--in'));
});

test('降级：prefers-reduced-motion 不加 --arm', () => {
  const instances = installMockIO();
  global.window = { matchMedia: function (q) { return { matches: true, media: q }; }, TokUI: { _internal: {} }, addEventListener: function () {}, removeEventListener: function () {} };
  try {
    const r = makeRenderer();
    const dom = r.render(parseTop('[reveal][p x][/reveal]')[0]);
    assert.ok(!dom.classList.contains('tokui-reveal--arm'));
    assert.strictEqual(instances.length, 0, 'reduced-motion 不建 IO');
  } finally {
    delete global.window;
    uninstallMockIO();
  }
});

// =============================================
// mock IO：进场 / 出场 / 清理
// =============================================

test('mock IO：注册即 observe（不预隐藏）；首次相交激活 arm+in 并 disconnect', () => {
  const instances = installMockIO();
  try {
    const r = makeRenderer();
    const dom = r.render(parseTop('[reveal][p x][/reveal]')[0]);
    assert.strictEqual(instances.length, 1);
    assert.ok(!dom.classList.contains('tokui-reveal--arm'), '激活前不预隐藏（视口外隐藏无意义）');
    assert.ok(instances[0].observing.includes(dom));
    instances[0].fire(true);
    assert.ok(dom.classList.contains('tokui-reveal--arm'), '激活应落隐藏态类');
    assert.ok(dom.classList.contains('tokui-reveal--in'), '激活应落进场态类');
    assert.ok(instances[0].disconnected, '进场后应断开观察');
  } finally { uninstallMockIO(); }
});

test('mock IO：不相交保持无类（可见）；相交后激活一次性放行', () => {
  const instances = installMockIO();
  try {
    const r = makeRenderer();
    const dom = r.render(parseTop('[reveal v:up][p x][/reveal]')[0]);
    instances[0].fire(false);
    assert.strictEqual(dom.className, 'tokui-reveal tokui-reveal--up', '未相交不加任何类');
    instances[0].fire(true);
    assert.ok(dom.classList.contains('tokui-reveal--in'));
  } finally { uninstallMockIO(); }
});

test('清理：renderer.destroy() 后 IO disconnect（_registerCleanup 幂等）', () => {
  const instances = installMockIO();
  try {
    const r = makeRenderer();
    r.render(parseTop('[reveal][p x][/reveal]')[0]);
    assert.ok(!instances[0].disconnected);
    r.destroy();
    assert.ok(instances[0].disconnected, 'destroy 应解绑 observer');
  } finally { uninstallMockIO(); }
});

// =============================================
// 流式：分片 feed（半标签/属性中间截断）+ 闭合钩子
// =============================================

function streamRender(dsl) {
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  ui.startStream();
  for (let i = 0; i < dsl.length; i += 7) ui.feed(dsl.slice(i, i + 7));
  ui.endStream();
  return container;
}

test('流式：reveal 分片渲染与一次性结构等价', () => {
  uninstallMockIO(); // 无 IO 环境：内容可见
  const dsl = '[reveal v:up delay:80][reveal-item][card tt:甲][/card][/reveal-item][reveal-item][card tt:乙][/card][/reveal-item][/reveal]';
  const dom = streamRender(dsl).querySelector('.tokui-reveal');
  assert.ok(dom, '流式应渲染出 reveal 容器');
  assert.strictEqual(dom.querySelectorAll('.tokui-card').length, 2);
  assert.ok(dom.classList.contains('tokui-reveal--up'));
});

test('流式闭合钩子（克制版）：闭合时在视口内 → 不重放，直接定格（--in、无 --arm、IO 断开）', () => {
  const instances = installMockIO();
  global.window = { innerHeight: 800, TokUI: { _internal: {} }, addEventListener: function () {}, removeEventListener: function () {} };
  try {
    const r = makeRenderer();
    const dom = r.render(parseTop('[reveal][p x][/reveal]')[0]);
    dom.getBoundingClientRect = function () { return { top: 100, bottom: 300, height: 200 }; };
    dom._streamCloseHook();
    assert.ok(!dom.classList.contains('tokui-reveal--arm'), '克制版：用户正看着，不得瞬隐重放');
    assert.ok(dom.classList.contains('tokui-reveal--in'), '应定格可见完成态（补 --in 标记）');
    assert.ok(instances[0].disconnected, '定格后应断开观察');
    instances[0].fire(true); // 断开后误触发也不得激活
    assert.ok(!dom.classList.contains('tokui-reveal--arm'), '定格后 IO 回调不得再激活');
  } finally { delete global.window; uninstallMockIO(); }
});

test('流式闭合钩子：闭合时不在视口 → 保持未激活，滚动相交时由 IO 触发入场', () => {
  const instances = installMockIO();
  global.window = { innerHeight: 800, TokUI: { _internal: {} }, addEventListener: function () {}, removeEventListener: function () {} };
  try {
    const r = makeRenderer();
    const dom = r.render(parseTop('[reveal][p x][/reveal]')[0]);
    dom.getBoundingClientRect = function () { return { top: 2000, bottom: 2200, height: 200 }; };
    dom._streamCloseHook();
    assert.strictEqual(dom.className, 'tokui-reveal', '折叠区闭合不加类（等滚动触发）');
    instances[0].fire(true); // 用户滚动相交（closed=true，流式标志不再拦截）
    assert.ok(dom.classList.contains('tokui-reveal--in'), '滚动相交应触发入场');
  } finally { delete global.window; uninstallMockIO(); }
});

test('流式（克制版）：流式中看过 → 闭合时不重放，滚回也不再动画', () => {
  const instances = installMockIO();
  global.window = { innerHeight: 800, TokUI: { _internal: {} }, addEventListener: function () {}, removeEventListener: function () {} };
  try {
    const r = makeRenderer();
    const dom = r.render(parseTop('[reveal][p x][/reveal]')[0]);
    dom._tokuiStreamActive = true; // 模拟流式挂载标记（renderer 于挂载后落）
    instances[0].fire(true);       // 流式输出 transit 视口 → 不激活，仅记「已看过」
    assert.strictEqual(dom.className, 'tokui-reveal', '流式中相交不激活不烧入场');
    dom.getBoundingClientRect = function () { return { top: 2000, bottom: 2200, height: 200 }; };
    dom._streamCloseHook();        // 闭合时已滚出视口，但流式期间看过 → 克制定格
    assert.ok(!dom.classList.contains('tokui-reveal--arm'), '看过的内容不得瞬隐重放');
    assert.ok(dom.classList.contains('tokui-reveal--in'), '应定格完成态');
    assert.ok(instances[0].disconnected, '不再保留滚动入场观察');
    instances[0].fire(true);       // 断开后误触发也不得激活
    assert.ok(!dom.classList.contains('tokui-reveal--arm'), '断开后回调不得再激活');
  } finally { delete global.window; uninstallMockIO(); }
});

test('流式（克制版）：全程折叠区（从未看过）→ 闭合后保留 IO，滚动相交一次性入场', () => {
  const instances = installMockIO();
  global.window = { innerHeight: 800, TokUI: { _internal: {} }, addEventListener: function () {}, removeEventListener: function () {} };
  try {
    const r = makeRenderer();
    const dom = r.render(parseTop('[reveal][p x][/reveal]')[0]);
    dom._tokuiStreamActive = true; // 全程流式但始终在折叠区（IO 未相交过）
    dom.getBoundingClientRect = function () { return { top: 2000, bottom: 2200, height: 200 }; };
    dom._streamCloseHook();
    assert.strictEqual(dom.className, 'tokui-reveal', '从未看过：不定格，等滚动触发');
    assert.ok(!instances[0].disconnected, '折叠区组保留 IO');
    instances[0].fire(true);       // 用户滚动相交（closed=true，流式标志不再拦截）
    assert.ok(dom.classList.contains('tokui-reveal--arm'), '一次性入场从隐藏态起播');
    assert.ok(dom.classList.contains('tokui-reveal--in'), '滚动相交应触发入场');
    assert.ok(instances[0].disconnected, '入场后断开观察');
  } finally { delete global.window; uninstallMockIO(); }
});

test('流式闭合（裁剪感知）：内层滚动区折叠区里的组不算可见 → 保留 IO 等滚动入场', () => {
  const instances = installMockIO();
  const host = createElement('div'); // 模拟 scroll-area 内层视口（overflow:auto + 内容溢出裁剪）
  global.window = { innerHeight: 800, getComputedStyle: function () { return { overflow: 'auto', overflowY: 'auto' }; }, TokUI: { _internal: {} }, addEventListener: function () {}, removeEventListener: function () {} };
  try {
    const r = makeRenderer();
    const dom = r.render(parseTop('[reveal][p x][/reveal]')[0]);
    host.appendChild(dom);
    // 组几何在窗口内（top 300 < 800），但被祖先滚动容器 0~200 裁剪——真实浏览器里 IO 同样不相交
    dom.getBoundingClientRect = function () { return { top: 300, bottom: 500, height: 200, left: 0, right: 300 }; };
    host.getBoundingClientRect = function () { return { top: 0, bottom: 200, height: 200, left: 0, right: 300 }; };
    host.scrollHeight = 1500; host.clientHeight = 200;
    dom._streamCloseHook();
    assert.ok(!dom.classList.contains('tokui-reveal--in'), '被内层折叠区裁剪的组不得克制定格');
    assert.ok(!instances[0].disconnected, '保留 IO 等内层滚动触发');
    instances[0].fire(true); // 用户滚动内层容器，组进入可视区 → 一次性入场
    assert.ok(dom.classList.contains('tokui-reveal--arm'), '内层滚动相交应触发入场（arm）');
    assert.ok(dom.classList.contains('tokui-reveal--in'), '内层滚动相交应触发入场（in）');
  } finally { delete global.window; uninstallMockIO(); }
});

test('流式闭合（裁剪感知对照）：祖先不裁剪时几何可见即克制定格', () => {
  const instances = installMockIO();
  const host = createElement('div');
  global.window = { innerHeight: 800, getComputedStyle: function () { return { overflow: 'visible', overflowY: 'visible' }; }, TokUI: { _internal: {} }, addEventListener: function () {}, removeEventListener: function () {} };
  try {
    const r = makeRenderer();
    const dom = r.render(parseTop('[reveal][p x][/reveal]')[0]);
    host.appendChild(dom);
    dom.getBoundingClientRect = function () { return { top: 300, bottom: 500, height: 200, left: 0, right: 300 }; };
    host.getBoundingClientRect = function () { return { top: 0, bottom: 800, height: 800, left: 0, right: 300 }; };
    host.scrollHeight = 900; host.clientHeight = 800; // 未溢出，且 overflow visible 不裁剪
    dom._streamCloseHook();
    assert.ok(dom.classList.contains('tokui-reveal--in'), '无裁剪 + 几何可见 → 克制定格');
    assert.ok(!dom.classList.contains('tokui-reveal--arm'), '定格不瞬隐');
    assert.ok(instances[0].disconnected, '定格后断开观察');
  } finally { delete global.window; uninstallMockIO(); }
});

// =============================================
// 四视觉变体（T3.2）：白名单 + 类落点
// =============================================

test('变体：btn v:gradient → tokui-btn--gradient；非法 v:neon 不落类', () => {
  const r = makeRenderer();
  const dom = r.render(parseTop('[btn v:gradient tx:开始]')[0]);
  assert.ok(dom.classList.contains('tokui-btn--gradient'));
  const bad = r.render(parseTop('[btn v:neon tx:x]')[0]);
  assert.ok(!bad.classList.contains('tokui-btn--neon'));
});

test('变体：h2 v:gradient → tokui-h2--gradient（h1~h6 全族白名单）', () => {
  const r = makeRenderer();
  for (const lv of [1, 2, 3, 4, 5, 6]) {
    const dom = r.render(parseTop(`[h${lv} v:gradient 标题]`)[0]);
    assert.ok(dom.classList.contains(`tokui-h${lv}--gradient`), `h${lv} gradient 应落类`);
  }
});

test('变体：card v:glass / v:gradient-border 落类', () => {
  const r = makeRenderer();
  const glass = r.render(parseTop('[card v:glass tt:玻璃][/card]')[0]);
  assert.ok(glass.classList.contains('tokui-card--glass'));
  const gb = r.render(parseTop('[card v:gradient-border tt:描边][/card]')[0]);
  assert.ok(gb.classList.contains('tokui-card--gradient-border'));
});

// =============================================
// Builder 链式
// =============================================

test('builder：reveal()/revealItem() 容器方法 + toString', () => {
  const { TokUIBuilder } = require('../src/server/tokui-builder');
  const b = new TokUIBuilder();
  b.reveal({ v: 'up', delay: 120 }).revealItem().card({ tt: 'A' }).end().end().end();
  const out = b.toString();
  assert.ok(out.indexOf('[reveal v:up delay:120]') !== -1, out);
  assert.ok(out.indexOf('[reveal-item]') !== -1);
  assert.ok(out.indexOf('[/reveal]') !== -1);
});

// =============================================
// 回归：gradient 钮 hover 不可读 bug（base .tokui-btn:hover 洗底）
// =============================================

test('回归：btn v:gradient hover 重申背景/文字色（防 base hover 浅底白字）', () => {
  const fs = require('fs');
  const css = fs.readFileSync(require('path').join(__dirname, '../src/styles/tokui.css'), 'utf8');
  const baseHover = css.indexOf('.tokui-btn:hover { background: var(--tokui-stripe); }');
  const gradHover = css.indexOf('.tokui-btn--gradient:hover');
  assert.ok(baseHover !== -1, 'base hover 规则应在');
  assert.ok(gradHover !== -1 && gradHover > baseHover, 'gradient hover 须声明在 base hover 之后（同特异性靠后者胜）');
  const block = css.slice(gradHover, css.indexOf('}', gradHover));
  assert.ok(/background:\s*linear-gradient/.test(block), 'hover 须重申渐变背景');
  assert.ok(/color:\s*var\(--tokui-btn-text-inverse/.test(block), 'hover 须重申反白文字色');
});

test('回归：glass 规则源码只写标准 backdrop-filter（手写 -webkit- 会令 Lightning 构建丢失标准属性）', () => {
  const fs = require('fs');
  const css = fs.readFileSync(require('path').join(__dirname, '../src/styles/tokui.css'), 'utf8');
  const i = css.indexOf('.tokui-card--glass');
  assert.ok(i !== -1);
  const block = css.slice(i, css.indexOf('}', i));
  assert.ok(/backdrop-filter:\s*blur\(/.test(block), '须有标准 backdrop-filter');
  assert.ok(!/-webkit-backdrop-filter/.test(block), '源码勿手写 -webkit- 前缀（构建器自动补全；手写会触发合并丢标准属性）');
});

test('回归：reveal 过渡只在 --in 态（arm 隐藏态带过渡会与进场折返抵消、全程无动画）', () => {
  const fs = require('fs');
  const css = fs.readFileSync(require('path').join(__dirname, '../src/styles/tokui.css'), 'utf8');
  const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
  const armI = css.indexOf('.tokui-reveal--arm > * {');
  const armBlock = stripComments(css.slice(armI, css.indexOf('}', armI)));
  assert.ok(/opacity:\s*0/.test(armBlock), 'arm 隐藏态在');
  assert.ok(!/transition/.test(armBlock), 'arm 态不得带 transition（瞬隐）');
  const inI = css.indexOf('.tokui-reveal--in > * {');
  const inBlock = css.slice(inI, css.indexOf('}', inI));
  assert.ok(/transition:\s*opacity/.test(inBlock), '过渡须在 --in 态上启用');
  assert.ok(css.includes('.tokui-reveal--in > *:nth-child(2)'), 'stagger 延迟须随过渡落在 --in 态');
});

test('回归：--in 覆盖规则特异性须 ≥ 方向规则（单类会被 --arm.--left 等双类压过、transform 冻结在起点）', () => {
  const fs = require('fs');
  const css = fs.readFileSync(require('path').join(__dirname, '../src/styles/tokui.css'), 'utf8');
  assert.ok(css.includes('.tokui-reveal.tokui-reveal--in > *'), '--in 覆盖须双类选择器（0,2,0）');
  assert.ok(css.includes('.tokui-reveal.tokui-reveal--arm > *'), 'reduced-motion 兜底须双类选择器（0,2,0）');
  // 方向规则声明须在 --in 覆盖之前（平级特异性靠后者胜）
  const dirI = css.indexOf('.tokui-reveal--arm.tokui-reveal--left > *');
  const inI = css.indexOf('.tokui-reveal.tokui-reveal--in > *');
  assert.ok(dirI !== -1 && inI !== -1 && dirI < inI, '--in 规则须声明在方向规则之后');
});

run();
