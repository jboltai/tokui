<script setup lang="ts">
// 静态 Demo：只渲染不可编辑。用于文档内联「成品展示」。
import { ref, onMounted, shallowRef } from 'vue';
import { registerDemoHandlers } from '../utils/handlers';

const props = defineProps({
  dsl: { type: String, required: true },
});

const mount = ref<HTMLElement | null>(null);
const TokUICls = shallowRef<any>(null);
const failed = ref('');

onMounted(async () => {
  await import('@tokui-umd');
  const ns = (window as any).TokUI;
  TokUICls.value = ns && ns.TokUI;
  if (ns && typeof ns.registerHandler === 'function') {
    registerDemoHandlers(ns.registerHandler.bind(ns));
  }
  if (!mount.value || !TokUICls.value) return;
  try {
    const inst = new TokUICls.value({ container: mount.value, theme: 'default' });
    inst.render(props.dsl, mount.value);
  } catch (e: any) {
    failed.value = e && e.message ? e.message : String(e);
  }
});
</script>

<template>
  <div class="vp-demo">
    <div ref="mount" class="vp-demo-mount" />
    <div v-if="failed" class="vp-playground-error">⚠ {{ failed }}</div>
  </div>
</template>
