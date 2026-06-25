/**
 * TokUI 事件总线测试套件
 * 测试 TokUIEventBus 的注册、获取、移除、清除、安全校验等功能。
 */
'use strict';

const assert = require('assert');
const TokUIEventBus = require('../src/core/event-bus');

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

// ===== 测试用例 =====

// 测试：registerHandler + getHandler — 注册后能获取
test('registerHandler + getHandler', () => {
  TokUIEventBus.clearAll();
  const fn = () => {};
  TokUIEventBus.registerHandler('testGet', fn);
  assert.strictEqual(TokUIEventBus.getHandler('testGet'), fn);
  TokUIEventBus.clearAll();
});

// 测试：getHandler 未注册返回 null
test('getHandler unregistered returns null', () => {
  TokUIEventBus.clearAll();
  assert.strictEqual(TokUIEventBus.getHandler('nonexistent'), null);
});

// 测试：removeHandler — 移除后返回 null
test('removeHandler', () => {
  TokUIEventBus.clearAll();
  const fn = () => {};
  TokUIEventBus.registerHandler('testRemove', fn);
  assert.strictEqual(TokUIEventBus.getHandler('testRemove'), fn);
  TokUIEventBus.removeHandler('testRemove');
  assert.strictEqual(TokUIEventBus.getHandler('testRemove'), null);
});

// 测试：clearAll — 清除所有
test('clearAll', () => {
  TokUIEventBus.clearAll();
  TokUIEventBus.registerHandler('a', () => {});
  TokUIEventBus.registerHandler('b', () => {});
  assert.strictEqual(TokUIEventBus.getHandlerNames().length, 2);
  TokUIEventBus.clearAll();
  assert.strictEqual(TokUIEventBus.getHandlerNames().length, 0);
  assert.strictEqual(TokUIEventBus.getHandler('a'), null);
  assert.strictEqual(TokUIEventBus.getHandler('b'), null);
});

// 测试：getHandlerNames — 返回已注册名称数组
test('getHandlerNames', () => {
  TokUIEventBus.clearAll();
  TokUIEventBus.registerHandler('name1', () => {});
  TokUIEventBus.registerHandler('name2', () => {});
  const names = TokUIEventBus.getHandlerNames();
  assert.ok(names.includes('name1'));
  assert.ok(names.includes('name2'));
  assert.strictEqual(names.length, 2);
  TokUIEventBus.clearAll();
});

// 测试：同名覆盖时不报错（console.warn 是预期的）
test('registerHandler overwrite does not throw', () => {
  TokUIEventBus.clearAll();
  const fn1 = () => {};
  const fn2 = () => {};
  TokUIEventBus.registerHandler('overwrite', fn1);
  // 覆盖不应抛错
  assert.doesNotThrow(() => {
    TokUIEventBus.registerHandler('overwrite', fn2);
  });
  assert.strictEqual(TokUIEventBus.getHandler('overwrite'), fn2);
  TokUIEventBus.clearAll();
});

// 测试：非函数参数抛出 TypeError
test('registerHandler non-function throws TypeError', () => {
  TokUIEventBus.clearAll();
  assert.throws(() => {
    TokUIEventBus.registerHandler('bad', 'not a function');
  }, /TypeError/);
  assert.throws(() => {
    TokUIEventBus.registerHandler('bad2', 123);
  }, /TypeError/);
  assert.throws(() => {
    TokUIEventBus.registerHandler('bad3', null);
  }, /TypeError/);
  assert.throws(() => {
    TokUIEventBus.registerHandler('bad4', undefined);
  }, /TypeError/);
  TokUIEventBus.clearAll();
});

// 测试：危险属性名被拒绝（注册不生效，不出现在 handlerNames 中）
test('registerHandler rejects dangerous names', () => {
  TokUIEventBus.clearAll();
  const fn = () => {};
  // __proto__ — registerHandler 对危险名称 early return，不写入 handlers
  TokUIEventBus.registerHandler('__proto__', fn);
  // constructor
  TokUIEventBus.registerHandler('constructor', fn);
  // prototype
  TokUIEventBus.registerHandler('prototype', fn);
  // 确保这些危险名称不出现在 handlerNames 中
  const names = TokUIEventBus.getHandlerNames();
  assert.ok(!names.includes('__proto__'));
  assert.ok(!names.includes('constructor'));
  assert.ok(!names.includes('prototype'));
  TokUIEventBus.clearAll();
});

run();
