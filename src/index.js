/**
 * TokUI 主入口模块
 * 整合解析器、渲染器、事件总线、主题管理和组件注册，
 * 对外暴露统一的 TokUI 类。
 *
 * 使用方式：
 *   const tokui = new TokUI({ container: '#app' });
 *   tokui.render('[h1 Hello]');                   // 一次性渲染
 *   tokui.startStream(); tokui.feed('[h1 Hi]');    // 流式渲染
 *   tokui.connect('/api/chat', { prompt: '...' }); // SSE 连接
 */
'use strict';

(function() {
  var _TokUIParser, _TokUIRenderer, _el, _TokUIEventBus, _TokUITheme, _TokUII18n, _registerAll;
  var _resolved = false;

  // 依赖延迟解析（运行期，非模块求值期）：避免 SSR 环境 import 即崩。
  // 三态：Node CJS(require) / 浏览器(window.TokUI._internal) / SSR(无 window → 依赖保持 undefined)。
  function _resolve() {
    if (_resolved) return;
    _resolved = true;
    if (typeof require === 'function') {
      var _parser = require('./core/parser');
      _TokUIParser = _parser.TokUIParser;
      var _renderer = require('./core/renderer');
      _TokUIRenderer = _renderer.TokUIRenderer;
      _el = _renderer.el;
      _TokUIEventBus = require('./core/event-bus');
      _TokUITheme = require('./core/theme');
      _TokUII18n = require('./core/i18n');
      _registerAll = require('./components/index').registerAllComponents;
    } else if (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal) {
      _TokUIParser = window.TokUI._internal.TokUIParser;
      _TokUIRenderer = window.TokUI._internal.TokUIRenderer;
      _el = window.TokUI._internal.el;
      _TokUIEventBus = window.TokUI._internal.TokUIEventBus;
      _TokUITheme = window.TokUI._internal.TokUITheme;
      _TokUII18n = window.TokUI._internal.TokUII18n;
      _registerAll = window.TokUI._internal.registerAllComponents;
    }
    // else: SSR 无 window —— 依赖保持 undefined，构造/渲染时给出明确报错
  }

  /**
   * TokUI 核心类
   * 提供一次性渲染、流式渲染和 SSE 连接三种使用方式。
   */
  class TokUIClass {
    /**
     * @param {Object} [options] - 配置选项
     * @param {string|HTMLElement} [options.container=null] - 渲染目标容器（选择器或 DOM 元素）
     * @param {string} [options.theme='default'] - 主题名称
     * @param {string} [options.locale] - 界面语言（如 'zh-CN' / 'en-US' / 'en'；缺省自动探测 documentElement.lang / navigator.language）
     * @param {boolean} [options.streaming=true] - 是否启用流式渲染模式
     * @param {Function} [options.onEvent=null] - 事件回调（如 'streamEnd'）
     */
    constructor(options) {
      _resolve();
      this.options = Object.assign({
        container: null,
        theme: 'default',
        locale: null,
        streaming: true,
        onEvent: null
      }, options);

      // 初始化渲染器并注册所有组件
      this.renderer = new _TokUIRenderer(_TokUIEventBus);
      _registerAll(this.renderer);

      this.parser = null;
      this.container = null;
      this.streamingContainer = null;
      // 最近一次渲染的 DSL 与目标容器缓存——供 rerender() 就地重画（如 setLocale 后切语言）
      this._lastDsl = null;
      this._lastTarget = null;

      // 显式 locale 覆盖自动探测（i18n 模块求值时已按 documentElement.lang/navigator.language 初始化）
      if (this.options.locale && _TokUII18n) {
        _TokUII18n.setLocale(this.options.locale);
      }

      // 解析并初始化容器
      if (this.options.container && typeof document !== 'undefined') {
        this.container = typeof this.options.container === 'string'
          ? document.querySelector(this.options.container)
          : this.options.container;
        _TokUITheme.init(this.container);
        // 总是调 setTheme（包括 'default'）：init() 会把主题单例上「上一次实例残留的
        // currentTheme」写到新容器，若这里对 'default' 跳过，连续构造 dark → default 实例时，
        // 后者会残留 'dark'（ThemeShowcase 切回 default 不生效即此因）。setTheme 会把
        // currentTheme 与容器属性一并刷新到目标主题。
        if (this.options.theme) {
          _TokUITheme.setTheme(this.options.theme);
        }
      }

      // 在浏览器环境下挂载全局 API
      if (typeof window !== 'undefined') {
        window.TokUI._instance = this;
        window.TokUI._internal.el = _el;
        window.TokUI.registerHandler = _TokUIEventBus.registerHandler.bind(_TokUIEventBus);
        window.TokUI.setTheme = _TokUITheme.setTheme.bind(_TokUITheme);
        if (_TokUII18n) {
          window.TokUI.setLocale = _TokUII18n.setLocale.bind(_TokUII18n);
          window.TokUI.getLocale = _TokUII18n.getLocale.bind(_TokUII18n);
          window.TokUI.registerLocale = _TokUII18n.registerLocale.bind(_TokUII18n);
        }
        // showNotification 由 notification 组件注册到 window.TokUI.showNotification
        // 此处确保 TokUI 对象已初始化
        if (!window.TokUI.showNotification) {
          window.TokUI.showNotification = function() {};
        }
      }
    }

    /**
     * 一次性渲染 TokUI 字符串
     * 解析完整的 TokUI DSL 文本并渲染到指定容器。
     *
     * @param {string} tokuiString - TokUI DSL 文本
     * @param {HTMLElement} [targetContainer] - 目标容器（默认使用构造函数中的 container）
     */
    render(tokuiString, targetContainer) {
      const container = targetContainer || this.container;
      if (!container) throw new Error('TokUI: no container specified');
      this._lastDsl = tokuiString;
      this._lastTarget = container;
      const parser = new _TokUIParser((node) => {
        this.renderer.mount(node, container);
      });
      parser.parse(tokuiString);
    }

    /**
     * 用当前 locale / theme 就地重画最近一次渲染的内容。
     * 典型场景：setLocale() 切语言后调用，让已渲染 DOM 的 chrome 文案（aria-label /
     * placeholder / 空态 / 分页总数 等）即时切到新语言——无需应用自行缓存 DSL。
     *
     * 内部依据缓存的上次 DSL（render() 一次性 / feed() 累积）清空目标容器后重新一次性渲染。
     * 注：流式渲染进行中调用会清空当前并按已到达的 DSL 重画（一般待 endStream 后调用）。
     *
     * @param {HTMLElement} [targetContainer] - 可选，覆盖目标容器；缺省用最近一次的容器
     * @returns {boolean} 是否成功重画（无缓存内容或无容器则 false）
     */
    rerender(targetContainer) {
      var dsl = this._lastDsl;
      if (!dsl) return false;
      var target = targetContainer || this._lastTarget || this.container;
      if (!target) return false;
      // 清空后一次性重画（render() 会刷新 _lastDsl/_lastTarget，locale 走全局 setLocale）
      if (target.innerHTML !== undefined) target.innerHTML = '';
      this.render(dsl, target);
      return true;
    }

    /**
     * 开始流式渲染
     * 初始化流式解析器，后续通过 feed() 逐步输入数据。
     *
     * @param {HTMLElement} [targetContainer] - 目标容器
     */
    startStream(targetContainer) {
      this.streamingContainer = targetContainer || this.container;
      if (!this.streamingContainer) throw new Error('TokUI: no container specified');
      this._lastDsl = '';                 // 重置累积，供 rerender() 重放本次流式内容
      this._lastTarget = this.streamingContainer;
      var self = this;
      var useStreaming = this.options.streaming !== false;
      this.parser = new _TokUIParser(function(node) {
        if (useStreaming) {
          self.renderer.mountStreaming(node, self.streamingContainer);
        } else {
          self.renderer.mount(node, self.streamingContainer);
        }
      }, { streaming: useStreaming });
      this.parser.startStream();
    }

    /**
     * 向流式解析器输入数据片段
     *
     * @param {string} chunk - TokUI DSL 文本片段
     */
    feed(chunk) {
      if (this.parser) {
        this._lastDsl = (this._lastDsl || '') + chunk;   // 累积原始 DSL，供 rerender() 重放
        this.parser.feed(chunk);
      } else {
        console.warn('TokUI: feed() called before startStream()');
      }
    }

    /**
     * 断开 SSE 连接
     * 终止正在进行的 fetch 请求并结束流式渲染。
     */
    disconnect() {
      if (this._abortController) {
        this._abortController.abort();
        this._abortController = null;
      }
      this.endStream();
      // 清理 connect() 创建的流式容器
      if (this._streamTarget && this._streamTarget.parentNode) {
        this._streamTarget.parentNode.removeChild(this._streamTarget);
      }
      this._streamTarget = null;
    }

    /**
     * 结束流式渲染
     * 刷新解析器缓冲区并重置渲染器插槽栈。
     */
    endStream() {
      if (this.parser) {
        this.parser.endStream();
        this.parser = null;
      }
      if (this.renderer.slotStack.length) {
        this.renderer.resetSlotStack();
      }
    }

    /**
     * 通过 SSE（Server-Sent Events）连接服务器并流式渲染
     * 向服务器发送 POST 请求，读取 SSE 响应流，
     * 解析 data 行中的 JSON 数据并 feed 给解析器。
     *
     * @param {string} url - SSE 服务端地址
     * @param {Object} [body] - 请求体（JSON 序列化）
     * @returns {Promise} fetch 请求的 Promise
     */
    connect(url, body) {
      this._abortController = new AbortController();
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
        signal: this._abortController.signal
      }).then(response => {
        if (!response.ok) {
          throw new Error('TokUI connect: HTTP ' + response.status);
        }
        if (!response.body) {
          throw new Error('TokUI connect: response body is null');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // 创建独立的流式渲染容器（清理旧容器）
        if (this._streamTarget && this._streamTarget.parentNode) {
          this._streamTarget.parentNode.removeChild(this._streamTarget);
        }
        const msgContainer = document.createElement('div');
        msgContainer.className = 'tokui-stream-target';
        this._streamTarget = msgContainer;
        if (this.container) {
          this.container.appendChild(msgContainer);
        }

        this.startStream(msgContainer);

        var self = this;

        // 递归读取响应流
        const processChunk = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              self.endStream();
              if (self.options.onEvent) {
                self.options.onEvent('streamEnd', {});
              }
              return;
            }

            // 解码并按行分割处理 SSE 数据
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // 最后一行可能不完整，保留在缓冲区

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // SSE 结束标记
                  self.endStream();
                  if (self.options.onEvent) {
                    self.options.onEvent('streamEnd', {});
                  }
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.tokui) {
                    self.feed(parsed.tokui);
                  }
                } catch (e) {
                  console.warn('TokUI: malformed JSON in SSE data', e.message);
                }
              }
            }

            processChunk();
          });
        };

        processChunk();
      });
    }
  }

  // 兼容浏览器和 Node.js 环境导出
  if (typeof window !== 'undefined') {
    window.TokUI = window.TokUI || {};
    window.TokUI.TokUI = TokUIClass;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokUIClass;
  }
})();
