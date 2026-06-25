import type * as React from 'react';
import type { TokUI as TokUIClass, TokUIEventCallback } from '@jboltai/tokui';

export interface TokUIViewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** DSL 文本，变化时重新渲染 */
  dsl?: string;
  /** 主题名（如 'dark'） */
  theme?: string;
  /** 事件回调，签名 (eventName, data) */
  onEvent?: TokUIEventCallback;
}

export declare const TokUIView: React.FC<TokUIViewProps>;

export interface UseTokUIStreamReturn {
  ref: React.RefObject<HTMLDivElement>;
  ui: React.MutableRefObject<TokUIClass | null>;
  start: (container?: HTMLDivElement) => void;
  feed: (chunk: string) => void;
  end: () => void;
  connect: (url: string, body?: Record<string, any>) => Promise<void>;
  disconnect: () => void;
}

export declare function useTokUIStream(options?: {
  theme?: string;
  onEvent?: TokUIEventCallback;
}): UseTokUIStreamReturn;

export default TokUIView;
