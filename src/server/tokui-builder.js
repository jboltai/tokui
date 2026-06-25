/**
 * TokUI 构建器模块
 * 提供链式调用 API 来生成 TokUI DSL 字符串。
 * 用于服务端构建 TokUI 内容，支持流式输出（toChunks）和一次性输出（toString）。
 *
 * 使用示例：
 *   const b = new TokUIBuilder();
 *   b.card({ tt: '标题' }).h2('内容').p('描述').end();
 *   const result = b.toString(); // '[card tt:标题][h2 内容][p 描述][/card]'
 */
'use strict';

class TokUIBuilder {
  constructor() {
    /** @type {string[]} TokUI DSL 片段数组 */
    this.chunks = [];
    /** @type {string[]} 容器栈，用于跟踪未关闭的 open 标签 */
    this.stack = [];
  }

  /**
   * 将属性对象序列化为 TokUI DSL 属性字符串
   * - 布尔 true → 仅输出属性名
   * - 值含空格 → 用引号包裹
   * - false/undefined/null → 跳过
   *
   * @param {Object} attrs - 属性键值对
   * @returns {string} 序列化后的属性字符串
   */
  static serializeAttrs(attrs) {
    if (!attrs || typeof attrs !== 'object') return '';
    return Object.entries(attrs)
      .map(([k, v]) => {
        if (v === true) return k;
        if (v === false || v === undefined || v === null) return '';
        let val = String(v);
        // 转义值中的双引号
        val = val.replace(/"/g, '\\"');
        // 值含空格、引号、换行符或 ] 时用双引号包裹
        if (val.includes(' ') || val.includes('"') || val.includes('\n') || val.includes(']')) {
          return `${k}:"${val}"`;
        }
        return `${k}:${val}`;
      })
      .filter(Boolean)
      .join(' ');
  }

  /**
   * 把 chart 布局属性（影响渲染形态的）排到数据属性 d/tasks 之前，返回新顺序的属性对象。
   * 原因：流式预览时 d/tasks 边到边长，parser 吐的半成品 attrs 只含当前已累积的键；
   * 若 orient/stack/smooth/area 写在 d 之后，预览阶段看不到 → 先按默认布局画，等 ] 闭合
   * 这些键到达才翻转（横向柱的"末尾突然转向"根因）。前置后，预览从头即最终布局，无翻转。
   * 顺序：t（类型，恒首）→ 布局键 → 其余按原序。
   */
  static chartLayoutFirst(attrs) {
    if (!attrs || typeof attrs !== 'object') return attrs;
    var layoutKeys = ['t', 'orient', 'orientation', 'stack', 'stacked', 'smooth', 'area'];
    var seen = Object.create(null);
    var out = {};
    layoutKeys.forEach(function (k) {
      if (attrs[k] !== undefined && attrs[k] !== null) { out[k] = attrs[k]; seen[k] = true; }
    });
    Object.keys(attrs).forEach(function (k) {
      if (!seen[k] && attrs[k] !== undefined && attrs[k] !== null) out[k] = attrs[k];
    });
    return out;
  }

  /**
   * 生成自闭合标签（如 [h1 标题]、[hr]）
   * @param {string} type - 标签类型
   * @param {string} [content] - 文本内容
   * @param {Object} [attrs] - 属性对象
   * @returns {TokUIBuilder} this（支持链式调用）
   */
  _selfClosing(type, content, attrs) {
    const attrStr = TokUIBuilder.serializeAttrs(attrs);
    const parts = [type];
    if (attrStr) parts.push(attrStr);
    if (content) {
      const c = String(content);
      // content 含 [ ] : 时用双引号包裹：
      //  - [ ] 字面方括号：parser 引号感知，括号作字面内容不误判为嵌套子标签
      //    （否则 [item 生成 [0,1) 浮点数] 的 [0 被当子标签 → 内容截断）
      //  - : 冒号：避免被 parser 误解析为 key:value 属性
      if (c.includes('[') || c.includes(']') || c.includes(':')) {
        parts.push('"' + c.replace(/"/g, '\\"') + '"');
      } else {
        parts.push(c);
      }
    }
    this.chunks.push(`[${parts.join(' ')}]`);
    return this;
  }

  /**
   * 生成开标签（如 [card tt:信息]），并将类型压入栈
   * @param {string} type - 标签类型
   * @param {Object} [attrs] - 属性对象
   * @returns {TokUIBuilder} this
   */
  _open(type, attrs) {
    const attrStr = TokUIBuilder.serializeAttrs(attrs);
    const tag = attrStr ? `${type} ${attrStr}` : type;
    this.chunks.push(`[${tag}]`);
    this.stack.push(type);
    return this;
  }

  /**
   * 关闭栈顶的容器标签（如 [/card]）
   * @returns {TokUIBuilder} this
   */
  end() {
    if (!this.stack.length) return this;
    const type = this.stack.pop();
    this.chunks.push(`[/${type}]`);
    return this;
  }

  /**
   * 关闭所有未关闭的容器标签
   * @returns {TokUIBuilder} this
   */
  endAll() {
    while (this.stack.length) this.end();
    return this;
  }

  // ========== 展示组件 ==========

  /** 标题 h1 ~ h6 */
  h1(content, attrs) { return this._selfClosing('h1', content, attrs); }
  h2(content, attrs) { return this._selfClosing('h2', content, attrs); }
  h3(content, attrs) { return this._selfClosing('h3', content, attrs); }
  h4(content, attrs) { return this._selfClosing('h4', content, attrs); }
  h5(content, attrs) { return this._selfClosing('h5', content, attrs); }
  h6(content, attrs) { return this._selfClosing('h6', content, attrs); }

  /** 段落 */
  // p 双行为：有 content → 自闭合 [p 文本]；无 content → 容器 [p]...[/p]（嵌套内联 a/tag 等）
  p(content, attrs) {
    return content !== undefined && content !== null
      ? this._selfClosing('p', content, attrs)
      : this._open('p', attrs);
  }

  /** Markdown 内容（容器模式，保留换行） */
  md(content) {
    this.chunks.push(`[md]${content}[/md]`);
    return this;
  }

  /** 分割线 */
  hr() { this.chunks.push('[hr]'); return this; }

  /** Divider 分割线 */
  dv(attrs) { return this._selfClosing('dv', null, attrs); }

  /** Tag 标签 */
  tag(content, attrs) { return this._selfClosing('tag', content, attrs); }

  /** Toggle 切换按钮（自闭合） */
  toggle(attrs) { return this._selfClosing('toggle', null, attrs); }
  /** Toggle Group 切换按钮组（容器） */
  toggleGroup(attrs) { return this._open('toggle-group', attrs); }

  /** 链接 */
  a(attrs) { return this._selfClosing('a', null, attrs); }

  /** 图片 */
  img(attrs) { return this._selfClosing('img', null, attrs); }

  /**
   * 代码块（容器模式）
   * 生成 [code lang:xxx]content[/code]
   * @param {Object} attrs - 属性（如 { lang: 'js' }）
   * @param {string} [content] - 代码内容
   */
  code(attrs, content) {
    this._open('code', attrs);
    if (content) {
      this.chunks.push(String(content));
      return this.end();
    }
    return this;
  }

  // ========== 表格组件 ==========

  /** 表格容器 */
  table(attrs) { return this._open('table', attrs); }
  /** 表头 */
  /** 表头容器（无 cols 时为容器，有 cols 时自闭合）*/
  thead(attrs) { return attrs && attrs.cols ? this._selfClosing('thead', null, attrs) : this._open('thead', attrs); }
  /** @deprecated 表格列定义请使用 tcol() 或 theadCols()，col() 与布局列冲突 */
  col(attrs) { return this._selfClosing('col', null, attrs); }
  /** 表格列定义（简写形式） */
  tcol(attrs) { return this._selfClosing('tcol', null, attrs); }
  /** 表头简写：带 cols 字符串的自闭合形式 */
  theadCols(cols) { return this._selfClosing('thead', null, { cols }); }
  /** 表格主体 */
  tbody() { return this._open('tbody'); }
  /** 表格数据行，多个值用逗号拼接，含逗号的值自动加双引号 */
  row(...values) {
    const escaped = values.map(v => {
      const s = String(v);
      // 只对含逗号的 cell 加引号，含冒号的交给 _selfClosing 统一处理
      if (s.includes(',')) return `"${s}"`;
      return s;
    });
    return this._selfClosing('tr', escaped.join(','));
  }

  // ========== 表单组件 ==========

  /** 表单容器 */
  form(attrs) { return this._open('form', attrs); }
  /** 输入框 */
  input(attrs) { return this._selfClosing('input', null, attrs); }
  /** 密码输入框 */
  pwd(attrs) { return this._selfClosing('pwd', null, attrs); }
  /** 按钮 */
  btn(attrs) { return this._selfClosing('btn', null, attrs); }
  /** 按钮组 */
  btngroup(attrs) { return this._open('btngroup', attrs); }
  /** 自定义选择器 */
  picker(attrs) { return this._open('picker', attrs); }
  /** 下拉选择框 */
  select(attrs) { return this._open('select', attrs); }
  /** 选项 */
  opt(attrs) { return this._selfClosing('opt', null, attrs); }
  /** 单选按钮组 */
  radio(attrs) { return this._open('radio', attrs); }
  /** 复选框 */
  checkbox(attrs) { return this._selfClosing('checkbox', null, attrs); }
  /** 开关组件（方法名 switcher 避开 JS 关键字） */
  switcher(attrs) { return this._selfClosing('switch', null, attrs); }
  /** 多行文本框 */
  textarea(attrs) { return this._open('textarea', attrs); }
  /** 容器内原始文本（用于 textarea/md/code 等容器组件） */
  text(content) { this.chunks.push(String(content)); return this; }

  // ========== 布局组件 ==========

  /** 卡片（容器模式：需 .end() 关闭） */
  card(attrs) { return this._open('card', attrs); }
  /** 卡片（自闭合模式：tx 属性作为 body 文本） */
  cardTx(title, text, attrs) {
    const a = Object.assign({ tt: title, tx: text }, attrs);
    return this._selfClosing('card', null, a);
  }
  /** 卡片页脚 */
  ft(attrs) { return this._open('ft', attrs); }
  /** 栅格行（使用 row_layout 避免与 table.row 冲突） */
  row_layout(attrs) { return this._open('row', attrs); }
  /** 栅格列 */
  col_layout(attrs) { return this._open('col', attrs); }
  /** 列表 */
  list(attrs) { return this._open('list', attrs); }
  /** 列表项（有内容自闭合 [item 文本]，无内容开容器供嵌套子 list）。
   *  content 含字面 [ ] 时由 _selfClosing 自动包双引号（避免 [0 被误判嵌套子标签截断内容）。 */
  // item 双行为：字符串 → 列表项内容 [item 文本]；对象 → 属性 [item tx:.. clk:..]（command-group 内命令项用）。
  item(contentOrAttrs) {
    if (contentOrAttrs && typeof contentOrAttrs === 'object') {
      return this._selfClosing('item', null, contentOrAttrs);
    }
    return contentOrAttrs ? this._selfClosing('item', contentOrAttrs) : this._open('item');
  }
  /** 有序列表（ol 标签） */
  ol(attrs) { return this._open('ol', attrs); }
  /** 无序列表（ul 标签） */
  ul(attrs) { return this._open('ul', attrs); }
  /** 列表项（i 标签，有内容自闭合，无内容容器模式） */
  i(content) { return content ? this._selfClosing('i', content) : this._open('i'); }

  /** 多图容器 */
  imgs(attrs) { return this._open('imgs', attrs); }

  /** 时间轴容器 */
  timeline(attrs) { return this._open('timeline', attrs); }
  /** 时间轴子项 */
  ti(content, attrs) { return this._selfClosing('ti', content, attrs); }

  /** Callout 提示框（自闭合） */
  callout(attrs) { return this._selfClosing('callout', null, attrs); }
  /** Think 思考块（容器） */
  think(attrs) { return this._open('think', attrs); }
  /** ThoughtChain 推理链容器 */
  thinkChain(attrs) { return this._open('think-chain', attrs); }
  /** ThoughtChain 推理步骤（容器） */
  thinkStep(attrs) { return this._open('think-step', attrs); }
  /** Copy 复制按钮（自闭合） */
  copy(attrs) { return this._selfClosing('copy', null, attrs); }
  /** Spin 加载指示器（自闭合） */
  spin(attrs) { return this._selfClosing('spin', null, attrs); }
  /** Thumb 点赞/点踩（自闭合） */
  thumb(attrs) { return this._selfClosing('thumb', null, attrs); }
  /** File 文件卡片（自闭合） */
  file(attrs) { return this._selfClosing('file', null, attrs); }
  /** Chart 图表：有 d/tasks 内联数据→自闭合；gauge 带内联 v 也自闭合（单值完整）；
   *  否则容器模式收 pt/task/ms 流式子节点（含 gauge 无 v + pt 流式）*/
  chart(attrs) {
    var a = attrs || {};
    // hasInline 判定：凡带内联数据载体的 chart 均自闭合。
    // d=柱/折/面积/饼/雷达/散点/气泡/直方/瀑布/箱线/K线/树图; tasks=甘特;
    // rows=热力; nodes+flows=桑基; v=仪表盘/进度条(单值)。
    // 漏判会让本应自闭合的 chart 走容器分支，.end() 错位闭合 → 后续栅格结构串味乱套。
    var hasInline = a.d || a.tasks || a.rows || (a.nodes && a.flows) ||
      (a.v !== undefined && (a.t === 'gauge' || a.t === 'progress'));
    // 布局属性前置：流式预览阶段 d/tasks 边到边长，若 orient/stack/smooth/area 排在数据后，
    // parser 半成品看不到 → 预览用默认布局，] 闭合才翻转（如 orient:h 末尾到达致纵向→横向闪）。
    // 排到 d 前输出，预览从头即正确布局，消除中途翻转。
    var ordered = TokUIBuilder.chartLayoutFirst(attrs);
    return hasInline && !a._container
      ? this._selfClosing('chart', null, ordered)
      : this._open('chart', ordered);
  }
  /** 图表数据点（chart 容器内）：attrs {v}，scatter 用 v:"x,y" / treemap 用 v:"名:值" */
  chartPoint(attrs) { return this._selfClosing('pt', null, attrs); }
  /** 热力图行（heatmap 容器内）：attrs {v} = "v,v,v" 一行 */
  heatmapRow(attrs) { return this._selfClosing('hrow', null, attrs); }
  /** 桑基图流（sankey 容器内）：attrs {v} = "源->目标:值" */
  sankeyFlow(attrs) { return this._selfClosing('flow', null, attrs); }
  /** 甘特图任务（gantt 容器内）：attrs {n,s,e,p,g} = 名称,开始,结束,进度,组 */
  ganttTask(attrs) {
    var a = attrs || {};
    var content = [a.n, a.s, a.e, a.p, a.g].map(function (x) {
      return x === undefined || x === null ? '' : String(x);
    }).join(',');
    // name 含空格时整段加引号（parser 引号还原后 chartAppendChild 会 strip 首尾）
    if (/\s/.test(content)) {
      this.chunks.push('[task "' + content.replace(/"/g, '\\"') + '"]');
    } else {
      this.chunks.push('[task ' + content + ']');
    }
    return this;
  }
  /** 甘特图里程碑（gantt 容器内）：attrs {n,t,g} = 名称,时间,组 */
  ganttMs(attrs) {
    var a = attrs || {};
    var content = [a.n, a.t, a.g].map(function (x) {
      return x === undefined || x === null ? '' : String(x);
    }).join(',');
    if (/\s/.test(content)) {
      this.chunks.push('[ms "' + content.replace(/"/g, '\\"') + '"]');
    } else {
      this.chunks.push('[ms ' + content + ']');
    }
    return this;
  }

  /** Empty 空状态（自闭合） */
  empty(attrs) { return this._selfClosing('empty', null, attrs); }
  /** Result 结果页（自闭合） */
  result(attrs) { return this._selfClosing('result', null, attrs); }
  /** Stat 统计数值（自闭合） */
  stat(attrs) { return this._selfClosing('stat', null, attrs); }
  /** Description List 描述列表（容器） */
  desc(attrs) { return this._open('desc', attrs); }
  /** Carousel 轮播图容器 */
  carousel(attrs) { return this._open('carousel', attrs); }
  /** Carousel 轮播图子项（自闭合） */
  carouselItem(attrs) { return this._selfClosing('carousel-item', null, attrs); }
  /** Description Item 描述项（自闭合） */
  descItem(attrs) { return this._selfClosing('desc-item', null, attrs); }
  /** Number Input 数字输入框（自闭合） */
  numinput(attrs) { return this._selfClosing('numinput', null, attrs); }

  /** DatePicker 日期选择器（自闭合） */
  datepicker(attrs) { return this._selfClosing('datepicker', null, attrs); }
  /** TimePicker 时间选择器（自闭合） */
  timepicker(attrs) { return this._selfClosing('timepicker', null, attrs); }
  /** DateTimePicker 日期时间选择器（自闭合） */
  datetimepicker(attrs) { return this._selfClosing('datetimepicker', null, attrs); }

  /** Popconfirm 确认气泡（自闭合） */
  popconfirm(attrs, text) {
    return this._selfClosing('popconfirm', text || null, attrs);
  }

  /** Notification 全局通知（自闭合） */
  notification(attrs) { return this._selfClosing('notification', null, attrs); }

  /** Popover 气泡卡片（容器） */
  popover(attrs) { return this._open('popover', attrs); }
  /** Hover Card 悬浮卡片（容器） */
  hoverCard(attrs) { return this._open('hover-card', attrs); }
  /** Hover Card 触发器（容器） */
  hoverTrigger(attrs) { return this._open('hover-trigger', attrs); }
  /** Hover Card 内容区（容器） */
  hoverContent(attrs) { return this._open('hover-content', attrs); }
  /** InputTag 标签输入框（容器，有 tags 初始值时自闭合） */
  inputTag(attrs) { return attrs && attrs.tags ? this._selfClosing('input-tag', null, attrs) : this._open('input-tag', attrs); }
  /** Countdown 倒计时（自闭合） */
  countdown(attrs) { return this._selfClosing('countdown', null, attrs); }

  /** Progress 进度条（自闭合） */
  progress(attrs) { return this._selfClosing('progress', null, attrs); }
  /** Steps 步骤条容器 */
  steps(attrs) { return this._open('steps', attrs); }
  /** Step 步骤项（自闭合） */
  step(content, attrs) { return this._selfClosing('step', content, attrs); }

  // ========== 动态更新 ==========

  /** Upd 异步更新指令（自闭合），推送状态更新到已有组件 */
  upd(attrs) { return this._selfClosing('upd', null, attrs); }

  // ========== 交互组件 ==========

  /** 标签页容器 */
  tabs(attrs) { return this._open('tabs', attrs); }
  /** 标签页 */
  tab(attrs) { return this._open('tab', attrs); }
  /** 手风琴 */
  accordion(attrs) { return this._open('accordion', attrs); }
  /** 折叠面板 */
  collapse(attrs) { return this._open('collapse', attrs); }
  /** 对话框 */
  dialog(attrs) { return this._open('dialog', attrs); }
  /** 抽屉 */
  drawer(attrs) { return this._open('drawer', attrs); }
  /** 命令面板（容器） */
  command(attrs) { return this._open('command', attrs); }
  /** 命令分组（容器） */
  commandGroup(attrs) { return this._open('command-group', attrs); }
  /** 命令项（自闭合） */
  commandItem(attrs) { return this._selfClosing('command-item', null, attrs); }

  // ========== AI 对话组件 ==========

  /** 聊天气泡（容器） */
  bubble(attrs) { return this._open('bubble', attrs); }
  /** 操作栏（容器） */
  toolbar(attrs) { return this._open('toolbar', attrs); }
  /** 徽标数（自闭合） */
  badge(attrs) {
    const content = (attrs && attrs.tx) || null;
    const cleanAttrs = Object.assign({}, attrs);
    delete cleanAttrs.tx;
    return this._selfClosing('badge', content, cleanAttrs);
  }
  /** 徽标数包裹容器（容器模式，子元素右上角显示徽标） */
  badgeBox(attrs) { return this._open('badge-box', attrs); }
  /** 骨架屏（自闭合） */
  skeleton(attrs) { return this._selfClosing('skeleton', null, attrs); }
  /** 轻提示（自闭合） */
  toast(attrs) { return this._selfClosing('toast', null, attrs); }
  /** 状态指示点（自闭合） */
  dot(attrs) { return this._selfClosing('dot', null, attrs); }
  /** 头像（自闭合） */
  avatar(attrs) { return this._selfClosing('avatar', null, attrs); }
  /** 悬浮提示（自闭合） */
  tooltip(content, attrs) { return this._selfClosing('tooltip', content, attrs); }
  /** 分页（自闭合） */
  pagination(attrs) { return this._selfClosing('pagination', null, attrs); }
  /** 面包屑 */
  breadcrumb(attrs) { return this._selfClosing('breadcrumb', null, attrs); }
  /** 下拉菜单（容器） */
  dropdown(attrs) { return this._open('dropdown', attrs); }
  /** 下拉菜单项（自闭合） */
  ddItem(attrs) { return this._selfClosing('dd-item', null, attrs); }

  /** 滑块（自闭合） */
  slider(attrs) { return this._selfClosing('slider', null, attrs); }
  /** 评分（自闭合） */
  rate(attrs) { return this._selfClosing('rate', null, attrs); }
  /** 穿梭框（容器） */
  transfer(attrs) { return this._open('transfer', attrs); }
  /** 级联选择器（容器） */
  cascader(attrs) { return this._open('cascader', attrs); }
  /** 文件上传（自闭合） */
  upload(attrs) { return this._selfClosing('upload', null, attrs); }
  /** 树形控件（容器） */
  tree(attrs) { return this._open('tree', attrs); }
  /** 树节点（容器）；leaf 节点自闭合 */
  tn(attrs) {
    if (attrs && attrs.leaf) return this._selfClosing('tn', null, attrs);
    return this._open('tn', attrs);
  }

  /** 水印容器 */
  watermark(attrs) { return this._open('watermark', attrs); }

  /** Scroll Area 自定义滚动区域（容器） */
  scrollArea(attrs) { return this._open('scroll-area', attrs); }

  /** 回到顶部按钮 */
  backtop(attrs) { return this._selfClosing('backtop', null, attrs); }

  /** 日历容器 */
  calendar(attrs) { return this._selfClosing('calendar', null, attrs); }

  /** 菜单容器 */
  menu(attrs) { return this._open('menu', attrs); }

  /** 对话输入框（容器模式，支持自定义子节点） */
  chatInput(attrs) { return this._open('chat-input', attrs); }

  /** Welcome 欢迎页容器 */
  welcome(attrs) { return this._open('welcome', attrs); }
  /** Welcome Feature 功能特性卡片（容器）；推荐用 feature() 自闭合简写 */
  welcomeFeature(attrs) { return this._open('welcome-feature', attrs); }
  /** feature：welcome-feature 自闭合简写 */
  feature(attrs) { return this._selfClosing('feature', null, attrs); }

  /** 会话列表容器 */
  conversations(attrs) { return this._open('conversations', attrs); }
  /** 会话列表子项（自闭合） */
  conv(attrs) { return this._selfClosing('conv', null, attrs); }

  // ========== 附件组件 ==========

  /** 附件区域容器 */
  attachments(attrs) { return this._open('attachments', attrs); }

  /** 单个附件项（自闭合） */
  attach(attrs) { return this._selfClosing('attach', null, attrs); }

  /** 消息操作栏（容器模式） */
  msgActions(attrs) { return this._open('msg-actions', attrs); }

  /** 菜单项（自闭合）*/
  menuItem(attrs) { return this._selfClosing('menu-item', null, attrs); }

  /** 侧边栏容器 */
  sidebar(attrs) { return this._open('sidebar', attrs); }
  /** 侧边栏内容区 */
  sidebarContent(attrs) { return this._open('sidebar-content', attrs); }
  /** 侧边栏页脚 */
  sidebarFooter(attrs) { return this._open('sidebar-footer', attrs); }

  // ========== AI 对话高级组件 ==========

  // Phase 1: P0 核心AI组件

  /** 工具调用卡片（容器） */
  toolCall(attrs) { return this._open('tool-call', attrs); }

  /** 打字指示器（自闭合） */
  typing(attrs) { return this._selfClosing('typing', null, attrs); }

  /** 快捷回复（自闭合 with items，或容器） */
  quickReply(attrs) { return attrs && attrs.items ? this._selfClosing('quick-reply', null, attrs) : this._open('quick-reply', attrs); }

  /** 提示建议卡片容器 */
  suggestions(attrs) { return this._open('suggestions', attrs); }

  /** 单个建议卡片（自闭合） */
  suggestion(attrs) { return this._selfClosing('suggestion', null, attrs); }

  /** 引用来源卡片（自闭合） */
  source(attrs) { return this._selfClosing('source', null, attrs); }

  /** 代码差异视图（容器） */
  diff(attrs) { return this._open('diff', attrs); }

  // Phase 2: P1 Agent/代码助手

  /** 任务计划（容器） */
  plan(attrs) { return this._open('plan', attrs); }

  /** 计划步骤（自闭合或容器） */
  planStep(attrs) { return this._selfClosing('plan-step', null, attrs); }

  /** Agent 状态卡片（自闭合或容器） */
  agent(attrs) { return attrs && (attrs.status || attrs.name) && !attrs._container ? this._selfClosing('agent', null, attrs) : this._open('agent', attrs); }

  /** 文件树（容器） */
  fileTree(attrs) { return this._open('file-tree', attrs); }

  /** 文件树文件夹（容器） */
  ftFolder(attrs) { return this._open('ft-folder', attrs); }

  /** 文件树文件（自闭合） */
  ftFile(attrs) { return this._selfClosing('ft-file', null, attrs); }

  /** 终端输出（容器） */
  terminal(attrs) { return this._open('terminal', attrs); }

  /** 流式闪光加载（自闭合） */
  shimmer(attrs) { return this._selfClosing('shimmer', null, attrs); }

  /** 耗时标记（自闭合） */
  latency(attrs) { return this._selfClosing('latency', null, attrs); }

  // Phase 3: P2 高级组件

  /** 视频播放器（自闭合） */
  video(attrs) { return this._selfClosing('video', null, attrs); }

  /** 音频播放器（自闭合） */
  audio(attrs) { return this._selfClosing('audio', null, attrs); }

  /** 消息引用（容器） */
  quote(attrs) { return this._open('quote', attrs); }

  /** 代码预览沙盒（容器） */
  sandbox(attrs) { return this._open('sandbox', attrs); }

  /** Git 提交信息（自闭合） */
  commit(attrs) { return this._selfClosing('commit', null, attrs); }

  /** 测试结果（容器） */
  testResult(attrs) { return this._open('test-result', attrs); }

  /** 测试用例（自闭合）；case 为 test-case 简写别名 */
  testCase(attrs) { return this._selfClosing('test-case', null, attrs); }
  case(attrs) { return this._selfClosing('case', null, attrs); }

  // ========== Artifact / Canvas 侧边预览 ==========

  /** Artifact 侧边预览面板（容器） */
  artifact(attrs) { return this._open('artifact', attrs); }

  /** Artifact 代码区（容器） */
  artifactCode(attrs) { return this._open('artifact-code', attrs); }

  /** Artifact 预览区（容器） */
  artifactPreview(attrs) { return this._open('artifact-preview', attrs); }

  /** Resizable 分割面板（容器） */
  resizable(attrs) { return this._open('resizable', attrs); }

  /** Canvas 侧边预览面板（容器） */
  canvas(attrs) { return this._open('canvas', attrs); }

  /** Canvas 内容区（容器） */
  canvasContent(attrs) { return this._open('canvas-content', attrs); }

  // ========== 输出方法 ==========

  /**
   * 构建完整的 chunks 数组（包含自动关闭的容器标签）
   * @returns {string[]} DSL 片段数组
   * @private
   */
  _finalizeChunks() {
    const copy = [...this.chunks];
    const stackCopy = [...this.stack];
    while (stackCopy.length) {
      copy.push(`[/${stackCopy.pop()}]`);
    }
    return copy;
  }

  /**
   * 输出完整的 TokUI DSL 字符串
   * 自动关闭所有未关闭的容器。
   * @returns {string} TokUI DSL 字符串
   */
  toString() {
    return this._finalizeChunks().join('');
  }

  /**
   * 输出 TokUI DSL 片段数组（用于 SSE 流式传输）
   * 每个元素对应一个独立的 TokUI 标签。
   * @returns {string[]} DSL 片段数组
   */
  toChunks() {
    return this._finalizeChunks();
  }

  /**
   * 重置构建器状态
   * @returns {TokUIBuilder} this
   */
  reset() {
    this.chunks = [];
    this.stack = [];
    return this;
  }
}

module.exports = { TokUIBuilder };
