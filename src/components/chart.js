/**
 * TokUI 图表组件模块
 * 纯 SVG 零依赖实现 9 种图表：bar / line / pie / donut / radar / scatter / gantt / funnel / gauge
 * 内置渲染器注册表，支持外部图表库扩展或覆盖。
 */
'use strict';

// i18n 取串（图例/tooltip 默认名、空态、工具栏按钮等）。
// 注：本文件大量用 t 作局部变量（svgEl('text') 等），故 i18n 访问器用 _t 避免遮蔽冲突。
var _t = (typeof require === 'function')
  ? require('../core/i18n').t
  : (window.TokUI && window.TokUI._internal && window.TokUI._internal.t)
    || function (key) { return key; };

var chartRenderers = {};
var SVG_NS = 'http://www.w3.org/2000/svg';
var DEFAULT_COLORS = [
  '#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'
];
var LEGEND_H = 22;

// === 工具函数 ===

function svgEl(tag, attrs) {
  var el = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      el.setAttribute(k, String(attrs[k]));
    });
  }
  return el;
}

function parseData(d) {
  if (!d) return [];
  return String(d).split(',').map(function (v) { return parseFloat(v.trim()) || 0; });
}

function parseLabels(l) {
  if (!l) return [];
  return String(l).split(',').map(function (v) { return v.trim(); });
}

function parseMultiSeries(d) {
  if (!d) return [];
  return String(d).split('|').map(function (s) {
    return s.split(',').map(function (v) { return parseFloat(v.trim()) || 0; });
  });
}

function parseScatterData(d) {
  if (!d) return [];
  return String(d).split(';').map(function (pair) {
    var parts = pair.split(',').map(function (v) { return parseFloat(v.trim()) || 0; });
    return { x: parts[0] || 0, y: parts[1] || 0 };
  });
}

// 逗号分隔数值列表（gauge zones 阈值等）
function parseNumList(s) {
  if (!s) return [];
  return String(s).split(',').map(function (x) { return parseFloat(x.trim()); }).filter(function (n) { return !isNaN(n); });
}

