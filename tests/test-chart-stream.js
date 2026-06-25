'use strict';
// 图表容器流式渲染测试：chart 容器模式 + pt/task/ms 子节点增量重绘
const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { TokUIParser } = require('../src/core/parser');
const { registerChartComponents } = require('../src/components/chart');

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

function newRenderer() {
  const renderer = new TokUIRenderer();
  registerChartComponents(renderer);
  return renderer;
}
function chartOpen(type, extraAttrs) {
  var a = Object.assign({ t: type }, extraAttrs || {});
  return { type: 'chart', attrs: a, content: '', children: [], _stream: 'open' };
}
function pt(v) { return { type: 'pt', attrs: { v: v }, content: '', children: [] }; }
function task(content) { return { type: 'task', attrs: {}, content: content, children: [] }; }
function ms(content) { return { type: 'ms', attrs: {}, content: content, children: [] }; }

// === 容器模式：流式增量重绘 ===

test('容器 chart open 创建 wrapper + _chartState + _tokuiChartAppend', () => {
  const dom = newRenderer().render(chartOpen('bar'));
  assert.ok(dom._chartState, '应有 _chartState');
  assert.strictEqual(dom._chartState.type, 'bar');
  assert.strictEqual(typeof dom._tokuiChartAppend, 'function');
});

test('容器 bar 流式喂 3 pt → 3 柱', () => {
  const dom = newRenderer().render(chartOpen('bar'));
  dom._tokuiChartAppend(pt(10));
  dom._tokuiChartAppend(pt(20));
  dom._tokuiChartAppend(pt(30));
  const bars = dom.querySelectorAll('.tokui-chart-bar');
  assert.strictEqual(bars.length, 3);
});

test('容器 bar 增量追加柱数增长（rebuild 复用同一 wrapper）', () => {
  const dom = newRenderer().render(chartOpen('bar'));
  for (var i = 1; i <= 5; i++) dom._tokuiChartAppend(pt(i * 10));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-bar').length, 5);
  dom._tokuiChartAppend(pt(60));
  dom._tokuiChartAppend(pt(70));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-bar').length, 7);
});

test('容器 pie 流式喂 4 pt → 4 切片', () => {
  const dom = newRenderer().render(chartOpen('pie', { l: 'A,B,C,D' }));
  [10, 20, 30, 40].forEach(function (v) { dom._tokuiChartAppend(pt(v)); });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-slice').length, 4);
});

test('容器 line 流式喂点 → polyline', () => {
  const dom = newRenderer().render(chartOpen('line'));
  [5, 8, 3, 9].forEach(function (v) { dom._tokuiChartAppend(pt(v)); });
  const svg = dom.querySelector('.tokui-chart__svg');
  assert.strictEqual(svg.querySelectorAll('polyline').length, 1);
});

test('容器 donut 流式喂点 → 切片', () => {
  const dom = newRenderer().render(chartOpen('donut'));
  [60, 40].forEach(function (v) { dom._tokuiChartAppend(pt(v)); });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-slice').length, 2);
});

test('容器 funnel 流式喂点 → 梯形逐层累加', () => {
  const dom = newRenderer().render(chartOpen('funnel', { l: '访问,注册,下单,付款' }));
  dom._tokuiChartAppend(pt(100));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-funnel').length, 1);
  dom._tokuiChartAppend(pt(60));
  dom._tokuiChartAppend(pt(30));
  dom._tokuiChartAppend(pt(10));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-funnel').length, 4);
});

test('容器 radar 流式喂点 → 数据多边形', () => {
  const dom = newRenderer().render(chartOpen('radar', { l: 'a,b,c,d' }));
  [90, 70, 85, 60].forEach(function (v) { dom._tokuiChartAppend(pt(v)); });
  const svg = dom.querySelector('.tokui-chart__svg');
  // 数据多边形 + 4 个网格环 = 5 个 polygon
  assert.ok(svg.querySelectorAll('polygon').length >= 5);
});

test('容器 scatter 流式喂 "x,y" 点', () => {
  const dom = newRenderer().render(chartOpen('scatter'));
  dom._tokuiChartAppend(pt('1,2'));
  dom._tokuiChartAppend(pt('3,4'));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-point').length, 2);
});

// === 甘特图容器流式 ===

