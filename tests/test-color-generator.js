/**
 * TokUI 色板生成器测试套件
 * 测试 generatePalette 和 generateThemeTokens 的功能。
 */
'use strict';

const assert = require('assert');
const { generatePalette, generateThemeTokens } = require('../src/core/color-generator');

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

// ===== 辅助函数 =====

/** 计算 hex 颜色的 RGB 分量之和 */
function rgbSum(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r + g + b;
}

/** 检查是否为有效的 #rrggbb 格式 */
function isValidHex(str) {
  return /^#[0-9a-f]{6}$/.test(str);
}

// ===== 测试用例 =====

// 测试 1: generatePalette('#1677ff') 返回 10 个颜色，全部为 #rrggbb 格式
test('generatePalette returns 10 colors in #rrggbb format', () => {
  const palette = generatePalette('#1677ff');
  assert.strictEqual(Array.isArray(palette), true);
  assert.strictEqual(palette.length, 10);
  for (const color of palette) {
    assert.strictEqual(isValidHex(color), true, `Invalid hex format: ${color}`);
  }
});

// 测试 2: Light palette level 6 匹配种子色
test('light palette level 6 matches seed color', () => {
  const palette = generatePalette('#1677ff');
  assert.strictEqual(palette[5], '#1677ff');
});

// 测试 3: Light palette level 1 最亮（RGB sum > 600）
test('light palette level 1 is lightest (high RGB sum > 600)', () => {
  const palette = generatePalette('#1677ff');
  const sum1 = rgbSum(palette[0]);
  assert.ok(sum1 > 600, `Level 1 RGB sum should be > 600, got ${sum1} (${palette[0]})`);
});

// 测试 4: 验证蓝色精确值
test('Blue palette exact values', () => {
  const palette = generatePalette('#1677ff');
  assert.strictEqual(palette[0], '#e6f4ff', 'Level 1 mismatch');
  assert.strictEqual(palette[1], '#bae0ff', 'Level 2 mismatch');
  assert.strictEqual(palette[2], '#91caff', 'Level 3 mismatch');
  assert.strictEqual(palette[3], '#69b1ff', 'Level 4 mismatch');
  assert.strictEqual(palette[4], '#4096ff', 'Level 5 mismatch');
  assert.strictEqual(palette[5], '#1677ff', 'Level 6 mismatch');
  assert.strictEqual(palette[6], '#0958d9', 'Level 7 mismatch');
  assert.strictEqual(palette[7], '#003eb3', 'Level 8 mismatch');
  assert.strictEqual(palette[8], '#002c8c', 'Level 9 mismatch');
  assert.strictEqual(palette[9], '#001d66', 'Level 10 mismatch');
});

// 测试 5: 其他种子色也能正常工作
test('generatePalette works for danger color #f5222d', () => {
  const palette = generatePalette('#f5222d');
  assert.strictEqual(palette.length, 10);
  assert.strictEqual(palette[5], '#f5222d');
  for (const color of palette) {
    assert.strictEqual(isValidHex(color), true, `Invalid hex: ${color}`);
  }
});

test('generatePalette works for success color #52c41a', () => {
  const palette = generatePalette('#52c41a');
  assert.strictEqual(palette.length, 10);
  assert.strictEqual(palette[5], '#52c41a');
  for (const color of palette) {
    assert.strictEqual(isValidHex(color), true, `Invalid hex: ${color}`);
  }
});

test('generatePalette works for warning color #faad14', () => {
  const palette = generatePalette('#faad14');
  assert.strictEqual(palette.length, 10);
  assert.strictEqual(palette[5], '#faad14');
  for (const color of palette) {
    assert.strictEqual(isValidHex(color), true, `Invalid hex: ${color}`);
  }
});

// 测试 6: Dark mode 返回 10 个颜色
test('dark mode generatePalette returns 10 colors', () => {
  const palette = generatePalette('#1677ff', { dark: true });
  assert.strictEqual(palette.length, 10);
  for (const color of palette) {
    assert.strictEqual(isValidHex(color), true, `Invalid hex: ${color}`);
  }
});

