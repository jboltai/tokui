/**
 * TokUI 应用壳组件测试套件（M2 / T2.1）
 * page / page-header / page-sidebar / page-content / page-tabs / page-tab：
 * 渲染结构、属性校验、upd·del 指令、流式（分片含半标签）、事件上报。
 */
'use strict';

const assert = require('assert');
const { setupDOM, createElement } = require('./helpers/dom-mock');
setupDOM();

const { TokUIRenderer } = require('../src/core/renderer');
const eventBus = require('../src/core/event-bus');
const { registerPageComponents } = require('../src/components/page');
const { registerBasicComponents } = require('../src/components/basic');
const { registerLayoutComponents } = require('../src/components/layout');
const { registerFormComponents } = require('../src/components/form');
const { TokUIParser } = require('../src/core/parser');

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
  teardownDOMSafe();
  if (failed > 0) process.exit(1);
}

function teardownDOMSafe() {
  try { require('./helpers/dom-mock').teardownDOM(); } catch (e) { /* ignore */ }
}

function makeRenderer() {
  const r = new TokUIRenderer(eventBus);
  registerBasicComponents(r);
  registerLayoutComponents(r);
  registerFormComponents(r);
  registerPageComponents(r);
  return r;
}

function parseTop(dsl) {
  const nodes = [];
  new TokUIParser(n => nodes.push(n)).parse(dsl);
  return nodes;
}

function findType(node, type) {
  if (node.type === type) return node;
  for (const c of (node.children || [])) {
    const f = findType(c, type);
    if (f) return f;
  }
  return null;
}

function renderDsl(dsl, type) {
  const roots = parseTop(dsl);
  let target = null;
  for (const root of roots) { target = findType(root, type); if (target) break; }
  assert.ok(target, `DSL 应含 ${type}`);
  return makeRenderer().render(target);
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

function fire(el, type, evt) {
  (el._events && el._events[type] || []).forEach(fn => fn(evt || { preventDefault() {} }));
}

// =============================================
// 解析：CONTAINERS 注册 + DSL 解析
// =============================================

test('parser：六个组件均入 CONTAINERS，容器模式解析', () => {
  const { CONTAINERS } = require('../src/core/parser');
  ['page', 'page-header', 'page-sidebar', 'page-content', 'page-tabs', 'page-tab']
    .forEach(t => assert.ok(CONTAINERS.has(t), t + ' 应在 CONTAINERS'));
  const nodes = parseTop('[page][page-header tt:系统][/page-header][page-sidebar][/page-sidebar][page-content][p hi][/page-content][/page]');
  const page = nodes[0];
  assert.strictEqual(page.type, 'page');
  assert.strictEqual(page.children.length, 3, 'header/sidebar/content 三件平行');
  assert.strictEqual(page.children[2].children[0].type, 'p', 'content 收 p');
});

test('parser：sticky / closeable 入 BOOLEAN_ATTRS', () => {
  const { BOOLEAN_ATTRS } = require('../src/core/parser');
  assert.ok(BOOLEAN_ATTRS.has('sticky'));
  assert.ok(BOOLEAN_ATTRS.has('closeable'));
  const nodes = parseTop('[page-header tt:x sticky]');
  assert.strictEqual(nodes[0].attrs.sticky, true);
});

// =============================================
// page：结构 + 属性
// =============================================

test('page：三件套落位 + 未知子元素兜底主区 + _tokuiType', () => {
  const dom = renderDsl('[page][page-header tt:后台][/page-header][page-sidebar tt:系统][/page-sidebar][page-content][p 内容][/page-content][/page]', 'page');
  assert.ok(findCls(dom, 'tokui-page'));
  const header = findCls(dom, 'tokui-page-header');
  const side = findCls(dom, 'tokui-page-sidebar');
  const main = findCls(dom, 'tokui-page-content');
  assert.ok(header && side && main, '三件套齐');
  assert.strictEqual(header.parentNode, dom);
  assert.strictEqual(side.parentNode, dom);
  assert.strictEqual(main.parentNode, dom);
  assert.strictEqual(dom._tokuiType, 'page');
  assert.ok(findCls(dom, 'tokui-page-header__title').textContent === '后台');
  assert.ok(findCls(main, 'tokui-p'), 'content 子内容挂载');
});

test('page：w 合法值落 CSS 变量，非法值静默忽略', () => {
  const ok = renderDsl('[page w:280][/page]', 'page');
  assert.strictEqual(ok.style.getPropertyValue('--tokui-page-aside-w'), '280px');
  const bad = renderDsl('[page w:abc][/page]', 'page');
  assert.ok(!bad.style.getPropertyValue('--tokui-page-aside-w'), '非法值不落变量');
  const over = renderDsl('[page w:9999][/page]', 'page');
  assert.ok(!over.style.getPropertyValue('--tokui-page-aside-w'), '超界值不落变量');
});

test('page：theme 子树属性落 data-tokui-theme', () => {
  const dom = renderDsl('[page theme:dark][/page]', 'page');
  assert.strictEqual(dom.getAttribute('data-tokui-theme'), 'dark');
  const bad = renderDsl('[page theme:hacker][/page]', 'page');
  assert.strictEqual(bad.getAttribute('data-tokui-theme'), null, '非法主题静默丢弃');
});

// =============================================
// page-header：bc 面包屑 + 动作区 + upd
// =============================================

test('page-header：bc 逗号分级面包屑（末项激活）+ 动作插槽', () => {
  const dom = renderDsl('[page-header tt:用户管理 bc:"首页,系统,用户"][btn t:primary tx:新增 clk:add][/page-header]', 'page-header');
  const nav = findCls(dom, 'tokui-breadcrumb');
  assert.ok(nav, '复用 breadcrumb 样式类');
  const items = nav.querySelectorAll('.tokui-breadcrumb__item');
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[2].getAttribute('aria-current'), 'page');
  assert.ok((items[2].className || '').split(' ').indexOf('tokui-breadcrumb__item--active') !== -1);
  const actions = findCls(dom, 'tokui-page-header__actions');
  assert.ok(findCls(actions, 'tokui-btn'), 'btn 落右侧动作区');
});

