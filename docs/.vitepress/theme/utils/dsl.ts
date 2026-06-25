/**
 * TokUI DSL 格式化 + 语法高亮（文档站专用，零依赖）
 *
 * - formatTokui(raw)：缩进对齐，移植自 demo/assets/js/demo.js，CONTAINERS 升级为 parser.js 全量 87 项。
 * - highlightTokui(raw)：状态机 tokenizer，逐 token 转义 + 包 span，输出 HTML。
 * - renderDslCode(raw)：format → highlight 组合，供 Playground/Demo 直接 v-html。
 *
 * 纯字符串处理，无 DOM 依赖 → VitePress SSG 安全。
 * 仅处理作者写死的文档 DSL（非用户输入），且每片文本都经 escapeHtml，v-html 安全。
 */

// 与 src/core/parser.js 的 CONTAINERS 保持一致（87 项容器，格式化换行的判定依据）
const FORMAT_CONTAINERS = new Set([
  'form', 'table', 'thead', 'tbody',
  'card', 'ft', 'row', 'col', 'list',
  'select', 'radio', 'code', 'imgs', 'md',
  'textarea', 'tabs', 'tab', 'accordion', 'collapse', 'dialog',
  'btngroup', 'picker', 'timeline', 'steps', 'drawer',
  'ol', 'ul', 'i', 'item', 'think', 'think-chain', 'think-step',
  'bubble', 'toolbar', 'badge-box', 'dropdown', 'transfer',
  'cascader', 'tree', 'tn', 'desc', 'carousel',
  'popover', 'input-tag', 'watermark', 'menu',
  'chat-input', 'msg-actions',
  'tool-call', 'diff', 'quick-reply',
  'plan', 'plan-step', 'file-tree', 'ft-folder',
  'terminal', 'sandbox', 'test-result', 'test-case',
  'quote', 'agent', 'toggle-group',
  'conversations',
  'welcome', 'welcome-feature',
  'suggestions', 'suggestion',
  'attachments',
  'artifact', 'artifact-code', 'artifact-preview',
  'scroll-area',
  'sidebar', 'sidebar-content', 'sidebar-footer',
  'command', 'command-group',
  'hover-card', 'hover-trigger', 'hover-content',
  'resizable',
  'canvas', 'canvas-content',
  'carousel-item',
  'chart',
]);

interface TokTag { type: 'text' | 'open' | 'close'; name?: string; raw: string; }

/**
 * 缩进格式化：扫描 [..] 标签（引号内不切分），容器标签换行缩进，自闭合与裸文本保持。
 */
export function formatTokui(raw: string): string {
  if (!raw) return '';
  const tags: TokTag[] = [];
  let rest = raw;
  while (rest.length) {
    const open = rest.indexOf('[');
    if (open === -1) { if (rest.trim()) tags.push({ type: 'text', raw: rest.trim() }); break; }
    if (open > 0 && rest.slice(0, open).trim()) tags.push({ type: 'text', raw: rest.slice(0, open).trim() });
    let inQuote = false, close = -1;
    for (let i = open + 1; i < rest.length; i++) {
      const c = rest[i];
      // 标签恒单行：] 扫描不跨 \n，遇行尾即收尾（与 highlightTokui 同一不变量）
      if (c === '"') inQuote = !inQuote;
      else if (c === ']' && !inQuote) { close = i; break; }
      else if (c === '\n') { close = i; break; }
    }
    if (close === -1) break;
    const tagContent = rest.slice(open + 1, close);
    rest = rest.slice(close + 1);
    if (tagContent.startsWith('/')) {
      tags.push({ type: 'close', name: tagContent.slice(1).trim(), raw: '[/' + tagContent.slice(1).trim() + ']' });
    } else {
      const sp = tagContent.search(/\s/);
      const tagName = sp === -1 ? tagContent : tagContent.slice(0, sp);
      tags.push({ type: 'open', name: tagName, raw: '[' + tagContent + ']' });
    }
  }
  // 判定哪些 open 标签真正有配对 close（用于决定是否增缩进）
  const hasClose = new Set<number>();
  const stack: Array<{ name: string; index: number }> = [];
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].type === 'open' && tags[i].name && FORMAT_CONTAINERS.has(tags[i].name)) stack.push({ name: tags[i].name, index: i });
    else if (tags[i].type === 'close') {
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].name === tags[i].name) { hasClose.add(stack[j].index); stack.splice(j, 1); break; }
      }
    }
  }
  const IND = '  ';
  const lines: string[] = [];
  let depth = 0;
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    if (tag.type === 'close') {
      depth = Math.max(0, depth - 1);
      lines.push(IND.repeat(depth) + tag.raw);
    } else if (tag.type === 'open' && tag.name && FORMAT_CONTAINERS.has(tag.name) && hasClose.has(i)) {
      lines.push(IND.repeat(depth) + tag.raw);
      depth++;
    } else {
      lines.push(IND.repeat(depth) + tag.raw);
    }
  }
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const span = (cls: string, text: string) => `<span class="${cls}">${escapeHtml(text)}</span>`;