// 测试 7: Dark level 6 比 light level 6 更亮
test('dark level 6 is brighter than light level 6', () => {
  const lightPalette = generatePalette('#1677ff');
  const darkPalette = generatePalette('#1677ff', { dark: true });
  const lightSum6 = rgbSum(lightPalette[5]);
  const darkSum6 = rgbSum(darkPalette[5]);
  assert.ok(darkSum6 > lightSum6, `Dark level 6 (${darkPalette[5]}, sum=${darkSum6}) should be brighter than light level 6 (${lightPalette[5]}, sum=${lightSum6})`);
});

// 测试 8: Dark palette level 1 是最暗的
test('dark level 1 is darkest in dark palette', () => {
  const palette = generatePalette('#1677ff', { dark: true });
  const sum1 = rgbSum(palette[0]);
  for (let i = 1; i < 10; i++) {
    const sum = rgbSum(palette[i]);
    assert.ok(sum1 <= sum, `Level 1 (${palette[0]}, sum=${sum1}) should be darkest, but level ${i + 1} (${palette[i]}, sum=${sum}) is darker`);
  }
});

// 测试 9: generateThemeTokens 返回正确的 CSS 变量映射
test('generateThemeTokens returns CSS var map with correct keys', () => {
  const tokens = generateThemeTokens({
    primary: '#1677ff',
    danger: '#f5222d',
    success: '#52c41a',
    warning: '#faad14'
  });

  // 检查 primary 1-10
  for (let i = 1; i <= 10; i++) {
    const key = `--tokui-primary-${i}`;
    assert.ok(tokens.hasOwnProperty(key), `Missing key: ${key}`);
    assert.strictEqual(isValidHex(tokens[key]), true, `Invalid hex for ${key}: ${tokens[key]}`);
  }

  // 检查 danger 1-10
  for (let i = 1; i <= 10; i++) {
    const key = `--tokui-danger-${i}`;
    assert.ok(tokens.hasOwnProperty(key), `Missing key: ${key}`);
    assert.strictEqual(isValidHex(tokens[key]), true, `Invalid hex for ${key}: ${tokens[key]}`);
  }

  // 检查 success 1-10
  for (let i = 1; i <= 10; i++) {
    const key = `--tokui-success-${i}`;
    assert.ok(tokens.hasOwnProperty(key), `Missing key: ${key}`);
    assert.strictEqual(isValidHex(tokens[key]), true, `Invalid hex for ${key}: ${tokens[key]}`);
  }

  // 检查 warning 1-10
  for (let i = 1; i <= 10; i++) {
    const key = `--tokui-warning-${i}`;
    assert.ok(tokens.hasOwnProperty(key), `Missing key: ${key}`);
    assert.strictEqual(isValidHex(tokens[key]), true, `Invalid hex for ${key}: ${tokens[key]}`);
  }

  // 检查 primary-6 匹配种子色
  assert.strictEqual(tokens['--tokui-primary-6'], '#1677ff');
  assert.strictEqual(tokens['--tokui-danger-6'], '#f5222d');
  assert.strictEqual(tokens['--tokui-success-6'], '#52c41a');
  assert.strictEqual(tokens['--tokui-warning-6'], '#faad14');
});

// 测试 10: Dark mode tokens 不同于 light mode tokens
test('dark mode tokens differ from light mode tokens', () => {
  const lightTokens = generateThemeTokens({
    primary: '#1677ff',
    danger: '#f5222d',
    success: '#52c41a',
    warning: '#faad14'
  });
  const darkTokens = generateThemeTokens({
    primary: '#1677ff',
    danger: '#f5222d',
    success: '#52c41a',
    warning: '#faad14'
  }, { dark: true });

  let differCount = 0;
  for (const key of Object.keys(lightTokens)) {
    if (lightTokens[key] !== darkTokens[key]) {
      differCount++;
    }
  }
  assert.ok(differCount > 0, 'Dark mode tokens should differ from light mode tokens');
});

run();
