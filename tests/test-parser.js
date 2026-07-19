/**
 * TokUI 解析器测试套件
 * 测试 parseTag 标签解析和 TokUIParser 的各种解析场景，
 * 包括一次性解析、流式增量解析、嵌套容器、代码块等。
 */
'use strict';

const assert = require('assert');
const { parseTag, TokUIParser, setVariantHints, CONTAINERS } = require('../src/core/parser');

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

// ===== parseTag 单元测试 =====

// 测试：简单内容标签
test('simple content: h1 这是一个标题', () => {
  const node = parseTag('h1 这是一个标题');
  assert.strictEqual(node.type, 'h1');
  assert.strictEqual(node.content, '这是一个标题');
  assert.deepStrictEqual(node.attrs, {});
  assert.deepStrictEqual(node.children, []);
});

// 测试：仅属性无内容
test('attrs only: btn tx:提交 t:submit clk:handleLogin', () => {
  const node = parseTag('btn tx:提交 t:submit clk:handleLogin');
  assert.strictEqual(node.type, 'btn');
  assert.strictEqual(node.attrs.tx, '提交');
  assert.strictEqual(node.attrs.t, 'submit');
  assert.strictEqual(node.attrs.clk, 'handleLogin');
  assert.strictEqual(node.content, '');
});

// 测试：引号包裹的属性值（含空格）
test('quoted value with spaces', () => {
  const node = parseTag('input t:text ph:"请输入用户名" ml:20');
  assert.strictEqual(node.attrs.ph, '请输入用户名');
  assert.strictEqual(node.attrs.ml, '20');
});

// 测试：整段引号包裹的正文（含冒号，builder 为防被当属性而加引号）应剥离引号
test('fully quoted content strips surrounding quotes', () => {
  const node = parseTag('p "容器写法 喂入 v:数值 可见"');
  assert.strictEqual(node.content, '容器写法 喂入 v:数值 可见');
});

// 测试：引号嵌在 token 中间（非整段包裹）时保留为字面文本
test('embedded quote inside token stays literal', () => {
  const node = parseTag('p 他叫"张三"很好');
  assert.strictEqual(node.content, '他叫"张三"很好');
});

// 测试：布尔属性
test('boolean attribute', () => {
  const node = parseTag('input t:text id:username req');
  assert.strictEqual(node.attrs.req, true);
});

// 测试：live 实时校验布尔属性
test('boolean attribute live', () => {
  const node = parseTag('input l:手机号 req pat:"1\\d{10}" live');
  assert.strictEqual(node.attrs.live, true);
  assert.strictEqual(node.attrs.pat, '1\\d{10}');
});

// 测试：live:input 即时校验模式（值形式）
test('attribute live:input instant mode', () => {
  const node = parseTag('input l:用户名 live:input');
  assert.strictEqual(node.attrs.live, 'input');
});

// 测试：多个布尔属性
test('multiple boolean attributes', () => {
  const node = parseTag('table stripe id:t1');
  assert.strictEqual(node.attrs.stripe, true);
  assert.strictEqual(node.attrs.id, 't1');
});

// 测试：仅类型名无其他内容
test('type only: hr', () => {
  const node = parseTag('hr');
  assert.strictEqual(node.type, 'hr');
  assert.strictEqual(node.content, '');
  assert.deepStrictEqual(node.attrs, {});
});

// 测试：逗号分隔的行内容
test('row with comma values', () => {
  const node = parseTag('row 张三,28,技术部');
  assert.strictEqual(node.type, 'row');
  assert.strictEqual(node.content, '张三,28,技术部');
});

// 测试：opt 的 chk 布尔属性
test('opt with chk boolean', () => {
  const node = parseTag('opt v:male tx:男 chk');
  assert.strictEqual(node.attrs.chk, true);
});

// 测试：多个引号属性值
test('multiple quoted values', () => {
  const node = parseTag('input ph:"用户名" l:"你的名字"');
  assert.strictEqual(node.attrs.ph, '用户名');
  assert.strictEqual(node.attrs.l, '你的名字');
});

// ===== Parser 流式解析测试 =====

// 测试：解析简单自闭合标签
test('parse simple self-closing tags', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[h1 Hello][p World]');
  assert.strictEqual(nodes.length, 2);
  assert.strictEqual(nodes[0].type, 'h1');
  assert.strictEqual(nodes[0].content, 'Hello');
  assert.strictEqual(nodes[1].type, 'p');
  assert.strictEqual(nodes[1].content, 'World');
});

// 测试：解析嵌套容器
test('parse nested container', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[card tt:信息][h2 张三][p 年龄:28][/card]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'card');
  assert.strictEqual(nodes[0].children.length, 2);
  assert.strictEqual(nodes[0].children[0].type, 'h2');
  assert.strictEqual(nodes[0].children[1].type, 'p');
});

// 测试：解析表格（含 thead 和 tbody）
test('parse table with thead and tbody', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[table stripe][thead][tcol n:姓名][/thead][tbody][row 张三,28,技术部][/tbody][/table]');
  const tableNode = nodes.find(n => n.type === 'table');
  assert.ok(tableNode);
  assert.strictEqual(tableNode.children.length, 2);
  assert.strictEqual(tableNode.children[0].type, 'thead');
  assert.strictEqual(tableNode.children[1].type, 'tbody');
});

// 测试：表头 cols 简写模式（自闭合）
test('parse thead with cols shorthand (self-closing)', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[table stripe][thead cols:姓名,年龄:number,部门][tbody][tr 张三,28,技术部][/tbody][/table]');
  const tableNode = nodes.find(n => n.type === 'table');
  assert.ok(tableNode);
  assert.strictEqual(tableNode.children.length, 2);
  const thead = tableNode.children[0];
  assert.strictEqual(thead.type, 'thead');
  assert.strictEqual(thead.attrs.cols, '姓名,年龄:number,部门');
  assert.strictEqual(thead.children.length, 0);
  assert.strictEqual(tableNode.children[1].type, 'tbody');
});

// 测试：流式增量解析
test('feed incremental parsing', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.startStream();
  parser.feed('[h1 Hello]');
  assert.strictEqual(nodes.length, 1);
  parser.feed('[h2 World]');   // h2 自闭合，feed 后立即 emit（p 已改为容器，不再立即 emit）
  assert.strictEqual(nodes.length, 2);
  parser.endStream();
});

// p 现为容器：支持嵌套内联子节点（a/tag/text），且 [p 文本] 仍按自闭合兄弟语义
test('p 嵌套内联 a 子节点', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[p [a u:# tx:链接1] · [a u:# tx:链接2 v:underline]]');
  const p = nodes[0];
  assert.strictEqual(p.type, 'p');
  assert.strictEqual(p.children.length, 3); // a · a → [a, _text"·", a]
  assert.strictEqual(p.children[0].type, 'a');
  assert.strictEqual(p.children[1].type, '_text');
});

test('p 兄弟不嵌套（[p a][p b] 各自独立）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[p a][p b]');
  assert.strictEqual(nodes.length, 2);
  assert.strictEqual(nodes[0].type, 'p');
  assert.strictEqual(nodes[0].content, 'a');
  assert.strictEqual(nodes[1].content, 'b');
});

test('p 作为 callout 子节点', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[callout t:warning tt:提示][p 内容][/callout]');
  const callout = nodes[0];
  assert.strictEqual(callout.type, 'callout');
  assert.strictEqual(callout.children.length, 1);
  assert.strictEqual(callout.children[0].type, 'p');
});

