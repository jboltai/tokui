import type { Component, Ref } from 'vue';
import type { TokUI as TokUIClass, TokUIEventCallback } from '@jboltai/tokui';

export interface TokUIViewProps {
  dsl?: string;
  theme?: string;
  onEvent?: TokUIEventCallback;
}

export declare const TokUIView: Component;

export interface UseTokUIStreamReturn {
  container: Ref<HTMLDivElement | null>;
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
