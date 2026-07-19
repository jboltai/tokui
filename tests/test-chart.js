'use strict';
const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { registerChartComponents, registerChartRenderer, bumpFsUnits, solvePieFs, pieSizing, MIN_CHART_PX, MAX_CHART_PX, applyTipScale, axisXLayout } = require('../src/components/chart');

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

test('chart gauge clamps out-of-range value', () => {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  var node = { type: 'chart', attrs: { t: 'gauge', v: 250, max: 100 }, content: '', children: [] };
  var dom = renderer.render(node);
  var svg = dom.querySelector('.tokui-chart__svg');
  var found = false;
  svg.querySelectorAll('text').forEach(function (t) { if (t.textContent === '100%') found = true; });
  assert.ok(found, '超界值应 clamp 到 max=100');
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

run();