/**
 * 高亮单个标签内部（不含外层方括号）。
 * interior = '[' 与 ']' 之间的原始内容（未转义）。
 */
function highlightInterior(interior: string): string {
  // 闭合标签 [/name ...]（少见，多数 close 只有 name）
  if (interior.startsWith('/')) {
    const name = interior.slice(1).trim();
    return span('tok-bracket', '/') + (name ? span('tok-tag', name) : '');
  }
  // 抽取首 token = 标签名
  let i = 0;
  const n = interior.length;
  const out: string[] = [];
  // 跳过前导空白
  while (i < n && /\s/.test(interior[i])) i++;
  // 读 tag name（到空白或 : 或 ] 或 "）
  let nameStart = i;
  while (i < n && !/[\s:"]/.test(interior[i])) i++;
  const tagName = interior.slice(nameStart, i);
  if (tagName) out.push(span('tok-tag', tagName));

  // 剩余部分：属性 key:value / 裸布尔 / 文本内容，引号整体吞
  while (i < n) {
    const ch = interior[i];
    if (/\s/.test(ch)) { out.push(escapeHtml(ch)); i++; continue; }
    if (ch === '"') {
      // 字符串字面量（不在 key: 之后时，作为文本/值）
      // 未闭合引号只吞到行尾（\n）或 tag 尾，不跨行/不吞其他标签
      let j = i + 1;
      while (j < n && interior[j] !== '"' && interior[j] !== '\n') j++;
      const end = j < n && interior[j] === '"' ? j + 1 : j;
      out.push(span('tok-string', interior.slice(i, end)));
      i = end;
      continue;
    }
    // 读一个 token（到空白或 " ）
    let tokStart = i;
    while (i < n && !/[\s"]/.test(interior[i])) i++;
    let token = interior.slice(tokStart, i);
    if (!token) { i++; continue; }
    // key:value 形态
    const colon = token.indexOf(':');
    if (colon > 0) {
      const key = token.slice(0, colon);
      let val = token.slice(colon + 1);
      // 值可能是带引号但引号被空格拆开的情况：若 val 以 " 开头但未闭合，继续吞到闭合
      // 同样在 \n 处止步，防半个引号吞掉整行
      if (val.startsWith('"') && !val.endsWith('"')) {
        while (i < n && interior[i] !== '"' && interior[i] !== '\n') { val += interior[i]; i++; }
        if (i < n && interior[i] === '"') { val += interior[i]; i++; }
      }
      const valClass = key === 'v' ? 'tok-variant' : 'tok-val';
      out.push(span('tok-attr', key) + span('tok-punct', ':') + span(valClass, val));
    } else if (token.startsWith('v:')) {
      // 形如 v:primary 无值时（理论上 v 必有值，兜底）
      out.push(span('tok-variant', token));
    } else {
      // 布尔属性 / 裸文本
      // 启发式：纯字母数字短串更像布尔属性
      out.push(span('tok-bool', token));
    }
  }
  return out.join('');
}

/**
 * 高亮整段 DSL：扫描 [..]（引号内不切分），括号内走 highlightInterior，括号外为文本。
 */
export function highlightTokui(raw: string): string {
  if (!raw) return '';
  const out: string[] = [];
  let i = 0;
  const n = raw.length;
  while (i < n) {
    const open = raw.indexOf('[', i);
    if (open === -1) {
      out.push(span('tok-text', raw.slice(i)));
      break;
    }
    if (open > i) out.push(span('tok-text', raw.slice(i, open)));
    // 找匹配的 ]（引号内不切分）。不变量：DSL 标签恒单行，] 扫描永不跨 \n——
    // 遇 \n 即在本行收尾（无论引号是否闭合）。这样删半个引号时，单独的 " 最多把
    // 本行染成 string，无法跨行吞并后续标签（否则多个 [..] 会被合并成一个 interior，
    // 后续整段代码被当成字符串，致其他元素「渲染不出来」）
    let inQuote = false, close = -1, nlClose = false;
    for (let j = open + 1; j < n; j++) {
      const c = raw[j];
      if (c === '"') inQuote = !inQuote;
      else if (c === ']' && !inQuote) { close = j; break; }
      else if (c === '\n') { close = j; nlClose = true; break; } // 行尾兜底收尾：标签不跨行
    }
    if (close === -1) {
      // 未闭合（无 ] 无 \n，到 EOF），原样输出剩余
      out.push(escapeHtml(raw.slice(open)));
      break;
    }
    const interior = raw.slice(open + 1, close);
    if (nlClose) {
      // 行尾兜底闭合：interior 已含本行真实 ]（若有）；不补不存在的 ]。
      // i 停在 \n 让换行符作为下一轮前导文本保留（textarea/pre 逐字对齐必需）
      out.push(span('tok-bracket', '[') + highlightInterior(interior));
      i = close;
    } else {
      out.push(span('tok-bracket', '[') + highlightInterior(interior) + span('tok-bracket', ']'));
      i = close + 1;
    }
  }
  return out.join('');
}

/** 组合：先格式化，再高亮。供组件 v-html 直接使用。 */
export function renderDslCode(raw: string): string {
  return highlightTokui(formatTokui(raw));
}
