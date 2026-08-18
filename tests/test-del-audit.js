/**
 * del/ins 可达性全组件审计（回归闸门）
 * 背景：id 落 DOM 曾靠各组件手写，仅部分组件支持 [del id:]，其余静默无效；
 * 且缺 _tokuiType 的组件嵌套时 del 会误删祖先容器。现由 renderer 集中兜底
 * （render() 盖 _tokuiType + 补 id），本审计把「每个注册组件都可被 del 命中」固化为闸门：
 * 新增组件若绕过兜底（返回多根 /  fragment 等）会在此立刻暴露。
 */
'use strict';

const assert = require('assert');
const { setupDOM, createElement } = require('./helpers/dom-mock');
setupDOM();

const TokUI = require('../src/index.js');
const { TokUIRenderer } = require('../src/core/renderer');
const eventBus = require('../src/core/event-bus');
const { registerAllComponents } = require('../src/components/index');
const { CONTAINERS } = require('../src/core/parser');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function run() {
  let passed = 0, failed = 0;
  for (const t of tests) {
    try { t.fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + t.name); }
    catch (e) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + t.name); console.log('    ' + e.message); }
  }
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}

// 豁免清单（均须注明原因；新增豁免意味着该组件放弃 del/ins 锚点能力）
const EXEMPT = {
  upd: '指令组件，自身无 DOM',
  del: '指令组件，自身无 DOM',
  ins: '指令组件，自身无 DOM',
  tcol: '表格列定义，无独立 DOM（属性载体）',
  countdown: 'dom-mock 缺 replaceChild 支持，走错误边界；浏览器由同一兜底覆盖',
  toast: '依赖 document.querySelector 全局单例，dom-mock 不支持；瞬态组件无需 del',
  watermark: 'dom-mock 缺 canvas.getContext，走错误边界；浏览器由同一兜底覆盖',
};

// 需要最小属性/子节点才能正常渲染的组件
const SPECIAL = {
  chart: '[chart id:{ID} t:bar][pt l:A v:1][/chart]',
  table: '[table id:{ID}][thead h:列1][/thead][tbody][tr 数据1][/tbody][/table]',
  tabs: '[tabs id:{ID}][tab tt:页1]内容[/tab][/tabs]',
  accordion: '[accordion id:{ID}][collapse tt:项1]内容[/collapse][/accordion]',
  form: '[form id:{ID} n:f1][input n:x][/form]',
  select: '[select id:{ID} n:s1][opt v:1 l:一][/select]',
  radio: '[radio id:{ID} n:r1][opt v:1 l:一][/radio]',
  checkbox: '[checkbox id:{ID} n:c1 l:选项]',
  picker: '[picker id:{ID} n:p1][opt v:1 l:一][/picker]',
  transfer: '[transfer id:{ID} n:tr1]',
  cascader: '[cascader id:{ID} n:cs1]',
  menu: '[menu id:{ID}][item tx:项1][/menu]',
  tree: '[tree id:{ID}][tn l:节点1 leaf][/tree]',
  steps: '[steps id:{ID}][step tt:步1][/steps]',
  timeline: '[timeline id:{ID}][item tx:事1][/timeline]',
  command: '[command id:{ID}][command-group][command-item tx:打开 v:open][/command-group][/command]',
  carousel: '[carousel id:{ID}][img s:a.png][/carousel]',
  imgs: '[imgs id:{ID}][img s:a.png][/imgs]',
  'preview-group': '[preview-group id:{ID}][img s:a.png][/preview-group]',
  suggestions: '[suggestions id:{ID}][suggestion tt:建议1][/suggestions]',
  'quick-reply': '[quick-reply id:{ID}][btn tx:好][/quick-reply]',
  'file-tree': '[file-tree id:{ID}][ft-folder n:dir][/file-tree]',
  'think-chain': '[think-chain id:{ID}][think-step tt:步1][/think-chain]',
  badge: '[badge id:{ID} v:99]',
  popover: '[popover id:{ID} tx:内容][btn tx:锚][/popover]',
  dropdown: '[dropdown id:{ID}][item tx:项1][/dropdown]',
  tour: '[tour id:{ID}]',
  artifact: '[artifact id:{ID} tt:工件][/artifact]',
  agent: '[agent id:{ID} n:bot]',
  welcome: '[welcome id:{ID} tt:欢迎]',
  sidebar: '[sidebar id:{ID}][/sidebar]',
  resizable: '[resizable id:{ID}][/resizable]',
  masonry: '[masonry id:{ID}][/masonry]',
  canvas: '[canvas id:{ID}][/canvas]',
  diff: '[diff id:{ID}][/diff]',
  plan: '[plan id:{ID}][/plan]',
  'msg-actions': '[msg-actions id:{ID}]',
  'chat-input': '[chat-input id:{ID}]',
  'tool-call': '[tool-call id:{ID} n:fn1]',
  btngroup: '[btngroup id:{ID}][btn tx:A][/btngroup]',
  dialog: '[dialog id:{ID} tt:框][/dialog]',
  drawer: '[drawer id:{ID} tt:屉][/drawer]',
  'print-area': '[print-area id:{ID}][/print-area]',
  segmented: '[segmented id:{ID} n:sg1 opt:"a:A;b:B"]',
  'color-picker': '[color-picker id:{ID} n:cp1]',
  datepicker: '[datepicker id:{ID} n:dp1]',
  numinput: '[numinput id:{ID} n:ni1]',
  'input-tag': '[input-tag id:{ID} n:it1]',
  'float-button': '[float-button id:{ID}]',
  'badge-box': '[badge-box id:{ID}][btn tx:铃][/badge-box]',
  desc: '[desc id:{ID}][item l:名 tx:值][/desc]',
  'scroll-area': '[scroll-area id:{ID}]内容[/scroll-area]',
  ft: '[ft id:{ID} tx:页脚]', // 空 ft 按设计不渲染，须带内容
};

