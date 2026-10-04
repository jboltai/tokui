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

// 测试：emit 按名触发 handler，签名 (data, event, element)，后两参为 null
test('emit invokes registered handler with (data, null, null)', () => {
  TokUIEventBus.clearAll();
  let received = null;
  TokUIEventBus.registerHandler('onEmit', function (data, event, element) {
    received = { data, event, element };
  });
  TokUIEventBus.emit('onEmit', { ok: 1 });
  assert.deepStrictEqual(received, { data: { ok: 1 }, event: null, element: null });
  // 无 data 时第一参为 null
  received = undefined;
  TokUIEventBus.emit('onEmit');
  assert.deepStrictEqual(received, { data: null, event: null, element: null });
  TokUIEventBus.clearAll();
});

// 测试：emit 未注册名称不抛错（console.warn 是预期的），事件静默丢弃
test('emit unknown name does not throw', () => {
  TokUIEventBus.clearAll();
  assert.doesNotThrow(() => {
    TokUIEventBus.emit('neverRegistered');
  });
  TokUIEventBus.clearAll();
});

// 测试：emit 同样拒绝危险名称（注册即被拦，emit 找不到 handler）
test('emit dangerous names are blocked at registration', () => {
  TokUIEventBus.clearAll();
  assert.doesNotThrow(() => {
    TokUIEventBus.registerHandler('__proto__', () => {});
    TokUIEventBus.emit('__proto__');
  });
  TokUIEventBus.clearAll();
});

run();

// === 内联参数引用（"name?k=v"）解析 ===
test('parseHandlerRef: 无 ? 原样返回且 params 为 null', () => {
  assert.deepStrictEqual(TokUIEventBus.parseHandlerRef('onDel'), { name: 'onDel', params: null });
  assert.deepStrictEqual(TokUIEventBus.parseHandlerRef(''), { name: '', params: null });
});

test('parseHandlerRef: 单参与多参（& 分隔，值字符串化）', () => {
  assert.deepStrictEqual(TokUIEventBus.parseHandlerRef('onDel?id=1'), { name: 'onDel', params: { id: '1' } });
  assert.deepStrictEqual(
    TokUIEventBus.parseHandlerRef('onDel?id=1024&scene=order-list'),
    { name: 'onDel', params: { id: '1024', scene: 'order-list' } }
  );
});

test('parseHandlerRef: 无 = 段为布尔 true；空段与空键跳过；空查询 params 为 null', () => {
  assert.deepStrictEqual(TokUIEventBus.parseHandlerRef('h?flag'), { name: 'h', params: { flag: true } });
  assert.deepStrictEqual(TokUIEventBus.parseHandlerRef('h?a=1&&b=2'), { name: 'h', params: { a: '1', b: '2' } });
  assert.deepStrictEqual(TokUIEventBus.parseHandlerRef('h?=1'), { name: 'h', params: null });
  assert.deepStrictEqual(TokUIEventBus.parseHandlerRef('h?'), { name: 'h', params: null });
});

test('parseHandlerRef: URL 编码解码（%20 空格）+ 解码失败回退原串', () => {
  assert.deepStrictEqual(
    TokUIEventBus.parseHandlerRef('onDel?q=hello%20world'),
    { name: 'onDel', params: { q: 'hello world' } }
  );
  assert.deepStrictEqual(
    TokUIEventBus.parseHandlerRef('onDel?q=%E4%B8%AD%E6%96%87'),
    { name: 'onDel', params: { q: '中文' } }
  );
  assert.deepStrictEqual(
    TokUIEventBus.parseHandlerRef('onDel?q=%zz'),  // 非法编码回退原串
    { name: 'onDel', params: { q: '%zz' } }
  );
});

test('parseHandlerRef: 危险键跳过（原型污染防护）', () => {
  var ref = TokUIEventBus.parseHandlerRef('h?__proto__=x&constructor=y&id=1');
  assert.deepStrictEqual(ref.params, { id: '1' });
});

test('getHandler 容忍带参引用：按 ? 前名称段查表', () => {
  TokUIEventBus.registerHandler('onDel', function () {});
  assert.strictEqual(typeof TokUIEventBus.getHandler('onDel?id=1'), 'function');
  assert.strictEqual(TokUIEventBus.getHandler('onDelX?id=1'), null);
  TokUIEventBus.removeHandler('onDel');
});

test('emit 带参引用：null payload 给参数对象；对象 payload 浅合并', () => {
  var got = null, got2 = null;
  TokUIEventBus.registerHandler('hEmit', d => { got = d; });
  TokUIEventBus.registerHandler('hEmit2', d => { got2 = d; });
  TokUIEventBus.emit('hEmit?id=1&scene=x', null);
  assert.deepStrictEqual(got, { id: '1', scene: 'x' });
  TokUIEventBus.emit('hEmit2?extra=9', { direction: 'up', active: true });
  assert.deepStrictEqual(got2, { direction: 'up', active: true, extra: '9' });
  TokUIEventBus.removeHandler('hEmit');
  TokUIEventBus.removeHandler('hEmit2');
});

run();
