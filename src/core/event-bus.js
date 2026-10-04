/**
 * TokUI 事件总线模块
 * 提供事件处理函数的注册、移除和查询机制。
 * 用于解耦组件渲染与交互逻辑：渲染器通过事件总线调用用户注册的处理函数。
 *
 * 使用方式：
 * 1. TokUI.registerHandler('handleLogin', (data, event, element) => { ... })
 * 2. 在 TokUI DSL 中通过 clk:handleLogin 或 sub:handleLogin 绑定
 */
'use strict';

/** 危险属性名（防止原型污染） */
const DANGEROUS_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * 解析带内联参数的 handler 引用："onDel?id=1&scene=list" → { name:'onDel', params:{id:'1',scene:'list'} }
 * 查询串风格：'?' 后按 '&' 分段，段内首个 '=' 分 k/v（URL decode，解码失败回退原串）；
 * 无 '=' 的段视为布尔开关（值 true）；键为空或危险名（原型污染防护）跳过。
 * 无 '?' 时原样返回且 params 为 null——旧 DSL 零开销零行为变化。
 *
 * @param {string} value - DSL 里 clk:/sub:/on: 的原始值
 * @returns {{name: string, params: Object|null}} name 为去掉参数段的 handler 名
 */
function parseHandlerRef(value) {
  var s = String(value);
  var qi = s.indexOf('?');
  if (qi < 0) return { name: s, params: null };
  var name = s.slice(0, qi);
  var query = s.slice(qi + 1);
  var params = null;
  if (query) {
    var parts = query.split('&');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      var eq = part.indexOf('=');
      var rawKey, rawVal, val;
      if (eq < 0) { rawKey = part; val = true; }
      else { rawKey = part.slice(0, eq); rawVal = part.slice(eq + 1); }
      var key;
      try { key = decodeURIComponent(rawKey); } catch (e) { key = rawKey; }
      if (!key || DANGEROUS_NAMES.has(key)) continue;
      if (val !== true) {
        try { val = decodeURIComponent(rawVal); } catch (e) { val = rawVal; }
      }
      if (!params) params = {};
      params[key] = val;
    }
  }
  return { name: name, params: params };
}

/**
 * 事件总线对象（单例模式）
 * handlers 存储所有已注册的事件处理函数。
 */
const TokUIEventBus = {
  /** 已注册的事件处理函数映射表 */
  handlers: {},

  /** 解析 "name?k=v" 式带参引用（renderer 分发路径与组件复用，规则见函数注释） */
  parseHandlerRef: parseHandlerRef,

  /**
   * 注册事件处理函数
   * @param {string} name - 处理函数名称（与 DSL 中 clk/sub 属性值对应）
   * @param {Function} fn - 处理函数 (data, event, element) => void
   */
  registerHandler(name, fn) {
    if (DANGEROUS_NAMES.has(name)) return;
    if (typeof fn !== 'function') {
      throw new TypeError('TokUI EventBUS: handler must be a function, got ' + typeof fn);
    }
    if (this.handlers[name]) {
      console.warn('TokUI EventBUS: handler "' + name + '" 已被覆盖');
    }
    this.handlers[name] = fn;
  },

  /**
   * 移除事件处理函数
   * @param {string} name - 要移除的处理函数名称
   */
  removeHandler(name) {
    delete this.handlers[name];
  },

  /**
   * 获取已注册的事件处理函数
   * 容忍带内联参数的引用（"onDel?id=1"）——只按 '?' 前的名称段查表，参数段由调用方（emit/renderer）处理
   * @param {string} name - 处理函数名称（可带 "?k=v" 参数段）
   * @returns {Function|null} 处理函数，未找到返回 null
   */
  getHandler(name) {
    var stored = typeof name === 'string' && name.indexOf('?') >= 0 ? parseHandlerRef(name).name : name;
    return this.handlers[stored] || null;
  },

  /**
   * 按名触发已注册的处理函数（组件内部直调用，如 popconfirm 确认钮）
   * 与 renderer clk 分发同签名：(data, event, element)；组件内直调无 DOM 事件上下文，后两参为 null。
   * 未注册时告警并静默返回（不抛错——渲染期告警优于运行时崩）。
   * 引用带 "?k=v" 内联参数时，参数浅合并进第一参（对象 payload 合并；null 时直接给参数对象）
   *
   * @param {string} name - 处理函数名称（可带 "?k=v" 参数段）
   * @param {*} [data] - 透传给 handler 的第一参
   */
  emit(name, data) {
    var ref = parseHandlerRef(name);
    var fn = this.handlers[ref.name];
    // typeof 检查而非真值判断：'__proto__' 经原型链查到 Object.prototype（真值但非函数），
    // 直接调用会 TypeError（危险名称在 registerHandler 被拦，handlers 里永不会有，但读取会命中原型链）
    if (typeof fn !== 'function') {
      console.warn('TokUI EventBUS: emit 未注册的 handler "' + ref.name + '"（需先 TokUI.registerHandler），事件已丢弃');
      return;
    }
    var payload = data != null ? data : null;
    if (ref.params) {
      payload = (payload && typeof payload === 'object') ? Object.assign({}, payload, ref.params) : ref.params;
    }
    fn(payload, null, null);
  },

  /**
   * 清除所有已注册的事件处理函数
   */
  clearAll() {
    this.handlers = {};
  },

  /**
   * 获取所有已注册的处理函数名称（只读）
   * @returns {string[]} 名称数组
   */
  getHandlerNames() {
    return Object.keys(this.handlers);
  }
};

// 兼容浏览器和 Node.js 环境导出
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.TokUIEventBus = TokUIEventBus;
  // 别名：组件内部直调（popconfirm/thumb/conv/attach/command 的 bus.emit）读此路径
  window.TokUI._internal.eventBus = TokUIEventBus;
  window.TokUI.registerHandler = TokUIEventBus.registerHandler.bind(TokUIEventBus);
  window.TokUI.removeHandler = TokUIEventBus.removeHandler.bind(TokUIEventBus);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokUIEventBus;
}
