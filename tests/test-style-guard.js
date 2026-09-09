/**
 * TokUI 样式安全通道测试套件（T0.1）
 * 覆盖 src/core/style-guard.js 的 filterStyle / sanitizeCls 与
 * renderer._applyUserStyle 的全组件根级应用（含流式与注入防御）。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

setupDOM();

const StyleGuard = require('../src/core/style-guard');
const { TokUIRenderer } = require('../src/core/renderer');
const { registerLayoutComponents } = require('../src/components/layout');
const { registerBasicComponents } = require('../src/components/basic');
const { registerFormComponents } = require('../src/components/form');
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
  registerBasicComponents(r);
  registerFormComponents(r);
  return r;
}

function parseOne(dsl) {
  const nodes = [];
  new TokUIParser(n => nodes.push(n)).parse(dsl);
  return nodes[0];
}

function findByClass(root, cls) {
  for (const c of (root.childNodes || [])) {
    if (c.nodeType === 1 && c.className && c.className.indexOf(cls) >= 0) return c;
    const found = findByClass(c, cls);
    if (found) return found;
  }
  return null;
}

// ========== filterStyle 单元 ==========

test('filterStyle：白名单属性放行（background/padding/box-shadow/backdrop-filter/aspect-ratio）', () => {
  var out = StyleGuard.filterStyle('background:#fff;padding:12px 8px;box-shadow:0 2px 8px rgba(0,0,0,.15);backdrop-filter:blur(8px);aspect-ratio:16/9');
  assert.strictEqual(out, 'background: #fff; padding: 12px 8px; box-shadow: 0 2px 8px rgba(0,0,0,.15); backdrop-filter: blur(8px); aspect-ratio: 16/9');
});

test('filterStyle：危险属性拒绝（position/top/left/unknown-prop 全部丢弃）', () => {
  var out = StyleGuard.filterStyle('position:fixed;top:0;left:10px;what-is-this:1px;color:red');
  assert.strictEqual(out, 'color: red');
});

test('filterStyle：值级注入拒绝（expression/javascript:/behavior:/@import/尖括号）', () => {
  assert.strictEqual(StyleGuard.filterStyle('color:expression(alert(1))'), undefined);
  assert.strictEqual(StyleGuard.filterStyle('background:url(javascript:alert(1))'), undefined);
  assert.strictEqual(StyleGuard.filterStyle('color:red;behavior:url(#default#time2)'), 'color: red');
  assert.strictEqual(StyleGuard.filterStyle('background:@import "evil.css"'), undefined);
  assert.strictEqual(StyleGuard.filterStyle('color:re<d'), undefined);
});

test('filterStyle：url() 协议白名单——http(s) 与站内相对路径放行，data:/其它协议拒绝', () => {
  assert.ok(StyleGuard.filterStyle('background-image:url(https://a.com/x.png)').indexOf('https') !== -1);
  assert.ok(StyleGuard.filterStyle('background-image:url("./img/a.png")').indexOf('./img') !== -1);
  assert.ok(StyleGuard.filterStyle('background-image:url(/static/a.webp)').indexOf('/static') !== -1);
  assert.strictEqual(StyleGuard.filterStyle('background-image:url(data:text/html,<script>)'), undefined);
  assert.strictEqual(StyleGuard.filterStyle('background-image:url(ftp://a.com/x.png)'), undefined);
});

test('filterStyle：transform 函数白名单——translate/scale/rotate 放行，matrix 拒绝', () => {
  assert.ok(StyleGuard.filterStyle('transform:translateX(10px) scale(1.05)').indexOf('translateX') !== -1);
  assert.strictEqual(StyleGuard.filterStyle('transform:matrix(1,2,3,4,5,6)'), undefined);
  assert.strictEqual(StyleGuard.filterStyle('transform:translateX(url(javascript:1))'), undefined);
});

test('filterStyle：非法输入（空/非字符串/全被滤除）返回 undefined', () => {
  assert.strictEqual(StyleGuard.filterStyle(''), undefined);
  assert.strictEqual(StyleGuard.filterStyle(null), undefined);
  assert.strictEqual(StyleGuard.filterStyle(123), undefined);
  assert.strictEqual(StyleGuard.filterStyle('position:fixed'), undefined);
});

// ========== sanitizeCls 单元 ==========

test('sanitizeCls：合法类名（单/多/下划线连字符）', () => {
  assert.deepStrictEqual(StyleGuard.sanitizeCls('my-card'), ['my-card']);
  assert.deepStrictEqual(StyleGuard.sanitizeCls('fade-in hover-lift'), ['fade-in', 'hover-lift']);
  assert.deepStrictEqual(StyleGuard.sanitizeCls('a_1 b-2'), ['a_1', 'b-2']);
});

test('sanitizeCls：tokui- 前缀与非法格式丢弃', () => {
  assert.deepStrictEqual(StyleGuard.sanitizeCls('tokui-hack'), null);
  assert.deepStrictEqual(StyleGuard.sanitizeCls('ok tokui-card'), ['ok']);
  assert.deepStrictEqual(StyleGuard.sanitizeCls('1abc'), null);          // 数字开头
  assert.deepStrictEqual(StyleGuard.sanitizeCls('has空间 ok'), ['ok']); // 含非法字符的词丢弃
});

test('sanitizeCls：上限 8 个 + 去重', () => {
  var nine = 'a1 a2 a3 a4 a5 a6 a7 a8 a9';
  assert.strictEqual(StyleGuard.sanitizeCls(nine).length, 8);
  assert.deepStrictEqual(StyleGuard.sanitizeCls('x x x'), ['x']);
  var long = new Array(70).join('a'); // 69 字符 > 64
  assert.strictEqual(StyleGuard.sanitizeCls(long), null);
});

// ========== renderer 集成：全组件根级应用 ==========

test('card：cls 与 style 集中落根元素，白名单外属性被过滤', () => {
  const r = makeRenderer();
  const node = parseOne('[card tt:演示 cls:"my-pricing fade-in" style:"padding:16px;position:fixed" 内容]');
  const dom = r.render(node);
  assert.ok(dom.classList.contains('tokui-card'));
  assert.ok(dom.classList.contains('my-pricing'));
  assert.ok(dom.classList.contains('fade-in'));
  const style = dom.getAttribute('style');
  assert.ok(style.indexOf('padding: 16px') !== -1, 'style 应含 padding: ' + style);
  assert.ok(style.indexOf('position') === -1, 'position 应被过滤: ' + style);
});

test('btn / p / h2：不同类别组件均生效（根元素通道）', () => {
  const r = makeRenderer();
  const btn = r.render(parseOne('[btn tx:按钮 t:primary cls:cta-btn style:"border-radius:16px"]'));
  assert.ok(btn.classList.contains('cta-btn'));
  assert.ok(btn.getAttribute('style').indexOf('border-radius: 16px') !== -1);

  const p = r.render(parseOne('[p 文本 cls:lead style:"font-size:18px"]'));
  assert.ok(p.classList.contains('lead'));
  assert.ok(p.getAttribute('style').indexOf('font-size: 18px') !== -1);

  const h = r.render(parseOne('[h2 标题 cls:"section-title"]'));
  assert.ok(h.classList.contains('section-title'));
});

test('XSS 组合防御：url(javascript:) 与 expression 同时出现时仅保留安全声明', () => {
  const r = makeRenderer();
  const p = r.render(parseOne('[p 文本 style:"color:red;background:url(javascript:alert(1));width:expression(evil())"]'));
  const style = p.getAttribute('style');
  assert.ok(style.indexOf('color: red') !== -1);
  assert.ok(style.indexOf('javascript') === -1);
  assert.ok(style.indexOf('expression') === -1);
});

test('cls 拒绝 tokui- 前缀：不产生任何框架类覆盖', () => {
  const r = makeRenderer();
  const p = r.render(parseOne('[p 文本 cls:tokui-unknown-x]'));
  assert.ok(!p.classList.contains('tokui-unknown-x'));
  assert.strictEqual(p.className, 'tokui-p');
});

test('style 与组件私有属性共存：card w:480 + style:max-width', () => {
  const r = makeRenderer();
  const card = r.render(parseOne('[card tt:卡片 w:480 style:"max-width:100%" x]'));
  assert.strictEqual(card.style.width, '480px');
  assert.ok(card.getAttribute('style').indexOf('max-width: 100%') !== -1);
});

test('流式路径：feed 分片渲染完成后 cls/style 落根', () => {
  const container = document.createElement('div');
  const tokui = new TokUIClass({ container, streaming: true });
  tokui.startStream(container);
  tokui.feed('[card tt:流式 cls:stream-cls style:"padding:8px"');
  tokui.feed(' 流式内容]');
  tokui.endStream();
  const card = findByClass(container, 'tokui-card');
  assert.ok(card, 'card 应已渲染');
  assert.ok(card.classList.contains('stream-cls'));
  assert.ok(card.getAttribute('style').indexOf('padding: 8px') !== -1);
});

test('半标签分片：style 值被 chunk 劈开仍完整恢复', () => {
  const container = document.createElement('div');
  const tokui = new TokUIClass({ container, streaming: true });
  tokui.startStream(container);
  tokui.feed('[p cls:lead sty');
  tokui.feed('le:"font-weight:700" 流式文本]');
  tokui.endStream();
  const p = findByClass(container, 'tokui-p');
  assert.ok(p.classList.contains('lead'));
  assert.ok(p.getAttribute('style').indexOf('font-weight: 700') !== -1);
});

test('未知组件降级不走安全通道（render() 提前返回，cls/style 不应用）', () => {
  const r = makeRenderer();
  const dom = r.render(parseOne('[nosuch cls:still-works style:"opacity:.5" x]'));
  assert.ok(dom.classList.contains('tokui-unknown'));
  assert.ok(!dom.classList.contains('still-works'));   // 降级分支提前 return，不经过 _applyUserStyle
  assert.strictEqual(dom.getAttribute('style'), null); // 同上
});

run();
