/**
 * 最小 DOM mock
 * 模拟浏览器 DOM API 的核心子集，用于在 Node.js 环境中测试 renderer/event-bus/theme。
 */
'use strict';

// id → 元素 注册表：setAttribute('id') 登记，document.getElementById 查。
// 供 upd 指令等依赖 getElementById 的派发路径测试。setupDOM 清空。
var __idRegistry = {};

// 从 innerHTML 字符串剥离标签，得到纯文本（粗略模拟浏览器 textContent 对 innerHTML 的解读）。
// 不解码实体（&amp; 等）—— 测试场景的回退文本不含实体，保持简单。
function stripTags(html) {
  return String(html == null ? '' : html).replace(/<[^>]*>/g, '');
}

// 类 NodeList 代理处理器：只放真实 NodeList 拥有的成员，数组方法一律 undefined
var _nodeListHandler = {
  get: function (target, prop) {
    if (prop === Symbol.iterator) return target[Symbol.iterator].bind(target);
    if (prop === 'length') return target.length;
    if (prop === 'item') return function (i) { return target[i] != null ? target[i] : null; };
    if (prop === 'forEach' || prop === 'entries' || prop === 'keys' || prop === 'values') {
      return target[prop].bind(target);
    }
    if (typeof prop === 'string' && /^\d+$/.test(prop)) return target[prop];
    return undefined;
  },
  set: function (target, prop, value) {
    if (typeof prop === 'string' && /^\d+$/.test(prop)) { target[prop] = value; return true; }
    return false;
  },
};

function matches(child, selector) {  if (child.nodeType !== 1) return false;
  var remaining = selector;
  // tag 部分
  var tagMatch = remaining.match(/^[a-zA-Z][a-zA-Z0-9]*/);
  var tag = tagMatch ? tagMatch[0].toLowerCase() : null;
  if (tag) {
    var ctag = (child._rawTag || child.tagName || '').toLowerCase();
    if (ctag !== tag) return false;
    remaining = remaining.slice(tagMatch[0].length);
  }
  // 属性部分（可以有多个，可与 class 任意交错：.foo[x=1][y=2] / [x=1].foo 均支持）
  // 支持 [attr]（存在性）、[attr="v"]（引号等值）、[attr=v]（裸值等值，CSS 规范等同引号形式）
  var attrRe = /\[([^\]=]+)(?:(=)(?:"([^"]*)"|([^\]]*)))?\]/g;
  var m;
  while ((m = attrRe.exec(remaining)) !== null) {
    var aKey = m[1];
    var hasEq = m[2];
    var aValQuoted = m[3];
    var aValBare = m[4];
    if (hasEq) {
      var aVal = aValQuoted !== undefined ? aValQuoted : aValBare;
      if (child.attributes[aKey] !== aVal) return false;
    } else {
      if (!(aKey in child.attributes)) return false;
    }
  }
  // class 部分（支持多个 .foo，任意位置；先剥离 [attr] 块，避免值内的 `.` 被误当 class）
  var noAttr = selector.replace(/\[[^\]]*\]/g, '');
  var clsRe = /\.([^.\\\[\]]+)/g;
  var cm;
  while ((cm = clsRe.exec(noAttr)) !== null) {
    var cls = cm[1];
    if (!child.className || child.className.split(' ').indexOf(cls) === -1) return false;
  }
  return true;
}

