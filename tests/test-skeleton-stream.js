/**
 * TokUI 纯自闭合大块组件流式骨架占位测试
 * 验证：stat/img/result/empty/video/audio/file/attach/commit/avatar 流式期
 *   先挂 .tokui-stream-skeleton 占位，] 到达 swap 为真节点；小件(tag/btn)不骨架。
 */
'use strict';
const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

setupDOM();
const TokUI = require('../src/index');

const tests = [];
let passed = 0, failed = 0;
function test(name, fn) { tests.push({ name, fn }); }
function run() {
  passed = 0; failed = 0;
  for (const t of tests) {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name + '\n    ' + (e.message || e)); }
  }
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed (of ' + tests.length + ')');
  teardownDOM();
  if (failed > 0) process.exit(1);
}

// 逐字 feed，返回过程中是否出现过骨架 + 流完是否 swap 掉
function streamFull(dsl) {
  const c = document.createElement('div');
  const t = new TokUI({ container: c, streaming: true });
  t.startStream(c);
  let everSkel = false, maxSkel = 0;
  for (let i = 0; i < dsl.length; i++) {
    t.feed(dsl[i]);
    const n = c.querySelectorAll('.tokui-stream-skeleton').length;
    if (n > 0) everSkel = true;
    if (n > maxSkel) maxSkel = n;
  }
  const skelAtEnd = c.querySelectorAll('.tokui-stream-skeleton').length;
  return { c, everSkel, maxSkel, skelAtEnd };
}

test('stat 流式骨架占位 → ] swap', () => {
  const { everSkel, skelAtEnd, c } = streamFull('[stat v:1024 pre:¥ l:销售额 t:primary]');
  assert.ok(everSkel, '流式中应出现骨架');
  assert.strictEqual(skelAtEnd, 0, '] 到达骨架应 swap 掉');
  assert.ok(c.querySelector('.tokui-stat'), '最终应有真 stat 节点');
});

test('img 流式骨架占位 → ] swap', () => {
  const { everSkel, skelAtEnd } = streamFull('[img s:https://x.com/a.png w:200 h:100 v:rounded]');
  assert.ok(everSkel, 'img 流式应骨架');
  assert.strictEqual(skelAtEnd, 0, 'img ] swap');
});

test('result/empty/video/avatar 均走骨架', () => {
  ['[result t:success tt:成功 tx:操作完成]', '[empty tx:暂无数据]', '[video s:https://x.com/v.mp4 w:320]', '[avatar tx:张三]', '[file tx:报告.pdf]', '[audio s:https://x.com/a.mp3]'].forEach(dsl => {
    const { everSkel, skelAtEnd } = streamFull(dsl);
    assert.ok(everSkel, '应骨架: ' + dsl);
    assert.strictEqual(skelAtEnd, 0, '应 swap: ' + dsl);
  });
});

test('tag/btn 小件不走骨架', () => {
  ['[tag tx:新 t:success]', '[btn tx:提交 t:primary]', '[badge tx:9]', '[dot t:success]'].forEach(dsl => {
    const { everSkel } = streamFull(dsl);
    assert.ok(!everSkel, '小件不应骨架: ' + dsl);
  });
});

test('one-shot 模式无骨架', () => {
  const c = document.createElement('div');
  new TokUI({ container: c }).render('[stat v:99 l:数]', c);
  assert.ok(!c.querySelector('.tokui-stream-skeleton'), 'one-shot 不应骨架');
  assert.ok(c.querySelector('.tokui-stat'), 'one-shot 应直接出 stat');
});

test('连续多个大块各自骨架→swap', () => {
  const { everSkel, maxSkel, skelAtEnd, c } = streamFull('[stat v:1 l:a][stat v:2 l:b][stat v:3 l:c]');
  assert.ok(everSkel, '过程中应有骨架');
  assert.ok(maxSkel >= 1, '至少 1 骨架');
  assert.strictEqual(skelAtEnd, 0, '结束无残留骨架');
  assert.strictEqual(c.querySelectorAll('.tokui-stat').length, 3, '3 个真 stat');
});

run();
