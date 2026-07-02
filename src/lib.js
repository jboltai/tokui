/**
 * TokUI — 库打包入口（Vite/Rolldown 消费）。
 * Bundler entry that assembles the public TokUI namespace.
 *
 * 消费方式：
 *   - ESM:      import TokUI from '@jboltai/tokui';  new TokUI.TokUI({container})
 *   - 命名导出: import { TokUI, registerHandler, setTheme, el } from '@jboltai/tokui'
 *   - UMD/CDN:  <script src="tokui.umd.js"> → window.TokUI（命名空间）
 *
 * 设计要点：
 *   Rolldown 把 src 的 CJS 重写为 ESM 时会移除 require/module/exports，src 文件
 *   的 `typeof require` 分支全失效，运行时统一走 window 分支，靠共享总线
 *   window.TokUI._internal 的"先写后读"顺序工作。因此本入口必须：
 *     1. 显式按拓扑序 import 全部 src 模块（叶子→中层→聚合器→主类最后），
 *        用真实 ESM 边强制 Rolldown 求值顺序；
 *     2. 不具名导出 _internal / showNotification —— 它们属 window.TokUI 级，
 *        由 src 文件 window 分支填充；具名导出会覆盖掉 src 累加的 _internal。
 */
'use strict';

// 库 CSS（Vite 抽为 tokui.css，不影响 JS 求值顺序）
import './styles/index.css';

// —— 叶子模块（无 src 依赖，仅写 window.TokUI._internal）——
// i18n 必须最先求值：renderer/lightbox/chart/basic/form/layout 渲染期都经 _internal.t 取串，
// 其 window 分支在此填充 _internal.t / setLocale / registerLocale。
import TokUII18n from './core/i18n.js';                 // CJS 裸对象 → default
import TokUIEventBus from './core/event-bus.js';        // CJS 裸对象 → default
import TokUITheme from './core/theme.js';               // CJS 裸对象 → default
import './core/color-generator.js';
import './core/parser.js';
import { TokUIRenderer, el } from './core/renderer.js'; // CJS 对象 → 命名
import './components/lightbox.js';
import './components/chart.js';
import './components/icons.js';                         // 叶子：写 _internal.iconSvg/ICONS（form/table 渲染时读）
import './components/barcode.js';                       // 叶子：写 _internal.registerBarcode/encode128B（Code128 条码组件）
import './vendor/qrcode-generator.js';                  // vendored 第三方（Arase, MIT）：求值后挂 _internal._qrcode 供 qrcode 组件用
import './components/qrcode.js';                        // 叶子：写 _internal.registerQrcode（QR 二维码组件，读 vendor）
// —— 中层（读叶子）——
import './components/basic.js';                         // 读 renderer.el、lightbox
import './components/table.js';                         // 读 renderer、parser
import './components/form.js';                          // 读 renderer、basic
import './components/layout.js';                        // 读 renderer、lightbox
// —— 聚合器（读 basic/table/form/layout/chart，写 _internal.registerAllComponents）——
import './components/index.js';
// —— 主类（读全部 _internal）——必须最后求值
import TokUIClass from './index.js';

// 绑定单例方法的稳定引用（供命名空间与具名导出）
const registerHandler = TokUIEventBus.registerHandler.bind(TokUIEventBus);
const removeHandler = TokUIEventBus.removeHandler.bind(TokUIEventBus);
const setTheme = TokUITheme.setTheme.bind(TokUITheme);
const getTheme = TokUITheme.getTheme.bind(TokUITheme);
const setLocale = TokUII18n.setLocale.bind(TokUII18n);
const getLocale = TokUII18n.getLocale.bind(TokUII18n);
const registerLocale = TokUII18n.registerLocale.bind(TokUII18n);

// 公共命名空间对象（ESM default）。window.TokUI._internal / showNotification /
// showToast 由 src 文件与 new TokUI() 构造时挂到 window.TokUI，不在此重复。
const TokUI = {
  TokUI: TokUIClass,
  registerHandler,
  removeHandler,
  setTheme,
  getTheme,
  setLocale,
  getLocale,
  registerLocale,
  el,
};

export {
  TokUIClass as TokUI,
  registerHandler,
  removeHandler,
  setTheme,
  getTheme,
  setLocale,
  getLocale,
  registerLocale,
  el,
};
export default TokUI;
