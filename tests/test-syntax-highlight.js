'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
const { TokUIRenderer } = require('../src/core/renderer');
const { el } = require('../src/core/renderer');

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

// 获取 highlightCode 函数（通过渲染 code 组件间接测试）
// highlightCode 在 basic.js 内部，我们通过 registerBasicComponents 导出后的 renderer 测试
const { registerBasicComponents } = require('../src/components/basic.js');

function makeRenderer() {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  return rc;
}

test('JS: keyword highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'js' }, content: 'const x = 1;', children: [] });
  // 查找 code 子元素中的 span.tok-kw
  const codeEl = dom.querySelector('code');
  assert.ok(codeEl);
  const html = codeEl.innerHTML;
  assert.ok(html.indexOf('tok-kw') !== -1, 'Should contain tok-kw span for const');
  assert.ok(html.indexOf('tok-num') !== -1, 'Should contain tok-num span for 1');
});

test('JS: function call highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'js' }, content: 'console.log("hi");', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-fn') !== -1, 'Should contain tok-fn for log');
  assert.ok(html.indexOf('tok-str') !== -1, 'Should contain tok-str for "hi"');
});

test('JS: comment highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'js' }, content: '// this is a comment\nvar x = 1;', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-cmt') !== -1, 'Should contain tok-cmt for // comment');
  assert.ok(html.indexOf('tok-kw') !== -1, 'Should contain tok-kw for var');
});

test('Python: keyword and type highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'py' }, content: 'class Foo:\n    def bar(self):\n        return True', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-kw') !== -1, 'Should contain tok-kw for class/def/return');
  assert.ok(html.indexOf('tok-type') !== -1, 'Should contain tok-type for True');
});

test('Python: # comment highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'py' }, content: '# comment\nx = 1', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-cmt') !== -1, 'Should contain tok-cmt for # comment');
});

test('HTML: tags and attributes highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'html' }, content: '<div class="app">text</div>', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-kw') !== -1, 'Should contain tok-kw for tag names');
  assert.ok(html.indexOf('tok-type') !== -1, 'Should contain tok-type for attributes');
});

test('JSON: keys and values highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'json' }, content: '{"name": "test", "count": 42}', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-type') !== -1, 'Should contain tok-type for JSON keys');
  assert.ok(html.indexOf('tok-str') !== -1, 'Should contain tok-str for string values');
  assert.ok(html.indexOf('tok-num') !== -1, 'Should contain tok-num for numeric values');
});

test('SQL: keywords case-insensitive', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'sql' }, content: 'SELECT * FROM users WHERE id = 1;', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-kw') !== -1, 'Should contain tok-kw for SQL keywords');
});

test('unknown lang: plain text fallback', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'unknown' }, content: 'hello world', children: [] });
  const codeEl = dom.querySelector('code');
  // 无高亮，应为纯文本
  assert.strictEqual(codeEl.textContent, 'hello world');
  assert.ok(!codeEl.innerHTML || codeEl.innerHTML.indexOf('tok-') === -1, 'Should have no token spans');
});

test('no lang: plain text fallback', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: {}, content: 'plain text', children: [] });
  const codeEl = dom.querySelector('code');
  assert.strictEqual(codeEl.textContent, 'plain text');
});

test('empty code: no crash', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'js' }, content: '', children: [] });
  assert.ok(dom.querySelector('code'));
});

test('HTML special chars escaped', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'js' }, content: 'var x = a < b && c > d;', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('&lt;') !== -1, '< should be escaped');
  assert.ok(html.indexOf('&gt;') !== -1, '> should be escaped');
});

test('streaming mode: children joined then highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({
    type: 'code', attrs: { lang: 'js' },
    children: [
      { type: '_text', content: 'const ' },
      { type: '_text', content: 'x = 1;' }
    ]
  });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-kw') !== -1, 'Should highlight keyword in streaming content');
});

test('CSS: properties and selectors highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'css' }, content: '.app { color: red; }', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-kw') !== -1 || html.indexOf('tok-type') !== -1, 'Should highlight CSS props or selectors');
});

test('Bash: # comment highlighted', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'code', attrs: { lang: 'bash' }, content: '#!/bin/bash\necho hello', children: [] });
  const html = dom.querySelector('code').innerHTML;
  assert.ok(html.indexOf('tok-cmt') !== -1, 'Should contain tok-cmt for # comment');
});

run();
