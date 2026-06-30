/**
 * TokUI 布局组件测试套件
 * 测试 card、row/col、list/item、tabs/tab、accordion/collapse、
 * dialog、drawer、timeline/ti、steps/step、desc/desc-item、
 * carousel、tree/tn、menu/menu-item 组件。
 */
'use strict';

const assert = require('assert');
const { setupDOM, teardownDOM } = require('./helpers/dom-mock');

// 在引入 renderer 之前设置 DOM mock
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const { registerLayoutComponents } = require('../src/components/layout');

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

// ===== Card 卡片组件测试 =====

test('card basic render - renders div.tokui-card', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'card', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-card'));
});

test('card with title (tt attr) - has .tokui-card-header child', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'card', attrs: { tt: '卡片标题' }, children: [] };
  const dom = rc.render(node);
  const header = dom.querySelector('.tokui-card-header');
  assert.notStrictEqual(header, null);
  assert.strictEqual(header.textContent, '卡片标题');
  assert.strictEqual(header.getAttribute('role'), 'heading');
});

test('card with text content (tx attr) - body has text', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'card', attrs: { tx: '卡片正文内容' }, children: [] };
  const dom = rc.render(node);
  const body = dom.querySelector('.tokui-card-body');
  assert.notStrictEqual(body, null);
  assert.strictEqual(body.textContent, '卡片正文内容');
});

test('card with empty ft child renders NO footer - avoids blank footer bar', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'card',
    attrs: { tt: '标题' },
    children: [
      { type: 'ft', attrs: {}, children: [] }
    ]
  };
  const dom = rc.render(node);
  const footer = dom.querySelector('.tokui-card-footer');
  assert.strictEqual(footer, null);
});

test('card with ft child that has content renders footer', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'card',
    attrs: { tt: '标题' },
    children: [
      { type: 'ft', attrs: { tx: '数据来源：订单系统' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  const footer = dom.querySelector('.tokui-card-footer');
  assert.notStrictEqual(footer, null);
  assert.strictEqual(footer.textContent, '数据来源：订单系统');
});

// ===== Row/Col 栅格组件测试 =====

test('row renders div.tokui-row', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'row', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-row'));
});

test('col with span attr - renders div.tokui-col', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'col', attrs: { span: '6' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-col'));
  assert.strictEqual(dom.style.gridColumn, 'span 6');
});

// 栅格系统为 12 列（CSS .tokui-row = repeat(12,1fr)），span 上限 = 12。
// 超 12 的 span 自动 clamp 到 12（填满整行），避免超界值静默塌缩成 1 列。
test('col span:12 (max) is valid - emits col--12 and gridColumn span 12', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const dom = rc.render({ type: 'col', attrs: { span: '12' }, children: [] });
  assert.ok(dom.classList.contains('tokui-col--12'), 'span:12 在 12 栅格内合法');
  assert.strictEqual(dom.style.gridColumn, 'span 12');
});

test('col span over max (13) clamps to 12 - emits col--12, gridColumn span 12', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const dom = rc.render({ type: 'col', attrs: { span: '13' }, children: [] });
  assert.ok(!dom.classList.contains('tokui-col--13'), 'span:13 应 clamp 到 12，不应生成 col--13 类');
  assert.ok(dom.classList.contains('tokui-col--12'), 'span:13 clamp 后应为 col--12');
  assert.strictEqual(dom.style.gridColumn, 'span 12', 'span:13 clamp 后 gridColumn = span 12');
});

// ===== List/Item 列表组件测试 =====

test('list renders with ul tag', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'list', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'UL');
  assert.ok(dom.classList.contains('tokui-list'));
});

test('list with t:ol renders ol tag', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'list', attrs: { t: 'ol' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'OL');
  assert.ok(dom.classList.contains('tokui-list'));
});

test('item renders li with content', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'item', content: '列表项文本', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'LI');
  assert.ok(dom.classList.contains('tokui-list-item'));
  assert.strictEqual(dom.textContent, '列表项文本');
});