function createElement(tag) {
  var el = {
    tagName: tag.toUpperCase(),
    _rawTag: tag,
    nodeType: 1,
    className: '',
    _cn: [],          // childNodes 后备数组（内部用）；对外 childNodes 是 NodeList 代理
    children: [],
    attributes: {},
    // 表单控件 IDL 默认值（与浏览器一致）：input/textarea/select 的 .checked 默认 false。
    checked: false,
    style: {
      _prio: {},
      setProperty(key, value, prio) { this[key] = value; if (prio) { this._prio[key] = prio; } else { delete this._prio[key]; } },
      getPropertyValue(key) { return this[key] || ''; },
      getPropertyPriority(key) { return this._prio[key] || ''; },
    },
    _events: {},
    _slot: null,
    _tokuiType: null,
    _tokuiBound: false,
    _tokuiClickBound: false,
    _variantTarget: null,
    parentNode: null,

    setAttribute(key, value) {
      this.attributes[key] = String(value);
      if (key === 'class') this.className = String(value);
      if (key === 'id') {
        __idRegistry[String(value)] = this; // 登记，供 document.getElementById 查
      }
      // 表单控件 IDL 属性反射（真实浏览器行为）：setAttribute 同步到 .value/.name/.type/.checked
      // 供 form 组件测试直接读 input.checked / input.name / input.value（与浏览器一致）。
      if (key === 'name' || key === 'value' || key === 'type') {
        this[key] = String(value);
      }
      if (key === 'checked') {
        this.checked = true;
      }
    },
    getAttribute(key) {
      return this.attributes.hasOwnProperty(key) ? this.attributes[key] : null;
    },
    hasAttribute(key) {
      return key in this.attributes;
    },
    removeAttribute(key) {
      delete this.attributes[key];
      if (key === 'class') this.className = '';
      if (key === 'id') delete this.id;
    },
    appendChild(child) {
      if (child && typeof child === 'object') {
        this._cn.push(child);
        if (child.nodeType === 1) this.children.push(child);
        child.parentNode = this;
      }
      return child;
    },
    removeChild(child) {
      var idx = this._cn.indexOf(child);
      if (idx > -1) this._cn.splice(idx, 1);
      idx = this.children.indexOf(child);
      if (idx > -1) this.children.splice(idx, 1);
      if (child.parentNode === this) child.parentNode = null;
      return child;
    },
    insertBefore(newNode, referenceNode) {
      if (!newNode || typeof newNode !== 'object') return newNode;
      // 若 newNode 已有父，先从原父移除（真实 DOM 语义）
      if (newNode.parentNode && newNode.parentNode.removeChild) {
        newNode.parentNode.removeChild(newNode);
      }
      var idx = referenceNode ? this._cn.indexOf(referenceNode) : this._cn.length;
      if (idx === -1) idx = this._cn.length;
      this._cn.splice(idx, 0, newNode);
      // 重建元素子节点列表（仅 nodeType===1，按 childNodes 顺序）
      this.children = this._cn.filter(function (c) { return c && c.nodeType === 1; });
      newNode.parentNode = this;
      return newNode;
    },
    addEventListener(type, fn) {
      if (!this._events[type]) this._events[type] = [];
      this._events[type].push(fn);
    },
    removeEventListener(type, fn) {
      if (!this._events[type]) return;
      var idx = this._events[type].indexOf(fn);
      if (idx > -1) this._events[type].splice(idx, 1);
    },
    querySelector(selector) {
      for (var i = 0; i < this.childNodes.length; i++) {
        var child = this.childNodes[i];
        if (matches(child, selector)) return child;
        if (child.querySelector) {
          var found = child.querySelector(selector);
          if (found) return found;
        }
      }
      return null;
    },
    querySelectorAll(selector) {
      var results = [];
      for (var i = 0; i < this.childNodes.length; i++) {
        var child = this.childNodes[i];
        if (matches(child, selector)) results.push(child);
        if (child.querySelectorAll) {
          var nested = child.querySelectorAll(selector);
          if (nested && nested.length) results = results.concat(nested);
        }
      }
      return results;
    },
    closest(selector) {
      var node = this;
      while (node) {
        if (matches(node, selector)) return node;
        node = node.parentNode;
      }
      return null;
    },
    contains(child) {
      for (var i = 0; i < this.childNodes.length; i++) {
        if (this.childNodes[i] === child) return true;
        if (this.childNodes[i].contains && this.childNodes[i].contains(child)) return true;
      }
      return false;
    },
    classList: {
      add(cls) {
        var parts = el.className.split(' ').filter(Boolean);
        if (parts.indexOf(cls) === -1) { parts.push(cls); el.className = parts.join(' '); el.setAttribute('class', el.className); }
      },
      remove(cls) {
        var parts = el.className.split(' ').filter(function(c) { return c !== cls; });
        el.className = parts.join(' ');
        el.setAttribute('class', el.className);
      },
      contains(cls) {
        var parts = el.className.split(' ').filter(Boolean);
        return parts.indexOf(cls) !== -1;
      },
      toggle(cls) {
        if (this.contains(cls)) {
          this.remove(cls);
          return false;
        } else {
          this.add(cls);
          return true;
        }
      }
    }
  };

  // textContent / innerHTML：用 getter/setter 模拟浏览器行为。
  // - getter：优先 innerHTML 剥标签；其次聚合 childNodes（文本节点 + 元素子节点递归）；最后回退直接赋值。
  // - setter：直接赋值存 _textContent（不清 childNodes，兼容"先赋值后 appendChild"的写法）。
  var _textContent = '';
  var _innerHTML = '';
  Object.defineProperty(el, 'textContent', {
    configurable: true,
    get() {
      if (_innerHTML) return stripTags(_innerHTML);
      if (el.childNodes && el.childNodes.length) {
        var out = '';
        for (var i = 0; i < el.childNodes.length; i++) {
          var c = el.childNodes[i];
          out += (c && c.textContent != null) ? c.textContent : '';
        }
        return out;
      }
      return _textContent;
    },
    set(v) {
      // 真实 DOM 语义：textContent setter 以单个文本节点替换全部子节点。
      // 这样"先 textContent='JavaScript' 再 appendChild(按钮)"会得到 [文本节点, 按钮]，
      // getter 聚合出 'JavaScript×'，与浏览器一致。
      _textContent = String(v == null ? '' : v);
      _innerHTML = '';
      var tn = createTextNode(_textContent);
      tn.parentNode = el;
      el.childNodes = [tn];
      el.children = [];
    },
  });
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return _innerHTML; },
    // 浏览器语义：innerHTML setter 用（解析后的）新子节点替换全部旧子节点。
    // mock 不解析 HTML，但必须清空 childNodes/children——否则 innerHTML='' 后旧节点残留，
    // 与浏览器不一致（rerender() 等依赖 innerHTML='' 清容器的场景会节点翻倍）。
    set(v) {
      _innerHTML = String(v == null ? '' : v);
      _textContent = '';
      el.childNodes = [];
      el.children = [];
    },
  });
  // childNodes 访问器：对外暴露类 NodeList 代理（保真真实 DOM）——
  // 只有 length/数字索引/item/forEach/entries/keys/values/Symbol.iterator；
  // indexOf/push/splice/map/filter/slice 等数组方法一律 undefined，
  // 误用者在测试期即炸 "xxx is not a function"（真实浏览器同款报错），
  // 防止「mock 里是数组能过、浏览器里 NodeList 崩」的盲区 bug。
  // setter 兼容"整体替换子节点"的内部写法（textContent/innerHTML setter 用）。
  Object.defineProperty(el, 'childNodes', {
    configurable: true,
    get() { return new Proxy(el._cn, _nodeListHandler); },
    set(v) { el._cn = Array.prototype.slice.call(v || []); },
  });
  // id 访问器：直接 el.id = x 与 setAttribute('id', x) 都走 setAttribute → 登记 idRegistry。
  // 真实浏览器两者等价；slider/rate/numinput 等用 hidden.id = ... 直接赋值，需此访问器捕获。
  Object.defineProperty(el, 'id', {
    configurable: true,
    enumerable: true,
    get() { return this.attributes.id || ''; },
    set(v) { this.setAttribute('id', v); },
  });
  // parentElement：父为元素节点时返 parentNode，否则 null（与真实 DOM 一致）。
  // upd 派发等需向上 walk 元素链的逻辑用它。
  Object.defineProperty(el, 'parentElement', {
    configurable: true,
    get() { return (this.parentNode && this.parentNode.nodeType === 1) ? this.parentNode : null; },
  });
  // name 访问器：与真实 DOM IDL 反射一致——input.name = x 写入 attribute，
  // 使 querySelectorAll('[name=x]') 能命中（流式 checkbox/radio 组注入共享 name 依赖此）。
  // 注意：setter 必须直写 this.attributes，不可走 setAttribute——
  // setAttribute 内有 this.name = value 的 IDL 反射，互调会无限递归。
  Object.defineProperty(el, 'name', {
    configurable: true,
    enumerable: true,
    get() { return this.attributes.name || ''; },
    set(v) { this.attributes.name = String(v); },
  });

  return el;
}

