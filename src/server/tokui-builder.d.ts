// Type definitions for TokUIBuilder
// 链式 DSL 生成器 / Chainable DSL builder (server-side)
// Public API mirrors src/server/tokui-builder.js
//
// 注：builder 有 ~170 个对应 DSL 组件的链式方法，本声明覆盖核心原语
// （_open / _selfClosing）与常用组件。**未列出**的组件方法可用这两个
// 原语等价表达，或临时 `as any`：
//   b._selfClosing('gantt', null, { data: [...] })   // 自闭合组件
//   b._open('drawer', { tt: '抽屉' }) ... b.end()    // 容器组件

/** 组件属性键值表（DSL 属性，值任意） */
export type BuilderAttrs = Record<string, any>;

/**
 * TokUI 构建器 —— 链式生成 TokUI DSL 字符串
 *
 * @example
 * const b = new TokUIBuilder();
 * b.card({ tt: '标题' }).h2('内容').p('描述').end();
 * const dsl = b.toString(); // '[card tt:标题][h2 内容][p 描述][/card]'
 */
export declare class TokUIBuilder {
  constructor();

  // —— 终端方法（输出）——
  /** 输出完整 DSL 字符串（自动补全未关闭容器） */
  toString(): string;
  /** 输出 DSL 片段数组（自动补全未关闭容器） */
  toChunks(): string[];

  // —— 容器栈控制 ——
  /** 关闭最近一个未关闭容器 */
  end(): this;
  /** 关闭全部未关闭容器 */
  endAll(): this;
  /** 清空构建器状态 */
  reset(): this;

  // —— 底层原语（任意组件的强类型逃逸口）——
  /** 容器组件开标签 */
  _open(type: string, attrs?: BuilderAttrs): this;
  /** 自闭合组件 */
  _selfClosing(type: string, content?: string | null, attrs?: BuilderAttrs): this;
  /** 补全未关闭容器并返回片段数组 */
  _finalizeChunks(): string[];

  // —— 标题 / 文本（content-first）——
  h1(content?: string, attrs?: BuilderAttrs): this;
  h2(content?: string, attrs?: BuilderAttrs): this;
  h3(content?: string, attrs?: BuilderAttrs): this;
  h4(content?: string, attrs?: BuilderAttrs): this;
  h5(content?: string, attrs?: BuilderAttrs): this;
  h6(content?: string, attrs?: BuilderAttrs): this;
  p(content?: string, attrs?: BuilderAttrs): this;
  tag(content?: string, attrs?: BuilderAttrs): this;

  // —— 自闭合叶子（attrs-only）——
  dv(attrs?: BuilderAttrs): this;
  a(attrs?: BuilderAttrs): this;
  img(attrs?: BuilderAttrs): this;
  input(attrs?: BuilderAttrs): this;
  pwd(attrs?: BuilderAttrs): this;
  btn(attrs?: BuilderAttrs): this;
  checkbox(attrs?: BuilderAttrs): this;
  toggle(attrs?: BuilderAttrs): this;
  col(attrs?: BuilderAttrs): this;
  tcol(attrs?: BuilderAttrs): this;
  opt(attrs?: BuilderAttrs): this;

  // —— 容器（attrs-only，需 end() 闭合）——
  card(attrs?: BuilderAttrs): this;
  ft(attrs?: BuilderAttrs): this;
  form(attrs?: BuilderAttrs): this;
  table(attrs?: BuilderAttrs): this;
  tbody(attrs?: BuilderAttrs): this;
  select(attrs?: BuilderAttrs): this;
  radio(attrs?: BuilderAttrs): this;
  btngroup(attrs?: BuilderAttrs): this;
  picker(attrs?: BuilderAttrs): this;
  toggleGroup(attrs?: BuilderAttrs): this;

  // —— 表格辅助 ——
  thead(attrs?: BuilderAttrs): this;
  theadCols(cols: any[]): this;
  tr(cells: any[], attrs?: BuilderAttrs): this;

  // —— 代码块（容器）——
  code(attrs?: BuilderAttrs): this;
}
