/**
 * TokUI 国际化模块（i18n）
 * 提供组件骨架级文案（aria-label / placeholder / 空态 / 按钮默认字）的多语言支持。
 * 业务文案（DSL 里的 tt:/l:/tx:/opt: 等属性值）不归本模块管——后端按 locale
 * 发不同 DSL，或应用层自行翻译，框架不越界。
 *
 * 使用方式：
 * - 默认 zh-CN；TokUI.setLocale('en-US') 切换
 * - TokUI.registerLocale('ja-JP', {...}) 注入更多语种
 * - 渲染期：组件经 window.TokUI._internal.t(key, params)（浏览器）
 *   或 require('../core/i18n').t（Node）取串
 *
 * 性能：t() 内闭包缓存 CURRENT_DICT 引用，setLocale 仅换引用（O(1)），
 * 单态查表可被 V8 内联；插值用 {name} 占位符。
 */
'use strict';

/**
 * 内置语言包（仅 zh-CN + en-US；其余语种走 registerLocale 按需注入）
 * key 按「组件.位置」语义命名，不按原文——改措辞不动 key。
 */
var STRINGS = {
  'zh-CN': {
    // —— 通用（跨组件复用）——
    'common.close': '关闭',
    'common.ok': '确定',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.copy': '复制',
    'common.copied': '已复制',
    'common.download': '下载',
    'common.view': '查看',
    'common.send': '发送',
    'common.loading': '加载中',
    'common.renderFailed': '渲染失败',

    // —— 时间分组（chat 历史 / gantt 共用）——
    'time.today': '今天',
    'time.yesterday': '昨天',
    'time.earlier': '更早',

    // —— Lightbox 图片预览 ——
    'lightbox.preview': '图片预览',
    'lightbox.zoomIn': '放大',
    'lightbox.zoomOut': '缩小',
    'lightbox.reset': '重置',
    'lightbox.rotateLeft': '左旋90°',
    'lightbox.rotateRight': '右旋90°',
    'lightbox.flipH': '水平翻转',
    'lightbox.flipV': '垂直翻转',

    // —— Layout 布局类 ——
    'layout.collapseDefault': '展开',
    'layout.gallery': '图片画廊',
    'layout.carouselPrev': '上一张',
    'layout.carouselNext': '下一张',
    'layout.carouselIndex': '第{n}张',

    // —— Pagination 分页 ——
    'pagination.aria': '分页',
    'pagination.totalCount': '共{count}条',
    'pagination.totalPages': '共{total}页',

    // —— Menu / Trigger 默认触发文案 ——
    'menu.defaultTrigger': '菜单',
    'trigger.default': '点击',

    // —— Think 推理块 ——
    'think.title': '思考过程',
    'thinkChain.title': '推理过程',

    // —— 点赞/点踩 aria ——
    'like.up': '点赞',
    'like.down': '点踩',

    // —— 消息动作条（msg-actions）默认动作 ——
    'actions.copy': '复制',
    'actions.regenerate': '重新生成',
    'actions.like': '赞',
    'actions.dislike': '踩',
    'actions.delete': '删除',

    // —— 文件类 ——
    'file.unnamed': '未知文件',

    // —— 倒计时 / 时长单位 ——
    'countdown.ended': '已结束',
    'duration.day': '天',
    'duration.hour': '时',
    'duration.minute': '分',
    'duration.second': '秒',

    // —— Popconfirm 二次确认 ——
    'popconfirm.trigger': '确认',
    'popconfirm.aria': '确认操作',

    // —— 回到顶部 ——
    'backToTop.aria': '回到顶部',

    // —— 日期选择器 ——
    'datepicker.title': '{y}年{m}月',
    'datepicker.weekday.0': '日',
    'datepicker.weekday.1': '一',
    'datepicker.weekday.2': '二',
    'datepicker.weekday.3': '三',
    'datepicker.weekday.4': '四',
    'datepicker.weekday.5': '五',
    'datepicker.weekday.6': '六',

    // —— 会话历史 ——
    'chat.emptySessions': '暂无会话',

    // —— 输入标签 input-tag ——
    'inputTag.placeholder': '输入后按回车添加',

    // —— 命令面板 ——
    'command.placeholder': '输入关键词搜索...',
    'command.aria': '命令面板',
    'command.noResult': '没有找到匹配结果',

    // —— 状态文本（timeline / 进程类组件 STATUS 映射）——
    'status.pending': '等待中',
    'status.running': '运行中',
    'status.done': '完成',
    'status.error': '出错',
    'status.denied': '已拒绝',
    'status.idle': '空闲',
    'status.paused': '已暂停',

    // —— Agent / 推理链汇总标签 ——
    'agent.thinking': '思考',
    'agent.generating': '生成',
    'agent.total': '总计',

    // —— 表单类 ——
    'picker.noMatch': '无匹配项',
    'rate.defaultLabel': '评分',
    'select.placeholder': '请选择',
    'upload.hint': '点击或拖拽文件至此处上传',
    'upload.browse': '浏览文件',

    // —— 图表 chart ——
    'chart.empty': '暂无数据',
    'chart.seriesDefault': '系列{n}',
    'chart.itemDefault': '项目{n}',
    'chart.sliceDefault': '项{n}',
    'chart.groupDefault': '组{n}',
    'chart.ringDefault': '环{n}',
    'chart.dimensionDefault': '维度{n}',
    'chart.stageDefault': '阶段{n}',
    'chart.taskDefault': '任务{n}',
    'chart.conversion': '转化{pct}%',
    'chart.cumulative': '累计{n}',
    'chart.median': '中位',
    'chart.monthLabel': '{m}月',
    'chart.unsupportedType': '不支持的图表类型: {type}',
    'chart.copyFailed': '复制失败',
    'chart.unsupported': '不支持',
    'chart.copyImage': '复制图片',
    'chart.downloadImage': '下载图片',
    'chart.fullscreen': '放大查看',

    // —— 仪表盘 gauge 状态色语义 ——
    'gauge.statusGood': '良好',
    'gauge.statusWarn': '注意',
    'gauge.statusDanger': '告警',
    'gauge.statusInfo': '正常',
    'gauge.currentValue': '当前值',

    // —— 甘特图 gantt ——
    'gantt.skipped': '⚠ 跳过 {n} 条无效任务',
    'gantt.noTasks': '无任务数据',
    'gantt.progress': '进度'
  },

  'en-US': {
    // —— common ——
    'common.close': 'Close',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.download': 'Download',
    'common.view': 'View',
    'common.send': 'Send',
    'common.loading': 'Loading',
    'common.renderFailed': 'Render failed',

    // —— time ——
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'time.earlier': 'Earlier',

    // —— lightbox ——
    'lightbox.preview': 'Image preview',
    'lightbox.zoomIn': 'Zoom in',
    'lightbox.zoomOut': 'Zoom out',
    'lightbox.reset': 'Reset',
    'lightbox.rotateLeft': 'Rotate 90° left',
    'lightbox.rotateRight': 'Rotate 90° right',
    'lightbox.flipH': 'Flip horizontal',
    'lightbox.flipV': 'Flip vertical',

    // —— layout ——
    'layout.collapseDefault': 'Expand',
    'layout.gallery': 'Image gallery',
    'layout.carouselPrev': 'Previous',
    'layout.carouselNext': 'Next',
    'layout.carouselIndex': 'Image {n}',

    // —— pagination ——
    'pagination.aria': 'Pagination',
    'pagination.totalCount': '{count} items',
    'pagination.totalPages': '{total} pages',

    // —— menu / trigger ——
    'menu.defaultTrigger': 'Menu',
    'trigger.default': 'Click',

    // —— think ——
    'think.title': 'Reasoning',
    'thinkChain.title': 'Reasoning process',

    // —— like ——
    'like.up': 'Like',
    'like.down': 'Dislike',

    // —— actions ——
    'actions.copy': 'Copy',
    'actions.regenerate': 'Regenerate',
    'actions.like': 'Like',
    'actions.dislike': 'Dislike',
    'actions.delete': 'Delete',

    // —— file ——
    'file.unnamed': 'Unnamed file',

    // —— countdown / duration ——
    'countdown.ended': 'Ended',
    'duration.day': 'd',
    'duration.hour': 'h',
    'duration.minute': 'm',
    'duration.second': 's',

    // —— popconfirm ——
    'popconfirm.trigger': 'Confirm',
    'popconfirm.aria': 'Confirm action',

    // —— backToTop ——
    'backToTop.aria': 'Back to top',

    // —— datepicker ——
    'datepicker.title': '{m}/{y}',
    'datepicker.weekday.0': 'Sun',
    'datepicker.weekday.1': 'Mon',
    'datepicker.weekday.2': 'Tue',
    'datepicker.weekday.3': 'Wed',
    'datepicker.weekday.4': 'Thu',
    'datepicker.weekday.5': 'Fri',
    'datepicker.weekday.6': 'Sat',

    // —— chat ——
    'chat.emptySessions': 'No conversations',

    // —— inputTag ——
    'inputTag.placeholder': 'Press Enter to add',

    // —— command ——
    'command.placeholder': 'Type to search...',
    'command.aria': 'Command palette',
    'command.noResult': 'No results found',

    // —— status ——
    'status.pending': 'Pending',
    'status.running': 'Running',
    'status.done': 'Done',
    'status.error': 'Error',
    'status.denied': 'Denied',
    'status.idle': 'Idle',
    'status.paused': 'Paused',

    // —— agent ——
    'agent.thinking': 'Thinking',
    'agent.generating': 'Generating',
    'agent.total': 'Total',

    // —— form ——
    'picker.noMatch': 'No matches',
    'rate.defaultLabel': 'Rating',
    'select.placeholder': 'Select...',
    'upload.hint': 'Click or drag files here to upload',
    'upload.browse': 'Browse',

    // —— chart ——
    'chart.empty': 'No data',
    'chart.seriesDefault': 'Series {n}',
    'chart.itemDefault': 'Item {n}',
    'chart.sliceDefault': 'Slice {n}',
    'chart.groupDefault': 'Group {n}',
    'chart.ringDefault': 'Ring {n}',
    'chart.dimensionDefault': 'Dim {n}',
    'chart.stageDefault': 'Stage {n}',
    'chart.taskDefault': 'Task {n}',
    'chart.conversion': '{pct}% conv',
    'chart.cumulative': 'Cumulative {n}',
    'chart.median': 'median',
    'chart.monthLabel': '{m}-',
    'chart.unsupportedType': 'Unsupported chart type: {type}',
    'chart.copyFailed': 'Copy failed',
    'chart.unsupported': 'Unsupported',
    'chart.copyImage': 'Copy image',
    'chart.downloadImage': 'Download image',
    'chart.fullscreen': 'Fullscreen',

    // —— gauge ——
    'gauge.statusGood': 'Good',
    'gauge.statusWarn': 'Warning',
    'gauge.statusDanger': 'Critical',
    'gauge.statusInfo': 'Normal',
    'gauge.currentValue': 'Current',

    // —— gantt ——
    'gantt.skipped': '⚠ Skipped {n} invalid tasks',
    'gantt.noTasks': 'No task data',
    'gantt.progress': 'Progress'
  }
};

