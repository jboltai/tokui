/**
 * TokUI 基础组件模块
 * 注册文本展示类组件：标题（h1-h6）、段落（p）、链接（a）、
 * 图片（img）、分割线（hr）、Markdown（md）、代码块（code）。
 */
'use strict';

/**
 * 颜色解析函数
 * 支持语义命名（primary/success/warning/danger/info/dark/light）
 * 和 6 位 hex 格式（不带 #，如 FF0000）。
 *
 * @param {string} value - 颜色值
 * @returns {string|null} 解析后的 CSS 颜色值，无效返回 null
 */
function resolveColor(value) {
  if (!value) return null;
  const COLOR_MAP = {
    primary: 'var(--tokui-primary)',
    success: 'var(--tokui-success)',
    warning: 'var(--tokui-warning)',
    danger: 'var(--tokui-danger)',
    info: 'var(--tokui-primary)',
    dark: 'var(--tokui-dark)',
    light: 'var(--tokui-light)',
  };
  if (COLOR_MAP[value]) return COLOR_MAP[value];
  if (/^[0-9a-fA-F]{6}$/.test(value)) return '#' + value;
  return null;
}

/**
 * 语法高亮语言定义
 */
var HL_LANGS = {
  js: {
    keywords: /\b(abstract|arguments|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|eval|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|let|new|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/g,
    types: /\b(Array|Boolean|Date|Error|Function|Infinity|JSON|Map|Math|NaN|Number|Object|Promise|RegExp|Set|String|Symbol|WeakMap|WeakSet|console|document|window|undefined|null|true|false|parseInt|parseFloat|isNaN|isFinite|require|module|exports|process|Buffer)\b/g
  },
  javascript: null,
  jsx: null,
  ts: {
    keywords: /\b(abstract|any|as|async|await|bigint|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|keyof|let|module|namespace|new|never|null|number|object|of|package|private|protected|public|readonly|require|return|set|static|string|super|switch|symbol|this|throw|try|type|typeof|undefined|unique|unknown|var|void|while|with|yield)\b/g,
    types: /\b(Array|Boolean|Date|Error|Function|Map|Number|Object|Promise|Record|RegExp|Set|String|Symbol|console|Partial|Required|Readonly|Pick|Omit|ReturnType|InstanceType)\b/g
  },
  typescript: null,
  tsx: null,
  python: {
    keywords: /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g,
    types: /\b(True|False|None|int|float|str|list|dict|tuple|set|bool|bytes|range|len|print|input|type|isinstance|self|super|map|filter|zip|enumerate|sorted|reversed|any|all|min|max|sum|abs|round|open|iter|next|id|hash|callable|hasattr|getattr|setattr|delattr|property|staticmethod|classmethod)\b/g
  },
  py: null,
  html: {
    keywords: /\b(html|head|body|div|span|p|a|img|ul|ol|li|h1|h2|h3|h4|h5|h6|table|tr|td|th|thead|tbody|form|input|button|select|option|textarea|label|section|article|header|footer|nav|main|aside|details|summary|video|audio|source|canvas|svg|iframe|link|meta|script|style|title|br|hr|pre|code|blockquote)\b/g,
    types: /\b(class|id|style|href|src|alt|type|name|value|placeholder|action|method|target|rel|width|height|disabled|required|checked|selected|readonly|hidden)\b/g
  },
  css: {
    keywords: /\b(align-items|align-self|animation|background|background-color|background-image|border|border-color|border-radius|border-style|border-width|bottom|box-shadow|box-sizing|color|content|cursor|display|filter|flex|flex-direction|flex-grow|flex-shrink|flex-wrap|float|font|font-family|font-size|font-weight|gap|grid|height|justify-content|left|letter-spacing|line-height|margin|max-height|max-width|min-height|min-width|opacity|order|outline|overflow|padding|position|resize|right|text-align|text-decoration|text-overflow|text-transform|top|transform|transition|user-select|vertical-align|visibility|white-space|width|word-break|z-index)\b/g,
    types: /\b(inherit|initial|auto|none|block|inline|inline-block|flex|grid|absolute|relative|fixed|sticky|center|left|right|top|bottom|baseline|stretch|column|row|wrap|nowrap|visible|hidden|scroll|solid|dashed|dotted|transparent|bold|normal|italic|uppercase|lowercase|underline|pointer|default|cover|contain|ease|linear|important|var|calc|rgb|rgba|hsl)\b/g
  },
  json: {
    keywords: /\b(true|false|null)\b/g,
    types: /\b[A-Za-z_]\w*(?=\s*:)/g
  },
  sql: {
    keywords: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|VIEW|JOIN|INNER|LEFT|RIGHT|OUTER|ON|AND|OR|NOT|IN|BETWEEN|LIKE|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|UNION|ALL|EXISTS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|CHECK|UNIQUE|IF|DESC|ASC)\b/gi,
    types: /\b(INT|INTEGER|BIGINT|FLOAT|DOUBLE|DECIMAL|VARCHAR|CHAR|TEXT|BLOB|DATE|DATETIME|TIMESTAMP|BOOLEAN|ENUM|JSON|SERIAL)\b/gi
  },
  java: {
    keywords: /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|yield|record|sealed|var)\b/g,
    types: /\b(String|Integer|Long|Double|Float|Boolean|Object|Class|Thread|Exception|Error|List|Map|Set|Queue|ArrayList|HashMap|HashSet|TreeMap|TreeSet|Arrays|Collections|Stream|Optional|System|Math|null|true|false)\b/g
  },
  go: {
    keywords: /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g,
    types: /\b(bool|byte|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr|true|false|nil|iota|append|cap|close|copy|delete|len|make|new|panic|print|println|recover|fmt|err)\b/g
  },
  rust: {
    keywords: /\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|type|unsafe|use|where|while|yield)\b/g,
    types: /\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Box|Option|Result|Some|None|Ok|Err|true|false|println|format|panic|assert)\b/g
  },
  bash: {
    keywords: /\b(if|then|else|elif|fi|case|esac|for|while|until|do|done|in|function|select|return|exit|break|continue|declare|export|local|readonly|unset|source|set|shift|eval|echo|printf|test|true|false|cd|pwd|ls|mkdir|cp|mv|rm|cat|head|tail|grep|sed|awk|find|sort|uniq|wc|cut|xargs|chmod|touch|df|du|ps|kill|nohup|ssh|curl|wget|npm|pip|git|docker)\b/g,
    types: null
  },
  sh: null,
  shell: null,
  zsh: null
};

// 为别名指向主语言定义
Object.keys(HL_LANGS).forEach(function(k) {
  if (HL_LANGS[k] === null) {
    var aliasMap = { javascript: 'js', jsx: 'js', tsx: 'ts', typescript: 'ts', py: 'python', sh: 'bash', shell: 'bash', zsh: 'bash' };
    var alias = aliasMap[k];
    if (alias && HL_LANGS[alias]) HL_LANGS[k] = HL_LANGS[alias];
  }
});

/**
 * 零依赖语法高亮函数
 * 将代码文本按 token 类型着色为 HTML span 元素。
 *
 * @param {string} code - 源代码文本
 * @param {string} lang - 语言标识（如 js, python）
 * @returns {string} 包含着色 span 的 HTML 字符串
 */
