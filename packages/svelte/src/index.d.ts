import type { TokUIEventCallback } from '@jboltai/tokui';

export interface TokuiActionOptions {
  dsl?: string;
  theme?: string;
  onEvent?: TokUIEventCallback;
}

/** Svelte action：<div use:tokui={{ dsl, theme }} /> */
export declare function tokui(
  node: HTMLElement,
  options?: TokuiActionOptions
): {
  update: (options: TokuiActionOptions) => void;
  destroy: () => void;
};

export default tokui;
