/**
 * TokUI 体验中心 — 客户端脚本
 */
'use strict';

// ========================================
// Theme state（localStorage 持久化：风格族 × 明暗）
// ========================================
const THEME_KEY = { dark: 'tokui-dark-mode', family: 'tokui-style-family' };
let darkMode = localStorage.getItem(THEME_KEY.dark) === '1';
let styleFamily = localStorage.getItem(THEME_KEY.family) || 'default';

function computeTokuiTheme() {
  return darkMode ? (styleFamily === 'modern' ? 'modern-dark' : 'dark') : styleFamily;
}
function applyTokuiTheme() {
  const theme = computeTokuiTheme();
  // 多实例同步：所有 TokUI 渲染容器都带 data-tokui-theme，统一切（TokUI.setTheme 单例只切一个）
  document.querySelectorAll('[data-tokui-theme]').forEach(function (el) {
    el.setAttribute('data-tokui-theme', theme);
  });
}
function persistTokuiTheme() {
  try {
    localStorage.setItem(THEME_KEY.dark, darkMode ? '1' : '0');
    localStorage.setItem(THEME_KEY.family, styleFamily);
  } catch (e) { /* localStorage 不可用时静默 */ }
}
function syncTokuiThemeUI() {
  document.body.classList.toggle('dark', darkMode);
  const sel = document.getElementById('styleFamily');
  if (sel) sel.value = styleFamily;
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const moon = btn.querySelector('.icon-moon');
    const sun = btn.querySelector('.icon-sun');
    if (moon) moon.style.display = darkMode ? 'none' : '';
    if (sun) sun.style.display = darkMode ? '' : 'none';
  }
}

// ========================================
// Navigation Data / 导航数据
// ========================================