function createTextNode(text) {
  return { nodeType: 3, textContent: text, parentNode: null };
}

function createElementNS(ns, tag) {
  var el = createElement(tag);
  el._namespaceURI = ns;
  return el;
}

function createDocumentFragment() {
  return {
    nodeType: 11,
    childNodes: [],
    children: [],
    parentNode: null,
    appendChild(child) {
      if (child && typeof child === 'object') {
        this.childNodes.push(child);
        if (child.nodeType === 1) this.children.push(child);
        child.parentNode = this;
      }
      return child;
    }
  };
}

function setupDOM() {
  __idRegistry = {}; // 每次装载体清空，隔离用例
  global.document = {
    createElement: createElement,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    createDocumentFragment: createDocumentFragment,
    addEventListener: function() {},
    removeEventListener: function() {},
    querySelectorAll: function() { return []; },
    getElementById: function(id) { return __idRegistry[id] || null; }
  };
  global.FormData = MockFormData;
}

function teardownDOM() {
  delete global.document;
  delete global.FormData;
  __idRegistry = {};
}

/**
 * 收集表单内「成功控件」的 [name, value] 对，模拟浏览器 form 提交语义：
 * - input[type=checkbox|radio]：仅 checked 才提交（值缺省为 'on'）
 * - input[type=submit|button|reset|image|file]：不提交
 * - 其余 input（text/hidden/password 等）/ textarea / select：提交其值
 * - 无 name 或 disabled 的控件跳过
 * 供 _collectFormData 在 Node 测试环境跑通（mock 无原生 FormData）。
 */
