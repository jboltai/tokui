<script setup lang="ts">
// 交互 Playground：左侧 DSL 代码区（格式化 + 语法高亮），右侧实时渲染。
// 关键：TokUI 在 onMounted 内「动态 import」——
//   VitePress build 走 SSG（Node 预渲染），顶层 import src/lib.js 会触发其
//   window 分支（Node 无 window）崩。动态 import 只在客户端执行，SSG 安全。
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, shallowRef } from 'vue';
import { useData } from 'vitepress';
import { formatTokui, highlightTokui } from '../utils/dsl';
import { registerDemoHandlers } from '../utils/handlers';

const props = defineProps({
  dsl: {
    type: String,
    default: '[card tt:TokUI][p 改左边 DSL，右边实时渲染 ✨][/card]',
  },
  editable: { type: Boolean, default: true },
  format: { type: Boolean, default: true }, // 高亮视图默认走格式化
});

// UI 文案随当前 locale 切换（中文默认 / 英文）
const { lang } = useData();
const isEn = computed(() => (lang.value || '').startsWith('en'));
const t = (zh: string, en: string) => (isEn.value ? en : zh);

const code = ref(props.dsl);
const mount = ref<HTMLElement | null>(null);
const body = ref<HTMLElement | null>(null); // .vp-playground-body，用于流式时锁高
const TokUICls = shallowRef<any>(null);
const ready = ref(false);
const editing = ref(false); // true=textarea 可编辑，false=高亮只读
const copied = ref(false);
// 编辑态：透明 textarea 叠在高亮 pre 上，实现「可编辑 + 着色 + 多行格式化」
const ta = ref<HTMLTextAreaElement | null>(null);
const hl = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

// 流式模拟状态
const streaming = ref(false);
const streamedCode = ref('');
const codeBox = ref<HTMLElement | null>(null);
let streamTimer: ReturnType<typeof setTimeout> | null = null;
let streamInst: any = null;

// 全屏状态
const fsOpen = ref(false);
const fsMode = ref<'preview' | 'code'>('preview');
const fsMount = ref<HTMLElement | null>(null);
let savedBodyOverflow = '';

// 编辑态高亮：逐字 highlightTokui(code.value)——pre 高亮层与 textarea 文本必须
// 字符级一致（含空白/换行/缩进），透明 textarea 的 caret 才与下方着色对齐。
// 切勿用 formatTokui：它会按容器嵌套重排缩进/换行，二者漂移致回车、删除错位、
// 空行被补缩进。formatTokui 仅在进入编辑时跑一次（toggleEdit）给初始多行。
const highlighted = computed(() => highlightTokui(code.value));
// 逐行高亮 HTML：先格式化按 \n 切，每行独立 highlightTokui → span 不跨行。
// 关键：若先整片高亮再 split('\n')，换行符会被包进 tok-text span 内部，split 切破 span
// 后每行带半个标签；SSG 序列化时孤儿 </span> 会错位闭合父级 vp-code-src，致 build 后
// 多行 playground 仅首行着色、其余空白（dev 走浏览器 innerHTML 容错故正常）。
const codeLines = computed(() => {
  const src = streaming.value ? streamedCode.value : code.value;
  return formatTokui(src).split('\n').map((line) => highlightTokui(line));
});
// 当前选中行（-1 表示无）；点击同一行切换
const activeLine = ref(-1);
watch(() => codeLines.value.length, (n) => {
  if (activeLine.value >= n) activeLine.value = -1;
});