const NAV_DATA = [
  {
    id: 'basic',
    name: { zh: '基础组件', en: 'Basic' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    items: [
      { trigger: 'demo-i18n', name: { zh: '多语言 i18n', en: 'i18n' }, desc: { zh: '组件 chrome 文案随语言切换', en: 'Chrome text follows locale toggle' }, icon: '🌐' },
      { trigger: 'demo-heading', name: { zh: '标题组件', en: 'Heading' }, desc: { zh: 'h1-h6 各级标题', en: 'h1-h6 headings' }, icon: 'H' },
      { trigger: 'demo-button', name: { zh: '按钮组件', en: 'Button' }, desc: { zh: '多类型多色彩按钮', en: 'Button types & colors' }, icon: '▶' },
      { trigger: 'demo-icon', name: { zh: '图标按钮', en: 'Icon' }, desc: { zh: 'SVG icon + emoji 全场景', en: 'SVG icon + emoji all scenarios' }, icon: '★' },
      { trigger: 'demo-input', name: { zh: '输入框', en: 'Input' }, desc: { zh: '文本/数字/密码/邮箱', en: 'Text/number/password/email' }, icon: '✎' },
      { trigger: 'demo-select', name: { zh: '选择 Select', en: 'Select' }, desc: { zh: '下拉单选/多选/简写/inline/取值', en: 'Single/multi/shorthand/inline' }, icon: '☑' },
      { trigger: 'demo-radio', name: { zh: '单选 Radio', en: 'Radio' }, desc: { zh: '单选组/简写/inline/取值', en: 'Group/shorthand/inline' }, icon: '◉' },
      { trigger: 'demo-checkbox', name: { zh: '多选 Checkbox', en: 'Checkbox' }, desc: { zh: '单布尔/简写/容器多选/取值', en: 'Boolean/shorthand/multi' }, icon: '☒' },
      { trigger: 'show-picker', name: { zh: 'Picker选择器', en: 'Picker' }, desc: { zh: '自定义选择器/搜索/多选', en: 'Custom select/search/multi' }, icon: '⬇' },
      { trigger: 'show-basic', name: { zh: '段落与链接', en: 'Text & Link' }, desc: { zh: '文本段落、超链接、分割线', en: 'Paragraphs, links, hr' }, icon: '↗' },
      { trigger: 'demo-img', name: { zh: '图片组件', en: 'Image' }, desc: { zh: '单图/头像/圆角/边框', en: 'Single image variants' }, icon: '▣' },
      { trigger: 'demo-imgs', name: { zh: '多图九宫格', en: 'Image Grid' }, desc: { zh: '1-9图自适应网格', en: '1-9 image grid' }, icon: '⊞' },
      { trigger: 'demo-code', name: { zh: '代码块', en: 'Code Block' }, desc: { zh: '多语言语法高亮', en: 'Multi-language highlighting' }, icon: '⌘' },
      { trigger: 'demo-md', name: { zh: 'Markdown', en: 'Markdown' }, desc: { zh: '富文本Markdown渲染', en: 'Rich Markdown' }, icon: 'M' },
      { trigger: 'demo-align', name: { zh: '对齐方式', en: 'Alignment' }, desc: { zh: '文本/卡片/行对齐', en: 'Text/card/row align' }, icon: '≡' },
      { trigger: 'demo-textarea', name: { zh: '多行文本框', en: 'Textarea' }, desc: { zh: 'textarea各种状态', en: 'Textarea states' }, icon: '☰' },
      { trigger: 'demo-divider', name: { zh: '分割线', en: 'Divider' }, desc: { zh: '线型/文字/竖向/颜色', en: 'Line/text/vertical/color' }, icon: '─' },
      { trigger: 'demo-tag', name: { zh: '标签', en: 'Tag' }, desc: { zh: '标记与分类', en: 'Labels and categories' }, icon: '●' },
      { trigger: 'demo-progress', name: { zh: '进度条/步骤条', en: 'Progress/Steps' }, desc: { zh: '线形/环形/内联/步骤', en: 'Line/circle/span/steps' }, icon: '◐' },
      { trigger: 'demo-callout', name: { zh: '提示框', en: 'Callout' }, desc: { zh: 'info/success/warning/error', en: 'Info/success/warning/error' }, icon: '!' },
      { trigger: 'demo-copy', name: { zh: '复制按钮', en: 'Copy' }, desc: { zh: '一键复制+代码块复制', en: 'One-click copy' }, icon: '⧉' },
      { trigger: 'demo-spin', name: { zh: '加载指示', en: 'Spin' }, desc: { zh: 'spinner/dots/pulse', en: 'Spinner/dots/pulse' }, icon: '◎' },
      { trigger: 'demo-pagination', name: { zh: 'Pagination 分页', en: 'Pagination' }, desc: { zh: '页码/省略号/尺寸', en: 'Pages/ellipsis/size' }, icon: '📄' },
      { trigger: 'demo-dropdown', name: { zh: 'Dropdown 下拉菜单', en: 'Dropdown' }, desc: { zh: '触发按钮/菜单项/禁用', en: 'Trigger/items/disabled' }, icon: '📋' },
      { trigger: 'demo-countdown', name: { zh: '倒计时', en: 'Countdown' }, desc: { zh: '实时倒计时/天时分秒', en: 'Live countdown' }, icon: '⏱' },
      { trigger: 'demo-code-highlight', name: { zh: '语法高亮', en: 'Syntax Highlight' }, desc: { zh: '11语言零依赖着色', en: '11-language zero-dep coloring' }, icon: '🎨' },
    ]
  },
  {
    id: 'form',
    name: { zh: '表单控件', en: 'Form Controls' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    items: [
      { trigger: 'demo-switch', name: { zh: '开关组件', en: 'Switch' }, desc: { zh: '开关切换/尺寸/禁用', en: 'Toggle/sizes/disabled' }, icon: '⊘' },
      { trigger: 'demo-toggle', name: { zh: 'Toggle 切换按钮', en: 'Toggle' }, desc: { zh: '单选/多选按钮组', en: 'Single/multi toggle group' }, icon: '⇅' },
      { trigger: 'demo-slider', name: { zh: '滑块', en: 'Slider' }, desc: { zh: '数值选择/范围/步长', en: 'Value/range/step' }, icon: '≡' },
      { trigger: 'demo-rate', name: { zh: '评分', en: 'Rate' }, desc: { zh: '星级评分/自定义', en: 'Star rating/custom' }, icon: '★' },
      { trigger: 'demo-transfer', name: { zh: '穿梭框', en: 'Transfer' }, desc: { zh: '双列表选择', en: 'Dual-list/select' }, icon: '⇄' },
      { trigger: 'demo-cascader', name: { zh: '级联选择', en: 'Cascader' }, desc: { zh: '多级联动选择', en: 'Multi-level cascading' }, icon: '⋙' },
      { trigger: 'demo-input-tag', name: { zh: '标签输入', en: 'InputTag' }, desc: { zh: '回车添加/点击删除', en: 'Enter add/click remove' }, icon: '🏷' },
      { trigger: 'demo-numinput', name: { zh: '数字输入', en: 'NumInput' }, desc: { zh: '增减按钮/步长/范围', en: 'Stepper/range/step' }, icon: '±' },
      { trigger: 'demo-upload', name: { zh: '文件上传', en: 'Upload' }, desc: { zh: '拖拽/点击上传', en: 'Drag & click upload' }, icon: '⬆' },
      { trigger: 'demo-calendar', name: { zh: '日历', en: 'Calendar' }, desc: { zh: '月历视图/日期标记', en: 'Month view/date marks' }, icon: '📅' },
      { trigger: 'demo-datepicker', name: { zh: '日期/时间选择', en: 'DatePicker' }, desc: { zh: '日期/时间/日期时间选择器', en: 'Date/Time/DateTime picker' }, icon: '🕖' },
    ]
  },
  {
    id: 'form-action',
    name: { zh: '表单动作专题', en: 'Form Actions' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    items: [
      { trigger: 'fa-bind', name: { zh: '表单显式绑定', en: 'form:ID Binding' }, desc: { zh: '按钮在表单外靠 form:ID 精确绑定', en: 'Outside-button binds form by ID' }, icon: '🔗' },
      { trigger: 'fa-submit-reset', name: { zh: '提交与重置', en: 'Submit & Reset' }, desc: { zh: 'sub 收集全字段 / reset 复原自定义控件', en: 'Collect all / reset custom controls' }, icon: '↺' },
      { trigger: 'fa-print', name: { zh: '打印区与打印按钮', en: 'Print Area' }, desc: { zh: 'print-area 1:1 打印 / 按钮不进预览', en: '1:1 print, button hidden in preview' }, icon: '🖨' },
      { trigger: 'fa-order', name: { zh: '综合订单页', en: 'Combo Order' }, desc: { zh: '表单+提交+重置+打印整卡', en: 'Form+submit+reset+print card' }, icon: '✦' },
    ]
  },
  {
    id: 'media',
    name: { zh: '媒体组件', en: 'Media' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    items: [
      { trigger: 'demo-video', name: { zh: 'Video 视频', en: 'Video' }, desc: { zh: '基础/封面/卡片/AI交付/多视频网格', en: 'Basic/poster/card/AI/grid' }, icon: '🎬' },
      { trigger: 'demo-audio', name: { zh: 'Audio 音频', en: 'Audio' }, desc: { zh: '标题/时长/TTS对话/播报系列', en: 'Title/duration/TTS/series' }, icon: '🔊' },
    ]
  },
  {
    id: 'ai-chat',
    name: { zh: 'AI 对话', en: 'AI Chat' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    items: [
      { trigger: 'demo-welcome', name: { zh: 'Welcome 欢迎页', en: 'Welcome' }, desc: { zh: '新对话欢迎界面+功能卡片', en: 'New chat welcome + feature cards' }, icon: '👋' },
      { trigger: 'demo-tool-call', name: { zh: 'Tool Call 工具调用', en: 'Tool Call' }, desc: { zh: '5种状态：等待/运行/完成/出错/拒绝', en: '5 statuses: pending/running/done/error/denied' }, icon: '🔧' },
      { trigger: 'demo-typing', name: { zh: 'Typing 打字指示', en: 'Typing' }, desc: { zh: 'AI等待动画/弹跳圆点/文字标签', en: 'Bounce dots/Text label' }, icon: '⏳' },
      { trigger: 'demo-quick-reply', name: { zh: 'Quick Reply 快捷回复', en: 'Quick Reply' }, desc: { zh: '一键回复建议/对话引导', en: 'Quick suggestion chips' }, icon: '💬' },
      { trigger: 'demo-suggestions', name: { zh: 'Suggestions 提示卡片', en: 'Suggestions' }, desc: { zh: '富文本提示建议卡片/网格布局', en: 'Rich suggestion cards with grid' }, icon: '💡' },
      { trigger: 'demo-source', name: { zh: 'Source 引用来源', en: 'Source' }, desc: { zh: 'RAG引用卡片/编号+链接+摘要', en: 'RAG citation cards' }, icon: '📚' },
      { trigger: 'demo-diff', name: { zh: 'Diff 代码差异', en: 'Diff' }, desc: { zh: 'AI改代码差异对比/红绿着色', en: 'Code diff with +/- coloring' }, icon: '📝' },
      { trigger: 'demo-diff-variants', name: { zh: 'Diff 多场景', en: 'Diff Variants' }, desc: { zh: 'CSS/Python等多语言diff', en: 'Multi-language diff demos' }, icon: '🔀' },
      { trigger: 'demo-plan', name: { zh: 'Plan 任务计划', en: 'Plan' }, desc: { zh: 'Agent执行计划/5种步骤状态', en: 'Agent plan with 5 step statuses' }, icon: '📋' },
      { trigger: 'demo-agent', name: { zh: 'Agent 状态', en: 'Agent' }, desc: { zh: 'Agent实时状态/多Agent协作', en: 'Agent status/multi-agent' }, icon: '🤖' },
      { trigger: 'demo-file-tree', name: { zh: 'File Tree 文件树', en: 'File Tree' }, desc: { zh: '项目文件结构/展开折叠/修改标记', en: 'File structure with toggle/badge' }, icon: '📁' },
      { trigger: 'demo-terminal', name: { zh: 'Terminal 终端', en: 'Terminal' }, desc: { zh: '命令执行输出/成功失败状态', en: 'Command output/success/error' }, icon: '💻' },
      { trigger: 'demo-shimmer', name: { zh: 'Shimmer 闪光加载', en: 'Shimmer' }, desc: { zh: '流式加载占位/4种类型', en: 'Streaming placeholder/4 types' }, icon: '✨' },
      { trigger: 'demo-latency', name: { zh: 'Latency 耗时标记', en: 'Latency' }, desc: { zh: '推理耗时/思考/生成/总计', en: 'Thinking/generating/total latency' }, icon: '⏱' },
      { trigger: 'demo-thought-chain', name: { zh: 'ThoughtChain 推理链', en: 'ThoughtChain' }, desc: { zh: '推理步骤时间轴/4种状态', en: 'Reasoning timeline/4 statuses' }, icon: '🔗' },
      { trigger: 'demo-think', name: { zh: '思考块', en: 'Think' }, desc: { zh: 'AI思考过程折叠', en: 'AI thinking fold' }, icon: '?' },
      { trigger: 'demo-thumb', name: { zh: '点赞/点踩', en: 'Thumb' }, desc: { zh: 'AI回答反馈', en: 'AI response feedback' }, icon: '👍' },
      { trigger: 'demo-chat-ui', name: { zh: 'AI对话组件', en: 'AI Chat UI' }, desc: { zh: 'Bubble/Toolbar/Skeleton/Toast', en: 'Bubble/Toolbar/Skeleton/Toast' }, icon: '💬' },
      { trigger: 'demo-chat-input', name: { zh: '对话输入', en: 'Chat Input' }, desc: { zh: 'AI对话输入框', en: 'AI chat input box' }, icon: '✎' },
      { trigger: 'demo-msg-actions', name: { zh: '消息操作', en: 'Msg Actions' }, desc: { zh: '复制/重生成/赞/踩', en: 'Copy/regen/like/dislike' }, icon: '⚡' },
      { trigger: 'demo-md-enhanced', name: { zh: 'Markdown增强', en: 'Markdown Plus' }, desc: { zh: '围栏/任务列表/引用/对齐', en: 'Fences/tasks/quote/align' }, icon: '✦' },
      { trigger: 'demo-notification', name: { zh: '通知组件', en: 'Notification' }, desc: { zh: '全局堆叠通知', en: 'Global stacked notifications' }, icon: '🔔' },
      { trigger: 'demo-error-boundary', name: { zh: '错误边界', en: 'Error Boundary' }, desc: { zh: '渲染容错降级', en: 'Render error tolerance' }, icon: '⚠' },
      { trigger: 'demo-file', name: { zh: '文件卡片', en: 'File' }, desc: { zh: '多类型文件预览', en: 'Multi-type file preview' }, icon: '📎' },
      { trigger: 'demo-quote', name: { zh: 'Quote 消息引用', en: 'Quote' }, desc: { zh: '引用消息回复/角色标记', en: 'Quote reply with role badge' }, icon: '💬' },
      { trigger: 'demo-attachments', name: { zh: 'Attachments 附件', en: 'Attachments' }, desc: { zh: '聊天文件附件区域/类型图标', en: 'Chat file attachments/type icons' }, icon: '📎' },
      { trigger: 'demo-sandbox', name: { zh: 'Sandbox 代码沙盒', en: 'Sandbox' }, desc: { zh: 'HTML实时预览/安全沙盒', en: 'Live HTML preview/sandboxed' }, icon: '🖼' },
      { trigger: 'demo-commit', name: { zh: 'Commit 提交', en: 'Commit' }, desc: { zh: 'Git提交信息/增删统计', en: 'Git commit with +/- stats' }, icon: '📦' },
      { trigger: 'demo-test-result', name: { zh: 'Test Result 测试', en: 'Test Result' }, desc: { zh: '测试结果/通过失败跳过', en: 'Pass/fail/skip test results' }, icon: '🧪' },
      { trigger: 'demo-ai-advanced', name: { zh: '★ 高级组件合集', en: '★ Advanced Set' }, desc: { zh: '视频+音频+引用+沙盒+提交+测试', en: 'Video+Audio+Quote+Sandbox+Commit+Test' }, icon: '★' },
      { trigger: 'demo-artifact', name: { zh: 'Artifact 代码预览', en: 'Artifact Preview' }, desc: { zh: '侧边面板Code/Preview切换+拖拽', en: 'Side panel Code/Preview toggle + drag resize' }, icon: '◫' },
      { trigger: 'demo-conversations', name: { zh: 'Conversations 会话列表', en: 'Conversations' }, desc: { zh: '时间分组/激活/删除', en: 'Time grouping/active/delete' }, icon: '💬' },
    ]
  },
  {
    id: 'layout',
    name: { zh: '布局容器', en: 'Layout' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg>',
    items: [
      { trigger: 'demo-grid', name: { zh: '栅格布局', en: 'Grid' }, desc: { zh: '12列网格系统', en: '12-column grid' }, icon: '⊞' },
      { trigger: 'demo-card', name: { zh: '卡片组件', en: 'Card' }, desc: { zh: '多变体卡片含footer', en: 'Card with footer' }, icon: '▢' },
      { trigger: 'demo-list', name: { zh: '列表', en: 'List' }, desc: { zh: '有序/无序列表', en: 'Ordered/unordered' }, icon: '≡' },
      { trigger: 'demo-tabs', name: { zh: '标签页', en: 'Tabs' }, desc: { zh: '纯CSS标签切换', en: 'Pure CSS tabs' }, icon: '◇' },
      { trigger: 'demo-accordion', name: { zh: '手风琴', en: 'Accordion' }, desc: { zh: '折叠面板', en: 'Collapse panels' }, icon: '▼' },
      { trigger: 'demo-dialog', name: { zh: '对话框', en: 'Dialog' }, desc: { zh: '模态对话框', en: 'Modal dialogs' }, icon: '◻' },
      { trigger: 'demo-drawer', name: { zh: '抽屉', en: 'Drawer' }, desc: { zh: '侧滑面板/四方向', en: 'Slide panel/4 directions' }, icon: '◧' },
      { trigger: 'demo-timeline', name: { zh: '时间轴', en: 'Timeline' }, desc: { zh: '纵向/横向/交替/卡片', en: 'Vertical/horizontal/alternate/card' }, icon: '◈' },
      { trigger: 'demo-carousel', name: { zh: '轮播图', en: 'Carousel' }, desc: { zh: '图片轮播/自动播放/手动切换', en: 'Image carousel/auto-play' }, icon: '◀▶' },
      { trigger: 'demo-desc', name: { zh: '描述列表', en: 'Descriptions' }, desc: { zh: '键值对详情/边框/斑马纹', en: 'Key-value detail list' }, icon: '≡' },
      { trigger: 'demo-scroll-area', name: { zh: '滚动区域', en: 'Scroll Area' }, desc: { zh: '自定义滚动条容器', en: 'Custom scrollbar container' }, icon: '⇕' },
      { trigger: 'demo-sidebar', name: { zh: '侧边栏', en: 'Sidebar' }, desc: { zh: '可折叠侧边导航', en: 'Collapsible sidebar nav' }, icon: '◧' },
      { trigger: 'demo-resizable', name: { zh: '分割面板', en: 'Resizable' }, desc: { zh: '可拖拽分割线/水平垂直', en: 'Draggable split pane H/V' }, icon: '↔' },
      { trigger: 'demo-canvas', name: { zh: 'Canvas 侧面板', en: 'Canvas Panel' }, desc: { zh: '侧滑预览面板/展开折叠', en: 'Slide-in preview panel' }, icon: '◫' },
      { trigger: 'demo-tooltip', name: { zh: 'Tooltip 提示', en: 'Tooltip' }, desc: { zh: '四方向悬浮提示', en: '4-direction tooltip' }, icon: '💡' },
      { trigger: 'demo-popover', name: { zh: '气泡卡片', en: 'Popover' }, desc: { zh: '点击/悬浮触发富内容', en: 'Click/hover rich content' }, icon: '💬' },
      { trigger: 'demo-hover-card', name: { zh: 'Hover Card', en: 'Hover Card' }, desc: { zh: '悬浮信息卡片', en: 'Hover-triggered info card' }, icon: '🃏' },
      { trigger: 'demo-popconfirm', name: { zh: '确认气泡', en: 'Popconfirm' }, desc: { zh: '点击确认/取消', en: 'Click confirm/cancel' }, icon: '❓' },
      { trigger: 'demo-watermark', name: { zh: '水印', en: 'Watermark' }, desc: { zh: '内容叠加半透明水印', en: 'Overlay watermark on content' }, icon: '💧' },
      { trigger: 'demo-backtop', name: { zh: '回到顶部', en: 'Backtop' }, desc: { zh: '滚动出现/点击回顶', en: 'Scroll-to-top button' }, icon: '⬆' },
      { trigger: 'demo-menu', name: { zh: '菜单', en: 'Menu' }, desc: { zh: '纵横向导航菜单', en: 'Vertical/horizontal nav' }, icon: '📋' },
      { trigger: 'demo-breadcrumb', name: { zh: '面包屑', en: 'Breadcrumb' }, desc: { zh: '路径导航/分隔符', en: 'Path nav/separators' }, icon: '»' },
      { trigger: 'demo-command', name: { zh: '命令面板', en: 'Command' }, desc: { zh: '按钮唤起/搜索/键盘导航', en: 'Button-triggered search/nav' }, icon: '⌘' },
      { trigger: 'demo-tree', name: { zh: '树形控件', en: 'Tree' }, desc: { zh: '目录树/组织架构', en: 'Directory/org tree' }, icon: '🌲' },
    ]
  },
  {
    id: 'data',
    name: { zh: '数据展示', en: 'Data Display' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
    items: [
      { trigger: 'demo-table', name: { zh: '表格组件', en: 'Table Variants' }, desc: { zh: '基础/斑马/边框/紧凑', en: 'Basic/striped/bordered' }, icon: '▦' },
      { trigger: 'demo-table-colspan', name: { zh: '合并单元格', en: 'Colspan' }, desc: { zh: 'colspan行列合并', en: 'Row/column merge' }, icon: '⇔' },
      { trigger: 'demo-table-enterprise', name: { zh: '企业表格', en: 'Enterprise' }, desc: { zh: 'ERP/MES业务场景', en: 'ERP/MES scenarios' }, icon: '◫' },
      { trigger: 'demo-crud', name: { zh: 'CRUD管理', en: 'CRUD' }, desc: { zh: '增删改查完整流程', en: 'Full CRUD workflow' }, icon: '✎' },
      { trigger: 'demo-stat', name: { zh: '统计数值', en: 'Statistic' }, desc: { zh: '数据展示/趋势指示', en: 'Data display/trend' }, icon: '#' },
      { trigger: 'demo-barcode', name: { zh: '条形码', en: 'Barcode' }, desc: { zh: 'Code128 运单/订单号', en: 'Code128 tracking/order' }, icon: '▮' },
      { trigger: 'demo-qrcode', name: { zh: '二维码', en: 'QR Code' }, desc: { zh: 'QR 码 URL/文本/WiFi', en: 'QR URL/text/WiFi' }, icon: '▦' },
      { trigger: 'demo-badge', name: { zh: 'Badge 徽标数', en: 'Badge' }, desc: { zh: '数字徽标/小红点/状态标签/尺寸', en: 'Count/Dot/Status/Size' }, icon: '🏷' },
      { trigger: 'demo-dot', name: { zh: 'Dot 状态指示器', en: 'Dot' }, desc: { zh: '状态点/脉冲/尺寸', en: 'Status dot/pulse/size' }, icon: '🟢' },
      { trigger: 'demo-avatar', name: { zh: 'Avatar 头像', en: 'Avatar' }, desc: { zh: '文字/图片/自动配色', en: 'Text/image/auto-color' }, icon: '👤' },
      { trigger: 'demo-skeleton', name: { zh: 'Skeleton 骨架屏', en: 'Skeleton' }, desc: { zh: 'text/card/avatar/image', en: 'text/card/avatar/image' }, icon: '⏳' },
      { trigger: 'demo-result', name: { zh: '结果页', en: 'Result' }, desc: { zh: '成功/失败/警告/提示', en: 'Success/error/warning/info' }, icon: '✓' },
      { trigger: 'demo-empty', name: { zh: '空状态', en: 'Empty' }, desc: { zh: '无数据占位提示', en: 'Empty placeholder' }, icon: '∅' },
    ]
  },
  {
    id: 'svg-chart',
    name: { zh: 'SVG 图表', en: 'SVG Charts' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    items: [
      { trigger: 'demo-chart', name: { zh: '图表组件', en: 'Chart' }, desc: { zh: '柱/折/面积/饼/环/雷达/散点/气泡/热力/仪表盘等 20 种', en: '20 types: bar/line/pie/radar/heatmap/gauge...' }, icon: '📊' },
      { trigger: 'demo-chart-bar', name: { zh: '柱状图', en: 'Bar' }, desc: { zh: '大规模数据·50/40 数据点', en: 'Large scale · 50/40 points' }, icon: '📈' },
      { trigger: 'demo-chart-gantt', name: { zh: '甘特图', en: 'Gantt' }, desc: { zh: '项目排期/MES排程', en: 'Project/MES scheduling' }, icon: '📅' },
      { trigger: 'demo-chart-funnel', name: { zh: '漏斗图', en: 'Funnel' }, desc: { zh: '销售/转化漏斗', en: 'Sales/conversion funnel' }, icon: '🔻' },
      { trigger: 'demo-chart-zoom', name: { zh: '缩放 Zoom', en: 'Zoom' }, desc: { zh: 'line/K线/箱线 dataZoom 拖拽缩放', en: 'line/candle/box dataZoom' }, icon: '🔍' },
    ]
  },
  {
    id: 'combo',
    name: { zh: '综合应用', en: 'Showcase' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    items: [
      { trigger: 'show-form', name: { zh: '表单交互', en: 'Form' }, desc: { zh: '注册表单全字段', en: 'Full registration form' }, icon: '☐' },
      { trigger: 'show-formdata', name: { zh: '表单+表格', en: 'Form + Table' }, desc: { zh: '数据录入联动', en: 'Data entry linked' }, icon: '⇄' },
      { trigger: 'show-card-footer', name: { zh: '卡片页脚', en: 'Card Footer' }, desc: { zh: '卡片含操作按钮', en: 'Card action buttons' }, icon: '▥' },
      { trigger: 'show-complex', name: { zh: '综合全量', en: 'All Components' }, desc: { zh: '所有组件大合集', en: 'Full showcase' }, icon: '✦' },
    ]
  },
  {
    id: 'report',
    name: { zh: '报告类生成', en: 'Report Generation' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    items: [
      { trigger: 'report-blood', name: { zh: '血常规报告', en: 'Blood Test' }, desc: { zh: '医学检验报告布局', en: 'Medical lab report' }, icon: '🩸' },
      { trigger: 'report-query', name: { zh: '数据查询报告', en: 'Query Report' }, desc: { zh: '系统日志查询结果', en: 'System query results' }, icon: '🔍' },
      { trigger: 'report-sales', name: { zh: '销售分析报告', en: 'Sales Report' }, desc: { zh: '销售仪表盘式报告', en: 'Sales dashboard report' }, icon: '📈' },
      { trigger: 'report-customer', name: { zh: '客户分析报告', en: 'Customer Analysis' }, desc: { zh: '客户洞察分析报告', en: 'Customer insight report' }, icon: '👥' },
    ]
  },
  {
    id: 'upd',
    name: { zh: 'UPD 动态更新', en: 'UPD Live Update' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    items: [
      { trigger: 'demo-upd-progress', name: { zh: '进度/步骤', en: 'Progress/Steps' }, desc: { zh: '异步推送进度更新', en: 'Async progress push' }, icon: '◐' },
      { trigger: 'demo-upd-card', name: { zh: '卡片更新', en: 'Card' }, desc: { zh: '标题/内容动态刷新', en: 'Title/body refresh' }, icon: '▢' },
      { trigger: 'demo-upd-btn', name: { zh: '按钮更新', en: 'Button' }, desc: { zh: '禁用/文本切换', en: 'Disable/text toggle' }, icon: '▶' },
      { trigger: 'demo-upd-collapse', name: { zh: '折叠更新', en: 'Collapse' }, desc: { zh: '展开/折叠切换', en: 'Open/close toggle' }, icon: '▼' },
      { trigger: 'demo-upd-dialog', name: { zh: '对话框更新', en: 'Dialog' }, desc: { zh: '打开/关闭/标题更新', en: 'Open/close/title update' }, icon: '◻' },
      { trigger: 'demo-upd-tool-call', name: { zh: '工具调用流转', en: 'Tool-Call' }, desc: { zh: 'pending→running→done', en: 'Status transitions' }, icon: '⚡' },
      { trigger: 'demo-upd-steps', name: { zh: '步骤推进', en: 'Steps' }, desc: { zh: '步骤条动态推进', en: 'Step progression' }, icon: '▶' },
      { trigger: 'demo-upd-switch', name: { zh: '开关切换', en: 'Switch' }, desc: { zh: '自动启用/禁用', en: 'Auto enable/disable' }, icon: '🔄' },
      { trigger: 'demo-upd-drawer', name: { zh: '抽屉更新', en: 'Drawer' }, desc: { zh: '自动弹出/关闭', en: 'Auto open/close' }, icon: '◧' },
      { trigger: 'demo-upd-agent', name: { zh: 'Agent 状态', en: 'Agent' }, desc: { zh: '多Agent协作流转', en: 'Multi-agent flow' }, icon: '🤖' },
      { trigger: 'demo-upd-chat-input', name: { zh: '输入状态', en: 'Chat Input' }, desc: { zh: '禁用/启用输入框', en: 'Disable/enable input' }, icon: '⌨' },
      { trigger: 'demo-upd-form', name: { zh: '表单联动', en: 'Form Linkage' }, desc: { zh: '多控件联动更新', en: 'Linked form updates' }, icon: '🔗' },
      { trigger: 'demo-upd-stat', name: { zh: '统计数值', en: 'Stat' }, desc: { zh: '实时数据监控', en: 'Live data monitor' }, icon: '📊' },
    ]
  },
  {
    id: 'test',
    name: { zh: '特殊测试', en: 'Special Tests' },
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    items: [
      { trigger: 'test-fragment', name: { zh: '碎片推送渲染', en: 'Fragment Push' }, desc: { zh: '标签拆碎推送/解析鲁棒性', en: 'Fragmented tag push/parser robustness' }, icon: '🧩' },
      { trigger: 'test-big-table', name: { zh: '超大型表格流式', en: 'Huge Table Stream' }, desc: { zh: '合并表头+单元格多组件·逐 cell 流式', en: 'Merged header + cell components · cell stream' }, icon: '📋' },
      { trigger: 'test-pie', name: { zh: '饼图独立碎片', en: 'Pie Fragment' }, desc: { zh: '饼图 1/2/3/4 列布局与少/多数据碎片渲染', en: 'Pie chart 1/2/3/4-col layouts, sparse/dense data fragments' }, icon: '🥧' },
    ]
  }
];

// ========================================
// i18n
// ========================================

// 语言状态（localStorage 持久化，与主题同构）：首次访问读取上次选择
const LANG_KEY = 'tokui-demo-lang';
let lang = 'zh';
try { const stored = localStorage.getItem(LANG_KEY); if (stored === 'en' || stored === 'zh') lang = stored; } catch (e) {}
function persistLang() { try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* localStorage 不可用时静默 */ } }

// 已渲染的 AI 消息记录（语言切换时本地就地重画，不发请求、不清聊天）
let renders = [];

const I18N = {
  tagline:        { zh: '流式UI描述与渲染框架', en: 'Streaming UI Description and Rendering Framework' },
  modeStream:     { zh: '流式渲染', en: 'Streaming' },
  modeSource:     { zh: '源码流', en: 'Source Stream' },
  langToggle:     { zh: 'EN', en: '中文' },
  welcomeTitle:   { zh: '流式 UI 描述与渲染框架', en: 'Streaming UI Description & Rendering Framework' },
  welcomeHint:    { zh: '从左侧导航选择一个案例开始体验', en: 'Select a demo from the sidebar to start' },
  viewSource:     { zh: '源码', en: 'Source' },
  viewUI:         { zh: '界面', en: 'UI' },
  copy:           { zh: '复制', en: 'Copy' },
  copied:         { zh: '已复制', en: 'Copied' },
  format:         { zh: '格式化', en: 'Format' },
  minify:         { zh: '压缩', en: 'Minify' },
  tokenStats:     { zh: '{{count}} tokens · {{chars}} 字符', en: '{{count}} tokens · {{chars}} chars' },
  thinking:       { zh: '思考中', en: 'Thinking' },
  error:          { zh: '错误', en: 'Error' },
  errorMsg:       { zh: '无法连接服务器: {{msg}}\n请确保在 demo 目录运行了: npm start',
                    en: 'Cannot connect: {{msg}}\nMake sure to run: npm start inside demo/' },
  featZero:       { zh: '零依赖', en: 'Zero Deps' },
  featStream:     { zh: '流式渲染', en: 'Streaming' },
  featIncr:       { zh: '增量解析', en: 'Incremental' },
  featSSE:        { zh: '轻量 DSL', en: 'Lightweight DSL' },
  regData:        { zh: '注册数据', en: 'Registration Data' },
  loginData:      { zh: '登录数据', en: 'Login Data' },
  addEmpData:     { zh: '添加员工', en: 'Add Employee' },
  action:         { zh: '操作', en: 'Action' },
  editClicked:    { zh: '编辑按钮被点击', en: 'Edit button clicked' },
  deleteClicked:  { zh: '删除按钮被点击', en: 'Delete button clicked' },
  footerVer:      { zh: '当前版本:v0.1.6', en: 'Version: v0.1.6' },
  footerCopy:     { zh: '零依赖 · 流式UI描述与渲染框架', en: 'Zero Deps · Streaming UI Framework' },
  dslRef:         { zh: 'DSL 语法速查', en: 'DSL Syntax Ref' },
  clearBtn:       { zh: '清空', en: 'Clear' },
  contactBtn:     { zh: '联系', en: 'Contact' },
  officialSite:   { zh: '官网', en: 'Official Site' },
  community:      { zh: '社群', en: 'Community' },
  communityTitle: { zh: '加入社群', en: 'Join Community' },
  communitySub:   { zh: '微信扫码 · 加作者进群交流', en: 'Scan with WeChat · Join the group' },
  communityHint:  { zh: '扫码加作者微信，拉你进 TokUI 技术交流群', en: 'Scan to add the author on WeChat and join the TokUI group' },
  qrTitle:        { zh: '联系我们', en: 'Contact Us' },
  qrSub:          { zh: '扫码添加，欢迎反馈', en: 'Scan to connect' },
  qrHint:         { zh: '扫码联系我们', en: 'Scan to contact us' },
};

// ========================================
// Welcome DSL Demo
// ========================================

var WELCOME_DSL_SEGMENTS = [
  {
    zh: [
      '[card tt:"TokUI 演示"]',
      '\n  [h2 快速开始]',
      '\n  [p 从左侧导航选择一个案例体验',
      '流式渲染]',
      '\n  [row]',
      '\n    [col span:4 📊 表格][/col]',
      '\n    [col span:4 📝 表单][/col]',
      '\n    [col span:4 🎨 卡片][/col]',
      '\n  [/row]',
      '\n[/card]'
    ],
    en: [
      '[card tt:"TokUI Demo"]',
      '\n  [h2 Quick Start]',
      '\n  [p Select a demo from the sidebar',
      ' to explore]',
      '\n  [row]',
      '\n    [col span:4 📊 Table][/col]',
      '\n    [col span:4 📝 Form][/col]',
      '\n    [col span:4 🎨 Card][/col]',
      '\n  [/row]',
      '\n[/card]'
    ]
  },
  {
    zh: [
      '[table stripe]',
      '\n  [thead cols:名称,状态/c,速度/r]',
      '\n  [tbody]',
      '\n    [tr 解析器,✓,<1ms]',
      '\n    [tr 渲染器,✓,2ms]',
      '\n    [tr 主题,✓,0ms]',
      '\n    [tr 组件库,✓,3ms]',
      '\n  [/tbody]',
      '\n[/table]'
    ],
    en: [
      '[table stripe]',
      '\n  [thead cols:Name,Status/c,Speed/r]',
      '\n  [tbody]',
      '\n    [tr Parser,✓,<1ms]',
      '\n    [tr Renderer,✓,2ms]',
      '\n    [tr Theme,✓,0ms]',
      '\n    [tr Components,✓,3ms]',
      '\n  [/tbody]',
      '\n[/table]'
    ]
  },
  {
    zh: [
      '[form act:"/demo" mtd:post]',
      '\n  [input n:username ph:"输入用户名"]',
      '\n  [input n:email ph:"输入邮箱"]',
      '\n  [select n:theme]',
      '[opt v:dark tx:深色][opt v:light tx:浅色]',
      '[/select]',
      '\n  [btn tx:"提交" bg:4f46e5 fc:ffffff]',
      ' [btn tx:"重置" t:reset]',
      '\n[/form]'
    ],
    en: [
      '[form act:"/demo" mtd:post]',
      '\n  [input n:username ph:"Enter username"]',
      '\n  [input n:email ph:"Enter email"]',
      '\n  [select n:theme]',
      '[opt v:dark tx:Dark][opt v:light tx:Light]',
      '[/select]',
      '\n  [btn tx:"Submit" bg:4f46e5 fc:ffffff]',
      ' [btn tx:"Reset" t:reset]',
      '\n[/form]'
    ]
  }
];

var welcomeAnimTimer = null;
var welcomeDslTimer = null;

function initWelcomeAnim() {
  var logoEl = document.getElementById('welcomeLogo');
  if (!logoEl) return;

  var logoText = '[TokUI]';
  var logoIdx = 0;
  logoEl.textContent = '';

  function typeLogo() {
    if (logoIdx < logoText.length) {
      logoEl.textContent += logoText[logoIdx];
      logoIdx++;
      welcomeAnimTimer = setTimeout(typeLogo, 100);
    } else {
      startWelcomeDslLoop();
    }
  }
  typeLogo();
}

function startWelcomeDslLoop() {
  var segIdx = 0;
  var dslCodeEl = document.getElementById('welcomeDslCode');
  var previewBodyEl = document.getElementById('welcomePreviewBody');
  var demoEl = document.querySelector('.app-welcome-demo');
  if (!dslCodeEl || !previewBodyEl) return;

  function playSegment() {
    var chunks = WELCOME_DSL_SEGMENTS[segIdx][lang] || WELCOME_DSL_SEGMENTS[segIdx].zh;
    dslCodeEl.textContent = '';
    previewBodyEl.innerHTML = '';

    var tokui = new TokUI.TokUI({ container: previewBodyEl, theme: computeTokuiTheme() });
    tokui.startStream(previewBodyEl);

    var chunkIdx = 0;

    function feedChunk() {
      if (chunkIdx < chunks.length) {
        var chunk = chunks[chunkIdx];
        dslCodeEl.textContent += chunk;
        tokui.feed(chunk);
        chunkIdx++;
        welcomeDslTimer = setTimeout(feedChunk, 70);
      } else {
        tokui.endStream();
        welcomeDslTimer = setTimeout(function() {
          if (demoEl) {
            demoEl.style.transition = 'opacity 0.4s ease';
            demoEl.style.opacity = '0';
          }
          welcomeDslTimer = setTimeout(function() {
            segIdx = (segIdx + 1) % WELCOME_DSL_SEGMENTS.length;
            if (demoEl) {
              demoEl.style.opacity = '1';
            }
            playSegment();
          }, 400);
        }, 2000);
      }
    }
    feedChunk();
  }

  playSegment();
}

function stopWelcomeAnim() {
  if (welcomeAnimTimer) { clearTimeout(welcomeAnimTimer); welcomeAnimTimer = null; }
  if (welcomeDslTimer) { clearTimeout(welcomeDslTimer); welcomeDslTimer = null; }
}

function t(key, vars) {
  let text = I18N[key] ? I18N[key][lang] : key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), v);
    });
  }
  return text;
}

// ========================================
// SVG Icons
// ========================================

const SVG_PLAY = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21"/></svg>';
const SVG_CODE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
const SVG_EYE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const SVG_COPY = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const SVG_CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
const SVG_FORMAT = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>';

const SVG_CARD_CODE = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
const SVG_CARD_EYE = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const SVG_CARD_COPY = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const SVG_CARD_CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
const SVG_CARD_FORMAT = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>';

// ========================================
// Event Handlers
// ========================================

TokUI.registerHandler('handleRegister', (data) => addSystemMessage(t('regData'), JSON.stringify(data, null, 2)));
TokUI.registerHandler('handleLogin', (data) => addSystemMessage(t('loginData'), JSON.stringify(data, null, 2)));
TokUI.registerHandler('handleAddEmployee', (data) => addSystemMessage(t('addEmpData'), JSON.stringify(data, null, 2)));
TokUI.registerHandler('handleEdit', () => addSystemMessage(t('action'), t('editClicked')));
TokUI.registerHandler('handleDelete', () => addSystemMessage(t('action'), t('deleteClicked')));
TokUI.registerHandler('handleSave', () => addSystemMessage(t('action'), '保存'));
TokUI.registerHandler('handleCancel', () => addSystemMessage(t('action'), '取消'));
TokUI.registerHandler('handleExport', () => addSystemMessage(t('action'), '导出'));
TokUI.registerHandler('handleSearch', (data) => addSystemMessage('搜索', JSON.stringify(data, null, 2)));

// === 表单动作专题 handler（reset/print 为内置动作，无需 handler）===
TokUI.registerHandler('faBindA', (data) => addSystemMessage('表单 A 提交数据', JSON.stringify(data, null, 2)));
TokUI.registerHandler('faBindB', (data) => addSystemMessage('表单 B 提交数据', JSON.stringify(data, null, 2)));
TokUI.registerHandler('faSubmit', (data) => addSystemMessage('表单提交数据', JSON.stringify(data, null, 2)));
TokUI.registerHandler('faResetCb', () => addSystemMessage('已重置', '表单已恢复初始值（含自定义控件）'));

// 收集 card 内所有 input/pwd/textarea/select 的 name:value 键值对
TokUI.registerHandler('collectCardInputs', (data, event, element) => {
  // 从按钮向上找最近的 .tokui-card
  var card = element.closest('.tokui-card');
  if (!card) return;
  var result = {};
  // input + textarea
  card.querySelectorAll('input[name], textarea[name]').forEach(function(el) {
    if (el.type === 'password') {
      result[el.name] = '••••••';
    } else {
      result[el.name] = el.value;
    }
  });
  // select
  card.querySelectorAll('select[name]').forEach(function(el) {
    result[el.name] = el.value;
  });
  addSystemMessage('输入数据', JSON.stringify(result, null, 2));
});
TokUI.registerHandler('handleMultiSelect', (data) => addSystemMessage('多选', JSON.stringify(data, null, 2)));
TokUI.registerHandler('getSelectVal', (data) => addSystemMessage('Select 已选', JSON.stringify(data, null, 2)));
TokUI.registerHandler('getRadioVal', (data) => addSystemMessage('Radio 已选', JSON.stringify(data, null, 2)));
TokUI.registerHandler('getCheckboxVal', (data) => addSystemMessage('Checkbox 已选', JSON.stringify(data, null, 2)));
TokUI.registerHandler('handleCrudSearch', (data) => addSystemMessage('查询', JSON.stringify(data, null, 2)));
TokUI.registerHandler('handleCrudAdd', (data, _e, el) => { el.closest('dialog').close(); addSystemMessage('新增成功', JSON.stringify(data, null, 2)); });
TokUI.registerHandler('handleCrudEdit', (data, _e, el) => { el.closest('dialog').close(); addSystemMessage('编辑成功', JSON.stringify(data, null, 2)); });
TokUI.registerHandler('handleCrudDelete1', (_data, _e, el) => { el.closest('dialog').close(); addSystemMessage('删除成功', '已删除员工 张伟 (EMP-001)'); });
TokUI.registerHandler('handleCrudDelete2', (_data, _e, el) => { el.closest('dialog').close(); addSystemMessage('删除成功', '已删除员工 李娜 (EMP-002)'); });
TokUI.registerHandler('handleCrudExport', () => addSystemMessage('导出', '已导出 5 条员工数据'));
TokUI.registerHandler('handleCrudBatchDel', () => {
  const checked = document.querySelectorAll('#crudTable .tokui-chk-row:checked');
  addSystemMessage('批量删除', checked.length > 0 ? '已选 ' + checked.length + ' 条（演示）' : '请先勾选');
});
TokUI.registerHandler('openDialog', (_d, _e, el) => {
  const id = el.getAttribute('data-dialog-id');
  if (id) { const d = document.getElementById(id); if (d) { d.showModal(); return; } }
  const msg = el.closest('.msg--ai');
  const d = msg ? msg.querySelector('.tokui-dialog') : null;
  if (d) d.showModal();
});
TokUI.registerHandler('closeDialog', (_d, _e, el) => { const d = el.closest('dialog'); if (d) d.close(); });
TokUI.registerHandler('openDialogById', (_d, _e, el) => {
  const id = el.getAttribute('data-dialog-id');
  const d = id ? document.getElementById(id) : null;
  if (d) d.showModal();
});
// 命令面板：clk:openCommand data-target:"<command id>" 打开（command 默认不再抢 Cmd+K）
TokUI.registerHandler('openCommand', (_d, _e, el) => {
  const id = el.getAttribute('data-target');
  const c = id ? document.getElementById(id) : null;
  if (c && typeof c._openCommand === 'function') c._openCommand();
});
TokUI.registerHandler('closeCommand', (_d, _e, el) => {
  const id = el.getAttribute('data-target');
  const c = id ? document.getElementById(id) : null;
  if (c && typeof c._closeCommand === 'function') c._closeCommand();
});
TokUI.registerHandler('printReport', () => { window.print(); });
TokUI.registerHandler('confirmDelete', (_d, _e, el) => { el.closest('dialog').close(); addSystemMessage('操作结果', '已成功删除'); });
TokUI.registerHandler('submitFeedback', (data, _e, el) => { el.closest('dialog').close(); addSystemMessage('反馈数据', JSON.stringify(data, null, 2)); });
TokUI.registerHandler('handlePickerSubmit', (data) => addSystemMessage('Picker 表单数据', JSON.stringify(data, null, 2)));
TokUI.registerHandler('getPickerCity', () => {
  const h = document.querySelector('#city');
  if (!h) return;
  const picker = h.closest('.tokui-picker') || h.parentElement;
  const opt = picker.querySelector('.tokui-picker-option--selected');
  addSystemMessage('城市选中值', opt ? opt.getAttribute('data-value') + ' (' + opt.getAttribute('data-text') + ')' : '未选择');
});
TokUI.registerHandler('getPickerDept', () => {
  const h = document.querySelector('#dept');
  if (!h) return;
  const picker = h.closest('.tokui-picker') || h.parentElement;
  const opt = picker.querySelector('.tokui-picker-option--selected');
  addSystemMessage('部门选中值', opt ? opt.getAttribute('data-value') + ' (' + opt.getAttribute('data-text') + ')' : '未选择');
});
TokUI.registerHandler('getPickerLang', () => {
  const el = document.querySelector('[data-tokui-picker="lang"]');
  if (!el) return;
  const opts = el.querySelectorAll('.tokui-picker-option--selected');
  const vals = Array.from(opts).map(o => o.getAttribute('data-value') + ' (' + o.getAttribute('data-text') + ')');
  addSystemMessage('语言选中值', vals.length > 0 ? vals.join(', ') : '未选择');
});
TokUI.registerHandler('backtopDemo', (_data, _e, el) => {
  const v = el.getAttribute('data-v') || 'circle';
  const s = el.getAttribute('data-s') || '';
  // 移除旧的 backtop 元素
  document.querySelectorAll('.tokui-backtop').forEach(b => {
    if (b._backtopCleanup) b._backtopCleanup();
    b.remove();
  });
  // 重置所有按钮选中状态
  el.parentElement.querySelectorAll('.tokui-btn').forEach(btn => {
    btn.style.outline = '';
    btn.style.outlineOffset = '';
    btn.style.fontWeight = '';
  });
  // 高亮当前按钮
  el.style.outline = '2px solid var(--tokui-primary, #4f46e5)';
  el.style.outlineOffset = '2px';
  el.style.fontWeight = '600';
  const trigger = s ? 'demo-backtop-' + v + '-' + s : 'demo-backtop-' + v;
  sendPrompt(trigger, 'Backtop: ' + v + (s ? ' ' + s : ''));
  // 容器 demo：渲染完成后自动滚动演示
  if (v === 'container') {
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      if (attempts > 60) { clearInterval(poll); return; }
      const cards = document.querySelectorAll('.tokui-card');
      const scrollCard = Array.from(cards).find(c => c.style.maxHeight);
      const backtop = scrollCard ? scrollCard.querySelector('.tokui-backtop--container') : null;
      if (scrollCard && backtop) {
        clearInterval(poll);
        setTimeout(() => {
          scrollCard.scrollTo({ top: scrollCard.scrollHeight, behavior: 'smooth' });
          setTimeout(() => {
            scrollCard.scrollTo({ top: 0, behavior: 'smooth' });
          }, 1500);
        }, 300);
      }
    }, 500);
  }
});
TokUI.registerHandler('getPickerPerms', () => {
  const el = document.querySelector('[data-tokui-picker="perms"]');
  if (!el) return;
  const opts = el.querySelectorAll('.tokui-picker-option--selected');
  const vals = Array.from(opts).map(o => o.getAttribute('data-value') + ' (' + o.getAttribute('data-text') + ')');
  addSystemMessage('权限选中值', vals.length > 0 ? vals.join(', ') : '未选择');
});

// Toast 事件 handler
['toast-copy', 'toast-regen', 'toast-delete', 'toast-copy-code', 'toast-thumb-up', 'toast-thumb-down'].forEach(function (id) {
  TokUI.registerHandler(id, function () {
    if (window.TokUI && window.TokUI.showToast) {
      window.TokUI.showToast(id);
    }
  });
});
TokUI.registerHandler('thumb-code', function (data) {
  if (window.TokUI && window.TokUI.showToast) {
    window.TokUI.showToast('toast-thumb-up', '感谢点赞！');
  }
});
TokUI.registerHandler('thumb-code-down', function (data) {
  if (window.TokUI && window.TokUI.showToast) {
    window.TokUI.showToast('toast-thumb-down', '感谢反馈，会继续改进');
  }
});

// Pagination 分页事件
['handlePage', 'handlePage2', 'handlePage3', 'handlePage4', 'handlePage5', 'handlePage6'].forEach(function (name) {
  TokUI.registerHandler(name, function (data) {
    addSystemMessage('分页切换', '跳转到第 ' + (data.page || '?') + ' 页');
  });
});

// Dropdown 下拉菜单事件
['handleView', 'handleCopy',
  'exportCSV', 'exportExcel', 'deleteAll', 'clearTrash', 'optA', 'optB',
  'openProfile', 'openSettings', 'handleLogout'].forEach(function (name) {
  TokUI.registerHandler(name, function () {
    addSystemMessage('菜单操作', name.replace('handle', '').replace(/([A-Z])/g, ' $1').trim());
  });
});

// Switch 开关事件
['handleSwitch', 'handleSwitch2', 'handleSwitch3'].forEach(function (name) {
  TokUI.registerHandler(name, function (data, e, el) {
    var input = el.querySelector ? el.querySelector('.tokui-switch-input') : null;
    if (!input) input = el.closest ? el.closest('.tokui-switch').querySelector('.tokui-switch-input') : null;
    var checked = input ? input.checked : false;
    addSystemMessage('开关切换', (checked ? '开启' : '关闭') + ' — ' + (input ? input.id : ''));
  });
});

// Drawer 抽屉事件
TokUI.registerHandler('openDrawer', function (_d, _e, el) {
  var id = el.getAttribute('data-drawer-id');
  if (id) { var d = document.getElementById(id); if (d && d._update) d._update({ act: 'open' }); }
});
TokUI.registerHandler('closeDrawer', function (_d, _e, el) {
  var drawer = el.closest('.tokui-drawer');
  if (drawer && drawer._update) drawer._update({ act: 'close' });
});

// Breadcrumb 面包屑事件
TokUI.registerHandler('handleBreadcrumb', function (data) {
  addSystemMessage('面包屑', '点击了第 ' + (data.index + 1) + ' 项: ' + data.text);
});

// Slider 滑块事件
['handleSlider', 'handleSlider2'].forEach(function (name) {
  TokUI.registerHandler(name, function (data) {
    addSystemMessage('滑块', (data.id || 'slider') + ' 当前值: ' + data.value);
  });
});

// Rate 评分事件
['handleRate', 'handleRate2'].forEach(function (name) {
  TokUI.registerHandler(name, function (data) {
    addSystemMessage('评分', (data.id || 'rate') + ' 选中: ' + data.value + '/' + data.max);
  });
});

// Transfer 穿梭框事件
TokUI.registerHandler('handleTransfer', function (data) {
  addSystemMessage('穿梭框', (data.id || 'transfer') + ' 已选: [' + data.values.join(', ') + ']');
});

TokUI.registerHandler('handleCascader', function (data) {
  addSystemMessage('级联选择', (data.id || 'cascader') + ' 选中: ' + data.value + ' (' + data.text + ')');
});

TokUI.registerHandler('handleCascaderForm', function (data) {
  var lines = Object.keys(data).map(function(k) { return k + ': ' + data[k]; }).join('\n');
  addSystemMessage('表单提交', '已收集表单数据:\n' + lines);
});

TokUI.registerHandler('handleUpload', function (data) {
  var names = (data.files || []).map(function(f) { return f.name; }).join(', ');
  addSystemMessage('文件上传', (data.id || 'upload') + ' 文件: ' + names);
});

TokUI.registerHandler('handleTree', function (data) {
  addSystemMessage('树形控件', (data.id || 'tree') + ' 选中: ' + (data.text || data.value || ''));
});

TokUI.registerHandler('countdownDone', function (data) {
  addSystemMessage('倒计时结束', '倒计时已完成！' + (data.id ? ' ID: ' + data.id : ''));
});

TokUI.registerHandler('formSubmit', function (data) {
  addSystemMessage('表单提交', JSON.stringify(data, null, 2));
});

// DatePicker/TimePicker events
['onDate', 'onBirth', 'onTime', 'onMeeting', 'onPick', 'onStart'].forEach(function (name) {
  TokUI.registerHandler(name, function (data) {
    addSystemMessage('选择器', (data.id || name) + ' 选中: ' + data.value);
  });
});

TokUI.registerHandler('removeAttachment', function (data) {
  addSystemMessage('删除附件', '已删除: ' + (data.name || ''));
});
TokUI.registerHandler('downloadPdf', function (data) {
  addSystemMessage('下载文件', '正在下载: ' + (data.name || ''));
});
TokUI.registerHandler('removeFile', function (data) {
  addSystemMessage('删除文件', '已删除: ' + (data.name || ''));
});
TokUI.registerHandler('removeReportFile', function (data) {
  addSystemMessage('删除文件', '已删除: ' + (data.name || ''));
});
TokUI.registerHandler('downloadReport', function (data) {
  addSystemMessage('下载报告', '正在下载: ' + (data.name || ''));
});

// ========================================
// State
// ========================================

// const API_BASE = 'https://tokui.jboltai.com';
// 同源：sse-server 同时托管前端 + SSE（3109）；vite dev（5173）由 /api 代理转发
const API_BASE = '';
let sending = false;
let sendingName = '';
let renderMode = 'stream';
let activeNavId = null;

// ========================================
// Render Navigation
// ========================================

const navInner = document.getElementById('navInner');

function renderNav() {
  navInner.innerHTML = '';
  NAV_DATA.forEach(cat => {
    const catEl = document.createElement('div');
    catEl.className = 'nav-category collapsed';
    catEl.dataset.catId = cat.id;

    const header = document.createElement('div');
    header.className = 'nav-category-header';
    header.innerHTML = '<span class="nav-category-icon">' + (cat.icon || '') + '</span><span class="nav-category-label">' + cat.name[lang] + '</span><span class="nav-category-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';
    const items = document.createElement('div');
    items.className = 'nav-category-items';

    const toggle = () => {
      var isCollapsed = catEl.classList.toggle('collapsed');
      if (!isCollapsed) {
        items.style.maxHeight = items.scrollHeight + 'px';
        items.classList.add('expanded');
      } else {
        items.style.maxHeight = items.scrollHeight + 'px';
        requestAnimationFrame(() => {
          items.style.maxHeight = '0';
          items.classList.remove('expanded');
        });
      }
    };
    header.onclick = toggle;

    cat.items.forEach(item => {
      const navItem = document.createElement('div');
      navItem.className = 'nav-item';
      navItem.dataset.trigger = item.trigger;
      if (activeNavId === item.trigger) navItem.classList.add('active');

      navItem.innerHTML =
        '<em class="nav-item-icon">' + item.icon + '</em>' +
        '<div class="nav-item-text">' +
          '<div class="nav-item-name">' + item.name[lang] + '</div>' +
          '<div class="nav-item-desc">' + item.desc[lang] + '</div>' +
        '</div>' +
        '<span class="nav-item-play">' + SVG_PLAY + '</span>';

      navItem.onclick = () => {
        if (sending) { showToast(sendingName + ' 案例正在执行中，请稍后'); return; }
        setActiveNav(item.trigger);
        location.hash = item.trigger;
        sendPrompt(item.trigger, item.name[lang]);
        document.getElementById('nav').classList.remove('open');
      };

      items.appendChild(navItem);
    });

    catEl.appendChild(header);
    catEl.appendChild(items);
    navInner.appendChild(catEl);
  });
}

function setActiveNav(trigger) {
  activeNavId = trigger;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.trigger === trigger);
  });
  if (trigger) {
    var activeEl = document.querySelector('.nav-item[data-trigger="' + trigger + '"]');
    if (activeEl) {
      var cat = activeEl.closest('.nav-category');
      if (cat && cat.classList.contains('collapsed')) {
        cat.classList.remove('collapsed');
        var items = cat.querySelector('.nav-category-items');
        if (items) {
          items.style.maxHeight = items.scrollHeight + 'px';
          items.classList.add('expanded');
        }
      }
      var nav = document.getElementById('nav');
      var navH = nav.clientHeight;
      var elTop = activeEl.offsetTop - nav.offsetTop;
      nav.scrollTo({ top: Math.max(0, elTop - navH / 2 + activeEl.offsetHeight / 2), behavior: 'smooth' });
    }
  }
}