// 测试：不完整标签的缓冲处理
test('feed incomplete tag buffered', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.startStream();
  parser.feed('[h1 Hel');
  assert.strictEqual(nodes.length, 0); // 标签不完整，不应输出
  parser.feed('lo]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].content, 'Hello');
  parser.endStream();
});

// 测试：流式解析嵌套容器
test('feed streaming nested container', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.startStream();
  parser.feed('[card tt:信息]');
  assert.strictEqual(nodes.length, 0); // 容器未关闭，不输出
  parser.feed('[h2 张三]');
  assert.strictEqual(nodes.length, 0);
  parser.feed('[/card]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'card');
  assert.strictEqual(nodes[0].children[0].type, 'h2');
  parser.endStream();
});

// 测试：标签间的纯文本
test('text between tags', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('Hello [h1 World] Bye');
  assert.strictEqual(nodes.length, 3);
  assert.strictEqual(nodes[0].type, '_text');
  assert.strictEqual(nodes[0].content.trim(), 'Hello');
  assert.strictEqual(nodes[1].type, 'h1');
});

// 测试：表单内嵌套 select
test('form with nested select', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[form id:f1][select id:s1][opt v:a tx:A][/select][btn tx:提交 t:submit][/form]');
  const form = nodes.find(n => n.type === 'form');
  assert.ok(form);
  assert.strictEqual(form.children.length, 2);
  assert.strictEqual(form.children[0].type, 'select');
  assert.strictEqual(form.children[0].children[0].type, 'opt');
  assert.strictEqual(form.children[1].type, 'btn');
});

// 测试：表单内嵌套 picker
test('form with nested picker', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[form id:f1][picker id:p1 ph:"请选择"][opt v:a tx:A][/picker][/form]');
  const form = nodes.find(n => n.type === 'form');
  assert.ok(form);
  assert.strictEqual(form.children[0].type, 'picker');
  assert.strictEqual(form.children[0].children[0].type, 'opt');
});

// 测试：tr 引号包裹含逗号值，解析器保留引号
test('tr preserves quoted commas in content', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[tr "¥4,200/吨",2000套,"¥2,100,000"]');
  const trNode = nodes[0];
  assert.strictEqual(trNode.type, 'tr');
  assert.ok(trNode.content.includes('"¥4,200/吨"'));
  assert.ok(trNode.content.includes('"¥2,100,000"'));
});

// 测试：CONTAINERS 集合包含所有必要类型
test('CONTAINERS set has required types', () => {
  assert(CONTAINERS.has('form'));
  assert(CONTAINERS.has('table'));
  assert(CONTAINERS.has('thead'));
  assert(CONTAINERS.has('tbody'));
  assert(CONTAINERS.has('card'));
  assert(CONTAINERS.has('ft'));
  assert(CONTAINERS.has('select'));
  assert(CONTAINERS.has('picker'));
  assert(CONTAINERS.has('radio'));
  assert(CONTAINERS.has('col'));
  assert(CONTAINERS.has('popover'));
  assert(CONTAINERS.has('input-tag'));
  assert(CONTAINERS.has('list'));
  assert(CONTAINERS.has('row'));
  assert(CONTAINERS.has('code'));
  assert(CONTAINERS.has('imgs'));
});

// input-tag 带 tags 属性应自闭合（与 builder.inputTag() 的 _selfClosing 分支对齐），
// 不应作为容器打开吞掉后续兄弟节点。
test('input-tag with tags attr self-closes (does not swallow sibling)', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[input-tag tags:"a,b"][btn tx:next]');
  const itag = nodes.find(n => n.type === 'input-tag');
  assert.ok(itag, 'input-tag node expected');
  assert.strictEqual((itag.children || []).length, 0, 'tags 模式应自闭合，无子节点');
  assert.ok(nodes.some(n => n.type === 'btn'), '后续 btn 应为兄弟节点而非被吞');
});

// 测试：未匹配的闭标签不会导致崩溃
test('unmatched close tag does not crash', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[/card]');
  assert.strictEqual(nodes.length, 0);
});

// 测试：代码块作为容器
test('code block as container', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[code lang:js]console.log("hi")[/code]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'code');
  assert.strictEqual(nodes[0].attrs.lang, 'js');
  assert.strictEqual(nodes[0].children.length, 1);
  assert.strictEqual(nodes[0].children[0].type, '_text');
  assert.strictEqual(nodes[0].children[0].content, 'console.log("hi")');
});

// 测试：imgs 容器嵌套 img 子节点
test('parse imgs container with img children', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[imgs][img s:url1 alt:A][img s:url2 alt:B][/imgs]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'imgs');
  assert.strictEqual(nodes[0].children.length, 2);
  assert.strictEqual(nodes[0].children[0].type, 'img');
  assert.strictEqual(nodes[0].children[0].attrs.s, 'url1');
  assert.strictEqual(nodes[0].children[1].attrs.s, 'url2');
});

// 测试：imgs 简写版 s: 属性解析
test('parse imgs with shorthand s: attribute', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[imgs s:url1,url2,url3][/imgs]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'imgs');
  assert.strictEqual(nodes[0].attrs.s, 'url1,url2,url3');
  assert.strictEqual(nodes[0].children.length, 0);
});

// 测试：v: 变体属性解析
test('parse v: variant attribute', () => {
  const node = parseTag('img s:url v:avatar,bordered');
  assert.strictEqual(node.attrs.s, 'url');
  assert.strictEqual(node.attrs.v, 'avatar,bordered');
});

// 测试：card 内嵌 ft 页脚容器
test('parse card with ft footer', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[card tt:信息][p 内容][ft][btn tx:确认 clk:ok][/ft][/card]');
  const card = nodes.find(n => n.type === 'card');
  assert.ok(card);
  assert.strictEqual(card.children.length, 2);
  assert.strictEqual(card.children[0].type, 'p');
  assert.strictEqual(card.children[1].type, 'ft');
  assert.strictEqual(card.children[1].children[0].type, 'btn');
});

// 测试：定价/功能卡必须用容器模式 —— 无 tx 时子元素正确并入 card
// （对应 demo/tokui-prompt.js 易错规则 8：card 内有子元素禁用 tx）
test('pricing card (container mode, no tx) merges children inside card', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[card tt:专业版][h3 v:center ¥99/月][list][item 功能A][item 功能B][/list][btn tx:选择 t:primary clk:buy][/card]');
  const card = nodes.find(n => n.type === 'card');
  assert.ok(card, '应解析出一张 card');
  assert.strictEqual(card.attrs.tx, undefined, '容器模式 card 不应有 tx');
  assert.ok(card.children.length >= 3, 'h3/list/btn 应全部并入 card 内');
  assert.ok(card.children.some(c => c.type === 'list'), 'list 在 card 内');
  assert.ok(card.children.some(c => c.type === 'btn'), 'btn 在 card 内');
  // 整个 DSL 只产出一张顶层 card，没有子内容漏到外面
  assert.strictEqual(nodes.filter(n => n.type === 'card').length, 1);
  assert.strictEqual(nodes.filter(n => n.type === 'btn').length, 0, 'btn 不应漏到顶层');
});

