/**
 * TokUI 表单组件测试
 * 覆盖：form、select、radio、checkbox、switch、slider、rate、
 *       transfer、cascader、upload、textarea、input-tag
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const TokUIEventBus = require('../src/core/event-bus');
const { registerFormComponents } = require('../src/components/form');
const { registerBasicComponents } = require('../src/components/basic');

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
  const rc = new TokUIRenderer(TokUIEventBus);
  registerFormComponents(rc);
  registerBasicComponents(rc);
  return rc;
}

// === form 容器 ===
test('form renders form element with action/method', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'form', attrs: { id: 'f1', act: '/api', mtd: 'post', sub: 'onSubmit' }, children: [] });
  assert.strictEqual(dom.tagName, 'FORM');
  assert.strictEqual(dom.getAttribute('action'), '/api');
  assert.strictEqual(dom.getAttribute('method'), 'post');
  assert.strictEqual(dom.getAttribute('data-tokui-sub'), 'onSubmit');
});

test('form blocks javascript: action', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'form', attrs: { act: 'javascript:alert(1)' }, children: [] });
  assert.strictEqual(dom.getAttribute('action'), '#');
});

test('form renders children', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'form', attrs: {}, children: [
    { type: 'input', attrs: { ph: 'name' }, children: [] }
  ]});
  const input = dom.querySelector('.tokui-input');
  assert.notStrictEqual(input, null);
});

// === select ===
test('select renders select element with options', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'select', attrs: { l: 'City', id: 'city' }, children: [
    { type: 'opt', attrs: { v: 'bj', tx: 'Beijing' }, children: [] },
    { type: 'opt', attrs: { v: 'sh', tx: 'Shanghai' }, children: [] }
  ]});
  const select = dom.querySelector('select');
  assert.notStrictEqual(select, null);
  assert.strictEqual(select.querySelectorAll('option').length, 2);
  assert.strictEqual(select.querySelectorAll('option')[0].getAttribute('value'), 'bj');
});

test('select multi adds multiple attribute', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'select', attrs: { multi: true }, children: [] });
  const select = dom.querySelector('select');
  assert.strictEqual(select.hasAttribute('multiple'), true);
});

test('select placeholder creates disabled option', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'select', attrs: { ph: '请选择' }, children: [] });
  const ph = dom.querySelector('option');
  assert.strictEqual(ph.getAttribute('disabled'), '');
  assert.strictEqual(ph.textContent, '请选择');
});

// === radio ===
test('radio renders radiogroup with radio inputs', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'radio', attrs: { l: 'Gender', n: 'gender' }, children: [
    { type: 'opt', attrs: { v: 'm', tx: 'Male' }, children: [] },
    { type: 'opt', attrs: { v: 'f', tx: 'Female' }, children: [] }
  ]});
  const group = dom.querySelector('[role="radiogroup"]');
  assert.notStrictEqual(group, null);
  const inputs = group.querySelectorAll('input[type="radio"]');
  assert.strictEqual(inputs.length, 2);
  assert.strictEqual(inputs[0].getAttribute('name'), 'gender');
});

test('radio checked opt sets checked attribute', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'radio', attrs: {}, children: [
    { type: 'opt', attrs: { v: 'a', tx: 'A', chk: true }, children: [] }
  ]});
  const input = dom.querySelector('input[type="radio"]');
  assert.strictEqual(input.getAttribute('checked'), 'checked');
});

// === checkbox ===
test('checkbox renders label with checkbox input', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'checkbox', attrs: { l: '同意', id: 'agree' }, children: [] });
  assert.strictEqual(dom.tagName, 'DIV');
  assert.strictEqual(dom.className, 'tokui-field');
  const label = dom.querySelector('label.tokui-checkbox');
  assert.strictEqual(label.tagName, 'LABEL');
  const input = dom.querySelector('input[type="checkbox"]');
  assert.notStrictEqual(input, null);
  assert.strictEqual(dom.querySelector('.tokui-checkbox-text').textContent, '同意');
});

test('checkbox chk attribute sets checked', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'checkbox', attrs: { l: 'A', chk: true }, children: [] });
  assert.strictEqual(dom.querySelector('input').getAttribute('checked'), 'checked');
});

// === switch ===
test('switch renders with track and hidden input', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'switch', attrs: { id: 'sw', n: 'enable' }, children: [] });
  const input = dom.querySelector('input[type="checkbox"]');
  assert.notStrictEqual(input, null);
  const track = dom.querySelector('.tokui-switch__track');
  assert.notStrictEqual(track, null);
});

test('switch dis sets disabled', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'switch', attrs: { dis: true }, children: [] });
  const input = dom.querySelector('input[type="checkbox"]');
  assert.strictEqual(input.getAttribute('disabled'), 'disabled');
});

test('switch _update toggles checked', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'switch', attrs: { id: 'sw' }, children: [] });
  const input = dom.querySelector('input[type="checkbox"]');
  assert.strictEqual(!!input.checked, false);
  dom._update({ chk: true });
  assert.strictEqual(input.checked, true);
  dom._update({ chk: false });
  assert.strictEqual(input.checked, false);
});

// === slider ===
test('slider renders track, fill, thumb, value display', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'slider', attrs: { l: 'Volume', v: '50', id: 'vol' }, children: [] });
  assert.notStrictEqual(dom.querySelector('.tokui-slider'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-slider__track'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-slider__thumb'), null);
  assert.strictEqual(dom.querySelector('.tokui-slider__value').textContent, '50');
});

test('slider respects min/max and clamps value', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'slider', attrs: { min: '10', max: '90', v: '5' }, children: [] });
  // v=5 < min=10, should clamp to 10
  assert.strictEqual(dom.querySelector('.tokui-slider__value').textContent, '10');
  const hidden = dom.querySelector('input[type="hidden"]');
  assert.strictEqual(String(hidden.value), '10');
});

test('slider dis adds disabled class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'slider', attrs: { dis: true }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-slider--disabled') !== null, true);
});

// === rate ===
test('rate renders correct number of stars', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'rate', attrs: { max: '5', v: '3' }, children: [] });
  const stars = dom.querySelectorAll('.tokui-rate__star');
  assert.strictEqual(stars.length, 5);
  assert.strictEqual(dom.querySelector('.tokui-rate__text').textContent, '3/5');
});

test('rate custom character', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'rate', attrs: { max: '3', v: '2', tx: '♥' }, children: [] });
  const stars = dom.querySelectorAll('.tokui-rate__star');
  assert.strictEqual(stars[0].textContent, '♥');
  assert.strictEqual(stars[2].textContent, '☆');
});

test('rate disabled adds disabled class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'rate', attrs: { dis: true }, children: [] });
  assert.notStrictEqual(dom.querySelector('.tokui-rate--disabled'), null);
});

// === textarea ===
test('textarea renders textarea element', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'textarea', attrs: { l: 'Desc', id: 'desc', ph: '输入...' }, children: [] });
  const ta = dom.querySelector('textarea');
  assert.notStrictEqual(ta, null);
  assert.strictEqual(ta.getAttribute('placeholder'), '输入...');
});

test('textarea content from tx attribute', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'textarea', attrs: { tx: 'hello' }, children: [] });
  assert.strictEqual(dom.querySelector('textarea').textContent, 'hello');
});

test('textarea auto adds auto class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'textarea', attrs: { auto: true }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-textarea--auto') !== null, true);
});

test('textarea maxlen creates counter', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'textarea', attrs: { maxlen: '100', tx: 'test' }, children: [] });
  const counter = dom.querySelector('.tokui-textarea-counter');
  assert.notStrictEqual(counter, null);
  assert.strictEqual(counter.textContent, '4/100');
});

// === transfer ===
test('transfer renders two panels with actions', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'transfer', attrs: { l: 'Transfer', tt: 'A', tt2: 'B' }, children: [
    { type: 'opt', attrs: { v: '1', tx: 'Item 1' }, children: [] },
    { type: 'opt', attrs: { v: '2', tx: 'Item 2', chk: true }, children: [] }
  ]});
  const panels = dom.querySelectorAll('.tokui-transfer__panel');
  assert.strictEqual(panels.length, 2);
  const actions = dom.querySelectorAll('.tokui-transfer__btn');
  assert.strictEqual(actions.length, 2);
});

test('transfer chk items go to right panel', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'transfer', attrs: {}, children: [
    { type: 'opt', attrs: { v: '1', tx: 'A' }, children: [] },
    { type: 'opt', attrs: { v: '2', tx: 'B', chk: true }, children: [] }
  ]});
  const panels = dom.querySelectorAll('.tokui-transfer__panel');
  // Left panel: 1 item, Right panel: 1 item
  var leftItems = panels[0].querySelectorAll('.tokui-transfer__item');
  var rightItems = panels[1].querySelectorAll('.tokui-transfer__item');
  assert.strictEqual(leftItems.length, 1);
  assert.strictEqual(rightItems.length, 1);
});

// === cascader ===
test('cascader renders control input and menus container', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'cascader', attrs: { l: 'Region', id: 'region' }, children: [
    { type: 'opt', attrs: { v: 'zj', tx: '浙江' }, children: [] },
    { type: 'opt', attrs: { v: 'hz', tx: '杭州', p: 'zj' }, children: [] }
  ]});
  assert.notStrictEqual(dom.querySelector('.tokui-cascader'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-cascader-input'), null);
  assert.notStrictEqual(dom.querySelector('.tokui-cascader-menus'), null);
});

test('cascader dis adds disabled class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'cascader', attrs: { dis: true }, children: [] });
  assert.notStrictEqual(dom.querySelector('.tokui-cascader--disabled'), null);
});

// === upload ===
test('upload renders dropzone with file input', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'upload', attrs: { l: 'File', ph: 'Upload here' }, children: [] });
  assert.notStrictEqual(dom.querySelector('.tokui-upload-dropzone'), null);
  assert.notStrictEqual(dom.querySelector('input[type="file"]'), null);
  assert.strictEqual(dom.querySelector('.tokui-upload-text').textContent, 'Upload here');
});

test('upload multi sets multiple attribute on file input', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'upload', attrs: { multi: true }, children: [] });
  assert.strictEqual(dom.querySelector('input[type="file"]').getAttribute('multiple'), 'multiple');
});

test('upload dis adds disabled class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'upload', attrs: { dis: true }, children: [] });
  assert.notStrictEqual(dom.querySelector('.tokui-upload--disabled'), null);
});

// === input-tag ===
test('input-tag renders wrapper with input', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input-tag', attrs: { id: 'tags', ph: 'Add tag' }, children: [] });
  assert.strictEqual(dom.className.indexOf('tokui-input-tag') >= 0, true);
  assert.notStrictEqual(dom.querySelector('.tokui-input-tag__input'), null);
});

// === numinput ===
test('numinput renders with +/- buttons', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'numinput', attrs: { v: '5' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-numinput__input').getAttribute('value'), '5');
  assert.strictEqual(dom.querySelector('.tokui-numinput__btn--minus') !== null, true);
  assert.strictEqual(dom.querySelector('.tokui-numinput__btn--plus') !== null, true);
});

// === datepicker ===
test('datepicker renders field with input and hidden', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datepicker', attrs: { l: '日期', id: 'dp1' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-datepicker') !== null, true);
  assert.strictEqual(dom.querySelector('.tokui-datepicker-input') !== null, true);
  assert.strictEqual(dom.querySelector('input[type="hidden"]') !== null, true);
  assert.strictEqual(dom.querySelector('.tokui-label').textContent, '日期');
});

test('datepicker renders calendar icon', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datepicker', attrs: {}, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-datepicker-icon') !== null, true);
});

test('datepicker dis adds disabled class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datepicker', attrs: { dis: true }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-datepicker--disabled') !== null, true);
});

test('datepicker v sets input value', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datepicker', attrs: { v: '2025-06-15' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-datepicker-input').getAttribute('value'), '2025-06-15');
});

test('datepicker ph sets placeholder', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datepicker', attrs: { ph: '请选择日期' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-datepicker-input').getAttribute('placeholder'), '请选择日期');
});

test('datepicker renders dropdown with calendar grid', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datepicker', attrs: {}, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-datepicker-dropdown') !== null, true);
  assert.strictEqual(dom.querySelector('.tokui-datepicker-grid') !== null, true);
  assert.strictEqual(dom.querySelector('.tokui-datepicker-header') !== null, true);
});

test('datepicker renders weekday headers', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datepicker', attrs: {}, children: [] });
  const weekdays = dom.querySelectorAll('.tokui-datepicker-weekday');
  assert.strictEqual(weekdays.length, 7);
});

test('datepicker renders 42 day cells (6 rows)', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datepicker', attrs: {}, children: [] });
  const days = dom.querySelectorAll('.tokui-datepicker-day');
  assert.strictEqual(days.length, 42);
});

test('datepicker v with selected date marks cell', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datepicker', attrs: { v: '2025-06-15' }, children: [] });
  const selected = dom.querySelector('.tokui-datepicker-day--selected');
  assert.strictEqual(selected !== null, true);
  assert.strictEqual(selected.getAttribute('data-day'), '15');
});

// === timepicker ===
test('timepicker renders field with input', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'timepicker', attrs: { l: '时间', id: 'tp1' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-timepicker') !== null, true);
  assert.strictEqual(dom.querySelector('.tokui-timepicker-input') !== null, true);
  assert.strictEqual(dom.querySelector('.tokui-label').textContent, '时间');
});

test('timepicker renders clock icon', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'timepicker', attrs: {}, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-timepicker-icon') !== null, true);
});

test('timepicker dis adds disabled class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'timepicker', attrs: { dis: true }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-timepicker--disabled') !== null, true);
});

test('timepicker v sets input value', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'timepicker', attrs: { v: '14:30' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-timepicker-input').getAttribute('value'), '14:30');
});

test('timepicker renders time columns', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'timepicker', attrs: {}, children: [] });
  const columns = dom.querySelectorAll('.tokui-timepicker-column');
  assert.strictEqual(columns.length, 2); // hour + minute (no seconds by default)
});

test('timepicker with fmt HH:mm:ss renders 3 columns', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'timepicker', attrs: { fmt: 'HH:mm:ss' }, children: [] });
  const columns = dom.querySelectorAll('.tokui-timepicker-column');
  assert.strictEqual(columns.length, 3);
});

test('timepicker renders confirm button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'timepicker', attrs: {}, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-timepicker-confirm') !== null, true);
});

// === datetimepicker ===
test('datetimepicker renders field with input', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datetimepicker', attrs: { l: '日期时间', id: 'dtp1' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-datetimepicker') !== null, true);
  assert.strictEqual(dom.querySelector('.tokui-datetimepicker-input') !== null, true);
});

test('datetimepicker dis adds disabled class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datetimepicker', attrs: { dis: true }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-datetimepicker--disabled') !== null, true);
});

test('datetimepicker renders date and time sections', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datetimepicker', attrs: {}, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-datetimepicker-date') !== null, true);
  assert.strictEqual(dom.querySelector('.tokui-datetimepicker-time') !== null, true);
});

test('datetimepicker renders confirm button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'datetimepicker', attrs: {}, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-timepicker-confirm') !== null, true);
});

// === input 组件 ===
test('input renders with tokui-field wrapper', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: {}, children: [] });
  assert.strictEqual(dom.classList.contains('tokui-field'), true);
  assert.notStrictEqual(dom.querySelector('.tokui-input'), null);
});

test('input val attr sets initial value', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { val: 'hello' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-input').getAttribute('value'), 'hello');
});

test('input hint attr renders hint div', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { hint: '帮助文字' }, children: [] });
  const hint = dom.querySelector('.tokui-field__hint');
  assert.notStrictEqual(hint, null);
  assert.strictEqual(hint.textContent, '帮助文字');
});

test('input hint with error variant adds error class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { v: 'error', hint: '出错了' }, children: [] });
  assert.notStrictEqual(dom.querySelector('.tokui-field__hint--error'), null);
});

test('input hint with success variant adds success class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { v: 'success', hint: '验证通过' }, children: [] });
  assert.notStrictEqual(dom.querySelector('.tokui-field__hint--success'), null);
});

test('input w attr sets inline style width', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { w: '200px' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-input').style.width, '200px');
});

test('input _update sets value', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: {}, children: [] });
  dom._update({ v: 'new value' });
  assert.strictEqual(dom.querySelector('.tokui-input').value, 'new value');
});

test('input renders disabled', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { dis: true }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-input').getAttribute('disabled'), 'disabled');
});

test('input v:inline,sm adds inline class and sm variant', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { v: 'inline,sm', ph: 'test' }, children: [] });
  assert.strictEqual(dom.classList.contains('tokui-field--inline'), true);
  assert.strictEqual(dom.querySelector('.tokui-input').classList.contains('tokui-input--sm'), true);
});

test('input v:underline adds underline variant class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { v: 'underline' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-input').classList.contains('tokui-input--underline'), true);
});

// === pwd 组件 ===
test('pwd renders with type password', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: {}, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-input').getAttribute('type'), 'password');
});

test('pwd has _update method', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: {}, children: [] });
  assert.strictEqual(typeof dom._update, 'function');
});

test('pwd _update sets value', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: {}, children: [] });
  dom._update({ v: 'secret123' });
  assert.strictEqual(dom.querySelector('.tokui-input').value, 'secret123');
});

test('pwd _update toggles disabled', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: {}, children: [] });
  dom._update({ dis: true });
  assert.strictEqual(dom.querySelector('.tokui-input').disabled, true);
  dom._update({ dis: false });
  assert.strictEqual(dom.querySelector('.tokui-input').disabled, false);
});

test('pwd val attr sets initial value', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: { val: 'mypass' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-input').getAttribute('value'), 'mypass');
});

test('pwd hint attr renders hint', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: { hint: '至少8位' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-field__hint').textContent, '至少8位');
});

test('pwd w attr sets width', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: { w: '300px' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-input').style.width, '300px');
});

test('pwd toggle renders toggle button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: { toggle: true }, children: [] });
  assert.notStrictEqual(dom.querySelector('.tokui-pwd-toggle'), null);
});

test('pwd without toggle has no toggle button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: {}, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-pwd-toggle'), null);
});

test('pwd toggle disabled has no toggle button', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'pwd', attrs: { toggle: true, dis: true }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-pwd-toggle'), null);
});

test('input search wraps in tokui-search-input', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { search: true, ph: '搜索...' }, children: [] });
  assert.ok(dom.querySelector('.tokui-search-input'));
  assert.ok(dom.querySelector('.tokui-search-input__icon'));
  assert.ok(!dom.querySelector('.tokui-search-input--right'));
});

test('input search:right adds right class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { search: 'right', ph: '搜索...' }, children: [] });
  assert.ok(dom.querySelector('.tokui-search-input--right'));
});

test('input without search has no search wrapper', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { ph: '普通输入' }, children: [] });
  assert.strictEqual(dom.querySelector('.tokui-search-input'), null);
});

test('input v:pill adds pill variant class', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { v: 'pill', ph: '搜索...' }, children: [] });
  assert.ok(dom.querySelector('.tokui-input--pill'));
});

test('input search + pill combination', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { search: true, v: 'pill', ph: '搜索...' }, children: [] });
  assert.ok(dom.querySelector('.tokui-search-input'));
  assert.ok(dom.querySelector('.tokui-input--pill'));
});

test('input search + input-group appbtn', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { search: true, appbtn: 'Go|primary', ph: '搜索...' }, children: [] });
  assert.ok(dom.querySelector('.tokui-search-input'));
  assert.ok(dom.querySelector('.tokui-input-appbtn'));
});

test('btn 透传 data-* 属性到 DOM（fillSubmit 链路依赖）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'btn', attrs: { tx: '重试', clk: 'fillSubmit', 'data-prompt': '再详细说说' }, children: [] });
  assert.strictEqual(dom.tagName, 'BUTTON');
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'fillSubmit', 'clk → data-tokui-clk');
  assert.strictEqual(dom.getAttribute('data-prompt'), '再详细说说', 'data-prompt 必须透传到 DOM（fillSubmit handler 读取它）');
  assert.strictEqual(dom.textContent, '重试');
});

test('form 容器透传 clk/sub（表单提交链路依赖）', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'form', attrs: { clk: 'formSubmit' }, children: [] });
  assert.strictEqual(dom.tagName, 'FORM');
  assert.ok(dom.classList.contains('tokui-form'));
  assert.strictEqual(dom.getAttribute('data-tokui-clk'), 'formSubmit', 'form clk → data-tokui-clk（formSubmit handler 绑定依赖）');
});

// === opt 简写解析助手 ===
test('_parseOptShorthand: value:label 冒号分隔', () => {
  const { _parseOptShorthand } = require('../src/components/form');
  assert.deepStrictEqual(_parseOptShorthand('1:男;2:女'), [
    { v: '1', tx: '男' }, { v: '2', tx: '女' }
  ]);
});
test('_parseOptShorthand: 冒号可缺，v=tx=token', () => {
  const { _parseOptShorthand } = require('../src/components/form');
  assert.deepStrictEqual(_parseOptShorthand('1:篮球;2足球;3:羽毛球'), [
    { v: '1', tx: '篮球' }, { v: '2足球', tx: '2足球' }, { v: '3', tx: '羽毛球' }
  ]);
});
test('_parseOptShorthand: 空串/纯分隔返回 []', () => {
  const { _parseOptShorthand } = require('../src/components/form');
  assert.deepStrictEqual(_parseOptShorthand(''), []);
  assert.deepStrictEqual(_parseOptShorthand(';;'), []);
  assert.deepStrictEqual(_parseOptShorthand(null), []);
});

// === _expandOptChildren 助手（select/radio/checkbox 共用）===
test('_expandOptChildren: opt 属性合成 opt 子节点追加到 children', () => {
  const { _expandOptChildren } = require('../src/components/form');
  const node = { type: 'radio', attrs: { opt: '1:男;2:女' }, children: [] };
  const out = _expandOptChildren(node);
  assert.strictEqual(out.children.length, 2);
  assert.deepStrictEqual(out.children[0], { type: 'opt', attrs: { v: '1', tx: '男' } });
  assert.deepStrictEqual(out.children[1], { type: 'opt', attrs: { v: '2', tx: '女' } });
});
test('_expandOptChildren: 保留既有 children（合成项追加在末尾）', () => {
  const { _expandOptChildren } = require('../src/components/form');
  const existing = { type: 'opt', attrs: { v: 'a', tx: 'A' } };
  const node = { type: 'select', attrs: { opt: 'b:B' }, children: [existing] };
  const out = _expandOptChildren(node);
  assert.strictEqual(out.children.length, 2);
  assert.strictEqual(out.children[0], existing);
  assert.strictEqual(out.children[1].attrs.v, 'b');
});
test('_expandOptChildren: 无 opt 属性原样返回（同引用）', () => {
  const { _expandOptChildren } = require('../src/components/form');
  const node = { type: 'checkbox', attrs: { l: '同意' }, children: [] };
  assert.strictEqual(_expandOptChildren(node), node, '无 opt 应返回原对象');
});
test('_expandOptChildren: 不 mutate 原 node', () => {
  const { _expandOptChildren } = require('../src/components/form');
  const node = { type: 'radio', attrs: { opt: '1:男' }, children: [] };
  _expandOptChildren(node);
  assert.strictEqual(node.children.length, 0, '原 node.children 不被修改');
});

// === checkbox 多选（简写 + 容器）===
test('checkbox 单布尔回归：渲染单个 input', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'checkbox', attrs: { l: '同意' }, children: [] });
  const inputs = dom.querySelectorAll('input[type=checkbox]');
  assert.strictEqual(inputs.length, 1, '单个布尔 checkbox');
});
test('checkbox 简写多选：opt 展开为多个 input 共享 name', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'checkbox', attrs: { n: 'brand', opt: '1:篮球;2:足球;3:羽毛球' }, children: [] });
  const group = dom.querySelector('.tokui-checkbox-group');
  assert.ok(group, '渲染了 checkbox-group');
  const inputs = dom.querySelectorAll('input[type=checkbox][name=brand]');
  assert.strictEqual(inputs.length, 3, '展开 3 个 checkbox');
  assert.strictEqual(inputs[0].value, '1');
  assert.strictEqual(inputs[2].value, '3');
});
test('checkbox 容器多选：children 渲染为 input', () => {
  const rc = makeRenderer();
  const dom = rc.render({
    type: 'checkbox', attrs: { n: 'hobby' },
    children: [
      { type: 'opt', attrs: { v: 'a', tx: 'A', chk: true } },
      { type: 'opt', attrs: { v: 'b', tx: 'B' } }
    ]
  });
  const inputs = dom.querySelectorAll('input[type=checkbox][name=hobby]');
  assert.strictEqual(inputs.length, 2);
  assert.strictEqual(inputs[0].checked, true, 'chk 项默认选中');
  assert.strictEqual(inputs[1].checked, false);
});
test('checkbox 组：group._checkboxName 供流式注入', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'checkbox', attrs: { n: 'x', opt: '1:A;2:B' }, children: [] });
  const group = dom.querySelector('.tokui-checkbox-group');
  assert.strictEqual(group._checkboxName, 'x');
});
test('checkbox name 回退 id', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'checkbox', attrs: { id: 'cb1', opt: '1:A' }, children: [] });
  const inp = dom.querySelector('input[type=checkbox]');
  assert.strictEqual(inp.name, 'cb1');
});

// === radio / select 简写 ===
test('radio opt 简写：展开为多个 radio 共享 name', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'radio', attrs: { n: 'gender', opt: '1:男;2:女' }, children: [] });
  const inputs = dom.querySelectorAll('input[type=radio][name=gender]');
  assert.strictEqual(inputs.length, 2);
  assert.strictEqual(inputs[0].value, '1');
  assert.strictEqual(inputs[1].value, '2');
});
test('select opt 简写：展开为多个 option', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'select', attrs: { n: 'city', opt: 'bj:北京;sh:上海' }, children: [] });
  const opts = dom.querySelectorAll('option');
  assert.strictEqual(opts.length, 2);
  assert.strictEqual(opts[0].value, 'bj');
  assert.strictEqual(opts[0].textContent, '北京');
});

// === v:vertical 竖排左对齐变体 ===
test('radio v:vertical 加竖排修饰类', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'radio', attrs: { n: 'g', v: 'vertical', opt: '1:男;2:女' }, children: [] });
  const group = dom.querySelector('.tokui-radio-group');
  assert.ok(group, 'radio-group 存在');
  assert.ok(group.className.split(' ').indexOf('tokui-radio-group--vertical') >= 0, '应有 --vertical 类');
});
test('checkbox v:vertical 加竖排修饰类', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'checkbox', attrs: { n: 'h', v: 'vertical', opt: '1:A;2:B' }, children: [] });
  const group = dom.querySelector('.tokui-checkbox-group');
  assert.ok(group, 'checkbox-group 存在');
  assert.ok(group.className.split(' ').indexOf('tokui-checkbox-group--vertical') >= 0, '应有 --vertical 类');
});
test('radio 默认横排无 --vertical 类', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'radio', attrs: { n: 'g', opt: '1:男;2:女' }, children: [] });
  const group = dom.querySelector('.tokui-radio-group');
  assert.strictEqual(group.className.indexOf('tokui-radio-group--vertical'), -1, '默认无竖排类');
});

// === upd 指令派发：getElementById(id) → 向上找 _update 的组件根 ===
// 回归：slider/rate/numinput/input 把 id 挂在内层 input、_update 挂在外层 wrapper，
// upd handler 必须向上 walk 到 wrapper 才能命中 _update（旧实现直接取内层元素 → 静默失败）。
test('upd 派发 slider v 更新（id 在 hidden、_update 在 field）', () => {
  const rc = makeRenderer();
  rc.render({ type: 'slider', attrs: { id: 'upd-s1', min: 0, max: 100, v: 0 }, children: [] });
  rc.render({ type: 'upd', attrs: { id: 'upd-s1', v: '73' }, children: [] });
  const val = document.getElementById('upd-s1').parentElement.querySelector('.tokui-slider__value').textContent;
  assert.strictEqual(val, '73', 'slider 数值应随 upd 更新');
});

test('upd 派发 rate v 更新（id 在 hidden、_update 在 field）', () => {
  const rc = makeRenderer();
  rc.render({ type: 'rate', attrs: { id: 'upd-r1', max: 5 }, children: [] });
  rc.render({ type: 'upd', attrs: { id: 'upd-r1', v: '4' }, children: [] });
  const text = document.getElementById('upd-r1').parentElement.querySelector('.tokui-rate__text').textContent;
  assert.strictEqual(text, '4/5', 'rate 评分应随 upd 更新');
});

test('upd 派发 numinput v 更新（id 在 input、_update 在 field）', () => {
  const rc = makeRenderer();
  rc.render({ type: 'numinput', attrs: { id: 'upd-n1', min: 0, max: 100, v: 0 }, children: [] });
  rc.render({ type: 'upd', attrs: { id: 'upd-n1', v: '42' }, children: [] });
  const input = document.getElementById('upd-n1');
  assert.strictEqual(input.value, '42', 'numinput 值应随 upd 更新');
});

test('upd 派发 input ph 更新（id 在 input、_update 在 wrapper）', () => {
  const rc = makeRenderer();
  rc.render({ type: 'input', attrs: { id: 'upd-i1', ph: '旧占位' }, children: [] });
  rc.render({ type: 'upd', attrs: { id: 'upd-i1', ph: '新占位' }, children: [] });
  assert.strictEqual(document.getElementById('upd-i1').placeholder, '新占位', 'input placeholder 应随 upd 更新');
});

// 真实管道：builder upd({dis:false}) → [upd id:x dis:false] → parser 解析成字符串 'false'。
// 旧 builder 把 false 整个跳过 → DSL 无 dis:false → 禁用态清不掉。此测试锁字符串路径。
test('upd dis:"false" 字符串路径清除 disabled（builder→parser 管道）', () => {
  const rc = makeRenderer();
  rc.render({ type: 'input', attrs: { id: 'upd-i2', dis: true }, children: [] });
  rc.render({ type: 'upd', attrs: { id: 'upd-i2', dis: 'false' }, children: [] });
  assert.strictEqual(document.getElementById('upd-i2').disabled, false, 'dis:"false" 应清除禁用态');
});

test('upd ro:"false" 字符串路径清除 readonly', () => {
  const rc = makeRenderer();
  rc.render({ type: 'input', attrs: { id: 'upd-i3', ro: true }, children: [] });
  rc.render({ type: 'upd', attrs: { id: 'upd-i3', ro: 'false' }, children: [] });
  assert.strictEqual(document.getElementById('upd-i3').readOnly, false, 'ro:"false" 应清除只读态');
});

// === P0 回归：change 回流 / 校验闸门 / aria-invalid / CSS 过滤 / upd 作用域 ===

// 回归：旧实现读 window.TokUI._eventBus（从未赋值）→ rate change 回调静默失效
test('rate clk 回调经 renderer.eventBus 触发', () => {
  const rc = makeRenderer();
  let got = null;
  rc.eventBus.registerHandler('rateH', (data) => { got = data; });
  const dom = rc.render({ type: 'rate', attrs: { id: 'r-clk', max: 5, clk: 'rateH' }, children: [] });
  const rate = dom.querySelector('.tokui-rate');
  const star = dom.querySelector('.tokui-rate__star');
  assert.ok(rate && star, 'rate 应渲染容器与星星');
  // rate 为容器委托监听：点击事件需带 target = 星星
  (rate._events.click || []).forEach(fn => fn({ target: star, preventDefault() {} }));
  assert.ok(got, '点击星星应触发 clk handler');
  assert.strictEqual(got.id, 'r-clk');
  assert.strictEqual(got.value, 1, '点第一颗星 value 应为 1');
});

// 回归：旧提交路径绕过原生校验，req 必填不强制
test('sub 提交前过 reportValidity 闸门', () => {
  const rc = makeRenderer();
  let calls = 0;
  rc.eventBus.registerHandler('subH', () => { calls++; });
  const dom = rc.render({ type: 'form', attrs: { sub: 'subH' }, children: [
    { type: 'input', attrs: { id: 'vf1', req: true }, children: [] }
  ]});
  rc.bindEvents(dom);
  dom.reportValidity = () => false;
  (dom._events.submit || []).forEach(fn => fn({ preventDefault() {} }));
  assert.strictEqual(calls, 0, '校验失败不应调用 handler');
  dom.reportValidity = () => true;
  (dom._events.submit || []).forEach(fn => fn({ preventDefault() {} }));
  assert.strictEqual(calls, 1, '校验通过应调用 handler');
});

test('input v:error 联动 aria-invalid + pat 映射 pattern', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { v: 'error', pat: '\\d+' }, children: [] });
  const input = dom.querySelector('.tokui-input');
  assert.strictEqual(input.getAttribute('aria-invalid'), 'true');
  assert.strictEqual(input.getAttribute('pattern'), '\\d+');
});

test('select/textarea v:error 联动 aria-invalid', () => {
  const rc = makeRenderer();
  const selDom = rc.render({ type: 'select', attrs: { v: 'error' }, children: [] });
  assert.strictEqual(selDom.querySelector('.tokui-select').getAttribute('aria-invalid'), 'true');
  const taDom = rc.render({ type: 'textarea', attrs: { v: 'error' }, children: [] });
  assert.strictEqual(taDom.querySelector('.tokui-input').getAttribute('aria-invalid'), 'true');
});

// 安全：btn w/radius 直拼 style，非法值必须过滤
test('btn w/radius 非法 CSS 值被过滤', () => {
  const rc = makeRenderer();
  const okDom = rc.render({ type: 'btn', attrs: { tx: 'x', w: '100px', radius: '8px' }, children: [] });
  assert.ok(okDom.style.cssText.indexOf('width:100px') !== -1, '合法 w 应保留');
  assert.ok(okDom.style.cssText.indexOf('border-radius:8px') !== -1, '合法 radius 应保留');
  const badDom = rc.render({ type: 'btn', attrs: { tx: 'x', w: '100px;position:fixed', radius: 'expression(alert(1))' }, children: [] });
  const s = badDom.style.cssText || '';
  assert.ok(s.indexOf('position') === -1 && s.indexOf('expression') === -1, '非法值不应进入 style: ' + s);
});

// 多消息场景：同 id 时 upd 优先命中 _mountRoot 内的元素
test('upd 优先命中 _mountRoot 内同 id 元素', () => {
  const rc = makeRenderer();
  const rootA = document.createElement('div');
  const rootB = document.createElement('div');
  const domA = rc.render({ type: 'input', attrs: { id: 'dup' }, children: [] });
  rootA.appendChild(domA);
  const domB = rc.render({ type: 'input', attrs: { id: 'dup' }, children: [] });
  rootB.appendChild(domB);
  rc._mountRoot = rootB;
  rc.render({ type: 'upd', attrs: { id: 'dup', v: 'B' }, children: [] });
  assert.strictEqual(domB.querySelector('.tokui-input').value, 'B', '容器内元素应被更新');
  assert.notStrictEqual(domA.querySelector('.tokui-input').value, 'B', '容器外同 id 元素不应被误更新');
});

// upd status:error/success → 输入框变体类 + hint 配色 + aria-invalid 联动
test('input _update status 切换校验反馈样式', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { id: 'st1', hint: ' ' }, children: [] });
  const input = dom.querySelector('.tokui-input');
  const hint = dom.querySelector('.tokui-field__hint');
  dom._update({ status: 'error', hint: '✗ 格式错误' });
  assert.ok(input.className.indexOf('tokui-input--error') !== -1, '输入框应有 error 变体类');
  assert.strictEqual(input.getAttribute('aria-invalid'), 'true');
  assert.ok(hint.className.indexOf('tokui-field__hint--error') !== -1, 'hint 应有 error 配色类');
  assert.strictEqual(hint.textContent, '✗ 格式错误');
  dom._update({ status: 'success', hint: '✓ 通过' });
  assert.ok(input.className.indexOf('tokui-input--error') === -1, 'error 类应被移除');
  assert.ok(input.className.indexOf('tokui-input--success') !== -1);
  assert.ok(hint.className.indexOf('tokui-field__hint--success') !== -1);
  assert.strictEqual(input.getAttribute('aria-invalid'), null, '非 error 应移除 aria-invalid');
  dom._update({ status: '' });
  assert.ok(input.className.indexOf('tokui-input--success') === -1, '空 status 应清除状态类');
  assert.ok(hint.className.indexOf('tokui-field__hint--success') === -1);
});

// live 纯前端实时校验：blur 本地 checkValidity → hint 反馈（零网络）
test('input live：blur 校验失败出 error hint，改对即时转 success', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: {
    l: '手机号', req: true, pat: '1\\d{10}',
    err: '✗ 请输入 11 位手机号', ok: '✓ 手机号格式正确', live: true, hint: '11 位大陆手机号'
  }, children: [] });
  const input = dom.querySelector('.tokui-input');
  const hint = dom.querySelector('.tokui-field__hint');
  assert.ok(hint, 'live 模式必须创建 hint 槽');
  let valid = false;
  input.checkValidity = () => valid; // mock 原生校验
  // blur 校验失败
  input.value = '123';
  (input._events.blur || []).forEach(fn => fn({}));
  assert.strictEqual(hint.textContent, '✗ 请输入 11 位手机号');
  assert.ok(input.className.indexOf('tokui-input--error') !== -1);
  // error 态下继续输入，改对立即转 success
  valid = true;
  input.value = '13800138000';
  (input._events.input || []).forEach(fn => fn({}));
  assert.strictEqual(hint.textContent, '✓ 手机号格式正确');
  assert.ok(input.className.indexOf('tokui-input--success') !== -1);
});

test('input live：空值非必填回中性', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: { l: '昵称', live: true, hint: '可选' }, children: [] });
  const input = dom.querySelector('.tokui-input');
  const hint = dom.querySelector('.tokui-field__hint');
  input.checkValidity = () => true;
  input.value = '';
  (input._events.blur || []).forEach(fn => fn({}));
  assert.strictEqual(hint.textContent, '可选', '空值非必填应恢复中性 hint');
  assert.ok(input.className.indexOf('tokui-input--error') === -1);
  assert.ok(input.className.indexOf('tokui-input--success') === -1);
});

// live:input 即时模式：每次 input 事件都校验（无需 blur）
test('input live:input 即时校验——输入即反馈', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'input', attrs: {
    l: '用户名', req: true, live: 'input',
    err: '✗ 字母开头 4-16 位', ok: '✓ 用户名可用', hint: '字母开头 4-16 位字母数字'
  }, children: [] });
  const input = dom.querySelector('.tokui-input');
  const hint = dom.querySelector('.tokui-field__hint');
  let valid = false;
  input.checkValidity = () => valid;
  // 输入即错（不触发 blur）
  input.value = '1ab';
  (input._events.input || []).forEach(fn => fn({}));
  assert.strictEqual(hint.textContent, '✗ 字母开头 4-16 位', '即时模式应在 input 事件即报错');
  assert.ok(input.className.indexOf('tokui-input--error') !== -1);
  // 改对立即转 success
  valid = true;
  input.value = 'abc123';
  (input._events.input || []).forEach(fn => fn({}));
  assert.strictEqual(hint.textContent, '✓ 用户名可用');
  assert.ok(input.className.indexOf('tokui-input--success') !== -1);
});

// req 必填标记：label 带 tokui-label--req（CSS 渲染红色 *）
test('req 字段 label 带必填标记类', () => {
  const rc = makeRenderer();
  const withReq = rc.render({ type: 'input', attrs: { l: '手机号', req: true }, children: [] });
  assert.ok(withReq.querySelector('.tokui-label').className.indexOf('tokui-label--req') !== -1, 'req 应带标记类');
  const noReq = rc.render({ type: 'input', attrs: { l: '昵称' }, children: [] });
  assert.ok(noReq.querySelector('.tokui-label').className.indexOf('tokui-label--req') === -1, '非 req 不带标记类');
  const ta = rc.render({ type: 'textarea', attrs: { l: '备注', req: true }, children: [] });
  assert.ok(ta.querySelector('.tokui-label').className.indexOf('tokui-label--req') !== -1, 'textarea req 应带标记类');
  const sel = rc.render({ type: 'select', attrs: { l: '城市', req: true }, children: [] });
  assert.ok(sel.querySelector('.tokui-label').className.indexOf('tokui-label--req') !== -1, 'select req 应带标记类');
});

run();