// ========================================
// Send Prompt / SSE
// ========================================

function sendPrompt(trigger, displayText) {
  if (sending) return;
  sending = true;
  sendingName = displayText || trigger;

  const welcome = document.getElementById('welcome');
  if (welcome) {
    stopWelcomeAnim();
    welcome.style.display = 'none';
  }

  addUserMessage(displayText || trigger);
  const loadingEl = addLoadingIndicator();

  fetch(API_BASE + '/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: trigger })
  }).then(response => {
    if (!response.ok) throw new Error('HTTP ' + response.status);
    loadingEl.remove();

    const { container: aiContainer, sourceText, thinkingEl, updateStats, showSourceView, setRenderUICallback } = addAIMessage();
    const tokui = new TokUI.TokUI({ container: aiContainer, theme: computeTokuiTheme() });
    // 记录本条消息的 TokUI 实例，供语言切换时调 instance.rerender() 就地重画（无网络）
    renders.push({ instance: tokui, container: aiContainer, sourceText: sourceText });

    if (renderMode === 'stream') {
      tokui.startStream(aiContainer);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function processChunk() {
        reader.read().then(({ done, value }) => {
          if (done) { tokui.endStream(); sending = false; scrollToBottom(); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') { tokui.endStream(); sending = false; scrollToBottom(); return; }
              try {
                const parsed = JSON.parse(data);
                if (parsed.tokui) {
                  if (thinkingEl.parentNode) thinkingEl.remove();
                  sourceText.push(parsed.tokui);
                  tokui.feed(parsed.tokui);
                  updateStats();
                  scrollToBottom();
                }
              } catch (e) { /* skip */ }
            }
          }
          processChunk();
        }).catch(() => { tokui.endStream(); sending = false; });
      }
      processChunk();
    } else {
      // Source mode — stream raw DSL text without rendering
      showSourceView();
      setRenderUICallback(function() {
        tokui.render(sourceText.join(''), aiContainer);
      });
      const msgEl = aiContainer.closest('.msg--ai');
      const sourceArea = msgEl ? msgEl.querySelector('.msg-source') : null;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function processSourceChunk() {
        reader.read().then(({ done, value }) => {
          if (done) { sending = false; scrollToBottom(); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') { sending = false; scrollToBottom(); return; }
              try {
                const parsed = JSON.parse(data);
                if (parsed.tokui) {
                  if (thinkingEl.parentNode) thinkingEl.remove();
                  sourceText.push(parsed.tokui);
                  if (sourceArea) setSourceHighlighted(sourceArea, sourceText.join(''), false);
                  updateStats();
                  scrollToBottom();
                }
              } catch (e) { /* skip */ }
            }
          }
          processSourceChunk();
        }).catch(() => { sending = false; });
      }
      processSourceChunk();
    }
  }).catch(err => {
    loadingEl.remove();
    addSystemMessage(t('error'), t('errorMsg', { msg: err.message }));
    sending = false;
  });
}

