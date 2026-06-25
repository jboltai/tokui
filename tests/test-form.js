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
  const rc = new TokUIRenderer();
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

run();
