'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
const { TokUIRenderer } = require('../src/core/renderer');
const { registerBasicComponents } = require('../src/components/basic.js');

setupDOM();

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function run() {
  let passed = 0, failed = 0;
  tests.forEach(t => {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + e.message); }
  });
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  teardownDOM();
  if (failed) process.exit(1);
}

function makeRenderer() {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  return rc;
}

function renderMd(text) {
  const rc = makeRenderer();
  return rc.render({ type: 'md', attrs: {}, content: text, children: [] });
}

test('task list: unchecked item', () => {
  var dom = renderMd('- [ ] todo item');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-md__task') !== -1, 'Should have task class');
  assert.ok(html.indexOf('checkbox') !== -1, 'Should have checkbox');
  assert.ok(html.indexOf('checked') === -1, 'Should NOT be checked');
});

test('task list: checked item', () => {
  var dom = renderMd('- [x] done item');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('checked') !== -1, 'Should be checked');
});

test('task list: capital X checked', () => {
  var dom = renderMd('- [X] done');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('checked') !== -1, 'Should be checked with capital X');
});

test('task list: mixed items', () => {
  var dom = renderMd('- [ ] pending\n- [x] done\n- [ ] another');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-md__tasks') !== -1, 'Should have tasks class on ul');
  var tasks = html.split('tokui-md__task"').length - 1;
  assert.strictEqual(tasks, 3, 'Should have 3 task items');
});

test('code fence: basic rendering', () => {
  var dom = renderMd('```js\nconst x = 1;\n```');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-code') !== -1, 'Should have code class');
  assert.ok(html.indexOf('language-js') !== -1, 'Should have language class');
  assert.ok(html.indexOf('tok-kw') !== -1, 'Should have syntax highlighting');
});

test('code fence: no language', () => {
  var dom = renderMd('```\nplain text\n```');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('language-text') !== -1, 'Should default to text');
});

test('code fence: does not break surrounding content', () => {
  var dom = renderMd('before\n\n```js\nvar x = 1;\n```\n\nafter');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('before') !== -1, 'Should have before text');
  assert.ok(html.indexOf('after') !== -1, 'Should have after text');
  assert.ok(html.indexOf('tokui-code') !== -1, 'Should have code block');
});

test('blockquote: single line', () => {
  var dom = renderMd('> quoted text');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-md__quote') !== -1, 'Should have quote class');
  assert.ok(html.indexOf('quoted text') !== -1, 'Should contain text');
});

test('blockquote: multi-line', () => {
  var dom = renderMd('> line1\n> line2\n> line3');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-md__quote') !== -1, 'Should have quote');
  assert.ok(html.indexOf('line1') !== -1, 'Should have line1');
  assert.ok(html.indexOf('line3') !== -1, 'Should have line3');
});

test('horizontal rule: dashes', () => {
  var dom = renderMd('above\n\n---\n\nbelow');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-md__hr') !== -1, 'Should have hr');
  assert.ok(html.indexOf('above') !== -1, 'Should have above');
  assert.ok(html.indexOf('below') !== -1, 'Should have below');
});

test('horizontal rule: asterisks', () => {
  var dom = renderMd('***');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-md__hr') !== -1, 'Should have hr for ***');
});

test('horizontal rule: underscores', () => {
  var dom = renderMd('___');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-md__hr') !== -1, 'Should have hr for ___');
});

test('table alignment: left', () => {
  var dom = renderMd('| Name |\n|:-----|\n| Alice |');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('text-align:left') !== -1, 'Should have left align');
});

test('table alignment: right', () => {
  var dom = renderMd('| Price |\n|------:|\n| 99.9 |');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('text-align:right') !== -1, 'Should have right align');
});

test('table alignment: center', () => {
  var dom = renderMd('| Title |\n|:-----:|\n| Hello |');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('text-align:center') !== -1, 'Should have center align');
});

test('table alignment: mixed columns', () => {
  var dom = renderMd('| Left | Center | Right |\n|:-----|:------:|-------:|\n| a | b | c |');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('text-align:left') !== -1);
  assert.ok(html.indexOf('text-align:center') !== -1);
  assert.ok(html.indexOf('text-align:right') !== -1);
});

test('existing features still work: bold italic', () => {
  var dom = renderMd('**bold** and *italic*');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('<strong>bold</strong>') !== -1);
  assert.ok(html.indexOf('<em>italic</em>') !== -1);
});

test('existing features still work: links', () => {
  var dom = renderMd('[click](http://example.com)');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('href="http://example.com"') !== -1);
});