// ========================================
// Format TokUI Source
// ========================================

const FORMAT_CONTAINERS = new Set([
  'form', 'table', 'thead', 'tbody', 'tr',
  'card', 'ft', 'row', 'col', 'tcol', 'list',
  'select', 'radio', 'code', 'imgs', 'md',
  'textarea', 'tabs', 'tab', 'accordion', 'collapse', 'dialog',
  'picker', 'steps',
  'cascader', 'tree', 'tn',
  'tool-call', 'diff', 'quick-reply',
  'plan', 'plan-step', 'file-tree', 'ft-folder',
  'terminal', 'sandbox', 'test-result', 'test-case',
  'quote', 'agent', 'bubble', 'toolbar', 'think', 'chat-input', 'msg-actions', 'attachments',
  'artifact', 'artifact-code', 'artifact-preview',
  'welcome', 'welcome-feature',
  'suggestions'
]);

function formatTokui(raw) {
  if (!raw) return '';
  const tags = [];
  let rest = raw;
  while (rest.length) {
    const open = rest.indexOf('[');
    if (open === -1) { if (rest.trim()) tags.push({ type: 'text', raw: rest.trim() }); break; }
    if (open > 0 && rest.slice(0, open).trim()) tags.push({ type: 'text', raw: rest.slice(0, open).trim() });
    let inQuote = false, close = -1;
    for (let i = open + 1; i < rest.length; i++) {
      if (rest[i] === '"') inQuote = !inQuote;
      else if (rest[i] === ']' && !inQuote) { close = i; break; }
    }
    if (close === -1) break;
    const tagContent = rest.slice(open + 1, close);
    rest = rest.slice(close + 1);
    if (tagContent.startsWith('/')) {
      tags.push({ type: 'close', name: tagContent.slice(1).trim(), raw: '[/' + tagContent.slice(1).trim() + ']' });
    } else {
      const sp = tagContent.search(/\s/);
      const tagName = sp === -1 ? tagContent : tagContent.slice(0, sp);
      tags.push({ type: 'open', name: tagName, raw: '[' + tagContent + ']' });
    }
  }
  const hasClose = new Set();
  const stack = [];
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].type === 'open' && FORMAT_CONTAINERS.has(tags[i].name)) stack.push({ name: tags[i].name, index: i });
    else if (tags[i].type === 'close') {
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].name === tags[i].name) { hasClose.add(stack[j].index); stack.splice(j, 1); break; }
      }
    }
  }
  const IND = '  ';
  const lines = [];
  let depth = 0;
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    if (tag.type === 'close') { depth = Math.max(0, depth - 1); lines.push(IND.repeat(depth) + tag.raw); }
    else if (tag.type === 'open' && FORMAT_CONTAINERS.has(tag.name) && hasClose.has(i)) { lines.push(IND.repeat(depth) + tag.raw); depth++; }
    else { lines.push(IND.repeat(depth) + tag.raw); }
  }
  return lines.join('\n');
}

