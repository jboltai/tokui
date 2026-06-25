import type { TokUI as TokUIClass } from '@jboltai/tokui';

/**
 * <tokui-view> 自定义元素。注册后可直接在 HTML / JSX / template 中使用。
 */
export class TokUIViewElement extends HTMLElement {
  render(dsl: string): void;
  startStream(): TokUIClass | null;
  feed(chunk: string): void;
  endStream(): void;
  connect(url: string, body?: Record<string, any>): Promise<void>;
}

/**
 * 注册自定义元素（默认 'tokui-view'）。
 * SSR 下不注册（customElements 不存在），仅返回类。
 */
export default function defineTokuiElement(name?: string): typeof TokUIViewElement;

export { defineTokuiElement };