// 测试：card 带 tx 自闭合是刻意行为（叶子卡）—— 文档化此 gotcha
// AI 若在带 tx 的 card 后再写子元素，子元素会漏成顶层孤儿（定价卡翻车根因）
test('card with tx self-closes as leaf (documented footgun)', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[card tt:专业版 tx:¥99/月][btn tx:选择 clk:buy]');
  const card = nodes.find(n => n.type === 'card');
  assert.ok(card, '带 tx 的 card 自闭合为叶子');
  assert.strictEqual(card.attrs.tx, '¥99/月');
  assert.strictEqual(card.children.length, 0, '带 tx 的 card 不收子元素');
  // btn 漏成顶层孤儿 —— 正因如此 prompt 规则 8 禁止在含子元素的 card 上写 tx
  assert.ok(nodes.some(n => n.type === 'btn'), '后续 btn 漏到顶层（错误用法的结果）');
});

// 测试：变体必须带 v: 前缀 —— 裸变体词会泄漏进 content（prompt 易错规则 9）
// [p muted 文字] 是错的：muted 无冒号被当正文 → 渲染出 "muted 文字" 夹英文乱码
test('bare variant word leaks into content (documented footgun)', () => {
  const node = parseTag('p muted 永久免费·个人小微团队');
  assert.strictEqual(node.attrs.v, undefined, '裸 muted 不应被识别为 v 变体');
  assert.strictEqual(node.content, 'muted 永久免费·个人小微团队',
    '裸 muted 漏进正文 —— 这就是定价卡里出现 "muted" 英文的根因');
});

// 对比：正确写法 v:muted 会被识别为变体，content 干净
test('v:muted variant parsed correctly, content clean', () => {
  const node = parseTag('p v:muted 永久免费·个人小微团队');
  assert.strictEqual(node.attrs.v, 'muted');
  assert.strictEqual(node.content, '永久免费·个人小微团队');
});

// 测试：reset 清空解析器状态
test('parser reset clears state', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[h1 Hello]');
  assert.strictEqual(nodes.length, 1);
  parser.reset();
  assert.strictEqual(parser.buffer, '');
  assert.strictEqual(parser.stack.length, 0);
  assert.strictEqual(parser.state, 'TEXT');
});

// 测试：空标签内容解析
test('parseTag with empty content', () => {
  const node = parseTag('');
  assert.strictEqual(node.type, '_text');
  assert.strictEqual(node.content, '');
});

// 测试：包含 URL 的段落（含冒号）
test('parseTag with URL content containing colons', () => {
  const node = parseTag('p http://example.com:8080/path');
  assert.strictEqual(node.type, 'p');
  // URL 被解析为属性（含冒号），或作为内容
  assert.ok(node.content || Object.keys(node.attrs).length > 0);
});

// 测试：CONTAINERS 不再包含未实现的容器类型
test('CONTAINERS includes interactive container types', () => {
  assert(CONTAINERS.has('dialog'), 'dialog should be in CONTAINERS');
  assert(CONTAINERS.has('tabs'), 'tabs should be in CONTAINERS');
  assert(CONTAINERS.has('tab'), 'tab should be in CONTAINERS');
  assert(CONTAINERS.has('accordion'), 'accordion should be in CONTAINERS');
  assert(CONTAINERS.has('collapse'), 'collapse should be in CONTAINERS');
  assert(CONTAINERS.has('textarea'), 'textarea should be in CONTAINERS');
  assert(CONTAINERS.has('desc'), 'desc should be in CONTAINERS');
});

// 测试：嵌套容器深度大于 2 层
test('parse deeply nested containers', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[card tt:A][row][col span:6][p Hello][/col][/row][/card]');
  const card = nodes.find(n => n.type === 'card');
  assert.ok(card);
  assert.strictEqual(card.children[0].type, 'row');
  assert.strictEqual(card.children[0].children[0].type, 'col');
  assert.strictEqual(card.children[0].children[0].children[0].type, 'p');
});

// 测试：endStream 刷新未关闭的容器
test('endStream flushes unclosed containers', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node), { streaming: true });
  parser.startStream();
  parser.feed('[card tt:Open][p Text]');
  parser.endStream();
  // 应该有 card open, _text, p, card close
  const closeNode = nodes.find(n => n._stream === 'close');
  assert.ok(closeNode, 'should have a close node from flush');
});

// 测试：空 [] 标签解析
test('empty [] tag parsing', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[]');
  // 空 [] 应该被解析为 _text 或者被忽略，不应崩溃
  assert.ok(nodes.length >= 0, 'empty [] should not crash');
});

// 测试：内容含 ] 的自闭合标签
test('self-closing tag with ] in content', () => {
  const node = parseTag('p hello]world');
  assert.strictEqual(node.type, 'p');
  // 内容中含 ]，parser 层不应出错
  assert.ok(node.content || Object.keys(node.attrs).length > 0);
});

// 测试：代码块（原始内容模式）流式逐字渲染
// 旧实现：code 内文本在 [/code] 到达前完全不 emit（_tryParse 在 closeIdx===-1 时 break，
//         feed 又显式跳过 raw content），导致代码块流式期空白、闭合时才一次性吐出全部内容。
// 新实现：raw content 流式期间应逐块 emit _text 节点，且不重复、不漏掉半截 [/code]。
test('feed streaming code block emits text incrementally', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node), { streaming: true });
  parser.feed('[code lang:js]');
  // 开标签后、闭标签前，分块喂入代码内容
  parser.feed('function rand');
  const textAfterChunk1 = nodes.filter(n => n.type === '_text').map(n => n.content).join('');
  assert.strictEqual(textAfterChunk1, 'function rand',
    '首块代码内容应立即 emit 为 _text，而非等到 [/code]');

  parser.feed('(min,max){\n  return Ma');
  const textAfterChunk2 = nodes.filter(n => n.type === '_text').map(n => n.content).join('');
  assert.strictEqual(textAfterChunk2, 'function rand(min,max){\n  return Ma',
    '后续块应追加 emit，累积为完整已收文本');

  // 末尾带半截闭标签的分块：不能把 "[/co" 当正文 emit
  parser.feed('th.random();\n}[/co');
  const textBeforeClose = nodes.filter(n => n.type === '_text').map(n => n.content).join('');
  assert.ok(textBeforeClose.endsWith('th.random();\n}'),
    '半截 [/co 不得作为正文漏出，应回持到闭标签完整');

  parser.feed('de]');
  const texts = nodes.filter(n => n.type === '_text').map(n => n.content);
  const full = texts.join('');
  assert.strictEqual(full, 'function rand(min,max){\n  return Math.random();\n}',
    '闭合后文本应为完整代码，且不重复 emit');
  // 流式 emit open + close 两个 code 事件（open 一次，close 一次）
  const codeOpens = nodes.filter(n => n.type === 'code' && n._stream !== 'close');
  const codeCloses = nodes.filter(n => n.type === 'code' && n._stream === 'close');
  assert.strictEqual(codeOpens.length, 1, 'code 容器只 open 一次');
  assert.strictEqual(codeCloses.length, 1, 'code 容器 close 一次');
});

// 测试：代码块流式 \n 转义被 chunk 边界劈开（\ 在一块、n 在下一块）仍正确解码为真换行
test('feed streaming code block escape split across chunk boundary', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node), { streaming: true });
  parser.feed('[code lang:js]a\\');
  parser.feed('nb[/code]');
  const texts = nodes.filter(n => n.type === '_text').map(n => n.content).join('');
  assert.strictEqual(texts, 'a\nb', '\\ 和 n 劈到两块时应合并解码为真换行，不得残留字面 \\n 或丢字符');
});