test('全部注册组件：id 落 DOM 且 [del id:] 可移除（不波及兄弟）', () => {
  const rc = new TokUIRenderer(eventBus);
  registerAllComponents(rc);
  const types = Object.keys(rc.registry).sort();
  const failures = [];
  let covered = 0;

  for (const type of types) {
    if (EXEMPT[type]) continue;
    const id = 'audit-' + type;
    let dsl = SPECIAL[type];
    if (dsl) {
      dsl = dsl.replace('{ID}', id);
    } else {
      dsl = CONTAINERS.has(type)
        ? '[' + type + ' id:' + id + '][/' + type + ']'
        : '[' + type + ' id:' + id + ']';
    }
    const container = createElement('div');
    const ui = new TokUI({ container: container });
    try {
      ui.render(dsl);
      const hit = container.querySelector('[id="' + id + '"]');
      if (!hit) { failures.push(type + ': id 未落 DOM'); continue; }
      if (/(^|\s)tokui-error(\s|$)/.test(hit.className || '')) { failures.push(type + ': 走了错误边界'); continue; }
      // 哨兵兄弟：验证 del 精确命中，不误删
      ui.render('[typing id:sentinel text:哨兵]');
      ui.render('[del id:' + id + ']');
      if (container.querySelector('[id="' + id + '"]')) { failures.push(type + ': del 未移除'); continue; }
      if (!container.querySelector('[id="sentinel"]')) { failures.push(type + ': del 误删兄弟'); continue; }
      covered++;
    } catch (e) {
      failures.push(type + ': 抛异常 ' + e.message.slice(0, 60));
    }
  }

  assert.ok(covered > 150, '审计覆盖数异常（当前 ' + covered + '），注册表读取可能失败');
  assert.deepStrictEqual(failures, [], '以下组件 del 审计失败：\n    ' + failures.join('\n    '));
  console.log('    [audit] ' + covered + ' 个组件通过，豁免 ' + Object.keys(EXEMPT).length + ' 个');
});

run();
