/**
 * TokUI 数据大屏组件（M1 Dashboard Pack）
 * panel（科技边框容器）/ kpi（指标卡）/ flip-num（数字翻牌器）/ scrollboard（轮播榜单）。
 * 配合 tech 主题（theme:tech / data-tokui-theme="tech"）为 ChatBI 大屏场景服务；
 * 其余主题下走主题表面色令牌，同样可用。
 */
'use strict';

/**
 * 注册大屏组件到渲染器
 * @param {TokUIRenderer} renderer - 渲染器实例
 */
function registerDashboardComponents(renderer) {
  const { el } = (typeof require === 'function')
    ? require('../core/renderer')
    : window.TokUI._internal;

  var _t = (typeof require === 'function')
    ? require('../core/i18n').t
    : (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal && window.TokUI._internal.t)
    || function (key) { return key; };

  function _iconSvg(name, size) {
    if (typeof require === 'function') {
      try { return require('./icons').iconSvg(name, size); } catch (e) { return ''; }
    }
    var i = (typeof window !== 'undefined') && window.TokUI && window.TokUI._internal;
    return (i && i.iconSvg) ? i.iconSvg(name, size) : '';
  }

  function _applyTheme(dom, attrs) {
    var t = attrs && attrs.theme;
    if (t && /^(default|dark|modern|modern-dark|tech)$/.test(t)) dom.setAttribute('data-tokui-theme', t);
  }

  var _reduceMotion = false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    try { _reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { _reduceMotion = false; }
  }

  // === panel：科技边框容器（大屏面板外壳） ===
  // attrs: tt（标题栏文本，可选）、v（corner/glow/plain 变体，经 VARIANTS 白名单）、theme
  // 容器模式：[panel tt:车间实时产量 v:glow]…[/panel]
  renderer.register('panel', (node, rc) => {
    const panel = el('div', { class: 'tokui-panel' });
    _applyTheme(panel, node.attrs);
    if (node.attrs.tt) {
      var head = el('div', { class: 'tokui-panel__head' });
      var title = el('span', { class: 'tokui-panel__title' }, node.attrs.tt);
      head.appendChild(title);
      panel.appendChild(head);
    }
    const body = el('div', { class: 'tokui-panel__body' });
    if (node.content) body.textContent = node.content;
    rc(node.children).forEach(child => {
      if (child && child.nodeType) body.appendChild(child);
    });
    panel.appendChild(body);
    panel._slot = body;
    panel._tokuiType = 'panel';
    return panel;
  });

  // === kpi：指标卡（card + stat 封装，数值滚动动画 + 趋势徽章） ===
  // attrs: tt(标题) v(数值) pre/suf(前后缀) unit(单位别名=suf) trend(up|down 或带符号数字)
  //        dec(小数位) icon(注册表图标名) clk(点击钻取) t(状态色 primary/danger/success/warning)
  // 容器模式：子节点作为底部说明行；[upd id:x v:新值 trend:up] 更新走滚动动画
  renderer.register('kpi', (node, rc) => {
    const attrs = node.attrs || {};
    const wrap = el('div', { class: 'tokui-kpi' + (attrs.clk ? ' tokui-kpi--clickable' : '') });
    _applyTheme(wrap, attrs);
    var tone = attrs.t && /^(primary|danger|success|warning)$/.test(attrs.t) ? attrs.t : '';
    if (tone) wrap.classList.add('tokui-kpi--' + tone);

    var top = el('div', { class: 'tokui-kpi__top' });
    if (attrs.icon) {
      var ic = el('span', { class: 'tokui-kpi__icon', 'aria-hidden': 'true' });
      ic.innerHTML = _iconSvg(attrs.icon, 18);
      top.appendChild(ic);
    }
    var ttEl = el('span', { class: 'tokui-kpi__tt' }, attrs.tt || '');
    top.appendChild(ttEl);
    if (attrs.trend !== undefined && attrs.trend !== '') {
      var tv = String(attrs.trend);
      var up = tv.indexOf('down') !== -1 || tv.indexOf('-') === 0;
      var badge = el('span', { class: 'tokui-kpi__trend tokui-kpi__trend--' + (up ? 'down' : 'up') });
      badge.textContent = (up ? '↓' : '↑') + tv.replace(/^(up|down)\s*/i, '').replace(/^-/, '');
      top.appendChild(badge);
    }
    wrap.appendChild(top);

    var valWrap = el('div', { class: 'tokui-kpi__value' });
    if (attrs.pre) valWrap.appendChild(el('span', { class: 'tokui-kpi__pre' }, attrs.pre));
    var decimals = Math.max(0, Math.min(4, parseInt(attrs.dec, 10) || 0));
    var rawValue = String(attrs.v !== undefined && attrs.v !== '' ? attrs.v : '0');
    var valEl = el('span', { class: 'tokui-kpi__num' });
    valWrap.appendChild(valEl);
    var suf = attrs.suf || attrs.unit;
    if (suf) valWrap.appendChild(el('span', { class: 'tokui-kpi__suf' }, suf));
    wrap.appendChild(valWrap);

    // 数值滚动（easeOutExpo；reduced-motion / 非数值直显）
    var animateTo = function (targetEl, value) {
      var numStr = String(value).replace(/[^\d.\-]/g, '');
      var target = parseFloat(numStr);
      if (_reduceMotion || isNaN(target)) { targetEl.textContent = value; return; }
      var hasComma = String(value).indexOf(',') !== -1;
      targetEl.textContent = '0';
      var startT = null, dur = 1200;
      var tick = function (ts) {
        if (startT === null) startT = ts;
        var p = Math.min((ts - startT) / dur, 1);
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        var cur = target * eased;
        var display = decimals > 0 ? cur.toFixed(decimals) : String(Math.round(cur));
        if (hasComma && decimals === 0) display = Number(display).toLocaleString('en-US');
        targetEl.textContent = display;
        if (p < 1 && typeof window !== 'undefined' && window.requestAnimationFrame) window.requestAnimationFrame(tick);
        else targetEl.textContent = value;
      };
      if (typeof window !== 'undefined' && window.requestAnimationFrame) window.requestAnimationFrame(tick);
      else targetEl.textContent = value;
    };
    animateTo(valEl, rawValue);

    const foot = el('div', { class: 'tokui-kpi__foot' });
    if (node.content) foot.textContent = node.content;
    rc(node.children).forEach(child => {
      if (child && child.nodeType) foot.appendChild(child);
    });
    if (foot.childNodes.length) wrap.appendChild(foot);

    wrap._update = function (uAttrs) {
      if (uAttrs.v !== undefined) {
        var n = wrap.querySelector('.tokui-kpi__num');
        if (n) animateTo(n, String(uAttrs.v));
      }
      if (uAttrs.trend !== undefined) {
        var b = wrap.querySelector('.tokui-kpi__trend');
        if (b) {
          var tv2 = String(uAttrs.trend);
          var isDown = tv2.indexOf('down') !== -1 || tv2.indexOf('-') === 0;
          b.className = 'tokui-kpi__trend tokui-kpi__trend--' + (isDown ? 'down' : 'up');
          b.textContent = (isDown ? '↓' : '↑') + tv2.replace(/^(up|down)\s*/i, '').replace(/^-/, '');
        }
      }
      if (uAttrs.tt !== undefined) {
        var tEl = wrap.querySelector('.tokui-kpi__tt');
        if (tEl) tEl.textContent = uAttrs.tt;
      }
    };
    return wrap;
  });

  // === flip-num：数字翻牌器（逐位 3D 翻牌，大屏核心视觉件） ===
  // attrs: v(数值，数字串可含小数点/逗号) dur(单位过渡 ms 默认 600) s(字号档 sm/lg)
  // 自闭合；[upd id:x v:新值] 各位滚动到位。reduced-motion 回退直显。
  renderer.register('flip-num', (node) => {
    const attrs = node.attrs || {};
    const wrap = el('div', { class: 'tokui-flip' + (attrs.s === 'sm' ? ' tokui-flip--sm' : '') + (attrs.s === 'lg' ? ' tokui-flip--lg' : '') });
    _applyTheme(wrap, attrs);
    var dur = Math.max(0, Math.min(3000, parseInt(attrs.dur, 10) || 600));
    var digits = el('div', { class: 'tokui-flip__digits' });
    wrap.appendChild(digits);

    var makeDigit = function (ch, targetN, immediate) {
      var d = el('span', { class: 'tokui-flip__digit' });
      var reel = el('span', { class: 'tokui-flip__reel' });
      for (var i = 0; i <= 9; i++) reel.appendChild(el('span', { class: 'tokui-flip__face' }, String(i)));
      d.appendChild(reel);
      digits.appendChild(d);
      var apply = function (n, imm) {
        // 动画态清内联 transition（初值态曾写 none），回落样式表 0.6s 过渡；立即/reduced-motion 直跳
        reel.style.transition = (imm || _reduceMotion) ? 'none' : '';
        reel.style.transform = 'translateY(' + (-10 * (n || 0)) + '%)';
      };
      apply(0, true); // 初始 0 态（无过渡）
      return {
        root: d,
        set: function (imm) { apply(targetN, imm); }
      };
    };

    var applyValue = function (value, immediate) {
      var str = String(value === undefined || value === '' ? '0' : value);
      digits.innerHTML = '';
      var made = [];
      var digitChars = str.replace(/[^\d]/g, '').split('');
      var di = 0;
      for (var i = 0; i < str.length && i < 16; i++) {
        var ch = str.charAt(i);
        if (!/\d/.test(ch)) {
          digits.appendChild(el('span', { class: 'tokui-flip__sep' }, ch));
          continue;
        }
        var dg = makeDigit(ch, digitChars[di] !== undefined ? parseInt(digitChars[di], 10) : 0, immediate);
        di++;
        if (dg) made.push(dg);
      }
      // 非立即模式：先渲染 0 态，rAF 两帧后滚动到位（触发 transition）
      if (!immediate && !_reduceMotion && typeof window !== 'undefined' && window.requestAnimationFrame) {
        made.forEach(function (m) {
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () { m.set(); });
          });
        });
      }
      wrap._digits = made;
    };
    var raw = String(attrs.v !== undefined && attrs.v !== '' ? attrs.v : '0');
    applyValue(raw, false);

    wrap._update = function (uAttrs) {
      if (uAttrs.v !== undefined) applyValue(String(uAttrs.v), false);
    };
    return wrap;
  });

  // === scrollboard：轮播榜单（行区 rAF 匀速上滚，hover 暂停，无缝循环） ===
  // attrs: h(视口高 px 默认 300) speed(滚动速度 px/s 默认 36) gap(行距默认 8)
  //        cols:"列1,列2,列3"（表头，可选）rows:"a,1,↑|b,2,↓"（简写数据行）
  // 容器子节点 [tr a,1,↑] 亦支持；行点击经 clk 上报（data 行首列）。
  // 空态：i18n scrollboard.empty；行数 ≤ 视口时静止不滚动。
  renderer.register('scrollboard', (node, rc) => {
    const attrs = node.attrs || {};
    const wrap = el('div', { class: 'tokui-scrollboard' });
    _applyTheme(wrap, attrs);
    var h = Math.max(120, Math.min(1600, parseInt(attrs.h, 10) || 300));
    var speed = Math.max(0, Math.min(400, parseInt(attrs.speed, 10) || 36));
    var gap = Math.max(0, Math.min(48, parseInt(attrs.gap, 10) || 8));

    // 数据行解析：rows 简写优先，其次 [tr] 子节点
    var rows = [];
    if (attrs.rows) {
      String(attrs.rows).split('|').forEach(function (line) {
        var cells = line.split(',');
        if (cells.length) rows.push(cells.map(function (c) { return c.trim(); }));
      });
    }
    (node.children || []).forEach(function (child) {
      if (child.type === 'tr' && child.content) {
        rows.push(String(child.content).split(',').map(function (c) { return c.trim(); }));
      }
    });

    if (attrs.cols) {
      var head = el('div', { class: 'tokui-scrollboard__head' });
      String(attrs.cols).split(',').forEach(function (c) {
        head.appendChild(el('span', { class: 'tokui-scrollboard__cell' }, c.trim()));
      });
      wrap.appendChild(head);
    }
    var viewport = el('div', { class: 'tokui-scrollboard__viewport' });
    viewport.style.height = h + 'px';
    var track = el('div', { class: 'tokui-scrollboard__track' });
    track.style.gap = gap + 'px';
    viewport.appendChild(track);
    wrap.appendChild(viewport);

    if (!rows.length) {
      var empty = el('div', { class: 'tokui-scrollboard__empty' }, _t('scrollboard.empty'));
      viewport.appendChild(empty);
      wrap.appendChild(viewport);
      wrap._slot = viewport;
      wrap._tokuiType = 'scrollboard';
      return wrap;
    }

    var makeRow = function (cells, cloneIdx) {
      var row = el('div', { class: 'tokui-scrollboard__row' });
      if (attrs.clk) {
        row.setAttribute('data-tokui-clk', attrs.clk);
        row.setAttribute('data-value', cells[0] || '');
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
      }
      cells.forEach(function (c, i) {
        var cell = el('span', { class: 'tokui-scrollboard__cell' });
        // ↑↓ 趋势符号自动着色
        if (/^[↑▲]/.test(c)) cell.classList.add('tokui-scrollboard__cell--up');
        if (/^[↓▼]/.test(c)) cell.classList.add('tokui-scrollboard__cell--down');
        cell.textContent = c;
        row.appendChild(cell);
      });
      if (cloneIdx !== undefined) row.setAttribute('aria-hidden', 'true');
      return row;
    };
    rows.forEach(function (cells) { track.appendChild(makeRow(cells)); });
    var firstSetHeight = 0, measured = false;
    // 无缝三原则（根治滚动空白/跳变）：
    // 1) 动画路径**恒定**复制一份首集（旧逻辑仅内容矮于视口才复制——内容高于视口时滚到尾部即空白）；
    // 2) 首集高度在挂载后首个 rAF 帧测量（渲染器内元素尚未入 DOM，浏览器 scrollHeight 恒 0，
    //    旧逻辑永远走 行数×36 兜底猜测，真实行高对不上 → 回绕时机错位）；
    //    双份总高 = 2×S + 1 gap（CSS gap 仅在行间）→ S = (total - gap) / 2，回绕周期 = S + gap 精确对齐；
    // 3) 静态路径（无 rAF / reduced-motion / speed:0）不复制——无动画时副本只是重复内容。
    var animated = typeof window !== 'undefined' && window.requestAnimationFrame && speed > 0 && !_reduceMotion;
    var rafId = null, offset = 0, lastTs = null, paused = false;
    var tick = function (ts) {
      if (lastTs === null) lastTs = ts;
      var dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (!measured) {
        measured = true;
        var total = track.scrollHeight;
        if (total > 0) firstSetHeight = Math.max(1, (total - gap) / 2);
        else firstSetHeight = rows.length * 36; // SSR/dom-mock 兜底
      }
      if (!paused && speed > 0 && firstSetHeight > 0) {
        offset += speed * dt;
        if (offset >= firstSetHeight + gap) offset -= (firstSetHeight + gap);
        track.style.transform = 'translateY(' + (-offset) + 'px)';
      }
      rafId = window.requestAnimationFrame(tick);
    };
    if (animated) {
      rows.forEach(function (cells) { track.appendChild(makeRow(cells, 1)); });
      wrap.addEventListener('mouseenter', function () { paused = true; });
      wrap.addEventListener('mouseleave', function () { paused = false; lastTs = null; });
      rafId = window.requestAnimationFrame(tick);
      if (renderer && typeof renderer._registerCleanup === 'function') {
        renderer._registerCleanup(wrap, function () { if (rafId) window.cancelAnimationFrame(rafId); });
      }
    }

    wrap._update = function (uAttrs) {
      if (uAttrs.speed !== undefined) {
        speed = Math.max(0, Math.min(400, parseInt(uAttrs.speed, 10) || 0));
      }
    };
    wrap._slot = viewport;
    wrap._tokuiType = 'scrollboard';
    return wrap;
  });
  // === fit-screen：大屏缩放容器（1920×1080 设计稿等比适配） ===
  // attrs: w(设计稿宽 默认1920) h(设计稿高 默认1080) mode(scale 等比居中/width 等宽纵滚/full 拉伸铺满)
  //        maxh(width 模式可选视口高上限 px：内容超高部分纵向滚动)
  // 容器模式：[fit-screen w:1920 h:1080 mode:scale]…[/fit-screen]；ResizeObserver 重算，_registerCleanup 解绑。
  // 浮层定位无需修正：getBoundingClientRect 返回 transform 后的视觉坐标。
  renderer.register('fit-screen', (node, rc) => {
    const attrs = node.attrs || {};
    const wrap = el('div', { class: 'tokui-fitscreen' });
    _applyTheme(wrap, attrs);
    var dw = Math.max(320, Math.min(7680, parseInt(attrs.w, 10) || 1920));
    var dh = Math.max(240, Math.min(4320, parseInt(attrs.h, 10) || 1080));
    var mode = ['scale', 'width', 'full'].indexOf(attrs.mode) !== -1 ? attrs.mode : 'scale';
    var maxh = parseInt(attrs.maxh, 10);
    if (isNaN(maxh) || maxh < 40) maxh = 0;
    if (maxh > 8640) maxh = 8640;
    const inner = el('div', { class: 'tokui-fitscreen__inner' });
    inner.style.width = dw + 'px';
    inner.style.height = dh + 'px';
    if (node.content) inner.textContent = node.content;
    rc(node.children).forEach(child => {
      if (child && child.nodeType) inner.appendChild(child);
    });
    wrap.appendChild(inner);

    // 缩放实现：优先 CSS zoom（内容按最终尺寸重新布局栅格化——SVG/文字物理清晰，
    // 不产生 transform 合成层降采样的发虚/变胖；Chrome/Safari 久支持、Firefox 126+ 支持），
    // 不支持 zoom 的环境回落 transform:scale（视觉等价但文字略糊）。
    // full 模式为双轴非等比，zoom 无法表达，恒用 transform。
    var supportsZoom = (function () {
      if (typeof document === 'undefined' || !document.body) return false;
      return 'zoom' in document.body.style;
    })();

    var apply = function () {
      var vw = wrap.clientWidth || 0;
      var vh = wrap.clientHeight || 0;
      if (!vw) return;
      if (mode !== 'width' && !vh) return;
      if (mode === 'width') {
        // 等宽缩放：画布高为最小高，内容可撑高画布（inner height:auto + minHeight）；
        // wrap 贴合视觉内容高，挂载区不再下方留空；
        // maxh 限定视口高时内容超高部分纵向滚动。
        var kw = vw / dw;
        inner.style.height = 'auto';
        inner.style.minHeight = dh + 'px';
        var layoutH, visH;
        if (supportsZoom) {
          inner.style.zoom = kw;
          inner.style.transform = '';
          // zoom 下 scrollHeight 已是视觉像素（渲染即布局）
          layoutH = Math.max(inner.scrollHeight || inner.offsetHeight || 0, Math.round(dh * kw));
          visH = layoutH;
        } else {
          inner.style.transform = 'scale(' + kw + ')';
          inner.style.transformOrigin = 'top left';
          layoutH = Math.max(inner.scrollHeight || inner.offsetHeight || 0, dh);
          visH = Math.round(layoutH * kw);
        }
        wrap.style.minHeight = '0';
        wrap.style.alignItems = 'flex-start'; // 滚动场景 flex 居中会致顶部溢出不可达
        wrap.style.justifyContent = 'flex-start';
        wrap.style.overflowY = 'auto';
        wrap.style.height = (maxh ? Math.min(visH, maxh) : visH) + 'px';
        if (maxh) wrap.style.maxHeight = maxh + 'px';
      } else if (mode === 'full') {
        inner.style.zoom = '';
        inner.style.transform = 'scale(' + (vw / dw) + ', ' + (vh / dh) + ')';
        inner.style.transformOrigin = 'top left';
      } else {
        var k = Math.min(vw / dw, vh / dh);
        if (supportsZoom) {
          inner.style.zoom = k;
          inner.style.transform = '';
        } else {
          inner.style.transform = 'scale(' + k + ')';
          inner.style.transformOrigin = 'center center';
        }
      }
    };

    if (typeof window !== 'undefined' && typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () { apply(); });
      ro.observe(wrap);
      // width 模式 wrap 高度由内容撑高（inner height:auto）——流式渲染子内容后到，
      // 必须观察 inner 本身，否则 wrap 内联高定死在首帧（空内容）不再重算。
      if (mode === 'width') ro.observe(inner);
      if (renderer && typeof renderer._registerCleanup === 'function') {
        renderer._registerCleanup(wrap, function () { ro.disconnect(); });
      }
    } else if (typeof window !== 'undefined' && window.addEventListener) {
      var onResize = function () { apply(); };
      window.addEventListener('resize', onResize);
      if (renderer && typeof renderer._registerCleanup === 'function') {
        renderer._registerCleanup(wrap, function () { window.removeEventListener('resize', onResize); });
      }
    }
    apply();
    wrap._fitApply = apply; // 暴露重算入口（单测/宿主强刷）

    wrap._slot = inner;
    wrap._tokuiType = 'fit-screen';
    return wrap;
  });

}

// UMD 双模式导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerDashboardComponents = registerDashboardComponents;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerDashboardComponents: registerDashboardComponents };
}