test('page-header：sticky 类 + upd 就地更新 tt/bc', () => {
  const dom = renderDsl('[page-header tt:旧 bc:"a,b" sticky][/page-header]', 'page-header');
  assert.ok((dom.className || '').split(' ').indexOf('tokui-page-header--sticky') !== -1);
  dom._update({ tt: '新标题', bc: 'x,y,z' });
  assert.strictEqual(findCls(dom, 'tokui-page-header__title').textContent, '新标题');
  const items = dom.querySelectorAll('.tokui-breadcrumb__item');
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[2].textContent, 'z');
});

// =============================================
// page-sidebar：折叠联动 + 事件
// =============================================

test('page-sidebar：品牌行 + 折叠钮 + 主体插槽 + 联动 page 折叠类与上报', () => {
  const events = [];
  const r = makeRenderer();
  r._onComponentEvent = e => events.push(e);
  const nodes = parseTop('[page][page-sidebar tt:运营后台 id:ps1][menu][menu-item tx:用户 v:users][/menu][/page-sidebar][/page]');
  const pageDom = r.render(nodes[0]);
  const sidebar = findCls(pageDom, 'tokui-page-sidebar');
  assert.ok(findCls(sidebar, 'tokui-page-sidebar__brand').textContent === '运营后台');
  const body = findCls(sidebar, 'tokui-page-sidebar__body');
  assert.ok(findCls(body, 'tokui-menu'), 'menu 落主体插槽');
  const toggle = findCls(sidebar, 'tokui-page-sidebar__toggle');
  assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true');
  assert.ok((toggle.innerHTML || '').indexOf('<svg') !== -1, 'panel-left 图标');
  fire(toggle, 'click');
  assert.ok((pageDom.className || '').split(' ').indexOf('tokui-page--folded') !== -1, '折叠类落 page 根');
  assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false');
  fire(toggle, 'click');
  assert.ok((pageDom.className || '').split(' ').indexOf('tokui-page--folded') === -1);
  const toggleEvents = events.filter(e => e.type === 'page-sidebar' && e.event === 'toggle');
  assert.strictEqual(toggleEvents.length, 2);
  assert.deepStrictEqual(toggleEvents[0].detail, { folded: true });
  assert.deepStrictEqual(toggleEvents[1].detail, { folded: false });
});

test('page-sidebar：脱离 page 单独使用不崩（折叠自身类）', () => {
  const dom = renderDsl('[page-sidebar tt:独立][/page-sidebar]', 'page-sidebar');
  const toggle = findCls(dom, 'tokui-page-sidebar__toggle');
  fire(toggle, 'click');
  assert.ok((dom.className || '').split(' ').indexOf('tokui-page-sidebar--folded') !== -1);
});

