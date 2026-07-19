/**
 * TokUI 解析器模块
 * 将 TokUI DSL 文本（如 [h1 标题]、[card tt:信息]...[/card]）解析为节点树。
 * 支持一次性解析和流式增量解析两种模式。
 *
 * 节点结构: { type, attrs, content, children }
 * - type: 标签名（如 h1, card, _text）
 * - attrs: 属性键值对（如 { tt: '信息', stripe: true }）
 * - content: 文本内容
 * - children: 子节点数组
 */
'use strict';

/**
 * 查找字符串中不在引号内的闭合方括号位置
 * 用于正确处理包含空格的引号属性值（如 ph:"请 输入"）
 *
 * @param {string} str - 待搜索的字符串
 * @returns {number} 闭合括号索引，未找到返回 -1
 */
function findCloseBracket(str) {
  let inQuote = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"') {
      inQuote = !inQuote;
    } else if (str[i] === ']' && !inQuote) {
      return i;
    }
  }
  return -1;
}

/**
 * tr 标签专用闭合查找：括号深度 + 引号双感知。
 * tr 单元格可能含内联组件 [btn:...]/[img:...]（其内层 ] 不能误关 tr），
 * 或双引号包裹的含 ] / , 文本。findCloseBracket 只引号感知，会在内层 ] 误关 tr
 * → 单元格泄漏、串行。此处按 [ 深度跳过配对的内层 ]。
 * 注：TAG_OPEN 态 buffer 已剥掉 tr 自身的外层 [（从 tag 名开始），故 depth 从 0 起计，
 *     首个 depth=0 的 ] 即 tr 自身闭合；引号内的 [ ] 一律视为字面。
 */
function findTrCloseBracket(str) {
  let inQuote = false;
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (!inQuote) {
      if (ch === '[') depth++;
      else if (ch === ']') {
        if (depth === 0) return i;
        depth--;
      }
    }
  }
  return -1;
}

/**
 * 容器类型集合
 * 这些标签需要开闭标签配对（如 [card]...[/card]），
 * 解析时会将其子节点收集到 children 数组中。
 * 非容器标签为自闭合类型（如 [h1 标题]、[hr]）。
 */
const CONTAINERS = new Set([
  'form', 'table', 'thead', 'tbody',
  'card', 'ft', 'row', 'col', 'list',
  'select', 'radio', 'checkbox', 'code', 'imgs', 'md',
  'textarea', 'tabs', 'tab', 'accordion', 'collapse', 'dialog',
  'btngroup', 'picker', 'timeline', 'steps', 'drawer',
  'ol', 'ul', 'i', 'item', 'think', 'think-chain', 'think-step',
  'bubble', 'toolbar', 'badge-box', 'dropdown', 'transfer', 'callout',
  'cascader', 'tree', 'tn', 'desc', 'carousel',
  'popover', 'input-tag', 'watermark', 'menu',
  'print-area',
  'chat-input', 'msg-actions',
  'tool-call', 'diff', 'quick-reply',
  'plan', 'file-tree', 'ft-folder',
  'terminal', 'sandbox', 'test-result',
  'quote', 'toggle-group',
  'conversations',
  'welcome', 'welcome-feature',
  'suggestions',
  'attachments',
  'artifact', 'artifact-code', 'artifact-preview',
  'scroll-area',
  'sidebar', 'sidebar-content', 'sidebar-footer',
  'command', 'command-group',
  'hover-card', 'hover-trigger', 'hover-content',
  'resizable',
  'canvas', 'canvas-content',
  'chart',
  'p'
]);

// chart 自闭合内联数据判定 —— 须与 builder.chart 的 hasInline、renderer 容器判定三处同步：
// d / tasks / rows / nodes+flows / gauge·progress 的 v 任一存在 → 自闭合；否则容器模式收子节点。
// 不同步会导致：cols 误触发自闭合（容器写法 [/chart] 报错）、或自闭合图被误判容器丢失流式预览。
function chartHasInline(node) {
  if (!node || node.type !== 'chart') return false;
  var a = node.attrs || {};
  return !!(a.d || a.tasks || a.rows || (a.nodes && a.flows) ||
    (a.v !== undefined && (a.t === 'gauge' || a.t === 'progress')));
}

// radio/select/checkbox 带 opt:"..." 属性 → 原子自闭合简写（renderer 展开）。
// 须与 _emitStreaming / _emitBuffered 两路同步：判定为自闭合即不入容器栈。
function isOptShorthandSelfClosing(node) {
  if (node.type !== 'radio' && node.type !== 'select' && node.type !== 'checkbox') return false;
  return !!(node.attrs && node.attrs.opt);
}
// checkbox 在 CONTAINERS 内，但单布尔（无 multi 无 opt）须维持自闭合叶子，兼容 legacy。
// 仅 multi 标记触发容器模式收 opt 子节点。
function isCheckboxSingleSelfClosing(node) {
  return node.type === 'checkbox'
    && (node.attrs ? node.attrs.multi : undefined) === undefined
    && !isOptShorthandSelfClosing(node);
}

// 纯自闭合大块组件：流式期 emit 骨架占位（pending），] 到达 swap 为真节点（finalize）。
// 仅收「无法容器化、体积大、pop-in 洞明显」的类型；小件(tag/btn/dot 等)保持 pop-in，不骨架。
// 容器型大文本(callout/code/md/terminal/diff)用容器模式实现真流式，不在此列。
const SKELETON_ELIGIBLE = new Set([
  'stat', 'img', 'avatar', 'result', 'empty',
  'video', 'audio', 'file', 'attach', 'commit'
]);
const SKELETON_TYPE_RE = /^(stat|img|avatar|result|empty|video|audio|file|attach|commit)\b/;

// p 的内联子节点白名单：只有这些类型可作为 p 的子节点（其余兄弟到达时自动闭合 p，
// 保 [p 文本] / [p a][p b] 的自闭合兄弟语义，对标 HTML <p>）。
const P_INLINE_CHILDREN = new Set([
  'a', '_text', 'tag', 'b', 'i', 'code', 'spin', 'strong', 'em', 'mark', 'sub', 'sup'
]);