// 逗号分隔颜色列表（gauge zc 段色等）；流式半成品自动过滤
function parseColorList(s) {
  if (!s) return [];
  return String(s).split(',').map(function (x) { return x.trim().replace(/^["']|["']$/g, ''); }).filter(isValidColor);
}

function isValidColor(v) {
  if (!v) return false;
  v = v.trim();
  if (!v) return false;
  // #RGB / #RGBA / #RRGGBB / #RRGGBBAA
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return true;
  if (/^var\(--[^)]+\)$/.test(v)) return true;
  if (/^(rgba?|hsla?)\([^)]*\)$/i.test(v)) return true;
  return false;
}

function getColors(attrs) {
  if (attrs.c) {
    // 去引号 + 校验每个色值；流式半成品（c:"#16、c:" 等）会被过滤掉
    var list = String(attrs.c).split(',').map(function (v) {
      return v.trim().replace(/^["']|["']$/g, '');
    });
    var valid = list.filter(isValidColor);
    if (valid.length) return valid;
  }
  return DEFAULT_COLORS;
}

function maxOf(arr) {
  return Math.max.apply(null, arr);
}

function minOf(arr) {
  return Math.min.apply(null, arr);
}

// 数值夹取（lo/hi 闭区间）—— 提前定义，全局复用（原 gantt 区 line ~983 的 clamp 已移此）。
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// 按数据点数动态算 viewBox 尺寸（宽或高）：每点保最小可读 slot，随 n 线性增长封顶；用户显式值优先。
// Dynamic viewBox size (width or height) by data-point count — each point keeps a
// min-readable slot, grows linearly with n up to cap; explicit attrs[key] wins.
//   key     'w' 或 'h'（读取用户显式覆盖）
//   n       数据点数
//   padX    该轴内边距之和（轴标签等）
//   minSlot 每点最小可读 viewBox 单位
//   floor   下限（少数据时不致过小）
//   cap     上限（与 CSS max-width/max-height 协同，防超大 n 画布失控）
function autoSize(attrs, key, n, padX, minSlot, floor, cap) {
  if (attrs[key] !== undefined && attrs[key] !== '') {
    var ex = parseInt(attrs[key], 10);
    if (!isNaN(ex) && ex > 0) return ex;
  }
  return clamp(Math.round(padX + Math.max(0, n) * minSlot), floor, cap);
}

// 宽高比带：w/h 超 maxRatio 则抬高 h（封顶 hCap），使大图纵向同步撑开、
// 配合 preserveAspectRatio="meet" 不产生上下 letterbox；显式 attrs.h 为基准（仍受 band/cap 约束）。
// Ratio-band height — widen h when w/h exceeds maxRatio (capped by hCap), so large
// charts grow vertically too and meet never letterboxes top/bottom.
function bandHeight(w, h, maxRatio, hCap) {
  if (w / h > maxRatio) h = Math.round(w / maxRatio);
  return Math.min(h, hCap);
}

// === Tooltip 顶层系统 ===

/**
 * 创建 tooltip 管理器（所有 tooltip 放独立层，渲染在 SVG 最上层）
 * svgW/svgH: SVG 尺寸，用于边界 clamp
 */
function createTipMgr(svgW, svgH) {
  var idx = 0;
  var layer = svgEl('g', { class: 'tokui-chart-tips-layer' });
  function lineW(str) {
    var w = 0;
    for (var i = 0; i < str.length; i++) {
      w += (str.charCodeAt(i) > 127) ? 10 : 5.5;
    }
    return w;
  }
  return {
    layer: layer,
    add: function (group, text, x, y) {
      var id = String(idx++);
      group.setAttribute('data-tip-id', id);
      var lines = text.split('  ');
      var lineH = 14, padX = 8, padY = 4;
      var maxLW = 0;
      lines.forEach(function (l) { maxLW = Math.max(maxLW, lineW(l)); });
      var tw = maxLW + padX * 2;
      var th = lines.length * lineH + padY * 2;
      var rx = x - tw / 2;
      var ry = y - th - 6;
      if (rx < 2) rx = 2;
      if (rx + tw > svgW - 2) rx = svgW - tw - 2;
      if (ry < 2) ry = y + 10;
      if (ry + th > svgH - 2) ry = svgH - th - 2;
      var tipG = svgEl('g', { class: 'tokui-chart-tip', 'data-tip-id': id });
      tipG.appendChild(svgEl('rect', {
        x: rx, y: ry, width: tw, height: th,
        rx: 4, fill: 'rgba(0,0,0,0.78)'
      }));
      lines.forEach(function (line, li) {
        var t = svgEl('text', {
          x: rx + tw / 2, y: ry + padY + (li + 0.5) * lineH,
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          fill: '#fff', 'font-size': '10'
        });
        t.textContent = line;
        tipG.appendChild(t);
      });
      layer.appendChild(tipG);
    }
  };
}

/**
 * 绑定 hover 事件：tip-group enter/leave → 控制顶层 tooltip 显隐
 */
function bindTooltips(svg) {
  var groups = svg.querySelectorAll('.tokui-chart-tip-group');
  groups.forEach(function (g) {
    g.addEventListener('mouseenter', function () {
      var id = g.getAttribute('data-tip-id');
      var tip = svg.querySelector('.tokui-chart-tips-layer [data-tip-id="' + id + '"]');
      if (tip) tip.style.opacity = '1';
    });
    g.addEventListener('mouseleave', function () {
      var id = g.getAttribute('data-tip-id');
      var tip = svg.querySelector('.tokui-chart-tips-layer [data-tip-id="' + id + '"]');
      if (tip) tip.style.opacity = '';
    });
  });
}

/**
 * 通用图例渲染：在 SVG 底部绘制水平居中的图例
 */
function appendLegend(svg, entries, w, y, fs, spread) {
  if (!entries || !entries.length) return;
  if (!(fs > 0)) fs = 7; // 默认 7；饼图按布局字号传，其余图表留 7 交由挂载后保底调整
  // 色块 8 + 块文间距 4；estTextW 按 fs/7 缩放（estTextW 为 fs=7 基准宽，CJK 双倍计宽比 text.length*5 准）
  var rectW = 8, gap = 4, itemGap = 14;
  var items = entries.map(function (e) {
    var tw = estTextW(e.text) * (fs / 7);
    return { e: e, w: rectW + gap + tw };
  });
  var intrinsic = items.reduce(function (s, it) { return s + it.w; }, 0);
  // 间距：spread（饼图）居中往两边自适应铺开——容器越宽间距越大，但封顶 maxGap 不占满全宽、
  //       地板 minGap 不拥挤；整体居中（从中间往两边排）。默认（bar/line/gantt 等）紧凑 itemGap 不变。
  var gapStep = itemGap;
  if (spread && items.length > 1) {
    var slack = Math.max(0, w - 8 - intrinsic);
    var adaptive = slack / (items.length - 1);
    gapStep = Math.max(18, Math.min(56, adaptive));
  }
  var totalW = intrinsic + gapStep * (items.length - 1);
  var x = Math.max(4, (w - totalW) / 2);
  items.forEach(function (it) {
    svg.appendChild(svgEl('rect', { x: x, y: y + 1, width: rectW, height: 8, fill: it.e.color, rx: 1.5 }));
    var t = svgEl('text', { x: x + rectW + gap, y: y + 7, fill: 'var(--tokui-chart-text, #999)', 'font-size': String(fs) });
    t.textContent = it.e.text;
    svg.appendChild(t);
    x += it.w + gapStep;
  });
}

// === 共用渲染 helper(缺陷修复 + 新图复用） ===

// 空数据占位：返回带提示文字的 svg（bar/line/pie/donut/radar/funnel 空数据兜底）
// Empty-state placeholder svg with a hint message.
function emptyChartSvg(w, h, msg) {
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg tokui-chart__svg--empty', preserveAspectRatio: 'xMidYMid meet' });
  var t = svgEl('text', { x: w / 2, y: h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'var(--tokui-chart-text, #bbb)', 'font-size': '11' });
  t.textContent = msg || _t('chart.empty');
  svg.appendChild(t);
  return svg;
}

// 估算文本像素宽（CJK 双倍计宽）— for label collision detection.
function estTextW(str) {
  var w = 0;
  for (var i = 0; i < str.length; i++) w += (str.charCodeAt(i) > 127) ? 8 : 4.5;
  return w;
}

// === 图表信息文字最小渲染 px 保底 ===
// 图表 SVG 用 viewBox + preserveAspectRatio="meet" 等比缩放，文字 font-size 是 viewBox 单位、
// 随图形同 scale 缩。窄容器下小号字（7/8/9）渲染 px 偏小不可读。挂载后测容器宽反推，把信息文字
// 抬到渲染 ≥ MIN_CHART_PX。大标题（仪表盘中心/环形中心 hero 数）不抬。
var MIN_CHART_PX = 12;
// estTextW ≈ 文本 @ font-size 7 的渲染宽度（"微信 35(35%)" estTextW=52 vs fs7 实测 46.9，略宽估=安全）。
// 据此把"标签宽 → 每单位 fs 宽"换算：width(fs) ≈ estTextW * (fs / PIE_FS_REF)。
var PIE_FS_REF = 7;

// 把 viewBox 单位字号 baseFs 按当前缩放 scale 抬到渲染 ≥ minPx；已达标原样返回（只抬不压）。
function bumpFsUnits(baseFs, scale, minPx) {
  if (!(scale > 0) || !(minPx > 0)) return baseFs;
  return baseFs * scale >= minPx ? baseFs : minPx / scale;
}

// 饼图引线标签字号闭环解：使标签渲染 px 恰为 minPx，并把
// 「字号↑ → 标签宽↑ → viewBox 宽↑ → scale↓」反馈计入（朴素迭代会发散，故闭式求解）。
// 关键：饼半径随 fs 缩——vertPad 含 fs，故 r(fs)=R0−fs（R0=min(w,h)/2−leadLen−margin，与 fs 无关）。
// 据此 W(fs)=2(R0+fixedA+(coefB−1)·fs)，px=fs·C/W ≥ minPx 自洽解得：
//   fs = 2·minPx·(R0+fixedA) / (C − 2·minPx·(coefB−1))
//   C       svg 实际渲染宽（px）
//   R0      r 在 fs=0 处的截距（= r + fs；调用方由 fs=7 布局反推）
//   fixedA  圆边外固定预留 = leadLen+tailLen+gap+margin
//   coefB   每单位 fs 的标签宽 = maxLabelW / PIE_FS_REF
//   minPx   目标最小渲染 px
// 返回应使用的 fs；容器过窄（denom≤0，标签本就放不下）或入参非法返回 0（调用方回退原样）。
function solvePieFs(C, R0, fixedA, coefB, minPx) {
  if (!(C > 0) || !(R0 >= 0) || !(coefB >= 0) || !(minPx > 0)) return 0;
  var denom = C - 2 * minPx * (coefB - 1);
  if (denom <= 0) return 0;
  return (2 * minPx * (R0 + fixedA)) / denom;
}

// Nice number：把任意值量化到 1/2/5×10^k 的"漂亮刻度"。
// niceBounds：lo/hi 向 nice 刻度对齐、给 y 轴留缓冲带 → 小幅数据波动不改变轴范围（流式重绘稳定）。
function niceNum(x, round) {
  if (!(x > 0) || !isFinite(x)) x = 1;
  var exp = Math.floor(Math.log10(x));
  var f = x / Math.pow(10, exp);
  var nf;
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * Math.pow(10, exp);
}
function niceBounds(lo, hi) {
  if (!isFinite(lo) || !isFinite(hi)) return [0, 1];
  if (lo === hi) { lo -= 1; hi += 1; }
  var span = niceNum(hi - lo, false);
  var step = niceNum(span / 5, true) || 1;
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

// 轴边界三级优先：显式 attrs.{xmin/xmax/ymin/ymax}（用户/后端锁定，绝对稳定）>
// 流式缓存 attrs._{_xMin/...}（只扩不缩 + nice 量化）> 当前数据 min/max。
// Axis bound priority — explicit attrs.{axis} (locked, jitter-free even on extrema expand) >
// streaming cache (expand-only) > current data min/max. Used by scatter/bubble.
function axisBound(attrs, explicit, cachedKey, fallback) {
  if (attrs[explicit] !== undefined && attrs[explicit] !== '') {
    var ex = parseFloat(attrs[explicit]);
    if (!isNaN(ex)) return ex;
  }
  if (attrs[cachedKey] !== undefined) return +attrs[cachedKey];
  return fallback;
}

// x 轴标签：标签估算宽 > slotW*0.9 → 自动 -45° 旋转避让（主流图表角度，中文长标签防重叠）。
// Auto-rotate x-axis labels when estimated width exceeds slot threshold.
// positions：每个 label 的 x 坐标数组；slotW：单标签可用宽度阈值。
function appendXLabels(svg, labels, positions, baseY, slotW) {
  var threshold = (slotW || 40) * 0.9;
  labels.forEach(function (lb, i) {
    if (lb === undefined || lb === null || lb === '') return;
    var lx = positions[i];
    var needRotate = estTextW(String(lb)) > threshold;
    var t = svgEl('text', {
      x: lx, y: baseY,
      'text-anchor': needRotate ? 'end' : 'middle',
      fill: 'var(--tokui-chart-text, #999)', 'font-size': '9'
    });
    if (needRotate) t.setAttribute('transform', 'rotate(-45 ' + lx + ' ' + baseY + ')');
    t.textContent = lb;
    svg.appendChild(t);
  });
}

// 轴单位：vertical=true 时 y 轴单位竖排（-90°），否则 x 轴单位横排。
// Axis unit label, vertical for y-axis (rotated -90°).
function appendAxisUnit(svg, label, x, y, vertical) {
  var t = svgEl('text', { x: x, y: y, 'text-anchor': 'middle', fill: 'var(--tokui-chart-text, #666)', 'font-size': '9' });
  if (vertical) t.setAttribute('transform', 'rotate(-90 ' + x + ' ' + y + ')');
  t.textContent = label;
  svg.appendChild(t);
}

// 通用数值动画（easeOutCubic + rAF；无 rAF 或 prefers-reduced-motion 直接落终态）。gauge/progress 共用。
// Generic value animation; degrades to final state without rAF or under reduced-motion.
function animateValue(fromV, toV, animMs, onTick) {
  var hasRAF = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';
  var reduceMotion = hasRAF && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!(animMs > 0) || !hasRAF || reduceMotion) { onTick(toV); return; }
  var startT = null;
  function frame(ts) {
    if (startT === null) startT = ts;
    var p = Math.min(1, (ts - startT) / animMs);
    var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    onTick(fromV + (toV - fromV) * eased);
    if (p < 1) window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
}

// 16 进制颜色混合（a/b 为 #RGB/#RRGGBB，f∈[0,1] a→b）— for gradient stops.
function hexToRgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mixHex(a, b, f) {
  var pa = hexToRgb(a), pb = hexToRgb(b);
  if (!pa || !pb) return a;
  var r = Math.round(pa[0] + (pb[0] - pa[0]) * f);
  var g = Math.round(pa[1] + (pb[1] - pa[1]) * f);
  var bl = Math.round(pa[2] + (pb[2] - pa[2]) * f);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}

// 线性插值色阶（t ∈ [0,1] → stops 间过渡），heatmap/treemap 色阶用。
// Linear-interpolate across a list of color stops.
function lerpColor(stops, t) {
  t = clamp(t, 0, 1);
  if (stops.length === 1) return stops[0];
  var seg = t * (stops.length - 1);
  var i = Math.min(stops.length - 2, Math.floor(seg));
  return mixHex(stops[i], stops[i + 1], seg - i);
}

// === Bar 柱状图 ===

function renderBar(data, labels, colors, attrs) {
  var horizontal = attrs.orient === 'h' || attrs.orientation === 'h';
  var stack = attrs.stack !== undefined || attrs.stacked !== undefined;
  var series = parseMultiSeries(attrs.d);
  if (!series.length) series = [data];
  // 空数据占位（缺陷修复）
  if (series.every(function (s) { return !s.length; })) return emptyChartSvg(parseInt(attrs.w) || 400, parseInt(attrs.h) || 200);
  var n = Math.max.apply(null, series.map(function (s) { return s.length; })); // 取最大长度（缺陷修复：原取 series[0].length 致短系列越界）
  // 宽/高按数据量动态计算（每点保最小可读 slot，随 n 线性增长封顶；显式 w/h 优先）。
  // 横向柱类别在 y 轴 → 高度随 n 增；纵向柱宽度随 n 增，并经 bandHeight 防过扁。
  var w, h;
  if (horizontal) {
    w = parseInt(attrs.w) || 480;                       // 宽由值域决定，非点数
    h = autoSize(attrs, 'h', n, 36, 26, 200, 1200);     // padTop+padBot≈36，每类一行
  } else {
    w = autoSize(attrs, 'w', n, 52, 26, 360, 2400);
    h = bandHeight(w, parseInt(attrs.h) || 200, 4, 560);
  }
  var hasLegend = series.length > 1;
  var totalH = h + (hasLegend ? LEGEND_H : 0);

  // 数值范围（堆叠按列累加；分组取各值极值；支持负值）
  var valMax = 0, valMin = 0;
  if (stack) {
    for (var ci = 0; ci < n; ci++) {
      var cp = 0, cn = 0;
      series.forEach(function (s) { var v = s[ci] || 0; if (v >= 0) cp += v; else cn += v; });
      if (cp > valMax) valMax = cp; if (cn < valMin) valMin = cn;
    }
  } else {
    series.forEach(function (s) { s.forEach(function (v) { if (v > valMax) valMax = v; if (v < valMin) valMin = v; }); });
  }
  valMax = axisBound(attrs, 'ymax', '_yMax', valMax || 1); // y 锁：显式 ymax > 流式缓存 _yMax（只扩）> 裸算
  var range = valMax - valMin || 1;

  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + totalH, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, totalH);

  function segRange(si, i, val) { // 返回柱值域 [segMin, segMax]，并更新 stack 累计
    var base = stack ? (val >= 0 ? (accPos[i] || 0) : (accNeg[i] || 0)) : 0;
    var segMax = val >= 0 ? base + val : base;
    var segMin = val >= 0 ? base : base + val;
    if (stack) { if (val >= 0) accPos[i] = segMax; else accNeg[i] = segMin; }
    return [segMin, segMax];
  }
  var accPos = [], accNeg = [];

  if (horizontal) {
    // 横向柱：类别在 y 轴自上而下，数值在 x 轴
    var padLh = 70, padBh = attrs.xl ? 30 : 22, padTh = 14, padRh = attrs.yl ? 30 : 16;
    var cwh = w - padLh - padRh;
    var chh = h - padTh - padBh;
    var groupH = chh / n;
    var barH = Math.max(3, stack ? groupH * 0.6 : groupH * 0.6 / series.length);
    function xOf(v) { return padLh + cwh * (v - valMin) / range; }
    for (var g = 0; g <= 4; g++) {
      var gv = valMin + range * g / 4;
      var gx = xOf(gv);
      svg.appendChild(svgEl('line', { x1: gx, y1: padTh, x2: gx, y2: padTh + chh, stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
      svg.appendChild(svgEl('text', { x: gx, y: padTh + chh + 10, 'text-anchor': 'middle', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = Math.round(gv);
    }
    series.forEach(function (s, si) {
      s.forEach(function (val, i) {
        if (val === undefined || val === null) return;
        var seg = segRange(si, i, val);
        var bx = xOf(seg[0]);
        var bw = Math.max(0, xOf(seg[1]) - bx);
        var by = padTh + i * groupH + groupH * 0.2 + (stack ? 0 : si * barH);
        var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
        grp.appendChild(svgEl('rect', { x: bx, y: by, width: bw, height: barH - 1, fill: colors[si % colors.length], rx: 2, class: 'tokui-chart-bar' }));
        tips.add(grp, (labels[i] || '') + ': ' + val + (series.length > 1 ? ' (' + _t('chart.seriesDefault', { n: si + 1 }) + ')' : ''), bx + bw / 2, by);
        svg.appendChild(grp);
        if (attrs.vals !== undefined) {
          var vt = svgEl('text', { x: bx + bw + 3, y: by + barH / 2 + 2, 'text-anchor': 'start', fill: 'var(--tokui-chart-text, #666)', 'font-size': '8' });
          vt.textContent = val;
          svg.appendChild(vt);
        }
      });
    });
    // 类别标签（左侧 y 轴，每行右对齐）
    labels.slice(0, n).forEach(function (lb, i) {
      if (lb === undefined || lb === null || lb === '') return;
      var ly = padTh + i * groupH + groupH / 2;
      svg.appendChild(svgEl('text', { x: padLh - 6, y: ly + 3, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = lb;
    });
    if (attrs.xl) appendAxisUnit(svg, attrs.xl, padLh + cwh / 2, padTh + chh + 22, false);
    if (attrs.yl) appendAxisUnit(svg, attrs.yl, 12, padTh + chh / 2, true);
  } else {
    // 纵向（默认）
    var padL = attrs.yl ? 46 : 40, padR = 12;
    var padB = attrs.xl ? 38 : 28, padT = 18;
    var cw = w - padL - padR;
    var ch = h - padT - padB;
    function yOf(v) { return padT + ch * (1 - (v - valMin) / range); }
    for (var g2 = 0; g2 <= 4; g2++) {
      var gv2 = valMin + range * g2 / 4;
      var gy = yOf(gv2);
      svg.appendChild(svgEl('line', { x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
      svg.appendChild(svgEl('text', { x: padL - 4, y: gy + 4, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = Math.round(gv2);
    }
    if (valMin < 0) { // 零基线
      var zy = yOf(0);
      svg.appendChild(svgEl('line', { x1: padL, y1: zy, x2: w - padR, y2: zy, stroke: 'var(--tokui-chart-axis, #bbb)', 'stroke-width': 1 }));
    }
    var groupW = cw / n;
    var barW = Math.max(4, stack ? groupW * 0.6 : groupW * 0.6 / series.length);
    series.forEach(function (s, si) {
      s.forEach(function (val, i) {
        if (val === undefined || val === null) return; // 短系列缺位跳过（缺陷修复）
        var seg = segRange(si, i, val);
        var by = yOf(seg[1]);
        var bh = Math.max(0, (seg[1] - seg[0]) / range * ch);
        var bx = padL + i * groupW + groupW * 0.2 + (stack ? 0 : si * barW);
        var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
        grp.appendChild(svgEl('rect', { x: bx, y: by, width: barW - 1, height: bh, fill: colors[si % colors.length], rx: 2, class: 'tokui-chart-bar' }));
        tips.add(grp, (labels[i] || '') + ': ' + val + (series.length > 1 ? ' (' + _t('chart.seriesDefault', { n: si + 1 }) + ')' : ''), bx + (barW - 1) / 2, by);
        svg.appendChild(grp);
        if (attrs.vals !== undefined) {
          var vt2 = svgEl('text', { x: bx + (barW - 1) / 2, y: by - 3, 'text-anchor': 'middle', fill: 'var(--tokui-chart-text, #666)', 'font-size': '8' });
          vt2.textContent = val;
          svg.appendChild(vt2);
        }
      });
    });
    // x 轴标签（自动旋转，缺陷修复）
    var positions = [];
    for (var k = 0; k < n; k++) positions.push(padL + k * groupW + groupW / 2);
    appendXLabels(svg, labels.slice(0, n), positions, h - 8, groupW);
    if (attrs.xl) appendAxisUnit(svg, attrs.xl, padL + cw / 2, h - 8 + (estTextW(String(labels[0] || '')) > groupW * 0.9 ? 26 : 12), false);
    if (attrs.yl) appendAxisUnit(svg, attrs.yl, 12, padT + ch / 2, true);
  }
  // legend
  if (hasLegend) {
    var legendEntries = series.map(function (s, i) { return { color: colors[i % colors.length], text: _t('chart.seriesDefault', { n: i + 1 }) }; });
    appendLegend(svg, legendEntries, w, h + 6);
  }
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Line 折线图 ===

function renderLine(data, labels, colors, attrs) {
  var stack = attrs.stack !== undefined || attrs.stacked !== undefined;
  var smooth = attrs.smooth !== undefined;
  var series = parseMultiSeries(attrs.d);
  if (!series.length) series = [data];
  if (series.every(function (s) { return !s.length; })) return emptyChartSvg(parseInt(attrs.w) || 400, parseInt(attrs.h) || 200); // 空数据占位
  var n = Math.max.apply(null, series.map(function (s) { return s.length; }));
  // 宽按点数动态（每点最小 slot 24），高度经 bandHeight 防过扁；显式 w/h 优先。
  var w = autoSize(attrs, 'w', n, 52, 24, 360, 2400);
  var h = bandHeight(w, parseInt(attrs.h) || 200, 4, 560);
  var hasLegend = series.length > 1;
  var totalH = h + (hasLegend ? LEGEND_H : 0);
  // 堆叠：累计值（后系列叠加前系列），用累计值画线/面，tooltip 显示原始值
  var stacked = series.map(function (s) { return s.slice(); });
  if (stack) {
    for (var si0 = 1; si0 < stacked.length; si0++) {
      for (var j = 0; j < n; j++) stacked[si0][j] = (stacked[si0][j] || 0) + (stacked[si0 - 1][j] || 0);
    }
  }
  var flatMax = 0, flatMin = Infinity;
  stacked.forEach(function (s) { s.forEach(function (v) { if (v > flatMax) flatMax = v; if (v < flatMin) flatMin = v; }); });
  if (flatMin === Infinity) flatMin = 0;
  if (flatMin > 0 && !stack) flatMin = 0;
  var range = flatMax - flatMin || 1;

  var padL = attrs.yl ? 46 : 40, padR = 12;
  var padB = attrs.xl ? 38 : 28, padT = 18;
  var cw = w - padL - padR;
  var ch = h - padT - padB;
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + totalH, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, totalH);
  function xOf(i) { return padL + (n > 1 ? i * cw / (n - 1) : cw / 2); }
  function yOf(v) { return padT + ch * (1 - (v - flatMin) / range); }

  // grid
  for (var g = 0; g <= 4; g++) {
    var gv = flatMin + range * g / 4;
    var gy = yOf(gv);
    svg.appendChild(svgEl('line', { x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padL - 4, y: gy + 4, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = Math.round(gv * 10) / 10;
  }

  // 平滑曲线（Catmull-Rom → 三次贝塞尔）
  function smoothPath(pts) {
    if (pts.length < 2) return pts.length ? ('M' + pts[0].x + ',' + pts[0].y) : '';
    if (pts.length === 2) return 'M' + pts[0].x + ',' + pts[0].y + ' L' + pts[1].x + ',' + pts[1].y;
    var d = 'M' + pts[0].x + ',' + pts[0].y;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ' C' + (p1.x + (p2.x - p0.x) / 6) + ',' + (p1.y + (p2.y - p0.y) / 6) + ' ' +
        (p2.x - (p3.x - p1.x) / 6) + ',' + (p2.y - (p3.y - p1.y) / 6) + ' ' + p2.x + ',' + p2.y;
    }
    return d;
  }

  stacked.forEach(function (s, si) {
    var pts = [];
    for (var i = 0; i < s.length; i++) {
      var v = s[i];
      if (v === undefined || v === null) continue; // 短系列缺位跳过（缺陷修复）
      pts.push({ x: xOf(i), y: yOf(v), idx: i });
    }
    if (!pts.length) return;
    // area（含堆叠面积，底贴前系列轮廓）
    if (attrs.area !== undefined || stack) {
      if (stack && si > 0) {
        var prev = [];
        for (var k = 0; k < stacked[si - 1].length; k++) {
          if (stacked[si - 1][k] === undefined) continue;
          prev.push({ x: xOf(k), y: yOf(stacked[si - 1][k]) });
        }
        var ap = 'M' + pts[0].x + ',' + pts[0].y;
        pts.forEach(function (p) { ap += ' L' + p.x + ',' + p.y; });
        for (var ri = prev.length - 1; ri >= 0; ri--) ap += ' L' + prev[ri].x + ',' + prev[ri].y;
        ap += ' Z';
        svg.appendChild(svgEl('path', { d: ap, fill: colors[si % colors.length], opacity: '0.4' }));
      } else {
        var baseY = yOf(Math.max(0, flatMin));
        var ap2 = 'M' + pts[0].x + ',' + baseY;
        pts.forEach(function (p) { ap2 += ' L' + p.x + ',' + p.y; });
        ap2 += ' L' + pts[pts.length - 1].x + ',' + baseY + ' Z';
        svg.appendChild(svgEl('path', { d: ap2, fill: colors[si % colors.length], opacity: '0.15' }));
      }
    }
    // 折线（smooth 用贝塞尔 path，否则 polyline 直线）
    if (smooth) {
      svg.appendChild(svgEl('path', { d: smoothPath(pts), fill: 'none', stroke: colors[si % colors.length], 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    } else {
      svg.appendChild(svgEl('polyline', { points: pts.map(function (p) { return p.x + ',' + p.y; }).join(' '), fill: 'none', stroke: colors[si % colors.length], 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    }
    // dots
    var orig = series[si];
    pts.forEach(function (p) {
      var og = svgEl('g', { class: 'tokui-chart-tip-group' });
      og.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 8, fill: 'transparent' }));
      og.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 3, fill: '#fff', stroke: colors[si % colors.length], 'stroke-width': 2, class: 'tokui-chart-dot' }));
      tips.add(og, (labels[p.idx] || '') + ': ' + (orig[p.idx] !== undefined ? orig[p.idx] : s[p.idx]) + (series.length > 1 ? ' (' + _t('chart.seriesDefault', { n: si + 1 }) + ')' : ''), p.x, p.y);
      svg.appendChild(og);
      if (attrs.vals !== undefined) {
        svg.appendChild(svgEl('text', { x: p.x, y: p.y - 6, 'text-anchor': 'middle', fill: colors[si % colors.length], 'font-size': '8' })).textContent = (orig[p.idx] !== undefined ? orig[p.idx] : s[p.idx]);
      }
    });
  });

  // x 轴标签（自动旋转，缺陷修复）
  var positions = [];
  for (var k2 = 0; k2 < n; k2++) positions.push(xOf(k2));
  appendXLabels(svg, labels.slice(0, n), positions, h - 8, n > 1 ? cw / (n - 1) : cw);
  var slotW = n > 1 ? cw / (n - 1) : cw;
  if (attrs.xl) appendAxisUnit(svg, attrs.xl, padL + cw / 2, h - 8 + (estTextW(String(labels[0] || '')) > slotW * 0.9 ? 26 : 12), false);
  if (attrs.yl) appendAxisUnit(svg, attrs.yl, 12, padT + ch / 2, true);
  if (hasLegend) {
    appendLegend(svg, series.map(function (s, i) { return { color: colors[i % colors.length], text: _t('chart.seriesDefault', { n: i + 1 }) }; }), w, h + 6);
  }
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Pie 饼图 ===

// 饼图布局（按字号 fs 求）：标签宽度按 estTextW * (fs/PIE_FS_REF) 随 fs 缩放，
// labelSpace 联动 → 圆心/画布宽联动。fs=7 时与历史布局逐位等价。供 renderPie 与挂载后闭环求解共用。
function pieSizing(data, labels, attrs, fs, total) {
  var leadLen = 10, tailLen = 12, gap = 4, margin = 4;
  if (!(fs > 0)) fs = 7;
  var maxLabelW = 0;
  data.forEach(function (val, i) {
    if (!labels[i]) return;
    var pct = Math.round(val / total * 100);
    var lw = estTextW(labels[i] + ' ' + val + '(' + pct + '%)');
    if (lw > maxLabelW) maxLabelW = lw;
  });
  var coefB = maxLabelW / PIE_FS_REF;                 // 每单位 fs 的标签宽
  var fixedA = leadLen + tailLen + gap + margin;       // 圆边外固定预留（与 fs 无关）
  var labelSpace = fixedA + coefB * fs;                // fs=7 时 = fixedA + maxLabelW（历史值）
  var w = parseInt(attrs.w) || 280;
  var h = parseInt(attrs.h) || 280;
  var vertPad = leadLen + fs + margin;
  var r = Math.max(8, Math.min(w, h) / 2 - vertPad);
  var halfW = r + labelSpace;
  return {
    fs: fs, leadLen: leadLen, tailLen: tailLen, gap: gap, margin: margin,
    maxLabelW: maxLabelW, coefB: coefB, fixedA: fixedA, labelSpace: labelSpace,
    vertPad: vertPad, r: r, cx: halfW, cy: vertPad + r,
    W: halfW * 2, H: (vertPad + r) * 2, totalH: (vertPad + r) * 2 + LEGEND_H
  };
}

function renderPie(data, labels, colors, attrs) {
  var w = parseInt(attrs.w) || 280;
  var h = parseInt(attrs.h) || 280;
  if (!data.length) return emptyChartSvg(w, h + LEGEND_H);
  var total = data.reduce(function (a, b) { return a + b; }, 0) || 1;
  // 挂载后闭环求解会带 _pieFs（使渲染 px ≥ MIN_CHART_PX）重渲染；默认 7
  var fs = (attrs._pieFs !== undefined && attrs._pieFs !== '') ? parseFloat(attrs._pieFs) : 7;
  if (!(fs > 0) || !isFinite(fs)) fs = 7;
  var L = pieSizing(data, labels, attrs, fs, total);

  var slices = [];
  var angle = -Math.PI / 2;
  data.forEach(function (val, i) {
    var sliceAngle = (val / total) * 2 * Math.PI;
    slices.push({ val: val, idx: i, start: angle, end: angle + sliceAngle, mid: angle + sliceAngle / 2 });
    angle += sliceAngle;
  });

  var cx = L.cx, cy = L.cy, r = L.r;
  var svg = svgEl('svg', { viewBox: '0 0 ' + L.W + ' ' + L.totalH, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(L.W, L.totalH);

  // 切片
  slices.forEach(function (s) {
    var i = s.idx;
    var sliceAngle = s.end - s.start;
    var x1 = cx + r * Math.cos(s.start);
    var y1 = cy + r * Math.sin(s.start);
    var x2 = cx + r * Math.cos(s.end);
    var y2 = cy + r * Math.sin(s.end);
    var largeArc = sliceAngle > Math.PI ? 1 : 0;
    var d = 'M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 + ' Z';
    var pct = Math.round(s.val / total * 100);
    var g = svgEl('g', { class: 'tokui-chart-tip-group' });
    g.appendChild(svgEl('path', { d: d, fill: colors[i % colors.length], stroke: 'var(--tokui-chart-slice-stroke, #fff)', 'stroke-width': 2, class: 'tokui-chart-slice' }));
    var tipX = cx + r * 0.6 * Math.cos(s.mid);
    var tipY = cy + r * 0.6 * Math.sin(s.mid);
    tips.add(g, (labels[i] || _t('chart.itemDefault', { n: i + 1 })) + ': ' + s.val + ' (' + pct + '%)', tipX, tipY);
    svg.appendChild(g);
  });

  // 引导线 + 文字
  var leadLen = L.leadLen, tailLen = L.tailLen, gap = L.gap;
  slices.forEach(function (s) {
    var i = s.idx;
    if (!labels[i]) return;
    var midA = s.mid;
    var pct = Math.round(s.val / total * 100);
    var isRight = Math.cos(midA) >= 0;
    var ex = cx + r * Math.cos(midA);
    var ey = cy + r * Math.sin(midA);
    var lx = cx + (r + leadLen) * Math.cos(midA);
    var ly = cy + (r + leadLen) * Math.sin(midA);
    var tx = lx + (isRight ? tailLen : -tailLen);
    svg.appendChild(svgEl('polyline', { points: ex + ',' + ey + ' ' + lx + ',' + ly + ' ' + tx + ',' + ly, fill: 'none', stroke: colors[i % colors.length], 'stroke-width': 1 }));
    var textX = tx + (isRight ? gap : -gap);
    var anchor = isRight ? 'start' : 'end';
    var txt = svgEl('text', { x: textX, y: ly + 1, 'text-anchor': anchor, 'dominant-baseline': 'central', fill: 'var(--tokui-chart-text, #666)', 'font-size': String(fs) });
    txt.textContent = labels[i] + ' ' + s.val + '(' + pct + '%)';
    svg.appendChild(txt);
  });

  // legend：与 donut 一致——默认紧凑 itemGap 居中（无 spread）；字号用 L.fs（=bump 后 _pieFs，
  // 渲染 ≥12px，等价 donut 经非 pie 分支 text-bump 的可读尺寸）
  var legendEntries = data.map(function (val, i) {
    return { color: colors[i % colors.length], text: labels[i] || (_t('chart.itemDefault', { n: i + 1 })) };
  });
  appendLegend(svg, legendEntries, L.W, L.H + 6, L.fs);
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Donut 环形图 ===

function renderDonut(data, labels, colors, attrs) {
  var w = parseInt(attrs.w) || 240;
  var h = parseInt(attrs.h) || 240;
  var totalH = h + LEGEND_H;
  var cx = w / 2, cy = h / 2;
  var series = parseMultiSeries(attrs.d);
  if (!series.length) series = [data];
  if (series.every(function (s) { return !s.length; })) return emptyChartSvg(w, h + LEGEND_H); // 空数据占位
  var multi = series.length > 1;
  var r = Math.min(cx, cy) - 16;
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + totalH, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, totalH);
  // 环宽：多环等分（外→内），单环内径 60%
  var ringBand = multi ? (r * 0.82 / series.length) : r * 0.4;
  var ringGap = multi ? 2.5 : 0;
  series.forEach(function (sdata, ri) {
    var outerR = r - ri * (ringBand + ringGap);
    var innerR = multi ? (outerR - ringBand + ringGap) : r * 0.6;
    var total = sdata.reduce(function (a, b) { return a + b; }, 0) || 1;
    var angle = -Math.PI / 2;
    sdata.forEach(function (val, i) {
      var sliceAngle = (val / total) * 2 * Math.PI;
      var midA = angle + sliceAngle / 2;
      var x1o = cx + outerR * Math.cos(angle), y1o = cy + outerR * Math.sin(angle);
      var x2o = cx + outerR * Math.cos(angle + sliceAngle), y2o = cy + outerR * Math.sin(angle + sliceAngle);
      var x1i = cx + innerR * Math.cos(angle + sliceAngle), y1i = cy + innerR * Math.sin(angle + sliceAngle);
      var x2i = cx + innerR * Math.cos(angle), y2i = cy + innerR * Math.sin(angle);
      var largeArc = sliceAngle > Math.PI ? 1 : 0;
      var d = 'M' + x1o + ',' + y1o + ' A' + outerR + ',' + outerR + ' 0 ' + largeArc + ' 1 ' + x2o + ',' + y2o +
        ' L' + x1i + ',' + y1i + ' A' + innerR + ',' + innerR + ' 0 ' + largeArc + ' 0 ' + x2i + ',' + y2i + ' Z';
      var g = svgEl('g', { class: 'tokui-chart-tip-group' });
      g.appendChild(svgEl('path', { d: d, fill: colors[i % colors.length], stroke: 'var(--tokui-chart-slice-stroke, #fff)', 'stroke-width': 2, class: 'tokui-chart-slice' }));
      var midR = (outerR + innerR) / 2;
      tips.add(g, (labels[i] || (_t('chart.itemDefault', { n: i + 1 }))) + ': ' + val + (multi ? ' (' + _t('chart.ringDefault', { n: ri + 1 }) + ')' : ''), cx + midR * Math.cos(midA), cy + midR * Math.sin(midA));
      svg.appendChild(g);
      angle += sliceAngle;
    });
  });
  // center text（仅单环 + v）
  if (!multi && attrs.v !== undefined) {
    svg.appendChild(svgEl('text', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'var(--tokui-text, #333)', 'font-size': '16', 'font-weight': '700', class: 'tokui-chart-donut-value' })).textContent = attrs.v + '%';
  }
  // legend（多环时标签一致，取一组）
  var legendEntries = series[0].map(function (val, i) {
    return { color: colors[i % colors.length], text: (labels[i] || (_t('chart.itemDefault', { n: i + 1 }))) + ' ' + val };
  });
  appendLegend(svg, legendEntries, w, h + 6);
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Funnel 漏斗图 ===
// 销售/转化漏斗：自上而下逐层收窄的梯形堆叠，宽度 ∝ 数值，建议数据降序（首层=漏斗口最大）。
// 数值居中显示在梯形内（过窄层自动改放右侧），名称经 leader 引线置于右侧。
// 不设内联 max-width，跟随 .tokui-chart__svg 的 width:100% 撑满容器（与 bar/line/pie 一致），
// 文字以 viewBox 单位随容器等比放大，避免窄卡片里被钉死成小图、文字看不清。
function renderFunnel(data, labels, colors, attrs) {
  var n = data.length;
  var w = parseInt(attrs.w) || 480;
  var h = parseInt(attrs.h) || 320;
  if (!n) return emptyChartSvg(w, h);
  var padT = 14, padB = 12, padL = 14;
  var ch = h - padT - padB;
  var rowH = n ? ch / n : ch;
  var firstVal = data[0] || 0;
  var maxVal = maxOf(data) || 1; // 缩放基准，首层（最大值）撑满图表宽
  var splitX = Math.round(w * 0.6); // 图表区/标注区分界：左 60% 梯形，右 40% 名称（中文标签需更宽）
  var fullW = splitX - padL - 6;
  var cx = padL + fullW / 2; // 梯形水平中心
  var labelX = splitX + 10;  // 右侧名称起点
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg tokui-chart__svg--funnel', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, h);
  data.forEach(function (val, i) {
    var yTop = padT + i * rowH;
    var yBot = yTop + rowH;
    var topW = (i === 0 ? maxVal : data[i - 1]) / maxVal * fullW; // 顶边=上一层底边，层间共享边
    var botW = val / maxVal * fullW;
    var tHalf = topW / 2, bHalf = botW / 2;
    var pts = (cx - tHalf) + ',' + yTop + ' ' + (cx + tHalf) + ',' + yTop + ' ' +
              (cx + bHalf) + ',' + yBot + ' ' + (cx - bHalf) + ',' + yBot;
    var midY = (yTop + yBot) / 2;
    var pct = firstVal ? Math.round(val / firstVal * 100) : 0; // 相对首层的转化率
    var name = labels[i] || (_t('chart.stageDefault', { n: i + 1 }));
    var color = colors[i % colors.length];
    var edgeX = cx + (tHalf + bHalf) / 2; // 梯形右沿
    var g = svgEl('g', { class: 'tokui-chart-tip-group' });
    g.appendChild(svgEl('polygon', { points: pts, fill: color, stroke: 'var(--tokui-chart-slice-stroke, #fff)', 'stroke-width': 2, class: 'tokui-chart-funnel' }));
    // 数值居中显示在梯形内（足够宽时）；过窄则改放右侧名称下方，避免白字溢出到白底
    if (botW >= 40) {
      var vTxt = svgEl('text', { x: cx, y: midY - 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff', 'font-size': '14', 'font-weight': '700' });
      vTxt.textContent = val;
      g.appendChild(vTxt);
      if (botW >= 60) { // 较宽时再补一行转化率
        var pTxt = svgEl('text', { x: cx, y: midY + 13, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff', 'font-size': '11', opacity: '0.88' });
        pTxt.textContent = pct + '%';
        g.appendChild(pTxt);
      }
    }
    // 右侧 leader 引线 + 名称（窄层再补数值与转化率）
    g.appendChild(svgEl('line', { x1: edgeX, y1: midY, x2: labelX - 4, y2: midY, stroke: color, 'stroke-width': 1.2, opacity: '0.5' }));
    var nameTxt = svgEl('text', { x: labelX, y: midY - 2, 'text-anchor': 'start', 'dominant-baseline': 'central', fill: 'var(--tokui-text, #333)', 'font-size': '13', 'font-weight': '600' });
    nameTxt.textContent = name;
    g.appendChild(nameTxt);
    if (botW < 40) {
      var altTxt = svgEl('text', { x: labelX, y: midY + 12, 'text-anchor': 'start', 'dominant-baseline': 'central', fill: 'var(--tokui-chart-text, #999)', 'font-size': '11' });
      altTxt.textContent = val + ' (' + pct + '%)';
      g.appendChild(altTxt);
    }
    tips.add(g, name + ': ' + val + ' (' + _t('chart.conversion', { pct: pct }) + ')', cx, midY);
    svg.appendChild(g);
  });
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Gauge 仪表盘 ===
// 单值仪表盘/KPI 速度表：上半圆轨道 + 数值弧 + 指针 + 中心大字 + 刻度。
// 进阶：zones 阶段分布色带、anim 数字/弧/指针动画、ticks 刻度密度、sub 副标题、dec 小数位。
function renderGauge(data, labels, colors, attrs) {
  var w = parseInt(attrs.w) || 280;
  var h = parseInt(attrs.h) || 200;
  var cx = w / 2;
  // range 扫掠角：180（默认上半圆）/270/360；以顶部为中心对称
  // Sweep angle: 180 (default top half) / 270 / 360, symmetric about the top.
  var rangeDeg = parseInt(attrs.range, 10);
  if (isNaN(rangeDeg) || (rangeDeg !== 180 && rangeDeg !== 270 && rangeDeg !== 360)) rangeDeg = 180;
  var sweep = rangeDeg * Math.PI / 180;
  var A_CENTER = 1.5 * Math.PI; // 顶部（sin=-1）
  var A0 = A_CENTER - sweep / 2;
  var A1 = A_CENTER + sweep / 2;
  var cy = rangeDeg === 180 ? (h - 34) : (h / 2); // 180 坐底线；270/360 弧居中
  var baseY = cy;                                  // 兼容旧名（指针轴心 y）
  var endSin = Math.max(0, Math.sin(A0));          // 端点低于中心线的量
  var r = rangeDeg === 180
    ? Math.max(40, Math.min(cx - 34, cy - 24))
    : Math.max(36, Math.min(cx - 30, (h - 28) / (1 + endSin + 0.35)));
  var min = parseFloat(attrs.min); if (isNaN(min)) min = 0;
  var max = parseFloat(attrs.max); if (isNaN(max)) max = 100;
  var span = max - min || 1;
  // v 缺省时回退 data[0]（容器模式 pt v:N → data=[N]）
  var val = parseFloat(attrs.v); if (isNaN(val) && data.length) val = data[0]; if (isNaN(val)) val = 0;
  val = clamp(val, min, max);
  var unit = attrs.u !== undefined ? attrs.u : ((min === 0 && max === 100) ? '%' : '');
  var dec = parseInt(attrs.dec, 10); if (isNaN(dec)) dec = (span <= 10 ? 1 : 0);

  var STATUS_COLORS = {
    success: 'var(--tokui-success, #52c41a)',
    warning: 'var(--tokui-warning, #faad14)',
    danger: 'var(--tokui-danger, #f5222d)',
    info: 'var(--tokui-info, #1677ff)',
    primary: 'var(--tokui-primary, #1677ff)'
  };
  var STATUS_LABEL = { success: _t('gauge.statusGood'), warning: _t('gauge.statusWarn'), danger: _t('gauge.statusDanger'), info: _t('gauge.statusInfo') };

  // zones 阶段分布：阈值 "60,85" → 升序边界 [min,60,85,max] → 多色带；zc 覆盖段色（low→high）
  var zones = parseNumList(attrs.zones).filter(function (t) { return t > min && t < max; })
    .sort(function (a, b) { return a - b; });
  var zc = parseColorList(attrs.zc);
  if (!zc.length) zc = ['#52c41a', '#faad14', '#f5222d']; // 默认 low→high：安全→注意→告警
  var bandEdges = [min].concat(zones, [max]);
  function bandColorFor(v) {
    for (var i = 0; i < bandEdges.length - 1; i++) {
      if (v >= bandEdges[i] && v <= bandEdges[i + 1]) return zc[i % zc.length];
    }
    return zc[0];
  }
  // 当前值颜色：有 zones → 命中段色；否则 status > c > 默认
  var arcColor = zones.length ? bandColorFor(val)
    : (STATUS_COLORS[attrs.status] || (isValidColor(attrs.c) ? attrs.c : null) || colors[0] || STATUS_COLORS.primary);

  function polar(a, rad) { return [cx + rad * Math.cos(a), baseY + rad * Math.sin(a)]; }
  function arcPath(a1, a2, rad) {
    var p1 = polar(a1, rad), p2 = polar(a2, rad);
    var large = (a2 - a1) > Math.PI ? 1 : 0;
    return 'M' + p1[0] + ',' + p1[1] + ' A' + rad + ',' + rad + ' 0 ' + large + ' 1 ' + p2[0] + ',' + p2[1];
  }
  function angOf(vv) { return A0 + clamp((vv - min) / span, 0, 1) * (A1 - A0); }
  function fmtNum(vv) { return dec > 0 ? vv.toFixed(dec) : String(Math.round(vv)); }

  var BAND = 14;
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg tokui-chart__svg--gauge', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, h);

  // 轨道：有 zones → 多色段带（阶段分布）；否则灰底单轨
  if (zones.length) {
    for (var bi = 0; bi < bandEdges.length - 1; bi++) {
      svg.appendChild(svgEl('path', { d: arcPath(angOf(bandEdges[bi]), angOf(bandEdges[bi + 1]), r), fill: 'none', stroke: zc[bi % zc.length], 'stroke-width': BAND, 'stroke-linecap': 'butt', opacity: '0.28', class: 'tokui-chart-gauge-track' }));
    }
  } else {
    svg.appendChild(svgEl('path', { d: arcPath(A0, A1, r), fill: 'none', stroke: 'var(--tokui-chart-grid, #ececec)', 'stroke-width': BAND, 'stroke-linecap': 'round', class: 'tokui-chart-gauge-track' }));
  }

  // 刻度：ticks 控制密度；端点 + zones 阈值处标数值
  var tickCount = parseInt(attrs.ticks, 10); if (isNaN(tickCount)) tickCount = 6;
  var labelSet = {}; [min, max].concat(zones).forEach(function (e) { labelSet[Math.round(e * 100) / 100] = true; });
  for (var i = 0; i <= tickCount; i++) {
    var ta = A0 + (i / tickCount) * (A1 - A0);
    var isMajor = (i === 0 || i === tickCount);
    var inner = polar(ta, r - BAND / 2 - 1);
    var outer = polar(ta, r + BAND / 2 + 2);
    svg.appendChild(svgEl('line', { x1: inner[0], y1: inner[1], x2: outer[0], y2: outer[1], stroke: 'var(--tokui-chart-text, #bbb)', 'stroke-width': isMajor ? 1.2 : 0.6, opacity: isMajor ? 0.8 : 0.35 }));
    var ev = min + (i / tickCount) * span;
    var evR = Math.round(ev * 100) / 100;
    if (isMajor || labelSet[evR]) {
      var lb = polar(ta, r + BAND / 2 + 12);
      var lbTxt = svgEl('text', { x: lb[0], y: lb[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'var(--tokui-chart-text, #999)', 'font-size': '8' });
      lbTxt.textContent = (dec > 0 ? ev.toFixed(dec) : Math.round(ev));
      svg.appendChild(lbTxt);
    }
  }

  // 数值弧（可被 setValue 更新）
  var valG = svgEl('g', { class: 'tokui-chart-tip-group' });
  var arc = svgEl('path', { fill: 'none', stroke: arcColor, 'stroke-width': BAND, 'stroke-linecap': 'round', class: 'tokui-chart-gauge-arc' });
  valG.appendChild(arc);
  tips.add(valG, (attrs.l || _t('gauge.currentValue')) + ': ' + fmtNum(val) + unit + '  (' + Math.round(clamp((val - min) / span, 0, 1) * 100) + '%)', cx, baseY - r);
  svg.appendChild(valG);

  // 指针 + 轴心
  var needle = svgEl('line', { stroke: arcColor, 'stroke-width': 2.5, 'stroke-linecap': 'round', class: 'tokui-chart-gauge-needle' });
  svg.appendChild(needle);
  svg.appendChild(svgEl('circle', { cx: cx, cy: baseY, r: 5, fill: arcColor, stroke: '#fff', 'stroke-width': 1.5, class: 'tokui-chart-gauge-hub' }));

  // 中心数值 + 指标名 + status 角标 + 底部副标题（多标题）
  // 上抬 + 加大行距：避免 label/status 压住指针轴心 (hub)，中心区不再拥挤
  var midY = baseY - r * (rangeDeg === 180 ? 0.50 : (rangeDeg === 270 ? 0.20 : 0.12));
  var vTxt = svgEl('text', { x: cx, y: midY, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'var(--tokui-text, #333)', 'font-size': '24', 'font-weight': '700', class: 'tokui-chart-gauge-value tokui-chart-gauge-label' });
  svg.appendChild(vTxt);
  var capY = midY + 20;
  if (attrs.l) {
    var lab = svgEl('text', { x: cx, y: capY, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'var(--tokui-chart-text, #999)', 'font-size': '10', class: 'tokui-chart-gauge-label' });
    lab.textContent = attrs.l;
    svg.appendChild(lab);
    capY += 15;
  }
  if (attrs.status && STATUS_LABEL[attrs.status]) {
    var cap = svgEl('text', { x: cx, y: capY, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: STATUS_COLORS[attrs.status], 'font-size': '9', 'font-weight': '600', class: 'tokui-chart-gauge-label' });
    cap.textContent = STATUS_LABEL[attrs.status];
    svg.appendChild(cap);
  }
  if (attrs.sub) {
    // 副标题：180 置于直径线下方死角；270/360 置于弧外底部
    var subY = rangeDeg === 180 ? (baseY + 14) : (h - 8);
    var sub = svgEl('text', { x: cx, y: subY, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'var(--tokui-chart-text, #aaa)', 'font-size': '9', class: 'tokui-chart-gauge-label' });
    sub.textContent = attrs.sub;
    svg.appendChild(sub);
  }

  svg.appendChild(tips.layer);

  // setValue：同步弧路径 / 指针端点 / 中心数字（初绘与动画共用）
  function setValue(vv) {
    var a = angOf(vv);
    arc.setAttribute('d', arcPath(A0, a, r));
    var np = polar(a, r - BAND / 2 - 3);
    needle.setAttribute('x1', cx); needle.setAttribute('y1', baseY);
    needle.setAttribute('x2', np[0]); needle.setAttribute('y2', np[1]);
    vTxt.textContent = fmtNum(vv) + unit;
  }
  bindTooltips(svg);

  // 数字 + 弧 + 指针动画（复用 animateValue：easeOutCubic + rAF；尊重 prefers-reduced-motion）
  animateValue(min, val, parseInt(attrs.anim, 10) || 0, setValue);
  return svg;
}

// === Radar 雷达图 ===

function renderRadar(data, labels, colors, attrs) {
  var w = parseInt(attrs.w) || 240;
  var h = parseInt(attrs.h) || 240;
  var cx = w / 2, cy = h / 2;
  var series = parseMultiSeries(attrs.d);
  if (!series.length) series = [data];
  if (series.every(function (s) { return !s.length; })) return emptyChartSvg(w, h); // 空数据占位
  var hasLegend = series.length > 1;
  var totalH = h + (hasLegend ? LEGEND_H : 0);
  var r = Math.min(cx, cy) - 30;
  var n = Math.max(labels.length, series[0].length, 3);
  var maxVal = 0;
  series.forEach(function (s) { s.forEach(function (v) { if (v > maxVal) maxVal = v; }); });
  maxVal = maxVal || 100;
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + totalH, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, totalH);
  // grid rings
  for (var ring = 1; ring <= 4; ring++) {
    var rr = r * ring / 4;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = (2 * Math.PI * i / n) - Math.PI / 2;
      pts.push((cx + rr * Math.cos(a)) + ',' + (cy + rr * Math.sin(a)));
    }
    svg.appendChild(svgEl('polygon', { points: pts.join(' '), fill: 'none', stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
  }
  // axes + labels
  for (var i = 0; i < n; i++) {
    var a = (2 * Math.PI * i / n) - Math.PI / 2;
    svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2: cx + r * Math.cos(a), y2: cy + r * Math.sin(a), stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
    if (labels[i]) {
      svg.appendChild(svgEl('text', { x: cx + (r + 14) * Math.cos(a), y: cy + (r + 14) * Math.sin(a), 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'var(--tokui-chart-text, #999)', 'font-size': '7' })).textContent = labels[i];
    }
  }
  // 每个系列一个数据多边形（缺陷修复：原仅单系列）
  series.forEach(function (sdata, si) {
    var color = colors[si % colors.length];
    var dataPts = [];
    sdata.forEach(function (val, i) {
      var a = (2 * Math.PI * i / n) - Math.PI / 2;
      var vr = (val / maxVal) * r;
      dataPts.push({ x: cx + vr * Math.cos(a), y: cy + vr * Math.sin(a), idx: i });
    });
    svg.appendChild(svgEl('polygon', { points: dataPts.map(function (p) { return p.x + ',' + p.y; }).join(' '), fill: color, 'fill-opacity': '0.2', stroke: color, 'stroke-width': 2 }));
    dataPts.forEach(function (p) {
      var g = svgEl('g', { class: 'tokui-chart-tip-group' });
      g.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 8, fill: 'transparent' }));
      g.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 3, fill: color, class: 'tokui-chart-point' }));
      tips.add(g, (labels[p.idx] || (_t('chart.dimensionDefault', { n: p.idx + 1 }))) + ': ' + sdata[p.idx] + (series.length > 1 ? ' (' + _t('chart.seriesDefault', { n: si + 1 }) + ')' : ''), p.x, p.y);
      svg.appendChild(g);
    });
  });
  if (hasLegend) {
    appendLegend(svg, series.map(function (s, i) { return { color: colors[i % colors.length], text: _t('chart.seriesDefault', { n: i + 1 }) }; }), w, h + 6);
  }
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Scatter 散点图 ===

function renderScatter(data, labels, colors, attrs) {
  var points = parseScatterData(attrs.d);
  if (!points.length) return emptyChartSvg(parseInt(attrs.w) || 400, parseInt(attrs.h) || 200);
  // 宽按点数动态（每点最小 slot 22），高度经 bandHeight 防过扁；显式 w/h 优先。
  var w = autoSize(attrs, 'w', points.length, 50, 22, 360, 2400);
  var h = bandHeight(w, parseInt(attrs.h) || 200, 4, 560);
  var totalH = h;
  var padL = 40, padB = 30, padT = 18, padR = 10;
  var cw = w - padL - padR;
  var ch = h - padT - padB;
  var xLabel = attrs.xl || 'X';
  var yLabel = attrs.yl || 'Y';
  // 轴范围三级优先：显式 xmin/xmax/ymin/ymax（锁轴，绝对稳定）> 流式缓存（只扩不缩）> 当前点 min/max。
  var xMin = axisBound(attrs, 'xmin', '_xMin', minOf(points.map(function (p) { return p.x; })));
  var xMax = axisBound(attrs, 'xmax', '_xMax', maxOf(points.map(function (p) { return p.x; })));
  var yMin = axisBound(attrs, 'ymin', '_yMin', minOf(points.map(function (p) { return p.y; })));
  var yMax = axisBound(attrs, 'ymax', '_yMax', maxOf(points.map(function (p) { return p.y; })));
  var xRange = xMax - xMin || 1;
  var yRange = yMax - yMin || 1;
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + totalH, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, totalH);
  // grid
  for (var g = 0; g <= 4; g++) {
    var gy = padT + ch * (1 - g / 4);
    svg.appendChild(svgEl('line', { x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padL - 4, y: gy + 4, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = Math.round(yMin + yRange * g / 4);
  }
  // dots + values
  points.forEach(function (p, i) {
    var px = padL + ((p.x - xMin) / xRange) * cw;
    var py = padT + ch * (1 - (p.y - yMin) / yRange);
    var g = svgEl('g', { class: 'tokui-chart-tip-group' });
    g.appendChild(svgEl('circle', { cx: px, cy: py, r: 8, fill: 'transparent', stroke: 'none' }));
    g.appendChild(svgEl('circle', { cx: px, cy: py, r: 5, fill: colors[i % colors.length], opacity: '0.7', class: 'tokui-chart-point' }));
    tips.add(g, xLabel + ': ' + p.x + '  ' + yLabel + ': ' + p.y, px, py);
    svg.appendChild(g);
    var valTxt = svgEl('text', { x: px + 6, y: py - 4, fill: 'var(--tokui-chart-text, #666)', 'font-size': '7' });
    valTxt.textContent = p.x + ',' + p.y;
    svg.appendChild(valTxt);
  });
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Gantt 甘特图 ===

function isDateStr(s) { return /[-/]/.test(String(s)); }

function toTimeNum(raw, mode) {
  if (raw === undefined || raw === '') return NaN;
  if (mode === 'dates') {
    var d = new Date(raw);
    return isNaN(d.getTime()) ? NaN : d.getTime();
  }
  var n = parseFloat(raw);
  return isNaN(n) ? NaN : n;
}

function parseRawTasks(str) {
  if (!str) return [];
  return String(str).split('|').map(function (seg) {
    return seg.split(',').map(function (x) { return x.trim(); });
  });
}

function parseDeps(str) {
  if (!str) return [];
  return String(str).split(',').map(function (s) {
    var m = s.trim().split('->');
    return [parseInt(m[0], 10), parseInt(m[1], 10)];
  }).filter(function (d) { return !isNaN(d[0]) && !isNaN(d[1]); });
}

function parseMilestones(str, mode) {
  if (!str) return [];
  return String(str).split('|').map(function (seg) {
    var p = seg.split(',').map(function (x) { return x.trim(); });
    return { name: p[0] || '', time: toTimeNum(p[1], mode), group: parseInt(p[2], 10) || 0 };
  });
}

// 组名（按 group 索引映射）：gnames 形如 "架构设计|开发|上线"
// Group names indexed by group number — overrides the default "组N" legend label
function parseGanttGroupNames(str) {
  if (!str) return [];
  return String(str).split('|').map(function (s) { return s.trim(); }).filter(function (x) { return x !== ''; });
}

function buildGanttCtx(attrs) {
  var w = parseInt(attrs.w) || 1080;
  var rawTasks = parseRawTasks(attrs.tasks);
  if (!rawTasks.length) return { empty: true };
  var mode = (attrs.mode === 'days' || attrs.mode === 'dates') ? attrs.mode : (isDateStr(rawTasks[0][1]) ? 'dates' : 'days');
  var tasks = [];
  var skipped = 0;
  rawTasks.forEach(function (rt, i) {
    var start = toTimeNum(rt[1], mode);
    var end = toTimeNum(rt[2], mode);
    if (isNaN(start) || isNaN(end)) { skipped++; return; }
    if (end < start) { var tmp = start; start = end; end = tmp; }
    tasks.push({
      name: rt[0] || (_t('chart.taskDefault', { n: tasks.length + 1 })),
      start: start, end: end,
      progress: clamp(parseFloat(rt[3]) || 0, 0, 100),
      group: parseInt(rt[4], 10) || 0
    });
  });
  if (!tasks.length) return { empty: true };
  var tMin, tMax;
  if (mode === 'dates') {
    tMin = Math.min.apply(null, tasks.map(function (t) { return t.start; }));
    tMax = Math.max.apply(null, tasks.map(function (t) { return t.end; }));
  } else {
    tMin = 0;
    tMax = Math.ceil(Math.max.apply(null, tasks.map(function (t) { return t.end; })));
  }
  if (!isFinite(tMax)) tMax = 1;
  var range = (tMax - tMin) || 1;
  var ms = parseMilestones(attrs.ms, mode).filter(function (m) { return !isNaN(m.time); });
  var gnames = parseGanttGroupNames(attrs.gnames);
  var prev = {}, next = {};
  parseDeps(attrs.deps).forEach(function (d) {
    var s = d[0], e = d[1];
    if (s < 0 || s >= tasks.length || e < 0 || e >= tasks.length) return;
    (next[s] = next[s] || []).push(e);
    (prev[e] = prev[e] || []).push(s);
  });
  var groupSet = {};
  tasks.forEach(function (t) { groupSet[t.group] = true; });
  ms.forEach(function (m) { groupSet[m.group] = true; });
  var hasLeg = Object.keys(groupSet).length > 1;
  var hasMs = ms.length > 0;
  var LABEL_W = 110, PAD_T = 28, PAD_R = 16, ROW_H = 26, BAR_H = 14, MS_STRIP = 24;
  var totalH = PAD_T + (hasMs ? MS_STRIP : 0) + tasks.length * ROW_H + (hasLeg ? LEGEND_H : 6);
  var axisW = w - LABEL_W - PAD_R;
  function scale(t) { return LABEL_W + (t - tMin) / range * axisW; }
  function rowY(i) { return PAD_T + (hasMs ? MS_STRIP : 0) + i * ROW_H + ROW_H / 2; }
  return {
    empty: false, w: w, totalH: totalH, mode: mode,
    tasks: tasks, ms: ms, gnames: gnames, prev: prev, next: next,
    tMin: tMin, tMax: tMax, range: range,
    skipped: skipped, hasLeg: hasLeg, hasMs: hasMs,
    LABEL_W: LABEL_W, PAD_T: PAD_T, ROW_H: ROW_H, BAR_H: BAR_H, MS_STRIP: MS_STRIP,
    scale: scale, rowY: rowY, msY: function () { return PAD_T + MS_STRIP / 2; }
  };
}

function fmtT(t, mode) {
  if (mode === 'dates') { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate(); }
  return 'D' + t;
}

function ganttTicks(ctx) {
  var ticks = [];
  if (ctx.mode === 'days') {
    var step = ctx.tMax <= 10 ? 1 : (ctx.tMax <= 30 ? 5 : 10);
    for (var d = 0; d <= ctx.tMax; d += step) ticks.push({ label: 'D' + d, t: d });
  } else {
    var DAY = 86400000;
    var unit = ctx.range <= 14 * DAY ? 'day' : (ctx.range <= 90 * DAY ? 'week' : 'month');
    var start = new Date(ctx.tMin), end = new Date(ctx.tMax);
    if (unit === 'day') {
      for (var dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        ticks.push({ label: (dt.getMonth() + 1) + '/' + dt.getDate(), t: dt.getTime() });
      }
    } else if (unit === 'week') {
      for (var dw = new Date(start); dw <= end; dw.setDate(dw.getDate() + 7)) {
        ticks.push({ label: (dw.getMonth() + 1) + '/' + dw.getDate(), t: dw.getTime() });
      }
    } else {
      for (var dm = new Date(start.getFullYear(), start.getMonth(), 1); dm <= end; dm.setMonth(dm.getMonth() + 1)) {
        ticks.push({ label: _t('chart.monthLabel', { m: dm.getMonth() + 1 }), t: dm.getTime() });
      }
    }
  }
  return ticks;
}

function appendGanttAxis(svg, ctx) {
  var bottomY = ctx.totalH - (ctx.hasLeg ? LEGEND_H : 6);
  ganttTicks(ctx).forEach(function (tk) {
    var x = ctx.scale(tk.t);
    svg.appendChild(svgEl('line', { x1: x, y1: ctx.PAD_T, x2: x, y2: bottomY, stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
    var t = svgEl('text', { x: x, y: ctx.PAD_T - 6, 'text-anchor': 'middle', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9', class: 'tokui-chart-axis-time' });
    t.textContent = tk.label;
    svg.appendChild(t);
  });
}

function diamond(cx, cy, r) {
  return cx + ',' + (cy - r) + ' ' + (cx + r) + ',' + cy + ' ' + cx + ',' + (cy + r) + ' ' + (cx - r) + ',' + cy;
}

function appendGanttMilestones(svg, ctx, colors, tips) {
  // 按 x 排序后做相邻避让：横向间距不足时标签交替下沉一行，防止互相重叠
  var ordered = ctx.ms.map(function (m) {
    return { m: m, x: ctx.scale(m.time) };
  }).sort(function (a, b) { return a.x - b.x; });
  var lastX = -Infinity, stagger = false;
  ordered.forEach(function (o) {
    var m = o.m, x = o.x;
    if (x - lastX < 32) stagger = !stagger; else stagger = false;
    lastX = x;
    var color = colors[m.group % colors.length];
    var cy = ctx.msY();
    var g = svgEl('g', { class: 'tokui-chart-tip-group' });
    g.appendChild(svgEl('polygon', { points: diamond(x, cy, 6), fill: color, stroke: 'var(--tokui-chart-slice-stroke, #fff)', 'stroke-width': 1, class: 'tokui-chart-task-ms' }));
    tips.add(g, m.name + '  ' + fmtT(m.time, ctx.mode), x, cy);
    svg.appendChild(g);
    // 标签置于菱形下方(留出顶部给时间轴刻度)，相邻过近时再下沉一行避让
    var lb = svgEl('text', { x: x, y: cy + 11 + (stagger ? 9 : 0), 'text-anchor': 'middle', fill: 'var(--tokui-text, #333)', 'font-size': '8' });
    lb.textContent = m.name;
    svg.appendChild(lb);
  });
}

// 依赖箭头路径(finish→start)。两种形态：
// (1) dst.start 明显晚于 src.end(留出 nub+余量)：中点 L 形，箭头从左侧水平进入目标任务(向右)。
//     中点垂直段落在两 bar 之间的水平空隙，少压 bar 主体。
// (2) dst.start 紧贴或早于 src.end(相邻/重叠)：箭头从顶部垂直进入目标任务(向下)，避免最后一段反向。
function ganttDepPath(sx, sy, dx, dy, barH) {
  var nub = 8;
  if (dx - 3 > sx + nub) {
    var target = dx - 3;
    var vx = (sx + target) / 2;
    return 'M' + sx + ',' + sy + ' L' + vx + ',' + sy + ' L' + vx + ',' + dy + ' L' + target + ',' + dy;
  }
  var tipY = dy - barH / 2;
  return 'M' + sx + ',' + sy
    + ' L' + (sx + nub) + ',' + sy
    + ' L' + (sx + nub) + ',' + (tipY - 9)
    + ' L' + dx + ',' + (tipY - 9)
    + ' L' + dx + ',' + tipY;
}

function appendGanttDeps(svg, ctx) {
  var defs = svgEl('defs');
  // markerUnits=userSpaceOnUse：箭头尺寸为绝对 px，不随 stroke-width 放大；7px 配 14px bar 更协调
  var marker = svgEl('marker', { id: 'gantt-arrow', markerUnits: 'userSpaceOnUse', markerWidth: '7', markerHeight: '7', refX: '6', refY: '3.5', orient: 'auto' });
  marker.appendChild(svgEl('path', { d: 'M0,0 L7,3.5 L0,7 Z', fill: 'var(--tokui-chart-task-dep, #bbb)' }));
  defs.appendChild(marker);
  svg.appendChild(defs);
  Object.keys(ctx.next).forEach(function (s) {
    var si = parseInt(s, 10);
    var srcX = ctx.scale(ctx.tasks[si].end);
    var srcY = ctx.rowY(si);
    ctx.next[s].forEach(function (ei) {
      var dstX = ctx.scale(ctx.tasks[ei].start);
      var dstY = ctx.rowY(ei);
      svg.appendChild(svgEl('path', {
        d: ganttDepPath(srcX, srcY, dstX, dstY, ctx.BAR_H), fill: 'none',
        stroke: 'var(--tokui-chart-task-dep, #bbb)', 'stroke-width': '1',
        'marker-end': 'url(#gantt-arrow)', class: 'tokui-chart-task-dep',
        'data-dep-from': si, 'data-dep-to': ei
      }));
    });
  });
}

function appendGanttToday(svg, ctx) {
  var now = Date.now();
  if (now < ctx.tMin || now > ctx.tMax) return;
  var x = ctx.scale(now);
  var bottomY = ctx.totalH - (ctx.hasLeg ? LEGEND_H : 6);
  svg.appendChild(svgEl('line', { x1: x, y1: ctx.PAD_T, x2: x, y2: bottomY, stroke: 'var(--tokui-chart-today-line, #fa541c)', 'stroke-width': '1.5', 'stroke-dasharray': '4,3', class: 'tokui-chart-today' }));
  // 「今天」标签上移，避开与同列日期刻度的横向重叠
  var lb = svgEl('text', { x: x, y: ctx.PAD_T - 14, 'text-anchor': 'middle', fill: 'var(--tokui-chart-today-line, #fa541c)', 'font-size': '8' });
  lb.textContent = _t('time.today');
  svg.appendChild(lb);
}

function appendGanttSkipWarn(svg, ctx) {
  var t = svgEl('text', { x: ctx.w - 6, y: 12, 'text-anchor': 'end', fill: '#faad14', 'font-size': '8' });
  t.textContent = _t('gantt.skipped', { n: ctx.skipped });
  svg.appendChild(t);
}

// 点击任务条高亮其依赖传递闭包（上游+下游+自身）
// Click a task bar to highlight its dependency transitive closure (upstream + downstream + self)
function bindGanttClick(svg, ctx) {
  function closure(start, adj) {
    var seen = {}, q = [start], out = {};
    while (q.length) {
      var n = q.shift();
      if (seen[n]) continue;
      seen[n] = 1;
      out[n] = 1;
      var nb = adj[n];
      if (nb) nb.forEach(function (x) { if (!seen[x]) q.push(x); });
    }
    return out;
  }
  var groups = svg.querySelectorAll('.tokui-chart-task-tip-group');
  var active = null;
  groups.forEach(function (g) {
    g.addEventListener('click', function () {
      var idx = parseInt(g.getAttribute('data-task-idx'), 10);
      if (isNaN(idx)) return;
      var all = svg.querySelectorAll('.tokui-chart-task-tip-group');
      var deps = svg.querySelectorAll('.tokui-chart-task-dep');
      if (active === idx) {
        svg.classList.remove('has-active');
        all.forEach(function (x) { x.classList.remove('is-active'); });
        deps.forEach(function (d) { d.classList.remove('is-active'); });
        active = null;
        return;
      }
      active = idx;
      var inClosure = {};
      inClosure[idx] = 1;
      Object.keys(closure(idx, ctx.prev)).forEach(function (k) { inClosure[k] = 1; });
      Object.keys(closure(idx, ctx.next)).forEach(function (k) { inClosure[k] = 1; });
      svg.classList.add('has-active');
      all.forEach(function (x) {
        var xi = parseInt(x.getAttribute('data-task-idx'), 10);
        if (isNaN(xi)) return;
        if (inClosure[xi]) x.classList.add('is-active'); else x.classList.remove('is-active');
      });
      deps.forEach(function (d) {
        var f = parseInt(d.getAttribute('data-dep-from'), 10);
        var tt = parseInt(d.getAttribute('data-dep-to'), 10);
        if (inClosure[f] && inClosure[tt]) d.classList.add('is-active'); else d.classList.remove('is-active');
      });
    });
  });
}

function appendGanttTasks(svg, ctx, colors, tips) {
  ctx.tasks.forEach(function (task, i) {
    var color = colors[task.group % colors.length];
    var x = ctx.scale(task.start);
    var xEnd = ctx.scale(task.end);
    var barW = Math.max(2, xEnd - x);
    var y = ctx.rowY(i) - ctx.BAR_H / 2;
    var g = svgEl('g', { class: 'tokui-chart-tip-group tokui-chart-task-tip-group', 'data-task-idx': i });
    g.appendChild(svgEl('rect', { x: x, y: y, width: barW, height: ctx.BAR_H, rx: 3, fill: color, opacity: '0.35', class: 'tokui-chart-task-bar' }));
    if (task.progress > 0) {
      g.appendChild(svgEl('rect', { x: x, y: y, width: Math.max(0, barW * task.progress / 100), height: ctx.BAR_H, rx: 3, fill: color, class: 'tokui-chart-task-prog' }));
    }
    tips.add(g, task.name + '  ' + fmtT(task.start, ctx.mode) + '→' + fmtT(task.end, ctx.mode) + '  ' + _t('gantt.progress') + ':' + task.progress + '%', x + barW / 2, y);
    svg.appendChild(g);
    var nm = svgEl('text', { x: ctx.LABEL_W - 6, y: ctx.rowY(i) + 3, 'text-anchor': 'end', fill: 'var(--tokui-text, #333)', 'font-size': '9', class: 'tokui-chart-task-name' });
    nm.textContent = task.name;
    svg.appendChild(nm);
  });
}

function renderGantt(data, labels, colors, attrs) {
  var ctx = buildGanttCtx(attrs);
  var w = ctx.w;
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + ctx.totalH, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  if (ctx.empty) {
    var fb = svgEl('text', { x: w / 2, y: 20, 'text-anchor': 'middle', fill: 'var(--tokui-chart-text, #999)', 'font-size': '10' });
    fb.textContent = _t('gantt.noTasks');
    svg.appendChild(fb);
    return svg;
  }
  var tips = createTipMgr(w, ctx.totalH);
  appendGanttAxis(svg, ctx);
  if (ctx.hasMs) appendGanttMilestones(svg, ctx, colors, tips);
  appendGanttTasks(svg, ctx, colors, tips);
  appendGanttDeps(svg, ctx);
  if (ctx.mode === 'dates') appendGanttToday(svg, ctx);
  if (ctx.skipped > 0) appendGanttSkipWarn(svg, ctx);
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  bindGanttClick(svg, ctx);
  if (ctx.hasLeg) {
    var gs = Object.keys(ctx.tasks.reduce(function (a, t) { a[t.group] = 1; return a; }, {})).map(function (g) { return parseInt(g, 10); });
    gs.sort(function (a, b) { return a - b; });
    var legendEntries = gs.map(function (g) { return { color: colors[g % colors.length], text: ctx.gnames[g] || (_t('chart.groupDefault', { n: g + 1 })) }; });
    appendLegend(svg, legendEntries, w, ctx.totalH - LEGEND_H + 6);
  }
  return svg;
}

// === Area 面积图（= line + area 默认 true，支持 stack 堆叠面积）===
function renderArea(data, labels, colors, attrs) {
  var a = {};
  Object.keys(attrs).forEach(function (k) { a[k] = attrs[k]; });
  a.area = true; // 强制填充
  return renderLine(data, labels, colors, a);
}

// === Progress 进度条（横向轨道 + 填充 + 百分比，复用 animateValue）===
function renderProgress(data, labels, colors, attrs) {
  var w = parseInt(attrs.w) || 400;
  var h = parseInt(attrs.h) || 80;
  var max = parseFloat(attrs.max); if (isNaN(max)) max = 100;
  var min = parseFloat(attrs.min); if (isNaN(min)) min = 0;
  var span = max - min || 1;
  var val = parseFloat(attrs.v); if (isNaN(val) && data.length) val = data[0]; if (isNaN(val)) val = 0;
  val = clamp(val, min, max);
  var unit = attrs.u !== undefined ? attrs.u : ((min === 0 && max === 100) ? '%' : '');
  var color = isValidColor(attrs.c) ? attrs.c : (colors[0] || 'var(--tokui-primary, #1677ff)');
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg tokui-chart__svg--progress', preserveAspectRatio: 'xMidYMid meet' });
  var trackY = h / 2 - 8, trackH = 16;
  svg.appendChild(svgEl('rect', { x: 2, y: trackY, width: w - 4, height: trackH, rx: trackH / 2, fill: 'var(--tokui-chart-grid, #ececec)', class: 'tokui-chart-track' }));
  var fill = svgEl('rect', { y: trackY, height: trackH, rx: trackH / 2, fill: color, class: 'tokui-chart-fill' });
  svg.appendChild(fill);
  var label = attrs.l || '';
  var txt = svgEl('text', { x: w - 8, y: h / 2, 'text-anchor': 'end', 'dominant-baseline': 'central', fill: 'var(--tokui-text, #333)', 'font-size': '13', 'font-weight': '700' });
  svg.appendChild(txt);
  function setState(vv) {
    var p = clamp((vv - min) / span, 0, 1);
    fill.setAttribute('x', 2);
    fill.setAttribute('width', Math.max(0, (w - 4) * p));
    txt.textContent = (label ? label + ' ' : '') + Math.round(p * 100) + unit;
  }
  animateValue(min, val, parseInt(attrs.anim, 10) || 0, setState);
  return svg;
}

// === Bubble 气泡图（scatter + 第三维 size）===
function parseBubbleData(d) {
  if (!d) return [];
  return String(d).split(';').map(function (pair) {
    var p = pair.split(',').map(function (v) { return parseFloat(v.trim()) || 0; });
    return { x: p[0] || 0, y: p[1] || 0, s: p[2] || 0 };
  });
}
function renderBubble(data, labels, colors, attrs) {
  var points = parseBubbleData(attrs.d);
  if (!points.length) return emptyChartSvg(parseInt(attrs.w) || 400, parseInt(attrs.h) || 200);
  // 宽按点数动态（每点最小 slot 22），高度经 bandHeight 防过扁；显式 w/h 优先。
  var w = autoSize(attrs, 'w', points.length, 50, 22, 360, 2400), h = bandHeight(w, parseInt(attrs.h) || 200, 4, 560);
  var padL = 40, padB = 30, padT = 18, padR = 10;
  var cw = w - padL - padR, ch = h - padT - padB;
  // 同 scatter 三级优先：显式轴（锁轴）> 流式缓存（只扩不缩）> 当前点 min/max。
  var xMin = axisBound(attrs, 'xmin', '_xMin', minOf(points.map(function (p) { return p.x; })));
  var xMax = axisBound(attrs, 'xmax', '_xMax', maxOf(points.map(function (p) { return p.x; })));
  var yMin = axisBound(attrs, 'ymin', '_yMin', minOf(points.map(function (p) { return p.y; })));
  var yMax = axisBound(attrs, 'ymax', '_yMax', maxOf(points.map(function (p) { return p.y; })));
  // 同 x/y：流式期读 redrawChart 注入的 _sMax（只扩不缩），自闭合全量回退裸 maxOf。
  var sMax = attrs._sMax !== undefined ? +attrs._sMax : (maxOf(points.map(function (p) { return p.s; })) || 1);
  var xRange = xMax - xMin || 1, yRange = yMax - yMin || 1;
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, h);
  for (var g = 0; g <= 4; g++) {
    var gy = padT + ch * (1 - g / 4);
    svg.appendChild(svgEl('line', { x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padL - 4, y: gy + 4, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = Math.round(yMin + yRange * g / 4);
  }
  points.forEach(function (p, i) {
    var px = padL + ((p.x - xMin) / xRange) * cw;
    var py = padT + ch * (1 - (p.y - yMin) / yRange);
    var r = 4 + (p.s / sMax) * 16;
    var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
    grp.appendChild(svgEl('circle', { cx: px, cy: py, r: 8, fill: 'transparent' }));
    grp.appendChild(svgEl('circle', { cx: px, cy: py, r: r, fill: colors[i % colors.length], opacity: '0.5', stroke: colors[i % colors.length], 'stroke-width': 1.5, class: 'tokui-chart-point' }));
    tips.add(grp, (attrs.xl || 'X') + ': ' + p.x + '  ' + (attrs.yl || 'Y') + ': ' + p.y + '  ' + (attrs.sl || 'size') + ': ' + p.s, px, py);
    svg.appendChild(grp);
  });
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Heatmap 热力图（网格 cells + 色阶插值）===
function parseMatrix(str) {
  if (!str) return [];
  return String(str).split('|').map(function (row) {
    return row.split(',').map(function (v) { return parseFloat(v.trim()); }).filter(function (n) { return !isNaN(n); });
  });
}

// 解析直方图范围段标签 "40-50,50-60,...,90-100" → {lo, hi, bins}。
// 用于从用户已给的 l 推断值域 + 箱数 → 锁定 → 流式渲染所见即所得（width 恒、分箱恒）。
// 非范围段（普通标签 "A,B,C" 或无法解析）→ 返回 null。
function parseRangeLabels(l) {
  if (!l) return null;
  var segs = String(l).split(',');
  var lo = Infinity, hi = -Infinity, n = 0;
  segs.forEach(function (s) {
    var m = String(s).trim().match(/^(-?[\d.]+)\s*[-~到至]\s*(-?[\d.]+)$/);
    if (m) { var a = +m[1], b = +m[2]; if (a < b && isFinite(a) && isFinite(b)) { lo = Math.min(lo, a); hi = Math.max(hi, b); n++; } }
  });
  if (!n || !isFinite(lo) || !isFinite(hi) || lo >= hi) return null;
  return { lo: lo, hi: hi, bins: n };
}

// 直方图分箱（renderHistogram 渲染 + redrawChart y 锁共用）。
// bins/lo/hi 优先级：显式 bins/min/max > l 范围段推 > 流式缓存 _bins/_lo/_hi > 当前数据。
// 锁定后 width 恒 → 分箱恒 → 新值仅增对应箱 counts（x 维稳）；y 维（max counts）由 redrawChart 另缓存。
function histogramParams(attrs, data) {
  var rl = parseRangeLabels(attrs.l);
  var bins = parseInt(attrs.bins, 10);
  if (isNaN(bins)) bins = rl ? rl.bins : (attrs._bins !== undefined ? +attrs._bins : Math.min(20, Math.max(5, Math.ceil(Math.sqrt(data.length)))));
  var lo = axisBound(attrs, 'min', '_lo', rl ? rl.lo : minOf(data));
  var hi = axisBound(attrs, 'max', '_hi', rl ? rl.hi : maxOf(data));
  if (lo === hi) { lo -= 1; hi += 1; }
  var width = (hi - lo) / bins;
  var counts = [];
  for (var i = 0; i < bins; i++) counts.push(0);
  data.forEach(function (v) {
    counts[Math.max(0, Math.min(bins - 1, Math.floor((v - lo) / width)))]++; // 超 lo/hi 归边界箱
  });
  return { bins: bins, lo: lo, hi: hi, width: width, counts: counts };
}
function renderHeatmap(data, labels, colors, attrs) {
  var matrix = parseMatrix(attrs.rows || attrs.d);
  var w = parseInt(attrs.w) || 400, h = parseInt(attrs.h) || 320;
  var colLabels = parseLabels(attrs.cols);
  var rowLabels = labels;
  // 骨架维度：行/列标签决定（流式开标签即可画占位网格），数据补足到标签数。
  // 即无 hrow 数据但有 l+cols → 先画 l×cols 单色骨架；数据逐行到 → 该行染色，未到行保持骨架。
  var colsN = Math.max(colLabels.length, matrix[0] ? matrix[0].length : 0);
  var rowsN = Math.max(rowLabels.length, matrix.length);
  if (!rowsN || !colsN) return emptyChartSvg(w, h); // 无标签无数据 → 占位
  var padL = rowLabels.length ? 64 : 30, padT = colLabels.length ? 36 : 16, padR = 16, padB = 16;
  var cw = w - padL - padR, ch = h - padT - padB;
  var cellW = cw / colsN, cellH = ch / rowsN;
  // 已填值 → vRange（优先级：显式 vmin/vmax > 流式缓存 _vMin/_vMax 只扩不缩 > 当前 vals）
  var vals = [];
  matrix.forEach(function (r) { r.forEach(function (v) { if (!isNaN(v)) vals.push(v); }); });
  var hasRange = vals.length > 0;
  var vMin = hasRange ? axisBound(attrs, 'vmin', '_vMin', minOf(vals)) : 0;
  var vMax = hasRange ? axisBound(attrs, 'vmax', '_vMax', maxOf(vals)) : 1;
  var vRange = vMax - vMin || 1;
  var stops = parseColorList(attrs.c).length ? parseColorList(attrs.c) : ['#bae0ff', '#1677ff', '#0958d9'];
  var skelFill = 'var(--tokui-chart-grid, #f0f0f0)';
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, h);
  for (var ri = 0; ri < rowsN; ri++) {
    for (var ci = 0; ci < colsN; ci++) {
      var v = matrix[ri] ? matrix[ri][ci] : undefined;
      var filled = v !== undefined && !isNaN(v);
      var t = filled && hasRange ? (v - vMin) / vRange : 0;
      var color = filled ? lerpColor(stops, t) : skelFill;
      var x = padL + ci * cellW, y = padT + ri * cellH;
      var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
      grp.appendChild(svgEl('rect', { x: x + 1, y: y + 1, width: cellW - 2, height: cellH - 2, rx: 2, fill: color, opacity: filled ? '1' : '0.5', class: 'tokui-chart-cell' + (filled ? '' : ' tokui-chart-cell--skeleton') }));
      if (filled) tips.add(grp, (rowLabels[ri] || ('R' + (ri + 1))) + ' / ' + (colLabels[ci] || ('C' + (ci + 1))) + ': ' + v, x + cellW / 2, y + cellH / 2);
      svg.appendChild(grp);
    }
  }
  colLabels.forEach(function (lb, ci) {
    svg.appendChild(svgEl('text', { x: padL + ci * cellW + cellW / 2, y: padT - 8, 'text-anchor': 'middle', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = lb;
  });
  rowLabels.forEach(function (lb, ri) {
    svg.appendChild(svgEl('text', { x: padL - 6, y: padT + ri * cellH + cellH / 2 + 3, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = lb;
  });
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Rose 玫瑰图（pie 变体，半径 ∝ 值）===
function renderRose(data, labels, colors, attrs) {
  var w = parseInt(attrs.w) || 280, h = parseInt(attrs.h) || 280;
  var totalH = h + LEGEND_H;
  if (!data.length) return emptyChartSvg(w, totalH);
  var cx = w / 2, cy = h / 2;
  var r = Math.min(cx, cy) - 24;
  var maxVal = maxOf(data) || 1;
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + totalH, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, totalH);
  var angle = -Math.PI / 2;
  var sliceAngle = 2 * Math.PI / data.length;
  data.forEach(function (val, i) {
    var rr = (val / maxVal) * r;
    var x1 = cx + rr * Math.cos(angle), y1 = cy + rr * Math.sin(angle);
    var x2 = cx + rr * Math.cos(angle + sliceAngle), y2 = cy + rr * Math.sin(angle + sliceAngle);
    var largeArc = sliceAngle > Math.PI ? 1 : 0;
    var d = 'M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + rr + ',' + rr + ' 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 + ' Z';
    var pct = Math.round(val / maxVal * 100);
    var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
    grp.appendChild(svgEl('path', { d: d, fill: colors[i % colors.length], stroke: 'var(--tokui-chart-slice-stroke, #fff)', 'stroke-width': 2, class: 'tokui-chart-slice' }));
    var midA = angle + sliceAngle / 2;
    tips.add(grp, (labels[i] || (_t('chart.sliceDefault', { n: i + 1 }))) + ': ' + val + ' (' + pct + '%)', cx + rr * 0.6 * Math.cos(midA), cy + rr * 0.6 * Math.sin(midA));
    svg.appendChild(grp);
    svg.appendChild(svgEl('text', { x: cx + (r + 12) * Math.cos(midA), y: cy + (r + 12) * Math.sin(midA), 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'var(--tokui-chart-text, #999)', 'font-size': '8' })).textContent = labels[i] || '';
    angle += sliceAngle;
  });
  appendLegend(svg, data.map(function (v, i) { return { color: colors[i % colors.length], text: labels[i] || (_t('chart.sliceDefault', { n: i + 1 })) }; }), w, h + 6);
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Histogram 直方图（原始值 + 前端分箱，复用 bar 渲染）===
function renderHistogram(data, labels, colors, attrs) {
  var w = parseInt(attrs.w) || 400, h = parseInt(attrs.h) || 200;
  if (!data.length) return emptyChartSvg(w, h);
  var p = histogramParams(attrs, data);
  var binLabels = [];
  for (var j = 0; j < p.bins; j++) binLabels.push((p.lo + j * p.width).toFixed(1));
  var a = {};
  Object.keys(attrs).forEach(function (k) { a[k] = attrs[k]; });
  a.d = p.counts.join(',');
  a.l = binLabels.join(',');
  a.vals = '';
  delete a.bins;
  return renderBar(p.counts, binLabels, colors, a);
}

// === Waterfall 瀑布图（增减累计浮动 + 连接虚线）===
function renderWaterfall(data, labels, colors, attrs) {
  if (!data.length) return emptyChartSvg(parseInt(attrs.w) || 400, parseInt(attrs.h) || 200);
  // 宽按项数动态（每项最小 slot 26），高度经 bandHeight 防过扁；显式 w/h 优先。
  var w = autoSize(attrs, 'w', data.length, 56, 26, 360, 2400), h = bandHeight(w, parseInt(attrs.h) || 200, 4, 560);
  var running = 0, bars = [];
  data.forEach(function (v) {
    var base = running, top = running + v;
    bars.push({ base: Math.min(base, top), top: Math.max(base, top), val: v, isPos: v >= 0 });
    running = top;
  });
  var maxTop = maxOf(bars.map(function (b) { return b.top; }));
  var minBase = minOf(bars.map(function (b) { return b.base; }));
  if (minBase > 0) minBase = 0;
  var range = (maxTop - minBase) || 1;
  var padL = 44, padB = 30, padT = 18, padR = 12;
  var cw = w - padL - padR, ch = h - padT - padB;
  var groupW = cw / data.length, barW = Math.max(4, groupW * 0.6);
  var posColor = colors[0] || '#52c41a', negColor = colors[1] || '#f5222d';
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, h);
  function yOf(v) { return padT + ch * (1 - (v - minBase) / range); }
  for (var g = 0; g <= 4; g++) {
    var gy = yOf(minBase + range * g / 4);
    svg.appendChild(svgEl('line', { x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padL - 4, y: gy + 4, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = Math.round(minBase + range * g / 4);
  }
  bars.forEach(function (b, i) {
    var bx = padL + i * groupW + groupW * 0.2;
    var by = yOf(b.top);
    var bh = Math.max(0, (b.top - b.base) / range * ch);
    var col = b.isPos ? posColor : negColor;
    var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
    grp.appendChild(svgEl('rect', { x: bx, y: by, width: barW - 1, height: bh, fill: col, rx: 2, class: 'tokui-chart-bar' }));
    tips.add(grp, (labels[i] || _t('chart.sliceDefault', { n: i + 1 })) + ': ' + b.val + ' (' + _t('chart.cumulative', { n: Math.round(b.top) }) + ')', bx + barW / 2, by);
    svg.appendChild(grp);
    if (i < bars.length - 1) {
      svg.appendChild(svgEl('line', { x1: bx + barW - 1, y1: by, x2: bx + groupW, y2: by, stroke: col, 'stroke-width': 1, 'stroke-dasharray': '3,2', opacity: '0.45' }));
    }
  });
  var positions = [];
  for (var k = 0; k < data.length; k++) positions.push(padL + k * groupW + groupW / 2);
  appendXLabels(svg, labels.slice(0, data.length), positions, h - 8, groupW);
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Boxplot 箱线图（五数 min/Q1/中位/Q3/max，多组并列）===
function parseBoxData(d) {
  if (!d) return [];
  return String(d).split(';').map(function (seg) {
    var p = seg.split(',').map(function (v) { return parseFloat(v.trim()) || 0; });
    return { min: p[0], q1: p[1], med: p[2], q3: p[3], max: p[4] };
  });
}
function renderBoxplot(data, labels, colors, attrs) {
  var boxes = parseBoxData(attrs.d);
  if (!boxes.length) return emptyChartSvg(parseInt(attrs.w) || 400, parseInt(attrs.h) || 240);
  // 宽按组数动态（每组箱体需更宽 slot 44），高度经 bandHeight 防过扁；显式 w/h 优先。
  var w = autoSize(attrs, 'w', boxes.length, 56, 44, 360, 2400), h = bandHeight(w, parseInt(attrs.h) || 240, 4, 560);
  var allVals = [];
  boxes.forEach(function (b) { allVals.push(b.min, b.max); });
  var lo = minOf(allVals), hi = maxOf(allVals);
  if (lo === hi) { lo -= 1; hi += 1; }
  var range = hi - lo || 1;
  var padL = 44, padB = 30, padT = 18, padR = 12;
  var cw = w - padL - padR, ch = h - padT - padB;
  var groupW = cw / boxes.length, boxW = Math.max(20, groupW * 0.5);
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, h);
  function yOf(v) { return padT + ch * (1 - (v - lo) / range); }
  for (var g = 0; g <= 4; g++) {
    var gy = yOf(lo + range * g / 4);
    svg.appendChild(svgEl('line', { x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padL - 4, y: gy + 4, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = Math.round(lo + range * g / 4);
  }
  boxes.forEach(function (b, i) {
    var cx = padL + i * groupW + groupW / 2;
    var color = colors[i % colors.length];
    var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
    grp.appendChild(svgEl('line', { x1: cx, y1: yOf(b.max), x2: cx, y2: yOf(b.q3), stroke: color, 'stroke-width': 1.5, class: 'tokui-chart-whisker' }));
    grp.appendChild(svgEl('line', { x1: cx, y1: yOf(b.q1), x2: cx, y2: yOf(b.min), stroke: color, 'stroke-width': 1.5, class: 'tokui-chart-whisker' }));
    grp.appendChild(svgEl('line', { x1: cx - 6, y1: yOf(b.max), x2: cx + 6, y2: yOf(b.max), stroke: color, 'stroke-width': 1.5 }));
    grp.appendChild(svgEl('line', { x1: cx - 6, y1: yOf(b.min), x2: cx + 6, y2: yOf(b.min), stroke: color, 'stroke-width': 1.5 }));
    var boxY = yOf(b.q3), boxH = Math.max(0, yOf(b.q1) - yOf(b.q3));
    grp.appendChild(svgEl('rect', { x: cx - boxW / 2, y: boxY, width: boxW, height: boxH, fill: color, opacity: '0.4', stroke: color, 'stroke-width': 1.5, class: 'tokui-chart-box' }));
    grp.appendChild(svgEl('line', { x1: cx - boxW / 2, y1: yOf(b.med), x2: cx + boxW / 2, y2: yOf(b.med), stroke: color, 'stroke-width': 2 }));
    tips.add(grp, (labels[i] || _t('chart.groupDefault', { n: i + 1 })) + '  min:' + b.min + ' Q1:' + b.q1 + ' ' + _t('chart.median') + ':' + b.med + ' Q3:' + b.q3 + ' max:' + b.max, cx, yOf(b.med));
    svg.appendChild(grp);
  });
  var positions = [];
  for (var k = 0; k < boxes.length; k++) positions.push(padL + k * groupW + groupW / 2);
  appendXLabels(svg, labels.slice(0, boxes.length), positions, h - 8, groupW);
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Treemap 矩形树图（占比，slice-and-dice 切分）===
// d: "A:100,B:60,C:40"（name:size）
function parseTreemapData(d) {
  if (!d) return [];
  return String(d).split(',').map(function (seg) {
    var p = seg.split(':');
    return { name: (p[0] || '').trim(), value: parseFloat(p[1]) || 0 };
  }).filter(function (it) { return it.value > 0; });
}
function renderTreemap(data, labels, colors, attrs) {
  var items = parseTreemapData(attrs.d);
  var w = parseInt(attrs.w) || 480, h = parseInt(attrs.h) || 320;
  if (!items.length) return emptyChartSvg(w, h);
  items.sort(function (a, b) { return b.value - a.value; });
  var total = items.reduce(function (a, b) { return a + b.value; }, 0) || 1;
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, h);
  var pad = 2, tileIdx = 0;
  function drawTile(item, x, y, ww, hh) {
    var color = colors[tileIdx % colors.length]; tileIdx++;
    var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
    grp.appendChild(svgEl('rect', { x: x, y: y, width: Math.max(0, ww - pad), height: Math.max(0, hh - pad), rx: 3, fill: color, opacity: '0.85', class: 'tokui-chart-tile' }));
    if (ww > 44 && hh > 26) {
      svg.appendChild(svgEl('text', { x: x + 6, y: y + 14, fill: '#fff', 'font-size': '11', 'font-weight': '600' })).textContent = item.name;
      svg.appendChild(svgEl('text', { x: x + 6, y: y + 27, fill: '#fff', 'font-size': '9', opacity: '0.85' })).textContent = item.value + ' (' + Math.round(item.value / total * 100) + '%)';
    }
    tips.add(grp, item.name + ': ' + item.value + ' (' + Math.round(item.value / total * 100) + '%)', x + ww / 2, y + hh / 2);
    svg.appendChild(grp);
  }
  function layout(arr, x, y, ww, hh) {
    if (!arr.length) return;
    if (arr.length === 1) { drawTile(arr[0], x, y, ww, hh); return; }
    var horiz = ww > hh;
    var firstVal = arr[0].value;
    var restVal = arr.slice(1).reduce(function (a, b) { return a + b.value; }, 0) || 1;
    var firstRatio = firstVal / (firstVal + restVal);
    if (horiz) {
      var fw = ww * firstRatio;
      drawTile(arr[0], x, y, fw, hh);
      layout(arr.slice(1), x + fw + pad, y, ww - fw - pad, hh);
    } else {
      var fh = hh * firstRatio;
      drawTile(arr[0], x, y, ww, fh);
      layout(arr.slice(1), x, y + fh + pad, ww, hh - fh - pad);
    }
  }
  layout(items, 0, 0, w, h);
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Sankey 桑基图（左右两列节点 + 流向 path，宽度 ∝ 流量）===
// nodes: "A,B,C"（可选）；flows: "A->B:10,B->C:5"
function renderSankey(data, labels, colors, attrs) {
  var allNodes = parseLabels(attrs.nodes);
  var flows = String(attrs.flows || '').split(',').map(function (seg) {
    var m = seg.split('->');
    if (m.length !== 2) return null;
    var source = m[0].trim();
    var rest = m[1], colon = rest.lastIndexOf(':');
    var target = colon > 0 ? rest.slice(0, colon).trim() : rest.trim();
    var value = colon > 0 ? (parseFloat(rest.slice(colon + 1)) || 0) : 1;
    return { source: source, target: target, value: value };
  }).filter(function (f) { return f && f.value > 0; });
  var w = parseInt(attrs.w) || 480, h = parseInt(attrs.h) || 320;
  if (!flows.length) return emptyChartSvg(w, h);
  var leftNodes = [], rightNodes = [];
  flows.forEach(function (f) {
    if (leftNodes.indexOf(f.source) < 0) leftNodes.push(f.source);
    if (rightNodes.indexOf(f.target) < 0) rightNodes.push(f.target);
  });
  if (allNodes.length && !rightNodes.length) leftNodes = allNodes;
  var totalFlow = flows.reduce(function (a, b) { return a + b.value; }, 0) || 1;
  var padL = 70, padR = 70, padT = 20, padB = 16, nodeW = 14;
  var leftX = padL, rightX = w - padR - nodeW;
  var ch = h - padT - padB;
  function nodeY(arr, name) {
    var idx = arr.indexOf(name);
    return padT + (arr.length ? ch * (idx + 0.5) / arr.length : ch / 2);
  }
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, h);
  flows.forEach(function (f, i) {
    var color = colors[i % colors.length];
    var sy = nodeY(leftNodes, f.source), ty = nodeY(rightNodes, f.target);
    var thickness = Math.max(1, (f.value / totalFlow) * 44);
    var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
    var midX = (leftX + nodeW + rightX) / 2;
    var path = 'M' + (leftX + nodeW) + ',' + sy + ' C' + midX + ',' + sy + ' ' + midX + ',' + ty + ' ' + rightX + ',' + ty;
    grp.appendChild(svgEl('path', { d: path, fill: 'none', stroke: color, 'stroke-width': thickness, opacity: '0.4', class: 'tokui-chart-flow' }));
    tips.add(grp, f.source + ' → ' + f.target + ': ' + f.value, midX, (sy + ty) / 2);
    svg.appendChild(grp);
  });
  leftNodes.forEach(function (n, i) {
    svg.appendChild(svgEl('rect', { x: leftX, y: nodeY(leftNodes, n) - 12, width: nodeW, height: 24, rx: 2, fill: colors[i % colors.length] }));
    svg.appendChild(svgEl('text', { x: leftX - 6, y: nodeY(leftNodes, n) + 3, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #666)', 'font-size': '10' })).textContent = n;
  });
  rightNodes.forEach(function (n, i) {
    svg.appendChild(svgEl('rect', { x: rightX, y: nodeY(rightNodes, n) - 12, width: nodeW, height: 24, rx: 2, fill: colors[(i + 3) % colors.length] }));
    svg.appendChild(svgEl('text', { x: rightX + nodeW + 6, y: nodeY(rightNodes, n) + 3, 'text-anchor': 'start', fill: 'var(--tokui-chart-text, #666)', 'font-size': '10' })).textContent = n;
  });
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === Candlestick K 线图（OHLC，涨跌色 + 影线实体）===
// d: "o,h,l,c;o,h,l,c"；l: 日期标签
function parseCandleData(d) {
  if (!d) return [];
  return String(d).split(';').map(function (seg) {
    var p = seg.split(',').map(function (v) { return parseFloat(v.trim()); });
    // 跳过不完整组：流式半成品 OHLC（少于4个有效数）不入列。
    // 否则缺位 NaN 经 ||0 变 0 → 该根 l=0 → y 轴 range 被拉到 0 → 柱子挤画布上半（流式错、刷新对的根因）。
    if (p.length < 4 || p.some(function (v) { return !isFinite(v); })) return null;
    return { o: p[0], h: p[1], l: p[2], c: p[3] };
  }).filter(Boolean);
}
function renderCandlestick(data, labels, colors, attrs) {
  var candles = parseCandleData(attrs.d);
  if (!candles.length) return emptyChartSvg(parseInt(attrs.w) || 480, parseInt(attrs.h) || 280);
  // 固定 viewBox 宽高（attrs.w/h 优先）：流式逐根喂入时画布尺寸恒定，
  // 避免 width:100% 下 viewBox 随根数变化 → 显示高度跳动/闪烁（跳动根因）。
  var w = parseInt(attrs.w) || 800, h = parseInt(attrs.h) || 320;
  // y 轴范围：优先用外部缓存的 _yMin/_yMax（流式期 redrawChart 单调扩张+nice，稳定不跳）；
  // 无缓存时自算并 nice 化（独立调用也稳）。
  var lo, hi;
  if (attrs._yMin !== undefined && attrs._yMax !== undefined && isFinite(+attrs._yMin)) {
    lo = +attrs._yMin; hi = +attrs._yMax;
  } else {
    var allVals = [];
    candles.forEach(function (c) { allVals.push(c.h, c.l); });
    lo = minOf(allVals); hi = maxOf(allVals);
    var nb = niceBounds(lo, hi); lo = nb[0]; hi = nb[1];
  }
  if (lo === hi) { lo -= 1; hi += 1; }
  var range = hi - lo || 1;
  var padL = 44, padB = 30, padT = 18, padR = 12;
  var cw = w - padL - padR, ch = h - padT - padB;
  var groupW = cw / candles.length, bodyW = Math.max(3, groupW * 0.6);
  var customColors = parseColorList(attrs.c);
  // 中国惯例：阳线(收≥开=涨)红、阴线(跌)绿。c[0]=阳色 c[1]=阴色（与默认一致）。
  var upColor = customColors[0] || '#f5222d';
  var downColor = customColors[1] || '#52c41a';
  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'tokui-chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  var tips = createTipMgr(w, h);
  function yOf(v) { return padT + ch * (1 - (v - lo) / range); }
  for (var g = 0; g <= 4; g++) {
    var gy = yOf(lo + range * g / 4);
    svg.appendChild(svgEl('line', { x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: 'var(--tokui-chart-grid, #e8e8e8)', 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: padL - 4, y: gy + 4, 'text-anchor': 'end', fill: 'var(--tokui-chart-text, #999)', 'font-size': '9' })).textContent = Math.round(lo + range * g / 4);
  }
  candles.forEach(function (c, i) {
    var cx = padL + i * groupW + groupW / 2;
    var isUp = c.c >= c.o;
    var col = isUp ? upColor : downColor;
    var grp = svgEl('g', { class: 'tokui-chart-tip-group' });
    grp.appendChild(svgEl('line', { x1: cx, y1: yOf(c.h), x2: cx, y2: yOf(c.l), stroke: col, 'stroke-width': 1, class: 'tokui-chart-wick' }));
    var bodyTop = yOf(Math.max(c.o, c.c)), bodyBot = yOf(Math.min(c.o, c.c));
    grp.appendChild(svgEl('rect', { x: cx - bodyW / 2, y: bodyTop, width: bodyW, height: Math.max(1, bodyBot - bodyTop), fill: col, class: 'tokui-chart-candle' }));
    tips.add(grp, (labels[i] || ('D' + (i + 1))) + '  O:' + c.o + ' H:' + c.h + ' L:' + c.l + ' C:' + c.c + (isUp ? ' ↑' : ' ↓'), cx, bodyTop);
    svg.appendChild(grp);
  });
  var positions = [];
  for (var k = 0; k < candles.length; k++) positions.push(padL + k * groupW + groupW / 2);
  appendXLabels(svg, labels.slice(0, candles.length), positions, h - 8, groupW);
  svg.appendChild(tips.layer);
  bindTooltips(svg);
  return svg;
}

// === 注册表 + 入口 ===

function registerChartRenderer(type, fn) {
  chartRenderers[type] = fn;
}

function registerChartComponents(renderer) {
  registerChartRenderer('bar', renderBar);
  registerChartRenderer('line', renderLine);
  registerChartRenderer('pie', renderPie);
  registerChartRenderer('donut', renderDonut);
  registerChartRenderer('radar', renderRadar);
  registerChartRenderer('scatter', renderScatter);
  registerChartRenderer('gantt', renderGantt);
  registerChartRenderer('funnel', renderFunnel);
  registerChartRenderer('gauge', renderGauge);
  registerChartRenderer('area', renderArea);
  registerChartRenderer('progress', renderProgress);
  registerChartRenderer('bubble', renderBubble);
  registerChartRenderer('heatmap', renderHeatmap);
  registerChartRenderer('rose', renderRose);
  registerChartRenderer('histogram', renderHistogram);
  registerChartRenderer('waterfall', renderWaterfall);
  registerChartRenderer('boxplot', renderBoxplot);
  registerChartRenderer('treemap', renderTreemap);
  registerChartRenderer('sankey', renderSankey);
  registerChartRenderer('candlestick', renderCandlestick);

  // === 容器模式：图表流式增量重绘 ===
  // chart 容器无内联数据时，子节点 pt/task/ms 逐个喂入累积，每次 rebuild 整张 SVG。
  // 复用现有 renderXxx 纯函数，把 _chartState 拼回 attrs 重画，坐标随点数自然重算。
  // chartAppendChild：解析子节点累积到 wrapper._chartState
  function chartAppendChild(wrapper, childNode) {
    var state = wrapper._chartState;
    if (!state || !childNode) return;
    var t = childNode.type;
    var a = childNode.attrs || {};
    if (t === 'pt') {
      if (state.type === 'scatter' || state.type === 'bubble' || state.type === 'treemap') {
        // scatter/bubble "x,y[,size]" / treemap "名:值" 整段保留（非纯数字，parseFloat 会丢）
        state.points.push(String(a.v !== undefined ? a.v : (childNode.content || '')));
      } else {
        var v = parseFloat(a.v !== undefined ? a.v : childNode.content);
        if (!isNaN(v)) state.points.push(v);
      }
    } else if (t === 'hrow') {
      // heatmap 行 "v,v,v"（hrow 避让布局 row 容器）。元素存 {v,_p}：
      // _kidPreview（v 碎片半成品）→ 更新末行去重；完整 → 固化末行或 append。
      var hv = String(a.v !== undefined ? a.v : (childNode.content || ''));
      var hlast = state.rows[state.rows.length - 1];
      if (childNode._kidPreview) {
        if (hlast && hlast._p) hlast.v = hv; else state.rows.push({ v: hv, _p: true });
      } else if (hlast && hlast._p) { hlast.v = hv; hlast._p = false; }
      else state.rows.push({ v: hv, _p: false });
    } else if (t === 'flow') {
      // sankey 流 "源->目标:值"。同 hrow 去重逻辑（_kidPreview 碎片 → 更新末行）。
      var fv = String(a.v !== undefined ? a.v : (childNode.content || ''));
      var flast = state.flows[state.flows.length - 1];
      if (childNode._kidPreview) {
        if (flast && flast._p) flast.v = fv; else state.flows.push({ v: fv, _p: true });
      } else if (flast && flast._p) { flast.v = fv; flast._p = false; }
      else state.flows.push({ v: fv, _p: false });
    } else if (t === 'task') {
      // task: "name,start,end,progress,group" 单段（strip 首尾引号，兼容含空格 name 的引号包裹）
      var seg = String(childNode.content || '').replace(/^["']|["']$/g, '').split(',').map(function (x) { return x.trim(); });
      state.tasks.push(seg);
    } else if (t === 'ms') {
      // ms: "name,time,group" 单段
      var p = String(childNode.content || '').replace(/^["']|["']$/g, '').split(',').map(function (x) { return x.trim(); });
      state.ms.push(p);
    }
  }

  // redrawChart：清空旧 svg（保留 title div），用 attrs 重画整张图（容器/自闭合共用）
  function redrawChart(wrapper, attrs) {
    var olds = [];
    for (var i = 0; i < wrapper.childNodes.length; i++) {
      var c = wrapper.childNodes[i];
      if ((c.tagName || '').toLowerCase() === 'svg') olds.push(c);
    }
    olds.forEach(function (s) { wrapper.removeChild(s); });
    var type = attrs.t || 'bar';
    var data = parseData(attrs.d);
    var labels = parseLabels(attrs.l);
    var colors = getColors(attrs);
    var fn = chartRenderers[type];
    if (fn) {
      // candlestick：缓存 y 轴范围于 wrapper，流式期单调扩张 + nice 刻度量化。
      // 避免每根新数据重算 lo/hi → 已画柱 y 坐标全跳（闪烁根因）。只扩不缩 → 极值回收后已画柱稳定。
      if (type === 'candlestick') {
        var cs = parseCandleData(attrs.d);
        // 仅在有完整 K 线且 range 有效时扩张缓存，避免空/半成品数据污染（→ 流式与全量不一致）
        if (cs.length) {
          var avs = [];
          cs.forEach(function (c) { avs.push(c.h, c.l); });
          var rLo = minOf(avs), rHi = maxOf(avs);
          if (isFinite(rLo) && isFinite(rHi) && rLo !== rHi) {
            var eLo = wrapper._yRange ? Math.min(wrapper._yRange.lo, rLo) : rLo;
            var eHi = wrapper._yRange ? Math.max(wrapper._yRange.hi, rHi) : rHi;
            var cnb = niceBounds(eLo, eHi);
            wrapper._yRange = { lo: cnb[0], hi: cnb[1] };
          }
        }
        if (wrapper._yRange) { attrs._yMin = wrapper._yRange.lo; attrs._yMax = wrapper._yRange.hi; }
      }
      // scatter/bubble：缓存 x/y 轴范围于 wrapper，流式期只扩不缩 + nice 量化。
      // 同 candlestick 思路：避免每来新点重算 min/max → 已画点 px/py 全跳（闪烁根因）。
      // x 轴同病同治（x 也是数据值非索引）。极值回收后不缩 → 留白换稳定。
      if (type === 'scatter' || type === 'bubble') {
        var sPts = type === 'bubble' ? parseBubbleData(attrs.d) : parseScatterData(attrs.d);
        if (sPts.length) {
          var sxs = sPts.map(function (p) { return p.x; });
          var sys = sPts.map(function (p) { return p.y; });
          var rxLo = minOf(sxs), rxHi = maxOf(sxs), ryLo = minOf(sys), ryHi = maxOf(sys);
          if (isFinite(rxLo) && isFinite(rxHi) && rxLo !== rxHi) {
            var exLo = wrapper._xRange ? Math.min(wrapper._xRange.lo, rxLo) : rxLo;
            var exHi = wrapper._xRange ? Math.max(wrapper._xRange.hi, rxHi) : rxHi;
            var xnb = niceBounds(exLo, exHi);
            wrapper._xRange = { lo: xnb[0], hi: xnb[1] };
          }
          if (isFinite(ryLo) && isFinite(ryHi) && ryLo !== ryHi) {
            var eyLo = wrapper._yRange ? Math.min(wrapper._yRange.lo, ryLo) : ryLo;
            var eyHi = wrapper._yRange ? Math.max(wrapper._yRange.hi, ryHi) : ryHi;
            var ynb = niceBounds(eyLo, eyHi);
            wrapper._yRange = { lo: ynb[0], hi: ynb[1] };
          }
          // bubble 半径维度 s：只扩不缩（半径非坐标轴，无需 nice 量化）。
          // 防已画点半径随新点 sMax 重算跳变。
          if (type === 'bubble') {
            var rSMax = maxOf(sPts.map(function (p) { return p.s; }));
            if (isFinite(rSMax)) {
              wrapper._sMax = wrapper._sMax ? Math.max(wrapper._sMax, rSMax) : rSMax;
            }
          }
        }
        if (wrapper._xRange) { attrs._xMin = wrapper._xRange.lo; attrs._xMax = wrapper._xRange.hi; }
        if (wrapper._yRange) { attrs._yMin = wrapper._yRange.lo; attrs._yMax = wrapper._yRange.hi; }
        if (wrapper._sMax) { attrs._sMax = wrapper._sMax; }
      }
      // heatmap：缓存值域 vMin/vMax 于 wrapper，流式期只扩不缩（色阶连续插值，无需 nice 量化）。
      // 防每来新 hrow 重算极值 → 已填 cell 颜色全跳。
      if (type === 'heatmap') {
        var hmRows = parseMatrix(attrs.rows || attrs.d);
        if (hmRows.length) {
          var hmVals = [];
          hmRows.forEach(function (r) { r.forEach(function (vv) { if (!isNaN(vv)) hmVals.push(vv); }); });
          if (hmVals.length) {
            var rvLo = minOf(hmVals), rvHi = maxOf(hmVals);
            if (isFinite(rvLo) && isFinite(rvHi)) {
              var hvLo = wrapper._vRange ? Math.min(wrapper._vRange.lo, rvLo) : rvLo;
              var hvHi = wrapper._vRange ? Math.max(wrapper._vRange.hi, rvHi) : rvHi;
              wrapper._vRange = { lo: hvLo, hi: hvHi };
            }
          }
        }
        if (wrapper._vRange) { attrs._vMin = wrapper._vRange.lo; attrs._vMax = wrapper._vRange.hi; }
      }
      // histogram：bins 首帧定不扩（防柱数结构跳）；值域 lo/hi 只扩不缩（极值回收稳）。
      // 注：lo/hi 扩张时 width 变会重分箱（柱高跳一次）—— 直方图范围未知时无法既零跳又准确，
      // 故缺省只扩不缩（非扩张期稳），绝对零跳靠显式 min/max（axisBound 优先）。
      if (type === 'histogram') {
        var hd = parseData(attrs.d);
        var hrl = parseRangeLabels(attrs.l);
        if (hrl) {
          // l 范围段标签 → 锁定 lo/hi/bins（不扩不缩 → width 恒 → 流式=全量所见即所得）
          wrapper._hRange = { lo: hrl.lo, hi: hrl.hi };
          if (attrs.bins === undefined) wrapper._hBins = hrl.bins;
        } else if (hd.length) {
          // 无 l 推 → bins 首帧定 + lo/hi 只扩不缩（缺省；极值扩张瞬间柱高跳一次）
          if (wrapper._hBins === undefined && attrs.bins === undefined) {
            wrapper._hBins = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(hd.length))));
          }
          var hLo = minOf(hd), hHi = maxOf(hd);
          if (isFinite(hLo) && isFinite(hHi)) {
            var eHLo = wrapper._hRange ? Math.min(wrapper._hRange.lo, hLo) : hLo;
            var eHHi = wrapper._hRange ? Math.max(wrapper._hRange.hi, hHi) : hHi;
            wrapper._hRange = { lo: eHLo, hi: eHHi };
          }
        }
        if (wrapper._hBins !== undefined) attrs._bins = wrapper._hBins;
        if (wrapper._hRange) { attrs._lo = wrapper._hRange.lo; attrs._hi = wrapper._hRange.hi; }
        // y 锁：分箱算 counts → max → _yMax 只扩不缩（防柱高缩放跳；非扩期柱高稳）
        if (hd.length) {
          var hp = histogramParams(attrs, hd);
          var yM = maxOf(hp.counts) || 1;
          wrapper._yMax = wrapper._yMax ? Math.max(wrapper._yMax, yM) : yM;
          attrs._yMax = wrapper._yMax;
        }
      }
      var svg = fn(data, labels, colors, attrs);
      // 打类型标记：CSS 据此设各类型最佳实践响应式尺寸 + 最大高度（防宽容器里高度爆炸）
      if (svg && svg.setAttribute && (svg.tagName || '').toLowerCase() === 'svg') {
        svg.setAttribute('data-chart-type', type);
        // 横向柱（orient:h）类别在 y 轴、高度随类别数线性增长（autoSize 封顶 1200），
        // 需比纵向更高的 max-height，否则多类别被压扁。打 data-orient 供 CSS 定向放宽。
        if (type === 'bar' && (attrs.orient === 'h' || attrs.orientation === 'h')) {
          svg.setAttribute('data-orient', 'h');
        }
      }
      wrapper.appendChild(svg);
      // 记录渲染所用数据/标签/属性，供挂载后字号保底（pie 闭环重渲染）取用
      wrapper._tokuiChartSpec = { type: type, data: data, labels: labels, colors: colors, attrs: attrs };
      scheduleAdjust(wrapper);
    } else {
      var fb = document.createElement('div');
      fb.className = 'tokui-chart__fallback';
      fb.textContent = _t('chart.unsupportedType', { type: type });
      wrapper.appendChild(fb);
    }
  }

  // chartRebuild：容器模式拼出当前 attrs 后重画（基于 _chartState）
  function chartRebuild(wrapper) {
    var state = wrapper._chartState;
    if (!state) return;
    var merged = {};
    Object.keys(state.base).forEach(function (k) { merged[k] = state.base[k]; });
    var type = state.type;
    if (type === 'gantt') {
      merged.tasks = state.tasks.map(function (seg) { return seg.join(','); }).join('|');
      merged.ms = state.ms.map(function (seg) { return seg.join(','); }).join('|');
      merged.d = '';
    } else if (type === 'heatmap') {
      // heatmap 矩阵：流式喂 hrow 才拼 rows 覆盖；自闭合内联 base.rows 时 state.rows 为空，保留 base
      if (state.rows.length) { merged.rows = state.rows.map(function (r) { return r.v; }).join('|'); merged.d = ''; }
    } else if (type === 'sankey') {
      // sankey 流：流式喂 flow 才拼 flows 覆盖；自闭合内联 base.flows 时 state.flows 为空，保留 base
      if (state.flows.length) { merged.flows = state.flows.map(function (f) { return f.v; }).join(','); merged.d = ''; }
    } else {
      var sep = (type === 'scatter' || type === 'bubble') ? ';' : ',';
      merged.d = state.points.join(sep);
    }
    redrawChart(wrapper, merged);
  }

  // scheduleRebuild：rAF 合并同帧多次 rebuild（无 rAF 环境 → 同步兜底，如 dom-mock）
  function scheduleRebuild(wrapper) {
    if (wrapper._rafScheduled) return;
    wrapper._rafScheduled = true;
    var run = (typeof window !== 'undefined' && window.requestAnimationFrame)
      ? function (fn) { window.requestAnimationFrame(fn); }
      : function (fn) { fn(); };
    run(function () {
      wrapper._rafScheduled = false;
      chartRebuild(wrapper);
    });
  }

  // ===== 挂载后字号保底：信息文字渲染 px ≥ MIN_CHART_PX =====
  // SVG viewBox 等比缩放，窄容器下小号字不可读。挂载后测容器宽反推字号。
  //   pie：标签宽度反馈进 viewBox → 朴素逐次重算会发散，用 solvePieFs 闭式解 fs*，
  //        fs*>7 时带 _pieFs 重渲染（标签/图例同步用 fs*），_tokuiFsApplied 防循环；
  //   其余：text font-size 直接 bumpFsUnits 抬到 ≥12px（跳过 tooltip 层与 hero 大标题）。
  // 无 ResizeObserver / 容器未布局（clientWidth=0，如 dom-mock / SSR）→ 全程早退，零副作用。
  function adjustChartFs(wrapper) {
    if (typeof document === 'undefined') return;
    var svg = wrapper.querySelector('svg.tokui-chart__svg');
    if (!svg) return;
    var vb = svg.viewBox && svg.viewBox.baseVal;
    var vbW = (vb && vb.width) || parseFloat(svg.getAttribute('viewBox').split(/\s+/)[2]);
    if (!(vbW > 0)) return;
    // C 必须取 svg 实际渲染宽（决定文字 px 的真值）——CSS 可能给 svg 设 max-width，使其窄于 wrapper。
    // 不能用 wrapper.clientWidth 兜底：宽容器下它远大于 svg 实际宽，会误判缩放、漏抬字号。
    // 未布局（rect=0）时直接 return，交给 ResizeObserver 在布局后触发。
    var C = 0;
    if (typeof svg.getBoundingClientRect === 'function') {
      try { C = svg.getBoundingClientRect().width; } catch (e) { C = 0; }
    }
    if (!(C > 0)) return; // 未布局，等 ResizeObserver
    var type = svg.getAttribute('data-chart-type');

    if (type === 'pie') {
      var spec = wrapper._tokuiChartSpec;
      if (!spec || !spec.data || !spec.data.length) return;
      if (!spec.labels || !spec.labels.some(function (l) { return !!l; })) return; // 无标签无需抬
      var total = spec.data.reduce(function (a, b) { return a + b; }, 0) || 1;
      var L0 = pieSizing(spec.data, spec.labels, spec.attrs, 7, total); // fixedA/coefB 与 fs 无关
      var R0 = L0.r + L0.fs; // r(fs)=R0−fs 的截距（L0.fs=7）
      var fsSolver = solvePieFs(C, R0, L0.fixedA, L0.coefB, MIN_CHART_PX);
      // 可见性封顶：极窄容器下 solver 会把 fs 推大 → r(fs)=R0−fs 缩 → 饼图被挤到看不见。
      // 约束「渲染后饼图半径 ≥ PIE_R_MIN_PX」反推 fs 上限（r(fs)·C/W(fs) ≥ R_MIN 展开），
      // 保证饼图始终宏观可见；此时标签可能 <12px（容器物理放不下），属合理降级，
      // 优于「12px 标签 + 看不见的饼」。
      var PIE_R_MIN_PX = 14; // 渲染饼图最小半径（≈直径 28px）：仍可辨识扇区
      var fsCap = Infinity;
      if (L0.coefB > 1) {
        var capNum = C * R0 - 2 * PIE_R_MIN_PX * (R0 + L0.fixedA);
        var capDen = C + 2 * PIE_R_MIN_PX * (L0.coefB - 1);
        fsCap = (capNum > 0 && capDen > 0) ? capNum / capDen : 7;
      }
      var fsStar = Math.min(fsSolver, fsCap);
      var prev = wrapper._tokuiFsApplied || 7;
      if (fsStar > 7 + 0.05 && fsStar > prev + 0.05) {
        wrapper._tokuiFsApplied = fsStar;
        var newAttrs = Object.assign({}, spec.attrs, { _pieFs: fsStar });
        redrawChart(wrapper, newAttrs); // 重渲染会再次 scheduleAdjust → 复算同值 → 跳过，收敛
      }
      return;
    }

    // 非 pie：直接抬信息文字 font-size
    var scale = C / vbW;
    if (!(scale > 0)) return;
    var texts = svg.querySelectorAll('text[font-size]');
    for (var i = 0; i < texts.length; i++) {
      var t = texts[i];
      // 跳过 tooltip 层内文字（仅 hover 显，rect 尺寸按原字号算，抬会错位）
      var p = t.parentNode;
      while (p && p !== svg) {
        var pcls = (p.getAttribute && p.getAttribute('class')) || ''; // SVG className 是 SVGAnimatedString，不可当字符串
        if (pcls.indexOf('tokui-chart-tips-layer') >= 0) { t = null; break; }
        p = p.parentNode;
      }
      if (!t) continue;
      // 跳过 hero 大标题（仪表盘中心值/环形中心值，用户明确不动）
      if (t.classList.contains('tokui-chart-gauge-value') || t.classList.contains('tokui-chart-donut-value')) continue;
      var base = parseFloat(t.getAttribute('font-size'));
      if (!(base > 0) || base >= 13) continue;          // 已 ≥13 单位视为标题/已够大，不动
      var fs2 = bumpFsUnits(base, scale, MIN_CHART_PX);
      if (fs2 !== base) t.setAttribute('font-size', String(Math.round(fs2 * 100) / 100));
    }
  }

  // scheduleAdjust：rAF 即时跑一次 + ResizeObserver 兜底（容器晚布局 / resize）。
  // 无 RO/rAF 环境（dom-mock、SSR）→ 什么都不挂，adjustChartFs 在 clientWidth=0 时本就早退。
  function scheduleAdjust(wrapper) {
    var hasWin = typeof window !== 'undefined';
    var run = (hasWin && window.requestAnimationFrame)
      ? function (fn) { window.requestAnimationFrame(fn); }
      : function (fn) { fn(); };
    run(function () { adjustChartFs(wrapper); });
    if (typeof window === 'undefined' || typeof window.ResizeObserver === 'undefined') return;
    if (wrapper._tokuiRO) try { wrapper._tokuiRO.disconnect(); } catch (e) {}
    var ro = new window.ResizeObserver(function () {
      if (wrapper._tokuiAdjRaf) return;
      wrapper._tokuiAdjRaf = true;
      var r = (window.requestAnimationFrame) ? window.requestAnimationFrame : function (f) { f(); };
      r(function () { wrapper._tokuiAdjRaf = false; adjustChartFs(wrapper); });
    });
    wrapper._tokuiRO = ro;
    var target = wrapper.querySelector('svg.tokui-chart__svg') || wrapper;
    try { ro.observe(target); } catch (e) {}
  }

  // ===== 图表悬浮工具条：hover 出"复制/下载"按钮，导出高清 PNG =====
  // 内联 getComputedStyle 实际色：SVG 用 var(--tokui-...) 变量，独立转图片时无 CSS 上下文会失效变黑。
  function exportChartImage(svg, scale, cb) {
    if (!svg || typeof document === 'undefined' || typeof window === 'undefined') { cb(null); return; }
    var vb = svg.viewBox && svg.viewBox.baseVal;
    var w = (vb && vb.width) || svg.clientWidth || 600;
    var h = (vb && vb.height) || svg.clientHeight || 300;
    var clone = svg.cloneNode(true);
    var srcs = svg.querySelectorAll('*');
    var dsts = clone.querySelectorAll('*');
    var props = ['fill', 'stroke', 'color'];
    for (var i = 0; i < srcs.length; i++) {
      var cs = null;
      try { cs = getComputedStyle(srcs[i]); } catch (e) { cs = null; }
      if (!cs) continue;
      for (var p = 0; p < props.length; p++) {
        var v = cs.getPropertyValue(props[p]);
        if (v) dsts[i].setAttribute(props[p], v);
      }
    }
    // 移除 tooltip 浮层（hover 才显示的提示框），导出纯净图表不含交互层（放内联之后、序列化之前，保 srcs/dsts 索引不错位）
    var tipLayers = clone.querySelectorAll('.tokui-chart-tips-layer');
    for (var j = tipLayers.length - 1; j >= 0; j--) {
      if (tipLayers[j].parentNode) tipLayers[j].parentNode.removeChild(tipLayers[j]);
    }
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    clone.setAttribute('style', 'background:#fff');
    var xml;
    try { xml = new XMLSerializer().serializeToString(clone); } catch (e) { cb(null); return; }
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (canvas.toBlob) canvas.toBlob(function (blob) { cb(blob); }, 'image/png');
      else cb(null);
    };
    img.onerror = function () { cb(null); };
    img.src = url;
  }
  function downloadBlob(blob, name) {
    if (!blob) return;
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function copyBlob(blob, btn) {
    if (!blob) return;
    var ok = navigator.clipboard && navigator.clipboard.write && window.ClipboardItem;
    if (ok) {
      navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
        .then(function () { flashChartAct(btn, _t('common.copied')); })
        .catch(function () { flashChartAct(btn, _t('chart.copyFailed')); });
    } else { flashChartAct(btn, _t('chart.unsupported')); }
  }
  function flashChartAct(btn, text) {
    if (!btn) return;
    var t = document.createElement('span');
    t.className = 'tokui-chart__tip'; t.textContent = text;
    btn.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 1200);
  }
  var ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var ICON_DOWNLOAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  var ICON_FULLSCREEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>';
  // ===== 图表全屏弹层：克隆 svg 独立放大查看（Esc / 点遮罩 / 关闭钮退出）=====
  function openChartModal(srcSvg, title) {
    if (!srcSvg || typeof document === 'undefined') return;
    var existing = document.querySelector('.tokui-chart__modal');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.className = 'tokui-chart__modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    if (title) overlay.setAttribute('aria-label', title);

    var card = document.createElement('div');
    card.className = 'tokui-chart__modal-card';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tokui-chart__modal-close';
    closeBtn.setAttribute('aria-label', _t('common.close'));
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    if (title) {
      var tt = document.createElement('div');
      tt.className = 'tokui-chart__modal-title';
      tt.textContent = title;
      card.appendChild(tt);
    }

    var body = document.createElement('div');
    body.className = 'tokui-chart__modal-body';
    var clone = srcSvg.cloneNode(true);
    if (clone.id) clone.removeAttribute('id');
    // 移除 tooltip 浮层：弹层内为静态放大预览，无 hover 交互
    var tl = clone.querySelectorAll('.tokui-chart-tips-layer');
    for (var i = tl.length - 1; i >= 0; i--) if (tl[i].parentNode) tl[i].parentNode.removeChild(tl[i]);
    body.appendChild(clone);

    card.appendChild(body);
    card.appendChild(closeBtn);
    overlay.appendChild(card);

    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    var closed = false;
    function close() {
      if (closed) return; closed = true;
      overlay.classList.remove('tokui-chart__modal--open');
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 180);
    }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    void overlay.offsetWidth; // 强制 reflow 触发 open transition
    overlay.classList.add('tokui-chart__modal--open');
  }
  function createChartToolbar(wrapper) {
    var bar = document.createElement('div');
    bar.className = 'tokui-chart__toolbar';
    var mk = function (act, title, icon) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tokui-chart__act';
      b.setAttribute('data-act', act);
      b.title = title; b.setAttribute('aria-label', title);
      b.innerHTML = icon;
      return b;
    };
    bar.appendChild(mk('copy', _t('chart.copyImage'), ICON_COPY));
    bar.appendChild(mk('download', _t('chart.downloadImage'), ICON_DOWNLOAD));
    bar.appendChild(mk('fullscreen', _t('chart.fullscreen'), ICON_FULLSCREEN));
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      e.preventDefault();
      var svg = wrapper.querySelector('svg.tokui-chart__svg');
      if (!svg || btn.disabled) return;
      var act = btn.getAttribute('data-act');
      // 放大查看：克隆 svg 进弹层独立展示，不走图片导出
      if (act === 'fullscreen') {
        var ttlEl = wrapper.querySelector('.tokui-chart__title');
        openChartModal(svg, ttlEl ? ttlEl.textContent : '');
        return;
      }
      btn.disabled = true;
      exportChartImage(svg, act === 'copy' ? 2 : 3, function (blob) {
        btn.disabled = false;
        if (!blob) return;
        if (act === 'download') downloadBlob(blob, 'tokui-chart.png');
        else copyBlob(blob, btn);
      });
    });
    return bar;
  }
  renderer.register('chart', function (node) {
    var attrs = node.attrs || {};
    var type = attrs.t || 'bar';
    var wrapper = document.createElement('div');
    wrapper.className = 'tokui-chart';
    if (attrs.tt) {
      var title = document.createElement('div');
      title.className = 'tokui-chart__title';
      title.textContent = attrs.tt;
      wrapper.appendChild(title);
    }
    // 悬浮工具条（复制/下载高清 PNG）：默认隐藏，hover .tokui-chart 时 CSS 显出；流式 rebuild 只换 svg 不动它。
    wrapper.appendChild(createChartToolbar(wrapper));
    // 容器模式：无任何内联数据载体 → 流式收 pt/task/ms/hrow/flow 子节点（兼容全量 parse 带 children）。
    // 判定须与 builder.chart 的 hasInline 一致：rows / nodes+flows / gauge·progress 的 v 也算内联，
    // 否则 heatmap/sankey/gauge 自闭合被误判容器、丢失流式预览钩子 _tokuiChartUpdate（不流式）。
    var _ct = attrs.t;
    var _hasInline = attrs.d || attrs.tasks || attrs.rows ||
      (attrs.nodes && attrs.flows) ||
      (attrs.v !== undefined && (_ct === 'gauge' || _ct === 'progress'));
    if (!_hasInline) {
      wrapper._chartState = { type: type, base: attrs, points: [], tasks: [], ms: [], rows: [], flows: [] };
      wrapper._tokuiChartAppend = function (childNode) {
        chartAppendChild(wrapper, childNode);
        scheduleRebuild(wrapper);
      };
      // 流式关闭时强制刷出最终态（防 rAF 漏最后一批）
      wrapper._streamCloseHook = function () {
        if (wrapper._rafScheduled) {
          wrapper._rafScheduled = false;
          chartRebuild(wrapper);
        }
      };
      // 全量 parse：children 已就绪，一次性收集渲染
      if (node.children && node.children.length) {
        node.children.forEach(function (c) { chartAppendChild(wrapper, c); });
      }
      chartRebuild(wrapper);
      return wrapper;
    }
    // 自闭合旧路径（有 d/tasks 内联数据）
    redrawChart(wrapper, attrs);
    // 挂流式更新钩子：parser 自闭合 chart 预览时，半成品 attrs 到达即 rebuild 渐增
    wrapper._tokuiChartUpdate = function (newAttrs) { redrawChart(wrapper, newAttrs); };
    return wrapper;
  });
}

// UMD 导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerChartComponents = registerChartComponents;
  window.TokUI._internal.registerChartRenderer = registerChartRenderer;
  window.TokUI._internal.bumpFsUnits = bumpFsUnits;
  window.TokUI._internal.solvePieFs = solvePieFs;
  window.TokUI._internal.pieSizing = pieSizing;
  window.TokUI._internal.MIN_CHART_PX = MIN_CHART_PX;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    registerChartComponents, registerChartRenderer,
    bumpFsUnits, solvePieFs, pieSizing, MIN_CHART_PX
  };
}