// 测试：代码块流式提前结束（endStream 而无 [/code]）应 flush 已收文本
test('feed streaming code block flushed at endStream without close', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node), { streaming: true });
  parser.feed('[code lang:js]');
  parser.feed('const x = 1;');
  parser.endStream();
  const texts = nodes.filter(n => n.type === '_text').map(n => n.content).join('');
  assert.strictEqual(texts, 'const x = 1;',
    'endStream 无闭标签时应 flush 已收文本，且不与增量 emit 重复');
});

// 测试：流式单字符 feed
test('feed single character at a time', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.startStream();
  const input = '[h1 Hi]';
  for (let i = 0; i < input.length; i++) {
    parser.feed(input[i]);
  }
  parser.endStream();
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'h1');
  assert.strictEqual(nodes[0].content, 'Hi');
});

// 测试：碎片推送时 _dsl 偏移量追踪正确
test('feed fragment _dsl tracking for nested containers', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node), { streaming: true });
  parser.startStream();
  const input = '[card tt:outer][card tt:inner]text[/card][/card]';
  // 模拟碎片推送：随机 1-6 字符片段
  let pos = 0;
  while (pos < input.length) {
    const len = Math.min(1 + Math.floor(Math.random() * 6), input.length - pos);
    parser.feed(input.slice(pos, pos + len));
    pos += len;
  }
  parser.endStream();

  // streaming 模式：open 节点直接 emit，close 事件为独立对象
  const outerOpen = nodes.find(n => n.type === 'card' && n.attrs && n.attrs.tt === 'outer' && n._stream === 'open');
  assert(outerOpen, 'outer card open should exist');
  assert(outerOpen._dsl, 'outer card should have _dsl');
  assert(outerOpen._dsl.startsWith('[card tt:outer]'), 'outer _dsl should start with [card tt:outer], got: ' + outerOpen._dsl);

  const innerOpen = nodes.find(n => n.type === 'card' && n.attrs && n.attrs.tt === 'inner' && n._stream === 'open');
  assert(innerOpen, 'inner card open should exist');
  assert(innerOpen._dsl, 'inner card should have _dsl');
  assert(innerOpen._dsl.startsWith('[card tt:inner]'), 'inner _dsl should start with [card tt:inner], got: ' + innerOpen._dsl);
});

// ===== ol/ul/i 别名标签解析测试 =====

// 测试：CONTAINERS 包含 ol/ul/i
test('CONTAINERS has ol ul i', () => {
  assert(CONTAINERS.has('ol'));
  assert(CONTAINERS.has('ul'));
  assert(CONTAINERS.has('i'));
});

// 测试：[ul][i 文本1][i 文本2][/ul] 解析为 list/item 节点
test('parse ul/i as list/item alias', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[ul][i 文本1][i 文本2][/ul]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'list');
  assert.strictEqual(nodes[0].attrs.t, 'ul');
  assert.strictEqual(nodes[0].children.length, 2);
  assert.strictEqual(nodes[0].children[0].type, 'item');
  assert.strictEqual(nodes[0].children[0].content, '文本1');
  assert.strictEqual(nodes[0].children[1].type, 'item');
  assert.strictEqual(nodes[0].children[1].content, '文本2');
});

// 测试：[ol][i A][i B][/ol] 解析为有序列表
test('parse ol/i as ordered list', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[ol][i 步骤1][i 步骤2][i 步骤3][/ol]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'list');
  assert.strictEqual(nodes[0].attrs.t, 'ol');
  assert.strictEqual(nodes[0].children.length, 3);
  assert.strictEqual(nodes[0].children[2].content, '步骤3');
});

// 测试：i 容器模式 — [i][p 内容][/i]
test('parse i in container mode with children', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[ul][i][p Hello][/i][/ul]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'list');
  assert.strictEqual(nodes[0].children[0].type, 'item');
  assert.strictEqual(nodes[0].children[0].children.length, 1);
  assert.strictEqual(nodes[0].children[0].children[0].type, 'p');
  assert.strictEqual(nodes[0].children[0].children[0].content, 'Hello');
});

// 测试：i 自闭合与容器模式混合
test('parse i mixed self-closing and container', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[ul][i 纯文本][i][p 嵌套内容][/i][/ul]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].children.length, 2);
  assert.strictEqual(nodes[0].children[0].type, 'item');
  assert.strictEqual(nodes[0].children[0].content, '纯文本');
  assert.strictEqual(nodes[0].children[0].children.length, 0);
  assert.strictEqual(nodes[0].children[1].type, 'item');
  assert.strictEqual(nodes[0].children[1].children.length, 1);
});

// 测试：ol/ul 的闭合标签正确匹配
test('parse nested ol inside card with close tags', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[card tt:步骤][ol][i 第一步][i 第二步][/ol][/card]');
  const card = nodes[0];
  assert.strictEqual(card.type, 'card');
  assert.strictEqual(card.children[0].type, 'list');
  assert.strictEqual(card.children[0].attrs.t, 'ol');
});

// 测试：流式解析 ul/i
test('feed streaming ul/i', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.startStream();
  parser.feed('[ul][i A][i B][/ul]');
  parser.endStream();
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'list');
  assert.strictEqual(nodes[0].attrs.t, 'ul');
  assert.strictEqual(nodes[0].children.length, 2);
});

// ===== desc 描述列表解析测试 =====

// 测试：desc 容器解析
test('parse desc container with desc-item children', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[desc cols:2][desc-item l:用户名 tx:张三][desc-item l:年龄 tx:28][/desc]');
  assert.strictEqual(nodes.length, 1);
  const desc = nodes[0];
  assert.strictEqual(desc.type, 'desc');
  assert.strictEqual(desc.attrs.cols, '2');
  assert.strictEqual(desc.children.length, 2);
  assert.strictEqual(desc.children[0].type, 'desc-item');
  assert.strictEqual(desc.children[0].attrs.l, '用户名');
  assert.strictEqual(desc.children[0].attrs.tx, '张三');
  assert.strictEqual(desc.children[1].type, 'desc-item');
  assert.strictEqual(desc.children[1].attrs.l, '年龄');
  assert.strictEqual(desc.children[1].attrs.tx, '28');
});

// 测试：desc 带布尔属性解析
test('parse desc with stripe and bordered', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[desc stripe bordered cols:3][desc-item l:A tx:1][/desc]');
  const desc = nodes[0];
  assert.strictEqual(desc.attrs.stripe, true);
  assert.strictEqual(desc.attrs.bordered, true);
  assert.strictEqual(desc.attrs.cols, '3');
});

// ===== Conversations 对话列表组件测试 =====

// 测试：CONTAINERS 包含 conversations
test('CONTAINERS has conversations', () => {
  assert.strictEqual(CONTAINERS.has('conversations'), true);
});

// 测试：BOOLEAN_ATTRS 包含 active
test('parseTag recognizes active as boolean', () => {
  const node = parseTag('conv active tt:标题 time:10:30');
  assert.strictEqual(node.attrs.active, true);
  assert.strictEqual(node.attrs.tt, '标题');
  assert.strictEqual(node.attrs.time, '10:30');
});

// 测试：解析 conversations 容器带 conv 子项
test('parse conversations with conv children', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[conversations clk:onSelectConv][conv tt:会话1 time:10:30][conv active tt:会话2 time:09:15][/conversations]');
  const conv = nodes[0];
  assert.strictEqual(conv.type, 'conversations');
  assert.strictEqual(conv.attrs.clk, 'onSelectConv');
  assert.strictEqual(conv.children.length, 2);
  assert.strictEqual(conv.children[0].type, 'conv');
  assert.strictEqual(conv.children[0].attrs.tt, '会话1');
  assert.strictEqual(conv.children[1].attrs.active, true);
  assert.strictEqual(conv.children[1].attrs.tt, '会话2');
});

