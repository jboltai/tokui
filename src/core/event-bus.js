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
 * 事件总线对象（单例模式）
 * handlers 存储所有已注册的事件处理函数。
 */
const TokUIEventBus = {
  /** 已注册的事件处理函数映射表 */
  handlers: {},

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
   * @param {string} name - 处理函数名称
   * @returns {Function|null} 处理函数，未找到返回 null
   */
  getHandler(name) {
    return this.handlers[name] || null;
  },

  /**
   * 按名触发已注册的处理函数（组件内部直调用，如 popconfirm 确认钮）
   * 与 renderer clk 分发同签名：(data, event, element)；组件内直调无 DOM 事件上下文，后两参为 null。
   * 未注册时告警并静默返回（不抛错——渲染期告警优于运行时崩）。
   *
   * @param {string} name - 处理函数名称
   * @param {*} [data] - 透传给 handler 的第一参
   */
  emit(name, data) {
    var fn = this.getHandler(name);
    // typeof 检查而非真值判断：'__proto__' 经原型链查到 Object.prototype（真值但非函数），
    // 直接调用会 TypeError（危险名称在 registerHandler 被拦，handlers 里永不会有，但读取会命中原型链）
    if (typeof fn !== 'function') {
      console.warn('TokUI EventBUS: emit 未注册的 handler "' + name + '"（需先 TokUI.registerHandler），事件已丢弃');
      return;
    }
    fn(data != null ? data : null, null, null);
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