// 每行 → 对应的 DSL 标签 + 它是同类标签第几个（用于在右侧预览定位渲染节点）
// 处理：开标签计数、闭合标签 [/x] 回指其开标签
// 定位走 renderer 统一盖的 data-tokui-tag 印章（见 src/core/renderer.js render()），
//   不再依赖 tokui-{tag} 类名——ft/pwd/textarea 等渲染类名与标签名不一致或多组件共享类名，
//   类名定位会失效或 nth 串号。属性定位对所有组件统一生效。
const lineMap = computed(() => {
  const plain = formatTokui(code.value);
  const lines = plain.split('\n');
  const counts: Record<string, number> = {};
  const openStack: { tag: string; info: any }[] = []; // 开标签栈，供 [/x] 回查
  return lines.map((line) => {
    // 闭合标签：回指最近的同标签开标签（同一节点）
    const cm = /^\s*\[\/([a-zA-Z0-9_-]+)/.exec(line);
    if (cm) {
      for (let j = openStack.length - 1; j >= 0; j--) {
        if (openStack[j].tag === cm[1]) {
          const matched = openStack.splice(j)[0]; // 弹出它及以上（隐式自动闭合）
          return matched.info;
        }
      }
      return null;
    }
    const m = /^\s*\[([a-zA-Z0-9_-]+)/.exec(line);
    if (!m) return null; // 纯文本 / 属性行：无可定位节点
    const tag = m[1];
    counts[tag] = (counts[tag] || 0) + 1;
    const info = { tag, nth: counts[tag] - 1 };
    openStack.push({ tag, info }); // 自闭合标签无 closer，留在栈里也无害
    return info;
  });
});

// 点击代码行：选中 + 在右侧预览用遮罩层框住对应渲染节点并闪烁
const OVERLAY_CLASS = 'vp-flash-overlay';
let flashTimer: ReturnType<typeof setTimeout> | null = null;
function onLineClick(i: number) {
  activeLine.value = activeLine.value === i ? -1 : i;
  const info = lineMap.value[i];
  if (!info) return;
  const root = mount.value;
  if (!root) return;
  // 移除上次遮罩，保证同时只有一个
  const old = root.querySelector('.' + OVERLAY_CLASS);
  if (old) old.remove();
  // 查询同类标签节点。transfer 等组件按属性把子项拆到不同 DOM 区域（DOM 序 ≠ DSL 序），
  // 故带 data-tokui-idx 的节点先按 idx 排序还原 DSL 序，再取第 nth 个；无 idx 的保持 DOM 序。
  const raw = Array.prototype.slice.call(root.querySelectorAll('[data-tokui-tag="' + info.tag + '"]'));
  const hasIdx = raw.some((e: HTMLElement) => e.hasAttribute && e.hasAttribute('data-tokui-idx'));
  const els = hasIdx
    ? raw.sort((a: HTMLElement, b: HTMLElement) =>
        (+a.getAttribute('data-tokui-idx')! | 0) - (+b.getAttribute('data-tokui-idx')! | 0))
    : raw;
  const el = els[info.nth] as HTMLElement | undefined;
  if (!el) return;
  root.style.position = 'relative'; // 遮罩以 root 为定位参照
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  const overlay = document.createElement('div');
  overlay.className = OVERLAY_CLASS;
  root.appendChild(overlay);
  // 按目标相对 root 的矩形定位遮罩（同一滚动帧内，跟随滚动稳定）
  const place = () => {
    const r = el.getBoundingClientRect();
    const c = root.getBoundingClientRect();
    overlay.style.left = (r.left - c.left) + 'px';
    overlay.style.top = (r.top - c.top) + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
  };
  place();
  requestAnimationFrame(place); // 平滑滚动后二次校准
  setTimeout(place, 220);

  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => overlay.remove(), 1500);
}

async function loadTokUI() {
  // @tokui-umd → dist/tokui.umd.js（已构建产物）。VitePress build 走 Rollup，
  // 无法 interop src 的 CJS default import（报 "default" is not exported），
  // 故用 dist UMD：Rollup 打包其 IIFE，运行时挂 window.TokUI。
  // 开发热更：另开 `pnpm dev:lib`（watch 产 dist），dist 变 → 本组件 HMR。
  await import('@tokui-umd');
  const ns = (window as any).TokUI;
  TokUICls.value = ns && ns.TokUI;
  // 注册文档 demo 交互 handler（openDialog/closeDialog 等），让 dialog/drawer 示例可点。
  // 幂等：多次注册同名 handler 会覆盖，安全。
  if (ns && typeof ns.registerHandler === 'function') {
    registerDemoHandlers(ns.registerHandler.bind(ns));
  }
  ready.value = true;
  render();
}

function renderInto(target: HTMLElement | null) {
  if (!target || !TokUICls.value) return;
  target.innerHTML = '';
  try {
    const inst = new TokUICls.value({ container: target, theme: 'default' });
    inst.render(code.value, target);
  } catch (e: any) {
    target.innerHTML =
      '<div class="vp-playground-error">⚠ ' +
      (e && e.message ? e.message : String(e)) +
      '</div>';
  }
}

function render() { renderInto(mount.value); }
function renderFs() { renderInto(fsMount.value); }

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { render(); if (fsOpen.value && fsMode.value === 'preview') renderFs(); }, 200);
}

function reset() {
  // 编辑态重置也走格式化，保持多行（与进入编辑后视觉一致）
  code.value = formatTokui(props.dsl);
}