var FALLBACK_LOCALE = 'zh-CN';

/**
 * 当前 locale（已规整为 STRINGS 实际存在的 key）
 */
var CURRENT_LOCALE = FALLBACK_LOCALE;
/**
 * 当前字典引用缓存——t() 直接读它，setLocale 只换引用（O(1)，避免逐次查 STRINGS[locale]）。
 */
var CURRENT_DICT = STRINGS[FALLBACK_LOCALE];

/**
 * 语种别名规整：接受 zh/zh-CN/zh-TW/zh-Hans/en/en-US/... 映射到内置语种。
 * 优先级：精确命中 > 全小写命中 > 基础语种（-之前）命中 > 别名表 > 回退 zh-CN。
 */
function resolveLocale(locale) {
  if (typeof locale === 'string' && STRINGS[locale]) return locale;
  if (typeof locale === 'string') {
    var lower = locale.toLowerCase();
    if (STRINGS[lower]) return lower;
    var base = lower.split('-')[0];
    if (STRINGS[base]) return base;
    // 中文族 → zh-CN；英文族 → en-US
    if (base === 'zh') return 'zh-CN';
    if (base === 'en') return 'en-US';
  }
  return FALLBACK_LOCALE;
}

/**
 * {name} 占位符插值。params 缺省或键缺失时保留原占位符（便于排查漏传）。
 */
