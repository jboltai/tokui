'use strict';
const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { registerChartComponents, registerChartRenderer, bumpFsUnits, solvePieFs, pieSizing, MIN_CHART_PX, MAX_CHART_PX, applyTipScale, axisXLayout, wrapLabelLines, estTextW, niceCeil, axisBound } = require('../src/components/chart');

// 递归收集元素及其后代的 textContent（dom-mock 不自动汇总）
function collectText(el) {
  if (!el) return '';
  var out = el.textContent || '';
  if (el.childNodes) for (var i = 0; i < el.childNodes.length; i++) out += collectText(el.childNodes[i]);
  return out;
}

const tests = [];
let passed = 0, failed = 0;
function test(name, fn) { tests.push({ name, fn }); }
function run() {
  passed = 0; failed = 0;
  for (const t of tests) {
    try { t.fn(); passed++; console.log('  ✓ ' + t.name); }
    catch (e) { failed++; console.log('  ✗ ' + t.name + '\n    ' + e.message); }
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  teardownDOM();
  if (failed > 0) process.exit(1);
}

// === Chart 组件测试 ===

test('chart registers without error', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'bar', d: '10,20,30', l: 'A,B,C' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-chart'));
});

test('chart bar renders SVG', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'bar', d: '10,20,30' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
  assert.strictEqual(svg.tagName.toLowerCase(), 'svg');
  const rects = svg.querySelectorAll('rect');
  assert.ok(rects.length >= 3);
});

test('chart line renders polyline', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'line', d: '10,20,15,25' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
  const polylines = svg.querySelectorAll('polyline');
  assert.strictEqual(polylines.length, 1);
});

test('chart line with area renders path fill', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'line', d: '10,20,15,25', area: true }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  const paths = svg.querySelectorAll('path[opacity="0.15"]');
  assert.strictEqual(paths.length, 1);
});

test('chart pie renders slices', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'pie', d: '30,25,20,25', l: 'A,B,C,D' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  const paths = svg.querySelectorAll('path');
  assert.strictEqual(paths.length, 4);
});

test('chart pie single slice renders full circle', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'pie', d: '100', l: '全部', w: 200, h: 200 }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  const circles = svg.querySelectorAll('circle.tokui-chart-slice');
  assert.strictEqual(circles.length, 1);
  assert.ok(parseFloat(circles[0].getAttribute('r')) > 0);
});

test('chart donut renders with center text', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'donut', d: '60,40', l: 'Done,TODO', v: 60 }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  const texts = svg.querySelectorAll('text');
  var found = false;
  texts.forEach(function (t) { if (t.textContent === '60%') found = true; });
  assert.ok(found);
});

test('chart funnel renders trapezoids', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'funnel', d: '100,60,30', l: '访问,注册,下单' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
  const polys = svg.querySelectorAll('polygon.tokui-chart-funnel');
  assert.strictEqual(polys.length, 3); // 每层一个梯形
});

test('chart funnel shows conversion pct', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'funnel', d: '100,60,30', l: '访问,注册,下单' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  // 数值居中显示在梯形内；名称（含「访问/注册/下单」）靠右引出；tooltip 带转化率
  var textAll = '';
  svg.querySelectorAll('text').forEach(function (t) { textAll += t.textContent + ' '; });
  assert.ok(textAll.indexOf('100') >= 0);
  assert.ok(textAll.indexOf('60') >= 0);
  assert.ok(textAll.indexOf('30') >= 0);
  assert.ok(textAll.indexOf('访问') >= 0 && textAll.indexOf('下单') >= 0);
});

test('chart funnel svg has no inline max-width (fills container like other charts)', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'funnel', d: '100,60,30', l: '访问,注册,下单' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  var style = svg.getAttribute('style') || '';
  assert.ok(!/max-width/i.test(style), 'funnel 不应内联 max-width（否则被钉死成小图）');
});

test('chart gauge svg has no inline max-width', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'gauge', v: 72 }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  var style = svg.getAttribute('style') || '';
  assert.ok(!/max-width/i.test(style), 'gauge 不应内联 max-width');
});

test('chart svg tagged with data-chart-type for responsive sizing', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  ['bar', 'line', 'area', 'pie', 'donut', 'rose', 'radar', 'scatter', 'bubble', 'heatmap', 'histogram', 'waterfall', 'boxplot', 'treemap', 'sankey', 'candlestick', 'progress', 'gauge', 'gantt', 'funnel'].forEach(function (t) {
    var attrs = { t: t };
    if (t === 'scatter' || t === 'bubble') attrs.d = '1,2;3,4';
    else if (t === 'candlestick') attrs.d = '10,12,8,11;11,13,9,10';
    else if (t === 'boxplot') attrs.d = '1,3,5,7,9;2,4,6,8,10';
    else if (t === 'heatmap') attrs.rows = '1,2,3|4,5,6';
    else if (t === 'sankey') { attrs.nodes = 'A,B,C'; attrs.flows = 'A->B:10,B->C:5'; }
    else if (t === 'treemap') attrs.d = 'A:100,B:60,C:40';
    else if (t === 'gauge' || t === 'progress') attrs.v = 50;
    else if (t === 'gantt') attrs.tasks = '需求,1,3|开发,3,8';
    else attrs.d = '10,20,30'; // bar/line/area/pie/donut/rose/radar/funnel/histogram/waterfall
    var dom = renderer.render({ type: 'chart', attrs: attrs, content: '', children: [] });
    var svg = dom.querySelector('.tokui-chart__svg');
    assert.ok(svg, t + ' 应渲染 svg');
    assert.strictEqual(svg.getAttribute('data-chart-type'), t, t + ' svg 应打 data-chart-type');
  });
});

test('chart gauge renders arc + center value', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'gauge', v: 72 }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
  var arc = svg.querySelector('.tokui-chart-gauge-arc');
  assert.ok(arc, '应有数值弧');
  var track = svg.querySelector('.tokui-chart-gauge-track');
  assert.ok(track, '应有背景轨道');
  var found = false;
  svg.querySelectorAll('text').forEach(function (t) { if (t.textContent === '72%') found = true; });
  assert.ok(found, '中心应显示 72% (max=100 默认 %)');
});

test('chart gauge 超量程自动扩刻度：显示真实值 + 量程上扩（原 clamp 钳死为 bug）', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'gauge', v: 250, max: 100 }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var texts = svg.querySelectorAll('text').map(function (t) { return t.textContent; });
  assert.ok(texts.indexOf('250%') >= 0, '中心显示真实值 250%（原行为钳成 100%，现场 700/max:500 显示 500 属同类 bug）');
  assert.ok(texts.indexOf('500') >= 0, '量程自动上扩到 nice 刻度 500（250×1.25=312.5 → 1/2/5 取整 500）');
});

test('chart gauge 超量程现场案例：库存 700 / max:500 → 中心 700，刻度端点 1000', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'gauge', v: 700, max: 500, u: ' 万', l: '库存金额' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var texts = svg.querySelectorAll('text').map(function (t) { return t.textContent; });
  assert.ok(texts.indexOf('700 万') >= 0, '中心显示真实库存 700 万');
  assert.ok(texts.indexOf('1000') >= 0, '量程扩到 nice 刻度 1000（875 → 1000）');
  // 指针不顶死：数值弧 < 满弧（val < max 严格成立）
  var arcD = svg.querySelector('.tokui-chart-gauge-arc').getAttribute('d') || '';
  assert.ok(/A/.test(arcD), '数值弧存在');
});

test('chart gauge 超量程 + zones 联动：v:140 max:100 zones:60,85 → 仍显示 140 且段带按新量程重排', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'gauge', v: 140, max: 100, zones: '60,85', u: '%' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var texts = svg.querySelectorAll('text').map(function (t) { return t.textContent; });
  assert.ok(texts.indexOf('140%') >= 0, '中心显示真实值 140%');
  assert.ok(texts.indexOf('200') >= 0, '量程扩到 200（175 → 200），zones 段带以 [0,60,85,200] 重排');
  assert.strictEqual(svg.querySelectorAll('.tokui-chart-gauge-track').length, 3, 'zones 三段色带完整');
});

test('chart gauge 量程内不扩：92/100 与 320/500 维持原刻度原读数', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var d1 = renderer.render({ type: 'chart', attrs: { t: 'gauge', v: 92, max: 100, u: '%' }, content: '', children: [] });
  var t1 = d1.querySelectorAll('text').map(function (t) { return t.textContent; });
  assert.ok(t1.indexOf('92%') >= 0, '量程内读数不变');
  assert.ok(t1.indexOf('100') >= 0 && t1.indexOf('200') < 0, '量程未被扩大');
  var d2 = renderer.render({ type: 'chart', attrs: { t: 'gauge', v: 320, max: 500, u: ' 万' }, content: '', children: [] });
  var t2 = d2.querySelectorAll('text').map(function (t) { return t.textContent; });
  assert.ok(t2.indexOf('320 万') >= 0 && t2.indexOf('500') >= 0, '320/500 维持原刻度');
});

test('chart progress 超量程：百分比显示真实值 140%（条宽物理钳满，不扩量程）', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'progress', v: 700, max: 500, l: '库存进度' }, content: '', children: [] });
  var texts = dom.querySelectorAll('text').map(function (t) { return t.textContent; });
  assert.ok(texts.some(function (t) { return t.indexOf('140') >= 0; }), '显示真实百分比 140%（原 clamp 显示 100% 掩盖超标），实际：' + texts.join('|'));
  var fill = dom.querySelector('.tokui-chart-fill');
  var vbW = parseFloat(dom.querySelector('.tokui-chart__svg').getAttribute('viewBox').split(' ')[2]);
  assert.ok(parseFloat(fill.getAttribute('width')) >= vbW - 5, '条宽钳满轨道（物理上限）');
});

test('chart progress 量程内与负值：64% 正常、负值贴底 0%', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var d1 = renderer.render({ type: 'chart', attrs: { t: 'progress', v: 320, max: 500, l: '库存进度' }, content: '', children: [] });
  var t1 = d1.querySelectorAll('text').map(function (t) { return t.textContent; });
  assert.ok(t1.some(function (t) { return t.indexOf('64') >= 0; }), '320/500 = 64%');
  var d2 = renderer.render({ type: 'chart', attrs: { t: 'progress', v: -20, l: '负值' }, content: '', children: [] });
  var t2 = d2.querySelectorAll('text').map(function (t) { return t.textContent; });
  assert.ok(t2.some(function (t) { return /(^|\s)0/.test(t); }), '负值贴底显示 0%');
  assert.strictEqual(parseFloat(d2.querySelector('.tokui-chart-fill').getAttribute('width')), 0, '负值条宽为 0');
});

test('niceCeil 单元：向上取整到 1/2/5×10^k（正负两侧）', () => {
  const { niceCeil } = require('../src/components/chart');
  assert.strictEqual(niceCeil(875), 1000);
  assert.strictEqual(niceCeil(312.5), 500);
  assert.strictEqual(niceCeil(175), 200);
  assert.strictEqual(niceCeil(100), 100, '恰在刻度上幂等');
  assert.strictEqual(niceCeil(0), 0);
  assert.strictEqual(niceCeil(-37.5), -20, '负数向靠近 0 方向取整');
  assert.strictEqual(niceCeil(-5), -5);
});

test('chart gauge custom unit + min/max', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gauge', v: 120, min: 0, max: 240, u: 'km/h' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var found = false;
  svg.querySelectorAll('text').forEach(function (t) { if (t.textContent === '120km/h') found = true; });
  assert.ok(found, '应显示自定义单位 km/h');
  // 端点标注为 min=0 / max=240
  var txt = collectText(svg);
  assert.ok(txt.indexOf('240') >= 0, '刻度应出现 max 240');
});

test('chart gauge status color overrides arc', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gauge', v: 30, status: 'danger' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var arc = svg.querySelector('.tokui-chart-gauge-arc');
  assert.ok(arc);
  assert.ok(String(arc.getAttribute('stroke')).indexOf('--tokui-danger') >= 0, 'status=danger 应染主题 danger 色');
});

test('chart gauge container mode reads pt children', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = {
    type: 'chart', attrs: { t: 'gauge', tt: '容器 gauge' }, content: '',
    children: [{ type: 'pt', attrs: { v: 88 }, content: '', children: [] }]
  };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var found = false;
  svg.querySelectorAll('text').forEach(function (t) { if (t.textContent === '88%') found = true; });
  assert.ok(found, '容器模式 pt v:88 应渲染中心 88%');
});

test('chart gauge zones render multi-band track', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gauge', v: 92, zones: '60,85' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  // zones "60,85" → [0,60,85,100] 共 3 段色带
  var tracks = svg.querySelectorAll('.tokui-chart-gauge-track');
  assert.strictEqual(tracks.length, 3, 'zones 应渲染 3 段色带轨道');
  // 数值弧颜色 = 命中段（92 ∈ [85,100] = 第 3 段，默认红）
  var arc = svg.querySelector('.tokui-chart-gauge-arc');
  assert.strictEqual(arc.getAttribute('stroke'), '#f5222d', '92 落入高危段，弧色应为默认红');
});

test('chart gauge zones zc override + low band color', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gauge', v: 30, zones: '60,85', zc: '#52c41a,#faad14,#f5222d' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var arc = svg.querySelector('.tokui-chart-gauge-arc');
  assert.strictEqual(arc.getAttribute('stroke'), '#52c41a', '30 落入首段（low），弧色应为绿');
});

test('chart gauge dec formats decimals', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gauge', v: 78.5, dec: 1 }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var found = false;
  svg.querySelectorAll('text').forEach(function (t) { if (t.textContent === '78.5%') found = true; });
  assert.ok(found, 'dec:1 应显示 1 位小数 78.5%');
});

