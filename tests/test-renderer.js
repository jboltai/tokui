/**
 * TokUI 渲染器测试套件
 * 测试 el() 快捷方法、组件注册/渲染、深度限制、destroy 等功能。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

// 在引入 renderer 之前设置 DOM mock
setupDOM();

const { el, TokUIRenderer, VARIANTS } = require('../src/core/renderer');
const { registerBasicComponents, resolveColor } = require('../src/components/basic');
const { registerFormComponents } = require('../src/components/form');

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
  teardownDOM();
  if (failed > 0) process.exit(1);
}

// ===== el() 快捷方法测试 =====

// 测试：el() 创建元素基本功能
test('el() creates element with tag name', () => {
  const elem = el('div');
  assert.strictEqual(elem.tagName, 'DIV');
  assert.strictEqual(elem.nodeType, 1);
});

// 测试：el() 设置属性
test('el() sets attributes', () => {
  const elem = el('input', { type: 'text', id: 'test-input' });
  assert.strictEqual(elem.getAttribute('type'), 'text');
  assert.strictEqual(elem.getAttribute('id'), 'test-input');
});

// 测试：el() 设置文本内容
test('el() sets textContent', () => {
  const elem = el('span', null, 'Hello World');
  assert.strictEqual(elem.textContent, 'Hello World');
});

// 测试：el() 过滤 on 开头属性（安全）
test('el() filters on* attributes for security', () => {
  const elem = el('div', { onclick: 'alert(1)', onload: 'evil()', id: 'safe' });
  assert.strictEqual(elem.getAttribute('onclick'), null);
  assert.strictEqual(elem.getAttribute('onload'), null);
  assert.strictEqual(elem.getAttribute('id'), 'safe');
});

// 测试：el() 过滤 formaction 属性（安全）
test('el() filters formaction attribute for security', () => {
  const elem = el('button', { formaction: 'http://evil.com', type: 'submit' });
  assert.strictEqual(elem.getAttribute('formaction'), null);
  assert.strictEqual(elem.getAttribute('type'), 'submit');
});

// 测试：el() 布尔属性 true 设置空属性
test('el() boolean true sets empty attribute', () => {
  const elem = el('input', { disabled: true });
  assert.strictEqual(elem.getAttribute('disabled'), '');
});

// 测试：el() 布尔属性 false 不设置属性
test('el() boolean false omits attribute', () => {
  const elem = el('input', { disabled: false, id: 'x' });
  assert.strictEqual(elem.getAttribute('disabled'), null);
  assert.strictEqual(elem.getAttribute('id'), 'x');
});

// 测试：el() null/undefined 值被跳过
test('el() null/undefined values are skipped', () => {
  const elem = el('div', { id: 'ok', skip1: null, skip2: undefined });
  assert.strictEqual(elem.getAttribute('id'), 'ok');
  assert.strictEqual(elem.getAttribute('skip1'), null);
  assert.strictEqual(elem.getAttribute('skip2'), null);
});

// ===== 渲染器注册与渲染测试 =====

// 测试：register + render 自闭合组件
test('register + render self-closing component', () => {
  const rc = new TokUIRenderer(null);
  rc.register('mybtn', (node, renderChildren, parentType) => {
    const btn = el('button', { 'data-tokui-type': 'mybtn' }, node.content);
    return btn;
  });
  const node = { type: 'mybtn', content: 'Click Me', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'BUTTON');
  assert.strictEqual(dom.textContent, 'Click Me');
  assert.strictEqual(dom.getAttribute('data-tokui-type'), 'mybtn');
});

// 测试：register + render 未知组件 → .tokui-unknown
test('render unknown type produces tokui-unknown', () => {
  const rc = new TokUIRenderer(null);
  const node = { type: 'foobar', content: 'test', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.strictEqual(dom.getAttribute('class'), 'tokui-unknown');
  assert.strictEqual(dom.getAttribute('data-tokui-type'), 'foobar');
  assert.strictEqual(dom.textContent, 'test');
});

// 测试：渲染深度限制（>50 返回空文本）
test('render depth > 50 returns empty text node', () => {
  const rc = new TokUIRenderer(null);
  rc.register('wrap', (node, renderChildren) => {
    return el('div', null, 'deep');
  });
  const node = { type: 'wrap', content: '', attrs: {}, children: [] };
  const dom = rc.render(node, undefined, 51);
  assert.strictEqual(dom.nodeType, 3);
  assert.strictEqual(dom.textContent, '');
});

// 测试：render _text 节点
test('render _text node creates text node', () => {
  const rc = new TokUIRenderer(null);
  const node = { type: '_text', content: 'Hello text' };
  const dom = rc.render(node);
  assert.strictEqual(dom.nodeType, 3);
  assert.strictEqual(dom.textContent, 'Hello text');
});

// 测试：destroy() 清理 boundElements 和 slotStack
test('destroy() clears boundElements and slotStack', () => {
  const rc = new TokUIRenderer(null);
  // 使用 DOM mock 的 createElement 创建元素（支持 removeEventListener）
  const mockEl = document.createElement('button');
  mockEl._tokuiBound = true;
  mockEl._tokuiClickBound = true;
  const listener = function() {};
  mockEl.addEventListener('click', listener);
  rc._boundElements.push({
    element: mockEl,
    listeners: [{ type: 'click', fn: listener }]
  });
  rc.slotStack.push({ slot: {}, el: {}, containerType: 'card' });
  assert.strictEqual(rc._boundElements.length, 1);
  assert.strictEqual(rc.slotStack.length, 1);
  rc.destroy();
  assert.strictEqual(rc._boundElements.length, 0);
  assert.strictEqual(rc.slotStack.length, 0);
  // 验证 _tokuiBound 标记被清除
  assert.strictEqual(mockEl._tokuiBound, undefined);
});

// 测试：VARIANTS 白名单包含预期类型
test('VARIANTS whitelist has expected types', () => {
  assert.ok(VARIANTS.btn);
  assert.ok(VARIANTS.btn.has('primary'));
  assert.ok(VARIANTS.btn.has('danger'));
  assert.ok(VARIANTS.card);
  assert.ok(VARIANTS.card.has('highlight'));
  assert.ok(VARIANTS.img);
  assert.ok(VARIANTS.img.has('avatar'));
  assert.ok(VARIANTS.table);
  assert.ok(VARIANTS.table.has('bordered'));
});

// 测试：register + render 带子节点的容器
test('register + render container with children', () => {
  const rc = new TokUIRenderer(null);
  rc.register('box', (node, renderChildren) => {
    const div = el('div', { 'data-tokui-type': 'box' });
    renderChildren(node.children).forEach(child => div.appendChild(child));
    return div;
  });
  rc.register('item', (node) => {
    return el('span', null, node.content);
  });
  const node = {
    type: 'box',
    content: '',
    attrs: {},
    children: [
      { type: 'item', content: 'A', attrs: {}, children: [] },
      { type: 'item', content: 'B', attrs: {}, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.strictEqual(dom.children.length, 2);
  assert.strictEqual(dom.children[0].textContent, 'A');
  assert.strictEqual(dom.children[1].textContent, 'B');
});

// ===== resolveColor 函数测试 =====

test('resolveColor: named primary → var(--tokui-primary)', () => {
  assert.strictEqual(resolveColor('primary'), 'var(--tokui-primary)');
});

test('resolveColor: named success → var(--tokui-success)', () => {
  assert.strictEqual(resolveColor('success'), 'var(--tokui-success)');
});

test('resolveColor: all named colors map correctly', () => {
  assert.strictEqual(resolveColor('warning'), 'var(--tokui-warning)');
  assert.strictEqual(resolveColor('danger'), 'var(--tokui-danger)');
  assert.strictEqual(resolveColor('info'), 'var(--tokui-primary)');
  assert.strictEqual(resolveColor('dark'), 'var(--tokui-dark)');
  assert.strictEqual(resolveColor('light'), 'var(--tokui-light)');
});

test('resolveColor: hex FF0000 → #FF0000', () => {
  assert.strictEqual(resolveColor('FF0000'), '#FF0000');
});

test('resolveColor: hex lowercase abc123 → #abc123', () => {
  assert.strictEqual(resolveColor('abc123'), '#abc123');
});

test('resolveColor: null/undefined/empty → null', () => {
  assert.strictEqual(resolveColor(null), null);
  assert.strictEqual(resolveColor(undefined), null);
  assert.strictEqual(resolveColor(''), null);
});

test('resolveColor: 3-char hex F00 → null (not supported)', () => {
  assert.strictEqual(resolveColor('F00'), null);
});

test('resolveColor: 7-char hex FF00000 → null', () => {
  assert.strictEqual(resolveColor('FF00000'), null);
});

test('resolveColor: unknown name foobar → null', () => {
  assert.strictEqual(resolveColor('foobar'), null);
});

// ===== 标题装饰变体白名单测试 =====

test('VARIANTS: h1-h6 support ribbon/underline/badge/pill', () => {
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    assert.ok(VARIANTS[tag].has('ribbon'), `${tag} missing ribbon`);
    assert.ok(VARIANTS[tag].has('underline'), `${tag} missing underline`);
    assert.ok(VARIANTS[tag].has('badge'), `${tag} missing badge`);
    assert.ok(VARIANTS[tag].has('pill'), `${tag} missing pill`);
  });
});

// ===== 标题组件 bg/fc 渲染测试 =====

test('h1 with bg:primary sets inline style.background', () => {
  const rc = new TokUIRenderer(null);
  registerBasicComponents(rc);
  const node = { type: 'h1', content: 'Hello', attrs: { v: 'ribbon', bg: 'primary' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.style.background, 'var(--tokui-primary)');
});

test('h2 underline uses CSS variable for bg, inline style for fc', () => {
  const rc = new TokUIRenderer(null);
  registerBasicComponents(rc);
  const node = { type: 'h2', content: 'Title', attrs: { v: 'underline', bg: 'success', fc: 'dark' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.style.background, undefined);
  assert.strictEqual(dom.style.getPropertyValue('--tokui-title-bg'), 'var(--tokui-success)');
  assert.strictEqual(dom.style.color, 'var(--tokui-dark)');
});

test('h3 with hex bg FF0000 sets #FF0000', () => {
  const rc = new TokUIRenderer(null);
  registerBasicComponents(rc);
  const node = { type: 'h3', content: 'Badge', attrs: { v: 'badge', bg: 'FF0000', fc: 'FFFFFF' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.style.background, '#FF0000');
  assert.strictEqual(dom.style.color, '#FFFFFF');
});

test('h4 without bg/fc has no inline style', () => {
  const rc = new TokUIRenderer(null);
  registerBasicComponents(rc);
  const node = { type: 'h4', content: 'Plain', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.style.background, undefined);
  assert.strictEqual(dom.style.color, undefined);
});

test('h1 with invalid bg value has no inline style', () => {
  const rc = new TokUIRenderer(null);
  registerBasicComponents(rc);
  const node = { type: 'h1', content: 'Title', attrs: { bg: 'invalidcolor' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.style.background, undefined);
});

test('h2 variant class applied with bg/fc', () => {
  const rc = new TokUIRenderer(null);
  registerBasicComponents(rc);
  const node = { type: 'h2', content: 'Styled', attrs: { v: 'pill', bg: 'info' }, children: [] };
  const dom = rc.render(node);
  const classes = dom.className.split(' ');
  assert.ok(classes.includes('tokui-h2'), 'missing tokui-h2');
  assert.ok(classes.includes('tokui-h2--pill'), 'missing tokui-h2--pill');
  assert.strictEqual(dom.style.background, 'var(--tokui-primary)');
});

// p 的 v:muted 变体应自动加 tokui-p--muted 类（白名单 + CSS 齐全，功能本就正常）
// 对应 demo/tokui-prompt.js 易错规则 9：变体必须 v: 前缀，裸 muted 会漏成正文
test('p v:muted applies tokui-p--muted class', () => {
  const rc = new TokUIRenderer(null);
  registerBasicComponents(rc);
  const node = { type: 'p', content: '永久免费·个人小微团队', attrs: { v: 'muted' }, children: [] };
  const dom = rc.render(node);
  const classes = dom.className.split(' ');
  assert.ok(classes.includes('tokui-p'), 'missing tokui-p');
  assert.ok(classes.includes('tokui-p--muted'), 'v:muted 必须加 tokui-p--muted 类');
  assert.strictEqual(dom.textContent, '永久免费·个人小微团队', '正文干净，无 muted 字样');
});

// ===== Input Group 测试 =====

test('input without pre/app renders no input-group', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = { type: 'input', attrs: { l: '用户名', ph: '请输入' }, children: [] };
  const result = renderer.render(node);
  assert.strictEqual(result.className, 'tokui-field');
  const group = result.querySelector('.tokui-input-group');
  assert.strictEqual(group, null);
});

test('input with pre renders input-group with span', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = { type: 'input', attrs: { l: '网址', pre: 'https://', ph: '域名' }, children: [] };
  const result = renderer.render(node);
  const group = result.querySelector('.tokui-input-group');
  assert.notStrictEqual(group, null);
  const pre = group.querySelector('.tokui-input-pre');
  assert.notStrictEqual(pre, null);
  assert.strictEqual(pre.textContent, 'https://');
});

test('input with app renders input-group with span', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = { type: 'input', attrs: { l: '金额', app: '元', t: 'number' }, children: [] };
  const result = renderer.render(node);
  const group = result.querySelector('.tokui-input-group');
  assert.notStrictEqual(group, null);
  const app = group.querySelector('.tokui-input-app');
  assert.notStrictEqual(app, null);
  assert.strictEqual(app.textContent, '元');
});

test('input with pre variant renders correct class', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = { type: 'input', attrs: { l: '价格', pre: '$|dark', t: 'number' }, children: [] };
  const result = renderer.render(node);
  const pre = result.querySelector('.tokui-input-pre');
  assert.notStrictEqual(pre, null);
  assert.strictEqual(pre.textContent, '$');
  assert.strictEqual(pre.className, 'tokui-input-pre tokui-input-pre--dark');
});

test('input with prebtn renders button with handler', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = { type: 'input', attrs: { l: '搜索', appbtn: '搜索:handleSearch|primary', ph: '关键词' }, children: [] };
  const result = renderer.render(node);
  const btn = result.querySelector('.tokui-input-appbtn');
  assert.notStrictEqual(btn, null);
  assert.strictEqual(btn.textContent, '搜索');
  assert.strictEqual(btn.getAttribute('data-tokui-clk'), 'handleSearch');
  assert.strictEqual(btn.className, 'tokui-input-appbtn tokui-input-appbtn--primary');
});

test('input with prebtn without handler', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = { type: 'input', attrs: { l: '日期', prebtn: '📅' }, children: [] };
  const result = renderer.render(node);
  const btn = result.querySelector('.tokui-input-prebtn');
  assert.notStrictEqual(btn, null);
  assert.strictEqual(btn.textContent, '📅');
  assert.strictEqual(btn.getAttribute('data-tokui-clk'), null);
});

test('input with v:inline adds tokui-field--inline class', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = { type: 'input', attrs: { l: '用户名', v: 'inline', ph: '请输入' }, children: [] };
  const result = renderer.render(node);
  assert.strictEqual(result.className, 'tokui-field tokui-field--inline');
});

test('pwd with pre renders input-group', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = { type: 'pwd', attrs: { l: '密码', pre: '🔒' }, children: [] };
  const result = renderer.render(node);
  const group = result.querySelector('.tokui-input-group');
  assert.notStrictEqual(group, null);
  const pre = group.querySelector('.tokui-input-pre');
  assert.notStrictEqual(pre, null);
  assert.strictEqual(pre.textContent, '🔒');
});

test('input with all four addons renders correct order', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = {
    type: 'input',
    attrs: { l: '日期', pre: '从', app: '止', prebtn: '📅:pickDate', appbtn: '今天:setToday|primary' },
    children: []
  };
  const result = renderer.render(node);
  const group = result.querySelector('.tokui-input-group');
  assert.notStrictEqual(group, null);
  // 子元素顺序: pre, prebtn, input, appbtn, app
  const children = group.children;
  assert.strictEqual(children.length, 5);
  assert.strictEqual(children[0].className.split(' ')[0], 'tokui-input-pre');
  assert.strictEqual(children[1].className.split(' ')[0], 'tokui-input-prebtn');
  assert.strictEqual(children[2].className, 'tokui-input');
  assert.strictEqual(children[3].className.split(' ')[0], 'tokui-input-appbtn');
  assert.strictEqual(children[4].className.split(' ')[0], 'tokui-input-app');
});

// ===== Picker 组件测试 =====

test('picker renders single select structure', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = {
    type: 'picker',
    attrs: { l: '角色', id: 'role', ph: '请选择' },
    children: [
      { type: 'opt', attrs: { v: 'admin', tx: '管理员' }, children: [] },
      { type: 'opt', attrs: { v: 'user', tx: '普通用户' }, children: [] }
    ]
  };
  const result = renderer.render(node);
  assert.strictEqual(result.className, 'tokui-field');
  const picker = result.querySelector('.tokui-picker');
  assert.notStrictEqual(picker, null);
  assert.strictEqual(picker.getAttribute('data-tokui-picker'), 'role');
  const control = picker.querySelector('.tokui-picker-control');
  assert.notStrictEqual(control, null);
  const search = picker.querySelector('.tokui-picker-search');
  assert.notStrictEqual(search, null);
  assert.strictEqual(search.getAttribute('placeholder'), '请选择');
  const dropdown = picker.querySelector('.tokui-picker-dropdown');
  assert.notStrictEqual(dropdown, null);
  const options = dropdown.querySelectorAll('.tokui-picker-option');
  assert.strictEqual(options.length, 2);
  assert.strictEqual(options[0].getAttribute('data-value'), 'admin');
  assert.strictEqual(options[0].textContent, '管理员');
  assert.strictEqual(options[1].getAttribute('data-value'), 'user');
  assert.strictEqual(options[1].textContent, '普通用户');
});

test('picker renders multi select with tags', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = {
    type: 'picker',
    attrs: { l: '技能', id: 'skills', multi: true },
    children: [
      { type: 'opt', attrs: { v: 'js', tx: 'JavaScript', chk: true }, children: [] },
      { type: 'opt', attrs: { v: 'py', tx: 'Python' }, children: [] }
    ]
  };
  const result = renderer.render(node);
  const picker = result.querySelector('.tokui-picker');
  assert.ok(picker.classList.contains('tokui-picker--multi'));
  const tags = picker.querySelectorAll('.tokui-picker-tag');
  assert.strictEqual(tags.length, 1);
  assert.ok(tags[0].textContent.indexOf('JavaScript') !== -1);
  // 验证隐藏 input：通过标签名+属性过滤查找
  var hiddenInputs = picker.querySelectorAll('input').filter(function(inp) {
    return inp.attributes.type === 'hidden' && inp.attributes.name === 'skills';
  });
  assert.strictEqual(hiddenInputs.length, 1);
  assert.strictEqual(hiddenInputs[0].attributes.value, 'js');
});

test('picker disabled adds tokui-picker--disabled', () => {
  const renderer = new TokUIRenderer();
  registerFormComponents(renderer);
  registerBasicComponents(renderer);
  const node = {
    type: 'picker',
    attrs: { l: '城市', id: 'city', dis: true },
    children: [
      { type: 'opt', attrs: { v: 'bj', tx: '北京' }, children: [] }
    ]
  };
  const result = renderer.render(node);
  const picker = result.querySelector('.tokui-picker');
  assert.ok(picker.classList.contains('tokui-picker--disabled'));
});

// ===== P0 新组件测试 =====

test('callout renders with correct type class', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'callout', attrs: { t: 'warning', tt: '注意', tx: '小心' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-callout'));
  assert.ok(dom.classList.contains('tokui-callout--warning'));
  const title = dom.querySelector('.tokui-callout__title');
  assert.strictEqual(title.textContent, '注意');
  const content = dom.querySelector('.tokui-callout__content');
  assert.strictEqual(content.textContent, '小心');
});

test('callout defaults to info type', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'callout', attrs: {}, content: 'hello', children: [] };
  const dom = renderer.render(node);
  assert.ok(dom.classList.contains('tokui-callout--info'));
  assert.strictEqual(dom.querySelector('.tokui-callout__content').textContent, 'hello');
});

test('callout without title has no title element', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'callout', attrs: { t: 'success', tx: 'done' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.querySelector('.tokui-callout__title'), null);
  assert.ok(dom.querySelector('.tokui-callout__content'));
});

test('think renders as details element', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = {
    type: 'think',
    attrs: { tt: '推理过程' },
    content: '',
    children: [
      { type: 'p', attrs: {}, content: '思考内容', children: [] }
    ]
  };
  const dom = renderer.render(node);
  assert.strictEqual(dom.tagName, 'DETAILS');
  assert.ok(dom.classList.contains('tokui-think'));
  const summary = dom.querySelector('.tokui-think__summary');
  assert.ok(summary);
  const body = dom.querySelector('.tokui-think__body');
  assert.ok(body);
  assert.ok(dom.querySelector('.tokui-p'));
});

test('think with open attribute is expanded', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'think', attrs: { open: true }, content: 'test', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.hasAttribute('open'), true);
});

test('think default title is 思考过程', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'think', attrs: {}, content: '', children: [] };
  const dom = renderer.render(node);
  const titleEl = dom.querySelector('.tokui-think__title');
  assert.strictEqual(titleEl.textContent, '思考过程');
});

test('copy renders as button with correct text', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'copy', attrs: { tx: 'Copy Me', tt: 'Done!' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.tagName, 'BUTTON');
  assert.ok(dom.classList.contains('tokui-copy'));
  assert.strictEqual(dom.textContent, 'Copy Me');
});

test('copy default text is 复制', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'copy', attrs: {}, content: '', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.textContent, '复制');
});

test('spin renders spinner variant by default', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'spin', attrs: {}, content: '', children: [] };
  const dom = renderer.render(node);
  assert.ok(dom.classList.contains('tokui-spin'));
  assert.ok(dom.classList.contains('tokui-spin--spinner'));
  assert.ok(dom.querySelector('.tokui-spin__spinner'));
});

test('spin dots variant has 3 dots', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'spin', attrs: { t: 'dots' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.ok(dom.classList.contains('tokui-spin--dots'));
  const dots = dom.querySelectorAll('.tokui-spin__dot');
  assert.strictEqual(dots.length, 3);
});

test('spin pulse variant', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'spin', attrs: { t: 'pulse' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.ok(dom.classList.contains('tokui-spin--pulse'));
  assert.ok(dom.querySelector('.tokui-spin__pulse'));
});

test('spin with size and text', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'spin', attrs: { s: 'lg', tx: '加载中' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.ok(dom.classList.contains('tokui-spin--lg'));
  assert.strictEqual(dom.querySelector('.tokui-spin__text').textContent, '加载中');
});

test('thumb renders up direction', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'thumb', attrs: { t: 'up' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.tagName, 'BUTTON');
  assert.ok(dom.classList.contains('tokui-thumb'));
  assert.ok(dom.classList.contains('tokui-thumb--up'));
  assert.ok(!dom.classList.contains('tokui-thumb--active'));
});

test('thumb renders down with active state', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'thumb', attrs: { t: 'down', v: 'active' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.ok(dom.classList.contains('tokui-thumb--down'));
  assert.ok(dom.classList.contains('tokui-thumb--active'));
});

test('file renders with name and size', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'file', attrs: { n: 'test.pdf', s: '1.5MB', t: 'pdf', u: '#' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-file'));
  assert.strictEqual(dom.querySelector('.tokui-file__name').textContent, 'test.pdf');
  assert.ok(dom.querySelector('.tokui-file__meta').textContent.indexOf('1.5MB') !== -1);
  assert.ok(dom.querySelector('.tokui-file__download'));
  assert.ok(dom.querySelector('.tokui-file__icon'));
});

test('file without url has no download button', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'file', attrs: { n: 'readme.txt' }, content: '', children: [] };
  const dom = renderer.render(node);
  assert.strictEqual(dom.querySelector('.tokui-file__download'), null);
});

test('code block has copy button', () => {
  const renderer = new TokUIRenderer();
  registerBasicComponents(renderer);
  const node = { type: 'code', attrs: { lang: 'js' }, content: 'console.log("hi")', children: [] };
  const dom = renderer.render(node);
  const copyBtn = dom.querySelector('.tokui-code__copy');
  assert.ok(copyBtn);
  assert.strictEqual(copyBtn.textContent, '复制');
});

// ===== Empty 空状态组件测试 =====

test('empty renders with text', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'empty', attrs: { tx: '暂无数据' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-empty'));
  assert.strictEqual(dom.querySelector('.tokui-empty__text').textContent, '暂无数据');
});

test('empty renders default icon', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'empty', attrs: {}, children: [] };
  const dom = rc.render(node);
  const icon = dom.querySelector('.tokui-empty__icon');
  assert.notStrictEqual(icon, null);
  assert.strictEqual(dom.querySelector('.tokui-empty__img'), null);
});

test('empty renders with search icon type', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'empty', attrs: { icon: 'search' }, children: [] };
  const dom = rc.render(node);
  const icon = dom.querySelector('.tokui-empty__icon');
  assert.notStrictEqual(icon, null);
});

test('empty renders image when s provided', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'empty', attrs: { s: 'empty.png', tx: '没有数据' }, children: [] };
  const dom = rc.render(node);
  const img = dom.querySelector('.tokui-empty__img');
  assert.notStrictEqual(img, null);
  assert.strictEqual(img.getAttribute('src'), 'empty.png');
  // Should not render icon when image is provided
  assert.strictEqual(dom.querySelector('.tokui-empty__icon'), null);
});

test('empty without text has no text element', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'empty', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.querySelector('.tokui-empty__text'), null);
});

// ===== Result 结果页组件测试 =====

test('result renders success type', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'result', attrs: { t: 'success', tt: '操作成功', tx: '数据已保存' }, children: [] };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-result'));
  assert.ok(dom.classList.contains('tokui-result--success'));
  assert.strictEqual(dom.querySelector('.tokui-result__title').textContent, '操作成功');
  assert.strictEqual(dom.querySelector('.tokui-result__desc').textContent, '数据已保存');
  assert.notStrictEqual(dom.querySelector('.tokui-result__icon'), null);
});

test('result renders error type', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'result', attrs: { t: 'error', tt: '操作失败' }, children: [] };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-result--error'));
});

test('result defaults to info type', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'result', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-result--info'));
});

test('result without title has no title element', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'result', attrs: { t: 'warning' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.querySelector('.tokui-result__title'), null);
  assert.strictEqual(dom.querySelector('.tokui-result__desc'), null);
});

// ===== Stat 统计数值组件测试 =====

test('stat renders title and value', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'stat', attrs: { tt: '总销售额', v: '128,960' }, children: [] };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-stat'));
  assert.strictEqual(dom.querySelector('.tokui-stat__title').textContent, '总销售额');
  assert.strictEqual(dom.querySelector('.tokui-stat__number').textContent, '128,960');
});

test('stat renders with prefix and suffix', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'stat', attrs: { v: '99.9', suf: '%' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.querySelector('.tokui-stat__suffix').textContent, '%');
  assert.strictEqual(dom.querySelector('.tokui-stat__number').textContent, '99.9');
});

test('stat renders with prefix', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'stat', attrs: { tt: '价格', v: '199', pre: '¥' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.querySelector('.tokui-stat__prefix').textContent, '¥');
});

test('stat renders trend up', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'stat', attrs: { tt: '增长', v: '12', trend: 'up' }, children: [] };
  const dom = rc.render(node);
  const trend = dom.querySelector('.tokui-stat__trend');
  assert.notStrictEqual(trend, null);
  assert.ok(trend.classList.contains('tokui-stat__trend--up'));
  assert.strictEqual(trend.textContent, '↑');
});

test('stat renders trend down', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'stat', attrs: { v: '5', trend: 'down' }, children: [] };
  const dom = rc.render(node);
  const trend = dom.querySelector('.tokui-stat__trend');
  assert.ok(trend.classList.contains('tokui-stat__trend--down'));
  assert.strictEqual(trend.textContent, '↓');
});

test('stat exposes id attr so upd can target it via getElementById', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'stat', attrs: { id: 'uss1-abc', v: '0', l: '在线用户', trend: 'up' }, children: [] };
  const dom = rc.render(node);
  // upd 指令靠 document.getElementById(id) 定位目标并调用 _update；
  // stat 必须把 attrs.id 透传到 wrapper，否则 upd 找不到元素、数值不更新。
  assert.strictEqual(dom.id, 'uss1-abc');
});

test('stat _update applies new value and trend', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'stat', attrs: { id: 's1', v: '0', trend: 'up' }, children: [] };
  const dom = rc.render(node);
  dom._update({ v: '128', trend: 'down' });
  assert.strictEqual(dom.querySelector('.tokui-stat__number').textContent, '128');
  const trend = dom.querySelector('.tokui-stat__trend');
  assert.ok(trend.classList.contains('tokui-stat__trend--down'));
  assert.strictEqual(trend.textContent, '↓');
});

test('stat without title has no title element', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'stat', attrs: { v: '100' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.querySelector('.tokui-stat__title'), null);
});

test('stat defaults value to 0', () => {
  const rc = new TokUIRenderer();
  registerBasicComponents(rc);
  const node = { type: 'stat', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.querySelector('.tokui-stat__number').textContent, '0');
});

// ===== Numinput 数字输入框组件测试 =====

test('numinput renders with value and buttons', () => {
  const rc = new TokUIRenderer();
  registerFormComponents(rc);
  const node = { type: 'numinput', attrs: { v: '5', n: 'qty' }, children: [] };
  const dom = rc.render(node);
  const wrapper = dom.querySelector('.tokui-numinput');
  assert.notStrictEqual(wrapper, null);
  const minusBtn = wrapper.querySelector('.tokui-numinput__btn--minus');
  assert.notStrictEqual(minusBtn, null);
  const plusBtn = wrapper.querySelector('.tokui-numinput__btn--plus');
  assert.notStrictEqual(plusBtn, null);
  const input = wrapper.querySelector('.tokui-numinput__input');
  assert.strictEqual(input.getAttribute('value'), '5');
});

test('numinput renders with label', () => {
  const rc = new TokUIRenderer();
  registerFormComponents(rc);
  const node = { type: 'numinput', attrs: { l: '数量', v: '0' }, children: [] };
  const dom = rc.render(node);
  const label = dom.querySelector('.tokui-label');
  assert.strictEqual(label.textContent, '数量');
});

test('numinput disabled adds disabled class', () => {
  const rc = new TokUIRenderer();
  registerFormComponents(rc);
  const node = { type: 'numinput', attrs: { v: '10', dis: true }, children: [] };
  const dom = rc.render(node);
  const wrapper = dom.querySelector('.tokui-numinput');
  assert.ok(wrapper.classList.contains('tokui-numinput--disabled'));
});

test('numinput respects min attribute', () => {
  const rc = new TokUIRenderer();
  registerFormComponents(rc);
  const node = { type: 'numinput', attrs: { v: '-5', min: '0' }, children: [] };
  const dom = rc.render(node);
  const input = dom.querySelector('.tokui-numinput__input');
  assert.strictEqual(input.getAttribute('value'), '0');
});

test('numinput respects max attribute', () => {
  const rc = new TokUIRenderer();
  registerFormComponents(rc);
  const node = { type: 'numinput', attrs: { v: '200', max: '100' }, children: [] };
  const dom = rc.render(node);
  const input = dom.querySelector('.tokui-numinput__input');
  assert.strictEqual(input.getAttribute('value'), '100');
});

test('numinput has hidden input for form', () => {
  const rc = new TokUIRenderer();
  registerFormComponents(rc);
  const node = { type: 'numinput', attrs: { v: '42', n: 'count' }, children: [] };
  const dom = rc.render(node);
  const hidden = dom.querySelector('input[type="hidden"]');
  assert.notStrictEqual(hidden, null);
  assert.strictEqual(hidden.getAttribute('name'), 'count');
  assert.strictEqual(hidden.getAttribute('value'), '42');
});

// ===== Desc 描述列表组件测试 =====

test('desc renders with desc-item children', () => {
  const rc = new TokUIRenderer();
  const { registerLayoutComponents } = require('../src/components/layout');
  registerLayoutComponents(rc);
  const node = {
    type: 'desc',
    attrs: { cols: '2' },
    children: [
      { type: 'desc-item', attrs: { l: '用户名', tx: '张三' }, children: [] },
      { type: 'desc-item', attrs: { l: '年龄', tx: '28' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-desc'));
  var items = dom.querySelectorAll('.tokui-desc__item');
  assert.strictEqual(items.length, 2);
  // items are direct children of wrapper (no row intermediary)
  assert.strictEqual(dom.children.length, 2);
  assert.ok(dom.children[0].classList.contains('tokui-desc__item'));
  assert.ok(dom.children[1].classList.contains('tokui-desc__item'));
  var labels = dom.querySelectorAll('.tokui-desc__label');
  assert.strictEqual(labels[0].textContent, '用户名');
  assert.strictEqual(labels[1].textContent, '年龄');
  var values = dom.querySelectorAll('.tokui-desc__value');
  assert.strictEqual(values[0].textContent, '张三');
  assert.strictEqual(values[1].textContent, '28');
});

test('desc with stripe class', () => {
  const rc = new TokUIRenderer();
  const { registerLayoutComponents } = require('../src/components/layout');
  registerLayoutComponents(rc);
  const node = {
    type: 'desc',
    attrs: { stripe: true },
    children: [
      { type: 'desc-item', attrs: { l: 'A', tx: '1' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-desc--stripe'));
});

test('desc with bordered class', () => {
  const rc = new TokUIRenderer();
  const { registerLayoutComponents } = require('../src/components/layout');
  registerLayoutComponents(rc);
  const node = {
    type: 'desc',
    attrs: { bordered: true },
    children: [
      { type: 'desc-item', attrs: { l: 'A', tx: '1' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-desc--bordered'));
});

test('desc defaults to 3 columns', () => {
  const rc = new TokUIRenderer();
  const { registerLayoutComponents } = require('../src/components/layout');
  registerLayoutComponents(rc);
  const node = {
    type: 'desc',
    attrs: {},
    children: [
      { type: 'desc-item', attrs: { l: 'A', tx: '1' }, children: [] },
      { type: 'desc-item', attrs: { l: 'B', tx: '2' }, children: [] },
      { type: 'desc-item', attrs: { l: 'C', tx: '3' }, children: [] },
      { type: 'desc-item', attrs: { l: 'D', tx: '4' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  // grid directly on wrapper, items are direct children
  var items = dom.querySelectorAll('.tokui-desc__item');
  assert.strictEqual(items.length, 4);
  assert.strictEqual(dom.style.getPropertyValue('--tokui-desc-cols'), '3');
  // all items are direct children of wrapper (no row intermediary)
  assert.strictEqual(dom.children.length, 4);
});

test('desc-item standalone renders label and value', () => {
  const rc = new TokUIRenderer();
  const { registerLayoutComponents } = require('../src/components/layout');
  registerLayoutComponents(rc);
  const node = { type: 'desc-item', attrs: { l: '名称', tx: '测试' }, children: [] };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-desc__item'));
  assert.strictEqual(dom.querySelector('.tokui-desc__label').textContent, '名称');
  assert.strictEqual(dom.querySelector('.tokui-desc__value').textContent, '测试');
});

// ===== Carousel 轮播图组件测试 =====

test('carousel renders wrapper with track', () => {
  const rc = new TokUIRenderer();
  const { registerLayoutComponents } = require('../src/components/layout');
  registerLayoutComponents(rc);
  const node = {
    type: 'carousel',
    attrs: { id: 'c1' },
    children: [
      { type: 'carousel-item', attrs: { s: 'url1', tt: '标题1' }, children: [] },
      { type: 'carousel-item', attrs: { s: 'url2', tt: '标题2' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-carousel'));
  assert.strictEqual(dom.id, 'c1');
  var track = dom.querySelector('.tokui-carousel__track');
  assert.notStrictEqual(track, null);
  var slides = track.querySelectorAll('.tokui-carousel__slide');
  assert.strictEqual(slides.length, 2);
});

test('carousel renders prev/next arrows and dots', () => {
  const rc = new TokUIRenderer();
  const { registerLayoutComponents } = require('../src/components/layout');
  registerLayoutComponents(rc);
  const node = {
    type: 'carousel',
    attrs: {},
    children: [
      { type: 'carousel-item', attrs: { s: 'a.jpg' }, children: [] },
      { type: 'carousel-item', attrs: { s: 'b.jpg' }, children: [] },
      { type: 'carousel-item', attrs: { s: 'c.jpg' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  var prev = dom.querySelector('.tokui-carousel__arrow--prev');
  var next = dom.querySelector('.tokui-carousel__arrow--next');
  assert.notStrictEqual(prev, null);
  assert.notStrictEqual(next, null);
  var dots = dom.querySelectorAll('.tokui-carousel__dot');
  assert.strictEqual(dots.length, 3);
  assert.ok(dots[0].classList.contains('tokui-carousel__dot--active'));
});

test('carousel-item renders slide with image and overlay', () => {
  const rc = new TokUIRenderer();
  const { registerLayoutComponents } = require('../src/components/layout');
  registerLayoutComponents(rc);
  const node = {
    type: 'carousel-item',
    attrs: { s: 'pic.jpg', tt: '标题', tx: '描述' },
    children: []
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-carousel__slide'));
  var img = dom.querySelector('img');
  assert.strictEqual(img.getAttribute('src'), 'pic.jpg');
  var title = dom.querySelector('.tokui-carousel__slide-title');
  assert.strictEqual(title.textContent, '标题');
  var desc = dom.querySelector('.tokui-carousel__slide-desc');
  assert.strictEqual(desc.textContent, '描述');
});

run();
