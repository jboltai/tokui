/**
 * TokUI 图标注册表（零依赖，Lucide 风格 stroke 图标）。
 * stroke=currentColor → 自动继承父按钮文字色，彩色 icon 无需额外配色。
 *
 * 消费：[btn icon:view] / 表格操作列 btn: icon:view
 * 经 window.TokUI._internal.iconSvg（浏览器）或 require('./icons').iconSvg（Node）共享。
 */
'use strict';

var ICONS = {
  view:    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  edit:    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  delete:  '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  add:     '<path d="M12 5v14"/><path d="M5 12h14"/>',
  copy:    '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  upload:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  refresh: '<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  check:   '<path d="M20 6L9 17l-5-5"/>',
  close:   '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
  search:  '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  setting: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  warn:    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  lock:    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock:  '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  more:    '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  save:    '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  export:  '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
  filter:  '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  sort:    '<path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/><path d="m3 17 3 3 3-3"/><path d="M6 18V4"/>',
  star:    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  link:    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  menu:    '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  // 推理链 / 思考块 chrome 图标（替换原 Emoji）
  sparkles:      '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  lightbulb:     '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  'chevron-right':'<path d="m9 18 6-6-6-6"/>',
  // ==== T0.4 图标体系扩充（文件/音量/状态圈/方向/人员/常用件）====
  folder:        '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  'folder-open': '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  'file-text':   '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  'volume-high': '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  'volume-x':    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>',
  'circle-check':'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'circle-x':    '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'circle-alert':'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  'circle-info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'circle-help': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',
  'chevron-up':  '<path d="m18 15-6-6-6 6"/>',
  'chevron-left':'<path d="m15 18-6-6 6-6"/>',
  'arrow-left':  '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-up':    '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  'arrow-down':  '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  plus:          '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus:         '<path d="M5 12h14"/>',
  user:          '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:         '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  home:          '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  inbox:         '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  bell:          '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  calendar:      '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>',
  clock:         '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'map-pin':     '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'trending-down':'<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  'external-link':'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'panel-left':  '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  play:          '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause:         '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  terminal:      '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  zap:           '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
};

/** 图标 name 格式：字母开头，字母/数字/下划线/连字符，1~64 字符 */
var _ICON_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
/** path 内容白名单：仅允许几何标签 + 值不含尖括号（防注入 script、事件属性、foreignObject） */
var _ICON_TAG_RE = /^<\/?(path|circle|rect|line|polyline|polygon)(\s+[a-zA-Z-]+="[^"<>]*")*\s*\/?>$/;

/**
 * 注册/覆盖自定义图标（T0.4 正式 API，挂 TokUI.registerIcon）。
 * pathContent 为 SVG 元素串（与内置图标同格式），仅允许几何标签。
 * @param {string} name - 图标名（^[a-zA-Z][\w-]{0,63}$）
 * @param {string} pathContent - SVG 元素串，如 '<path d="..."/>'
 * @param {Object} [opts] - { alias: string[] } 额外别名键
 * @returns {boolean} 成功 true；校验失败 console.warn 并返回 false
 */
function registerIcon(name, pathContent, opts) {
  if (!_ICON_NAME_RE.test(name || '')) { console.warn('TokUI.registerIcon: 非法图标名', name); return false; }
  if (!pathContent || typeof pathContent !== 'string') { console.warn('TokUI.registerIcon: path 内容为空'); return false; }
  var tags = pathContent.match(/<[^>]+>/g) || [];
  if (!tags.length) { console.warn('TokUI.registerIcon: path 不含任何元素'); return false; }
  for (var i = 0; i < tags.length; i++) {
    if (!_ICON_TAG_RE.test(tags[i]) || /\son[a-z]+\s*=|javascript:/i.test(tags[i])) {
      console.warn('TokUI.registerIcon: 含非白名单标签/属性，已拒绝', name);
      return false;
    }
  }
  ICONS[name] = pathContent;
  var alias = (opts && opts.alias) || [];
  for (var j = 0; j < alias.length; j++) {
    if (_ICON_NAME_RE.test(alias[j])) ICONS[alias[j]] = pathContent;
  }
  _iconNodeCache = {}; // 覆盖内置图标时清节点缓存
  return true;
}

/**
 * 生成图标 SVG 字符串。
 * @param {string} name - ICONS 注册表键名
 * @param {number} [size=16] - 宽高（px）
 * @returns {string} 完整 <svg>...</svg>，未知 name 返回 ''
 */
function iconSvg(name, size) {
  var p = ICONS[name];
  if (!p) return '';
  var s = size || 16;
  return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" '
    + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
    + 'class="tokui-icon tokui-icon--' + name + '">' + p + '</svg>';
}

/**
 * 生成图标 SVG 元素（节点缓存版）：浏览器首用 innerHTML 解析一次建节点，后续 cloneNode(true)，
 * 避免同一 SVG 字符串反复 HTML 解析（btn icon 等批量渲染场景）。
 * Node / dom-mock 的 innerHTML 不解析（无子节点）→ 返回 null，消费方回退 iconSvg 字符串路径。
 * @param {string} name - ICONS 注册表键名
 * @param {number} [size=16] - 宽高（px）
 * @returns {Element|null} 克隆的 svg 节点；未知 name / 无 DOM / 环境不解析 innerHTML 返回 null
 */
var _iconNodeCache = {};
function iconEl(name, size) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  var key = name + '@' + (size || 16);
  if (!(key in _iconNodeCache)) {
    var svg = iconSvg(name, size);
    if (!svg) { _iconNodeCache[key] = null; return null; }
    var tmp = document.createElement('span');
    tmp.innerHTML = svg;
    _iconNodeCache[key] = tmp.firstChild || false; // false = 环境不解析 innerHTML（mock）
  }
  var cached = _iconNodeCache[key];
  return (cached && cached.cloneNode) ? cached.cloneNode(true) : null;
}

// UMD 双模式导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.ICONS = ICONS;
  window.TokUI._internal.iconSvg = iconSvg;
  window.TokUI._internal.iconEl = iconEl;
  window.TokUI._internal.registerIcon = registerIcon;
  window.TokUI.registerIcon = registerIcon; // 正式公共 API（T0.4）
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ICONS: ICONS, iconSvg: iconSvg, iconEl: iconEl, registerIcon: registerIcon };
}
