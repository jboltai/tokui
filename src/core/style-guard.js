/**
 * TokUI 样式安全通道（Style Guard）
 * 通用 cls: / style: DSL 属性的安全过滤——renderer 对全组件根元素集中应用。
 *
 * 安全模型（渲染不可信 LLM 输出的前提下开放有限定制）：
 *   - style: 属性名白名单 + 值级黑名单（expression()/javascript:/behavior: 等）
 *     + url() 协议白名单（仅 http(s) 与站内相对路径）
 *     + transform 函数白名单（仅 translate/scale/rotate 族）
 *   - cls: 每个类名须匹配 ^[a-zA-Z][\w-]{0,63}$，拒绝 tokui- 前缀（防覆盖框架类），
 *     最多 8 个、去重。
 *   两条通道都只做「根级增强」：内部元素不透传，宿主自定义样式不参与框架样式优先级。
 */
'use strict';

/** 属性名白名单（含长短边变体；不含 position——position:fixed 可伪造遮罩，禁） */
var _SAFE_STYLE_PROPS = /^(background|background-image|background-color|background-size|background-position|background-repeat|background-clip|backdrop-filter|color|border|border-top|border-bottom|border-left|border-right|border-color|border-width|border-style|border-radius|border-top-left-radius|border-top-right-radius|border-bottom-left-radius|border-bottom-right-radius|padding|padding-top|padding-bottom|padding-left|padding-right|margin|margin-top|margin-bottom|margin-left|margin-right|text-align|text-decoration|text-overflow|letter-spacing|line-height|max-width|min-width|max-height|min-height|box-shadow|opacity|font-size|font-weight|font-family|overflow|overflow-x|overflow-y|cursor|gap|row-gap|column-gap|display|flex|flex-direction|flex-wrap|flex-grow|flex-shrink|flex-basis|order|align-items|align-self|align-content|justify-content|justify-self|justify-items|width|height|float|clear|visibility|white-space|word-break|word-wrap|vertical-align|transition|transform|aspect-ratio|object-fit|object-position|z-index|list-style|grid-template-columns|grid-template-rows)$/;

/** 值级黑名单片段（CSS 表达式注入 / 协议注入 / IE 行为绑定 / import 走私） */
var _UNSAFE_VALUE = /(expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|-moz-binding|behavior\s*:|@import|\\|<|>)/i;

/** url() 参数提取（全局匹配） */
var _URL_RE = /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi;

/** transform 允许的函数族（仿射变换，无 matrix/por perspective——防构造复杂注入面） */
var _TRANSFORM_ALLOWED = {
  translate: 1, translatex: 1, translatey: 1, translatez: 1,
  scale: 1, scalex: 1, scaley: 1, scalez: 1,
  rotate: 1, rotatex: 1, rotatey: 1, rotatez: 1
};

/**
 * 校验 transform 值：所有函数名须在白名单内，且不含黑名单片段
 * @param {string} val
 * @returns {boolean}
 */
function _safeTransformValue(val) {
  if (_UNSAFE_VALUE.test(val)) return false;
  var fns = val.match(/[a-zA-Z]+[-a-zA-Z]*\s*\(/g) || [];
  for (var i = 0; i < fns.length; i++) {
    var name = fns[i].replace(/\s*\($/, '').toLowerCase();
    if (!_TRANSFORM_ALLOWED[name]) return false;
  }
  return true;
}

/**
 * 校验值中所有 url() 引用：仅 http(s) 绝对地址与站内相对路径（/ ./ ../）
 * @param {string} val
 * @returns {boolean}
 */
function _safeUrls(val) {
  var ok = true;
  val.replace(_URL_RE, function (m, q, u) {
    var s = String(u).trim();
    if (!/^https?:\/\//i.test(s) && s.charAt(0) !== '/' && s.charAt(0) !== '.') ok = false;
    return m;
  });
  return ok;
}

/**
 * 过滤内联 style 字符串：按 `;` 拆分声明，逐条白名单校验
 * @param {string} raw - DSL style: 属性原始值
 * @returns {string|undefined} 安全声明串（`; ` 连接），全部被滤除时返回 undefined
 */
function filterStyle(raw) {
  if (!raw || typeof raw !== 'string') return undefined;
  var out = [];
  raw.split(';').forEach(function (decl) {
    var i = decl.indexOf(':');
    if (i <= 0) return;
    var prop = decl.slice(0, i).trim().toLowerCase();
    var val = decl.slice(i + 1).trim();
    if (!prop || !val) return;
    if (!_SAFE_STYLE_PROPS.test(prop)) return;
    if (_UNSAFE_VALUE.test(val)) return;
    if (prop === 'transform' && !_safeTransformValue(val)) return;
    if (/\burl\s*\(/i.test(val) && !_safeUrls(val)) return;
    out.push(prop + ': ' + val);
  });
  return out.length ? out.join('; ') : undefined;
}

/** 单个类名格式：字母开头，字母/数字/下划线/连字符，1~64 字符 */
var _CLS_TOKEN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

/**
 * 过滤自定义类名串：空白拆分、逐个校验、拒 tokui- 前缀、去重、上限 8 个
 * @param {string} raw - DSL cls: 属性原始值（含空格时由 parser 引号语法保证整体传入）
 * @returns {string[]|null} 安全类名数组；无可用类名时返回 null
 */
function sanitizeCls(raw) {
  if (!raw || typeof raw !== 'string') return null;
  var parts = raw.split(/\s+/).filter(Boolean);
  var out = [];
  for (var i = 0; i < parts.length && out.length < 8; i++) {
    var c = parts[i];
    if (!_CLS_TOKEN.test(c)) continue;          // 非法格式静默丢弃
    if (c.toLowerCase().indexOf('tokui-') === 0) continue; // 框架前缀保留字
    if (out.indexOf(c) === -1) out.push(c);
  }
  return out.length ? out : null;
}

var StyleGuard = {
  filterStyle: filterStyle,
  sanitizeCls: sanitizeCls
};

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.StyleGuard = StyleGuard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StyleGuard;
}