test('item with content + nested list（content 作首段 + 子 ul）', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'item', content: '前端', attrs: {},
    children: [{
      type: 'list', attrs: { t: 'ul' }, children: [
        { type: 'item', content: 'React', attrs: {}, children: [] }
      ]
    }]
  };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'LI');
  // 真实 DOM 的 textContent 聚合所有后代（含子 list 的 'React'），故此处校验首子文本节点为首段 '前端'。
  assert.strictEqual(dom.childNodes[0].nodeType, 3, '首子为文本节点');
  assert.strictEqual(dom.childNodes[0].textContent, '前端', 'content 作 li 首段文本');
  assert.strictEqual(dom.children.length, 1, 'li 含 1 个子 list');
  assert.strictEqual(dom.children[0].tagName, 'UL', '子 list 渲染为 ul');
  assert.strictEqual(dom.children[0].children[0].textContent, 'React', '子 item 文本');
});

// ===== Tabs/Tab 标签页组件测试 =====

test('tabs with tab children - renders div.tokui-tabs with radio inputs', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'tabs',
    attrs: {},
    children: [
      { type: 'tab', attrs: { tt: 'Tab 1' }, children: [] },
      { type: 'tab', attrs: { tt: 'Tab 2' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-tabs'));
  const inputs = dom.querySelectorAll('input[type="radio"]');
  assert.strictEqual(inputs.length, 2);
  assert.strictEqual(inputs[0].getAttribute('checked'), 'checked');
});

test('tab panel content - renders panel div', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'tabs',
    attrs: {},
    children: [
      { type: 'tab', attrs: { tt: 'First' }, children: [
        { type: '_text', content: '面板内容' }
      ]}
    ]
  };
  const dom = rc.render(node);
  const panel = dom.querySelector('.tokui-tabs-panel');
  assert.notStrictEqual(panel, null);
  assert.strictEqual(panel.getAttribute('role'), 'tabpanel');
});

// ===== Accordion/Collapse 手风琴/折叠组件测试 =====

test('accordion renders container', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'accordion', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-accordion'));
});

test('collapse renders details/summary with title', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'collapse', attrs: { tt: '展开标题' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DETAILS');
  assert.ok(dom.classList.contains('tokui-collapse'));
  const summary = dom.querySelector('.tokui-collapse-title');
  assert.notStrictEqual(summary, null);
  assert.strictEqual(summary.textContent, '展开标题');
});

// ===== Dialog 对话框组件测试 =====

test('dialog renders dialog element with header', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'dialog', attrs: { tt: '对话框标题' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIALOG');
  assert.ok(dom.classList.contains('tokui-dialog'));
  const header = dom.querySelector('.tokui-dialog-header');
  assert.notStrictEqual(header, null);
  const titleSpan = header.querySelector('span');
  assert.strictEqual(titleSpan.textContent, '对话框标题');
  const closeBtn = dom.querySelector('.tokui-dialog-close');
  assert.notStrictEqual(closeBtn, null);
});

// ===== Drawer 抽屉组件测试 =====

test('drawer renders with overlay and panel', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'drawer', attrs: { tt: '抽屉标题', pos: 'right' }, children: [] };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-drawer'));
  assert.ok(dom.classList.contains('tokui-drawer--right'));
  const overlay = dom.querySelector('.tokui-drawer__overlay');
  assert.notStrictEqual(overlay, null);
  const panel = dom.querySelector('.tokui-drawer__panel');
  assert.notStrictEqual(panel, null);
  const header = dom.querySelector('.tokui-drawer__header');
  assert.notStrictEqual(header, null);
});

// ===== Timeline/Ti 时间轴组件测试 =====

test('timeline renders container', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'timeline', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-timeline'));
});