/**
 * 解析标签内部文本为节点对象
 * 处理流程：
 * 1. 提取引号内容并替换为占位符，避免空格分割破坏引号值
 * 2. 按空格分割为 token 数组
 * 3. 第一个 token 为标签类型
 * 4. 后续 token 按 key:value 解析为属性，布尔属性单独处理
 * 5. 非属性 token 拼接为文本内容
 *
 * @param {string} raw - 方括号内的原始文本（不含 [ ]）
 * @returns {Object} 解析后的节点 { type, attrs, content, children }
 */
const BOOLEAN_ATTRS = new Set([
  'stripe', 'dis', 'ro', 'req', 'chk', 'multi', 'disabled',
  'readonly', 'required', 'checked', 'multiple', 'striped', 'auto', 'plain',
  'round', 'closable', 'bordered', 'open', 'pill', 'dot', 'leaf',
  'inline', 'rounded', 'container',
  'copy', 'regenerate', 'like', 'dislike', 'visible', 'delete',
  'controls', 'open',
  'active',
  'collapsible',
  'toggle',
  'search',
  'thumb',
  'reset',
  'print',
  'show-total',
  'live'
]);

// 变体提示（Variant hints）
// 当标签已出现 v: 时，紧跟的裸 token 若命中该组件的已知变体名，则并入 v 而非当作正文。
// 数据来源优先 setVariantHints 注入；否则回退读 window.TokUI._internal.VARIANTS（renderer 已挂载）。
// Why: 兼容 [p v:center muted 文本] 这种「空格分隔多变体」写法，避免 muted 漏进正文。
var _VARIANT_HINTS = null;
function setVariantHints(map) { _VARIANT_HINTS = map; }
function _knownVariantsOf(type) {
  if (_VARIANT_HINTS) return _VARIANT_HINTS[type];
  if (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal) {
    var v = window.TokUI._internal.VARIANTS;
    return v ? v[type] : null;
  }
  return null;
}

// 已知属性 key 白名单（短标识符）：用于检测 CJK 值后「漏空格」粘连的下个属性。
// 例：AI 写 [item l:服务费（10%）tx:¥48.20]（全角）后漏空格），据此切成 l:服务费（10%） + tx:¥48.20。
var ATTR_KEYS = new Set([
  't', 'l', 'tx', 'tt', 'ph', 'u', 's', 'n', 'v', 'w', 'h',
  'clk', 'sub', 'act', 'mtd', 'dis', 'ro', 'req', 'chk', 'id',
  'bg', 'fc', 'cap', 'cols', 'span', 'min', 'max', 'step',
  'alt', 'target', 'src', 'name', 'value', 'pre', 'pos'
]);

// 值尾部若粘连「<非ASCII><已知key>:」→ 拆成多对属性（修复 AI 漏空格）。
// 守卫：仅当值含非ASCII且含内部冒号时才进；纯ASCII值（URL/时间/版本号）零成本跳过、零误伤。
// 返回 [[key,val],...]；无粘连则返回 [[key, val]]。
function _expandAttrKeyVal(key, val) {
  var pairs = [];
  while (true) {
    var m = val.match(/^([\s\S]*?[^\x00-\x7f])([a-zA-Z][a-zA-Z0-9]{0,6}):([\s\S]*)$/);
    if (!m) break;
    var k2 = m[2];
    if (!ATTR_KEYS.has(k2)) break;
    pairs.push([key, m[1]]);
    key = k2;
    val = m[3];
  }
  pairs.push([key, val]);
  return pairs;
}

function parseTag(raw) {
  if (!raw || !raw.trim()) {
    return { type: '_text', attrs: {}, content: '', children: [] };
  }
  const node = { type: '', attrs: {}, content: '', children: [] };

  // 提取引号段，替换为占位符 __QUOTE0__, __QUOTE1__ ...
  // 支持转义引号 \"，避免嵌套引号场景（如 tr 含逗号的 cell 值）解析失败
  const quotes = [];
  let processed = raw.replace(/"((?:[^"\\]|\\.)*)"/g, (match, content) => {
    quotes.push(content.replace(/\\"/g, '"'));
    return `__QUOTE${quotes.length - 1}__`;
  });

  // 按空格分割 token
  const tokens = processed.split(/\s+/);

  // 第一个 token 始终是标签类型
  node.type = tokens[0];

  // 逐个解析后续 token
  const contentParts = [];
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    const colonIdx = token.indexOf(':');
    if (colonIdx > 0) {
      const key = token.slice(0, colonIdx);
      // 属性名须为英文标识符（tt/tx/clk/data-* 等）；
      // 含中文等非 ASCII 的「标签:值」文本（如「框架:React」「语言:TypeScript」）按正文处理，不当属性
      if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) {
        let val = token.slice(colonIdx + 1);
        // 还原引号占位符
        val = val.replace(/__QUOTE(\d+)__/g, (_, idx) => quotes[parseInt(idx)]);
        // 漏空格容错：CJK 值尾部粘连「<非ASCII><已知key>:」时拆成多属性
        // （如 AI 写 [item l:服务费（10%）tx:¥48.20]，全角）后漏空格）
        // 守卫：仅 CJK 值且含内部冒号才进，纯 ASCII 值零成本跳过
        if (/[^\x00-\x7f]/.test(val) && val.indexOf(':') !== -1) {
          _expandAttrKeyVal(key, val).forEach(function (kv) { node.attrs[kv[0]] = kv[1]; });
        } else {
          node.attrs[key] = val;
        }
      } else {
        const withQuotes = token.replace(/__QUOTE(\d+)__/g, (_, idx) => `"${quotes[parseInt(idx)]}"`);
        contentParts.push(withQuotes);
      }
    } else {
      // 非属性 token
      const unquoted = token.replace(/__QUOTE(\d+)__/g, (_, idx) => quotes[parseInt(idx)]);
      // 智能变体吸收：v: 已出现 且 裸 token 是该组件已知变体 → 并入 v（逗号续写），不当正文
      // 仅在 v: 存在时触发，避免误吞 [p center 文本] 这种纯文本意图
      if (node.attrs.v) {
        const knownVariants = _knownVariantsOf(node.type);
        if (knownVariants && knownVariants.has && knownVariants.has(unquoted)) {
          node.attrs.v = node.attrs.v + ',' + unquoted;
          continue;
        }
      }
      // 布尔属性（如 stripe、disabled 等，出现即为 true）
      if (BOOLEAN_ATTRS.has(unquoted)) {
        node.attrs[unquoted] = true;
      } else {
        // 还原引号后作为文本内容
        const fullQuote = token.match(/^__QUOTE(\d+)__$/);
        if (fullQuote) {
          // 整段被引号包裹（如 [p "含冒号:的正文"]）：引号仅作分组语法，剥离后取内部文本
          contentParts.push(quotes[parseInt(fullQuote[1])]);
        } else {
          const withQuotes = token.replace(/__QUOTE(\d+)__/g, (_, idx) => `"${quotes[parseInt(idx)]}"`);
          contentParts.push(withQuotes);
        }
      }
    }
  }

  // 拼接所有非属性 token 为节点文本内容
  node.content = contentParts.join(' ');

  // 别名映射：ol/ul → list, i → item
  const ALIASES = { ol: 'list', ul: 'list', i: 'item' };
  if (ALIASES[node.type]) {
    if (node.type === 'ol' || node.type === 'ul') {
      node.attrs.t = node.type;
    }
    node.type = ALIASES[node.type];
  }

  return node;
}

