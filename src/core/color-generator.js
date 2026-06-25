/**
 * TokUI 色板生成器
 * 基于 HSB 算法，生成 10 级色阶。
 *
 * 使用方式：
 * - generatePalette('#1677ff') → 返回 10 个颜色的数组（亮色模式）
 * - generatePalette('#1677ff', {dark: true}) → 暗色模式色板
 * - generateThemeTokens({primary, danger, success, warning}) → CSS 变量映射
 */
'use strict';

// ===== 颜色转换工具 =====

/**
 * Hex 转 RGB
 * @param {string} hex - #rrggbb 格式
 * @returns {Object} {r, g, b} 各分量 0-255
 */
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

/**
 * RGB 转 Hex
 * @param {Object} rgb - {r, g, b} 各分量 0-255
 * @returns {string} #rrggbb 格式
 */
function rgbToHex(rgb) {
  var clamp = function(v) { return Math.max(0, Math.min(255, Math.round(v))); };
  return '#' + [clamp(rgb.r), clamp(rgb.g), clamp(rgb.b)]
    .map(function(v) { return v.toString(16).padStart(2, '0'); })
    .join('');
}

/**
 * RGB 转 HSV/HSB
 * @param {number} r - 0-255
 * @param {number} g - 0-255
 * @param {number} b - 0-255
 * @returns {Object} {h: 0-360, s: 0-1, v: 0-1}
 */
function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var d = max - min;

  var h = 0;
  var s = max === 0 ? 0 : d / max;
  var v = max;

  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }

  return { h: h * 360, s: s, v: v };
}

/**
 * HSV/HSB 转 RGB
 * @param {number} h - 0-360
 * @param {number} s - 0-1
 * @param {number} v - 0-1
 * @returns {Object} {r, g, b} 各分量 0-255
 */
function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));

  var c = v * s;
  var x = c * (1 - Math.abs((h / 60) % 2 - 1));
  var m = v - c;

  var r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

// ===== 色板算法参数 =====

var hueStep = 2;
var saturationStep = 0.16;
var saturationStep2 = 0.05;
var brightnessStep1 = 0.05;
var brightnessStep2 = 0.15;
var lightColorCount = 5;
var darkColorCount = 4;

/**
 * 暗色模式映射表
 * 将亮色色板中的指定层级颜色与背景色按给定透明度混合
 */
var darkColorMap = [
  { index: 7, opacity: 0.15 },
  { index: 6, opacity: 0.25 },
  { index: 5, opacity: 0.3 },
  { index: 5, opacity: 0.45 },
  { index: 5, opacity: 0.65 },
  { index: 5, opacity: 0.85 },
  { index: 4, opacity: 0.9 },
  { index: 3, opacity: 0.95 },
  { index: 2, opacity: 0.97 },
  { index: 1, opacity: 0.98 }
];

// ===== 色板生成核心算法 =====

/**
 * 计算色相
 * @param {Object} hsv - 种子色 HSV {h, s, v}
 * @param {number} i - 步数
 * @param {boolean} light - 是否为亮色方向
 * @returns {number} 色相值 0-360
 */
function getHue(hsv, i, light) {
  var hue;
  if (Math.round(hsv.h) >= 60 && Math.round(hsv.h) <= 240) {
    hue = light ? Math.round(hsv.h) - hueStep * i : Math.round(hsv.h) + hueStep * i;
  } else {
    hue = light ? Math.round(hsv.h) + hueStep * i : Math.round(hsv.h) - hueStep * i;
  }
  if (hue < 0) hue += 360;
  else if (hue >= 360) hue -= 360;
  return hue;
}

/**
 * 计算饱和度
 * @param {Object} hsv - 种子色 HSV {h, s, v}
 * @param {number} i - 步数
 * @param {boolean} light - 是否为亮色方向
 * @returns {number} 饱和度 0-1
 */
function getSaturation(hsv, i, light) {
  if (hsv.h === 0 && hsv.s === 0) return hsv.s;
  var saturation;
  if (light) {
    saturation = hsv.s - saturationStep * i;
  } else if (i === darkColorCount) {
    saturation = hsv.s + saturationStep;
  } else {
    saturation = hsv.s + saturationStep2 * i;
  }
  if (saturation > 1) saturation = 1;
  if (light && i === lightColorCount && saturation > 0.1) saturation = 0.1;
  if (saturation < 0.06) saturation = 0.06;
  return Number(saturation.toFixed(2));
}

/**
 * 计算明度
 * @param {Object} hsv - 种子色 HSV {h, s, v}
 * @param {number} i - 步数
 * @param {boolean} light - 是否为亮色方向
 * @returns {number} 明度 0-1
 */