test('existing features still work: headings', () => {
  var dom = renderMd('# Title\n## Sub\n### Deep');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('<h1>') !== -1);
  assert.ok(html.indexOf('<h2>') !== -1);
  assert.ok(html.indexOf('<h3>') !== -1);
});

test('streaming md: _streamCloseHook re-renders', () => {
  var rc = makeRenderer();
  var dom = rc.render({ type: 'md', attrs: {}, children: [], content: '' });
  // Simulate streaming: add raw text nodes
  var textNode = document.createTextNode('- [x] stream task');
  dom.appendChild(textNode);
  // Call close hook
  if (dom._streamCloseHook) dom._streamCloseHook();
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-md__task') !== -1, 'Stream close should render task list');
});

// === mermaid 围栏（可选插件，宿主自行引入 window.mermaid）===
test('mermaid fence: 无插件回退为代码块展示且不报错', () => {
  var dom = renderMd('```mermaid\ngraph TD; A-->B\n```');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('tokui-md__mermaid') !== -1, '应有 mermaid 容器');
  assert.ok(html.indexOf('tokui-code') !== -1, '无插件时应保留代码块展示');
  assert.ok(html.indexOf('language-mermaid') !== -1, '应带 language-mermaid 类');
  assert.ok(html.indexOf('graph TD; A--&gt;B') !== -1, '应含转义后的源码');
});

test('mermaid fence: 有 window.mermaid (v10/v11 run) 时调用渲染', () => {
  var calls = [];
  global.window = { mermaid: { run: function (opts) { calls.push(opts); return Promise.resolve(); } } };
  try {
    var dom = renderMd('```mermaid\ngraph TD; A-->B\n```');
    assert.ok(dom.innerHTML.indexOf('tokui-md__mermaid') !== -1);
  } finally {
    delete global.window;
  }
  assert.strictEqual(calls.length, 1, 'mermaid.run 应被调用一次');
  assert.ok(calls[0] && Array.isArray(calls[0].nodes), 'run 应收到 nodes 数组');
});

test('mermaid fence: 有 window.mermaid (v9 init) 时走 init 兼容路径', () => {
  var calls = [];
  global.window = { mermaid: { init: function (config, nodes) { calls.push(nodes); } } };
  try {
    renderMd('```mermaid\ngraph LR; A-->B\n```');
  } finally {
    delete global.window;
  }
  assert.strictEqual(calls.length, 1, 'mermaid.init 应被调用一次');
});

test('mermaid fence: mermaid.run 抛错时静默回退不抛出', () => {
  global.window = { mermaid: { run: function () { throw new Error('boom'); } } };
  try {
    var dom = renderMd('```mermaid\ngraph TD; A-->B\n```');
    assert.ok(dom.innerHTML.indexOf('tokui-md__mermaid') !== -1, '失败仍保留源码容器');
  } finally {
    delete global.window;
  }
});

// === KaTeX 数学公式（可选插件，宿主自行引入 window.katex）===
test('block math $$...$$: 无插件保留原文', () => {
  var dom = renderMd('$$\nx^2 + y^2 = z^2\n$$');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('$$') !== -1, '无插件应保留 $$ 原文');
  assert.ok(html.indexOf('x^2 + y^2 = z^2') !== -1, '公式内容应保留');
});

test('inline math $...$: 无插件保留原文', () => {
  var dom = renderMd('勾股定理 $a^2+b^2=c^2$ 成立');
  assert.ok(dom.innerHTML.indexOf('$a^2+b^2=c^2$') !== -1, '行内公式应保留原文');
});

test('inline math: 不误吃货币（$ 后非空格且成对 + 闭 $ 后不接数字）', () => {
  var dom = renderMd('价格 $5 和 $6 元');
  var html = dom.innerHTML;
  assert.ok(html.indexOf('$5 和 $6') !== -1, '货币应保持原文不被吃掉');
  assert.ok(html.indexOf('tokui-md__math') === -1, '不应产生数学容器');
});

test('math: 有 window.katex 时渲染为 HTML（block + inline）', () => {
  global.window = {
    katex: {
      renderToString: function (tex, opts) {
        return '<katex data-tex="' + tex.trim() + '" data-display="' + opts.displayMode + '"></katex>';
      }
    }
  };
  try {
    var dom = renderMd('$$\nx^2\n$$\n\n行内 $a+b$ 公式');
    var html = dom.innerHTML;
    assert.ok(html.indexOf('tokui-md__math--block') !== -1, '块级公式应有 block 容器');
    assert.ok(html.indexOf('data-display="true"') !== -1, '块级 displayMode=true');
    assert.ok(html.indexOf('data-display="false"') !== -1, '行内 displayMode=false');
    assert.ok(html.indexOf('data-tex="a+b"') !== -1, '行内公式内容正确');
    assert.ok(html.indexOf('$$') === -1, '有插件时不应残留 $$ 原文');
  } finally {
    delete global.window;
  }
});