// 测试：流式解析 conversations
test('parse streaming conversations', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node), { streaming: true });
  parser.feed('[conversations]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'conversations');
  assert.strictEqual(nodes[0]._stream, 'open');
  parser.feed('[conv tt:会话1 time:10:30]');
  assert.strictEqual(nodes.length, 2);
  assert.strictEqual(nodes[1].type, 'conv');
  parser.feed('[/conversations]');
});

// 测试：解析 conv 不带 active 属性
test('parse conv without active attr', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[conversations][conv tt:普通会话 time:昨天][/conversations]');
  const conv = nodes[0];
  assert.strictEqual(conv.children[0].attrs.active, undefined);
});

// ===== suggestions 容器解析测试 =====

test('parse suggestions container with suggestion children', function() {
  var nodes = [];
  var p = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  p.parse('[suggestions cols:3 clk:usePrompt]\n[suggestion tt:"帮我写一个用户认证模块" tx:"包含登录、注册、JWT" clk:auth]\n[suggestion tt:"解释 React Hooks" tx:"useState 和 useEffect 的区别" clk:hooks]\n[/suggestions]');
  // Should produce 1 root node: suggestions container with 2 suggestion children
  assert.strictEqual(nodes.length, 1);
  var sug = nodes[0];
  assert.strictEqual(sug.type, 'suggestions');
  assert.strictEqual(sug.attrs.cols, '3');
  assert.strictEqual(sug.attrs.clk, 'usePrompt');
  assert.strictEqual(sug.children.length, 2);
  assert.strictEqual(sug.children[0].type, 'suggestion');
  assert.strictEqual(sug.children[0].attrs.tt, '帮我写一个用户认证模块');
  assert.strictEqual(sug.children[0].attrs.tx, '包含登录、注册、JWT');
  assert.strictEqual(sug.children[0].attrs.clk, 'auth');
  assert.strictEqual(sug.children[1].type, 'suggestion');
  assert.strictEqual(sug.children[1].attrs.tt, '解释 React Hooks');
  assert.strictEqual(sug.children[1].attrs.tx, 'useState 和 useEffect 的区别');
  assert.strictEqual(sug.children[1].attrs.clk, 'hooks');
});

test('parse suggestions defaults to no cols attr', function() {
  var nodes = [];
  var p = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  p.parse('[suggestions]\n[suggestion tt:Hello tx:World]\n[/suggestions]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'suggestions');
  assert.ok(!nodes[0].attrs.cols);
  assert.strictEqual(nodes[0].children.length, 1);
  assert.strictEqual(nodes[0].children[0].attrs.tt, 'Hello');
});

test('parse suggestions streaming mode emits open and close', function() {
  var nodes = [];
  var p = new TokUIParser(function(n) { nodes.push(n); }, { streaming: true });
  p.feed('[suggestions cols:2]');
  // Should emit container open
  var openNodes = nodes.filter(function(n) { return n.type === 'suggestions' && n._stream === 'open'; });
  assert.strictEqual(openNodes.length, 1);
  p.feed('[suggestion tt:A tx:B]');
  // Should emit child suggestion
  var childNodes = nodes.filter(function(n) { return n.type === 'suggestion'; });
  assert.strictEqual(childNodes.length, 1);
  p.feed('[/suggestions]');
  // Should emit close
  var closeNodes = nodes.filter(function(n) { return n.type === 'suggestions' && n._stream === 'close'; });
  assert.strictEqual(closeNodes.length, 1);
});

// ===== command / command-group 解析测试 =====

test('CONTAINERS has command and command-group', () => {
  assert(CONTAINERS.has('command'));
  assert(CONTAINERS.has('command-group'));
});

test('parse basic command with groups and items', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse(
    '[command ph:"搜索命令..."]' +
      '[command-group tt:"操作"]' +
        '[command-item tx:"新建对话" clk:newChat]' +
        '[command-item tx:"清空历史" clk:clearHistory]' +
      '[/command-group]' +
      '[command-group tt:"设置"]' +
        '[command-item tx:"切换主题" clk:toggleTheme]' +
      '[/command-group]' +
    '[/command]'
  );
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'command');
  assert.strictEqual(nodes[0].attrs.ph, '搜索命令...');
  assert.strictEqual(nodes[0].children.length, 2);
  // first group
  assert.strictEqual(nodes[0].children[0].type, 'command-group');
  assert.strictEqual(nodes[0].children[0].attrs.tt, '操作');
  assert.strictEqual(nodes[0].children[0].children.length, 2);
  assert.strictEqual(nodes[0].children[0].children[0].type, 'command-item');
  assert.strictEqual(nodes[0].children[0].children[0].attrs.tx, '新建对话');
  assert.strictEqual(nodes[0].children[0].children[0].attrs.clk, 'newChat');
  assert.strictEqual(nodes[0].children[0].children[1].attrs.tx, '清空历史');
  // second group
  assert.strictEqual(nodes[0].children[1].type, 'command-group');
  assert.strictEqual(nodes[0].children[1].attrs.tt, '设置');
  assert.strictEqual(nodes[0].children[1].children.length, 1);
  assert.strictEqual(nodes[0].children[1].children[0].attrs.clk, 'toggleTheme');
});

test('parse command-item is self-closing (not in CONTAINERS)', () => {
  assert.strictEqual(CONTAINERS.has('command-item'), false);
});

test('parse command inside card', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse(
    '[card tt:面板]' +
      '[command]' +
        '[command-group tt:"工具"]' +
          '[command-item tx:"搜索"]' +
        '[/command-group]' +
      '[/command]' +
    '[/card]'
  );
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'card');
  assert.strictEqual(nodes[0].children[0].type, 'command');
  assert.strictEqual(nodes[0].children[0].children[0].type, 'command-group');
  assert.strictEqual(nodes[0].children[0].children[0].children[0].type, 'command-item');
});

test('feed streaming command', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.startStream();
  parser.feed('[command ph:"Type..."]');
  parser.feed('[command-group tt:"Actions"]');
  parser.feed('[command-item tx:"Run"]');
  parser.feed('[/command-group]');
  parser.feed('[/command]');
  parser.endStream();
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'command');
  assert.strictEqual(nodes[0].children[0].type, 'command-group');
  assert.strictEqual(nodes[0].children[0].children[0].type, 'command-item');
  assert.strictEqual(nodes[0].children[0].children[0].attrs.tx, 'Run');
});

// === chart 自闭合流式预览：双引号长数据值放行（修复 gantt/bar 流式卡顿）===
// 背景：原 preview 门槛要求引号配对，导致 tasks:"超长数据..." / d:"..." 闭引号到达前
// 零 emit（数据全齐才一次性渲染）。修复后 d/tasks 的未闭合引号值也放行半成品预览。

test('流式预览：双引号 tasks 的 gantt，闭引号到达前持续 emit 半成品（非一次性）', () => {
  const events = [];
  const parser = new TokUIParser((node) => {
    if (node.type === 'chart' && node.attrs.tasks) events.push(String(node.attrs.tasks));
  }, { streaming: true });
  const dsl = '[chart t:gantt tt:"排期" tasks:"a,0,2,50,0|b,2,4,30,1|c,4,6,0,1"]';
  for (let i = 0; i < dsl.length; i++) parser.feed(dsl[i]);
  // 修复前仅 1 次（闭引号 + ] 到达）；修复后 tasks 增长期间多次 emit 预览
  assert.ok(events.length > 1, '双引号 tasks 应在闭引号前多次 emit 预览，实际 ' + events.length);
  // finalize 末次含全部 3 段任务，且无前导引号残留
  assert.strictEqual(events[events.length - 1].split('|').length, 3);
  assert.strictEqual(events[events.length - 1].charAt(0), 'a', '半截值 strip 干净，无前导引号');
});

