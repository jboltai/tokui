import { defineConfig } from 'vite';

// 单配置 + mode 切换（跨平台，优于 env var）：
//   vite build --mode lib  → 产出 dist/ 库（UMD + ESM + 单 CSS）
//   vite / vite dev        → 静态服务 demo/ 并把 /api 代理到 sse-server (3109)
export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    return {
      publicDir: false,
      build: {
        lib: {
          entry: 'src/lib.js',
          name: 'TokUI',                      // UMD → window.TokUI = 命名空间对象
          formats: ['es', 'umd', 'cjs'],
          fileName: (f) =>
            // 用 .mjs/.cjs 扩展名显式声明模块类型，消除 Node 的 MODULE_TYPELESS 警告；
            // UMD 保留 .js（CDN <script> 与 CJS require 兼容，本就不警告）。
            f === 'es' ? 'tokui.mjs'
            : f === 'cjs' ? 'tokui.cjs'
            : 'tokui.umd.js',
        },
        cssCodeSplit: false,                  // 全部 CSS 合一
        sourcemap: true,                      // 产物带 .map，线上 stack 可溯源
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          output: {
            assetFileNames: 'tokui.css',      // 去 hash，demo 可固定路径引用
            exports: 'named',                 // 具名+default，消 MIXED_EXPORTS 警告，UMD 命名空间含全部具名导出
          },
          external: [],                       // 完全自包含，零运行时依赖
        },
      },
    };
  }

  // dev / 默认：静态服务仓库根，demo 走 /demo/*.html，/api 代理到 SSE 后端
  return {
    root: '.',
    server: {
      port: 5173,
      open: '/demo/index.html',
      proxy: {
        '/api': {
          target: 'http://localhost:3109',
          changeOrigin: true,
        },
      },
    },
  };
});