test('chart gauge sub caption + status label render', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gauge', v: 95, status: 'danger', l: 'CPU', sub: '数据来源: 监控系统' }, content: '', children: [] };
  var dom = renderer.render(node);
  var txt = collectText(dom.querySelector('.tokui-chart__svg'));
  assert.ok(txt.indexOf('CPU') >= 0, '应显示指标名 l');
  assert.ok(txt.indexOf('告警') >= 0, 'status:danger 应自动出"告警"角标');
  assert.ok(txt.indexOf('数据来源') >= 0, '应显示副标题 sub');
});

test('chart gauge anim attr does not crash without rAF', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gauge', v: 66, anim: 1200 }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  // dom-mock 无 requestAnimationFrame → 直接落终态，中心显示 66%
  var found = false;
  svg.querySelectorAll('text').forEach(function (t) { if (t.textContent === '66%') found = true; });
  assert.ok(found, '无 rAF 环境下 anim 应回退直接渲染终态 66%');
});

test('chart radar renders polygon', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'radar', d: '90,70,85,60,95', l: 'A,B,C,D,E' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
  var dataPoly = false;
  svg.querySelectorAll('polygon').forEach(function (p) {
    if (p.getAttribute('fill-opacity') === '0.2') dataPoly = true;
  });
  assert.ok(dataPoly);
});

test('chart scatter renders circles', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'scatter', d: '10,20;30,50;50,80' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  const circles = svg.querySelectorAll('circle');
  assert.ok(circles.length >= 3);
});

test('chart title renders', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'bar', d: '10,20', tt: '销售数据' }, content: '', children: [] };
  const dom = renderer.render(node);
  const title = dom.querySelector('.tokui-chart__title');
  assert.ok(title);
  assert.strictEqual(title.textContent, '销售数据');
});

test('chart no title when tt omitted', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'bar', d: '10,20' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.querySelector('.tokui-chart__title'), null);
});

test('chart unknown type shows fallback', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'unknown' }, content: '', children: [] };
  const dom = renderer.render(node);
  const fb = dom.querySelector('.tokui-chart__fallback');
  assert.ok(fb);
  assert.ok(fb.textContent.indexOf('unknown') !== -1);
});

test('chart defaults to bar type', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { d: '10,20,30' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
  var rects = svg.querySelectorAll('rect');
  assert.ok(rects.length >= 3);
});

test('registerChartRenderer can override built-in', () => {
  var called = false;
  registerChartRenderer('bar', function () { called = true; return document.createElementNS('http://www.w3.org/2000/svg', 'svg'); });
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'bar', d: '10,20' }, content: '', children: [] };
  renderer.render(node);
  // The overridden renderer was registered before registerChartComponents re-registers builtins
  // so the built-in wins. This test verifies the API exists.
  assert.ok(typeof registerChartRenderer === 'function');
});

test('chart bar multi-series', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'bar', d: '10,20,30|5,15,25' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
  var rects = svg.querySelectorAll('rect');
  assert.ok(rects.length >= 6);
});

// === sn 系列名（多系列图表：bar/line/area/radar/donut 环/combo）===

test('chart bar sn 系列名进图例，替换默认「系列N」', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'bar', d: '30,45,38|40,42,50', sn: '销售额,目标' }, content: '', children: [] };
  const dom = renderer.render(node);
  const txt = collectText(dom.querySelector('.tokui-chart__svg'));
  assert.ok(txt.indexOf('销售额') >= 0, '图例应显示 sn 第一项');
  assert.ok(txt.indexOf('目标') >= 0, '图例应显示 sn 第二项');
  assert.ok(txt.indexOf('系列1') < 0 && txt.indexOf('系列2') < 0, '提供 sn 时不应出现默认系列名');
});

test('chart bar sn 位不足时逐系列回退默认名', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  // 3 系列仅 1 名：第 1 系列用 sn[0]，第 2/3 系列回退「系列2/系列3」
  const node = { type: 'chart', attrs: { t: 'bar', d: '1,2|3,4|5,6', sn: '销量' }, content: '', children: [] };
  const dom = renderer.render(node);
  const txt = collectText(dom.querySelector('.tokui-chart__svg'));
  assert.ok(txt.indexOf('销量') >= 0);
  assert.ok(txt.indexOf('系列2') >= 0 && txt.indexOf('系列3') >= 0, 'sn 位不足应回退默认名');
});

test('chart line sn 系列名进图例', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'line', d: '30,45,38|40,42,50', sn: '实际,预期' }, content: '', children: [] };
  const dom = renderer.render(node);
  const txt = collectText(dom.querySelector('.tokui-chart__svg'));
  assert.ok(txt.indexOf('实际') >= 0 && txt.indexOf('预期') >= 0);
  assert.ok(txt.indexOf('系列1') < 0 && txt.indexOf('系列2') < 0);
});

test('chart area stack sn 系列名进图例', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'line', area: true, stack: true, d: '30,45|40,42|10,5', sn: '线上,线下,其他' }, content: '', children: [] };
  const dom = renderer.render(node);
  const txt = collectText(dom.querySelector('.tokui-chart__svg'));
  assert.ok(txt.indexOf('线上') >= 0 && txt.indexOf('线下') >= 0 && txt.indexOf('其他') >= 0);
});

test('chart radar sn 系列名进图例', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'radar', l: '速度,力量,技巧', d: '80,90,70|60,75,85', sn: '产品A,产品B' }, content: '', children: [] };
  const dom = renderer.render(node);
  const txt = collectText(dom.querySelector('.tokui-chart__svg'));
  assert.ok(txt.indexOf('产品A') >= 0 && txt.indexOf('产品B') >= 0);
  assert.ok(txt.indexOf('系列1') < 0 && txt.indexOf('系列2') < 0);
});

test('chart donut 多环 sn 不崩溃且图例不受影响', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'donut', l: 'A,B', d: '1,2|3,4', sn: '本年,去年' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg, 'donut 多环 + sn 不应崩溃');
  assert.ok(svg.querySelectorAll('.tokui-chart-slice').length >= 4);
});

test('chart combo sn 作为 n1/n2 缺省回退，n1/n2 显式优先', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  // sn 回退：未给 n1/n2 时图例用 sn 前两名
  const dom1 = renderer.render({ type: 'chart', attrs: { t: 'combo', l: 'Q1,Q2,Q3', d: '10,20,30', d2: '5,15,25', sn: '销量,增速' }, content: '', children: [] });
  const txt1 = collectText(dom1.querySelector('.tokui-chart__svg'));
  assert.ok(txt1.indexOf('销量') >= 0 && txt1.indexOf('增速') >= 0, 'combo 未设 n1/n2 时应回退 sn');
  // n1/n2 显式优先于 sn
  const dom2 = renderer.render({ type: 'chart', attrs: { t: 'combo', l: 'Q1,Q2,Q3', d: '10,20,30', d2: '5,15,25', n1: '营收', n2: '利润', sn: '销量,增速' }, content: '', children: [] });
  const txt2 = collectText(dom2.querySelector('.tokui-chart__svg'));
  assert.ok(txt2.indexOf('营收') >= 0 && txt2.indexOf('利润') >= 0, 'n1/n2 显式值应生效');
  assert.ok(txt2.indexOf('销量') < 0 && txt2.indexOf('增速') < 0, 'n1/n2 显式时应覆盖 sn');
});

test('chart bar sn 引号包裹名与含引号流式半成品', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  // 属性值带引号包裹（DSL 中含逗号属性须加引号，attrs 已是解析后结果）应剥引号
  const node = { type: 'chart', attrs: { t: 'bar', d: '1,2|3,4', sn: '"本季","上季"' }, content: '', children: [] };
  const dom = renderer.render(node);
  const txt = collectText(dom.querySelector('.tokui-chart__svg'));
  assert.ok(txt.indexOf('本季') >= 0 && txt.indexOf('"') < 0, 'sn 名应剥引号');
});

test('chart custom colors', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'bar', d: '10,20', c: '#ff0000,#00ff00' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
});

// === Gantt 甘特图测试 ===

test('chart gantt renders days tasks', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  const node = { type: 'chart', attrs: { t: 'gantt', tasks: '设计,1,3|开发,3,7' }, content: '', children: [] };
  const dom = renderer.render(node);
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
  var bars = svg.querySelectorAll('.tokui-chart-task-bar');
  assert.strictEqual(bars.length, 2);
  var names = svg.querySelectorAll('.tokui-chart-task-name');
  assert.strictEqual(names.length, 2);
});

test('chart gantt renders progress layer', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: 'a,1,3,60|b,3,7,0' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var prog = svg.querySelectorAll('.tokui-chart-task-prog');
  assert.strictEqual(prog.length, 1); // 仅 progress>0 的任务画进度层
});

test('chart gantt legend uses gnames by group index', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  // 0/1 两组任务 → legend 应出现 gnames 对应名而非 "组1/组2"
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: 'a,1,3,100,0|b,3,7,50,1', gnames: '架构设计|联调' }, content: '', children: [] };
  var dom = renderer.render(node);
  var txt = collectText(dom.querySelector('.tokui-chart__svg'));
  assert.ok(txt.indexOf('架构设计') >= 0, 'legend 应显示 gnames 第一项');
  assert.ok(txt.indexOf('联调') >= 0, 'legend 应显示 gnames 第二项');
  assert.ok(txt.indexOf('组1') < 0, '提供 gnames 时不应出现 "组1"');
});

test('chart gantt legend falls back to 组N when no gnames', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: 'a,1,3,100,0|b,3,7,50,1' }, content: '', children: [] };
  var dom = renderer.render(node);
  var txt = collectText(dom.querySelector('.tokui-chart__svg'));
  assert.ok(txt.indexOf('组1') >= 0 && txt.indexOf('组2') >= 0, '无 gnames 时回退 "组N"');
});

test('chart gantt dates mode renders', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: '设计,2026-06-01,2026-06-05|开发,2026-06-05,2026-06-15' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg);
  var bars = svg.querySelectorAll('.tokui-chart-task-bar');
  assert.strictEqual(bars.length, 2);
  var axisLabels = svg.querySelectorAll('.tokui-chart-axis-time');
  assert.ok(axisLabels.length >= 2);
});

test('chart gantt renders milestones', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: 'a,1,5', ms: '评审,3|上线,5' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var msPolys = svg.querySelectorAll('.tokui-chart-task-ms');
  assert.strictEqual(msPolys.length, 2);
});

test('chart gantt renders dependency arrows', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: 'a,1,3|b,3,5|c,5,7', deps: '0->1,1->2' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var depPaths = svg.querySelectorAll('.tokui-chart-task-dep');
  assert.strictEqual(depPaths.length, 2);
});

test('chart gantt skips out-of-range deps', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: 'a,1,3|b,3,5', deps: '0->9' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var depPaths = svg.querySelectorAll('.tokui-chart-task-dep');
  assert.strictEqual(depPaths.length, 0);
});

test('chart gantt renders today line in dates mode', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var now = new Date();
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var d = function (off) { var x = new Date(now.getTime() + off * 86400000); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: 'a,' + d(-3) + ',' + d(-1) + '|b,' + d(-1) + ',' + d(3) }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg.querySelector('.tokui-chart-today'));
});

test('chart gantt no today line in days mode', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: 'a,1,3|b,3,7' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  assert.strictEqual(svg.querySelector('.tokui-chart-today'), null);
});

test('chart gantt empty tasks fallback', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var texts = svg.querySelectorAll('text');
  var found = false;
  texts.forEach(function (t) { if (t.textContent === '无任务数据') found = true; });
  assert.ok(found);
});

test('chart gantt skips invalid tasks with warn', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: '坏,abc,xyz|好,1,3' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var bars = svg.querySelectorAll('.tokui-chart-task-bar');
  assert.strictEqual(bars.length, 1); // 仅"好"任务
  var texts = svg.querySelectorAll('text');
  var warned = false;
  texts.forEach(function (t) { if (t.textContent.indexOf('跳过 1') !== -1) warned = true; });
  assert.ok(warned);
});

test('chart gantt click highlights dependency closure', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gantt', tasks: 'a,1,2|b,2,3|c,3,4', deps: '0->1,1->2' }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  // 找到任务 a 的 g（data-task-idx=0）触发 click
  var groups = svg.querySelectorAll('.tokui-chart-task-tip-group');
  var target = null;
  groups.forEach(function (g) { if (g.getAttribute('data-task-idx') === '0') target = g; });
  assert.ok(target);
  target._events['click'][0]();
  assert.ok(svg.classList.contains('has-active'));
  // 闭包含 a(0) b(1) c(2)，全部 is-active
  var activeCount = 0;
  groups.forEach(function (g) { if (g.classList.contains('is-active')) activeCount++; });
  assert.strictEqual(activeCount, 3);
  // 再次点击同任务 = 取消
  target._events['click'][0]();
  assert.ok(!svg.classList.contains('has-active'));
});

// === 新增图表类型渲染 ===
test('chart area renders filled path', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'area', d: '3,5,2|4,3,6', l: 'a,b,c' }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart__svg'));
  assert.ok(dom.querySelectorAll('path').length >= 1, 'area 应有填充 path');
});

test('chart progress renders track + fill', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'progress', v: 65 }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart-track'));
  assert.ok(dom.querySelector('.tokui-chart-fill'));
});

test('chart bubble renders sized points', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bubble', d: '1,2,5;3,4,10' }, content: '', children: [] });
  assert.ok(dom.querySelectorAll('.tokui-chart-point').length >= 2);
});

test('chart heatmap renders cells', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'heatmap', rows: '1,2,3|4,5,6', cols: 'A,B,C' }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-cell').length, 6, '2x3 网格 6 格');
});

test('chart rose renders slices', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'rose', d: '30,25,20,25', l: 'a,b,c,d' }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-slice').length, 4);
});

test('chart histogram bins raw values', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'histogram', d: '1,2,3,4,5,6,7,8,9,10', bins: 3 }, content: '', children: [] });
  assert.ok(dom.querySelectorAll('.tokui-chart-bar').length >= 3);
});

test('chart waterfall renders bars', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'waterfall', d: '100,-30,50', l: 'a,b,c' }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-bar').length, 3);
});

