'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
const { TokUIRenderer } = require('../src/core/renderer');

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

test('error boundary: single component error returns details element', () => {
  const rc = new TokUIRenderer();
  rc.register('broken', () => { throw new Error('test crash'); });
  const dom = rc.render({ type: 'broken', attrs: {}, children: [] });
  assert.strictEqual(dom._rawTag, 'details');
  assert.ok(dom.className.indexOf('tokui-error') !== -1);
});

test('error boundary: contains summary with component type', () => {
  const rc = new TokUIRenderer();
  rc.register('broken', () => { throw new Error('oops'); });
  const dom = rc.render({ type: 'broken', attrs: {}, children: [] });
  const summary = dom.querySelector('summary');
  assert.ok(summary);
  assert.ok(summary.textContent.indexOf('broken') !== -1);
});

test('error boundary: contains detail div with error message', () => {
  const rc = new TokUIRenderer();
  rc.register('failing', () => { throw new Error('something went wrong'); });
  const dom = rc.render({ type: 'failing', attrs: {}, children: [] });
  // Find the error detail div - it's the second child of details
  var found = false;
  dom.childNodes.forEach(function(child) {
    if (child._rawTag === 'div' && child.textContent && child.textContent.indexOf('something went wrong') !== -1) {
      found = true;
    }
  });
  assert.ok(found, 'error detail should contain error message');
});

test('error boundary: does not block subsequent sibling rendering', () => {
  const rc = new TokUIRenderer();
  rc.register('broken', () => { throw new Error('fail'); });
  rc.register('ok', () => {
    const d = document.createElement('div');
    d.className = 'tokui-ok';
    d.textContent = 'I work';
    return d;
  });
  const dom1 = rc.render({ type: 'broken', attrs: {}, children: [] });
  const dom2 = rc.render({ type: 'ok', attrs: {}, children: [] });
  assert.ok(dom1.className.indexOf('tokui-error') !== -1);
  assert.ok(dom2.className.indexOf('tokui-ok') !== -1);
});

test('error boundary: onError callback fires', () => {
  const rc = new TokUIRenderer();
  rc.register('broken', () => { throw new Error('bang'); });
  let caught = null;
  rc.onError((type, err, node) => { caught = { type, err, node }; });
  rc.render({ type: 'broken', attrs: { x: 1 }, children: [] });
  assert.ok(caught);
  assert.strictEqual(caught.type, 'broken');
  assert.strictEqual(caught.err.message, 'bang');
  assert.strictEqual(caught.node.attrs.x, 1);
});

test('error boundary: onError itself throws does not break render', () => {
  const rc = new TokUIRenderer();
  rc.register('broken', () => { throw new Error('a'); });
  rc.onError(() => { throw new Error('callback crash'); });
  const dom = rc.render({ type: 'broken', attrs: {}, children: [] });
  assert.ok(dom.className.indexOf('tokui-error') !== -1);
});

test('error boundary: nested container parent renders normally', () => {
  const rc = new TokUIRenderer();
  rc.register('outer', (node, rc) => {
    const div = document.createElement('div');
    div.className = 'tokui-outer';
    rc(node.children || []).forEach(c => { if (c && c.nodeType) div.appendChild(c); });
    div._slot = div;
    div._tokuiType = 'outer';
    return div;
  });
  rc.register('broken', () => { throw new Error('child fail'); });
  const dom = rc.render({
    type: 'outer', attrs: {}, children: [
      { type: 'broken', attrs: {}, children: [] }
    ]
  });
  assert.ok(dom.className.indexOf('tokui-outer') !== -1);
  // Error should be inside the outer container - check for details element with tokui-error
  var errEl = dom.querySelector('details');
  assert.ok(errEl, 'should find a details element');
  assert.ok(errEl.className.indexOf('tokui-error') !== -1);
});

test('error boundary: text nodes still work after error', () => {
  const rc = new TokUIRenderer();
  rc.register('broken', () => { throw new Error('fail'); });
  const textNode = rc.render({ type: '_text', content: 'hello' });
  assert.strictEqual(textNode.nodeType, 3);
  assert.strictEqual(textNode.textContent, 'hello');
});

run();
