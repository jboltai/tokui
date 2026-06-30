/**
 * TokUI 组件注册入口
 * 统一注册所有组件类别（基础、表格、表单、布局、图表）到渲染器。
 */
'use strict';

// 依赖解析延迟到 registerAllComponents 调用时（运行期），而非模块求值期。
// 否则 SSR 环境（无 window 且 require 被 bundler 剥离）import 本模块即崩。
// 三态：Node CJS(require) / 浏览器(window.TokUI._internal) / SSR(无 window → no-op，渲染交还客户端)。
var _resolved = false;
var _regBasic, _regTable, _regForm, _regLayout, _regChart, _regBarcode, _regQrcode;

function _resolve() {
  if (_resolved) return;
  _resolved = true;
  if (typeof require === 'function') {
    _regBasic = require('./basic').registerBasicComponents;
    _regTable = require('./table').registerTableComponents;
    _regForm = require('./form').registerFormComponents;
    _regLayout = require('./layout').registerLayoutComponents;
    _regChart = require('./chart').registerChartComponents;
    _regBarcode = require('./barcode').registerBarcode;
    _regQrcode = require('./qrcode').registerQrcode;
  } else if (typeof window !== 'undefined' && window.TokUI && window.TokUI._internal) {
    _regBasic = window.TokUI._internal.registerBasicComponents;
    _regTable = window.TokUI._internal.registerTableComponents;
    _regForm = window.TokUI._internal.registerFormComponents;
    _regLayout = window.TokUI._internal.registerLayoutComponents;
    _regChart = window.TokUI._internal.registerChartComponents;
    _regBarcode = window.TokUI._internal.registerBarcode;
    _regQrcode = window.TokUI._internal.registerQrcode;
  }
  // else: SSR 无 window —— 保持 undefined，registerAllComponents 将 no-op
}

function registerAllComponents(renderer) {
  _resolve();
  if (!_regBasic) return; // SSR 无 DOM：注册无意义，渲染交还客户端
  _regBasic(renderer);
  _regTable(renderer);
  _regForm(renderer);
  _regLayout(renderer);
  _regChart(renderer);
  if (_regBarcode) _regBarcode(renderer);
  if (_regQrcode) _regQrcode(renderer);
}

if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.registerAllComponents = registerAllComponents;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerAllComponents };
}