test('容器 gantt 流式喂 task → 任务条', () => {
  const dom = newRenderer().render(chartOpen('gantt', { mode: 'days', gnames: 'A|B' }));
  dom._tokuiChartAppend(task('需求,0,3,50,0'));
  dom._tokuiChartAppend(task('开发,3,8,30,1'));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-task-bar').length, 2);
});

test('容器 gantt 流式喂 ms → 里程碑菱形', () => {
  const dom = newRenderer().render(chartOpen('gantt', { mode: 'days' }));
  dom._tokuiChartAppend(task('开发,0,5,50,0'));
  dom._tokuiChartAppend(ms('发布,5,0'));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-task-ms').length, 1);
});

test('容器 gantt 增量 task → 条数增长', () => {
  const dom = newRenderer().render(chartOpen('gantt', { mode: 'days' }));
  dom._tokuiChartAppend(task('t1,0,2,0,0'));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-task-bar').length, 1);
  dom._tokuiChartAppend(task('t2,2,4,0,0'));
  dom._tokuiChartAppend(task('t3,4,6,0,0'));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-task-bar').length, 3);
});

test('容器 gantt deps 引用未到 task → 跳过不崩', () => {
  const dom = newRenderer().render(chartOpen('gantt', { mode: 'days', deps: '0->2' }));
  dom._tokuiChartAppend(task('t0,0,2,0,0'));
  // 只到 t0，deps 0->2 引用的 t2 尚未到 → parseDeps filter 越界，不画该箭头，不崩
  assert.doesNotThrow(function () {
    dom._tokuiChartAppend(task('t1,2,3,0,0'));
  });
});

// === 全量 parse + 自闭合回归 ===

test('全量 parse 容器 chart（children 已就绪）一次渲染', () => {
  const node = { type: 'chart', attrs: { t: 'bar' }, content: '', children: [
    { type: 'pt', attrs: { v: 5 }, content: '', children: [] },
    { type: 'pt', attrs: { v: 8 }, content: '', children: [] },
  ] };
  const dom = newRenderer().render(node);
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-bar').length, 2);
});

test('自闭合旧路径不破（d 内联数据，无 _chartState）', () => {
  const dom = newRenderer().render({ type: 'chart', attrs: { t: 'bar', d: '1,2,3' }, content: '', children: [] });
  assert.ok(!dom._chartState, '自闭合不应有 _chartState');
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-bar').length, 3);
});

test('自闭合 gantt 旧路径不破（tasks 内联）', () => {
  const dom = newRenderer().render({ type: 'chart', attrs: { t: 'gantt', mode: 'days', tasks: 'a,0,2,50,0|b,2,4,30,1' }, content: '', children: [] });
  assert.ok(!dom._chartState);
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-task-bar').length, 2);
});

test('wrapper 标题 tt 在容器模式保留', () => {
  const dom = newRenderer().render(chartOpen('bar', { tt: '销售趋势' }));
  const titles = dom.querySelectorAll('.tokui-chart__title');
  assert.strictEqual(titles.length, 1);
  dom._tokuiChartAppend(pt(10));
  // rebuild 后标题仍在
  assert.strictEqual(dom.querySelectorAll('.tokui-chart__title').length, 1);
});

// === 自闭合 chart 流式预览（parser 半成品 attrs 渐增 → renderer rebuild）===

function mountPreview(renderer, key, attrs, isFinal) {
  var node = { type: 'chart', attrs: attrs, _previewKey: key };
  if (!isFinal) node._streamPreview = true;
  return node;
}

test('自闭合 bar 流式预览：attrs 渐增 → 柱渐增，wrapper 复用', () => {
  const renderer = newRenderer();
  const root = document.createElement('div');
  renderer.mountStreaming(mountPreview(renderer, 100, { t: 'bar', d: '1,2' }), root);
  assert.strictEqual(root.querySelectorAll('.tokui-chart').length, 1);
  assert.strictEqual(root.querySelectorAll('.tokui-chart-bar').length, 2);
  renderer.mountStreaming(mountPreview(renderer, 100, { t: 'bar', d: '1,2,3,4' }), root);
  assert.strictEqual(root.querySelectorAll('.tokui-chart').length, 1, '复用同一 wrapper');
  assert.strictEqual(root.querySelectorAll('.tokui-chart-bar').length, 4);
  // finalize（无 _streamPreview，带 _previewKey）→ 用最终 attrs 更新一次
  renderer.mountStreaming(mountPreview(renderer, 100, { t: 'bar', d: '1,2,3,4,5' }, true), root);
  assert.strictEqual(root.querySelectorAll('.tokui-chart').length, 1, 'finalize 仍复用');
  assert.strictEqual(root.querySelectorAll('.tokui-chart-bar').length, 5);
});