test('ti renders timeline item with content', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'ti', content: '时间轴内容', attrs: { tt: '事件标题', t: 'success' }, children: [] };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-ti'));
  assert.ok(dom.classList.contains('tokui-ti--success'));
  const dot = dom.querySelector('.tokui-ti__dot');
  assert.notStrictEqual(dot, null);
  const title = dom.querySelector('.tokui-ti__title');
  assert.strictEqual(title.textContent, '事件标题');
  const body = dom.querySelector('.tokui-ti__body');
  assert.strictEqual(body.textContent, '时间轴内容');
});

// ===== Steps/Step 步骤条组件测试 =====

test('steps renders step container', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'steps',
    attrs: { v: '2' },
    children: [
      { type: 'step', attrs: { tt: '第一步' }, content: '', children: [] },
      { type: 'step', attrs: { tt: '第二步' }, content: '', children: [] },
      { type: 'step', attrs: { tt: '第三步' }, content: '', children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-steps'));
  const stepEls = dom.querySelectorAll('.tokui-step');
  assert.strictEqual(stepEls.length, 3);
});

test('step renders individual step', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'steps',
    attrs: { v: '1' },
    children: [
      { type: 'step', attrs: { tt: '登录' }, content: '输入账号密码', children: [] }
    ]
  };
  const dom = rc.render(node);
  const step = dom.querySelector('.tokui-step');
  assert.ok(step.classList.contains('tokui-step--active'));
  const title = step.querySelector('.tokui-step__title');
  assert.strictEqual(title.textContent, '登录');
  const desc = step.querySelector('.tokui-step__desc');
  assert.strictEqual(desc.textContent, '输入账号密码');
});

// ===== Desc/Desc-Item 描述列表组件测试 =====

test('desc renders description list container', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'desc',
    attrs: { cols: '2' },
    children: [
      { type: 'desc-item', attrs: { l: '名称', tx: 'TokUI' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-desc'));
});

test('desc-item renders label and value', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'desc',
    attrs: {},
    children: [
      { type: 'desc-item', attrs: { l: '版本', tx: '1.0' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  const label = dom.querySelector('.tokui-desc__label');
  assert.strictEqual(label.textContent, '版本');
  const value = dom.querySelector('.tokui-desc__value');
  assert.strictEqual(value.textContent, '1.0');
});

// ===== Carousel 轮播图组件测试 =====

test('carousel renders container', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'carousel',
    attrs: { id: 'test-carousel' },
    children: [
      { type: 'carousel-item', attrs: { s: 'a.jpg' }, children: [] },
      { type: 'carousel-item', attrs: { s: 'b.jpg' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-carousel'));
  assert.strictEqual(dom.id, 'test-carousel');
  const track = dom.querySelector('.tokui-carousel__track');
  assert.notStrictEqual(track, null);
  const slides = track.querySelectorAll('.tokui-carousel__slide');
  assert.strictEqual(slides.length, 2);
});

// ===== Tree/Tn 树形组件测试 =====

test('tree renders tree container', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'tree',
    attrs: { l: '选择节点' },
    children: []
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-field'));
  const tree = dom.querySelector('.tokui-tree');
  assert.notStrictEqual(tree, null);
  const label = dom.querySelector('.tokui-label');
  assert.strictEqual(label.textContent, '选择节点');
});

test('tn renders tree node with leaf state', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'tn',
    attrs: { v: 'root', tx: '根节点', leaf: true },
    children: []
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-tree-node'));
  assert.ok(dom.classList.contains('tokui-tree-node--leaf'));
  assert.strictEqual(dom.getAttribute('data-value'), 'root');
  assert.strictEqual(dom.getAttribute('data-text'), '根节点');
  const text = dom.querySelector('.tokui-tree-text');
  assert.strictEqual(text.textContent, '根节点');
});

// ===== Menu/Menu-Item 菜单组件测试 =====

test('menu renders menu container', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'menu',
    attrs: { v: 'vertical' },
    children: [
      { type: 'menu-item', attrs: { tx: '首页', clk: 'goHome' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-menu'));
  assert.strictEqual(dom.getAttribute('role'), 'menu');
});

test('menu-item renders item with content', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'menu',
    attrs: {},
    children: [
      { type: 'menu-item', attrs: { tx: '设置', clk: 'openSettings', i: '⚙' }, children: [] }
    ]
  };
  const dom = rc.render(node);
  const item = dom.querySelector('.tokui-menu__item');
  assert.notStrictEqual(item, null);
  assert.strictEqual(item.getAttribute('role'), 'menuitem');
  const icon = item.querySelector('.tokui-menu__icon');
  assert.strictEqual(icon.textContent, '⚙');
  const text = item.querySelector('.tokui-menu__text');
  assert.strictEqual(text.textContent, '设置');
  assert.strictEqual(item.getAttribute('data-tokui-clk'), 'openSettings');
});

// ===== Scroll Area 滚动区域组件测试 =====

test('scroll-area renders outer container', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'scroll-area', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.tagName, 'DIV');
  assert.ok(dom.classList.contains('tokui-scroll-area'));
});

test('scroll-area renders inner scrollable viewport', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'scroll-area', attrs: {}, children: [] };
  const dom = rc.render(node);
  const viewport = dom.querySelector('.tokui-scroll-area__viewport');
  assert.notStrictEqual(viewport, null);
});

