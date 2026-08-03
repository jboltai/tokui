'use strict';

// preview-group 图片预览组（Phase 4）
var assert = require('assert');
var { setupDOM, teardownDOM, createElement } = require('./helpers/dom-mock');

setupDOM();
global.document._body = createElement('body');
global.document.body = global.document._body;
global.requestAnimationFrame = function (fn) { return fn && fn({}); };
if (typeof global.window === 'undefined') global.window = global;
global.addEventListener = global.addEventListener || function () {};
global.removeEventListener = global.removeEventListener || function () {};
global.window.innerWidth = 1024;

// 灯箱单例打桩：preview-group 点击只验证「带整组 src 列表调 open」，不测灯箱本体
var lbMod = require('../src/components/lightbox');
var opened = [];
lbMod.getLightbox = function () {
  return { open: function (src, list) { opened.push({ src: src, list: list }); } };
};

var TokUIRenderer = require('../src/core/renderer').TokUIRenderer;
var registerLayoutComponents = require('../src/components/layout').registerLayoutComponents;
var registerBasicComponents = require('../src/components/basic').registerBasicComponents;
require('../src/core/i18n').setLocale('zh-CN');

function makeRenderer() {
  var rc = new TokUIRenderer();
  registerBasicComponents(rc);
  registerLayoutComponents(rc);
  return rc;
}
function node(type, attrs, children) {
  return { type: type, attrs: attrs || {}, content: '', children: children || [] };
}
function fire(el, type, evt) {
  var fns = (el._events && el._events[type]) || [];
  evt = evt || {};
  if (!evt.target) evt.target = el;
  if (!evt.stopPropagation) evt.stopPropagation = function () {};
  if (!evt.preventDefault) evt.preventDefault = function () {};
  fns.forEach(function (fn) { fn(evt); });
}

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }
function run() {
  var passed = 0, failed = 0;
  for (var t of tests) {
    try { t.fn(); passed++; console.log('  ✓ ' + t.name); }
    catch (e) { failed++; console.log('  ✗ ' + t.name + '\n    ' + e.message); }
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
  if (failed > 0) process.exit(1);
}

test('preview-group: 渲染容器与子图', () => {
  var rc = makeRenderer();
  var dom = rc.render(node('preview-group', { id: 'pg1' }, [
    node('img', { s: 'a.png' }),
    node('img', { s: 'b.png' })
  ]));
  assert.strictEqual(dom._tokuiType, 'preview-group');
  assert.strictEqual(dom.id, 'pg1');
  assert.strictEqual(dom.getAttribute('aria-label'), '图片预览组');
  assert.strictEqual(dom.querySelectorAll('.tokui-img').length, 2);
});

test('preview-group: 点击图 → 灯箱带整组 src 列表', () => {
  opened = [];
  var rc = makeRenderer();
  var dom = rc.render(node('preview-group', {}, [
    node('img', { s: 'a.png' }),
    node('img', { s: 'b.png' }),
    node('img', { s: 'c.png' })
  ]));
  var imgs = dom.querySelectorAll('.tokui-img');
  fire(imgs[1], 'click');
  // mock 无 cloneNode：img 自带单图监听与组绑监听并存（浏览器经 clone 摘除，仅组绑生效），
  // 故断言「带整组列表」的那次 open
  var groupOpens = opened.filter(function (o) { return o.list && o.list.length === 3; });
  assert.strictEqual(groupOpens.length, 1);
  assert.strictEqual(groupOpens[0].src, 'b.png');
  assert.deepStrictEqual(groupOpens[0].list, ['a.png', 'b.png', 'c.png']);
});

test('preview-group: 重复绑定防护（_pgBound）', () => {
  opened = [];
  var rc = makeRenderer();
  var dom = rc.render(node('preview-group', {}, [node('img', { s: 'a.png' })]));
  var img = dom.querySelectorAll('.tokui-img')[0];
  assert.strictEqual(img._pgBound, true);
  fire(img, 'click');
  fire(img, 'click');
  // 组绑监听只挂一次：每次 click 恰好一次组 open（无叠加翻倍）
  var groupOpens = opened.filter(function (o) { return o.list && o.list.length === 1; });
  assert.strictEqual(groupOpens.length, 2);
});

test('preview-group: 流式 closeHook 后新图入列表', () => {
  opened = [];
  var rc = makeRenderer();
  var dom = rc.render(node('preview-group', {}, [node('img', { s: 'a.png' })]));
  // 模拟流式后到的子图
  var late = rc.render(node('img', { s: 'late.png' }));
  dom.appendChild(late);
  dom._streamCloseHook();
  var imgs = dom.querySelectorAll('.tokui-img');
  fire(imgs[1], 'click');
  var groupOpens = opened.filter(function (o) { return o.list && o.list.indexOf('late.png') !== -1; });
  assert.strictEqual(groupOpens.length, 1);
  assert.deepStrictEqual(groupOpens[0].list, ['a.png', 'late.png']);
});

test('imgs: cloneNode 缺失环境（mock）退化直接绑定', () => {
  opened = [];
  var rc = makeRenderer();
  // dom-mock 无 cloneNode：imgs 应走守卫分支不炸
  var dom = rc.render(node('imgs', { s: 'x.png,y.png' }));
  var imgs = dom.querySelectorAll('.tokui-img');
  assert.strictEqual(imgs.length, 2);
  fire(imgs[0], 'click');
  assert.ok(opened.some(function (o) { return o.src === 'x.png'; }));
});

run();

teardownDOM();
