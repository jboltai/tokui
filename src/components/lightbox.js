/**
 * TokUI 灯箱预览模块
 * 点击图片弹出全屏灯箱大图预览。
 * 支持：左右切换、ESC 关闭、点击遮罩关闭、文件名显示、缩放、旋转、翻转。
 * 灯箱 DOM 首次打开时动态创建，关闭时移除。
 */
'use strict';

// i18n 取串：浏览器走 window.TokUI._internal.t（lib.js 拓扑序保证 i18n 先于本模块求值），
// Node 走 require。t 内部缓存当前 locale 字典，setLocale 仅换引用。
var _t = (typeof require === 'function')
  ? require('../core/i18n').t
  : (window.TokUI && window.TokUI._internal && window.TokUI._internal.t)
    || function (key) { return key; };

/**
 * 从图片 URL 中提取文件名
 * @param {string} src - 图片 URL
 * @returns {string} 文件名
 */
function extractFileName(src) {
  try {
    var path = src.split('?')[0];
    var parts = path.split('/');
    var name = parts[parts.length - 1];
    if (name && name.length < 60) return decodeURIComponent(name);
    return '';
  } catch (e) {
    return '';
  }
}

/**
 * 创建灯箱模块实例
 * @param {Document} doc - document 对象（支持 SSR 传入 mock）
 * @returns {{ open: Function, destroy: Function }}
 */