function collectFormControls(form) {
  var out = [];
  function walk(node) {
    if (!node || node.nodeType !== 1) return;
    var tag = (node.tagName || '').toLowerCase();
    var disabled = node.attributes && node.attributes.disabled !== undefined;
    if (tag === 'input') {
      var type = (node.type || node.getAttribute('type') || 'text').toLowerCase();
      var name = node.name || node.getAttribute('name');
      if (!name || disabled) { return; }
      if (type === 'checkbox' || type === 'radio') {
        if (node.checked) out.push([name, node.value != null ? String(node.value) : 'on']);
      } else if (type === 'submit' || type === 'button' || type === 'reset' || type === 'image' || type === 'file') {
        // 浏览器不提交这些（mock 简化）
      } else {
        out.push([name, node.value != null ? String(node.value) : '']);
      }
      return; // input 无元素子节点
    }
    if (tag === 'textarea') {
      var tn = node.name || node.getAttribute('name');
      if (tn && !disabled) out.push([tn, node.value != null ? String(node.value) : (node.textContent || '')]);
      return;
    }
    if (tag === 'select') {
      var sn = node.name || node.getAttribute('name');
      if (sn && !disabled) {
        var selVal = '';
        (node.childNodes || []).forEach(function (c) {
          if (c && c.tagName === 'OPTION' && c.selected) selVal = c.value != null ? String(c.value) : (c.textContent || '');
        });
        out.push([sn, selVal]);
      }
      return;
    }
    (node.childNodes || []).forEach(walk);
  }
  walk(form);
  return out;
}

class MockFormData {
  constructor(form) { this._pairs = form ? collectFormControls(form) : []; }
  entries() { return this._pairs.slice(); }
  [Symbol.iterator]() { return this._pairs[Symbol.iterator](); }
  get(name) { var p = this._pairs.find(function (x) { return x[0] === name; }); return p ? p[1] : null; }
  getAll(name) { return this._pairs.filter(function (x) { return x[0] === name; }).map(function (x) { return x[1]; }); }
}

module.exports = { setupDOM, teardownDOM, createElement, createTextNode };