// ========================================
// DSL 语法高亮（与文档站 docs/.vitepress/theme/utils/dsl.ts 同源，零依赖）
// ========================================

function _hlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _hlSpan(cls, text) { return '<span class="' + cls + '">' + _hlEscape(text) + '</span>'; }

// 变体白名单快照（与 renderer.js VARIANTS 保持同步）
// 优先取 window.TokUI._internal.VARIANTS 运行时数据（自动同步），回退快照
var DSL_VARIANTS_FALLBACK = {
  img: ['avatar', 'rounded', 'bordered'],
  card: ['highlight', 'flat', 'bordered', 'center', 'right'],
  btn: ['primary', 'danger', 'success', 'warning', 'ghost', 'sm', 'lg', 'pill', 'square', 'block'],
  btngroup: ['vertical', 'pill'],
  table: ['bordered', 'compact'],
  input: ['error', 'success', 'sm', 'lg', 'underline', 'pill'],
  pwd: ['error', 'success', 'sm', 'lg', 'underline', 'pill'],
  select: ['error', 'success'],
  picker: ['error', 'success'],
  h1: ['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill'],
  h2: ['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill'],
  h3: ['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill'],
  h4: ['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill'],
  h5: ['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill'],
  h6: ['left', 'center', 'right', 'ribbon', 'underline', 'badge', 'pill'],
  p: ['left', 'center', 'right', 'muted', 'bold', 'sm', 'lg'],
  a: ['muted', 'danger', 'success', 'underline'],
  ft: ['left', 'center', 'right'],
  row: ['left', 'center', 'right', 'inline'],
  dv: ['dashed', 'dotted', 'sm', 'md', 'lg', 'vert', 'plain'],
  dot: ['sm', 'lg'],
  avatar: ['sm', 'md', 'lg', 'xl'],
  tooltip: ['top', 'bottom', 'left', 'right'],
  pagination: ['sm', 'lg'],
  switch: ['sm', 'lg'],
  drawer: ['left', 'right', 'top', 'bottom'],
  breadcrumb: ['arrow'],
  slider: ['sm', 'lg'],
  rate: ['sm', 'lg'],
  transfer: ['sm', 'lg'],
  cascader: ['error', 'success'],
  upload: ['sm', 'lg'],
  tree: ['sm', 'lg']
};
function _variantSetFor(type) {
  var live = (typeof window !== 'undefined') && window.TokUI && window.TokUI._internal && window.TokUI._internal.VARIANTS;
  var arr = (live && live[type]) ? Array.from(live[type]) : DSL_VARIANTS_FALLBACK[type];
  return arr ? new Set(arr) : null;
}