/**
 * TokUI 解析器类
 * 基于状态机（TEXT / TAG_OPEN / TAG_CLOSE）实现，
 * 支持一次性解析（parse）和流式增量解析（feed）两种模式。
 *
 * 流式模式下，容器节点会带上 _stream 标记：
 * - 'open': 容器开始，渲染器应创建 DOM 并入栈
 * - 'close': 容器结束，渲染器应弹出栈顶并绑定事件
 */
class TokUIParser {
  /**
   * @param {Function} onNode - 节点回调函数，每解析出一个节点时调用
   * @param {Object} [options] - 配置选项
   * @param {boolean} [options.streaming=true] - 是否启用流式模式
   */
  constructor(onNode, options) {
    this.onNode = onNode || (() => {});
    this.streaming = (options && options.streaming !== false);
    this.maxBuffer = (options && options.maxBuffer) || 1048576; // 1MB
    this.maxDepth = (options && options.maxDepth) || 100;
    this.buffer = '';   // 待解析的文本缓冲区
    this.stack = [];    // 容器节点栈，用于嵌套层级管理
    this.state = 'TEXT'; // 当前状态机状态
    this._totalOffset = 0; // 全局字符偏移计数器（追踪 DSL 位置）
    this._dslText = '';     // 累积的完整 DSL 文本（用于切片）
    this._tagStartPos = -1; // 当前标签在 _dslText 中的起始位置（跨 feed 持久化）
  }

  /** 重置解析器状态 */
  reset() {
    this.buffer = '';
    this.stack = [];
    this.state = 'TEXT';
    this._totalOffset = 0;
    this._dslText = '';
    this._tagStartPos = -1;
    this._lastTrPreview = '';
    this._trOpenKey = -2;   // 与任何 _dslStart（>=0 或 -1）都不等的哨兵
  }