test('自闭合 gantt 流式预览：tasks 渐增 → 任务条渐增', () => {
  const renderer = newRenderer();
  const root = document.createElement('div');
  renderer.mountStreaming(mountPreview(renderer, 200, { t: 'gantt', mode: 'days', tasks: 'a,0,2,50,0' }), root);
  assert.strictEqual(root.querySelectorAll('.tokui-chart-task-bar').length, 1);
  renderer.mountStreaming(mountPreview(renderer, 200, { t: 'gantt', mode: 'days', tasks: 'a,0,2,50,0|b,2,4,30,1' }), root);
  assert.strictEqual(root.querySelectorAll('.tokui-chart-task-bar').length, 2);
  renderer.mountStreaming(mountPreview(renderer, 200, { t: 'gantt', mode: 'days', tasks: 'a,0,2,50,0|b,2,4,30,1|c,4,6,0,1' }, true), root);
  assert.strictEqual(root.querySelectorAll('.tokui-chart-task-bar').length, 3);
});

test('自闭合 chart finalize 无 pending 时走普通子节点', () => {
  const renderer = newRenderer();
  const root = document.createElement('div');
  // 直接 finalize（无预览）→ 普通渲染
  renderer.mountStreaming(mountPreview(renderer, 300, { t: 'bar', d: '1,2,3' }, true), root);
  assert.strictEqual(root.querySelectorAll('.tokui-chart-bar').length, 3);
});

test('容器 bubble 流式喂 pt(x,y,size) → 2 点', () => {
  const dom = newRenderer().render(chartOpen('bubble'));
  dom._tokuiChartAppend(pt('1,2,5'));
  dom._tokuiChartAppend(pt('3,4,10'));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-point').length, 2);
});

test('容器 scatter 流式 y 轴范围只扩不缩（防已画点跳变根因回归）', () => {
  const dom = newRenderer().render(chartOpen('scatter'));
  dom._tokuiChartAppend(pt('1,10'));
  dom._tokuiChartAppend(pt('2,20'));
  const y1 = { lo: dom._yRange.lo, hi: dom._yRange.hi };
  // 新点扩张上下界 → 缓存只扩不缩，已画点 py 不再因范围重算全跳
  dom._tokuiChartAppend(pt('3,5'));
  dom._tokuiChartAppend(pt('4,50'));
  const y2 = { lo: dom._yRange.lo, hi: dom._yRange.hi };
  assert.ok(dom._xRange && dom._yRange, 'scatter x/y 范围缓存已建立');
  assert.ok(y2.lo <= y1.lo, 'y lo 只扩不缩（向下扩或 nice 后不变）');
  assert.ok(y2.hi >= y1.hi, 'y hi 只扩不缩（向上扩或 nice 后不变）');
});

test('容器 bubble 流式 x/y 轴范围只扩不缩', () => {
  const dom = newRenderer().render(chartOpen('bubble'));
  dom._tokuiChartAppend(pt('1,10,5'));
  dom._tokuiChartAppend(pt('2,20,8'));
  const y1 = { lo: dom._yRange.lo, hi: dom._yRange.hi };
  dom._tokuiChartAppend(pt('0,5,3'));
  dom._tokuiChartAppend(pt('5,50,9'));
  const y2 = { lo: dom._yRange.lo, hi: dom._yRange.hi };
  assert.ok(y2.lo <= y1.lo && y2.hi >= y1.hi, 'bubble y 只扩不缩');
});

test('容器 bubble 流式半径维度 sMax 只扩不缩（防已画点半径跳变）', () => {
  const dom = newRenderer().render(chartOpen('bubble'));
  dom._tokuiChartAppend(pt('1,10,5'));
  dom._tokuiChartAppend(pt('2,20,8'));
  const s1 = dom._sMax;
  // 新点 s 不超 8 → sMax 不变；再喂大 s → 只扩
  dom._tokuiChartAppend(pt('3,15,3'));
  assert.strictEqual(dom._sMax, s1, '小 s 不扩 sMax');
  dom._tokuiChartAppend(pt('4,25,20'));
  assert.ok(dom._sMax >= s1 && dom._sMax >= 20, '大 s 只扩不缩');
});