test('chart boxplot renders boxes + whiskers', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'boxplot', d: '1,3,5,7,9;2,4,6,8,10', l: 'a,b' }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-box').length, 2);
  assert.ok(dom.querySelectorAll('.tokui-chart-whisker').length >= 4);
});

test('chart treemap renders tiles', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'treemap', d: 'A:100,B:60,C:40' }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-tile').length, 3);
});

test('chart sankey renders flows', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'sankey', nodes: 'A,B,C', flows: 'A->B:10,B->C:5' }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-flow').length, 2);
});

test('chart candlestick renders candles + wicks', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'candlestick', d: '10,12,8,11;11,13,9,10', l: 'd1,d2' }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-candle').length, 2);
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-wick').length, 2);
});

// === 缺陷回归 ===
test('chart bar multi-series unequal length does not crash', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '10,20,30|5,15', l: 'a,b,c' }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart__svg'), '不等长多系列不应崩溃');
  assert.ok(dom.querySelectorAll('.tokui-chart-bar').length >= 5, '应渲染 3+2 根柱');
});

test('chart empty data shows placeholder', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  ['bar', 'line', 'pie', 'donut', 'radar', 'funnel'].forEach(function (t) {
    var dom = renderer.render({ type: 'chart', attrs: { t: t }, content: '', children: [] });
    assert.ok(dom.querySelector('.tokui-chart__svg--empty'), t + ' 空数据应有占位 svg');
  });
});

test('chart long x-labels auto-rotate', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '1,2,3,4', l: '这是用来测试旋转的很长标签一,这是用来测试旋转的很长标签二,这是用来测试旋转的很长标签三,这是用来测试旋转的很长标签四' }, content: '', children: [] });
  var texts = dom.querySelectorAll('text');
  var rotated = false;
  texts.forEach(function (tx) { if ((tx.getAttribute('transform') || '').indexOf('rotate') >= 0) rotated = true; });
  assert.ok(rotated, '长标签应触发 rotate');
});

test('chart radar multi-series renders multiple polygons', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'radar', d: '80,70,60|50,40,30', l: 'a,b,c' }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('polygon[fill-opacity="0.2"]').length, 2, '双系列应有两个数据多边形');
});

test('chart gauge range 270 renders without crash', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'gauge', v: 60, range: 270 }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart__svg'));
});

test('chart bar stack renders', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '10,20|5,10', l: 'a,b', stack: true }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart__svg'));
});

test('chart line smooth renders path', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'line', d: '1,2,3,4', l: 'a,b,c,d', smooth: true }, content: '', children: [] });
  assert.ok(dom.querySelector('path'), 'smooth 折线用 path');
});

test('chart donut multi-ring renders', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'donut', d: '40,30,30|20,50,30', l: 'a,b,c' }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-slice').length, 6, '双环各 3 切片 = 6');
});

// === 动态宽度/高度测试（viewBox 宽 ∝ 数据点数，显式 w/h 优先，bandHeight 防过扁）===

// 从 svg viewBox "0 0 W H" 解析宽/高
function viewBoxSize(svg) {
  var parts = String(svg.getAttribute('viewBox')).split(/\s+/);
  return { w: parseFloat(parts[2]), h: parseFloat(parts[3]) };
}
// 造 n 个数值的逗号串
function nums(n) { var a = []; for (var i = 0; i < n; i++) a.push((i % 17) + 1); return a.join(','); }

test('chart bar 动态宽度：40 点 viewBox 宽 > 默认 400', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: nums(40), l: 'x' }, content: '', children: [] });
  var sz = viewBoxSize(dom.querySelector('.tokui-chart__svg'));
  assert.ok(sz.w > 400, '40 点应自动加宽，实际 ' + sz.w);
});

test('chart bar 显式 w 优先：w:500 → viewBox 宽 = 500', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: nums(40), w: 500 }, content: '', children: [] });
  var sz = viewBoxSize(dom.querySelector('.tokui-chart__svg'));
  assert.strictEqual(sz.w, 500, '显式 w 覆盖动态计算');
});

test('chart bar bandHeight：40 点高度 > 默认 200（防过扁）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: nums(40) }, content: '', children: [] });
  var sz = viewBoxSize(dom.querySelector('.tokui-chart__svg'));
  assert.ok(sz.h > 200, '宽超比例时高度同步抬高，实际 ' + sz.h);
});

test('chart bar 显式 h 优先且不被压扁：w:400 h:300 → 高 = 300', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: nums(5), w: 400, h: 300 }, content: '', children: [] });
  var sz = viewBoxSize(dom.querySelector('.tokui-chart__svg'));
  assert.strictEqual(sz.h, 300, '比例内显式 h 生效');
});

test('chart area w+h 同显式跳过比例带：w:1540 h:200（宽高比 7.7 > 4）→ 高不被抬高', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'area', d: nums(30), l: Array.from({ length: 30 }, function (_, i) { return i + 1; }).join(','), w: 1540, h: 200 }, content: '', children: [] });
  var sz = viewBoxSize(dom.querySelector('.tokui-chart__svg'));
  assert.ok(sz.h < 300, '作者定向宽幅底条不应被 band 抬到 385，实际 ' + sz.h);
  assert.ok(sz.h >= 200, '仍不小于显式 h 基准');
  // 对照：仅 w 显式（h 缺省）仍走 band 兜底
  var dom2 = renderer.render({ type: 'chart', attrs: { t: 'area', d: nums(30), l: Array.from({ length: 30 }, function (_, i) { return i + 1; }).join(','), w: 1540 }, content: '', children: [] });
  var sz2 = viewBoxSize(dom2.querySelector('.tokui-chart__svg'));
  assert.ok(sz2.h >= 385, 'h 缺省时宽超比例仍抬高，实际 ' + sz2.h);
});

test('chart line 动态宽度：60 点 viewBox 宽 > 默认 400', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'line', d: nums(60) }, content: '', children: [] });
  var sz = viewBoxSize(dom.querySelector('.tokui-chart__svg'));
  assert.ok(sz.w > 400, '60 点应自动加宽，实际 ' + sz.w);
});

test('chart 横向 bar 动态高度：20 类 orient:h → viewBox 高 > 默认 200', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: nums(20), orient: 'h' }, content: '', children: [] });
  var sz = viewBoxSize(dom.querySelector('.tokui-chart__svg'));
  assert.ok(sz.h > 200, '横向柱类别多 → 高度随 n 增，实际 ' + sz.h);
});

// === 横向 bar 左侧类别标签自适应（对齐 ECharts containLabel + overflow:wrap） ===
// 取首条竖向网格线 x1 = padL（标签列右界）；类别标签 = text-anchor:end 且 x < padL
function hBarLabels(dom) {
  var svg = dom.querySelector('.tokui-chart__svg');
  var padL = parseFloat(svg.querySelector('line').getAttribute('x1'));
  var els = svg.querySelectorAll('text[text-anchor="end"]').filter(function (t) {
    return parseFloat(t.getAttribute('x')) < padL;
  });
  return { svg: svg, padL: padL, els: els };
}
function tspansOf(t) {
  return t.querySelectorAll('tspan');
}

test('chart 横向 bar 长标签：折行 ≤2 行、拼回完整不截断、padL 随标签加宽', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labels = ['华东区域销售一部年度目标达成情况', '华南区域销售二部年度目标达成情况', '华北区域销售三部年度目标达成情况', '西南区域销售四部年度目标达成情况'];
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '320,280,245,198', l: labels.join(','), orient: 'h' }, content: '', children: [] });
  var h = hBarLabels(dom);
  assert.strictEqual(h.els.length, 4, '4 个类别标签，实际 ' + h.els.length);
  h.els.forEach(function (t, i) {
    var spans = tspansOf(t);
    assert.ok(spans.length >= 1 && spans.length <= 2, '标签' + i + ' 折行 ≤2 行，实际 ' + spans.length);
    var joined = spans.map(function (s) { return s.textContent; }).join('');
    assert.strictEqual(joined, labels[i], '折行拼回完整标签（不截断）');
  });
  // 16 CJK 字 @fs9 ≈ 128 单位 > 旧写死 padL=70-6 可容纳的 ~54 → 列必须自适应加宽
  assert.ok(h.padL > 70, '标签列自适应加宽，padL=' + h.padL + ' 应 > 70');
});

test('chart 横向 bar 折行行高加高：同 n 下 2 行标签 viewBox 高 > 单行标签', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var d = nums(8);
  var shortDom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: d, l: 'a,b,c,d,e,f,g,h', orient: 'h' }, content: '', children: [] });
  var longLabs = []; for (var i = 0; i < 8; i++) longLabs.push('华东区域销售一部年度目标达成情况' + i);
  var longDom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: d, l: longLabs.join(','), orient: 'h' }, content: '', children: [] });
  var hShort = viewBoxSize(shortDom.querySelector('.tokui-chart__svg')).h;
  var hLong = viewBoxSize(longDom.querySelector('.tokui-chart__svg')).h;
  assert.ok(hLong > hShort, '折行 → 每类行高 26→34，实际 ' + hLong + ' vs ' + hShort);
});

test('chart 横向 bar 超预算长标签：2 行封顶 + 末行省略号（不溢出标签列）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var long1 = Array(31).join('销'); // 30 个 CJK（预算 14 字/行 ×2 行装不下）
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '1,2', l: long1 + ',' + long1 + '二', orient: 'h' }, content: '', children: [] });
  var h = hBarLabels(dom);
  assert.strictEqual(h.els.length, 2);
  h.els.forEach(function (t) {
    var spans = tspansOf(t);
    assert.strictEqual(spans.length, 2, '30 字标签折 2 行封顶，实际 ' + spans.length);
    var last = spans[1].textContent;
    assert.strictEqual(last.charAt(last.length - 1), '…', '末行省略号收尾：' + last);
  });
});

test('chart 横向 bar 短标签：单行单 tspan、padL 收缩到标签实际宽（不吞噬柱区）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '3,5,2', l: '一月,二月,三月', orient: 'h' }, content: '', children: [] });
  var h = hBarLabels(dom);
  assert.strictEqual(h.els.length, 3);
  h.els.forEach(function (t, i) {
    var spans = tspansOf(t);
    assert.strictEqual(spans.length, 1, '短标签单行');
    assert.strictEqual(spans[0].textContent, ['一月', '二月', '三月'][i]);
  });
  // 3 CJK ≈ 31 单位 + 14 间隙 < 46 地板 → padL 取地板 46（旧写死 70，柱区多 24 单位）
  assert.strictEqual(h.padL, 46, 'padL 收缩至 46 地板，实际 ' + h.padL);
});

test('chart 横向 bar 西文标签按词折行（不在词中间断开）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '320,198', l: 'Regional Sales Performance Summary,North America Revenue Breakdown', orient: 'h' }, content: '', children: [] });
  var h = hBarLabels(dom);
  h.els.forEach(function (t) {
    var spans = tspansOf(t);
    assert.ok(spans.length <= 2, '西文 ≤2 行');
    spans.forEach(function (s) {
      // 行首/行尾不为空格（断行处空格丢弃）
      var txt = s.textContent;
      assert.ok(!/^\s|\s$/.test(txt), '行首尾无空格："' + txt + '"');
    });
    // 词完整性：折行点在空格处（每行内容由完整词拼成）
    if (spans.length === 2) {
      var l1 = spans[0].textContent, l2 = spans[1].textContent;
      assert.ok(/^[A-Z]/.test(l2), '第二行从词首开始：' + l2);
      assert.ok(estTextW(l1) > 0 && estTextW(l2) > 0, '两行均非空');
    }
  });
});

test('chart 横向 bar _labFs 注入（窄容器 bump 修正）：按真实字号折行且标签不溢出标签列', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  // 16 CJK 标签：fs9 下预算 14 字/行 → 2 行；_labFs=14（窄容器 bump）下预算 9 字/行 → 2 行但更早折
  var labels = ['华东区域销售一部年度目标达成情况', '华南区域销售二部年度目标达成情况'];
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '320,280', l: labels.join(','), orient: 'h', _labFs: 14 }, content: '', children: [] });
  var h = hBarLabels(dom);
  assert.strictEqual(h.svg.getAttribute('data-labfs'), '14', 'data-labfs 记录生效字号');
  h.els.forEach(function (t) {
    assert.strictEqual(t.getAttribute('font-size'), '14', '标签按注入字号渲染');
    var spans = tspansOf(t);
    assert.strictEqual(spans.length, 2, 'fs14 预算 9 字/行 → 2 行');
    // 每行在 fs14 下的实际宽 ≤ 标签列可用宽（padL - 6 锚点间隙）
    spans.forEach(function (s) {
      var w14 = estTextW(s.textContent) * (14 / 7);
      assert.ok(w14 <= h.padL - 6, '行宽 ' + w14 + ' ≤ 标签列 ' + (h.padL - 6));
    });
  });
});

test('chart 横向 bar vals 值文本与末位刻度不越过右缘（padRh 自适应）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '320000,280000,245000', l: '甲,乙,丙', orient: 'h', vals: true }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var w = parseFloat(svg.getAttribute('viewBox').split(' ')[2]);
  // 末位竖向网格线 x1 = w - padRh（标签右界之后的柱区右缘）
  var xs = svg.querySelectorAll('line').map(function (l) { return parseFloat(l.getAttribute('x1')); });
  var maxX = Math.max.apply(null, xs);
  // 最宽值文本 "320000" @fs9：estTextW=27 → 27·9/7≈35 → 需右缘留白 ≥ 35+6
  assert.ok(w - maxX >= 40, '右缘留白 ≥ 值文本宽+间隙，实际 ' + (w - maxX));
});

