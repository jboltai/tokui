/**
 * TokUI 二维码组件（QR Code，纯 SVG）。
 *
 * 矩阵生成由 vendored 第三方库 qrcode-generator（Kazuhiko Arase, MIT）负责，
 * 见 src/vendor/qrcode-generator.js（原库逻辑未改，末尾追加 TokUI 桥接）。
 * 本文件只做：组件属性解析 + 矩阵→SVG path 渲染 + 注册。
 *
 * 'QR Code' is a registered trademark of DENSO WAVE INCORPORATED.
 *
 * DSL：
 *   [qrcode tx:"https://tokui.jboltai.com"]              # 纯码（默认 EC=M）
 *   [qrcode tx:"订单:ORD-001" l:"扫码下单" s:md ec:M]      # label/尺寸/纠错级
 * 属性：
 *   tx = 编码数据（URL/文本，UTF-8）
 *   l / tt = 下方标签（可选）
 *   s  = 尺寸 sm/md/lg（默认 md；兼容 small/medium/large）
 *   ec = 纠错级 L(7%)/M(15%)/Q(25%)/H(30%)，默认 M（容错越高越抗污损，模块越密）
 */
'use strict';

/**
 * 解析 vendored qrcode 库（Node CJS require / 浏览器共享总线）。
 * @returns {Function|null}
 */
function _getQrLib() {
  if (typeof require === 'function') {
    try { return require('../vendor/qrcode-generator'); } catch (e) { return null; }
  }
  if (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal) {
    return window.TokUI._internal._qrcode;
  }
  return null;
}

/**
 * QR 矩阵 → SVG 单 path（含 4 模块静默区 quiet zone，保证可扫描）。
 * @param {number} n 模块边长（qr.getModuleCount()）
 * @param {Function} isDark (row,col)=>boolean
 * @returns {string} <svg>...</svg>
 */
function matrixToSvg(n, isDark) {
  var QZ = 4;                          // quiet zone（模块数）
  var total = n + QZ * 2;
  var d = '';
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      if (isDark(r, c)) {
        // 画一个 1×1 方块：绝对定位到 (c+QZ, r+QZ)
        d += 'M' + (c + QZ) + ' ' + (r + QZ) + 'h1v1h-1z';
      }
    }
  }
  return '<svg viewBox="0 0 ' + total + ' ' + total + '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" class="tokui-qrcode__svg" shape-rendering="crispEdges">' +
    '<rect x="0" y="0" width="' + total + '" height="' + total + '" fill="#ffffff"/>' +
    '<path d="' + d + '" fill="currentColor"/></svg>';
}

/**
 * 注册二维码组件
 * @param {TokUIRenderer} renderer
 */
function registerQrcode(renderer) {
  var _mod = (typeof require === 'function') ? require('../core/renderer') : window.TokUI._internal;
  var el = _mod.el;

  renderer.register('qrcode', function (node) {
    var data = node.attrs.tx || node.content || '';
    var label = node.attrs.l || node.attrs.tt || '';
    var sizeRaw = String(node.attrs.s || node.attrs.size || 'md').toLowerCase();
    var size = { small: 'sm', medium: 'md', large: 'lg' }[sizeRaw] || sizeRaw;
    var ecRaw = String(node.attrs.ec || 'M').toUpperCase();
    var ec = ['L', 'M', 'Q', 'H'].indexOf(ecRaw) >= 0 ? ecRaw : 'M';

    var wrap = el('div', { class: 'tokui-qrcode tokui-qrcode--' + size });

    var qrcode = _getQrLib();
    if (!qrcode || !data) {
      wrap.appendChild(el('div', { class: 'tokui-qrcode__empty' }, data ? '二维码引擎未就绪' : '—'));
    } else {
      try {
        // Arase 库默认 stringToBytes 做 c&0xff（截低字节）→ 中文/UTF-8 乱码。
        // 切到库自带的 UTF-8 编码（stringToBytesFuncs['UTF-8']），现代扫描器自动识别 UTF-8。
        if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
          qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
        }
        var qr = qrcode(0, ec);          // 0 = 自动选版本
        qr.addData(data);
        qr.make();
        var n = qr.getModuleCount();
        var box = el('div', { class: 'tokui-qrcode__box' });
        box.innerHTML = matrixToSvg(n, function (r, c) { return qr.isDark(r, c); });
        wrap.appendChild(box);
      } catch (e) {
        wrap.appendChild(el('div', { class: 'tokui-qrcode__empty' }, '数据过长'));
      }
    }

    if (label) wrap.appendChild(el('div', { class: 'tokui-qrcode__label' }, label));
    return wrap;
  });
}

// UMD 双模式导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerQrcode = registerQrcode;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerQrcode: registerQrcode };
}
