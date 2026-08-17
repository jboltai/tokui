/**
 * P4 流式性能测试（T4.1 fade-in 收敛 + T4.2 流式 Text 节点合并）
 *
 * T4.1：流式入场动画收敛为「仅顶层元素挂 tokui-fade-in」——
 *   容器内流式追加的嵌套元素与纯文本 chunk 不挂（大对话/流式表格每 chunk 一动画是帧率主因）；
 *   实例选项 streamAnimation:false 全关流式入场动画；一次性 render()（mount 路径）不受影响。
 * T4.2：流式文本追加时，目标插槽尾子节点为 Text 则原地累加（textContent +=），
 *   不为每个 chunk 新建兄弟 Text 节点。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const TokUI = require('../src/index');

const tests = [];
let passed = 0, failed = 0;
function test(name, fn) { tests.push({ name, fn }); }

function findByClass(root, cls) {
  for (const c of (root.childNodes || [])) {
    if (c.nodeType === 1 && c.className && c.className.indexOf(cls) >= 0) return c;
    const found = findByClass(c, cls);
    if (found) return found;
  }
  return null;
}

function countTextNodes(el) {
  let n = 0;
  const cn = el.childNodes;
  for (let i = 0; i < cn.length; i++) if (cn[i] && cn[i].nodeType === 3) n++;
  return n;
}

function countFadeIn(root) {
  return root.querySelectorAll('.tokui-fade-in').length;
}

// === T4.1 fade-in 收敛 ===

test('streaming fade-in: 顶层组件挂、容器 open 挂、嵌套组件与 _text 不挂', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true });
  t.startStream(container);
  t.feed('[h1 顶层标题]');
  t.feed('[card tt:卡]');
  t.feed('[h2 嵌套标题]');
  t.feed('纯文本chunk');
  t.feed('[/card]');
  t.endStream();

  const h1 = findByClass(container, 'tokui-h1');
  assert.ok(h1, '顶层 h1 已挂载');
  assert.ok(h1.className.indexOf('tokui-fade-in') !== -1, '顶层流式组件挂 fade-in');

  const card = findByClass(container, 'tokui-card');
  assert.ok(card, 'card 已挂载');
  assert.ok(card.className.indexOf('tokui-fade-in') !== -1, '顶层容器 open 挂 fade-in');

  const h2 = findByClass(card, 'tokui-h2');
  assert.ok(h2, '嵌套 h2 已挂载');
  assert.ok(h2.className.indexOf('tokui-fade-in') === -1, '容器内嵌套组件不挂 fade-in');

  // _text chunk 不产生任何 fade-in：全树 fade-in 仅 h1 + card 两处
  assert.strictEqual(countFadeIn(container), 2, '纯文本 chunk 不挂 fade-in（全树仅顶层两元素）');

  // 文本内容完整落到 card body
  const body = findByClass(card, 'tokui-card-body');
  assert.ok(body.textContent.indexOf('纯文本chunk') !== -1, '文本 chunk 内容完整');
});

test('streaming fade-in: streamAnimation:false 时顶层组件也不挂', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true, streamAnimation: false });
  assert.strictEqual(t.renderer.streamAnimation, false, '选项透传到 renderer');
  t.startStream(container);
  t.feed('[h1 标题]');
  t.feed('[card tt:卡][p 内容][/card]');
  t.endStream();
  assert.strictEqual(countFadeIn(container), 0, 'streamAnimation:false 全关流式入场动画');
});

test('streaming fade-in: 默认 streamAnimation:true（缺省选项行为不变）', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true });
  assert.strictEqual(t.renderer.streamAnimation, true, '缺省为 true');
  t.startStream(container);
  t.feed('[h1 标题]');
  t.endStream();
  const h1 = findByClass(container, 'tokui-h1');
  assert.ok(h1.className.indexOf('tokui-fade-in') !== -1, '缺省仍挂 fade-in');
});

test('one-shot mount: 一次性 render 仍挂 fade-in，且不受 streamAnimation:false 影响', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streamAnimation: false });
  t.render('[h1 标题]', container);
  const h1 = findByClass(container, 'tokui-h1');
  assert.ok(h1.className.indexOf('tokui-fade-in') !== -1, 'mount 路径 fade-in 不经流式闸门');
});

// === T4.2 流式 Text 节点合并 ===

test('text merge: bubble 多 chunk 流入后 body 的 Text 节点收敛为 1', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true });
  t.startStream(container);
  t.feed('[bubble r:ai]');
  t.feed('你好，');
  t.feed('世界');
  t.feed('！');
  t.feed('[/bubble]');
  t.endStream();
  const body = findByClass(container, 'tokui-bubble__body');
  assert.ok(body, 'bubble body 存在');
  const textCount = countTextNodes(body);
  assert.ok(textCount <= 2, `3 个 chunk 应收敛（实际 ${textCount} 个 Text 节点）`);
  assert.strictEqual(textCount, 1, '连续文本 chunk 合并为单个 Text 节点');
  assert.strictEqual(body.textContent, '你好，世界！', '合并后文本完整且顺序正确');
});

test('text merge: 文本-元素-文本交错时不跨界合并（顺序保持）', () => {
  const container = document.createElement('div');
  const t = new TokUI({ container, streaming: true });
  t.startStream(container);
  t.feed('[bubble r:ai]');
  t.feed('前段');
  t.feed('[tag tx:中]');
  t.feed('后段');
  t.feed('[/bubble]');
  t.endStream();
  const body = findByClass(container, 'tokui-bubble__body');
  assert.strictEqual(countTextNodes(body), 2, '元素隔断 → 2 个 Text 节点');
  const cn = body.childNodes;
  assert.strictEqual(cn[0].nodeType, 3, '首节点为文本');
  assert.strictEqual(cn[0].textContent, '前段');
  assert.strictEqual(cn[1].nodeType, 1, '中段为 tag 元素');
  assert.strictEqual(cn[2].nodeType, 3, '尾节点为文本');
  assert.strictEqual(cn[2].textContent, '后段');
});

test('text merge: md 流式 close 后渲染结果与一次性渲染一致', () => {
  const mdSrc = '# 标题\n\n第一段**粗体**\n\n- 项一\n- 项二';
  // 一次性渲染
  const c1 = document.createElement('div');
  const t1 = new TokUI({ container: c1 });
  t1.render('[md]' + mdSrc + '[/md]', c1);
  // 流式（碎片 chunk 触发合并）
  const c2 = document.createElement('div');
  const t2 = new TokUI({ container: c2, streaming: true });
  t2.startStream(c2);
  t2.feed('[md]');
  t2.feed('# 标');
  t2.feed('题\n\n第一段**粗');
  t2.feed('体**\n\n- 项一\n');
  t2.feed('- 项二');
  t2.feed('[/md]');
  t2.endStream();
  const d1 = findByClass(c1, 'tokui-md');
  const d2 = findByClass(c2, 'tokui-md');
  assert.ok(d1 && d2, '两条路径均渲染出 md');
  assert.strictEqual(d2.innerHTML, d1.innerHTML, 'close 后 md HTML 与一次性渲染逐字节一致');
});

test('text merge: code（_streamAppendHook 路径）多 chunk close 后与一次性一致', () => {
  const src = 'const a = 1;\nconsole.log(a);';
  // 一次性渲染
  const c1 = document.createElement('div');
  const t1 = new TokUI({ container: c1 });
  t1.render('[code lang:js]' + src + '[/code]', c1);
  // 流式
  const c2 = document.createElement('div');
  const t2 = new TokUI({ container: c2, streaming: true });
  t2.startStream(c2);
  t2.feed('[code lang:js]');
  t2.feed('const a');
  t2.feed(' = 1;\ncons');
  t2.feed('ole.log(a);');
  t2.feed('[/code]');
  t2.endStream();
  const code1 = findByClass(c1, 'tokui-code').querySelector('code');
  const code2 = findByClass(c2, 'tokui-code').querySelector('code');
  assert.strictEqual(code2.innerHTML, code1.innerHTML,
    'rawAcc 累积走 AST 不受合并影响，close 全量重绘与一次性一致');
});

function run() {
  console.log('');
  tests.forEach(t => {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + (e.message || e)); }
  });
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed (of ' + tests.length + ')');
  teardownDOM();
  if (failed > 0) process.exit(1);
}
run();