// 把完整 DSL 切成随机大小的「Token」块（1-8 字符），模拟 LLM 逐 Token 输出
function splitRandomChunks(s: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < s.length) {
    const step = Math.floor(Math.random() * 8) + 1;
    chunks.push(s.slice(i, i + step));
    i += step;
  }
  return chunks;
}

// 停止流式：清定时器、收尾 endStream、释放实例、解锁高度
function stopStream() {
  if (streamTimer) { clearTimeout(streamTimer); streamTimer = null; }
  if (streamInst && typeof streamInst.endStream === 'function') {
    try { streamInst.endStream(); } catch (_) { /* ignore */ }
  }
  streamInst = null;
  streaming.value = false;
  unlockHeight();
}

// 锁住当前 body 高度，避免流式开始时内容清空导致塌陷
function lockHeight() {
  const el = body.value;
  if (el) el.style.minHeight = el.offsetHeight + 'px';
}
function unlockHeight() {
  const el = body.value;
  if (el) el.style.minHeight = '';
}

// 开始流式：重置预览 → startStream → 按随机块逐个 feed，左侧同步 append
function startStream() {
  if (!mount.value || !TokUICls.value) return;
  if (timer) { clearTimeout(timer); timer = null; }
  stopStream();        // 先清掉上一次状态（会解锁，无副作用）
  lockHeight();        // 内容还在，锁住当前高度，防清空后塌陷
  const target = mount.value;
  target.innerHTML = '';
  try {
    streamInst = new TokUICls.value({ container: target, theme: 'default' });
    streamInst.startStream(target);
  } catch (e: any) {
    target.innerHTML = '<div class="vp-playground-error">⚠ ' + (e && e.message ? e.message : String(e)) + '</div>';
    return;
  }
  streamedCode.value = '';
  streaming.value = true;
  const chunks = splitRandomChunks(code.value);
  let idx = 0;
  const tick = () => {
    if (idx >= chunks.length) {
      streaming.value = false;
      try { streamInst && streamInst.endStream && streamInst.endStream(); } catch (_) { /* ignore */ }
      streamInst = null;
      streamTimer = null;
      unlockHeight(); // 自然结束，解锁高度
      return;
    }
    streamedCode.value += chunks[idx];
    try { streamInst && streamInst.feed(chunks[idx]); } catch (_) { /* ignore */ }
    idx++;
    // 左侧代码框滚到底，跟随输出
    nextTick(() => {
      const el = codeBox.value;
      if (el) el.scrollTop = el.scrollHeight;
    });
    streamTimer = setTimeout(tick, 12 + Math.random() * 28); // ~12-40ms/块
  };
  streamTimer = setTimeout(tick, 200);
}

// textarea 滚动同步高亮层（两者重叠，滚动位置需一致，否则高亮与文字错位）
function onTaScroll() {
  const a = ta.value, b = hl.value;
  if (a && b) { b.scrollTop = a.scrollTop; b.scrollLeft = a.scrollLeft; }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(code.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch (_) { /* ignore */ }
}

function toggleEdit() {
  if (!editing.value) {
    // 进入编辑：格式化为多行（缩进 + 换行），与高亮预览一致；formatTokui 幂等，重复安全
    code.value = formatTokui(code.value);
  }
  editing.value = !editing.value;
  if (!editing.value) nextTick(render); // 退出编辑立即重渲染
}

function openFs() {
  fsOpen.value = true;
  fsMode.value = 'preview';
  savedBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  nextTick(renderFs);
}
function closeFs() {
  fsOpen.value = false;
  document.body.style.overflow = savedBodyOverflow;
}
function setFsMode(m: 'preview' | 'code') {
  fsMode.value = m;
  if (m === 'preview') nextTick(renderFs);
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && fsOpen.value) closeFs();
}

onMounted(() => {
  loadTokUI();
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (flashTimer) clearTimeout(flashTimer);
  stopStream();
  window.removeEventListener('keydown', onKey);
  if (fsOpen.value) document.body.style.overflow = savedBodyOverflow;
});
watch(code, () => { if (editing.value) nextTick(schedule); });
</script>

