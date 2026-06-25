/**
 * TokUI 主题管理模块
 * 通过 data-tokui-theme 属性控制容器的主题，
 * CSS 使用 [data-tokui-theme="xxx"] 选择器匹配对应主题变量。
 *
 * 使用方式：
 * - 初始化时自动设置默认主题
 * - TokUI.setTheme('dark') 切换主题
 * - TokUI.getTheme() 获取当前主题
 */
'use strict';

/**
 * 主题管理对象（单例模式）
 */
const TokUITheme = {
  /** 当前关联的容器 DOM 元素 */
  container: null,
  /** 当前主题名称 */
  currentTheme: 'default',

  /**
   * 初始化主题，设置容器并应用默认主题
   * @param {HTMLElement|string} container - DOM 元素或 CSS 选择器
   */
  init(container) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    if (this.container) {
      this.container.setAttribute('data-tokui-theme', this.currentTheme);
    } else if (container) {
      console.warn('TokUI Theme: 容器未找到，主题不会生效');
    }
  },

  /**
   * 切换主题
   * 更新容器的 data-tokui-theme 属性，触发 CSS 变量切换
   * @param {string} themeName - 主题名称（如 'default', 'dark'）
   */
  setTheme(themeName) {
    if (typeof themeName !== 'string' || !themeName) {
      console.warn('TokUI Theme: themeName 必须为非空字符串');
      return;
    }
    this.currentTheme = themeName;
    if (this.container) {
      this.container.setAttribute('data-tokui-theme', themeName);
    }
  },

  /**
   * 获取当前主题名称
   * @returns {string} 当前主题名称
   */
  getTheme() {
    return this.currentTheme;
  },

  /**
   * 动态生成色阶 CSS 变量并注入到页面
   * 允许运行时自定义颜色方案
   * @param {string} primary - 主色（hex 格式，如 '#1677ff'）
   * @param {Object} [options] - 可选参数
   * @param {string} [options.danger] - 危险色种子
   * @param {string} [options.success] - 成功色种子
   * @param {string} [options.warning] - 警告色种子
   * @param {Document} [options._document] - 可选 document 对象（测试用）
   */
  setSeedColor(primary, options) {
    options = options || {};
    var doc = options._document || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    // 输入校验：仅接受 #rrggbb 格式
    function isValidHex(c) { return /^#[0-9a-fA-F]{6}$/.test(c); }
    if (!isValidHex(primary)) return;
    if (options.danger && !isValidHex(options.danger)) return;
    if (options.success && !isValidHex(options.success)) return;
    if (options.warning && !isValidHex(options.warning)) return;

    var generateThemeTokens;
    if (typeof require === 'function') {
      generateThemeTokens = require('./color-generator').generateThemeTokens;
    } else {
      generateThemeTokens = window.TokUI._internal.generateThemeTokens;
    }

    var seeds = { primary: primary };
    if (options.danger) seeds.danger = options.danger;
    if (options.success) seeds.success = options.success;
    if (options.warning) seeds.warning = options.warning;

    var isDark = this.currentTheme === 'dark';
    var tokens = generateThemeTokens(seeds, { dark: isDark });

    var css = ':root, [data-tokui-theme="default"], [data-tokui-theme="dark"] {\n';
    var keys = Object.keys(tokens);
    for (var i = 0; i < keys.length; i++) {
      var val = tokens[keys[i]];
      // 防御性校验：跳过含非法字符的 token 值
      if (typeof val !== 'string' || /[\{\}]/.test(val)) continue;
      css += '  ' + keys[i] + ': ' + val + ';\n';
    }
    css += '}';

    // Remove old dynamic palette if exists
    var old = doc.querySelector('style[data-tokui-dynamic-palette]');
    if (old) old.parentNode.removeChild(old);

    var style = doc.createElement('style');
    style.setAttribute('data-tokui-dynamic-palette', '');
    style.innerHTML = css;
    doc.head.appendChild(style);
  }
};

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.TokUITheme = TokUITheme;
  window.TokUI.setTheme = TokUITheme.setTheme.bind(TokUITheme);
  window.TokUI.getTheme = TokUITheme.getTheme.bind(TokUITheme);
  window.TokUI.initTheme = TokUITheme.init.bind(TokUITheme);
  window.TokUI.setSeedColor = TokUITheme.setSeedColor.bind(TokUITheme);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokUITheme;
}
