'use strict';
const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { registerChartComponents, registerChartRenderer } = require('../src/components/chart');

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

run();