test('math: katex.renderToString 抛错时回退原文', () => {
  global.window = { katex: { renderToString: function () { throw new Error('bad tex'); } } };
  try {
    var dom = renderMd('行内 $a+b$ 公式');
    assert.ok(dom.innerHTML.indexOf('$a+b$') !== -1, '渲染失败应保留原文');
  } finally {
    delete global.window;
  }
});

// === [katex] / [mermaid] 组件（md 增强的别名形式）===

test('katex 组件：容器 = 块级公式（有插件渲染 displayMode:true）', () => {
  global.window = {
    katex: {
      renderToString: function (tex, opts) {
        return '<katex data-tex="' + tex.trim() + '" data-display="' + opts.displayMode + '"></katex>';
      }
    }
  };
  try {
    const rc = makeRenderer();
    const dom = rc.render({
      type: 'katex', attrs: {},
      children: [{ type: '_text', content: 'O(n) = x^2' }]
    });
    assert.ok(dom.className.indexOf('tokui-katex--block') !== -1, '容器为块级类');
    assert.ok(dom.innerHTML.indexOf('data-display="true"') !== -1, 'displayMode=true');
    assert.ok(dom.innerHTML.indexOf('O(n) = x^2') !== -1, '公式内容正确');
  } finally {
    delete global.window;
  }
});

test('katex 组件：自闭合 [katex f:"公式"] = 行内公式', () => {
  global.window = {
    katex: {
      renderToString: function (tex, opts) {
        return '<katex data-display="' + opts.displayMode + '" data-tex="' + tex.trim() + '"></katex>';
      }
    }
  };
  try {
    const rc = makeRenderer();
    const dom = rc.render({ type: 'katex', attrs: { f: 'a+b' }, children: [] });
    assert.ok(dom.className.indexOf('tokui-katex--inline') !== -1, 'f: 为行内类');
    assert.ok(dom.innerHTML.indexOf('data-display="false"') !== -1, 'displayMode=false');
    assert.ok(dom.innerHTML.indexOf('data-tex="a+b"') !== -1, '公式取 f 属性值');
  } finally {
    delete global.window;
  }
});

test('katex 组件：无插件回退保留原文', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'katex', attrs: {}, children: [{ type: '_text', content: 'x<y' }] });
  assert.ok(dom.innerHTML.indexOf('x&lt;y') !== -1, '回退为转义原文');
  assert.ok(dom.innerHTML.indexOf('$$') !== -1, '块级回退带 $$ 标记');
});

test('mermaid 组件：无插件回退为代码块', () => {
  const rc = makeRenderer();
  const dom = rc.render({
    type: 'mermaid', attrs: {},
    children: [{ type: '_text', content: 'graph TD; A-->B' }]
  });
  assert.ok(dom.className.indexOf('tokui-mermaid') !== -1);
  assert.ok(dom.querySelector('.tokui-md__mermaid'), '回退结构存在');
  assert.ok(dom.querySelector('code.language-mermaid'), 'code 块带 language-mermaid 类');
  assert.strictEqual(dom.querySelector('code.language-mermaid').textContent, 'graph TD; A-->B');
});

test('mermaid 组件：有 window.mermaid 时拍平并调用渲染', () => {
  var calls = [];
  global.window = { mermaid: { run: function (opts) { calls.push(opts); return Promise.resolve(); } } };
  try {
    const rc = makeRenderer();
    rc.render({
      type: 'mermaid', attrs: {},
      children: [{ type: '_text', content: 'graph LR; A-->B' }]
    });
  } finally {
    delete global.window;
  }
  assert.strictEqual(calls.length, 1, 'mermaid.run 应被调用一次');
});

test('katex/mermaid 组件：原文留档 _rawMd（插件晚到补渲染协议）', () => {
  const rc = makeRenderer();
  const kdom = rc.render({ type: 'katex', attrs: {}, children: [{ type: '_text', content: 'x^2' }] });
  assert.strictEqual(kdom._rawMd, 'x^2');
  const mdom = rc.render({ type: 'mermaid', attrs: {}, children: [{ type: '_text', content: 'graph TD' }] });
  assert.strictEqual(mdom._rawMd, 'graph TD');
});

run();