function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, function (m, k) {
    return params[k] != null ? String(params[k]) : m;
  });
}

/**
 * 取译文。命中顺序：当前 locale 字典 → zh-CN 兜底 → 返回 key 原文。
 * 性能热路径：单次对象属性查找 + 可选 replace。
 * @param {string} key - 形如 'pagination.totalCount' 的语义 key
 * @param {Object} [params] - 插值参数，如 { count: 42 }
 * @returns {string}
 */
function t(key, params) {
  var s = CURRENT_DICT[key];
  if (s === undefined) s = STRINGS[FALLBACK_LOCALE][key];
  if (s === undefined) return key;
  return params ? interpolate(s, params) : s;
}

/**
 * 自动探测浏览器 locale：documentElement.lang > navigator.language > zh-CN。
 * SSR（无 document/navigator）回退默认。
 */
function _detectLocale() {
  try {
    if (typeof document !== 'undefined' && document.documentElement &&
        document.documentElement.lang) {
      return document.documentElement.lang;
    }
  } catch (e) {}
  try {
    if (typeof navigator !== 'undefined') {
      if (navigator.language) return navigator.language;
    }
  } catch (e) {}
  return FALLBACK_LOCALE;
}

/**
 * i18n 单例
 */
var TokUII18n = {
  /**
   * 初始化当前 locale（构造 TokUI 时调用，传入 options.locale 或自动探测）
   * @param {string} [locale] - 显式 locale；缺省则自动探测
   * @returns {string} 规整后实际生效的 locale
   */
  init: function (locale) {
    var resolved = resolveLocale(locale != null ? locale : _detectLocale());
    CURRENT_LOCALE = resolved;
    CURRENT_DICT = STRINGS[resolved] || STRINGS[FALLBACK_LOCALE];
    return resolved;
  },

  /**
   * 切换当前 locale（运行时切语言）。已渲染的 DOM 不会自动更新——
   * 需重渲染（重新 feed/parse）或应用层自行刷新。
   * @param {string} locale - 目标 locale（如 'en-US' / 'zh-CN' / 'en'）
   * @returns {string} 规整后实际生效的 locale
   */
  setLocale: function (locale) {
    var resolved = resolveLocale(locale);
    CURRENT_LOCALE = resolved;
    CURRENT_DICT = STRINGS[resolved] || STRINGS[FALLBACK_LOCALE];
    return resolved;
  },

  /**
   * 取当前 locale
   * @returns {string}
   */
  getLocale: function () {
    return CURRENT_LOCALE;
  },

  /**
   * 注册/合并新语种字典。可增量补充（仅传缺失 key），也可整包覆盖。
   * 注册当前 locale 会立即刷新字典缓存。
   * @param {string} locale - 语种 key（如 'ja-JP'）
   * @param {Object} dict - key→译文 映射
   */
  registerLocale: function (locale, dict) {
    if (!locale || typeof locale !== 'string' || !dict || typeof dict !== 'object') return;
    STRINGS[locale] = Object.assign({}, STRINGS[locale] || {}, dict);
    if (CURRENT_LOCALE === locale) {
      CURRENT_DICT = STRINGS[locale];
    }
  },

  t: t
};

// 兼容浏览器和 Node.js 环境导出（UMD 双模式，与 theme.js 同构）
if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.TokUII18n = TokUII18n;
  window.TokUI._internal.t = t;                       // 组件渲染期经此取串
  window.TokUI.setLocale = TokUII18n.setLocale;
  window.TokUI.getLocale = TokUII18n.getLocale;
  window.TokUI.registerLocale = TokUII18n.registerLocale;
  // 模块求值即按浏览器环境初始化默认 locale（应用可在 new TokUI({locale}) 时覆盖）
  TokUII18n.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokUII18n;
}