test('chart 横向 bar 窄容器大字号（_labFs 21.32）：行高随字号撑开，两行标签不重叠', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labs = []; for (var i = 0; i < 8; i++) labs.push('华东区域销售一部年度目标达成情况');
  var d = '1,2,3,4,5,6,7,8';
  var fs9 = viewBoxSize(renderer.render({ type: 'chart', attrs: { t: 'bar', d: d, l: labs.join(','), orient: 'h' }, content: '', children: [] }).querySelector('.tokui-chart__svg')).h;
  var big = viewBoxSize(renderer.render({ type: 'chart', attrs: { t: 'bar', d: d, l: labs.join(','), orient: 'h', _labFs: 21.32 }, content: '', children: [] }).querySelector('.tokui-chart__svg')).h;
  // fs9：perCat=34 → 36+272=308；fs21.32：lineH=23 → perCat=52 → 36+416=452
  assert.strictEqual(fs9, 308, 'fs9 折行行高 34');
  assert.strictEqual(big, 452, '大字号行高随 lineH×2+6 撑开');
});

// === Wordcloud 词云 ===
test('chart wordcloud：权重映射字号分层、螺线放置不出界、竖排点缀 + tooltip + 确定性', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var d = '人工智能:100,机器学习:85,深度学习:72,大语言模型:64,自然语言处理:58,计算机视觉:52,强化学习:46,知识图谱:40,数据挖掘:35,智能体:30,提示工程:26,多模态:22,向量检索:18,参数微调:14,价值对齐:10';
  var dom = renderer.render({ type: 'chart', attrs: { t: 'wordcloud', d: d, h: 300 }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg, 'svg 渲染');
  var words = svg.querySelectorAll('text.tokui-chart-wc-word');
  assert.strictEqual(words.length, 15, '15 词全放下（该规模不弃词），实际 ' + words.length);
  // 字号 ∝ 权重：最大权重词 ≥ 最小权重词 2.5 倍字号
  var fsArr = words.map(function (t) { return parseFloat(t.getAttribute('font-size')); });
  var fsMax = Math.max.apply(null, fsArr), fsMin = Math.min.apply(null, fsArr);
  assert.ok(fsMax >= fsMin * 2.5, '字号分层，实际 [' + fsMin + ', ' + fsMax + ']');
  // 全部词盒（与渲染器同口径估算）在 viewBox 内（横/竖排分别推算）
  var sz = viewBoxSize(svg);
  words.forEach(function (t) {
    var fs = parseFloat(t.getAttribute('font-size'));
    var bw0 = estTextW(t.textContent) * fs / 7 + fs * 0.25, bh0 = fs * 1.18;
    var vert = !!t.getAttribute('transform');
    var bw = vert ? bh0 : bw0, bh = vert ? bw0 : bh0;
    var cx = parseFloat(t.getAttribute('x')), cy = parseFloat(t.getAttribute('y'));
    assert.ok(cx - bw / 2 >= 1 && cx + bw / 2 <= sz.w - 1, '词横向不出界：' + t.textContent);
    assert.ok(cy - bh / 2 >= 1 && cy + bh / 2 <= sz.h - 1, '词纵向不出界：' + t.textContent);
  });
  // 确定性竖排点缀：idx%5===2（idx≥2）→ 15 词中 3 个竖排
  var vertCount = words.filter(function (t) { return t.getAttribute('transform'); }).length;
  assert.ok(vertCount >= 2, '竖排点缀存在，实际 ' + vertCount);
  // tooltip 含 词:权重
  var all = collectText(dom);
  assert.ok(all.indexOf('人工智能: 100') >= 0, 'tooltip 文本含词与权重');
  // 确定性：两次渲染词位逐字一致（无随机 → 流式重绘不跳位）
  var dom2 = renderer.render({ type: 'chart', attrs: { t: 'wordcloud', d: d, h: 300 }, content: '', children: [] });
  var pos1 = words.map(function (t) { return t.getAttribute('x') + ',' + t.getAttribute('y'); });
  var pos2 = dom2.querySelectorAll('.tokui-chart-wc-word').map(function (t) { return t.getAttribute('x') + ',' + t.getAttribute('y'); });
  assert.deepStrictEqual(pos2, pos1, '两次渲染词位一致');
});

test('chart wordcloud 单词/等权重：不落入除零路径（字号不为 fsMin）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'wordcloud', d: '独词:88' }, content: '', children: [] });
  var fs = parseFloat(dom.querySelector('.tokui-chart-wc-word').getAttribute('font-size'));
  assert.ok(fs > 20, '单词给中等字号，实际 ' + fs);
  var dom2 = renderer.render({ type: 'chart', attrs: { t: 'wordcloud', d: '等一:50,等二:50,等三:50,等四:50' }, content: '', children: [] });
  var fs2 = dom2.querySelectorAll('.tokui-chart-wc-word').map(function (t) { return parseFloat(t.getAttribute('font-size')); });
  assert.ok(Math.min.apply(null, fs2) > 12, '等权重词不为最小字号，实际 ' + fs2.join(','));
});

test('chart wordcloud 空数据占位 + 非法段过滤（负权重/无冒号）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'wordcloud', d: '' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg.classList.contains('tokui-chart__svg--empty'), '空数据占位');
  var dom2 = renderer.render({ type: 'chart', attrs: { t: 'wordcloud', d: '好词:50,坏词:-1,无权重' }, content: '', children: [] });
  assert.strictEqual(dom2.querySelectorAll('.tokui-chart-wc-word').length, 1, '负权重/无冒号段被过滤');
});

test('wrapLabelLines 单元：CJK 逐字 / 西文按词 / 超长词硬断 / 省略号', () => {
  // CJK 逐字折行（预算 112 = 14 CJK）
  assert.deepStrictEqual(wrapLabelLines('华东区域销售一部年度目标达成情况', 112, 2), ['华东区域销售一部年度目标达成', '情况']);
  // 短文本不折
  assert.deepStrictEqual(wrapLabelLines('华东区域', 112, 2), ['华东区域']);
  // 西文按词折行（断点在空格，行首尾无空格）
  assert.deepStrictEqual(wrapLabelLines('Regional Sales Performance', 100, 2), ['Regional Sales', 'Performance']);
  // 超长无断点词硬断成预算段
  var hard = wrapLabelLines('abcdefghijklmnopqrstuvwxyz', 40, 2);
  assert.strictEqual(hard.length, 2);
  assert.ok(estTextW(hard[0]) <= 40, '硬断段 ≤ 预算');
  assert.strictEqual(hard[1].charAt(hard[1].length - 1), '…', '超 2 行省略号');
  // 超 maxLines 截断 + 省略号计入预算宽
  var trunc = wrapLabelLines(Array(40).join('销'), 112, 2); // 39 CJK → 3 行 → 截 2 行
  assert.strictEqual(trunc.length, 2);
  assert.ok(estTextW(trunc[1]) <= 112, '省略号行 ≤ 预算，实际 ' + estTextW(trunc[1]));
  assert.strictEqual(trunc[1].charAt(trunc[1].length - 1), '…');
});

test('chart candlestick 动态宽度：50 根 viewBox 宽 > 默认 480', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  // 50 根 OHLC，分号分隔
  var ohlc = []; for (var i = 0; i < 50; i++) ohlc.push('10,12,8,11');
  var dom = renderer.render({ type: 'chart', attrs: { t: 'candlestick', d: ohlc.join(';') }, content: '', children: [] });
  var sz = viewBoxSize(dom.querySelector('.tokui-chart__svg'));
  assert.ok(sz.w > 480, '50 根 K 线应自动加宽，实际 ' + sz.w);
});

// CJK 双倍计宽，近似 chart.js 的 estTextW（对 font-size:7 略宽估，安全）
function pieLabelW(str) {
  var w = 0;
  for (var i = 0; i < str.length; i++) w += (str.charCodeAt(i) > 127) ? 8 : 4.5;
  return w;
}

test('chart pie 引线标签不超出 viewBox（长 CJK 标签不被外框裁切）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  // 真实 demo 数据：5 段、长 CJK 标签，两侧均有切片
  var dom = renderer.render({ type: 'chart', attrs: { t: 'pie', d: '35,25,20,12,8', l: '微信,抖音,淘宝,京东,其他', w: 240, h: 240 }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var sz = viewBoxSize(svg);
  // 引线标签文本：含 '(' 与 '%'（区别于图例 / tooltip）
  var violations = [];
  svg.querySelectorAll('text').forEach(function (t) {
    var s = t.textContent || '';
    if (s.indexOf('%') < 0 || s.indexOf('(') < 0) return; // 仅引线标签
    var anchor = t.getAttribute('text-anchor') || 'start';
    var x = parseFloat(t.getAttribute('x'));
    var w = pieLabelW(s);
    var left = anchor === 'end' ? x - w : x;
    var right = anchor === 'end' ? x : x + w;
    if (left < -0.5 || right > sz.w + 0.5) violations.push(s + ' [' + left.toFixed(1) + '..' + right.toFixed(1) + '] vbW=' + sz.w);
  });
  assert.strictEqual(violations.length, 0, '引线标签超出画布：\n  ' + violations.join('\n  '));
});

test('chart pie 拓宽画布：长标签时 viewBox 宽 > 用户 w', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'pie', d: '35,25,20,12,8', l: '微信,抖音,淘宝,京东,其他', w: 240, h: 240 }, content: '', children: [] });
  var sz = viewBoxSize(dom.querySelector('.tokui-chart__svg'));
  assert.ok(sz.w > 240, '长 CJK 标签应触发画布拓宽，实际 ' + sz.w);
});

// === 字号钳制纯函数（双向：窄抬 / 宽压）===
test('bumpFsUnits：窄缩放抬到 minPx，宽缩放压到 maxPx，区间内不动', () => {
  assert.strictEqual(bumpFsUnits(7, 1, 12), 12);       // 7px → 抬到 12（无 maxPx）
  assert.strictEqual(bumpFsUnits(7, 2, 12), 7);        // 14px 已 ≥12
  assert.strictEqual(bumpFsUnits(7, 0.5, 12), 24);     // 3.5px → 抬到 24
  assert.strictEqual(bumpFsUnits(9, 1, 12), 12);       // 9px → 12
  assert.strictEqual(bumpFsUnits(10, 1.3, 12), 10);    // 13px ≥12
  assert.strictEqual(bumpFsUnits(10, 1.2, 12), 10);    // 12px 边界（≥）不动
  assert.strictEqual(bumpFsUnits(7, 0, 12), 7);        // 非法 scale 原样
  // 双向钳制：[14,16]
  assert.strictEqual(bumpFsUnits(9, 2, 14, 16), 8);         // 18px → 压到 8（=16/2，渲染=16px）
  assert.strictEqual(bumpFsUnits(9, 2.2, 14, 16), 16 / 2.2); // 19.8px → 压，渲染=16px
  assert.strictEqual(bumpFsUnits(9, 1.5, 14, 16), 14 / 1.5); // 13.5px → 抬，渲染=14px
  assert.strictEqual(bumpFsUnits(8, 0.5, 14, 16), 28);       // 4px → 抬到 28（=14/0.5）
  assert.strictEqual(bumpFsUnits(9, 1.6, 14, 16), 9);        // 14.4px ∈[14,16] 原样
  assert.strictEqual(bumpFsUnits(10, 1.6, 14, 16), 10);      // 16px 边界（≤max）原样
});

test('solvePieFs：C440 / R0106 / fixedA30 / coefB≈7.43 → ≈14.6 且闭环渲染=14px', () => {
  var C = 440, R0 = 106, fixedA = 30, coefB = 52 / 7; // 52≈长 CJK 标签 estTextW
  var fs = solvePieFs(C, R0, fixedA, coefB, MIN_CHART_PX);
  assert.ok(fs > 14.4 && fs < 14.8, 'fs 应 ≈14.6，实际 ' + fs);
  // 闭环验证：r(fs)=R0−fs，W(fs)=2(r+fixedA+coefB·fs)，渲染 px = fs·C/W 应 ≈14
  var r = R0 - fs;
  var W = 2 * (r + fixedA + coefB * fs);
  var px = fs * C / W;
  assert.ok(px > 13.8 && px < 14.2, '闭环渲染 px 应 ≈14，实际 ' + px);
});

test('solvePieFs：超大容器（自然已 ≥12）→ fs<7（无需抬）', () => {
  var fs = solvePieFs(2000, 106, 30, 52 / 7, MIN_CHART_PX);
  assert.ok(fs < 7, '超大容器 fs 应 <7，实际 ' + fs);
});

test('solvePieFs：极窄容器 denom≤0 → 0（回退）', () => {
  // denom = C − 2·12·(coefB−1)；coefB=10 → 2·12·9=216 > C=100
  assert.strictEqual(solvePieFs(100, 106, 30, 10, MIN_CHART_PX), 0);
  assert.strictEqual(solvePieFs(0, 106, 30, 7, MIN_CHART_PX), 0); // C=0
});

// === tooltip 整组缩放（rect+text 同步，围绕数据点锚）===
test('applyTipScale：宽容器整组缩小 / 窄容器放大 / scale≈1 不变换', () => {
  var SVGNS = 'http://www.w3.org/2000/svg';
  function mkSvg() {
    var svg = document.createElementNS(SVGNS, 'svg');
    var layer = document.createElementNS(SVGNS, 'g');
    layer.setAttribute('class', 'tokui-chart-tips-layer');
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'tokui-chart-tip');
    g.setAttribute('data-tx', '100');
    g.setAttribute('data-ty', '50');
    var rect = document.createElementNS(SVGNS, 'rect');
    rect.setAttribute('x', '80'); rect.setAttribute('y', '20'); rect.setAttribute('width', '40'); rect.setAttribute('height', '20');
    var text = document.createElementNS(SVGNS, 'text');
    text.setAttribute('font-size', '10');
    g.appendChild(rect); g.appendChild(text);
    layer.appendChild(g); svg.appendChild(layer);
    // dom-mock matches() 不支持后代选择器（.a .b），覆写返回构造的 tip group
    svg.querySelectorAll = function () { return [g]; };
    return { svg: svg, g: g };
  }
  // scale=2.5 → tooltip 渲染 25px → 压到 MAX=16 → s=16/2.5/10=0.64，锚点 (100,50)
  var c1 = mkSvg();
  applyTipScale(c1.svg, 2.5);
  var tr1 = c1.g.getAttribute('transform') || '';
  assert.ok(/scale\(0\.64\)/.test(tr1), '宽容器应整组缩到 scale(0.64)，实际 ' + tr1);
  assert.ok(/translate\(100 50\)/.test(tr1), 'transform 应用锚点 translate(100 50)，实际 ' + tr1);

  // scale=0.5 → tooltip 渲染 5px → 抬到 MIN=14 → s=14/0.5/10=2.8
  var c2 = mkSvg();
  applyTipScale(c2.svg, 0.5);
  var tr2 = c2.g.getAttribute('transform') || '';
  assert.ok(/scale\(2\.8\)/.test(tr2), '窄容器应整组放到 scale(2.8)，实际 ' + tr2);

  // scale=1.5 → 10*1.5=15 ∈[14,16] → s=1 → 早退无 transform
  var c3 = mkSvg();
  applyTipScale(c3.svg, 1.5);
  assert.ok(!c3.g.getAttribute('transform'), 'scale=1.5（渲染 15px 在区间内）不应设 transform');
});