// =============================================
// page-tabs：激活/切换/关闭/禁用
// =============================================

test('page-tabs：act 命中激活（按钮+面板），未命中回落首个可用', () => {
  const dom = renderDsl(
    '[page-tabs act:t2]' +
    '[page-tab n:t1 tt:列表][p A][/page-tab]' +
    '[page-tab n:t2 tt:详情][p B][/page-tab]' +
    '[/page-tabs]', 'page-tabs');
  const btns = dom.querySelectorAll('.tokui-page-tab__btn');
  assert.strictEqual(btns.length, 2);
  const wrap2 = btns[1].parentNode;
  assert.ok((wrap2.className || '').split(' ').indexOf('tokui-page-tab--active') !== -1, 'act 命中激活');
  assert.strictEqual(btns[1].getAttribute('aria-selected'), 'true');
  assert.ok(findCls(wrap2, 'tokui-page-tab__panel'), '面板存在');

  const dom2 = renderDsl(
    '[page-tabs act:ghost]' +
    '[page-tab n:t1 tt:列表][p A][/page-tab]' +
    '[page-tab n:t2 tt:详情 dis][p B][/page-tab]' +
    '[/page-tabs]', 'page-tabs');
  const first = dom2.querySelectorAll('.tokui-page-tab__btn')[0].parentNode;
  assert.ok((first.className || '').split(' ').indexOf('tokui-page-tab--active') !== -1, '未命中回落首个');
});

test('page-tabs：n 缺省用 tt 作 key；closeable 渲染关闭钮', () => {
  const dom = renderDsl(
    '[page-tabs]' +
    '[page-tab tt:概览][p A][/page-tab]' +
    '[page-tab n:x2 tt:设置 closeable][p B][/page-tab]' +
    '[/page-tabs]', 'page-tabs');
  const btns = dom.querySelectorAll('.tokui-page-tab__btn');
  assert.strictEqual(btns[0]._tokuiTabKey, '概览');
  assert.ok(findCls(btns[1], 'tokui-page-tab__close'), 'closeable 出 ×');
  assert.ok(!findCls(btns[0], 'tokui-page-tab__close'), '默认无 ×');
  const closeBtn = findCls(btns[1], 'tokui-page-tab__close');
  assert.strictEqual(closeBtn.getAttribute('aria-label'), '关闭标签页');
});

test('page-tabs：点击切换激活并上报 change；upd act 静默切换', () => {
  const events = [];
  const r = makeRenderer();
  r._onComponentEvent = e => events.push(e);
  const nodes = parseTop('[page-tabs id:tabs act:t1 on:"change:onTab"][page-tab n:t1 tt:列表][p A][/page-tab][page-tab n:t2 tt:详情][p B][/page-tab][/page-tabs]');
  const dom = r.render(nodes[0]);
  const btns = dom.querySelectorAll('.tokui-page-tab__btn');
  fire(btns[1], 'click');
  assert.ok((btns[1].parentNode.className || '').split(' ').indexOf('tokui-page-tab--active') !== -1);
  assert.ok((btns[0].parentNode.className || '').split(' ').indexOf('tokui-page-tab--active') === -1);
  const change = events.filter(e => e.event === 'change');
  assert.strictEqual(change.length, 1);
  assert.deepStrictEqual(change[0].detail, { key: 't2', title: '详情' });

  // upd 指令：act 程序化切换，静默（不再触发 change）
  r.mount({ type: 'upd', attrs: { id: 'tabs', act: 't1' }, children: [] }, createElement('div'));
  assert.ok((btns[0].parentNode.className || '').split(' ').indexOf('tokui-page-tab--active') !== -1, 'upd 切回 t1');
  assert.strictEqual(events.filter(e => e.event === 'change').length, 1, '程序化切换不上报');
});

test('page-tabs：关闭钮移除整签并上报 close，激活让位邻签', () => {
  const events = [];
  const r = makeRenderer();
  r._onComponentEvent = e => events.push(e);
  const nodes = parseTop('[page-tabs act:t2][page-tab n:t1 tt:列表 closeable][p A][/page-tab][page-tab n:t2 tt:详情 closeable][p B][/page-tab][/page-tabs]');
  const dom = r.render(nodes[0]);
  const btns = dom.querySelectorAll('.tokui-page-tab__btn');
  fire(findCls(btns[1], 'tokui-page-tab__close'), 'click');
  assert.strictEqual(dom.querySelectorAll('.tokui-page-tab__btn').length, 1, 't2 整签移除');
  assert.strictEqual(dom.querySelectorAll('.tokui-page-tab__panel').length, 1);
  const close = events.filter(e => e.event === 'close');
  assert.deepStrictEqual(close[0].detail, { key: 't2', title: '详情' });
  assert.ok((btns[0].parentNode.className || '').split(' ').indexOf('tokui-page-tab--active') !== -1, '激活让位邻签');
});