function getValue(hsv, i, light) {
  var value;
  if (light) {
    value = hsv.v + brightnessStep1 * i;
  } else {
    value = hsv.v - brightnessStep2 * i;
  }
  if (value > 1) value = 1;
  return Number(value.toFixed(2));
}

/**
 * 颜色混合（用于暗色模式）
 * 将 rgb2 按比例 p 混合到 rgb1 上
 * @param {Object} rgb1 - 基色 {r, g, b}
 * @param {Object} rgb2 - 混合色 {r, g, b}
 * @param {number} amount - 混合比例 0-100
 * @returns {Object} {r, g, b}
 */
function mix(rgb1, rgb2, amount) {
  var p = amount / 100;
  return {
    r: (rgb2.r - rgb1.r) * p + rgb1.r,
    g: (rgb2.g - rgb1.g) * p + rgb1.g,
    b: (rgb2.b - rgb1.b) * p + rgb1.b
  };
}

/**
 * 生成亮色模式色板
 *
 * @param {string} color - 种子色，#rrggbb 格式
 * @returns {string[]} 10 个 hex 颜色（level 1-10）
 */
function generateLightPalette(color) {
  var patterns = [];
  var pColor = hexToRgb(color);
  var pColorHsv = rgbToHsv(pColor.r, pColor.g, pColor.b);

  // Level 1-5: 浅色，从种子色反向迭代
  for (var i = lightColorCount; i > 0; i -= 1) {
    var h = getHue(pColorHsv, i, true);
    var s = getSaturation(pColorHsv, i, true);
    var v = getValue(pColorHsv, i, true);
    patterns.push(rgbToHex(hsvToRgb(h, s, v)));
  }

  // Level 6: 种子色
  patterns.push(rgbToHex(pColor));

  // Level 7-10: 深色，从种子色正向迭代
  for (var j = 1; j <= darkColorCount; j += 1) {
    var h2 = getHue(pColorHsv, j, false);
    var s2 = getSaturation(pColorHsv, j, false);
    var v2 = getValue(pColorHsv, j, false);
    patterns.push(rgbToHex(hsvToRgb(h2, s2, v2)));
  }

  return patterns;
}

/**
 * 生成暗色模式色板
 * 将亮色色板的指定层级颜色与暗色背景按特定透明度混合
 *
 * @param {string} color - 种子色，#rrggbb 格式
 * @param {string} [bgColor='#141414'] - 背景色
 * @returns {string[]} 10 个 hex 颜色（level 1-10）
 */
function generateDarkPalette(color, bgColor) {
  var lightPatterns = generateLightPalette(color);
  var bg = hexToRgb(bgColor || '#141414');

  return darkColorMap.map(function(item) {
    var darkColor = mix(bg, hexToRgb(lightPatterns[item.index - 1]), item.opacity * 100);
    return rgbToHex(darkColor);
  });
}

/**
 * 生成 10 级色阶
 *
 * @param {string} seedColor - 种子色，#rrggbb 格式
 * @param {Object} [options] - 选项
 * @param {boolean} [options.dark=false] - 是否为暗色模式
 * @returns {string[]} 10 个颜色值的数组，索引 0=level1, 9=level10
 */
function generatePalette(seedColor, options) {
  var opts = options || {};
  if (opts.dark) {
    return generateDarkPalette(seedColor, opts.backgroundColor);
  }
  return generateLightPalette(seedColor);
}

// ===== 主题令牌生成 =====

/**
 * 生成主题 CSS 变量映射
 *
 * @param {Object} seedColors - 种子色配置
 * @param {string} seedColors.primary - 主色
 * @param {string} seedColors.danger - 危险色
 * @param {string} seedColors.success - 成功色
 * @param {string} seedColors.warning - 警告色
 * @param {Object} [options] - 选项
 * @param {boolean} [options.dark=false] - 是否为暗色模式
 * @returns {Object} CSS 变量映射，如 {'--tokui-primary-1': '#e6f4ff', ...}
 */
function generateThemeTokens(seedColors, options) {
  var opts = options || {};
  var tokens = {};

  var categories = ['primary', 'danger', 'success', 'warning'];

  for (var ci = 0; ci < categories.length; ci++) {
    var cat = categories[ci];
    var seed = seedColors[cat];
    if (!seed) continue;

    var palette = generatePalette(seed, { dark: opts.dark });

    for (var i = 0; i < 10; i++) {
      tokens['--tokui-' + cat + '-' + (i + 1)] = palette[i];
    }
  }

  return tokens;
}

// ===== 导出 =====

var ColorGenerator = {
  generatePalette: generatePalette,
  generateThemeTokens: generateThemeTokens
};

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.generatePalette = generatePalette;
  window.TokUI._internal.generateThemeTokens = generateThemeTokens;
  window.TokUI._internal.ColorGenerator = ColorGenerator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ColorGenerator;
}
