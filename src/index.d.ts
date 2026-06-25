// Type definitions for TokUI
// 零依赖流式 UI 描述与渲染框架 / Zero-dependency streaming UI description & rendering framework
// Public API mirrors src/lib.js

/**
 * 事件处理器函数签名
 * @param data  - DSL 中 clk/sub 属性携带的数据（任意结构）
 * @param event - 原生 DOM 事件对象
 * @param element - 触发事件的 DOM 元素
 */
export type TokUIHandlerFn = (data: any, event: Event, element: HTMLElement) => void;

/**
 * onEvent 回调签名
 * @param eventName - 事件名，如 'streamEnd'
 * @param data      - 事件数据
 */
export type TokUIEventCallback = (eventName: string, data: any) => void;

/**
 * TokUI 构造选项
 */
export interface TokUIOptions {
  /** 渲染目标容器（CSS 选择器或 DOM 元素） */
  container?: string | HTMLElement | null;
  /** 主题名称，如 'default' / 'dark'，默认 'default' */
  theme?: string;
  /** 是否启用流式渲染模式，默认 true */
  streaming?: boolean;
  /** 事件回调，如接收到 ('streamEnd', {}) */
  onEvent?: TokUIEventCallback | null;
}

/**
 * TokUI 核心类
 *
 * 三种用法：
 *   render(dsl)               — 一次性渲染
 *   startStream() + feed(chk) — 手动流式喂入
 *   connect(url, body)        — SSE 自动连接并流式渲染
 *
 * @example
 * const ui = new TokUI({ container: '#app', theme: 'dark' });
 * ui.connect('/api/chat/stream', { prompt: 'hi' });
 */
export class TokUI {
  /** 合并后的运行时选项 */
  options: Required<Pick<TokUIOptions, 'theme' | 'streaming'>> & TokUIOptions;

  /** 主容器 DOM */
  container: HTMLElement | null;

  /** 流式目标容器 */
  streamingContainer: HTMLElement | null;

  constructor(options?: TokUIOptions);

  /** 一次性渲染完整 DSL 文本到容器 */
  render(tokuiString: string, targetContainer?: HTMLElement): void;

  /** 开始流式渲染（初始化流式解析器） */
  startStream(targetContainer?: HTMLElement): void;

  /** 向流式解析器喂入一段 DSL 文本片段 */
  feed(chunk: string): void;

  /** 结束流式渲染（刷新缓冲区并重置插槽栈） */
  endStream(): void;

  /** 断开 SSE 连接并清理流式容器 */
  disconnect(): void;

  /** 通过 SSE 连接服务端并流式渲染，返回 fetch Promise */
  connect(url: string, body?: Record<string, any>): Promise<void>;
}

/**
 * 注册事件处理函数（与 DSL 中 clk:/sub: 绑定对应）
 * @param name - 处理函数名称
 * @param fn   - 处理函数
 */
export declare function registerHandler(name: string, fn: TokUIHandlerFn): void;

/** 移除已注册的事件处理函数 */
export declare function removeHandler(name: string): void;

/** 设置当前主题（更新容器 data-tokui-theme 属性） */
export declare function setTheme(themeName: string): void;

/** 获取当前主题名称 */
export declare function getTheme(): string;

/**
 * DOM 创建快捷方法
 * @param tag         - 标签名
 * @param attrs       - 属性键值表（on* / formaction 会被过滤防 XSS）
 * @param textContent - 文本内容
 */
export declare function el(
  tag: string,
  attrs?: Record<string, unknown>,
  textContent?: string
): HTMLElement;

/** 公共命名空间对象（ESM default 导出） */
export interface TokUINamespace {
  TokUI: typeof TokUI;
  registerHandler: typeof registerHandler;
  removeHandler: typeof removeHandler;
  setTheme: typeof setTheme;
  getTheme: typeof getTheme;
  el: typeof el;
}

declare const TokUINamespace: TokUINamespace;
export default TokUINamespace;