  /**
   * 流式输入数据
   * 追加文本到缓冲区并尝试解析。
   * 流式模式下，容器内的文本会立即作为 _text 节点输出。
   *
   * @param {string} chunk - 新输入的文本片段
   */
  feed(chunk) {
    if (this.buffer.length + chunk.length > this.maxBuffer) {
      console.warn('TokUI Parser: buffer 超过 maxBuffer (' + this.maxBuffer + ')，截断输入');
      chunk = chunk.slice(0, this.maxBuffer - this.buffer.length);
    }
    this._dslText += chunk;
    this.buffer += chunk;
    this._tryParse();
    // 流式模式：立即输出容器内的文本节点（实现逐字渲染效果）
    // 原始内容模式（code/md/diff 等）跳过：buffer 可能包含半截 [/type] 标签，
    // 必须等 _tryParse() 的 raw content handler 统一处理，否则会吞掉闭合标签导致容器永不关闭
    if (this.streaming && this.state === 'TEXT' && this.stack.length > 0
        && !this._isRawContent() && !this.buffer.startsWith('[')) {
      const text = this.buffer.trim();
      if (text) {
        const textNode = { type: '_text', attrs: {}, content: text, children: [] };
        this.stack[this.stack.length - 1].children.push(textNode);
        this.onNode(textNode);
        this._totalOffset += this.buffer.length;
        this.buffer = '';
      }
    }
    // 原始内容模式（code/md/diff/terminal/sandbox/artifact-code）流式逐字渲染：
    // 旧实现在 closeIdx===-1 时 break、此处又跳过 raw，导致代码块流式期间正文完全空白，
    // 直到 [/type] 到达才一次性吐出（非真流式）。改为：按已发偏移（top._rawEmittedLen）
    // 增量 emit 缓冲区安全尾部（排除末尾可能是半截 [/type] 的部分），renderer 边收边重绘。
    // 闭标签到达时由 _tryParse 的 close 分支 / 结束时由 _flush 只补发剩余部分，避免重复。
    if (this.streaming && this.state === 'TEXT' && this.stack.length > 0 && this._isRawContent()) {
      const top = this.stack[this.stack.length - 1];
      const closeTag = '[/' + top.type + ']';
      // 计算末尾是 closeTag 多长前缀（如 "[/cod"），回持这部分不发，防止半截闭标签当正文漏出
      let hold = 0;
      const maxN = Math.min(this.buffer.length, closeTag.length);
      for (let n = maxN; n > 0; n--) {
        if (closeTag.startsWith(this.buffer.slice(this.buffer.length - n))) { hold = n; break; }
      }
      const safeEnd0 = this.buffer.length - hold;
      // 防止转义序列被 chunk 边界劈开（AI 流式常吐字面 \n / \t；SSE 分块可能把 \ 和 n 劈到两块）：
      // 若安全尾部以奇数个反斜杠结尾（未配对，疑似 \n/\t/\r/\\ 起始），回持最后一个 \，等下一块到齐再解码。
      let bs = 0;
      for (let k = safeEnd0 - 1; k >= 0 && this.buffer[k] === '\\'; k--) bs++;
      const safeEnd = (bs % 2 === 1) ? safeEnd0 - 1 : safeEnd0;
      const already = top._rawEmittedLen || 0;
      if (safeEnd > already) {
        const textContent = this._unescapeRaw(this.buffer.slice(already, safeEnd));
        if (textContent) {
          const textNode = { type: '_text', attrs: {}, content: textContent, children: [] };
          top.children.push(textNode);
          this.onNode(textNode);
        }
        top._rawEmittedLen = safeEnd;
      }
    }
    // chart 自闭合标签流式预览：TAG_OPEN 累积 chart 标签时，数据属性(d/tasks)每增长即 emit 半成品，
    // renderer 边收数据边重绘（柱/饼逐点、gantt 任务条逐条增长），无需等整个 ] 闭合。
    // 引号处理分两种：
    //  - 颜色等属性(c:"#16... 残缺)未闭合时不放行，避免半成品色值 → 黑/乱色；
    //  - d/tasks 的长引号值（如 tasks:"A,1,3|B,3,5|..."）闭引号到达前【必须】放行半成品预览，
    //    否则数据全齐才一次性 emit（gantt/bar/line 流式卡顿根因：原条件要求引号配对，
    //    长数据值闭引号到得很晚）。做法：末尾正处 d/tasks 未闭合引号值时临时补一个闭引号，
    //    让 parseTag 正确 strip 出半截值；chart.js 会跳过未长全的段，已长全的逐条渲染。
    if (this.streaming && this.state === 'TAG_OPEN'
        && /^chart\s/.test(this.buffer)
        && /\b(d|tasks|rows|nodes|flows)\s*:/.test(this.buffer)
        && this.buffer !== this._lastChartPreview) {
      let probe = this.buffer;
      if ((probe.match(/"/g) || []).length % 2 === 1) {
        // 引号未配对：仅末尾未闭合段属于 d/tasks 才补闭引号放行；颜色等残缺属性仍等待闭合
        if (/\b(d|tasks|rows|nodes|flows)\s*:\s*"[^"]*$/.test(probe)) {
          probe = probe + '"';
        } else {
          probe = null;
        }
      }
      if (probe !== null) {
        this._lastChartPreview = this.buffer;
        const preview = parseTag(probe);
        if (preview.type === 'chart' && chartHasInline(preview)) {
          preview._streamPreview = true;
          preview._previewKey = this._tagStartPos;
          this.onNode(preview);
        }
      }
    }
    // hrow/flow 子节点碎片化预览：chart 容器内 v 值渐增即 emit 半成品（_kidPreview），
    // renderer chartAppendChild 据此更新末行去重 → 容器 hrow/flow 也逐 cell/逐条填，不等完整标签。
    // 用 _kidPreview 而非 _streamPreview，避免被 mountStreaming(244) 当 chart 预览拦截。
    if (this.streaming && this.state === 'TAG_OPEN'
        && /^(hrow|flow)\s/.test(this.buffer)
        && /\bv\s*:/.test(this.buffer)
        && this.buffer !== this._lastKidPreview) {
      let kprobe = this.buffer;
      if ((kprobe.match(/"/g) || []).length % 2 === 1) {
        if (/\bv\s*:\s*"[^"]*$/.test(kprobe)) kprobe += '"';
        else kprobe = null;
      }
      if (kprobe !== null) {
        this._lastKidPreview = this.buffer;
        const kid = parseTag(kprobe);
        if (kid.type === 'hrow' || kid.type === 'flow') {
          kid._kidPreview = true;
          this.onNode(kid);
        }
      }
    }
    // tr 流式预览：TAG_OPEN 累积 tr 标签时，按「引号 + 深度」感知的逗号逐 cell emit 半成品，
    // renderer 边收边 fill <tr>（逐格渐显、末格文本字符级），不等整个 ] 闭合。
    // 引号处理：cell 值 "a,b 残缺时末尾补闭引号放行（避免残缺逗号被当分隔）；其他残缺引号等更多数据。
    // 占位 open 仅发一次（_trOpenKey 标识当前 tr）；完整 ] 到达由主循环 _emitStreaming 标 finalize 收尾。
    if (this.streaming && this.state === 'TAG_OPEN'
        && /^tr\b/.test(this.buffer)
        && this.buffer !== this._lastTrPreview) {
      let tprobe = this.buffer;
      if ((tprobe.match(/"/g) || []).length % 2 === 1) {
        if (/"[^"]*$/.test(tprobe)) tprobe += '"';
        else tprobe = null;
      }
      if (tprobe !== null) {
        this._lastTrPreview = this.buffer;
        const parsed = parseTag(tprobe);
        if (parsed.type === 'tr') {
          if (this._trOpenKey !== this._tagStartPos) {
            this._trOpenKey = this._tagStartPos;
            this.onNode({ type: 'tr', _stream: 'open', _trKey: this._tagStartPos, attrs: parsed.attrs });
          }
          parsed._stream = 'preview';
          parsed._trKey = this._tagStartPos;
          this.onNode(parsed);
        }
      }
    }
    // 纯自闭合大块骨架占位：TAG_OPEN 累积 stat/img/... 时，类型名确定即 emit skeleton-pending（每标签一次）。
    // renderer 挂骨架；] 到达由 _emitStreaming 标 skeleton-finalize 配对 swap。小件不在此列（pop-in 即可）。
    if (this.streaming && this.state === 'TAG_OPEN'
        && this._skelEmittedKey !== this._tagStartPos
        && SKELETON_TYPE_RE.test(this.buffer)
        && this.buffer.length > SKELETON_TYPE_RE.exec(this.buffer)[0].length) {
      this._skelEmittedKey = this._tagStartPos;
      this.onNode({ type: SKELETON_TYPE_RE.exec(this.buffer)[1], _stream: 'skeleton-pending', _skelKey: this._tagStartPos, attrs: {} });
    }
  }

  /**
   * 一次性解析完整字符串
   *
   * @param {string} fullString - 完整的 TokUI DSL 文本
   */
  parse(fullString) {
    this.reset();
    this._dslText = fullString;
    this.buffer = fullString;
    this._tryParse();
    this._flush();
  }

  /**
   * 刷新缓冲区，输出剩余文本和未关闭的容器
   * 在解析结束时调用，确保所有数据都被处理。
   */
  _flush() {
    // 先尝试解析缓冲区中剩余的完整标签
    if (this.buffer.trim()) {
      this._tryParse();
    }
    // 输出缓冲区中剩余的文本
    if (this.buffer.trim()) {
      let leftover;
      if (this._isRawContent()) {
        // 流式 raw 已按 top._rawEmittedLen 增量发过：此处只 flush 剩余（如回持的半截闭标签残部 / 未闭合容器正文）
        const top = this.stack[this.stack.length - 1];
        const already = (this.streaming && top && top._rawEmittedLen) ? top._rawEmittedLen : 0;
        leftover = this._unescapeRaw(this.buffer.slice(already).trim());
      } else {
        leftover = this.buffer.trim();
      }
      if (leftover) {
        const textNode = { type: '_text', attrs: {}, content: leftover, children: [] };
        if (this.stack.length > 0) {
          this.stack[this.stack.length - 1].children.push(textNode);
        } else {
          this.onNode(textNode);
        }
      }
      this._totalOffset += this.buffer.length;
      this.buffer = '';
    }
    // 关闭所有未关闭的容器（从内到外）
    while (this.stack.length) {
      const node = this.stack.pop();
      node._dslEnd = this._dslText.length;
      node._dsl = this._dslText.slice(node._dslStart);
      if (this.streaming) {
        node._stream = 'close';
        this.onNode(node);
      } else {
        this.onNode(node);
      }
    }
  }

  /**
   * 检查当前是否处于 code 块内部
   * code 块内的内容为原始文本，只识别 [/code] 闭合标签
   */
  _isRawContent() {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      var t = this.stack[i].type;
      if (t === 'code' || t === 'md' || t === 'diff' || t === 'terminal' || t === 'sandbox' || t === 'artifact-code') return true;
    }
    return false;
  }

  /**
   * 原始内容块（code/md/diff/terminal/sandbox/artifact-code）的 C 风格转义解码
   * AI 流式输出几乎必在代码块里吐字面 \n（反斜杠+n 两字符），renderer 的 wrapLines
   * 按真换行(0x0A)切行，字面 \n 不触发 → 整段塌成一行。此处把 \n→\n \t→\t \r→\r \\→\
   * 仅认这四种转义；其余（如正则 \d、路径 \w）保留字面反斜杠，不误伤代码字面量。
   * 仅在原始内容块调用，普通文本/属性值不动。
   */
  _unescapeRaw(s) {
    if (typeof s !== 'string' || s.indexOf('\\') === -1) return s;
    return s.replace(/\\(.)/g, function (_, ch) {
      if (ch === 'n') return '\n';
      if (ch === 't') return '\t';
      if (ch === 'r') return '\r';
      if (ch === '\\') return '\\';
      return '\\' + ch;
    });
  }

  /**
   * 核心解析循环（状态机）
   * 三种状态：
   * - TEXT: 普通文本模式，等待遇到 [ 符号
   * - TAG_OPEN: 遇到 [ 后解析开标签
   * - TAG_CLOSE: 遇到 [/ 后解析闭标签
   *
   * 特殊处理：code 块内部为原始内容模式，
   * 所有 [ 均视为文本，只识别 [/code] 闭合。
   */
  _tryParse() {
    let maxIter = 50000; // 防止死循环的安全阈值
    while (maxIter-- > 0) {
      if (this.state === 'TEXT') {
        // === 原始内容模式（code/md 块内部）===
        if (this._isRawContent()) {
          const top = this.stack[this.stack.length - 1];
          const topType = top.type;
          const closeTag = `[/${topType}]`;
          const closeIdx = this.buffer.indexOf(closeTag);
          if (closeIdx === -1) break;
          if (closeIdx > 0) {
            // 流式期间已按 top._rawEmittedLen 增量发过；此处只补发剩余未发部分，避免重复 emit
            const already = (this.streaming && top._rawEmittedLen) ? top._rawEmittedLen : 0;
            if (closeIdx > already) {
              const textContent = this._unescapeRaw(this.buffer.slice(already, closeIdx));
              if (textContent) {
                const textNode = { type: '_text', attrs: {}, content: textContent, children: [] };
                if (this.streaming && this.stack.length > 0) {
                  this.stack[this.stack.length - 1].children.push(textNode);
                  this.onNode(textNode);
                } else if (this.stack.length > 0) {
                  this.stack[this.stack.length - 1].children.push(textNode);
                } else {
                  this.onNode(textNode);
                }
              }
            }
            // 消费文本部分，保留 [/type] 交给正常 [ 检测流程
            this._totalOffset += closeIdx;
            this.buffer = this.buffer.slice(closeIdx);
            continue;
          }
          // closeIdx === 0：缓冲区以 [/type] 开头，fall through 到正常流程处理
        }

        // === 普通文本模式 ===
        // 隐式开标签的 deferred ] 关闭：容器经「嵌套 [ 隐式补 ]」开标签时，其真实 ] 被 deferred
        // （_implicitOpen=true）。子节点解析完后 buffer 残留 "文本]" 形式，此 ] 应关闭该隐式容器。
        // 否则 ] 漏进正文（[item [tag t:success tx:完成] 项目初始化配置] 末尾 ] 被当 _text 渲染）。
        const topNode = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
        if (topNode && topNode._implicitOpen && !this._isRawContent()) {
          // 孤立闭合引号剥离：[item "[tag ...]"] 模式下，隐式开标签在嵌套 [ 处截断，
          // 开标签的闭合 " 被遗留在缓冲区 ] 之前（buffer 形如 `"]`）。findCloseBracket 会把该 "
          // 当成未闭合引号起点，导致 ] 被判在引号内而找不到。此 " 实为被截断的闭合引号（语法），
          // 剥离后再找 ]，避免 `"]` 漏进 _flush 渲染成可见乱字。
          let probeBuf = this.buffer;
          let stripOffset = 0;
          if (probeBuf[0] === '"' && probeBuf.indexOf(']') !== -1) {
            probeBuf = probeBuf.slice(1);
            stripOffset = 1;
          }
          const defClose = findCloseBracket(probeBuf);
          const nextOpen = probeBuf.indexOf('[');
          // ] 必须先于任何 [（避免吞掉后续子标签的开标签），buffer 以 [/ 开标签时 nextOpen=0 自然跳过
          if (defClose !== -1 && (nextOpen === -1 || defClose < nextOpen)) {
            // ] 前文本作为隐式容器内容输出
            if (defClose > 0) {
              const textContent = probeBuf.slice(0, defClose).trim();
              if (textContent) {
                const textNode = { type: '_text', attrs: {}, content: textContent, children: [] };
                if (this.streaming) {
                  topNode.children.push(textNode);
                  this.onNode(textNode);
                } else {
                  topNode.children.push(textNode);
                }
              }
            }
            // 关闭隐式容器（等价显式 [/type]）。defClose 基于 probeBuf，还原到 this.buffer 需加 stripOffset。
            const realClose = stripOffset + defClose;
            const closeEndPos = this._totalOffset + realClose + 1;
            const closed = this.stack.pop();
            closed._dslEnd = closeEndPos;
            closed._dsl = this._dslText.slice(closed._dslStart, closeEndPos);
            this._totalOffset = closeEndPos;
            this.buffer = this.buffer.slice(realClose + 1);
            if (this.streaming) {
              closed._stream = 'close';
              this.onNode(closed);
            } else if (this.stack.length > 0) {
              this.stack[this.stack.length - 1].children.push(closed);
            } else {
              this.onNode(closed);
            }
            continue;
          }
        }

        const idx = this.buffer.indexOf('[');
        if (idx === -1) break; // 没有标签，等待更多数据

        // 记录标签起始位置（[ 的位置）
        this._tagStartPos = this._totalOffset + idx;

        // 输出 [ 前的文本内容
        if (idx > 0) {
          const textContent = this.buffer.slice(0, idx);
          if (textContent.trim()) {
            const textNode = { type: '_text', attrs: {}, content: textContent, children: [] };
            if (this.streaming && this.stack.length > 0) {
              this.stack[this.stack.length - 1].children.push(textNode);
              this.onNode(textNode);
            } else if (this.stack.length > 0) {
              this.stack[this.stack.length - 1].children.push(textNode);
            } else {
              this.onNode(textNode);
            }
          }
        }
        this.buffer = this.buffer.slice(idx + 1);
        this._totalOffset = this._tagStartPos + 1; // 跳过 [
        this.state = 'TAG_OPEN';
      }

      if (this.state === 'TAG_OPEN') {
        if (this.buffer.length === 0) break;
        // 原始内容模式下，只允许 [/type] 闭标签通过
        if (this._isRawContent()) {
          const topType = this.stack[this.stack.length - 1].type;
          if (!this.buffer.startsWith('/' + topType)) {
            this.buffer = '[' + this.buffer;
            this._totalOffset -= 1;
            this.state = 'TEXT';
            continue;
          }
        }
        // 检测是否为闭标签 [/...]
        if (this.buffer[0] === '/') {
          this.buffer = this.buffer.slice(1);
          this._totalOffset += 1;
          this.state = 'TAG_CLOSE';
          continue;
        }
        // 查找闭合 ] 并解析标签
        // tr 单元格可能含内联 [btn]/[img]（内层 ] 须按深度跳过），用深度感知闭合查找
        const closeIdx = /^tr\b/.test(this.buffer) ? findTrCloseBracket(this.buffer) : findCloseBracket(this.buffer);
        if (closeIdx === -1) break; // 标签不完整，等待更多数据
        // 容错：容器开标签跨行漏写 ]、直接接子标签（AI 习惯 HTML <li> 裸开），
        // 例 [item 文本\n[list] —— closeIdx 命中的其实是子标签的 ]，父标签头被吞进 content。
        // 检测 raw 内嵌套 [：若 [ 前是容器类型，在该 [ 处自动闭合父标签（隐式补 ]）。
        let endIdx = closeIdx;
        let consumeClose = true; // true=跳过 ]；自动闭合时 false=保留 [ 下轮重解析
        const rawProbe = this.buffer.slice(0, closeIdx);
        // 引号感知的嵌套 [ 检测：跳过引号内的字面 [（如 [item "生成 [0,1) 浮点数"]），
        // 否则引号里的 [ 被误判为子标签 → 父标签被截断、引号残留、内容错乱。
        // 规则：item/card 等内容含字面 [ ] 时，须用双引号包整个内容；此处保证引号内 [ 不触发隐式闭合。
        let nestedBracket = -1;
        {
          let inQ = false;
          for (let k = 0; k < rawProbe.length; k++) {
            const ch = rawProbe[k];
            if (ch === '"') inQ = !inQ;
            else if (ch === '[' && !inQ) { nestedBracket = k; break; }
          }
        }
        if (nestedBracket > 0 && !this._isRawContent()) {
          const probe = parseTag(rawProbe.slice(0, nestedBracket).trim());
          if (CONTAINERS.has(probe.type)) {
            endIdx = nestedBracket; // 在 [ 处截断，等价父标签在此闭合
            consumeClose = false;   // 保留 [，交回 TEXT 重新解析为子标签
          }
        }
        const raw = this.buffer.slice(0, endIdx);
        this.buffer = this.buffer.slice(endIdx + (consumeClose ? 1 : 0));
        const node = parseTag(raw);
        // 隐式开标签（consumeClose=false，见上方嵌套 [ 容错）：父标签的真实 ] 被 deferred，
        // 标记后由 TEXT 状态消费首个裸 ] 关闭。否则该 ] 会漏进正文
        // （[item [tag t:success tx:完成] 文本] 末尾 ] 被当 _text 渲染）
        if (!consumeClose) node._implicitOpen = true;
        // 记录 DSL 偏移量：从 [ 到 ] 的位置
        node._dslStart = this._tagStartPos;
        node._dslEnd = this._totalOffset + endIdx + (consumeClose ? 1 : 0);
        node._dsl = this._dslText.slice(node._dslStart, node._dslEnd);
        this._totalOffset = node._dslEnd;

        // 根据模式分发节点
        if (this.streaming) {
          this._emitStreaming(node);
        } else {
          this._emitBuffered(node);
        }
        this.state = 'TEXT';
        if (!consumeClose) continue; // buffer 以 [ 开头，回 TEXT 处理子标签
      }

      if (this.state === 'TAG_CLOSE') {
        const closeIdx = this.buffer.indexOf(']');
        if (closeIdx === -1) break; // 闭标签不完整
        let tagName = this.buffer.slice(0, closeIdx).trim();
        this.buffer = this.buffer.slice(closeIdx + 1);
        // 别名映射：闭标签也需要匹配别名后的类型
        const CLOSE_ALIASES = { ol: 'list', ul: 'list', i: 'item' };
        if (CLOSE_ALIASES[tagName]) {
          tagName = CLOSE_ALIASES[tagName];
        }
        // 闭标签结束位置：[/tagName]
        const closeEndPos = this._totalOffset + closeIdx + 1;
        this._totalOffset = closeEndPos;

        if (this.streaming) {
          // 流式模式：在栈中查找匹配的容器，逐层关闭
          for (let i = this.stack.length - 1; i >= 0; i--) {
            if (this.stack[i].type === tagName) {
              // 先关闭内层未关闭的容器
              while (this.stack.length > i + 1) {
                const inner = this.stack.pop();
                inner._stream = 'close';
                inner._dslEnd = closeEndPos;
                inner._dsl = this._dslText.slice(inner._dslStart, closeEndPos);
                this.onNode(inner);
              }
              // 关闭匹配的容器
              const container = this.stack.pop();
              container._dslEnd = closeEndPos;
              container._dsl = this._dslText.slice(container._dslStart, closeEndPos);
              this.onNode({ type: tagName, _stream: 'close' });
              break;
            }
          }
        } else {
          // 缓冲模式：在栈中查找匹配容器，收集子节点
          let found = false;
          for (let i = this.stack.length - 1; i >= 0; i--) {
            if (this.stack[i].type === tagName) {
              // 收集内层节点作为子节点
              const stackChildren = [];
              while (this.stack.length > i + 1) {
                const inner = this.stack.pop();
                inner._dslEnd = closeEndPos;
                inner._dsl = this._dslText.slice(inner._dslStart, closeEndPos);
                stackChildren.unshift(inner);
              }
              const node = this.stack.pop();
              node._dslEnd = closeEndPos;
              node._dsl = this._dslText.slice(node._dslStart, closeEndPos);
              // node.children 已含兄弟隐式闭合 push 的前序 item（正序），
              // stackChildren 是栈里最后未关的内层；正确顺序 = 已有 + 内层
              node.children = node.children.concat(stackChildren);
              if (this.stack.length > 0) {
                this.stack[this.stack.length - 1].children.push(node);
              } else {
                this.onNode(node);
              }
              found = true;
              break;
            }
          }
          if (!found) {
            console.warn('TokUI Parser: 未匹配的闭合标签 [/' + tagName + ']');
          }
        }
        this.state = 'TEXT';
      }
    }
  }

  /**
   * 流式模式分发节点
   * 容器节点标记为 _stream:'open' 并压入栈，
   * 子节点追加到栈顶容器的 children 中。
   */
  _emitStreaming(node) {
    // 兄弟 item 隐式闭合：新 [item] 开时若栈顶已是未闭合的 item（AI 习惯 HTML <li> 裸标签，
    // 不写 [/item]），先把上一个关掉，避免流式下各 li 互相嵌套成空壳。
    // item 现为容器语义（[item 文本] 文本当 <li> 首段，可直接嵌套子 list），有 content 也走隐式关，
    // 故不再区分「带 content 自闭合」——靠下个 item / 父闭标签 / [/item] 关闭。对齐 HTML <li> 语义。
    if (node.type === 'item') {
      while (this.stack.length > 0 && this.stack[this.stack.length - 1].type === 'item') {
        const prevItem = this.stack.pop();
        prevItem._stream = 'close';
        this.onNode(prevItem);
      }
    }
    // p 自动闭合：仅对「有文本的叶 p」（[p 文本]，content 非空）在遇到块级兄弟时闭合，
    // 保 [p 文本] / [p a][p b] 的自闭合兄弟语义（对标 HTML <p>）。
    // 显式容器 [p] / [p v:x]（content 为空）不闭合 —— 收所有子节点（btn/a/tag 等），由 [/p] 关闭。
    const topP = this.stack.length > 0 && this.stack[this.stack.length - 1].type === 'p'
      ? this.stack[this.stack.length - 1] : null;
    if (topP && topP.content && !P_INLINE_CHILDREN.has(node.type)) {
      const prevP = this.stack.pop();
      prevP._stream = 'close';
      this.onNode(prevP);
    }
    // tr 流式收尾：被预览过的 tr（_trOpenKey 命中其 _dslStart）到达完整 ] 时标记 finalize，
    // renderer 复用占位 <tr> 做最终 cell reconcile，不再当普通子节点重新渲染（防重复行）。
    if (node.type === 'tr' && this._trOpenKey === node._dslStart) {
      node._stream = 'finalize';
      node._trKey = node._dslStart;
    }
    // 骨架占位收尾：纯自闭合大块（stat/img/...）开标签时 emit 过 skeleton-pending，
    // ] 到达标 skeleton-finalize + 原 key，renderer 据此把骨架 swap 为真节点（无 pending 则正常渲染）。
    if (SKELETON_ELIGIBLE.has(node.type) && this._skelEmittedKey === node._dslStart) {
      node._stream = 'skeleton-finalize';
      node._skelKey = node._dslStart;
    }
    // tx on popover/input-tag means trigger/label text, not self-closing body content
    const TX_CONTAINER_EXCLUDE = new Set(['tn', 'popover', 'input-tag', 'watermark', 'badge-box']);
    const isTxSelfClosing = CONTAINERS.has(node.type) && !TX_CONTAINER_EXCLUDE.has(node.type) && node.attrs.tx;
    const isLeafSelfClosing = node.type === 'tn' && node.attrs.leaf !== undefined;
    // input-tag 带 tags 属性 → 自闭合（与 builder.inputTag() 的 _selfClosing 分支对齐）；
    // 否则按容器打开收子节点。
    const isTagsSelfClosing = node.type === 'input-tag' && node.attrs.tags;
    const isSelfClosing = isTxSelfClosing || isLeafSelfClosing || isTagsSelfClosing
      || isOptShorthandSelfClosing(node) || isCheckboxSingleSelfClosing(node);
    // desc/suggestions use cols as layout attribute, not as self-closing trigger
    // chart 的 cols 是数据列标签（heatmap），非布局自闭合触发，须豁免（否则容器写法 [/chart] 报错）
    const hasColsTrigger = node.attrs.cols && node.type !== 'desc' && node.type !== 'suggestions' && node.type !== 'chart';
  // chart 带 d/tasks 内联数据 → 自闭合（旧用法）；无内联数据 → 容器模式收 pt/task/ms 子节点（流式）
    const hasInlineData = chartHasInline(node);
    // 自闭合 chart 带 preview key，与流式预览配对（renderer finalize 复用 pending wrapper）
    if (hasInlineData) node._previewKey = node._dslStart;
    if (CONTAINERS.has(node.type) && !hasColsTrigger && !isSelfClosing && !hasInlineData) {
      if (this.stack.length >= this.maxDepth) {
        console.warn('TokUI Parser: 嵌套深度超过 maxDepth (' + this.maxDepth + ')，按自闭合处理');
        if (this.stack.length > 0) { this.stack[this.stack.length - 1].children.push(node); }
        this.onNode(node);
      } else {
        node._stream = 'open';
        this.stack.push(node);
        this.onNode(node);
      }
    } else if (this.stack.length > 0) {
      this.stack[this.stack.length - 1].children.push(node);
      this.onNode(node);
    } else {
      this.onNode(node);
    }
  }

  /**
   * 缓冲模式分发节点
   * 容器节点压入栈，等待闭标签时再组装完整的节点树。
   */
  _emitBuffered(node) {
    // 兄弟 item 隐式闭合（与 _emitStreaming 对齐）：新 [item] 开时先关栈顶连续 item，
    // 把已组装的 item 挂到父容器 children，避免兄弟 item 互相嵌套成空壳。
    if (node.type === 'item') {
      while (this.stack.length > 0 && this.stack[this.stack.length - 1].type === 'item') {
        const prevItem = this.stack.pop();
        if (this.stack.length > 0) {
          this.stack[this.stack.length - 1].children.push(prevItem);
        }
      }
    }
    // p 自动闭合：仅对「有文本的叶 p」（content 非空）在遇到块级兄弟时闭合并挂回父级；
    // 显式容器 [p] / [p v:x]（content 空）不闭合，收所有子节点。
    const topP = this.stack.length > 0 && this.stack[this.stack.length - 1].type === 'p'
      ? this.stack[this.stack.length - 1] : null;
    if (topP && topP.content && !P_INLINE_CHILDREN.has(node.type)) {
      const prevP = this.stack.pop();
      if (this.stack.length > 0) {
        this.stack[this.stack.length - 1].children.push(prevP);
      } else {
        this.onNode(prevP); // 根级兄弟：无父可挂，直接 emit（否则丢失）
      }
    }
    const TX_CONTAINER_EXCLUDE = new Set(['tn', 'popover', 'input-tag', 'watermark', 'badge-box']);
    const isTxSelfClosing = CONTAINERS.has(node.type) && !TX_CONTAINER_EXCLUDE.has(node.type) && node.attrs.tx;
    const isLeafSelfClosing = node.type === 'tn' && node.attrs.leaf !== undefined;
    const isTagsSelfClosing = node.type === 'input-tag' && node.attrs.tags;
    const isSelfClosing = isTxSelfClosing || isLeafSelfClosing || isTagsSelfClosing
      || isOptShorthandSelfClosing(node) || isCheckboxSingleSelfClosing(node);
    // desc/suggestions use cols as layout attribute, not as self-closing trigger
    // chart 的 cols 是数据列标签（heatmap），非布局自闭合触发，须豁免（否则容器写法 [/chart] 报错）
    const hasColsTrigger = node.attrs.cols && node.type !== 'desc' && node.type !== 'suggestions' && node.type !== 'chart';
  // chart 带 d/tasks 内联数据 → 自闭合（旧用法）；无内联数据 → 容器模式收 pt/task/ms 子节点（流式）
    const hasInlineData = chartHasInline(node);
    // 自闭合 chart 带 preview key，与流式预览配对（renderer finalize 复用 pending wrapper）
    if (hasInlineData) node._previewKey = node._dslStart;
    if (CONTAINERS.has(node.type) && !hasColsTrigger && !isSelfClosing && !hasInlineData) {
      if (this.stack.length >= this.maxDepth) {
        console.warn('TokUI Parser: 嵌套深度超过 maxDepth (' + this.maxDepth + ')，按自闭合处理');
        if (this.stack.length > 0) { this.stack[this.stack.length - 1].children.push(node); }
        else { this.onNode(node); }
      } else {
        this.stack.push(node);
      }
    } else if (this.stack.length > 0) {
      this.stack[this.stack.length - 1].children.push(node);
    } else {
      this.onNode(node);
    }
  }

  /** 开始流式解析（重置状态） */
  startStream() {
    this.reset();
  }

  /** 结束流式解析（刷新缓冲区） */
  endStream() {
    this._flush();
  }
}

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.TokUIParser = TokUIParser;
  window.TokUI._internal.parseTag = parseTag;
  window.TokUI._internal.setVariantHints = setVariantHints;
  window.TokUI._internal.CONTAINERS = CONTAINERS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TokUIParser, parseTag, setVariantHints, CONTAINERS };
}
