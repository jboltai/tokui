/**
 * TokUI qrcode 组件测试（基于 vendored Arase qrcode-generator）
 * 验证：矩阵生成、SVG 渲染、静默区、属性解析、EC 级、空态。
 */
'use strict';
const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

setupDOM();
const { TokUIRenderer } = require('../src/core/renderer');
const { registerQrcode } = require('../src/components/qrcode');

const tests = [];
let passed = 0, failed = 0;
function test(name, fn) { tests.push({ name, fn }); }
function run() {
  passed = 0; failed = 0;
  for (const t of tests) {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name + '\n    ' + (e.message || e)); }
  }
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed (of ' + tests.length + ')');
  teardownDOM();
  if (failed > 0) process.exit(1);
}

function fresh() { const rc = new TokUIRenderer(); registerQrcode(rc); return rc; }
function render(attrs) { return fresh().render({ type: 'qrcode', attrs: attrs, children: [] }); }
function svgOf(dom) { return dom.querySelector('.tokui-qrcode__box').innerHTML; }

test('qrcode 渲染：svg + 白底 + path 暗模块 + label', () => {
  const dom = render({ tx: 'https://tokui.jboltai.com', l: '官网', s: 'md' });
  assert.strictEqual(dom.className, 'tokui-qrcode tokui-qrcode--md');
  assert.strictEqual(dom.querySelector('.tokui-qrcode__label').textContent, '官网');
  const svg = svgOf(dom);
  assert.ok(svg.includes('<svg'), '含 svg');
  assert.ok(svg.includes('fill="#ffffff"'), '白色静默区底');
  assert.ok(svg.includes('fill="currentColor"'), '暗模块 currentColor');
  assert.ok(svg.includes('shape-rendering="crispEdges"'), '锐利渲染');
  assert.ok((svg.match(/M\d+ \d+h1v1h-1z/g) || []).length > 50, '多个暗模块 path');
});

test('qrcode 静默区：viewBox = 模块数 + 8（4 模块×2 边）', () => {
  // 'https://tokui.jboltai.com' EC=M → version 2 → 25 模块 → viewBox 33
  const svg = svgOf(render({ tx: 'https://tokui.jboltai.com', ec: 'M' }));
  const vb = (svg.match(/viewBox="0 0 (\d+) (\d+)"/) || [])[1];
  assert.strictEqual(vb, '33', '25 模块 + 8 静默区 = 33');
});

test('qrcode 三定位图角为暗模块（finder pattern）', () => {
  const dom = render({ tx: 'hello' });
  const svg = svgOf(dom);
  // 左上角定位图：模块(0,0) 对应 path 段 M4 4（4 = quiet zone 偏移）
  assert.ok(svg.includes('M4 4h1v1h-1z'), '左上定位图角为暗');
});

test('qrcode 尺寸：sm/md/lg + 别名', () => {
  assert.strictEqual(render({ tx: 'X', s: 'sm' }).className, 'tokui-qrcode tokui-qrcode--sm');
  assert.strictEqual(render({ tx: 'X', s: 'small' }).className, 'tokui-qrcode tokui-qrcode--sm');
  assert.strictEqual(render({ tx: 'X', s: 'lg' }).className, 'tokui-qrcode tokui-qrcode--lg');
  assert.strictEqual(render({ tx: 'X', s: 'large' }).className, 'tokui-qrcode tokui-qrcode--lg');
  assert.strictEqual(render({ tx: 'X' }).className, 'tokui-qrcode tokui-qrcode--md', '默认 md');
});

test('qrcode EC 级影响模块数（同数据 H 比 M 密）', () => {
  const data = 'https://tokui.jboltai.com/doc/intro';
  const vbM = (svgOf(render({ tx: data, ec: 'M' })).match(/viewBox="0 0 (\d+)/) || [])[1];
  const vbH = (svgOf(render({ tx: data, ec: 'H' })).match(/viewBox="0 0 (\d+)/) || [])[1];
  assert.ok(parseInt(vbH, 10) >= parseInt(vbM, 10), 'H 级模块数 ≥ M（纠错冗余多）');
});

test('qrcode 无数据：显空态 —，无 svg', () => {
  const dom = render({ l: '空' });
  assert.strictEqual(dom.querySelector('.tokui-qrcode__empty').textContent, '—');
  assert.ok(!dom.querySelector('.tokui-qrcode__box'), '无 svg box');
});

test('qrcode 中文 UTF-8 可编码', () => {
  const dom = render({ tx: '你好，TokUI', l: '中文测试' });
  const svg = svgOf(dom);
  assert.ok(svg.includes('<svg'), '中文可生成');
  assert.ok((svg.match(/M\d+ \d+h1v1h-1z/g) || []).length > 20, '有暗模块');
});

test('qrcode tt 作 label 别名', () => {
  assert.strictEqual(render({ tx: 'X', tt: '扫码' }).querySelector('.tokui-qrcode__label').textContent, '扫码');
});

test('qrcode svg 保持比例（meet，缩放可扫描）', () => {
  const svg = svgOf(render({ tx: 'X' }));
  assert.ok(svg.includes('preserveAspectRatio="xMidYMid meet"'), 'meet 保持比例');
});

test('qrcode 中文走 UTF-8 编码（不截低字节，防扫描乱码）', () => {
  // 注册组件会把库默认 stringToBytes 切到 UTF-8；先触发一次 register
  const dom = render({ tx: '你好' });
  const qrLib = require('../src/vendor/qrcode-generator');
  // '你' = U+4F60 → UTF-8 三字节 0xE4 0xBD 0xA0（默认 c&0xff 会截成 0xA0 单字节 → 扫描乱码）
  const bytes = qrLib.stringToBytes('你');
  assert.deepStrictEqual(bytes, [0xE4, 0xBD, 0xA0], '中文按 UTF-8 编码（三字节），非低字节截断');
  // ASCII 仍正确
  assert.deepStrictEqual(qrLib.stringToBytes('A'), [0x41], 'ASCII 不受影响');
  assert.ok(dom.querySelector('.tokui-qrcode__box'), '中文可渲染 svg');
});

run();