test('容器 scatter 显式 ymin/ymax 锁轴：极值扩张时已画点 cy 绝对稳定（零跳变）', () => {
  const dom = newRenderer().render(chartOpen('scatter', { ymin: 0, ymax: 100 }));
  dom._tokuiChartAppend(pt('1,10'));
  dom._tokuiChartAppend(pt('2,90'));
  const cy1 = dom.querySelectorAll('.tokui-chart-point')[0].getAttribute('cy');
  dom._tokuiChartAppend(pt('3,5'));    // 数据 yMin 降到 5，但锁轴 0..100 → cy 不变
  dom._tokuiChartAppend(pt('4,200'));  // 超 ymax，仍按 0..100 投影 → cy 不变
  const cy2 = dom.querySelectorAll('.tokui-chart-point')[0].getAttribute('cy');
  assert.strictEqual(cy1, cy2, '显式锁轴：极值扩张时已画点 cy 绝对不变');
});

test('自闭合 scatter 显式 xmin/xmax/ymin/ymax 覆盖裸 min/max', () => {
  const dom = newRenderer().render({ type: 'chart', attrs: { t: 'scatter', d: '1,10;2,90', xmin: '0', xmax: '10', ymin: '0', ymax: '100' } });
  assert.ok(dom.querySelectorAll('.tokui-chart-point').length >= 2, '显式轴不崩，正常渲染');
});

test('容器 heatmap 流式喂 hrow → 多行矩阵（修复前退化单行）', () => {
  const dom = newRenderer().render(chartOpen('heatmap', { cols: 'A,B,C' }));
  dom._tokuiChartAppend({ type: 'hrow', attrs: {}, content: '1,2,3' });
  dom._tokuiChartAppend({ type: 'hrow', attrs: {}, content: '4,5,6' });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-cell').length, 6, '2 行 × 3 列 = 6 cell');
});

test('容器 sankey 流式喂 flow → 流路径（自动从 flow 提取节点）', () => {
  const dom = newRenderer().render(chartOpen('sankey'));
  dom._tokuiChartAppend({ type: 'flow', attrs: {}, content: 'A->B:10' });
  dom._tokuiChartAppend({ type: 'flow', attrs: {}, content: 'B->C:5' });
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-flow').length, 2, '2 条 flow 路径');
});

test('容器 treemap 流式喂 pt v:"名:值" → tile（修复前 parseFloat 丢）', () => {
  const dom = newRenderer().render(chartOpen('treemap'));
  dom._tokuiChartAppend(pt('A:100'));
  dom._tokuiChartAppend(pt('B:60'));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-tile').length, 2, '2 tile');
});

test('自闭合 heatmap/sankey/gauge 挂流式预览钩子（修复 renderer 判定与 builder 不一致）', () => {
  const hm = newRenderer().render({ type: 'chart', attrs: { t: 'heatmap', rows: '1,2,3|4,5,6', cols: 'A,B,C' } });
  const sk = newRenderer().render({ type: 'chart', attrs: { t: 'sankey', nodes: 'A,B', flows: 'A->B:10' } });
  const gg = newRenderer().render({ type: 'chart', attrs: { t: 'gauge', v: 50 } });
  assert.strictEqual(typeof hm._tokuiChartUpdate, 'function', 'heatmap 自闭合挂预览钩子（rows 内联）');
  assert.strictEqual(typeof sk._tokuiChartUpdate, 'function', 'sankey 自闭合挂预览钩子（nodes+flows 内联）');
  assert.strictEqual(typeof gg._tokuiChartUpdate, 'function', 'gauge 自闭合挂预览钩子（v 内联）');
});

test('容器 heatmap 带 cols + hrow + [/chart] 端到端渲染（parser cols 豁免 chart）', () => {
  const dsl = `[chart t:heatmap cols:"A,B,C" l:"X,Y,Z"][hrow v:"1,2,3"][hrow v:"4,5,6"][hrow v:"7,8,9"][/chart]`;
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse(dsl);
  const dom = newRenderer().render(nodes[0]);
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-cell').length, 9, '3 行 × 3 列 = 9 cell');
});

test('AI 实际输出：容器 heatmap 单 hrow 塞整矩阵也能渲染（join 还原 rows）', () => {
  const dsl = `[chart t:heatmap cols:"周一,周二,周三"][hrow v:"1,2,3|4,5,6|7,8,9"][/chart]`;
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse(dsl);
  const dom = newRenderer().render(nodes[0]);
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-cell').length, 9, '单 hrow 含 | → join 还原 3×3');
});