function createLightbox(doc) {
  var overlay = null;
  var currentIndex = 0;
  var images = [];
  var onKeyHandler = null;
  var triggerElement = null;

  // 图片变换状态
  var scale = 1;
  var rotation = 0;
  var flipH = false;
  var flipV = false;

  function resetTransform() {
    scale = 1;
    rotation = 0;
    flipH = false;
    flipV = false;
  }

  function applyTransform() {
    var img = overlay.querySelector('.tokui-lightbox__img');
    var transforms = [];
    transforms.push('scale(' + scale + ')');
    transforms.push('rotate(' + rotation + 'deg)');
    if (flipH) transforms.push('scaleX(-1)');
    if (flipV) transforms.push('scaleY(-1)');
    img.style.transform = transforms.join(' ');
    // 缩放时切换拖拽光标
    img.style.cursor = scale > 1 ? 'grab' : '';
    // 更新工具栏按钮状态
    updateToolbarState();
  }

  function updateToolbarState() {
    if (!overlay) return;
    var scaleDisplay = overlay.querySelector('.tokui-lightbox__scale');
    if (scaleDisplay) scaleDisplay.textContent = Math.round(scale * 100) + '%';
  }

  function buildDOM() {
    overlay = doc.createElement('div');
    overlay.className = 'tokui-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', _t('lightbox.preview'));

    var img = doc.createElement('img');
    img.className = 'tokui-lightbox__img';
    overlay.appendChild(img);

    // 工具栏
    var toolbar = doc.createElement('div');
    toolbar.className = 'tokui-lightbox__toolbar';

    var btnZoomIn = doc.createElement('button');
    btnZoomIn.className = 'tokui-lightbox__tool';
    btnZoomIn.setAttribute('aria-label', _t('lightbox.zoomIn'));
    btnZoomIn.innerHTML = '&#43;';
    btnZoomIn.addEventListener('click', function (e) { e.stopPropagation(); zoomIn(); });

    var scaleDisplay = doc.createElement('span');
    scaleDisplay.className = 'tokui-lightbox__scale';
    scaleDisplay.textContent = '100%';

    var btnZoomOut = doc.createElement('button');
    btnZoomOut.className = 'tokui-lightbox__tool';
    btnZoomOut.setAttribute('aria-label', _t('lightbox.zoomOut'));
    btnZoomOut.innerHTML = '&#8722;';
    btnZoomOut.addEventListener('click', function (e) { e.stopPropagation(); zoomOut(); });

    var btnReset = doc.createElement('button');
    btnReset.className = 'tokui-lightbox__tool';
    btnReset.setAttribute('aria-label', _t('lightbox.reset'));
    btnReset.innerHTML = '&#8634;';
    btnReset.addEventListener('click', function (e) { e.stopPropagation(); resetAll(); });

    var btnRotateL = doc.createElement('button');
    btnRotateL.className = 'tokui-lightbox__tool';
    btnRotateL.setAttribute('aria-label', _t('lightbox.rotateLeft'));
    btnRotateL.innerHTML = '&#8634;L';
    btnRotateL.addEventListener('click', function (e) { e.stopPropagation(); rotate(-90); });

    var btnRotateR = doc.createElement('button');
    btnRotateR.className = 'tokui-lightbox__tool';
    btnRotateR.setAttribute('aria-label', _t('lightbox.rotateRight'));
    btnRotateR.innerHTML = '&#8635;R';
    btnRotateR.addEventListener('click', function (e) { e.stopPropagation(); rotate(90); });

    var btnFlipH = doc.createElement('button');
    btnFlipH.className = 'tokui-lightbox__tool';
    btnFlipH.setAttribute('aria-label', _t('lightbox.flipH'));
    btnFlipH.innerHTML = '&#8596;';
    btnFlipH.addEventListener('click', function (e) { e.stopPropagation(); flip('h'); });

    var btnFlipV = doc.createElement('button');
    btnFlipV.className = 'tokui-lightbox__tool';
    btnFlipV.setAttribute('aria-label', _t('lightbox.flipV'));
    btnFlipV.innerHTML = '&#8597;';
    btnFlipV.addEventListener('click', function (e) { e.stopPropagation(); flip('v'); });

    // 分隔线 + 计数器（多图时显示）
    var sep = doc.createElement('span');
    sep.className = 'tokui-lightbox__sep';

    var counter = doc.createElement('span');
    counter.className = 'tokui-lightbox__counter';

    toolbar.appendChild(btnZoomOut);
    toolbar.appendChild(scaleDisplay);
    toolbar.appendChild(btnZoomIn);
    toolbar.appendChild(btnReset);
    toolbar.appendChild(sep);
    toolbar.appendChild(btnRotateL);
    toolbar.appendChild(btnRotateR);
    toolbar.appendChild(btnFlipH);
    toolbar.appendChild(btnFlipV);
    toolbar.appendChild(sep.cloneNode());
    toolbar.appendChild(counter);
    overlay.appendChild(toolbar);

    // 文件名
    var fileName = doc.createElement('div');
    fileName.className = 'tokui-lightbox__filename';
    overlay.appendChild(fileName);

    // 左右切换按钮
    var prevBtn = doc.createElement('button');
    prevBtn.className = 'tokui-lightbox__prev';
    prevBtn.textContent = '‹';
    prevBtn.setAttribute('aria-label', 'Previous');
    overlay.appendChild(prevBtn);

    var nextBtn = doc.createElement('button');
    nextBtn.className = 'tokui-lightbox__next';
    nextBtn.textContent = '›';
    nextBtn.setAttribute('aria-label', 'Next');
    overlay.appendChild(nextBtn);

    // 关闭按钮
    var closeBtn = doc.createElement('button');
    closeBtn.className = 'tokui-lightbox__close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', _t('common.close'));
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    overlay.appendChild(closeBtn);

    // 鼠标滚轮缩放
    overlay.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    prevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      navigate(-1);
    });
    nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      navigate(1);
    });

    return overlay;
  }

  function zoomIn() {
    scale = Math.min(scale + 0.25, 5);
    applyTransform();
  }

  function zoomOut() {
    scale = Math.max(scale - 0.25, 0.25);
    applyTransform();
  }

  function rotate(deg) {
    rotation = (rotation + deg) % 360;
    applyTransform();
  }

  function flip(axis) {
    if (axis === 'h') flipH = !flipH;
    else flipV = !flipV;
    applyTransform();
  }

  function resetAll() {
    resetTransform();
    applyTransform();
  }

  function updateView() {
    var img = overlay.querySelector('.tokui-lightbox__img');
    var counter = overlay.querySelector('.tokui-lightbox__counter');
    var prevBtn = overlay.querySelector('.tokui-lightbox__prev');
    var nextBtn = overlay.querySelector('.tokui-lightbox__next');
    var fileName = overlay.querySelector('.tokui-lightbox__filename');

    img.src = images[currentIndex];
    counter.textContent = images.length > 1
      ? (currentIndex + 1) + '/' + images.length
      : '';
    prevBtn.style.display = images.length > 1 ? '' : 'none';
    nextBtn.style.display = images.length > 1 ? '' : 'none';

    // 文件名
    var name = extractFileName(images[currentIndex]);
    fileName.textContent = name;
    fileName.style.display = name ? '' : 'none';

    // 重置变换
    resetTransform();
    img.style.transform = '';
    img.style.cursor = '';
    updateToolbarState();
  }

  function navigate(delta) {
    currentIndex = (currentIndex + delta + images.length) % images.length;
    updateView();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === '+' || e.key === '=') zoomIn();
    if (e.key === '-') zoomOut();
    if (e.key === 'r' || e.key === 'R') rotate(e.shiftKey ? -90 : 90);
    if (e.key === 'h' || e.key === 'H') flip('h');
    if (e.key === 'v' || e.key === 'V') flip('v');
    if (e.key === '0') resetAll();
    // Tab 键 focus trap
    if (e.key === 'Tab' && overlay) {
      var focusable = overlay.querySelectorAll('button, [tabindex]');
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && doc.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && doc.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function open(src, imageList) {
    triggerElement = doc.activeElement;
    images = imageList || [src];
    currentIndex = images.indexOf(src);
    if (currentIndex < 0) currentIndex = 0;
    if (!overlay) buildDOM();
    doc.body.appendChild(overlay);
    updateView();
    doc.addEventListener('keydown', onKeyDown);
    onKeyHandler = onKeyDown;
    var closeBtn = overlay.querySelector('.tokui-lightbox__close');
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (onKeyHandler) {
      doc.removeEventListener('keydown', onKeyHandler);
      onKeyHandler = null;
    }
    if (triggerElement && triggerElement.focus) {
      triggerElement.focus();
      triggerElement = null;
    }
  }

  return { open: open, destroy: close };
}

var _lightbox = null;
function getLightbox(doc) {
  if (!_lightbox) _lightbox = createLightbox(doc || document);
  return _lightbox;
}

if (typeof window !== 'undefined') {
  window.TokUI = window.TokUI || {};
  window.TokUI._internal = window.TokUI._internal || {};
  window.TokUI._internal.createLightbox = createLightbox;
  window.TokUI._internal.getLightbox = getLightbox;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createLightbox, getLightbox };
}