function highlightCode(code, lang) {
  if (!code) return '';
  var src = String(code);

  var langDef = HL_LANGS[lang];
  if (!langDef) {
    // Unknown language: just escape HTML
    return src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var placeholders = [];
  // Use a placeholder format that won't be matched by any highlighting regex
  // Format: \x00PH_N\x00 where N is zero-padded index
  var PH_PRE = '\x00PH_';
  var PH_SUF = '\x00';
  var PH_RE = /\x00PH_(\d+)\x00/g;

  function nextPh() {
    return PH_PRE + String(placeholders.length).padStart(5, '0') + PH_SUF;
  }

  // Placeholder for raw source tokens (strings/comments) - escapes HTML before storing
  function phRaw(match, cls) {
    var ph = nextPh();
    var escaped = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    placeholders.push('<span class="tok-' + cls + '">' + escaped + '</span>');
    return ph;
  }
  // Placeholder for already-escaped text tokens (keywords/numbers/types/fns) - no double-escape
  function phEscaped(match, cls) {
    var ph = nextPh();
    placeholders.push('<span class="tok-' + cls + '">' + match + '</span>');
    return ph;
  }

  // Work on raw source, extract tokens before HTML escaping
  // 0. JSON keys (quoted strings followed by colon) - before general strings
  if (lang === 'json') {
    src = src.replace(/(["'])(?:(?!\1|\\).|\\.)*\1(?=\s*:)/g, function(m) { return phRaw(m, 'type'); });
  }

  // 1. Strings
  src = src.replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, function(m) { return phRaw(m, 'str'); });
  src = src.replace(/`(?:[^`\\]|\\.)*`/g, function(m) { return phRaw(m, 'str'); });

  // 2. Comments
  src = src.replace(/\/\/.*$/gm, function(m) { return phRaw(m, 'cmt'); });
  // SQL 行注释 -- （须限 sql：否则 JS/Rust 的 i-- 自减会被误判为注释）
  if (lang === 'sql') {
    src = src.replace(/--.*$/gm, function(m) { return phRaw(m, 'cmt'); });
  }
  if (lang !== 'css' && lang !== 'html') {
    src = src.replace(/#.*$/gm, function(m) { return phRaw(m, 'cmt'); });
  }
  src = src.replace(/\/\*[\s\S]*?\*\//g, function(m) {
    // 多行块注释（含 JSDoc /** */）：按行切，每行独立 tok-cmt span，\n 留 span 外。
    // 否则整块注释被包进单个 span 内含字面 \n，wrapLines 按 \n 切行后 span 被拆散
    // （首行未闭合、中间行裸文本无色、末行悬空 </span>）→ 仅首行着色，行号虽对但结构错乱。
    var escaped = m.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.split('\n').map(function(line) {
      var ph = nextPh();
      placeholders.push('<span class="tok-cmt">' + line + '</span>');
      return ph;
    }).join('\n');
  });

  // Now escape the remaining (non-placeholder) text for HTML
  var html = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 3. Numbers
  html = html.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, function(m) { return phEscaped(m, 'num'); });

  // 4. Keywords
  if (langDef.keywords) {
    html = html.replace(langDef.keywords, function(m) { return phEscaped(m, 'kw'); });
  }

  // 5. Types/builtins
  if (langDef.types) {
    html = html.replace(langDef.types, function(m) { return phEscaped(m, 'type'); });
  }

  // 6. Function calls
  html = html.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, function(m) { return phEscaped(m, 'fn'); });

  // 7. Operators (work on escaped text)
  html = html.replace(/(&amp;&amp;|\|\||===|!==|=&gt;|\.\.\.|\+\+|--|[+\-*/%=!|^~?:]+)/g, function(m) {
    return phEscaped(m, 'op');
  });

  // Restore placeholders
  html = html.replace(PH_RE, function(_, idx) { return placeholders[parseInt(idx)]; });

  return html;
}

/**
 * 注册基础组件到渲染器
 * @param {TokUIRenderer} renderer - 渲染器实例
 */
function registerBasicComponents(renderer) {
  const { el } = (typeof require === 'function')
    ? require('../core/renderer')
    : window.TokUI._internal;

  // === 标题组件 h1 ~ h6 ===
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag) => {
    renderer.register(tag, (node) => {
      // 标题文本优先 content（[h1 标题]），兜底 tx（[h1 tx:标题]，与 item 一致，forgive AI 泛化 tx 到文本组件）
      const dom = el(tag, { class: `tokui-${tag}` }, node.content || (node.attrs && node.attrs.tx));
      const bgColor = resolveColor(node.attrs.bg);
      const textColor = resolveColor(node.attrs.fc);
      const variant = node.attrs.v || '';
      if (bgColor) {
        // underline 用 CSS 变量传色给 ::after，不设父元素背景
        if (variant.includes('underline')) {
          dom.style.setProperty('--tokui-title-bg', bgColor);
        } else {
          dom.style.background = bgColor;
        }
      }
      if (textColor) dom.style.color = textColor;
      return dom;
    });
  });

  // === 段落组件 ===
  renderer.register('p', (node, rc) => {
    // p 现为容器：支持 [p 文本]（content 自闭合）与 [p [a] · [a]][/p]（嵌套内联子节点）。
    // content 作为前导文本，children（a/tag/text 等）追加其后。
    var pAttrs = { class: 'tokui-p' };
    if (node.attrs && node.attrs.id) pAttrs.id = node.attrs.id; // 透传 id（copy 等需 getElementById 定位）
    var p = el('p', pAttrs);
    // 段落文本优先 content（[p 文本]），兜底 tx（[p tx:文本]，与 h1-h6/item 一致）
    var pText = node.content || (node.attrs && node.attrs.tx);
    if (pText) {
      p.appendChild(document.createTextNode(pText));
    }
    if (node.children && node.children.length) {
      rc(node.children).forEach(function (child) {
        if (child && child.nodeType) p.appendChild(child);
      });
    }
    return p;
  });

  // === 链接组件 ===
  // attrs.u = URL, attrs.tx = 显示文本
  // attrs.tt = title 提示, attrs.target = 打开方式(默认 _blank)
  // attrs.dis = 禁用, attrs.v = 变体(muted/danger/success/underline)
  renderer.register('a', (node) => {
    var isDisabled = node.attrs.dis !== undefined;
    var href = node.attrs.u || '#';
    if (!/^(https?:\/\/|mailto:|\/|#|tel:)/i.test(href)) href = '#';
    const aAttrs = {
      class: 'tokui-link' + (isDisabled ? ' tokui-a--disabled' : ''),
      href: isDisabled ? 'javascript:void(0)' : href,
      target: node.attrs.target || '_blank',
      rel: 'noopener noreferrer'
    };
    if (node.attrs.tt) aAttrs.title = node.attrs.tt;
    if (isDisabled) {
      aAttrs.tabindex = '-1';
      aAttrs['aria-disabled'] = 'true';
    }
    const a = el('a', aAttrs);
    a.textContent = node.attrs.tx || node.content || '';
    return a;
  });

  // === 图片组件 ===
  // DSL属性: s(源地址), alt(替代文本), w(宽度), h(高度), tt(提示文字)
  // 点击触发灯箱预览
  renderer.register('img', (node) => {
    const attrs = {
      class: 'tokui-img'
    };
    if (node.attrs.s) attrs.src = node.attrs.s;
    attrs.alt = node.attrs.alt || '';
    if (node.attrs.w) attrs.width = node.attrs.w;
    if (node.attrs.h) attrs.height = node.attrs.h;
    if (node.attrs.tt) attrs.title = node.attrs.tt;
    const img = el('img', attrs);
    img.style.cursor = 'pointer';
    img.addEventListener('click', function () {
      const { getLightbox } = (typeof require === 'function')
        ? require('./lightbox')
        : window.TokUI._internal;
      const lb = getLightbox(typeof document !== 'undefined' ? document : undefined);
      lb.open(attrs.src);
    });
    return img;
  });

  // === 分割线组件 ===
  renderer.register('hr', () => {
    return el('hr', { class: 'tokui-hr' });
  });

  // === 行内格式组件（b/strong/em/mark/del/sub/sup）===
  // 用于 item/p 等容器内对关键词加粗/斜体/高亮/删除线/上下标。
  // 渲染为原生 HTML 行内元素（<strong>/<em>/<mark>/<del>/<sub>/<sup>），浏览器默认样式，无需额外 CSS。
  // 例: [item]普通文本 [b 关键词] 普通文本[/item]
  const INLINE_FORMAT_TAGS = {
    b: 'strong',        // 加粗（别名）
    strong: 'strong',   // 加粗
    em: 'em',           // 斜体
    i_text: 'em',       // 占位（i 已被 parser 别名为 item，此处不触发）
    mark: 'mark',       // 高亮
    del: 'del',         // 删除线
    sub: 'sub',         // 下标
    sup: 'sup'          // 上标
  };
  Object.keys(INLINE_FORMAT_TAGS).forEach((type) => {
    if (type === 'i_text') return;
    renderer.register(type, (node, rc) => {
      const htmlTag = INLINE_FORMAT_TAGS[type];
      const dom = el(htmlTag, { class: 'tokui-' + type });
      const text = node.content || (node.attrs && node.attrs.tx) || '';
      if (text) dom.textContent = text;
      // 支持嵌套行内子节点（如 [b]文本 [em 内嵌][/b]，b 须当容器用）
      if (node.children && node.children.length && typeof rc === 'function') {
        rc(node.children).forEach(function (child) {
          if (child && child.nodeType) dom.appendChild(child);
        });
      }
      return dom;
    });
  });

  // === Tag 标签组件 ===
  // 属性: t(type), s(size), round, closable, bordered, dis, bg, fc
  renderer.register('tag', (node) => {
    const attrs = node.attrs || {};
    const content = attrs.tx || node.content || '';
    const classes = ['tokui-tag'];
    const tagType = attrs.t || '';
    if (tagType && tagType !== 'default') classes.push('tokui-tag--' + tagType);
    const size = attrs.s || '';
    if (size && size !== 'medium') classes.push('tokui-tag--' + size);
    if (attrs.round !== undefined) classes.push('tokui-tag--round');
    if (attrs.bordered !== undefined) classes.push('tokui-tag--bordered');
    if (attrs.dis !== undefined) classes.push('tokui-tag--disabled');

    const span = el('span', { class: classes.join(' ') });

    // 自定义颜色
    const bgColor = resolveColor(attrs.bg);
    const textColor = resolveColor(attrs.fc);
    if (bgColor) span.style.background = bgColor;
    if (textColor) span.style.color = textColor;

    // 文本内容
    const contentSpan = el('span', { class: 'tokui-tag__content' });
    contentSpan.textContent = content;
    span.appendChild(contentSpan);

    // 关闭按钮
    if (attrs.closable !== undefined) {
      classes.push('tokui-tag--closable');
      span.className = classes.join(' ');
      const closeBtn = el('span', { class: 'tokui-tag__close' });
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', function () {
        span.style.display = 'none';
      });
      span.appendChild(closeBtn);
    }

    // 动态更新方法：供 [upd id:xxx tx:新文字 act:close] 调用
    span._update = function (uAttrs) {
      if (uAttrs.tx !== undefined) {
        var contentEl = span.querySelector('.tokui-tag__content');
        if (contentEl) contentEl.textContent = uAttrs.tx;
      }
      if (uAttrs.act === 'close') {
        span.style.transition = 'opacity 0.25s, transform 0.25s';
        span.style.opacity = '0';
        span.style.transform = 'scale(0.8)';
        setTimeout(function () { span.style.display = 'none'; }, 260);
      }
    };

    return span;
  });

  // === Toggle 切换按钮（自闭合）===
  // attrs.tx = 文字, attrs.chk = 初始选中, attrs.clk = 点击事件
  // attrs.s = 尺寸(sm/lg), attrs.dis = 禁用
  renderer.register('toggle', (node) => {
    const attrs = node.attrs || {};
    const text = attrs.tx || node.content || '';
    const isChecked = attrs.chk === true;
    const size = attrs.s || '';
    const isDisabled = attrs.dis !== undefined;
    const classes = ['tokui-toggle'];
    if (isChecked) classes.push('tokui-toggle--pressed');
    if (size === 'sm') classes.push('tokui-toggle--sm');
    else if (size === 'lg') classes.push('tokui-toggle--lg');
    if (isDisabled) classes.push('tokui-toggle--disabled');

    const btnAttrs = {
      class: classes.join(' '),
      type: 'button',
      role: 'switch',
      'aria-pressed': String(isChecked)
    };
    if (isDisabled) btnAttrs['aria-disabled'] = 'true';
    if (attrs.clk) btnAttrs['data-tokui-clk'] = attrs.clk;

    const btn = el('button', btnAttrs);
    btn.textContent = text;

    // Click toggles pressed state.
    // In a single-select toggle-group, the group-level listener handles selection;
    // in multi-select mode or standalone, the button toggles itself.
    btn.addEventListener('click', function (e) {
      if (isDisabled) return;
      const group = btn.closest('.tokui-toggle-group');
      if (group && !group.classList.contains('tokui-toggle-group--multi')) return;
      const current = btn.getAttribute('aria-pressed') === 'true';
      const next = !current;
      btn.setAttribute('aria-pressed', String(next));
      btn.classList.toggle('tokui-toggle--pressed', next);
    });

    if (isDisabled) btn.disabled = true;

    // 动态更新方法：供 [upd id:xxx chk:true dis:true] 调用
    btn._update = function (uAttrs) {
      if (uAttrs.chk === true || uAttrs.chk === 'true') {
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.add('tokui-toggle--pressed');
      } else if (uAttrs.chk === false || uAttrs.chk === 'false') {
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('tokui-toggle--pressed');
      }
      if (uAttrs.dis === true || uAttrs.dis === 'true') {
        btn.disabled = true;
        btn.classList.add('tokui-toggle--disabled');
        btn.setAttribute('aria-disabled', 'true');
      } else if (uAttrs.dis === false || uAttrs.dis === 'false') {
        btn.disabled = false;
        btn.classList.remove('tokui-toggle--disabled');
        btn.removeAttribute('aria-disabled');
      }
    };

    return btn;
  });

  // === Toggle Group 切换按钮组（容器）===
  // attrs.multi = 多选模式, attrs.clk = 组事件
  // attrs.s = 尺寸(sm/lg)
  // 单选模式: 同组内互斥（点击一个取消其他）
  // 多选模式: 各按钮独立切换
  renderer.register('toggle-group', (node, rc) => {
    const attrs = node.attrs || {};
    const isMulti = attrs.multi === true;
    const size = attrs.s || '';
    const classes = ['tokui-toggle-group'];
    if (isMulti) classes.push('tokui-toggle-group--multi');
    if (size === 'sm') classes.push('tokui-toggle-group--sm');
    else if (size === 'lg') classes.push('tokui-toggle-group--lg');

    const groupAttrs = {
      class: classes.join(' '),
      role: 'group'
    };
    if (attrs.clk) groupAttrs['data-tokui-clk'] = attrs.clk;

    const group = el('div', groupAttrs);

    // Render children
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) group.appendChild(child);
    });

    // Single-select: click one -> deselect others
    if (!isMulti) {
      group.addEventListener('click', function (e) {
        const btn = e.target.closest('.tokui-toggle');
        if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
        const wasPressed = btn.getAttribute('aria-pressed') === 'true';

        // Deselect all siblings
        const siblings = group.querySelectorAll('.tokui-toggle');
        siblings.forEach(function (s) {
          s.setAttribute('aria-pressed', 'false');
          s.classList.remove('tokui-toggle--pressed');
        });

        // If was not pressed, select it (toggle behavior)
        if (!wasPressed) {
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add('tokui-toggle--pressed');
        }
      });
    }

    group._slot = group;
    group._tokuiType = 'toggle-group';
    return group;
  });

  // === Divider 分割线组件 ===
  renderer.register('dv', (node) => {
    const attrs = node.attrs || {};
    const text = attrs.tx || node.content || '';
    const isVert = attrs.vert !== undefined;
    const tag = isVert ? 'span' : 'div';
    const classes = ['tokui-dv'];
    if (attrs.v) classes.push('tokui-dv--' + attrs.v);
    if (attrs.size) classes.push('tokui-dv--' + attrs.size);
    if (isVert) classes.push('tokui-dv--vert');
    if (attrs.plain !== undefined) classes.push('tokui-dv--plain');

    if (isVert) {
      return el(tag, { class: classes.join(' ') });
    }

    if (text) {
      classes.push('tokui-dv--text');
      const align = attrs.align || 'center';
      if (align !== 'center') classes.push('tokui-dv--' + align);
      const wrapper = el(tag, { class: classes.join(' ') });
      const style = {};
      const color = resolveColor(attrs.bg);
      if (color) style.borderColor = color;
      if (attrs.th) style.borderWidth = attrs.th;
      if (Object.keys(style).length) {
        if (style.borderColor) wrapper.style.borderColor = style.borderColor;
        if (style.borderWidth) wrapper.style.borderWidth = style.borderWidth;
      }
      const span = el('span', { class: 'tokui-dv-text' });
      span.textContent = text;
      wrapper.appendChild(span);
      return wrapper;
    }

    const dv = el(tag, { class: classes.join(' ') });
    const style = {};
    const color = resolveColor(attrs.bg);
    if (color) style.borderColor = color;
    if (attrs.th) style.borderWidth = attrs.th;
    if (Object.keys(style).length) {
      if (style.borderColor) dv.style.borderColor = style.borderColor;
      if (style.borderWidth) dv.style.borderWidth = style.borderWidth;
    }
    return dv;
  });

  // === Progress 进度条组件 ===
  // attrs.v = 百分比(0-100), attrs.t = 形态(line/circle/span), attrs.l = 标签
  // attrs.s = 尺寸(sm/lg), attrs.stripe = 条纹动画, attrs.status = 状态(success/error)
  renderer.register('progress', (node) => {
    const attrs = node.attrs || {};
    const value = Math.min(100, Math.max(0, parseInt(attrs.v) || 0));
    const label = attrs.l || '';
    const variant = attrs.t || 'line';
    const size = attrs.s || '';
    const status = attrs.status || '';
    const hasStripe = attrs.stripe !== undefined;

    // Color class
    let colorClass = '';
    if (status === 'success') colorClass = ' tokui-progress--success';
    else if (status === 'error') colorClass = ' tokui-progress--error';

    // Size class
    let sizeClass = '';
    if (size === 'sm' || size === 'small') sizeClass = ' tokui-progress--sm';
    else if (size === 'lg' || size === 'large') sizeClass = ' tokui-progress--lg';

    let dom;

    // Circle variant — SVG
    if (variant === 'circle') {
      const r = 42;
      const circumference = 2 * Math.PI * r;
      const offset = circumference * (1 - value / 100);
      const wrapperAttrs = { class: 'tokui-progress tokui-progress--circle' + colorClass + sizeClass };
      if (attrs.id) wrapperAttrs.id = attrs.id;
      const wrapper = el('div', wrapperAttrs);
      const svgContainer = el('div', { class: 'tokui-progress__circle-wrap' });
      svgContainer.innerHTML = '<svg viewBox="0 0 100 100" class="tokui-progress__svg">' +
        '<circle class="tokui-progress__circle-bg" cx="50" cy="50" r="' + r + '" fill="none" stroke-width="6"/>' +
        '<circle class="tokui-progress__circle-bar" cx="50" cy="50" r="' + r + '" fill="none" stroke-width="6" ' +
        'stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" ' +
        'stroke-linecap="round" transform="rotate(-90 50 50)"/>' +
        '<text class="tokui-progress__circle-text" x="50" y="50" text-anchor="middle" dominant-baseline="central">' +
        value + '%</text></svg>';
      wrapper.appendChild(svgContainer);
      if (label) {
        const labelEl = el('div', { class: 'tokui-progress__label tokui-progress__label--center' });
        labelEl.textContent = label;
        wrapper.appendChild(labelEl);
      }
      dom = wrapper;
    }

    // Span variant — inline mini
    else if (variant === 'span') {
      const spanAttrs = { class: 'tokui-progress tokui-progress--span' + colorClass };
      if (attrs.id) spanAttrs.id = attrs.id;
      const span = el('span', spanAttrs);
      const miniBar = el('span', { class: 'tokui-progress__mini-bar' });
      const miniFill = el('span', { class: 'tokui-progress__mini-fill' });
      miniFill.style.width = value + '%';
      miniBar.appendChild(miniFill);
      span.appendChild(miniBar);
      const text = el('span', { class: 'tokui-progress__span-text' });
      text.textContent = value + '%';
      span.appendChild(text);
      dom = span;
    }

    // Default: Line variant
    else {
      const classes = 'tokui-progress tokui-progress--line' + colorClass + sizeClass + (hasStripe ? ' tokui-progress--stripe' : '');
      const wrapperAttrs = { class: classes };
      if (attrs.id) wrapperAttrs.id = attrs.id;
      const wrapper = el('div', wrapperAttrs);
      if (label) {
        const labelEl = el('div', { class: 'tokui-progress__header' });
        const labelSpan = el('span', { class: 'tokui-progress__label' });
        labelSpan.textContent = label;
        labelEl.appendChild(labelSpan);
        const pct = el('span', { class: 'tokui-progress__pct' });
        pct.textContent = value + '%';
        labelEl.appendChild(pct);
        wrapper.appendChild(labelEl);
      }
      const track = el('div', { class: 'tokui-progress__track' });
      const bar = el('div', { class: 'tokui-progress__bar' });
      bar.style.width = value + '%';
      track.appendChild(bar);
      wrapper.appendChild(track);
      dom = wrapper;
    }

    dom._tokuiType = 'progress';
    dom._progressVariant = variant;
    dom._progressCircumference = 2 * Math.PI * 42;
    dom.setAttribute('role', 'progressbar');
    dom.setAttribute('aria-valuenow', String(value));
    dom.setAttribute('aria-valuemin', '0');
    dom.setAttribute('aria-valuemax', '100');

    // 动态更新方法：供 [upd id:xxx v:75] 调用
    dom._update = function (uAttrs) {
      // 仅在提供 v 时更新进度值
      if (uAttrs.v !== undefined) {
        var newVal = Math.min(100, Math.max(0, parseInt(uAttrs.v) || 0));
        dom.setAttribute('aria-valuenow', String(newVal));
        if (dom._progressVariant === 'circle') {
          var offset = dom._progressCircumference * (1 - newVal / 100);
          var circleBar = dom.querySelector('.tokui-progress__circle-bar');
          var circleText = dom.querySelector('.tokui-progress__circle-text');
          if (circleBar) circleBar.setAttribute('stroke-dashoffset', offset.toFixed(1));
          if (circleText) circleText.textContent = newVal + '%';
        } else if (dom._progressVariant === 'span') {
          var miniFill = dom.querySelector('.tokui-progress__mini-fill');
          var spanText = dom.querySelector('.tokui-progress__span-text');
          if (miniFill) miniFill.style.width = newVal + '%';
          if (spanText) spanText.textContent = newVal + '%';
        } else {
          var bar = dom.querySelector('.tokui-progress__bar');
          var pct = dom.querySelector('.tokui-progress__pct');
          if (bar) bar.style.width = newVal + '%';
          if (pct) pct.textContent = newVal + '%';
        }
      }
      // 仅在提供 status 时更新状态
      if (uAttrs.status !== undefined) {
        dom.classList.remove('tokui-progress--success', 'tokui-progress--error');
        if (uAttrs.status === 'success') dom.classList.add('tokui-progress--success');
        else if (uAttrs.status === 'error') dom.classList.add('tokui-progress--error');
      }
    };

    return dom;
  });

  // === Upd 动态更新指令 ===
  // [upd id:my-progress v:75] — 查找已有 DOM 元素并调用其 _update 方法
  // 用于后端异步推送组件状态更新（如进度变化、步骤切换）
  renderer.register('upd', (node) => {
    var attrs = node.attrs || {};
    var id = attrs.id;
    if (id && typeof document !== 'undefined') {
      var target = document.getElementById(id);
      if (target && typeof target._update === 'function') {
        target._update(attrs);
      }
    }
    return document.createTextNode('');
  });

  // === Markdown 组件 ===
  // 容器模式：内容从 children 拼接获取（保留原始换行）
  // 流式模式下，子节点作为 Text 节点追加；关闭时统一重新渲染
  renderer.register('md', (node) => {
    const div = el('div', { class: 'tokui-md' });
    let text = '';
    if (node.children && node.children.length > 0) {
      text = node.children.map(c => c.content || '').join('');
    } else {
      text = node.content || '';
    }
    if (text) {
      div.innerHTML = simpleMarkdown(text);
      bindMdLightbox(div);
    }
    // 流式模式关闭钩子：收集所有子文本节点，重新用 Markdown 渲染。
    // 仅在有文本节点（流式累积）时重渲；一次性渲染后 div 已是 HTML 元素（无文本节点），
    // 此时 raw 为空，跳过 —— 否则会用空串覆盖已渲染内容（mount 也会调此 hook）。
    div._streamCloseHook = function () {
      let raw = '';
      for (const child of Array.from(div.childNodes)) {
        if (child.nodeType === 3) { // Text node
          raw += child.textContent;
        }
      }
      if (raw) {
        div.innerHTML = simpleMarkdown(raw);
        bindMdLightbox(div);
      }
    };
    div._tokuiType = 'md';
    return div;
  });

  // === 代码块组件 ===
  // attrs.lang = 语言类型（如 js, python）
  // 内容支持子节点拼接（流式模式）或直接 content（一次性模式）
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function wrapLines(html) {
    var lines = html.split('\n');
    return lines.map(function(line) {
      return '<span class="code-line">' + (line || ' ') + '</span>';
    }).join('');
  }

  renderer.register('code', (node) => {
    const pre = el('pre', { class: 'tokui-code' });
    const lang = node.attrs.lang || 'text';
    const code = el('code', { class: `language-${lang}` });
    // 初始文本：一次性渲染取 children/content；流式 open 时为空，靠 _streamAppendHook 累积。
    var rawAcc = '';
    if (node.children && node.children.length > 0) {
      rawAcc = node.children.map(c => c.content || '').join('');
    } else {
      rawAcc = node.content || '';
    }
    // 语法高亮 + 行号包裹。raw 取自闭包累积变量 rawAcc，【不】从 DOM childNodes 反读——
    // wrapLines 会把 \n 去掉（join('')），DOM round-trip 会丢换行 → 多块流式后塌成一行。
    function applyHighlight() {
      if (lang !== 'text' && HL_LANGS[lang]) {
        code.innerHTML = wrapLines(highlightCode(rawAcc, lang));
      } else {
        code.innerHTML = wrapLines(escapeHtml(rawAcc));
      }
    }
    applyHighlight();
    pre.appendChild(code);
    pre._slot = code;       // 插槽指向 code 元素（流式内容追加目标）
    pre._tokuiType = 'code';  // 标记组件类型
    // 复制按钮：复制原始累积文本（含换行），不用 textContent（已被 wrapLines 去换行）
    var copyBtn = el('button', { class: 'tokui-code__copy', type: 'button' });
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('click', function () {
      if (rawAcc && navigator.clipboard) {
        navigator.clipboard.writeText(rawAcc);
      }
      copyBtn.textContent = '已复制';
      copyBtn.classList.add('tokui-code__copy--done');
      setTimeout(function () {
        copyBtn.textContent = '复制';
        copyBtn.classList.remove('tokui-code__copy--done');
      }, 2000);
    });
    pre.appendChild(copyBtn);
    // 真流式：每块 _text 到达即累积到 rawAcc 并整体重高亮 + 重排行号。
    // 行号 / 语法色随 AI 输出逐块增长，不再等到 [/code] 才渲染。
    pre._streamAppendHook = function (childNode) {
      if (childNode && childNode.type === '_text' && childNode.content) {
        rawAcc += childNode.content;
        applyHighlight();
      }
    };
    pre._streamCloseHook = applyHighlight;
    return pre;
  });

  // === Callout 提示框组件 ===
  // attrs.t = 类型(info/success/warning/error/tip), attrs.tt = 标题, content/tx = 内容
  renderer.register('callout', (node, rc) => {
    var attrs = node.attrs || {};
    var type = attrs.t || 'info';
    var title = attrs.tt || '';
    var CALLOUT_ICONS = { info: 'ℹ', success: '✓', warning: '⚠', error: '✕', tip: '💡' };
    var wrapper = el('div', { class: 'tokui-callout tokui-callout--' + type, role: 'alert' });
    var iconEl = el('span', { class: 'tokui-callout__icon', 'aria-hidden': 'true' });
    iconEl.textContent = CALLOUT_ICONS[type] || CALLOUT_ICONS.info;
    wrapper.appendChild(iconEl);
    var body = el('div', { class: 'tokui-callout__body' });
    if (title) {
      var titleEl = el('div', { class: 'tokui-callout__title' });
      titleEl.textContent = title;
      body.appendChild(titleEl);
    }
    // 内容容器：始终创建，作为流式 _slot 挂载点（流式子节点不再落到 wrapper 外）
    var contentEl = el('div', { class: 'tokui-callout__content' });
    var hasChildren = node.children && node.children.length;
    var textContent = attrs.tx || node.content || '';
    if (hasChildren) {
      rc(node.children).forEach(function (child) {
        if (child && child.nodeType) contentEl.appendChild(child);
      });
    } else if (textContent) {
      contentEl.textContent = textContent;
    }
    body.appendChild(contentEl);
    wrapper.appendChild(body);
    // 流式插槽：子节点挂到 body 内的 contentEl，而非 wrapper（否则 p 等会落到 body 外）
    wrapper._slot = contentEl;
    return wrapper;
  });

  // === Think 思考块组件（容器）===
  // attrs.tt = 标题, attrs.open = 默认展开
  // 子节点递归渲染
  renderer.register('think', (node, rc) => {
    var attrs = node.attrs || {};
    var title = attrs.tt || '思考过程';
    var details = el('details', { class: 'tokui-think' });
    if (attrs.open !== undefined) details.setAttribute('open', '');
    var summary = el('summary', { class: 'tokui-think__summary' });
    var icon = el('span', { class: 'tokui-think__icon' });
    icon.textContent = '💭';
    summary.appendChild(icon);
    var titleSpan = el('span', { class: 'tokui-think__title' });
    titleSpan.textContent = title;
    summary.appendChild(titleSpan);
    details.appendChild(summary);
    var body = el('div', { class: 'tokui-think__body' });
    if (node.content) body.textContent = node.content;
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) body.appendChild(child);
    });
    details.appendChild(body);
    details._slot = body;
    details._tokuiType = 'think';
    return details;
  });

  // === ThinkChain 推理链容器（容器） ===
  // attrs.tt = 标题, attrs.status = 整体状态(running/done), attrs.open = 默认展开
  // 子节点为 think-step
  renderer.register('think-chain', (node, rc) => {
    var attrs = node.attrs || {};
    var title = attrs.tt || '推理过程';
    var status = attrs.status || '';
    var classes = ['tokui-think-chain'];
    if (status) classes.push('tokui-think-chain--' + status);
    var details = el('details', { class: classes.join(' ') });
    if (attrs.open !== undefined) details.setAttribute('open', '');
    var summary = el('summary', { class: 'tokui-think-chain__summary' });
    var icon = el('span', { class: 'tokui-think-chain__icon' });
    icon.textContent = '\u{1F9E0}';
    summary.appendChild(icon);
    var titleSpan = el('span', { class: 'tokui-think-chain__title' });
    titleSpan.textContent = title;
    summary.appendChild(titleSpan);
    details.appendChild(summary);
    var stepsBody = el('div', { class: 'tokui-think-chain__steps' });
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) stepsBody.appendChild(child);
    });
    details.appendChild(stepsBody);
    details._slot = stepsBody;
    details._tokuiType = 'think-chain';
    return details;
  });

  // === ThinkStep 推理步骤（容器） ===
  // attrs.status = 状态(done/running/pending/error), attrs.tt = 标题
  // attrs.dur = 耗时, 子节点为步骤内容
  renderer.register('think-step', (node, rc) => {
    var attrs = node.attrs || {};
    var status = attrs.status || 'pending';
    var title = attrs.tt || '';
    var dur = attrs.dur || '';
    var classes = ['tokui-think-step', 'tokui-think-step--' + status];
    var wrapper = el('div', { class: classes.join(' ') });

    // Header row: icon + title + duration
    var header = el('div', { class: 'tokui-think-step__header' });

    if (status === 'done') {
      var icon = el('span', { class: 'tokui-think-step__icon' });
      icon.textContent = '✓';
      header.appendChild(icon);
    } else if (status === 'running') {
      var spinner = el('span', { class: 'tokui-think-step__spinner' });
      header.appendChild(spinner);
    } else if (status === 'error') {
      var errIcon = el('span', { class: 'tokui-think-step__icon tokui-think-step__icon--error' });
      errIcon.textContent = '✗';
      header.appendChild(errIcon);
    } else {
      var pendingDot = el('span', { class: 'tokui-think-step__dot' });
      header.appendChild(pendingDot);
    }

    if (title) {
      var titleEl = el('span', { class: 'tokui-think-step__title' });
      titleEl.textContent = title;
      header.appendChild(titleEl);
    }

    if (dur) {
      var durEl = el('span', { class: 'tokui-think-step__dur' });
      durEl.textContent = dur;
      header.appendChild(durEl);
    }

    wrapper.appendChild(header);

    // Content body
    var body = el('div', { class: 'tokui-think-step__body' });
    if (node.content) body.textContent = node.content;
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) body.appendChild(child);
    });
    wrapper.appendChild(body);

    // Connector line
    var line = el('div', { class: 'tokui-think-step__line' });
    wrapper.appendChild(line);

    wrapper._slot = body;
    wrapper._tokuiType = 'think-step';
    return wrapper;
  });

  // === Copy 复制按钮组件 ===
  // attrs.id = 目标元素 id, attrs.tx = 按钮文字, attrs.tt = 成功提示
  renderer.register('copy', (node) => {
    var attrs = node.attrs || {};
    var btnText = attrs.tx || '复制';
    var successText = attrs.tt || '已复制！';
    var btn = el('button', { class: 'tokui-copy', type: 'button' });
    btn.textContent = btnText;
    btn.addEventListener('click', function () {
      var text = '';
      if (attrs.id && typeof document !== 'undefined') {
        var target = document.getElementById(attrs.id);
        if (target) text = target.textContent || '';
      }
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text);
      }
      btn.textContent = successText;
      btn.classList.add('tokui-copy--done');
      setTimeout(function () {
        btn.textContent = btnText;
        btn.classList.remove('tokui-copy--done');
      }, 2000);
    });
    return btn;
  });

  // === Spin 加载指示器 ===
  // attrs.t = 形态(spinner/dots/pulse), attrs.s = 尺寸(sm/lg), attrs.tx = 提示文字
  renderer.register('spin', (node) => {
    var attrs = node.attrs || {};
    var variant = attrs.t || 'spinner';
    var size = attrs.s || '';
    var text = attrs.tx || '';
    var classes = ['tokui-spin', 'tokui-spin--' + variant];
    if (size === 'sm' || size === 'small') classes.push('tokui-spin--sm');
    else if (size === 'lg' || size === 'large') classes.push('tokui-spin--lg');
    var wrapper = el('div', { class: classes.join(' ') });

    if (variant === 'dots') {
      var dotWrap = el('span', { class: 'tokui-spin__dots' });
      dotWrap.appendChild(el('span', { class: 'tokui-spin__dot' }));
      dotWrap.appendChild(el('span', { class: 'tokui-spin__dot' }));
      dotWrap.appendChild(el('span', { class: 'tokui-spin__dot' }));
      wrapper.appendChild(dotWrap);
    } else if (variant === 'pulse') {
      wrapper.appendChild(el('span', { class: 'tokui-spin__pulse' }));
    } else {
      wrapper.appendChild(el('span', { class: 'tokui-spin__spinner' }));
    }

    if (text) {
      var textEl = el('span', { class: 'tokui-spin__text' });
      textEl.textContent = text;
      wrapper.appendChild(textEl);
    }
    return wrapper;
  });

  // === Thumb 点赞/点踩组件 ===
  // attrs.t = 方向(up/down), attrs.s = 尺寸(sm/lg), attrs.clk = 点击事件名, attrs.v = active
  renderer.register('thumb', (node) => {
    var attrs = node.attrs || {};
    var direction = attrs.t || 'up';
    var isActive = attrs.v === 'active';
    var size = attrs.s || '';
    var sizeClass = '';
    if (size === 'sm' || size === 'small') sizeClass = ' tokui-thumb--sm';
    else if (size === 'lg' || size === 'large') sizeClass = ' tokui-thumb--lg';
    var btn = el('button', {
      class: 'tokui-thumb tokui-thumb--' + direction + (isActive ? ' tokui-thumb--active' : '') + sizeClass,
      type: 'button',
      'aria-label': direction === 'up' ? '点赞' : '点踩'
    });
    var svgSize = size === 'lg' || size === 'large' ? 22 : size === 'sm' || size === 'small' ? 14 : 18;
    var svg = direction === 'up'
      ? '<svg viewBox="0 0 24 24" width="' + svgSize + '" height="' + svgSize + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>'
      : '<svg viewBox="0 0 24 24" width="' + svgSize + '" height="' + svgSize + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>';
    var iconWrap = el('span', { class: 'tokui-thumb__icon' });
    iconWrap.innerHTML = svg;
    btn.appendChild(iconWrap);
    // 点击切换
    btn.addEventListener('click', function () {
      btn.classList.toggle('tokui-thumb--active');
      if (attrs.clk) {
        var bus = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
          ? window.TokUI._internal.eventBus : null;
        if (bus && typeof bus.emit === 'function') {
          bus.emit(attrs.clk, { direction: direction, active: btn.classList.contains('tokui-thumb--active') });
        }
      }
    });
    if (attrs.clk) btn.setAttribute('data-tokui-clk', attrs.clk);
    return btn;
  });

  // === File 文件卡片组件 ===
  // attrs.n = 文件名, attrs.s = 大小, attrs.t = 类型(pdf/word/excel/ppt/image/zip/code)
  // attrs.u = 下载链接, attrs.tt = 描述
  renderer.register('file', (node) => {
    var attrs = node.attrs || {};
    var fileName = attrs.n || '未知文件';
    var fileSize = attrs.s || '';
    var fileType = attrs.t || 'default';
    var url = attrs.u || '';
    var desc = attrs.tt || '';
    var FILE_ICONS = {
      pdf: { icon: 'PDF', color: '#f5222d' },
      word: { icon: 'W', color: '#1677ff' },
      excel: { icon: 'XLS', color: '#52c41a' },
      ppt: { icon: 'PPT', color: '#fa8c16' },
      image: { icon: 'IMG', color: '#eb2f96' },
      zip: { icon: 'ZIP', color: '#722ed1' },
      code: { icon: '</>', color: '#13c2c2' },
      default: { icon: 'FILE', color: '#8c8c8c' }
    };
    var iconInfo = FILE_ICONS[fileType] || FILE_ICONS.default;
    var wrapper = el('div', { class: 'tokui-file' });
    // 文件类型 icon
    var iconEl = el('div', { class: 'tokui-file__icon' });
    iconEl.style.background = iconInfo.color;
    iconEl.textContent = iconInfo.icon;
    wrapper.appendChild(iconEl);
    // 文件信息
    var info = el('div', { class: 'tokui-file__info' });
    var nameEl = el('div', { class: 'tokui-file__name' });
    nameEl.textContent = fileName;
    if (url) {
      nameEl.style.cursor = 'pointer';
      nameEl.style.color = 'var(--tokui-primary)';
      nameEl.addEventListener('click', function () { window.open(url, '_blank'); });
    }
    info.appendChild(nameEl);
    if (desc || fileSize) {
      var meta = el('div', { class: 'tokui-file__meta' });
      meta.textContent = [desc, fileSize].filter(Boolean).join(' · ');
      info.appendChild(meta);
    }
    wrapper.appendChild(info);
    // 下载按钮
    if (url) {
      var dl = el('a', {
        class: 'tokui-file__download',
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        download: ''
      });
      dl.textContent = '↓';
      wrapper.appendChild(dl);
    }
    return wrapper;
  });

  // === Bubble 聊天气泡（容器） ===
  // attrs.role = user/ai/system, attrs.model = 模型名, attrs.time = 时间戳
  renderer.register('bubble', (node, rc) => {
    var attrs = node.attrs || {};
    var role = attrs.role || 'ai';
    var model = attrs.model || '';
    var time = attrs.time || '';
    var wrapper = el('div', { class: 'tokui-bubble tokui-bubble--' + role });

    // row: avatar + content
    var row = el('div', { class: 'tokui-bubble__row' });
    var avatar = el('span', { class: 'tokui-bubble__avatar' });
    avatar.textContent = role === 'user' ? 'You' : 'AI';
    row.appendChild(avatar);

    var content = el('div', { class: 'tokui-bubble__content' });
    // header
    var header = el('div', { class: 'tokui-bubble__header' });
    var nameSpan = el('span', {});
    nameSpan.textContent = role === 'user' ? 'You' : role === 'system' ? 'System' : 'Assistant';
    header.appendChild(nameSpan);
    if (model) {
      var modelBadge = el('span', { class: 'tokui-badge tokui-badge--info tokui-badge--pill' });
      modelBadge.textContent = model;
      header.appendChild(modelBadge);
    }
    content.appendChild(header);

    // body
    var body = el('div', { class: 'tokui-bubble__body' });
    (rc(node.children || [])).forEach(function (child) {
      if (child && child.nodeType) body.appendChild(child);
    });
    content.appendChild(body);

    // time
    if (time) {
      var timeEl = el('div', { class: 'tokui-bubble__time' });
      timeEl.textContent = time;
      content.appendChild(timeEl);
    }

    row.appendChild(content);
    wrapper.appendChild(row);

    body._slot = body;
    body._tokuiType = 'bubble';
    wrapper._slot = body;
    wrapper._tokuiType = 'bubble';
    return wrapper;
  });

  // === Toolbar 操作栏（容器） ===
  // attrs.pos = top/bottom, attrs.align = left/center/right
  renderer.register('toolbar', (node, rc) => {
    var attrs = node.attrs || {};
    var pos = attrs.pos || 'bottom';
    var align = attrs.align || 'right';
    var wrapper = el('div', {
      class: 'tokui-toolbar tokui-toolbar--' + pos + ' tokui-toolbar--' + align
    });
    (rc(node.children || [])).forEach(function (child) {
      if (child && child.nodeType) wrapper.appendChild(child);
    });
    wrapper._slot = wrapper;
    wrapper._tokuiType = 'toolbar';
    return wrapper;
  });

  // === Badge 徽标数（自闭合） ===
  // attrs:
  //   count   — 数字 (0~999)
  //   overflow — 超过显示阈值 (默认99)
  //   dot     — 小红点模式
  //   t/status — 颜色: default/primary/success/warning/error/info
  //   tx      — 自定义文本（与 count 二选一）
  //   pill    — 胶囊圆角
  //   size    — 尺寸: sm/default/lg
  //   title   — hover 提示
  renderer.register('badge', (node) => {
    var attrs = node.attrs || {};
    var status = attrs.t || attrs.status || 'default';
    var text = attrs.tx || node.content || '';
    var count = attrs.count || '';
    var overflow = parseInt(attrs.overflow, 10) || 99;
    var size = attrs.size || '';
    var title = attrs.title || '';
    var classes = ['tokui-badge', 'tokui-badge--' + status];
    if (attrs.pill) classes.push('tokui-badge--pill');
    if (size) classes.push('tokui-badge--' + size);

    // 小红点模式
    if (attrs.dot) {
      var dotWrapper = el('span', { class: 'tokui-badge tokui-badge--dot' + (size ? ' tokui-badge--' + size : '') });
      if (title) dotWrapper.setAttribute('title', title);
      return dotWrapper;
    }

    var wrapper = el('span', { class: classes.join(' ') });
    if (title) wrapper.setAttribute('title', title);

    // 数字模式
    if (count !== '' && !text) {
      var num = parseInt(count, 10);
      if (isNaN(num) || num < 0) num = 0;
      var display = num > overflow ? overflow + '+' : String(num);
      var countEl = el('span', { class: 'tokui-badge__count' });
      countEl.textContent = display;
      wrapper.appendChild(countEl);

      // 动态更新方法：供 [upd id:xxx tx:新文字 act:hide] 调用
      wrapper._update = function (uAttrs) {
        if (uAttrs.tx !== undefined) {
          countEl.textContent = uAttrs.tx;
        }
        if (uAttrs.count !== undefined) {
          var newNum = parseInt(uAttrs.count, 10);
          if (isNaN(newNum) || newNum < 0) newNum = 0;
          var ov = parseInt(uAttrs.overflow, 10) || overflow;
          countEl.textContent = newNum > ov ? ov + '+' : String(newNum);
        }
        if (uAttrs.act === 'hide') {
          wrapper.style.display = 'none';
        }
      };

      return wrapper;
    }

    // 文本模式
    var span = el('span', { class: 'tokui-badge__text' });
    span.textContent = text;
    wrapper.appendChild(span);

    // 动态更新方法：供 [upd id:xxx tx:新文字 act:hide] 调用
    wrapper._update = function (uAttrs) {
      if (uAttrs.tx !== undefined) {
        span.textContent = uAttrs.tx;
      }
      if (uAttrs.act === 'hide') {
        wrapper.style.display = 'none';
      }
    };

    return wrapper;
  });

  // === BadgeBox 徽标数包裹（容器） ===
  // 包裹子组件，在右上角显示数字/小红点/文本徽标
  // attrs: count/dot/tx/t/status/overflow/size
  renderer.register('badge-box', (node, rc) => {
    var attrs = node.attrs || {};
    var wrapper = el('span', { class: 'tokui-badge-box' });

    // 渲染子节点（rc 接收 children 数组，与其他容器一致）
    if (node.children && node.children.length) {
      rc(node.children).forEach(function (rendered) {
        if (rendered) wrapper.appendChild(rendered);
      });
    }

    // 构建徽标指示器
    var status = attrs.t || attrs.status || 'error';
    var bgColor = status === 'primary' ? 'var(--tokui-primary)' :
      status === 'success' ? 'var(--tokui-success)' :
      status === 'warning' ? 'var(--tokui-warning)' :
      status === 'info' ? 'var(--tokui-info)' : 'var(--tokui-danger)';
    var indicator;

    if (attrs.dot) {
      indicator = el('sup', { class: 'tokui-badge-box__dot' });
      indicator.style.background = bgColor;
    } else if (attrs.count !== undefined && attrs.count !== '' && !attrs.tx) {
      var overflow = parseInt(attrs.overflow, 10) || 99;
      var num = parseInt(attrs.count, 10);
      if (isNaN(num) || num < 0) num = 0;
      var display = num > overflow ? overflow + '+' : String(num);
      indicator = el('sup', { class: 'tokui-badge-box__count' });
      indicator.textContent = display;
      indicator.style.background = bgColor;
    } else if (attrs.tx || attrs.label) {
      // 文本徽标：tx 优先（与单 badge 一致），label 向后兼容
      indicator = el('sup', { class: 'tokui-badge-box__text' });
      indicator.textContent = attrs.tx || attrs.label;
      if (status === 'default') {
        indicator.style.background = 'var(--tokui-stripe, #f5f5f5)';
        indicator.style.color = 'var(--tokui-text-secondary, #666)';
      } else {
        indicator.style.background = bgColor;
      }
    }

    if (indicator) wrapper.appendChild(indicator);

    return wrapper;
  });

  // === Skeleton 骨架屏（自闭合） ===
  // attrs.t = text/card/avatar/image, attrs.rows = 行数, attrs.w = 宽, attrs.h = 高
  renderer.register('skeleton', (node) => {
    var attrs = node.attrs || {};
    var type = attrs.t || 'text';
    var rows = parseInt(attrs.rows, 10) || 3;
    var width = attrs.w || '';
    var height = attrs.h || '';
    var classes = ['tokui-skeleton', 'tokui-skeleton--' + type];
    var wrapper = el('div', { class: classes.join(' '), role: 'status', 'aria-live': 'polite' });
    if (width) wrapper.style.width = width;
    if (height) wrapper.style.height = height;
    if (type === 'text') {
      for (var i = 0; i < rows; i++) {
        var row = el('div', { class: 'tokui-skeleton__row' });
        if (i === rows - 1) row.style.width = '60%';
        wrapper.appendChild(row);
      }
    } else if (type === 'card') {
      var circle = el('div', { class: 'tokui-skeleton__circle' });
      wrapper.appendChild(circle);
      var cardBody = el('div', {});
      cardBody.style.flex = '1';
      cardBody.style.display = 'flex';
      cardBody.style.flexDirection = 'column';
      cardBody.style.gap = '8px';
      var titleRow = el('div', { class: 'tokui-skeleton__row' });
      titleRow.style.width = '40%';
      cardBody.appendChild(titleRow);
      for (var j = 0; j < Math.max(1, rows - 1); j++) {
        var contentRow = el('div', { class: 'tokui-skeleton__row' });
        cardBody.appendChild(contentRow);
      }
      wrapper.appendChild(cardBody);
    } else if (type === 'avatar') {
      var avatarCircle = el('div', { class: 'tokui-skeleton__circle' });
      wrapper.appendChild(avatarCircle);
    } else if (type === 'image') {
      var rect = el('div', { class: 'tokui-skeleton__rect' });
      wrapper.appendChild(rect);
    }
    return wrapper;
  });

  // === Toast 轻提示（自闭合） ===
  // attrs.id = 标识, attrs.t = success/error/warning/info
  // attrs.tx = 文本, attrs.duration = 持续时间(ms), attrs.pos = top/bottom
  renderer.register('toast', (node) => {
    var attrs = node.attrs || {};
    var id = attrs.id || '';
    var type = attrs.t || 'info';
    var text = attrs.tx || '';
    var duration = parseInt(attrs.duration, 10) || 2000;
    var pos = attrs.pos || 'top';
    // 确保全局容器存在
    var container = document.querySelector('.tokui-toast-container');
    if (!container) {
      container = el('div', { class: 'tokui-toast-container' });
      document.body.appendChild(container);
    }
    var toastEl = el('div', {
      class: 'tokui-toast tokui-toast--' + type + (pos === 'bottom' ? ' tokui-toast--bottom' : ''),
      role: 'alert',
      'aria-live': 'polite'
    });
    if (id) toastEl.setAttribute('data-toast-id', id);
    var ICONS = { success: '✓', error: '✕', warning: '!', info: 'ℹ' };
    var icon = el('span', { class: 'tokui-toast__icon' });
    icon.textContent = ICONS[type] || ICONS.info;
    toastEl.appendChild(icon);
    var span = el('span');
    span.textContent = text;
    toastEl.appendChild(span);
    toastEl._toastDuration = duration;
    toastEl._toastShown = false;
    container.appendChild(toastEl);
    // 隐藏初始状态
    toastEl.style.display = 'none';
    // 注册全局 showToast 方法
    if (!window.TokUI) window.TokUI = {};
    if (!window.TokUI._toastMap) window.TokUI._toastMap = {};
    if (id) window.TokUI._toastMap[id] = toastEl;
    if (!window.TokUI.showToast) {
      window.TokUI.showToast = function (toastId, msg) {
        var map = window.TokUI._toastMap || {};
        var target = map[toastId];
        if (!target) return;
        if (msg) {
          var txt = target.querySelector('span:last-child');
          if (txt) txt.textContent = msg;
        }
        target.style.display = '';
        target.classList.remove('tokui-toast--hide');
        target._toastShown = true;
        var dur = target._toastDuration || 2000;
        clearTimeout(target._toastTimer);
        target._toastTimer = setTimeout(function () {
          target.classList.add('tokui-toast--hide');
          setTimeout(function () {
            target.style.display = 'none';
            target._toastShown = false;
          }, 250);
        }, dur);
      };
    }
    return toastEl;
  });

  // === Dot 状态指示点（自闭合） ===
  // attrs.t = 类型(success/warning/error/info/primary/default)
  // attrs.tx = 标签文本, attrs.s = 尺寸(sm/lg), attrs.pulse = 脉冲动画
  renderer.register('dot', (node) => {
    var attrs = node.attrs || {};
    var type = attrs.t || 'default';
    var text = attrs.tx || '';
    var size = attrs.s || '';
    var classes = ['tokui-dot', 'tokui-dot--' + type];
    if (size === 'sm') classes.push('tokui-dot--sm');
    else if (size === 'lg') classes.push('tokui-dot--lg');
    if (attrs.pulse !== undefined) classes.push('tokui-dot--pulse');
    var wrapper = el('span', { class: classes.join(' ') });
    var circle = el('span', { class: 'tokui-dot__circle' });
    wrapper.appendChild(circle);
    if (text) {
      var label = el('span', { class: 'tokui-dot__text' });
      label.textContent = text;
      wrapper.appendChild(label);
    }
    return wrapper;
  });

  // === Avatar 头像（自闭合） ===
  // attrs.s = 图片URL, attrs.tx = 文字回退, attrs.size = 尺寸(sm/md/lg/xl)
  // attrs.bg = 背景色, attrs.fc = 字色
  renderer.register('avatar', (node) => {
    var attrs = node.attrs || {};
    var src = attrs.s || '';
    var text = attrs.tx || '';
    var size = attrs.size || 'md';
    var classes = ['tokui-avatar'];
    if (src) {
      var img = el('img', { class: classes.join(' '), src: src, alt: text });
      img.classList.add('tokui-avatar--' + size);
      return img;
    }
    classes.push('tokui-avatar--text', 'tokui-avatar--' + size);
    var wrapper = el('span', { class: classes.join(' ') });
    wrapper.textContent = text.slice(0, 2);
    var bg = attrs.bg;
    if (bg) {
      var bgVal = resolveColor(bg);
      if (bgVal) wrapper.style.backgroundColor = bgVal;
    } else if (text) {
      var PALETTE = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
      var hash = 0;
      for (var i = 0; i < text.length; i++) hash += text.charCodeAt(i);
      wrapper.style.backgroundColor = PALETTE[hash % PALETTE.length];
    }
    var fc = attrs.fc;
    if (fc) {
      var fcVal = resolveColor(fc);
      if (fcVal) wrapper.style.color = fcVal;
    }
    return wrapper;
  });

  // === Tooltip 悬浮提示（自闭合） ===
  // attrs.tt = 提示内容, attrs.pos = 位置(top/bottom/left/right)
  // content / attrs.tx = 触发文字
  // JS 动态定位，position:fixed 避免被父容器裁剪
  renderer.register('tooltip', (node) => {
    var attrs = node.attrs || {};
    var tipText = attrs.tt || '';
    var pos = attrs.pos || 'top';
    var triggerText = attrs.tx || node.content || '';
    var wrapper = el('span', {
      class: 'tokui-tooltip',
      tabindex: '0',
      role: 'tooltip'
    });
    wrapper.textContent = triggerText;

    wrapper.addEventListener('mouseenter', function () {
      if (!tipText) return;
      var tip = document.createElement('div');
      tip.className = 'tokui-tooltip__popup tokui-tooltip__popup--' + pos;
      tip.setAttribute('role', 'tooltip');
      tip.textContent = tipText;
      document.body.appendChild(tip);

      var rect = wrapper.getBoundingClientRect();
      var tipRect = tip.getBoundingClientRect();
      var gap = 8;

      if (pos === 'top') {
        tip.style.left = (rect.left + rect.width / 2 - tipRect.width / 2) + 'px';
        tip.style.top = (rect.top - tipRect.height - gap) + 'px';
      } else if (pos === 'bottom') {
        tip.style.left = (rect.left + rect.width / 2 - tipRect.width / 2) + 'px';
        tip.style.top = (rect.bottom + gap) + 'px';
      } else if (pos === 'left') {
        tip.style.left = (rect.left - tipRect.width - gap) + 'px';
        tip.style.top = (rect.top + rect.height / 2 - tipRect.height / 2) + 'px';
      } else if (pos === 'right') {
        tip.style.left = (rect.right + gap) + 'px';
        tip.style.top = (rect.top + rect.height / 2 - tipRect.height / 2) + 'px';
      }

      // 视口边界修正
      var finalRect = tip.getBoundingClientRect();
      if (finalRect.left < 4) tip.style.left = '4px';
      if (finalRect.right > window.innerWidth - 4) tip.style.left = (window.innerWidth - finalRect.width - 4) + 'px';
      if (finalRect.top < 4) tip.style.top = (rect.bottom + gap) + 'px';

      tip.classList.add('tokui-tooltip__popup--visible');
      wrapper._tooltipEl = tip;
    });

    function hideTip() {
      if (wrapper._tooltipEl) {
        wrapper._tooltipEl.classList.remove('tokui-tooltip__popup--visible');
        var ref = wrapper._tooltipEl;
        setTimeout(function () { if (ref.parentNode) ref.parentNode.removeChild(ref); }, 150);
        wrapper._tooltipEl = null;
      }
    }
    wrapper.addEventListener('mouseleave', hideTip);
    wrapper.addEventListener('blur', hideTip);
    wrapper.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') hideTip();
    });

    return wrapper;
  });

  // === Pagination 分页（自闭合） ===
  // attrs.page = 当前页, attrs.total = 总页数, attrs.clk = 点击处理
  // attrs.s = 尺寸(sm/lg), attrs.show-total = 显示总数, attrs.count = 总条目数
  // 支持内部切换：点击页码/上一页/下一页自动更新 UI 状态
  renderer.register('pagination', (node) => {
    var attrs = node.attrs || {};
    var total = parseInt(attrs.total, 10) || 1;
    var handlerName = attrs.clk || '';
    var size = attrs.s || '';
    var showTotal = attrs['show-total'] !== undefined;
    var count = attrs.count || '';
    var _current = parseInt(attrs.page, 10) || 1;

    var classes = ['tokui-pagination'];
    if (size === 'sm') classes.push('tokui-pagination--sm');
    else if (size === 'lg') classes.push('tokui-pagination--lg');
    var nav = el('nav', { class: classes.join(' '), role: 'navigation', 'aria-label': '分页' });

    // 总数显示（固定不刷新）
    if (showTotal) {
      var totalEl = el('span', { class: 'tokui-pagination__total' });
      totalEl.textContent = count ? ('共 ' + count + ' 条') : ('共 ' + total + ' 页');
      nav.appendChild(totalEl);
    }

    // 动态区域容器
    var pagesWrap = el('div', { class: 'tokui-pagination__pages' });
    nav.appendChild(pagesWrap);

    function renderPages(cur) {
      pagesWrap.innerHTML = '';

      // 上一页
      var prevBtn = el('button', {
        class: 'tokui-pagination__btn tokui-pagination__prev' + (cur <= 1 ? ' tokui-pagination__btn--disabled' : ''),
        'data-page': String(cur - 1),
        disabled: cur <= 1 ? true : false
      });
      prevBtn.textContent = '‹';
      pagesWrap.appendChild(prevBtn);

      // 页码
      var pages = generatePages(cur, total);
      pages.forEach(function (p) {
        if (p === '...') {
          var ell = el('span', { class: 'tokui-pagination__ellipsis' });
          ell.textContent = '...';
          pagesWrap.appendChild(ell);
        } else {
          var pBtn = el('button', {
            class: 'tokui-pagination__item' + (p === cur ? ' tokui-pagination__item--active' : ''),
            'data-page': String(p)
          });
          pBtn.textContent = String(p);
          pagesWrap.appendChild(pBtn);
        }
      });

      // 下一页
      var nextBtn = el('button', {
        class: 'tokui-pagination__btn tokui-pagination__next' + (cur >= total ? ' tokui-pagination__btn--disabled' : ''),
        'data-page': String(cur + 1),
        disabled: cur >= total ? true : false
      });
      nextBtn.textContent = '›';
      pagesWrap.appendChild(nextBtn);
    }

    renderPages(_current);

    // 点击事件：更新 UI + 分发外部回调
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      var pageNum = parseInt(btn.getAttribute('data-page'), 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > total) return;
      _current = pageNum;
      renderPages(_current);
      if (handlerName) {
        var handler = renderer.eventBus && renderer.eventBus.getHandler(handlerName);
        if (handler) handler({ page: pageNum }, e, btn);
      }
    });

    return nav;
  });

  // === Breadcrumb 面包屑 ===
  // attrs.items = 逗号分隔路径, attrs.sep = 分隔符(默认 /)
  // attrs.clk = 点击处理器
  renderer.register('breadcrumb', (node) => {
    var attrs = node.attrs || {};
    var itemsStr = attrs.items || '';
    var items = itemsStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var sep = attrs.sep || '/';
    var handlerName = attrs.clk || '';
    var isArrow = attrs.v && attrs.v.indexOf('arrow') !== -1;

    var classes = ['tokui-breadcrumb'];
    if (isArrow) classes.push('tokui-breadcrumb--arrow');

    var nav = el('nav', { class: classes.join(' '), 'aria-label': 'breadcrumb' });

    items.forEach(function (text, idx) {
      var isLast = idx === items.length - 1;
      var item = el('span', {
        class: 'tokui-breadcrumb__item' + (isLast ? ' tokui-breadcrumb__item--active' : ''),
        'data-index': String(idx)
      });
      item.textContent = text;
      if (handlerName && !isLast) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', function (e) {
          var handler = renderer.eventBus && renderer.eventBus.getHandler(handlerName);
          if (handler) handler({ index: idx, text: text }, e, item);
        });
      }
      nav.appendChild(item);

      if (!isLast) {
        var sepEl = el('span', { class: 'tokui-breadcrumb__sep' });
        sepEl.textContent = isArrow ? '›' : sep;
        nav.appendChild(sepEl);
      }
    });

    return nav;
  });

  // === Dropdown 下拉菜单（容器） ===
  // attrs.tx = 触发按钮文字, attrs.v = 按钮变体(primary/danger/success/warning/ghost)
  renderer.register('dropdown', (node, rc) => {
    var attrs = node.attrs || {};
    var triggerText = attrs.tt || attrs.tx || '菜单';
    var variant = attrs.v || '';

    var wrapper = el('div', { class: 'tokui-dropdown' });

    // 触发按钮
    var triggerClasses = 'tokui-dropdown__trigger';
    if (variant) triggerClasses += ' tokui-dropdown__trigger--' + variant;
    var trigger = el('button', { class: triggerClasses });
    trigger.textContent = triggerText;
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    wrapper.appendChild(trigger);

    // 下拉面板
    var panel = el('div', { class: 'tokui-dropdown__panel' });
    panel.setAttribute('role', 'menu');

    // 渲染子节点（dd-item 等）
    (node.children || []).forEach(function (child) {
      var rendered = rc([child]);
      rendered.forEach(function (el) {
        if (el && el.nodeType) panel.appendChild(el);
      });
    });

    wrapper.appendChild(panel);

    // 点击触发按钮切换展开
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = panel.classList.contains('tokui-dropdown__panel--open');
      closeAllDropdowns();
      if (!isOpen) {
        var rect = trigger.getBoundingClientRect();
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.left = rect.left + 'px';
        panel.classList.add('tokui-dropdown__panel--open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    // panel 内点击 item 后自动关闭
    panel.addEventListener('click', function (e) {
      var item = e.target.closest('.tokui-dropdown__item');
      if (item && !item.classList.contains('tokui-dropdown__item--disabled')) {
        panel.classList.remove('tokui-dropdown__panel--open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    wrapper._slot = panel;
    wrapper._tokuiType = 'dropdown';
    // 键盘导航
    trigger.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        if (!panel.classList.contains('tokui-dropdown__panel--open')) {
          closeAllDropdowns();
          panel.classList.add('tokui-dropdown__panel--open');
          trigger.setAttribute('aria-expanded', 'true');
        }
        var items = panel.querySelectorAll('.tokui-dropdown__item:not(.tokui-dropdown__item--disabled)');
        if (items.length > 0) items[0].focus();
      }
      if (e.key === 'Escape') {
        panel.classList.remove('tokui-dropdown__panel--open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    panel.addEventListener('keydown', function(e) {
      var items = Array.from(panel.querySelectorAll('.tokui-dropdown__item:not(.tokui-dropdown__item--disabled)'));
      var idx = items.indexOf(e.target);
      if (e.key === 'ArrowDown' && idx < items.length - 1) { e.preventDefault(); items[idx + 1].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); idx > 0 ? items[idx - 1].focus() : trigger.focus(); }
      if (e.key === 'Escape') { panel.classList.remove('tokui-dropdown__panel--open'); trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }
    });
    return wrapper;
  });

  // === Empty 空状态组件（自闭合）===
  // attrs.tx = 描述文本, attrs.icon = 图标类型(default/box/folder/search), attrs.s = 图片源
  // 居中展示空状态插图 + 描述文字
  renderer.register('empty', (node) => {
    var attrs = node.attrs || {};
    var text = attrs.tx || '';
    var iconType = attrs.icon || 'default';
    var src = attrs.s || '';

    var ICONS = {
      default: '<svg viewBox="0 0 64 41" fill="none"><g transform="translate(0 1)" fill-rule="evenodd"><ellipse fill="var(--tokui-stripe)" cx="32" cy="33" rx="32" ry="7"/><g fill-rule="nonzero" stroke="var(--tokui-border)"><path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z"/><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" fill="var(--tokui-stripe)"/></g></g></svg>',
      box: '<svg viewBox="0 0 64 41" fill="none"><g transform="translate(0 1)" fill-rule="evenodd"><ellipse fill="var(--tokui-stripe)" cx="32" cy="33" rx="32" ry="7"/><rect x="13" y="6" width="38" height="24" rx="3" fill="var(--tokui-stripe)" stroke="var(--tokui-border)" stroke-width="2"/><path d="M13 14h38" stroke="var(--tokui-border)" stroke-width="2"/></g></svg>',
      folder: '<svg viewBox="0 0 64 41" fill="none"><g transform="translate(0 1)" fill-rule="evenodd"><ellipse fill="var(--tokui-stripe)" cx="32" cy="33" rx="32" ry="7"/><path d="M10 12V9a2 2 0 012-2h12l4 5h24a2 2 0 012 2v16a2 2 0 01-2 2H12a2 2 0 01-2-2V12z" fill="var(--tokui-stripe)" stroke="var(--tokui-border)" stroke-width="2"/></g></svg>',
      search: '<svg viewBox="0 0 64 41" fill="none"><g transform="translate(0 1)" fill-rule="evenodd"><ellipse fill="var(--tokui-stripe)" cx="32" cy="33" rx="32" ry="7"/><circle cx="28" cy="18" r="10" stroke="var(--tokui-border)" stroke-width="2" fill="var(--tokui-stripe)"/><path d="M35 25l8 7" stroke="var(--tokui-border)" stroke-width="2" stroke-linecap="round"/></g></svg>'
    };

    var wrapper = el('div', { class: 'tokui-empty' });

    // 图片或图标
    if (src) {
      var imgEl = el('img', { class: 'tokui-empty__img', src: src, alt: text });
      wrapper.appendChild(imgEl);
    } else {
      var iconEl = el('div', { class: 'tokui-empty__icon' });
      iconEl.innerHTML = ICONS[iconType] || ICONS.default;
      wrapper.appendChild(iconEl);
    }

    // 描述文字
    if (text) {
      var textEl = el('div', { class: 'tokui-empty__text' });
      textEl.textContent = text;
      wrapper.appendChild(textEl);
    }

    return wrapper;
  });

  // === Result 结果页组件（自闭合）===
  // attrs.t = 类型(success/error/warning/info), attrs.tt = 标题, attrs.tx = 描述
  // 大图标 + 标题 + 描述的结果反馈
  renderer.register('result', (node) => {
    var attrs = node.attrs || {};
    var type = attrs.t || 'info';
    var title = attrs.tt || '';
    var desc = attrs.tx || '';

    var ICONS = {
      success: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="var(--tokui-success-1, rgba(34,197,94,0.1))" stroke="var(--tokui-success)" stroke-width="2"/><path d="M20 32l8 8 16-16" stroke="var(--tokui-success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="var(--tokui-danger-1, rgba(239,68,68,0.1))" stroke="var(--tokui-danger)" stroke-width="2"/><path d="M24 24l16 16M40 24l-16 16" stroke="var(--tokui-danger)" stroke-width="3" stroke-linecap="round"/></svg>',
      warning: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="var(--tokui-warning-1, rgba(245,158,11,0.1))" stroke="var(--tokui-warning)" stroke-width="2"/><path d="M32 22v14M32 42v2" stroke="var(--tokui-warning)" stroke-width="3" stroke-linecap="round"/></svg>',
      info: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="var(--tokui-primary-1, rgba(79,70,229,0.1))" stroke="var(--tokui-primary)" stroke-width="2"/><path d="M32 22v2M32 30v14" stroke="var(--tokui-primary)" stroke-width="3" stroke-linecap="round"/></svg>'
    };

    var wrapper = el('div', { class: 'tokui-result tokui-result--' + type });

    var iconEl = el('div', { class: 'tokui-result__icon' });
    iconEl.innerHTML = ICONS[type] || ICONS.info;
    wrapper.appendChild(iconEl);

    if (title) {
      var titleEl = el('div', { class: 'tokui-result__title' });
      titleEl.textContent = title;
      wrapper.appendChild(titleEl);
    }

    if (desc) {
      var descEl = el('div', { class: 'tokui-result__desc' });
      descEl.textContent = desc;
      wrapper.appendChild(descEl);
    }

    return wrapper;
  });

  // === Stat 统计数值组件（自闭合）===
  // attrs.tt = 标签/标题, attrs.v = 值, attrs.pre = 前缀(如¥), attrs.suf = 后缀(如%)
  // attrs.trend = 趋势(up/down), attrs.anim = 动画时长(ms, 如 2000), attrs.dec = 小数位数
  renderer.register('stat', (node) => {
    var attrs = node.attrs || {};
    var title = attrs.tt || '';
    var rawValue = attrs.v || '0';
    var prefix = attrs.pre || '';
    var suffix = attrs.suf || '';
    var trend = attrs.trend || '';
    var animDuration = parseInt(attrs.anim) || 0;
    var decimals = parseInt(attrs.dec) || 0;

    var wrapper = el('div', { class: 'tokui-stat' });
    // 透传 id：upd 指令靠 document.getElementById(id) 定位 stat 并调用 _update，
    // 不透传则 upd 找不到目标、数值不更新（与 switch/form 等组件一致）。
    if (attrs.id) wrapper.id = attrs.id;

    if (title) {
      var titleEl = el('div', { class: 'tokui-stat__title' });
      titleEl.textContent = title;
      wrapper.appendChild(titleEl);
    }

    var valueWrap = el('div', { class: 'tokui-stat__value' });

    if (prefix) {
      var preEl = el('span', { class: 'tokui-stat__prefix' });
      preEl.textContent = prefix;
      valueWrap.appendChild(preEl);
    }

    var valEl = el('span', { class: 'tokui-stat__number' });
    valueWrap.appendChild(valEl);

    if (suffix) {
      var sufEl = el('span', { class: 'tokui-stat__suffix' });
      sufEl.textContent = suffix;
      valueWrap.appendChild(sufEl);
    }

    if (trend) {
      var trendCls = 'tokui-stat__trend' + (trend === 'up' ? ' tokui-stat__trend--up' : ' tokui-stat__trend--down');
      var trendEl = el('span', { class: trendCls });
      trendEl.textContent = trend === 'up' ? '↑' : '↓';
      valueWrap.appendChild(trendEl);
    }

    // 数值滚动动画
    if (animDuration > 0) {
      // 解析数值：提取纯数字部分
      var numStr = rawValue.replace(/[^\d.\-]/g, '');
      var targetNum = parseFloat(numStr);
      if (!isNaN(targetNum) && targetNum !== 0) {
        var hasComma = rawValue.indexOf(',') !== -1;
        valEl.textContent = '0';
        var startTime = null;
        function animate(timestamp) {
          if (!startTime) startTime = timestamp;
          var progress = Math.min((timestamp - startTime) / animDuration, 1);
          // easeOutExpo 缓动
          var eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          var current = targetNum * eased;
          var display = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
          if (hasComma) {
            display = Number(display).toLocaleString('en-US', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals
            });
          } else if (decimals > 0) {
            display = current.toFixed(decimals);
          }
          valEl.textContent = display;
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            valEl.textContent = rawValue.replace(/[^\d.,\-]/g, function() { return ''; });
            // 还原原始格式
            valEl.textContent = rawValue;
          }
        }
        requestAnimationFrame(animate);
      } else {
        valEl.textContent = rawValue;
      }
    } else {
      valEl.textContent = rawValue;
    }

    wrapper.appendChild(valueWrap);

    // 动态更新方法：供 [upd id:xxx v:新值 trend:up] 调用
    wrapper._update = function (uAttrs) {
      if (uAttrs.v !== undefined) {
        var numEl = wrapper.querySelector('.tokui-stat__number');
        if (numEl) numEl.textContent = uAttrs.v;
      }
      if (uAttrs.trend !== undefined) {
        var existingTrend = wrapper.querySelector('.tokui-stat__trend');
        if (existingTrend) {
          existingTrend.className = 'tokui-stat__trend' + (uAttrs.trend === 'up' ? ' tokui-stat__trend--up' : ' tokui-stat__trend--down');
          existingTrend.textContent = uAttrs.trend === 'up' ? '↑' : '↓';
        }
      }
    };

    return wrapper;
  });

  // === Dropdown Item（自闭合） ===
  // attrs.tx = 文字, attrs.clk = 点击事件, attrs.dis = 禁用, attrs.v = 变体(danger)
  renderer.register('dd-item', (node) => {
    var attrs = node.attrs || {};
    var text = attrs.tx || '';
    var classes = ['tokui-dropdown__item'];
    if (attrs.v) classes.push('tokui-dropdown__item--' + attrs.v);
    if (attrs.dis !== undefined) classes.push('tokui-dropdown__item--disabled');
    var itemAttrs = { class: classes.join(' '), role: 'menuitem', tabindex: '0' };
    if (attrs.clk) itemAttrs['data-tokui-clk'] = attrs.clk;
    if (attrs.dis !== undefined) itemAttrs['aria-disabled'] = 'true';
    var item = el('div', itemAttrs);
    item.textContent = text;
    return item;
  });

  // === Popover 气泡卡片（容器）===
  // attrs.tt = 标题, attrs.tx = 触发文字, attrs.pos = 位置(top/bottom/left/right)
  // attrs.w = 宽度, attrs.trig = 触发方式(click/hover，默认click)
  // 子节点作为气泡内容
  renderer.register('popover', (node, rc) => {
    var attrs = node.attrs || {};
    var triggerText = attrs.tx || '点击';
    var pos = attrs.pos || 'top';
    var title = attrs.tt || '';
    var width = attrs.w || '';
    var trigMode = attrs.trig || 'click';

    var wrapper = el('span', { class: 'tokui-popover' });

    // 触发元素
    var trigger = el('span', {
      class: 'tokui-popover__trigger',
      tabindex: '0',
      role: 'button',
      'aria-haspopup': 'true',
      'aria-expanded': 'false'
    });
    trigger.textContent = triggerText;
    wrapper.appendChild(trigger);

    // 气泡面板
    var panel = el('div', {
      class: 'tokui-popover__panel tokui-popover__panel--' + pos,
      role: 'dialog'
    });
    if (width) panel.style.width = width;

    // 箭头
    var arrow = el('div', { class: 'tokui-popover__arrow' });
    panel.appendChild(arrow);

    if (title) {
      var header = el('div', { class: 'tokui-popover__title' });
      header.textContent = title;
      panel.appendChild(header);
    }

    var body = el('div', { class: 'tokui-popover__body' });
    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) body.appendChild(child);
    });
    panel.appendChild(body);
    wrapper.appendChild(panel);

    // 定位逻辑
    function positionPanel() {
      var rect = trigger.getBoundingClientRect();
      var panelRect = panel.getBoundingClientRect();
      var gap = 10;

      if (pos === 'top') {
        panel.style.left = (rect.left + rect.width / 2 - panelRect.width / 2) + 'px';
        panel.style.top = (rect.top - panelRect.height - gap) + 'px';
      } else if (pos === 'bottom') {
        panel.style.left = (rect.left + rect.width / 2 - panelRect.width / 2) + 'px';
        panel.style.top = (rect.bottom + gap) + 'px';
      } else if (pos === 'left') {
        panel.style.left = (rect.left - panelRect.width - gap) + 'px';
        panel.style.top = (rect.top + rect.height / 2 - panelRect.height / 2) + 'px';
      } else if (pos === 'right') {
        panel.style.left = (rect.right + gap) + 'px';
        panel.style.top = (rect.top + rect.height / 2 - panelRect.height / 2) + 'px';
      }

      // 视口边界修正
      var finalRect = panel.getBoundingClientRect();
      if (finalRect.left < 4) panel.style.left = '4px';
      if (finalRect.right > window.innerWidth - 4) panel.style.left = (window.innerWidth - finalRect.width - 4) + 'px';
      if (finalRect.top < 4) panel.style.top = (rect.bottom + gap) + 'px';
    }

    function openPanel() {
      panel.classList.add('tokui-popover__panel--visible');
      trigger.setAttribute('aria-expanded', 'true');
      positionPanel();
    }

    function closePanel() {
      panel.classList.remove('tokui-popover__panel--visible');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function togglePanel() {
      if (panel.classList.contains('tokui-popover__panel--visible')) {
        closePanel();
      } else {
        openPanel();
      }
    }

    if (trigMode === 'hover') {
      wrapper.addEventListener('mouseenter', openPanel);
      wrapper.addEventListener('mouseleave', closePanel);
    } else {
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePanel();
      });
      panel.addEventListener('click', function(e) {
        e.stopPropagation();
      });
      // 外部点击关闭
      document.addEventListener('click', function(e) {
        if (!wrapper.contains(e.target)) closePanel();
      });
      // Escape 关闭
      wrapper.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closePanel();
      });
    }
    // 页面滚动时关闭
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', closePanel, true);
    }

    wrapper._slot = body;
    wrapper._tokuiType = 'popover';
    return wrapper;
  });

  // === Hover Card 悬浮卡片（容器）===
  // attrs.pos = 位置(top/bottom/left/right, 默认bottom)
  // attrs.w = 宽度(px), attrs.delay = 显示延迟(ms, 默认300)
  // 子节点: hover-trigger(触发区) + hover-content(弹出内容)
  // content 使用 position:fixed 定位，避免被父级 overflow 裁切
  renderer.register('hover-card', (node, rc) => {
    var attrs = node.attrs || {};
    var pos = attrs.pos || 'bottom';
    var width = attrs.w || '';
    var delay = parseInt(attrs.delay) || 300;

    var wrapper = el('span', {
      class: 'tokui-hover-card tokui-hover-card--' + pos,
      'data-delay': String(delay)
    });

    var triggerEl = null;
    var contentEl = null;

    // 构建 content 面板（含 arrow + body）
    function buildContentPanel() {
      var panel = el('span', {
        class: 'tokui-hover-card__content',
        role: 'dialog'
      });
      if (width) panel.style.width = width + 'px';
      var arrow = el('span', { class: 'tokui-hover-card__arrow tokui-hover-card__arrow--' + pos });
      panel.appendChild(arrow);
      var body = el('span', { class: 'tokui-hover-card__body' });
      panel.appendChild(body);
      return { panel: panel, body: body };
    }

    // 非流式模式：直接遍历 children 构建
    if (node.children && node.children.length > 0) {
      node.children.forEach(function (child) {
        if (child.type === 'hover-trigger') {
          triggerEl = el('span', { class: 'tokui-hover-card__trigger' });
          rc([child]).forEach(function (rendered) {
            if (rendered && rendered.nodeType) {
              if (rendered._tokuiType === 'hover-trigger') {
                while (rendered.firstChild) triggerEl.appendChild(rendered.firstChild);
              } else {
                triggerEl.appendChild(rendered);
              }
            }
          });
          wrapper.appendChild(triggerEl);
        } else if (child.type === 'hover-content') {
          var built = buildContentPanel();
          contentEl = built.panel;
          rc([child]).forEach(function (rendered) {
            if (rendered && rendered.nodeType) {
              if (rendered._tokuiType === 'hover-content') {
                while (rendered.firstChild) built.body.appendChild(rendered.firstChild);
              } else {
                built.body.appendChild(rendered);
              }
            }
          });
          wrapper.appendChild(contentEl);
        } else {
          rc([child]).forEach(function (r) {
            if (r && r.nodeType) wrapper.appendChild(r);
          });
        }
      });
    }

    // position:fixed 定位计算
    function positionPanel(panel) {
      var trig = wrapper.querySelector('.tokui-hover-card__trigger');
      if (!trig) return;
      var rect = trig.getBoundingClientRect();
      var pRect = panel.getBoundingClientRect();
      var gap = 8;

      if (pos === 'bottom') {
        panel.style.left = (rect.left + rect.width / 2 - pRect.width / 2) + 'px';
        panel.style.top = (rect.bottom + gap) + 'px';
      } else if (pos === 'top') {
        panel.style.left = (rect.left + rect.width / 2 - pRect.width / 2) + 'px';
        panel.style.top = (rect.top - pRect.height - gap) + 'px';
      } else if (pos === 'left') {
        panel.style.left = (rect.left - pRect.width - gap) + 'px';
        panel.style.top = (rect.top + rect.height / 2 - pRect.height / 2) + 'px';
      } else if (pos === 'right') {
        panel.style.left = (rect.right + gap) + 'px';
        panel.style.top = (rect.top + rect.height / 2 - pRect.height / 2) + 'px';
      }
      // 视口边界修正
      var fRect = panel.getBoundingClientRect();
      if (fRect.left < 4) panel.style.left = '4px';
      if (fRect.right > window.innerWidth - 4) panel.style.left = (window.innerWidth - fRect.width - 4) + 'px';
      if (fRect.top < 4) panel.style.top = (rect.bottom + gap) + 'px';
    }

    // Hover behavior
    var showTimer = null;
    var hideTimer = null;

    function showPanel() {
      clearTimeout(hideTimer);
      showTimer = setTimeout(function () {
        var c = wrapper.querySelector('.tokui-hover-card__content');
        if (c) {
          positionPanel(c);
          c.classList.add('tokui-hover-card__content--visible');
        }
      }, delay);
    }

    function hidePanel() {
      clearTimeout(showTimer);
      hideTimer = setTimeout(function () {
        var c = wrapper.querySelector('.tokui-hover-card__content');
        if (c) c.classList.remove('tokui-hover-card__content--visible');
      }, 150);
    }

    wrapper.addEventListener('mouseenter', showPanel);
    wrapper.addEventListener('mouseleave', hidePanel);

    // 滚动时隐藏
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('scroll', hidePanel, true);
    }

    // 流式模式：_slot 指向自身，_streamCloseHook 重构子节点
    wrapper._slot = wrapper;
    wrapper._tokuiType = 'hover-card';

    wrapper._streamCloseHook = function () {
      var trigWrap = null;
      var contWrap = null;
      var others = [];
      for (var i = 0; i < wrapper.children.length; i++) {
        var ch = wrapper.children[i];
        if (ch._tokuiType === 'hover-trigger') trigWrap = ch;
        else if (ch._tokuiType === 'hover-content') contWrap = ch;
        else others.push(ch);
      }
      // mount 模式下 trigger/content 已由非流式分支建成最终面板（无 _tokuiType 印章），
      // trigWrap/contWrap 均为 null —— 直接返回，避免清空已建好的内容（mount() 也会调本 hook）。
      // 仅流式模式（temp span 带 _tokuiType）才需要重建。
      if (!trigWrap && !contWrap) return;
      // 清空 wrapper
      while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
      // 重建 trigger
      var newTrigger = el('span', { class: 'tokui-hover-card__trigger' });
      if (trigWrap) {
        while (trigWrap.firstChild) newTrigger.appendChild(trigWrap.firstChild);
      }
      wrapper.appendChild(newTrigger);
      // 重建 content
      var built = buildContentPanel();
      if (contWrap) {
        while (contWrap.firstChild) built.body.appendChild(contWrap.firstChild);
      }
      wrapper.appendChild(built.panel);
      // others
      others.forEach(function (o) { wrapper.appendChild(o); });
    };

    return wrapper;
  });

  // === Hover Card Trigger 触发器（容器）===
  // 返回 span 元素（非 fragment），设置 _tokuiType 以便父级识别
  renderer.register('hover-trigger', (node, rc) => {
    var span = el('span');
    if (node.children && node.children.length > 0) {
      rc(node.children).forEach(function (child) {
        if (child && child.nodeType) span.appendChild(child);
      });
    }
    if (node.content) {
      span.appendChild(document.createTextNode(node.content));
    }
    span._tokuiType = 'hover-trigger';
    span._slot = span;
    return span;
  });

  // === Hover Card Content 内容区（容器）===
  // 返回屏幕外隐藏的 span，流式输出时内容完全不可见
  renderer.register('hover-content', (node, rc) => {
    var span = el('span', { class: 'tokui-hover-card__content-temp' });
    if (node.children && node.children.length > 0) {
      rc(node.children).forEach(function (child) {
        if (child && child.nodeType) span.appendChild(child);
      });
    }
    if (node.content) {
      span.appendChild(document.createTextNode(node.content));
    }
    span._tokuiType = 'hover-content';
    span._slot = span;
    return span;
  });

  // === InputTag 标签输入框（容器）===
  // attrs.ph = 占位文字, attrs.n = name, attrs.id = 标识
  // attrs.max = 最大标签数, attrs.tags = 初始标签(逗号分隔)
  // attrs.clk = 事件回调
  renderer.register('input-tag', (node, rc) => {
    var attrs = node.attrs || {};
    var placeholder = attrs.ph || '输入后按回车添加';
    var name = attrs.n || 'tags';
    var id = attrs.id || '';
    var maxTags = parseInt(attrs.max) || 0;
    var initialTags = (attrs.tags || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);

    var wrapper = el('div', { class: 'tokui-input-tag', role: 'group' });
    if (id) wrapper.id = id;

    var field = el('div', { class: 'tokui-field' });
    if (attrs.l) {
      field.appendChild(el('label', { class: 'tokui-label' }, attrs.l));
    }

    var box = el('div', { class: 'tokui-input-tag__box' });

    var tagList = el('div', { class: 'tokui-input-tag__list', role: 'list' });
    initialTags.forEach(function(text) {
      tagList.appendChild(createTag(text));
    });
    box.appendChild(tagList);

    var input = el('input', {
      class: 'tokui-input-tag__input',
      type: 'text',
      placeholder: placeholder
    });
    box.appendChild(input);

    // 隐藏 input 存储值
    var hidden = el('input', {
      type: 'hidden',
      name: name,
      value: initialTags.join(',')
    });
    box.appendChild(hidden);

    field.appendChild(box);
    wrapper.appendChild(field);

    function createTag(text) {
      var tag = el('span', { class: 'tokui-input-tag__tag', role: 'listitem' });
      tag.textContent = text;
      var close = el('span', { class: 'tokui-input-tag__close' });
      close.textContent = '×';
      close.addEventListener('click', function() {
        tag.remove();
        syncHidden();
      });
      tag.appendChild(close);
      return tag;
    }

    function syncHidden() {
      var tags = Array.from(tagList.querySelectorAll('.tokui-input-tag__tag')).map(function(t) {
        return t.firstChild.textContent;
      });
      hidden.value = tags.join(',');
    }

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = input.value.trim();
        if (!val) return;
        // 检查重复
        var existing = Array.from(tagList.querySelectorAll('.tokui-input-tag__tag')).map(function(t) {
          return t.firstChild.textContent;
        });
        if (existing.indexOf(val) !== -1) { input.value = ''; return; }
        // 检查最大数量
        if (maxTags > 0 && existing.length >= maxTags) { input.value = ''; return; }
        tagList.appendChild(createTag(val));
        input.value = '';
        syncHidden();
      }
      // Backspace 删除最后一个
      if (e.key === 'Backspace' && !input.value) {
        var tags = tagList.querySelectorAll('.tokui-input-tag__tag');
        if (tags.length > 0) {
          tags[tags.length - 1].remove();
          syncHidden();
        }
      }
    });

    // 动态更新方法：供 [upd id:xxx dis:true] 调用
    wrapper._update = function (uAttrs) {
      if (uAttrs.dis === true || uAttrs.dis === 'true') {
        input.disabled = true;
        wrapper.classList.add('tokui-input-tag--disabled');
      } else if (uAttrs.dis === false || uAttrs.dis === 'false') {
        input.disabled = false;
        wrapper.classList.remove('tokui-input-tag--disabled');
      }
    };

    wrapper._tokuiType = 'input-tag';
    return wrapper;
  });

  // === Countdown 倒计时组件（自闭合）===
  // attrs.target = 目标时间戳(ms), attrs.dur = 持续时间(秒)
  // attrs.fmt = 显示格式: 'dhms'(默认), 'hms', 'ms', 's'
  // attrs.clk = 计时结束事件回调名
  // attrs.id = 标识, attrs.tx = 结束文案(默认"已结束")
  // attrs.l = 标签, attrs.s = 尺寸(sm/lg)
  renderer.register('countdown', (node) => {
    var attrs = node.attrs || {};
    var targetTime = parseInt(attrs.target) || 0;
    var duration = parseInt(attrs.dur) || 0;
    var label = attrs.l || '';
    var size = attrs.s || '';
    var endText = attrs.tx || '已结束';
    var id = attrs.id || '';
    var fmt = attrs.fmt || 'dhms';
    var handlerName = attrs.clk || '';

    if (!targetTime && duration > 0) {
      targetTime = Date.now() + duration * 1000;
    }

    var classes = ['tokui-countdown'];
    if (size === 'sm') classes.push('tokui-countdown--sm');
    else if (size === 'lg') classes.push('tokui-countdown--lg');

    var wrapperAttrs = { class: classes.join(' '), role: 'timer', 'aria-live': 'polite' };
    if (id) wrapperAttrs.id = id;
    var wrapper = el('div', wrapperAttrs);

    if (label) {
      var labelEl = el('div', { class: 'tokui-countdown__label' });
      labelEl.textContent = label;
      wrapper.appendChild(labelEl);
    }

    // 根据 fmt 决定显示哪些单位
    var allUnits = [
      { key: 'd', label: '天' },
      { key: 'h', label: '时' },
      { key: 'm', label: '分' },
      { key: 's', label: '秒' }
    ];
    var fmtKeys = fmt.split('');
    var items = allUnits.filter(function(u) { return fmtKeys.indexOf(u.key) !== -1; });

    var digitsWrap = el('div', { class: 'tokui-countdown__digits' });

    var numEls = {};
    items.forEach(function(item, idx) {
      var itemEl = el('div', { class: 'tokui-countdown__item' });
      var numEl = el('span', { class: 'tokui-countdown__num', 'data-key': item.key });
      numEl.textContent = '00';
      numEls[item.key] = numEl;
      itemEl.appendChild(numEl);
      var unitEl = el('span', { class: 'tokui-countdown__unit' });
      unitEl.textContent = item.label;
      itemEl.appendChild(unitEl);
      digitsWrap.appendChild(itemEl);

      if (idx < items.length - 1) {
        var sep = el('span', { class: 'tokui-countdown__sep' });
        sep.textContent = ':';
        digitsWrap.appendChild(sep);
      }
    });

    wrapper.appendChild(digitsWrap);

    function pad2(n) { return n < 10 ? '0' + n : String(n); }
    var ended = false;

    function update() {
      var now = Date.now();
      var diff = Math.max(0, targetTime - now);

      if (diff <= 0) {
        if (!ended) {
          ended = true;
          Object.keys(numEls).forEach(function(k) { numEls[k].textContent = '00'; });
          wrapper.classList.add('tokui-countdown--ended');
          var endedEl = el('div', { class: 'tokui-countdown__ended' });
          endedEl.textContent = endText;
          digitsWrap.parentNode.replaceChild(endedEl, digitsWrap);
          clearInterval(timer);
          if (handlerName) {
            var bus = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
              ? window.TokUI._internal.TokUIEventBus : null;
            if (bus) {
              var handler = bus.getHandler(handlerName);
              if (typeof handler === 'function') {
                handler({ id: id, target: targetTime });
              }
            }
          }
        }
        return;
      }

      var totalSec = Math.floor(diff / 1000);
      var d = Math.floor(totalSec / 86400);
      var h = Math.floor((totalSec % 86400) / 3600);
      var m = Math.floor((totalSec % 3600) / 60);
      var s = totalSec % 60;

      if (numEls.d) numEls.d.textContent = pad2(d);
      if (numEls.h) numEls.h.textContent = pad2(h);
      if (numEls.m) numEls.m.textContent = pad2(m);
      if (numEls.s) numEls.s.textContent = pad2(s);
    }

    update();
    var timer = setInterval(update, 1000);
    wrapper._countdownTimer = timer;
    wrapper._tokuiType = 'countdown';
    return wrapper;
  });

  // === Popconfirm 确认气泡（自闭合）===
  // 点击触发确认气泡，替代 window.confirm()
  // attrs.tt = 确认文案, attrs.tx = 触发按钮文本, attrs.clk = 确认回调名
  // attrs.t = 按钮类型(primary/danger), attrs.pos = 气泡位置(top/bottom/left/right)
  // attrs.ok-text = 确认按钮文字(默认"确定"), attrs.cancel-text = 取消按钮文字(默认"取消")
  renderer.register('popconfirm', (node) => {
    var attrs = node.attrs || {};
    var title = attrs.tt || '';
    var handlerName = attrs.clk || '';
    var btnType = attrs.t || 'primary';
    var pos = attrs.pos || 'top';
    var okText = attrs['ok-text'] || '确定';
    var cancelText = attrs['cancel-text'] || '取消';

    // 触发按钮文字：优先用节点内容（builder 传入的 text），其次用 tx 属性
    var triggerText = node.content || attrs.tx || '确认';

    var wrapper = el('span', { class: 'tokui-popconfirm' });

    // 触发按钮
    var trigger = el('button', {
      class: 'tokui-popconfirm__trigger',
      type: 'button',
      tabindex: '0',
      'aria-haspopup': 'true',
      'aria-expanded': 'false'
    });
    trigger.textContent = triggerText;
    wrapper.appendChild(trigger);

    // 存储 popup 引用
    wrapper._popconfirmPopup = null;

    function closePopup() {
      if (wrapper._popconfirmPopup) {
        wrapper._popconfirmPopup.classList.remove('tokui-popconfirm__popup--visible');
        var ref = wrapper._popconfirmPopup;
        setTimeout(function() { if (ref.parentNode) ref.parentNode.removeChild(ref); }, 150);
        wrapper._popconfirmPopup = null;
        trigger.setAttribute('aria-expanded', 'false');
      }
    }

    function openPopup() {
      // 先关闭已有的
      closePopup();

      var popup = el('div', {
        class: 'tokui-popconfirm__popup tokui-popconfirm__popup--' + pos,
        role: 'dialog',
        'aria-label': title || '确认操作'
      });

      // 箭头
      var arrow = el('div', { class: 'tokui-popconfirm__arrow' });
      popup.appendChild(arrow);

      // 消息文本
      if (title) {
        var msgEl = el('div', { class: 'tokui-popconfirm__message' });
        msgEl.textContent = title;
        popup.appendChild(msgEl);
      }

      // 按钮行
      var btnRow = el('div', { class: 'tokui-popconfirm__buttons' });

      var cancelBtn = el('button', {
        class: 'tokui-popconfirm__btn tokui-popconfirm__btn--cancel',
        type: 'button'
      });
      cancelBtn.textContent = cancelText;
      cancelBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closePopup();
      });
      btnRow.appendChild(cancelBtn);

      var confirmBtnClasses = 'tokui-popconfirm__btn tokui-popconfirm__btn--' + btnType;
      var confirmBtn = el('button', {
        class: confirmBtnClasses,
        type: 'button'
      });
      if (handlerName) confirmBtn.setAttribute('data-tokui-clk', handlerName);
      confirmBtn.textContent = okText;
      confirmBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        // 通过事件总线触发回调
        if (handlerName) {
          var bus = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
            ? window.TokUI._internal.eventBus : null;
          if (bus && typeof bus.emit === 'function') {
            bus.emit(handlerName, {});
          }
        }
        closePopup();
      });
      btnRow.appendChild(confirmBtn);
      popup.appendChild(btnRow);

      // 添加到 body
      if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(popup);
      }

      // 定位（延迟一帧确保 DOM 已渲染以获取正确尺寸）
      function doPosition() {
        if (trigger.getBoundingClientRect) {
          var rect = trigger.getBoundingClientRect();
          var popupRect = popup.getBoundingClientRect();
          var gap = 8;

          if (pos === 'top') {
            popup.style.left = (rect.left + rect.width / 2 - popupRect.width / 2) + 'px';
            popup.style.top = (rect.top - popupRect.height - gap) + 'px';
          } else if (pos === 'bottom') {
            popup.style.left = (rect.left + rect.width / 2 - popupRect.width / 2) + 'px';
            popup.style.top = (rect.bottom + gap) + 'px';
          } else if (pos === 'left') {
            popup.style.left = (rect.left - popupRect.width - gap) + 'px';
            popup.style.top = (rect.top + rect.height / 2 - popupRect.height / 2) + 'px';
          } else if (pos === 'right') {
            popup.style.left = (rect.right + gap) + 'px';
            popup.style.top = (rect.top + rect.height / 2 - popupRect.height / 2) + 'px';
          }

          // 视口边界修正
          if (popup.getBoundingClientRect) {
            var finalRect = popup.getBoundingClientRect();
            if (finalRect.left < 4) popup.style.left = '4px';
            if (finalRect.right > window.innerWidth - 4) popup.style.left = (window.innerWidth - finalRect.width - 4) + 'px';
            if (finalRect.top < 4) popup.style.top = (rect.bottom + gap) + 'px';
          }
        }

        popup.classList.add('tokui-popconfirm__popup--visible');
      }

      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(doPosition);
      } else {
        doPosition();
      }

      wrapper._popconfirmPopup = popup;
      trigger.setAttribute('aria-expanded', 'true');
    }

    // 点击触发按钮
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      if (wrapper._popconfirmPopup) {
        closePopup();
      } else {
        openPopup();
      }
    });

    // 外部点击关闭
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('click', function(e) {
        if (wrapper._popconfirmPopup && !wrapper._popconfirmPopup.contains(e.target) && !wrapper.contains(e.target)) {
          closePopup();
        }
      });
    }

    // Escape 关闭
    wrapper.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closePopup();
    });

    // 页面滚动时关闭
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('scroll', closePopup, true);
    }

    // 存储 pos 属性供测试验证
    wrapper._tokuiPopconfirmPos = pos;
    wrapper._tokuiType = 'popconfirm';
    return wrapper;
  });

  // === Watermark 水印组件（容器）===
  // attrs.tx = 水印文字, attrs.s = 尺寸(sm/md/lg)
  // attrs.c = 颜色, attrs.gap = 间距, attrs.ro = 旋转角度
  // attrs.font = 字体大小
  renderer.register('watermark', (node, rc) => {
    var attrs = node.attrs || {};
    var text = attrs.tx || 'TokUI';
    var fontSize = attrs.font || (attrs.s === 'sm' ? '12' : attrs.s === 'lg' ? '20' : '16');
    var gap = attrs.gap || '40';
    var rotate = attrs.ro || '-22';
    var color = attrs.c || 'rgba(0,0,0,0.2)';

    var wrapper = el('div', { class: 'tokui-watermark' });
    wrapper.style.overflow = 'hidden';
    wrapper.style.borderRadius = '8px';

    // 用 canvas 生成水印图案
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var fSize = parseInt(fontSize) || 16;
    var gapVal = parseInt(gap) || 40;
    ctx.font = fSize + 'px sans-serif';
    var textWidth = ctx.measureText(text).width;
    var cellW = textWidth + gapVal;
    var cellH = fSize + gapVal;
    // 单元格尺寸即为 canvas 尺寸，repeat 时无缝平铺
    canvas.width = cellW;
    canvas.height = cellH;
    ctx.font = fSize + 'px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var deg = (parseFloat(rotate) || -22) * Math.PI / 180;
    // 在画布中心绘制旋转文字
    ctx.translate(cellW / 2, cellH / 2);
    ctx.rotate(deg);
    ctx.fillText(text, 0, 0);

    // 渲染子节点到内容层
    var content = el('div', { class: 'tokui-watermark__content' });
    content.style.position = 'relative';
    content.style.zIndex = '1';
    if (node.children && node.children.length > 0) {
      var rendered = rc(node.children);
      if (rendered && rendered.forEach) {
        rendered.forEach(function(c) { if (c) content.appendChild(c); });
      }
    }
    wrapper.appendChild(content);

    // overlay 在 content 之后，确保 z-index 层叠在上层
    var overlay = el('div', { class: 'tokui-watermark__overlay' });
    overlay.style.backgroundImage = 'url(' + canvas.toDataURL() + ')';
    overlay.style.backgroundRepeat = 'repeat';
    overlay.style.borderRadius = '8px';
    wrapper.appendChild(overlay);

    wrapper._slot = content;
    wrapper._tokuiType = 'watermark';
    return wrapper;
  });

  // === Backtop 回到顶部（自闭合）===
  // attrs.t = 触发距离(默认200), attrs.v = 变体(circle/round/square)
  // attrs.tx = 文字(默认↑), attrs.s = 尺寸(sm/lg)
  // attrs.bottom = 距底部, attrs.right = 距右侧
  // attrs.container = true 时定位在滚动容器内（absolute）而非 fixed
  renderer.register('backtop', (node) => {
    var attrs = node.attrs || {};
    var threshold = parseInt(attrs.t) || 200;
    var variant = attrs.v || 'circle';
    var text = attrs.tx || '↑';
    var size = attrs.s || '';
    var bottom = attrs.bottom || '40';
    var right = attrs.right || '40';
    var isContainer = attrs.container !== undefined;

    var classes = ['tokui-backtop'];
    if (variant === 'round') classes.push('tokui-backtop--round');
    else if (variant === 'square') classes.push('tokui-backtop--square');
    if (size === 'sm') classes.push('tokui-backtop--sm');
    else if (size === 'lg') classes.push('tokui-backtop--lg');
    if (isContainer) classes.push('tokui-backtop--container');

    var btn = el('div', { class: classes.join(' '), role: 'button', 'aria-label': '回到顶部', tabindex: '0' });
    if (isContainer) {
      btn.style.bottom = bottom + 'px';
    } else {
      btn.style.bottom = bottom + 'px';
      btn.style.right = right + 'px';
    }
    btn.textContent = text;

    if (typeof window !== 'undefined') {
      requestAnimationFrame(function () {
        var scrollEl = window;
        var parent = btn.parentElement;
        while (parent) {
          var style = getComputedStyle(parent);
          if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
            scrollEl = parent;
            break;
          }
          parent = parent.parentElement;
        }

        btn.addEventListener('click', function () {
          if (scrollEl === window) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });

        var checkScroll = function () {
          var y = scrollEl === window ? window.pageYOffset : scrollEl.scrollTop;
          if (y > threshold) {
            btn.classList.add('tokui-backtop--visible');
          } else {
            btn.classList.remove('tokui-backtop--visible');
          }
        };
        scrollEl.addEventListener('scroll', checkScroll);
        checkScroll();
        btn._backtopCleanup = function () { scrollEl.removeEventListener('scroll', checkScroll); };
      });
    }

    return btn;
  });

  // === Calendar 日历组件（容器）===
  // attrs.month = 年月(如"2025-06"), attrs.v = 变体(card/mini)
  // attrs.marks = 标记日期(如"3,15,25"), attrs.tt = 标题
  renderer.register('calendar', (node) => {
    var attrs = node.attrs || {};
    var monthStr = attrs.month || '';
    var now = new Date();
    var year, month;
    if (monthStr) {
      var parts = monthStr.split('-');
      year = parseInt(parts[0]) || now.getFullYear();
      month = (parseInt(parts[1]) || now.getMonth() + 1) - 1;
    } else {
      year = now.getFullYear();
      month = now.getMonth();
    }
    var variant = attrs.v || '';
    var marksStr = attrs.marks || '';
    var marks = marksStr ? marksStr.split(',').map(function(s) { return parseInt(s.trim()); }).filter(function(n) { return n > 0; }) : [];

    // 离散选中天（sel 或 selected：逗号分隔日号）
    var selStr = String(attrs.sel != null ? attrs.sel : (attrs.selected != null ? attrs.selected : ''));
    var selectedDays = {};
    selStr.split(',').forEach(function(s) {
      var n = parseInt(s.trim(), 10);
      if (n > 0) selectedDays[n] = true;
    });

    // 区间解析：range="a-b" 单段；ranges="a-b;c-d" 多段（支持单日 a）
    function parseRanges(str) {
      var out = [];
      String(str || '').split(';').forEach(function(seg) {
        seg = seg.trim();
        if (!seg) return;
        var m = seg.split('-');
        if (m.length === 2) {
          var a = parseInt(m[0], 10), b = parseInt(m[1], 10);
          if (a > 0 && b > 0) out.push([Math.min(a, b), Math.max(a, b)]);
        } else {
          var single = parseInt(seg, 10);
          if (single > 0) out.push([single, single]);
        }
      });
      return out;
    }
    var ranges = [];
    if (attrs.range) ranges = ranges.concat(parseRanges(attrs.range));
    if (attrs.ranges) ranges = ranges.concat(parseRanges(attrs.ranges));
    var inRangeDays = {}, rangeStart = {}, rangeEnd = {};
    ranges.forEach(function(r) {
      for (var d = r[0]; d <= r[1]; d++) inRangeDays[d] = true;
      rangeStart[r[0]] = true;
      rangeEnd[r[1]] = true;
    });

    var today = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1;
    var title = attrs.tt || year + '年' + (month + 1) + '月';

    var classes = ['tokui-calendar'];
    if (variant === 'card') classes.push('tokui-calendar--card');
    else if (variant === 'mini') classes.push('tokui-calendar--mini');

    var wrapper = el('div', { class: classes.join(' ') });

    // 标题栏
    var header = el('div', { class: 'tokui-calendar__header' });
    header.textContent = title;
    wrapper.appendChild(header);

    // 日期网格（星期头 + 日期统一在 grid 内，固定 6 行）
    var grid = el('div', { class: 'tokui-calendar__grid' });
    var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(function(d) {
      var cell = el('div', { class: 'tokui-calendar__weekday' });
      cell.textContent = d;
      grid.appendChild(cell);
    });

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevMonthDays = new Date(year, month, 0).getDate();
    var totalCells = 42; // 固定 6 行 × 7 列

    // 上月尾部
    for (var i = firstDay - 1; i >= 0; i--) {
      var dayEl = el('div', { class: 'tokui-calendar__day tokui-calendar__day--other' });
      var numEl = el('span', { class: 'tokui-calendar__day__num' });
      numEl.textContent = prevMonthDays - i;
      dayEl.appendChild(numEl);
      grid.appendChild(dayEl);
    }
    // 本月日期
    for (var d = 1; d <= daysInMonth; d++) {
      var dayClasses = ['tokui-calendar__day'];
      if (d === today) dayClasses.push('tokui-calendar__day--today');
      if (marks.indexOf(d) !== -1) dayClasses.push('tokui-calendar__day--marked');
      if (selectedDays[d]) dayClasses.push('tokui-calendar__day--selected');
      if (inRangeDays[d]) {
        dayClasses.push('tokui-calendar__day--in-range');
        if (rangeStart[d]) dayClasses.push('tokui-calendar__day--range-start');
        if (rangeEnd[d]) dayClasses.push('tokui-calendar__day--range-end');
      }
      var dayEl = el('div', { class: dayClasses.join(' ') });
      var numEl = el('span', { class: 'tokui-calendar__day__num' });
      numEl.textContent = d;
      dayEl.appendChild(numEl);
      grid.appendChild(dayEl);
    }
    // 下月头部填充至 42 格
    var remaining = totalCells - firstDay - daysInMonth;
    for (var n = 1; n <= remaining; n++) {
      var dayEl = el('div', { class: 'tokui-calendar__day tokui-calendar__day--other' });
      var numEl = el('span', { class: 'tokui-calendar__day__num' });
      numEl.textContent = n;
      dayEl.appendChild(numEl);
      grid.appendChild(dayEl);
    }
    wrapper.appendChild(grid);
    wrapper._tokuiType = 'calendar';
    return wrapper;
  });

  // === Notification 全局通知（自闭合） ===
  // attrs.id = 标识, attrs.t = 类型(success/error/warning/info)
  // attrs.tt = 标题, attrs.tx = 描述文本, attrs.duration = 自动关闭毫秒(0=手动关)
  // attrs.pos = 位置(top-right/top-left/bottom-right/bottom-left), attrs.clk = 操作按钮回调
  renderer.register('notification', (node) => {
    var attrs = node.attrs || {};
    var id = attrs.id || '';
    var type = attrs.t || 'info';
    var title = attrs.tt || '';
    var text = attrs.tx || '';
    var duration = attrs.duration !== undefined ? parseInt(attrs.duration) : 4500;
    if (isNaN(duration)) duration = 4500;
    var pos = attrs.pos || 'top-right';
    var handlerName = attrs.clk || '';

    var NOTIF_ICONS = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    var wrapper = el('div', {
      class: 'tokui-notification tokui-notification--' + type + ' tokui-notification--' + pos,
      role: 'alert',
      'aria-live': 'polite'
    });
    if (id) wrapper.setAttribute('data-notif-id', id);

    // 色条
    var bar = el('div', { class: 'tokui-notification__bar' });
    wrapper.appendChild(bar);

    // 图标
    var iconEl = el('span', { class: 'tokui-notification__icon' });
    iconEl.textContent = NOTIF_ICONS[type] || NOTIF_ICONS.info;
    wrapper.appendChild(iconEl);

    // 内容区
    var content = el('div', { class: 'tokui-notification__content' });
    if (title) {
      var titleEl = el('div', { class: 'tokui-notification__title' });
      titleEl.textContent = title;
      content.appendChild(titleEl);
    }
    if (text) {
      var descEl = el('div', { class: 'tokui-notification__desc' });
      descEl.textContent = text;
      content.appendChild(descEl);
    }
    wrapper.appendChild(content);

    // 关闭按钮
    var closeBtn = el('button', {
      class: 'tokui-notification__close',
      type: 'button',
      'aria-label': '关闭'
    });
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function() {
      wrapper.classList.add('tokui-notification--hide');
      setTimeout(function() {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      }, 300);
    });
    wrapper.appendChild(closeBtn);

    // 操作按钮（如果有 clk）
    if (handlerName) {
      var actionBtn = el('button', {
        class: 'tokui-notification__action',
        type: 'button',
        'data-tokui-clk': handlerName
      });
      actionBtn.textContent = '查看';
      content.appendChild(actionBtn);
    }

    // 创建全局容器的辅助函数
    function getContainer(position) {
      if (typeof document === 'undefined' || !document.body) return null;
      var cls = 'tokui-notification-container--' + position;
      var container = document.querySelector('.' + cls);
      if (!container) {
        container = el('div', { class: 'tokui-notification-container ' + cls });
        document.body.appendChild(container);
      }
      return container;
    }

    // 浏览器环境：挂载到全局容器
    var hasBody = typeof document !== 'undefined' && document.body;

    if (hasBody) {
      var container = getContainer(pos);
      if (container) {
        container.appendChild(wrapper);
      }

      // 自动关闭定时器
      if (duration > 0) {
        setTimeout(function() {
          wrapper.classList.add('tokui-notification--hide');
          setTimeout(function() {
            if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
          }, 300);
        }, duration);
      }

      // 全局 API
      if (typeof window !== 'undefined') {
        if (!window.TokUI) window.TokUI = {};
        if (!window.TokUI._notifMap) window.TokUI._notifMap = {};
        if (id) window.TokUI._notifMap[id] = wrapper;
        if (!window.TokUI.showNotification) {
          window.TokUI.showNotification = function(notifId, overrides) {
            var map = window.TokUI._notifMap || {};
            var target = map[notifId];
            if (!target) return;
            if (overrides) {
              if (overrides.title) {
                var t = target.querySelector('.tokui-notification__title');
                if (t) t.textContent = overrides.title;
              }
              if (overrides.text) {
                var tx = target.querySelector('.tokui-notification__text');
                if (tx) tx.textContent = overrides.text;
              }
            }
            target.style.display = '';
            target.classList.remove('tokui-notification--hide');
            var dur = target._notifDuration || 4500;
            if (dur > 0) {
              clearTimeout(target._notifTimer);
              target._notifTimer = setTimeout(function() {
                target.classList.add('tokui-notification--hide');
                setTimeout(function() {
                  target.style.display = 'none';
                }, 300);
              }, dur);
            }
          };
        };
      }

      // 返回隐藏占位符，通知本体已挂载到全局容器
      var placeholder = el('div', { style: 'display:none' });
      placeholder._isNotifPlaceholder = true;
      return placeholder;
    }

    // 非浏览器环境（测试）：直接返回 wrapper
    wrapper._notifDuration = duration;
    return wrapper;
  });

  // === Chat-input 对话输入框（容器） ===
  // attrs.ph = placeholder, attrs.clk = 发送回调名, attrs.dis = 禁用
  // attrs.max = 最大字符数, attrs.auto = 自适应高度, attrs.rows = 初始行数(默认2)
  // 自闭合简写时自动生成发送按钮；容器模式支持自定义子节点
  renderer.register('chat-input', (node, rc) => {
    var attrs = node.attrs || {};
    var placeholder = attrs.ph || '';
    var handlerName = attrs.clk || '';
    var disabled = attrs.dis !== undefined;
    var maxChars = parseInt(attrs.max) || 0;
    var autoResize = attrs.auto !== undefined;
    var rows = parseInt(attrs.rows) || 2;

    var wrapper = el('div', { class: 'tokui-chat-input' });

    // textarea
    var textarea = el('textarea', {
      class: 'tokui-chat-input__textarea',
      rows: String(rows),
      placeholder: placeholder
    });
    if (disabled) {
      textarea.setAttribute('disabled', '');
      textarea.classList.add('tokui-chat-input__textarea--disabled');
    }
    if (autoResize) {
      textarea.classList.add('tokui-chat-input__textarea--auto');
    }
    wrapper.appendChild(textarea);

    // 右侧按钮区
    var actionsWrap = el('div', { class: 'tokui-chat-input__actions' });

    // 容器模式：渲染子节点作为操作按钮
    if (node.children && node.children.length > 0) {
      rc(node.children).forEach(function (child) {
        if (child && child.nodeType) actionsWrap.appendChild(child);
      });
    }

    // 默认发送按钮（始终渲染）
    var sendBtn = el('button', {
      class: 'tokui-chat-input__send',
      type: 'button',
      'aria-label': '发送'
    });
    sendBtn.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M10 3a1 1 0 0 1 .7.3l5 5a1 1 0 0 1-1.4 1.4L11 6.4V16a1 1 0 1 1-2 0V6.4l-3.3 3.3a1 1 0 0 1-1.4-1.4l5-5A1 1 0 0 1 10 3z"/></svg>';
    if (disabled) {
      sendBtn.setAttribute('disabled', '');
      sendBtn.classList.add('tokui-chat-input__send--disabled');
    }
    actionsWrap.appendChild(sendBtn);
    wrapper.appendChild(actionsWrap);

    // 字符计数器
    if (maxChars > 0) {
      var counter = el('span', { class: 'tokui-chat-input__counter' });
      counter.textContent = '0/' + maxChars;
      wrapper.appendChild(counter);
      textarea.addEventListener('input', function () {
        var len = (textarea.value || '').length;
        counter.textContent = len + '/' + maxChars;
        if (len > maxChars) {
          counter.classList.add('tokui-chat-input__counter--over');
        } else {
          counter.classList.remove('tokui-chat-input__counter--over');
        }
      });
    }

    // 自动高度
    if (autoResize) {
      textarea.addEventListener('input', function () {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }

    // 发送逻辑
    function doSend() {
      if (disabled) return;
      var val = textarea.value || '';
      if (!val.trim()) return;
      if (handlerName) {
        wrapper.setAttribute('data-tokui-clk', handlerName);
        wrapper.setAttribute('data-tokui-clk-value', val);
      }
      textarea.value = '';
      if (maxChars > 0) {
        counter.textContent = '0/' + maxChars;
        counter.classList.remove('tokui-chat-input__counter--over');
      }
      if (autoResize) {
        textarea.style.height = 'auto';
      }
    }

    // Enter 发送，Shift+Enter 换行
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });
    sendBtn.addEventListener('click', function () {
      doSend();
    });

    if (handlerName) wrapper.setAttribute('data-tokui-clk', handlerName);

    // 动态更新方法
    wrapper._update = function (uAttrs) {
      if (uAttrs.dis !== undefined) {
        disabled = !!uAttrs.dis;
        if (disabled) {
          textarea.setAttribute('disabled', '');
          textarea.classList.add('tokui-chat-input__textarea--disabled');
          sendBtn.setAttribute('disabled', '');
          sendBtn.classList.add('tokui-chat-input__send--disabled');
        } else {
          textarea.removeAttribute('disabled');
          textarea.classList.remove('tokui-chat-input__textarea--disabled');
          sendBtn.removeAttribute('disabled');
          sendBtn.classList.remove('tokui-chat-input__send--disabled');
        }
      }
    };

    wrapper._slot = textarea;
    wrapper._tokuiType = 'chat-input';
    return wrapper;
  });

  // === Message-actions 消息操作栏（容器） ===
  // attrs.clk = 统一回调名, attrs.copy / attrs.regenerate / attrs.like = 布尔，生成默认按钮
  // 默认按钮通过 data-act 属性区分：copy / regenerate / like / dislike
  // 容器模式支持自定义子节点
  renderer.register('msg-actions', (node, rc) => {
    var attrs = node.attrs || {};
    var handlerName = attrs.clk || '';

    var cls = 'tokui-msg-actions';
    if (attrs.visible) cls += ' tokui-msg-actions--visible';
    var wrapper = el('div', { class: cls });

    // SVG 图标定义（统一 24x24 viewBox，Lucide 标准路径，保证绘制正确）
    var ICONS = {
      copy: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
      regenerate: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
      like: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
      dislike: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
      delete: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
    };

    // 生成默认按钮
    var defaultActions = [];
    if (attrs.copy !== undefined) {
      defaultActions.push({ act: 'copy', icon: ICONS.copy, label: '复制' });
    }
    if (attrs.regenerate !== undefined) {
      defaultActions.push({ act: 'regenerate', icon: ICONS.regenerate, label: '重新生成' });
    }
    if (attrs.like !== undefined) {
      defaultActions.push({ act: 'like', icon: ICONS.like, label: '赞' });
      defaultActions.push({ act: 'dislike', icon: ICONS.dislike, label: '踩' });
    }
    if (attrs.delete !== undefined) {
      defaultActions.push({ act: 'delete', icon: ICONS.delete, label: '删除' });
    }

    // 渲染默认按钮
    defaultActions.forEach(function (action) {
      var btn = el('button', {
        class: 'tokui-msg-actions__btn',
        type: 'button',
        'data-act': action.act,
        'aria-label': action.label,
        title: action.label
      });
      var iconWrap = el('span', { class: 'tokui-msg-actions__icon' });
      iconWrap.innerHTML = action.icon;
      btn.appendChild(iconWrap);
      wrapper.appendChild(btn);
    });

    // 容器模式：渲染自定义子节点
    if (node.children && node.children.length > 0) {
      rc(node.children).forEach(function (child) {
        if (child && child.nodeType) wrapper.appendChild(child);
      });
    }

    // 统一事件委托
    if (handlerName) {
      wrapper.setAttribute('data-tokui-clk', handlerName);
      wrapper.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.tokui-msg-actions__btn');
        if (btn) {
          var act = btn.getAttribute('data-act');
          if (act) {
            wrapper.setAttribute('data-tokui-clk-act', act);
          }
        }
      });
    }

    wrapper._slot = wrapper;
    wrapper._tokuiType = 'msg-actions';
    return wrapper;
  });

  // ========== AI 对话高级组件 ==========

  // --- Phase 1: P0 核心 AI 聊天组件 ---

  renderer.register('tool-call', (node, rc) => {
    var attrs = node.attrs || {};
    var name = attrs.name || 'tool';
    var status = attrs.status || 'pending';
    var duration = attrs.duration || '';
    var wrapperAttrs = { class: 'tokui-tool-call tokui-tool-call--' + status };
    if (attrs.id) wrapperAttrs.id = attrs.id;
    var wrapper = el('div', wrapperAttrs);
    var header = el('div', { class: 'tokui-tool-call__header' });
    var statusDot = el('span', { class: 'tokui-tool-call__status-dot tokui-tool-call__status-dot--' + status });
    header.appendChild(statusDot);
    var nameEl = el('span', { class: 'tokui-tool-call__name' });
    nameEl.textContent = name;
    header.appendChild(nameEl);
    var statusBadge = el('span', { class: 'tokui-tool-call__status' });
    var STATUS_TEXT = { pending: '等待中', running: '运行中', done: '完成', error: '出错', denied: '已拒绝' };
    statusBadge.textContent = STATUS_TEXT[status] || status;
    header.appendChild(statusBadge);
    if (duration) {
      var durEl = el('span', { class: 'tokui-tool-call__duration' });
      durEl.textContent = duration;
      header.appendChild(durEl);
    }
    wrapper.appendChild(header);
    var body = el('div', { class: 'tokui-tool-call__body' });
    if (node.content) {
      var paramsEl = el('div', { class: 'tokui-tool-call__params' });
      paramsEl.textContent = node.content;
      body.appendChild(paramsEl);
    }
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) body.appendChild(child);
    });
    wrapper.appendChild(body);
    wrapper._slot = body;
    wrapper._tokuiType = 'tool-call';
    wrapper._update = function (uAttrs) {
      if (uAttrs.status) {
        wrapper.className = 'tokui-tool-call tokui-tool-call--' + uAttrs.status;
        statusDot.className = 'tokui-tool-call__status-dot tokui-tool-call__status-dot--' + uAttrs.status;
        statusBadge.textContent = STATUS_TEXT[uAttrs.status] || uAttrs.status;
      }
      if (uAttrs.duration) {
        var dur = wrapper.querySelector('.tokui-tool-call__duration');
        if (!dur) {
          dur = el('span', { class: 'tokui-tool-call__duration' });
          header.appendChild(dur);
        }
        dur.textContent = uAttrs.duration;
      }
      if (uAttrs.result) {
        var resEl = el('div', { class: 'tokui-tool-call__result' });
        resEl.textContent = uAttrs.result;
        body.appendChild(resEl);
      }
      if (uAttrs.error) {
        var errEl = el('div', { class: 'tokui-tool-call__error' });
        errEl.textContent = uAttrs.error;
        body.appendChild(errEl);
      }
    };
    return wrapper;
  });

  renderer.register('typing', (node) => {
    var attrs = node.attrs || {};
    var wrapper = el('div', { class: 'tokui-typing' });
    var dots = el('span', { class: 'tokui-typing__dots' });
    for (var i = 0; i < 3; i++) {
      var dot = el('span', { class: 'tokui-typing__dot' });
      dot.style.animationDelay = (i * 0.15) + 's';
      dots.appendChild(dot);
    }
    wrapper.appendChild(dots);
    if (attrs.text) {
      var textEl = el('span', { class: 'tokui-typing__text' });
      textEl.textContent = attrs.text;
      wrapper.appendChild(textEl);
    }
    return wrapper;
  });

  renderer.register('quick-reply', (node, rc) => {
    var attrs = node.attrs || {};
    var wrapper = el('div', { class: 'tokui-quick-reply' });
    var itemsWrap = el('div', { class: 'tokui-quick-reply__items' });
    if (attrs.items) {
      attrs.items.split(',').forEach(function (label) {
        var btn = el('button', { class: 'tokui-quick-reply__item', type: 'button' });
        btn.textContent = label.trim();
        itemsWrap.appendChild(btn);
      });
    }
    if (node.children && node.children.length) {
      rc(node.children).forEach(function (child) {
        if (child && child.nodeType) itemsWrap.appendChild(child);
      });
    }
    wrapper.appendChild(itemsWrap);
    wrapper._slot = itemsWrap;
    wrapper._tokuiType = 'quick-reply';
    return wrapper;
  });

  // === Suggestions 提示建议卡片（容器）===
  // attrs.cols = 列数 (1-4, 默认2), attrs.clk = 全局点击回调
  // 子节点为 suggestion 卡片
  renderer.register('suggestions', (node, rc) => {
    var attrs = node.attrs || {};
    var cols = Math.min(4, Math.max(1, parseInt(attrs.cols) || 2));
    var wrapper = el('div', { class: 'tokui-suggestions' });
    if (attrs.clk) wrapper.setAttribute('data-tokui-clk', attrs.clk);
    if (attrs.id) wrapper.id = attrs.id;
    var grid = el('div', {
      class: 'tokui-suggestions__grid tokui-suggestions__grid--' + cols
    });
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    if (node.children && node.children.length) {
      rc(node.children).forEach(function(child) {
        if (child && child.nodeType) grid.appendChild(child);
      });
    }
    wrapper.appendChild(grid);
    wrapper._slot = grid;
    wrapper._tokuiType = 'suggestions';
    return wrapper;
  });

  // === Suggestion 单个建议卡片（自闭合）===
  // attrs.tt = 标题, attrs.tx = 描述, attrs.clk = 点击回调
  // attrs.icon = 可选图标文字
  renderer.register('suggestion', (node) => {
    var attrs = node.attrs || {};
    var title = attrs.tt || '';
    var desc = attrs.tx || '';
    var iconText = attrs.icon || '';
    var card = el('div', { class: 'tokui-suggestion', role: 'button', tabindex: '0' });
    if (attrs.clk) card.setAttribute('data-tokui-clk', attrs.clk);
    if (attrs.dis !== undefined) {
      card.classList.add('tokui-suggestion--disabled');
      card.setAttribute('aria-disabled', 'true');
    }
    if (iconText) {
      var iconEl = el('span', { class: 'tokui-suggestion__icon' });
      iconEl.textContent = iconText;
      card.appendChild(iconEl);
    }
    var body = el('div', { class: 'tokui-suggestion__body' });
    if (title) {
      var titleEl = el('div', { class: 'tokui-suggestion__title' });
      titleEl.textContent = title;
      body.appendChild(titleEl);
    }
    if (desc) {
      var descEl = el('div', { class: 'tokui-suggestion__desc' });
      descEl.textContent = desc;
      body.appendChild(descEl);
    }
    card.appendChild(body);
    // Keyboard accessibility
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
    return card;
  });

  renderer.register('source', (node) => {
    var attrs = node.attrs || {};
    var num = attrs.n || '1';
    var title = attrs.tt || '';
    var snippet = attrs.sn || '';
    var url = attrs.u || attrs.url || '';
    var wrapper = el('div', { class: 'tokui-source' });
    var numEl = el('span', { class: 'tokui-source__num' });
    numEl.textContent = num;
    wrapper.appendChild(numEl);
    var body = el('div', { class: 'tokui-source__body' });
    if (title) {
      var titleEl;
      if (url) {
        titleEl = el('a', { class: 'tokui-source__title', href: url, target: '_blank' });
      } else {
        titleEl = el('span', { class: 'tokui-source__title' });
      }
      titleEl.textContent = title;
      body.appendChild(titleEl);
    }
    if (snippet) {
      var snEl = el('div', { class: 'tokui-source__snippet' });
      snEl.textContent = snippet;
      body.appendChild(snEl);
    }
    wrapper.appendChild(body);
    return wrapper;
  });

  function renderDiffLines(contentEl, raw) {
    contentEl.innerHTML = '';
    var lines = raw.split('\n');
    var oldLine = 0;
    var newLine = 0;
    lines.forEach(function (line) {
      var lineEl = el('div', { class: 'tokui-diff__line' });
      var numEl = el('span', { class: 'tokui-diff__num' });
      var codeEl = el('span', { class: 'tokui-diff__code' });
      if (line.startsWith('+')) {
        lineEl.classList.add('tokui-diff__line--add');
        newLine++;
        numEl.textContent = newLine;
        codeEl.textContent = line;
      } else if (line.startsWith('-')) {
        lineEl.classList.add('tokui-diff__line--remove');
        oldLine++;
        numEl.textContent = oldLine;
        codeEl.textContent = line;
      } else {
        lineEl.classList.add('tokui-diff__line--context');
        oldLine++;
        newLine++;
        numEl.textContent = oldLine;
        codeEl.textContent = line || ' ';
      }
      lineEl.appendChild(numEl);
      lineEl.appendChild(codeEl);
      contentEl.appendChild(lineEl);
    });
  }

  renderer.register('diff', (node, rc) => {
    var attrs = node.attrs || {};
    var wrapper = el('div', { class: 'tokui-diff' });
    if (attrs.title || attrs.lang) {
      var header = el('div', { class: 'tokui-diff__header' });
      if (attrs.title) {
        var titleEl = el('span', { class: 'tokui-diff__title' });
        titleEl.textContent = attrs.title;
        header.appendChild(titleEl);
      }
      if (attrs.lang) {
        var langBadge = el('span', { class: 'tokui-diff__lang' });
        langBadge.textContent = attrs.lang;
        header.appendChild(langBadge);
      }
      wrapper.appendChild(header);
    }
    var content = el('div', { class: 'tokui-diff__content' });
    // 原始累积文本（含换行）从闭包变量取，【不】从 DOM childNodes 反读——
    // renderDiffLines 会把内容拆成行 div，DOM round-trip 会丢换行 → 多块流式后塌成一行。
    // parser 的 _unescapeRaw 已把字面 \n 转成真换行，故 rawAcc 保留真换行。
    var rawAcc = '';
    if (node.children && node.children.length > 0) {
      rawAcc = node.children.map(function (c) { return c.content || ''; }).join('');
    } else {
      rawAcc = node.content || '';
    }
    function applyDiff() { renderDiffLines(content, rawAcc); }
    applyDiff();
    wrapper.appendChild(content);
    wrapper._slot = content;
    wrapper._tokuiType = 'diff';
    // 真流式：每块 _text 到达即累积到 rawAcc 并整体重渲染（行号/红绿着色逐块增长），
    // 不再等到 [/diff] 才出 diff 行。与 code 块 _streamAppendHook 同套路。
    wrapper._streamAppendHook = function (childNode) {
      if (childNode && childNode.type === '_text' && childNode.content) {
        rawAcc += childNode.content;
        applyDiff();
      }
    };
    wrapper._streamCloseHook = applyDiff;
    return wrapper;
  });

  // --- Phase 2: P1 Agent/代码助手组件 ---

  renderer.register('plan', (node, rc) => {
    var attrs = node.attrs || {};
    var wrapper = el('div', { class: 'tokui-plan' });
    if (attrs.tt) {
      var titleEl = el('div', { class: 'tokui-plan__title' });
      titleEl.textContent = attrs.tt;
      wrapper.appendChild(titleEl);
    }
    var stepsEl = el('div', { class: 'tokui-plan__steps' });
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) stepsEl.appendChild(child);
    });
    wrapper.appendChild(stepsEl);
    wrapper._slot = stepsEl;
    wrapper._tokuiType = 'plan';
    return wrapper;
  });

  renderer.register('plan-step', (node, rc) => {
    var attrs = node.attrs || {};
    // 状态归一化：兼容 AI 常见的同义写法（running/in-progress/complete/...）
    var VALID_STATUS = { pending: 1, doing: 1, done: 1, error: 1, skipped: 1 };
    var STATUS_ALIASES = {
      running: 'doing', active: 'doing', progress: 'doing', processing: 'doing',
      'in-progress': 'doing', 'in_progress': 'doing', current: 'doing',
      complete: 'done', completed: 'done', finish: 'done', finished: 'done', ok: 'done', success: 'done',
      wait: 'pending', waiting: 'pending', todo: 'pending', queued: 'pending',
      fail: 'error', failed: 'error', failure: 'error'
    };
    var rawStatus = String(attrs.status || 'pending').toLowerCase();
    var status = STATUS_ALIASES[rawStatus] || (VALID_STATUS[rawStatus] ? rawStatus : 'pending');
    var wrapper = el('div', { class: 'tokui-plan-step tokui-plan-step--' + status });
    var dot = el('span', { class: 'tokui-plan-step__dot' });
    wrapper.appendChild(dot);
    var contentEl = el('div', { class: 'tokui-plan-step__content' });
    if (attrs.tt) {
      var titleEl = el('div', { class: 'tokui-plan-step__title' });
      titleEl.textContent = attrs.tt;
      contentEl.appendChild(titleEl);
    }
    if (attrs.desc) {
      var descEl = el('div', { class: 'tokui-plan-step__desc' });
      descEl.textContent = attrs.desc;
      contentEl.appendChild(descEl);
    }
    if (node.content) {
      var textEl = el('div', { class: 'tokui-plan-step__text' });
      textEl.textContent = node.content;
      contentEl.appendChild(textEl);
    }
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) contentEl.appendChild(child);
    });
    wrapper.appendChild(contentEl);
    var line = el('div', { class: 'tokui-plan-step__line' });
    wrapper.appendChild(line);
    return wrapper;
  });

  renderer.register('agent', (node, rc) => {
    var attrs = node.attrs || {};
    var name = attrs.name || 'Agent';
    var status = attrs.status || 'idle';
    var action = attrs.action || '';
    var duration = attrs.duration || '';
    var wrapperAttrs = { class: 'tokui-agent tokui-agent--' + status };
    if (attrs.id) wrapperAttrs.id = attrs.id;
    var wrapper = el('div', wrapperAttrs);
    var header = el('div', { class: 'tokui-agent__header' });
    var statusDot = el('span', { class: 'tokui-agent__status-dot tokui-agent__status-dot--' + status });
    header.appendChild(statusDot);
    var nameEl = el('span', { class: 'tokui-agent__name' });
    nameEl.textContent = name;
    header.appendChild(nameEl);
    var statusBadge = el('span', { class: 'tokui-agent__status' });
    var STATUS_TEXT = { idle: '空闲', running: '运行中', paused: '已暂停', done: '完成', error: '出错' };
    statusBadge.textContent = STATUS_TEXT[status] || status;
    header.appendChild(statusBadge);
    if (duration) {
      var durEl = el('span', { class: 'tokui-agent__duration' });
      durEl.textContent = duration;
      header.appendChild(durEl);
    }
    wrapper.appendChild(header);
    if (action) {
      var actionEl = el('div', { class: 'tokui-agent__action' });
      actionEl.textContent = action;
      wrapper.appendChild(actionEl);
    }
    if (node.children && node.children.length) {
      var body = el('div', { class: 'tokui-agent__body' });
      rc(node.children).forEach(function (child) {
        if (child && child.nodeType) body.appendChild(child);
      });
      wrapper.appendChild(body);
      wrapper._slot = body;
    }
    wrapper._tokuiType = 'agent';
    wrapper._update = function (uAttrs) {
      if (uAttrs.status) {
        wrapper.className = 'tokui-agent tokui-agent--' + uAttrs.status;
        statusDot.className = 'tokui-agent__status-dot tokui-agent__status-dot--' + uAttrs.status;
        statusBadge.textContent = STATUS_TEXT[uAttrs.status] || uAttrs.status;
      }
      if (uAttrs.action && actionEl) actionEl.textContent = uAttrs.action;
      if (uAttrs.duration && durEl) durEl.textContent = uAttrs.duration;
    };
    return wrapper;
  });

  renderer.register('file-tree', (node, rc) => {
    var wrapper = el('div', { class: 'tokui-file-tree' });
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) wrapper.appendChild(child);
    });
    wrapper._slot = wrapper;
    wrapper._tokuiType = 'file-tree';
    return wrapper;
  });

  renderer.register('ft-folder', (node, rc) => {
    var attrs = node.attrs || {};
    var name = attrs.name || 'folder';
    var isOpen = attrs.open !== undefined;
    var wrapper = el('div', { class: 'tokui-file-tree__folder' + (isOpen ? ' tokui-file-tree__folder--open' : '') });
    var nameRow = el('div', { class: 'tokui-file-tree__folder-name' });
    var toggle = el('span', { class: 'tokui-file-tree__folder-toggle' });
    toggle.textContent = isOpen ? '▾' : '▸';
    nameRow.appendChild(toggle);
    var icon = el('span', { class: 'tokui-file-tree__folder-icon' });
    icon.textContent = '📁';
    nameRow.appendChild(icon);
    var nameEl = el('span', { class: 'tokui-file-tree__name' });
    nameEl.textContent = name;
    nameRow.appendChild(nameEl);
    wrapper.appendChild(nameRow);
    var children = el('div', { class: 'tokui-file-tree__folder-children' });
    if (!isOpen) children.style.display = 'none';
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) children.appendChild(child);
    });
    wrapper.appendChild(children);
    nameRow.addEventListener('click', function () {
      var open = wrapper.classList.toggle('tokui-file-tree__folder--open');
      toggle.textContent = open ? '▾' : '▸';
      children.style.display = open ? '' : 'none';
    });
    wrapper._slot = children;
    wrapper._tokuiType = 'ft-folder';
    return wrapper;
  });

  renderer.register('ft-file', (node) => {
    var attrs = node.attrs || {};
    var name = attrs.name || 'file';
    var badge = attrs.badge || '';
    var wrapper = el('div', { class: 'tokui-file-tree__file' });
    var icon = el('span', { class: 'tokui-file-tree__file-icon' });
    icon.textContent = '📄';
    wrapper.appendChild(icon);
    var nameEl = el('span', { class: 'tokui-file-tree__name' });
    nameEl.textContent = name;
    wrapper.appendChild(nameEl);
    if (badge) {
      var badgeEl = el('span', { class: 'tokui-file-tree__file-badge' });
      badgeEl.textContent = badge;
      wrapper.appendChild(badgeEl);
    }
    return wrapper;
  });

  renderer.register('terminal', (node, rc) => {
    var attrs = node.attrs || {};
    var title = attrs.title || 'Terminal';
    var status = attrs.status || '';
    var wrapper = el('div', { class: 'tokui-terminal' + (status && status !== '0' ? ' tokui-terminal--error' : '') });
    var titlebar = el('div', { class: 'tokui-terminal__titlebar' });
    var dots = el('span', { class: 'tokui-terminal__dots' });
    ['🔴', '🟡', '🟢'].forEach(function (c) {
      var d = el('span', { class: 'tokui-terminal__dot' });
      d.textContent = c;
      dots.appendChild(d);
    });
    titlebar.appendChild(dots);
    var titleEl = el('span', { class: 'tokui-terminal__title' });
    titleEl.textContent = title;
    titlebar.appendChild(titleEl);
    wrapper.appendChild(titlebar);
    var content = el('div', { class: 'tokui-terminal__content' });
    if (node.content) content.textContent = node.content;
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) content.appendChild(child);
    });
    wrapper.appendChild(content);
    wrapper._slot = content;
    wrapper._tokuiType = 'terminal';
    return wrapper;
  });

  renderer.register('shimmer', (node) => {
    var attrs = node.attrs || {};
    var type = attrs.t || 'text';
    var rows = parseInt(attrs.rows) || 3;
    var wrapper = el('div', { class: 'tokui-shimmer tokui-shimmer--' + type });
    if (type === 'card') {
      var circle = el('div', { class: 'tokui-shimmer__circle' });
      wrapper.appendChild(circle);
      var lines = el('div', { class: 'tokui-shimmer__lines' });
      for (var i = 0; i < rows; i++) lines.appendChild(el('div', { class: 'tokui-shimmer__row' }));
      wrapper.appendChild(lines);
    } else if (type === 'avatar') {
      wrapper.appendChild(el('div', { class: 'tokui-shimmer__circle' }));
    } else {
      for (var j = 0; j < rows; j++) wrapper.appendChild(el('div', { class: 'tokui-shimmer__row' }));
    }
    return wrapper;
  });

  renderer.register('latency', (node) => {
    var attrs = node.attrs || {};
    var value = attrs.v || '';
    var type = attrs.t || '';
    var wrapper = el('span', { class: 'tokui-latency' + (type ? ' tokui-latency--' + type : '') });
    var ICONS = { thinking: '💡', generating: '⚡', total: '⏱' };
    if (type && ICONS[type]) {
      var icon = el('span', { class: 'tokui-latency__icon' });
      icon.textContent = ICONS[type];
      wrapper.appendChild(icon);
    }
    var valEl = el('span', { class: 'tokui-latency__value' });
    valEl.textContent = value;
    wrapper.appendChild(valEl);
    if (type) {
      var labelEl = el('span', { class: 'tokui-latency__label' });
      var LABELS = { thinking: '思考', generating: '生成', total: '总计' };
      labelEl.textContent = LABELS[type] || type;
      wrapper.appendChild(labelEl);
    }
    return wrapper;
  });

  // --- Phase 3: P2 高级组件 ---

  renderer.register('video', (node) => {
    var attrs = node.attrs || {};
    var src = attrs.s || '';
    var poster = attrs.poster || '';
    var wrapper = el('div', { class: 'tokui-video' });
    var video = el('video', { class: 'tokui-video__player', preload: 'metadata' });
    if (src) video.setAttribute('src', src);
    if (poster) video.setAttribute('poster', poster);
    video.setAttribute('controls', '');
    wrapper.appendChild(video);
    return wrapper;
  });

  renderer.register('audio', (node) => {
    var attrs = node.attrs || {};
    var src = attrs.s || '';
    var title = attrs.tt || '';
    var duration = attrs.duration || '';
    var wrapper = el('div', { class: 'tokui-audio' });
    var info = el('div', { class: 'tokui-audio__info' });
    var icon = el('span', { class: 'tokui-audio__icon' });
    icon.textContent = '🔊';
    info.appendChild(icon);
    if (title) {
      var titleEl = el('span', { class: 'tokui-audio__title' });
      titleEl.textContent = title;
      info.appendChild(titleEl);
    }
    if (duration) {
      var durEl = el('span', { class: 'tokui-audio__duration' });
      durEl.textContent = duration;
      info.appendChild(durEl);
    }
    wrapper.appendChild(info);
    var audio = el('audio', { class: 'tokui-audio__player', preload: 'metadata' });
    if (src) audio.setAttribute('src', src);
    audio.setAttribute('controls', '');
    wrapper.appendChild(audio);
    return wrapper;
  });

  renderer.register('quote', (node, rc) => {
    var attrs = node.attrs || {};
    var wrapper = el('div', { class: 'tokui-quote' });
    var bar = el('div', { class: 'tokui-quote__bar' });
    wrapper.appendChild(bar);
    var content = el('div', { class: 'tokui-quote__content' });
    if (attrs.role) {
      var roleBadge = el('span', { class: 'tokui-quote__role' });
      roleBadge.textContent = attrs.role === 'user' ? 'User' : 'AI';
      content.appendChild(roleBadge);
    }
    if (attrs.tx) {
      var textEl = el('div', { class: 'tokui-quote__text' });
      textEl.textContent = attrs.tx;
      content.appendChild(textEl);
    }
    if (attrs.msgid) wrapper.setAttribute('data-msgid', attrs.msgid);
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) content.appendChild(child);
    });
    wrapper.appendChild(content);
    wrapper._slot = content;
    wrapper._tokuiType = 'quote';
    return wrapper;
  });

  renderer.register('sandbox', (node, rc) => {
    var attrs = node.attrs || {};
    var lang = attrs.lang || '';
    var title = attrs.title || 'Preview';
    var height = attrs.height || '200';
    var wrapper = el('div', { class: 'tokui-sandbox' });
    var header = el('div', { class: 'tokui-sandbox__header' });
    var titleEl = el('span', { class: 'tokui-sandbox__title' });
    titleEl.textContent = title;
    header.appendChild(titleEl);
    if (lang) {
      var langBadge = el('span', { class: 'tokui-sandbox__lang' });
      langBadge.textContent = lang;
      header.appendChild(langBadge);
    }
    wrapper.appendChild(header);
    var preview = el('div', { class: 'tokui-sandbox__preview' });
    preview.style.height = height + 'px';
    var htmlContent = node.content || '';
    if (!htmlContent && node.children) {
      htmlContent = node.children
        .filter(function (c) { return c.type === '_text' && c.content; })
        .map(function (c) { return c.content; })
        .join('');
    }
    if (lang === 'html') {
      var iframe = el('iframe', {
        class: 'tokui-sandbox__iframe',
        sandbox: 'allow-scripts',
        frameborder: '0'
      });
      if (htmlContent) iframe.setAttribute('srcdoc', htmlContent);
      preview.appendChild(iframe);
      // 流式渲染时 _slot 收集文本追加到 iframe srcdoc
      var slotProxy = {
        appendChild: function (child) {
          var text = (child.nodeType === 3) ? child.nodeValue : (child.textContent || '');
          if (!text) return child;
          var current = iframe.getAttribute('srcdoc') || '';
          iframe.setAttribute('srcdoc', current + text);
          return child;
        }
      };
      wrapper._slot = slotProxy;
    } else {
      var codeEl = el('pre', { class: 'tokui-sandbox__code' });
      if (htmlContent) codeEl.textContent = htmlContent;
      rc((node.children || []).filter(function (c) { return c.type !== '_text'; })).forEach(function (child) {
        if (child && child.nodeType) codeEl.appendChild(child);
      });
      preview.appendChild(codeEl);
      wrapper._slot = preview;
    }
    wrapper.appendChild(preview);
    wrapper._tokuiType = 'sandbox';
    return wrapper;
  });

  renderer.register('commit', (node) => {
    var attrs = node.attrs || {};
    var wrapper = el('div', { class: 'tokui-commit' });
    var hash = attrs.hash || '';
    var msg = attrs.msg || '';
    var author = attrs.author || '';
    var branch = attrs.branch || '';
    var time = attrs.time || '';
    var additions = attrs.additions || '';
    var deletions = attrs.deletions || '';
    var row1 = el('div', { class: 'tokui-commit__row' });
    if (hash) {
      var hashEl = el('span', { class: 'tokui-commit__hash' });
      hashEl.textContent = hash.slice(0, 7);
      row1.appendChild(hashEl);
    }
    if (msg) {
      var msgEl = el('span', { class: 'tokui-commit__msg' });
      msgEl.textContent = msg;
      row1.appendChild(msgEl);
    }
    wrapper.appendChild(row1);
    var meta = el('div', { class: 'tokui-commit__meta' });
    if (author) {
      var authorEl = el('span', { class: 'tokui-commit__author' });
      authorEl.textContent = author;
      meta.appendChild(authorEl);
    }
    if (branch) {
      var branchEl = el('span', { class: 'tokui-commit__branch' });
      branchEl.textContent = branch;
      meta.appendChild(branchEl);
    }
    if (time) {
      var timeEl = el('span', { class: 'tokui-commit__time' });
      timeEl.textContent = time;
      meta.appendChild(timeEl);
    }
    wrapper.appendChild(meta);
    if (additions || deletions) {
      var stats = el('div', { class: 'tokui-commit__stats' });
      if (additions) {
        var addEl = el('span', { class: 'tokui-commit__additions' });
        addEl.textContent = '+' + additions;
        stats.appendChild(addEl);
      }
      if (deletions) {
        var delEl = el('span', { class: 'tokui-commit__deletions' });
        delEl.textContent = '-' + deletions;
        stats.appendChild(delEl);
      }
      wrapper.appendChild(stats);
    }
    return wrapper;
  });

  renderer.register('test-result', (node, rc) => {
    var attrs = node.attrs || {};
    var wrapper = el('div', { class: 'tokui-test-result' });
    var summary = el('div', { class: 'tokui-test-result__summary' });
    var counts = [
      { key: 'pass', cls: '--pass', icon: '✓' },
      { key: 'fail', cls: '--fail', icon: '✗' },
      { key: 'skip', cls: '--skip', icon: '○' }
    ];
    counts.forEach(function (c) {
      if (attrs[c.key]) {
        var el2 = el('span', { class: 'tokui-test-result__count tokui-test-result__count' + c.cls });
        el2.textContent = c.icon + ' ' + attrs[c.key];
        summary.appendChild(el2);
      }
    });
    if (attrs.total) {
      var totalEl = el('span', { class: 'tokui-test-result__count tokui-test-result__count--total' });
      totalEl.textContent = 'Total: ' + attrs.total;
      summary.appendChild(totalEl);
    }
    if (attrs.duration) {
      var durEl = el('span', { class: 'tokui-test-result__duration' });
      durEl.textContent = attrs.duration;
      summary.appendChild(durEl);
    }
    wrapper.appendChild(summary);
    var cases = el('div', { class: 'tokui-test-result__cases' });
    rc(node.children || []).forEach(function (child) {
      if (child && child.nodeType) cases.appendChild(child);
    });
    wrapper.appendChild(cases);
    wrapper._slot = cases;
    wrapper._tokuiType = 'test-result';
    return wrapper;
  });

  // 构建测试用例 DOM（test-result 的子节点，标签可以是 test-case 或 case，两者等价）。
  // 盖 data-tokui-tag=node.type 印章，让 Playground 按 [test-case]/[case] 各自代码行定位。
  function buildTestCase(node) {
    var attrs = node.attrs || {};
    var status = attrs.status || 'pass';
    var wrapper = el('div', { class: 'tokui-test-case tokui-test-case--' + status, 'data-tokui-tag': node.type });
    var statusIcon = el('span', { class: 'tokui-test-case__status' });
    var ICONS = { pass: '✓', fail: '✗', skip: '○' };
    statusIcon.textContent = ICONS[status] || status;
    wrapper.appendChild(statusIcon);
    var nameEl = el('span', { class: 'tokui-test-case__name' });
    nameEl.textContent = attrs.name || 'test';
    wrapper.appendChild(nameEl);
    if (attrs.duration) {
      var durEl = el('span', { class: 'tokui-test-case__duration' });
      durEl.textContent = attrs.duration;
      wrapper.appendChild(durEl);
    }
    if (status === 'fail' && attrs.error) {
      var errEl = el('div', { class: 'tokui-test-case__error' });
      errEl.textContent = attrs.error;
      wrapper.appendChild(errEl);
    }
    return wrapper;
  }

  renderer.register('test-case', (node) => {
    return buildTestCase(node);
  });

  // test-case 简写别名（test-result 子节点内等价）
  renderer.register('case', (node) => {
    return buildTestCase(node);
  });

  // === Conversations 会话列表（容器） ===
  // attrs.clk = 点击回调名, attrs.act = 当前激活的会话标识
  // 子节点为 conv 自闭合项
  // 自动按 time 属性分组: 今天/昨天/更早
  renderer.register('conversations', (node, rc) => {
    var attrs = node.attrs || {};
    var handlerName = attrs.clk || '';
    var activeAct = attrs.act || '';

    var wrapper = el('div', {
      class: 'tokui-conversations',
      role: 'list'
    });

    // 收集 conv 子节点
    var convNodes = (node.children || []).filter(function (c) { return c.type === 'conv'; });

    var emptyEl = null;
    if (convNodes.length === 0) {
      emptyEl = el('div', { class: 'tokui-conversations__empty' });
      emptyEl.textContent = '暂无会话';
      wrapper.appendChild(emptyEl);
      wrapper._slot = wrapper;
      wrapper._tokuiType = 'conversations';
      wrapper._convHandlerName = handlerName;
      wrapper._convActiveAct = activeAct;
      wrapper._streamCloseHook = function () {
        var hasConv = wrapper.querySelector('.tokui-conv');
        if (hasConv && emptyEl && emptyEl.parentNode) {
          emptyEl.parentNode.removeChild(emptyEl);
        }
      };
      return wrapper;
    }

    // 按时间分组
    var groups = categorizeConvGroups(convNodes);

    groups.forEach(function (group) {
      // 当有多个分组时才显示分组标题
      if (groups.length > 1) {
        var header = el('div', { class: 'tokui-conversations__group-header' });
        header.textContent = group.label;
        wrapper.appendChild(header);
      }

      group.items.forEach(function (convNode) {
        var convEl = renderConvItem(convNode, handlerName, activeAct, wrapper);
        wrapper.appendChild(convEl);
      });
    });

    wrapper._slot = wrapper;
    wrapper._tokuiType = 'conversations';
    return wrapper;
  });

  // === Conv 会话列表子项（自闭合）===
  // attrs.tt = 标题, attrs.time = 时间, attrs.active = 是否激活
  // 注意: conv 通常作为 conversations 的子节点，由 conversations 渲染器统一渲染
  // 但也注册独立的 conv 渲染器，用于单独渲染
  renderer.register('conv', (node) => {
    return renderConvItem(node, '', '', null);
  });

  /**
   * 判断时间字符串是否为今天（HH:MM 格式）
   */
  function isTodayTime(timeStr) {
    return /^\d{1,2}:\d{2}$/.test(timeStr);
  }

  /**
   * 将 conv 子节点按时间属性分组
   * 返回 [{ label: '今天'|'昨天'|'更早', items: [...] }]
   */
  function categorizeConvGroups(convNodes) {
    var today = [];
    var yesterday = [];
    var earlier = [];

    convNodes.forEach(function (node) {
      var time = (node.attrs && node.attrs.time) || '';
      if (isTodayTime(time)) {
        today.push(node);
      } else if (time === '昨天') {
        yesterday.push(node);
      } else {
        earlier.push(node);
      }
    });

    var groups = [];
    if (today.length) groups.push({ label: '今天', items: today });
    if (yesterday.length) groups.push({ label: '昨天', items: yesterday });
    if (earlier.length) groups.push({ label: '更早', items: earlier });

    return groups.length ? groups : [{ label: '今天', items: convNodes }];
  }

  /**
   * 渲染单个会话项
   */
  function renderConvItem(node, handlerName, activeAct, container) {
    var attrs = node.attrs || {};
    var title = attrs.tt || '';
    var time = attrs.time || '';
    var isActive = attrs.active === true || attrs.active === 'true';
    // 也通过父容器的 act 属性匹配
    if (!isActive && activeAct && attrs.act && attrs.act === activeAct) {
      isActive = true;
    }

    var classes = ['tokui-conv'];
    if (isActive) classes.push('tokui-conv--active');

    var item = el('div', {
      class: classes.join(' '),
      role: 'listitem',
      tabindex: '0',
      'data-tokui-tag': 'conv'
    });

    // 标题
    var titleEl = el('div', { class: 'tokui-conv__title' });
    titleEl.textContent = title;
    item.appendChild(titleEl);

    // 时间
    if (time) {
      var timeEl = el('span', { class: 'tokui-conv__time' });
      timeEl.textContent = time;
      item.appendChild(timeEl);
    }

    // 操作区（悬浮显示删除按钮）
    var actionsEl = el('div', { class: 'tokui-conv__actions' });
    var deleteBtn = el('button', {
      class: 'tokui-conv__delete',
      type: 'button',
      'aria-label': '删除'
    });
    deleteBtn.textContent = '×';
    actionsEl.appendChild(deleteBtn);
    item.appendChild(actionsEl);

    // 点击事件: 切换激活状态
    item.addEventListener('click', function (e) {
      // 如果点击的是删除按钮，不处理选中
      if (e.target.closest && e.target.closest('.tokui-conv__delete')) return;
      // 切换激活状态
      var allItems = container ? container.querySelectorAll('.tokui-conv') : [item];
      allItems.forEach(function (el) { el.classList.remove('tokui-conv--active'); });
      item.classList.add('tokui-conv--active');
      if (handlerName) {
        var bus = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
          ? window.TokUI._internal.eventBus : null;
        if (bus && typeof bus.emit === 'function') {
          bus.emit(handlerName, { tt: title, time: time, act: attrs.act || '' });
        }
      }
    });

    // 键盘 Enter 支持
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        item.click();
      }
    });

    // 删除按钮事件
    deleteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (item.parentNode) item.parentNode.removeChild(item);
    });

    // clk 数据属性
    if (handlerName) item.setAttribute('data-tokui-clk', handlerName);

    return item;
  }

  // === Welcome 欢迎页组件（容器）===
  // attrs.tt = 主标题, attrs.st = 副标题
  // 子节点为 welcome-feature 组件，渲染到 CSS Grid 区域
  renderer.register('welcome', (node, rc) => {
    var attrs = node.attrs || {};
    var title = attrs.tt || '';
    var subtitle = attrs.st || '';
    // bd 能力徽标条（逗号分隔），hd 起步卡分区标题，ft 页脚引导语
    var badges = attrs.bd ? String(attrs.bd).split(',') : [];
    var sectionTitle = attrs.hd || '';
    var footer = attrs.ft || '';

    var wrapper = el('div', { class: 'tokui-welcome' });

    // === Hero：标题 + 副标题 + 能力徽标条 ===
    if (title || subtitle || badges.length) {
      var hero = el('div', { class: 'tokui-welcome__hero' });
      if (title) {
        var titleEl = el('div', { class: 'tokui-welcome__title' });
        titleEl.textContent = title;
        hero.appendChild(titleEl);
      }
      if (subtitle) {
        var subtitleEl = el('div', { class: 'tokui-welcome__subtitle' });
        subtitleEl.textContent = subtitle;
        hero.appendChild(subtitleEl);
      }
      if (badges.length) {
        var badgeRow = el('div', { class: 'tokui-welcome__badges' });
        badges.forEach(function (b) {
          var t = String(b).trim();
          if (!t) return;
          var badge = el('span', { class: 'tokui-welcome__badge' });
          badge.textContent = t;
          badgeRow.appendChild(badge);
        });
        hero.appendChild(badgeRow);
      }
      wrapper.appendChild(hero);
    }

    // === 起步卡分区标题 ===
    if (sectionTitle) {
      var secEl = el('div', { class: 'tokui-welcome__section' });
      secEl.textContent = sectionTitle;
      wrapper.appendChild(secEl);
    }

    var grid = el('div', { class: 'tokui-welcome__grid' });
    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) grid.appendChild(child);
    });
    wrapper.appendChild(grid);

    // === 页脚引导语 ===
    if (footer) {
      var ftEl = el('div', { class: 'tokui-welcome__footer' });
      ftEl.textContent = footer;
      wrapper.appendChild(ftEl);
    }

    wrapper._slot = grid;
    wrapper._tokuiType = 'welcome';
    return wrapper;
  });

  // 构建 Welcome 功能特性卡片 DOM（welcome 的子节点，标签可以是 welcome-feature 或 feature）。
  // attrs 驱动（忽略子节点）：tt 标题、tx 描述、i 图标、clk 回调。
  // 盖 data-tokui-tag=node.type 印章供 Playground 点击定位。
  // feature 不在 CONTAINERS → 自闭合；welcome-feature 在 CONTAINERS → 容器模式（空 body 闭合即可）。两者等价。
  function buildWelcomeFeature(node) {
    var attrs = node.attrs || {};
    var title = attrs.tt || '';
    var desc = attrs.tx || '';
    var iconType = attrs.i || 'code';
    var handlerName = attrs.clk || '';

    var FEATURE_ICONS = {
      code: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      chart: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
      doc: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      dashboard: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="10" rx="1"/><rect x="13" y="3" width="8" height="6" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><rect x="3" y="17" width="8" height="4" rx="1"/></svg>',
      print: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>',
      chat: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
      table: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="20"/></svg>',
      form: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
    };

    var classes = ['tokui-welcome-feature', 'tokui-welcome-feature--' + iconType];

    var cardAttrs = { class: classes.join(' '), role: 'button', tabindex: '0', 'data-tokui-tag': node.type };
    if (handlerName) cardAttrs['data-tokui-clk'] = handlerName;
    // 透传 data-* 属性（如 data-prompt）到卡片 DOM，供 usePrompt 等处理器读取（与 btn 一致）
    Object.keys(attrs).forEach(function (key) {
      if (key.indexOf('data-') === 0) cardAttrs[key] = attrs[key];
    });

    var card = el('div', cardAttrs);

    var iconEl = el('div', { class: 'tokui-welcome-feature__icon' });
    iconEl.innerHTML = FEATURE_ICONS[iconType] || FEATURE_ICONS.code;
    card.appendChild(iconEl);

    var body = el('div', { class: 'tokui-welcome-feature__body' });

    if (title) {
      var titleEl = el('div', { class: 'tokui-welcome-feature__title' });
      titleEl.textContent = title;
      body.appendChild(titleEl);
    }

    if (desc) {
      var descEl = el('div', { class: 'tokui-welcome-feature__desc' });
      descEl.textContent = desc;
      body.appendChild(descEl);
    }

    card.appendChild(body);

    // 点击事件由 renderer 的通用 data-tokui-clk 绑定处理（bindEvents），
    // 处理器经 (data, e, element) 拿到卡片 DOM，读 data-prompt 等属性。
    // 不在此自绑 click（旧实现 bus.emit 不传 element，usePrompt 读不到 data-prompt → 点击无效）。

    card._tokuiType = 'welcome-feature';
    return card;
  }

  // === Welcome Feature 功能特性卡片（容器）===
  // attrs.tt = 标题, attrs.tx = 描述, attrs.i = 图标类型(code/chart/doc)
  // attrs.clk = 点击事件回调名。推荐用简写 [feature]（自闭合）。
  renderer.register('welcome-feature', (node) => {
    return buildWelcomeFeature(node);
  });

  // welcome-feature 简写别名（不在 CONTAINERS → 自闭合，更简洁）
  renderer.register('feature', (node) => {
    return buildWelcomeFeature(node);
  });

  // === Attachments 文件附件区域（容器） ===
  // attrs.clk = 统一删除回调名
  // 子节点为 attach 项，水平 flex 排列
  renderer.register('attachments', (node, rc) => {
    var attrs = node.attrs || {};
    var handlerName = attrs.clk || '';

    var wrapper = el('div', { class: 'tokui-attachments' });
    if (handlerName) wrapper.setAttribute('data-tokui-clk', handlerName);

    // 渲染子节点（attach 项）
    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) wrapper.appendChild(child);
    });

    wrapper._slot = wrapper;
    wrapper._tokuiType = 'attachments';
    return wrapper;
  });

  // === Attach 单个附件项（自闭合） ===
  // attrs.t = 文件类型(image/pdf/word/excel/ppt/zip/code/video/audio)
  // attrs.s = 文件名
  // attrs.u = 文件URL
  // attrs.size = 文件大小文本
  // attrs.clk = 点击事件名
  renderer.register('attach', (node) => {
    var attrs = node.attrs || {};
    var fileType = attrs.t || 'default';
    var fileName = attrs.s || '未知文件';
    var url = attrs.u || '';
    var fileSize = attrs.size || '';
    var handlerName = attrs.clk || '';

    // 文件类型颜色映射
    var TYPE_COLORS = {
      pdf: '#f5222d',
      code: '#1677ff',
      excel: '#52c41a',
      word: '#1677ff',
      ppt: '#fa8c16',
      zip: '#eab308',
      video: '#722ed1',
      audio: '#13c2c2',
      image: '#eb2f96',
      default: '#8c8c8c'
    };
    var color = TYPE_COLORS[fileType] || TYPE_COLORS.default;

    var item = el('div', { class: 'tokui-attach tokui-attach--' + fileType });
    if (handlerName) item.setAttribute('data-tokui-clk', handlerName);

    // 缩略图或文件类型图标
    if (fileType === 'image' && url) {
      var thumb = el('img', {
        class: 'tokui-attach__thumb',
        src: url,
        alt: fileName
      });
      item.appendChild(thumb);
    } else {
      var iconWrap = el('div', { class: 'tokui-attach__icon' });
      iconWrap.innerHTML = getFileTypeSVG(fileType, color);
      item.appendChild(iconWrap);
    }

    // 文件信息
    var info = el('div', { class: 'tokui-attach__info' });
    var nameEl = el('div', { class: 'tokui-attach__name' });
    nameEl.textContent = fileName;
    if (url) {
      nameEl.style.cursor = 'pointer';
      nameEl.addEventListener('click', function() {
        if (typeof window !== 'undefined') window.open(url, '_blank');
      });
    }
    info.appendChild(nameEl);
    if (fileSize) {
      var sizeEl = el('div', { class: 'tokui-attach__size' });
      sizeEl.textContent = fileSize;
      info.appendChild(sizeEl);
    }
    item.appendChild(info);

    // 悬浮操作按钮
    var actions = el('div', { class: 'tokui-attach__actions' });
    // 下载按钮
    if (url) {
      var dlBtn = el('a', {
        class: 'tokui-attach__action',
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        download: ''
      });
      dlBtn.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v9M4.5 7.5L8 11l3.5-3.5M2 13h12"/></svg>';
      dlBtn.title = '下载';
      actions.appendChild(dlBtn);
    }
    // 删除按钮
    var delBtn = el('button', { class: 'tokui-attach__action tokui-attach__action--del', type: 'button' });
    delBtn.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
    delBtn.title = '删除';
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (handlerName) {
        var bus = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
          ? window.TokUI._internal.eventBus : null;
        if (bus && typeof bus.emit === 'function') {
          bus.emit(handlerName, { name: fileName, url: url, type: fileType });
        }
      }
      // 移除此附件项
      if (item.parentNode) item.parentNode.removeChild(item);
    });
    actions.appendChild(delBtn);
    item.appendChild(actions);

    item._tokuiType = 'attach';
    return item;
  });

  // === Artifact / Canvas 侧边预览面板（容器）===
  // attrs.tt = 标题, attrs.lang = 代码语言, attrs.pos = 位置(right/left), attrs.w = 宽度百分比(默认50)
  // 子容器: artifact-code(代码内容), artifact-preview(iframe预览)
  // 渲染: 顶部标题栏 + Code/Preview切换 + 关闭按钮, 代码区(语法高亮+复制), 预览区(iframe sandbox), 拖拽调整手柄
  renderer.register('artifact', (node, rc) => {
    var attrs = node.attrs || {};
    var title = attrs.tt || 'Artifact';
    var lang = attrs.lang || 'text';
    var pos = attrs.pos || 'right';
    var width = attrs.w || '50';

    var wrapper = el('div', { class: 'tokui-artifact' });

    // === Header: title + tab buttons + close ===
    var header = el('div', { class: 'tokui-artifact__header' });

    var titleEl = el('span', { class: 'tokui-artifact__title' });
    titleEl.textContent = title;
    header.appendChild(titleEl);

    var tabs = el('div', { class: 'tokui-artifact__tabs' });

    var codeTab = el('button', {
      class: 'tokui-artifact__tab tokui-artifact__tab--code tokui-artifact__tab--active',
      type: 'button'
    });
    codeTab.textContent = 'Code';
    tabs.appendChild(codeTab);

    var previewTab = el('button', {
      class: 'tokui-artifact__tab tokui-artifact__tab--preview',
      type: 'button'
    });
    previewTab.textContent = 'Preview';
    tabs.appendChild(previewTab);

    header.appendChild(tabs);

    var closeBtn = el('button', {
      class: 'tokui-artifact__close',
      type: 'button',
      'aria-label': 'Close'
    });
    closeBtn.innerHTML = '&times;';
    header.appendChild(closeBtn);

    wrapper.appendChild(header);

    // === Code area (hidden by default when preview is shown) ===
    var codeArea = el('div', { class: 'tokui-artifact__code' });

    // Render artifact-code children to get the source text
    var codeText = '';
    var artifactCodeNodes = (node.children || []).filter(function(c) { return c.type === 'artifact-code'; });
    if (artifactCodeNodes.length > 0) {
      var codeChildren = artifactCodeNodes[0].children || [];
      codeText = codeChildren.map(function(c) { return c.content || ''; }).join('');
    }

    var pre = el('pre', { class: 'tokui-code' });
    var code = el('code', { class: 'language-' + lang });
    if (lang !== 'text' && HL_LANGS[lang]) {
      code.innerHTML = wrapLines(highlightCode(codeText, lang));
    } else {
      code.innerHTML = wrapLines(escapeHtml(codeText));
    }
    pre.appendChild(code);
    codeArea.appendChild(pre);

    // Copy button in code area
    var copyBtn = el('button', { class: 'tokui-artifact__code-copy', type: 'button' });
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', function() {
      var text = code.textContent || '';
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('tokui-artifact__code-copy--done');
      setTimeout(function() {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('tokui-artifact__code-copy--done');
      }, 2000);
    });
    codeArea.appendChild(copyBtn);
    wrapper.appendChild(codeArea);

    // === Preview area (iframe sandbox) ===
    var previewArea = el('div', { class: 'tokui-artifact__preview' });
    previewArea.style.display = 'none';

    var iframe = el('iframe', {
      class: 'tokui-artifact__iframe',
      sandbox: 'allow-scripts',
      frameborder: '0'
    });

    // Build HTML preview content from artifact-code text
    // For JSX/React-like code, wrap in a basic HTML template
    var htmlContent = '';
    if (lang === 'html') {
      htmlContent = codeText;
    } else {
      // Default: show the code as text in preview
      htmlContent = '<pre style="margin:0;padding:16px;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;">' +
        codeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</pre>';
    }
    iframe.setAttribute('srcdoc', htmlContent);

    previewArea.appendChild(iframe);
    wrapper.appendChild(previewArea);

    // === Resize handle (bottom edge, drag to adjust height) ===
    var resizeHandle = el('div', { class: 'tokui-artifact__resize' });
    wrapper.appendChild(resizeHandle);

    // === Tab switching logic ===
    codeTab.addEventListener('click', function() {
      codeArea.style.display = '';
      previewArea.style.display = 'none';
      codeTab.classList.add('tokui-artifact__tab--active');
      previewTab.classList.remove('tokui-artifact__tab--active');
    });

    previewTab.addEventListener('click', function() {
      codeArea.style.display = 'none';
      previewArea.style.display = '';
      previewTab.classList.add('tokui-artifact__tab--active');
      codeTab.classList.remove('tokui-artifact__tab--active');
    });

    // === Close button logic ===
    closeBtn.addEventListener('click', function() {
      // Dispatch a custom event so the parent layout can restore full width
      var event = new CustomEvent('tokui-artifact-close', { bubbles: true, detail: { artifact: wrapper } });
      wrapper.dispatchEvent(event);
      wrapper.style.display = 'none';
    });

    // === Resize drag logic ===
    var isDragging = false;
    resizeHandle.addEventListener('mousedown', function(e) {
      isDragging = true;
      e.preventDefault();
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
    });

    function onDragMove(e) {
      if (!isDragging) return;
      var refRect = wrapper.getBoundingClientRect();
      if (!refRect) return;
      var newHeight = refRect.bottom - e.clientY;
      newHeight = Math.max(120, newHeight);
      wrapper.style.height = newHeight + 'px';
    }

    function onDragEnd() {
      isDragging = false;
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
    }

    // === Streaming support ===
    // _slot points to code element for streaming text append
    wrapper._slot = code;
    wrapper._tokuiType = 'artifact';
    wrapper._artifactCode = codeText;

    // Remove standalone preview elements (artifact-preview renders as separate child)
    // Use setTimeout to run after initial DOM mount
    setTimeout(function() {
      var standalonePreviews = wrapper.querySelectorAll('.tokui-artifact-preview-standalone');
      standalonePreviews.forEach(function(sp) {
        if (sp.parentNode) sp.parentNode.removeChild(sp);
      });
    }, 0);

    // Stream close hook: re-highlight when streaming is done
    wrapper._streamCloseHook = function() {
      // 取代码原文 raw：
      // - mount 模式：node.children 完整，从 artifact-code 子节点提取（parser 的 _unescapeRaw 已把字面 \n 转真换行）。
      // - 流式模式：parser 增量 emit，artifact 的 open 节点不带 children —— 代码原文是作为 artifact-code
      //   子组件的文本流式追加进了 code 元素，此刻 node.children 仍为空。故从已渲染的 artifact-code <pre>
      //   反读 textContent 兜底（流式文本尚未高亮，\n 保留，round-trip 安全）。
      //   注：mount 后的 code DOM 不可反读（wrapLines 已去掉 \n，会塌成一行）—— 仅流式分支走 DOM 兜底。
      var acNode = (node.children || []).find(function(c) { return c.type === 'artifact-code'; });
      var raw;
      if (acNode) {
        raw = (acNode.children || []).map(function(c) { return c.content || ''; }).join('');
      } else {
        raw = '';
        var pres = wrapper.querySelectorAll('pre');
        for (var i = 0; i < pres.length; i++) {
          if (pres[i]._tokuiType === 'artifact-code') {
            var cc = pres[i].querySelector('code');
            if (cc) { raw = cc.textContent || ''; break; }
          }
        }
        if (!raw) raw = wrapper._artifactCode || '';
      }
      if (lang !== 'text' && HL_LANGS[lang]) {
        code.innerHTML = wrapLines(highlightCode(raw, lang));
      } else {
        code.innerHTML = wrapLines(escapeHtml(raw));
      }
      wrapper._artifactCode = raw;
      // Update iframe preview content
      var updatedHtml = '';
      if (lang === 'html') {
        updatedHtml = raw;
      } else {
        updatedHtml = '<pre style="margin:0;padding:16px;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;">' +
          raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
          '</pre>';
      }
      iframe.setAttribute('srcdoc', updatedHtml);
      // Remove standalone preview elements rendered by streaming
      var standalonePreview = wrapper.querySelector('.tokui-artifact-preview-standalone');
      if (standalonePreview && standalonePreview.parentNode) {
        standalonePreview.parentNode.removeChild(standalonePreview);
      }
    };

    return wrapper;
  });

  // === Artifact-Code 子容器 ===
  // 纯容器，内容会被 artifact 父级提取
  // 在独立渲染时（非 artifact 内），渲染为普通代码块
  renderer.register('artifact-code', (node, rc) => {
    var text = '';
    if (node.children && node.children.length > 0) {
      text = node.children.map(function(c) { return c.content || ''; }).join('');
    } else {
      text = node.content || '';
    }
    var pre = el('pre', { class: 'tokui-code' });
    var code = el('code', {});
    code.textContent = text;
    pre.appendChild(code);
    pre._slot = code;
    pre._tokuiType = 'artifact-code';
    // Stream close hook: re-highlight (language from parent context)
    pre._streamCloseHook = function() {
      var raw = '';
      for (var i = 0; i < code.childNodes.length; i++) {
        raw += code.childNodes[i].textContent || '';
      }
      code.textContent = raw;
    };
    return pre;
  });

  // === Artifact-Preview 子容器 ===
  // 在独立渲染时显示为 iframe 预览框
  renderer.register('artifact-preview', (node, rc, parentType) => {
    // When inside an artifact, the artifact renderer handles preview internally
    // Return hidden placeholder to avoid duplicate iframe
    if (parentType === 'artifact') {
      var hidden = el('div', { style: 'display:none' });
      hidden._tokuiType = 'artifact-preview';
      return hidden;
    }
    var wrapper = el('div', { class: 'tokui-artifact-preview-standalone' });
    var iframe = el('iframe', {
      class: 'tokui-artifact__iframe',
      sandbox: 'allow-scripts',
      frameborder: '0'
    });
    var htmlContent = '';
    if (node.children && node.children.length > 0) {
      htmlContent = node.children.map(function(c) { return c.content || ''; }).join('');
    }
    if (htmlContent) {
      iframe.setAttribute('srcdoc', htmlContent);
    }
    wrapper.appendChild(iframe);
    wrapper._tokuiType = 'artifact-preview';
    return wrapper;
  });

  // === Command 命令面板（容器）===
  // attrs.ph = 搜索占位文字, attrs.clk = 选择事件回调
  // 子节点: command-group（含 command-item）
  // 渲染为固定浮层，含搜索输入、分组列表、键盘导航
  renderer.register('command', (node, rc) => {
    var attrs = node.attrs || {};
    var placeholder = attrs.ph || '输入关键词搜索...';

    // 外层容器（fixed overlay）
    var wrapper = el('div', { class: 'tokui-command' });
    if (attrs.id) wrapper.id = attrs.id;
    if (attrs.clk) wrapper.setAttribute('data-tokui-clk', attrs.clk);

    // 遮罩层
    var overlay = el('div', { class: 'tokui-command__overlay' });
    wrapper.appendChild(overlay);

    // 面板
    var panel = el('div', { class: 'tokui-command__panel', role: 'dialog', 'aria-label': '命令面板' });

    // 搜索输入框容器
    var inputWrap = el('div', { class: 'tokui-command__input-wrap' });
    var searchIcon = el('span', { class: 'tokui-command__search-icon', 'aria-hidden': 'true' });
    searchIcon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';
    inputWrap.appendChild(searchIcon);
    var input = el('input', {
      class: 'tokui-command__input',
      type: 'text',
      placeholder: placeholder,
      autocomplete: 'off',
      autofocus: 'true'
    });
    inputWrap.appendChild(input);
    panel.appendChild(inputWrap);

    // 列表区域
    var list = el('div', { class: 'tokui-command__list', role: 'listbox' });

    // 渲染子节点（command-group）
    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) list.appendChild(child);
    });

    // 空状态
    var empty = el('div', { class: 'tokui-command__empty' });
    empty.textContent = '没有找到匹配结果';
    empty.style.display = 'none';
    list.appendChild(empty);

    panel.appendChild(list);
    wrapper.appendChild(panel);

    // ===== 搜索过滤逻辑 =====
    var allItems = [];
    var allGroups = [];

    function collectItems() {
      allItems = Array.from(list.querySelectorAll('.tokui-command__item'));
      allGroups = Array.from(list.querySelectorAll('.tokui-command__group'));
    }
    collectItems();

    function fuzzyMatch(text, query) {
      if (!query) return { match: true, score: 0 };
      var lower = text.toLowerCase();
      var q = query.toLowerCase();
      // exact substring match
      if (lower.indexOf(q) !== -1) return { match: true, score: q.length / lower.length };
      // fuzzy: each char must appear in order
      var qi = 0;
      var matched = 0;
      for (var i = 0; i < lower.length && qi < q.length; i++) {
        if (lower[i] === q[qi]) { qi++; matched++; }
      }
      if (qi === q.length) return { match: true, score: matched / lower.length };
      return { match: false, score: 0 };
    }

    function highlightText(text, query) {
      if (!query) return document.createTextNode(text);
      var lower = text.toLowerCase();
      var q = query.toLowerCase();
      var idx = lower.indexOf(q);
      if (idx === -1) return document.createTextNode(text);
      var frag = document.createDocumentFragment();
      var before = text.slice(0, idx);
      var match = text.slice(idx, idx + q.length);
      var after = text.slice(idx + q.length);
      if (before) frag.appendChild(document.createTextNode(before));
      var mark = document.createElement('mark');
      mark.className = 'tokui-command__highlight';
      mark.textContent = match;
      frag.appendChild(mark);
      if (after) frag.appendChild(document.createTextNode(after));
      return frag;
    }

    function filterItems(query) {
      var visibleCount = 0;
      allItems.forEach(function(item) {
        var value = item.getAttribute('data-value') || item.textContent || '';
        var result = fuzzyMatch(value, query);
        if (result.match) {
          item.style.display = '';
          visibleCount++;
          // highlight matched text
          var textSpan = item.querySelector('.tokui-command__item-text');
          if (textSpan) {
            textSpan.innerHTML = '';
            textSpan.appendChild(highlightText(value, query));
          }
        } else {
          item.style.display = 'none';
          item.classList.remove('tokui-command__item--selected');
        }
      });
      // hide empty groups
      allGroups.forEach(function(group) {
        var visibleItems = group.querySelectorAll('.tokui-command__item:not([style*="display: none"])');
        group.style.display = visibleItems.length === 0 ? 'none' : '';
      });
      // empty state
      empty.style.display = visibleCount === 0 ? '' : 'none';
      // reset selection
      _selectedIndex = -1;
      if (visibleCount > 0) {
        _selectedIndex = 0;
        updateSelection();
      }
    }

    input.addEventListener('input', function() {
      filterItems(input.value.trim());
    });

    // ===== 键盘导航 =====
    var _selectedIndex = -1;

    function getVisibleItems() {
      return allItems.filter(function(item) {
        return item.style.display !== 'none';
      });
    }

    function updateSelection() {
      var visible = getVisibleItems();
      visible.forEach(function(item, idx) {
        if (idx === _selectedIndex) {
          item.classList.add('tokui-command__item--selected');
          item.setAttribute('aria-selected', 'true');
          // scroll into view
          if (item.scrollIntoView) {
            item.scrollIntoView({ block: 'nearest' });
          }
        } else {
          item.classList.remove('tokui-command__item--selected');
          item.setAttribute('aria-selected', 'false');
        }
      });
    }

    function selectItem(item) {
      if (!item) return;
      var handlerName = item.getAttribute('data-tokui-clk');
      // dispatch via event bus
      if (handlerName) {
        var bus = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
          ? window.TokUI._internal.eventBus : null;
        if (bus && typeof bus.emit === 'function') {
          bus.emit(handlerName, { value: item.getAttribute('data-value'), text: item.textContent });
        }
      }
      // also emit command-level clk
      var rootClk = wrapper.getAttribute('data-tokui-clk');
      if (rootClk) {
        var bus2 = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
          ? window.TokUI._internal.eventBus : null;
        if (bus2 && typeof bus2.emit === 'function') {
          bus2.emit(rootClk, { value: item.getAttribute('data-value'), text: item.textContent, clk: handlerName });
        }
      }
      closeCommand();
    }

    input.addEventListener('keydown', function(e) {
      var visible = getVisibleItems();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (visible.length > 0) {
          _selectedIndex = (_selectedIndex + 1) % visible.length;
          updateSelection();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (visible.length > 0) {
          _selectedIndex = _selectedIndex <= 0 ? visible.length - 1 : _selectedIndex - 1;
          updateSelection();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_selectedIndex >= 0 && _selectedIndex < visible.length) {
          selectItem(visible[_selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeCommand();
      }
    });

    // ===== 打开/关闭逻辑 =====
    function openCommand() {
      // 流式下子项可能晚于 render 到达，打开时重新收集 + 刷新过滤/空状态/选中态
      collectItems();
      filterItems(input.value || '');
      wrapper.classList.add('tokui-command--open');
      input.focus();
    }

    function closeCommand() {
      wrapper.classList.remove('tokui-command--open');
      input.value = '';
      filterItems('');
      _selectedIndex = -1;
    }

    // 点击遮罩关闭
    overlay.addEventListener('click', function() {
      closeCommand();
    });

    // Cmd+K / Ctrl+K 全局快捷键（opt-in：仅 hotkey 属性声明时绑定）。
    // 多个 command 实例都默认绑同一快捷键会导致按一次弹出多个；默认改为按钮触发（openCommand），
    // 需要 Cmd+K 时显式写 hotkey（且页面只应有一个 hotkey 实例）。
    function handleGlobalKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (wrapper.classList.contains('tokui-command--open')) {
          closeCommand();
        } else {
          openCommand();
        }
      }
    }
    if (attrs.hotkey !== undefined && typeof document !== 'undefined') {
      document.addEventListener('keydown', handleGlobalKey);
    }

    // 公开方法
    wrapper._tokuiType = 'command';
    wrapper._slot = list; // 流式 command-group 子节点落入 list（非 wrapper）
    wrapper._openCommand = openCommand;
    wrapper._closeCommand = closeCommand;
    // 流式收尾：子项到齐后重新收集（mount 模式下 idempotent，无副作用）
    wrapper._streamCloseHook = function () { collectItems(); filterItems(input.value || ''); };

    return wrapper;
  });

  // 构建 command 命令项 DOM（command-group 的子节点，标签可以是 command-item 或 item）。
  // 盖 data-tokui-tag=node.type 印章，让 Playground 按 [item]/[command-item] 各自代码行定位。
  // item 与 command-item 在 command-group 内等价（item 同名按父级区分）。
  function buildCommandItem(node) {
    var attrs = node.attrs || {};
    var text = attrs.tx || '';
    var value = attrs.v || text;

    var item = el('div', {
      class: 'tokui-command__item',
      role: 'option',
      tabindex: '-1',
      'data-value': value,
      'aria-selected': 'false',
      'data-tokui-tag': node.type
    });
    if (attrs.clk) item.setAttribute('data-tokui-clk', attrs.clk);

    var textSpan = el('span', { class: 'tokui-command__item-text' });
    textSpan.textContent = text;
    item.appendChild(textSpan);

    // 快捷键提示（可选）
    if (attrs.shortcut) {
      var shortcut = el('span', { class: 'tokui-command__item-shortcut' });
      shortcut.textContent = attrs.shortcut;
      item.appendChild(shortcut);
    }

    // 点击选中
    item.addEventListener('click', function() {
      // 找到父级 command 容器
      var cmd = item.closest ? item.closest('.tokui-command') : null;
      if (cmd && cmd._closeCommand) {
        // 触发事件
        var handlerName = item.getAttribute('data-tokui-clk');
        if (handlerName) {
          var bus = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
            ? window.TokUI._internal.eventBus : null;
          if (bus && typeof bus.emit === 'function') {
            bus.emit(handlerName, { value: value, text: text });
          }
        }
        // command-level clk
        var rootClk = cmd.getAttribute('data-tokui-clk');
        if (rootClk) {
          var bus2 = (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal)
            ? window.TokUI._internal.eventBus : null;
          if (bus2 && typeof bus2.emit === 'function') {
            bus2.emit(rootClk, { value: value, text: text, clk: handlerName });
          }
        }
        cmd._closeCommand();
      }
    });

    // 鼠标悬浮选中
    item.addEventListener('mouseenter', function() {
      var parentList = item.closest ? item.closest('.tokui-command__list') : null;
      if (!parentList) return;
      var visible = Array.from(parentList.querySelectorAll('.tokui-command__item:not([style*="display: none"])'));
      visible.forEach(function(v) {
        v.classList.remove('tokui-command__item--selected');
        v.setAttribute('aria-selected', 'false');
      });
      item.classList.add('tokui-command__item--selected');
      item.setAttribute('aria-selected', 'true');
    });

    return item;
  }

  // 跨模块共享：layout.js 的 item 渲染器在 command-group 内复用本构建器（经 _internal，同 el）
  if (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal) {
    window.TokUI._internal.buildCommandItem = buildCommandItem;
  }

  // === Command.Group 命令分组（容器）===
  // attrs.tt = 分组标题
  // 子节点: command-item 或 item（在 command-group 内等价）
  renderer.register('command-group', (node, rc) => {
    var attrs = node.attrs || {};
    var title = attrs.tt || '';

    var group = el('div', { class: 'tokui-command__group', role: 'group' });
    if (title) {
      group.setAttribute('aria-label', title);
      var heading = el('div', { class: 'tokui-command__group-heading' });
      heading.textContent = title;
      group.appendChild(heading);
    }

    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) group.appendChild(child);
    });

    group._slot = group;
    group._tokuiType = 'command-group';
    return group;
  });

  // === Command.Item 命令项（自闭合）===
  // attrs.tx = 显示文本, attrs.clk = 点击事件, attrs.v = 搜索值
  renderer.register('command-item', (node) => {
    return buildCommandItem(node);
  });

  // === Canvas 侧边预览面板（容器）===
  // attrs.tt = 标题(默认"Canvas"), attrs.pos = 位置(right/left, 默认right)
  // attrs.w = 宽度(px, 默认400), attrs.tx = 文本内容(自闭合模式)
  // attrs.open = 布尔, 初始展开, attrs.closable = 显示关闭按钮(默认true)
  // 子容器: canvas-content(内容区)
  renderer.register('canvas', (node, rc) => {
    var attrs = node.attrs || {};
    var title = attrs.tt || 'Canvas';
    var pos = attrs.pos || 'right';
    var width = parseInt(attrs.w) || 400;
    var isOpen = attrs.open !== undefined;
    var isClosable = attrs.closable === undefined || attrs.closable === true;

    var classes = ['tokui-canvas', 'tokui-canvas--' + pos];
    if (isOpen) classes.push('tokui-canvas--open');

    var wrapper = el('div', { class: classes.join(' ') });
    wrapper.style.setProperty('--tokui-canvas-w', width + 'px');

    // 切换标签（折叠时显示在边缘）
    var toggle = el('button', {
      class: 'tokui-canvas__toggle',
      type: 'button',
      'aria-label': isOpen ? 'Close panel' : 'Open panel'
    });
    // 竖排文字
    toggle.textContent = title;
    toggle.addEventListener('click', function() {
      var wasOpen = wrapper.classList.contains('tokui-canvas--open');
      wrapper.classList.toggle('tokui-canvas--open');
      toggle.setAttribute('aria-label', wasOpen ? 'Open panel' : 'Close panel');
    });
    wrapper.appendChild(toggle);

    // 面板主体
    var panel = el('div', { class: 'tokui-canvas__panel' });
    panel.style.width = width + 'px';

    // Header
    var header = el('div', { class: 'tokui-canvas__header' });
    var titleEl = el('span', { class: 'tokui-canvas__title' });
    titleEl.textContent = title;
    header.appendChild(titleEl);

    if (isClosable) {
      var closeBtn = el('button', {
        class: 'tokui-canvas__close',
        type: 'button',
        'aria-label': 'Close'
      });
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', function() {
        wrapper.classList.remove('tokui-canvas--open');
        toggle.setAttribute('aria-label', 'Open panel');
      });
      header.appendChild(closeBtn);
    }
    panel.appendChild(header);

    // Body 内容区
    var body = el('div', { class: 'tokui-canvas__body' });

    // 自闭合模式：tx 属性作为文本内容
    if (attrs.tx) {
      body.textContent = attrs.tx;
    }

    // 渲染子节点（包括 canvas-content）
    var rendered = rc(node.children || []);
    rendered.forEach(function(child) {
      if (child && child.nodeType) body.appendChild(child);
    });

    panel.appendChild(body);
    wrapper.appendChild(panel);

    wrapper._slot = body;
    wrapper._tokuiType = 'canvas';
    wrapper._update = function(uAttrs) {
      if (uAttrs.tt !== undefined) {
        var t = wrapper.querySelector('.tokui-canvas__title');
        if (t) t.textContent = uAttrs.tt;
        toggle.textContent = uAttrs.tt;
      }
      if (uAttrs.act === 'open') wrapper.classList.add('tokui-canvas--open');
      else if (uAttrs.act === 'close') wrapper.classList.remove('tokui-canvas--open');
      else if (uAttrs.act === 'toggle') wrapper.classList.toggle('tokui-canvas--open');
    };
    return wrapper;
  });

  // === Canvas Content 侧边面板内容区（容器）===
  // 简单的 pass-through 容器，子节点直接渲染
  renderer.register('canvas-content', (node, rc) => {
    var content = el('div', { class: 'tokui-canvas__content' });
    rc(node.children || []).forEach(function(child) {
      if (child && child.nodeType) content.appendChild(child);
    });
    content._slot = content;
    content._tokuiType = 'canvas-content';
    return content;
  });
}

/**
 * 生成文件类型 SVG 图标
 * @param {string} type - 文件类型
 * @param {string} color - 图标颜色
 * @returns {string} SVG HTML 字符串
 */
function getFileTypeSVG(type, color) {
  var sw = '1.5';
  var cap = 'round';
  var join = 'round';
  var doc = '<path d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="' + cap + '" stroke-linejoin="' + join + '"/><path d="M14 2v6h6" fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="' + cap + '" stroke-linejoin="' + join + '"/>';
  var icons = {
    pdf: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<text x="12" y="16.5" text-anchor="middle" font-size="5.5" font-weight="700" font-family="sans-serif" fill="' + color + '">PDF</text></svg>',
    word: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<text x="12" y="16.5" text-anchor="middle" font-size="7" font-weight="700" font-family="sans-serif" fill="' + color + '">W</text></svg>',
    excel: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<path d="M9 11v6M12 11v6M8 14h4" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round"/></svg>',
    ppt: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<circle cx="12" cy="14" r="3" stroke="' + color + '" stroke-width="1.5" fill="none"/></svg>',
    zip: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<path d="M10 10h4M10 13h4M10 16h2" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round"/></svg>',
    code: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<path d="M9 12l-2 2 2 2M15 12l2 2-2 2" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    video: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<path d="M10 12.5l4-2.5v5l-4-2.5z" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    audio: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<path d="M10 15v-3M12 13v4M14 11v6" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round"/></svg>',
    image: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<circle cx="10" cy="11" r="1.5" stroke="' + color + '" stroke-width="1.2" fill="none"/><path d="M8 17l3-3 2 2 3-4 3 5H8z" stroke="' + color + '" stroke-width="1.2" stroke-linejoin="round" fill="none"/></svg>',
    default: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none">' + doc + '<path d="M9 12h6M9 15h4" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };
  return icons[type] || icons.default;
}

/**
 * 生成分页页码数组，含省略号
 * @param {number} current - 当前页
 * @param {number} total - 总页数
 * @returns {Array<number|string>} 页码数组
 */
function generatePages(current, total) {
  if (total <= 7) {
    var arr = [];
    for (var i = 1; i <= total; i++) arr.push(i);
    return arr;
  }
  var pages = [1];
  if (current > 3) pages.push('...');
  var start = Math.max(2, current - 1);
  var end = Math.min(total - 1, current + 1);
  for (var j = start; j <= end; j++) pages.push(j);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

/**
 * 关闭页面上所有打开的 dropdown 面板
 */
function closeAllDropdowns() {
  if (typeof document === 'undefined') return;
  var openPanels = document.querySelectorAll('.tokui-dropdown__panel--open');
  openPanels.forEach(function (panel) {
    panel.classList.remove('tokui-dropdown__panel--open');
    panel.style.top = '';
    panel.style.left = '';
    var trigger = panel.parentElement.querySelector('.tokui-dropdown__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

// 全局点击关闭 dropdown
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('click', function () {
    closeAllDropdowns();
  });
}

/**
 * 为 Markdown 容器内的图片绑定 lightbox 点击事件。
 * 同一个 md 容器内的所有图片共享一个列表，支持左右切换。
 */
function bindMdLightbox(container) {
  const imgs = container.querySelectorAll('.tokui-md-img');
  if (!imgs.length) return;
  const srcList = Array.from(imgs).map(function (img) { return img.src; });
  imgs.forEach(function (img, index) {
    img.style.cursor = 'pointer';
    img.addEventListener('click', function () {
      const { getLightbox } = (typeof require === 'function')
        ? require('./lightbox')
        : window.TokUI._internal;
      const lb = getLightbox(typeof document !== 'undefined' ? document : undefined);
      lb.open(srcList[index], srcList);
    });
  });
}

/**
 * 简易 Markdown 转 HTML 解析器（增强版）
 * 支持：加粗、斜体、删除线、行内代码、链接、图片、标题、有序/无序列表、
 *       表格（含对齐）、代码围栏、任务列表、引用块、分隔线、段落。
 * 用于 [md] 组件的内容渲染。
 *
 * @param {string} text - Markdown 文本
 * @returns {string} 转换后的 HTML 字符串
 */
function simpleMarkdown(text) {
  if (!text) return '';

  // 解析表格行 | cell | cell |
  function parseTableRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
  }

  // 解析表格对齐方式（分隔行 → align 数组）
  function parseTableAlign(sepLine) {
    return sepLine.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) {
      cell = cell.trim();
      if (/^:-+:$/.test(cell)) return 'center';
      if (/^-+:$/.test(cell)) return 'right';
      if (/^:-+$/.test(cell)) return 'left';
      return 'left';
    });
  }

  // 行内格式处理（含 HTML 转义）
  function _escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inlineFormat(text) {
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 图片 ![alt](url) 必须在链接之前处理
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (match, alt, src) {
      if (!/^https?:\/\//i.test(src)) return match;
      return '<img src="' + _escAttr(src) + '" alt="' + _escAttr(alt) + '" class="tokui-md-img" />';
    });
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (match, t, url) {
      if (!/^(https?:\/\/|mailto:|\/|#)/i.test(url)) url = '#';
      return '<a href="' + _escAttr(url) + '" target="_blank" rel="noopener">' + t + '</a>';
    });
    return text;
  }

  // 预处理：提取代码围栏，替换为占位符，避免后续处理破坏代码内容
  var codeFences = [];
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
    var idx = codeFences.length;
    codeFences.push({ lang: lang, code: code.replace(/\n$/, '') });
    return '\x02CODEFENCE' + idx + '\x03';
  });

  // 预处理：提取水平线（避免 inlineFormat 将 *** 处理为粗体/斜体）
  var HR_PLACEHOLDER = '\x02TOKUIHR\x03';
  text = text.replace(/^(?:\*{3,}|-{3,}|_{3,})\s*$/gm, HR_PLACEHOLDER);

  // 按空行分割为段落块，每个块独立处理
  var blocks = text.split(/\n{2,}/);

  return blocks.map(function (block) {
    block = block.trim();
    if (!block) return '';

    // 还原代码围栏占位符，检查是否整个块就是代码围栏
    var fenceMatch = block.match(/^\x02CODEFENCE(\d+)\x03$/);
    if (fenceMatch) {
      var fence = codeFences[parseInt(fenceMatch[1])];
      var lang = fence.lang || 'text';
      var highlighted = HL_LANGS[lang] ? highlightCode(fence.code, lang) : fence.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<pre class="tokui-code"><code class="language-' + lang + '">' + highlighted + '</code></pre>';
    }

    // 先对整块做行内格式处理
    block = inlineFormat(block);

    // 按行处理块级元素
    var lines = block.split('\n');
    var result = [];
    var inUl = false;
    var inOl = false;
    var inQuote = false;
    var hasBlock = false;

    // 检测 Markdown 表格
    var tableStart = -1;
    for (var ti = 0; ti < lines.length; ti++) {
      if (lines[ti].trim().indexOf('|') === 0) { tableStart = ti; break; }
    }
    if (tableStart !== -1) {
      var tableLines = [];
      var tableEnd = tableStart;
      for (var ti2 = tableStart; ti2 < lines.length; ti2++) {
        if (lines[ti2].trim().indexOf('|') === 0) {
          tableLines.push(lines[ti2]);
          tableEnd = ti2;
        } else {
          break;
        }
      }
      if (tableLines.length >= 2 && /^\|[\s\-:|]+\|$/.test(tableLines[1].trim())) {
        // 处理表格前的行
        for (var pi = 0; pi < tableStart; pi++) {
          processBlockLine(lines[pi]);
        }
        // 渲染表格（含对齐）
        hasBlock = true;
        var aligns = parseTableAlign(tableLines[1]);
        var tableHtml = '<table class="tokui-md-table"><thead><tr>';
        var headers = parseTableRow(tableLines[0]);
        for (var hi = 0; hi < headers.length; hi++) {
          var align = aligns[hi] || 'left';
          tableHtml += '<th style="text-align:' + align + '">' + headers[hi] + '</th>';
        }
        tableHtml += '</tr></thead><tbody>';
        for (var ri = 2; ri < tableLines.length; ri++) {
          var cells = parseTableRow(tableLines[ri]);
          tableHtml += '<tr>';
          for (var ci = 0; ci < cells.length; ci++) {
            var cellAlign = aligns[ci] || 'left';
            tableHtml += '<td style="text-align:' + cellAlign + '">' + cells[ci] + '</td>';
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        result.push(tableHtml);
        // 处理表格后的行
        for (var ai = tableEnd + 1; ai < lines.length; ai++) {
          processBlockLine(lines[ai]);
        }
        if (inUl) result.push('</ul>');
        if (inOl) result.push('</ol>');
        if (inQuote) result.push('</blockquote>');
        var html = result.join('');
        if (!hasBlock) return '<p>' + html + '</p>';
        return html;
      }
    }

    for (var li = 0; li < lines.length; li++) {
      processBlockLine(lines[li]);
    }
    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');
    if (inQuote) result.push('</blockquote>');

    var html = result.join('');
    if (!hasBlock) return '<p>' + html + '</p>';
    return html;

    function processBlockLine(line) {
      // 水平线 --- / *** / ___ (original or preprocessed placeholder)
      if (line.trim() === '\x02TOKUIHR\x03' || /^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }
        if (inQuote) { result.push('</blockquote>'); inQuote = false; }
        hasBlock = true;
        result.push('<hr class="tokui-md__hr">');
        return;
      }
      // 引用块
      if (line.match(/^&gt;\s*/)) {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }
        if (!inQuote) { result.push('<blockquote class="tokui-md__quote">'); inQuote = true; }
        hasBlock = true;
        var quoteContent = line.replace(/^&gt;\s*/, '');
        result.push('<p>' + quoteContent + '</p>');
        return;
      }
      if (inQuote && !line.match(/^&gt;\s*/)) {
        result.push('</blockquote>'); inQuote = false;
      }
      if (line.match(/^### /)) {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }
        if (inQuote) { result.push('</blockquote>'); inQuote = false; }
        hasBlock = true;
        result.push(line.replace(/^### (.+)$/, '<h3>$1</h3>'));
      } else if (line.match(/^## /)) {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }
        if (inQuote) { result.push('</blockquote>'); inQuote = false; }
        hasBlock = true;
        result.push(line.replace(/^## (.+)$/, '<h2>$1</h2>'));
      } else if (line.match(/^# /)) {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }
        if (inQuote) { result.push('</blockquote>'); inQuote = false; }
        hasBlock = true;
        result.push(line.replace(/^# (.+)$/, '<h1>$1</h1>'));
      } else if (line.match(/^- \[[ xX]\] /)) {
        // 任务列表
        if (inOl) { result.push('</ol>'); inOl = false; }
        if (!inUl) { result.push('<ul class="tokui-md__tasks">'); inUl = true; }
        hasBlock = true;
        var checked = /^- \[[xX]\] /.test(line);
        var taskText = line.replace(/^- \[[xX ]\] /, '');
        result.push('<li class="tokui-md__task"><input type="checkbox" disabled' + (checked ? ' checked' : '') + '>' + taskText + '</li>');
      } else if (line.match(/^- /)) {
        if (inOl) { result.push('</ol>'); inOl = false; }
        if (!inUl) { result.push('<ul>'); inUl = true; }
        hasBlock = true;
        result.push(line.replace(/^- (.+)$/, '<li>$1</li>'));
      } else if (line.match(/^\d+\. /)) {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (!inOl) { result.push('<ol>'); inOl = true; }
        hasBlock = true;
        result.push(line.replace(/^\d+\. (.+)$/, '<li>$1</li>'));
      } else {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }
        result.push(line);
      }
    }
  }).join('');
}

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerBasicComponents = registerBasicComponents;
  window.TokUI._internal.resolveColor = resolveColor;
  window.TokUI._internal.highlightCode = highlightCode;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerBasicComponents, resolveColor, highlightCode };
}