test('容器 heatmap 开标签先画骨架（cols+l 无 hrow → l×cols 占位网格）', () => {
  const dom = newRenderer().render(chartOpen('heatmap', { cols: 'A,B,C', l: 'X,Y,Z' }));
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-cell').length, 9, '3×3 骨架 cell');
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-cell--skeleton').length, 9, '全部骨架占位');
});

test('容器 heatmap 逐行喂 hrow → 已填染色、未到行骨架', () => {
  const dom = newRenderer().render(chartOpen('heatmap', { cols: 'A,B,C', l: 'X,Y,Z' }));
  dom._tokuiChartAppend({ type: 'hrow', attrs: {}, content: '1,2,3' });
  const total = dom.querySelectorAll('.tokui-chart-cell').length;
  const skel = dom.querySelectorAll('.tokui-chart-cell--skeleton').length;
  assert.strictEqual(total, 9, '总 9 cell');
  assert.strictEqual(total - skel, 3, '1 行填值 = 3 cell（非骨架）');
});

test('容器 heatmap 值域 vRange 只扩不缩（已填 cell 颜色稳定）', () => {
  const dom = newRenderer().render(chartOpen('heatmap', { cols: 'A,B,C', l: 'X,Y,Z' }));
  dom._tokuiChartAppend({ type: 'hrow', attrs: {}, content: '10,20,30' });
  const v1 = { lo: dom._vRange.lo, hi: dom._vRange.hi };
  dom._tokuiChartAppend({ type: 'hrow', attrs: {}, content: '5,50,15' });
  const v2 = { lo: dom._vRange.lo, hi: dom._vRange.hi };
  assert.ok(v2.lo <= v1.lo && v2.hi >= v1.hi, 'vRange 只扩不缩（极值回收不缩）');
});

test('自闭合 heatmap 显式 vmin/vmax 锁值域（绝对零跳）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[chart t:heatmap cols:"A,B" l:"X,Y" rows:"10,20|30,40" vmin:0 vmax:100]');
  const dom = newRenderer().render(nodes[0]);
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-cell').length, 4, '显式 vmin/vmax 不崩');
});

test('容器 heatmap hrow v 碎片（_kidPreview）→ 逐 cell 填、去重不重复行', () => {
  const dom = newRenderer().render(chartOpen('heatmap', { cols: 'A,B,C', l: 'X,Y,Z' }));
  const filled = (d) => d.querySelectorAll('.tokui-chart-cell').length - d.querySelectorAll('.tokui-chart-cell--skeleton').length;
  dom._tokuiChartAppend({ type: 'hrow', attrs: { v: '1,2' }, _kidPreview: true });     // row1 部分 2 cell
  const f1 = filled(dom);
  dom._tokuiChartAppend({ type: 'hrow', attrs: { v: '1,2,3' }, _kidPreview: true });   // row1 完整 3 cell
  const f2 = filled(dom);
  dom._tokuiChartAppend({ type: 'hrow', attrs: { v: '1,2,3' } });                       // 固化
  dom._tokuiChartAppend({ type: 'hrow', attrs: { v: '4,5,6' } });                       // row2
  assert.ok(f2 >= f1, 'v 碎片期间 cell 渐增（' + f1 + '→' + f2 + '）');
  assert.strictEqual(dom._chartState.rows.length, 2, '去重：2 行（半成品不重复 push）');
  assert.strictEqual(filled(dom), 6, '2 行 × 3 = 6 cell');
});

test('端到端 parser feed 容器 hrow v 碎片 → 逐 cell 填', () => {
  const renderer = newRenderer();
  const root = document.createElement('div');
  const parser = new TokUIParser((n) => renderer.mountStreaming(n, root), { streaming: true });
  parser.startStream();
  parser.feed('[chart t:heatmap cols:"A,B,C" l:"X,Y,Z"]');
  parser.feed('[hrow v:"1,2');   // v 碎片（半成品）
  const f1 = root.querySelectorAll('.tokui-chart-cell').length - root.querySelectorAll('.tokui-chart-cell--skeleton').length;
  parser.feed('3"]');            // 完整 hrow
  const f2 = root.querySelectorAll('.tokui-chart-cell').length - root.querySelectorAll('.tokui-chart-cell--skeleton').length;
  parser.feed('[hrow v:"4,5,6"]');
  parser.feed('[/chart]');
  assert.ok(f2 >= f1, 'hrow v 碎片期间 cell 渐增（' + f1 + '→' + f2 + '）');
  // l=3 行标签 → 骨架补到 3 行：2 hrow 填值 2 行 + 1 行骨架 = 9 cell
  assert.strictEqual(root.querySelectorAll('.tokui-chart-cell').length, 9, '9 cell（2 行填值 + 1 行骨架）');
});

