'use strict';

var assert = require('assert');

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }
function run() {
  var passed = 0, failed = 0;
  tests.forEach(function(t) {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + e.message); }
  });
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}

// ===== Parser tests =====
var { TokUIParser, CONTAINERS } = require('../src/core/parser');

test('toggle-group is in CONTAINERS set', function() {
  assert.strictEqual(CONTAINERS.has('toggle-group'), true);
});

test('parse single toggle with chk attribute', function() {
  var nodes = [];
  var parser = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  parser.parse('[toggle tx:"粗体" clk:onBold chk]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'toggle');
  assert.strictEqual(nodes[0].attrs.tx, '粗体');
  assert.strictEqual(nodes[0].attrs.clk, 'onBold');
  assert.strictEqual(nodes[0].attrs.chk, true);
});

test('parse toggle-group container with children', function() {
  var nodes = [];
  var parser = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  parser.parse('[toggle-group clk:onFormat multi][toggle tx:"B" clk:bold][toggle tx:"I" clk:italic chk][/toggle-group]');
  // Should produce one root node (toggle-group) with children
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].type, 'toggle-group');
  assert.strictEqual(nodes[0].attrs.multi, true);
  assert.strictEqual(nodes[0].attrs.clk, 'onFormat');
  assert.ok(Array.isArray(nodes[0].children));
  assert.strictEqual(nodes[0].children.length, 2);
  assert.strictEqual(nodes[0].children[0].type, 'toggle');
  assert.strictEqual(nodes[0].children[0].attrs.tx, 'B');
  assert.strictEqual(nodes[0].children[1].attrs.tx, 'I');
  assert.strictEqual(nodes[0].children[1].attrs.chk, true);
});

test('parse toggle with size attribute', function() {
  var nodes = [];
  var parser = new TokUIParser(function(n) { nodes.push(n); }, { streaming: false });
  parser.parse('[toggle tx:"Small" s:sm]');
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].attrs.s, 'sm');
});

// ===== Builder tests =====
var { TokUIBuilder } = require('../src/server/tokui-builder');

test('builder toggle() produces correct DSL', function() {
  var b = new TokUIBuilder();
  b.toggle({ tx: '粗体', clk: 'onBold', chk: true });
  assert.strictEqual(b.toString(), '[toggle tx:粗体 clk:onBold chk]');
});

test('builder toggleGroup() with children produces correct DSL', function() {
  var b = new TokUIBuilder();
  b.toggleGroup({ clk: 'onFormat', multi: true })
    .toggle({ tx: 'B', clk: 'bold' })
    .toggle({ tx: 'I', clk: 'italic', chk: true })
    .toggle({ tx: 'U', clk: 'underline' })
  .end();
  assert.strictEqual(b.toString(), '[toggle-group clk:onFormat multi][toggle tx:B clk:bold][toggle tx:I clk:italic chk][toggle tx:U clk:underline][/toggle-group]');
});

test('builder toggle() with size attribute', function() {
  var b = new TokUIBuilder();
  b.toggle({ tx: 'Sm', s: 'sm' });
  assert.strictEqual(b.toString(), '[toggle tx:Sm s:sm]');
});

test('builder toggleGroup() single-select (no multi)', function() {
  var b = new TokUIBuilder();
  b.toggleGroup({ clk: 'onAlign' })
    .toggle({ tx: 'L', clk: 'alignLeft' })
    .toggle({ tx: 'C', clk: 'alignCenter', chk: true })
    .toggle({ tx: 'R', clk: 'alignRight' })
  .end();
  assert.strictEqual(b.toString(), '[toggle-group clk:onAlign][toggle tx:L clk:alignLeft][toggle tx:C clk:alignCenter chk][toggle tx:R clk:alignRight][/toggle-group]');
});

test('builder toggle() with quoted text', function() {
  var b = new TokUIBuilder();
  b.toggle({ tx: 'Bold Text', clk: 'bold' });
  assert.strictEqual(b.toString(), '[toggle tx:"Bold Text" clk:bold]');
});

run();
