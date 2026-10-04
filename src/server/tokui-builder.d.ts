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
  affix(attrs?: BuilderAttrs): this;
  tour(attrs?: BuilderAttrs): this;
  previewGroup(attrs?: BuilderAttrs): this;

  // —— Phase 4 自闭合 ——
  segmented(attrs?: BuilderAttrs): this;
  colorPicker(attrs?: BuilderAttrs): this;
  anchor(attrs?: BuilderAttrs): this;
  lk(attrs?: BuilderAttrs): this;
  tourStep(attrs?: BuilderAttrs): this;

  // —— P2 组件 ——
  kbd(content?: string, attrs?: BuilderAttrs): this;
  editable(attrs?: BuilderAttrs): this;
  floatButton(attrs?: BuilderAttrs): this;
  masonry(attrs?: BuilderAttrs): this;
  scrollArea(attrs?: BuilderAttrs): this;
  /** 科技边框容器（容器） */
  panel(attrs?: BuilderAttrs): this;
  /** 指标卡（容器） */
  kpi(attrs?: BuilderAttrs): this;
  /** 数字翻牌器（自闭合） */
  flipNum(attrs?: BuilderAttrs): this;
  /** 轮播榜单（容器） */
  scrollboard(attrs?: BuilderAttrs): this;
  /** 大屏缩放容器 */
  fitScreen(attrs?: BuilderAttrs): this;

  // —— 应用壳（M2 / T2.1，容器，需 end() 闭合）——
  /** 应用壳（三件套落位 grid areas） */
  page(attrs?: BuilderAttrs): this;
  /** 页头（子节点为右侧动作区；bc 面包屑、sticky 吸顶） */
  pageHeader(attrs?: BuilderAttrs): this;
  /** 侧栏（品牌行 + 折叠钮 + 滚动主体） */
  pageSidebar(attrs?: BuilderAttrs): this;
  /** 主区薄包装 */
  pageContent(attrs?: BuilderAttrs): this;
  /** 多页签容器（act 初始激活 key） */
  pageTabs(attrs?: BuilderAttrs): this;
  /** 单页签（n 为 key，closeable 可关闭） */
  pageTab(attrs?: BuilderAttrs): this;

  // —— 滚动入场（T3.2，容器，需 end() 闭合）——
  /** 滚动入场容器（v:up|left|right|zoom 方向，delay:N 基础延迟 ms；子元素按序 stagger 80ms） */
  reveal(attrs?: BuilderAttrs): this;
  /** 入场分组包装（可选；不写则子组件直接参与 stagger） */
  revealItem(attrs?: BuilderAttrs): this;

  // —— 高级网格布局（容器，需 end() 闭合）——
  grid(attrs?: BuilderAttrs): this;
  cell(attrs?: BuilderAttrs): this;

  // —— 表格辅助 ——
  thead(attrs?: BuilderAttrs): this;
  theadCols(cols: any[]): this;
  tr(cells: any[], attrs?: BuilderAttrs): this;

  // —— 代码块（容器）——
  code(attrs?: BuilderAttrs): this;

  // —— AI 对话组件（plan-step 支持 [upd id:] 步骤推进）——
  plan(attrs?: BuilderAttrs): this;
  planStep(attrs?: BuilderAttrs): this;
}