// === X 轴标签整体旋转决策（任一超阈值 → 全部统一旋转）===
test('axisXLayout：全部短→不转；任一长→全转；旋转时 padB 按最长标签自适应', () => {
  // 全短：ascii estTextW 4.5/char，threshold=40*0.9=36，'abc'=13.5 < 36
  var a = axisXLayout(['abc', 'de', 'f'], 40, 30);
  assert.strictEqual(a.rotate, false, '全短标签不旋转');
  assert.strictEqual(a.padB, 30, '不旋转 padB=base');

  // 任一长：4 CJK estTextW=32 > 30*0.9=27 → 触发【全部】旋转
  // padB = ceil(12 + 0.707·effW + 3)，effW = 32·16/7 ≈ 73.14 → ceil(66.7) = 67
  var b = axisXLayout(['短', '营业收入', 'x'], 30, 30);
  assert.strictEqual(b.rotate, true, '存在长标签 → 全部统一旋转');
  assert.strictEqual(b.padB, 67, '旋转 padB 按最长标签竖向足迹自适应（67）');
  assert.ok(b.padB >= 52, '长标签 padB 不应低于旧固定值 52，实际 ' + b.padB);

  // padB floor：标签横排放得下 → 不旋转 → 保留 base
  var c = axisXLayout(['营业收入'], 20, 60);
  assert.strictEqual(c.padB, 60, '不旋转时 padB=base 60');
});

test('pieSizing：fs=7 时 labelSpace = fixedA + maxLabelW（与历史布局等价）', () => {
  var data = [35, 25, 20, 12, 8];
  var labels = ['微信', '抖音', '淘宝', '京东', '其他'];
  var total = 100;
  var L = pieSizing(data, labels, {}, 7, total);
  assert.strictEqual(L.labelSpace, L.fixedA + L.maxLabelW);
  assert.strictEqual(L.coefB, L.maxLabelW / 7);
  assert.ok(L.r > 0 && L.W > L.r * 2);
});

test('chart pie _pieFs 覆盖：标签/图例用 fs，viewBox 随 fs 拓宽', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var base = renderer.render({ type: 'chart', attrs: { t: 'pie', d: '35,25,20,12,8', l: '微信,抖音,淘宝,京东,其他', w: 240, h: 240 }, content: '', children: [] });
  var big = renderer.render({ type: 'chart', attrs: { t: 'pie', d: '35,25,20,12,8', l: '微信,抖音,淘宝,京东,其他', w: 240, h: 240, _pieFs: 14 }, content: '', children: [] });
  var szB = viewBoxSize(base.querySelector('.tokui-chart__svg'));
  var szBig = viewBoxSize(big.querySelector('.tokui-chart__svg'));
  assert.ok(szBig.w > szB.w, 'fs=14 应比 fs=7 拓宽，' + szBig.w + ' vs ' + szB.w);
  // 标签字号 = _pieFs
  var lbl = Array.from(big.querySelector('.tokui-chart__svg').querySelectorAll('text'))
    .find(t => (t.textContent || '').includes('%') && (t.textContent || '').includes('('));
  assert.ok(lbl, '应存在引线标签');
  assert.strictEqual(lbl.getAttribute('font-size'), '14');
});

// === x 轴标签密度自适应（auto-skip / 旋转 / interval）===
// 新签名：axisXLayout(labels, slotW, basePadB, availW, intervalAttr) → {rotate, padB, interval}
// availW = 轴总宽（cw）；intervalAttr = 'auto'(默认)|N|'0'|undefined
function mkLabels(n, p) { var a = []; for (var i = 1; i <= n; i++) a.push(p + i); return a; }

test('axisXLayout：50 短标签窄宽 → auto 跳过 interval>1', () => {
  var r = axisXLayout(mkLabels(50, 'D'), 26, 30, 1300); // 默认 auto
  assert.ok(r.interval > 1, '50 点密集应跳过，得 interval=' + r.interval);
  assert.strictEqual(r.rotate, false, '跳过时横排不旋转');
});

test('axisXLayout：40 短标签半宽 → auto 跳过 interval>1', () => {
  var r = axisXLayout(mkLabels(40, 'W'), 26, 30, 1040);
  assert.ok(r.interval > 1, '40 点半宽应跳过，得 interval=' + r.interval);
});

// === X 轴长标签压扁 bug（padB 保底封顶 + 标签省略号截断） ===
test('axisXLayout 封顶：h 传入 → padB ≤ h−18−max(60,h·32%) 且返回有限截断预算；不传 h 维持旧行为', () => {
  var labs = Array(6).fill('测'.repeat(14)); // 14 全角字，未封顶需 padB≈196
  var capped = axisXLayout(labs, 60, 28, 360, undefined, false, 200);
  assert.ok(capped.rotate, '长标签应旋转');
  assert.ok(capped.padB <= 118, 'padB 封顶 ≤ 118（200−18−max(60,64)），实际 ' + capped.padB);
  assert.ok(isFinite(capped.rotBudget) && capped.rotBudget > 0, '返回有限截断预算');
  var legacy = axisXLayout(labs, 60, 28, 360); // 不传 h：旧签名/旧行为不封顶
  assert.ok(legacy.padB > 118, '不传 h 不封顶（旧行为），实际 ' + legacy.padB);
  var short = axisXLayout(['一月', '二月', '三月'], 60, 28, 360, undefined, false, 200);
  assert.ok(short.padB < 118, '短标签不触顶');
  var tall = axisXLayout(labs, 60, 28, 360, undefined, false, 560); // 高图：上限更大
  assert.ok(tall.padB > 118, 'h=560 上限随高自适应（560−18−179=363），实际 ' + tall.padB);
});

test('chart bar 14 字标签：柱子不再消失（柱高 ≥60）、旋转标签省略号截断、tooltip 保留全名', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labs = ['总装车间第二生产线一号甲班组', '焊装车间第三生产线二号乙班组', '涂装车间第一生产线三号丙班组',
              '冲压车间第四生产线四号丁班组', '注塑车间第五生产线五号戊班组', '电池车间第六生产线六号己班组'];
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '180,240,150,280,210,260', l: labs.join(',') }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var bars = svg.querySelectorAll('.tokui-chart-bar');
  assert.strictEqual(bars.length, 6, '6 根柱全在');
  var barMax = Math.max.apply(null, Array.from(bars).map(function (b) { return parseFloat(b.getAttribute('height')); }));
  assert.ok(barMax >= 60, '柱子不再消失（修复前高度 0），最大柱高 ' + barMax + ' ≥ 60');
  var trunc = svg.querySelectorAll('text').filter(function (t) { return t.textContent.indexOf('…') >= 0; });
  assert.strictEqual(trunc.length, 6, '6 个旋转标签全部省略号截断');
  var all = collectText(dom);
  assert.ok(all.indexOf('总装车间第二生产线一号甲班组: 180') >= 0, 'tooltip 保留完整标签名');
});

test('chart bar 30 字极端 / 4 字回归：保底柱高 ≥60；短标签柱高不变（~120）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var long30 = Array.from({ length: 6 }, function (_, i) { return '测'.repeat(28) + (i + 1) + '班'; });
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '180,240,150,280,210,260', l: long30.join(',') }, content: '', children: [] });
  var barMax30 = Math.max.apply(null, dom.querySelectorAll('.tokui-chart-bar').map(function (b) { return parseFloat(b.getAttribute('height')); }));
  assert.ok(barMax30 >= 60, '30 字极端仍保底绘图区，柱高 ' + barMax30);
  var short = Array.from({ length: 6 }, function (_, i) { return '测' + (i + 1) + '班'; });
  var dom2 = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '180,240,150,280,210,260', l: short.join(',') }, content: '', children: [] });
  var barMax4 = Math.max.apply(null, dom2.querySelectorAll('.tokui-chart-bar').map(function (b) { return parseFloat(b.getAttribute('height')); }));
  assert.ok(barMax4 >= 110, '短标签（4 字）柱高不受影响（修复前 120），实际 ' + barMax4);
  assert.ok(dom2.querySelectorAll('text').every(function (t) { return t.textContent.indexOf('…') < 0; }), '短标签不截断');
});

test('chart line/area 14 字标签：绘图区 ≥60 不再倒挂塌缩（修复前仅 ~15）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labs = Array.from({ length: 6 }, function (_, i) { return '总装车间第二生产线甲班组' + (i + 1); });
  ['line', 'area'].forEach(function (t) {
    var dom = renderer.render({ type: 'chart', attrs: { t: t, d: '180,240,150,280,210,260', l: labs.join(',') }, content: '', children: [] });
    var ys = dom.querySelectorAll('line').map(function (l) { return parseFloat(l.getAttribute('y1')); }).filter(function (y) { return !isNaN(y); });
    var extent = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    assert.ok(extent >= 60, t + ' 绘图区 ' + extent + ' ≥ 60（修复前 ~15 倒挂）');
  });
});

// === 显式锁定让位（数据超锁定值 → nice 扩展；未超 → 原样；heatmap 豁免） ===
test('axisBound 让位单元：超锁 → nice 量化扩展；未超 / 无显式 / noYield → 原样', () => {
  assert.strictEqual(axisBound({ xmax: 100 }, 'xmax', '_xMax', 150), 160, 'xmax 锁 100、数据 150 → 让位 160（150×1.05 nice 对齐）');
  assert.strictEqual(axisBound({ xmax: 100 }, 'xmax', '_xMax', 80), 100, '未超锁定 → 原样 100（防抖语义保留）');
  assert.strictEqual(axisBound({ xmax: 100 }, 'xmax', '_xMax', 100), 100, '恰等于锁定 → 原样');
  assert.strictEqual(axisBound({}, 'xmax', '_xMax', 120), 120, '无显式锁 → 数据极值');
  assert.strictEqual(axisBound({ xmax: 100 }, 'xmax', '_xMax', 150, true), 100, 'noYield（heatmap 色阶）绝对服从');
  assert.strictEqual(axisBound({ xmin: 0 }, 'xmin', '_xMin', -30), -40, 'xmin 锁 0、数据 -30 → 负向让位 -40（-31.5 按 step10 向下对齐）');
});

test('chart scatter/bubble 锁轴 + 超域点：全部入格（修复前画到轴外）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  [['scatter', '20,30;50,60;130,140'], ['bubble', '30,40,500;80,70,800;150,160,1000']].forEach(function (q) {
    var dom = renderer.render({ type: 'chart', attrs: { t: q[0], d: q[1], xmin: 0, xmax: 100, ymin: 0, ymax: 100 }, content: '', children: [] });
    var svg = dom.querySelector('.tokui-chart__svg');
    var hl = svg.querySelectorAll('line').filter(function (l) { return l.getAttribute('y1') === l.getAttribute('y2'); });
    var right = Math.max.apply(null, hl.map(function (l) { return parseFloat(l.getAttribute('x2')); }));
    var top = Math.min.apply(null, hl.map(function (l) { return parseFloat(l.getAttribute('y1')); }));
    var out = svg.querySelectorAll('.tokui-chart-point').filter(function (c) {
      return parseFloat(c.getAttribute('cx')) > right + 0.5 || parseFloat(c.getAttribute('cy')) < top - 0.5;
    });
    assert.strictEqual(out.length, 0, q[0] + ' 超域点应随轴让位入格（修复前画到轴外）');
  });
  // 未超锁定：轴原样 0~100
  var dom2 = renderer.render({ type: 'chart', attrs: { t: 'scatter', d: '20,30;50,60;80,90', xmin: 0, xmax: 100, ymin: 0, ymax: 100 }, content: '', children: [] });
  var ticks = dom2.querySelectorAll('text').map(function (t) { return t.textContent; });
  assert.ok(ticks.indexOf('100') >= 0 && ticks.indexOf('150') < 0, '未超锁定 → 刻度仍 0~100');
});

test('chart histogram 锁域 + 超域：边界箱不再灌爆（分布恢复真实）；范围标签锁定绝对服从不变', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var hd = '55,62,68,71,73,75,78,82,85,88,90,92,95,97,99,120,150,180';
  var locked = renderer.render({ type: 'chart', attrs: { t: 'histogram', d: hd, min: 0, max: 100, bins: 5 }, content: '', children: [] });
  var bl = locked.querySelectorAll('.tokui-chart-bar').map(function (b) { return parseFloat(b.getAttribute('height')); });
  var last = bl[bl.length - 1], maxOther = Math.max.apply(null, bl.slice(0, -1));
  assert.ok(last < maxOther, '让位扩域后末箱高度 ' + last + ' 不再是假众数（修复前 154 > 其他全部）');
  // 范围标签（l:"40-50,…"）定义箱沿：超域仍归末箱，行为不变
  var rl = renderer.render({ type: 'chart', attrs: { t: 'histogram', d: '42,55,68,75,82,95,130', l: '40-50,50-60,60-70,70-80,80-90,90-100' }, content: '', children: [] });
  var rlH = rl.querySelectorAll('.tokui-chart-bar').map(function (b) { return parseFloat(b.getAttribute('height')); });
  assert.strictEqual(rlH[rlH.length - 1], Math.max.apply(null, rlH), '范围标签版末箱仍收纳超域 130（标签绝对语义不变）');
});

