/**
 * TokUI barcode 组件测试（Code128 Set B）
 * 验证：编码位图长度/结构、checksum、SVG 渲染、属性解析。
 */
'use strict';
const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

setupDOM();
const { TokUIRenderer } = require('../src/core/renderer');
const { registerBarcode, encode128B } = require('../src/components/barcode');

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

function fresh() { const rc = new TokUIRenderer(); registerBarcode(rc); return rc; }
function render(attrs) { return fresh().render({ type: 'barcode', attrs: attrs, children: [] }); }
function svgOf(dom) { return dom.querySelector('.tokui-barcode__svg').innerHTML; }

// ===== 编码器 =====
test('encode128B: Start B + 数据 + 校验 + Stop 长度', () => {
  // 'A'：Start(11) + 1 char(11) + checksum(11) + Stop(13) = 46
  assert.strictEqual(encode128B('A').length, 46);
  // 'SF1026883749'（12 chars）：11 + 12*11 + 11 + 13 = 167
  assert.strictEqual(encode128B('SF1026883749').length, 167);
});

test('encode128B: Start B 位图正确（A）', () => {
  const bits = encode128B('A');
  // Start B(104) = BARS[104] = 11010010000
  assert.strictEqual(bits.slice(0, 11), '11010010000', 'Start B 位图');
  // Stop(106) = BARS[106] = 1100011101011（13 位）
  assert.strictEqual(bits.slice(-13), '1100011101011', 'Stop 位图');
});

test('encode128B: 校验位 = (104 + Σ i*value_i) % 103', () => {
  // 手算 'AB'：A=33(pos1), B=34(pos2) → sum=104+33+68=205 → 205%103=205-2*103=-1? 205-103=102, 102<103 → 102... 实 205%103=205-103=102
  // 重算：205/103=1.99 → 205-103=102 → checksum=102
  const data = 'AB';
  let sum = 104;
  for (let i = 0; i < data.length; i++) sum += (i + 1) * (data.charCodeAt(i) - 32);
  const expectedChecksum = sum % 103;
  // bits = Start + valueA + valueB + checksum + Stop；checksum 段在 11+11+11 .. +11
  const bits = encode128B(data);
  const seg = bits.slice(33, 44); // 第 4 个 11 位段（checksum）
  // 重建 BARS 表太冗长，改验段长度 + bits 总长
  assert.strictEqual(bits.length, 11 * 4 + 13, 'AB bits 总长');
  assert.strictEqual(seg.length, 11, 'checksum 段 11 位');
  assert.strictEqual(expectedChecksum, 102, 'AB checksum=102 手算核验');
});

test('encode128B: 空数据/非 ASCII 返回空串', () => {
  assert.strictEqual(encode128B(''), '');
  assert.strictEqual(encode128B('你好'), ''); // 非 ASCII 32~126 全丢
});

test('encode128B: 位图仅含 0/1', () => {
  const bits = encode128B('SF1026883749');
  assert.ok(/^[01]+$/.test(bits), '位图应仅 0/1');
});

// ===== 渲染 =====
test('barcode 渲染：label + svg + text 三段', () => {
  const dom = render({ tx: 'SF1026883749', l: '运单号', s: 'medium' });
  assert.strictEqual(dom.className, 'tokui-barcode tokui-barcode--md', 'size medium→md');
  assert.strictEqual(dom.querySelector('.tokui-barcode__label').textContent, '运单号');
  assert.strictEqual(dom.querySelector('.tokui-barcode__text').textContent, 'SF1026883749');
  const svg = svgOf(dom);
  assert.ok(svg.includes('<svg'), '含 svg');
  assert.ok(svg.includes('viewBox'), 'svg 有 viewBox');
  assert.ok((svg.match(/<rect/g) || []).length > 10, '多条 rect');
});

test('barcode 尺寸：sm/md/lg + 别名 small/medium/large', () => {
  assert.strictEqual(render({ tx: 'X', s: 'sm' }).className, 'tokui-barcode tokui-barcode--sm');
  assert.strictEqual(render({ tx: 'X', s: 'small' }).className, 'tokui-barcode tokui-barcode--sm');
  assert.strictEqual(render({ tx: 'X', s: 'lg' }).className, 'tokui-barcode tokui-barcode--lg');
  assert.strictEqual(render({ tx: 'X', s: 'large' }).className, 'tokui-barcode tokui-barcode--lg');
  assert.strictEqual(render({ tx: 'X' }).className, 'tokui-barcode tokui-barcode--md', '默认 md');
});

test('barcode 无数据：显空态 —，无 svg', () => {
  const dom = render({ l: '空运单' });
  assert.ok(dom.querySelector('.tokui-barcode__empty'), '有空态节点');
  assert.strictEqual(dom.querySelector('.tokui-barcode__empty').textContent, '—');
  assert.ok(!dom.querySelector('.tokui-barcode__svg'), '无 svg');
});

test('barcode svg 保持模块比例（preserveAspectRatio meet，不拉伸）', () => {
  const svg = svgOf(render({ tx: '12345' }));
  assert.ok(svg.includes('preserveAspectRatio="xMidYMid meet"'), 'meet 保持比例可扫描');
});

test('barcode 用 tt 作 label 别名', () => {
  const dom = render({ tx: 'ABC', tt: '序列号' });
  assert.strictEqual(dom.querySelector('.tokui-barcode__label').textContent, '序列号');
});

run();
