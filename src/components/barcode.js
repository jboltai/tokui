/**
 * TokUI 条形码组件（Code128 Set B，零依赖纯 JS）。
 * 适用：运单号/订单号/序列号等字母数字变长数据。
 *
 * 编码表 BARS（107 个 Code128 符号的模块位图）与算法移植自 JsBarcode（MIT）。
 * 每个符号 = 3 黑条 + 3 白空，共 11 模块；STOP=106 为 13 模块。
 * 位图中 1=黑条模块、0=白空模块，连续相同位组成一个元素。
 *
 * Set B 覆盖 ASCII 32~126（数字/大小写字母/常用符号），扫描器据 Start B 自动识别。
 *
 * DSL：[barcode tx:"SF1026883749" l:"运单号" s:medium]
 *   tx = 编码数据（也作条码下方的可读文本）
 *   l  = 顶部标签（可选）
 *   s  = 尺寸 sm/md/lg（默认 md；兼容 small/medium/large）
 */
'use strict';

// Code128 符号模块位图（移植自 JsBarcode，MIT License）
var BARS = [
  11011001100, 11001101100, 11001100110, 10010011000, 10010001100,
  10001001100, 10011001000, 10011000100, 10001100100, 11001001000,
  11001000100, 11000100100, 10110011100, 10011011100, 10011001110,
  10111001100, 10011101100, 10011100110, 11001110010, 11001011100,
  11001001110, 11011100100, 11001110100, 11101101110, 11101001100,
  11100101100, 11100100110, 11101100100, 11100110100, 11100110010,
  11011011000, 11011000110, 11000110110, 10100011000, 10001011000,
  10001000110, 10110001000, 10001101000, 10001100010, 11010001000,
  11000101000, 11000100010, 10110111000, 10110001110, 10001101110,
  10111011000, 10111000110, 10001110110, 11101110110, 11010001110,
  11000101110, 11011101000, 11011100010, 11011101110, 11101011000,
  11101000110, 11100010110, 11101101000, 11101100010, 11100011010,
  11101111010, 11001000010, 11110001010, 10100110000, 10100001100,
  10010110000, 10010000110, 10000101100, 10000100110, 10110010000,
  10110000100, 10011010000, 10011000010, 10000110100, 10000110010,
  11000010010, 11001010000, 11110111010, 11000010100, 10001111010,
  10100111100, 10010111100, 10010011110, 10111100100, 10011110100,
  10011110010, 11110100100, 11110010100, 11110010010, 11011011110,
  11011110110, 11110110110, 10101111000, 10100011110, 10001011110,
  10111101000, 10111100010, 11110101000, 11110100010, 10111011110,
  10111101110, 11101011110, 11110101110, 11010000100, 11010010000,
  11010011100, 1100011101011
];
var START_B = 104, STOP = 106, MOD = 103;

/**
 * Code128 Set B 编码：数据 → 模块位图字符串（'1'=条, '0'=空）。
 * 非 ASCII 32~126 的字符被丢弃（Set B 不支持）。
 * @param {string} data
 * @returns {string} 二进制模块串（空数据返回 ''）
 */
function encode128B(data) {
  var chars = [];
  for (var i = 0; i < String(data || '').length; i++) {
    var c = String(data || '').charCodeAt(i);
    if (c >= 32 && c <= 126) chars.push(c);
  }
  if (!chars.length) return '';
  // 校验位：sum = START_B + Σ(i * value_i)，value_i = charCode - 32
  var sum = START_B;
  for (var k = 0; k < chars.length; k++) sum += (k + 1) * (chars[k] - 32);
  var checksum = sum % MOD;
  // 拼接：Start B + 数据 + 校验位 + Stop
  var bits = String(BARS[START_B]);
  for (var j = 0; j < chars.length; j++) bits += String(BARS[chars[j] - 32]);
  bits += String(BARS[checksum]);
  bits += String(BARS[STOP]);
  return bits;
}

/**
 * 模块位图 → SVG 字符串（连续 '1' 合成一根条，保持模块比例可扫描）。
 * @param {string} bits
 * @param {string} size sm/md/lg
 * @returns {string} <svg>...</svg>
 */
function barsToSvg(bits, size) {
  var W = { sm: 1.5, md: 2, lg: 2.5 }[size] || 2;
  var H = { sm: 36, md: 54, lg: 72 }[size] || 54;
  var total = bits.length;
  var rects = '';
  var i = 0;
  while (i < total) {
    if (bits[i] === '1') {
      var j = i;
      while (j < total && bits[j] === '1') j++;
      rects += '<rect x="' + (i * W).toFixed(2) + '" y="0" width="' + ((j - i) * W).toFixed(2) + '" height="' + H + '"/>';
      i = j;
    } else {
      i++;
    }
  }
  var vbW = (total * W).toFixed(2);
  return '<svg viewBox="0 0 ' + vbW + ' ' + H + '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" class="tokui-barcode__bars">' +
    '<g fill="currentColor">' + rects + '</g></svg>';
}

/**
 * 注册条形码组件
 * @param {TokUIRenderer} renderer
 */
function registerBarcode(renderer) {
  var _mod = (typeof require === 'function') ? require('../core/renderer') : window.TokUI._internal;
  var el = _mod.el;

  renderer.register('barcode', function (node) {
    var data = node.attrs.tx || node.content || '';
    var label = node.attrs.l || node.attrs.tt || '';
    var sizeRaw = String(node.attrs.s || node.attrs.size || 'md').toLowerCase();
    var size = { small: 'sm', medium: 'md', large: 'lg' }[sizeRaw] || sizeRaw;

    var wrap = el('div', { class: 'tokui-barcode tokui-barcode--' + size });
    if (label) wrap.appendChild(el('div', { class: 'tokui-barcode__label' }, label));

    var bits = encode128B(data);
    if (bits) {
      var svgBox = el('div', { class: 'tokui-barcode__svg' });
      svgBox.innerHTML = barsToSvg(bits, size);
      wrap.appendChild(svgBox);
    } else {
      wrap.appendChild(el('div', { class: 'tokui-barcode__empty' }, '—'));
    }

    if (data) wrap.appendChild(el('div', { class: 'tokui-barcode__text' }, data));
    return wrap;
  });
}

// UMD 双模式导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerBarcode = registerBarcode;
  window.TokUI._internal.encode128B = encode128B;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerBarcode: registerBarcode, encode128B: encode128B };
}