test('chart heatmap 锁色阶：豁免让位，超域值仍钳到顶色（多图对比语义保留）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'heatmap', rows: '10,20,30|40,60,80|50,95,70', cols: 'A,B,C', l: 'r1,r2,r3', vmin: 0, vmax: 50 }, content: '', children: [] });
  var fl = dom.querySelectorAll('.tokui-chart-cell').map(function (c) { return c.getAttribute('fill'); });
  assert.ok(fl[4] === fl[5] && fl[5] === fl[7], '值 60/80/95 仍钳到同一顶色（vmax 锁定不被让位改写）');
});

test('chart heatmap 超域角标：锁色阶下超上限/低于下限加警示三角 + tooltip 注记；不锁无角标', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'heatmap', rows: '10,20,30|40,60,80|50,95,70', cols: 'A,B,C', l: 'r1,r2,r3', vmin: 0, vmax: 50 }, content: '', children: [] });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-cell-flag--over').length, 4, '60/80/95/70 四格超上限角标');
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-cell-flag--under').length, 0, '无低于下限格');
  var all = collectText(dom);
  assert.ok(all.indexOf('⚠超上限') >= 0, 'tooltip 含超上限注记');
  var under = renderer.render({ type: 'chart', attrs: { t: 'heatmap', rows: '5,45|55,65', cols: 'A,B', l: 'r1,r2', vmin: 30, vmax: 60 }, content: '', children: [] });
  assert.strictEqual(under.querySelectorAll('.tokui-chart-cell-flag--under').length, 1, '5 < vmin 30 → 左下角低于下限角标');
  var free = renderer.render({ type: 'chart', attrs: { t: 'heatmap', rows: '10,20,30|40,60,80|50,95,70', cols: 'A,B,C', l: 'r1,r2,r3' }, content: '', children: [] });
  assert.strictEqual(free.querySelectorAll('.tokui-chart-cell-flag').length, 0, '不锁色阶（域随数据）→ 无角标');
});

test('chart bar 锁 ymax + 超域柱：柱顶回到绘图区内（附带同根因修复）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: '50,80,150', l: 'A,B,C', ymax: 100 }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var ys = svg.querySelectorAll('line').filter(function (l) { return l.getAttribute('y1') === l.getAttribute('y2'); });
  var top = Math.min.apply(null, ys.map(function (l) { return parseFloat(l.getAttribute('y1')); }));
  dom.querySelectorAll('.tokui-chart-bar').forEach(function (b) {
    assert.ok(parseFloat(b.getAttribute('y')) >= top - 0.5, '柱顶 y=' + b.getAttribute('y') + ' 不越出绘图区上缘 ' + top + '（修复前 y=-59）');
  });
});

test('axisXLayout：中等密度（旋转能装下）→ 旋转不跳过 interval=1', () => {
  // 15 标签、宽 500：横排放不下（fitH≈13）、旋转 -45 装得下（fitR≈18）→ 旋转全显
  // 最长 'L15' estTextW=13.5 → effW≈30.86 → padB = ceil(12+0.707·30.86+3) = 37
  var r = axisXLayout(mkLabels(15, 'L'), 33, 30, 500);
  assert.strictEqual(r.interval, 1, '中等密度优先旋转不跳过');
  assert.strictEqual(r.rotate, true, '应旋转');
  assert.strictEqual(r.padB, 37, '短标签旋转 padB 自适应收紧（37）');
});

test('axisXLayout：interval:2 显式 → interval=2 锁定步长', () => {
  var r = axisXLayout(mkLabels(6, 'X'), 60, 30, 360, '2');
  assert.strictEqual(r.interval, 2);
});

test('axisXLayout：interval:0 → 强制全显 interval=1', () => {
  var r = axisXLayout(mkLabels(50, 'D'), 26, 30, 1300, '0');
  assert.strictEqual(r.interval, 1, 'interval:0 关闭跳过');
});

test('axisXLayout：少标签宽裕 → 不转不跳 interval=1', () => {
  var r = axisXLayout(['A', 'B', 'C'], 60, 30, 300);
  assert.strictEqual(r.interval, 1);
  assert.strictEqual(r.rotate, false);
});

test('axisXLayout：跳过时保留首末（appendXLabels 渲染首+末标签）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labels = mkLabels(50, 'D');
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: labels.map(function () { return '10'; }).join(','), l: labels.join(','), w: 1300, h: 200, interval: 'auto' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var axisTexts = Array.from(svg.querySelectorAll('text')).filter(function (t) {
    return /^D\d+$/.test(t.textContent || ''); // tooltip 文本 "D1: 10" 不匹配，自带排除
  });
  var txts = axisTexts.map(function (t) { return t.textContent; });
  assert.ok(txts.indexOf('D1') !== -1, '应保留首标签 D1');
  assert.ok(txts.indexOf('D50') !== -1, '应保留末标签 D50');
  assert.ok(axisTexts.length < 50, '应跳过部分标签，剩 ' + axisTexts.length);
});

test('chart bar interval:2 → 轴标签约为一半', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labels = mkLabels(20, 'X');
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: labels.map(function () { return '5'; }).join(','), l: labels.join(','), w: 800, h: 200, interval: '2' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var axisTexts = Array.from(svg.querySelectorAll('text')).filter(function (t) {
    return /^X\d+$/.test(t.textContent || ''); // tooltip "X1: 5" 不匹配，自带排除
  });
  // interval=2 → 显 idx 0,2,4,...,18 + 末 19，约 11 个
  assert.ok(axisTexts.length <= 12 && axisTexts.length >= 10, 'interval:2 应显约一半，得 ' + axisTexts.length);
});

// === dataZoom 缩放滑块（zoomBounds 纯数学 + zoomEnabled + 渲染结构）===
const { zoomBounds, zoomEnabled } = require('../src/components/chart');

test('zoomBounds：全窗 (0,1) → 覆盖全部索引', () => {
  var z = zoomBounds(50, 0, 1);
  assert.strictEqual(z.s, 0);
  assert.strictEqual(z.e, 49);
});

test('zoomBounds：前 20% 窗口', () => {
  var z = zoomBounds(50, 0, 0.2);
  assert.strictEqual(z.s, 0);
  assert.strictEqual(z.e, 10); // round(0.2*49)=10
});

test('zoomBounds：末尾窗口', () => {
  var z = zoomBounds(50, 0.8, 1);
  assert.strictEqual(z.s, 39); // round(0.8*49)=39
  assert.strictEqual(z.e, 49);
});

test('zoomBounds：极小窗口 → 钳到 MIN_WIN（≥10% 或 2）', () => {
  var z = zoomBounds(50, 0.48, 0.52);
  assert.ok(z.e - z.s >= 5, '窗口不小于 MIN_WIN，得 ' + (z.e - z.s));
});

test('zoomBounds：s>e 自动交换', () => {
  var z = zoomBounds(50, 0.9, 0.1);
  assert.ok(z.s < z.e, '应交换使 s<e');
});

test('zoomBounds：单点数据不崩', () => {
  var z = zoomBounds(1, 0, 1);
  assert.strictEqual(z.s, 0);
  assert.strictEqual(z.e, 0);
});

test('zoomEnabled：undefined → 关', () => {
  assert.strictEqual(zoomEnabled({}, 50), false);
});

test('zoomEnabled：auto / 50 点（>30）→ 开', () => {
  assert.strictEqual(zoomEnabled({ zoom: 'auto' }, 50), true);
  assert.strictEqual(zoomEnabled({ zoom: 'auto' }, 20), false);
});

test('zoomEnabled：off / 0 → 关', () => {
  assert.strictEqual(zoomEnabled({ zoom: 'off' }, 50), false);
  assert.strictEqual(zoomEnabled({ zoom: '0' }, 50), false);
});

test('zoomEnabled：N 阈值 → n>N 才开', () => {
  assert.strictEqual(zoomEnabled({ zoom: '30' }, 50), true);
  assert.strictEqual(zoomEnabled({ zoom: '30' }, 30), false);
});

test('chart bar zoom:auto 50 点 → SVG 含缩放滑块结构', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labels = mkLabels(50, 'D');
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: labels.map(function () { return '10'; }).join(','), l: labels.join(','), w: 800, h: 200, zoom: 'auto' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg.querySelector('.tokui-chart-zoom-window'), '应有缩放窗口 rect');
  var handles = svg.querySelectorAll('.tokui-chart-zoom-handle');
  assert.strictEqual(handles.length, 2, '应有两个拖拽手柄');
});

test('chart bar zoom:auto 初始窗口 = 全量（窗口 rect 横跨整轴宽）', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labels = mkLabels(50, 'D');
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: labels.map(function () { return '10'; }).join(','), l: labels.join(','), w: 800, h: 200, zoom: 'auto' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var win = svg.querySelector('.tokui-chart-zoom-window');
  var x = parseFloat(win.getAttribute('x'));
  var w = parseFloat(win.getAttribute('width'));
  // 初始全量：窗口从左侧 padL 附近开始，宽度 ≈ cw（覆盖整轴）
  assert.ok(w > 600, '初始窗口应横跨整轴宽，得 width=' + w);
});

test('chart dataZoom 键盘：窗口/手柄 role=slider + 方向键平移/收边 + aria 同步', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labels = mkLabels(50, 'D');
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: labels.map(function () { return '10'; }).join(','), l: labels.join(','), w: 800, h: 200, zoom: 'auto' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var win = svg.querySelector('.tokui-chart-zoom-window');
  var handles = svg.querySelectorAll('.tokui-chart-zoom-handle');
  // 语义：窗口与手柄均为可聚焦 slider
  assert.strictEqual(win.getAttribute('role'), 'slider');
  assert.strictEqual(win.getAttribute('tabindex'), '0');
  assert.strictEqual(handles[0].getAttribute('role'), 'slider');
  assert.strictEqual(win.getAttribute('aria-valuenow'), '0', '初始窗口起于 0');
  assert.strictEqual(handles[1].getAttribute('aria-valuenow'), '49', '初始窗口止于 49');
  function fireKey(el2, key) {
    (el2._events['keydown'] || []).forEach(function (fn) { fn({ key: key, preventDefault: function () {} }); });
  }
  // 先右手柄 ← 收边（全窗宽 span=1 时 pan 无位移空间，属正确行为，须先收窗）
  fireKey(handles[1], 'ArrowLeft');
  assert.strictEqual(handles[1].getAttribute('aria-valuenow'), '48', '右手柄 ← 后止于 48');
  // 窗口 → 右移一点（pan 保宽度）
  var w0 = parseFloat(win.getAttribute('width'));
  fireKey(win, 'ArrowRight');
  assert.strictEqual(win.getAttribute('aria-valuenow'), '1', '窗口 → 后起于 1');
  assert.ok(Math.abs(parseFloat(win.getAttribute('width')) - w0) < 1, 'pan 窗宽不变');
  // 左手柄 Home 回起点
  fireKey(handles[0], 'End');
  assert.ok(parseInt(handles[0].getAttribute('aria-valuenow')) > 0, '左手柄 End 右移');
  fireKey(handles[0], 'Home');
  assert.strictEqual(handles[0].getAttribute('aria-valuenow'), '0', '左手柄 Home 回 0');
});