// 高亮单个标签内部（不含外层方括号）
function _hlInterior(interior) {
  if (interior.charAt(0) === '/') {
    var nm = interior.slice(1).trim();
    return _hlSpan('tok-bracket', '/') + (nm ? _hlSpan('tok-tag', nm) : '');
  }
  var i = 0, n = interior.length, out = [];
  while (i < n && /\s/.test(interior.charAt(i))) i++;
  var nameStart = i;
  while (i < n && !/[\s:"]/.test(interior.charAt(i))) i++;
  var tagName = interior.slice(nameStart, i);
  if (tagName) out.push(_hlSpan('tok-tag', tagName));
  // 变体吸收着色：与 parser 同源——v: 出现后，紧跟的裸 token 若命中该组件变体白名单，按变体着色
  var vSeen = false;
  var variantSet = tagName ? _variantSetFor(tagName) : null;
  while (i < n) {
    var ch = interior.charAt(i);
    if (/\s/.test(ch)) { out.push(_hlEscape(ch)); i++; continue; }
    if (ch === '"') {
      var j = i + 1;
      while (j < n && interior.charAt(j) !== '"') j++;
      out.push(_hlSpan('tok-string', interior.slice(i, Math.min(j + 1, n))));
      i = j + 1; continue;
    }
    var tokStart = i;
    while (i < n && !/[\s"]/.test(interior.charAt(i))) i++;
    var token = interior.slice(tokStart, i);
    if (!token) { i++; continue; }
    var colon = token.indexOf(':');
    if (colon > 0) {
      var key = token.slice(0, colon);
      var val = token.slice(colon + 1);
      if (val.charAt(0) === '"' && val.charAt(val.length - 1) !== '"') {
        while (i < n && interior.charAt(i) !== '"') { val += interior.charAt(i); i++; }
        if (i < n) { val += interior.charAt(i); i++; }
      }
      if (key === 'v') vSeen = true;
      var valClass = key === 'v' ? 'tok-variant' : 'tok-val';
      out.push(_hlSpan('tok-attr', key) + _hlSpan('tok-punct', ':') + _hlSpan(valClass, val));
    } else if (token.charAt(0) === 'v' && token.charAt(1) === ':') {
      vSeen = true;
      out.push(_hlSpan('tok-variant', token));
    } else if (vSeen && variantSet && variantSet.has(token)) {
      // v: 后的裸变体（如 [p v:center muted 文本] 的 muted）→ 与 v:center 同色
      out.push(_hlSpan('tok-variant', token));
    } else {
      out.push(_hlSpan('tok-bool', token));
    }
  }
  return out.join('');
}

// 高亮整段 DSL：扫描 [..]（引号内不切分），括号内走 _hlInterior，括号外为文本
function highlightTokui(raw) {
  if (!raw) return '';
  var out = [], i = 0, n = raw.length;
  while (i < n) {
    var open = raw.indexOf('[', i);
    if (open === -1) { out.push(_hlSpan('tok-text', raw.slice(i))); break; }
    if (open > i) out.push(_hlSpan('tok-text', raw.slice(i, open)));
    var inQuote = false, close = -1;
    for (var j = open + 1; j < n; j++) {
      if (raw.charAt(j) === '"') inQuote = !inQuote;
      else if (raw.charAt(j) === ']' && !inQuote) { close = j; break; }
    }
    if (close === -1) { out.push(_hlEscape(raw.slice(open))); break; }
    var interior = raw.slice(open + 1, close);
    out.push(_hlSpan('tok-bracket', '[') + _hlInterior(interior) + _hlSpan('tok-bracket', ']'));
    i = close + 1;
  }
  return out.join('');
}

// 把源码写进 <pre>：可选格式化 + 高亮着色（与文档站 Playground 一致）
function setSourceHighlighted(pre, text, doFormat) {
  if (!pre) return;
  pre.innerHTML = highlightTokui(doFormat ? formatTokui(text) : text);
}

// ========================================
// Card-level Source Buttons
// ========================================

function injectCardSourceButtons(cardEl) {
  if (!cardEl._dslNode || cardEl._cardSourceInjected) return;
  cardEl._cardSourceInjected = true;

  let header = cardEl.querySelector('.tokui-card-header');
  const isPill = header && header.classList.contains('tokui-card-header--pill');

  if (!header) {
    header = document.createElement('div');
    header.className = 'tokui-card-header';
    cardEl.insertBefore(header, cardEl.firstChild);
  }

  if (isPill) {
    // pill 变体：按钮组放在 header 外面，绝对定位到 card 右上角
    cardEl.style.position = 'relative';
    var btnContainer = document.createElement('span');
    btnContainer.className = 'tokui-card-source-btns';
    btnContainer.style.position = 'absolute';
    btnContainer.style.top = '8px';
    btnContainer.style.right = '8px';
    cardEl.appendChild(btnContainer);
  } else {
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    var btnContainer = document.createElement('span');
    btnContainer.className = 'tokui-card-source-btns';
    header.appendChild(btnContainer);
  }

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'tokui-card-source-btn';
  toggleBtn.title = t('viewSource');
  toggleBtn.innerHTML = SVG_CARD_CODE;

  const formatBtn = document.createElement('button');
  formatBtn.className = 'tokui-card-source-btn';
  formatBtn.title = t('format');
  formatBtn.innerHTML = SVG_CARD_FORMAT;
  formatBtn.style.display = 'none';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'tokui-card-source-btn';
  copyBtn.title = t('copy');
  copyBtn.innerHTML = SVG_CARD_COPY;
  copyBtn.style.display = 'none';

  btnContainer.appendChild(copyBtn);
  btnContainer.appendChild(formatBtn);
  btnContainer.appendChild(toggleBtn);

  const body = cardEl.querySelector('.tokui-card-body');
  const sourcePre = document.createElement('pre');
  sourcePre.className = 'tokui-card-source';
  sourcePre.style.display = 'none';
  if (body) body.parentNode.insertBefore(sourcePre, body.nextSibling);

  let showingSource = false;
  let isFormatted = false;

  function getDsl() { return cardEl._dslNode._dsl || ''; }

  function renderCardSource() {
    setSourceHighlighted(sourcePre, getDsl(), isFormatted);
    formatBtn.innerHTML = isFormatted ? SVG_CARD_FORMAT : SVG_CARD_FORMAT;
    formatBtn.title = isFormatted ? t('minify') : t('format');
  }

  toggleBtn.onclick = () => {
    showingSource = !showingSource;
    if (showingSource) {
      if (body) body.style.display = 'none';
      sourcePre.style.display = 'block';
      renderCardSource();
      formatBtn.style.display = '';
      copyBtn.style.display = '';
      toggleBtn.innerHTML = SVG_CARD_EYE;
      toggleBtn.title = t('viewUI');
    } else {
      if (body) body.style.display = '';
      sourcePre.style.display = 'none';
      formatBtn.style.display = 'none';
      copyBtn.style.display = 'none';
      toggleBtn.innerHTML = SVG_CARD_CODE;
      toggleBtn.title = t('viewSource');
    }
  };

  formatBtn.onclick = () => { isFormatted = !isFormatted; renderCardSource(); };

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(sourcePre.textContent).then(() => {
      copyBtn.innerHTML = SVG_CARD_CHECK;
      setTimeout(() => { copyBtn.innerHTML = SVG_CARD_COPY; }, 1500);
    });
  };
}

// ========================================
// DOM Helpers
// ========================================

function addUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'msg msg--user';
  el.textContent = text;
  document.getElementById('messages').appendChild(el);
  scrollToBottom();
}

function addAIMessage() {
  const msg = document.createElement('div');
  msg.className = 'msg msg--ai';

  const toolbar = document.createElement('div');
  toolbar.className = 'msg-toolbar';

  const statsEl = document.createElement('span');
  statsEl.className = 'msg-stats';
  statsEl.style.display = 'none';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'msg-toolbar-btn';
  toggleBtn.innerHTML = SVG_CODE + ' ' + t('viewSource');

  const formatBtn = document.createElement('button');
  formatBtn.className = 'msg-toolbar-btn';
  formatBtn.innerHTML = SVG_FORMAT + ' ' + t('format');
  formatBtn.style.display = 'none';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'msg-toolbar-btn';
  copyBtn.innerHTML = SVG_COPY + ' ' + t('copy');
  copyBtn.style.display = 'none';

  toolbar.appendChild(statsEl);
  toolbar.appendChild(copyBtn);
  toolbar.appendChild(formatBtn);
  toolbar.appendChild(toggleBtn);
  msg.appendChild(toolbar);

  const renderArea = document.createElement('div');
  renderArea.className = 'msg-render';
  msg.appendChild(renderArea);

  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'msg-thinking';
  thinkingEl.innerHTML = '<div class="msg-thinking-dots"><span></span><span></span><span></span></div><span>' + t('thinking') + '</span>';
  renderArea.appendChild(thinkingEl);

  const sourceArea = document.createElement('pre');
  sourceArea.className = 'msg-source';
  sourceArea.style.display = 'none';
  msg.appendChild(sourceArea);

  const sourceText = [];
  let showingSource = false;
  let isFormatted = false;
  let uiRendered = false;
  let renderUICallback = null;

  function getRawSource() { return sourceText.join(''); }

  function estimateTokens(text) {
    let tokens = 0, i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[一-鿿㐀-䶿]/.test(ch)) { tokens++; i++; }
      else if (/[a-zA-Z0-9_]/.test(ch)) { while (i < text.length && /[a-zA-Z0-9_]/.test(text[i])) i++; tokens++; }
      else { tokens++; i++; }
    }
    return tokens;
  }

  function updateStats() {
    const raw = getRawSource();
    if (!raw) return;
    statsEl.style.display = '';
    statsEl.textContent = t('tokenStats', { count: estimateTokens(raw), chars: raw.length });
  }

  function renderSource() {
    setSourceHighlighted(sourceArea, getRawSource(), isFormatted);
    formatBtn.innerHTML = isFormatted ? SVG_FORMAT + ' ' + t('minify') : SVG_FORMAT + ' ' + t('format');
  }

  toggleBtn.onclick = () => {
    showingSource = !showingSource;
    if (showingSource) {
      renderArea.style.display = 'none';
      sourceArea.style.display = 'block';
      renderSource();
      formatBtn.style.display = '';
      copyBtn.style.display = '';
      toggleBtn.innerHTML = SVG_EYE + ' ' + t('viewUI');
    } else {
      if (!uiRendered && renderUICallback) {
        renderUICallback();
        uiRendered = true;
      }
      renderArea.style.display = '';
      sourceArea.style.display = 'none';
      formatBtn.style.display = 'none';
      copyBtn.style.display = 'none';
      toggleBtn.innerHTML = SVG_CODE + ' ' + t('viewSource');
    }
  };

  formatBtn.onclick = () => { isFormatted = !isFormatted; renderSource(); };

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(sourceArea.textContent).then(() => {
      copyBtn.innerHTML = SVG_CHECK + ' ' + t('copied');
      setTimeout(() => { copyBtn.innerHTML = SVG_COPY + ' ' + t('copy'); }, 1500);
    });
  };

  // MutationObserver: 监听 card 渲染完成后注入源码按钮
  const cardObserver = new MutationObserver(() => {
    renderArea.querySelectorAll('.tokui-card').forEach(card => {
      injectCardSourceButtons(card);
    });
  });
  cardObserver.observe(renderArea, { childList: true, subtree: true });

  document.getElementById('messages').appendChild(msg);
  scrollToBottom();
  function showSourceView() {
    showingSource = true;
    renderArea.style.display = 'none';
    sourceArea.style.display = 'block';
    formatBtn.style.display = '';
    copyBtn.style.display = '';
    toggleBtn.innerHTML = SVG_EYE + ' ' + t('viewUI');
  }

  return { container: renderArea, sourceText, thinkingEl, updateStats, showSourceView, setRenderUICallback(fn) { renderUICallback = fn; } };
}

function addSystemMessage(title, data) {
  const el = document.createElement('div');
  el.className = 'msg msg--system';
  el.innerHTML = '<strong>' + escapeHtml(title) + '</strong><pre>' + escapeHtml(data) + '</pre>';
  document.getElementById('messages').appendChild(el);
  scrollToBottom();
}

function addLoadingIndicator() {
  const el = document.createElement('div');
  el.className = 'msg msg--loading';
  el.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div>';
  document.getElementById('messages').appendChild(el);
  scrollToBottom();
  return el;
}

function scrollToBottom() {
  const el = document.getElementById('messages');
  el.scrollTop = el.scrollHeight;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ========================================
// Render Mode Toggle
// ========================================

// 初始：从 localStorage 恢复 源码流/流式渲染 偏好（默认 stream）
(function initModeFromStorage() {
  var toggle = document.getElementById('streamToggle');
  if (!toggle) return;
  var saved;
  try { saved = localStorage.getItem('tokui-demo-rendermode'); } catch (e) {}
  var isStream = saved ? (saved === 'stream') : toggle.checked;
  toggle.checked = isStream;
  renderMode = isStream ? 'stream' : 'source';
  var ml = document.getElementById('modeLabel');
  if (ml) ml.textContent = t(isStream ? 'modeStream' : 'modeSource');
})();

document.getElementById('streamToggle').addEventListener('change', function() {
  renderMode = this.checked ? 'stream' : 'source';
  document.getElementById('modeLabel').textContent = this.checked ? t('modeStream') : t('modeSource');
  try { localStorage.setItem('tokui-demo-rendermode', renderMode); } catch (e) {}
});

// ========================================
// Theme Toggle
// ========================================

// 主题切换 handler（状态/函数见文件顶部，localStorage 持久化）
document.getElementById('themeToggle').onclick = () => {
  darkMode = !darkMode;
  syncTokuiThemeUI();
  persistTokuiTheme();
  applyTokuiTheme();
};

// 风格族切换：在当前明暗基础上切 default ↔ modern
const styleFamilySel = document.getElementById('styleFamily');
if (styleFamilySel) {
  styleFamilySel.addEventListener('change', function () {
    styleFamily = styleFamilySel.value;
    syncTokuiThemeUI();
    persistTokuiTheme();
    applyTokuiTheme();
  });
}

// 初始化：按 localStorage 恢复 UI + 应用存储主题到所有 TokUI 实例
syncTokuiThemeUI();
applyTokuiTheme();

// ========================================
// Language Toggle
// ========================================

document.getElementById('langToggle').onclick = () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  persistLang();
  applyLang();
  // 已渲染的 DOM 不会自动随 locale 刷新：调每个实例的 rerender() 就地重画（库内置，
  // 实例自缓存 DSL，无网络、不清聊天），chrome 文案（aria/placeholder/分页总数/空态）即时切换。
  if (sending) return;
  if (renders.length) {
    renders.forEach(function (rec) {
      try { rec.instance.rerender(); } catch (e) { /* 单条重画失败不影响其余 */ }
    });
    scrollToBottom();
  } else {
    // 欢迎页：其 DSL 按 lang 取段，重画即得新语言版本
    stopWelcomeAnim();
    initWelcomeAnim();
  }
};

function applyLang() {
  // 同步 TokUI 库 chrome locale（pagination aria / lightbox 工具栏 / select placeholder /
  // 日期星期 / 空态等组件骨架文案）。已渲染的 DOM 需重渲染才刷新——下次点演示即新 locale。
  if (typeof TokUI !== 'undefined' && TokUI.setLocale) {
    try { TokUI.setLocale(lang === 'zh' ? 'zh-CN' : 'en-US'); } catch (e) {}
  }
  document.getElementById('tagline').textContent = t('tagline');
  document.getElementById('welcomeSubtitle').textContent = '// ' + t('welcomeTitle');
  document.getElementById('langToggle').textContent = t('langToggle');
  document.querySelector('.mode-btn[data-mode="stream"]') && (document.querySelector('.mode-btn[data-mode="stream"]').textContent = t('modeStream'));
  document.querySelector('.mode-btn[data-mode="source"]') && (document.querySelector('.mode-btn[data-mode="source"]').textContent = t('modeSource'));
  document.getElementById('modeLabel').textContent = document.getElementById('streamToggle').checked ? t('modeStream') : t('modeSource');
  const feats = document.querySelectorAll('.app-welcome-feat');
  const featKeys = ['featZero', 'featStream', 'featIncr', 'featSSE'];
  feats.forEach((el, i) => { if (featKeys[i]) el.textContent = t(featKeys[i]); });
  document.getElementById('footerVer').textContent = t('footerVer');
  document.getElementById('footerCopy').textContent = t('footerCopy');
  document.getElementById('dslRefText').textContent = t('dslRef');
  document.getElementById('clearBtnText').textContent = t('clearBtn');
  document.getElementById('contactBtnText').textContent = t('contactBtn');
  document.getElementById('officialSiteText').textContent = t('officialSite');
  document.getElementById('communityText').textContent = t('community');
  document.getElementById('communityTitleText').textContent = t('communityTitle');
  document.getElementById('communitySub').textContent = t('communitySub');
  document.getElementById('communityHint').textContent = t('communityHint');
  document.getElementById('qrTitleText').textContent = t('qrTitle');
  document.getElementById('qrSub').textContent = t('qrSub');
  document.getElementById('qrHint').textContent = t('qrHint');
  renderNav();
}

// ========================================
// Mobile Menu
// ========================================

// === 侧边栏折叠/展开（桌面 collapse + 移动 off-canvas，icon 切换 + 状态持久化）===
(function () {
  var nav = document.getElementById('nav');
  var menuBtn = document.getElementById('menuToggle');
  if (!nav || !menuBtn) return;
  var NAV_KEY = 'tokui-demo-nav-collapsed';
  var SVG_BURGER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  var SVG_PANEL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/></svg>';
  function isMobile() { return window.matchMedia('(max-width: 768px)').matches; }
  function syncIcon() {
    var collapsed = !isMobile() && nav.classList.contains('collapsed');
    menuBtn.innerHTML = collapsed ? SVG_PANEL : SVG_BURGER;
    menuBtn.title = collapsed
      ? (lang === 'en' ? 'Expand sidebar' : '展开导航')
      : (lang === 'en' ? 'Collapse sidebar' : '折叠导航');
  }
  // 桌面初始：恢复持久化折叠态（移动用 off-canvas，不套 collapsed）
  if (!isMobile()) {
    try { if (localStorage.getItem(NAV_KEY) === '1') nav.classList.add('collapsed'); } catch (e) {}
  }
  syncIcon();
  menuBtn.onclick = function () {
    if (isMobile()) { nav.classList.toggle('open'); return; }   // 移动：off-canvas 滑入
    var collapsed = !nav.classList.contains('collapsed');
    nav.classList.toggle('collapsed', collapsed);
    try { localStorage.setItem(NAV_KEY, collapsed ? '1' : '0'); } catch (e) {}
    syncIcon();
  };
  // 断点切换时重算图标（移动不显示 collapsed 态）
  window.addEventListener('resize', syncIcon);
})();

// ========================================
// Clear & Reset
// ========================================

function handleClear() {
  if (sending) { showToast(sendingName + ' 案例正在执行中，请稍后'); return; }
  renders = [];   // 清屏后无已渲染消息，语言切换不再尝试重画
  const messages = document.getElementById('messages');
  messages.querySelectorAll('.msg').forEach(el => el.remove());
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.style.display = '';
  stopWelcomeAnim();
  initWelcomeAnim();
  setActiveNav(null);
  document.querySelectorAll('.nav-category').forEach(function(cat) {
    var items = cat.querySelector('.nav-category-items');
    cat.classList.add('collapsed');
    if (items) { items.style.maxHeight = '0'; items.classList.remove('expanded'); }
  });
  history.replaceState(null, '', window.location.pathname);
}

document.getElementById('clearBtn').onclick = handleClear;

document.querySelector('.app-logo').onclick = handleClear;
document.querySelector('.app-logo').style.cursor = 'pointer';

// ========================================
// DSL Reference Dialog
// ========================================