test('流式预览：双引号 d 的 bar，d 半截时多次 emit（bar 同样受益）', () => {
  const events = [];
  const parser = new TokUIParser((node) => {
    if (node.type === 'chart' && node.attrs.d) events.push(node.attrs.d);
  }, { streaming: true });
  const dsl = '[chart t:bar d:"10,20,30,40,50"]';
  for (let i = 0; i < dsl.length; i++) parser.feed(dsl[i]);
  assert.ok(events.length > 1, '双引号 d 应多次 emit，实际 ' + events.length);
  assert.strictEqual(events[events.length - 1], '10,20,30,40,50');
});

test('流式预览：d 半截放行时，前面已闭合的颜色属性 c 保持完整不丢', () => {
  const seen = [];
  const parser = new TokUIParser((node) => {
    if (node.type === 'chart' && node.attrs.d) seen.push(node.attrs);
  }, { streaming: true });
  // c 已闭合、d 正在半截增长；补闭引号放行 d 预览时，parseTag 必须正确分离 c 与 d
  const dsl = '[chart t:bar c:"#1677ff" d:"10,20';
  for (let i = 0; i < dsl.length; i++) parser.feed(dsl[i]);
  assert.ok(seen.length > 0, '应有 d 半截预览 emit');
  assert.strictEqual(seen[seen.length - 1].c, '#1677ff', '颜色 c 应保持完整，不被半截 d 破坏');
});

test('流式：裸 [item] 兄弟隐式闭合，不互相嵌套（HTML <li> 语义）', () => {
  // AI 习惯写 HTML <li> 风格的裸 [item]，每个不闭合。修前会层层嵌套成空壳 li。
  const events = [];
  const parser = new TokUIParser((node) => {
    events.push({ type: node.type, stream: node._stream || null, content: node.content });
  }, { streaming: true });
  parser.feed('[list t:ul][item]第一[item]第二[item]第三[/list]');
  parser.feed('[DONE]');
  // 3 个 item 应各开各关，平铺；每个文本应落到对应 item 内（_text 紧跟其 open）
  const opens = events.filter(e => e.type === 'item' && e.stream === 'open');
  const closes = events.filter(e => e.type === 'item' && e.stream === 'close');
  const texts = events.filter(e => e.type === '_text').map(e => e.content);
  assert.strictEqual(opens.length, 3, '应有 3 个 item open');
  assert.strictEqual(closes.length, 3, '应有 3 个 item close');
  assert.deepStrictEqual(texts, ['第一', '第二', '第三'], '文本应分别落到 3 个 item，顺序不乱');
});

test('流式：item 容器语义（[item 文本] 文本当首段，纯文本隐式闭合，支持嵌套子 list）', () => {
  const events = [];
  const parser = new TokUIParser((node) => {
    events.push({ type: node.type, stream: node._stream || null, content: node.content });
  }, { streaming: true });
  // 兼容旧写法：纯文本 [item 文本] 兄弟隐式闭合，content 当 <li> 首段文本
  parser.feed('[list t:ul][item A][item B][/list]');
  // 标准嵌套：[item 文本] 直接包内层 list（有序/无序混搭）
  parser.feed('[list t:ul][item 外层][list t:ol][item 内层][/list][/item][/list]');
  parser.feed('[DONE]');
  // item 全部容器化：不再有 stream=null 自闭合残留
  const dangling = events.filter(e => e.type === 'item' && e.stream === null);
  assert.strictEqual(dangling.length, 0, 'item 全部走容器 open/close，无自闭合残留');
  // 4 个 item open，content 作首段文本保留，顺序正确
  const opens = events.filter(e => e.type === 'item' && e.stream === 'open').map(e => e.content);
  assert.deepStrictEqual(opens, ['A', 'B', '外层', '内层'], 'item content 保留作 li 首段文本');
  // 每个 item 都有 close（兄弟隐式 / 父逐层 / 显式 [/item]）
  const closes = events.filter(e => e.type === 'item' && e.stream === 'close');
  assert.strictEqual(closes.length, 4, '每个 item 都配对 close');
});

test('parse: item 标准嵌套（[item 文本] 包子 list，有序/无序混搭）', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[list][item 前端][list t:ul][item React][item Vue][/list][/item][item 后端][list t:ol][item Node][/list][/item][/list]');
  assert.strictEqual(nodes.length, 1);
  const outer = nodes[0];
  assert.strictEqual(outer.children.length, 2, '外层 2 个 item');
  assert.strictEqual(outer.children[0].content, '前端');
  assert.strictEqual(outer.children[0].children.length, 1, '前端 item 含子 list');
  assert.strictEqual(outer.children[0].children[0].type, 'list');
  assert.strictEqual(outer.children[0].children[0].attrs.t, 'ul');
  assert.strictEqual(outer.children[0].children[0].children.length, 2, '子 list 2 个 item');
  assert.strictEqual(outer.children[1].content, '后端');
  assert.strictEqual(outer.children[1].children[0].attrs.t, 'ol', '后端子 list 为有序');
});

test('parse: 原坏例 [item 文本] 不再泄漏裸 ]（隐式关无 [/item]）', () => {
  const nodes = [];
  const parser = new TokUIParser((node) => nodes.push(node));
  parser.parse('[list][item 技术栈][list t:ul][item React / Vue][/list][/list]');
  function findText(n) {
    if (n.type === '_text') return n;
    for (const c of (n.children || [])) { const r = findText(c); if (r) return r; }
    return null;
  }
  assert.strictEqual(findText(nodes[0]), null, '不应有裸 ] 泄漏的 _text 节点');
  assert.strictEqual(nodes[0].children[0].content, '技术栈');
  assert.strictEqual(nodes[0].children[0].children[0].type, 'list', '技术栈 item 嵌套子 list');
});

test('parse: 容器开标签漏 ] 自动闭合（[item 文本] 跨行接子标签不被吞）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[list t:ol][item 需求分析\n[p v:muted 明确目标][/item][/list]');
  const item = nodes[0].children[0];
  assert.strictEqual(item.type, 'item');
  assert.strictEqual(item.content.trim(), '需求分析', 'item 文本不被子标签头污染');
  assert.strictEqual(item.children.length, 1, '子标签正确进 children');
  assert.strictEqual(item.children[0].type, 'p');
  assert.strictEqual(item.children[0].attrs.v, 'muted');
});

test('streaming: 容器漏 ] 容错 + emit 序列正确（子标签不被吞进 content）', () => {
  const evts = [];
  const p = new TokUIParser((n) => evts.push(n.type + ':' + (n._stream || 'leaf') + (n.content ? '/' + n.content : '')), { streaming: true });
  p.feed('[list][item 前端\n[list t:ul][item React][/list][/item][/list]');
  p.feed('[DONE]');
  // 内层 list open 应在外层 item open 之后；外层 item 文本为「前端」未被污染
  const outerItemOpen = evts.indexOf('item:open/前端 ');
  const innerListOpen = evts.lastIndexOf('list:open');
  assert.ok(outerItemOpen !== -1, '外层 item 文本「前端」未被吞');
  assert.ok(outerItemOpen < innerListOpen, '内层 list open 在外层 item open 之后（嵌套正确）');
});