test('scroll-area applies height from h attr', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'scroll-area', attrs: { h: '400' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.style.height, '400px');
});

test('scroll-area applies width from w attr', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'scroll-area', attrs: { w: '100%' }, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom.style.width, '100%');
});

test('scroll-area _slot points to inner viewport', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'scroll-area', attrs: {}, children: [] };
  const dom = rc.render(node);
  const viewport = dom.querySelector('.tokui-scroll-area__viewport');
  assert.strictEqual(dom._slot, viewport);
});

test('scroll-area renders children inside viewport', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'scroll-area',
    attrs: { h: '200' },
    children: [
      { type: '_text', attrs: {}, content: 'Scrollable content', children: [] }
    ]
  };
  const dom = rc.render(node);
  const viewport = dom.querySelector('.tokui-scroll-area__viewport');
  assert.notStrictEqual(viewport, null);
  // _text nodes become Text nodes (nodeType 3) appended as childNodes
  assert.ok(viewport.childNodes.length > 0);
  assert.strictEqual(viewport.childNodes[0].textContent, 'Scrollable content');
});

test('scroll-area sets _tokuiType', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = { type: 'scroll-area', attrs: {}, children: [] };
  const dom = rc.render(node);
  assert.strictEqual(dom._tokuiType, 'scroll-area');
});

// ===== Sidebar 侧边栏组件测试 =====

test('sidebar renders container with header', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'sidebar',
    attrs: { tt: 'TokUI', w: '260', pos: 'left', collapsible: true },
    children: [
      { type: 'sidebar-content', attrs: {}, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-sidebar'));
  assert.ok(dom.classList.contains('tokui-sidebar--left'));
  assert.ok(dom.classList.contains('tokui-sidebar--collapsible'));
  const header = dom.querySelector('.tokui-sidebar__header');
  assert.notStrictEqual(header, null);
  const title = dom.querySelector('.tokui-sidebar__title');
  assert.strictEqual(title.textContent, 'TokUI');
  const toggle = dom.querySelector('.tokui-sidebar__toggle');
  assert.notStrictEqual(toggle, null);
});

test('sidebar with right position renders correct modifier class', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'sidebar',
    attrs: { pos: 'right', tt: 'Right' },
    children: []
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-sidebar--right'));
  assert.ok(!dom.classList.contains('tokui-sidebar--left'));
});

test('sidebar-content renders scrollable content area', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'sidebar-content',
    attrs: {},
    children: [
      { type: '_text', content: 'Menu content here', attrs: {}, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-sidebar__content'));
});

test('sidebar-footer renders footer area', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'sidebar-footer',
    attrs: {},
    children: []
  };
  const dom = rc.render(node);
  assert.ok(dom.classList.contains('tokui-sidebar__footer'));
});