const DSL_REF = {
  header: { title: 'TokUI DSL 语法速查', sub: '流式 UI 描述语言 · 零依赖 · 实时渲染' },
  sections: [
    {
      title: '基本语法',
      type: 'syntax',
      items: [
        { code: '[h1 标题]', desc: '自闭合标签：组件 + 空格 + 内容' },
        { code: '[card tt:标题]内容[/card]', desc: '容器标签：必须 [/type] 闭合' },
        { code: '[btn tx:"点击" v:primary clk:onClick]', desc: '多属性用空格分隔' },
        { code: '[tr 张三,25,北京]', desc: '逗号分隔同类型多个值' },
        { code: 'ph:"含空格的值"', desc: '值含空格用双引号包裹' },
        { code: 'v:"primary,sm"', desc: '多变体用逗号分隔，渲染器白名单校验' }
      ]
    },
    {
      title: '通用属性（clk/sub 处理器需预先 registerHandler）',
      type: 'attrs',
      items: [
        { key: 'id', val: '元素ID / upd 目标' },
        { key: 'tt', val: 'title / 提示标题' },
        { key: 'tx', val: 'text / 文本内容' },
        { key: 'l', val: 'label / 标签' },
        { key: 'ph', val: 'placeholder / 占位提示' },
        { key: 'u', val: 'url / 链接地址' },
        { key: 's', val: 'src / 图片或文件地址' },
        { key: 'n', val: 'name / 表单名或文件名' },
        { key: 'v', val: 'value / variant 变体' },
        { key: 'act', val: 'action / 表单提交地址' },
        { key: 'mtd', val: 'method / 表单提交方法' },
        { key: 'clk', val: 'onclick / 点击处理器名称' },
        { key: 'sub', val: 'onsubmit / 提交处理器名称' },
        { key: 'dis', val: 'disabled / 禁用' },
        { key: 'ro', val: 'readonly / 只读' },
        { key: 'req', val: 'required / 必填' },
        { key: 'chk', val: 'checked / 选中' },
        { key: 'multi', val: 'multiple / 多选' },
        { key: 'w', val: 'width / 宽度' },
        { key: 'h', val: 'height / 高度' },
        { key: 'bg', val: 'background / 背景色' },
        { key: 'fc', val: 'font-color / 文字色' },
        { key: 'target', val: 'a 标签 target，如 _blank' },
        { key: 'alt', val: 'img 替代文本' }
      ]
    },
    {
      title: '布尔属性（只写 key 即可生效）',
      type: 'tags',
      items: [
        'dis', 'ro', 'req', 'chk', 'multi', 'plain', 'round', 'closable',
        'bordered', 'open', 'pill', 'dot', 'leaf', 'inline', 'rounded',
        'container', 'copy', 'regenerate', 'like', 'dislike', 'visible',
        'controls', 'active', 'collapsible', 'toggle', 'search', 'stripe', 'auto'
      ]
    },
    {
      title: '变体系统',
      type: 'syntax',
      items: [
        { code: 'v:primary', desc: 'btn 类型：primary / danger / success / warning / ghost' },
        { code: 'v:"sm,lg,pill"', desc: 'btn 尺寸形状：sm / lg / pill / square / block' },
        { code: 'v:vertical', desc: 'btngroup：vertical / pill' },
        { code: 'v:highlight', desc: 'card：highlight / flat / bordered / center / right' },
        { code: 'v:bordered', desc: 'table：bordered / compact' },
        { code: 'v:left', desc: 'h1~h6：left / center / right / ribbon / underline / badge / pill' },
        { code: 'v:muted', desc: 'p：left / center / right / muted / bold / sm / lg' },
        { code: 'v:muted', desc: 'a：muted / danger / success / underline' },
        { code: 'v:left', desc: 'ft：left / center / right；row：left / center / right / inline' },
        { code: 'v:dashed', desc: 'dv：dashed / dotted / sm / md / lg / vert / plain' },
        { code: 'v:error', desc: 'input / pwd：error / success / sm / lg / underline / pill' },
        { code: 'v:error', desc: 'select / picker / cascader：error / success' },
        { code: 'v:avatar', desc: 'img：avatar / rounded / bordered' },
        { code: 'v:sm', desc: 'dot / pagination / switch / slider / rate / transfer / upload / tree：尺寸 sm / lg' },
        { code: 'v:sm', desc: 'avatar：sm / md / lg / xl' },
        { code: 'v:top', desc: 'tooltip / drawer：top / bottom / left / right' },
        { code: 'v:arrow', desc: 'breadcrumb：arrow' }
      ]
    },
    {
      title: '文本与基础',
      type: 'comp',
      items: [
        { tag: 'h1~h6', desc: '标题 tx:文本 v:left/center/right/ribbon/underline/badge/pill', self: true },
        { tag: 'p', desc: '段落 tx:文本 v:left/center/right/muted/bold/sm/lg', self: true },
        { tag: 'a', desc: '链接 u:地址 tx:文本 target:_blank v:muted/danger/success/underline', self: true },
        { tag: 'img', desc: '图片 s:地址 alt w h v:avatar/rounded/bordered（点击灯箱）', self: true },
        { tag: 'hr', desc: '水平分割线', self: true },
        { tag: 'dv', desc: '分割线 tx:文本 v:dashed/dotted/sm/md/lg/vert/plain', self: true },
        { tag: 'md', desc: 'Markdown 渲染容器', self: false },
        { tag: 'code', desc: '代码块 lang:语言 语法高亮', self: false }
      ]
    },
    {
      title: '状态、反馈与交互',
      type: 'comp',
      items: [
        { tag: 'tag', desc: '标签 tx:文本 t:type s:size round closable bordered', self: true },
        { tag: 'callout', desc: '提示框 t:info/success/warning/error/tip tt:title tx:内容', self: true },
        { tag: 'spin', desc: '加载 t:spinner/dots/pulse s:size tx:文本', self: true },
        { tag: 'skeleton', desc: '骨架屏 t:text/card/avatar/image rows w h', self: true },
        { tag: 'shimmer', desc: '闪光骨架 t:type rows', self: true },
        { tag: 'empty', desc: '空状态 tx:描述 icon s:图片', self: true },
        { tag: 'result', desc: '结果页 t:type tt:title tx:描述', self: true },
        { tag: 'dot', desc: '状态点 t:type tx:标签 s:size pulse', self: true },
        { tag: 'badge', desc: '徽标 count dot t:status tx:text pill size', self: true },
        { tag: 'badge-box', desc: '徽标包裹 容器 t:status(primary/success/warning/info/error) dot count overflow label；子元素被角标包裹', self: false },
        { tag: 'toast', desc: '全局提示 t:type tx:文本 duration pos', self: true },
        { tag: 'notification', desc: '通知 t:type tt:title tx:文本 duration pos clk', self: true },
        { tag: 'progress', desc: '进度条 v:值 t:line/circle/span l:标签 stripe', self: true },
        { tag: 'stat', desc: '统计 tt:标签 v:值 pre/suf trend anim dec', self: true },
        { tag: 'countdown', desc: '倒计时 target/dur fmt tx:结束文本', self: true },
        { tag: 'thumb', desc: '赞/踩 t:up/down clk v:active', self: true },
        { tag: 'toggle', desc: '切换按钮 tx:文本 chk clk s:sm/lg', self: true },
        { tag: 'toggle-group', desc: '切换按钮组 multi clk s:size', self: false },
        { tag: 'copy', desc: '复制按钮 id:目标 tx:文本 tt:成功提示', self: true },
        { tag: 'upd', desc: '动态更新 id:目标 v/tx/dis/tt/status:新值', self: true },
        { tag: 'tooltip', desc: '文字提示 tt:提示 pos tx:触发文本', self: true },
        { tag: 'popover', desc: '气泡卡片 容器 tx:触发 tt:title pos trig:click/hover', self: false },
        { tag: 'popconfirm', desc: '确认气泡 tt:title tx:触发 clk t:type pos', self: true },
        { tag: 'hover-card', desc: '悬停卡片 容器 pos w delay；子 hover-trigger / hover-content', self: false },
        { tag: 'hover-trigger', desc: '悬停触发器 容器（hover-card 子）', self: false },
        { tag: 'hover-content', desc: '悬停内容 容器（hover-card 子）', self: false },
        { tag: 'input-tag', desc: '标签输入 容器 ph n max tags', self: false },
        { tag: 'dropdown', desc: '下拉菜单 容器 tx/tt；子 dd-item', self: false },
        { tag: 'dd-item', desc: '下拉项 tx clk dis v:danger', self: true },
        { tag: 'backtop', desc: '回到顶部 t:threshold v container tx', self: true },
        { tag: 'pagination', desc: '分页 page total count clk s:size show-total', self: true },
        { tag: 'breadcrumb', desc: '面包屑 items:逗号 sep clk v:arrow', self: true },
        { tag: 'calendar', desc: '日历 容器 month v marks tt', self: false },
        { tag: 'watermark', desc: '水印 容器 tx:文字 s/c/gap/ro/font', self: false },
        { tag: 'avatar', desc: '头像 s:src tx:兜底 size bg fc', self: true },
        { tag: 'file', desc: '文件卡片 n:文件名 s:size t:type u:URL tt:描述', self: true },
        { tag: 'chat-input', desc: '对话输入框 容器 ph clk:send dis max auto rows', self: false },
        { tag: 'msg-actions', desc: '消息操作栏 容器 clk copy regenerate like dislike visible', self: false }
      ]
    },
    {
      title: '思考与折叠',
      type: 'comp',
      items: [
        { tag: 'think', desc: '思考块 容器 tt:title open', self: false },
        { tag: 'think-chain', desc: '思考链 容器 tt:title status:running/done', self: false },
        { tag: 'think-step', desc: '思考步骤 容器 status tt:title dur', self: false }
      ]
    },
    {
      title: 'AI / 对话组件',
      type: 'comp',
      items: [
        { tag: 'bubble', desc: '对话气泡 容器 role:user/ai/system model time', self: false },
        { tag: 'toolbar', desc: '工具栏 容器 pos:top/bottom align:left/center/right', self: false },
        { tag: 'tool-call', desc: '工具调用 容器 name status:pending/running/done/error/denied duration id', self: false },
        { tag: 'typing', desc: '输入中 text', self: true },
        { tag: 'quick-reply', desc: '快捷回复 容器 items:逗号', self: false },
        { tag: 'suggestions', desc: '建议卡片 容器 cols clk id；子 suggestion', self: false },
        { tag: 'suggestion', desc: '建议项 tt:title tx:desc clk icon dis', self: true },
        { tag: 'source', desc: '引用源 n tt:title sn:snippet u/url:链接', self: true },
        { tag: 'diff', desc: '代码差异 容器 title lang', self: false },
        { tag: 'plan', desc: '执行计划 容器 tt:title；子 plan-step', self: false },
        { tag: 'plan-step', desc: '计划步骤 容器 status tt:title desc', self: false },
        { tag: 'agent', desc: '智能体状态 容器 name status action duration id', self: false },
        { tag: 'file-tree', desc: '文件树 容器；子 ft-folder / ft-file', self: false },
        { tag: 'ft-folder', desc: '文件夹 容器 name open', self: false },
        { tag: 'ft-file', desc: '文件 name badge', self: true },
        { tag: 'terminal', desc: '终端 容器 title status', self: false },
        { tag: 'sandbox', desc: '沙箱 容器 lang title height', self: false },
        { tag: 'test-result', desc: '测试结果 容器 pass/fail/skip/total/duration；子 test-case 或 case', self: false },
        { tag: 'test-case', desc: '测试用例 status name duration error 推荐简写 case', self: true },
        { tag: 'case', desc: 'test-case 简写别名 status name duration error', self: true },
        { tag: 'commit', desc: 'Git 提交 hash msg author branch time additions deletions', self: true },
        { tag: 'quote', desc: '引用消息 容器 role tx msgid', self: false },
        { tag: 'latency', desc: '延迟 v:值 t:thinking/generating/total', self: true },
        { tag: 'video', desc: '视频 s:src poster', self: true },
        { tag: 'audio', desc: '音频 s:src tt duration', self: true },
        { tag: 'conversations', desc: '会话列表 容器 clk act；子 conv', self: false },
        { tag: 'conv', desc: '会话项 tt:title time active act', self: true },
        { tag: 'welcome', desc: '欢迎页 容器 tt:title st:subtitle；子 welcome-feature 或 feature', self: false },
        { tag: 'welcome-feature', desc: '欢迎特性 tt:title tx:desc i:icon clk 推荐简写 feature', self: true },
        { tag: 'feature', desc: 'welcome-feature 自闭合简写 tt tx i:icon clk', self: true },
        { tag: 'attachments', desc: '附件列表 容器 clk；子 attach', self: false },
        { tag: 'attach', desc: '附件项 t:type s:filename u:URL size clk', self: true },
        { tag: 'artifact', desc: 'Artifact 容器 tt/lang/pos/w；子 artifact-code / artifact-preview', self: false },
        { tag: 'artifact-code', desc: 'Artifact 代码槽 容器', self: false },
        { tag: 'artifact-preview', desc: 'Artifact 预览槽 容器', self: false },
        { tag: 'command', desc: '命令面板 容器 ph clk id；子 command-group', self: false },
        { tag: 'command-group', desc: '命令分组 容器 tt:title 子项 command-item 或 item(推荐)', self: false },
        { tag: 'command-item', desc: '命令项 tx clk v:value shortcut 推荐改用 item', self: true },
        { tag: 'canvas', desc: '画布面板 容器 tt/pos/w/tx/open/closable；子 canvas-content', self: false },
        { tag: 'canvas-content', desc: '画布内容 容器', self: false }
      ]
    },
    {
      title: '布局容器',
      type: 'comp',
      items: [
        { tag: 'card', desc: '卡片 容器 tt:title tx:body v:highlight/flat/bordered/center/right', self: false },
        { tag: 'ft', desc: '卡片页脚 容器 v:left/center/right', self: false },
        { tag: 'row', desc: '栅格行 容器 v:left/center/right/inline', self: false },
        { tag: 'col', desc: '栅格列 容器 span:列数(1-12)', self: false },
        { tag: 'list', desc: '列表 容器 t:ol/ul plain；别名 [ol] [ul]', self: false },
        { tag: 'item', desc: '列表项 容器；别名 [i]', self: false },
        { tag: 'tabs', desc: '标签页 容器', self: false },
        { tag: 'tab', desc: '标签项 容器 tt:title', self: false },
        { tag: 'accordion', desc: '手风琴 容器', self: false },
        { tag: 'collapse', desc: '折叠面板 容器 tt:title open id', self: false },
        { tag: 'dialog', desc: '对话框 容器 tt:title id clk', self: false },
        { tag: 'drawer', desc: '抽屉 容器 tt pos:left/right/top/bottom w/h id', self: false },
        { tag: 'imgs', desc: '图片网格 容器 s:逗号URL 或子 img', self: false },
        { tag: 'timeline', desc: '时间轴 容器 v:horizontal/alternate/card', self: false },
        { tag: 'ti', desc: '时间轴项 tm:时间 t:type tt:title', self: true },
        { tag: 'steps', desc: '步骤条 容器 v:current s:size vd:direction', self: false },
        { tag: 'step', desc: '步骤 容器 tt:title status', self: false },
        { tag: 'desc', desc: '描述列表 容器 cols stripe bordered v:horizontal lw 子项用 item(推荐)或 desc-item', self: false },
        { tag: 'desc-item', desc: '描述项 l:label tx:value span 推荐改用 item(desc 内等价)', self: true },
        { tag: 'carousel', desc: '轮播 容器 auto id thumb 缩略图 w 宽 h 高 ratio 比例(16:9)', self: false },
        { tag: 'carousel-item', desc: '轮播项 容器 s:image tt tx', self: false },
        { tag: 'tree', desc: '树 容器 l:label id clk chk/dis', self: false },
        { tag: 'tn', desc: '树节点 容器 v tx open leaf chk/dis', self: false },
        { tag: 'menu', desc: '菜单 容器 v:vertical/horizontal/inline act bg fc', self: false },
        { tag: 'menu-item', desc: '菜单项 tx clk i:icon dis act', self: true },
        { tag: 'resizable', desc: '可调整面板 容器 dir:h/v min/max/default', self: false },
        { tag: 'scroll-area', desc: '滚动区域 容器 h w id', self: false },
        { tag: 'sidebar', desc: '侧边栏 容器 w pos collapsible tt bg fc', self: false },
        { tag: 'sidebar-content', desc: '侧边栏内容 容器', self: false },
        { tag: 'sidebar-footer', desc: '侧边栏页脚 容器', self: false }
      ]
    },
    {
      title: '表单组件',
      type: 'comp',
      items: [
        { tag: 'form', desc: '表单 容器 act mtd sub clk', self: false },
        { tag: 'input', desc: '输入框 t:type l:label ph id/n val v:error/success/sm/lg/underline/pill w hint search', self: true },
        { tag: 'pwd', desc: '密码框 同 input + toggle', self: true },
        { tag: 'textarea', desc: '多行文本 容器 l ph rows maxrows maxlen auto tx dis ro req', self: false },
        { tag: 'select', desc: '下拉选择 容器 l ph multi id/n req v:inline；子 opt', self: false },
        { tag: 'radio', desc: '单选组 容器 l id/n v:inline；子 opt', self: false },
        { tag: 'opt', desc: '选项 v:value tx:text chk:checked/selected', self: true },
        { tag: 'checkbox', desc: '复选框 l:label chk id/n v:inline', self: true },
        { tag: 'switch', desc: '开关 l:label chk dis clk id/n v:sm/lg', self: true },
        { tag: 'slider', desc: '滑块 l:label min max step v dis clk id/n', self: true },
        { tag: 'rate', desc: '评分 l:label v:value max clk dis tx:char', self: true },
        { tag: 'numinput', desc: '数字输入 v:value min max step dis id/n l', self: true },
        { tag: 'btn', desc: '按钮 tx/clk/sub/id/dis/w/bg/fc/radius t:type v:primary/danger/success/warning/ghost/sm/lg/pill/square/block', self: true },
        { tag: 'btngroup', desc: '按钮组 容器 id v:vertical/pill', self: false },
        { tag: 'picker', desc: '选择器 容器 l ph multi dis id/n v:inline/error/success', self: false },
        { tag: 'cascader', desc: '级联选择 容器 l ph dis clk v:preselected id/n', self: false },
        { tag: 'upload', desc: '上传 l ph accept multi dis clk max id/n', self: true },
        { tag: 'datepicker', desc: '日期选择 l ph fmt v clk dis id/n', self: true },
        { tag: 'timepicker', desc: '时间选择 l ph fmt v clk dis id/n', self: true },
        { tag: 'datetimepicker', desc: '日期时间 l ph fmt v clk dis id/n', self: true },
        { tag: 'transfer', desc: '穿梭框 容器 l tt/tt2 clk id dis n', self: false }
      ]
    },
    {
      title: '数据与图表',
      type: 'comp',
      items: [
        { tag: 'table', desc: '表格 容器 stripe cap v:bordered/compact', self: false },
        { tag: 'thead', desc: '表头 容器 cols:列名（逗号，支持 chk/#）', self: false },
        { tag: 'tbody', desc: '表体 容器', self: false },
        { tag: 'tr', desc: '表格行 cs:colspan 内容逗号分隔单元格', self: true },
        { tag: 'tcol', desc: '列占位', self: true },
        { tag: 'chart', desc: '图表(20种) t:bar/line/area/pie/donut/rose/funnel/radar/scatter/bubble/heatmap/histogram/waterfall/boxplot/treemap/sankey/candlestick/progress/gauge/gantt d/l/c/tt w/h stack smooth orient xl/yl range anim', self: true },
        { tag: 'chart', desc: '甘特 t:gantt tasks:任务列表 gnames:组名 deps:依赖 ms:里程碑 mode w/h', self: true }
      ]
    },
    {
      title: '完整示例',
      type: 'code',
      content: '[h1 欢迎使用 TokUI]\n[p v:muted 这是一段带样式的文本段落]\n\n[btn tx:"点击我" v:primary clk:handleClick]\n\n[card tt:"用户信息"]\n  [row]\n    [col span:6]\n      [input l:"姓名" ph:"请输入" req]\n    [/col]\n    [col span:6]\n      [select l:"部门"]\n        [opt 技术部]\n        [opt 市场部]\n      [/select]\n    [/col]\n  [/row]\n  [ft]\n    [btn tx:"提交" v:primary sub:handleSubmit]\n    [btn tx:"取消"]\n  [/ft]\n[/card]\n\n[table stripe]\n  [thead cols:"姓名,年龄,城市"]\n  [tbody]\n    [tr 张三,25,北京]\n    [tr 李四,30,上海]\n  [/tbody]\n[/table]\n\n[chart t:bar tt:"月度销售" l:"1月,2月,3月" d:"120,190,300"]\n\n[bubble role:ai]\n  [p 你好，有什么可以帮你的？]\n[/bubble]\n\n[progress id:prog v:0 l:"处理进度"]\n[upd id:prog v:50]\n[upd id:prog v:100 status:success]'
    }
  ]
};

