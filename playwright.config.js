// Playwright e2e 配置：demo 交互回路冒烟（真实浏览器，抓 dom-mock 与真实 DOM 的行为差异）
// 本地跑：npm run test:e2e（自动起 demo SSE 服务器 :3109，跑完自动停）
// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  retries: 0,
  workers: 1, // demo 服务器端口独占，串行
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3109',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'node demo/server/sse-server.js',
    url: 'http://localhost:3109',
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