test('sidebar toggle click adds collapsed class', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'sidebar',
    attrs: { collapsible: true, tt: 'Test' },
    children: [
      { type: 'sidebar-content', attrs: {}, children: [] }
    ]
  };
  const dom = rc.render(node);
  assert.ok(!dom.classList.contains('tokui-sidebar--collapsed'));
  const toggle = dom.querySelector('.tokui-sidebar__toggle');
  // Simulate click via stored event listener
  const clickEvents = toggle._events ? toggle._events['click'] : [];
  assert.strictEqual(clickEvents.length, 1);
  clickEvents[0]();
  assert.ok(dom.classList.contains('tokui-sidebar--collapsed'));
  // Click again to expand
  clickEvents[0]();
  assert.ok(!dom.classList.contains('tokui-sidebar--collapsed'));
});

test('sidebar _slot points to sidebar-content div', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const contentNode = { type: 'sidebar-content', attrs: {}, children: [] };
  const node = {
    type: 'sidebar',
    attrs: { tt: 'Slot Test' },
    children: [contentNode]
  };
  const dom = rc.render(node);
  const contentDiv = dom.querySelector('.tokui-sidebar__content');
  assert.strictEqual(dom._slot, contentDiv);
});

test('sidebar without collapsible attr has no toggle button', () => {
  const rc = new TokUIRenderer(null);
  registerLayoutComponents(rc);
  const node = {
    type: 'sidebar',
    attrs: { tt: 'No Collapse' },
    children: []
  };
  const dom = rc.render(node);
  const toggle = dom.querySelector('.tokui-sidebar__toggle');
  assert.strictEqual(toggle, null);
});

// ===== desc 末行 border 智能处理（计数法兜底，Node 无 getBoundingClientRect） =====
const TokUIClass = require('../src/index');
function renderDesc(dsl) {
  const c = document.createElement('div');
  new TokUIClass({ container: c }).render(dsl, c);
  return c.querySelectorAll('.tokui-desc__item');
}

test('desc 末行 border：单行全项标记（非仅 :last-child）', () => {
  const items = renderDesc('[desc cols:4 v:h][item l:姓名 tx:张三][item l:工号 tx:ZS001][item l:部门 tx:技术部][item l:状态 tx:在职][/desc]');
  const marked = Array.from(items).map(i => i.classList.contains('tokui-desc__item--last-row'));
  assert.deepStrictEqual(marked, [true, true, true, true], '单行 4 项应全标末行（无 border-bottom）');
});

test('desc 末行 border：多行只标末行', () => {
  const items = renderDesc('[desc cols:4][item l:A tx:1][item l:B tx:2][item l:C tx:3][item l:D tx:4][item l:E tx:5][/desc]');
  const marked = Array.from(items).map(i => i.classList.contains('tokui-desc__item--last-row'));
  assert.deepStrictEqual(marked, [false, false, false, false, true], '5 项 2 行：仅末行（第 5 项）标记');
});

test('desc 末行 border：默认 cols(3) 单行', () => {
  const items = renderDesc('[desc][item l:A tx:1][item l:B tx:2][item l:C tx:3][/desc]');
  const marked = Array.from(items).map(i => i.classList.contains('tokui-desc__item--last-row'));
  assert.deepStrictEqual(marked, [true, true, true], '默认 3 列 3 项单行全标');
});

test('desc 末行 border：不满一行（2 项/3 列）全标', () => {
  const items = renderDesc('[desc cols:3][item l:A tx:1][item l:B tx:2][/desc]');
  const marked = Array.from(items).map(i => i.classList.contains('tokui-desc__item--last-row'));
  assert.deepStrictEqual(marked, [true, true], '2 项 < cols，都属末行');
});

run();