function renderDslRef() {
  const body = document.getElementById('dslBody');
  const ref = DSL_REF;
  let html = '';

  ref.sections.forEach(section => {
    html += '<div class="dsl-section"><div class="dsl-section-title">' + section.title + '</div>';

    if (section.type === 'syntax') {
      html += '<div class="dsl-syntax-row">';
      section.items.forEach((item, i) => {
        if (i > 0 && i % 2 === 0) html += '</div><div class="dsl-syntax-row">';
        html += '<div class="dsl-syntax-item"><code>' + item.code + '</code><span>' + item.desc + '</span></div>';
      });
      html += '</div>';
    } else if (section.type === 'comp') {
      html += '<div class="dsl-comp-list">';
      section.items.forEach(item => {
        html += '<div class="dsl-comp-item"><span class="dsl-comp-tag' + (item.self ? ' dsl-comp-self' : ' dsl-comp-container') + '">' + item.tag + '</span><span class="dsl-comp-desc">' + item.desc + '</span></div>';
      });
      html += '</div>';
    } else if (section.type === 'attrs') {
      html += '<div class="dsl-attr-grid">';
      section.items.forEach(item => {
        html += '<div class="dsl-attr-item"><span class="dsl-attr-key">' + item.key + '</span><span class="dsl-attr-val">' + item.val + '</span></div>';
      });
      html += '</div>';
    } else if (section.type === 'tags') {
      html += '<div class="dsl-tag-list">';
      section.items.forEach(tag => {
        html += '<span class="dsl-tag">' + tag + '</span>';
      });
      html += '</div>';
    } else if (section.type === 'code') {
      html += '<div class="dsl-example-wrap">';
      html += '<div class="dsl-example-bar"><span class="dsl-example-label">DSL</span><button class="dsl-render-btn" onclick="dslPreviewRender(this)">查看渲染效果</button></div>';
      html += '<pre class="dsl-example">' + section.content + '</pre>';
      html += '<div class="dsl-preview" style="display:none;"></div>';
      html += '</div>';
    }

    html += '</div>';
  });

  body.innerHTML = html;
}

function dslPreviewRender(btn) {
  const wrap = btn.closest('.dsl-example-wrap');
  const pre = wrap.querySelector('.dsl-example');
  const preview = wrap.querySelector('.dsl-preview');
  const label = wrap.querySelector('.dsl-example-label');
  const showingPreview = preview.style.display !== 'none';
  if (showingPreview) {
    preview.style.display = 'none';
    pre.style.display = 'block';
    btn.textContent = '查看渲染效果';
    label.textContent = 'DSL';
    return;
  }
  if (!preview.dataset.rendered) {
    const dsl = pre.textContent;
    preview.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'tokui-root';
    container.setAttribute('data-tokui-theme', document.body.classList.contains('dark') ? 'dark' : 'default');
    preview.appendChild(container);
    const t = new TokUI.TokUI({ container: container, theme: document.body.classList.contains('dark') ? 'dark' : 'default' });
    t.render(dsl, container);
    preview.dataset.rendered = '1';
  }
  pre.style.display = 'none';
  preview.style.display = 'block';
  btn.textContent = '查看源码';
  label.textContent = 'PREVIEW';
}

document.getElementById('dslRef').onclick = (e) => {
  e.preventDefault();
  document.querySelector('.app-dsl-header h3').textContent = DSL_REF.header.title;
  document.querySelector('.app-dsl-header-sub').textContent = DSL_REF.header.sub;
  renderDslRef();
  document.getElementById('dslDialog').showModal();
};

document.getElementById('dslClose').onclick = () => {
  document.getElementById('dslDialog').close();
};

document.getElementById('contactBtn').onclick = () => {
  document.getElementById('qrDialog').showModal();
};

document.getElementById('qrClose').onclick = () => {
  document.getElementById('qrDialog').close();
};

// 社群弹层（同联系层结构，显示项目根 qrcode.jpg + 加作者微信进群提示）
document.getElementById('communityBtn').onclick = () => {
  document.getElementById('communityDialog').showModal();
};
document.getElementById('communityClose').onclick = () => {
  document.getElementById('communityDialog').close();
};

// ========================================
// Global Search
// ========================================
(function initSearch() {
  var searchInput = document.getElementById('searchInput');
  var dropdown = document.getElementById('searchDropdown');
  var searchBox = document.getElementById('appSearch');
  var activeIdx = -1;
  var filteredItems = [];

  function getAllItems() {
    var items = [];
    NAV_DATA.forEach(function(cat) {
      cat.items.forEach(function(item) {
        items.push({ trigger: item.trigger, name: item.name[lang], desc: item.desc[lang], icon: item.icon, catName: cat.name[lang] });
      });
    });
    return items;
  }

  function highlight(text, query) {
    if (!query) return text;
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.substring(0, idx) + '<mark>' + text.substring(idx, idx + query.length) + '</mark>' + text.substring(idx + query.length);
  }

  function renderResults(query) {
    var all = getAllItems();
    if (!query) { filteredItems = all; } else {
      var q = query.toLowerCase();
      filteredItems = all.filter(function(it) {
        return it.name.toLowerCase().indexOf(q) !== -1 || it.desc.toLowerCase().indexOf(q) !== -1 || it.catName.toLowerCase().indexOf(q) !== -1;
      });
    }
    activeIdx = -1;
    if (filteredItems.length === 0) {
      dropdown.innerHTML = '<div class="app-search-empty">未找到匹配的组件</div>';
    } else {
      dropdown.innerHTML = filteredItems.slice(0, 20).map(function(it, i) {
        return '<div class="app-search-item" data-idx="' + i + '" data-trigger="' + it.trigger + '">' +
          '<em class="app-search-item-icon">' + it.icon + '</em>' +
          '<div class="app-search-item-body">' +
            '<div class="app-search-item-name">' + highlight(it.name, query) + '</div>' +
            '<div class="app-search-item-desc">' + it.catName + ' · ' + highlight(it.desc, query) + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    dropdown.classList.add('active');
  }

  function selectItem(idx) {
    var el = dropdown.querySelector('[data-idx="' + idx + '"]');
    if (el) el.click();
  }

  function setActive(idx) {
    dropdown.querySelectorAll('.app-search-item').forEach(function(el, i) {
      el.classList.toggle('active', i === idx);
    });
    var active = dropdown.querySelector('.app-search-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  searchInput.addEventListener('input', function() {
    renderResults(this.value.trim());
  });

  searchInput.addEventListener('focus', function() {
    renderResults(this.value.trim());
    if (isMobile()) searchBox.classList.add('expanded');
  });

  function isMobile() { return window.matchMedia('(max-width: 768px)').matches; }

  searchBox.addEventListener('click', function(e) {
    if (isMobile() && !searchBox.classList.contains('expanded')) {
      e.preventDefault();
      searchBox.classList.add('expanded');
      setTimeout(function() {
        searchInput.focus();
        renderResults(searchInput.value.trim());
      }, 80);
    }
  });

  searchInput.addEventListener('keydown', function(e) {
    var count = dropdown.querySelectorAll('.app-search-item').length;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, count - 1); setActive(activeIdx); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); setActive(activeIdx); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectItem(activeIdx); }
    else if (e.key === 'Escape') { closeSearch(); }
  });

  dropdown.addEventListener('click', function(e) {
    var item = e.target.closest('.app-search-item');
    if (!item) return;
    var trigger = item.dataset.trigger;
    closeSearch();
    setActiveNav(trigger);
    location.hash = trigger;
    var itemName = '';
    NAV_DATA.forEach(function(cat) {
      cat.items.forEach(function(it) { if (it.trigger === trigger) itemName = it.name[lang]; });
    });
    sendPrompt(trigger, itemName);
  });

  function closeSearch() {
    searchInput.value = '';
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
    searchInput.blur();
    searchBox.classList.remove('expanded');
  }

  document.addEventListener('click', function(e) {
    if (!searchBox.contains(e.target)) {
      dropdown.classList.remove('active');
      searchBox.classList.remove('expanded');
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    }
  });
})();

// ========================================
// Toast
// ========================================
let toastContainer;
function showToast(msg) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  toastContainer.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast--visible'));
  setTimeout(() => { t.classList.remove('toast--visible'); setTimeout(() => t.remove(), 300); }, 2500);
}

// ========================================
// Init
// ========================================

// 应用持久化的语言（demo 外壳文案 + TokUI 库 chrome locale），含 renderNav
applyLang();

// 从 hash 恢复上次选中的导航
(function restoreFromHash() {
  var hash = location.hash.replace('#', '');
  if (!hash) return;
  var found = false;
  NAV_DATA.forEach(function(cat) {
    cat.items.forEach(function(item) {
      if (item.trigger === hash) found = true;
    });
  });
  if (found) {
    setActiveNav(hash);
    var itemName = '';
    NAV_DATA.forEach(function(cat) {
      cat.items.forEach(function(item) {
        if (item.trigger === hash) itemName = item.name[lang];
      });
    });
    sendPrompt(hash, itemName);
  }
})();

initWelcomeAnim();