test('page-tabs：del 指令按 id 整签移除（按钮+面板同删）', () => {
  const r = makeRenderer();
  const nodes = parseTop(
    '[page-tabs act:t1]' +
    '[page-tab n:t1 tt:列表 id:tab1][p A][/page-tab]' +
    '[page-tab n:t2 tt:详情 id:tab2][p B][/page-tab]' +
    '[/page-tabs]');
  const container = createElement('div');
  const dom = r.render(nodes[0]);
  container.appendChild(dom);
  r.mount({ type: 'del', attrs: { id: 'tab2' }, children: [] }, container);
  assert.strictEqual(dom.querySelectorAll('.tokui-page-tab__btn').length, 1, 'del 后仅剩 1 页签');
  assert.strictEqual(dom.querySelectorAll('.tokui-page-tab__panel').length, 1, '面板同删');
});

test('page-tab：dis 禁用（按钮 disabled + 不参与激活回落）', () => {
  const dom = renderDsl(
    '[page-tabs]' +
    '[page-tab n:t1 tt:只读 dis][p A][/page-tab]' +
    '[page-tab n:t2 tt:可用][p B][/page-tab]' +
    '[/page-tabs]', 'page-tabs');
  const btns = dom.querySelectorAll('.tokui-page-tab__btn');
  assert.strictEqual(btns[0].getAttribute('disabled'), '');
  assert.ok((btns[1].parentNode.className || '').split(' ').indexOf('tokui-page-tab--active') !== -1, '禁用项跳过，回落可用项');
});

// =============================================
// menu 联动载荷
// =============================================

test('menu：change 载荷含 item/path（联动面包屑契约），value 向后兼容', () => {
  const r = makeRenderer();
  const got = [];
  r._onComponentEvent = e => { if (e.type === 'menu') got.push(e); };
  const nodes = parseTop('[menu id:m1][menu-item tx:用户管理 v:users][/menu]');
  const dom = r.render(nodes[0]);
  const item = findCls(dom, 'tokui-menu__item');
  fire(item, 'click');
  assert.strictEqual(got.length, 1);
  assert.strictEqual(got[0].detail.value, 'users');
  assert.strictEqual(got[0].detail.item, 'users');
  assert.deepStrictEqual(got[0].detail.path, ['users']);
});

// =============================================
// builder
// =============================================

test('builder：六方法链式生成容器 DSL（需 end 闭合）', () => {
  const { TokUIBuilder } = require('../src/server/tokui-builder');
  const b = new TokUIBuilder();
  const dsl = b
    .page({ w: 260 })
      .pageHeader({ tt: '系统管理', bc: '首页,系统,用户', sticky: true })
        .btn({ tx: '新增', t: 'primary', clk: 'add' }) // btn 自闭合，无需 end
      .end()
      .pageSidebar({ tt: '运营后台' })
        .menu({ act: 'users' }).end()
      .end()
      .pageContent()
        .pageTabs({ act: 'list', on: 'change:onTab' })
          .pageTab({ n: 'list', tt: '用户列表' }).p('A').end()
          .pageTab({ n: 'detail', tt: '详情', closeable: true }).p('B').end()
        .end()
      .end()
    .end()
    .toString();
  assert.ok(dsl.indexOf('[page w:260]') !== -1);
  assert.ok(dsl.indexOf('[page-header tt:系统管理 bc:首页,系统,用户 sticky]') !== -1);
  assert.ok(dsl.indexOf('[page-sidebar tt:运营后台]') !== -1);
  assert.ok(dsl.indexOf('[page-content]') !== -1);
  assert.ok(dsl.indexOf('[page-tabs act:list on:change:onTab]') !== -1, '无空格值不加引号（合法 DSL）');
  assert.ok(dsl.indexOf('[page-tab n:detail tt:详情 closeable]') !== -1);
  assert.ok(dsl.indexOf('[/page]') !== -1);
  // 生成的 DSL 可完整解析回同构树
  const parsed = parseTop(dsl);
  assert.strictEqual(parsed[0].type, 'page');
  assert.strictEqual(parsed[0].children.length, 3);
});