test('parse: item 文本含冒号不被当属性（中文 key 当正文，「框架:React」完整保留）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[list][item 框架:React / Vue][item 语言:TypeScript][/list]');
  assert.strictEqual(nodes[0].children[0].content, '框架:React / Vue');
  assert.deepStrictEqual(nodes[0].children[0].attrs, {}, '中文 key 不当属性');
  assert.strictEqual(nodes[0].children[1].content, '语言:TypeScript');
});

test('parse: 英文 key:value 仍当属性（含冒号修复不误伤正常属性）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[input l:姓名 n:name req v:primary]');
  assert.strictEqual(nodes[0].attrs.l, '姓名');
  assert.strictEqual(nodes[0].attrs.n, 'name');
  assert.strictEqual(nodes[0].attrs.req, true);
  assert.strictEqual(nodes[0].attrs.v, 'primary');
});

// [item [tag ...] 文本]：item 隐式开标签，其真实 ] 被 deferred，由 TEXT 消费关闭。
// 修前末尾 ] 漏进 _text，渲染出多余的 ]
test('parse: [item [tag] 文本] 末尾 ] 不泄漏（隐式开标签 deferred ] 关闭）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse(
    '[list][item [tag t:success tx:完成] 项目初始化配置][/list]');
  const item = nodes[0].children[0];
  assert.strictEqual(item.type, 'item');
  assert.strictEqual(item.children.length, 2, 'item 含 tag + 文本两个子节点');
  assert.strictEqual(item.children[0].type, 'tag');
  assert.strictEqual(item.children[0].attrs.t, 'success');
  assert.strictEqual(item.children[0].attrs.tx, '完成');
  assert.strictEqual(item.children[1].type, '_text');
  assert.strictEqual(item.children[1].content, '项目初始化配置', '文本不含末尾 ]');
});

test('parse: 多个 [item [tag] 文本] 兄弟，各自正确闭合无 ] 泄漏', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse(
    '[list]' +
    '[item [tag t:success tx:完成] 项目初始化配置]' +
    '[item [tag t:warning tx:待办] UI 细节优化]' +
    '[/list]');
  const items = nodes[0].children;
  assert.strictEqual(items.length, 2, '2 个平铺 item');
  assert.strictEqual(items[0].children[0].attrs.t, 'success');
  assert.strictEqual(items[0].children[1].content, '项目初始化配置');
  assert.strictEqual(items[1].children[0].attrs.t, 'warning');
  assert.strictEqual(items[1].children[1].content, 'UI 细节优化');
});

test('流式：[item [tag] 文本] 末尾 ] 不泄漏（流式分块同样关闭）', () => {
  const events = [];
  const parser = new TokUIParser((node) => {
    events.push({ type: node.type, stream: node._stream || null, content: node.content });
  }, { streaming: true });
  // 分块喂入（模拟 SSE 多字符 chunk）；文本在 ] 抵达前可能被 feed 文本刷新切成多段
  const chunks = ['[list]', '[item ', '[tag t:success tx:完成]', ' 项目初始化配置]', '[/list]'];
  for (const c of chunks) parser.feed(c);
  parser.feed('[DONE]');
  const texts = events.filter(e => e.type === '_text').map(e => e.content);
  assert.ok(!texts.some(t => t.includes(']')), '不应有含 ] 的 _text 节点');
  const joined = texts.join('');
  assert.ok(joined.includes('项目初始化配置'), 'item 文本完整保留（可跨多段）');
  const itemCloses = events.filter(e => e.type === 'item' && e.stream === 'close');
  assert.strictEqual(itemCloses.length, 1, 'item 配对 close');
});

test('parse: [item "含[括号]内容"] 引号内 [ ] 作字面内容保留（不泄漏 "、不误判嵌套标签）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse(
    '[list]' +
    '[item "Math.random() 生成 [0, 1) 浮点数"]' +
    '[item "数组 arr[0] 与 arr[1]"]' +
    '[/list]');
  const items = nodes[0].children;
  assert.strictEqual(items.length, 2, '2 个 item');
  // 引号内 [ ] 作字面内容整段保留，不被误判为子标签
  assert.strictEqual(items[0].content, 'Math.random() 生成 [0, 1) 浮点数');
  assert.strictEqual(items[0].children.length, 0, 'item0 无误解析的子标签');
  assert.strictEqual(items[1].content, '数组 arr[0] 与 arr[1]');
  assert.strictEqual(items[1].children.length, 0, 'item1 无误解析的子标签');
  // 不泄漏裸 " 或孤立 ]
  const leaked = items.some(it => it.content.includes('"'));
  assert.ok(!leaked, '不应泄漏裸 "');
});

test('流式：[item "含[]内容"] 跨 chunk 引号内字面括号同样不泄漏', () => {
  const events = [];
  const parser = new TokUIParser((node) => {
    events.push({ type: node.type, stream: node._stream || null, content: node.content });
  }, { streaming: true });
  const chunks = ['[list]', '[item "Math [0,', ' 1) 随机"]', '[/list]'];
  for (const c of chunks) parser.feed(c);
  parser.feed('[DONE]');
  const texts = events.filter(e => e.type === '_text').map(e => e.content);
  assert.ok(!texts.some(t => t === '"' || t.endsWith(']')), '流式下无裸 " 或末尾 ] 漏出');
});

test('parse: item 内容含字面 [ ] 不引号时仍按嵌套标签处理（歧义需引号消除）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[item 文本 [0, 1) 结束]');
  // 不引号：[0 被当嵌套标签起点，item 内容截断（文档化：含 [ ] 须引号）
  assert.strictEqual(nodes[0].content, '文本 ');
});

test('原始内容块：字面 \\n/\\t/\\\\ 解码为真换行/制表/反斜杠（AI 流式常见）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[code]a\\nb\\tc\\\\d[/code]');
  const code = nodes[0];
  assert.strictEqual(code.type, 'code');
  assert.strictEqual(code.children[0].content, 'a\nb\tc\\d', '\\n→换行 \\t→制表 \\\\→反斜杠');
});

test('原始内容块：未知转义（正则 \\d 路径 \\w）保留字面反斜杠', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[code]regex \\d+ path \\w[/code]');
  assert.strictEqual(nodes[0].children[0].content, 'regex \\d+ path \\w');
});

test('原始内容块：真换行原样保留（不重复处理）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[code]line1\nline2[/code]');
  assert.strictEqual(nodes[0].children[0].content, 'line1\nline2');
});

test('普通文本：\\n 不解码（仅原始内容块解码）', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[p a\\nb]');
  assert.strictEqual(nodes[0].content, 'a\\nb');
});

test('流式：原始内容块字面 \\n 跨 chunk 解码', () => {
  const events = [];
  const parser = new TokUIParser((n) => events.push(n), { streaming: true });
  parser.feed('[code]a\\nb');
  parser.feed('\\nc[/code]');
  const texts = events.filter(e => e.type === '_text').map(e => e.content);
  // 流式逐块 emit（不再等到 [/code] 一次性吐）；多块拼接应得完整解码后文本，字面 \n 均解码为真换行
  assert.strictEqual(texts.join(''), 'a\nb\nc');
  assert.ok(texts.every(t => !t.includes('\\n')), '字面 \\n 应解码为真换行，不残留');
});