test('容器 histogram bins 首帧定 + lo/hi 只扩不缩（防柱数结构跳、极值回收稳）', () => {
  const dom = newRenderer().render(chartOpen('histogram'));
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(v => dom._tokuiChartAppend(pt(v)));
  const b1 = dom._hBins, r1 = { lo: dom._hRange.lo, hi: dom._hRange.hi };
  for (let i = 11; i <= 30; i++) dom._tokuiChartAppend(pt(i));  // n 增（修复前 bins 随 √n 扩）
  dom._tokuiChartAppend(pt(100));                               // hi 扩
  const b2 = dom._hBins, r2 = { lo: dom._hRange.lo, hi: dom._hRange.hi };
  assert.strictEqual(b1, b2, 'bins 首帧定，不随 n 扩（柱数稳定）');
  assert.ok(r2.hi >= r1.hi && r2.hi >= 100, 'hi 只扩不缩');
  assert.ok(r2.lo <= r1.lo, 'lo 只向下扩不缩');
});

test('自闭合 histogram 显式 bins/min/max 锁箱结构', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[chart t:histogram bins:5 min:0 max:100 d:"10,20,30,70,90"]');
  const dom = newRenderer().render(nodes[0]);
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-bar').length, 5, '显式 bins=5 → 5 柱');
});

test('容器 histogram l 范围段标签 → 锁 lo/hi/bins（流式=全量所见即所得）', () => {
  const dom = newRenderer().render(chartOpen('histogram', { l: '40-50,50-60,60-70,70-80,80-90,90-100' }));
  [42, 55, 63, 68, 72, 75, 78, 81, 85, 90].forEach(v => dom._tokuiChartAppend(pt(v)));
  const r1 = { lo: dom._hRange.lo, hi: dom._hRange.hi, bins: dom._hBins };
  [95, 98, 45, 50].forEach(v => dom._tokuiChartAppend(pt(v)));  // 超/扩值 → l 锁不扩
  const r2 = { lo: dom._hRange.lo, hi: dom._hRange.hi, bins: dom._hBins };
  assert.deepStrictEqual(r1, r2, 'l 范围段锁 lo/hi/bins，流式全程不变');
  assert.strictEqual(r2.lo, 40, 'lo=l 首段始');
  assert.strictEqual(r2.hi, 100, 'hi=l 末段终');
  assert.strictEqual(r2.bins, 6, 'bins=l 段数');
});

test('自闭合 histogram l 推箱数（l 4 段 → 4 柱）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[chart t:histogram l:"0-25,25-50,50-75,75-100" d:"10,30,60,90"]');
  const dom = newRenderer().render(nodes[0]);
  assert.strictEqual(dom.querySelectorAll('.tokui-chart-bar').length, 4, 'l 4 段 → 4 箱');
});

test('容器 histogram y max 只扩不缩（柱高非扩期稳，仅新值箱增）', () => {
  const dom = newRenderer().render(chartOpen('histogram', { l: '40-50,50-60,60-70,70-80,80-90,90-100' }));
  [42, 55, 63, 68, 72, 75].forEach(v => dom._tokuiChartAppend(pt(v)));
  const y1 = dom._yMax;
  [78, 81, 85, 90].forEach(v => dom._tokuiChartAppend(pt(v)));  // 扩 yMax
  const y2 = dom._yMax;
  [45, 50].forEach(v => dom._tokuiChartAppend(pt(v)));          // 非扩
  const y3 = dom._yMax;
  assert.ok(y2 >= y1, 'yMax 只扩');
  assert.strictEqual(y2, y3, '非 max 期 yMax 不变 → 仅新值箱柱增，其余柱不动');
});

test('自闭合 histogram 显式 ymax 锁纵坐标（绝对零跳）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[chart t:histogram bins:3 min:0 max:30 ymax:10 d:"5,10,15,20,25"]');
  const dom = newRenderer().render(nodes[0]);
  assert.ok(dom.querySelectorAll('.tokui-chart-bar').length >= 3, '显式 ymax 不崩');
});

run();
