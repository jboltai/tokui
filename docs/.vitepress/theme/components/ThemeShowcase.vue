<script setup lang="ts">
// 主题切换演示器：风格族（default / modern）× 明暗（light / dark）两段开关，
// 组合出 4 套主题名（default / dark / modern / modern-dark），实时驱动内嵌
// Playground 的 theme，直观对比同一份 DSL 在不同主题下的渲染差异。
//
// 不直接 new TokUI —— 主题切换交给 Playground（它每个实例把 data-tokui-theme
// 写到各自的挂载容器上，互不影响），这里只负责产出 theme 名并下传。
import { ref, computed } from 'vue';
import { useData } from 'vitepress';
import Playground from './Playground.vue';

defineProps({
  dsl: { type: String, default: '' },
});

const { lang } = useData();
const isEn = computed(() => (lang.value || '').startsWith('en'));
const t = (zh: string, en: string) => (isEn.value ? en : zh);

// 风格族 + 明暗，组合出实际主题名
const family = ref<'default' | 'modern'>('default');
const mode = ref<'light' | 'dark'>('light');
const theme = computed(() => {
  if (family.value === 'modern') return mode.value === 'dark' ? 'modern-dark' : 'modern';
  return mode.value === 'dark' ? 'dark' : 'default';
});
</script>

<template>
  <div class="vp-theme-showcase">
    <div class="vp-theme-bar">
      <div class="vp-theme-seg" role="group" :aria-label="t('风格族', 'Style family')">
        <button type="button" :class="{ active: family === 'default' }" @click="family = 'default'">Default</button>
        <button type="button" :class="{ active: family === 'modern' }" @click="family = 'modern'">Modern</button>
      </div>
      <div class="vp-theme-seg" role="group" :aria-label="t('明暗模式', 'Light / dark')">
        <button type="button" :class="{ active: mode === 'light' }" @click="mode = 'light'">
          ☀ {{ t('浅色', 'Light') }}
        </button>
        <button type="button" :class="{ active: mode === 'dark' }" @click="mode = 'dark'">
          🌙 {{ t('深色', 'Dark') }}
        </button>
      </div>
      <code class="vp-theme-tag">data-tokui-theme="{{ theme }}"</code>
    </div>
    <Playground :dsl="dsl" :theme="theme" />
  </div>
</template>
