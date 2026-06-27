/**
 * TokUI SSE 服务端
 * 提供 HTTP 服务和 SSE（Server-Sent Events）流式推送。
 * 包含演示场景定义、SSE 流式传输和静态文件服务。
 *
 * API 端点：
 *   GET  /api/demo/list    - 获取演示场景列表
 *   POST /api/chat/stream  - SSE 流式推送 TokUI 组件
 *   GET  /*                - 静态文件服务（demo 页面等）
 */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { TokUIBuilder } = require('./tokui-builder');

/** 服务监听端口 */
const PORT = 3109;

// ===== 演示场景定义 =====

/**
 * 演示场景配置数组
 * 每个场景包含：
 * - trigger: 触发关键词（客户端发送的 prompt 值）
 * - title: 场景标题
 * - desc: 场景描述
 * - build(): 构建函数，返回 TokUIBuilder 实例
 */

/**
 * 将 DSL 字符串随机拆成碎片片段
 * 模拟真实 SSE 推送中标签被截断的情况
 * @param {string} dsl - 完整 DSL 字符串
 * @returns {string[]} 碎片数组
 */
function _fragmentDsl(dsl) {
  var chunks = [];
  var pos = 0;
  while (pos < dsl.length) {
    // 随机片段长度 2~20 个字符，模拟碎片推送
    var len = 2 + Math.floor(Math.random() * 19);
    var end = Math.min(pos + len, dsl.length);
    chunks.push(dsl.substring(pos, end));
    pos = end;
  }
  return chunks;
}

const DEMOS = [
  {
    trigger: 'show-basic',
    title: '段落与链接',
    desc: '展示段落变体、链接变体、禁用态及实际应用场景',
    build() {
      const b = new TokUIBuilder();
      b.row_layout()
        .col_layout({ span: 3 })
          .card({ tt: '段落基础与对齐' })
            .p('默认左对齐段落。TokUI 是面向 AI 的流式 UI 框架。')
            .p('居中对齐段落。TokUI 是面向 AI 的流式 UI 框架。', { v: 'center' })
            .p('右对齐段落。TokUI 是面向 AI 的流式 UI 框架。', { v: 'right' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: '段落文本变体' })
            .p('默认段落文本大小和颜色。')
            .p('次要/辅助说明文字，颜色更浅。', { v: 'muted' })
            .p('加粗强调段落文本。', { v: 'bold' })
            .p('小号段落文本，适用于注释。', { v: 'sm' })
            .p('大号段落文本，适用于引导语。', { v: 'lg' })
            .p('组合变体：加粗+居中。', { v: 'bold,center' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: '链接颜色变体' })
            .p('默认链接：')
            .a({ tx: '访问文档', u: 'https://example.com' })
            .p('Muted 次要链接：')
            .a({ tx: '查看详情', u: '#', v: 'muted' })
            .p('Danger 危险链接：')
            .a({ tx: '删除账户', u: '#', v: 'danger' })
            .p('Success 成功链接：')
            .a({ tx: '验证通过', u: '#', v: 'success' })
            .p('Underline 下划线链接：')
            .a({ tx: '帮助中心', u: '#', v: 'underline' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: '链接状态与场景' })
            .p('带 title 提示：')
            .a({ tx: '鼠标悬停查看提示', u: '#', tt: '这是一个链接提示信息' })
            .p('禁用链接：')
            .a({ tx: '不可点击的链接', u: '#', dis: true })
            .p('当前页打开：')
            .a({ tx: '站内跳转链接', u: '#', target: '_self' })
            .p('实际场景 — 导航链接：')
            .row_layout({ v: 'inline' })
              .a({ tx: '首页', u: '#', v: 'underline' })
              .a({ tx: '产品', u: '#', v: 'muted' })
              .a({ tx: '关于我们', u: '#', v: 'muted' })
            .end()
            .p('实际场景 — 操作链接：')
            .row_layout({ v: 'inline' })
              .a({ tx: '修改', u: '#' })
              .a({ tx: '删除', u: '#', v: 'danger' })
              .a({ tx: '恢复', u: '#', v: 'success' })
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'show-table',
    title: '数据表格',
    desc: '展示表格组件及斑马纹效果',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '员工信息表' })
        .table({ stripe: true, id: 'empTable' })
        .theadCols('姓名,年龄:number,部门,状态')
        .tbody()
          .row('张三', '28', '技术部', '在职')
          .row('李四', '32', '市场部', '在职')
          .row('王五', '25', '设计部', '在职')
          .row('赵六', '35', '产品部', '离职')
        .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'show-form',
    title: '表单交互',
    desc: '展示表单组件及事件绑定',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '用户注册' })
        .form({ id: 'regForm', act: '/api/register', mtd: 'post', sub: 'handleRegister' })
          .input({ t: 'text', l: '用户名', ph: '请输入用户名', id: 'username', req: true })
          .input({ t: 'email', l: '邮箱', ph: '请输入邮箱', id: 'email', req: true })
          .pwd({ l: '密码', ph: '请输入密码', id: 'password', req: true })
          .select({ l: '角色', id: 'role' })
            .opt({ v: 'dev', tx: '开发者' })
            .opt({ v: 'designer', tx: '设计师' })
            .opt({ v: 'pm', tx: '产品经理' })
          .end()
          .radio({ l: '性别', n: 'gender', id: 'genderGroup' })
            .opt({ v: 'male', tx: '男', chk: true })
            .opt({ v: 'female', tx: '女' })
            .opt({ v: 'other', tx: '其他' })
          .end()
          .checkbox({ l: '同意用户协议', id: 'agree' })
          .btn({ tx: '注册', t: 'submit', clk: 'handleRegister' })
          .btn({ tx: '重置', t: 'reset' })
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'show-layout',
    title: '布局组件',
    desc: '展示卡片、栅格、列表布局',
    build() {
      const b = new TokUIBuilder();
      b.h2('布局演示')
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '卡片 A' }).p('左侧卡片内容，占据一半宽度。').end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '卡片 B' }).p('右侧卡片内容，占据一半宽度。').end()
          .end()
        .end()
        .list({ t: 'ul' })
          .item('第一项：支持有序和无序列表')
          .item('第二项：流式渲染逐项显示')
          .item('第三项：简洁的 DSL 语法')
        .end();
      return b;
    }
  },
  {
    trigger: 'show-markdown',
    title: 'Markdown',
    desc: '展示 Markdown 渲染',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Markdown 渲染' })
        .md('# 标题演示\n\n这是 **粗体**、*斜体*、~~删除线~~ 和 `行内代码`。\n\n## 列表\n\n- 无序列表项 1\n- 无序列表项 2\n\n1. 有序列表项 1\n2. 有序列表项 2\n\n### 链接\n\n访问 [TokUI 文档](https://example.com) 了解更多。')
      .end();
      return b;
    }
  },
  {
    trigger: 'show-image',
    title: '图片组件',
    desc: '展示单图、多图九宫格、灯箱预览',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '图片组件展示' })
        .h3('单张图片')
        .img({ s: 'https://picsum.photos/seed/tokui1/600/400', alt: '风景照片', tt: '点击查看大图' })
        .h3('简写版多图（4张九宫格）')
        .imgs({ s: 'https://picsum.photos/seed/tokui2/400/400,https://picsum.photos/seed/tokui3/400/400,https://picsum.photos/seed/tokui4/400/400,https://picsum.photos/seed/tokui5/400/400' })
        .end()
        .h3('完整版多图（6张九宫格）')
        .imgs()
          .img({ s: 'https://picsum.photos/seed/tokui6/400/400', alt: '图1' })
          .img({ s: 'https://picsum.photos/seed/tokui7/400/400', alt: '图2' })
          .img({ s: 'https://picsum.photos/seed/tokui8/400/400', alt: '图3' })
          .img({ s: 'https://picsum.photos/seed/tokui9/400/400', alt: '图4' })
          .img({ s: 'https://picsum.photos/seed/tokui10/400/400', alt: '图5' })
          .img({ s: 'https://picsum.photos/seed/tokui11/400/400', alt: '图6' })
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'show-code',
    title: '代码块',
    desc: '展示多语言代码高亮',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '代码示例' })
        .h3('JavaScript')
        .code({ lang: 'js' }, 'function hello(name) {\n  console.log(`Hello, ${name}!`);\n}\nhello("TokUI");')
        .h3('Python')
        .code({ lang: 'python' }, 'def hello(name):\n    print(f"Hello, {name}!")\n\nhello("TokUI")')
        .h3('SQL')
        .code({ lang: 'sql' }, 'SELECT * FROM users\nWHERE status = "active"\nORDER BY created_at DESC\nLIMIT 10;')
      .end();
      return b;
    }
  },
  {
    trigger: 'show-complex',
    title: '综合示例',
    desc: '多种组件组合展示',
    build() {
      const b = new TokUIBuilder();
      b.h1('TokUI 综合示例')
        .p('本示例涵盖 TokUI 全部组件类型：标题、段落、链接、图片、九宫格、表格、表单、代码、列表、布局、灯箱。')
        .hr()
        // --- 布局：栅格 + 卡片 + 单图 ---
        .row_layout()
          .col_layout({ span: 4 })
            .card({ tt: '用户头像' })
              .img({ s: 'https://picsum.photos/seed/avatar1/300/300', alt: '头像', tt: '点击查看大图', v: 'avatar' })
            .end()
          .end()
          .col_layout({ span: 8 })
            .card({ tt: '个人信息', v: 'highlight' })
              .h4('张三 · 高级工程师')
              .p('部门: 技术部 | 工龄: 5年')
              .a({ tx: '个人主页', u: '/user/zhangsan' })
              .btn({ tx: '编辑资料', clk: 'handleEdit', v: 'ghost,sm' })
            .end()
          .end()
        .end()
        // --- 多图九宫格 ---
        .card({ tt: '团队合照' })
          .imgs({ s: 'https://picsum.photos/seed/team1/400/400,https://picsum.photos/seed/team2/400/400,https://picsum.photos/seed/team3/400/400,https://picsum.photos/seed/team4/400/400,https://picsum.photos/seed/team5/400/400,https://picsum.photos/seed/team6/400/400,https://picsum.photos/seed/team7/400/400,https://picsum.photos/seed/team8/400/400,https://picsum.photos/seed/team9/400/400' })
          .end()
        .end()
        // --- 表格 ---
        .card({ tt: '项目列表' })
          .table({ stripe: true })
          .theadCols('项目名,进度,负责人,状态')
          .tbody()
            .row('TokUI 框架', '85%', '张三', '进行中')
            .row('数据平台', '60%', '李四', '进行中')
            .row('移动端 App', '100%', '王五', '已完成')
          .end()
          .end()
        .end()
        // --- 表单 ---
        .card({ tt: '快速搜索' })
          .form({ id: 'searchForm', sub: 'handleSearch' })
            .input({ t: 'text', l: '关键词', ph: '请输入搜索关键词', id: 'keyword', req: true })
            .select({ l: '项目', id: 'projectFilter' })
              .opt({ v: 'all', tx: '全部项目' })
              .opt({ v: 'tokui', tx: 'TokUI 框架' })
              .opt({ v: 'data', tx: '数据平台' })
            .end()
            .radio({ l: '优先级', n: 'priority', id: 'priorityGroup' })
              .opt({ v: 'high', tx: '高' })
              .opt({ v: 'mid', tx: '中', chk: true })
              .opt({ v: 'low', tx: '低' })
            .end()
            .checkbox({ l: '仅显示进行中', id: 'activeOnly' })
            .btn({ tx: '搜索', t: 'submit', clk: 'handleSearch' })
          .end()
        .end()
        // --- 列表 ---
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '技术栈' })
              .list({ t: 'ul' })
                .item('JavaScript ES6+')
                .item('Node.js 原生 HTTP')
                .item('CSS Grid / Flexbox')
                .item('SSE 流式传输')
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '里程碑' })
              .list({ t: 'ol' })
                .item('核心框架完成')
                .item('组件库扩展')
                .item('图片与灯箱')
                .item('主题系统')
              .end()
            .end()
          .end()
        .end()
        // --- Markdown ---
        .card({ tt: '项目简介' })
          .md('TokUI 是一个**零依赖**的流式 UI 描述与渲染框架。\n\n核心特性：\n- 轻量 DSL 语法\n- SSE 流式推送\n- 插件化组件注册\n\n查看文档 `docs/` 获取更多信息。')
        .end()
        // --- 代码块 ---
        .card({ tt: '快速上手' })
          .code({ lang: 'js' }, 'const tokui = new TokUI({ container: el });\ntokui.startStream();\n\n// 通过 SSE 接收并渲染\ntokui.connect("/api/chat/stream");')
        .end()
        // --- 卡片页脚 ---
        .card({ tt: '操作面板', v: 'bordered' })
          .p('TokUI 支持卡片页脚区域，可在页脚放置按钮等操作组件。')
          .ft()
            .btn({ tx: '保存', v: 'primary', clk: 'handleSave' })
            .btn({ tx: '取消', clk: 'handleCancel' })
            .btn({ tx: '删除', v: 'danger,sm', clk: 'handleDelete' })
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'show-formdata',
    title: '表单+表格',
    desc: '数据录入与展示联动',
    build() {
      const b = new TokUIBuilder();
      b.row_layout()
        .col_layout({ span: 5 })
          .card({ tt: '添加员工' })
            .form({ id: 'addEmp', act: '/api/employee', sub: 'handleAddEmployee' })
              .input({ t: 'text', l: '姓名', ph: '请输入姓名', id: 'empName', req: true })
              .input({ t: 'number', l: '年龄', ph: '请输入年龄', id: 'empAge', min: '18', max: '65' })
              .select({ l: '部门', id: 'empDept' })
                .opt({ v: 'tech', tx: '技术部' })
                .opt({ v: 'market', tx: '市场部' })
                .opt({ v: 'design', tx: '设计部' })
              .end()
              .btn({ tx: '添加', t: 'submit', clk: 'handleAddEmployee' })
            .end()
          .end()
        .end()
        .col_layout({ span: 7 })
          .card({ tt: '员工列表' })
            .table({ stripe: true, id: 'empListTable' })
            .theadCols('姓名,年龄:number,部门')
            .tbody()
              .row('张三', '28', '技术部')
              .row('李四', '32', '市场部')
            .end()
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'show-card-footer',
    title: '卡片页脚',
    desc: '展示卡片带页脚区域的用法',
    build() {
      const b = new TokUIBuilder();
      b.h2('卡片页脚演示')
        .card({ tt: '用户信息' })
          .p('张三 · 高级工程师')
          .p('部门: 技术部 | 工龄: 5年')
          .ft()
            .btn({ tx: '编辑', clk: 'handleEdit' })
            .btn({ tx: '删除', clk: 'handleDelete', v: 'danger' })
          .end()
        .end()
        .card({ tt: '数据导出', v: 'highlight' })
          .p('选择导出格式后点击下载按钮')
          .ft()
            .btn({ tx: '导出 CSV', clk: 'exportCSV' })
            .btn({ tx: '导出 Excel', clk: 'exportExcel', v: 'primary' })
            .btn({ tx: '导出 PDF', clk: 'exportPDF' })
          .end()
        .end();
      return b;
    }
  },
  // ========== 全量组件独立 Demo ==========

  {
    trigger: 'demo-heading',
    title: '标题组件',
    desc: '展示 h1-h6 标题级别、对齐变体及四种装饰风格',
    build() {
      const b = new TokUIBuilder();

      // 第一行四列：基础 / Ribbon / Underline / Badge
      b.row_layout()
        .col_layout({ span: 3 })
          .card({ tt: '基础标题 h1 ~ h6' })
            .h1('一级标题 H1')
            .h2('二级标题 H2')
            .h3('三级标题 H3')
            .h4('四级标题 H4')
            .h5('五级标题 H5')
            .h6('六级标题 H6')
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: 'Ribbon 缎带风格' })
            .h1('H1 Primary', { v: 'ribbon', bg: 'primary' })
            .h2('H2 Success', { v: 'ribbon', bg: 'success' })
            .h3('H3 Danger', { v: 'ribbon', bg: 'danger' })
            .h4('H4 Warning', { v: 'ribbon', bg: 'warning' })
            .h3('自定义橙', { v: 'ribbon', bg: 'FF8C00', fc: 'FFFFFF' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: 'Underline 底线风格' })
            .h1('H1 Primary', { v: 'underline', bg: 'primary' })
            .h2('H2 Info', { v: 'underline', bg: 'info' })
            .h3('H3 Success', { v: 'underline', bg: 'success' })
            .h4('H4 自定义紫', { v: 'underline', bg: '7C3AED' })
            .h5('H5 Warning', { v: 'underline', bg: 'warning' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: 'Badge 徽章风格' })
            .h1('H1 Primary', { v: 'badge', bg: 'primary' })
            .h2('H2 Danger', { v: 'badge', bg: 'danger' })
            .h3('H3 Success', { v: 'badge', bg: 'success' })
            .h4('H4 深蓝', { v: 'badge', bg: '1E3A5F', fc: 'FFFFFF' })
            .h5('H5 Info', { v: 'badge', bg: 'info' })
          .end()
        .end()
      .end();

      // 第二行：Pill / 颜色系统
      b.row_layout()
        .col_layout({ span: 3 })
          .card({ tt: 'Pill 胶囊风格' })
            .h1('H1 Primary', { v: 'pill', bg: 'primary' })
            .h2('H2 Success', { v: 'pill', bg: 'success' })
            .h3('H3 浅色', { v: 'pill', bg: 'light', fc: 'dark' })
            .h4('H4 Warning', { v: 'pill', bg: 'warning' })
            .h5('H5 自定义粉', { v: 'pill', bg: 'EC4899', fc: 'FFFFFF' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: '对齐变体' })
            .h3('左对齐标题', { v: 'left' })
            .h3('居中标题', { v: 'center' })
            .h3('右对齐标题', { v: 'right' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: '颜色系统' })
            .h4('Primary', { v: 'underline', bg: 'primary' })
            .h4('Success', { v: 'underline', bg: 'success' })
            .h4('Danger', { v: 'underline', bg: 'danger' })
            .h5('FF8C00 橙', { v: 'ribbon', bg: 'FF8C00', fc: 'FFFFFF' })
            .h5('7C3AED 紫', { v: 'pill', bg: '7C3AED', fc: 'FFFFFF' })
            .h5('EC4899 粉', { v: 'badge', bg: 'EC4899', fc: 'FFFFFF' })
            .h5('14B8A6 青', { v: 'ribbon', bg: '14B8A6', fc: 'FFFFFF' })
            .h6('浅色底线', { v: 'underline', bg: 'light', fc: 'dark' })
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-button',
    title: '按钮组件',
    desc: '展示所有按钮类型、变体、颜色、宽度和按钮组',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 4 })
          .card({ tt: '基础与变体' })
            .p('基础按钮：')
            .btn({ tx: '默认按钮' })
            .p('类型按钮：')
            .btn({ tx: 'Submit 按钮', t: 'submit' })
            .btn({ tx: 'Reset 按钮', t: 'reset' })
            .p('颜色变体 (v:)：')
            .btn({ tx: 'Primary', v: 'primary' })
            .btn({ tx: 'Danger', v: 'danger' })
            .btn({ tx: 'Success', v: 'success' })
            .btn({ tx: 'Warning', v: 'warning' })
            .btn({ tx: 'Ghost', v: 'ghost' })
            .p('尺寸变体：')
            .btn({ tx: '小按钮 SM', v: 'sm' })
            .btn({ tx: '默认大小' })
            .btn({ tx: '大按钮 LG', v: 'lg' })
            .p('圆角变体：')
            .btn({ tx: 'Pill 胶囊', v: 'pill' })
            .btn({ tx: 'Square 方形', v: 'square' })
            .btn({ tx: 'Primary Pill', v: 'primary,pill' })
            .btn({ tx: '自定义圆角', radius: '12px' })
            .p('组合变体：')
            .btn({ tx: '主要小按钮', v: 'primary,sm' })
            .btn({ tx: '危险大按钮', v: 'danger,lg' })
            .btn({ tx: '成功胶囊', v: 'success,pill' })
            .p('状态：')
            .btn({ tx: '禁用按钮', dis: true })
            .btn({ tx: '禁用 Primary', v: 'primary', dis: true })
            .p('带事件：')
            .btn({ tx: '点击我', clk: 'handleEdit' })
          .end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: '自定义颜色与宽度' })
            .p('自定义背景色 (bg:)：')
            .btn({ tx: '橙色按钮', bg: 'FF8C00', fc: 'FFFFFF' })
            .btn({ tx: '紫色按钮', bg: '7C3AED', fc: 'FFFFFF' })
            .btn({ tx: '语义色按钮', bg: 'info' })
            .btn({ tx: '暗色按钮', bg: 'dark', fc: 'FFFFFF' })
            .p('自定义文字色 (fc:)：')
            .btn({ tx: '红色文字', fc: 'danger' })
            .btn({ tx: '成功色文字', fc: 'success' })
            .p('宽度控制：')
            .btn({ tx: '半宽按钮', w: '50%' })
            .btn({ tx: '200px 宽按钮', w: '200px' })
            .btn({ tx: '全宽 Block 按钮', v: 'block' })
          .end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: '按钮组 (btngroup)' })
            .p('水平按钮组：')
            .btngroup()
              .btn({ tx: '左' })
              .btn({ tx: '中' })
              .btn({ tx: '右' })
            .end()
            .p('带颜色的按钮组：')
            .btngroup()
              .btn({ tx: '新增', v: 'success' })
              .btn({ tx: '编辑', v: 'primary' })
              .btn({ tx: '删除', v: 'danger' })
            .end()
            .p('胶囊圆角按钮组 (v:pill)：')
            .btngroup({ v: 'pill' })
              .btn({ tx: 'Option A' })
              .btn({ tx: 'Option B' })
              .btn({ tx: 'Option C' })
            .end()
            .p('胶囊彩色按钮组：')
            .btngroup({ v: 'pill' })
              .btn({ tx: 'Primary', v: 'primary' })
              .btn({ tx: 'Success', v: 'success' })
              .btn({ tx: 'Danger', v: 'danger' })
            .end()
            .p('垂直按钮组 (v:vertical)：')
            .btngroup({ v: 'vertical' })
              .btn({ tx: '选项一' })
              .btn({ tx: '选项二' })
              .btn({ tx: '选项三' })
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-input',
    title: '输入框组件',
    desc: '展示所有输入框类型、input-group、inline label',
    build() {
      const b = new TokUIBuilder();
      // === 第一行：基础类型 / 日期选择 / Inline Label ===
      b.row_layout()
        .col_layout({ span: 4 })
          .card({ tt: '基础类型与属性' })
            .input({ t: 'text', n: 'text', l: '文本输入', ph: '请输入文本' })
            .input({ t: 'email', n: 'email', l: '邮箱输入', ph: 'example@mail.com' })
            .input({ t: 'number', n: 'number', l: '数字输入', ph: '请输入数字', min: '0', max: '100', step: '5' })
            .pwd({ n: 'password', l: '密码输入', ph: '请输入密码' })
            .input({ t: 'text', n: 'required_field', l: '必填字段', ph: '必填', req: true })
            .input({ t: 'text', n: 'disabled_field', l: '禁用字段', ph: '不可编辑', dis: true })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: '日期与时间选择' })
            .input({ t: 'date', n: 'date', l: '日期选择', ph: 'xxxx-xx-xx' })
            .input({ t: 'time', n: 'time', l: '时间选择', ph: 'xx:xx' })
            .input({ t: 'datetime-local', n: 'datetime', l: '日期时间', ph: 'xxxx-xx-xx xx:xx' })
            .input({ t: 'date', n: 'date_range', l: '日期范围', min: '2024-01-01', max: '2026-12-31' })
            .input({ t: 'month', n: 'month', l: '月份选择' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: 'Inline Label (v:inline)' })
            .input({ n: 'username', l: '用户名', v: 'inline', ph: '请输入' })
            .input({ n: 'inline_email', l: '邮箱', v: 'inline', ph: 'xxx@mail.com' })
            .input({ n: 'phone', l: '手机号', v: 'inline', pre: '+86', ph: '请输入手机号' })
            .pwd({ n: 'inline_pwd', l: '密码', v: 'inline', ph: '请输入密码' })
            .input({ n: 'verify_code', l: '验证码', v: 'inline', ph: '请输入', hint: '6位数字验证码' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
      .end();

      // === 第二行：Input Group 前后追加 / 按钮追加 / Hint 提示 ===
      b.row_layout()
        .col_layout({ span: 4 })
          .card({ tt: 'Input Group 前后追加' })
            .input({ n: 'domain', l: '网址', pre: 'https://', app: '.com', ph: '域名' })
            .input({ n: 'amount', l: '金额', app: '元', t: 'number' })
            .pwd({ n: 'pwd_lock', l: '密码', pre: '🔒' })
            .input({ n: 'price', l: '价格', pre: '$|dark', app: '.00', t: 'number' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: 'Input Group 按钮追加' })
            .input({ n: 'btn_date', t: 'date', l: '日期选择', appbtn: '确认:confirmDate|primary' })
            .input({ n: 'btn_time', t: 'time', l: '时间选择', prebtn: '🕐:pickTime', appbtn: '现在:setNow|success' })
            .input({ n: 'btn_search', l: '搜索', appbtn: '搜索:handleSearch|primary', ph: '关键词' })
            .input({ n: 'btn_email', l: '邮箱', appbtn: '发送验证码:sendCode|success', ph: 'xxx@mail.com' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: 'Hint 提示与验证反馈' })
            .input({ n: 'hint_user', l: '用户名', ph: '请输入', hint: '用户名长度为3-20个字符' })
            .input({ n: 'hint_pwd', l: '密码', ph: '请输入', v: 'error', hint: '密码强度不足，请至少包含8个字符' })
            .input({ n: 'hint_phone', l: '手机号', ph: '请输入', v: 'error', hint: '手机号格式不正确' })
            .input({ n: 'hint_email', l: '邮箱', ph: 'xxx@mail.com', v: 'success', hint: '邮箱格式正确' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
      .end();

      // === 第三行：Size / Underline / 密码+搜索 ===
      b.row_layout()
        .col_layout({ span: 4 })
          .card({ tt: 'Size 尺寸变体 (v:sm/lg)' })
            .p('小尺寸 (v:sm)：')
            .input({ n: 'sm_input', l: 'SM Input', ph: '小尺寸输入', v: 'sm' })
            .input({ n: 'sm_inline', l: 'SM Inline', v: 'inline,sm', ph: '小尺寸行内' })
            .p('大尺寸 (v:lg)：')
            .input({ n: 'lg_input', l: 'LG Input', ph: '大尺寸输入', v: 'lg' })
            .input({ n: 'lg_inline', l: 'LG Inline', v: 'inline,lg', ph: '大尺寸行内' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: 'Underline 下划线 (v:underline)' })
            .input({ n: 'ul_normal', l: '下划线输入', ph: '请输入', v: 'underline' })
            .input({ n: 'ul_error', l: '下划线错误', ph: '请输入', v: 'underline,error', hint: '此字段不能为空' })
            .input({ n: 'ul_success', l: '下划线成功', ph: '已验证', v: 'underline,success' })
            .input({ n: 'ul_inline', l: '行内下划线', v: 'inline,underline', ph: '请输入' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: '密码切换 & 宽度 & 初始值' })
            .pwd({ n: 'toggle_pwd', l: '密码切换', ph: '请输入密码', toggle: true })
            .pwd({ n: 'init_pwd', l: '密码初始值', val: '123456', toggle: true })
            .input({ n: 'fixed_w', l: '固定宽度', ph: 'w:200px', w: '200px' })
            .input({ n: 'pct_w', l: '百分比宽度', ph: 'w:50%', w: '50%' })
            .input({ n: 'init_val', l: '初始值', val: 'hello world' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
      .end();

      // === 第四行：搜索输入 ===
      b.row_layout()
        .col_layout({ span: 4 })
          .card({ tt: '搜索图标 — 左侧 (search)' })
            .input({ n: 's_left', ph: '搜索...', search: true })
            .input({ n: 's_left_label', l: '带标签', ph: '输入关键词', search: true })
            .input({ n: 's_left_pill', ph: 'Pill 搜索', search: true, v: 'pill' })
            .input({ n: 's_left_pill_label', l: '带标签', ph: '搜索...', search: true, v: 'pill' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: '搜索图标 — 右侧 (search:right)' })
            .input({ n: 's_right', ph: '搜索...', search: 'right' })
            .input({ n: 's_right_label', l: '带标签', ph: '输入关键词', search: 'right' })
            .input({ n: 's_right_pill', ph: 'Pill 搜索', search: 'right', v: 'pill' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
        .col_layout({ span: 4 })
          .card({ tt: '搜索 + Input Group' })
            .input({ n: 's_group', ph: '搜索...', search: true, appbtn: '搜索:handleSearch|primary' })
            .input({ n: 's_pill_group', ph: 'Pill 搜索', search: true, v: 'pill', appbtn: 'Go|primary' })
            .input({ n: 's_label_group', ph: '带标签搜索', l: '关键词', search: true, v: 'pill', appbtn: 'Go|success' })
          .ft()
            .btn({ tx: '获取数据', v: 'primary,sm', clk: 'collectCardInputs' })
          .end().end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-select-radio-check',
    title: '选择组件',
    desc: '展示下拉选择、单选、复选',
    build() {
      const b = new TokUIBuilder();
      b.row_layout()
        .col_layout({ span: 3 })
          .card({ tt: '下拉选择 Select' })
            .select({ l: '选择城市', id: 'city' })
              .opt({ v: 'beijing', tx: '北京' })
              .opt({ v: 'shanghai', tx: '上海' })
              .opt({ v: 'guangzhou', tx: '广州' })
              .opt({ v: 'shenzhen', tx: '深圳' })
            .end()
            .select({ l: '选择角色', id: 'role2', v: 'error' })
              .opt({ v: '', tx: '-- 请选择 --' })
              .opt({ v: 'dev', tx: '开发者' })
            .end()
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: '多选下拉 Multi-Select' })
            .form({ id: 'multiSelectForm', sub: 'handleMultiSelect' })
              .select({ l: '选择技能（多选）', id: 'skills', multi: true })
                .opt({ v: 'js', tx: 'JavaScript' })
                .opt({ v: 'ts', tx: 'TypeScript' })
                .opt({ v: 'py', tx: 'Python' })
                .opt({ v: 'go', tx: 'Go' })
                .opt({ v: 'rust', tx: 'Rust' })
                .opt({ v: 'java', tx: 'Java' })
              .end()
              .select({ l: '兴趣爱好', id: 'hobbies', multi: true })
                .opt({ v: 'reading', tx: '阅读' })
                .opt({ v: 'music', tx: '音乐' })
                .opt({ v: 'sports', tx: '运动' })
                .opt({ v: 'travel', tx: '旅行' })
              .end()
              .btn({ tx: '获取所选内容', t: 'submit', clk: 'handleMultiSelect' })
            .end()
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: '单选按钮组 Radio' })
            .radio({ l: '性别', n: 'gender2', id: 'gender2' })
              .opt({ v: 'male', tx: '男', chk: true })
              .opt({ v: 'female', tx: '女' })
            .end()
            .radio({ l: '优先级', n: 'priority2', id: 'priority2' })
              .opt({ v: 'high', tx: '高' })
              .opt({ v: 'mid', tx: '中', chk: true })
              .opt({ v: 'low', tx: '低' })
            .end()
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: '复选框 Checkbox' })
            .checkbox({ l: '同意用户协议', id: 'agree2' })
            .checkbox({ l: '已选中的复选框', id: 'checked2', chk: true })
            .checkbox({ l: '订阅通知', id: 'notify' })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 3 })
          .card({ tt: 'Inline Select' })
            .select({ l: '城市', id: 'inlineCity', v: 'inline' })
              .opt({ v: 'bj', tx: '北京' })
              .opt({ v: 'sh', tx: '上海' })
              .opt({ v: 'gz', tx: '广州' })
            .end()
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: 'Inline Multi-Select' })
            .select({ l: '标签', id: 'inlineTags', v: 'inline', multi: true })
              .opt({ v: 'vue', tx: 'Vue' })
              .opt({ v: 'react', tx: 'React' })
              .opt({ v: 'angular', tx: 'Angular' })
              .opt({ v: 'svelte', tx: 'Svelte' })
            .end()
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: 'Inline Radio' })
            .radio({ l: '状态', n: 'inlineStatus', id: 'inlineStatus', v: 'inline' })
              .opt({ v: 'active', tx: '激活', chk: true })
              .opt({ v: 'inactive', tx: '停用' })
            .end()
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: 'Inline Checkbox' })
            .checkbox({ l: '记住我', id: 'inlineRemember', v: 'inline' })
            .checkbox({ l: '自动登录', id: 'inlineAutoLogin', v: 'inline', chk: true })
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'show-picker',
    title: '选择器组件',
    desc: '展示 picker 单选/多选/搜索/回显/inline',
    build() {
      const b = new TokUIBuilder();
      b.row_layout()
        .col_layout({ span: 3 })
          .card({ tt: 'Picker — 单选' })
            .picker({ l: '城市（空选）', id: 'city', ph: '请选择城市' })
              .opt({ v: 'bj', tx: '北京' })
              .opt({ v: 'sh', tx: '上海' })
              .opt({ v: 'gz', tx: '广州' })
              .opt({ v: 'sz', tx: '深圳' })
              .opt({ v: 'hz', tx: '杭州' })
              .opt({ v: 'cd', tx: '成都' })
            .end()
            .btn({ tx: '获取选中值', clk: 'getPickerCity', v: 'primary' })
            .picker({ l: '部门（回显）', id: 'dept' })
              .opt({ v: 'tech', tx: '技术部' })
              .opt({ v: 'product', tx: '产品部', chk: true })
              .opt({ v: 'design', tx: '设计部' })
              .opt({ v: 'market', tx: '市场部' })
            .end()
            .btn({ tx: '获取选中值', clk: 'getPickerDept', v: 'primary' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: 'Picker — 多选' })
            .picker({ l: '语言（空选）', id: 'lang', multi: true, ph: '搜索并选择' })
              .opt({ v: 'js', tx: 'JavaScript' })
              .opt({ v: 'py', tx: 'Python' })
              .opt({ v: 'go', tx: 'Go' })
              .opt({ v: 'rs', tx: 'Rust' })
              .opt({ v: 'java', tx: 'Java' })
              .opt({ v: 'ts', tx: 'TypeScript' })
              .opt({ v: 'csharp', tx: 'C#' })
              .opt({ v: 'cpp', tx: 'C++' })
            .end()
            .btn({ tx: '获取选中值', clk: 'getPickerLang', v: 'primary' })
            .picker({ l: '权限（回显）', id: 'perms', multi: true })
              .opt({ v: 'read', tx: '查看', chk: true })
              .opt({ v: 'write', tx: '编辑', chk: true })
              .opt({ v: 'delete', tx: '删除' })
              .opt({ v: 'admin', tx: '管理' })
            .end()
            .btn({ tx: '获取选中值', clk: 'getPickerPerms', v: 'primary' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: 'Picker — Inline' })
            .picker({ l: '城市', id: 'inlineCity', v: 'inline', ph: '请选择' })
              .opt({ v: 'bj', tx: '北京' })
              .opt({ v: 'sh', tx: '上海' })
              .opt({ v: 'gz', tx: '广州' })
            .end()
            .picker({ l: '标签', id: 'inlineTags', v: 'inline', multi: true })
              .opt({ v: 'vue', tx: 'Vue' })
              .opt({ v: 'react', tx: 'React' })
              .opt({ v: 'angular', tx: 'Angular' })
            .end()
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ tt: 'Picker — 表单提交' })
            .form({ id: 'pickerForm' })
              .picker({ l: '角色', id: 'role', ph: '请选择角色' })
                .opt({ v: 'admin', tx: '管理员' })
                .opt({ v: 'editor', tx: '编辑者' })
                .opt({ v: 'viewer', tx: '查看者' })
              .end()
              .picker({ l: '技能', id: 'skills', multi: true })
                .opt({ v: 'js', tx: 'JavaScript' })
                .opt({ v: 'py', tx: 'Python' })
                .opt({ v: 'go', tx: 'Go' })
              .end()
              .btn({ tx: '提交表单', t: 'submit', clk: 'handlePickerSubmit', v: 'primary' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 3 })
          .card({ tt: 'Picker — 禁用状态' })
            .picker({ l: '地区（禁用）', id: 'region_dis', dis: true })
              .opt({ v: 'east', tx: '华东', chk: true })
              .opt({ v: 'south', tx: '华南' })
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-card',
    title: '卡片组件',
    desc: '展示卡片所有变体和页脚',
    build() {
      const b = new TokUIBuilder();
      b.h2('卡片组件变体')
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '基础卡片' })
              .p('这是基础卡片，带标题栏和内容区域。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '带页脚的卡片', v: 'highlight' })
              .p('这张卡片使用了 highlight 变体，边框为主题色。')
              .ft()
                .btn({ tx: '保存', v: 'primary', clk: 'handleSave' })
                .btn({ tx: '取消', clk: 'handleCancel' })
              .end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '扁平卡片', v: 'flat' })
              .p('flat 变体：无边框、无阴影、浅色背景。适合信息展示。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '加粗边框卡片', v: 'bordered' })
              .p('bordered 变体：2px 加粗边框。')
              .ft()
                .btn({ tx: '删除', v: 'danger,sm', clk: 'handleDelete' })
                .btn({ tx: '导出', v: 'ghost,sm', clk: 'handleExport' })
              .end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '无标题卡片' })
              .p('这是有标题的卡片，标题区域显示「无标题卡片」。')
              .p('真正的无标题卡片看右侧示例。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card()
              .p('不传 tt 属性时，卡片不渲染标题栏，直接显示内容。')
              .p('适合纯内容展示、信息提示等不需要标题的场景。')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card()
              .img({ s: 'https://picsum.photos/seed/notitle/600/300', alt: '无标题图片卡片' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ v: 'bordered' })
              .p('无标题 + bordered 变体，适合引用、备注等场景。')
              .ft({ v: 'right' })
                .p('— 匿名用户')
              .end()
            .end()
          .end()
        .end()
        .h3('自闭合卡片 (cardTx)')
        .p('使用 cardTx 一行代码生成只含标题和文本的卡片，无需 end() 闭合：')
        .cardTx('通知公告', '系统将于本周六凌晨 2:00-6:00 进行维护升级，届时服务将暂停。')
        .cardTx('温馨提示', '请及时修改您的初始密码，确保账户安全。')
        .row_layout()
          .col_layout({ span: 6 })
            .cardTx('快捷操作', '点击左侧导航选择更多组件示例。')
          .end()
          .col_layout({ span: 6 })
            .cardTx('版本更新', 'TokUI v0.1.2 已发布，支持卡片自闭合模式。')
          .end()
        .end()
        .hr()
        .h3('Header 风格')
        .p('card 的 ht 属性控制标题栏风格，默认无背景无分割线。可选：stripe / line / accent / pill / underline / dot / fill')
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '默认标题（无 ht）' })
              .p('标题区域无背景、无分割线，干净简洁。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Stripe 条纹', ht: 'stripe' })
              .p('经典条纹背景 + 底部分割线，适合后台管理类卡片。')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Line 分割线', ht: 'line' })
              .p('仅底部 2px 分割线，无背景色，层次分明。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Accent 左侧竖条', ht: 'accent' })
              .p('左侧主题色竖条装饰，强调标题存在感。')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Pill 药丸标题', ht: 'pill' })
              .p('标题文字带主题色背景药丸，活泼醒目。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Underline 下划线', ht: 'underline' })
              .p('标题下方短横线装饰，优雅含蓄。')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Dot 圆点装饰', ht: 'dot' })
              .p('标题前主题色圆点，轻量标记风格。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Fill 填充标题', ht: 'fill' })
              .p('主题色背景 + 白色文字，强视觉冲击。')
              .ft()
                .btn({ tx: '查看详情', v: 'primary', clk: 'handleDetail' })
              .end()
            .end()
          .end()
        .end()
        .hr()
        .h3('Header 配色')
        .p('hc 属性为 header 指定配色，支持预设色（primary/danger/success/warning/info/dark）和自定义色值。需配合 ht 使用。')
        .card({ tt: 'Fill 配色', ht: 'fill' })
          .row_layout()
            .col_layout({ span: 4 })
              .card({ tt: 'Primary', ht: 'fill', hc: 'primary' }).p('默认蓝').end()
            .end()
            .col_layout({ span: 4 })
              .card({ tt: 'Danger', ht: 'fill', hc: 'danger' }).p('危险红').end()
            .end()
            .col_layout({ span: 4 })
              .card({ tt: 'Success', ht: 'fill', hc: 'success' }).p('成功绿').end()
            .end()
          .end()
          .row_layout()
            .col_layout({ span: 4 })
              .card({ tt: 'Warning', ht: 'fill', hc: 'warning' }).p('警告橙').end()
            .end()
            .col_layout({ span: 4 })
              .card({ tt: 'Info', ht: 'fill', hc: 'info' }).p('信息紫').end()
            .end()
            .col_layout({ span: 4 })
              .card({ tt: 'Dark', ht: 'fill', hc: 'dark' }).p('深色').end()
            .end()
          .end()
        .end()
        .card({ tt: 'Accent 配色', ht: 'fill', hc: 'primary' })
          .row_layout()
            .col_layout({ span: 4 })
              .card({ tt: 'Danger', ht: 'accent', hc: 'danger' }).p('红色竖条').end()
            .end()
            .col_layout({ span: 4 })
              .card({ tt: 'Success', ht: 'accent', hc: 'success' }).p('绿色竖条').end()
            .end()
            .col_layout({ span: 4 })
              .card({ tt: 'Warning', ht: 'accent', hc: 'warning' }).p('橙色竖条').end()
            .end()
          .end()
          .row_layout()
            .col_layout({ span: 4 })
              .card({ tt: 'Info', ht: 'accent', hc: 'info' }).p('紫色竖条').end()
            .end()
            .col_layout({ span: 4 })
              .card({ tt: 'Dark', ht: 'accent', hc: 'dark' }).p('深色竖条').end()
            .end()
            .col_layout({ span: 4 })
              .card({ tt: '自定义紫', ht: 'accent', hc: '#8b5cf6' }).p('自定义色值').end()
            .end()
          .end()
        .end()
        .card({ tt: '其他风格配色', ht: 'fill', hc: 'success' })
          .row_layout()
            .col_layout({ span: 3 })
              .card({ tt: 'Underline', ht: 'underline', hc: 'danger' }).p('红色下划线').end()
            .end()
            .col_layout({ span: 3 })
              .card({ tt: 'Dot', ht: 'dot', hc: 'success' }).p('绿色圆点').end()
            .end()
            .col_layout({ span: 3 })
              .card({ tt: 'Pill', ht: 'pill', hc: 'warning' }).p('橙色药丸').end()
            .end()
            .col_layout({ span: 3 })
              .card({ tt: '自定义', ht: 'pill', hc: '#8b5cf6' }).p('紫色药丸').end()
            .end()
          .end()
        .end()
        .hr()
        .h3('卡片内容对齐')
        .p('card 通过 v:center / v:right 原生支持标题和 body 内容对齐，无需 row/col：')
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '标题居中 · 内容居中', v: 'center' })
              .p('标题和 body 文本都跟随 card 的 v:center 对齐。')
              .p('适合通知、公告等居中展示场景。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '标题居右 · 内容居右', v: 'right' })
              .p('标题和 body 文本右对齐。')
              .p('适合价格、金额等右对齐场景。')
            .end()
          .end()
        .end()
        .hr()
        .h3('页脚对齐与内容')
        .p('ft（页脚）通过 v:left / center / right 原生控制对齐，可放按钮、文本、链接等任意内容：')
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '页脚居中 · 按钮' })
              .p('页脚内容居中，放置操作按钮。')
              .ft({ v: 'center' })
                .btn({ tx: '确认', v: 'primary', clk: 'handleCenterOk' })
                .btn({ tx: '取消', clk: 'handleCenterCancel' })
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '页脚居右 · 按钮' })
              .p('页脚内容右对齐，放置操作按钮。')
              .ft({ v: 'right' })
                .btn({ tx: '付款', v: 'primary', clk: 'handlePay' })
                .btn({ tx: '返回', clk: 'handleBack' })
              .end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '页脚居中 · 纯文本' })
              .p('页脚不一定放按钮，纯文本提示信息也可以。')
              .ft({ v: 'center' })
                .p('— 共 3 条记录，最后更新于 2025-06-01 —')
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '页脚居右 · 版权文本' })
              .p('页脚放置版权或备注信息，右对齐展示。')
              .ft({ v: 'right' })
                .p('© 2025 TokUI Team. All rights reserved.')
              .end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '页脚居左 · 链接与文本' })
              .p('页脚放链接和文本混合内容。')
              .ft({ v: 'left' })
                .a({ tx: '帮助文档', u: '/docs' })
                .p(' | ')
                .a({ tx: '联系我们', u: '/contact' })
                .p('版本 v0.1.2')
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '页脚居中 · 按钮与文本混合' })
              .p('页脚同时放按钮和说明文本。')
              .ft({ v: 'center' })
                .btn({ tx: '导出 PDF', v: 'primary', clk: 'handleExportPdf' })
                .p('导出后可在「下载中心」查看')
              .end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '卡片居右 + 页脚居右', v: 'right' })
              .p('card v:right 和 ft v:right 组合使用。')
              .ft({ v: 'right' })
                .btn({ tx: '提交订单', v: 'primary', clk: 'handleSubmit' })
                .p('合计: ¥299.00')
              .end()
            .end()
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-grid',
    title: '栅格布局',
    desc: '展示 Row/Col 各种 span 组合（用卡片包裹以便看清布局）',
    build() {
      const b = new TokUIBuilder();
      b.h2('栅格布局 — 12 栅格系统')
        .p('span:12 → 整行')
        .row_layout()
          .col_layout({ span: 12 })
            .card({ tt: 'span:12' }).p('占满整行宽度').end()
          .end()
        .end()
        .p('span:6 + span:6 → 两列等分')
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'span:6' }).p('左列').end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'span:6' }).p('右列').end()
          .end()
        .end()
        .p('span:4 × 3 → 三列等分')
        .row_layout()
          .col_layout({ span: 4 })
            .card({ tt: 'span:4' }).p('第一列').end()
          .end()
          .col_layout({ span: 4 })
            .card({ tt: 'span:4' }).p('第二列').end()
          .end()
          .col_layout({ span: 4 })
            .card({ tt: 'span:4' }).p('第三列').end()
          .end()
        .end()
        .p('span:3 × 4 → 四列等分')
        .row_layout()
          .col_layout({ span: 3 })
            .card().p('span:3').end()
          .end()
          .col_layout({ span: 3 })
            .card().p('span:3').end()
          .end()
          .col_layout({ span: 3 })
            .card().p('span:3').end()
          .end()
          .col_layout({ span: 3 })
            .card().p('span:3').end()
          .end()
        .end()
        .p('span:8 + span:4 → 不等分')
        .row_layout()
          .col_layout({ span: 8 })
            .card({ tt: 'span:8', v: 'highlight' }).p('宽列内容区，适合放主要信息').end()
          .end()
          .col_layout({ span: 4 })
            .card({ tt: 'span:4' }).p('窄列侧边栏').end()
          .end()
        .end()
        .p('span:4 + span:8 → 反向不等分')
        .row_layout()
          .col_layout({ span: 4 })
            .card({ tt: 'span:4' }).p('侧边导航').end()
          .end()
          .col_layout({ span: 8 })
            .card({ tt: 'span:8' }).p('主内容区域').end()
          .end()
        .end()
        .p('嵌套栅格：')
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '左半区' })
              .row_layout()
                .col_layout({ span: 6 }).card().p('内层 A').end().end()
                .col_layout({ span: 6 }).card().p('内层 B').end().end()
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '右半区' })
              .row_layout()
                .col_layout({ span: 4 }).card().p('1/3').end().end()
                .col_layout({ span: 4 }).card().p('1/3').end().end()
                .col_layout({ span: 4 }).card().p('1/3').end().end()
              .end()
            .end()
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-list',
    title: '列表组件',
    desc: '展示有序和无序列表，支持简写标签',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '无序列表 (list t:ul)' })
        .list({ t: 'ul' })
          .item('JavaScript ES6+')
          .item('Node.js 原生 HTTP')
          .item('CSS Grid / Flexbox')
          .item('SSE 流式传输')
          .item('零依赖架构')
        .end()
      .end()
      .card({ tt: '有序列表 (list t:ol)' })
        .list({ t: 'ol' })
          .item('需求分析')
          .item('架构设计')
          .item('编码实现')
          .item('测试验证')
          .item('部署上线')
        .end()
      .end()
      .card({ tt: '无序列表 (ul/i 简写)' })
        .ul()
          .i('简洁的 ul/i 标签')
          .i('与 list/item 完全等效')
          .i('更短的 DSL 语法')
        .end()
      .end()
      .card({ tt: '有序列表 (ol/i 简写)' })
        .ol()
          .i('下载源码')
          .i('安装依赖')
          .i('启动服务器')
          .i('访问 localhost:3109')
        .end()
      .end()
      .card({ tt: '富列表：图文卡片 (plain)' })
        .ul({ plain: true })
          .i()
            .card({ tt: 'TokUI 框架', stripe: true })
              .row_layout()
                .col_layout({ span: 4 })
                  .img({ s: 'https://picsum.photos/seed/tokui1/200/120', alt: '框架' })
                .end()
                .col_layout({ span: 8 })
                  .p('零依赖流式 UI 框架，DSL 描述组件，SSE 实时推送渲染')
                .end()
              .end()
            .end()
          .end()
          .i()
            .card({ tt: 'Node.js 后端', stripe: true })
              .row_layout()
                .col_layout({ span: 4 })
                  .img({ s: 'https://picsum.photos/seed/nodejs1/200/120', alt: '后端' })
                .end()
                .col_layout({ span: 8 })
                  .p('原生 HTTP 模块，无 Express 依赖，80ms 间隔流式推送')
                .end()
              .end()
            .end()
          .end()
          .i()
            .card({ tt: '前端渲染器', stripe: true })
              .row_layout()
                .col_layout({ span: 4 })
                  .img({ s: 'https://picsum.photos/seed/frontend1/200/120', alt: '前端' })
                .end()
                .col_layout({ span: 8 })
                  .p('增量解析 + 实时 DOM 渲染，支持流式和一次性两种模式')
                .end()
              .end()
            .end()
          .end()
        .end()
      .end()
      .card({ tt: '富列表：嵌套子列表 (plain)' })
        .ul({ plain: true })
          .i('前端技术栈')
          .i()
            .p('后端技术栈：')
            .ol()
              .i('Node.js 运行时')
              .i('原生 HTTP 模块')
              .i('SSE 流式传输')
            .end()
          .end()
          .i('CSS 变量主题系统')
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-table',
    title: '表格组件',
    desc: '展示表格所有变体',
    build() {
      const b = new TokUIBuilder();
      b.h2('表格组件')
        .card({ tt: '基础表格' })
          .table({ id: 't1' })
            .theadCols('姓名,年龄,城市')
            .tbody()
              .row('张三', '28', '北京')
              .row('李四', '32', '上海')
            .end()
          .end()
        .end()
        .card({ tt: '斑马纹表格 (stripe)' })
          .table({ stripe: true })
            .theadCols('项目,进度,负责人')
            .tbody()
              .row('TokUI 框架', '85%', '张三')
              .row('数据平台', '60%', '李四')
              .row('移动端 App', '100%', '王五')
            .end()
          .end()
        .end()
        .card({ tt: '边框表格 (bordered)' })
          .table({ v: 'bordered' })
            .theadCols('语言,类型,年份')
            .tbody()
              .row('JavaScript', '动态', '1995')
              .row('Python', '动态', '1991')
            .end()
          .end()
        .end()
        .card({ tt: '紧凑表格 (compact)' })
          .table({ v: 'compact' })
            .theadCols('ID,名称,状态')
            .tbody()
              .row('001', '模块A', '正常')
              .row('002', '模块B', '异常')
              .row('003', '模块C', '正常')
            .end()
          .end()
        .end()
        .card({ tt: '组合变体：斑马纹 + 加边框' })
          .table({ stripe: true, v: 'bordered' })
            .theadCols('季度,营收,增长率')
            .tbody()
              .row('Q1', '120万', '+15%')
              .row('Q2', '150万', '+25%')
              .row('Q3', '180万', '+20%')
              .row('Q4', '210万', '+17%')
            .end()
          .end()
        .end()
        .card({ tt: '列对齐 (/c 居中 · /r 居右 · /l 居左默认)' })
          .p('列名后加 /c /r /l 控制整列（含表头）对齐：')
          .table({ stripe: true })
            .theadCols('商品,销量/c,单价/r,金额/r')
            .tbody()
              .row('T 恤', '128', '¥59', '¥7,552')
              .row('卫衣', '86', '¥129', '¥11,094')
              .row('外套', '42', '¥299', '¥12,558')
            .end()
          .end()
        .end()
        .card({ tt: '选择列 + 对齐（chk + # + /r）' })
          .p('特殊列 chk(全选) / #(序号) 可与对齐混用：')
          .table({ stripe: true, v: 'bordered' })
            .theadCols('chk,#,商品,库存/c,单价/r')
            .tbody()
              .row('chk', '', 'T 恤', '320', '¥59')
              .row('chk', '', '卫衣', '150', '¥129')
              .row('chk', '', '外套', '88', '¥299')
            .end()
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-img',
    title: '图片组件',
    desc: '展示图片基础、变体、尺寸控制和实际场景',
    build() {
      const b = new TokUIBuilder();
      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '普通图片' })
            .img({ s: 'https://picsum.photos/seed/normal1/600/300', alt: '普通图片' })
            .p('默认 100% 宽度，自适应高度，点击可灯箱预览。', { v: 'muted' })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '自定义尺寸 (w/h)' })
            .img({ s: 'https://picsum.photos/seed/size1/400/200', alt: '指定宽度', w: '300' })
            .p('指定 w:300', { v: 'sm,muted' })
            .img({ s: 'https://picsum.photos/seed/size2/200/200', alt: '固定宽高', w: '120', h: '120' })
            .p('指定 w:120 h:120', { v: 'sm,muted' })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '头像变体 (v:avatar)' })
            .row_layout()
              .col_layout({ span: 3 })
                .img({ s: 'https://picsum.photos/seed/av1/200/200', alt: '用户A', v: 'avatar' })
              .end()
              .col_layout({ span: 3 })
                .img({ s: 'https://picsum.photos/seed/av2/200/200', alt: '用户B', v: 'avatar' })
              .end()
              .col_layout({ span: 3 })
                .img({ s: 'https://picsum.photos/seed/av3/200/200', alt: '用户C', v: 'avatar' })
              .end()
              .col_layout({ span: 3 })
                .img({ s: 'https://picsum.photos/seed/av4/200/200', alt: '用户D', v: 'avatar' })
              .end()
            .end()
            .p('圆形裁剪，常用于用户头像展示。', { v: 'muted' })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '圆角与边框变体' })
            .img({ s: 'https://picsum.photos/seed/round1/600/300', alt: '圆角图片', v: 'rounded' })
            .p('v:rounded — 大圆角', { v: 'sm,muted' })
            .img({ s: 'https://picsum.photos/seed/border1/600/300', alt: '边框图片', v: 'bordered' })
            .p('v:bordered — 带边框+内边距', { v: 'sm,muted' })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '实际场景 — 产品卡片' })
            .row_layout()
              .col_layout({ span: 6 })
                .card({ tt: '智能对话框架 Pro' })
                  .img({ s: 'https://picsum.photos/seed/prod1/600/300', alt: 'AI对话', v: 'rounded' })
                  .p('零依赖、流式渲染、插件化扩展。', { v: 'muted' })
                  .btn({ tx: '立即体验', v: 'primary,sm', clk: 'handleTry' })
                .end()
              .end()
              .col_layout({ span: 6 })
                .card({ tt: '无线降噪耳机' })
                  .img({ s: 'https://picsum.photos/seed/prod3/600/300', alt: '耳机', v: 'rounded' })
                  .p('¥ 1,299', { v: 'bold' })
                  .p('主动降噪，续航 40 小时。', { v: 'muted' })
                  .btn({ tx: '加入购物车', v: 'primary,sm', clk: 'handleAddCart' })
                .end()
              .end()
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-imgs',
    title: '多图组件',
    desc: '展示 1~9 张不同数量的九宫格',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '多图九宫格 — 不同数量' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '1 张图片' })
              .imgs({ s: 'https://picsum.photos/seed/g1/400/400' }).end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '2 张图片' })
              .imgs({ s: 'https://picsum.photos/seed/g2a/400/400,https://picsum.photos/seed/g2b/400/400' }).end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '3 张图片' })
              .imgs({ s: 'https://picsum.photos/seed/g3a/400/400,https://picsum.photos/seed/g3b/400/400,https://picsum.photos/seed/g3c/400/400' }).end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '4 张图片' })
              .imgs({ s: 'https://picsum.photos/seed/g4a/400/400,https://picsum.photos/seed/g4b/400/400,https://picsum.photos/seed/g4c/400/400,https://picsum.photos/seed/g4d/400/400' }).end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '6 张图片' })
              .imgs()
                .img({ s: 'https://picsum.photos/seed/g6a/400/400' })
                .img({ s: 'https://picsum.photos/seed/g6b/400/400' })
                .img({ s: 'https://picsum.photos/seed/g6c/400/400' })
                .img({ s: 'https://picsum.photos/seed/g6d/400/400' })
                .img({ s: 'https://picsum.photos/seed/g6e/400/400' })
                .img({ s: 'https://picsum.photos/seed/g6f/400/400' })
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '9 张图片' })
              .imgs({ s: 'https://picsum.photos/seed/g9a/400/400,https://picsum.photos/seed/g9b/400/400,https://picsum.photos/seed/g9c/400/400,https://picsum.photos/seed/g9d/400/400,https://picsum.photos/seed/g9e/400/400,https://picsum.photos/seed/g9f/400/400,https://picsum.photos/seed/g9g/400/400,https://picsum.photos/seed/g9h/400/400,https://picsum.photos/seed/g9i/400/400' }).end()
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-code',
    title: '代码块',
    desc: '展示多语言代码块',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '代码块 — 多语言语法高亮' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'JavaScript' })
              .code({ lang: 'js' }, '/**\n * 斐波那契数列（递归实现）\n * @param {number} n - 项数\n * @returns {number} 第 n 项的值\n */\nfunction fibonacci(n) {\n  // 基线条件：n <= 1 直接返回\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log(fibonacci(10)); // 输出 55')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'TypeScript' })
              .code({ lang: 'ts' }, '// 用户数据接口定义\ninterface User {\n  id: number;        // 用户唯一标识\n  name: string;      // 用户名\n  email?: string;    // 邮箱（可选）\n}\n\n// 生成问候语\nfunction greet(user: User): string {\n  return `Hello, ${user.name}!`;\n}')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Python' })
              .code({ lang: 'python' }, '# 单链表节点定义\nclass Node:\n    def __init__(self, val, next=None):\n        self.val = val     # 节点值\n        self.next = next   # 后继指针\n\n# 反转链表（迭代法，三指针交换）\ndef reverse_list(head):\n    prev = None\n    while head:\n        head.next, prev, head = prev, head, head.next\n    return prev')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Go' })
              .code({ lang: 'go' }, 'package main\n\nimport "fmt"\n\n// sum 求整数切片元素之和\nfunc sum(nums []int) int {\n    total := 0 // 累加器\n    for _, n := range nums {\n        total += n\n    }\n    return total\n}\n\nfunc main() {\n    fmt.Println(sum([]int{1, 2, 3, 4, 5})) // 输出 15\n}')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Rust' })
              .code({ lang: 'rust' }, 'fn main() {\n    let numbers = vec![1, 2, 3, 4, 5];\n    let sum: i32 = numbers.iter().sum(); // 求和\n    println!("Sum = {}", sum);\n}\n\n// 阶乘（模式匹配实现）\nfn factorial(n: u64) -> u64 {\n    match n {\n        0 | 1 => 1, // 基线条件\n        _ => n * factorial(n - 1),\n    }\n}')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'SQL' })
              .code({ lang: 'sql' }, '-- 查询下单超过 5 次的活跃用户\nSELECT u.name, COUNT(o.id) AS order_count\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.created_at >= "2024-01-01" -- 仅统计 2024 年起\nGROUP BY u.id\nHAVING order_count > 5 -- 过滤阈值\nORDER BY order_count DESC;')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'CSS' })
              .code({ lang: 'css' }, '/* 响应式自适应网格布局 */\n.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;     /* 列间距 */\n  padding: 2rem; /* 内边距 */\n}')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Bash / Shell' })
              .code({ lang: 'bash' }, '#!/bin/bash\n# 批量备份所有 MySQL 数据库\n\nBACKUP_DIR="/backup/$(date +%Y%m%d)" # 按日期归档目录\nmkdir -p "$BACKUP_DIR"\n\n# 遍历每个数据库并导出\nfor db in $(mysql -e "SHOW DATABASES;" -s --skip-column-names); do\n  mysqldump "$db" > "$BACKUP_DIR/${db}.sql"\ndone\n\necho "Backup completed: $BACKUP_DIR"')
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-md',
    title: 'Markdown',
    desc: '展示 Markdown 渲染效果',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Markdown 富文本渲染' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '基础排版' })
              .md('# 一级标题\n## 二级标题\n### 三级标题\n\n这是普通段落。**粗体文字**、*斜体文字*、~~删除线~~ 和 `行内代码` 都可以混排使用。\n\n访问 [TokUI 文档](https://example.com/docs) 了解更多详情，或查看 [GitHub](https://github.com) 源码。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '列表与任务' })
              .md('### 无序列表\n\n- 轻量 DSL 语法描述组件\n- SSE 流式实时推送\n- 插件化注册，按需扩展\n\n### 有序列表\n\n1. 引入 TokUI 脚本\n2. 注册组件渲染器\n3. 通过 Builder 生成 DSL\n4. 前端解析并渲染\n\n### 任务列表\n\n- [x] 基础组件渲染\n- [x] Markdown 支持\n- [ ] 表格排序功能\n- [ ] 主题动态切换')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '引用与分隔线' })
              .md('> TokUI 是一个零依赖的流式 UI 描述与渲染框架。\n> 核心场景为 AI 对话中的流式 UI 生成。\n> 支持 SSE 实时推送和增量解析。\n\n---\n\n> **设计哲学**：简单优于复杂，流式优于等待。\n> 通过轻量 DSL 让后端一行代码即可描述完整 UI。\n\n***\n\n> 提示：所有组件都支持主题切换和错误边界降级。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '表格' })
              .md('### 组件清单\n\n| 组件 | 类型 | 状态 |\n|:---|:---|:---|\n| Button | 表单 | 已完成 |\n| Table | 数据展示 | 已完成 |\n| Chart | 数据展示 | 已完成 |\n| Dialog | 反馈 | 已完成 |\n| Carousel | 数据展示 | 开发中 |\n\n### 性能对比\n\n| 模块 | 渲染耗时 | 内存占用 |\n|---:|---:|---:|\n| Parser | <1ms | 极低 |\n| Renderer | 2ms | 低 |\n| Theme | 0ms | 无 |')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '代码围栏' })
              .md('### JavaScript 示例\n\n```js\nfunction throttle(fn, wait) {\n  let last = 0;\n  return function(...args) {\n    const now = Date.now();\n    if (now - last >= wait) {\n      last = now;\n      fn.apply(this, args);\n    }\n  };\n}\n```\n\n### Python 示例\n\n```python\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n```')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '图片与混合排版' })
              .md('### 网络图片\n\n![示例图片](https://picsum.photos/seed/md1/600/200)\n\n### 图文混排\n\n下面是一个 **数据展示卡片** 的效果：\n\n- 标题使用 **粗体** 强调\n- 描述文字支持 *斜体* 和 `代码`\n- 图片自适应宽度，点击可预览\n\n![风景](https://picsum.photos/seed/md2/400/150)\n\n> 图片引用语法：`![alt](url)`，仅支持 https 链接。')
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-align',
    title: '对齐方式',
    desc: '展示标题/段落/卡片/页脚/行 的对齐变体',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '标题对齐 (v:left / center / right)' })
        .h2('默认左对齐标题')
        .h2('居中标题', { v: 'center' })
        .h2('右对齐标题', { v: 'right' })
      .end()
      .card({ tt: '段落对齐' })
        .p('默认左对齐段落文本。TokUI 是一个面向AI的流式UI描述与渲染框架。')
        .p('居中段落文本。TokUI 是一个面向AI的流式UI描述与渲染框架。', { v: 'center' })
        .p('右对齐段落文本。TokUI 是一个面向AI的流式UI描述与渲染框架。', { v: 'right' })
      .end()
      .card({ tt: '页脚对齐 (ft v:left / center / right)' })
        .p('页脚默认左对齐：')
        .ft()
          .btn({ tx: '保存', v: 'primary' })
          .btn({ tx: '取消' })
        .end()
      .end()
      .card({ tt: '页脚居中' })
        .p('页脚内容居中排列：')
        .ft({ v: 'center' })
          .btn({ tx: '同意', v: 'success' })
          .btn({ tx: '拒绝', v: 'danger' })
        .end()
      .end()
      .card({ tt: '页脚右对齐' })
        .p('页脚内容靠右排列：')
        .ft({ v: 'right' })
          .btn({ tx: '上一步' })
          .btn({ tx: '下一步', v: 'primary' })
        .end()
      .end()
      .card({ tt: '卡片居中 (v:center)', v: 'center' })
        .p('卡片设置了 v:center，内部文字和子元素居中。')
        .btn({ tx: '操作按钮' })
      .end()
      .card({ tt: '卡片右对齐 (v:right)', v: 'right' })
        .p('卡片设置了 v:right，内部文字和子元素靠右。')
        .btn({ tx: '操作按钮' })
      .end()
      .card({ tt: '行容器对齐 (row v:center / right)' })
        .p('默认左对齐：')
        .row_layout()
          .btn({ tx: 'A' })
          .btn({ tx: 'B' })
        .end()
        .p('居中 (v:center)：')
        .row_layout({ v: 'center' })
          .btn({ tx: 'A' })
          .btn({ tx: 'B' })
        .end()
        .p('靠右 (v:right)：')
        .row_layout({ v: 'right' })
          .btn({ tx: 'A' })
          .btn({ tx: 'B' })
        .end()
      .end();
      return b;
    }
  },

  // ========== 新增组件演示 ==========

  {
    trigger: 'demo-textarea',
    title: '多行文本框',
    desc: 'textarea 多行文本输入组件',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '多行文本框 — 各种状态' })
        .form({ id: 'ta-form' })
          .row_layout()
            .col_layout({ span: 6 })
              .card({ tt: 'auto 自适应' })
                .p('auto: 无限增高，maxlen:200 限制字数。')
                .textarea({ l: '个人简介', ph: '内容增多会自动增高...', rows: '3', id: 'bio', n: 'bio', maxlen: '200', auto: true })
                .end()
              .end()
            .end()
            .col_layout({ span: 6 })
              .card({ tt: 'auto + maxrows' })
                .p('auto + maxrows:8，限制最大自动高度。')
                .textarea({ l: '意见反馈', ph: '最多自动增长到 8 行...', rows: '2', id: 'feedback', n: 'feedback', maxlen: '500', auto: true, maxrows: '8' })
                .end()
              .end()
            .end()
          .end()
          .row_layout()
            .col_layout({ span: 6 })
              .card({ tt: '数据回显 (tx)' })
                .p('通过 tx 属性传入多行初始值。')
                .textarea({ l: '详细地址', rows: '2', id: 'address', n: 'address', tx: '北京市海淀区中关村南大街5号\n清华科技园A座18层\n邮编：100084', maxlen: '100', auto: true, maxrows: '6' })
                .end()
              .end()
            .end()
            .col_layout({ span: 6 })
              .card({ tt: '容器内纯文本' })
                .p('textarea 开闭标签之间直接放入纯文本作为初始值。')
                .textarea({ l: '项目描述', rows: '2', id: 'desc', n: 'desc', maxlen: '300', auto: true, maxrows: '10' })
                  .text('基于 TokUI 框架的前端项目：\n1. 零依赖轻量级\n2. SSE 流式推送\n3. 插件化组件注册\n4. 主题可定制\n5. 自动高度适配')
                .end()
              .end()
            .end()
          .end()
          .row_layout()
            .col_layout({ span: 6 })
              .card({ tt: '禁用状态' })
                .p('dis: true，不可编辑。')
                .textarea({ l: '系统备注', rows: '2', id: 'sysnote', n: 'sysnote', dis: true, tx: '此字段不可编辑，由系统自动填写。' })
                .end()
              .end()
            .end()
            .col_layout({ span: 6 })
              .card({ tt: '只读 + 固定高度' })
                .p('ro: true 只读，非 auto 固定高度。')
                .textarea({ l: '协议内容', rows: '4', id: 'agreement', n: 'agreement', ro: true, maxlen: '500', tx: '第一条：本协议自签署之日起生效。\n第二条：用户应遵守平台使用规范。\n第三条：平台保留最终解释权。\n第四条：如有争议，双方协商解决。\n\n以上内容仅供参考，不具备法律效力。' })
                .end()
              .end()
            .end()
          .end()
          .btn({ tx: '提交', t: 'submit' })
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-divider',
    title: '分割线',
    desc: 'Divider 分割线组件及所有变体',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '分割线 — 所有变体' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '基础分割线' })
              .p('默认实线，与 hr 类似但支持更多变体。')
              .p('上文内容')
              .dv()
              .p('下文内容')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '线型变体' })
              .p('实线（默认）')
              .dv()
              .p('虚线 (dashed)')
              .dv({ v: 'dashed' })
              .p('点线 (dotted)')
              .dv({ v: 'dotted' })
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '带文字标签' })
              .p('居中对齐（默认）')
              .dv({ tx: '章节标题' })
              .p('左对齐')
              .dv({ tx: '基本信息', align: 'left' })
              .p('右对齐')
              .dv({ tx: '更多详情', align: 'right' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '朴素文字样式' })
              .p('默认加粗 vs 朴素样式 (plain)')
              .dv({ tx: '加粗文字' })
              .p('内容区域')
              .dv({ tx: '朴素文字', plain: true })
              .p('内容区域')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '自定义颜色与粗细' })
              .p('主题色')
              .dv({ bg: 'primary' })
              .p('成功色 (success)')
              .dv({ bg: 'success' })
              .p('危险色 (danger)')
              .dv({ bg: 'danger' })
              .p('2px 加粗')
              .dv({ th: '2px' })
              .p('虚线 + 主题色 + 2px')
              .dv({ v: 'dashed', bg: 'primary', th: '2px' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '间距变体' })
              .p('默认间距')
              .dv()
              .p('紧凑间距 (sm)')
              .dv({ size: 'sm' })
              .p('宽松间距 (lg)')
              .dv({ size: 'lg' })
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '竖向分割' })
              .p('用于行内元素分隔：')
              .p()
                .text('文本 ').dv({ v: 'vert' }).text(' 链接 ').dv({ v: 'vert' }).text(' 按钮')
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '综合示例' })
              .dv({ tx: '用户信息', align: 'left' })
              .p('姓名：张三 | 部门：技术部')
              .dv({ tx: '订单详情', align: 'left', v: 'dashed' })
              .p('商品A x 2 = ¥200')
              .p('商品B x 1 = ¥150')
              .dv({ v: 'dotted' })
              .dv({ tx: '合计：¥350', align: 'right', plain: true })
              .dv({ bg: 'primary', th: '2px' })
              .p('底部操作区域')
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-welcome',
    title: 'Welcome 欢迎页',
    desc: '新对话欢迎界面与功能特性卡片',
    build() {
      const b = new TokUIBuilder();
      b.h2('Welcome 欢迎页组件')
        .p('用于 AI 对话的新会话欢迎界面，居中布局 + CSS Grid 特性卡片。')
        .welcome({ tt: '你好，有什么可以帮你？', st: '我可以帮你完成各种任务，选择下方功能快速开始' })
          .welcomeFeature({ tt: '代码生成', tx: '根据需求生成高质量代码', i: 'code', clk: 'featCode' }).end()
          .welcomeFeature({ tt: '数据分析', tx: '分析和可视化你的数据', i: 'chart', clk: 'featChart' }).end()
          .welcomeFeature({ tt: '文档写作', tx: '撰写和优化技术文档', i: 'doc', clk: 'featDoc' }).end()
        .end()
        .hr()
        .h3('不同图标组合')
        .welcome({ tt: '选择一个功能开始', st: '所有功能均支持流式响应' })
          .welcomeFeature({ tt: '代码生成', tx: 'AI 辅助编写代码', i: 'code' }).end()
          .welcomeFeature({ tt: '数据分析', tx: '图表与报表生成', i: 'chart' }).end()
          .welcomeFeature({ tt: '文档写作', tx: '技术文档与说明', i: 'doc' }).end()
          .welcomeFeature({ tt: '代码审查', tx: '智能代码审查建议', i: 'code' }).end()
          .welcomeFeature({ tt: '数据可视化', tx: '交互式数据图表', i: 'chart' }).end()
          .welcomeFeature({ tt: '知识整理', tx: '信息归纳与总结', i: 'doc' }).end()
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-tag',
    title: 'Tag 标签',
    desc: '标签组件：类型、尺寸、圆角、可关闭、禁用、自定义颜色',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Tag 标签组件' })
        .row_layout()
          .col_layout({ span: 3 })
            .card({ tt: '基础类型' })
              .tag('默认标签', { t: 'default' })
              .tag('主要标签', { t: 'primary' })
              .tag('信息标签', { t: 'info' })
              .tag('成功标签', { t: 'success' })
              .tag('警告标签', { t: 'warning' })
              .tag('错误标签', { t: 'error' })
            .end()
          .end()
          .col_layout({ span: 3 })
            .card({ tt: '尺寸' })
              .tag('小号标签', { t: 'primary', s: 'small' })
              .tag('中号标签', { t: 'primary' })
              .tag('大号标签', { t: 'primary', s: 'large' })
            .end()
          .end()
          .col_layout({ span: 3 })
            .card({ tt: '圆角标签' })
              .tag('主要', { t: 'primary', round: true })
              .tag('信息', { t: 'info', round: true })
              .tag('成功', { t: 'success', round: true })
              .tag('警告', { t: 'warning', round: true })
              .tag('错误', { t: 'error', round: true })
            .end()
          .end()
          .col_layout({ span: 3 })
            .card({ tt: '可关闭' })
              .tag('默认', { closable: true })
              .tag('主要', { t: 'primary', closable: true })
              .tag('信息', { t: 'info', closable: true })
              .tag('成功', { t: 'success', closable: true })
              .tag('警告', { t: 'warning', closable: true })
              .tag('错误', { t: 'error', closable: true })
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 3 })
            .card({ tt: '边框控制' })
              .tag('有边框', { bordered: true })
              .tag('主要有边框', { t: 'primary', bordered: true })
              .tag('无边框', { t: 'default' })
              .tag('主要无边框', { t: 'primary' })
            .end()
          .end()
          .col_layout({ span: 3 })
            .card({ tt: '禁用态' })
              .tag('禁用', { dis: true })
              .tag('禁用', { t: 'primary', dis: true })
              .tag('禁用', { t: 'info', dis: true })
              .tag('禁用', { t: 'success', dis: true })
              .tag('禁用', { t: 'warning', dis: true })
              .tag('禁用', { t: 'error', dis: true })
            .end()
          .end()
          .col_layout({ span: 3 })
            .card({ tt: '自定义颜色' })
              .tag('自定义背景', { bg: 'FF6600', fc: 'FFFFFF' })
              .tag('主题色', { bg: 'primary' })
              .tag('成功色', { bg: 'success', fc: 'FFFFFF' })
              .tag('危险色', { bg: 'danger', fc: 'FFFFFF' })
            .end()
          .end()
          .col_layout({ span: 3 })
            .card({ tt: '混合案例' })
              .tag('圆角可关闭', { t: 'success', round: true, closable: true })
              .tag('小号警告', { t: 'warning', s: 'small', round: true })
              .tag('大号错误', { t: 'error', s: 'large', bordered: true })
              .tag('禁用信息', { t: 'info', dis: true, round: true })
              .tag('自定义圆角', { bg: 'FF6600', fc: 'FFFFFF', round: true, closable: true })
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-timeline',
    title: 'Timeline 时间轴',
    desc: '纵向/横向/交替/卡片多种时间轴样式',
    build() {
      const b = new TokUIBuilder();
      // Card 1: 基础纵向
      b.card({ tt: '基础纵向时间轴' })
        .timeline()
          .ti('项目启动', { tm: '2024-01-10' })
          .ti('需求分析完成', { tm: '2024-01-25', t: 'primary' })
          .ti('UI 设计定稿', { tm: '2024-02-15', t: 'info' })
          .ti('前后端开发中', { tm: '2024-03-01', t: 'warning' })
          .ti('测试验收', { tm: '2024-04-10', t: 'success' })
          .ti('正式上线', { tm: '2024-05-01' })
        .end()
      .end();

      // Card 2: 带标题和类型
      b.card({ tt: '多状态时间轴' })
        .timeline()
          .ti('代码提交', { tt: '开发阶段', tm: '09:00', t: 'primary' })
          .ti('代码审查', { tt: 'Review 阶段', tm: '11:30', t: 'info' })
          .ti('发现 Bug', { tt: '测试阶段', tm: '14:00', t: 'error' })
          .ti('修复完成', { tt: '回归测试', tm: '16:00', t: 'warning' })
          .ti('发布上线', { tt: '部署阶段', tm: '18:00', t: 'success' })
        .end()
      .end();

      // Card 3: 交替排列
      b.card({ tt: '交替排列时间轴' })
        .timeline({ v: 'alternate' })
          .ti('公司成立', { tt: '创立', tm: '2018年', t: 'primary' })
          .ti('首款产品发布', { tt: '里程碑', tm: '2019年', t: 'success' })
          .ti('用户突破10万', { tt: '增长', tm: '2020年', t: 'info' })
          .ti('获得A轮融资', { tt: '融资', tm: '2021年', t: 'warning' })
          .ti('国际化扩展', { tt: '出海', tm: '2022年', t: 'error' })
          .ti('用户突破100万', { tt: '新里程碑', tm: '2024年', t: 'success' })
        .end()
      .end();

      // Card 4: 卡片样式
      b.card({ tt: '卡片时间轴' })
        .timeline({ v: 'card' })
          .ti('收到订单 #10086', { tt: '新订单', tm: '2024-06-01 08:30', t: 'primary' })
          .ti('仓库开始拣货', { tt: '处理中', tm: '2024-06-01 09:15', t: 'info' })
          .ti('打包完成出库', { tt: '已发货', tm: '2024-06-01 10:00', t: 'warning' })
          .ti('快递已送达', { tt: '已签收', tm: '2024-06-02 14:20', t: 'success' })
        .end()
      .end();

      // Card 5: 横向时间轴
      b.card({ tt: '横向时间轴' })
        .timeline({ v: 'horizontal' })
          .ti('需求', { tt: '需求分析', tm: '第1周' })
          .ti('设计', { tt: 'UI设计', tm: '第2周', t: 'primary' })
          .ti('开发', { tt: '编码实现', tm: '第3-5周', t: 'info' })
          .ti('测试', { tt: '质量保障', tm: '第6周', t: 'warning' })
          .ti('发布', { tt: '上线部署', tm: '第7周', t: 'success' })
        .end()
      .end();

      // Card 6: 横向项目里程碑
      b.card({ tt: '横向里程碑' })
        .timeline({ v: 'horizontal' })
          .ti('立项', { tm: 'Q1', t: 'success' })
          .ti('Alpha', { tm: 'Q2', t: 'primary' })
          .ti('Beta', { tm: 'Q3', t: 'warning' })
          .ti('RC', { tm: 'Q4', t: 'info' })
          .ti('GA', { tm: 'Q1 2025', t: 'error' })
        .end()
      .end();

      // Card 7: 混合复杂场景
      b.card({ tt: '混合案例' })
        .timeline({ v: 'card' })
          .ti('用户提交注册表单', { tt: '注册请求', tm: '10:00:00', t: 'primary' })
          .ti('验证邮箱格式通过', { tt: '数据校验', tm: '10:00:01', t: 'info' })
          .ti('写入数据库成功', { tt: '持久化', tm: '10:00:02', t: 'success' })
          .ti('发送欢迎邮件失败', { tt: '邮件服务异常', tm: '10:00:03', t: 'error' })
          .ti('触发重试机制', { tt: '自动恢复', tm: '10:00:05', t: 'warning' })
          .ti('邮件发送成功', { tt: '重试成功', tm: '10:00:08', t: 'success' })
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-tabs',
    title: '标签页 (Tabs)',
    desc: '标签页切换组件（支持 ← → 键盘切换）',
    build() {
      const b = new TokUIBuilder();
      b.h2('标签页 (Tabs)');
      b.tabs()
        .tab({ tt: '基本信息' })
          .p('这是第一个标签页的内容。可以放置任意 TokUI 组件。')
          .h3('用户档案')
          .p('姓名：张三')
          .p('年龄：28')
        .end()
        .tab({ tt: '工作经历' })
          .p('2018-2020：前端工程师 @ A公司')
          .p('2020-至今：高级工程师 @ B公司')
        .end()
        .tab({ tt: '技能' })
          .p('JavaScript / TypeScript / React / Node.js')
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-accordion',
    title: '手风琴 (Accordion)',
    desc: '使用 details/summary 原生折叠面板',
    build() {
      const b = new TokUIBuilder();
      b.h2('手风琴 / 折叠面板 (Accordion)');
      b.accordion()
        .collapse({ tt: '什么是 TokUI？', open: true })
          .p('TokUI 是一个零依赖的流式 UI 描述与渲染框架。后端通过简洁的 DSL 字符串描述 UI 组件，经 SSE 流式推送到前端。')
        .end()
        .collapse({ tt: '如何使用？' })
          .p('通过 TokUIBuilder 链式调用生成 DSL，推送到前端后由 TokUIParser 解析并渲染为真实 DOM。')
        .end()
        .collapse({ tt: '支持哪些组件？' })
          .p('标题、段落、链接、图片、表格、表单、卡片、栅格布局、列表、代码块、Markdown、标签页、手风琴、对话框等。')
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-dialog',
    title: '对话框 (Dialog)',
    desc: '基于原生 dialog 元素的模态弹窗，多种场景演示',
    build() {
      const b = new TokUIBuilder();
      b.h2('对话框 (Dialog)');
      b.p('使用 HTML 原生 <dialog> 元素实现模态弹窗，支持 ESC 键关闭、点击遮罩层关闭、按钮关闭等多种交互方式。');

      // === 场景1：确认删除 ===
      b.h3('场景一：确认删除');
      b.p('危险操作前的二次确认弹窗，防止误操作。');
      b._selfClosing('btn', '删除项目', { clk: 'openDialog', v: 'danger', 'data-dialog-id': 'dlg-delete' });
      b.dialog({ tt: '确认删除', id: 'dlg-delete' })
        .p('你确定要删除项目「TokUI 框架 v2.0」吗？此操作不可撤销，所有相关数据将被永久移除。')
        ._selfClosing('btn', '取消', { clk: 'closeDialog' })
        ._selfClosing('btn', '确认删除', { clk: 'confirmDelete', v: 'danger' })
      .end();

      // === 场景2：表单弹窗 ===
      b.h3('场景二：表单弹窗');
      b.p('在弹窗中收集用户输入，适用于反馈、设置等场景。');
      b._selfClosing('btn', '提交反馈', { clk: 'openDialog', v: 'primary', 'data-dialog-id': 'dlg-feedback' });
      b.dialog({ tt: '意见反馈', id: 'dlg-feedback' })
        .form({ id: 'feedbackForm', sub: 'submitFeedback' })
          ._selfClosing('input', '', { t: 'text', ph: '你的名字', l: '昵称', id: 'fb-name' })
          ._selfClosing('input', '', { t: 'text', ph: '一句话描述你的建议', l: '建议标题', id: 'fb-title', req: true })
        .end()
        ._selfClosing('btn', '取消', { clk: 'closeDialog' })
        ._selfClosing('btn', '提交反馈', { t: 'submit', v: 'primary', clk: 'submitFeedback' })
      .end();

      // === 场景3：信息展示 ===
      b.h3('场景三：信息展示');
      b.p('展示用户详情、订单信息等结构化内容。');
      b._selfClosing('btn', '查看详情', { clk: 'openDialog', 'data-dialog-id': 'dlg-info' });
      b.dialog({ tt: '用户详情', id: 'dlg-info' })
        ._selfClosing('img', '', { s: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tokui', v: 'avatar', alt: '用户头像' })
        .p('姓名：张三')
        .p('职位：高级前端工程师')
        .p('部门：技术部 — 基础架构组')
        .p('邮箱：zhangsan@example.com')
        ._selfClosing('btn', '知道了', { clk: 'closeDialog', v: 'primary' })
      .end();

      // === 场景4：成功提示 ===
      b.h3('场景四：成功提示');
      b.p('操作完成后的轻量级提示弹窗。');
      b._selfClosing('btn', '保存设置', { clk: 'openDialog', v: 'success', 'data-dialog-id': 'dlg-success' });
      b.dialog({ tt: '操作成功', id: 'dlg-success' })
        .p('你的设置已保存成功，新配置将在下次加载时生效。')
        ._selfClosing('btn', '好的', { clk: 'closeDialog', v: 'success' })
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-table-colspan',
    title: '表格合并单元格',
    desc: 'tr 的 cs: 属性实现 colspan',
    build() {
      const b = new TokUIBuilder();
      b.h2('表格合并单元格 (colspan)');
      b.p('使用 cs:N 属性让单元格横跨 N 列。被合并的列用空值占位，渲染时自动跳过。');
      b.h3('示例：学生成绩表');
      b.table({ stripe: true })
        .thead({ cols: '姓名,语文,数学,英语,总分' })
        .tbody()
          .row('张三', '90', '95', '88', '273')
          .row('李四', '85', '92', '90', '267')
          ._selfClosing('tr', '合计,,,,540', { cs: '4' })
        .end()
      .end();
      b.h3('示例：课程表');
      b.table({ stripe: true })
        .thead({ cols: '时间段,周一,周二,周三,周四,周五' })
        .tbody()
          .row('上午', '语文', '数学', '英语', '物理', '化学')
          ._selfClosing('tr', '下午,,自习,,,自习', { cs: '2' })
          ._selfClosing('tr', '晚修,,,,,', { cs: '5' })
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-table-enterprise',
    title: '企业级表格',
    desc: 'ERP/MES 常见业务场景表格',
    build() {
      const b = new TokUIBuilder();

      // === 1. 采购订单管理 ===
      b.card({ tt: '采购订单管理' })
        .table({ stripe: true, v: 'bordered' })
          .thead({ cols: '订单编号,供应商,物料名称,数量,单价,金额,交货日期,状态' })
          .tbody()
            .row('PO-2024-0158', '华北钢材有限公司', 'Q235B 热轧钢板', '500吨', '¥4,200/吨', '¥2,100,000', '2024-03-15', '已发货')
            .row('PO-2024-0159', '东方轴承集团', 'SKF 6205 深沟球轴承', '2,000套', '¥85/套', '¥170,000', '2024-03-20', '部分到货')
            .row('PO-2024-0160', '深圳微芯科技', 'STM32F407VG 芯片', '10,000片', '¥32/片', '¥320,000', '2024-03-25', '待确认')
            .row('PO-2024-0161', '浙江液压件厂', '液压缸 HOB-80/45', '200支', '¥1,580/支', '¥316,000', '2024-04-01', '已审批')
            .row('PO-2024-0162', '华北钢材有限公司', '45# 冷拔无缝钢管', '300米', '¥68/米', '¥20,400', '2024-04-05', '已发货')
          .end()
        .end()
      .end();

      // === 2. 生产工单（MES） ===
      b.card({ tt: '生产工单（MES）' })
        .table({ stripe: true })
          .thead({ cols: '工单号,产品名称,工序,计划数量,完成数量,良品率,产线,计划完成,实际完成,状态' })
          .tbody()
            .row('WO-240315-01', '减速机总成 ZDY250', '总装', '50台', '48台', '99.2%', 'A3线', '03-18', '03-17', '已完工')
            .row('WO-240315-02', '伺服电机 1.5kW', '绕线', '200台', '200台', '98.8%', 'B1线', '03-18', '03-18', '已完工')
            .row('WO-240318-03', 'PLC控制柜 XK-200', '接线', '30台', '22台', '—', 'C2线', '03-22', '—', '生产中')
            .row('WO-240318-04', '液压泵站 YB-160', '调试', '15台', '0台', '—', 'D1线', '03-25', '—', '待排产')
            .row('WO-240320-05', '传动齿轮箱 G3', '精加工', '100套', '100套', '97.5%', 'A1线', '03-20', '03-19', '已完工')
          .end()
        .end()
      .end();

      // === 3. 仓库库存台账 ===
      b.card({ tt: '仓库库存台账' })
        .table({ stripe: true, v: 'bordered' })
          .thead({ cols: '物料编码,物料名称,规格型号,仓库,库位,现有库存,安全库存,单位,最近入库,状态' })
          .tbody()
            .row('M-10001', 'Q235B热轧钢板', '6mm×1500mm×6000mm', '原料仓', 'A-01-03', '128吨', '50吨', '吨', '03-15', '正常')
            .row('M-10002', 'SKF 6205轴承', '25×52×15mm', '零件仓', 'B-02-11', '3,200套', '1,000套', '套', '03-12', '正常')
            .row('M-10003', '液压油', 'L-HM46 (200L/桶)', '油品仓', 'C-01-01', '8桶', '15桶', '桶', '02-28', '库存预警')
            .row('M-10004', 'STM32F407VG', 'LQFP-100', '电子仓', 'D-03-07', '42,000片', '5,000片', '片', '03-10', '正常')
            .row('M-10005', '密封圈', 'φ50×3.5NBR', '零件仓', 'B-05-02', '120个', '500个', '个', '01-20', '库存预警')
            .row('M-10006', '冷拔无缝钢管', 'φ45×4mm', '原料仓', 'A-02-01', '15米', '100米', '米', '03-08', '库存预警')
          .end()
        .end()
      .end();

      // === 4. 设备维保记录 ===
      b.card({ tt: '设备维保记录' })
        .table({ stripe: true, v: 'compact' })
          .thead({ cols: '设备编号,设备名称,维保类型,计划日期,执行日期,负责人,耗时,维保内容,状态' })
          .tbody()
            .row('EQ-CNC-01', 'CNC加工中心 DMG MORI NHX4000', '定期保养', '03-10', '03-10', '王工', '4h', '主轴润滑、导轨清洁、精度校准', '已完成')
            .row('EQ-CNC-02', 'CNC加工中心 MAZAK QTN-200', '故障维修', '03-12', '03-13', '李工', '8h', '伺服驱动器更换、参数恢复', '已完成')
            .row('EQ-INJ-01', '注塑机 海天MA3200', '定期保养', '03-15', '—', '张工', '—', '螺杆清洗、液压系统检查', '待执行')
            .row('EQ-WLD-01', '焊接机器人 FANUC ARC Mate', '故障维修', '03-16', '—', '赵工', '—', '焊枪更换、TCP校准', '待执行')
            .row('EQ-RBT-01', '六轴机器人 ABB IRB 6700', '年度大修', '03-20', '03-20', '刘工', '16h', '减速器更换、线缆检测、安全回路测试', '已完成')
          .end()
        .end()
      .end();

      // === 5. 销售报表（含合并汇总行） ===
      // 7列：区域/客户名称/产品线/合同金额/回款金额/回款率/负责人
      // 小计行：前4列合并(cs:4) 后接回款金额/回款率/负责人(空)
      b.card({ tt: '月度销售报表' })
        .table({ stripe: true, v: 'bordered' })
          .thead({ cols: '区域,客户名称,产品线,合同金额,回款金额,回款率,负责人' })
          .tbody()
            .row('华东区', '上海汽车集团', '动力总成', '¥3,580,000', '¥2,860,000', '79.9%', '陈明')
            .row('华东区', '南京埃斯顿', '伺服系统', '¥1,200,000', '¥1,200,000', '100%', '陈明')
            .row('华东区', '杭州海康威视', 'PLC控制', '¥680,000', '¥340,000', '50%', '陈明')
            ._selfClosing('tr', '华东小计,,,"¥5,460,000","¥4,400,000",80.6%,', { cs: '4' })
            .row('华南区', '比亚迪股份', '动力电池产线', '¥5,200,000', '¥3,120,000', '60%', '林峰')
            .row('华南区', '大疆创新', '精密减速器', '¥890,000', '¥890,000', '100%', '林峰')
            ._selfClosing('tr', '华南小计,,,"¥6,090,000","¥4,010,000",65.8%,', { cs: '4' })
            .row('华北区', '一汽解放', '变速箱产线', '¥4,100,000', '¥2,460,000', '60%', '王强')
            .row('华北区', '北京奔驰', '装配线改造', '¥2,800,000', '¥2,800,000', '100%', '王强')
            ._selfClosing('tr', '华北小计,,,"¥6,900,000","¥5,260,000",76.2%,', { cs: '4' })
            ._selfClosing('tr', '合计,,,"¥18,450,000","¥13,670,000",74.1%,', { cs: '4' })
          .end()
        .end()
      .end();

      // === 6. 质量检测记录 ===
      b.card({ tt: '质量检测记录（IQC/OQC）' })
        .table({ stripe: true })
          .thead({ cols: '检测单号,类型,物料/产品,批次号,检测数量,合格数,不良率,检测项,检测结果,检验员,检测日期' })
          .tbody()
            .row('QC-I-0315-01', 'IQC', 'SKF 6205轴承', 'B20240310-01', '500', '498', '0.4%', '外观/尺寸/硬度', '合格', '周检', '03-15')
            .row('QC-I-0315-02', 'IQC', 'STM32F407VG', 'B20240312-03', '1,000', '997', '0.3%', '功能/引脚共面度', '合格', '周检', '03-15')
            .row('QC-I-0316-01', 'IQC', '密封圈 NBR φ50', 'B20240220-01', '200', '168', '16%', '尺寸/硬度/耐油性', '不合格(让步接收)', '周检', '03-16')
            .row('QC-O-0317-01', 'OQC', '减速机总成 ZDY250', 'P20240317-01', '48', '47', '2.1%', '噪音/振动/温升/密封', '合格', '李检', '03-17')
            .row('QC-O-0318-01', 'OQC', 'PLC控制柜 XK-200', 'P20240318-02', '22', '22', '0%', '耐压/绝缘/功能', '合格', '李检', '03-18')
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-crud',
    title: 'CRUD 管理系统',
    desc: '模拟员工管理系统的增删改查操作',
    build() {
      const b = new TokUIBuilder();

      // === 工具栏：搜索 + 筛选 + 新增 ===
      b.card({ tt: '员工管理系统' })
        .form({ id: 'crudSearch', sub: 'handleCrudSearch' })
          .row_layout({})
            .col_layout({ span: 4 })
              .input({ ph: '搜索姓名/工号...', id: 'searchKey' })
            .end()
            .col_layout({ span: 3 })
              .select({ ph: '选择部门', id: 'searchDept' })
                .opt({ v: '', tx: '全部部门' })
                .opt({ v: 'tech', tx: '技术部' })
                .opt({ v: 'market', tx: '市场部' })
                .opt({ v: 'design', tx: '设计部' })
                .opt({ v: 'hr', tx: '人事部' })
              .end()
            .end()
            .col_layout({ span: 3 })
              .select({ ph: '选择状态', id: 'searchStatus' })
                .opt({ v: '', tx: '全部状态' })
                .opt({ v: 'active', tx: '在职' })
                .opt({ v: 'leave', tx: '离职' })
              .end()
            .end()
            .col_layout({ span: 2 })
              .btn({ tx: '查询', clk: 'handleCrudSearch' })
            .end()
          .end()
        .end()
        .p('')
        // 操作按钮
        .row_layout({})
          .col_layout({ span: 6 })
            ._selfClosing('btn', '新增员工', { v: 'primary', clk: 'openDialog', 'data-dialog-id': 'dlg-add' })
            ._selfClosing('btn', '批量删除', { v: 'danger', clk: 'handleCrudBatchDel' })
            ._selfClosing('btn', '批量导出', { clk: 'handleCrudExport' })
          .end()
          .col_layout({ span: 6 })
            .p('共 5 条记录', { v: 'right' })
          .end()
        .end()
        .p('')
        // === 数据表格 ===
        .table({ stripe: true, v: 'bordered', id: 'crudTable' })
          .thead({ cols: 'chk,#,工号,姓名,部门,职位,入职日期,状态,操作' })
          .tbody()
            .row('chk', '', 'EMP-001', '张伟', '技术部', '高级工程师', '2021-03-15', '在职', 'btn:编辑 clk:openDialog data-dialog-id:dlg-edit-1|btn:删除 clk:openDialog data-dialog-id:dlg-del-1 v:danger')
            .row('chk', '', 'EMP-002', '李娜', '市场部', '市场经理', '2020-06-01', '在职', 'btn:编辑 clk:openDialog data-dialog-id:dlg-edit-2|btn:删除 clk:openDialog data-dialog-id:dlg-del-2 v:danger')
            .row('chk', '', 'EMP-003', '王强', '设计部', 'UI设计师', '2022-01-10', '在职', 'btn:编辑 clk:openDialog data-dialog-id:dlg-edit-3|btn:删除 clk:openDialog data-dialog-id:dlg-del-3 v:danger')
            .row('chk', '', 'EMP-004', '赵敏', '人事部', 'HR主管', '2019-08-20', '在职', 'btn:编辑 clk:openDialog data-dialog-id:dlg-edit-4|btn:删除 clk:openDialog data-dialog-id:dlg-del-4 v:danger')
            .row('chk', '', 'EMP-005', '陈刚', '技术部', '前端工程师', '2023-05-08', '离职', 'btn:编辑 clk:openDialog data-dialog-id:dlg-edit-5|btn:删除 clk:openDialog data-dialog-id:dlg-del-5 v:danger')
          .end()
        .end()
      .end();

      // === Dialog: 新增员工 ===
      b.dialog({ tt: '新增员工', id: 'dlg-add' })
        .form({ id: 'addForm', sub: 'handleCrudAdd' })
          .input({ l: '姓名', id: 'addName', req: true })
          .input({ l: '职位', id: 'addPosition', req: true })
          .select({ l: '部门', id: 'addDept' })
            .opt({ v: 'tech', tx: '技术部' })
            .opt({ v: 'market', tx: '市场部' })
            .opt({ v: 'design', tx: '设计部' })
            .opt({ v: 'hr', tx: '人事部' })
          .end()
          .input({ l: '入职日期', id: 'addDate' })
          .row_layout({})
            .col_layout({ span: 12 })
              ._selfClosing('btn', '取消', { clk: 'closeDialog' })
              ._selfClosing('btn', '确认新增', { t: 'submit', v: 'primary', clk: 'handleCrudAdd' })
            .end()
          .end()
        .end()
      .end();

      // === Dialog: 编辑员工 (张伟) ===
      b.dialog({ tt: '编辑员工 - 张伟 (EMP-001)', id: 'dlg-edit-1' })
        .form({ id: 'editForm1', sub: 'handleCrudEdit' })
          .input({ l: '姓名', id: 'editName1', req: true })
          .input({ l: '职位', id: 'editPos1', req: true })
          .select({ l: '部门', id: 'editDept1' })
            .opt({ v: 'tech', tx: '技术部' })
            .opt({ v: 'market', tx: '市场部' })
            .opt({ v: 'design', tx: '设计部' })
            .opt({ v: 'hr', tx: '人事部' })
          .end()
          .select({ l: '状态', id: 'editStatus1' })
            .opt({ v: 'active', tx: '在职' })
            .opt({ v: 'leave', tx: '离职' })
          .end()
          .row_layout({})
            .col_layout({ span: 12 })
              ._selfClosing('btn', '取消', { clk: 'closeDialog' })
              ._selfClosing('btn', '保存修改', { t: 'submit', v: 'primary', clk: 'handleCrudEdit' })
            .end()
          .end()
        .end()
      .end();

      // === Dialog: 编辑员工 (李娜) ===
      b.dialog({ tt: '编辑员工 - 李娜 (EMP-002)', id: 'dlg-edit-2' })
        .form({ id: 'editForm2', sub: 'handleCrudEdit' })
          .input({ l: '姓名', id: 'editName2', req: true })
          .input({ l: '职位', id: 'editPos2', req: true })
          .select({ l: '部门', id: 'editDept2' })
            .opt({ v: 'tech', tx: '技术部' })
            .opt({ v: 'market', tx: '市场部' })
            .opt({ v: 'design', tx: '设计部' })
            .opt({ v: 'hr', tx: '人事部' })
          .end()
          .select({ l: '状态', id: 'editStatus2' })
            .opt({ v: 'active', tx: '在职' })
            .opt({ v: 'leave', tx: '离职' })
          .end()
          .row_layout({})
            .col_layout({ span: 12 })
              ._selfClosing('btn', '取消', { clk: 'closeDialog' })
              ._selfClosing('btn', '保存修改', { t: 'submit', v: 'primary', clk: 'handleCrudEdit' })
            .end()
          .end()
        .end()
      .end();

      // === Dialog: 查看详情 (张伟) ===
      b.dialog({ tt: '员工详情 - 张伟', id: 'dlg-view-1' })
        .table({ v: 'compact' })
          .thead({ cols: '字段,内容' })
          .tbody()
            .row('工号', 'EMP-001')
            .row('姓名', '张伟')
            .row('部门', '技术部')
            .row('职位', '高级工程师')
            .row('入职日期', '2021-03-15')
            .row('状态', '在职')
            .row('手机', '138****1234')
            .row('邮箱', 'zhangwei@example.com')
          .end()
        .end()
        .p('')
        .row_layout({})
          .col_layout({ span: 12 })
            ._selfClosing('btn', '关闭', { clk: 'closeDialog' })
          .end()
        .end()
      .end();

      // === Dialog: 查看详情 (李娜) ===
      b.dialog({ tt: '员工详情 - 李娜', id: 'dlg-view-2' })
        .table({ v: 'compact' })
          .thead({ cols: '字段,内容' })
          .tbody()
            .row('工号', 'EMP-002')
            .row('姓名', '李娜')
            .row('部门', '市场部')
            .row('职位', '市场经理')
            .row('入职日期', '2020-06-01')
            .row('状态', '在职')
            .row('手机', '139****5678')
            .row('邮箱', 'lina@example.com')
          .end()
        .end()
        .p('')
        .row_layout({})
          .col_layout({ span: 12 })
            ._selfClosing('btn', '关闭', { clk: 'closeDialog' })
          .end()
        .end()
      .end();

      // === Dialog: 删除确认 (张伟) ===
      b.dialog({ tt: '确认删除', id: 'dlg-del-1' })
        .p('确定要删除员工 张伟 (EMP-001) 吗？此操作不可撤销。')
        .row_layout({})
          .col_layout({ span: 12 })
            ._selfClosing('btn', '取消', { clk: 'closeDialog' })
            ._selfClosing('btn', '确认删除', { v: 'danger', clk: 'handleCrudDelete1' })
          .end()
        .end()
      .end();

      // === Dialog: 删除确认 (李娜) ===
      b.dialog({ tt: '确认删除', id: 'dlg-del-2' })
        .p('确定要删除员工 李娜 (EMP-002) 吗？此操作不可撤销。')
        .row_layout({})
          .col_layout({ span: 12 })
            ._selfClosing('btn', '取消', { clk: 'closeDialog' })
            ._selfClosing('btn', '确认删除', { v: 'danger', clk: 'handleCrudDelete2' })
          .end()
        .end()
      .end();

      // === Dialog: 编辑员工 (王强) ===
      b.dialog({ tt: '编辑员工 - 王强 (EMP-003)', id: 'dlg-edit-3' })
        .form({ id: 'editForm3', sub: 'handleCrudEdit' })
          .input({ l: '姓名', id: 'editName3', req: true })
          .input({ l: '职位', id: 'editPos3', req: true })
          .select({ l: '部门', id: 'editDept3' })
            .opt({ v: 'tech', tx: '技术部' })
            .opt({ v: 'market', tx: '市场部' })
            .opt({ v: 'design', tx: '设计部' })
            .opt({ v: 'hr', tx: '人事部' })
          .end()
          .row_layout({})
            .col_layout({ span: 12 })
              ._selfClosing('btn', '取消', { clk: 'closeDialog' })
              ._selfClosing('btn', '保存', { t: 'submit', v: 'primary', clk: 'handleCrudEdit' })
            .end()
          .end()
        .end()
      .end();

      // === Dialog: 编辑员工 (赵敏) ===
      b.dialog({ tt: '编辑员工 - 赵敏 (EMP-004)', id: 'dlg-edit-4' })
        .form({ id: 'editForm4', sub: 'handleCrudEdit' })
          .input({ l: '姓名', id: 'editName4', req: true })
          .input({ l: '职位', id: 'editPos4', req: true })
          .select({ l: '部门', id: 'editDept4' })
            .opt({ v: 'tech', tx: '技术部' })
            .opt({ v: 'market', tx: '市场部' })
            .opt({ v: 'design', tx: '设计部' })
            .opt({ v: 'hr', tx: '人事部' })
          .end()
          .row_layout({})
            .col_layout({ span: 12 })
              ._selfClosing('btn', '取消', { clk: 'closeDialog' })
              ._selfClosing('btn', '保存', { t: 'submit', v: 'primary', clk: 'handleCrudEdit' })
            .end()
          .end()
        .end()
      .end();

      // === Dialog: 编辑员工 (陈刚) ===
      b.dialog({ tt: '编辑员工 - 陈刚 (EMP-005)', id: 'dlg-edit-5' })
        .form({ id: 'editForm5', sub: 'handleCrudEdit' })
          .input({ l: '姓名', id: 'editName5', req: true })
          .input({ l: '职位', id: 'editPos5', req: true })
          .select({ l: '部门', id: 'editDept5' })
            .opt({ v: 'tech', tx: '技术部' })
            .opt({ v: 'market', tx: '市场部' })
            .opt({ v: 'design', tx: '设计部' })
            .opt({ v: 'hr', tx: '人事部' })
          .end()
          .select({ l: '状态', id: 'editStatus5' })
            .opt({ v: 'active', tx: '在职' })
            .opt({ v: 'leave', tx: '离职' })
          .end()
          .row_layout({})
            .col_layout({ span: 12 })
              ._selfClosing('btn', '取消', { clk: 'closeDialog' })
              ._selfClosing('btn', '保存', { t: 'submit', v: 'primary', clk: 'handleCrudEdit' })
            .end()
          .end()
        .end()
      .end();

      // === Dialog: 删除确认 (王强/赵敏/陈刚) ===
      b.dialog({ tt: '确认删除', id: 'dlg-del-3' })
        .p('确定要删除员工 王强 (EMP-003) 吗？此操作不可撤销。')
        .row_layout({})
          .col_layout({ span: 12 })
            ._selfClosing('btn', '取消', { clk: 'closeDialog' })
            ._selfClosing('btn', '确认删除', { v: 'danger', clk: 'handleCrudDelete1' })
          .end()
        .end()
      .end();

      b.dialog({ tt: '确认删除', id: 'dlg-del-4' })
        .p('确定要删除员工 赵敏 (EMP-004) 吗？此操作不可撤销。')
        .row_layout({})
          .col_layout({ span: 12 })
            ._selfClosing('btn', '取消', { clk: 'closeDialog' })
            ._selfClosing('btn', '确认删除', { v: 'danger', clk: 'handleCrudDelete1' })
          .end()
        .end()
      .end();

      b.dialog({ tt: '确认删除', id: 'dlg-del-5' })
        .p('确定要删除员工 陈刚 (EMP-005) 吗？此操作不可撤销。')
        .row_layout({})
          .col_layout({ span: 12 })
            ._selfClosing('btn', '取消', { clk: 'closeDialog' })
            ._selfClosing('btn', '确认删除', { v: 'danger', clk: 'handleCrudDelete1' })
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-progress',
    title: 'Progress 进度条',
    desc: '线形/环形/内联进度条、步骤条，含尺寸、条纹、状态变体',
    build() {
      const b = new TokUIBuilder();

      b.card({ tt: 'Progress 进度条 — 所有变体' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Line 线形进度条' })
              .p('基础用法：')
              .progress({ v: '30' })
              .progress({ v: '60' })
              .progress({ v: '100' })
              .p('带标签：')
              .progress({ v: '45', l: '文件上传中' })
              .progress({ v: '88', l: '数据同步' })
              .p('条纹动画 (stripe)：')
              .progress({ v: '65', l: '正在处理...', stripe: true })
              .progress({ v: '40', stripe: true })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '进度状态' })
              .p('正常 (默认)：')
              .progress({ v: '60', l: '下载进度' })
              .p('成功 (status:success)：')
              .progress({ v: '100', l: '上传完成', status: 'success' })
              .p('失败 (status:error)：')
              .progress({ v: '35', l: '网络异常，传输中断', status: 'error' })
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '尺寸变体' })
              .p('小 (s:sm)：')
              .progress({ v: '50', s: 'sm' })
              .p('默认：')
              .progress({ v: '50' })
              .p('大 (s:lg)：')
              .progress({ v: '50', l: '大尺寸进度条', s: 'lg' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Circle 环形进度' })
              .row_layout()
                .col_layout({ span: 4 })
                  .progress({ v: '25', t: 'circle', l: '初级' })
                .end()
                .col_layout({ span: 4 })
                  .progress({ v: '50', t: 'circle', l: '进行中' })
                .end()
                .col_layout({ span: 4 })
                  .progress({ v: '75', t: 'circle', l: '即将完成' })
                .end()
              .end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '环形进度 — 状态与尺寸' })
              .row_layout()
                .col_layout({ span: 3 })
                  .progress({ v: '100', t: 'circle', status: 'success', l: '已完成' })
                .end()
                .col_layout({ span: 3 })
                  .progress({ v: '60', t: 'circle', status: 'error', l: '异常' })
                .end()
                .col_layout({ span: 3 })
                  .progress({ v: '80', t: 'circle', s: 'sm', l: '小尺寸' })
                .end()
                .col_layout({ span: 3 })
                  .progress({ v: '45', t: 'circle', s: 'lg', l: '大尺寸' })
                .end()
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Span 内联进度' })
              .p('在文本行中嵌入小型进度指示器：')
              .p()
                .text('CPU 使用率 ').progress({ v: 72, t: 'span' }).text(' 内存占用 ').progress({ v: 45, t: 'span' }).text(' 磁盘空间 ').progress({ v: 88, t: 'span' })
              .end()
              .p('状态变体：')
              .p()
                .text('正常 ').progress({ v: 60, t: 'span' }).text(' 成功 ').progress({ v: 100, t: 'span', status: 'success' }).text(' 异常 ').progress({ v: 30, t: 'span', status: 'error' })
              .end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Steps 步骤条 — 基础' })
              .p('当前步骤用 v 属性指定（1-based）：')
              .p('第 1 步：')
              .steps({ v: '1' })
                .step('账号信息填写', { tt: '第一步' })
                .step('邮箱验证', { tt: '第二步' })
                .step('完成注册', { tt: '第三步' })
              .end()
              .p('第 2 步：')
              .steps({ v: '2' })
                .step('账号信息填写', { tt: '第一步' })
                .step('邮箱验证', { tt: '第二步' })
                .step('完成注册', { tt: '第三步' })
              .end()
              .p('第 3 步（完成）：')
              .steps({ v: '3' })
                .step('账号信息填写', { tt: '第一步' })
                .step('邮箱验证', { tt: '第二步' })
                .step('完成注册', { tt: '第三步' })
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Steps — 4 步流程' })
              .steps({ v: '2' })
                .step('提交订单', { tt: '提交' })
                .step('商家确认', { tt: '确认' })
                .step('配送中', { tt: '配送' })
                .step('已签收', { tt: '完成' })
              .end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Steps — 含错误状态' })
              .steps({ v: '3' })
                .step('代码拉取', { tt: 'Checkout' })
                .step('编译构建', { tt: 'Build' })
                .step('单元测试失败', { tt: 'Test', status: 'error' })
                .step('部署上线', { tt: 'Deploy' })
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Steps — 小尺寸' })
              .steps({ v: '2', s: 'sm' })
                .step('选择商品', { tt: '选品' })
                .step('填写地址', { tt: '地址' })
                .step('支付', { tt: '支付' })
                .step('完成', { tt: '完成' })
              .end()
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Steps — 纵向布局' })
              .steps({ v: '2', vd: 'vertical' })
                .step('用户注册成功', { tt: '注册' })
                .step('邮箱验证通过', { tt: '验证' })
                .step('完善个人信息', { tt: '资料' })
                .step('开通服务', { tt: '开通' })
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'AI 任务进度模拟' })
              .p('模拟 AI 处理任务的完整流程：')
              .progress({ v: '75', l: '模型推理中...', stripe: true })
              .p('任务阶段：')
              .steps({ v: '3', s: 'sm' })
                .step('数据预处理', { tt: '预处理' })
                .step('特征提取', { tt: '提取' })
                .step('模型推理', { tt: '推理' })
                .step('后处理输出', { tt: '输出' })
              .end()
              .p('资源消耗：')
              .p()
                .text('GPU ').progress({ v: 92, t: 'span' }).text('  内存 ').progress({ v: 67, t: 'span' }).text('  温度 ').progress({ v: 78, t: 'span', status: 'error' })
              .end()
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },

  // ===== 动态更新 Demo =====
  {
    trigger: 'demo-upd-progress',
    title: 'UPD 进度/步骤动态更新',
    desc: '异步推送 progress 和 steps 组件状态更新',
    _ids: null,
    build() {
      // 每次生成唯一 ID，避免多次点击同一案例时 upd 串 ID
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = {
        line: 'upl-' + uid,
        circle: 'upc-' + uid,
        span: 'ups-' + uid,
        steps: 'upst-' + uid,
      };
      const b = new TokUIBuilder();

      b.card({ tt: 'UPD 异步推送进度更新' })
        .p('后端通过 [upd id:xxx v:75] 推送更新指令，前端找到对应组件并实时刷新。')
        .p('线形进度条：')
        .progress({ id: this._ids.line, v: '0', l: '文件下载' })
        .p('环形进度条：')
        .progress({ id: this._ids.circle, v: '0', t: 'circle' })
        .p('步骤条：')
        .steps({ id: this._ids.steps, v: '1' })
          .step('初始化', { tt: '初始化' })
          .step('下载数据', { tt: '下载' })
          .step('解析处理', { tt: '解析' })
          .step('完成输出', { tt: '完成' })
        .end()
        .p('内联进度：')
        .p()
          .text('CPU ').progress({ id: this._ids.span, v: 0, t: 'span' })
        .end()
        .dv()
        .p('演示过程：自动模拟 0% → 100% 的异步推送过程...')
      .end();

      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const b = new TokUIBuilder();
      [10, 25, 40, 55, 70, 85, 95, 100].forEach(val => {
        b.upd({ id: ids.line, v: String(val) });
        b.upd({ id: ids.circle, v: String(val) });
        b.upd({ id: ids.span, v: String(val) });
        const stepMap = { 10: 1, 25: 1, 40: 2, 55: 2, 70: 3, 85: 3, 95: 3, 100: 4 };
        b.upd({ id: ids.steps, v: String(stepMap[val] || 1) });
        if (val === 100) {
          b.upd({ id: ids.line, status: 'success' });
          b.upd({ id: ids.circle, status: 'success' });
        }
      });
      return b.toChunks();
    }
  },

  // ===== UPD Card 动态更新 =====
  {
    trigger: 'demo-upd-card',
    title: 'UPD 卡片动态更新',
    desc: '异步推送卡片标题和内容更新',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = { card: 'uc-' + uid };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Card 动态更新' })
        .p('通过 [upd id:xxx tt:新标题] 和 [upd id:xxx tx:新内容] 动态更新卡片。')
        .card({ id: this._ids.card, tt: '⏳ AI 正在分析...' })
          .p('请等待分析完成...')
        .end()
      .end();
      return b;
    },
    extraChunks() {
      const chunks = [];
      chunks.push({ _wait: 1500 });
      const b = new TokUIBuilder();
      b.upd({ id: this._ids.card, tt: '✅ 分析完成' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 3000 });
      const b2 = new TokUIBuilder();
      b2.upd({ id: this._ids.card, tx: '共发现 3 个问题，5 个优化建议。点击查看详细报告。' });
      chunks.push(...b2.toChunks());
      return chunks;
    }
  },

  // ===== UPD Btn 动态更新 =====
  {
    trigger: 'demo-upd-btn',
    title: 'UPD 按钮动态更新',
    desc: '异步推送按钮禁用状态和文本更新',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = { btn1: 'ub1-' + uid, btn2: 'ub2-' + uid };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Button 动态更新' })
        .p('通过 [upd id:xxx dis:true] 和 [upd id:xxx tx:新文本] 动态更新按钮。')
        .p('模拟提交过程：')
        .p('[btn id:' + this._ids.btn1 + ' tx:提交订单 clk:fake]')
        .p('[btn id:' + this._ids.btn2 + ' tx:取消 clk:fake]')
      .end();
      return b;
    },
    extraChunks() {
      const chunks = [];
      chunks.push({ _wait: 1500 });
      const b = new TokUIBuilder();
      b.upd({ id: this._ids.btn1, dis: true });
      b.upd({ id: this._ids.btn1, tx: '提交中...' });
      b.upd({ id: this._ids.btn2, dis: true });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 3000 });
      const b2 = new TokUIBuilder();
      b2.upd({ id: this._ids.btn1, tx: '✓ 已提交' });
      b2.upd({ id: this._ids.btn2, dis: 'false' });
      chunks.push(...b2.toChunks());
      return chunks;
    }
  },

  // ===== UPD Collapse 动态更新 =====
  {
    trigger: 'demo-upd-collapse',
    title: 'UPD 折叠面板动态更新',
    desc: '异步推送折叠面板展开/折叠',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = { c1: 'uc1-' + uid, c2: 'uc2-' + uid, c3: 'uc3-' + uid };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Collapse 动态更新' })
        .p('通过 [upd id:xxx act:open] 和 [upd id:xxx act:close] 动态切换折叠状态。')
        .collapse({ id: this._ids.c1, tt: '📋 数据采集 (点击展开)' })
          .p('采集状态：等待中...')
        .end()
        .collapse({ id: this._ids.c2, tt: '📊 数据分析 (点击展开)' })
          .p('分析状态：等待中...')
        .end()
        .collapse({ id: this._ids.c3, tt: '📝 报告生成 (点击展开)' })
          .p('报告状态：等待中...')
        .end()
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      // 面板1：数据采集
      let b = new TokUIBuilder();
      b.upd({ id: ids.c1, act: 'open' });
      b.upd({ id: ids.c1, tt: '📋 数据采集中...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 2000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: '✅ 数据采集完成' });
      b.upd({ id: ids.c1, tx: '已采集 1,284 条数据记录' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 1500 });
      // 面板2：数据分析
      b = new TokUIBuilder();
      b.upd({ id: ids.c2, act: 'open' });
      b.upd({ id: ids.c2, tt: '📊 数据分析中...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 2000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.c2, tt: '✅ 数据分析完成' });
      b.upd({ id: ids.c2, tx: '发现 3 个异常，5 个优化建议' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 1500 });
      // 面板3：报告生成
      b = new TokUIBuilder();
      b.upd({ id: ids.c3, act: 'open' });
      b.upd({ id: ids.c3, tt: '📝 生成报告中...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 2000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.c3, tt: '✅ 报告已生成' });
      b.upd({ id: ids.c3, tx: '报告已保存，点击下载查看详情' });
      chunks.push(...b.toChunks());
      return chunks;
    }
  },

  // ===== UPD Dialog 动态更新 =====
  {
    trigger: 'demo-upd-dialog',
    title: 'UPD 对话框动态更新',
    desc: '异步推送对话框打开/关闭/标题更新',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = { dlg: 'ud-' + uid, prog: 'udp-' + uid };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Dialog 动态更新' })
        .p('通过 [upd id:xxx act:open/close] 控制对话框开关，[upd id:xxx tt:新标题] 更新标题。')
        .p('自动演示：弹出处理对话框 → 推进度 → 关闭')
        .dialog({ id: this._ids.dlg, tt: '⏳ 正在处理...' })
          .p('请勿关闭此窗口...')
          .progress({ id: this._ids.prog, v: '0', l: '处理进度' })
        .end()
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      // 打开对话框
      let b = new TokUIBuilder();
      b.upd({ id: ids.dlg, act: 'open' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 1500 });
      // 进度推进 0→20→45→70→90→100
      [20, 45, 70, 90, 100].forEach(v => {
        b = new TokUIBuilder();
        b.upd({ id: ids.prog, v: String(v) });
        chunks.push(...b.toChunks());
        chunks.push({ _wait: 1000 });
      });
      // 完成：更新标题 + 进度变绿
      chunks.push({ _wait: 1500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.dlg, tt: '✅ 处理完成' });
      b.upd({ id: ids.prog, status: 'success' });
      chunks.push(...b.toChunks());
      // 展示完成状态后关闭
      chunks.push({ _wait: 2500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.dlg, act: 'close' });
      chunks.push(...b.toChunks());
      return chunks;
    }
  },

  // ===== UPD Tool-Call 工具调用状态流转 =====
  {
    trigger: 'demo-upd-tool-call',
    title: 'UPD 工具调用状态流转',
    desc: '模拟 API 调用的 pending → running → done 状态流转',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = {
        tc1: 'utc1-' + uid,
        tc2: 'utc2-' + uid,
        tc3: 'utc3-' + uid,
      };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Tool-Call 状态流转' })
        .p('通过 [upd id:xxx status:running/done/error] 推送工具调用的状态变化，模拟 AI Agent 的多步工具调用过程。')
        .dv()
        .toolCall({ id: this._ids.tc1, n: 'getWeather', tx: '获取天气数据' })
        .toolCall({ id: this._ids.tc2, n: 'readFile', tx: '读取配置文件' })
        .toolCall({ id: this._ids.tc3, n: 'calculate', tx: '数据聚合计算' })
        .p('自动演示：3 个工具调用依次执行并返回结果...')
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      // 启动第 1 个
      let b = new TokUIBuilder();
      b.upd({ id: ids.tc1, status: 'running' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 1500 });
      // 第 1 个完成
      b = new TokUIBuilder();
      b.upd({ id: ids.tc1, status: 'done', duration: '1.2s', result: '{"temp": 24, "humidity": 65%}' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 500 });
      // 启动第 2 个
      b = new TokUIBuilder();
      b.upd({ id: ids.tc2, status: 'running' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 2000 });
      // 第 2 个完成
      b = new TokUIBuilder();
      b.upd({ id: ids.tc2, status: 'done', duration: '2.1s', result: '{"db": "postgresql", "port": 5432}' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 500 });
      // 启动第 3 个
      b = new TokUIBuilder();
      b.upd({ id: ids.tc3, status: 'running' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 1200 });
      // 第 3 个完成
      b = new TokUIBuilder();
      b.upd({ id: ids.tc3, status: 'done', duration: '1.1s', result: '{"avg_temp": 23.5, "count": 7}' });
      chunks.push(...b.toChunks());
      return chunks;
    }
  },

  // ===== UPD Steps 步骤推进 =====
  {
    trigger: 'demo-upd-steps',
    title: 'UPD 步骤条动态推进',
    desc: '模拟 4 步数据处理流程的步骤动态推进',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = {
        steps: 'ust-' + uid,
        c1: 'usc1-' + uid,
        c2: 'usc2-' + uid,
        c3: 'usc3-' + uid,
        c4: 'usc4-' + uid,
      };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Steps 步骤推进' })
        .p('通过 [upd id:xxx v:步骤号] 推送当前步骤，自动更新步骤条状态。')
        .steps({ id: this._ids.steps, v: '1' })
          .step('数据采集', { tt: '采集' })
          .step('清洗转换', { tt: '清洗' })
          .step('模型训练', { tt: '训练' })
          .step('结果输出', { tt: '输出' })
        .end()
        .dv()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ id: this._ids.c1, tt: '1. 数据采集' })
              .p('等待开始...')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ id: this._ids.c2, tt: '2. 清洗转换' })
              .p('等待中...')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ id: this._ids.c3, tt: '3. 模型训练' })
              .p('等待中...')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ id: this._ids.c4, tt: '4. 结果输出' })
              .p('等待中...')
            .end()
          .end()
        .end()
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      // 步骤 1：数据采集
      chunks.push({ _wait: 1500 });
      let b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: '1. 数据采集中...', tx: '正在从 3 个数据源拉取数据...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 2000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: '1. 数据采集 ✓', tx: '已获取 12,456 条记录' });
      chunks.push(...b.toChunks());
      // 步骤 2：清洗转换
      chunks.push({ _wait: 500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.steps, v: '2' });
      b.upd({ id: ids.c2, tt: '2. 清洗转换中...', tx: '去除重复数据、标准化字段格式...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 2000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.c2, tt: '2. 清洗转换 ✓', tx: '剩余 11,832 条有效记录' });
      chunks.push(...b.toChunks());
      // 步骤 3：模型训练
      chunks.push({ _wait: 500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.steps, v: '3' });
      b.upd({ id: ids.c3, tt: '3. 模型训练中...', tx: '训练随机森林模型，n_estimators=200...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 2500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.c3, tt: '3. 模型训练 ✓', tx: '准确率: 94.7%, F1: 0.923' });
      chunks.push(...b.toChunks());
      // 步骤 4：结果输出
      chunks.push({ _wait: 500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.steps, v: '3' });
      b.upd({ id: ids.c4, tt: '4. 结果输出中...', tx: '生成报告并导出...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 1500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.c4, tt: '4. 结果输出 ✓', tx: '报告已生成，共 23 页' });
      chunks.push(...b.toChunks());
      // 全部完成：v 等于总步数，所有步骤变为完成态
      chunks.push({ _wait: 500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.steps, v: '4' });
      chunks.push(...b.toChunks());
      return chunks;
    }
  },

  // ===== UPD Switch 开关自动切换 =====
  {
    trigger: 'demo-upd-switch',
    title: 'UPD 开关自动切换',
    desc: '模拟系统配置自动启用场景',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = {
        sw1: 'usw1-' + uid,
        sw2: 'usw2-' + uid,
        sw3: 'usw3-' + uid,
        c1: 'usc1-' + uid,
      };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Switch 开关切换' })
        .p('通过 [upd id:xxx chk:true/false] 和 [upd id:xxx dis:true/false] 控制开关状态。')
        .p('模拟场景：系统初始化后，根据环境检测结果自动启用功能。')
        .dv()
        .card({ id: this._ids.c1, tt: '系统初始化中...' })
          .p('正在检测运行环境...')
        .end()
        .dv()
        .switcher({ id: this._ids.sw1, l: '自动保存', tx: '关闭' })
        .dv()
        .switcher({ id: this._ids.sw2, l: '暗色模式', tx: '关闭' })
        .dv()
        .switcher({ id: this._ids.sw3, l: '消息通知', tx: '关闭', dis: true })
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      // 检测中
      chunks.push({ _wait: 1500 });
      let b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: '检测到网络环境 ✓', tx: '正在配置功能...' });
      chunks.push(...b.toChunks());
      // 开启自动保存
      chunks.push({ _wait: 1000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.sw1, chk: true });
      chunks.push(...b.toChunks());
      // 开启暗色模式
      chunks.push({ _wait: 800 });
      b = new TokUIBuilder();
      b.upd({ id: ids.sw2, chk: true });
      chunks.push(...b.toChunks());
      // 解锁并开启消息通知
      chunks.push({ _wait: 800 });
      b = new TokUIBuilder();
      b.upd({ id: ids.sw3, dis: false });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.sw3, chk: true });
      b.upd({ id: ids.c1, tt: '系统初始化完成 ✓', tx: '所有功能已就绪' });
      chunks.push(...b.toChunks());
      return chunks;
    }
  },

  // ===== UPD Drawer 抽屉动态开关 =====
  {
    trigger: 'demo-upd-drawer',
    title: 'UPD 抽屉动态开关',
    desc: 'AI 分析完成后自动弹出抽屉展示报告',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = {
        drawer: 'udr-' + uid,
        prog: 'udrp-' + uid,
        c1: 'udrc-' + uid,
      };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Drawer 抽屉更新' })
        .p('通过 [upd id:xxx act:open/close] 控制抽屉开关，[upd id:xxx tt:新标题] 更新标题。')
        .dv()
        .card({ id: this._ids.c1, tt: '数据分析进行中...' })
          .progress({ id: this._ids.prog, v: '0', l: '分析进度' })
        .end()
        .drawer({ id: this._ids.drawer, tt: '分析报告', pos: 'right' })
          .h3('性能分析报告')
          .p('本次分析覆盖 7 天的运行数据。')
          .dv()
          .stat({ v: '2.3s', l: '平均响应时间', trend: 'down' })
          .stat({ v: '99.7%', l: '可用性', trend: 'up' })
          .dv()
          .p('详细内容请参考完整报告文档。')
        .end()
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      // 进度推进
      [15, 35, 60, 80, 100].forEach(v => {
        let b = new TokUIBuilder();
        b.upd({ id: ids.prog, v: String(v) });
        chunks.push(...b.toChunks());
        chunks.push({ _wait: 800 });
      });
      // 完成
      let b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: '分析完成 ✓' });
      b.upd({ id: ids.prog, status: 'success' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 1000 });
      // 打开抽屉
      b = new TokUIBuilder();
      b.upd({ id: ids.drawer, act: 'open' });
      chunks.push(...b.toChunks());
      // 3秒后关闭
      chunks.push({ _wait: 3000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.drawer, act: 'close' });
      chunks.push(...b.toChunks());
      return chunks;
    }
  },

  // ===== UPD Agent 状态流转 =====
  {
    trigger: 'demo-upd-agent',
    title: 'UPD Agent 状态流转',
    desc: '3 个 Agent 协作任务，状态动态流转',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = {
        a1: 'ua1-' + uid,
        a2: 'ua2-' + uid,
        a3: 'ua3-' + uid,
      };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Agent 状态流转' })
        .p('通过 [upd id:xxx status:running/done] 推送 Agent 状态变化，模拟多 Agent 协作。')
        .dv()
        .agent({ id: this._ids.a1, n: 'Researcher', status: 'idle', tx: '负责信息检索与数据收集' })
        .agent({ id: this._ids.a2, n: 'Analyst', status: 'idle', tx: '负责数据分析与模型构建' })
        .agent({ id: this._ids.a3, n: 'Writer', status: 'idle', tx: '负责报告撰写与总结' })
        .p('自动演示：3 个 Agent 依次启动、执行任务、完成...')
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      // Agent 1 启动
      let b = new TokUIBuilder();
      b.upd({ id: ids.a1, status: 'running', action: '搜索相关文献...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 2000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.a1, status: 'done', action: '文献检索完成', duration: '2.0s' });
      chunks.push(...b.toChunks());
      // Agent 2 启动
      chunks.push({ _wait: 500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.a2, status: 'running', action: '构建预测模型...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 2500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.a2, status: 'done', action: '模型构建完成', duration: '2.5s' });
      chunks.push(...b.toChunks());
      // Agent 3 启动
      chunks.push({ _wait: 500 });
      b = new TokUIBuilder();
      b.upd({ id: ids.a3, status: 'running', action: '撰写分析报告...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 1800 });
      b = new TokUIBuilder();
      b.upd({ id: ids.a3, status: 'done', action: '报告已完成', duration: '1.8s' });
      chunks.push(...b.toChunks());
      return chunks;
    }
  },

  // ===== UPD Chat-Input 输入状态 =====
  {
    trigger: 'demo-upd-chat-input',
    title: 'UPD 对话输入状态',
    desc: 'AI 回复过程中禁用/启用输入框',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = {
        ci: 'uci-' + uid,
        c1: 'ucc-' + uid,
      };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Chat-Input 输入状态' })
        .p('通过 [upd id:xxx dis:true/false] 控制 chat-input 的禁用状态。')
        .p('场景：AI 正在思考时禁用输入框，完成后恢复。')
        .dv()
        .card({ id: this._ids.c1, tt: '对话状态' })
          .p('空闲 — 等待用户输入')
        .end()
        .dv()
        .chatInput({ id: this._ids.ci, ph: '输入消息...' })
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      // 用户发送消息 → 禁用输入
      chunks.push({ _wait: 1500 });
      let b = new TokUIBuilder();
      b.upd({ id: ids.ci, dis: true });
      b.upd({ id: ids.c1, tt: 'AI 思考中...', tx: '正在生成回复，请稍候...' });
      chunks.push(...b.toChunks());
      // AI 处理中
      chunks.push({ _wait: 3000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: 'AI 正在回复', tx: '已完成 80%...' });
      chunks.push(...b.toChunks());
      // 完成 → 恢复输入
      chunks.push({ _wait: 2000 });
      b = new TokUIBuilder();
      b.upd({ id: ids.ci, dis: false });
      b.upd({ id: ids.c1, tt: '回复完成 ✓', tx: '空闲 — 等待用户输入' });
      chunks.push(...b.toChunks());
      return chunks;
    }
  },

  // ===== UPD Form 表单联动更新 =====
  {
    trigger: 'demo-upd-form',
    title: 'UPD 表单联动更新',
    desc: '多个表单控件联动：slider 联动 numinput、switch 联动 input 禁用',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = {
        slider: 'ufs-' + uid,
        numinput: 'ufn-' + uid,
        sw: 'ufw-' + uid,
        inp: 'ufi-' + uid,
        rate: 'ufr-' + uid,
        c1: 'ufc-' + uid,
      };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Form 表单联动' })
        .p('通过 [upd id:xxx v:新值] 联动更新多个表单控件，模拟后端驱动的表单状态变更。')
        .dv()
        .card({ id: this._ids.c1, tt: '联动控制台' })
          .p('准备开始联动演示...')
        .end()
        .dv()
        .slider({ id: this._ids.slider, l: '数量', min: 0, max: 100, v: 0 })
        .dv()
        .numinput({ id: this._ids.numinput, l: '精确值', min: 0, max: 100, v: 0 })
        .dv()
        .switcher({ id: this._ids.sw, l: '启用备注', tx: '关闭' })
        .dv()
        .input({ id: this._ids.inp, l: '备注', ph: '请先启用备注...', dis: true })
        .dv()
        .rate({ id: this._ids.rate, l: '评分' })
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      // 联动演示 1：slider 和 numinput 联动
      chunks.push({ _wait: 1500 });
      let b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: '联动 1：数量同步', tx: 'Slider 与 NumInput 数值同步变化...' });
      chunks.push(...b.toChunks());
      [20, 45, 73, 88, 100].forEach(v => {
        b = new TokUIBuilder();
        b.upd({ id: ids.slider, v: String(v) });
        b.upd({ id: ids.numinput, v: String(v) });
        chunks.push(...b.toChunks());
        chunks.push({ _wait: 600 });
      });
      // 联动演示 2：switch 联动 input
      b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: '联动 2：开关控制', tx: '开启备注输入框...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 800 });
      b = new TokUIBuilder();
      b.upd({ id: ids.sw, chk: true });
      b.upd({ id: ids.inp, dis: false, ph: '请输入备注内容...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 1500 });
      // 联动演示 3：评分
      b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: '联动 3：评分', tx: '更新评分...' });
      chunks.push(...b.toChunks());
      chunks.push({ _wait: 800 });
      b = new TokUIBuilder();
      b.upd({ id: ids.rate, v: '4' });
      chunks.push(...b.toChunks());
      // 完成
      chunks.push({ _wait: 800 });
      b = new TokUIBuilder();
      b.upd({ id: ids.c1, tt: '联动演示完成 ✓', tx: '所有表单控件已联动更新' });
      chunks.push(...b.toChunks());
      return chunks;
    }
  },

  // ===== UPD Stat 统计数值动画 =====
  {
    trigger: 'demo-upd-stat',
    title: 'UPD 统计数值实时更新',
    desc: '3 个 stat 卡片数值实时跳动，模拟实时数据监控',
    _ids: null,
    build() {
      const uid = Math.random().toString(36).slice(2, 6);
      this._ids = {
        s1: 'uss1-' + uid,
        s2: 'uss2-' + uid,
        s3: 'uss3-' + uid,
      };
      const b = new TokUIBuilder();
      b.card({ tt: 'UPD Stat 统计数值实时更新' })
        .p('通过 [upd id:xxx v:新值 trend:up/down] 推送统计数值更新，模拟实时监控面板。')
        .dv()
        .row_layout()
          .col_layout({ span: 4 })
            .stat({ id: this._ids.s1, v: '0', l: '在线用户', trend: 'up' })
          .end()
          .col_layout({ span: 4 })
            .stat({ id: this._ids.s2, v: '0', l: '请求/秒', trend: 'up' })
          .end()
          .col_layout({ span: 4 })
            .stat({ id: this._ids.s3, v: '0', l: '错误率', trend: 'down' })
          .end()
        .end()
        .p('自动模拟 10 轮数据更新...')
      .end();
      return b;
    },
    extraChunks() {
      const ids = this._ids;
      const chunks = [];
      const users = [128, 256, 312, 287, 456, 523, 489, 634, 701, 856];
      const rps = [45, 89, 132, 98, 167, 234, 198, 312, 287, 345];
      const errors = ['0.3%', '0.2%', '0.5%', '0.1%', '0.8%', '0.4%', '0.2%', '0.1%', '0.3%', '0.1%'];
      for (let i = 0; i < 10; i++) {
        const b = new TokUIBuilder();
        b.upd({ id: ids.s1, v: String(users[i]), trend: i > 0 && users[i] > users[i - 1] ? 'up' : 'down' });
        b.upd({ id: ids.s2, v: String(rps[i]), trend: i > 0 && rps[i] > rps[i - 1] ? 'up' : 'down' });
        b.upd({ id: ids.s3, v: errors[i], trend: i > 0 && parseFloat(errors[i]) < parseFloat(errors[i - 1]) ? 'down' : 'up' });
        chunks.push(...b.toChunks());
        chunks.push({ _wait: 800 });
      }
      return chunks;
    }
  },

  // ===== P0 新增组件 Demo =====

  {
    trigger: 'demo-callout',
    title: 'Callout 提示框',
    desc: '5 种类型提示框：info / success / warning / error / tip',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Callout 提示框 — 所有变体' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '基础类型' })
              .callout({ t: 'info', tt: '信息提示', tx: '这是一条信息性提示，用于展示一般性说明。' })
              .callout({ t: 'success', tt: '操作成功', tx: '数据已成功保存到服务器。' })
              .callout({ t: 'warning', tt: '注意', tx: '该操作不可撤销，请确认后再执行。' })
              .callout({ t: 'error', tt: '错误', tx: '网络连接失败，请检查网络设置后重试。' })
              .callout({ t: 'tip', tt: '小贴士', tx: '使用键盘快捷键 Ctrl+S 可以快速保存。' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '无标题模式' })
              .callout({ t: 'info', tx: '不带标题的简洁提示，适合简短说明。' })
              .callout({ t: 'warning', tx: '磁盘空间不足，建议清理临时文件。' })
              .callout({ t: 'error', tx: '请求超时，请稍后重试。' })
              .callout({ t: 'tip', tx: '点击右上角设置按钮可自定义主题。' })
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '表单验证场景' })
              .p('用户提交表单后的验证反馈：')
              .callout({ t: 'success', tt: '提交成功', tx: '表单数据已通过校验，正在跳转至结果页面...' })
              .callout({ t: 'warning', tt: '字段不完整', tx: '手机号格式不正确，请检查第 3 项输入。' })
              .callout({ t: 'error', tt: '提交失败', tx: '验证码已过期，请重新获取后再次提交。' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'API 调用与权限场景' })
              .p('后端接口返回的状态提示：')
              .callout({ t: 'info', tt: '接口文档', tx: 'GET /api/v1/users 支持分页查询，默认 pageSize=20。' })
              .callout({ t: 'error', tt: '权限不足', tx: '当前角色无权访问该资源，请联系管理员申请权限。' })
              .callout({ t: 'success', tt: '部署完成', tx: '版本 v2.4.1 已成功发布至生产环境，预计 5 分钟后全量生效。' })
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '多步骤流程提示' })
              .p('任务执行过程中的状态通知：')
              .callout({ t: 'info', tt: '步骤 1/4', tx: '正在连接数据源，请稍候...' })
              .callout({ t: 'warning', tt: '步骤 2/4', tx: '检测到大量历史数据，导入时间可能延长。' })
              .callout({ t: 'success', tt: '步骤 4/4', tx: '数据迁移完成，共处理 12,580 条记录。' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'AI 对话场景' })
              .p('AI 回答中穿插的关键信息：')
              .callout({ t: 'tip', tt: '快速上手', tx: '直接输入自然语言描述即可生成 UI，无需记忆固定语法。' })
              .callout({ t: 'warning', tt: '注意', tx: '当前生成的代码未经过完整测试，建议审查后再投入生产。' })
              .callout({ t: 'error', tt: '执行异常', tx: 'Docker 容器启动失败，错误码 137 (OOMKilled)，建议增加内存配额。' })
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-think',
    title: 'Think 思考块',
    desc: '展示 AI 思考过程的折叠组件',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Think 思考块组件' })
        .h3('默认折叠')
        .p('以下是 AI 的思考过程：')
        .think({ tt: '思考过程' })
          .p('用户问的是关于 React 性能优化的问题...')
          .p('需要从以下几个方面分析：1. 渲染优化 2. 状态管理 3. 代码分割')
          .p('先检查是否有不必要的 re-render...')
        .end()
        .p('经过思考，以下是我的回答：...')
      .end();
      b.card({ tt: '默认展开' })
        .think({ tt: '推理步骤', open: true })
          .p('Step 1: 分析问题 → 这是一个排序算法问题')
          .p('Step 2: 选择策略 → 数据量小时用快速排序')
          .p('Step 3: 验证 → 时间复杂度 O(n log n)')
        .end()
      .end();
      b.card({ tt: '搭配 Markdown' })
        .p('AI 思考过程中可以包含复杂内容：')
        .think({ tt: '代码分析' })
          .md('发现以下问题：\n\n- **变量未初始化**：第 42 行 `let result;` 未赋值\n- **类型不匹配**：`parseInt(null)` 返回 `NaN`\n\n建议修复方案：\n\n```js\nlet result = 0;\nconst num = parseInt(input) || 0;\n```')
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-copy',
    title: 'Copy 复制按钮',
    desc: '一键复制内容 + Code 自动注入复制',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Copy 复制按钮组件' })
        .h3('独立复制按钮')
        .p('点击按钮复制指定元素内容：')
        .copy({ tx: '复制配置', tt: '配置已复制！', id: 'demo-copy-target' })
      .end();
      b.card({ tt: 'Code 自动复制', id: 'demo-copy-target' })
        .h3('代码块自动带复制按钮')
        .p('所有代码块右上角自动出现复制按钮（hover 显示）：')
        .code({ lang: 'javascript' }, 'const greeting = "Hello, TokUI!";\nconsole.log(greeting);')
        .dv({})
        .code({ lang: 'python' }, 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)')
        .dv({})
        .code({ lang: 'sql' }, 'SELECT u.name, COUNT(o.id) AS order_count\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nGROUP BY u.name\nHAVING COUNT(o.id) > 5;')
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-spin',
    title: 'Spin 加载指示器',
    desc: '三种形态：spinner / dots / pulse',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Spin 加载指示器组件' })
        .h3('Spinner 旋转（默认）')
        .row_layout()
          .col_layout({ span: 4 })
            .p('默认')
            .spin({ t: 'spinner' })
          .end()
          .col_layout({ span: 4 })
            .p('小号')
            .spin({ t: 'spinner', s: 'sm' })
          .end()
          .col_layout({ span: 4 })
            .p('大号')
            .spin({ t: 'spinner', s: 'lg' })
          .end()
        .end()
        .h3('Dots 三点跳动')
        .row_layout()
          .col_layout({ span: 4 })
            .spin({ t: 'dots' })
          .end()
          .col_layout({ span: 4 })
            .spin({ t: 'dots', s: 'sm' })
          .end()
          .col_layout({ span: 4 })
            .spin({ t: 'dots', s: 'lg' })
          .end()
        .end()
        .h3('Pulse 脉冲')
        .row_layout()
          .col_layout({ span: 4 })
            .spin({ t: 'pulse' })
          .end()
          .col_layout({ span: 4 })
            .spin({ t: 'pulse', s: 'sm' })
          .end()
          .col_layout({ span: 4 })
            .spin({ t: 'pulse', s: 'lg' })
          .end()
        .end()
        .h3('带文字提示')
        .spin({ t: 'spinner', tx: 'AI 正在思考...' })
        .dv({})
        .spin({ t: 'dots', tx: '正在加载数据...' })
        .dv({})
        .spin({ t: 'pulse', tx: '处理中，请稍候', s: 'lg' })
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-thumb',
    title: 'Thumb 点赞/点踩',
    desc: 'AI 回答反馈评价',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Thumb 点赞/点踩组件' })
        .h3('基础用法')
        .p('点赞和点踩可以独立使用：')
        .row_layout()
          .col_layout({ span: 4 })
            .thumb({ t: 'up' })
            .tag('点赞', { s: 'sm' })
          .end()
          .col_layout({ span: 4 })
            .thumb({ t: 'down' })
            .tag('点踩', { s: 'sm' })
          .end()
          .col_layout({ span: 4 })
            .thumb({ t: 'up', v: 'active' })
            .tag('已赞', { t: 'success', s: 'sm' })
          .end()
        .end()
        .h3('小号 (sm)')
        .row_layout()
          .col_layout({ span: 6 })
            .thumb({ t: 'up', s: 'sm' })
            .tag('小按钮', { s: 'sm' })
          .end()
          .col_layout({ span: 6 })
            .thumb({ t: 'down', s: 'sm' })
            .tag('小按钮', { s: 'sm' })
          .end()
        .end()
        .h3('大号 (lg)')
        .row_layout()
          .col_layout({ span: 6 })
            .thumb({ t: 'up', s: 'lg', v: 'active' })
            .tag('大按钮', { t: 'success' })
          .end()
          .col_layout({ span: 6 })
            .thumb({ t: 'down', s: 'lg' })
            .tag('大按钮', { t: 'warning' })
          .end()
        .end()
        .h3('搭配 AI 消息卡片')
        .p('模拟 AI 回答后的反馈区域：')
      .end();
      // 模拟 AI 回答
      b.card({ tt: '如何优化 React 性能？' })
        .p('以下是几个关键优化策略：')
        .list({ t: 'ul' })
          .item('使用 React.memo 避免不必要的重新渲染')
          .item('使用 useMemo 和 useCallback 缓存计算结果')
          .item('使用虚拟列表处理大量数据渲染')
          .item('使用代码分割和懒加载')
        .end()
        .dv({})
        .callout({ t: 'tip', tx: '建议使用 React DevTools Profiler 分析性能瓶颈。' })
      .end();
      b.card({ tt: '您对这个回答满意吗？', ht: 'line' })
        .row_layout()
          .col_layout({ span: 6 })
            .thumb({ t: 'up', s: 'lg' })
            .tag('有帮助，感谢！', { t: 'success' })
          .end()
          .col_layout({ span: 6 })
            .thumb({ t: 'down', s: 'lg' })
            .tag('需要改进', { t: 'warning' })
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-file',
    title: 'File 文件卡片',
    desc: '文件预览卡片：多种文件类型',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'File 文件卡片组件' })
        .h3('多种文件类型')
        .file({ n: '年度报告.pdf', s: '2.4 MB', t: 'pdf', u: '#' })
        .file({ n: '数据分析.xlsx', s: '856 KB', t: 'excel', u: '#', tt: 'Q4 销售数据汇总' })
        .file({ n: '产品方案.docx', s: '1.2 MB', t: 'word', u: '#' })
        .file({ n: '演示文稿.pptx', s: '5.8 MB', t: 'ppt', u: '#', tt: '2024 年度规划' })
        .file({ n: '截图.png', s: '320 KB', t: 'image', u: '#' })
        .file({ n: 'backup.zip', s: '12.5 MB', t: 'zip', u: '#' })
        .file({ n: 'index.js', s: '4.2 KB', t: 'code', u: '#', tt: '入口文件' })
        .file({ n: 'readme.txt', s: '2.1 KB', t: 'default', u: '#' })
      .end();
      b.card({ tt: 'AI 对话场景' })
        .p('以下是 AI 生成的分析报告文件：')
        .file({ n: '用户行为分析报告.pdf', s: '3.2 MB', t: 'pdf', u: '#', tt: '包含 2024 年全年用户数据分析' })
        .dv({})
        .callout({ t: 'info', tx: '点击文件名或下载按钮即可获取文件。' })
      .end();
      return b;
    }
  },

  // ===== Chart 数据可视化 =====

  {
    trigger: 'demo-chart',
    title: 'Chart 图表',
    desc: '纯 SVG 零依赖数据可视化',
    build() {
      const b = new TokUIBuilder();
      b.p('纯 SVG 零依赖图表组件，支持 20 种图表类型，可扩展接入外部图表库。');
      b.dv({});
      // 柱状图：两列并排
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'bar', d: '120,200,150,80,250,180', l: '1月,2月,3月,4月,5月,6月', tt: '2024 上半年销售额（万元）', h: 200 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'bar', d: '80,120,100|60,90,140|110,70,95', l: '产品A,产品B,产品C', tt: '季度销售对比（多系列）', h: 200 })
          .end()
        .end()
      .end();
      b.dv({});
      // 折线图：两列并排
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'line', d: '30,45,28,60,55,80,72,90', l: '周一,周二,周三,周四,周五,周六,周日,下周一', tt: '本周访问量趋势', h: 200 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'line', d: '20,35,25,50,45,70,60|40,30,45,35,60,55,80', l: '1月,2月,3月,4月,5月,6月,7月', tt: '多系列对比趋势', h: 200, area: true })
          .end()
        .end()
      .end();
      b.dv({});
      // 饼图 + 环形图：三列并排
      b.row_layout()
        .col_layout({ span: 4 })
          .card({})
            .chart({ t: 'pie', d: '35,25,20,12,8', l: '微信,抖音,淘宝,京东,其他', tt: '流量来源占比', w: 240, h: 240 })
          .end()
        .end()
        .col_layout({ span: 4 })
          .card({})
            .chart({ t: 'donut', d: '75,25', l: '已完成,剩余', tt: '项目进度', v: 75, w: 200, h: 200 })
          .end()
        .end()
        .col_layout({ span: 4 })
          .card({})
            .chart({ t: 'donut', d: '60,30,10', l: '代码,文档,测试', tt: '工作内容分布', w: 200, h: 200 })
          .end()
        .end()
      .end();
      b.dv({});
      // 雷达图 + 散点图：两列并排
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'radar', d: '90,70,85,60,95,75', l: '速度,力量,技巧,耐力,智慧,协作', tt: '能力评估雷达图', w: 260, h: 260 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'scatter', d: '10,20;25,45;30,35;50,70;65,55;80,90;45,60;15,30;70,85;35,50', tt: '学习时长 vs 考试成绩', h: 200, xl: '学习时长', yl: '考试成绩' })
          .end()
        .end()
      .end();
      b.dv({});
      // 仪表盘 gauge：单值 KPI 基础（4 列：完成率/CPU/时速/健康度）
      b.p('仪表盘 gauge 用于单值 KPI（完成率、CPU、时速、健康度）：半圆弧 + 指针 + 中心大字；status 按语义染色并出角标（良好/注意/告警），sub 加副标题。');
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'gauge', v: 78, tt: '项目完成率', l: '已完成', sub: '数据来源: 项目系统', w: 260, h: 200 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'gauge', v: 92, tt: 'CPU 使用率', l: '8 核均值', status: 'danger', sub: '阈值 85%', w: 260, h: 200 })
          .end()
        .end()
      .end();
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'gauge', v: 120, max: 240, u: ' km/h', tt: '当前时速', l: '限速 240', status: 'success', w: 260, h: 200 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'gauge', v: 65, max: 100, tt: '服务健康度', l: 'SLA 指标', status: 'warning', w: 260, h: 200 })
          .end()
        .end()
      .end();
      b.dv({});
      // gauge 进阶：阶段分布 zones + 数字动画 anim
      b.p('进阶：zones 阶段分布色带（阈值把轨道分段，弧色自动取值所在段），anim 数字+弧+指针动画，dec 小数位，ticks 刻度密度。');
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'gauge', v: 92, tt: '达标率（阶段分布）', zones: '60,85', l: 'Q2 目标 90%', anim: 1200, sub: '红线 85% / 警戒 60%', w: 300, h: 220 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'gauge', v: 30, tt: '错误率（高=差，反向配色）', zones: '3,8', zc: '#52c41a,#faad14,#f5222d', u: '%', dec: 1, l: '近 1 小时', anim: 1000, w: 300, h: 220 })
          .end()
        .end()
      .end();
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'gauge', v: 7.2, max: 10, tt: '评分（带小数）', dec: 1, l: '满分 10', status: 'success', ticks: 10, anim: 1200, w: 300, h: 220 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'gauge', v: 46, tt: '磁盘使用率', zones: '60,85', zc: '#52c41a,#faad14,#f5222d', l: 'SSD 1TB', status: 'success', anim: 1200, sub: '安全区', w: 300, h: 220 })
          .end()
        .end()
      .end();
      b.dv({});
      b.p('容器写法同样支持流式 —— 逐个喂入 pt 子节点（属性 v:数值），指针随数值实时跳动：');
      b.card({ tt: '达标率（流式容器写法）' })
        .chart({ t: 'gauge', tt: '季度达标率', l: 'Q2 目标 90%', w: 320, h: 220 })
          .chartPoint({ v: 86 })
        .end()
      .end();
      b.dv({});
      b.card({ tt: 'AI 数据分析场景' })
        .p('AI 分析用户行为数据后，生成可视化报告：')
        .callout({ t: 'info', tt: '分析结论', tx: '用户活跃度在 5-6 月显著上升，主要来源为微信渠道（35%）。' })
        .dv({})
        .row_layout()
          .col_layout({ span: 6 })
            .chart({ t: 'line', d: '120,150,130,200,250,280', l: '1月,2月,3月,4月,5月,6月', tt: 'DAU 趋势', h: 180 })
          .end()
          .col_layout({ span: 6 })
            .chart({ t: 'pie', d: '35,25,20,12,8', l: '微信,抖音,淘宝,京东,其他', tt: '流量来源', w: 220, h: 220 })
          .end()
        .end()
      .end();
      // ===== 新增 11 种图表（v2）：面积/玫瑰/气泡/热力/直方/瀑布/箱线/树图/桑基/K线/进度条 =====
      b.dv({});
      b.p('进阶图表（11 种）：面积、玫瑰、气泡、热力、直方、瀑布、箱线、树图、桑基、K 线、进度条。');
      // 面积 + 玫瑰
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'area', d: '30,45,38,60,52|15,25,20,35,28', l: 'Q1,Q2,Q3,Q4,Q5', tt: '堆叠面积图', stack: true, h: 200 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'rose', d: '320,580,450,280', l: '春,夏,秋,冬', tt: '玫瑰图（半径 ∝ 值）', w: 240, h: 240 })
          .end()
        .end()
      .end();
      // 气泡 + 热力
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'bubble', d: '1.2,8,300;2.5,15,800;3.8,24,1500;1.8,10,450;4.5,30,2200', xl: 'GDP', yl: '人口', sl: '产值', tt: '气泡图（三维）', h: 200 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'heatmap', rows: '20,35,40,50,80|60,75,80,90,95|30,50,55,65,70', cols: '周一,周二,周三,周四,周五', l: '早,中,晚', tt: '热力图（时段密度）', h: 200 })
          .end()
        .end()
      .end();
      // 直方 + 瀑布
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'histogram', d: '56,62,68,71,73,75,78,80,82,85,88,90,92,95', bins: 6, tt: '直方图（频次分布）', h: 200 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'waterfall', d: '100,-35,28,-12,-8', l: '营收,成本,毛利,费用,净利', tt: '瀑布图（增减累计）', h: 200 })
          .end()
        .end()
      .end();
      // 箱线 + K线
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'boxplot', d: '45,62,72,85,98;50,65,70,82,95;40,58,68,78,92', l: '甲班,乙班,丙班', tt: '箱线图（五数分布）', h: 220 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'candlestick', d: '10,12,8,11;11,13,9,10;10,14,9,13;11,11.5,9.5,10.5', l: 'D1,D2,D3,D4', tt: 'K 线图（OHLC）', h: 220 })
          .end()
        .end()
      .end();
      // 树图 + 桑基
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'treemap', d: 'iOS:320,Android:580,Web:450,小程序:280,其他:150', tt: '矩形树图（占比）', h: 220 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'sankey', nodes: '首页,搜索,详情,下单,支付', flows: '首页->搜索:100,搜索->详情:70,详情->下单:45,下单->支付:38', tt: '桑基图（流向）', h: 220 })
          .end()
        .end()
      .end();
      // 进度条 + 仪表盘 270°（range 新属性）
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'progress', v: 68, l: '迭代完成', tt: '进度条', anim: 1000, h: 80 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'gauge', v: 78, range: 270, tt: '健康度（270° 仪表盘）', l: '满分 100', status: 'success', anim: 1000, w: 260, h: 220 })
          .end()
        .end()
      .end();
      return b;
    }
  },

  // ===== Gantt 甘特图 =====

  {
    trigger: 'demo-chart-gantt',
    title: 'Gantt 甘特图',
    desc: '项目排期 / MES 生产排程',
    build() {
      const b = new TokUIBuilder();
      b.p('甘特图支持任务进度、依赖箭头、里程碑、today 线，点击任务条可高亮关联依赖链。');
      b.dv({});

      // 场景1：项目工程管理（days 模式）
      b.card({ tt: '项目工程管理（天数模式）' })
        .p('产品迭代排期：产品→研发→质量→运维多组并行。')
        .chart({
          t: 'gantt',
          tt: 'V2.0 版本排期',
          w: 720,
          tasks: '需求调研,1,3,100,0|原型设计,3,5,100,0|UI设计,5,8,80,0|前端开发,8,14,60,1|后端开发,5,13,55,1|联调,14,16,0,2|测试,16,18,0,2|上线,18,19,0,3',
          gnames: '产品设计|开发|测试|发布',
          deps: '0->1,1->2,1->4,2->3,3->5,4->5,5->6,6->7',
          ms: '原型评审,5,0|联调启动,14,2|上线,19,3'
        })
      .end();

      b.dv({});

      // 场景2：生产 MES 排程（dates 模式，动态日期保证 today 线可见）
      function dStr(off) {
        var d = new Date(); d.setDate(d.getDate() + off);
        var m = d.getMonth() + 1, day = d.getDate();
        return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
      }
      b.card({ tt: '生产 MES 排程（日期模式）' })
        .p('工单从下发到入库全流程，today 线标记当前进度位置。')
        .chart({
          t: 'gantt',
          tt: '工单 WO-20260615 排程',
          mode: 'dates',
          w: 720,
          tasks: '工单下发,' + dStr(0) + ',' + dStr(1) + ',100,0|物料齐套,' + dStr(1) + ',' + dStr(3) + ',100,0|首件生产,' + dStr(3) + ',' + dStr(5) + ',80,0|批量生产,' + dStr(5) + ',' + dStr(10) + ',40,0|质检,' + dStr(10) + ',' + dStr(12) + ',0,1|包装入库,' + dStr(12) + ',' + dStr(13) + ',0,2',
          gnames: '生产|质检|入库',
          deps: '0->1,1->2,2->3,3->4,4->5',
          ms: '首件确认,' + dStr(5) + ',0|放行,' + dStr(12) + ',1'
        })
      .end();

      return b;
    }
  },

  // ===== Funnel 漏斗图 =====

  {
    trigger: 'demo-chart-funnel',
    title: 'Funnel 漏斗图',
    desc: '销售 / 转化漏斗',
    build() {
      const b = new TokUIBuilder();
      b.p('漏斗图用于展示逐级递减的转化流程（销售、注册、招聘），宽度 ∝ 数值，建议数据降序。数值居中、名称靠右引出，标注相对首层的转化率。');
      b.dv({});

      // 场景1：电商销售漏斗（自闭合，单系列逗号分隔）
      b.row_layout()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'funnel', tt: '电商销售漏斗', l: '曝光,点击,加购,下单,付款', d: '12000,5400,2800,1600,920', w: 560, h: 320 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({})
            .chart({ t: 'funnel', tt: '注册转化漏斗', l: '访问,开始注册,验证手机,完成注册', d: '8000,4200,3100,2600', c: '#52c41a,#13c2c2,#1677ff,#722ed1', w: 560, h: 320 })
          .end()
        .end()
      .end();

      b.dv({});
      b.p('容器写法同样支持流式 —— 逐个喂入 pt 子节点（属性 v:数值），梯形逐层蹦出，数据增长过程可见：');

      // 场景2：招聘漏斗（流式容器写法，逐 pt 喂入）
      b.card({ tt: '招聘漏斗（流式容器写法）' })
        .chart({ t: 'funnel', tt: '春季校招 funnel', l: '投递,简历筛,笔试,面试,offer', w: 720, h: 340 })
          .chartPoint({ v: 3200 })
          .chartPoint({ v: 2100 })
          .chartPoint({ v: 1400 })
          .chartPoint({ v: 520 })
          .chartPoint({ v: 180 })
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-badge',
    title: 'Badge 徽标数',
    desc: '数字徽标 / 小红点 / 状态标签 / 尺寸',
    build() {
      const b = new TokUIBuilder();

      // 数字徽标
      b.card({ tt: '🔢 数字徽标' });
      b.badge({ count: '0', overflow: 99 });
      b.badge({ count: '1' });
      b.badge({ count: '5' });
      b.badge({ count: '12' });
      b.badge({ count: '99' });
      b.badge({ count: '100' });
      b.badge({ count: '999', overflow: 999 });
      b.end();

      // 带颜色的数字
      b.card({ tt: '🎨 彩色数字徽标' });
      b.badge({ count: '3', t: 'primary' });
      b.badge({ count: '12', t: 'success' });
      b.badge({ count: '5', t: 'warning' });
      b.badge({ count: '99', t: 'error' });
      b.badge({ count: '8', t: 'info' });
      b.badge({ count: '0', t: 'default' });
      b.end();

      // 小红点
      b.card({ tt: '🔴 小红点 (dot)' });
      b.badge({ dot: true });
      b.badge({ dot: true, t: 'success' });
      b.badge({ dot: true, t: 'warning' });
      b.badge({ dot: true, t: 'primary' });
      b.badge({ dot: true, t: 'info' });
      b.end();

      // 文本标签
      b.card({ tt: '🏷️ 文本标签' });
      b.badge({ tx: 'Default' });
      b.badge({ tx: 'Primary', t: 'primary' });
      b.badge({ tx: 'Success', t: 'success' });
      b.badge({ tx: 'Warning', t: 'warning' });
      b.badge({ tx: 'Error', t: 'error' });
      b.badge({ tx: 'Info', t: 'info' });
      b.end();

      // 胶囊模式
      b.card({ tt: '💊 胶囊模式 (pill)' });
      b.badge({ tx: '进行中', t: 'primary', pill: true });
      b.badge({ tx: '已完成', t: 'success', pill: true });
      b.badge({ tx: '待审核', t: 'warning', pill: true });
      b.badge({ tx: '已拒绝', t: 'error', pill: true });
      b.badge({ tx: '草稿', t: 'default', pill: true });
      b.end();

      // 尺寸
      b.card({ tt: '📏 尺寸' });
      b.badge({ tx: 'Small', t: 'primary', size: 'sm' });
      b.badge({ tx: 'Default', t: 'primary' });
      b.badge({ tx: 'Large', t: 'primary', size: 'lg' });
      b.p('');
      b.badge({ dot: true, size: 'sm' });
      b.badge({ dot: true });
      b.badge({ dot: true, size: 'lg' });
      b.end();

      // AI 场景
      b.card({ tt: '🤖 AI 场景' });
      b.p('模型标识：');
      b.badge({ tx: 'GPT-4o', t: 'info', pill: true });
      b.badge({ tx: 'Claude', t: 'primary', pill: true });
      b.badge({ tx: 'Gemini', t: 'success', pill: true });
      b.p('');
      b.p('未读消息：');
      b.badge({ count: '3', t: 'error' });
      b.badge({ count: '25', t: 'error' });
      b.badge({ count: '100', t: 'error' });
      b.end();

      // 右上角包裹效果
      b.card({ tt: '📦 组件右上角徽标' });
      b.p('按钮 + 数字徽标：');

      b.badgeBox({ count: '5' });
      b.btn({ tx: '消息' });
      b.end();

      b.badgeBox({ count: '12', t: 'primary' });
      b.btn({ tx: '通知' });
      b.end();

      b.badgeBox({ count: '99', t: 'warning' });
      b.btn({ tx: '待办' });
      b.end();

      b.badgeBox({ count: '0' });
      b.btn({ tx: '草稿' });
      b.end();

      b.p('');
      b.p('按钮 + 小红点：');

      b.badgeBox({ dot: true });
      b.btn({ tx: '新消息' });
      b.end();

      b.badgeBox({ dot: true, t: 'success' });
      b.btn({ tx: '在线' });
      b.end();

      b.badgeBox({ dot: true, t: 'warning' });
      b.btn({ tx: '提醒' });
      b.end();

      b.p('');
      b.p('按钮 + 文本标签：');

      b.badgeBox({ label: 'NEW', t: 'error' });
      b.btn({ tx: '功能' });
      b.end();

      b.badgeBox({ label: 'HOT', t: 'warning' });
      b.btn({ tx: '热门' });
      b.end();

      b.badgeBox({ label: 'BETA', t: 'info' });
      b.btn({ tx: '测试' });
      b.end();

      b.p('');
      b.p('溢出数字：');

      b.badgeBox({ count: '200' });
      b.btn({ tx: '邮件' });
      b.end();

      b.badgeBox({ count: '9999', overflow: '999' });
      b.btn({ tx: '系统通知' });
      b.end();

      b.end();

      return b;
    }
  },
  {
    trigger: 'demo-chat-ui',
    title: 'AI 对话组件集',
    desc: 'Bubble / Toolbar / Skeleton / Toast',
    build() {
      const b = new TokUIBuilder();
      // === 第一行：Bubble + Toolbar ===
      b.row_layout();
        b.col_layout({ span: 6 });
          b.card({ tt: '🫧 Bubble 聊天气泡' });

          b.bubble({ role: 'user', time: '14:32' });
          b.p('请帮我分析一下今年的销售数据趋势');
          b.end();

          b.bubble({ role: 'ai', model: 'GPT-4', time: '14:32' });
          b.p('好的，我来为您分析今年的销售数据趋势。以下是关键发现：');
          b.end();

          b.bubble({ role: 'system' });
          b.p('对话已切换至数据分析模式');
          b.end();

          b.end(); // /card
        b.end(); // /col

        b.col_layout({ span: 6 });
          b.card({ tt: '🔧 Toolbar 操作栏' });

          b.p('右对齐（默认）：');
          b.toolbar({ align: 'right' });
          b.btn({ tx: '复制', clk: 'toast-copy' });
          b.btn({ tx: '重新生成', clk: 'toast-regen' });
          b.btn({ tx: '翻译' });
          b.end();

          b.p('');
          b.p('居中对齐 + 点赞：');
          b.toolbar({ align: 'center' });
          b.thumb({ clk: 'toast-thumb-up' });
          b.thumb({ t: 'down', clk: 'toast-thumb-down' });
          b.end();

          b.p('');
          b.p('左对齐 + 操作：');
          b.toolbar({ align: 'left' });
          b.btn({ tx: '编辑' });
          b.btn({ tx: '删除', clk: 'toast-delete' });
          b.end();

          b.end(); // /card
        b.end(); // /col
      b.end(); // /row

      // === 第二行：Skeleton + 完整对话流 ===
      b.row_layout();
        b.col_layout({ span: 6 });
          b.card({ tt: '🦴 Skeleton 骨架屏' });
          b.p('文字骨架（默认 3 行）：');
          b.skeleton({});
          b.p('卡片骨架：');
          b.skeleton({ t: 'card' });
          b.p('头像骨架：');
          b.skeleton({ t: 'avatar' });
          b.end(); // /card
        b.end(); // /col

        b.col_layout({ span: 6 });
          b.card({ tt: '💬 完整对话流演示' });

          b.bubble({ role: 'user', time: '14:35' });
          b.p('帮我写一个 Python 快速排序');
          b.end();

          b.bubble({ role: 'ai', model: 'Claude Opus', time: '14:35' });
          b.p('这是一个经典的快速排序实现，使用分治策略：');
          b.code({ t: 'python' }, 'def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)');
          b.p('时间复杂度平均 O(n log n)，最坏 O(n²)。如需优化可改用随机 pivot 或三路快排。');
          b.end();

          b.toolbar({ align: 'right' });
          b.btn({ tx: '📋 复制代码', clk: 'toast-copy-code' });
          b.btn({ tx: '🔄 重新生成' });
          b.thumb({ clk: 'thumb-code' });
          b.thumb({ t: 'down', clk: 'thumb-code-down' });
          b.end();

          b.bubble({ role: 'user', time: '14:36' });
          b.p('能加上单元测试吗？');
          b.end();

          b.bubble({ role: 'ai', model: 'Claude Opus', time: '14:36' });
          b.p('当然，这是使用 pytest 风格的测试用例：');
          b.code({ t: 'python' }, 'def test_quicksort():\n    assert quicksort([]) == []\n    assert quicksort([1]) == [1]\n    assert quicksort([3,1,2]) == [1,2,3]\n    assert quicksort([5,3,5,1]) == [1,3,5,5]');
          b.end();

          b.toolbar({ align: 'right' });
          b.btn({ tx: '📋 复制', clk: 'toast-copy-code' });
          b.thumb({ clk: 'thumb-code' });
          b.thumb({ t: 'down', clk: 'thumb-code-down' });
          b.end();

          b.end(); // /card
        b.end(); // /col
      b.end(); // /row

      // Toast（预注册，通过事件触发）
      b.toast({ id: 'toast-copy', t: 'success', tx: '已复制到剪贴板' });
      b.toast({ id: 'toast-regen', t: 'info', tx: '正在重新生成...' });
      b.toast({ id: 'toast-delete', t: 'warning', tx: '确认删除？' });
      b.toast({ id: 'toast-copy-code', t: 'success', tx: '代码已复制' });
      b.toast({ id: 'toast-thumb-up', t: 'success', tx: '感谢您的反馈！' });
      b.toast({ id: 'toast-thumb-down', t: 'info', tx: '我们会继续改进' });

      return b;
    }
  },
  {
    trigger: 'demo-dot',
    title: 'Dot 状态指示器',
    desc: '状态点、脉冲动画、多尺寸',
    build() {
      const b = new TokUIBuilder();

      b.card({ tt: '状态类型' })
        .p('不同颜色表示不同状态：')
        .dot({ t: 'success', tx: '在线' })
        .p('')
        .dot({ t: 'warning', tx: '忙碌' })
        .p('')
        .dot({ t: 'error', tx: '离线' })
        .p('')
        .dot({ t: 'default', tx: '未知' })
        .p('')
        .dot({ t: 'primary', tx: '会议中' })
        .p('')
        .dot({ t: 'info', tx: '通知' })
      .end();

      b.card({ tt: '脉冲动画' })
        .p('pulse 属性启用呼吸动画：')
        .dot({ t: 'success', tx: '服务运行中', pulse: true })
        .p('')
        .dot({ t: 'error', tx: '告警', pulse: true })
        .p('')
        .dot({ t: 'warning', tx: '同步中', pulse: true })
      .end();

      b.card({ tt: '尺寸变体' })
        .dot({ t: 'primary', s: 'sm', tx: '小号 (sm)' })
        .p('')
        .dot({ t: 'primary', tx: '中号 (默认)' })
        .p('')
        .dot({ t: 'primary', s: 'lg', tx: '大号 (lg)' })
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-avatar',
    title: 'Avatar 头像',
    desc: '文字头像、图片头像、自动配色、多尺寸',
    build() {
      const b = new TokUIBuilder();

      b.card({ tt: '文字头像（自动配色）' })
        .p('不指定 bg 时根据文字自动生成背景色：')
        .avatar({ tx: '张三' })
        .avatar({ tx: '李四' })
        .avatar({ tx: '王五' })
        .avatar({ tx: '赵六' })
        .avatar({ tx: 'AI' })
        .avatar({ tx: 'Bot' })
      .end();

      b.card({ tt: '尺寸变体' })
        .avatar({ tx: 'S', size: 'sm' })
        .avatar({ tx: 'M', size: 'md' })
        .avatar({ tx: 'L', size: 'lg' })
        .avatar({ tx: 'XL', size: 'xl' })
      .end();

      b.card({ tt: '自定义颜色' })
        .p('bg 背景色 + fc 字色，支持语义色和 HEX：')
        .avatar({ tx: 'VIP', bg: 'danger', fc: 'FFFFFF', size: 'lg' })
        .avatar({ tx: 'Ad', bg: 'success', fc: 'FFFFFF' })
        .avatar({ tx: 'Pro', bg: 'primary', fc: 'FFFFFF', size: 'lg' })
        .avatar({ tx: 'OK', bg: '1a1a2e', fc: 'e0e0e0' })
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-tooltip',
    title: 'Tooltip 悬浮提示',
    desc: '四方向定位、纯 CSS 实现',
    build() {
      const b = new TokUIBuilder();

      b.card({ tt: '方向变体', v: 'center' })
        .p('悬停查看提示（pos 属性控制方向）：')
        .tooltip('上方向 (top)', { tt: '这是上方的提示内容' })
        .p('')
        .tooltip('下方向 (bottom)', { tt: '这是下方的提示内容', pos: 'bottom' })
        .p('')
        .tooltip('左方向 (left)', { tt: '左侧提示信息', pos: 'left' })
        .p('')
        .tooltip('右方向 (right)', { tt: '右侧提示信息', pos: 'right' })
      .end();

      b.card({ tt: '使用场景' })
        .p('Tooltip 常用于对内联元素补充说明：')
        .p('当前状态 ')
        .tooltip('活跃', { tt: '最近 5 分钟内有操作', pos: 'top' })
        .p(' | ')
        .tooltip('延迟', { tt: '响应时间 > 200ms', pos: 'bottom' })
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-pagination',
    title: 'Pagination 分页',
    desc: '页码导航、省略号、尺寸、总数显示',
    build() {
      const b = new TokUIBuilder();
      b.h2('Pagination 分页')
        .p('页码导航、省略号、尺寸、总数显示');

      b.card({ tt: 'Pagination 分页' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '基础分页' })
              .p('page 当前页 / total 总页数 / clk 点击回调，展示双侧省略号：')
              .pagination({ page: '5', total: '20', clk: 'handlePage' })
            .end()
            .card({ tt: '大数量分页' })
              .p('大数量级下的页码导航（page=50, total=100）：')
              .pagination({ page: '50', total: '100', clk: 'handlePageLarge' })
            .end()
            .card({ tt: '尺寸变体' })
              .p('小尺寸 (s:sm)：')
              .pagination({ page: '7', total: '20', clk: 'handlePage3', s: 'sm' })
              .p('大尺寸 (s:lg)：')
              .pagination({ page: '5', total: '8', clk: 'handlePage4', s: 'lg' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '少量页码' })
              .p('总页数较少时不显示省略号（page=2, total=3）：')
              .pagination({ page: '2', total: '3', clk: 'handlePageSmall' })
            .end()
            .card({ tt: '带总数显示' })
              .p('show-total 显示总条目数，count 指定条目数：')
              .pagination({ page: '8', total: '20', clk: 'handlePage2', 'show-total': true, count: '500' })
            .end()
            .card({ tt: '边界情况' })
              .p('首页（prev 禁用）：')
              .pagination({ page: '1', total: '20', clk: 'handlePage5' })
              .p('末页（next 禁用）：')
              .pagination({ page: '20', total: '20', clk: 'handlePage6' })
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-dropdown',
    title: 'Dropdown 下拉菜单',
    desc: '下拉菜单（支持 ↑ ↓ 键盘导航、Enter 选择、Esc 关闭）',
    build() {
      const b = new TokUIBuilder();
      b.h2('Dropdown 下拉菜单')
        .p('下拉菜单（支持 ↑ ↓ 键盘导航、Enter 选择、Esc 关闭）');

      b.card({ tt: 'Dropdown 下拉菜单' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '基础操作菜单' })
              .p('dropdown 为容器，dd-item 为菜单项，支持 danger 变体标记危险操作：')
              .dropdown({ tt: '操作菜单' })
                .ddItem({ tx: '查看详情', clk: 'handleView' })
                .ddItem({ tx: '编辑', clk: 'handleEdit' })
                .ddItem({ tx: '复制链接', clk: 'handleCopy' })
                .ddItem({ tx: '导出报表', clk: 'handleExport' })
                .ddItem({ tx: '删除', clk: 'handleDelete', v: 'danger' })
              .end()
            .end()
            .card({ tt: '菜单项状态' })
              .p('dd-item 支持 danger 变体和 dis 禁用属性：')
              .dropdown({ tt: '状态演示', v: 'primary' })
                .ddItem({ tx: '正常项（可点击）', clk: 'handleNormal' })
                .ddItem({ tx: '危险项（danger）', clk: 'handleDanger', v: 'danger' })
                .ddItem({ tx: '禁用项（disabled）', dis: true })
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '触发按钮变体' })
              .p('v 属性控制触发按钮样式，支持多种语义色：')
              .dropdown({ tt: '默认按钮' })
                .ddItem({ tx: '选项 A', clk: 'optA' })
                .ddItem({ tx: '选项 B', clk: 'optB' })
              .end()
              .p('')
              .dropdown({ tt: '主要按钮', v: 'primary' })
                .ddItem({ tx: '导出 CSV', clk: 'exportCSV' })
                .ddItem({ tx: '导出 Excel', clk: 'exportExcel' })
              .end()
              .p('')
              .dropdown({ tt: '成功按钮', v: 'success' })
                .ddItem({ tx: '确认通过', clk: 'approve' })
                .ddItem({ tx: '批量通过', clk: 'batchApprove' })
              .end()
              .p('')
              .dropdown({ tt: '警告按钮', v: 'warning' })
                .ddItem({ tx: '标记警告', clk: 'markWarn' })
                .ddItem({ tx: '查看日志', clk: 'viewLog' })
              .end()
              .p('')
              .dropdown({ tt: '危险按钮', v: 'danger' })
                .ddItem({ tx: '删除所有', clk: 'deleteAll' })
                .ddItem({ tx: '清空回收站', clk: 'clearTrash' })
              .end()
              .p('')
              .dropdown({ tt: '幽灵按钮', v: 'ghost' })
                .ddItem({ tx: '更多设置', clk: 'moreSettings' })
                .ddItem({ tx: '快捷键', clk: 'shortcuts' })
              .end()
            .end()
            .card({ tt: '用户菜单场景' })
              .p('模拟实际应用场景中的用户下拉菜单：')
              .dropdown({ tt: 'Admin User', v: 'ghost' })
                .ddItem({ tx: '个人资料', clk: 'openProfile' })
                .ddItem({ tx: '系统设置', clk: 'openSettings' })
                .ddItem({ tx: '数据面板', clk: 'openDashboard' })
                .ddItem({ tx: '帮助中心', clk: 'openHelp' })
                .ddItem({ tx: '退出登录', clk: 'handleLogout', v: 'danger' })
              .end()
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-skeleton',
    title: 'Skeleton 骨架屏',
    desc: 'text/card/avatar/image 多形态占位',
    build() {
      const b = new TokUIBuilder();

      b.card({ tt: 'Text 文本骨架' })
        .p('默认 3 行：')
        .skeleton({ t: 'text' })
        .p('自定义行数 (rows:5)：')
        .skeleton({ t: 'text', rows: '5' })
        .p('自定义宽度 (w:200)：')
        .skeleton({ t: 'text', rows: '2', w: '200px' })
      .end();

      b.card({ tt: 'Card 卡片骨架' })
        .p('模拟带头像的卡片占位：')
        .skeleton({ t: 'card', rows: '3' })
        .p('精简 2 行：')
        .skeleton({ t: 'card', rows: '2' })
      .end();

      b.card({ tt: 'Avatar 头像骨架' })
        .p('圆形头像占位：')
        .skeleton({ t: 'avatar' })
      .end();

      b.card({ tt: 'Image 图片骨架' })
        .p('矩形图片占位：')
        .skeleton({ t: 'image' })
        .p('自定义尺寸 (w,h)：')
        .skeleton({ t: 'image', w: '200px', h: '120px' })
      .end();

      // 综合场景：模拟加载中的用户列表
      b.card({ tt: '综合场景：加载中的用户列表' })
        .row_layout()
          .col_layout({ span: '12' })
            .skeleton({ t: 'card', rows: '2' })
          .end()
          .col_layout({ span: '12' })
            .skeleton({ t: 'text', rows: '3' })
          .end()
        .end()
        .skeleton({ t: 'text', rows: '2' })
        .skeleton({ t: 'text', rows: '4' })
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-switch',
    title: 'Switch 开关',
    desc: '开关组件（支持 aria-checked 无障碍属性）',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '基础开关' })
            .p('未选中与选中状态：')
            .row_layout()
              .col_layout({ span: 6 })
                .switcher({ id: 'swBasic1' })
              .end()
              .col_layout({ span: 6 })
                .switcher({ id: 'swBasic2', chk: true })
              .end()
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '带标签' })
            .p('使用 l 属性添加标签文字：')
            .switcher({ l: '通知推送', id: 'sw1' })
            .p('')
            .switcher({ l: '自动保存', id: 'sw2', chk: true })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '禁用状态' })
            .p('dis 属性禁用交互：')
            .switcher({ l: '已禁用-关', dis: true })
            .p('')
            .switcher({ l: '已禁用-开', chk: true, dis: true })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '尺寸变体' })
            .p('v 属性控制大小（sm / 默认 / lg）：')
            .row_layout()
              .col_layout({ span: 4 })
                .p('sm')
                .switcher({ v: 'sm', id: 'swSizeSm' })
              .end()
              .col_layout({ span: 4 })
                .p('默认')
                .switcher({ id: 'swSizeDefault' })
              .end()
              .col_layout({ span: 4 })
                .p('lg')
                .switcher({ v: 'lg', id: 'swSizeLg' })
              .end()
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '事件绑定' })
            .p('clk 属性绑定点击事件处理器：')
            .switcher({ l: '接收通知', id: 'swEvt1', clk: 'handleSwitch' })
            .p('')
            .switcher({ l: '深色模式', id: 'swEvt2', clk: 'handleSwitch2', chk: true })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '表单内使用' })
            .p('开关作为表单控件的一部分：')
            .form({ id: 'switchForm', sub: 'handleSwitchForm' })
              .input({ t: 'text', l: '用户名', ph: '请输入用户名', id: 'swFormUser' })
              .switcher({ l: '启用通知', id: 'swFormNotify', chk: true })
              .select({ l: '通知频率', id: 'swFormFreq' })
                .opt({ v: 'realtime', tx: '实时' })
                .opt({ v: 'daily', tx: '每日汇总' })
                .opt({ v: 'weekly', tx: '每周汇总' })
              .end()
              .btn({ tx: '保存设置', t: 'submit', clk: 'handleSwitchForm' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '动态更新' })
            .p('通过 upd 指令动态切换开关状态：')
            .switcher({ l: '动态开关', id: 'swUpd' })
          .end()
        .end()
      .end();

      return b;
    },
    extraChunks() {
      const chunks = [];
      chunks.push({ _wait: 2000 });
      const b1 = new TokUIBuilder();
      b1.upd({ id: 'swUpd', chk: true });
      chunks.push(...b1.toChunks());
      chunks.push({ _wait: 2000 });
      const b2 = new TokUIBuilder();
      b2.upd({ id: 'swUpd', chk: 'false' });
      chunks.push(...b2.toChunks());
      return chunks;
    }
  },
  {
    trigger: 'demo-toggle',
    title: 'Toggle 切换按钮',
    desc: 'Toggle/Toggle Group 单选/多选切换按钮',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '单个 Toggle' })
            .p('独立的切换按钮：')
            .toggle({ tx: '粗体', clk: 'onBold' })
            .toggle({ tx: '斜体', clk: 'onItalic', chk: true })
            .toggle({ tx: '下划线', clk: 'onUnderline' })
            .p('')
            .p('禁用状态：')
            .toggle({ tx: '已禁用', dis: true })
            .toggle({ tx: '已选中禁用', chk: true, dis: true })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '尺寸变体' })
            .toggle({ tx: 'Small', s: 'sm' })
            .toggle({ tx: 'Default' })
            .toggle({ tx: 'Large', s: 'lg' })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: 'Toggle Group — 单选' })
            .p('点击切换，同组互斥：')
            .toggleGroup({ clk: 'onAlign' })
              .toggle({ tx: '左对齐', clk: 'alignLeft' })
              .toggle({ tx: '居中', clk: 'alignCenter', chk: true })
              .toggle({ tx: '右对齐', clk: 'alignRight' })
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: 'Toggle Group — 多选' })
            .p('multi 模式，各按钮独立：')
            .toggleGroup({ clk: 'onFormat', multi: true })
              .toggle({ tx: 'B', clk: 'bold' })
              .toggle({ tx: 'I', clk: 'italic', chk: true })
              .toggle({ tx: 'U', clk: 'underline' })
              .toggle({ tx: 'S', clk: 'strike' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: 'Toggle Group 尺寸' })
            .p('小号：')
            .toggleGroup({ s: 'sm' })
              .toggle({ tx: 'A' })
              .toggle({ tx: 'B', chk: true })
              .toggle({ tx: 'C' })
            .end()
            .p('大号：')
            .toggleGroup({ s: 'lg' })
              .toggle({ tx: 'X' })
              .toggle({ tx: 'Y' })
              .toggle({ tx: 'Z', chk: true })
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-drawer',
    title: 'Drawer 抽屉',
    desc: '四个方向、自定义宽度、表单内容与嵌套组件',
    build() {
      const b = new TokUIBuilder();

      // 1. 基础右侧抽屉
      b.card({ tt: '基础右侧抽屉' })
        .btn({ tx: '打开右侧抽屉', clk: 'openDrawer', 'data-drawer-id': 'drawer1' })
        .drawer({ tt: '设置面板', id: 'drawer1', pos: 'right', w: '360px' })
          .p('这是一个右侧抽屉面板，适用于设置、详情等场景。')
          .input({ t: 'text', l: '名称', ph: '请输入名称', id: 'd1Name' })
          .input({ t: 'email', l: '邮箱', ph: '请输入邮箱', id: 'd1Email' })
          .p('')
          .btn({ tx: '关闭', clk: 'closeDrawer', 'data-drawer-id': 'drawer1' })
        .end()
      .end();

      // 2. 左侧抽屉
      b.card({ tt: '左侧抽屉' })
        .btn({ tx: '打开左侧抽屉', clk: 'openDrawer', 'data-drawer-id': 'drawer2' })
        .drawer({ tt: '导航菜单', id: 'drawer2', pos: 'left', w: '280px' })
          .list({ t: 'ul' })
            .item('首页')
            .item('产品中心')
            .item('解决方案')
            .item('技术文档')
            .item('关于我们')
          .end()
        .end()
      .end();

      // 3. 顶部抽屉
      b.card({ tt: '顶部抽屉' })
        .btn({ tx: '打开顶部抽屉', clk: 'openDrawer', 'data-drawer-id': 'drawer3' })
        .drawer({ tt: '系统通知', id: 'drawer3', pos: 'top', w: '100%' })
          .p('您有 3 条新消息：')
          .p('1. 系统将于今晚 22:00 进行维护')
          .p('2. 新版本 v2.0 已发布')
          .p('3. 您的订单已发货')
        .end()
      .end();

      // 4. 底部抽屉
      b.card({ tt: '底部抽屉' })
        .btn({ tx: '打开底部抽屉', clk: 'openDrawer', 'data-drawer-id': 'drawer4' })
        .drawer({ tt: '快捷操作', id: 'drawer4', pos: 'bottom', w: '100%' })
          .p('常用操作：')
          .row_layout()
            .col_layout({ span: 4 })
              .btn({ tx: '新建', clk: 'handleNew', v: 'primary' })
            .end()
            .col_layout({ span: 4 })
              .btn({ tx: '导入', clk: 'handleImport' })
            .end()
            .col_layout({ span: 4 })
              .btn({ tx: '导出', clk: 'handleExport' })
            .end()
          .end()
        .end()
      .end();

      // 5. 自定义宽度
      b.card({ tt: '自定义宽度' })
        .btn({ tx: '打开宽抽屉', clk: 'openDrawer', 'data-drawer-id': 'drawer5' })
        .drawer({ tt: '详细信息', id: 'drawer5', pos: 'right', w: '500px' })
          .p('这是一个较宽的抽屉面板，可以容纳更多内容。')
          .p('适用于需要展示大量信息的场景，如数据详情、日志查看等。')
          .h4('数据概览')
          .p('总用户数：12,345')
          .p('活跃用户：8,901')
          .p('今日新增：234')
        .end()
      .end();

      // 6. 带表单内容
      b.card({ tt: '带表单内容' })
        .btn({ tx: '打开表单抽屉', clk: 'openDrawer', 'data-drawer-id': 'drawer6' })
        .drawer({ tt: '编辑用户', id: 'drawer6', pos: 'right', w: '400px' })
          .form({ id: 'drawerForm', sub: 'handleDrawerForm' })
            .input({ t: 'text', l: '姓名', ph: '请输入姓名', id: 'dfName', req: true })
            .input({ t: 'email', l: '邮箱', ph: '请输入邮箱', id: 'dfEmail', req: true })
            .select({ l: '部门', id: 'dfDept' })
              .opt({ v: 'tech', tx: '技术部' })
              .opt({ v: 'market', tx: '市场部' })
              .opt({ v: 'design', tx: '设计部' })
            .end()
            .switcher({ l: '启用账户', id: 'dfActive', chk: true })
            .p('')
            .btn({ tx: '提交', t: 'submit', clk: 'handleDrawerForm', v: 'primary' })
            .btn({ tx: '取消', clk: 'closeDrawer', 'data-drawer-id': 'drawer6' })
          .end()
        .end()
      .end();

      // 7. 嵌套组件
      b.card({ tt: '嵌套组件' })
        .btn({ tx: '打开嵌套抽屉', clk: 'openDrawer', 'data-drawer-id': 'drawer7' })
        .drawer({ tt: '用户详情', id: 'drawer7', pos: 'right', w: '420px' })
          .tabs()
            .tab({ tt: '基本信息' })
              .p('姓名：张三')
              .p('职位：高级工程师')
              .p('部门：技术部')
            .end()
            .tab({ tt: '项目经历' })
              .list({ t: 'ul' })
                .item('TokUI 框架开发')
                .item('数据平台建设')
                .item('移动端 App 开发')
              .end()
            .end()
            .tab({ tt: '技能标签' })
              .p('JavaScript / TypeScript / React / Node.js')
              .p('CSS / HTML / Webpack / Vite')
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-breadcrumb',
    title: 'Breadcrumb 面包屑',
    desc: '基础面包屑、自定义分隔符、箭头风格、长路径及点击事件',
    build() {
      const b = new TokUIBuilder();

      // 1. 基础面包屑
      b.card({ tt: '基础面包屑' })
        .p('默认斜杠分隔符：')
        .breadcrumb({ items: '首页,产品中心,产品详情' })
      .end();

      // 2. 自定义分隔符
      b.card({ tt: '自定义分隔符' })
        .p('竖线分隔符：')
        .breadcrumb({ items: '首页,用户管理,角色列表', sep: '|' })
        .p('大于号分隔符：')
        .breadcrumb({ items: '首页,系统设置,基本配置', sep: '>' })
        .p('短横线分隔符：')
        .breadcrumb({ items: '首页,数据管理,报表中心', sep: '-' })
      .end();

      // 3. 箭头风格
      b.card({ tt: '箭头风格' })
        .p('v:arrow 使用箭头图标分隔：')
        .breadcrumb({ items: '首页,系统设置,用户管理,角色配置', v: 'arrow' })
      .end();

      // 4. 长路径
      b.card({ tt: '长路径' })
        .p('支持多层级路径导航：')
        .breadcrumb({ items: '首页,产品中心,电子产品,手机,智能手机,旗舰机型,详情' })
      .end();

      // 5. 点击事件
      b.card({ tt: '点击事件' })
        .p('clk 属性绑定面包屑点击事件：')
        .breadcrumb({ items: '首页,数据管理,用户列表', clk: 'handleBreadcrumb' })
      .end();

      // 6. 卡片内使用
      b.card({ tt: '卡片内使用' })
        .breadcrumb({ items: '首页,控制台,系统监控' })
        .hr()
        .h4('系统监控面板')
        .p('服务器状态：运行中')
        .p('CPU 使用率：45%')
        .p('内存使用率：62%')
        .p('磁盘使用率：38%')
      .end();

      return b;
    }
  },
  // ============================
  // Slider 滑块
  // ============================
  {
    trigger: 'demo-slider',
    title: 'Slider 滑块',
    desc: '数值选择、范围步长、标签、禁用、尺寸变体、事件绑定',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '基础滑块' })
            .p('默认范围 0~100，初始值 0。')
            .slider({ id: 's1', min: 0, max: 100, v: 0 })
            .hr()
            .p('带初始值 60。')
            .slider({ id: 's2', min: 0, max: 100, v: 60 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '自定义范围与步长' })
            .p('范围 0~10，步长 0.1，初始值 3.5。')
            .slider({ id: 's3', min: 0, max: 10, step: 0.1, v: 3.5 })
            .hr()
            .p('范围 100~200，步长 5，初始值 150。')
            .slider({ id: 's4', min: 100, max: 200, step: 5, v: 150 })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '带标签' })
            .slider({ id: 's5', l: '音量', min: 0, max: 100, v: 60 })
            .slider({ id: 's6', l: '亮度', min: 0, max: 100, v: 80 })
            .slider({ id: 's7', l: '对比度', min: -100, max: 100, v: 0 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '禁用状态' })
            .p('设置 dis 属性禁用滑块。')
            .slider({ id: 's8', l: '已禁用', min: 0, max: 100, v: 42, dis: true })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '尺寸变体' })
            .p('通过 v:sm/lg 设置尺寸。')
            .slider({ id: 's9', l: '小号 (sm)', min: 0, max: 100, v: 30, v: 'sm' })
            .slider({ id: 's10', l: '默认', min: 0, max: 100, v: 50 })
            .slider({ id: 's11', l: '大号 (lg)', min: 0, max: 100, v: 70, v: 'lg' })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '事件绑定' })
            .p('拖拽释放后触发 clk 事件。')
            .slider({ id: 'sliderEvt', l: '拖拽试试', min: 0, max: 100, v: 25, clk: 'handleSlider' })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '表单内使用' })
            .p('Slider 可与其他表单组件组合使用。')
            .form({ id: 'sliderForm' })
              .slider({ id: 'sf1', l: '价格范围', min: 0, max: 1000, step: 10, v: 200, n: 'price' })
              .slider({ id: 'sf2', l: '数量', min: 1, max: 50, v: 5, n: 'qty' })
              .btn({ tx: '提交', t: 'submit', clk: 'handleSlider2' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 12 })
          .card({ tt: '在表格中使用' })
            .p('表格单元格内嵌 Slider，拖拽可直接调整任务进度：')
            .table({ stripe: true })
              .text('[thead cols:任务,进度,状态]')
              .text('[tbody]')
              .text('[tr "需求分析,[slider id:sliderTask1 min:0 max:100 v:30],进行中"]')
              .text('[tr "UI 设计,[slider id:sliderTask2 min:0 max:100 v:65],进行中"]')
              .text('[tr "后端开发,[slider id:sliderTask3 min:0 max:100 v:80],进行中"]')
              .text('[tr "测试验收,[slider id:sliderTask4 min:0 max:100 v:10],待开始"]')
              .text('[/tbody]')
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  // ============================
  // Rate 评分
  // ============================
  {
    trigger: 'demo-rate',
    title: 'Rate 评分',
    desc: '星级评分、自定义星数、字符、禁用、尺寸、事件绑定',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '基础评分' })
            .p('默认 5 星，点击选择，再次点击取消。')
            .rate({ id: 'r1' })
            .hr()
            .p('初始值 3。')
            .rate({ id: 'r2', v: 3 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '带标签' })
            .rate({ id: 'r3', l: '满意度', v: 4 })
            .rate({ id: 'r4', l: '推荐度', v: 2 })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '自定义星数' })
            .p('max:10 表示 10 颗星。')
            .rate({ id: 'r5', max: 10, v: 7 })
            .hr()
            .p('3 颗星。')
            .rate({ id: 'r6', max: 3, v: 1 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '禁用/只读' })
            .p('dis 属性禁用交互。')
            .rate({ id: 'r7', l: '只读展示', v: 4, dis: true })
            .rate({ id: 'r8', l: '零分禁用', dis: true })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '尺寸变体' })
            .rate({ id: 'r9', l: '小号 (sm)', v: 3, v: 'sm' })
            .rate({ id: 'r10', l: '默认', v: 3 })
            .rate({ id: 'r11', l: '大号 (lg)', v: 3, v: 'lg' })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '事件绑定' })
            .p('点击星星触发 clk 事件。')
            .rate({ id: 'rateEvt', l: '请评分', clk: 'handleRate' })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '自定义字符' })
            .p('通过 tx 属性使用自定义字符。')
            .rate({ id: 'r12', l: '爱心评分', tx: '♥', max: 5, v: 3 })
            .rate({ id: 'r13', l: '火焰评分', tx: '🔥', max: 5, v: 4 })
          .end()
        .end()
      .end();

      return b;
    }
  },
  // ============================
  // Transfer 穿梭框
  // ============================
  {
    trigger: 'demo-transfer',
    title: 'Transfer 穿梭框',
    desc: '双列表选择、自定义标题、预选项、大数据量、事件绑定',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '基础穿梭框' })
            .p('勾选项目后点击方向按钮进行移动。')
            .transfer({ id: 't1', tt: '可选项目', tt2: '已选项目' })
              .opt({ v: 'item1', tx: '项目管理' })
              .opt({ v: 'item2', tx: '用户管理' })
              .opt({ v: 'item3', tx: '角色权限' })
              .opt({ v: 'item4', tx: '系统设置' })
              .opt({ v: 'item5', tx: '日志审计' })
              .opt({ v: 'item6', tx: '数据备份' })
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '带标签' })
            .transfer({ id: 't2', l: '权限分配', tt: '可分配权限', tt2: '已拥有权限' })
              .opt({ v: 'read', tx: '查看' })
              .opt({ v: 'write', tx: '编辑' })
              .opt({ v: 'delete', tx: '删除' })
              .opt({ v: 'export', tx: '导出' })
              .opt({ v: 'admin', tx: '管理' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '预选项' })
            .p('chk 属性标记默认选入右侧的项目。')
            .transfer({ id: 't3', tt: '未分配', tt2: '已分配' })
              .opt({ v: 'js', tx: 'JavaScript' })
              .opt({ v: 'ts', tx: 'TypeScript', chk: true })
              .opt({ v: 'py', tx: 'Python' })
              .opt({ v: 'go', tx: 'Go', chk: true })
              .opt({ v: 'rs', tx: 'Rust' })
              .opt({ v: 'java', tx: 'Java', chk: true })
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '大数据量' })
            .p('10+ 项穿梭框。')
            .transfer({ id: 't4', tt: '候选人', tt2: '已入选' })
              .opt({ v: 'c1', tx: 'Alice - 前端开发' })
              .opt({ v: 'c2', tx: 'Bob - 后端开发', chk: true })
              .opt({ v: 'c3', tx: 'Charlie - 全栈开发' })
              .opt({ v: 'c4', tx: 'Diana - UI设计' })
              .opt({ v: 'c5', tx: 'Eve - 产品经理' })
              .opt({ v: 'c6', tx: 'Frank - 数据分析' })
              .opt({ v: 'c7', tx: 'Grace - 测试工程师' })
              .opt({ v: 'c8', tx: 'Henry - 运维工程师', chk: true })
              .opt({ v: 'c9', tx: 'Ivy - 安全工程师' })
              .opt({ v: 'c10', tx: 'Jack - 架构师' })
              .opt({ v: 'c11', tx: 'Karen - 技术文档' })
              .opt({ v: 'c12', tx: 'Leo - DevOps' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '事件绑定' })
            .p('移动项目后触发 clk 事件。')
            .transfer({ id: 'transferEvt', tt: '可选', tt2: '已选', clk: 'handleTransfer' })
              .opt({ v: 'a1', tx: '选项 A' })
              .opt({ v: 'a2', tx: '选项 B' })
              .opt({ v: 'a3', tx: '选项 C' })
              .opt({ v: 'a4', tx: '选项 D' })
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '表单内使用' })
            .form({ id: 'transferForm' })
              .transfer({ id: 'tf1', l: '选择标签', tt: '可用标签', tt2: '已选标签', n: 'tags' })
                .opt({ v: 'tag1', tx: '科技' })
                .opt({ v: 'tag2', tx: '生活' })
                .opt({ v: 'tag3', tx: '娱乐' })
                .opt({ v: 'tag4', tx: '教育' })
              .end()
              .btn({ tx: '提交选择', t: 'submit', clk: 'handleTransfer' })
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-cascader',
    title: 'Cascader 级联选择',
    desc: '三级联动、预选值、禁用、事件绑定及表单内使用',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '基础级联选择' })
            .p('三级省市区级联，使用 p 属性指定父级：')
            .cascader({ id: 'cBasic', ph: '请选择地区' })
              .opt({ v: 'zhejiang', tx: '浙江省' })
              .opt({ v: 'jiangsu', tx: '江苏省' })
              .opt({ v: 'guangdong', tx: '广东省' })
              .opt({ v: 'hangzhou', tx: '杭州市', p: 'zhejiang' })
              .opt({ v: 'ningbo', tx: '宁波市', p: 'zhejiang' })
              .opt({ v: 'nanjing', tx: '南京市', p: 'jiangsu' })
              .opt({ v: 'suzhou', tx: '苏州市', p: 'jiangsu' })
              .opt({ v: 'guangzhou', tx: '广州市', p: 'guangdong' })
              .opt({ v: 'shenzhen', tx: '深圳市', p: 'guangdong' })
              .opt({ v: 'xihu', tx: '西湖区', p: 'hangzhou' })
              .opt({ v: 'binjiang', tx: '滨江区', p: 'hangzhou' })
              .opt({ v: 'xuanwu', tx: '玄武区', p: 'nanjing' })
              .opt({ v: 'gusu', tx: '姑苏区', p: 'suzhou' })
              .opt({ v: 'tianhe', tx: '天河区', p: 'guangzhou' })
              .opt({ v: 'nanshan', tx: '南山区', p: 'shenzhen' })
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '带标签和占位文字' })
            .p('l 属性添加标签，ph 属性自定义占位文字：')
            .cascader({ id: 'cLabel', l: '收货地区', ph: '请选择省/市/区' })
              .opt({ v: 'beijing', tx: '北京市' })
              .opt({ v: 'shanghai', tx: '上海市' })
              .opt({ v: 'haidian', tx: '海淀区', p: 'beijing' })
              .opt({ v: 'chaoyang', tx: '朝阳区', p: 'beijing' })
              .opt({ v: 'pudong', tx: '浦东新区', p: 'shanghai' })
              .opt({ v: 'jingan', tx: '静安区', p: 'shanghai' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '预选值' })
            .p('v 属性设置初始选中路径（斜杠分隔）：')
            .cascader({ id: 'cPre', l: '默认选中', v: 'zhejiang/hangzhou/xihu', ph: '请选择' })
              .opt({ v: 'zhejiang', tx: '浙江省' })
              .opt({ v: 'jiangsu', tx: '江苏省' })
              .opt({ v: 'hangzhou', tx: '杭州市', p: 'zhejiang' })
              .opt({ v: 'ningbo', tx: '宁波市', p: 'zhejiang' })
              .opt({ v: 'xihu', tx: '西湖区', p: 'hangzhou' })
              .opt({ v: 'binjiang', tx: '滨江区', p: 'hangzhou' })
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '禁用状态' })
            .p('dis 属性禁用级联选择：')
            .cascader({ id: 'cDis', l: '已禁用', dis: true, ph: '不可选择' })
              .opt({ v: 'a', tx: '选项A' })
              .opt({ v: 'a1', tx: '子项A1', p: 'a' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '事件绑定' })
            .p('clk 属性绑定选中事件：')
            .cascader({ id: 'cEvt', l: '选择地区', clk: 'handleCascader', ph: '点击选择' })
              .opt({ v: 'zhejiang', tx: '浙江省' })
              .opt({ v: 'jiangsu', tx: '江苏省' })
              .opt({ v: 'hangzhou', tx: '杭州市', p: 'zhejiang' })
              .opt({ v: 'xihu', tx: '西湖区', p: 'hangzhou' })
              .opt({ v: 'nanjing', tx: '南京市', p: 'jiangsu' })
              .opt({ v: 'xuanwu', tx: '玄武区', p: 'nanjing' })
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '两级分类选择' })
            .p('不限定三级，支持任意层级：')
            .cascader({ id: 'cCat', l: '商品分类', ph: '选择分类' })
              .opt({ v: 'electronics', tx: '电子产品' })
              .opt({ v: 'clothing', tx: '服装' })
              .opt({ v: 'food', tx: '食品' })
              .opt({ v: 'phone', tx: '手机', p: 'electronics' })
              .opt({ v: 'laptop', tx: '笔记本', p: 'electronics' })
              .opt({ v: 'men', tx: '男装', p: 'clothing' })
              .opt({ v: 'women', tx: '女装', p: 'clothing' })
              .opt({ v: 'snack', tx: '零食', p: 'food' })
              .opt({ v: 'drink', tx: '饮料', p: 'food' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '表单内使用' })
            .p('级联选择作为表单控件，选中后触发事件：')
            .form({ id: 'cascaderForm', sub: 'handleCascaderForm' })
              .input({ t: 'text', l: '姓名', ph: '请输入姓名', id: 'cFormName' })
              .cascader({ l: '所在地区', id: 'cFormRegion', ph: '请选择', clk: 'handleCascader' })
                .opt({ v: 'zhejiang', tx: '浙江省' })
                .opt({ v: 'jiangsu', tx: '江苏省' })
                .opt({ v: 'hangzhou', tx: '杭州市', p: 'zhejiang' })
                .opt({ v: 'xihu', tx: '西湖区', p: 'hangzhou' })
                .opt({ v: 'nanjing', tx: '南京市', p: 'jiangsu' })
              .end()
              .btn({ tx: '提交', t: 'submit' })
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-upload',
    title: 'Upload 文件上传',
    desc: '单文件/多文件/类型过滤/拖拽上传',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '基础上传' })
            .p('点击或拖拽文件到区域上传：')
            .upload({ id: 'uBasic', ph: '点击或拖拽文件至此处上传' })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '多文件上传' })
            .p('multi 属性允许多文件选择：')
            .upload({ id: 'uMulti', ph: '可同时选择多个文件', multi: true })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '文件类型过滤' })
            .p('accept 属性限制文件类型：')
            .upload({ id: 'uAccept', ph: '仅允许选择图片文件', accept: 'image/*' })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '禁用状态' })
            .p('dis 属性禁用上传：')
            .upload({ id: 'uDis', ph: '已禁用上传', dis: true })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '带标签和提示文字' })
            .p('l 属性添加标签：')
            .upload({ id: 'uLabel', l: '附件', ph: '支持 jpg、png、pdf 格式' })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '事件绑定' })
            .p('clk 属性绑定文件选择事件：')
            .upload({ id: 'uEvt', l: '上传文件', clk: 'handleUpload', multi: true })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '最大文件数限制' })
            .p('max 属性限制最多上传文件数：')
            .upload({ id: 'uMax', l: '附件（最多3个）', multi: true, max: 3, ph: '最多选择 3 个文件' })
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-tree',
    title: 'Tree 树形控件',
    desc: '目录树、复选框、展开折叠、事件绑定',
    build() {
      const b = new TokUIBuilder();

      // 1. 基础目录树
      b.card({ tt: '基础目录树' })
        .p('点击箭头展开/折叠节点，点击文字选中：')
        .tree({ id: 'tBasic' })
          .tn({ v: 'src', tx: 'src' })
            .tn({ v: 'components', tx: 'components' })
              .tn({ v: 'basic.js', tx: 'basic.js', leaf: true })
              .tn({ v: 'form.js', tx: 'form.js', leaf: true })
              .tn({ v: 'layout.js', tx: 'layout.js', leaf: true })
            .end()
            .tn({ v: 'core', tx: 'core' })
              .tn({ v: 'parser.js', tx: 'parser.js', leaf: true })
              .tn({ v: 'renderer.js', tx: 'renderer.js', leaf: true })
            .end()
          .end()
          .tn({ v: 'tests', tx: 'tests' })
            .tn({ v: 'test-parser.js', tx: 'test-parser.js', leaf: true })
          .end()
          .tn({ v: 'demo', tx: 'demo' })
            .tn({ v: 'demo.js', tx: 'demo.js', leaf: true })
            .tn({ v: 'index.html', tx: 'index.html', leaf: true })
          .end()
          .tn({ v: 'package.json', tx: 'package.json', leaf: true })
        .end()
      .end();

      // 2. 复选框模式
      b.card({ tt: '复选框模式' })
        .p('chk 属性启用复选框，支持父子联动：')
        .tree({ id: 'tChk', chk: true })
          .tn({ v: 'frontend', tx: '前端' })
            .tn({ v: 'react', tx: 'React', leaf: true, chk: true })
            .tn({ v: 'vue', tx: 'Vue', leaf: true })
            .tn({ v: 'angular', tx: 'Angular', leaf: true })
          .end()
          .tn({ v: 'backend', tx: '后端' })
            .tn({ v: 'node', tx: 'Node.js', leaf: true })
            .tn({ v: 'python', tx: 'Python', leaf: true, chk: true })
            .tn({ v: 'go', tx: 'Go', leaf: true })
          .end()
        .end()
      .end();

      // 3. 默认展开
      b.card({ tt: '默认展开' })
        .p('open 属性设置节点初始展开：')
        .tree({ id: 'tOpen' })
          .tn({ v: 'project', tx: '我的项目', open: true })
            .tn({ v: 'docs', tx: '文档', open: true })
              .tn({ v: 'readme.md', tx: 'README.md', leaf: true })
              .tn({ v: 'guide.md', tx: '使用指南.md', leaf: true })
            .end()
            .tn({ v: 'src', tx: '源码' })
              .tn({ v: 'index.js', tx: 'index.js', leaf: true })
            .end()
          .end()
        .end()
      .end();

      // 4. 禁用节点
      b.card({ tt: '禁用节点' })
        .p('dis 属性禁用特定节点：')
        .tree({ id: 'tDis' })
          .tn({ v: 'public', tx: '公开资源' })
            .tn({ v: 'doc.pdf', tx: '文档.pdf', leaf: true })
          .end()
          .tn({ v: 'private', tx: '私有资源（禁用）', dis: true })
            .tn({ v: 'secret.doc', tx: '机密.doc', leaf: true })
          .end()
        .end()
      .end();

      // 5. 事件绑定
      b.card({ tt: '事件绑定' })
        .p('clk 属性绑定节点点击事件：')
        .tree({ id: 'tEvt', clk: 'handleTree' })
          .tn({ v: 'animals', tx: '动物' })
            .tn({ v: 'cat', tx: '猫', leaf: true })
            .tn({ v: 'dog', tx: '狗', leaf: true })
          .end()
          .tn({ v: 'plants', tx: '植物' })
            .tn({ v: 'rose', tx: '玫瑰', leaf: true })
            .tn({ v: 'sunflower', tx: '向日葵', leaf: true })
          .end()
        .end()
      .end();

      // 6. 组织架构
      b.card({ tt: '组织架构' })
        .p('树形展示组织结构：')
        .tree({ id: 'tOrg' })
          .tn({ v: 'ceo', tx: '总经理' })
            .tn({ v: 'cto', tx: '技术总监' })
              .tn({ v: 'fe', tx: '前端组', leaf: true })
              .tn({ v: 'be', tx: '后端组', leaf: true })
              .tn({ v: 'qa', tx: '测试组', leaf: true })
            .end()
            .tn({ v: 'cfo', tx: '财务总监' })
              .tn({ v: 'acc', tx: '会计组', leaf: true })
              .tn({ v: 'audit', tx: '审计组', leaf: true })
            .end()
            .tn({ v: 'coo', tx: '运营总监' })
              .tn({ v: 'mkt', tx: '市场部', leaf: true })
              .tn({ v: 'sales', tx: '销售部', leaf: true })
            .end()
          .end()
        .end()
      .end();

      // 7. 深层嵌套
      b.card({ tt: '深层嵌套' })
        .p('支持任意层级嵌套：')
        .tree({ id: 'tDeep' })
          .tn({ v: 'l1', tx: '第一层', open: true })
            .tn({ v: 'l2', tx: '第二层', open: true })
              .tn({ v: 'l3', tx: '第三层', open: true })
                .tn({ v: 'l4', tx: '第四层' })
                  .tn({ v: 'l5', tx: '第五层', leaf: true })
                .end()
              .end()
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-empty',
    title: 'Empty 空状态',
    desc: '空数据占位、自定义图标',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Empty 空状态组件' })
        .h3('默认空状态')
        .p('无数据时的占位提示：')
        .empty({ tx: '暂无数据' })
        .h3('不同图标类型')
        .row_layout()
          .col_layout({ span: 3 })
            .p('默认')
            .empty({ tx: '暂无内容' })
          .end()
          .col_layout({ span: 3 })
            .p('盒子')
            .empty({ icon: 'box', tx: '空空如也' })
          .end()
          .col_layout({ span: 3 })
            .p('文件夹')
            .empty({ icon: 'folder', tx: '文件夹为空' })
          .end()
          .col_layout({ span: 3 })
            .p('搜索')
            .empty({ icon: 'search', tx: '未找到结果' })
          .end()
        .end()
        .h3('在卡片中使用')
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '用户列表' })
              .empty({ icon: 'box', tx: '暂无用户' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '搜索结果' })
              .empty({ icon: 'search', tx: '没有匹配的结果' })
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-result',
    title: 'Result 结果页',
    desc: '操作成功/失败/警告/提示',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Result 结果页组件' })
        .h3('四种状态')
        .row_layout()
          .col_layout({ span: 6 })
            .result({ t: 'success', tt: '提交成功', tx: '您的订单已提交，预计 2-3 个工作日送达' })
          .end()
          .col_layout({ span: 6 })
            .result({ t: 'error', tt: '提交失败', tx: '网络异常，请检查连接后重试' })
          .end()
        .end()
        .dv({})
        .row_layout()
          .col_layout({ span: 6 })
            .result({ t: 'warning', tt: '警告提示', tx: '您的账户余额不足，请及时充值' })
          .end()
          .col_layout({ span: 6 })
            .result({ t: 'info', tt: '信息提示', tx: '系统将于今晚 22:00 进行维护升级' })
          .end()
        .end()
        .h3('在卡片中使用')
        .card({ tt: '支付结果' })
          .result({ t: 'success', tt: '支付成功', tx: '金额 ¥299.00 已从您的账户扣除' })
          .btn({ t: 'primary', tx: '查看订单', clk: 'toast:查看订单详情' })
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-stat',
    title: 'Stat 统计数值',
    desc: '数据展示、趋势指示、数值滚动动画',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Stat 统计数值组件' })
        .h3('基础统计（直接渲染最终值）')
        .p('不带 anim 属性，值直接显示：')
        .row_layout()
          .col_layout({ span: 3 })
            .stat({ tt: '总用户数', v: '12,846' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '总收入', v: '¥89,240', pre: '¥' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '转化率', v: '68.5%', suf: '%' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '在线用户', v: '1,024' })
          .end()
        .end()
        .h3('数值滚动动画（anim 毫秒）')
        .p('带 anim 属性，数值从 0 滚动到目标值：')
        .row_layout()
          .col_layout({ span: 3 })
            .stat({ tt: '总用户数', v: '12846', anim: '2000' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '日活跃', v: '3482', trend: 'up', anim: '1500' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '退款率', v: '2.1', suf: '%', trend: 'down', anim: '1800', dec: '1' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '订单量', v: '386', trend: 'up', anim: '1200' })
          .end()
        .end()
        .h3('不同动画速度')
        .row_layout()
          .col_layout({ span: 3 })
            .stat({ tt: '0.8s', v: '9999', anim: '800' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '1.5s', v: '88888', anim: '1500' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '3s', v: '666666', anim: '3000' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '5s 长动画', v: '1284635', anim: '5000' })
          .end()
        .end()
        .h3('带趋势')
        .row_layout()
          .col_layout({ span: 3 })
            .stat({ tt: '日活跃', v: '3,482', trend: 'up' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '退款率', v: '2.1%', trend: 'down' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '新增用户', v: '256', trend: 'up' })
          .end()
          .col_layout({ span: 3 })
            .stat({ tt: '投诉数', v: '12', trend: 'down' })
          .end()
        .end()
        .h3('仪表盘场景（动画版）')
        .card({ tt: '今日数据概览' })
          .row_layout()
            .col_layout({ span: 4 })
              .stat({ tt: '销售额', v: '28650', pre: '¥', trend: 'up', anim: '2000' })
            .end()
            .col_layout({ span: 4 })
              .stat({ tt: '订单量', v: '386', trend: 'up', anim: '1800' })
            .end()
            .col_layout({ span: 4 })
              .stat({ tt: '退货率', v: '1.8', suf: '%', trend: 'down', anim: '1500', dec: '1' })
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-desc',
    title: 'Desc 描述列表',
    desc: '键值对详情展示',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Desc 描述列表组件' })
        .h3('基础描述列表')
        .p('用键值对展示详细信息：')
        .desc({ cols: 3 })
          .descItem({ l: '用户名', tx: '张三' })
          .descItem({ l: '手机号', tx: '138****8888' })
          .descItem({ l: '邮箱', tx: 'zhangsan@example.com' })
          .descItem({ l: '部门', tx: '技术部' })
          .descItem({ l: '职位', tx: '高级工程师' })
          .descItem({ l: '状态', tx: '在职' })
        .end()
        .h3('带边框')
        .desc({ cols: 2, bordered: true })
          .descItem({ l: '订单编号', tx: 'ORD-2024-0086' })
          .descItem({ l: '创建时间', tx: '2024-12-15 14:30' })
          .descItem({ l: '商品名称', tx: 'MacBook Pro 16 M3 Max' })
          .descItem({ l: '金额', tx: '¥27,999.00' })
          .descItem({ l: '支付方式', tx: '支付宝' })
          .descItem({ l: '物流状态', tx: '已发货' })
        .end()
        .h3('斑马纹')
        .desc({ cols: 2, stripe: true })
          .descItem({ l: '项目名称', tx: 'TokUI' })
          .descItem({ l: '版本', tx: '1.0.0' })
          .descItem({ l: '许可证', tx: 'MIT' })
          .descItem({ l: '语言', tx: 'JavaScript' })
        .end()
        .h3('单列详情')
        .desc({ cols: 1, bordered: true })
          .descItem({ l: '产品描述', tx: 'TokUI 是一个零依赖的流式 UI 描述与渲染框架，适用于 AI 对话中的流式 UI 生成场景' })
          .descItem({ l: '核心特性', tx: 'DSL 描述、流式解析、主题切换、事件系统' })
        .end()
        .h3('水平布局（label和value左右排列）')
        .desc({ cols: 1, v: 'horizontal', bordered: true })
          .descItem({ l: '用户名', tx: '张三' })
          .descItem({ l: '手机号', tx: '138****8888' })
          .descItem({ l: '邮箱', tx: 'zhangsan@example.com' })
          .descItem({ l: '部门', tx: '技术部' })
          .descItem({ l: '职位', tx: '高级工程师' })
          .descItem({ l: '入职日期', tx: '2022-03-15' })
        .end()
        .h3('水平布局 + 自定义label宽度')
        .desc({ cols: 2, v: 'horizontal', bordered: true, lw: '80px' })
          .descItem({ l: '订单号', tx: 'ORD-2024-0086' })
          .descItem({ l: '金额', tx: '¥27,999' })
          .descItem({ l: '状态', tx: '已发货' })
          .descItem({ l: '支付', tx: '支付宝' })
        .end()
        .h3('水平布局 + 斑马纹')
        .desc({ cols: 1, v: 'horizontal', stripe: true })
          .descItem({ l: '项目', tx: 'TokUI' })
          .descItem({ l: '版本', tx: '1.0.0' })
          .descItem({ l: '许可证', tx: 'MIT' })
          .descItem({ l: '语言', tx: 'JavaScript' })
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-sidebar',
    title: 'Sidebar 侧边栏',
    desc: '可折叠侧边导航栏',
    build() {
      const b = new TokUIBuilder();
      b.h2('Sidebar 侧边栏')
        .p('可折叠的侧边导航栏组件，支持左右位置、自定义宽度、标题区域、内容区域和页脚区域。')
        .h3('基础侧边栏（左侧可折叠）')
        .sidebar({ tt: 'TokUI', w: '260', pos: 'left', collapsible: true })
          .sidebarContent()
            ._open('menu', { v: 'vertical', act: 'home' })
              .menuItem({ tx: '首页', clk: 'home', i: '🏠' })
              .menuItem({ tx: '仪表盘', clk: 'dashboard', i: '📊' })
              .menuItem({ tx: '用户管理', clk: 'users', i: '👥' })
              .menuItem({ tx: '设置', clk: 'settings', i: '⚙️' })
            .end()
          .end()
          .sidebarFooter()
            .btn({ tx: '＋', clk: 'newProject', v: 'primary,sm,pill' })
          .end()
        .end()
        .h3('右侧侧边栏（不可折叠）')
        .sidebar({ tt: '属性面板', pos: 'right', w: '200' })
          .sidebarContent()
            ._open('menu', { v: 'vertical' })
              .menuItem({ tx: '基本属性', i: '📝' })
              .menuItem({ tx: '样式', i: '🎨' })
              .menuItem({ tx: '事件', i: '⚡' })
            .end()
          .end()
        .end()
        .h3('自定义颜色')
        .sidebar({ tt: '暗色导航', w: '220', collapsible: true, bg: '#1a1a2e', fc: '#e0e0e0' })
          .sidebarContent()
            ._open('menu', { v: 'vertical' })
              .menuItem({ tx: '文件', i: '📁' })
              .menuItem({ tx: '编辑', i: '✏️' })
              .menuItem({ tx: '视图', i: '👁' })
              .menuItem({ tx: '帮助', i: '❓' })
            .end()
          .end()
          .sidebarFooter()
            .btn({ tx: '✕', v: 'danger,sm,pill' })
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-scroll-area',
    title: 'Scroll Area 滚动区域',
    desc: '自定义滚动条容器',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Scroll Area 自定义滚动区域' })
        .h3('固定高度 300px 滚动')
        .scrollArea({ h: '300', w: '100%' })
          .p('以下是一个长列表，滚动查看自定义滚动条效果。滚动条仅在鼠标悬停时加深颜色。')
          .list({ t: 'ol' })
            .item('第一项：TokUI Scroll Area 组件')
            .item('第二项：支持自定义滚动条样式')
            .item('第三项：Webkit 和 Firefox 双浏览器支持')
            .item('第四项：暗色主题自动切换滚动条颜色')
            .item('第五项：高度和宽度可通过 h/w 属性自定义')
            .item('第六项：内部可嵌套任意 TokUI 组件')
            .item('第七项：流式渲染完全支持')
            .item('第八项：零外部依赖，纯 CSS 实现')
            .item('第九项：支持主题色变量')
            .item('第十项：边界圆角继承主题设置')
            .item('第十一项：适合长列表、日志输出等场景')
            .item('第十二项：与 Card、Tabs 等容器组件配合使用')
            .item('第十三项：Firefox 使用 scrollbar-width: thin')
            .item('第十四项：滚动条宽度仅 6px，不抢视觉焦点')
            .item('第十五项：hover 时滚动条颜色加深，提示可交互')
          .end()
        .end()
        .h3('固定高度 150px + 嵌套卡片')
        .scrollArea({ h: '150' })
          .card({ tt: '嵌套卡片 1' }).p('这是滚动区域内的第一个卡片。').end()
          .card({ tt: '嵌套卡片 2' }).p('这是滚动区域内的第二个卡片。').end()
          .card({ tt: '嵌套卡片 3' }).p('这是滚动区域内的第三个卡片。').end()
        .end()
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-numinput',
    title: 'NumInput 数字输入',
    desc: '增减按钮、步长、范围限制',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '基础用法' })
            .p('带增减按钮的数字输入：')
            .numinput({ v: 0 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '禁用状态' })
            .p('dis 属性禁用数字输入：')
            .numinput({ v: 42, dis: true })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '设置范围和步长' })
            .p('步长 5')
            .numinput({ v: 0, step: 5 })
            .p('0~100')
            .numinput({ v: 50, min: 0, max: 100 })
            .p('步长 0.1')
            .numinput({ v: 1.0, step: 0.1, min: 0, max: 10 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '在表单中使用' })
            .form({ clk: 'formSubmit' })
              .p('年龄：')
              .numinput({ n: 'age', v: 25, min: 1, max: 150 })
              .p('数量：')
              .numinput({ n: 'count', v: 1, min: 1, max: 99, step: 1 })
              .btn({ t: 'primary', tx: '提交', sub: 'formSubmit' })
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-carousel',
    title: 'Carousel 轮播图',
    desc: '图片轮播、自动播放、手动切换',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Carousel 轮播图组件' })
        .h3('基础轮播')
        .p('点击左右箭头切换图片：')
        .carousel({ id: 'cBasic' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok1/800/400', tt: '山川湖泊', tx: '自然风光' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok2/800/400', tt: '城市夜景', tx: '都市霓虹' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok3/800/400', tt: '星空银河', tx: '宇宙奥秘' })
        .end()
        .h3('自动播放（3秒间隔）')
        .carousel({ id: 'cAuto', auto: '3000' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok4/800/400', tt: '春暖花开' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok5/800/400', tt: '夏日炎炎' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok6/800/400', tt: '秋高气爽' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok7/800/400', tt: '冬雪皑皑' })
        .end()
        .h3('纯图片轮播')
        .carousel({ id: 'cPlain' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok8/800/400' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok9/800/400' })
        .end()
        .h3('缩略图图例（点击切换）')
        .p('下方缩略图点击即丝滑跳转，当前项高亮：')
        .carousel({ id: 'cThumb', thumb: true })
          .carouselItem({ s: 'https://picsum.photos/seed/tok20/800/400', tt: '日出', tx: '黎明破晓' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok21/800/400', tt: '正午', tx: '阳光普照' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok22/800/400', tt: '黄昏', tx: '落日余晖' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok23/800/400', tt: '夜晚', tx: '万家灯火' })
        .end()
        .h3('固定尺寸 / 比例尺寸')
        .p('h 固定像素高、ratio 宽高比（图片自动裁切填满）：')
        .row_layout()
          .col_layout({ span: 6 })
            .p('h:200（固定高）')
            .carousel({ id: 'cH', h: '200' })
              .carouselItem({ s: 'https://picsum.photos/seed/tok30/600/400', tt: '固定 200px 高' })
              .carouselItem({ s: 'https://picsum.photos/seed/tok31/600/400', tt: 'object-fit cover' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .p('ratio:16:9（比例）')
            .carousel({ id: 'cR', ratio: '16:9' })
              .carouselItem({ s: 'https://picsum.photos/seed/tok32/600/338', tt: '16:9 比例' })
              .carouselItem({ s: 'https://picsum.photos/seed/tok33/600/338', tt: '自适应宽' })
            .end()
          .end()
        .end()
        .p('w 固定像素宽（高度随图）、w + h 同时固定宽高（图片裁切填满）：')
        .carousel({ id: 'cW', w: '320' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok34/640/420', tt: 'w:320 固定宽' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok35/640/420', tt: '高度随图自然比例' })
        .end()
        .carousel({ id: 'cWH', w: '480', h: '270' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok36/960/540', tt: 'w:480 h:270 固定宽高' })
          .carouselItem({ s: 'https://picsum.photos/seed/tok37/960/540', tt: 'cover 裁切填满' })
        .end()
        .h3('在卡片中使用')
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '产品展示' })
              .carousel({ id: 'cProduct' })
                .carouselItem({ s: 'https://picsum.photos/seed/tok10/600/300', tt: '产品 A' })
                .carouselItem({ s: 'https://picsum.photos/seed/tok11/600/300', tt: '产品 B' })
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '项目截图' })
              .carousel({ id: 'cProject', auto: '2000' })
                .carouselItem({ s: 'https://picsum.photos/seed/tok12/600/300', tt: '首页设计' })
                .carouselItem({ s: 'https://picsum.photos/seed/tok13/600/300', tt: '数据面板' })
                .carouselItem({ s: 'https://picsum.photos/seed/tok14/600/300', tt: '用户中心' })
              .end()
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  // ===== Popover 气泡卡片 =====
  {
    trigger: 'demo-popover',
    title: 'Popover 气泡卡片',
    desc: '点击/悬浮触发富内容气泡',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Popover 气泡卡片组件' })
        .h3('基础用法（点击触发）')
        .row_layout()
          .col_layout({ span: 6 })
            .popover({ tx: '点击弹出', pos: 'top', tt: '提示信息' })
              .p('这是气泡卡片的内容，支持任意子组件。')
            .end()
          .end()
          .col_layout({ span: 6 })
            .popover({ tx: '底部弹出', pos: 'bottom', tt: '操作确认' })
              .p('确认要执行此操作吗？')
              .btn({ tx: '确定', clk: 'handleDelete' })
            .end()
          .end()
        .end()
        .h3('悬浮触发')
        .row_layout()
          .col_layout({ span: 6 })
            .popover({ tx: '悬浮查看', pos: 'right', trig: 'hover', tt: '用户信息' })
              .p('张三 · 高级工程师 · 技术部')
            .end()
          .end()
          .col_layout({ span: 6 })
            .popover({ tx: '左侧弹出', pos: 'left', trig: 'hover' })
              .p('简单悬浮提示，无标题')
            .end()
          .end()
        .end()
        .h3('富内容气泡')
        .row_layout()
          .col_layout({ span: 4 })
            .popover({ tx: '用户详情', pos: 'bottom', tt: '李四', w: '240px' })
              .p('职位：产品经理')
              .p('部门：产品部')
              .p('状态：在职')
            .end()
          .end()
          .col_layout({ span: 4 })
            .popover({ tx: '快捷操作', pos: 'bottom', tt: '操作面板' })
              .btn({ tx: '编辑', clk: 'handleEdit' })
              .btn({ tx: '复制', clk: 'handleCopy' })
              .btn({ tx: '删除', clk: 'handleDelete' })
            .end()
          .end()
          .col_layout({ span: 4 })
            .popover({ tx: '统计信息', pos: 'bottom', tt: '本周数据' })
              .p('新增用户：128')
              .p('活跃用户：456')
              .p('收入：¥12,800')
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },
  // ===== Hover Card 悬浮卡片 =====
  {
    trigger: 'demo-hover-card',
    title: 'Hover Card 悬浮卡片',
    desc: '悬浮触发的信息弹出卡片',
    build() {
      const b = new TokUIBuilder();
      b.h2('Hover Card 悬浮卡片')
        .p('鼠标悬浮在触发文字上，延迟后弹出信息卡片。')
        .card({ tt: '基础用法' })
          .p('悬浮在')
          .hoverCard({ pos: 'bottom', w: '240', delay: '300' })
            .hoverTrigger()
              .tag('@张三', { t: 'primary' })
            .end()
            .hoverContent()
              .avatar({ tx: '张三', size: 'sm' })
              .p('张三 · 高级工程师')
              .p('部门: 技术部')
            .end()
          .end()
          .p('上查看用户信息')
        .end()
        .card({ tt: '四个方向' })
          .p('鼠标悬浮查看四个方向的弹出效果：')
          .row_layout()
            .col_layout({ span: 3 })
              .hoverCard({ pos: 'bottom', w: '200' })
                .hoverTrigger()
                  .tag('下方弹出', { t: 'info' })
                .end()
                .hoverContent()
                  .p('这是底部弹出的内容')
                .end()
              .end()
            .end()
            .col_layout({ span: 3 })
              .hoverCard({ pos: 'top', w: '200' })
                .hoverTrigger()
                  .tag('上方弹出', { t: 'success' })
                .end()
                .hoverContent()
                  .p('这是顶部弹出的内容')
                .end()
              .end()
            .end()
            .col_layout({ span: 3 })
              .hoverCard({ pos: 'left', w: '200' })
                .hoverTrigger()
                  .tag('左侧弹出', { t: 'warning' })
                .end()
                .hoverContent()
                  .p('这是左侧弹出的内容')
                .end()
              .end()
            .end()
            .col_layout({ span: 3 })
              .hoverCard({ pos: 'right', w: '200' })
                .hoverTrigger()
                  .tag('右侧弹出', { t: 'error' })
                .end()
                .hoverContent()
                  .p('这是右侧弹出的内容')
                .end()
              .end()
            .end()
          .end()
        .end()
        .card({ tt: '富内容 — 头像+文本+标签' })
          .p('Hover Card 内部支持任意 TokUI 组件:')
          .hoverCard({ pos: 'bottom', w: '280', delay: '200' })
            .hoverTrigger()
              .tag('@李四', { t: 'primary', round: true })
            .end()
            .hoverContent()
              .avatar({ tx: '李四', size: 'md' })
              .p('李四 · 产品经理')
              .row_layout()
                .tag('产品', { t: 'info', s: 'small' })
                .tag('设计', { t: 'success', s: 'small' })
                .tag('用户研究', { t: 'warning', s: 'small' })
              .end()
              .p('加入团队 3 年，主导 5 个核心产品迭代')
            .end()
          .end()
        .end()
        .card({ tt: '延迟控制' })
          .p('delay:0 (立即显示):')
          .hoverCard({ pos: 'bottom', w: '180', delay: '0' })
            .hoverTrigger()
              .p('立即显示')
            .end()
            .hoverContent()
              .p('没有延迟，鼠标进入立即弹出')
            .end()
          .end()
          .p('delay:800 (慢速):')
          .hoverCard({ pos: 'bottom', w: '180', delay: '800' })
            .hoverTrigger()
              .p('慢速显示')
            .end()
            .hoverContent()
              .p('延迟 800ms 后才弹出')
            .end()
          .end()
        .end();
      return b;
    }
  },
  // ===== InputTag 标签输入框 =====
  {
    trigger: 'demo-input-tag',
    title: 'InputTag 标签输入框',
    desc: '回车添加标签/点击删除',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '基础用法' })
            .p('输入文本后按回车添加标签，点击 × 删除标签：')
            .inputTag({ l: '技能标签', ph: '输入技能后按回车', n: 'skills', id: 'skillsInput' })
              .p('前端框架')
              .p('后端语言')
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '带初始标签' })
            .p('通过 tags 属性设置默认标签：')
            .inputTag({ l: '兴趣爱好', ph: '添加兴趣', n: 'hobbies', tags: '阅读,运动,编程,旅行' })
            .end()
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '限制最大数量' })
            .p('max 属性限制最多标签数：')
            .inputTag({ l: '文章标签', ph: '最多5个标签', n: 'articleTags', max: '5' })
            .end()
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '在表单中使用' })
            .form({ sub: 'formSubmit' })
              .inputTag({ l: '技术栈', ph: '添加技术', n: 'techStack', tags: 'JavaScript,React', id: 'formTags' })
              .inputTag({ l: '项目标签', ph: '添加标签', n: 'projectTags', max: '3' })
              .btn({ tx: '提交', t: 'submit' })
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  // ===== Countdown 倒计时 =====
  {
    trigger: 'demo-countdown',
    title: 'Countdown 倒计时',
    desc: '实时倒计时/天时分秒/多种格式',
    build() {
      var now = Date.now();
      var tenMin = now + 10 * 60 * 1000;
      var oneHour = now + 60 * 60 * 1000;
      var oneDay = now + 24 * 60 * 60 * 1000;
      var threeDays = now + 3 * 24 * 60 * 60 * 1000;
      var expired = now - 60 * 1000;
      var fiveMin = now + 5 * 60 * 1000;
      var ninetySec = now + 90 * 1000;

      const b = new TokUIBuilder();
      b.card({ tt: 'Countdown 倒计时组件' })
        .h3('完整格式 天:时:分:秒（默认）')
        .row_layout()
          .col_layout({ span: 4 })
            .countdown({ target: String(oneDay), l: '1天倒计时' })
          .end()
          .col_layout({ span: 4 })
            .countdown({ target: String(threeDays), l: '3天倒计时' })
          .end()
          .col_layout({ span: 4 })
            .countdown({ target: String(expired), l: '已结束', tx: '🎉 活动已结束' })
          .end()
        .end()
        .h3('时:分:秒 格式（fmt:hms）')
        .row_layout()
          .col_layout({ span: 4 })
            .countdown({ target: String(oneHour), l: '限时优惠', fmt: 'hms' })
          .end()
          .col_layout({ span: 4 })
            .countdown({ target: String(tenMin), l: '距离结束', fmt: 'hms' })
          .end()
          .col_layout({ span: 4 })
            .countdown({ target: String(fiveMin), l: '支付倒计时', fmt: 'hms', s: 'lg' })
          .end()
        .end()
        .h3('分:秒 格式（fmt:ms）')
        .row_layout()
          .col_layout({ span: 4 })
            .countdown({ target: String(tenMin), l: '验证码有效期', fmt: 'ms' })
          .end()
          .col_layout({ span: 4 })
            .countdown({ target: String(fiveMin), l: '考试倒计时', fmt: 'ms' })
          .end()
          .col_layout({ span: 4 })
            .countdown({ target: String(oneHour), l: '抢购倒计时', fmt: 'ms', s: 'sm' })
          .end()
        .end()
        .h3('纯秒 格式（fmt:s）')
        .row_layout()
          .col_layout({ span: 6 })
            .countdown({ target: String(ninetySec), l: '90秒倒计时', fmt: 's' })
          .end()
          .col_layout({ span: 6 })
            .countdown({ dur: '60', l: '60秒倒计时(使用dur)', fmt: 's' })
          .end()
        .end()
        .h3('不同尺寸')
        .row_layout()
          .col_layout({ span: 4 })
            .countdown({ target: String(oneHour), l: '小尺寸', fmt: 'hms', s: 'sm' })
          .end()
          .col_layout({ span: 4 })
            .countdown({ target: String(oneHour), l: '默认尺寸', fmt: 'hms' })
          .end()
          .col_layout({ span: 4 })
            .countdown({ target: String(oneHour), l: '大尺寸', fmt: 'hms', s: 'lg' })
          .end()
        .end()
        .h3('使用持续时间（dur 秒）')
        .countdown({ dur: '120', l: '2分钟倒计时', fmt: 'ms' })
        .h3('结束事件回调（clk 属性）')
        .p('倒计时结束时会触发 clk 指定的事件处理器，下方 10 秒倒计时结束后将弹出提示：')
        .countdown({ dur: '10', l: '10秒倒计时', fmt: 'ms', clk: 'countdownDone', id: 'cd10s' })
      .end();
      return b;
    }
  },
  {
    trigger: 'demo-watermark',
    label: 'Watermark 水印',
    build() {
      const b = new TokUIBuilder();
      b.h2('Watermark 水印')
        .p('在内容上叠加半透明水印文字，防止截图传播。')
        .h3('基础文字水印')
        .watermark({ tx: '内部机密' })
          .card({ tt: '机密文档' })
            .p('这是一份内部机密文档，水印覆盖在内容上方。水印文字不影响内容的正常交互。')
            .p('水印默认以 -22 度旋转角度重复排列，颜色为浅灰色半透明。')
          .end()
        .end()
        .h3('自定义水印样式')
        .watermark({ tx: 'DRAFT', c: 'rgba(255,0,0,0.2)', gap: '120', font: '18' })
          .card({ tt: '草稿文件' })
            .p('红色 DRAFT 水印，间距 120px，字号 18px。')
          .end()
        .end()
        .h3('小间距密集水印')
        .watermark({ tx: 'CONFIDENTIAL', gap: '80', font: '14' })
          .card({ tt: '密集水印' })
            .p('机密文档内容，水印间距 80px 字号 14px，形成密集覆盖效果。')
            .p('密集水印适用于防止截图传播的场景。')
          .end()
        .end()
        .h3('大字号水印')
        .watermark({ tx: '禁止复制', font: '24', gap: '200' })
          .card({ tt: '大字水印' })
            .p('大字号水印适用于需要强烈视觉提示的场景。间距 200px，字号 24px。')
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-backtop',
    label: 'Backtop 回到顶部',
    build() {
      const b = new TokUIBuilder();
      b.h2('Backtop 回到顶部')
        .p('页面滚动超过阈值后显示回到顶部按钮，点击平滑滚动到页面顶部。支持 window 全局滚动和容器内滚动两种模式。')
        .h3('点击体验不同变体')
        .p('点击按钮后推送渲染对应的 Backtop 组件，滚动页面即可看到效果：')
        .card({})
          .p('TokUI 是一个零依赖的流式 UI 描述与渲染框架。后端通过简洁的 DSL 字符串描述 UI 组件，经 SSE 流式推送到前端，前端实时增量解析并渲染为真实 DOM。')
          .p('TokUI 支持多种组件类型：标题、段落、卡片、表格、表单、对话框、抽屉、步骤条、时间轴、树形控件、级联菜单等 60+ 组件。')
          .p('流式渲染是 TokUI 的核心特性。后端逐步生成 DSL 片段，通过 SSE 推送到前端，前端增量解析并实时渲染。')
          .p('滚动到这里已经超过一定距离了，如果已经渲染了 Backtop 组件，右下角应该出现按钮。')
          .p('继续添加更多内容以便演示滚动效果。这段文字用于增加页面高度，使滚动条出现。')
          .p('TokUI 的 DSL 语法简洁直观，用方括号包裹标签名和属性即可描述 UI。支持自闭合和容器两种组件类型。')
        .end()
        .h3('Window 全局滚动')
        .btngroup({})
          .btn({ tx: '圆形 ↑', clk: 'backtopDemo', v: 'primary', 'data-v': 'circle' })
          .btn({ tx: '圆角 TOP', clk: 'backtopDemo', 'data-v': 'round' })
          .btn({ tx: '方形 △', clk: 'backtopDemo', 'data-v': 'square' })
          .btn({ tx: '大号 ↑', clk: 'backtopDemo', 'data-v': 'circle', 'data-s': 'lg' })
          .btn({ tx: '小号 ↑', clk: 'backtopDemo', 'data-v': 'circle', 'data-s': 'sm' })
        .end()
        .h3('容器内滚动')
        .p('Backtop 也可以定位在有纵向滚动条的容器内，滚动容器内容即可触发：')
        .btn({ tx: '容器内滚动 Demo', clk: 'backtopDemo', 'data-v': 'container' });
      return b;
    }
  },
  {
    trigger: 'demo-backtop-circle',
    label: 'Backtop 圆形',
    build() {
      const b = new TokUIBuilder();
      b.backtop({ t: '200', v: 'circle' })
        .p('已渲染圆形回到顶部按钮，触发距离 200px。向下滚动页面即可在右下角看到 ↑ 按钮。');
      return b;
    }
  },
  {
    trigger: 'demo-backtop-circle-lg',
    label: 'Backtop 圆形大号',
    build() {
      const b = new TokUIBuilder();
      b.backtop({ t: '200', v: 'circle', s: 'lg' })
        .p('已渲染大号圆形回到顶部按钮。');
      return b;
    }
  },
  {
    trigger: 'demo-backtop-circle-sm',
    label: 'Backtop 圆形小号',
    build() {
      const b = new TokUIBuilder();
      b.backtop({ t: '200', v: 'circle', s: 'sm' })
        .p('已渲染小号圆形回到顶部按钮。');
      return b;
    }
  },
  {
    trigger: 'demo-backtop-round',
    label: 'Backtop 圆角',
    build() {
      const b = new TokUIBuilder();
      b.backtop({ t: '150', v: 'round', tx: 'TOP' })
        .p('已渲染圆角回到顶部按钮（带文字 TOP），触发距离 150px。');
      return b;
    }
  },
  {
    trigger: 'demo-backtop-square',
    label: 'Backtop 方形',
    build() {
      const b = new TokUIBuilder();
      b.backtop({ t: '100', v: 'square', tx: '△' })
        .p('已渲染方形回到顶部按钮，触发距离 100px。');
      return b;
    }
  },
  {
    trigger: 'demo-backtop-container',
    label: 'Backtop 容器内滚动',
    build() {
      const b = new TokUIBuilder();
      b.h3('容器内滚动 Demo')
        .p('下方卡片设置了固定高度和 overflow-y:auto，滚动卡片内容即可在右下角看到回到顶部按钮：')
        .card({ tt: '滚动容器', style: 'max-height:240px;overflow-y:auto;position:relative' })
          .p('这是容器内第一段内容。向下滚动查看更多段落，当滚动超过一定距离后，右下角会出现回到顶部按钮。')
          .p('TokUI 是一个零依赖的流式 UI 描述与渲染框架。后端通过简洁的 DSL 字符串描述 UI 组件，经 SSE 流式推送到前端，前端实时增量解析并渲染为真实 DOM。')
          .p('TokUI 支持多种组件类型：标题、段落、卡片、表格、表单、对话框、抽屉、步骤条、时间轴、树形控件、级联菜单等 60+ 组件。')
          .p('流式渲染是 TokUI 的核心特性。后端逐步生成 DSL 片段，通过 SSE 推送到前端，前端增量解析并实时渲染。')
          .p('DSL 语法简洁直观，用方括号包裹标签名和属性即可描述 UI，支持属性简写和布尔属性。')
          .p('容器组件用闭标签结束，子节点自动收集为 children。自闭合组件用单行标签表示。')
          .p('事件通过命名处理器绑定，需预先用 registerHandler 注册。表单用类似方式绑定提交事件。')
          .p('主题系统基于 CSS 变量，通过 data-tokui-theme 属性切换。内置 light/dark 两套主题。')
          .p('这段文字用于增加容器高度。继续向下滚动...')
          .p('快到底部了！右下角应该出现 ↑ 按钮。点击即可回到容器顶部。')
          .backtop({ t: '1', container: true })
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-calendar',
    label: 'Calendar 日历',
    build() {
      const b = new TokUIBuilder();
      b.h2('Calendar 日历')
        .p('展示月历视图，支持标记日期和多种变体。')
        .h3('基础日历')
        .p('默认当前月份，指定月份，带日期标记：')
        .row_layout({})
          .col_layout({ span: 4 })
            .calendar({})
          .end()
          .col_layout({ span: 4 })
            .calendar({ month: '2025-06' })
          .end()
          .col_layout({ span: 4 })
            .calendar({ marks: '3,10,15,22,28' })
          .end()
        .end()
        .h3('迷你与卡片模式')
        .row_layout({})
          .col_layout({ span: 4 })
            .calendar({ v: 'mini' })
          .end()
          .col_layout({ span: 4 })
            .calendar({ v: 'mini', marks: '1,8,15' })
          .end()
          .col_layout({ span: 4 })
            .calendar({ v: 'mini', marks: '5,12,20' })
          .end()
        .end()
        .h3('卡片模式')
        .row_layout({})
          .col_layout({ span: 4 })
            .calendar({ v: 'card', marks: '5,12,20' })
          .end()
          .col_layout({ span: 4 })
            .calendar({ v: 'card', month: '2025-06' })
          .end()
          .col_layout({ span: 4 })
            .calendar({ v: 'card', marks: '3,10,15' })
          .end()
        .end()
        .h3('区间标记（节假日 / 连续假期）')
        .p('range / ranges 属性可标记连续日期区间，适合展示春节假期、国庆长假等：')
        .row_layout({})
          .col_layout({ span: 6 })
            .calendar({ month: '2025-10', range: '1-7', tt: '国庆假期 10.1-10.7' })
          .end()
          .col_layout({ span: 6 })
            .calendar({ month: '2025-06', range: '1-2', tt: '端午假期 6.1-6.2' })
          .end()
        .end()
        .row_layout({})
          .col_layout({ span: 6 })
            .calendar({ month: '2025-01', range: '28-31', tt: '春节假期 1.28-1.31' })
          .end()
          .col_layout({ span: 6 })
            .calendar({ month: '2025-02', range: '1-4', tt: '春节假期 2.1-2.4' })
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-datepicker',
    label: 'DatePicker/TimePicker',
    build() {
      const b = new TokUIBuilder();

      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: 'DatePicker 日期选择' })
            .h3('基础用法')
            .p('点击输入框展开日历面板，选择日期：')
            .datepicker({ l: '选择日期', clk: 'onDate', fmt: 'YYYY-MM-DD' })
            .h3('带初始值')
            .datepicker({ l: '出生日期', v: '2025-06-15', clk: 'onBirth', fmt: 'YYYY-MM-DD' })
            .h3('不同格式')
            .p('YYYY/MM/DD')
            .datepicker({ fmt: 'YYYY/MM/DD', ph: 'YYYY/MM/DD' })
            .p('DD-MM-YYYY')
            .datepicker({ fmt: 'DD-MM-YYYY', ph: 'DD-MM-YYYY' })
            .h3('禁用状态')
            .datepicker({ l: '禁用', dis: true })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: 'TimePicker 时间选择' })
            .h3('基础用法')
            .p('滚轮选择时间：')
            .timepicker({ l: '选择时间', clk: 'onTime', fmt: 'HH:mm' })
            .h3('带秒')
            .timepicker({ l: '精确到秒', fmt: 'HH:mm:ss', ph: 'HH:mm:ss' })
            .h3('带初始值')
            .timepicker({ l: '开会时间', v: '14:30', clk: 'onMeeting' })
            .h3('禁用状态')
            .timepicker({ l: '禁用', dis: true })
          .end()
        .end()
      .end()
      .row_layout()
        .col_layout({ span: 6 })
          .card({ tt: 'DateTimePicker 日期时间选择' })
            .h3('基础用法')
            .p('选择日期和时间：')
            .datetimepicker({ l: '选择日期时间', clk: 'onPick', fmt: 'YYYY-MM-DD HH:mm' })
            .h3('带初始值')
            .datetimepicker({ l: '预约时间', v: '2025-06-20 09:00', fmt: 'YYYY-MM-DD HH:mm' })
            .h3('带秒')
            .datetimepicker({ l: '精确到秒', fmt: 'YYYY-MM-DD HH:mm:ss', ph: 'YYYY-MM-DD HH:mm:ss' })
            .h3('禁用状态')
            .datetimepicker({ l: '禁用', dis: true })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '在表单中使用' })
            .form({ clk: 'formSubmit' })
              .datepicker({ l: '出发日期', n: 'start_date', fmt: 'YYYY-MM-DD', clk: 'onStart' })
              .datepicker({ l: '返回日期', n: 'end_date', fmt: 'YYYY-MM-DD' })
              .timepicker({ l: '出发时间', n: 'start_time', fmt: 'HH:mm' })
              .datetimepicker({ l: '预约时间', n: 'appointment', fmt: 'YYYY-MM-DD HH:mm' })
              .btn({ t: 'primary', tx: '提交', sub: 'formSubmit' })
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-menu',
    label: 'Menu 菜单',
    build() {
      const b = new TokUIBuilder();
      b.h2('Menu 菜单')
        .p('导航菜单，支持纵向、横向和内联模式。')
        .h3('纵向菜单（基础）')
        .menu({})
          .menuItem({ tx: '首页', clk: 'menuHome' })
          .menuItem({ tx: '用户管理', clk: 'menuUser' })
          .menuItem({ tx: '系统设置', clk: 'menuSettings' })
          .menuItem({ tx: '日志查询', clk: 'menuLog' })
        .end()
        .h3('带默认选中')
        .menu({ act: 'menuUser' })
          .menuItem({ tx: '仪表盘', clk: 'menuDash' })
          .menuItem({ tx: '用户管理', clk: 'menuUser' })
          .menuItem({ tx: '权限配置', clk: 'menuPerm' })
          .menuItem({ tx: '系统监控', clk: 'menuMonitor' })
        .end()
        .h3('横向菜单')
        .menu({ v: 'horizontal' })
          .menuItem({ tx: '首页', clk: 'navHome', act: true })
          .menuItem({ tx: '产品', clk: 'navProduct' })
          .menuItem({ tx: '方案', clk: 'navSolution' })
          .menuItem({ tx: '文档', clk: 'navDoc' })
          .menuItem({ tx: '定价', clk: 'navPrice' })
        .end()
        .h3('带图标的菜单')
        .menu({})
          .menuItem({ tx: '首页', clk: 'menuHome2', i: '🏠' })
          .menuItem({ tx: '消息', clk: 'menuMsg', i: '💬' })
          .menuItem({ tx: '收藏', clk: 'menuFav', i: '⭐' })
          .menuItem({ tx: '设置', clk: 'menuSettings2', i: '⚙️' })
        .end()
        .h3('带禁用项')
        .menu({})
          .menuItem({ tx: '可用功能', clk: 'menuActive' })
          .menuItem({ tx: '即将开放', dis: true })
          .menuItem({ tx: '另一个功能', clk: 'menuActive2' })
          .menuItem({ tx: '维护中', dis: true })
        .end()
        .h3('模拟后台布局')
        .row_layout()
          .col_layout({ span: 4 })
            .menu({ act: 'adminDash' })
              .menuItem({ tx: '仪表盘', clk: 'adminDash', i: '📊' })
              .menuItem({ tx: '用户', clk: 'adminUser', i: '👥' })
              .menuItem({ tx: '订单', clk: 'adminOrder', i: '📦' })
              .menuItem({ tx: '设置', clk: 'adminSetting', i: '🔧' })
            .end()
          .end()
          .col_layout({ span: 8 })
            .card({ tt: '仪表盘' })
              .p('左侧为菜单导航，右侧为内容区域。点击左侧菜单项可切换激活状态。')
              .desc({ cols: 2 })
              .end()
            .end()
          .end()
        .end();
      return b;
    }
  },

  // ========== 7 个新功能演示 ==========

  {
    trigger: 'demo-code-highlight',
    title: '语法高亮',
    desc: '展示 11 种语言的丰富语法高亮效果',
    build() {
      const b = new TokUIBuilder();
      b.h2('语法高亮 (Code Highlight)')
        .p('零依赖纯 CSS 语法着色，支持 11 种语言的关键词、字符串、注释、函数名、数字等 token 高亮。');

      b.card({ tt: '11 种语言语法高亮' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'JavaScript' })
              .code({ lang: 'js' }, '// JavaScript 示例 — 模块导出与异步操作\nimport { fetchData } from "./api";\n\nconst API_BASE = "https://api.example.com";\n\n/**\n * 获取用户列表\n * @param {number} page - 页码\n * @returns {Promise<Array>}\n */\nasync function getUsers(page = 1) {\n  const url = `${API_BASE}/users?page=${page}`;\n  const response = await fetch(url);\n  if (!response.ok) {\n    throw new Error(`HTTP ${response.status}`);\n  }\n  return response.json();\n}\n\n// 使用示例\nconst users = await getUsers(1);\nconsole.log(`共 ${users.length} 位用户`);\n\nexport { getUsers, API_BASE };')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'TypeScript' })
              .code({ lang: 'ts' }, '// TypeScript 示例 — 接口与泛型\ninterface User<T = string> {\n  id: number;\n  name: T;\n  email?: string;\n  readonly createdAt: Date;\n}\n\ntype Response<T> = {\n  data: T;\n  code: number;\n  message: string;\n};\n\nasync function fetchUser<T>(id: number): Promise<Response<User<T>>> {\n  const res = await fetch(`/api/users/${id}`);\n  if (!res.ok) {\n    throw new Error(`Failed: ${res.status}`);\n  }\n  return res.json();\n}\n\n// 使用示例\nconst resp = await fetchUser<string>(42);\nconsole.log(resp.data.name);')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Python' })
              .code({ lang: 'python' }, '# Python 示例 — 类与装饰器\nfrom dataclasses import dataclass\nfrom typing import List, Optional\n\n@dataclass\nclass User:\n    """用户数据模型"""\n    name: str\n    age: int\n    email: Optional[str] = None\n    roles: List[str] = None\n\n    def __post_init__(self):\n        if self.roles is None:\n            self.roles = ["viewer"]\n\n    @property\n    def is_admin(self) -> bool:\n        return "admin" in self.roles\n\n    def greet(self) -> str:\n        return f"Hello, {self.name}! Age: {self.age}"\n\n# 使用示例\nuser = User(name="Alice", age=30, roles=["admin", "editor"])\nprint(user.greet())\nprint(f"Is admin: {user.is_admin}")')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Go' })
              .code({ lang: 'go' }, '// Go 示例 — HTTP 服务与并发\npackage main\n\nimport (\n\t"fmt"\n\t"net/http"\n\t"sync"\n)\n\ntype Counter struct {\n\tmu    sync.Mutex\n\tvalue int\n}\n\nfunc (c *Counter) Inc() {\n\tc.mu.Lock()\n\tdefer c.mu.Unlock()\n\tc.value++\n}\n\nfunc main() {\n\tcounter := &Counter{}\n\n\thttp.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {\n\t\tcounter.Inc()\n\t\tfmt.Fprintf(w, "Count: %d\\n", counter.value)\n\t})\n\n\tfmt.Println("Server at :8080")\n\tif err := http.ListenAndServe(":8080", nil); err != nil {\n\t\tpanic(err)\n\t}\n}')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Rust' })
              .code({ lang: 'rust' }, '// Rust 示例 — 所有权与错误处理\nuse std::fs::File;\nuse std::io::{self, Read};\n\nfn read_config(path: &str) -> Result<String, io::Error> {\n    let mut file = File::open(path)?;\n    let mut contents = String::new();\n    file.read_to_string(&mut contents)?;\n    Ok(contents)\n}\n\nfn main() {\n    match read_config("config.toml") {\n        Ok(cfg) => println!("Config loaded: {} bytes", cfg.len()),\n        Err(e) => eprintln!("Error: {}", e),\n    }\n\n    // 迭代器示例\n    let numbers = vec![1, 2, 3, 4, 5];\n    let sum: i32 = numbers.iter().sum();\n    println!("Sum: {}", sum);\n}')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'Java' })
              .code({ lang: 'java' }, '// Java 示例 — Stream API 与记录类\nimport java.util.List;\nimport java.util.stream.Collectors;\n\npublic record User(String name, int age, String role) {}\n\npublic class Main {\n    public static void main(String[] args) {\n        List<User> users = List.of(\n            new User("Alice", 30, "admin"),\n            new User("Bob", 25, "editor"),\n            new User("Carol", 28, "viewer")\n        );\n\n        var admins = users.stream()\n            .filter(u -> u.role().equals("admin"))\n            .map(User::name)\n            .collect(Collectors.toList());\n\n        System.out.println("Admins: " + admins);\n\n        double avgAge = users.stream()\n            .mapToInt(User::age)\n            .average()\n            .orElse(0);\n        System.out.println("Avg age: " + avgAge);\n    }\n}')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'HTML' })
              .code({ lang: 'html' }, '<!-- HTML 示例 — 语义化表单 -->\n<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>用户注册</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <main class="container">\n    <h1>用户注册</h1>\n    <form action="/api/register" method="POST">\n      <label for="username">用户名</label>\n      <input type="text" id="username" name="username" required>\n      <label for="email">邮箱</label>\n      <input type="email" id="email" name="email" placeholder="user@example.com">\n      <button type="submit" class="btn-primary">注册</button>\n    </form>\n  </main>\n</body>\n</html>')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'CSS' })
              .code({ lang: 'css' }, '/* CSS 示例 — 响应式网格与动画 */\n:root {\n  --primary: #4f46e5;\n  --radius: 8px;\n  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\n}\n\n.card-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 1.5rem;\n  padding: 2rem;\n}\n\n.card {\n  background: #ffffff;\n  border-radius: var(--radius);\n  box-shadow: var(--shadow);\n  transition: transform 0.3s ease, box-shadow 0.3s ease;\n}\n\n.card:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.25);\n}\n\n@media (max-width: 768px) {\n  .card-grid { grid-template-columns: 1fr; padding: 1rem; }\n}')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'JSON' })
              .code({ lang: 'json' }, '{\n  "name": "TokUI",\n  "version": "1.0.0",\n  "description": "零依赖流式UI渲染框架",\n  "main": "src/index.js",\n  "keywords": ["ui", "streaming", "sse", "dsl", "zero-dependency"],\n  "author": {\n    "name": "TokUI Team",\n    "email": "team@tokui.dev"\n  },\n  "scripts": {\n    "test": "node tests/run-all.js",\n    "server": "node src/server/sse-server.js"\n  },\n  "dependencies": {},\n  "devDependencies": {}\n}')
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: 'SQL' })
              .code({ lang: 'sql' }, '-- SQL 示例 — 多表关联查询与聚合\nSELECT\n    u.id AS user_id,\n    u.name AS user_name,\n    u.email,\n    COUNT(o.id) AS total_orders,\n    SUM(o.amount) AS total_amount,\n    AVG(o.amount) AS avg_amount,\n    MAX(o.created_at) AS last_order_date\nFROM users u\nLEFT JOIN orders o\n    ON u.id = o.user_id\n    AND o.status = \'completed\'\n    AND o.created_at >= \'2024-01-01\'\nWHERE u.is_active = TRUE\nGROUP BY u.id, u.name, u.email\nHAVING COUNT(o.id) > 0\nORDER BY total_amount DESC\nLIMIT 50;')
            .end()
          .end()
        .end()
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: 'Bash / Shell' })
              .code({ lang: 'bash' }, '#!/bin/bash\n# Bash 示例 — 项目部署脚本\n\nset -euo pipefail\n\nPROJECT_DIR="/opt/tokui"\nBACKUP_DIR="/opt/backups"\nLOG_FILE="/var/log/tokui-deploy.log"\n\necho "=== TokUI 部署开始 $(date \'+%Y-%m-%d %H:%M:%S\') ===" | tee -a "$LOG_FILE"\n\n# 备份当前版本\nif [ -d "$PROJECT_DIR" ]; then\n    echo "备份旧版本到 $BACKUP_DIR/"\n    tar -czf "$BACKUP_DIR/tokui-$(date +%Y%m%d).tar.gz" -C "$PROJECT_DIR" .\nfi\n\n# 拉取最新代码\necho "拉取最新代码..."\ngit clone --depth 1 https://github.com/tokui/tokui.git /tmp/tokui-new\ncp -rf /tmp/tokui-new/* "$PROJECT_DIR/"\n\n# 安装依赖（零依赖项目跳过）\necho "项目零依赖，无需 npm install"\n\n# 重启服务\necho "重启服务..."\npm2 restart tokui-server || echo "首次启动"\npm2 start "$PROJECT_DIR/src/server/sse-server.js" --name tokui-server\n\necho "=== 部署完成 ===" | tee -a "$LOG_FILE"')
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-md-enhanced',
    title: 'Markdown 增强',
    desc: '展示任务列表、代码围栏、引用、水平线、对齐表格等增强语法',
    build() {
      const b = new TokUIBuilder();
      b.h2('Markdown 增强')
        .p('展示 Markdown 组件的增强渲染能力：任务列表、代码围栏、引用块、水平线、对齐表格等。');

      // 任务列表
      b.card({ tt: '任务列表 (Task List)' })
        .md('## 项目进度\n\n### 前端开发\n\n- [x] 页面布局与组件注册\n- [x] 流式渲染器实现\n- [x] 主题系统 CSS 变量\n- [ ] 暗色主题适配\n- [ ] 国际化 (i18n)\n\n### 后端开发\n\n- [x] SSE 服务端实现\n- [x] TokUIBuilder 链式 API\n- [ ] 多用户会话支持\n- [ ] 持久化存储集成\n\n### 测试与部署\n\n- [x] 单元测试覆盖\n- [ ] E2E 测试\n- [ ] CI/CD 流水线\n- [ ] 生产环境部署')
      .end();

      // 代码围栏
      b.card({ tt: '代码围栏 (Code Fence)' })
        .md('## 代码示例\n\n行内代码：使用 `npm install` 安装依赖，`npm test` 运行测试。\n\n### JavaScript\n\n```javascript\nconst app = {\n  name: "TokUI",\n  version: "1.0.0",\n  init() {\n    console.log(`${this.name} v${this.version} 已启动`);\n  }\n};\n\napp.init();\n```\n\n### Python\n\n```python\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n\nprint(quicksort([3, 6, 8, 10, 1, 2, 1]))\n```')
      .end();

      // 引用块
      b.card({ tt: '引用块 (Blockquote)' })
        .md('## 引用示例\n\n> 设计不仅仅是看起来怎么样、感觉怎么样。设计是关于它如何运作的。\n>\n> — Steve Jobs\n\n> **注意**：TokUI 使用零依赖架构，不引入任何 npm 包。\n>\n> > 嵌套引用：前后端均使用原生 API 实现。\n\n> [!TIP]\n> 使用 `b.code({ lang: "js" }, code)` 可以快速生成带语法高亮的代码块。')
      .end();

      // 水平线
      b.card({ tt: '水平线 (Horizontal Rule)' })
        .md('## 水平线\n\n以上是第一部分内容。\n\n---\n\n这是第二部分，使用 `---` 分隔。\n\n***\n\n使用 `***` 也可以生成分隔线。\n\n___\n\n使用 `___` 同样生效。')
      .end();

      // 对齐表格
      b.card({ tt: '对齐表格 (Aligned Table)' })
        .md('## 表格对齐\n\n| 属性 | 类型 | 默认值 | 说明 |\n| :--- | :---: | ---: | :--- |\n| `theme` | string | `"default"` | 主题名称 |\n| `container` | Element | — | 渲染容器 |\n| `lang` | string | `"zh"` | 语言设置 |\n| `debug` | boolean | `false` | 调试模式 |\n\n### 左对齐 / 居中 / 右对齐\n\n| 左对齐 (默认) | 居中对齐 | 右对齐 |\n| :--- | :---: | ---: |\n| 文本内容 | 重要信息 | 99.9% |\n| 第二行 | 数据 | 1,234 |\n| 第三行 | 对齐展示 | $5,000 |')
      .end();

      // 综合示例
      b.card({ tt: '综合示例' })
        .md('## TokUI 快速上手指南\n\n### 1. 环境准备\n\n- [x] Node.js >= 14\n- [x] npm 或 yarn\n- [ ] IDE 配置\n\n> 建议使用 VS Code 并安装 ESLint 插件。\n\n### 2. 安装与启动\n\n```bash\n# 克隆项目\ngit clone https://github.com/tokui/tokui.git\ncd tokui\n\n# 启动演示服务器\nnode src/server/sse-server.js\n```\n\n### 3. 核心模块\n\n| 模块 | 文件 | 说明 |\n| :--- | :--- | :--- |\n| Parser | `src/core/parser.js` | 流式 DSL 解析器 |\n| Renderer | `src/core/renderer.js` | 组件渲染引擎 |\n| Builder | `src/server/tokui-builder.js` | 链式 DSL 生成器 |\n\n---\n\n**注意**：本项目零依赖，无需 `npm install`。')
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-notification',
    title: '通知组件',
    desc: '展示全局堆叠通知的 4 种类型及不同位置',
    build() {
      const b = new TokUIBuilder();
      b.h2('通知组件 (Notification)')
        .p('全局堆叠通知，支持 success / error / warning / info 四种类型，可设置不同弹出位置。');

      // 自动关闭（默认 4.5 秒）
      b.card({ tt: '自动关闭（默认 4.5s）' })
        .p('不设 duration 或设为正值，通知到时自动消失：')
        .notification({ t: 'success', tt: '操作成功', tx: '数据已保存到服务器，变更将在 30 秒内生效。', id: 'ntf-success', pos: 'top-right' })
        .notification({ t: 'error', tt: '请求失败', tx: '服务器返回 500 错误，请检查网络连接后重试。', id: 'ntf-error', pos: 'top-right' })
        .notification({ t: 'warning', tt: '注意', tx: '当前磁盘使用率已达 85%，建议及时清理。', id: 'ntf-warning', pos: 'top-right' })
        .notification({ t: 'info', tt: '系统通知', tx: '系统将于今晚 22:00 进行例行维护，预计持续 2 小时。', id: 'ntf-info', pos: 'top-right' })
      .end();

      // 手动关闭（duration:0）
      b.card({ tt: '手动关闭（duration:0）' })
        .p('设置 duration:0 通知不会自动关闭，只能手动点击关闭按钮：')
        .notification({ t: 'info', tt: '新版本可用', tx: 'TokUI v2.0 已发布，包含多项改进和修复。', id: 'ntf-update', pos: 'top-right', duration: '0' })
        .notification({ t: 'warning', tt: '登录即将过期', tx: '您的登录凭证将在 5 分钟后过期，请及时保存工作', id: 'ntf-expire', pos: 'top-right', duration: '0' })
      .end();

      // 自定义时长
      b.card({ tt: '自定义时长' })
        .p('通过 duration 属性指定自动关闭的毫秒数：')
        .notification({ t: 'success', tt: '3 秒后关闭', tx: 'duration:3000', id: 'ntf-3s', pos: 'top-right', duration: '3000' })
        .notification({ t: 'info', tt: '8 秒后关闭', tx: 'duration:8000', id: 'ntf-8s', pos: 'top-right', duration: '8000' })
      .end();

      // 不同位置
      b.card({ tt: '不同弹出位置' })
        .p('通过 pos 属性控制通知弹出的位置：top-right / top-left / bottom-right / bottom-left')
        .notification({ t: 'info', tt: '右上角通知', tx: '这是 pos:top-right 的通知示例', id: 'ntf-tr', pos: 'top-right', duration: '0' })
        .notification({ t: 'success', tt: '左上角通知', tx: '这是 pos:top-left 的通知示例', id: 'ntf-tl', pos: 'top-left', duration: '0' })
        .notification({ t: 'warning', tt: '右下角通知', tx: '这是 pos:bottom-right 的通知示例', id: 'ntf-br', pos: 'bottom-right', duration: '0' })
        .notification({ t: 'error', tt: '左下角通知', tx: '这是 pos:bottom-left 的通知示例', id: 'ntf-bl', pos: 'bottom-left', duration: '0' })
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-popconfirm',
    title: '确认气泡',
    desc: '展示 Popconfirm 确认气泡的各种用法',
    build() {
      const b = new TokUIBuilder();
      b.h2('确认气泡 (Popconfirm)')
        .p('轻量级确认气泡，适合需要二次确认但不需弹窗的场景。支持 danger 类型、不同位置、自定义按钮文本。');

      // 基础确认
      b.card({ tt: '基础确认' })
        .p('默认类型，包含"确认"和"取消"两个按钮：')
        .popconfirm({ tt: '确定要提交吗？', tx: '提交后数据将公开发布', clk: 'confirmSubmit', pos: 'top' })
        .p()
        .popconfirm({ tt: '确定要刷新页面？', tx: '未保存的修改将丢失', clk: 'confirmRefresh', pos: 'bottom' })
      .end();

      // Danger 类型
      b.card({ tt: '危险操作 (t:danger)' })
        .p('确认按钮为红色，用于删除、注销等不可逆操作：')
        .popconfirm({ tt: '确认删除该用户？', tx: '此操作不可撤销', t: 'danger', clk: 'confirmDelUser', pos: 'top' })
        .p()
        .popconfirm({ tt: '确认清空所有数据？', tx: '所有记录将被永久删除', t: 'danger', clk: 'confirmClear', pos: 'top' })
      .end();

      // 不同位置
      b.card({ tt: '不同弹出位置' })
        .p('通过 pos 属性控制气泡弹出方向：')
        .popconfirm({ tt: '上方弹出', tx: 'pos:top', clk: 'popTop', pos: 'top' })
        .popconfirm({ tt: '下方弹出', tx: 'pos:bottom', clk: 'popBottom', pos: 'bottom' })
        .popconfirm({ tt: '左侧弹出', tx: 'pos:left', clk: 'popLeft', pos: 'left' })
        .popconfirm({ tt: '右侧弹出', tx: 'pos:right', clk: 'popRight', pos: 'right' })
      .end();

      // 场景组合
      b.card({ tt: '实际应用场景' })
        .p('订单管理中常见操作：')
        .table({ stripe: true })
          .theadCols('订单号,客户,金额,状态,操作')
          .tbody()
            .row('ORD-001', '张三', '¥1,200', '待发货', '发货')
            .row('ORD-002', '李四', '¥3,500', '已完成', '删除')
            .row('ORD-003', '王五', '¥890', '已取消', '恢复')
          .end()
        .end()
        .p()
        .popconfirm({ tt: '确认发货？', tx: '发货', clk: 'shipOrder', pos: 'top' })
        .popconfirm({ tt: '确认删除订单？', tx: '删除', t: 'danger', clk: 'delOrder', pos: 'top' })
        .popconfirm({ tt: '恢复此订单？', tx: '恢复', clk: 'restoreOrder', pos: 'top' })
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-chat-input',
    title: '对话输入',
    desc: '展示 AI 对话输入框的各种用法',
    build() {
      const b = new TokUIBuilder();
      b.h2('对话输入 (Chat Input)')
        .p('专为 AI 对话场景设计的输入框，支持自适应高度、字数限制、禁用状态等。');

      // 基础输入
      b.card({ tt: '基础输入框' })
        .p('默认状态，带发送按钮：')
        .chatInput({ ph: '输入消息，按 Enter 发送...', clk: 'handleSend', rows: '1', id: 'chat-basic' })
          .p('')
        .end()
      .end();

      // 禁用状态
      b.card({ tt: '禁用状态' })
        .p('AI 正在回复时，输入框自动禁用：')
        .chatInput({ ph: 'AI 正在思考中...', clk: 'handleSend', rows: '1', id: 'chat-disabled', dis: true })
          .p('')
        .end()
      .end();

      // 多行 + 字数限制
      b.card({ tt: '多行输入 + 字数限制' })
        .p('设置 rows 和 maxChars 属性：')
        .chatInput({ ph: '请输入详细描述...', clk: 'handleSend', rows: '3', id: 'chat-multi', maxchars: '500' })
          .p('')
        .end()
      .end();

      // 完整聊天场景
      b.card({ tt: '完整聊天场景' })
        .p('Bubble + ChatInput 组合模拟真实 AI 对话：')
        .bubble({ role: 'user' })
          .p('请帮我解释一下什么是 SSE？')
        .end()
        .bubble({ role: 'ai' })
          .p('SSE（Server-Sent Events）是一种基于 HTTP 的服务器推送技术。与 WebSocket 的双向通信不同，SSE 是单向的——服务器可以主动向客户端推送数据。')
          .p('主要特点：')
          .ul()
            .i('基于标准 HTTP 协议，无需特殊握手')
            .i('单向通信（服务器 -> 客户端）')
            .i('自动重连机制')
            .i('轻量级，适合流式数据推送')
          .end()
        .end()
        .bubble({ role: 'user' })
          .p('SSE 和 WebSocket 怎么选？')
        .end()
        .bubble({ role: 'ai' })
          .p('如果只需要服务器向客户端推送数据（如聊天消息、实时通知、日志流），SSE 更简单高效。如果需要双向通信（如在线游戏、协同编辑），则选 WebSocket。')
        .end()
        .dv({ tx: '输入区域', align: 'left' })
        .chatInput({ ph: '继续提问...', clk: 'handleSend', rows: '2', id: 'chat-scene' })
          .p('')
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-msg-actions',
    title: '消息操作',
    desc: '展示消息操作栏（复制/重生成/赞/踩）',
    build() {
      const b = new TokUIBuilder();
      b.h2('消息操作 (Msg Actions)')
        .p('AI 对话中常用的消息操作栏，支持复制、重新生成、点赞、点踩等操作。');

      // 完整操作栏
      b.card({ tt: '完整操作栏' })
        .bubble({ role: 'ai' })
          .p('TokUI 是一个零依赖的流式 UI 描述与渲染框架，后端通过简洁的 DSL 字符串描述 UI 组件，经 SSE 流式推送到前端，前端实时增量解析并渲染为真实 DOM。')
          .msgActions({ clk: 'handleAction', copy: true, regenerate: true, like: true, visible: true })
          .end()
        .end()
      .end();

      // 自定义子集
      b.card({ tt: '自定义操作子集' })
        .p('仅复制：')
        .bubble({ role: 'ai' })
          .p('这段内容只能复制，不能进行其他操作。')
          .msgActions({ clk: 'handleAction', copy: true, visible: true })
          .end()
        .end()
        .p('复制 + 点赞/点踩：')
        .bubble({ role: 'ai' })
          .p('这段内容支持复制和评价。')
          .msgActions({ clk: 'handleAction', copy: true, like: true, visible: true })
          .end()
        .end()
        .p('仅重新生成：')
        .bubble({ role: 'ai' })
          .p('如果不满意这条回复，可以重新生成。')
          .msgActions({ clk: 'handleAction', regenerate: true, visible: true })
          .end()
        .end()
      .end();

      // 结合 Bubble 完整场景
      b.card({ tt: '完整 AI 对话场景' })
        .bubble({ role: 'user' })
          .p('请给我写一段 Python 快速排序代码')
        .end()
        .bubble({ role: 'ai' })
          .code({ lang: 'python' }, 'def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n\n# 使用示例\nresult = quicksort([3, 6, 8, 10, 1, 2, 1])\nprint(result)  # [1, 1, 2, 3, 6, 8, 10]')
          .msgActions({ clk: 'handleAction', copy: true, regenerate: true, like: true, visible: true })
          .end()
        .end()
        .bubble({ role: 'user' })
          .p('能优化一下吗？用迭代代替递归')
        .end()
        .bubble({ role: 'ai' })
          .code({ lang: 'python' }, 'def quicksort_iterative(arr):\n    stack = [(0, len(arr) - 1)]\n    while stack:\n        low, high = stack.pop()\n        if low >= high:\n            continue\n        pivot = arr[high]\n        i = low - 1\n        for j in range(low, high):\n            if arr[j] <= pivot:\n                i += 1\n                arr[i], arr[j] = arr[j], arr[i]\n        arr[i + 1], arr[high] = arr[high], arr[i + 1]\n        stack.append((low, i))\n        stack.append((i + 2, high))\n    return arr')
          .p('迭代版本避免了递归深度限制，适合处理大型数组。时间复杂度仍为 O(n log n) 平均情况。')
          .msgActions({ clk: 'handleAction', copy: true, regenerate: true, like: true, visible: true })
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'demo-error-boundary',
    title: '错误边界',
    desc: '展示渲染容错与降级处理',
    build() {
      const b = new TokUIBuilder();
      b.h2('错误边界 (Error Boundary)')
        .p('TokUI 内置渲染容错机制，当单个组件渲染出错时，不会影响其他组件的渲染。错误组件会降级为友好的错误提示。');

      // 正常渲染
      b.card({ tt: '正常渲染' })
        .p('以下组件全部正常渲染，无错误：')
        .h3('用户信息')
        .p('姓名：张三 | 部门：技术部 | 工号：EMP-001')
        .callout({ t: 'info', tt: '提示', tx: '所有组件均正常工作，无渲染错误。' })
        .progress({ v: '75', l: '项目进度 75%' })
      .end();

      // 错误处理说明
      b.card({ tt: '错误处理机制说明' })
        .p('当渲染过程中发生错误时，TokUI 会进行如下处理：')
        .ul()
          .i('捕获单个组件的渲染异常，阻止错误向上传播')
          .i('在出错位置显示友好的降级 UI（错误提示卡片）')
          .i('其他组件继续正常渲染，不受影响')
          .i('错误信息包含组件类型和错误原因，便于调试')
        .end()
      .end();

      // 模拟错误场景
      b.card({ tt: '常见错误场景' })
        .h3('1. 未注册的组件类型')
        .p('如果使用了未注册的组件类型（如 [unknown-comp]），渲染器会优雅降级，显示占位提示。')
        .callout({ t: 'warning', tt: '降级策略', tx: '未识别的组件会被渲染为带虚线边框的占位区域，显示组件类型名称。' })
        .h3('2. 属性解析错误')
        .p('DSL 中属性格式不正确时，解析器会尽可能容错，跳过无效属性而非崩溃。')
        .callout({ t: 'info', tt: '容错原则', tx: '宽松解析，严格渲染。解析阶段尽可能接受输入，渲染阶段安全降级。' })
        .h3('3. 嵌套层级过深')
        .p('过深的组件嵌套会被栈深度检测机制拦截，避免无限递归。')
      .end();

      // 安全机制
      b.card({ tt: '安全机制' })
        .p('TokUI 的安全防线：')
        .table({ stripe: true })
          .theadCols('机制,说明,触发条件')
          .tbody()
            .row('try-catch 包裹', '每个组件渲染独立 try-catch', '单个组件渲染出错')
            .row('降级 UI', '显示错误提示替代崩溃', '组件渲染失败')
            .row('事件隔离', '事件处理器为命名引用', '防止代码注入')
            .row('HTML 转义', '非 md 组件使用 textContent', '防止 XSS 攻击')
            .row('栈深度检测', '限制最大嵌套层级', '防止无限递归')
          .end()
        .end()
      .end();

      // 最佳实践
      b.card({ tt: '最佳实践' })
        .callout({ t: 'success', tt: '推荐做法', tx: '注册组件时确保 renderFn 返回有效的 HTMLElement。使用 data-tokui-clk 绑定预注册的事件处理器，而非内联代码。' })
        .p()
        .callout({ t: 'error', tt: '避免做法', tx: '不要在 renderFn 中执行可能抛出未捕获异常的异步操作。不要使用 innerHTML 渲染用户输入（md 组件除外）。' })
      .end();

      return b;
    }
  },

  // ========== AI 对话高级组件演示 ==========

  // --- 独立组件 Demo ---

  {
    trigger: 'demo-tool-call',
    title: 'Tool Call 工具调用',
    desc: 'AI 工具调用可视化，5 种状态',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '⏳ Pending 等待中' })
        .p('工具调用已发起，等待执行：')
        ._open('tool-call', { name: 'web_search', status: 'pending' })
          .p('查询参数: { q: "最新AI技术趋势" }')
        .end()
      .end();

      b.card({ tt: '🔄 Running 运行中' })
        .p('正在调用外部 API：')
        ._open('tool-call', { name: 'get_weather', status: 'running', duration: '1.5s' })
          .p('API: /v1/weather?city=北京&unit=celsius')
        .end()
        ._selfClosing('typing', null, { text: '正在获取数据...' })
      .end();

      b.card({ tt: '✅ Done 完成' })
        .p('调用成功并返回结果：')
        ._open('tool-call', { name: 'read_file', status: 'done', duration: '0.3s' })
          .p('读取: src/index.js')
          ._selfClosing('p', '返回 120 行代码，识别到 3 个导出函数')
        .end()
      .end();

      b.card({ tt: '❌ Error 出错' })
        .p('调用失败，展示错误信息：')
        ._open('tool-call', { name: 'exec_sql', status: 'error', duration: '1.2s' })
          .p('SQL: SELECT * FROM users WHERE role = "admin"')
        .end()
      .end();

      b.card({ tt: '🚫 Denied 已拒绝' })
        .p('用户拒绝了工具执行请求：')
        ._open('tool-call', { name: 'delete_file', status: 'denied' })
          .p('目标: /etc/passwd — 用户拒绝了此危险操作')
        .end()
      .end();

      b.card({ tt: '🔗 多工具调用组合' })
        .p('AI 同时调用多个工具的真实场景：')
        ._open('tool-call', { name: 'file_search', status: 'done', duration: '0.8s' })
          .p('搜索: "authentication" → 找到 5 个相关文件')
        .end()
        ._open('tool-call', { name: 'code_analyze', status: 'running', duration: '2.1s' })
          .p('正在分析 auth.js 的代码质量...')
        .end()
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-typing',
    title: 'Typing 打字指示器',
    desc: 'AI 等待动画，带/不带文字标签',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '基础打字动画' })
        .p('三种等待状态指示：')
        ._selfClosing('typing')
        .p('')
        ._selfClosing('typing', null, { text: '思考中...' })
        .p('')
        ._selfClosing('typing', null, { text: '搜索中...' })
      .end();

      b.card({ tt: '对话场景中的使用' })
        ._open('bubble', { role: 'user', time: '14:30' })
          .p('请帮我分析这段代码的性能问题')
        .end()
        ._selfClosing('typing', null, { text: 'AI 正在分析...' })
      .end();

      b.card({ tt: '搭配消息组合' })
        ._open('bubble', { role: 'user', time: '14:32' })
          .p('写一个排序算法')
        .end()
        ._open('bubble', { role: 'ai', model: 'GPT-4', time: '14:32' })
          .think({ tt: '分析需求', open: true })
            .p('用户需要排序算法，考虑以下场景...')
          .end()
          ._selfClosing('typing', null, { text: '正在生成代码...' })
        .end()
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-quick-reply',
    title: 'Quick Reply 快捷回复',
    desc: '一键回复建议，支持逗号分隔和容器模式',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '基础快捷回复' })
        .p('点击即可快速回复：')
        ._selfClosing('quick-reply', null, { items: '翻译成英文,总结要点,继续生成,换个思路' })
      .end();

      b.card({ tt: '短选项模式' })
        ._selfClosing('quick-reply', null, { items: '👍 好的,👎 不好,🔄 重试,📋 复制' })
      .end();

      b.card({ tt: '单行简洁选项' })
        ._selfClosing('quick-reply', null, { items: '是,否,也许' })
      .end();

      b.card({ tt: '对话场景' })
        ._open('bubble', { role: 'ai', time: '14:35' })
          .p('我已经为你完成了代码重构。你想让我接下来做什么？')
        .end()
        ._selfClosing('quick-reply', null, { items: '运行测试,查看 diff,提交代码,解释改动' })
      .end();

      b.card({ tt: '引导式对话' })
        ._open('bubble', { role: 'ai', time: '14:36' })
          .p('你好！我是你的 AI 助手，请问有什么可以帮你？')
        .end()
        ._selfClosing('quick-reply', null, { items: '📝 写代码,🔍 查Bug,📖 解释代码,🏗 重构项目' })
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-suggestions',
    title: 'Suggestions 提示建议卡片',
    desc: '富文本提示建议卡片，CSS Grid 布局，支持可配置列数',
    build() {
      const b = new TokUIBuilder();

      // 1. 基础用法：3列
      b.card({ tt: '基础用法 — 3列网格' })
        .p('每个建议卡片包含标题和描述，适合AI对话中的提示推荐：')
        .suggestions({ cols: '3', clk: 'usePrompt' })
          .suggestion({ tt: '帮我写一个用户认证模块', tx: '包含登录、注册、JWT', clk: 'auth' })
          .suggestion({ tt: '解释 React Hooks', tx: 'useState 和 useEffect 的区别', clk: 'hooks' })
          .suggestion({ tt: '设计数据库 Schema', tx: '用户、订单、商品表设计', clk: 'db' })
        .end()
      .end();

      // 2. 2列（默认）
      b.card({ tt: '2列布局（默认）' })
        .suggestions({ clk: 'usePrompt' })
          .suggestion({ tt: '生成单元测试', tx: '为当前函数生成 Jest 测试用例', clk: 'test' })
          .suggestion({ tt: '优化性能', tx: '分析并优化代码中的性能瓶颈', clk: 'perf' })
        .end()
      .end();

      // 3. 带图标
      b.card({ tt: '带图标的建议卡片' })
        .suggestions({ cols: '3' })
          .suggestion({ tt: '写代码', tx: '生成新的功能代码', icon: '✍', clk: 'code' })
          .suggestion({ tt: '查Bug', tx: '分析并修复错误', icon: '🔍', clk: 'bug' })
          .suggestion({ tt: '解释代码', tx: '逐行解释代码逻辑', icon: '📖', clk: 'explain' })
        .end()
      .end();

      // 4. 4列紧凑
      b.card({ tt: '4列紧凑布局' })
        .suggestions({ cols: '4' })
          .suggestion({ tt: '翻译', tx: '翻译为英文', clk: 'trans' })
          .suggestion({ tt: '总结', tx: '总结要点', clk: 'sum' })
          .suggestion({ tt: '续写', tx: '继续生成内容', clk: 'cont' })
          .suggestion({ tt: '换思路', tx: '换个角度思考', clk: 'pivot' })
        .end()
      .end();

      // 5. 对话场景
      b.card({ tt: 'AI对话场景' })
        ._open('bubble', { role: 'ai', time: '14:30' })
          .p('你好！我是你的 AI 编程助手。你可以选择以下任务开始：')
        .end()
        .suggestions({ cols: '2', clk: 'usePrompt' })
          .suggestion({ tt: '🚀 快速开始一个新项目', tx: '选择技术栈、初始化项目结构', clk: 'new-proj' })
          .suggestion({ tt: '🐛 调试一个现有问题', tx: '粘贴错误信息，我来帮你排查', clk: 'debug' })
          .suggestion({ tt: '📝 代码审查', tx: '提交代码片段，获取改进建议', clk: 'review' })
          .suggestion({ tt: '📚 学习一个新概念', tx: '告诉我你想了解什么，我用示例讲解', clk: 'learn' })
        .end()
      .end();

      // 6. 单列
      b.card({ tt: '单列布局 (cols:1)' })
        .suggestions({ cols: '1' })
          .suggestion({ tt: '帮我规划一个电商系统的微服务架构', tx: '包含用户服务、商品服务、订单服务、支付服务', clk: 'arch' })
          .suggestion({ tt: '编写一个完整的 REST API 文档', tx: '使用 OpenAPI 3.0 规范，包含所有端点', clk: 'api' })
        .end()
      .end();

      return b;
    }
  },

  {
    trigger: 'demo-source',
    title: 'Source 引用来源',
    desc: 'RAG 引用卡片，编号+标题+摘要+链接',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '基础引用来源' })
        .p('AI 回答中引用的信息来源：')
        ._selfClosing('source', null, { n: '1', u: 'https://react.dev/learn', tt: 'React 官方文档 - Quick Start', sn: 'React lets you build user interfaces out of individual pieces called components. Create your first React app.' })
        ._selfClosing('source', null, { n: '2', u: 'https://developer.mozilla.org', tt: 'MDN Web Docs - JavaScript Array', sn: 'The Array object enables storing a collection of multiple items under a single variable name.' })
      .end();

      b.card({ tt: '无链接来源（内部知识）' })
        ._selfClosing('source', null, { n: '1', tt: '内部知识库 - API 规范 v2.0', sn: '根据最新接口规范，所有请求需携带 Authorization header 并使用 Bearer token 认证。' })
        ._selfClosing('source', null, { n: '2', tt: '公司技术博客 - 微服务架构实践', sn: '在微服务架构中，服务间通信推荐使用 gRPC 协议，相比 REST 有 3-5 倍性能提升。' })
      .end();

      b.card({ tt: 'RAG 对话场景' })
        ._open('bubble', { role: 'user', time: '14:40' })
          .p('React 的 useEffect 怎么正确使用？')
        .end()
        ._open('bubble', { role: 'ai', model: 'GPT-4', time: '14:40' })
          .p('useEffect 是 React 中处理副作用的 Hook。核心要点：')
          .callout({ t: 'info', tx: '依赖数组控制执行时机：空数组 [] 只在挂载时执行，省略则每次渲染都执行。' })
          ._selfClosing('source', null, { n: '1', u: 'https://react.dev/reference/react/useEffect', tt: 'React useEffect API Reference', sn: 'useEffect is a React Hook that lets you synchronize a component with an external system.' })
          ._selfClosing('source', null, { n: '2', u: 'https://react.dev/learn/synchronizing-with-effects', tt: 'Synchronizing with Effects', sn: 'Effects let you run some code after rendering so you can synchronize your component with something outside of React.' })
        .end()
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-diff',
    title: 'Diff 代码差异',
    desc: 'AI 修改代码的差异对比视图',
    build() {
      const b = new TokUIBuilder();
      return b;
    },
    extraChunks() {
      return [
        '[card tt:"基础差异展示"]',
        '[p AI 修改代码前后的对比：]',
        { _wait: 500 },
        '[diff lang:js title:"修复空指针问题"]- const user = data.user.name;\n- console.log(user);\n+ const user = data?.user?.name || "未知用户";\n+ if (!data?.user) {\n+   console.warn("用户数据缺失");\n+   return;\n+ }\n  console.log(user);[/diff]',
        '[/card]'
      ];
    }
  },

  {
    trigger: 'demo-diff-variants',
    title: 'Diff 多场景',
    desc: '多种语言和场景的 diff 展示',
    build() {
      const b = new TokUIBuilder();
      return b;
    },
    extraChunks() {
      return [
        '[card tt:"CSS 样式修改"]',
        { _wait: 300 },
        '[diff lang:css title:"theme.css"]- .header { background: #333; }\n- .header { color: white; }\n+ .header {\n+   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n+   color: white;\n+   padding: 16px 24px;\n+ }\n  .header a { text-decoration: none; }[/diff]',
        '[/card]',
        { _wait: 500 },
        '[card tt:"Python 重构"]',
        '[diff lang:py title:"utils/processor.py"]- def process(data):\n-     result = []\n-     for item in data:\n-         if item != None:\n-             result.append(item)\n-     return result\n+ def process(data: list) -> list:\n+     """Filter out None values from data."""\n+     return [item for item in data if item is not None]\n  \n  def validate(input):[/diff]',
        '[/card]'
      ];
    }
  },

  {
    trigger: 'demo-plan',
    title: 'Plan 任务计划',
    desc: 'AI Agent 执行计划可视化',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '完整执行计划' })
        .p('AI Agent 的任务分解与执行进度：')
        ._open('plan', { tt: '重构认证模块' })
          ._selfClosing('plan-step', null, { status: 'done', tt: '分析现有代码', desc: '已读取 src/utils/auth.js (120行)' })
          ._selfClosing('plan-step', null, { status: 'done', tt: '设计方案', desc: '基于 session 的认证流程' })
          ._selfClosing('plan-step', null, { status: 'doing', tt: '编写实现代码', desc: '正在修改 auth.js 和 session.js' })
          ._selfClosing('plan-step', null, { status: 'pending', tt: '编写单元测试' })
          ._selfClosing('plan-step', null, { status: 'pending', tt: '集成测试验证' })
          ._selfClosing('plan-step', null, { status: 'pending', tt: '更新项目文档' })
        .end()
      .end();

      b.card({ tt: '已完成计划' })
        ._open('plan', { tt: '数据库迁移方案' })
          ._selfClosing('plan-step', null, { status: 'done', tt: '备份数据库' })
          ._selfClosing('plan-step', null, { status: 'done', tt: '创建迁移脚本' })
          ._selfClosing('plan-step', null, { status: 'done', tt: '执行迁移' })
          ._selfClosing('plan-step', null, { status: 'done', tt: '验证数据完整性' })
        .end()
      .end();

      b.card({ tt: '出错场景' })
        ._open('plan', { tt: '部署到生产环境' })
          ._selfClosing('plan-step', null, { status: 'done', tt: '构建项目' })
          ._selfClosing('plan-step', null, { status: 'done', tt: '运行测试' })
          ._selfClosing('plan-step', null, { status: 'error', tt: '部署服务', desc: '连接超时：部署服务器无响应' })
          ._selfClosing('plan-step', null, { status: 'pending', tt: '健康检查' })
        .end()
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-agent',
    title: 'Agent 状态',
    desc: 'AI Agent 实时执行状态展示',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '5 种状态展示' })
        .p('Agent 各状态的视觉表现：')
        ._selfClosing('agent', null, { name: 'CodeBot', status: 'idle' })
        .p('')
        ._selfClosing('agent', null, { name: 'CodeBot', status: 'running', action: '正在重构 src/utils/auth.js...', duration: '12s' })
        .p('')
        ._selfClosing('agent', null, { name: 'CodeBot', status: 'paused', action: '等待用户确认', duration: '25s' })
        .p('')
        ._selfClosing('agent', null, { name: 'CodeBot', status: 'done', duration: '45s' })
        .p('')
        ._selfClosing('agent', null, { name: 'CodeBot', status: 'error', duration: '3s' })
      .end();

      b.card({ tt: '多 Agent 协作' })
        .p('多个 Agent 同时工作的场景：')
        ._selfClosing('agent', null, { name: 'Researcher', status: 'done', duration: '8s' })
        ._selfClosing('agent', null, { name: 'Coder', status: 'running', action: '编写 API 端点...', duration: '15s' })
        ._selfClosing('agent', null, { name: 'Tester', status: 'idle' })
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-file-tree',
    title: 'File Tree 文件树',
    desc: '项目文件结构展示，可展开折叠',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '项目目录结构' })
        .p('AI 分析项目时的文件结构展示：')
        ._open('file-tree')
          ._open('ft-folder', { name: 'src', open: '' })
            ._open('ft-folder', { name: 'components' })
              ._selfClosing('ft-file', null, { name: 'basic.js', badge: '修改' })
              ._selfClosing('ft-file', null, { name: 'table.js' })
              ._selfClosing('ft-file', null, { name: 'form.js' })
            .end()
            ._open('ft-folder', { name: 'core' })
              ._selfClosing('ft-file', null, { name: 'parser.js' })
              ._selfClosing('ft-file', null, { name: 'renderer.js', badge: '新增' })
              ._selfClosing('ft-file', null, { name: 'event-bus.js' })
            .end()
            ._selfClosing('ft-file', null, { name: 'index.js' })
          .end()
          ._open('ft-folder', { name: 'tests' })
            ._selfClosing('ft-file', null, { name: 'test-parser.js' })
            ._selfClosing('ft-file', null, { name: 'test-basic.js' })
          .end()
          ._selfClosing('ft-file', null, { name: 'package.json' })
          ._selfClosing('ft-file', null, { name: 'README.md' })
        .end()
      .end();

      b.card({ tt: '深度嵌套结构' })
        ._open('file-tree')
          ._open('ft-folder', { name: 'app', open: '' })
            ._open('ft-folder', { name: 'api', open: '' })
              ._open('ft-folder', { name: 'v1' })
                ._selfClosing('ft-file', null, { name: 'users.js', badge: 'M' })
                ._selfClosing('ft-file', null, { name: 'auth.js', badge: 'M' })
              .end()
            .end()
            ._open('ft-folder', { name: 'models' })
              ._selfClosing('ft-file', null, { name: 'user.js' })
              ._selfClosing('ft-file', null, { name: 'session.js', badge: '新增' })
            .end()
          .end()
        .end()
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-terminal',
    title: 'Terminal 终端',
    desc: '命令执行结果展示',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '成功输出' })
        .p('命令执行成功（左边框绿色）：')
        ._open('terminal', { title: 'npm test', status: '0' });
      b.chunks.push('$ npm test\n\n> tokui@1.0.0 test\n> node tests/test-all.js\n\n  ✓ parser (32 tests)\n  ✓ builder (18 tests)\n  ✓ basic (90 tests)\n  ✓ ai-components (54 tests)\n\n  194 passed, 0 failed\n  Duration: 1.8s');
      b.end().end();
      return b;
    },
    extraChunks() {
      return [
        { _wait: 800 },
        '[card tt:"错误输出"]\n[p 命令执行失败（左边框红色）：]',
        { _wait: 300 },
        '[terminal title:"npm run build" status:"1"]$ npm run build\n\n> Building project...\n\nError: Cannot find module \'webpack\'\n    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:636:15)\n    at Function.Module._load (internal/modules/cjs/loader.js:562:25)\n\nnpm ERR! code ELIFECYCLE\nnpm ERR! errno 1[/terminal]\n[/card]'
      ];
    }
  },

  {
    trigger: 'demo-shimmer',
    title: 'Shimmer 闪光加载',
    desc: '流式传输时的加载占位动画',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Text 文本加载' })
        .p('等待文本生成时的占位：')
        ._selfClosing('shimmer', null, { t: 'text', rows: '4' })
      .end();

      b.card({ tt: 'Card 卡片加载' })
        .p('等待卡片内容加载：')
        ._selfClosing('shimmer', null, { t: 'card' })
      .end();

      b.card({ tt: 'Avatar 头像加载' })
        .p('等待头像加载：')
        ._selfClosing('shimmer', null, { t: 'avatar' })
      .end();

      b.card({ tt: 'Code 代码加载' })
        .p('等待代码生成：')
        ._selfClosing('shimmer', null, { t: 'code', rows: '6' })
      .end();

      b.card({ tt: '对比：Skeleton vs Shimmer' })
        .p('Skeleton（页面加载）：')
        ._selfClosing('skeleton', null, { t: 'text', rows: '3' })
        .p('')
        .p('Shimmer（流式加载）：')
        ._selfClosing('shimmer', null, { t: 'text', rows: '3' })
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-thought-chain',
    title: 'ThoughtChain 推理链',
    desc: 'AI 推理过程可视化，支持多步骤状态',
    build() {
      const b = new TokUIBuilder();

      // Scenario 1: Running chain
      b.card({ tt: '进行中的推理链' })
        .thinkChain({ tt: '推理过程', status: 'running', open: true })
          .thinkStep({ status: 'done', tt: '分析问题', dur: '1.2s' })
            .p('理解用户输入，提取关键信息...')
          .end()
          .thinkStep({ status: 'done', tt: '检索知识', dur: '3.5s' })
            .p('在知识库中搜索相关文档和代码示例...')
          .end()
          .thinkStep({ status: 'running', tt: '生成回答' })
            .p('正在组织回答内容...')
          .end()
          .thinkStep({ status: 'pending', tt: '验证结果' })
          .end()
        .end()
      .end();

      // Scenario 2: All done chain
      b.card({ tt: '已完成的推理链' })
        .thinkChain({ tt: '代码分析推理', open: true })
          .thinkStep({ status: 'done', tt: '读取文件', dur: '0.3s' })
            .p('读取 package.json 和 tsconfig.json')
          .end()
          .thinkStep({ status: 'done', tt: '分析依赖', dur: '1.8s' })
            .p('检查依赖版本冲突和安全漏洞')
          .end()
          .thinkStep({ status: 'done', tt: '生成报告', dur: '0.5s' })
            .p('输出分析报告和建议')
          .end()
        .end()
      .end();

      // Scenario 3: Error in chain
      b.card({ tt: '出错的推理链' })
        .thinkChain({ tt: '数据库迁移', open: true })
          .thinkStep({ status: 'done', tt: '备份', dur: '2.1s' })
            .p('数据库备份完成')
          .end()
          .thinkStep({ status: 'done', tt: '检查约束', dur: '0.8s' })
            .p('外键约束检查通过')
          .end()
          .thinkStep({ status: 'error', tt: '执行迁移', dur: '5.0s' })
            .p('迁移失败: column "email" already exists')
          .end()
          .thinkStep({ status: 'pending', tt: '清理' })
          .end()
        .end()
      .end();

      // Scenario 4: Collapsed chain
      b.card({ tt: '折叠的推理链' })
        .thinkChain({ tt: '长篇推理（点击展开）' })
          .thinkStep({ status: 'done', tt: '步骤1', dur: '1.0s' })
            .p('分析中...')
          .end()
          .thinkStep({ status: 'done', tt: '步骤2', dur: '2.0s' })
            .p('推理中...')
          .end()
          .thinkStep({ status: 'done', tt: '步骤3', dur: '1.5s' })
            .p('得出结论...')
          .end()
        .end()
      .end();

      return b;
    }
  },

  {
    trigger: 'demo-latency',
    title: 'Latency 耗时标记',
    desc: 'AI 推理各阶段耗时展示',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '三种耗时类型' })
        .p('思考耗时：')
        ._selfClosing('latency', null, { v: '3.2s', t: 'thinking' })
        .p('')
        .p('生成耗时：')
        ._selfClosing('latency', null, { v: '12.5s', t: 'generating' })
        .p('')
        .p('总耗时：')
        ._selfClosing('latency', null, { v: '15.7s', t: 'total' })
      .end();

      b.card({ tt: '对话中的实际使用' })
        ._open('bubble', { role: 'ai', model: 'Claude Opus', time: '14:45' })
          ._selfClosing('latency', null, { v: '8.3s', t: 'thinking' })
          .p('经过分析，这段代码存在以下问题...')
        .end()
      .end();

      b.card({ tt: '纯耗时值（无类型）' })
        ._selfClosing('latency', null, { v: '150ms' })
        ._selfClosing('latency', null, { v: '2.1s' })
        ._selfClosing('latency', null, { v: '30s' })
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-video',
    title: 'Video 视频播放',
    desc: 'AI 生成的视频内容内嵌播放',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '基础视频播放器' })
        .p('AI 生成的视频内容可直接在对话中播放：')
        ._selfClosing('video', null, { s: 'https://www.w3schools.com/html/mov_bbb.mp4' })
      .end();

      b.card({ tt: '带封面图' })
        ._selfClosing('video', null, { s: 'https://www.w3schools.com/html/mov_bbb.mp4', poster: 'https://www.w3schools.com/html/pic_trulli.jpg' })
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-audio',
    title: 'Audio 音频播放',
    desc: 'TTS 语音回复播放',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '带标题的音频' })
        .p('AI 语音回复：')
        ._selfClosing('audio', null, { s: '', tt: 'AI 语音回复', duration: '0:35' })
      .end();

      b.card({ tt: '对话场景' })
        ._open('bubble', { role: 'user', time: '15:00' })
          .p('这段文字帮我转成语音')
        .end()
        ._open('bubble', { role: 'ai', time: '15:00' })
          .p('已为你生成语音回复：')
          ._selfClosing('audio', null, { s: '', tt: '朗读结果', duration: '1:20' })
        .end()
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-quote',
    title: 'Quote 消息引用',
    desc: '引用之前的消息进行回复',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '引用用户消息' })
        ._selfClosing('quote', null, { tx: '请帮我重构 auth.js 中的 token 验证逻辑', role: 'user' })
        .p('好的，我来帮你重构 token 验证部分。建议使用 JWT 替代 session 方案。')
      .end();

      b.card({ tt: '引用 AI 消息' })
        ._selfClosing('quote', null, { tx: '建议使用 JWT 替代 session 方案...', role: 'ai' })
        .p('补充一点：JWT 需要配合 refresh token 使用，避免用户频繁重新登录。')
      .end();

      b.card({ tt: '对话场景' })
        ._open('bubble', { role: 'user', time: '15:10' })
          .p('上一个方案有什么问题？')
        .end()
        ._open('bubble', { role: 'ai', time: '15:10' })
          ._selfClosing('quote', null, { tx: '建议使用 JWT 替代 session 方案', role: 'ai' })
          .p('主要问题是 JWT 无法主动失效。解决方案：')
          ._open('list')
            ._selfClosing('item', null, { tx: '引入 token 黑名单机制' })
            ._selfClosing('item', null, { tx: '设置较短的 access token 有效期' })
            ._selfClosing('item', null, { tx: '使用 refresh token 自动续期' })
          .end()
        .end()
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-attachments',
    title: 'Attachments 附件区域',
    desc: '文件附件区域组件：多类型文件展示',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'Attachments 附件区域' })
        .h3('AI 对话附件')
        .p('附件区域用于在聊天消息中展示关联文件，支持图片缩略图和类型图标：')
        .attachments({ clk: 'removeAttachment' })
          .attach({ t: 'image', s: 'photo.png', u: 'https://picsum.photos/seed/att1/400/300', size: '2.4MB' })
          .attach({ t: 'pdf', s: 'report.pdf', u: '/files/report.pdf', size: '1.1MB', clk: 'downloadPdf' })
          .attach({ t: 'code', s: 'main.js', u: '/files/main.js', size: '12KB' })
        .end()
      .end();

      b.card({ tt: '多类型文件附件' })
        .h3('各类文件类型')
        .attachments({ clk: 'removeFile' })
          .attach({ t: 'pdf', s: '合同文件.pdf', u: '/files/contract.pdf', size: '3.2MB' })
          .attach({ t: 'word', s: '会议纪要.docx', u: '/files/minutes.docx', size: '856KB' })
          .attach({ t: 'excel', s: '销售数据.xlsx', u: '/files/sales.xlsx', size: '1.5MB' })
          .attach({ t: 'ppt', s: '季度汇报.pptx', u: '/files/report.pptx', size: '5.8MB' })
          .attach({ t: 'zip', s: '源代码.zip', u: '/files/source.zip', size: '12.5MB' })
          .attach({ t: 'video', s: '演示视频.mp4', u: '/files/demo.mp4', size: '45MB' })
          .attach({ t: 'audio', s: '录音文件.mp3', u: '/files/audio.mp3', size: '8.2MB' })
          .attach({ t: 'image', s: '截图.png', u: 'https://picsum.photos/seed/att2/400/300', size: '320KB' })
          .attach({ s: 'readme.txt', u: '/files/readme.txt', size: '2.1KB' })
        .end()
      .end();

      b.card({ tt: 'AI 场景：分析报告' })
        .bubble({ role: 'ai' })
          .p('我已经完成了用户行为分析，以下是生成的报告文件：')
          .attachments({ clk: 'removeReportFile' })
            .attach({ t: 'pdf', s: '用户行为分析报告.pdf', u: '/files/report.pdf', size: '3.2MB', clk: 'downloadReport' })
            .attach({ t: 'excel', s: '原始数据.xlsx', u: '/files/data.xlsx', size: '856KB' })
            .attach({ t: 'image', s: '趋势图.png', u: 'https://picsum.photos/seed/chart1/400/300', size: '150KB' })
          .end()
        .end()
      .end();

      return b;
    }
  },

  {
    trigger: 'demo-sandbox',
    title: 'Sandbox 代码沙盒',
    desc: 'AI 生成的前端代码实时预览',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: 'HTML 实时预览' })
        .p('AI 生成的按钮组件：')
        ._open('sandbox', { lang: 'html', title: 'Button Component', height: '100' });
      b.chunks.push('<style>body{font-family:sans-serif;display:flex;gap:8px;padding:16px;justify-content:center;align-items:center;background:#f8f9fa;}</style><button style="padding:10px 24px;border:none;border-radius:8px;background:#4f46e5;color:#fff;cursor:pointer;font-size:14px;box-shadow:0 2px 4px rgba(79,70,229,0.3);">Primary</button><button style="padding:10px 24px;border:1px solid #4f46e5;border-radius:8px;background:#fff;color:#4f46e5;cursor:pointer;font-size:14px;">Secondary</button><button style="padding:10px 24px;border:none;border-radius:8px;background:#ef4444;color:#fff;cursor:pointer;font-size:14px;">Danger</button>');
      b.end()
      .end();

      b.card({ tt: 'CSS 动画预览' })
        .p('脉冲动画效果：')
        ._open('sandbox', { lang: 'html', title: 'CSS Animation', height: '120' });
      b.chunks.push('<style>@keyframes pulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.2);opacity:0.7;}}body{display:flex;justify-content:center;align-items:center;height:80px;background:#f0f0f0;}.dot{width:16px;height:16px;border-radius:50%;background:#4f46e5;margin:0 6px;animation:pulse 1.4s ease-in-out infinite;}.dot:nth-child(2){animation-delay:0.2s;}.dot:nth-child(3){animation-delay:0.4s;}</style><div class="dot"></div><div class="dot"></div><div class="dot"></div>');
      b.end()
      .end();

      b.card({ tt: '交互式组件预览' })
        .p('带交互逻辑的组件实时预览：')
        ._open('sandbox', { lang: 'html', title: 'Interactive Component', height: '140' });
      b.chunks.push('<style>body{font-family:sans-serif;padding:16px;background:#f8f9fa;display:flex;flex-direction:column;align-items:center;gap:12px;}.counter{display:flex;align-items:center;gap:12px;}.counter button{width:36px;height:36px;border-radius:50%;border:2px solid #4f46e5;background:#fff;color:#4f46e5;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;}.counter button:hover{background:#4f46e5;color:#fff;}.count{font-size:32px;font-weight:bold;color:#4f46e5;min-width:48px;text-align:center;}.msg{font-size:13px;color:#6b7280;}</style><div class="counter"><button onclick="update(-1)">-</button><span class="count" id="c">0</span><button onclick="update(1)">+</button></div><div class="msg" id="m">点击按钮计数</div><script>var n=0;function update(d){n+=d;document.getElementById("c").textContent=n;document.getElementById("m").textContent=n===0?"点击按钮计数":n>0?"当前值: +"+n:"当前值: "+n;}</script>');
      b.end()
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-commit',
    title: 'Commit 提交信息',
    desc: 'Git 提交格式化展示',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '完整提交信息' })
        ._selfClosing('commit', null, { hash: 'abc12345def67890', msg: 'feat: add AI chat components with tool-call and diff support', author: 'CodeBot', branch: 'feature/ai-components', time: '2 分钟前', additions: '245', deletions: '32' })
      .end();

      b.card({ tt: '修复提交' })
        ._selfClosing('commit', null, { hash: '789abc123def456', msg: 'fix: resolve token refresh race condition in auth middleware', author: 'CodeBot', branch: 'fix/auth-refresh', time: '5 分钟前', additions: '18', deletions: '7' })
      .end();

      b.card({ tt: '重构提交' })
        ._selfClosing('commit', null, { hash: 'def456789abc012', msg: 'refactor: extract shared validation logic into utils', author: 'DevBot', branch: 'main', time: '1 小时前', additions: '120', deletions: '85' })
      .end();

      b.card({ tt: '最少信息' })
        ._selfClosing('commit', null, { hash: 'fff111222333', msg: 'chore: update dependencies' })
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-test-result',
    title: 'Test Result 测试结果',
    desc: 'AI 编写的测试运行结果展示',
    build() {
      const b = new TokUIBuilder();
      b.card({ tt: '全部通过' })
        ._open('test-result', { pass: '15', fail: '0', skip: '0', total: '15', duration: '2.1s' })
          ._selfClosing('test-case', null, { name: 'auth/token.test.js', status: 'pass', duration: '0.1s' })
          ._selfClosing('test-case', null, { name: 'auth/session.test.js', status: 'pass', duration: '0.2s' })
          ._selfClosing('test-case', null, { name: 'auth/refresh.test.js', status: 'pass', duration: '0.3s' })
        .end()
      .end();

      b.card({ tt: '部分失败' })
        .p('有失败用例时展示错误详情：')
        ._open('test-result', { pass: '12', fail: '1', skip: '2', total: '15', duration: '3.2s' })
          ._selfClosing('test-case', null, { name: 'auth/token.test.js', status: 'pass', duration: '0.1s' })
          ._selfClosing('test-case', null, { name: 'auth/session.test.js', status: 'pass', duration: '0.2s' })
          ._selfClosing('test-case', null, { name: 'auth/refresh.test.js', status: 'fail', duration: '0.5s', error: 'Expected session to refresh but got stale token\n  at Object.<anonymous> (auth/refresh.test.js:45:12)' })
          ._selfClosing('test-case', null, { name: 'auth/logout.test.js', status: 'skip' })
          ._selfClosing('test-case', null, { name: 'auth/middleware.test.js', status: 'skip' })
        .end()
      .end();
      return b;
    }
  },

  {
    trigger: 'demo-conversations',
    title: 'Conversations 会话列表',
    desc: '会话列表/时间分组/激活/删除',
    build() {
      const b = new TokUIBuilder();

      // 场景1: 基础用法 - 带时间分组
      b.card({ tt: 'Conversations 会话列表' })
        .p('支持时间自动分组、激活状态、悬浮删除：')
        ._open('row', {})
          ._open('col', { span: 6 })
            .p('基础用法（多分组）:')
            ._open('conversations', { clk: 'onConvSelect' })
              .conv({ tt: '帮我优化 React 性能', time: '10:30' })
              .conv({ tt: 'Node.js 内存泄漏排查', time: '09:15' })
              .conv({ tt: 'TypeScript 泛型使用技巧', time: '昨天' })
              .conv({ tt: 'WebSocket 断线重连方案', time: '昨天' })
              .conv({ tt: 'CSS Grid 布局实战', time: '3天前' })
              .conv({ tt: 'Webpack 打包优化', time: '上周' })
            .end()
          .end()
          ._open('col', { span: 6 })
            .p('默认激活项:')
            ._open('conversations', {})
              .conv({ tt: 'API 设计最佳实践', time: '14:00' })
              .conv({ tt: '微服务架构选型对比', time: '11:30', active: true })
              .conv({ tt: 'GraphQL vs REST 讨论', time: '08:45' })
            .end()
          .end()
        .end()
      .end();

      // 场景2: 今天内（无分组头）
      b.card({ tt: '无分组模式' })
        .p('所有会话时间均为今天时，不显示分组标题：')
        ._open('conversations', {})
          .conv({ tt: '代码审查: PR #128', time: '16:20' })
          .conv({ tt: '部署流程优化讨论', time: '15:00' })
          .conv({ tt: '新功能需求评审', time: '13:10' })
        .end()
      .end();

      return b;
    }
  },

  {
    trigger: 'demo-ai-advanced',
    title: '高级AI组件',
    desc: 'video/audio/quote/sandbox/commit/test-result',
    build() {
      const b = new TokUIBuilder();

      b.card({ tt: '🎬 Video 视频播放器' })
        .p('AI 生成的视频内容内嵌播放：')
        ._selfClosing('video', null, { s: 'https://www.w3schools.com/html/mov_bbb.mp4', poster: '' })
      .end();

      b.card({ tt: '🔊 Audio 音频播放器' })
        .p('TTS 语音回复展示：')
        ._selfClosing('audio', null, { s: '', tt: 'AI 语音回复', duration: '0:35' })
      .end();

      b.card({ tt: '💬 Quote 消息引用' })
        .p('引用之前的消息进行回复：')
        ._selfClosing('quote', null, { tx: '请帮我重构 auth.js 中的 token 验证逻辑', role: 'user' })
        .p('')
        ._open('quote', { role: 'ai' })
          .p('好的，我来帮你重构。这是我的方案...')
        .end()
      .end();

      b.card({ tt: '🖼 Sandbox 代码沙盒' })
        .p('AI 生成的前端代码实时预览：')
        ._open('sandbox', { lang: 'html', title: 'Button Preview', height: '100' })
        .end()
      .end();

      b.card({ tt: '📦 Commit Git 提交' })
        .p('代码变更提交信息展示：')
        ._selfClosing('commit', null, { hash: 'abc12345def', msg: 'feat: add AI chat components', author: 'CodeBot', branch: 'main', time: '2 分钟前', additions: '245', deletions: '32' })
        .p('')
        ._selfClosing('commit', null, { hash: '789abc123', msg: 'fix: resolve token refresh race condition', author: 'CodeBot', branch: 'fix/auth-refresh', time: '5 分钟前', additions: '18', deletions: '7' })
      .end();

      b.card({ tt: '🧪 Test Result 测试结果' })
        .p('AI 编写的测试运行结果展示：')
        ._open('test-result', { pass: '12', fail: '1', skip: '2', total: '15', duration: '3.2s' })
          ._selfClosing('test-case', null, { name: 'auth/token.test.js', status: 'pass', duration: '0.1s' })
          ._selfClosing('test-case', null, { name: 'auth/session.test.js', status: 'pass', duration: '0.2s' })
          ._selfClosing('test-case', null, { name: 'auth/refresh.test.js', status: 'fail', duration: '0.5s', error: 'Expected session to refresh but got stale token' })
          ._selfClosing('test-case', null, { name: 'auth/logout.test.js', status: 'skip' })
        .end()
      .end();

      return b;
    },
    extraChunks() {
      return [
        { _wait: 1000 },
        '[sandbox lang:html title:"Button Preview" height:"100"]<style>body{font-family:sans-serif;display:flex;gap:8px;padding:16px;justify-content:center;align-items:center;}</style><button style="padding:8px 20px;border:none;border-radius:6px;background:#4f46e5;color:#fff;cursor:pointer;font-size:14px;">Click Me</button><button style="padding:8px 20px;border:1px solid #4f46e5;border-radius:6px;background:#fff;color:#4f46e5;cursor:pointer;font-size:14px;">Secondary</button>[/sandbox]'
      ];
    }
  },
  {
    trigger: 'demo-artifact',
    title: 'Artifact 代码预览',
    desc: '侧边面板代码预览，支持代码/预览切换和拖拽调整',
    build() {
      const b = new TokUIBuilder();

      b.card({ tt: 'Artifact — React 组件预览' })
        .p('Artifact 组件提供侧边面板预览，支持 Code/Preview 切换、拖拽调整宽度和关闭按钮。')
        ._open('artifact', { tt: 'React 计数器', lang: 'jsx', pos: 'right', w: '50' })
          ._open('artifact-code', {});
      b.chunks.push('function Counter() {\n  const [count, setCount] = React.useState(0);\n  return (\n    <div style={{ padding: 20, textAlign: "center" }}>\n      <h1>Count: {count}</h1>\n      <button onClick={() => setCount(count + 1)}>+1</button>\n      <button onClick={() => setCount(count - 1)}>-1</button>\n      <button onClick={() => setCount(0)}>Reset</button>\n    </div>\n  );\n}\n\nReactDOM.render(<Counter />, document.getElementById("root"));');
      b.end();
      b._open('artifact-preview', {});
      b.end()
        .end() // close artifact
      .end() // close card

      b.card({ tt: 'Artifact — HTML 预览' })
        .p('当 lang 设为 html 时，Preview 标签页会直接渲染 iframe 沙盒。')
        ._open('artifact', { tt: 'HTML 按钮预览', lang: 'html', pos: 'right', w: '60' })
          ._open('artifact-code', {});
      b.chunks.push('<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; display: flex; gap: 8px; padding: 16px; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8f9fa; }\n    .btn { padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; transition: transform 0.1s; }\n    .btn:hover { transform: scale(1.05); }\n    .btn-primary { background: #4f46e5; color: white; }\n    .btn-outline { background: white; color: #4f46e5; border: 2px solid #4f46e5; }\n    .btn-danger { background: #ef4444; color: white; }\n  </style>\n</head>\n<body>\n  <button class="btn btn-primary">Primary</button>\n  <button class="btn btn-outline">Outline</button>\n  <button class="btn btn-danger">Danger</button>\n</body>\n</html>');
      b.end();
      b._open('artifact-preview', {});
      b.end()
        .end() // close artifact
      .end(); // close card

      return b;
    }
  },
  {
    trigger: 'demo-resizable',
    title: 'Resizable 分割面板',
    desc: '可拖拽分割线调整面板大小，支持水平/垂直方向',
    build() {
      const b = new TokUIBuilder();
      b.h2('Resizable 分割面板')
        .p('拖拽分割手柄调整面板大小，支持水平/垂直方向，支持触摸和键盘操作。')
        .h3('水平分割')
        .resizable({ dir: 'h', 'default': 250, min: 100, max: 500 })
          .card({ tt: 'Left Panel' })
            .p('This is the left panel. Drag the handle to resize.')
            .btn({ tx: 'Button' })
          .end()
          .card({ tt: 'Right Panel' })
            .p('This is the right panel with more content.')
            .p('Lorem ipsum dolor sit amet.')
            .input({ ph: 'Type here...' })
          .end()
        .end()
        .h3('垂直分割')
        .resizable({ dir: 'v', 'default': 150, min: 80, max: 400 })
          .callout({ t: 'info', tx: 'Top panel - drag down to expand' })
          .card({ tt: 'Bottom panel' })
            .p('Content in the bottom section.')
            .progress({ t: 'circle', v: 65 })
          .end()
        .end()
        .h3('嵌套分割')
        .resizable({ dir: 'h', 'default': 200 })
          .p('Left: navigation or sidebar content')
          .resizable({ dir: 'v', 'default': 150 })
            .callout({ t: 'success', tx: 'Top right area' })
            .p('Bottom right area with details')
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-canvas',
    title: 'Canvas 侧边预览面板',
    desc: '侧滑面板用于实时内容预览，支持左右位置和展开折叠',
    build() {
      const b = new TokUIBuilder();
      b.h2('Canvas 侧边预览面板')
        .p('Canvas 组件提供侧滑面板，默认折叠只显示侧边标签，点击标签展开内容，支持左右位置。')
        .h3('右侧面板（点击侧边标签展开）')
        .canvas({ tt: 'Live Preview', w: 350 })
          .canvasContent({})
            .card({ tt: 'Preview Card' })
              .p('This content appears in the side panel.')
              .btn({ tx: 'Action', v: 'primary' })
            .end()
            .img({ s: 'https://picsum.photos/300/200', w: 300 })
          .end()
        .end()
        .h3('左侧面板（点击侧边标签展开）')
        .canvas({ tt: 'Details', pos: 'left', w: 300 })
          .canvasContent({})
            .callout({ t: 'info', tx: 'This panel slides in from the left' })
            .p('Some detailed information here.')
          .end()
        .end()
        .h3('表单面板（点击侧边标签展开）')
        .canvas({ tt: 'Settings', w: 320 })
          .canvasContent({})
            .input({ n: 'username', ph: 'Username' })
            .select({ n: 'theme' })
              .opt({ v: 'dark', tx: 'Dark' })
              .opt({ v: 'light', tx: 'Light' })
            .end()
            .btn({ tx: 'Save', v: 'primary' })
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'demo-command',
    title: 'Command 命令面板',
    desc: '命令面板 / 搜索过滤 / 键盘导航（按钮唤起）',
    build() {
      const b = new TokUIBuilder();
      b.h2('Command 命令面板')
        .p('点击按钮打开命令面板，输入关键词搜索，方向键导航，回车选中，Esc 关闭。命令项用 [item]（command-group 内等价于 command-item）。同一页面可有多个命令面板，各自独立、按按钮唤起，互不冲突。')
        .h3('基础命令面板')
        .btn({ tx: '⌘ 打开命令面板', clk: 'openCommand', 'data-target': 'cmdMain', v: 'primary' })
        .command({ ph: '搜索命令...', id: 'cmdMain' })
          .commandGroup({ tt: '操作' })
            .item({ tx: '新建对话', clk: 'newChat', shortcut: 'Ctrl+N' })
            .item({ tx: '清空历史', clk: 'clearHistory' })
            .item({ tx: '导出对话', clk: 'exportChat' })
          .end()
          .commandGroup({ tt: '导航' })
            .item({ tx: '回到首页', clk: 'goHome' })
            .item({ tx: '用户设置', clk: 'goSettings' })
            .item({ tx: '帮助中心', clk: 'goHelp' })
          .end()
          .commandGroup({ tt: '外观' })
            .item({ tx: '切换主题', clk: 'toggleTheme', shortcut: 'Ctrl+T' })
            .item({ tx: '切换语言', clk: 'toggleLang' })
            .item({ tx: '全屏模式', clk: 'toggleFullscreen', shortcut: 'F11' })
          .end()
        .end()
        .h3('迷你命令面板')
        .btn({ tx: '打开工具搜索', clk: 'openCommand', 'data-target': 'cmdMini' })
        .command({ ph: '输入工具名称...', id: 'cmdMini' })
          .commandGroup({ tt: '开发工具' })
            .item({ tx: '终端', clk: 'toolTerminal', shortcut: 'Ctrl+`' })
            .item({ tx: '文件搜索', clk: 'toolSearch', shortcut: 'Ctrl+P' })
            .item({ tx: 'Git 管理', clk: 'toolGit' })
          .end()
        .end();
      return b;
    }
  },
  // ========================================
  // 报告类生成
  // ========================================
  {
    trigger: 'report-blood',
    title: '血常规检测报告',
    desc: '专业医学检验报告布局',
    build() {
      var b = new TokUIBuilder();

      // 标题区
      b.h2('北京协和医院', { v: 'center' })
        .h3('血常规检验报告', { v: 'underline', bg: 'primary' })
        .p('报告编号：BLR-2024-06-09-00382    标本编号：SP-20240609-0857', { v: 'muted,center' });

      // 打印按钮
      b.toolbar({ pos: 'top', align: 'right' })
        .btn({ tx: '🖨 打印报告', clk: 'printReport', v: 'primary,sm' })
      .end();

      // 患者信息
      b.card({ tt: '患者信息', ht: 'accent', hc: 'primary' })
        .desc({ cols: 4, bordered: true })
          .descItem({ l: '姓名', tx: '张明远' })
          .descItem({ l: '性别', tx: '男' })
          .descItem({ l: '年龄', tx: '42岁' })
          .descItem({ l: '患者ID', tx: 'P202406090857' })
          .descItem({ l: '科室', tx: '内科' })
          .descItem({ l: '床号', tx: '内三-12床' })
          .descItem({ l: '标本类型', tx: '静脉血' })
          .descItem({ l: '采集时间', tx: '2024-06-09 07:30' })
          .descItem({ l: '接收时间', tx: '2024-06-09 07:45' })
          .descItem({ l: '报告时间', tx: '2024-06-09 09:15' })
          .descItem({ l: '临床诊断', tx: '乏力待查' })
          .descItem({ l: '送检医师', tx: '李芳' })
        .end()
      .end();

      // 检验结果表
      b.card({ tt: '检验结果', ht: 'fill', hc: 'primary' })
        .table({ stripe: true })
          .thead({ cols: '检测项目,英文名称,结果,单位,参考范围,标志' })
          .tbody()
            .row('白细胞', 'WBC', '5.8', '10^9/L', '3.5~9.5', '')
            .row('红细胞', 'RBC', '4.2', '10^12/L', '4.3~5.8', 'tag:偏低 t:info')
            .row('血红蛋白', 'HGB', '128', 'g/L', '130~175', 'tag:偏低 t:warning')
            .row('血小板', 'PLT', '210', '10^9/L', '125~350', '')
            .row('红细胞压积', 'HCT', '38.2', '%', '40~50', 'tag:偏低 t:info')
            .row('平均红细胞体积', 'MCV', '90.5', 'fL', '82~100', '')
            .row('平均血红蛋白量', 'MCH', '30.5', 'pg', '27~34', '')
            .row('平均血红蛋白浓度', 'MCHC', '337', 'g/L', '316~354', '')
            .row('中性粒细胞比率', 'NEUT%', '72.3', '%', '40~75', '')
            .row('淋巴细胞比率', 'LYMPH%', '18.6', '%', '20~50', 'tag:偏低 t:info')
            .row('单核细胞比率', 'MONO%', '6.2', '%', '3~10', '')
            .row('嗜酸性粒细胞比率', 'EO%', '2.1', '%', '0.4~8', '')
            .row('嗜碱性粒细胞比率', 'BASO%', '0.8', '%', '0~1', '')
            .row('中性粒细胞数', 'NEUT#', '4.2', '10^9/L', '1.8~6.3', '')
            .row('淋巴细胞数', 'LYMPH#', '1.1', '10^9/L', '1.1~3.2', '')
            .row('单核细胞数', 'MONO#', '0.36', '10^9/L', '0.1~0.6', '')
            .row('红细胞分布宽度', 'RDW-CV', '13.2', '%', '11.5~14.5', '')
            .row('血小板分布宽度', 'PDW', '12.8', 'fL', '9~17', '')
          .end()
        .end()
      .end();

      // 异常提示
      b.callout({ t: 'warning', tt: '异常提示', tx: '共检出 4 项异常：红细胞(RBC)偏低、血红蛋白(HGB)偏低、红细胞压积(HCT)偏低、淋巴细胞比率(LYMPH%)偏低。建议结合铁代谢指标进一步排查缺铁性贫血可能。' });

      // 签名区
      b.card()
        .row_layout()
          .col_layout({ span: 6 })
            .desc({ cols: 1 })
              .descItem({ l: '检验者', tx: '王婷 (主管技师)' })
              .descItem({ l: '审核者', tx: '刘德明 (副主任技师)' })
            .end()
          .end()
          .col_layout({ span: 6 })
            .desc({ cols: 1 })
              .descItem({ l: '报告日期', tx: '2024-06-09 09:15' })
              .descItem({ l: '打印时间', tx: '2024-06-09 09:20' })
            .end()
          .end()
        .end()
        .ft({ v: 'center' })
          .p('本报告仅对送检标本负责，结果供临床参考，如有疑问请及时与检验科联系。', { v: 'muted,sm' })
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'report-query',
    title: '数据查询报告',
    desc: '数据库/系统查询结果报告',
    build() {
      var b = new TokUIBuilder();

      // 标题区
      b.h3('系统操作日志查询报告', { v: 'underline', bg: 'info' })
        .p('生成时间：2024-06-09 10:30:00    操作人：admin', { v: 'muted' });

      // 打印按钮
      b.toolbar({ pos: 'top', align: 'right' })
        .btn({ tx: '🖨 打印报告', clk: 'printReport', v: 'primary,sm' })
      .end();

      // 查询条件
      b.card({ tt: '查询条件', ht: 'line', hc: 'info' })
        .desc({ cols: 3, bordered: true })
          .descItem({ l: '查询类型', tx: '操作日志' })
          .descItem({ l: '数据库', tx: 'prod_audit_log' })
          .descItem({ l: '执行时间', tx: '2024-06-09 10:28:35' })
          .descItem({ l: '总记录数', tx: '1,286 条' })
          .descItem({ l: '查询耗时', tx: '0.342 秒' })
          .descItem({ l: '状态', tx: '查询成功' })
        .end()
      .end();

      // 统计卡片
      b.row_layout()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'primary' })
            .stat({ tt: '总记录数', v: '1286', anim: '1500' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'success' })
            .stat({ tt: '查询耗时', v: '342', suf: 'ms', anim: '1200' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'info' })
            .stat({ tt: '数据量', v: '2.4', suf: 'MB', anim: '1000' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'warning' })
            .stat({ tt: '命中率', v: '94.6', suf: '%', trend: 'up', anim: '1400' })
          .end()
        .end()
      .end();

      // 数据表
      b.card({ tt: '查询结果（前20条）', ht: 'stripe', hc: 'dark' })
        .table({ stripe: true, v: 'bordered' })
          .thead({ cols: '编号,用户ID,用户名,操作类型,IP地址,时间戳,状态,耗时(ms)' })
          .tbody()
            .row('1', 'U10086', '张伟', '登录', '192.168.1.101', '2024-06-09 08:15:23', 'tag:成功 t:success', '45')
            .row('2', 'U10024', '李娜', '查询', '192.168.1.205', '2024-06-09 08:16:01', 'tag:成功 t:success', '120')
            .row('3', 'U10086', '张伟', '导出', '192.168.1.101', '2024-06-09 08:17:45', 'tag:成功 t:success', '2350')
            .row('4', 'U10055', '王强', '登录', '10.0.0.88', '2024-06-09 08:20:12', 'tag:失败 t:error', '12')
            .row('5', 'U10024', '李娜', '修改', '192.168.1.205', '2024-06-09 08:22:30', 'tag:成功 t:success', '89')
            .row('6', 'U10077', '赵敏', '删除', '192.168.1.178', '2024-06-09 08:25:18', 'tag:警告 t:warning', '156')
            .row('7', 'U10086', '张伟', '查询', '192.168.1.101', '2024-06-09 08:30:05', 'tag:成功 t:success', '67')
            .row('8', 'U10055', '王强', '登录', '10.0.0.88', '2024-06-09 08:32:44', 'tag:成功 t:success', '38')
            .row('9', 'U10033', '陈刚', '导入', '192.168.2.50', '2024-06-09 08:35:20', 'tag:警告 t:warning', '5800')
            .row('10', 'U10077', '赵敏', '查询', '192.168.1.178', '2024-06-09 08:40:11', 'tag:成功 t:success', '95')
            .row('11', 'U10024', '李娜', '导出', '192.168.1.205', '2024-06-09 08:45:33', 'tag:成功 t:success', '3100')
            .row('12', 'U10086', '张伟', '修改', '192.168.1.101', '2024-06-09 08:48:07', 'tag:成功 t:success', '132')
          .end()
        .end()
        .ft({ v: 'right' })
          .pagination({ page: '1', total: '65', clk: 'handleQueryPage', 'show-total': true, count: '1286' })
        .end()
      .end();

      // 查询摘要
      b.callout({ t: 'info', tt: '查询摘要', tx: '本次查询共返回 1,286 条操作日志记录。其中成功操作 1,142 条(88.8%)，警告操作 98 条(7.6%)，失败操作 46 条(3.6%)。建议关注 U10055(王强)的重复登录失败及 U10077(赵敏)的删除操作。' });

      return b;
    }
  },
  {
    trigger: 'report-sales',
    title: '销售分析报告',
    desc: '销售数据仪表盘式报告',
    build() {
      var b = new TokUIBuilder();

      // 标题区
      b.h3('2024年6月销售分析报告', { v: 'underline', bg: 'success' })
        .p('统计周期：2024-06-01 ~ 2024-06-30    部门：全部门    生成时间：2024-06-30 18:00', { v: 'muted' });

      // 打印按钮
      b.toolbar({ pos: 'top', align: 'right' })
        .btn({ tx: '🖨 打印报告', clk: 'printReport', v: 'primary,sm' })
      .end();

      // KPI 卡片
      b.row_layout()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'primary' })
            .stat({ tt: '本月销售额', v: '1234500', pre: '¥', trend: 'up', anim: '2000' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'success' })
            .stat({ tt: '订单量', v: '3856', trend: 'up', anim: '1800' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'info' })
            .stat({ tt: '客单价', v: '320', pre: '¥', trend: 'up', anim: '1500' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'warning' })
            .stat({ tt: '退货率', v: '2.3', suf: '%', trend: 'down', anim: '1400', dec: '1' })
          .end()
        .end()
      .end();

      // 图表区
      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '月度销售趋势（近12个月）', ht: 'accent', hc: 'primary' })
            .chart({ t: 'line', d: '85,92,78,105,120,135,142,128,155,160,148,123', l: '7月,8月,9月,10月,11月,12月,1月,2月,3月,4月,5月,6月', h: 220, area: true })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '产品类别占比', ht: 'accent', hc: 'success' })
            .chart({ t: 'pie', d: '35,25,18,12,10', l: '电子产品,服装鞋帽,食品饮料,家居日用,其他', w: 240, h: 240 })
          .end()
        .end()
      .end();

      // 产品排行表
      b.card({ tt: '产品销售排行 TOP 8', ht: 'stripe', hc: 'dark' })
        .table({ stripe: true, v: 'bordered' })
          .thead({ cols: '产品名称,类别,销售额(¥),销量,同比增长,增长进度,状态' })
          .tbody()
            .row('iPhone 15 Pro Max', '电子产品', '¥386,200', '286', '+32.5%', 'progress v:82 t:span', 'tag:热销 t:error')
            .row('AirPods Pro 2', '电子产品', '¥128,500', '1,542', '+18.2%', 'progress v:68 t:span', 'tag:畅销 t:success')
            .row('Nike Air Max 270', '服装鞋帽', '¥96,800', '864', '+5.3%', 'progress v:42 t:span', 'tag:正常 t:primary')
            .row('茅台飞天 53度', '食品饮料', '¥189,600', '396', '+45.8%', 'progress v:95 t:span', 'tag:爆品 t:error')
            .row('戴森 V15 吸尘器', '家居日用', '¥76,300', '182', '-3.2%', 'progress v:28 t:span', 'tag:下滑 t:warning')
            .row('Adidas Ultraboost', '服装鞋帽', '¥82,100', '684', '+12.6%', 'progress v:55 t:span', 'tag:畅销 t:success')
            .row('三只松鼠礼盒', '食品饮料', '¥54,200', '2,160', '+22.1%', 'progress v:60 t:span', 'tag:热销 t:error')
            .row('小米电视 65寸', '电子产品', '¥67,800', '126', '-8.7%', 'progress v:18 t:span status:error', 'tag:滞销 t:warning')
          .end()
        .end()
      .end();

      // 区域分布
      b.row_layout()
        .col_layout({ span: 6 })
          .card({ tt: '区域销售分布', ht: 'accent', hc: 'info' })
            .chart({ t: 'bar', d: '380,320,260,180,95', l: '华东,华南,华北,西南,其他', h: 200 })
          .end()
        .end()
        .col_layout({ span: 6 })
          .card({ tt: '区域销售详情', ht: 'accent', hc: 'info' })
            .desc({ cols: 1, stripe: true })
              .descItem({ l: '华东区', tx: '¥380,000 (30.8%)  同比 +15.2%' })
              .descItem({ l: '华南区', tx: '¥320,000 (25.9%)  同比 +22.6%' })
              .descItem({ l: '华北区', tx: '¥260,000 (21.1%)  同比 +8.4%' })
              .descItem({ l: '西南区', tx: '¥180,000 (14.6%)  同比 +31.5%' })
              .descItem({ l: '其他地区', tx: '¥95,500 (7.7%)  同比 -2.1%' })
            .end()
          .end()
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'report-customer',
    title: '客户分析报告',
    desc: '客户洞察与分析报告',
    build() {
      var b = new TokUIBuilder();

      // 标题区
      b.h3('客户分析报告', { v: 'underline', bg: 'warning' })
        .p('分析周期：2024年Q2(4-6月)    数据来源：CRM系统 + 电商平台    生成时间：2024-06-30', { v: 'muted' });

      // 打印按钮
      b.toolbar({ pos: 'top', align: 'right' })
        .btn({ tx: '🖨 打印报告', clk: 'printReport', v: 'primary,sm' })
      .end();

      // 概览统计
      b.row_layout()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'primary' })
            .stat({ tt: '总客户数', v: '12580', anim: '2000' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'success' })
            .stat({ tt: '新增客户', v: '486', trend: 'up', anim: '1500' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'info' })
            .stat({ tt: '活跃客户', v: '8342', trend: 'up', anim: '1800' })
          .end()
        .end()
        .col_layout({ span: 3 })
          .card({ ht: 'fill', hc: 'warning' })
            .stat({ tt: '流失率', v: '5.2', suf: '%', trend: 'down', anim: '1200', dec: '1' })
          .end()
        .end()
      .end();

      // Tab 面板
      b.tabs()
        // Tab 1: 客户分布
        .tab({ tt: '客户分布' })
          .row_layout()
            .col_layout({ span: 6 })
              .card({ tt: '年龄段分布', ht: 'dot', hc: 'primary' })
                .chart({ t: 'donut', d: '18,32,28,15,7', l: '18-25岁,26-35岁,36-45岁,46-55岁,55岁以上', w: 220, h: 220 })
              .end()
            .end()
            .col_layout({ span: 6 })
              .card({ tt: '地区分布 TOP 6', ht: 'dot', hc: 'success' })
                .chart({ t: 'bar', d: '3200,2800,2100,1600,1500,1380', l: '广东,浙江,江苏,北京,上海,四川', h: 220 })
              .end()
            .end()
          .end()
        .end()
        // Tab 2: 客户等级
        .tab({ tt: '客户等级' })
          .card({ tt: '客户等级分析', ht: 'stripe', hc: 'dark' })
            .table({ stripe: true, v: 'bordered' })
              .thead({ cols: '客户等级,客户数,占比,消费总额,平均客单价,等级进度,状态' })
              .tbody()
                .row('钻石会员', '856', '6.8%', '¥8,560,000', '¥10,000', 'progress v:95 t:span', 'tag:优质 t:error')
                .row('黄金会员', '2,340', '18.6%', '¥9,360,000', '¥4,000', 'progress v:72 t:span', 'tag:高价值 t:warning')
                .row('白银会员', '4,120', '32.7%', '¥8,240,000', '¥2,000', 'progress v:50 t:span', 'tag:稳定 t:primary')
                .row('普通会员', '3,680', '29.3%', '¥3,680,000', '¥1,000', 'progress v:30 t:span', 'tag:培育 t:info')
                .row('注册用户', '1,584', '12.6%', '¥633,600', '¥400', 'progress v:12 t:span', 'tag:待激活 t:default')
              .end()
            .end()
          .end()
        .end()
        // Tab 3: 消费趋势
        .tab({ tt: '消费趋势' })
          .card({ tt: '月度消费趋势（近12个月）', ht: 'accent', hc: 'primary' })
            .chart({ t: 'line', d: '680,720,690,780,850,920,880,960,1020,1080,990,1050', l: '7月,8月,9月,10月,11月,12月,1月,2月,3月,4月,5月,6月', h: 220, area: true })
          .end()
          .card({ tt: '关键消费指标' })
            .desc({ cols: 2, bordered: true })
              .descItem({ l: '季度消费总额', tx: '¥3,120,000' })
              .descItem({ l: '环比增长', tx: '+12.6%' })
              .descItem({ l: '平均客单价', tx: '¥320' })
              .descItem({ l: '复购率', tx: '68.5%' })
              .descItem({ l: '最高单笔消费', tx: '¥45,800' })
              .descItem({ l: '月均消费频次', tx: '3.2 次' })
            .end()
          .end()
        .end()
      .end();

      // 生命周期时间线
      b.card({ tt: '客户生命周期关键节点', ht: 'accent', hc: 'warning' })
        .timeline()
          .ti('用户注册完成', { tm: '2024-01-15', t: 'primary' })
          .ti('首次购买 — AirPods Pro 2 (¥1,899)', { tm: '2024-01-22', t: 'success' })
          .ti('完成个人信息认证', { tm: '2024-02-03', t: 'info' })
          .ti('升级为白银会员（累计消费 ¥2,100）', { tm: '2024-03-12', t: 'primary' })
          .ti('首次退货 — 服装类 (¥399)', { tm: '2024-04-08', t: 'warning' })
          .ti('参与618大促活动 — 下单 ¥5,680', { tm: '2024-06-18', t: 'success' })
          .ti('升级为黄金会员（累计消费 ¥12,800）', { tm: '2024-06-25', t: 'primary' })
        .end()
      .end();

      // 页脚免责声明
      b.card()
        .ft({ v: 'center' })
          .p('本报告数据来源于 CRM 系统，统计截止 2024-06-30。如有疑问请联系数据分析部。', { v: 'muted,sm' })
        .end()
      .end();

      return b;
    }
  },
  {
    trigger: 'test-fragment',
    title: '碎片推送渲染测试',
    desc: '随机拆碎 DSL 标签推送，测试流式解析器的鲁棒性',
    build() { return new TokUIBuilder(); },
    stream(res) {
      // 生成一段包含多种组件的完整 DSL
      var dsl = ''
        // === 顶部标题区 ===
        + '[card tt:"碎片推送渲染测试"]'
        + '[p v:bold 随机碎片推送 — 每个 SSE chunk 可能截断在标签中间，测试解析器鲁棒性]'
        + '[tag t:primary tx:流式解析]'
        + '[tag t:success tx:零依赖]'
        + '[tag t:danger tx:碎片化]'

        // === 第一行：用户信息 + 统计 ===
        + '[row]'
        + '[col span:6]'
        + '[card tt:"用户信息"]'
        + '[img s:https://picsum.photos/seed/frag1/600/200 v:rounded]'
        + '[h3 张三]'
        + '[p v:muted 高级前端工程师 · 北京]'
        + '[tag t:success tx:在线] [tag t:info tx:VIP] [tag t:warning tx:活跃]'
        + '[/card]'
        + '[/col]'
        + '[col span:6]'
        + '[card tt:"项目统计"]'
        + '[row]'
        + '[col span:4]'
        + '[stat v:128 tt:已完成 n:success icon:✓]'
        + '[/col]'
        + '[col span:4]'
        + '[stat v:15 tt:进行中 n:primary icon:▶]'
        + '[/col]'
        + '[col span:4]'
        + '[stat v:3 tt:已延期 n:danger icon:!]'
        + '[/col]'
        + '[/row]'
        + '[ft]'
        + '[btn tx:查看全部 v:primary,sm clk:viewAll]'
        + '[/ft]'
        + '[/card]'
        + '[/col]'
        + '[/row]'

        // === 第二行：操作 + 通知 + 进度 ===
        + '[row]'
        + '[col span:4]'
        + '[card tt:"快捷操作"]'
        + '[btngroup]'
        + '[btn tx:新建 v:primary clk:create]'
        + '[btn tx:导入 v:ghost clk:import]'
        + '[btn tx:导出 v:success clk:export]'
        + '[/btngroup]'
        + '[dv]'
        + '[btn tx:删除 v:danger,sm clk:delete]'
        + '[btn tx:刷新 v:default,sm clk:refresh]'
        + '[/card]'
        + '[/col]'
        + '[col span:4]'
        + '[card tt:"系统通知"]'
        + '[callout t:info tx:"系统将于今晚 22:00 维护"]'
        + '[callout t:success tx:"您的数据已同步完成"]'
        + '[callout t:warning tx:"存储空间已使用 85%"]'
        + '[/card]'
        + '[/col]'
        + '[col span:4]'
        + '[card tt:"项目进度"]'
        + '[progress v:72 tx:前端开发]'
        + '[progress v:45 tx:后端接口]'
        + '[progress v:90 tx:测试覆盖]'
        + '[progress v:60 tx:文档撰写]'
        + '[/card]'
        + '[/col]'
        + '[/row]'

        // === 第三行：表格 + 描述列表 ===
        + '[row]'
        + '[col span:8]'
        + '[card tt:"用户列表"]'
        + '[table stripe]'
        + '[thead cols:"姓名,角色,状态,操作"]'
        + '[/thead]'
        + '[tbody]'
        + '[tr "李明,管理员,正常,btn:编辑:edit"]'
        + '[tr "王芳,编辑者,正常,btn:编辑:edit"]'
        + '[tr "赵强,观察者,禁用,btn:编辑:edit"]'
        + '[tr "刘洋,编辑者,正常,btn:编辑:edit"]'
        + '[/tbody]'
        + '[/table]'
        + '[/card]'
        + '[/col]'
        + '[col span:4]'
        + '[card tt:"服务详情"]'
        + '[desc cols:1]'
        + '[desc-item tt:服务名称 tx:"TokUI 流式框架"]'
        + '[desc-item tt:版本号 tx:v2.4.1]'
        + '[desc-item tt:运行环境 tx:"Node.js 20+"]'
        + '[desc-item tt:许可证 tx:"MIT License"]'
        + '[desc-item tt:作者 tx:"AI 助手"]'
        + '[/desc]'
        + '[/card]'
        + '[/col]'
        + '[/row]'

        // === 第四行：表单 + 列表 ===
        + '[row]'
        + '[col span:6]'
        + '[card tt:"创建任务"]'
        + '[form act:/api/task mtd:post]'
        + '[input l:任务名称 ph:请输入任务名称 req]'
        + '[select l:优先级 ph:选择优先级]'
        + '[opt v:high tx:高优先级]'
        + '[opt v:mid tx:中优先级]'
        + '[opt v:low tx:低优先级]'
        + '[/select]'
        + '[textarea l:描述 ph:请描述任务详情 auto]'
        + '[radio l:负责人]'
        + '[opt v:zhangsan tx:张三]'
        + '[opt v:lisi tx:李四]'
        + '[opt v:wangwu tx:王五 chk]'
        + '[/radio]'
        + '[dv]'
        + '[btn tx:提交 t:submit v:primary]'
        + '[btn tx:重置 t:reset v:ghost]'
        + '[/form]'
        + '[/card]'
        + '[/col]'
        + '[col span:6]'
        + '[card tt:"待办清单"]'
        + '[list]'
        + '[item 完成首页 UI 设计]'
        + '[item 编写单元测试用例]'
        + '[item 修复登录页面样式问题]'
        + '[item 优化表格组件性能]'
        + '[item 添加暗色主题支持]'
        + '[/list]'
        + '[dv]'
        + '[p v:muted 共 5 项待办] [a tx:查看全部 u:# tt:点击查看完整列表]'
        + '[/card]'
        + '[/col]'
        + '[/row]'

        // === 第五行：步骤条 + 时间线 + 代码 ===
        + '[row]'
        + '[col span:4]'
        + '[card tt:"发布流程"]'
        + '[steps]'
        + '[step tx:代码审查 t:done]'
        + '[step tx:测试通过 t:done]'
        + '[step tx:部署上线 t:active]'
        + '[step tx:监控验证]'
        + '[/steps]'
        + '[/card]'
        + '[/col]'
        + '[col span:4]'
        + '[card tt:"操作日志"]'
        + '[timeline]'
        + '[ti tt:"部署 v2.3.0 → 生产环境" n:success]'
        + '[ti tt:"修复分页组件 Bug" n:danger]'
        + '[ti tt:"新增暗色主题" n:primary]'
        + '[ti tt:"优化首屏加载速度" n:warning]'
        + '[ti tt:"发布 v2.4.1 版本" n:success]'
        + '[/timeline]'
        + '[/card]'
        + '[/col]'
        + '[col span:4]'
        + '[card tt:"示例代码"]'
        + '[code lang:javascript]import { TokUI } from "@jboltai/tokui";\nconst ui = new TokUI(container);\nui.startStream();\nui.feed(\'[h1 Hello]\');\nui.endStream();[/code]'
        + '[/card]'
        + '[/col]'
        + '[/row]'

        // === 第六行：折叠面板 + 标签页 ===
        + '[row]'
        + '[col span:6]'
        + '[card tt:"常见问题"]'
        + '[accordion]'
        + '[collapse tt:"如何使用流式推送？"]'
        + '[p 通过 SSE 或 WebSocket 将 DSL 片段推送到前端，TokUIParser 会增量解析并实时渲染。]'
        + '[/collapse]'
        + '[collapse tt:"支持哪些组件？"]'
        + '[p 支持 60+ 组件，涵盖表格、表单、图表、布局、导航等常见 UI 场景。]'
        + '[/collapse]'
        + '[collapse tt:"如何自定义主题？"]'
        + '[p 使用 setSeedColor 方法设置品牌主色，系统自动生成 10 级色阶。也支持完全自定义 CSS 变量。]'
        + '[/collapse]'
        + '[/accordion]'
        + '[/card]'
        + '[/col]'
        + '[col span:6]'
        + '[card tt:"技术栈详情"]'
        + '[tabs]'
        + '[tab tt:前端]'
        + '[p 零依赖，纯原生 JavaScript 实现。支持流式增量渲染和一次性渲染两种模式。]'
        + '[tag t:primary tx:JavaScript] [tag t:success tx:零依赖] [tag t:info tx:"DOM API"]'
        + '[/tab]'
        + '[tab tt:后端]'
        + '[p Node.js 原生 http 模块，链式 Builder API 生成 DSL 字符串。]'
        + '[tag t:primary tx:Node.js] [tag t:warning tx:SSE] [tag t:info tx:DSL]'
        + '[/tab]'
        + '[tab tt:特性]'
        + '[list]'
        + '[item 流式增量解析与渲染]'
        + '[item 60+ 内置组件]'
        + '[item CSS 变量主题系统]'
        + '[item 事件总线机制]'
        + '[item 暗色主题支持]'
        + '[item 响应式布局]'
        + '[/list]'
        + '[/tab]'
        + '[/tabs]'
        + '[/card]'
        + '[/col]'
        + '[/row]'

        // === 流式图表：柱状图 + 饼图（第一行两列，碎片推送）===
        + '[row]'
        + '[col span:6]'
        + '[card tt:"流式柱状图（碎片推送）"]'
        + '[chart t:bar tt:销售趋势 h:180 l:1月,2月,3月,4月,5月]'
        + '[pt v:120][pt v:200][pt v:150][pt v:80][pt v:250]'
        + '[/chart]'
        + '[/card]'
        + '[/col]'
        + '[col span:6]'
        + '[card tt:"流式饼图（碎片推送）"]'
        + '[chart t:pie tt:渠道占比 w:220 h:220 l:微信,抖音,淘宝,其他]'
        + '[pt v:35][pt v:25][pt v:20][pt v:20]'
        + '[/chart]'
        + '[/card]'
        + '[/col]'
        + '[/row]'

        // === 大型甘特图（独立整行：16 任务 · 5 组 · 16 依赖链 · 5 里程碑，逐 task 流式增长）===
        + '[row]'
        + '[col span:12]'
        + '[card tt:"大型甘特图流式（16 任务 · 5 组 · 复杂依赖 · 逐行增长）"]'
        + '[chart t:gantt tt:产品研发计划 mode:days gnames:需求|设计|开发|测试|上线 deps:"0->1,1->2,2->3,2->4,3->5,4->6,5->7,6->7,7->8,7->9,9->10,10->11,8->12,11->12,12->13,13->14,14->15"]'
        + '[task 需求调研,0,3,100,0]'
        + '[task 需求评审,3,4,100,0]'
        + '[task 架构设计,4,7,80,1]'
        + '[task UI设计,5,8,70,1]'
        + '[task 接口设计,7,9,60,1]'
        + '[task 前端开发,9,15,45,2]'
        + '[task 后端开发,9,16,40,2]'
        + '[task 联调,15,18,20,2]'
        + '[task 单元测试,16,19,10,3]'
        + '[task 集成测试,18,21,0,3]'
        + '[task 压力测试,20,23,0,3]'
        + '[task 回归测试,22,24,0,3]'
        + '[task 预发布,23,25,0,4]'
        + '[task 灰度发布,25,27,0,4]'
        + '[task 全量上线,27,29,0,4]'
        + '[task 线上监控,29,31,0,4]'
        + '[ms 需求确认,4,0]'
        + '[ms 设计完成,9,1]'
        + '[ms 开发完成,18,2]'
        + '[ms 测试完成,24,3]'
        + '[ms 正式发布,29,4]'
        + '[/chart]'
        + '[/card]'
        + '[/col]'
        + '[/row]'

        // === 底部：链接 + 提示 ===
        + '[dv]'
        + '[callout t:info tx:"本页面通过随机碎片推送渲染，所有标签都可能被截断在任意位置。如果渲染正常，说明解析器鲁棒性良好。"]'
        + '[p v:muted 源码位于 src/core/parser.js]'

        + '[/card]';

      // 将 DSL 随机拆成碎片 chunks
      var chunks = _fragmentDsl(dsl);
      var i = 0;
      var cleaned = false;
      res.on('close', function() { cleaned = true; });
      function sendNext() {
        if (cleaned || i >= chunks.length) {
          if (!cleaned) {
            res.write('data: [DONE]\n\n');
            res.end();
          }
          return;
        }
        res.write('data: ' + JSON.stringify({ tokui: chunks[i] }) + '\n\n');
        i++;
        setTimeout(sendNext, 8 + Math.floor(Math.random() * 20));
      }
      sendNext();
    }
  },
  // ========== 表单动作专题（form:ID / reset / print / print-area）==========
  {
    trigger: 'fa-bind',
    title: '表单显式绑定（form:ID）',
    desc: '按钮在表单外，靠 form:ID 精确绑定，各自提交互不干扰',
    build() {
      const b = new TokUIBuilder();
      b.h2('表单显式绑定 form:ID')
        .callout({ t: 'info', tx: '按钮放在表单外部，通过 form:ID 显式绑定目标表单。点击各自的"提交"只收集对应表单数据，"重置"只复原对应表单——不再依赖 DOM 层级推断。' })
        .row_layout()
          .col_layout({ span: 6 })
            .card({ tt: '登录表单 A' })
              .form({ id: 'formA', sub: 'faBindA' })
                .input({ l: '用户名', n: 'username', ph: '输入用户名', req: true })
                .pwd({ l: '密码', n: 'password', ph: '输入密码', req: true })
              .end()
              .btngroup()
                .btn({ tx: '提交 A', form: 'formA', sub: 'faBindA', t: 'primary' })
                .btn({ tx: '重置 A', form: 'formA', reset: true })
              .end()
            .end()
          .end()
          .col_layout({ span: 6 })
            .card({ tt: '注册表单 B' })
              .form({ id: 'formB', sub: 'faBindB' })
                .input({ l: '邮箱', n: 'email', ph: '输入邮箱', req: true })
                .input({ l: '手机号', n: 'phone', ph: '输入手机号' })
                .checkbox({ l: '同意服务条款', n: 'agree' })
              .end()
              .btngroup()
                .btn({ tx: '提交 B', form: 'formB', sub: 'faBindB', t: 'primary' })
                .btn({ tx: '重置 B', form: 'formB', reset: true })
              .end()
            .end()
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'fa-submit-reset',
    title: '提交与重置（内置动作）',
    desc: 'sub 收集全字段；reset 一键复原原生+自定义控件',
    build() {
      const b = new TokUIBuilder();
      b.h2('提交与重置（内置动作）')
        .callout({ t: 'info', tx: '提交：sub:H 收集表单全部字段（含 slider/rate/picker 等自定义控件的 hidden 值）。重置：reset 裸写即可，无需 handler——原生输入与自定义控件一并复原。' })
        .form({ id: 'faForm', sub: 'faSubmit' })
          .row_layout()
            .col_layout({ span: 6 })
              .input({ l: '姓名', n: 'name', val: '张三', req: true })
              .input({ l: '邮箱', n: 'email', val: 'zhang@tokui.dev' })
              .select({ l: '部门', n: 'dept' })
                .opt({ v: 'tech', tx: '技术部' })
                .opt({ v: 'sales', tx: '销售部', chk: true })
                .opt({ v: 'hr', tx: '人事部' })
              .end()
              .slider({ l: '满意度', n: 'sat', v: '80', min: '0', max: '100' })
            .end()
            .col_layout({ span: 6 })
              .rate({ l: '综合评分', n: 'stars', v: '4', max: '5' })
              .switcher({ l: '订阅周报', n: 'weekly', chk: true })
              .numinput({ l: '数量', n: 'qty', v: '3', min: '1', max: '99' })
              .picker({ l: '技能栈', n: 'skills', multi: true })
                .opt({ v: 'js', tx: 'JavaScript', chk: true })
                .opt({ v: 'py', tx: 'Python' })
                .opt({ v: 'go', tx: 'Go', chk: true })
                .opt({ v: 'rs', tx: 'Rust' })
              .end()
            .end()
          .end()
          .btngroup()
            .btn({ tx: '提交', form: 'faForm', sub: 'faSubmit', t: 'primary' })
            .btn({ tx: '重置', form: 'faForm', reset: 'faResetCb' })
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'fa-print',
    title: '打印区与打印按钮（1:1 打印）',
    desc: 'print-area 标记区域；print:ID / print:self 触发，按钮不进预览',
    build() {
      const b = new TokUIBuilder();
      b.h2('打印区与打印按钮')
        .callout({ t: 'info', tx: '[print-area id:X] 标记一块 1:1 打印区域；[btn print:X] 触发浏览器打印，仅该区域可见、如实还原配色。打印按钮自身不会出现在打印预览中。print:self 打印按钮所在的最近 print-area / card。' })
        .row_layout()
          .col_layout({ span: 8 })
            .printArea({ id: 'invoice', tt: '收款单 #20260627-0042' })
              .row_layout()
                .col_layout({ span: 6 })
                  .stat({ tt: '应付金额', v: '12,800.00', pre: '¥ ', trend: 'up' })
                .end()
                .col_layout({ span: 6 })
                  .stat({ tt: '已付定金', v: '3,000.00', pre: '¥ ', trend: 'down' })
                .end()
              .end()
              .table({ bordered: true })
                .thead({ cols: '项目,数量,单价,小计' })
                .row('产品授权', '5', '¥1,800', '¥9,000')
                .row('实施服务', '1', '¥2,800', '¥2,800')
                .row('技术培训', '1', '¥1,000', '¥1,000')
              .end()
              .p('合计：¥12,800.00    账期：30 天', { v: 'bold' })
              .p('收款方：TokUI 科技   开户行：招商银行科苑支行', { v: 'muted' })
            .end()
          .end()
          .col_layout({ span: 4 })
            .card({ tt: '打印操作' })
              .p('点击下方按钮调用浏览器打印，仅"收款单"区域 1:1 输出到预览。')
              .btngroup()
                .btn({ tx: '🖨 打印此单', print: 'invoice', t: 'primary' })
              .end()
              .dv({})
              .p('print:self 示例：打印按钮所在的最近卡片：', { v: 'sm' })
              .btn({ tx: '打印本卡', print: 'self' })
            .end()
          .end()
        .end();
      return b;
    }
  },
  {
    trigger: 'fa-order',
    title: '综合：表单 + 提交/重置 + 打印整卡',
    desc: '订单录入卡片，提交/重置/打印整张卡片',
    build() {
      const b = new TokUIBuilder();
      b.h2('综合：订单录入卡片')
        .callout({ t: 'info', tx: '一张卡片内整合：表单录入（form:ID 绑定）、提交收集、重置复原、print:self 打印整张卡片。提交/重置/打印均为内置动作，仅"提交"需要一个数据处理 handler。' })
        .card({ tt: '订单录入 · #ORD-20260627' })
          .form({ id: 'orderForm', sub: 'faSubmit' })
            .row_layout()
              .col_layout({ span: 6 })
                .input({ l: '客户名称', n: 'customer', val: '深圳 TokUI 科技', req: true })
                .input({ l: '联系人', n: 'contact', val: '王经理' })
                .select({ l: '订单类型', n: 'type' })
                  .opt({ v: 'new', tx: '新购', chk: true })
                  .opt({ v: 'renew', tx: '续费' })
                  .opt({ v: 'upgrade', tx: '升级' })
                .end()
                .numinput({ l: '授权数量', n: 'licenses', v: '10', min: '1', max: '999' })
              .end()
              .col_layout({ span: 6 })
                .rate({ l: '优先级', n: 'priority', v: '3', max: '5' })
                .switcher({ l: '需要上门实施', n: 'impl', chk: true })
                .picker({ l: '附加模块', n: 'modules', multi: true })
                  .opt({ v: 'bi', tx: 'BI 报表', chk: true })
                  .opt({ v: 'flow', tx: '工作流' })
                  .opt({ v: 'ai', tx: 'AI 助手', chk: true })
                .end()
                .textarea({ l: '备注', n: 'remark', ph: '订单备注（选填）' }).end()
              .end()
            .end()
            .btngroup()
              .btn({ tx: '提交订单', form: 'orderForm', sub: 'faSubmit', t: 'primary' })
              .btn({ tx: '重置', form: 'orderForm', reset: true })
              .btn({ tx: '🖨 打印整卡', print: 'self' })
            .end()
          .end()
        .end();
      return b;
    }
  }
];

/**
 * 将 Builder 的输出以 SSE 格式逐块推送
 * 每个 chunk 封装为 data: { "tokui": "..." } 格式，
 * 全部发送后输出 data: [DONE] 结束标记。
 *
 * @param {http.ServerResponse} res - HTTP 响应对象
 * @param {TokUIBuilder} builder - 构建器实例
 */
function streamBuilder(res, builder, demo) {
  const chunks = builder.toChunks();
  // 如果 demo 有 extraChunks，追加到主 chunks 之后
  if (demo && typeof demo.extraChunks === 'function') {
    const extra = demo.extraChunks();
    if (Array.isArray(extra)) chunks.push(...extra);
  }
  let i = 0;
  let cleaned = false;
  function sendNext() {
    if (cleaned || i >= chunks.length) {
      if (!cleaned) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
      return;
    }
    var chunk = chunks[i];
    i++;
    // 支持 { _wait: ms } 延迟占位，不发数据只等待
    if (typeof chunk === 'object' && chunk._wait) {
      setTimeout(sendNext, chunk._wait);
    } else {
      res.write(`data: ${JSON.stringify({ tokui: chunk })}\n\n`);
      // 立即刷新 TCP 缓冲区，确保 SSE 及时送达
      if (typeof res.flush === 'function') res.flush();
      else if (res.socket && typeof res.socket.write === 'function') {
        // Node.js 原生 http 不一定有 flush，直接继续
      }
      setTimeout(sendNext, 80);
    }
  }
  res.on('close', () => { cleaned = true; });
  sendNext();
}

// ===== HTTP 服务器 =====

// 静态文件路径安全检查
function _isPathSafe(p, rootDir) {
  var resolved = path.resolve(p);
  var resolvedRoot = path.resolve(rootDir);
  return resolved.startsWith(resolvedRoot + path.sep)
    && !resolved.includes('node_modules')
    && !resolved.includes('.git')
    && !resolved.includes('.env');
}

// Markdown 特殊字符转义
function _escapeMarkdown(s) {
  return String(s).replace(/([*\[\]`~#>|])/g, '\\$1');
}

const server = http.createServer((req, res) => {
  // CORS: 仅允许 localhost / 同源
  var origin = req.headers.origin || '';
  if (!origin || origin.indexOf('http://localhost') === 0 || origin.indexOf('http://127.0.0.1') === 0) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: 获取演示场景列表
  if (req.url === '/api/demo/list' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const list = DEMOS.map(d => ({ trigger: d.trigger, title: d.title, desc: d.desc }));
    res.end(JSON.stringify(list));
    return;
  }

  // API: SSE 流式聊天
  if (req.url === '/api/chat/stream' && req.method === 'POST') {
    let body = '';
    let bodySize = 0;
    const MAX_BODY = 1e6; // 1MB
    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      // 解析请求体中的 prompt 字段
      let prompt = '';
      try {
        prompt = JSON.parse(body).prompt || '';
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      // 设置 SSE 响应头
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // 匹配演示场景或返回默认回复
      const demo = DEMOS.find(d => d.trigger === prompt);
      if (demo) {
        // 支持自定义流式推送函数（如碎片推送测试）
        if (typeof demo.stream === 'function') {
          demo.stream(res);
        } else {
          const builder = demo.build();
          streamBuilder(res, builder, demo);
        }
      } else {
        // 未匹配时返回默认回复
        const b = new TokUIBuilder();
        b.card({ tt: '回复' })
          .md(`你说了: **${_escapeMarkdown(prompt)}**\n\n这是一个默认回复。点击上方的引导按钮查看更多组件展示。`)
        .end();
        streamBuilder(res, b);
      }
    });
    return;
  }

  // 静态文件服务
  if (req.method === 'GET') {
    const rootDir = path.join(__dirname, '../..');
    const urlPath = (req.url || '/').split('?')[0];
    let filePath = path.join(rootDir, urlPath === '/' || urlPath === '/demo/' ? 'demo/index.html' : urlPath);

    // 防止路径穿越攻击
    if (!_isPathSafe(filePath, rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // MIME 类型映射
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // 主路径未找到时，尝试在 demo/ 目录下查找
        const demoPath = path.join(rootDir, 'demo', urlPath);
        if (!_isPathSafe(demoPath, rootDir)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        fs.readFile(demoPath, (err2, data2) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          const ext = path.extname(demoPath);
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
          res.end(data2);
        });
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
    return;
  }

  // 其他请求返回 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// 端口占用时自动释放并重试
let _portRetryCount = 0;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (_portRetryCount >= 3) {
      console.error(`自动释放失败，请手动处理: lsof -ti:${PORT} | xargs kill`);
      process.exit(1);
    }
    _portRetryCount++;
    console.log(`端口 ${PORT} 已被占用，正在自动释放...`);
    try {
      const { execSync } = require('child_process');
      const pids = execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8' }).trim().split('\n');
      const myPid = process.pid;
      for (const pidStr of pids) {
        const pid = parseInt(pidStr, 10);
        if (pid && pid !== myPid) {
          process.kill(pid, 'SIGTERM');
          console.log(`已终止旧进程 (PID: ${pid})`);
        }
      }
      // 等待端口释放后重试监听
      setTimeout(() => {
        server.listen(PORT);
      }, 500);
      return;
    } catch (e) {
      // lsof 找不到进程或 kill 失败
    }
    console.error(`无法自动释放端口 ${PORT}，请手动处理: lsof -ti:${PORT} | xargs kill`);
    process.exit(1);
  } else {
    throw err;
  }
});

server.listen(PORT, () => {
  console.log(`TokUI SSE Server 运行于 http://localhost:${PORT}`);
  console.log(`演示页面: 在浏览器中打开 demo/index.html`);
  console.log(`API 端点:`);
  console.log(`  GET  /api/demo/list    — 获取演示场景列表`);
  console.log(`  POST /api/chat/stream  — SSE 流式推送 TokUI 组件`);
});
