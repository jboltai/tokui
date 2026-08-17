'use strict';
// 主题令牌体系扫描（P1 / T1.1-T1.5 回归闸门）
// 1) tokui.css 引用的无 fallback 的 var(--tokui-x) 必须有定义（default.css :root 或 tokui.css 组件作用域自身定义）
// 2) 历史 bug 令牌（引用了但全库未定义）不得回归
// 3) AI 组件状态淡底/阴影走语义令牌，不留裸 Tailwind rgba/hex
// 4) 状态色类名 error/danger 双写（renderer 对 status:danger 透传生成 --danger 类）
// 纯静态扫描：fs 读 CSS，无需 DOM。

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function run() {
  let passed = 0, failed = 0;
  for (const t of tests) {
    try { t.fn(); passed++; console.log(`  ✓ ${t.name}`); }
    catch (e) { failed++; console.log(`  ✗ ${t.name}\n    ${e.message}`); }
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

const STYLES = path.join(__dirname, '..', 'src', 'styles');
const read = (p) => fs.readFileSync(p, 'utf8');
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const tokuiRaw = read(path.join(STYLES, 'tokui.css'));
const tokui = stripComments(tokuiRaw);
const defaultCss = stripComments(read(path.join(STYLES, 'themes', 'default.css')));
const themeFiles = ['default', 'dark', 'modern', 'modern-dark']
  .map((n) => stripComments(read(path.join(STYLES, 'themes', n + '.css'))));

// 令牌定义集：--tokui-x: 形式（default.css 覆盖 :root；tokui.css 内有组件作用域定义，
// 如 .tokui-sidebar 内的 --tokui-sidebar-fc，经继承供子元素引用，属合法模式）
function collectDefs(css) {
  const set = new Set();
  const re = /(--tokui[\w-]*)\s*:/g;
  let m;
  while ((m = re.exec(css))) set.add(m[1]);
  return set;
}
const defsDefault = collectDefs(defaultCss);
const defsUniversal = new Set([...defsDefault, ...collectDefs(tokui)]);

// tokui.css 引用集：var(--tokui-x) / var(--tokui-x, fallback)
function collectRefs(css) {
  const refs = [];
  const re = /var\(\s*(--tokui[\w-]+)\s*(,)?/g;
  let m;
  while ((m = re.exec(css))) refs.push({ name: m[1], hasFallback: !!m[2] });
  return refs;
}
const refs = collectRefs(tokui);

// 取某选择器（子串）之后第一个 { ... } 声明块
function ruleBody(css, selectorSubstr) {
  const i = css.indexOf(selectorSubstr);
  if (i < 0) return null;
  const open = css.indexOf('{', i);
  const close = css.indexOf('}', open);
  if (open < 0 || close < 0) return null;
  return css.slice(open + 1, close);
}

// === 1. 无 fallback 引用必须有定义 ===

test('tokui.css 无 fallback 的 var(--tokui-x) 引用全部有定义', () => {
  const missing = [...new Set(
    refs.filter((r) => !r.hasFallback && !defsUniversal.has(r.name)).map((r) => r.name)
  )];
  assert.deepStrictEqual(missing, [], `未定义令牌: ${missing.join(', ')}`);
});

// === 2. T1.1 补缺/纠错 ===

test('default.css 定义 --tokui-font-mono（四主题经 :root 继承）', () => {
  assert.ok(defsDefault.has('--tokui-font-mono'), 'default.css 缺 --tokui-font-mono');
  const m = defaultCss.match(/--tokui-font-mono\s*:\s*([^;]+);/);
  assert.ok(m && /mono/i.test(m[1]), 'font-mono 值应为等宽字体栈');
});

test('AI 组件依赖的核心语义令牌在 default.css 全部有定义', () => {
  const need = [
    '--tokui-success-bg', '--tokui-danger-bg', '--tokui-warning-bg',
    '--tokui-primary-bg', '--tokui-info-bg', '--tokui-info',
    '--tokui-callout-tip-bg', '--tokui-callout-tip-border',
    '--tokui-overlay-shadow', '--tokui-mask-bg',
    '--tokui-stripe', '--tokui-text-muted', '--tokui-primary-border',
  ];
  const missing = need.filter((t) => !defsDefault.has(t));
  assert.deepStrictEqual(missing, [], `default.css 缺: ${missing.join(', ')}`);
});

test('历史 bug 令牌不再被引用（overlay-bg / bg-secondary / text-tertiary / primary-light / fill）', () => {
  // 精确匹配令牌边界（--tokui-overlay-bg-muted 是另一个合法令牌，不算误配）
  const banned = ['--tokui-overlay-bg', '--tokui-bg-secondary', '--tokui-text-tertiary', '--tokui-primary-light', '--tokui-fill'];
  const hits = [];
  for (const t of banned) {
    const re = new RegExp('var\\(\\s*' + t + '\\s*[,)]');
    if (re.test(tokui)) hits.push(t);
  }
  assert.deepStrictEqual(hits, [], `仍在引用: ${hits.join(', ')}`);
});

test('command 遮罩走 --tokui-mask-bg', () => {
  const body = ruleBody(tokui, '.tokui-command__overlay');
  assert.ok(body && body.includes('var(--tokui-mask-bg'), `实际: ${body}`);
});

// === 3. T1.2 状态淡底令牌化 ===

test('tool-call 状态胶囊/result/error 底走语义令牌', () => {
  const done = ruleBody(tokui, '.tokui-tool-call--done .tokui-tool-call__status');
  assert.ok(done && done.includes('background: var(--tokui-success-bg)'), `done: ${done}`);
  const err = ruleBody(tokui, '.tokui-tool-call--danger .tokui-tool-call__status');
  assert.ok(err && err.includes('background: var(--tokui-danger-bg)'), `danger: ${err}`);
  const result = ruleBody(tokui, '.tokui-tool-call__result');
  assert.ok(result && result.includes('background: var(--tokui-success-bg)'), `result: ${result}`);
  const error = ruleBody(tokui, '.tokui-tool-call__error');
  assert.ok(error && error.includes('background: var(--tokui-danger-bg)'), `error: ${error}`);
});

test('agent 状态胶囊底走语义令牌', () => {
  const done = ruleBody(tokui, '.tokui-agent--done .tokui-agent__status');
  assert.ok(done && done.includes('background: var(--tokui-success-bg)'), `done: ${done}`);
  const err = ruleBody(tokui, '.tokui-agent--danger .tokui-agent__status');
  assert.ok(err && err.includes('background: var(--tokui-danger-bg)'), `danger: ${err}`);
});

test('diff 增删行底走语义令牌', () => {
  const add = ruleBody(tokui, '.tokui-diff__line--add {');
  assert.ok(add && add.includes('background: var(--tokui-success-bg)'), `add: ${add}`);
  const rm = ruleBody(tokui, '.tokui-diff__line--remove {');
  assert.ok(rm && rm.includes('background: var(--tokui-danger-bg)'), `remove: ${rm}`);
});

test('artifact 关闭钮 hover 走 danger 系令牌', () => {
  const body = ruleBody(tokui, '.tokui-artifact__close:hover');
  assert.ok(body && body.includes('var(--tokui-danger-bg)') && body.includes('var(--tokui-danger)'), `实际: ${body}`);
});

test('welcome-feature 8 个图标规则齐全且全部走令牌（无裸 hex/rgba）', () => {
  const icons = ['code', 'chart', 'doc', 'dashboard', 'print', 'chat', 'table', 'form'];
  for (const icon of icons) {
    const body = ruleBody(tokui, `.tokui-welcome-feature--${icon} .tokui-welcome-feature__icon`);
    assert.ok(body, `缺 i:${icon} 规则`);
    assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(body), `i:${icon} 仍含裸色值: ${body}`);
    assert.ok(body.includes('var(--tokui-'), `i:${icon} 未走令牌: ${body}`);
  }
});

test('callout--tip 图标走 --tokui-callout-tip-border', () => {
  const body = ruleBody(tokui, '.tokui-callout--tip .tokui-callout__icon');
  assert.ok(body && body.includes('var(--tokui-callout-tip-border'), `实际: ${body}`);
});

test('chat-input mention hover 用 --tokui-primary-bg、浮层影用 --tokui-overlay-shadow', () => {
  const hover = ruleBody(tokui, '.tokui-chat-input__mention-item:hover');
  assert.ok(hover && hover.includes('var(--tokui-primary-bg)'), `hover: ${hover}`);
  const layer = ruleBody(tokui, '.tokui-chat-input__mention {');
  assert.ok(layer && layer.includes('var(--tokui-overlay-shadow)'), `shadow: ${layer}`);
});

// === 4. T1.3 plan 脉冲 / 去 indigo ===

test('plan doing 脉冲 keyframes 用 color-mix 派生主色（无 indigo 硬编码）', () => {
  const body = ruleBody(tokui, '@keyframes tokuiPlanPulse');
  assert.ok(body, '缺 tokuiPlanPulse');
  assert.ok(body.includes('color-mix(in srgb, var(--tokui-primary) 40%, transparent)'), `实际: ${body}`);
  assert.ok(!/rgba?\(/.test(body), `仍含 rgba: ${body}`);
});

test('suggestion/command 等暗色补丁去 Tailwind 蓝，走 primary 派生', () => {
  const cmd = ruleBody(tokui, '[data-tokui-theme="dark"] .tokui-command__item--selected');
  assert.ok(cmd && cmd.includes('var(--tokui-primary-bg)') && cmd.includes('var(--tokui-primary)'), `command: ${cmd}`);
  // 暗色作用域补丁内不得再出现 off-palette 蓝/靛（var() fallback 中的历史值不在此列——它们不生效）
  const darkRules = tokui.match(/\[data-tokui-theme="dark"\][^{]*\{[^}]*\}/g) || [];
  const bad = darkRules.filter((r) => /rgba\(\s*59,\s*130,\s*246|#60a5fa|rgba\(\s*129,\s*140,\s*248/i.test(r));
  assert.deepStrictEqual(bad, [], `dark 补丁残留 Tailwind 蓝: ${bad.join(' | ')}`);
});

// === 5. T1.4 error/danger 双类名 ===

test('tool-call / agent / think-step 状态规则 error+danger 双写', () => {
  const pairs = [
    '.tokui-tool-call--error .tokui-tool-call__status',
    '.tokui-tool-call--danger .tokui-tool-call__status',
    '.tokui-tool-call__status-dot--error',
    '.tokui-tool-call__status-dot--danger',
    '.tokui-agent--error .tokui-agent__status',
    '.tokui-agent--danger .tokui-agent__status',
    '.tokui-agent__status-dot--error',
    '.tokui-agent__status-dot--danger',
    '.tokui-think-step__icon--error',
    '.tokui-think-step__icon--danger',
    '.tokui-think-step--error .tokui-think-step__title',
    '.tokui-think-step--danger .tokui-think-step__title',
  ];
  const missing = pairs.filter((s) => !tokui.includes(s));
  assert.deepStrictEqual(missing, [], `缺选择器: ${missing.join(', ')}`);
});

// === 6. T1.5 阴影 / modern-dark 补丁 ===

test('welcome-feature hover 影走 --tokui-overlay-shadow', () => {
  const body = ruleBody(tokui, '.tokui-welcome-feature:hover {');
  assert.ok(body && body.includes('var(--tokui-overlay-shadow)'), `实际: ${body}`);
});

test('modern-dark 补齐 artifact 滚动条/iframe 底与 sandbox preview 补丁', () => {
  const need = [
    '[data-tokui-theme="modern-dark"] .tokui-artifact__code',
    '[data-tokui-theme="modern-dark"] .tokui-artifact__iframe',
    '[data-tokui-theme="modern-dark"] .tokui-sandbox__preview',
  ];
  const missing = need.filter((s) => !tokui.includes(s));
  assert.deepStrictEqual(missing, [], `缺 modern-dark 补丁: ${missing.join(', ')}`);
});

test('四主题文件不含 color-scheme（Lightning CSS 会改写变量块）', () => {
  themeFiles.forEach((css, i) => {
    assert.ok(!/color-scheme/.test(css), `themes/${['default', 'dark', 'modern', 'modern-dark'][i]}.css 含 color-scheme`);
  });
});

// === 7. P2 视觉重设计（bubble / suggestions / chat-input / terminal / code 高亮 / 零散 rgba） ===

test('--tokui-bubble-* 6 令牌四主题全部定义（default 补齐倒挂）', () => {
  const tokens = [
    '--tokui-bubble-user-bg', '--tokui-bubble-user-text',
    '--tokui-bubble-user-avatar-bg', '--tokui-bubble-user-avatar-text',
    '--tokui-bubble-ai-avatar-bg', '--tokui-bubble-ai-avatar-text',
  ];
  themeFiles.forEach((css, i) => {
    const defs = collectDefs(css);
    const missing = tokens.filter((t) => !defs.has(t));
    assert.deepStrictEqual(missing, [], `themes/${['default', 'dark', 'modern', 'modern-dark'][i]}.css 缺: ${missing.join(', ')}`);
  });
});

test('bubble 默认主题去米色/深海军蓝硬编码（A1 防回归）', () => {
  const banned = ['#f0ebe4', '#2c2825', '#e8e4df', '#6b6560', '#1a1a2e', '#3b3b5c', '#d0d0e0'];
  const all = tokui + themeFiles.join('\n');
  const hits = banned.filter((c) => all.includes(c));
  assert.deepStrictEqual(hits, [], `bubble 历史硬编码残留: ${hits.join(', ')}`);
});

test('terminal 3 令牌 default.css 定义且 tokui.css 走令牌', () => {
  const tokens = ['--tokui-terminal-bg', '--tokui-terminal-text', '--tokui-terminal-titlebar'];
  const missing = tokens.filter((t) => !defsDefault.has(t));
  assert.deepStrictEqual(missing, [], `default.css 缺: ${missing.join(', ')}`);
  const term = ruleBody(tokui, '.tokui-terminal {');
  assert.ok(term && term.includes('var(--tokui-terminal-bg') && term.includes('var(--tokui-terminal-text'), `terminal: ${term}`);
  const bar = ruleBody(tokui, '.tokui-terminal__titlebar {');
  assert.ok(bar && bar.includes('var(--tokui-terminal-titlebar'), `titlebar: ${bar}`);
  // dark / modern-dark 边框分层补丁齐全
  assert.ok(tokui.includes('[data-tokui-theme="dark"] .tokui-terminal,') && tokui.includes('[data-tokui-theme="modern-dark"] .tokui-terminal'), '缺 terminal 暗色边框补丁');
});

test('code 语法高亮 7 令牌 default/dark 双板定义，fallback 为浅色板', () => {
  const tokens = ['--tokui-code-kw', '--tokui-code-str', '--tokui-code-num', '--tokui-code-fn', '--tokui-code-type', '--tokui-code-op', '--tokui-code-cmt'];
  const defsDark = collectDefs(themeFiles[1]);
  assert.deepStrictEqual(tokens.filter((t) => !defsDefault.has(t)), [], 'default.css 缺高亮令牌');
  assert.deepStrictEqual(tokens.filter((t) => !defsDark.has(t)), [], 'dark.css 缺高亮令牌');
  // tokui.css fallback 与 default 浅色板一致（GitHub Light kw）
  const kw = ruleBody(tokui, '.tokui-code .tok-kw');
  assert.ok(kw && kw.includes('var(--tokui-code-kw, #cf222e)'), `kw fallback 非浅色板: ${kw}`);
  assert.ok(!tokui.includes('var(--tokui-code-kw, #c678dd)'), 'kw fallback 仍是 One Dark');
});

test('suggestions 列数走 __grid--1..4 类，卡片无 3px 左条/双层影（A5 减重）', () => {
  for (const n of [1, 2, 3, 4]) {
    assert.ok(tokui.includes('.tokui-suggestions__grid--' + n), `缺 __grid--${n} 类`);
  }
  const card = ruleBody(tokui, '.tokui-suggestion {');
  assert.ok(card && !card.includes('border-left') && !/box-shadow/.test(card), `suggestion 仍重: ${card}`);
  assert.ok(card.includes('border: 1px solid var(--tokui-border'), `suggestion 边框未归一: ${card}`);
});

test('chat-input 1px 边框 + 单层 focus 环 + 发送钮走 inverse 令牌', () => {
  const box = ruleBody(tokui, '.tokui-chat-input {');
  assert.ok(box && box.includes('border: 1px solid') && !/box-shadow\s*:/.test(box), `chat-input: ${box}`);
  const focus = ruleBody(tokui, '.tokui-chat-input:focus-within {');
  assert.ok(focus && focus.includes('var(--tokui-primary-border)') && !focus.includes('rgba('), `focus: ${focus}`);
  const send = ruleBody(tokui, '.tokui-chat-input__send {');
  assert.ok(send && send.includes('var(--tokui-btn-text-inverse'), `send: ${send}`);
});

test('latency--total / test-case__error 走语义淡底令牌，agent 空 body 去 margin', () => {
  const lat = ruleBody(tokui, '.tokui-latency--total');
  assert.ok(lat && lat.includes('var(--tokui-success-bg)'), `latency: ${lat}`);
  const terr = ruleBody(tokui, '.tokui-test-case__error {');
  assert.ok(terr && terr.includes('var(--tokui-danger-bg)'), `test-case__error: ${terr}`);
  assert.ok(tokui.includes('.tokui-agent__body:empty'), '缺 agent __body:empty 规则');
});

run();