<template>
  <div class="vp-playground">
    <div ref="body" class="vp-playground-body">
      <!-- 编辑态：高亮 pre + 透明 textarea 叠加（可编辑 + 着色 + 多行格式化） -->
      <div v-if="editing" class="vp-playground-editor">
        <!-- 高亮层：与 code 实时同步，复用 .tok-* 配色；pointer-events:none 让点击穿透到 textarea -->
        <pre ref="hl" class="vp-playground-hl" aria-hidden="true" v-html="highlighted" />
        <!-- 输入层：文字透明、caret 可见；字体/行高/padding 与 .vp-playground-hl 严格一致以保证对齐 -->
        <textarea
          ref="ta"
          v-model="code"
          class="vp-playground-code"
          spellcheck="false"
          autocomplete="off"
          wrap="off"
          @scroll="onTaScroll"
          :aria-label="t('DSL 编辑器', 'DSL editor')"
        />
      </div>
      <!-- 默认态：逐行高亮只读代码（hover / 点击交互；流式时显示已到达片段） -->
      <div v-else ref="codeBox" class="vp-playground-readonly" :class="{ 'is-streaming': streaming }">
        <div class="vp-code-rows">
          <div
            v-for="(ln, i) in codeLines"
            :key="i"
            class="vp-code-row"
            :class="{ 'is-active': activeLine === i }"
            @click="onLineClick(i)"
            :title="t('点击选中并在预览中定位', 'Click to select & locate in preview')"
          >
            <span class="vp-code-ln">{{ i + 1 }}</span>
            <span class="vp-code-src" v-html="ln || ' '" />
          </div>
        </div>
      </div>

      <div class="vp-playground-preview-wrap">
        <div ref="mount" class="vp-playground-preview" />
        <div v-if="!ready" class="vp-playground-loading">
          {{ t('加载 TokUI…', 'Loading TokUI…') }}
        </div>
      </div>
    </div>
    <div class="vp-playground-bar">
      <button class="vp-playground-btn" type="button" @click="copyCode">
        <span v-if="copied">✓ {{ t('已复制', 'Copied') }}</span>
        <span v-else>⧉ {{ t('复制', 'Copy') }}</span>
      </button>
      <button class="vp-playground-btn" type="button" @click="openFs">
        ⛶ {{ t('全屏', 'Fullscreen') }}
      </button>
      <button class="vp-playground-btn" type="button" :class="{ 'is-active': streaming }" @click="streaming ? stopStream() : startStream()">
        {{ streaming ? `⏹ ${t('停止', 'Stop')}` : `⚡ ${t('流式', 'Stream')}` }}
      </button>
      <button v-if="editable" class="vp-playground-btn" type="button" @click="toggleEdit">
        {{ editing ? `👁 ${t('预览代码', 'View Code')}` : `✎ ${t('编辑', 'Edit')}` }}
      </button>
      <button v-if="editing" class="vp-playground-btn" type="button" @click="reset">
        ↺ {{ t('重置', 'Reset') }}
      </button>
      <span class="vp-playground-hint">
        {{ streaming
          ? t('流式渲染中 · 逐 Token 输出', 'Streaming · token by token')
          : editing
            ? t('编辑 DSL，右侧实时预览', 'Edit DSL, preview live')
            : t('TokUI DSL · 左代码右渲染', 'TokUI DSL · code ↔ render') }}
      </span>
    </div>

    <!-- 全屏弹层：放大查看预览 / 代码 -->
    <teleport v-if="fsOpen" to="body">
      <div class="vp-playground-fs" role="dialog" aria-modal="true" @click.self="closeFs">
        <div class="vp-playground-fs-panel">
          <div class="vp-playground-fs-bar">
            <div class="vp-playground-fs-tabs">
              <button type="button" :class="{ active: fsMode === 'preview' }" @click="setFsMode('preview')">
                {{ t('预览', 'Preview') }}
              </button>
              <button type="button" :class="{ active: fsMode === 'code' }" @click="setFsMode('code')">
                {{ t('代码', 'Code') }}
              </button>
            </div>
            <div class="vp-playground-fs-actions">
              <button class="vp-playground-btn" type="button" @click="copyCode">
                <span v-if="copied">✓ {{ t('已复制', 'Copied') }}</span>
                <span v-else>⧉ {{ t('复制', 'Copy') }}</span>
              </button>
              <button class="vp-playground-btn" type="button" @click="closeFs">
                ✕ {{ t('关闭', 'Close') }}
              </button>
            </div>
          </div>
          <div class="vp-playground-fs-body">
            <div v-show="fsMode === 'preview'" ref="fsMount" class="vp-playground-fs-preview" />
            <div v-show="fsMode === 'code'" class="vp-playground-fs-code">
              <div class="vp-code-rows vp-code-rows--fs">
                <div
                  v-for="(ln, i) in codeLines"
                  :key="i"
                  class="vp-code-row"
                  :class="{ 'is-active': activeLine === i }"
                  @click="onLineClick(i)"
                >
                  <span class="vp-code-ln">{{ i + 1 }}</span>
                  <span class="vp-code-src" v-html="ln || ' '" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
