/**
 * 最小 DOM mock
 * 模拟浏览器 DOM API 的核心子集，用于在 Node.js 环境中测试 renderer/event-bus/theme。
 */
'use strict';

// 从 innerHTML 字符串剥离标签，得到纯文本（粗略模拟浏览器 textContent 对 innerHTML 的解读）。
// 不解码实体（&amp; 等）—— 测试场景的回退文本不含实体，保持简单。
function stripTags(html) {
  return String(html == null ? '' : html).replace(/<[^>]*>/g, '');
}

function matches(child, selector) {
  if (child.nodeType !== 1) return false;
  var remaining = selector;
  // tag 部分
  var tagMatch = remaining.match(/^[a-zA-Z][a-zA-Z0-9]*/);
  var tag = tagMatch ? tagMatch[0].toLowerCase() : null;
  if (tag) {
    var ctag = (child._rawTag || child.tagName || '').toLowerCase();
    if (ctag !== tag) return false;
    remaining = remaining.slice(tagMatch[0].length);
  }
  // 属性部分（可以有多个）
  var attrRe = /\[([^\]=]+)(?:="([^"]*)")?\]/g;
  var m;
  while ((m = attrRe.exec(remaining)) !== null) {
    var aKey = m[1];
    var aVal = m[2];
    if (aVal !== undefined) {
      if (child.attributes[aKey] !== aVal) return false;
    } else {
      if (!(aKey in child.attributes)) return false;
    }
  }
  // class 部分
  if (remaining && remaining.startsWith('.')) {
    var cls = remaining.slice(1);
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
    childNodes: [],
    children: [],
    attributes: {},
    style: {
      setProperty(key, value) { this[key] = value; },
      getPropertyValue(key) { return this[key] || ''; },
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
      if (key === 'id') this.id = String(value);
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
        this.childNodes.push(child);
        if (child.nodeType === 1) this.children.push(child);
        child.parentNode = this;
      }
      return child;
    },
    removeChild(child) {
      var idx = this.childNodes.indexOf(child);
      if (idx > -1) this.childNodes.splice(idx, 1);
      idx = this.children.indexOf(child);
      if (idx > -1) this.children.splice(idx, 1);
      if (child.parentNode === this) child.parentNode = null;
      return child;
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
    set(v) { _innerHTML = String(v == null ? '' : v); },
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
  global.document = {
    createElement: createElement,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    createDocumentFragment: createDocumentFragment,
    addEventListener: function() {},
    removeEventListener: function() {},
    querySelectorAll: function() { return []; }
  };
}

function teardownDOM() {
  delete global.document;
}

module.exports = { setupDOM, teardownDOM, createElement, createTextNode };