// ===== 变体吸收（v: 后空格分隔的裸变体名智能并入 v）=====
test('变体吸收：v: 后空格分隔的已知变体并入 v，不进正文', () => {
  setVariantHints({ p: new Set(['left', 'center', 'right', 'muted', 'bold', 'sm', 'lg']) });
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[p v:center muted 欢迎再次光临]');
  assert.strictEqual(nodes[0].attrs.v, 'center,muted');
  assert.strictEqual(nodes[0].content, '欢迎再次光临');
});

test('变体吸收：多个空格变体与逗号混用，顺序合并', () => {
  setVariantHints({ p: new Set(['left', 'center', 'right', 'muted', 'bold', 'sm', 'lg']) });
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[p v:center,bold muted sm 内容]');
  assert.strictEqual(nodes[0].attrs.v, 'center,bold,muted,sm');
  assert.strictEqual(nodes[0].content, '内容');
});

test('变体吸收：无 v: 时不吞裸变体名（保持纯文本意图）', () => {
  setVariantHints({ p: new Set(['center', 'muted']) });
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[p center 文本]');
  assert.strictEqual(nodes[0].content, 'center 文本');
  assert.strictEqual(nodes[0].attrs.v, undefined);
});

test('变体吸收：v: 存在但裸词非已知变体 → 留正文', () => {
  setVariantHints({ p: new Set(['center', 'muted']) });
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[p v:center randomword 欢迎]');
  assert.strictEqual(nodes[0].attrs.v, 'center');
  assert.strictEqual(nodes[0].content, 'randomword 欢迎');
});

test('变体吸收：流式场景同样生效（跨 chunk）', () => {
  setVariantHints({ p: new Set(['left', 'center', 'right', 'muted', 'bold', 'sm', 'lg']) });
  const events = [];
  const parser = new TokUIParser((n) => events.push(n), { streaming: true });
  parser.feed('[p v:center mut');
  parser.feed('ed 欢迎]');
  assert.strictEqual(events[0].attrs.v, 'center,muted');
  assert.strictEqual(events[0].content, '欢迎');
});

test('变体吸收：boolean 与 variant 同名时，v: 存在优先当变体（修 bordered/pill 等）', () => {
  // img 的 bordered 既是 BOOLEAN_ATTRS 又是 VARIANTS；v: 存在时应并入 v 生成变体类
  setVariantHints({ img: new Set(['avatar', 'rounded', 'bordered']) });
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[img v:avatar bordered s:a.png]');
  assert.strictEqual(nodes[0].attrs.v, 'avatar,bordered');
  assert.strictEqual(nodes[0].attrs.bordered, undefined);
});

// ===== 漏空格容错（CJK 值后粘连下个属性）=====
test('漏空格：全角括号后无空格接 tx: → 拆成 l + tx', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[item l:服务费（10%）tx:¥48.20]');
  assert.strictEqual(nodes[0].attrs.l, '服务费（10%）');
  assert.strictEqual(nodes[0].attrs.tx, '¥48.20');
});

test('漏空格：CJK 后无空格接 tx: → 拆开', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[item l:服务费tx:¥48.20]');
  assert.strictEqual(nodes[0].attrs.l, '服务费');
  assert.strictEqual(nodes[0].attrs.tx, '¥48.20');
});

test('漏空格：一个 token 内多属性粘连 → 全部拆开', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[item l:服务费（10%）tt:小计 tx:¥48.20]');
  assert.strictEqual(nodes[0].attrs.l, '服务费（10%）');
  assert.strictEqual(nodes[0].attrs.tt, '小计');
  assert.strictEqual(nodes[0].attrs.tx, '¥48.20');
});

test('漏空格：纯 ASCII 冒号值（URL/时间）不误切', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[a u:https://x.com tx:链接]');
  assert.strictEqual(nodes[0].attrs.u, 'https://x.com');
  assert.strictEqual(nodes[0].attrs.tx, '链接');
});

test('漏空格：ASCII 冒号边界（:l:）不误切，保留字面值', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[p tt:服务:l:oops]');
  assert.strictEqual(nodes[0].attrs.tt, '服务:l:oops');
});

test('漏空格：CJK 值内含冒号（价格:10元）保留字面', () => {
  const nodes = [];
  new TokUIParser((n) => nodes.push(n)).parse('[item l:价格:10元 tx:¥48.20]');
  assert.strictEqual(nodes[0].attrs.l, '价格:10元');
  assert.strictEqual(nodes[0].attrs.tx, '¥48.20');
});

test('漏空格：流式场景同样生效', () => {
  const events = [];
  const parser = new TokUIParser((n) => events.push(n), { streaming: true });
  parser.feed('[item l:服务费（10%）tx');
  parser.feed(':¥48.20]');
  assert.strictEqual(events[0].attrs.l, '服务费（10%）');
  assert.strictEqual(events[0].attrs.tx, '¥48.20');
});

// === checkbox 三态 + opt 简写自闭合 ===
test('checkbox 在 CONTAINERS 内', () => {
  assert.ok(CONTAINERS.has('checkbox'), 'checkbox 应在 CONTAINERS');
});
test('checkbox 无 multi 无 opt → 自闭合叶子（单布尔）', () => {
  const p = new TokUIParser();
  const nodes = [];
  p.onNode = n => nodes.push(n);
  p.parse('[card][checkbox l:同意][btn tx:下一项][/card]');
  // checkbox 不应吞掉 btn：btn 是 checkbox 的兄弟（card 的子），不是 checkbox 的子
  const card = nodes.find(n => n.type === 'card');
  const cb = card.children.find(n => n.type === 'checkbox');
  assert.ok(cb, 'checkbox 存在');
  assert.strictEqual(cb.children.length, 0, '单布尔 checkbox 无子节点');
  const btn = card.children.find(n => n.type === 'btn');
  assert.ok(btn && btn.attrs.tx === '下一项', 'btn 是 checkbox 兄弟，未被吞');
});
test('checkbox multi → 容器收 opt 子节点', () => {
  const p = new TokUIParser();
  const nodes = [];
  p.onNode = n => nodes.push(n);
  p.parse('[checkbox n:brand multi][opt v:1 tx:篮球][opt v:2 tx:足球][/checkbox]');
  const cb = nodes.find(n => n.type === 'checkbox');
  assert.ok(cb, 'checkbox 存在');
  assert.strictEqual(cb.children.length, 2, '收了 2 个 opt');
  assert.strictEqual(cb.children[0].type, 'opt');
});
test('checkbox opt:"..." → 原子自闭合（无子节点）', () => {
  const p = new TokUIParser();
  const nodes = [];
  p.onNode = n => nodes.push(n);
  p.parse('[checkbox n:brand opt:"1:篮球;2:足球"]');
  const cb = nodes.find(n => n.type === 'checkbox');
  assert.ok(cb, 'checkbox 存在');
  assert.strictEqual(cb.attrs.opt, '1:篮球;2:足球', 'opt 属性原样保留');
  assert.strictEqual(cb.children.length, 0, '简写原子自闭合，无子节点');
});
test('radio opt:"..." → 原子自闭合', () => {
  const p = new TokUIParser();
  const nodes = [];
  p.onNode = n => nodes.push(n);
  p.parse('[radio n:gender opt:"1:男;2:女"]');
  const r = nodes.find(n => n.type === 'radio');
  assert.ok(r && r.attrs.opt === '1:男;2:女');
  assert.strictEqual(r.children.length, 0);
});

run();
