/**
 * TokUI 主题管理测试套件
 * 测试 TokUITheme 的初始化、主题切换、校验等功能。
 */
'use strict';

const assert = require('assert');
const TokUITheme = require('../src/core/theme');

/** 测试用例存储 */
const tests = [];
let passed = 0;
let failed = 0;

/**
 * 注册测试用例
 * @param {string} name - 测试名称
 * @param {Function} fn - 测试函数
 */
function test(name, fn) {
  tests.push({ name, fn });
}

/** 运行所有测试用例并输出结果 */
function run() {
  passed = 0;
  failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${t.name}`);
      console.log(`    ${e.message}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

/**
 * 重置 TokUITheme 状态
 */
function resetTheme() {
  TokUITheme.container = null;
  TokUITheme.currentTheme = 'default';
}

// ===== 测试用例 =====

// 测试：默认主题为 'default'
test('default theme is default', () => {
  resetTheme();
  assert.strictEqual(TokUITheme.currentTheme, 'default');
  assert.strictEqual(TokUITheme.getTheme(), 'default');
});

// 测试：setTheme 更新 currentTheme
test('setTheme updates currentTheme', () => {
  resetTheme();
  TokUITheme.setTheme('dark');
  assert.strictEqual(TokUITheme.currentTheme, 'dark');
  assert.strictEqual(TokUITheme.getTheme(), 'dark');
  resetTheme();
});

// 测试：setTheme 传入空字符串时 warn 且不更新
test('setTheme empty string does not update', () => {
  resetTheme();
  TokUITheme.setTheme('dark');
  // 传入空字符串不应更新
  TokUITheme.setTheme('');
  assert.strictEqual(TokUITheme.currentTheme, 'dark');
  resetTheme();
});

// 测试：setTheme 传入非字符串时 warn 且不更新
test('setTheme non-string does not update', () => {
  resetTheme();
  TokUITheme.setTheme('dark');
  TokUITheme.setTheme(123);
  assert.strictEqual(TokUITheme.currentTheme, 'dark');
  TokUITheme.setTheme(null);
  assert.strictEqual(TokUITheme.currentTheme, 'dark');
  TokUITheme.setTheme(undefined);
  assert.strictEqual(TokUITheme.currentTheme, 'dark');
  TokUITheme.setTheme({});
  assert.strictEqual(TokUITheme.currentTheme, 'dark');
  resetTheme();
});

// 测试：getTheme 返回当前主题
test('getTheme returns current theme', () => {
  resetTheme();
  assert.strictEqual(TokUITheme.getTheme(), 'default');
  TokUITheme.setTheme('ocean');
  assert.strictEqual(TokUITheme.getTheme(), 'ocean');
  resetTheme();
});

// 回归测试：复刻 src/index.js 构造函数的主题装配序列（init → setTheme）。
// 修复前构造器对 theme==='default' 跳过 setTheme，导致连续构造 dark → default 两个实例时，
// 后者容器残留 'dark'（init 写入单例脏的 currentTheme）。修复后：只要传了 theme 就 setTheme。
function mockContainer() {
  return {
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  };
}
// 复刻修复后的 src/index.js 构造器主题装配
function ctorApplyTheme(container, theme) {
  TokUITheme.init(container);
  if (theme) TokUITheme.setTheme(theme);
}

test('constructor resets to default after a dark instance', () => {
  resetTheme();
  // 实例 A：theme='dark'
  const a = mockContainer();
  ctorApplyTheme(a, 'dark');
  assert.strictEqual(a.getAttribute('data-tokui-theme'), 'dark');
  // 实例 B：theme='default'（新容器）——修复前这里会残留 'dark'
  const b = mockContainer();
  ctorApplyTheme(b, 'default');
  assert.strictEqual(b.getAttribute('data-tokui-theme'), 'default');
  assert.strictEqual(TokUITheme.getTheme(), 'default');
  resetTheme();
});

test('constructor applies modern / modern-dark across instances', () => {
  resetTheme();
  const a = mockContainer(); ctorApplyTheme(a, 'modern');
  assert.strictEqual(a.getAttribute('data-tokui-theme'), 'modern');
  const b = mockContainer(); ctorApplyTheme(b, 'modern-dark');
  assert.strictEqual(b.getAttribute('data-tokui-theme'), 'modern-dark');
  // 再切回 default 仍须生效
  const c = mockContainer(); ctorApplyTheme(c, 'default');
  assert.strictEqual(c.getAttribute('data-tokui-theme'), 'default');
  resetTheme();
});

// 测试：init 时设置 data-tokui-theme 属性
test('init sets data-tokui-theme attribute', () => {
  resetTheme();
  // 使用 mock 容器对象
  const mockContainer = {
    attributes: {},
    setAttribute(key, value) {
      this.attributes[key] = String(value);
    },
    getAttribute(key) {
      return this.attributes.hasOwnProperty(key) ? this.attributes[key] : null;
    }
  };
  TokUITheme.init(mockContainer);
  assert.strictEqual(mockContainer.getAttribute('data-tokui-theme'), 'default');
  // 切换主题后属性也应更新
  TokUITheme.setTheme('dark');
  assert.strictEqual(mockContainer.getAttribute('data-tokui-theme'), 'dark');
  resetTheme();
});

// 测试：setSeedColor 注入动态色阶 CSS 变量
test('setSeedColor injects palette CSS variables', () => {
  resetTheme();
  var styleEl = null;
  var mockDoc = {
    querySelector: function() { return null; },
    createElement: function() {
      styleEl = { innerHTML: '', setAttribute: function() {} };
      return styleEl;
    },
    head: { appendChild: function() {} }
  };
  var mockContainer = {
    attributes: {},
    setAttribute: function(k, v) { this.attributes[k] = String(v); },
    getAttribute: function(k) { return this.attributes.hasOwnProperty(k) ? this.attributes[k] : null; }
  };
  TokUITheme.init(mockContainer);
  TokUITheme.setSeedColor('#ff0000', { _document: mockDoc });
  assert.ok(styleEl !== null, 'Should create a style element');
  assert.ok(styleEl.innerHTML.indexOf('--tokui-primary-6') !== -1, 'Should contain primary-6 token');
  resetTheme();
});

test('setSeedColor accepts danger, success, warning seeds', () => {
  resetTheme();
  var styleEl = null;
  var mockDoc = {
    querySelector: function() { return null; },
    createElement: function() {
      styleEl = { innerHTML: '', setAttribute: function() {} };
      return styleEl;
    },
    head: { appendChild: function() {} }
  };
  var mockContainer = {
    attributes: {},
    setAttribute: function(k, v) { this.attributes[k] = String(v); },
    getAttribute: function(k) { return this.attributes.hasOwnProperty(k) ? this.attributes[k] : null; }
  };
  TokUITheme.init(mockContainer);
  TokUITheme.setSeedColor('#1677ff', {
    danger: '#ff0000',
    success: '#00ff00',
    warning: '#ffff00',
    _document: mockDoc
  });
  assert.ok(styleEl.innerHTML.indexOf('--tokui-danger-6') !== -1);
  assert.ok(styleEl.innerHTML.indexOf('--tokui-success-6') !== -1);
  assert.ok(styleEl.innerHTML.indexOf('--tokui-warning-6') !== -1);
  resetTheme();
});

run();