// =============================================
// 流式：分片 feed（半标签/半引号/属性中间截断）
// =============================================

function streamRender(dsl) {
  const TokUI = require('../src/index.js');
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  ui.startStream();
  // 逐 7 字符分片：覆盖半标签、属性中间、引号内截断
  for (let i = 0; i < dsl.length; i += 7) ui.feed(dsl.slice(i, i + 7));
  ui.endStream();
  return container;
}

test('流式：应用壳分片渲染与一次性结构等价（三件套 + 面包屑 + 菜单）', () => {
  const dsl = '[page w:280][page-header tt:"用户管理" bc:"首页,系统,用户" sticky][btn t:primary tx:新增 clk:add][/page-header][page-sidebar tt:运营后台][menu act:users][menu-item tx:用户管理 v:users i:👤][/menu][/page-sidebar][page-content][p hello][/p][/page-content][/page]';
  const c = streamRender(dsl);
  const page = findCls(c, 'tokui-page');
  assert.ok(page, 'page 挂载');
  assert.strictEqual(page.style.getPropertyValue('--tokui-page-aside-w'), '280px');
  assert.ok(findCls(c, 'tokui-page-header--sticky'), 'sticky 类');
  const items = c.querySelectorAll('.tokui-breadcrumb__item');
  assert.strictEqual(items.length, 3, '面包屑三段');
  assert.ok(findCls(c, 'tokui-menu__item'), '菜单流入侧栏');
  assert.ok(findCls(c, 'tokui-p'), 'content 内容');
});

test('流式：跟随激活逐页签推进（挂载即激活）→ 闭合按 act 归位；面板内容完整', () => {
  const { createElement } = require('./helpers/dom-mock');
  const TokUI = require('../src/index.js');
  const dsl = '[page-tabs act:t1][page-tab n:t1 tt:列表][p AAA][/page-tab][page-tab n:t2 tt:详情][p BBB][/page-tab][/page-tabs]';
  const container = createElement('div');
  const ui = new TokUI({ container: container });
  ui.startStream();
  const activeKey = (c) => {
    const tabs = findCls(c, 'tokui-page-tabs');
    const btns = tabs.querySelectorAll('.tokui-page-tab__btn');
    for (const b of btns) {
      if ((b.parentNode.className || '').split(' ').indexOf('tokui-page-tab--active') !== -1) return b._tokuiTabKey;
    }
    return null;
  };
  // 阶段1：只喂到第一个页签闭合——跟随应激活 t1（dom-mock 无 MO，直调 followCheck 模拟挂载回调）
  const cut = dsl.indexOf('[page-tab n:t2');
  for (let i = 0; i < cut; i += 7) ui.feed(dsl.slice(i, Math.min(i + 7, cut)));
  const tabs1 = findCls(container, 'tokui-page-tabs');
  if (tabs1._tokuiFollowCheck) tabs1._tokuiFollowCheck();
  assert.strictEqual(activeKey(container), 't1', '第一页签挂载即激活（内容流式可见）');
  // 阶段2：第二个页签到达（喂到其闭合、不含 [/page-tabs]）——跟随切到 t2
  const cut2 = dsl.lastIndexOf('[/page-tabs]');
  for (let i = cut; i < cut2; i += 7) ui.feed(dsl.slice(i, Math.min(i + 7, cut2)));
  if (tabs1._tokuiFollowCheck) tabs1._tokuiFollowCheck();
  assert.strictEqual(activeKey(container), 't2', '跟随切到最新页签');
  // 阶段3：闭合——按 act 归位 t1
  for (let i = cut2; i < dsl.length; i += 7) ui.feed(dsl.slice(i, Math.min(i + 7, dsl.length)));
  ui.endStream();
  assert.strictEqual(activeKey(container), 't1', '闭合后 act 归位 t1');
  const btns = container.querySelectorAll('.tokui-page-tab__btn');
  assert.strictEqual(btns.length, 2);
  assert.strictEqual(findCls(btns[0].parentNode, 'tokui-page-tab__panel').textContent, 'AAA');
  assert.strictEqual(findCls(btns[1].parentNode, 'tokui-page-tab__panel').textContent, 'BBB');
});

run();