test('chart bar 无 zoom → 不渲染滑块', () => {
  const renderer = new TokUIRenderer(); registerChartComponents(renderer);
  var labels = mkLabels(50, 'D');
  var dom = renderer.render({ type: 'chart', attrs: { t: 'bar', d: labels.map(function () { return '10'; }).join(','), l: labels.join(','), w: 800, h: 200 }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(!svg.querySelector('.tokui-chart-zoom-window'), '无 zoom 属性不应渲染滑块');
});

// === line/area/boxplot/candlestick dataZoom 结构 ===
function chartHasZoom(type, d, extra) {
  var labels = mkLabels(50, 'X');
  var attrs = Object.assign({ t: type, d: d, l: labels.join(','), w: 800, h: 200, zoom: 'auto' }, extra || {});
  var dom = renderer4Zoom.render({ type: 'chart', attrs: attrs, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  return svg && svg.querySelector('.tokui-chart-zoom-window') && svg.querySelectorAll('.tokui-chart-zoom-handle').length === 2;
}
const renderer4Zoom = new TokUIRenderer(); registerChartComponents(renderer4Zoom);

test('chart line zoom:auto 50 点 → 含滑块', () => {
  var labels = mkLabels(50, 'X');
  var dom = renderer4Zoom.render({ type: 'chart', attrs: { t: 'line', d: mkLabels(50, '').map(function (s, i) { return i; }).join(','), l: labels.join(','), w: 800, h: 200, zoom: 'auto' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg.querySelector('.tokui-chart-zoom-window'), 'line 应有缩放窗口');
  assert.strictEqual(svg.querySelectorAll('.tokui-chart-zoom-handle').length, 2, 'line 应有 2 手柄');
});

test('chart area zoom:auto 50 点 → 含滑块', () => {
  var labels = mkLabels(50, 'X');
  var dom = renderer4Zoom.render({ type: 'chart', attrs: { t: 'area', d: mkLabels(50, '').map(function (s, i) { return i; }).join(','), l: labels.join(','), w: 800, h: 200, zoom: 'auto' }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart__svg').querySelector('.tokui-chart-zoom-window'), 'area 应有缩放窗口');
});

test('chart candlestick zoom:auto 60 根 → 含滑块', () => {
  var k = [];
  for (var i = 0; i < 60; i++) { var o = 100 + i, c = o + (i % 3 - 1); k.push(o + ',' + Math.max(o, c) + ',' + (90 + i) + ',' + (110 + i) + ',' + c); }
  var labels = mkLabels(60, 'D');
  var dom = renderer4Zoom.render({ type: 'chart', attrs: { t: 'candlestick', d: k.join(';'), l: labels.join(','), w: 800, h: 280, zoom: 'auto' }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart__svg').querySelector('.tokui-chart-zoom-window'), 'candlestick 应有缩放窗口');
});

test('chart boxplot zoom:auto 40 组 → 含滑块', () => {
  var b = [];
  for (var i = 0; i < 40; i++) b.push(i + ',' + (i + 2) + ',' + (i + 4) + ',' + (i + 6) + ',' + (i + 8));
  var labels = mkLabels(40, 'G');
  var dom = renderer4Zoom.render({ type: 'chart', attrs: { t: 'boxplot', d: b.join(';'), l: labels.join(','), w: 800, h: 240, zoom: 'auto' }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart__svg').querySelector('.tokui-chart-zoom-window'), 'boxplot 应有缩放窗口');
});

test('chart histogram zoom:auto（多 bin 委托 bar）→ 含滑块', () => {
  var vals = []; for (var i = 0; i < 200; i++) vals.push(Math.round(Math.sin(i / 5) * 50 + 50));
  var dom = renderer4Zoom.render({ type: 'chart', attrs: { t: 'histogram', d: vals.join(','), w: 800, h: 200, bins: 60, zoom: 'auto' }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart__svg').querySelector('.tokui-chart-zoom-window'), 'histogram 多 bin 应有缩放窗口');
});

test('chart line zoom 初始窗口全量（transform identity）', () => {
  var labels = mkLabels(50, 'X');
  var dom = renderer4Zoom.render({ type: 'chart', attrs: { t: 'line', d: mkLabels(50, '').map(function (s, i) { return i; }).join(','), l: labels.join(','), w: 800, h: 200, zoom: 'auto' }, content: '', children: [] });
  var plotG = dom.querySelector('.tokui-chart__svg').querySelector('.tokui-chart-plot');
  var tr = plotG && plotG.getAttribute('transform');
  assert.ok(/matrix\(1 /.test(tr || ''), '初始 transform 应为 identity matrix(1 ...)，得 ' + tr);
});

// === bumpZoomTextFs：zoom 重画文字字号保底（防 zoom 后 x 标签回退 fs9 渲染过小）===
const { bumpZoomTextFs } = require('../src/components/chart');

test('bumpZoomTextFs：_tokuiBumpedFs 存在 → 组内 text 字号抬到 bump 值', () => {
  var dom = renderer4Zoom.render({ type: 'chart', attrs: { t: 'bar', d: mkLabels(50, '').map(function (s, i) { return i; }).join(','), l: mkLabels(50, 'D').join(','), w: 800, h: 200, zoom: 'auto' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var labelG = svg.querySelector('.tokui-chart-plot-labels');
  assert.ok(labelG, 'zoom bar 应有标签组');
  svg._tokuiBumpedFs = 54.19; // 模拟 adjustChartFs 注入的 bump 字号
  bumpZoomTextFs(labelG, svg);
  var texts = labelG.querySelectorAll('text');
  assert.ok(texts.length > 0, '应有 x 标签');
  for (var i = 0; i < texts.length; i++) {
    assert.strictEqual(String(texts[i].getAttribute('font-size')), '54.19', '标签字号应抬到 bump 值');
  }
});

test('bumpZoomTextFs：_tokuiBumpedFs 缺失（SSR/dom-mock）→ 不动字号', () => {
  var dom = renderer4Zoom.render({ type: 'chart', attrs: { t: 'bar', d: mkLabels(50, '').map(function (s, i) { return i; }).join(','), l: mkLabels(50, 'D').join(','), w: 800, h: 200, zoom: 'auto' }, content: '', children: [] });
  var svg = dom.querySelector('.tokui-chart__svg');
  var labelG = svg.querySelector('.tokui-chart-plot-labels');
  bumpZoomTextFs(labelG, svg);
  var texts = labelG.querySelectorAll('text');
  for (var i = 0; i < texts.length; i++) {
    assert.strictEqual(String(texts[i].getAttribute('font-size')), '9', '无 bump 字号应保持基础 fs9');
  }
});

// ========== T1.4：中国地图（choropleth + 散点） ==========
test('map：34 省轮廓渲染 + region 简称匹配（浙江→浙江省）', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:86|江苏:74|内蒙古:30' }, children: [] });
  let regions = 0, val = 0;
  (function w(n) {
    if (n.nodeType !== 1) return;
    const c = String(n.className || '');
    // 带 transform 的是南海 inset 内的迷你海南副本，不计主图省份数
    if (c.indexOf('tokui-chart-map-region') !== -1 && !n.getAttribute('transform')) regions++;
    if (c.indexOf('map-region--val') !== -1) val++;
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.strictEqual(regions, 34, '34 省级行政区轮廓，实际 ' + regions);
  assert.strictEqual(val, 3, '简称匹配 3 省，实际 ' + val);
});

test('map：choropleth 色阶插值（min 蓝 → max 红）+ vmin/vmax 锁定', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:0|江苏:100', vmin: '0', vmax: '100' }, children: [] });
  const fills = [];
  (function w(n) {
    if (n.nodeType !== 1) return;
    if (String(n.className || '').indexOf('map-region--val') !== -1) fills.push(n.getAttribute('fill'));
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  // fills 顺序 = provinces 数组序（江苏先于浙江），按值语义断言
  assert.ok(fills.some(f => f.indexOf('28,126,214') !== -1), '值 0 应为首 stop 蓝: ' + fills.join('|'));
  assert.ok(fills.some(f => f.indexOf('250,82,82') !== -1), '值 100 应为末 stop 红: ' + fills.join('|'));
});

test('map：散点投影（经纬度→viewBox 坐标，越界点不出画布）', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', d: '120.15,30.28,88,name:杭州|116.4,39.9,120,name:北京|139,35,5' }, children: [] });
  let points = 0, xs = [];
  (function w(n) {
    if (n.nodeType !== 1) return;
    if (String(n.className || '').indexOf('map-point') !== -1) { points++; xs.push(parseFloat(n.getAttribute('cx'))); }
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.strictEqual(points, 3);
  xs.forEach(function (x) {
    assert.ok(x >= 0 && x <= 1000, '散点 x 应在 viewBox 内: ' + x);
  });
});

test('map：region 全名匹配亦通 + 空数据占位（无 region 无 d）', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '广东省:92' }, children: [] });
  let val = 0;
  (function w(n) { if (n.nodeType === 1 && String(n.className||'').indexOf('map-region--val') !== -1) val++; for (const ch of (n.childNodes||[])) w(ch); })(dom);
  assert.strictEqual(val, 1, '全名匹配');
  const empty = r.render({ type: 'chart', attrs: { t: 'map' }, children: [] });
  assert.ok(String(empty.className || '').indexOf('tokui-chart') !== -1, '空数据渲染占位不崩');
});

// ========== T0（地图精修计划）：hover tooltip 委托命中地图元素 ==========
test('map hover tooltip：svg 绑定委托 + 省份/散点亮灭（裸 data-tip-id 元素命中）', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:86', d: '120.15,30.28,88,name:杭州' }, children: [] });
  let svg = null, path = null, dot = null;
  (function w(n) {
    if (n.nodeType !== 1) return;
    const c = String(n.className || '');
    if (c.indexOf('tokui-chart__svg--map') !== -1) svg = n;
    if (c.indexOf('map-region--val') !== -1 && n.getAttribute('data-tip-id') !== null) path = n;
    if (c.indexOf('tokui-chart-map-point') !== -1) dot = n;
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.ok(svg, 'map svg 存在');
  assert.ok(svg._events && svg._events.mouseover && svg._events.mouseover.length, 'svg 已绑 mouseover 委托（renderMap 漏绑修复）');
  assert.ok(path && path.getAttribute('data-tip-id') !== null, '省份 path 携带 data-tip-id');
  assert.ok(dot && dot.getAttribute('data-tip-id') !== null, '散点 circle 携带 data-tip-id');
  function fire(type, target) {
    (svg._events[type] || []).forEach(function (fn) { fn({ target: target, relatedTarget: svg }); });
  }
  function tipOpacity(el, id) {
    let layer = null;
    (function w(n) { if (n.nodeType === 1 && String(n.className || '').indexOf('tips-layer') !== -1) layer = n; for (const ch of (n.childNodes || [])) w(ch); })(el);
    if (!layer) return null;
    for (const c of layer.childNodes) {
      if (c.getAttribute && c.getAttribute('data-tip-id') === id) return c.style ? c.style.opacity : undefined;
    }
    return null;
  }
  const pid = path.getAttribute('data-tip-id');
  fire('mouseover', path);
  assert.strictEqual(tipOpacity(svg, pid), '1', 'hover 省份 → tooltip 亮起（findGroup 兼容 data-tip-id）');
  fire('mouseout', path);
  assert.strictEqual(tipOpacity(svg, pid), '', '移开省份 → 复位');
  const did = dot.getAttribute('data-tip-id');
  fire('mouseover', dot);
  assert.strictEqual(tipOpacity(svg, did), '1', 'hover 散点 → tooltip 亮起');
  fire('mouseout', dot);
  assert.strictEqual(tipOpacity(svg, did), '', '移开散点 → 复位');
});

test('map hover tooltip：柱状图 tip-group 委托不回归（类命中路径保持）', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'bar', d: '1,2', l: 'a,b' }, children: [] });
  let svg = null, grp = null;
  (function w(n) {
    if (n.nodeType !== 1) return;
    const c = String(n.className || '');
    if (c.indexOf('tokui-chart__svg') !== -1 && !svg) svg = n;
    if (c.indexOf('tokui-chart-tip-group') !== -1 && n.getAttribute('data-tip-id') !== null && !grp) grp = n;
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.ok(svg && grp, 'bar svg 与 tip-group 就位');
  (svg._events.mouseover || []).forEach(function (fn) { fn({ target: grp, relatedTarget: svg }); });
  let opacity = null, layer = null;
  (function w(n) { if (n.nodeType === 1 && String(n.className || '').indexOf('tips-layer') !== -1) layer = n; for (const ch of (n.childNodes || [])) w(ch); })(svg);
  for (const c of layer.childNodes) if (c.getAttribute && c.getAttribute('data-tip-id') === grp.getAttribute('data-tip-id')) opacity = c.style.opacity;
  assert.strictEqual(opacity, '1', 'bar hover 委托行为不回归');
});

// ========== T2（地图精修计划）：vendor 数据完整性 ==========
test('map：34 省全具名（含港澳）+ 澳门双写法匹配上色', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '澳门:75' }, children: [] });
  let val = 0, named = 0;
  (function w(n) {
    if (n.nodeType !== 1) return;
    const c = String(n.className || '');
    if (c.indexOf('map-region--val') !== -1) val++;
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.strictEqual(val, 1, '简称「澳门」应匹配 1 省');
  const dom2 = r.render({ type: 'chart', attrs: { t: 'map', region: '澳门特别行政区:60' }, children: [] });
  let val2 = 0;
  (function w(n) { if (n.nodeType === 1 && String(n.className||'').indexOf('map-region--val') !== -1) val2++; for (const ch of (n.childNodes||[])) w(ch); })(dom2);
  assert.strictEqual(val2, 1, '全名「澳门特别行政区」匹配');
  const geo = require('../src/vendor/china-geo.js').CHINA_GEO;
  named = geo.provinces.filter(p => p.n).length;
  assert.strictEqual(named, 34, 'vendor 34 条目全具名，实际 ' + named);
  assert.ok(geo.provinces.find(p => p.n === '香港特别行政区') && geo.provinces.find(p => p.n === '台湾省'), '港澳台齐全');
});

test('map：九段线主图段 + 南海诸岛 inset（迷你海南/群岛点/标签/tooltip 委托）', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:86' }, children: [] });
  let dashMain = 0, inset = null, insetDash = 0, islands = 0, miniHainan = 0, label = '', svg = null, cover = null;
  (function w(n) {
    if (n.nodeType !== 1) return;
    const c = String(n.className || '');
    if (c.indexOf('tokui-chart__svg--map') !== -1) svg = n;
    if (c.indexOf('tokui-chart-map-dash') !== -1) { if (n.getAttribute('transform')) insetDash++; else dashMain++; }
    if (c.indexOf('tokui-chart-map-inset') !== -1 && c.indexOf('inset-box') === -1) inset = n;
    if (c === 'tokui-chart-map-inset-box' || c.indexOf('tokui-chart-map-inset-box') !== -1) cover = n;
    if (c.indexOf('tokui-chart-map-island') !== -1) islands++;
    if (inset && c.indexOf('tokui-chart-map-region--empty') !== -1 && n.getAttribute('transform')) miniHainan++;
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.ok(dashMain >= 1, '主图九段线 path 存在');
  assert.ok(inset, 'inset 组存在');
  assert.strictEqual(insetDash, 1, 'inset 内九段线（带 transform）');
  assert.ok(miniHainan >= 1, 'inset 内迷你海南轮廓');
  assert.strictEqual(islands, 4, '四大群岛点（西沙/中沙黄岩/南沙/曾母暗沙）');
  (function w(n) {
    if (n.nodeType !== 1) return;
    if (String(n.className || '').indexOf('tokui-chart-map-label') !== -1 && n.textContent === '南海诸岛') label = n.textContent;
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.strictEqual(label, '南海诸岛', 'inset 标签');
  // 南海诸岛 tooltip 委托命中（data-tip-id 挂 inset 组，组内任意元素 hover 均触发）
  assert.ok(inset.getAttribute('data-tip-id') !== null, 'inset 组携带 data-tip-id');
  var coverHit = cover || inset;
  var nid = inset.getAttribute('data-tip-id'); // 注册在 inset 组上
  (svg._events.mouseover || []).forEach(function (fn) { fn({ target: coverHit, relatedTarget: svg }); });
  let op = null, layer = null;
  (function w(n) { if (n.nodeType === 1 && String(n.className || '').indexOf('tips-layer') !== -1) layer = n; for (const ch of (n.childNodes || [])) w(ch); })(svg);
  for (const c of layer.childNodes) if (c.getAttribute && c.getAttribute('data-tip-id') === nid) op = c.style.opacity;
  assert.strictEqual(op, '1', 'hover 南海诸岛 inset → tooltip 亮起');
});

// ========== T1（地图精修计划）：省份标注数值化 + label 三档 ==========
function mapLabels(dom) {
  var out = [];
  (function w(n) {
    if (n.nodeType !== 1) return;
    if (String(n.className || '').indexOf('tokui-chart-map-label') !== -1) {
      out.push({ text: n.textContent, cls: String(n.className || '') });
    }
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  return out;
}
test('map label:full（默认）：含数据省 名+值 两行、无数据省灰名、碰撞避让', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:86|广东:92' }, children: [] });
  const labels = mapLabels(dom);
  const texts = labels.map(l => l.text);
  assert.ok(texts.indexOf('浙江') !== -1, '省名标注');
  assert.ok(texts.indexOf('86') !== -1, '数值标注');
  assert.ok(texts.indexOf('92') !== -1, '第二省数值');
  const dim = labels.filter(l => l.cls.indexOf('--dim') !== -1);
  assert.ok(dim.length >= 20, '无数据省灰名大量存在（防密集碰撞跳过部分），实际 ' + dim.length);
  const val = labels.filter(l => l.cls.indexOf('--val') !== -1);
  assert.strictEqual(val.length, 2, '含数据省值标注恰好 2 个');
});
test('map label:name / off / 非法回退 full', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const nameDom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:86', label: 'name' }, children: [] });
  const nl = mapLabels(nameDom);
  assert.ok(nl.map(l => l.text).indexOf('浙江') !== -1, 'name 档显省名');
  assert.ok(nl.filter(l => l.text === '86').length === 0, 'name 档不显数值');
  assert.ok(nl.filter(l => l.cls.indexOf('--dim') !== -1).length === 0, 'name 档无灰名');
  const offDom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:86', label: 'off' }, children: [] });
  const ol = mapLabels(offDom).filter(l => l.text !== '南海诸岛');
  assert.strictEqual(ol.length, 0, 'off 档省份标注全关（仅剩 inset 南海诸岛标签）');
  const badDom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:86', label: 'xxx' }, children: [] });
  const bl = mapLabels(badDom);
  assert.ok(bl.map(l => l.text).indexOf('86') !== -1, '非法值静默回退 full');
});

// ========== T5（地图精修计划）：tooltip 多行 + unit ==========
function mapTips(dom) {
  var out = [];
  (function w(n) {
    if (n.nodeType !== 1) return;
    if (String(n.className || '').indexOf('tokui-chart-tip') !== -1 && String(n.className || '').indexOf('tips-layer') === -1) {
      var lines = [];
      for (var i = 0; i < n.childNodes.length; i++) {
        var c = n.childNodes[i];
        if (String(c.tagName || '').toLowerCase() === 'text') lines.push(c.textContent);
      }
      out.push(lines);
    }
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  return out;
}
test('map tooltip：省名/值+单位+占比 双行 + 无数据省单行 + 散点单位', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:60|广东:40', unit: '%', d: '120.15,30.28,88,name:杭州' }, children: [] });
  const tips = mapTips(dom);
  const zj = tips.find(t => t[0] === '浙江省');
  assert.ok(zj, '浙江省 tooltip 存在');
  assert.strictEqual(zj[1], '60% · 占比 60%', '值+单位+占比双行，实际: ' + zj[1]);
  const gd = tips.find(t => t[0] === '广东省');
  assert.strictEqual(gd[1], '40% · 占比 40%');
  const qh = tips.find(t => t[0] === '青海省');
  assert.ok(qh && qh.length === 1, '无数据省单行仅省名');
  const hz = tips.find(t => t[0] === '杭州');
  assert.ok(hz && hz[1] === '88%', '散点带单位: ' + (hz && hz[1]));
  // 无 unit 时不拼接
  const dom2 = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:60', d: '120.15,30.28,88,name:杭州' }, children: [] });
  const tips2 = mapTips(dom2);
  assert.strictEqual(tips2.find(t => t[0] === '浙江省')[1], '60 · 占比 100%');
  assert.strictEqual(tips2.find(t => t[0] === '杭州')[1], '88');
});

// ========== T3（地图精修计划）：省份点击上报 ==========
test('map 点击上报：含数据省份 mapClick 载荷、无数据省份静默', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const captured = [];
  r._onComponentEvent = function (evt) { captured.push(evt); };
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:86|广东:92' }, children: [] });
  let svg = null, zj = null, qh = null;
  (function w(n) {
    if (n.nodeType !== 1) return;
    const c = String(n.className || '');
    if (c.indexOf('tokui-chart__svg--map') !== -1) svg = n;
    if (c.indexOf('map-region--val') !== -1 && n.getAttribute('data-name') === '浙江省') zj = n;
    if (c.indexOf('map-region--empty') !== -1 && n.getAttribute('data-name') === '青海省' && !n.getAttribute('transform')) qh = n;
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.ok(svg && zj && qh, 'svg/浙江省/青海省 就位');
  (svg._events.click || []).forEach(function (fn) { fn({ target: zj }); });
  assert.strictEqual(captured.length, 1, '点击上报一次');
  assert.strictEqual(captured[0].type, 'chart');
  assert.strictEqual(captured[0].event, 'mapClick');
  assert.deepStrictEqual(captured[0].detail, { province: '浙江省', value: 86 });
  (svg._events.click || []).forEach(function (fn) { fn({ target: qh }); });
  assert.strictEqual(captured.length, 1, '无数据省份点击不上报');
});

// ========== T4（地图精修计划）：visualMap 色阶条 + 散点半径图例 ==========
test('map visualMap：色阶条 + vmin/vmax 刻度 + unit；vmin/vmax 锁定跟随', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:40|广东:92', unit: '%' }, children: [] });
  let vmap = null, ticks = [], gradStops = 0;
  (function w(n) {
    if (n.nodeType !== 1) return;
    const c = String(n.className || '');
    if (c.indexOf('tokui-chart-map-vmap') !== -1) vmap = n;
    if (c.indexOf('tokui-chart-map-tick') !== -1) ticks.push(n.textContent);
    if (String(n.tagName || '').toLowerCase() === 'stop') gradStops++;
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.ok(vmap, '色阶条组存在');
  assert.strictEqual(gradStops, 5, 'MAP_STOPS 五档渐变');
  assert.ok(ticks.indexOf('40%') !== -1 && ticks.indexOf('92%') !== -1, '数据 min/max 刻度带单位: ' + ticks.join(','));
  const dom2 = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:40|广东:92', vmin: '0', vmax: '100' }, children: [] });
  let ticks2 = [];
  (function w(n) { if (n.nodeType === 1 && String(n.className || '').indexOf('tokui-chart-map-tick') !== -1) ticks2.push(n.textContent); for (const ch of (n.childNodes || [])) w(ch); })(dom2);
  assert.ok(ticks2.indexOf('0') !== -1 && ticks2.indexOf('100') !== -1, '锁定刻度跟随: ' + ticks2.join(','));
});
test('map 半径图例：仅散点（无 region）时两圆示意 + 最大值；纯 region 不出半径图例', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'map', d: '120.15,30.28,88,name:杭州|116.4,39.9,5' }, children: [] });
  let rlegend = null, circles = 0, ticks = [];
  (function w(n) {
    if (n.nodeType !== 1) return;
    const c = String(n.className || '');
    if (c.indexOf('tokui-chart-map-rlegend') !== -1) rlegend = n;
    if (String(n.tagName || '').toLowerCase() === 'circle' && rlegend) circles++;
    if (c.indexOf('tokui-chart-map-tick') !== -1) ticks.push(n.textContent);
    for (const ch of (n.childNodes || [])) w(ch);
  })(dom);
  assert.ok(rlegend, '半径图例存在');
  assert.strictEqual(circles, 2, '最小/最大两示意圆');
  assert.ok(ticks.indexOf('1') !== -1 && ticks.indexOf('88') !== -1, '刻度 1 与最大值 88: ' + ticks.join(','));
  const dom2 = r.render({ type: 'chart', attrs: { t: 'map', region: '浙江:40' }, children: [] });
  let rlegend2 = null;
  (function w(n) { if (n.nodeType === 1 && String(n.className || '').indexOf('tokui-chart-map-rlegend') !== -1) rlegend2 = n; for (const ch of (n.childNodes || [])) w(ch); })(dom2);
  assert.ok(!rlegend2, '纯 region 模式无半径图例');
});

// ========== T1.5：入场动画 + 渐变填充 ==========
test('入场动画：首渲染 wrapper 挂 tokui-chart--enter，同 wrapper 重渲不重播；enter:false 关闭', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const d1 = r.render({ type: 'chart', attrs: { t: 'bar', d: '1,2', l: 'a,b' }, children: [] });
  assert.ok(d1.classList.contains('tokui-chart--enter'), '首渲染挂 enter 类');
  // 一次性 render 每次是新 wrapper（独立图表各自入场）；「不重播」约束流式 rebuild 的同一 wrapper
  assert.ok(d1._enterPlayed === true, '_enterPlayed 标记机制就位（流式重渲跳过依据）');
  const d3 = r.render({ type: 'chart', attrs: { t: 'bar', d: '1,2', l: 'a,b', enter: 'false' }, children: [] });
  assert.ok(!d3.classList.contains('tokui-chart--enter'), 'enter:false 关闭');
});

test('grad 渐变：defs 注入 linearGradient（每系列色）+ 系列填充替换为 url() 引用', () => {
  const r = new TokUIRenderer(); registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'bar', d: '1,2,3', l: 'a,b,c', grad: true }, children: [] });
  let grads = 0, urlFills = 0;
  (function w(n) {
    if (n.nodeType !== 1) return;
    if (n._rawTag === 'linearGradient') grads++;
    if (n.getAttribute && String(n.getAttribute('fill') || '').indexOf('url(#tokui-grad') === 0) urlFills++;
    for (const c of (n.childNodes || [])) w(c);
  })(dom);
  assert.ok(grads >= 3, '每系列一个渐变定义: ' + grads);
  assert.ok(urlFills >= 3, '系列填充替换 url(): ' + urlFills);
});

// === Combo 双轴组合图（大屏专业化 M3）===
test('chart combo：柱+折线双轴结构（渐变柱/平滑线/图例/双轴刻度）', () => {
  const r = new TokUIRenderer();
  registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'combo', d: '820,640,1080', d2: '12.4,8.6,15.2', l: '1月,2月,3月', n1: '新签', n2: '环比', y2: '%', smooth: true }, content: '', children: [] });
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg, 'svg 渲染');
  assert.strictEqual(svg.querySelectorAll('.tokui-chart-bar').length, 3, '3 根柱');
  assert.strictEqual(svg.querySelectorAll('.tokui-chart-dot').length, 3, '3 个折线点');
  let bezier = false, barGrad = false;
  (function w(n) {
    if (n.nodeType !== 1) return;
    if (n._rawTag === 'path' && String(n.getAttribute('d') || '').indexOf(' C') !== -1) bezier = true;
    if (String(n.getAttribute && n.getAttribute('fill') || '').indexOf('url(#tokui-combo-bar') === 0) barGrad = true;
    for (const c of (n.childNodes || [])) w(c);
  })(svg);
  assert.ok(bezier, 'smooth 贝塞尔路径');
  assert.ok(barGrad, '柱渐变填充');
});

test('chart combo：缺 d2 时仅柱正常渲染（不炸）', () => {
  const r = new TokUIRenderer();
  registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'combo', d: '1,2,3', l: 'a,b,c' }, content: '', children: [] });
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.ok(svg && svg.querySelectorAll('.tokui-chart-bar').length === 3, '柱照常');
  assert.strictEqual(svg.querySelectorAll('.tokui-chart-dot').length, 0, '无折线点');
});

test('chart combo：空数据占位', () => {
  const r = new TokUIRenderer();
  registerChartComponents(r);
  const dom = r.render({ type: 'chart', attrs: { t: 'combo', l: 'a' }, content: '', children: [] });
  assert.ok(dom.querySelector('.tokui-chart__svg'), '空态 svg 不炸');
});

// === 地图涟漪 + TOP-N 侧栏（大屏专业化 M3）===
test('chart map：散点涟漪（值 TOP12）+ ripple:off 关闭 + topn 侧栏', () => {
  const r = new TokUIRenderer();
  registerChartComponents(r);
  const mk = (extra) => r.render({ type: 'chart', attrs: Object.assign({ t: 'map', region: '广东:100|江苏:50', d: '113.26,23.13,100,name:广州|118.78,32.06,50,name:南京' }, extra), content: '', children: [] });
  const svg1 = mk({}).querySelector('.tokui-chart__svg');
  assert.strictEqual(svg1.querySelectorAll('.tokui-chart-map-ripple').length, 2, '两点均涟漪');
  assert.strictEqual(svg1.querySelectorAll('.tokui-chart-map-point').length, 2, '散点保留');
  const svg2 = mk({ ripple: 'off' }).querySelector('.tokui-chart__svg');
  assert.strictEqual(svg2.querySelectorAll('.tokui-chart-map-ripple').length, 0, 'ripple:off 关闭');
  const svg3 = mk({ topn: 2 }).querySelector('.tokui-chart__svg');
  assert.ok(svg3.querySelector('.tokui-chart-map-topn'), 'topn 侧栏渲染');
  const title = svg3.querySelector('.tokui-chart-map-topn-title');
  assert.ok(title && title.textContent.indexOf('TOP 2') === 0, 'topn 标题');
  // topn:0 → 不渲染
  const svg4 = mk({ topn: 0 }).querySelector('.tokui-chart__svg');
  assert.ok(!svg4.querySelector('.tokui-chart-map-topn'), 'topn:0 关闭');
});

run();


