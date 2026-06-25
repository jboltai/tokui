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

run();
