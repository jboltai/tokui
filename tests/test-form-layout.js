/**
 * TokUI 表单布局属性测试套件（M2 / T2.2）
 * form cols(1-4 网格) / lw(标签统一宽) / gap / v:inline(行内) / 字段 v:full(整行)。
 */
'use strict';

const assert = require('assert');
const { setupDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const eventBus = require('../src/core/event-bus');
const { registerFormComponents } = require('../src/components/form');
const { registerBasicComponents } = require('../src/components/basic');
const { TokUIParser } = require('../src/core/parser');
const { VARIANTS } = require('../src/core/renderer');

const tests = [];
let passed = 0;
let failed = 0;
function test(name, fn) { tests.push({ name, fn }); }
function run() {
  for (const t of tests) {
    try { t.fn(); passed++; console.log(`  ✓ ${t.name}`); }
    catch (e) { failed++; console.log(`  ✗ ${t.name}\n    ${e.message}`); }
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

function makeRenderer() {
  const r = new TokUIRenderer(eventBus);
  registerBasicComponents(r);
  registerFormComponents(r);
  return r;
}

function parseTop(dsl) {
  const nodes = [];
  new TokUIParser(n => nodes.push(n)).parse(dsl);
  return nodes;
}

function renderDsl(dsl) {
  const nodes = parseTop(dsl);
  assert.ok(nodes.length, 'DSL 应解析出节点');
  return makeRenderer().render(nodes[0]);
}

function findCls(root, cls) {
  if (root.nodeType !== 1) return null;
  if ((root.className || '').split(' ').indexOf(cls) !== -1) return root;
  for (const c of (root.childNodes || [])) {
    const f = findCls(c, cls);
    if (f) return f;
  }
  return null;
}

// ============ cols 网格 ============

test('cols:2 → grid 类 + CSS 变量；字段逐格落位', () => {
  const dom = renderDsl('[form cols:2 sub:s][input n:a l:姓名][input n:b l:部门][input n:c l:邮箱][/form]');
  assert.ok((dom.className || '').split(' ').indexOf('tokui-form--grid') !== -1);
  assert.strictEqual(dom.style.getPropertyValue('--tokui-form-cols'), '2');
  const fields = dom.querySelectorAll('.tokui-field');
  assert.strictEqual(fields.length, 3, '三字段');
  assert.strictEqual(fields[0].parentNode, dom, '字段为 form 直接子元素（grid 格）');
});

test('cols 非法值静默忽略（0/5/abc 均不落 grid 类）', () => {
  for (const bad of ['0', '5', 'abc', '']) {
    const dom = renderDsl('[form cols:' + bad + '][input n:a][/form]');
    assert.ok(!(dom.className || '').split(' ').includes('tokui-form--grid'), 'cols:' + bad + ' 应忽略');
  }
});

test('cols:1~4 全档位合法', () => {
  for (const c of ['1', '2', '3', '4']) {
    const dom = renderDsl('[form cols:' + c + '][input n:a][/form]');
    assert.strictEqual(dom.style.getPropertyValue('--tokui-form-cols'), c);
  }
});

// ============ lw / gap ============

test('lw 标签统一宽落变量；非法值忽略', () => {
  const dom = renderDsl('[form lw:120][input n:a l:姓名][/form]');
  assert.strictEqual(dom.style.getPropertyValue('--tokui-form-label-w'), '120px');
  const bad = renderDsl('[form lw:10][input n:a][/form]');
  assert.ok(!bad.style.getPropertyValue('--tokui-form-label-w'), 'lw <40 忽略');
});

test('gap 落变量；非法值忽略', () => {
  const dom = renderDsl('[form cols:2 gap:16][input n:a][/form]');
  assert.strictEqual(dom.style.getPropertyValue('--tokui-form-gap'), '16px');
  const bad = renderDsl('[form gap:99][input n:a][/form]');
  assert.ok(!bad.style.getPropertyValue('--tokui-form-gap'), 'gap >48 忽略');
});

// ============ v:inline 与互斥 ============

test('v:inline → 行内类（VARIANTS 白名单生效）', () => {
  assert.ok(VARIANTS.form.has('inline'), 'form:inline 入白名单');
  const dom = renderDsl('[form v:inline][input n:a l:姓名][btn tx:查询 t:primary][/form]');
  assert.ok((dom.className || '').split(' ').indexOf('tokui-form--inline') !== -1);
});

test('cols 与 v:inline 同写 → 两类同挂，CSS 顺序保 grid 优先（行为契约）', () => {
  const dom = renderDsl('[form cols:2 v:inline][input n:a][/form]');
  const cls = (dom.className || '').split(' ');
  assert.ok(cls.indexOf('tokui-form--grid') !== -1, 'grid 类在');
  assert.ok(cls.indexOf('tokui-form--inline') !== -1, 'inline 类在');
  // 契约由 CSS 源顺序保证：grid 规则声明在 inline 之后
  const css = require('fs').readFileSync(require('path').join(__dirname, '../src/styles/tokui.css'), 'utf8');
  assert.ok(css.indexOf('.tokui-form--inline') < css.indexOf('.tokui-form--grid'),
    'CSS 中 .tokui-form--grid 必须在 .tokui-form--inline 之后（同为单类选择器，后者胜出）');
});

// ============ 字段 v:full ============

test('input v:full → 白名单类落控件本体（供 :has() 跨行）', () => {
  assert.ok(VARIANTS.input.has('full'));
  const dom = renderDsl('[form cols:2][input n:a l:备注 v:full][/form]');
  const input = findCls(dom, 'tokui-input');
  assert.ok(input, 'input 存在');
  assert.ok((input.className || '').split(' ').indexOf('tokui-input--full') !== -1, 'full 类落控件');
});

test('v:full 白名单覆盖全部常用字段类型', () => {
  ['pwd', 'select', 'textarea', 'numinput', 'picker', 'cascader', 'transfer', 'upload',
   'datepicker', 'timepicker', 'datetimepicker'].forEach(t => {
    assert.ok(VARIANTS[t] && VARIANTS[t].has('full'), t + ' 应支持 v:full');
  });
});

test('普通字段不带 full 类（无误伤）', () => {
  const dom = renderDsl('[form cols:2][input n:a l:姓名][/form]');
  assert.ok(!findCls(dom, 'tokui-input--full'));
});

// ============ 组合与既有行为不回退 ============

test('无布局属性时保持原 flex 纵列（无 grid/inline 类）', () => {
  const dom = renderDsl('[form][input n:a][/form]');
  const cls = (dom.className || '').split(' ');
  assert.ok(cls.indexOf('tokui-form--grid') === -1);
  assert.ok(cls.indexOf('tokui-form--inline') === -1);
});

test('form 布局属性 + sub/校验共存不干扰', () => {
  const dom = renderDsl('[form cols:2 sub:save][input n:a l:姓名 req][input n:b l:邮箱 pat:"[^@]+@[^@]+" req][/form]');
  assert.strictEqual(dom.getAttribute('data-tokui-sub'), 'save');
  assert.ok(dom.querySelector('.tokui-label--req'), '必填标记保留');
});

test('流式：分片 feed 表单字段逐格落位', () => {
  const TokUI = require('../src/index.js');
  const { createElement } = require('./helpers/dom-mock');
  const container = createElement('div');
  const ui = new TokUI({ container });
  ui.startStream();
  const dsl = '[form cols:2 lw:100 gap:16][input n:a l:姓名 req][input n:b l:部门][/form]';
  for (let i = 0; i < dsl.length; i += 9) ui.feed(dsl.slice(i, i + 9));
  ui.endStream();
  const form = findCls(container, 'tokui-form');
  assert.ok(form);
  assert.strictEqual(form.style.getPropertyValue('--tokui-form-cols'), '2');
  assert.strictEqual(form.querySelectorAll('.tokui-field').length, 2);
});

run();
