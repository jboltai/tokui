/**
 * Phase 4 新组件 e2e 冒烟（真实 Chromium）
 * 覆盖单测 mock 盲区：tour 自动开启与切步、modal.confirm Promise 回路、
 * segmented change 上报、color-picker 预设换色、anchor 点击上报、
 * preview-group 灯箱组、affix 滚动固定。
 */
const { test, expect } = require('@playwright/test');

// 触发左侧导航案例（JS 点击绕开折叠分类的指针拦截）
// demo 页有全局发送锁（sending 时 sendPrompt 静默丢弃），点击前必须等上一流结束：
// demo.js 把发送状态镜像到 body[data-sending]，据此精确等待（替代固定 sleep）。
async function openDemo(page, zhName) {
  await page.waitForFunction(() => document.body.dataset.sending !== '1', null, { timeout: 20000 });
  await page.evaluate((name) => {
    const el = Array.from(document.querySelectorAll('.nav-item-name'))
      .find(e => e.textContent.trim() === name);
    if (!el) throw new Error('nav item ' + name + ' not found');
    (el.closest('.nav-item') || el.parentElement).click();
  }, zhName);
}

test('Phase 4 新组件全链路冒烟', async ({ page }) => {
  test.setTimeout(90000); // 7 案例串行 + openDemo 各 2.2s 流间隔
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');

  // --- segmented：点第三项（初始选中第二项 grid）→ change 上报 {value:"table"} ---
  await openDemo(page, 'Segmented 分段控制器');
  const seg = page.locator('.tokui-segmented').first();
  await expect(seg).toBeVisible({ timeout: 15000 });
  await seg.locator('.tokui-segmented__item', { hasText: '表格' }).click();
  await expect(page.locator('.msg--system').last()).toContainText('"value": "table"');
  // 容器模式：图标选项点击上报；禁用项点击无新消息
  const iconSeg = page.locator('.tokui-segmented').nth(1);
  await iconSeg.locator('.tokui-segmented__item', { hasText: '图表' }).click();
  await expect(page.locator('.msg--system').last()).toContainText('"value": "chart"');
  const msgCount = await page.locator('.msg--system').count();
  await page.locator('.tokui-segmented__item--disabled', { hasText: '管理员' }).click({ force: true });
  await page.waitForTimeout(400);
  expect(await page.locator('.msg--system').count()).toBe(msgCount);

  // --- color-picker：开面板（portal 到 body 防裁切）→ 点预设 → 换色 + change 上报 ---
  await openDemo(page, 'ColorPicker 颜色选择');
  const cp = page.locator('.tokui-color-picker').first();
  // 等流收尾（末 chunk 的提交钮）：流式期每 chunk scrollToBottom 会触发组件的滚动关面板约定
  await expect(page.locator('button', { hasText: '提交主题' })).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(300);
  await expect(cp).toBeVisible();
  await cp.locator('.tokui-color-picker__trigger').click();
  // 面板开启后 portal 到 body 直下（fixed，不被卡片裁切）
  const cpPanel = page.locator('body > .tokui-color-picker__panel');
  await expect(cpPanel).toBeVisible();
  // JS 点击：与组件真实交互路径等价（面板现为滚动重定位，指针点击亦可，JS 点击更稳）
  await page.evaluate(() => {
    document.querySelector('body > .tokui-color-picker__panel .tokui-color-picker__preset').click();
  });
  await expect(cp.locator('.tokui-color-picker__hex')).toHaveText('#f5222d');
  await expect(page.locator('.msg--system').last()).toContainText('"value": "#f5222d"');
  // upd 程序化改色（id:cp1）
  await page.locator('button', { hasText: '改成品牌绿' }).click();
  await expect(page.locator('#cp1 .tokui-color-picker__hex')).toHaveText('#52c41a');
  // 表单提交收集色值
  await page.locator('button', { hasText: '提交主题' }).click();
  await expect(page.locator('.msg--system').last()).toContainText('"primary": "#1677ff"');

  // --- anchor：层级锚点点击 → 激活 + change 上报；横向模式渲染 ---
  await openDemo(page, 'Anchor 锚点导航');
  const anchor = page.locator('.tokui-anchor').first();
  await expect(anchor).toBeVisible({ timeout: 15000 });
  // 层级子项存在（d:1 缩进）
  await expect(anchor.locator('.tokui-anchor__item--depth-1').first()).toBeVisible();
  await anchor.locator('.tokui-anchor__item', { hasText: '第三章 流式渲染' }).click();
  await expect(anchor.locator('.tokui-anchor__item--active')).toHaveText('第三章 流式渲染');
  await expect(page.locator('.msg--system').last()).toContainText('"value": "ch3"');
  // 横向模式：第二组 anchor 带 horizontal 类
  await expect(page.locator('.tokui-anchor--horizontal')).toBeVisible();

  // --- affix：滚动消息容器越过偏移 → 固定；滚回 → 释放 ---
  await openDemo(page, 'Affix 固钉');
  const affix = page.locator('.tokui-affix').first(); // 固顶组（另有固底/嵌套两组）
  await expect(affix).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => document.body.dataset.sending !== '1', null, { timeout: 20000 });
  await page.evaluate(() => { const sc = document.querySelector('.app-messages'); sc.scrollTop = sc.scrollHeight; });
  await expect(affix).toHaveClass(/tokui-affix--fixed/);
  await page.evaluate(() => { document.querySelector('.app-messages').scrollTop = 0; });
  await expect(affix).not.toHaveClass(/tokui-affix--fixed/);

  // --- tour：open 属性 → 流闭后自动开启；切步；完成关层 ---
  await openDemo(page, 'Tour 漫游式引导');
  const tourLayer = page.locator('.tokui-tour__layer');
  await expect(tourLayer).toBeVisible({ timeout: 15000 });
  await expect(tourLayer.locator('.tokui-tour__counter')).toHaveText('1 / 3');
  await tourLayer.locator('.tokui-tour__next').click();
  await expect(tourLayer.locator('.tokui-tour__counter')).toHaveText('2 / 3');
  await tourLayer.locator('.tokui-tour__next').click();
  await tourLayer.locator('.tokui-tour__next').click(); // 末步 → 完成关层
  await expect(tourLayer).toHaveCount(0);

  // --- modal.confirm：点删除钮 → 弹层 → 确认 → 系统消息回显 ---
  await openDemo(page, 'Modal 确认框');
  await page.locator('button', { hasText: '删除文件' }).click();
  const modal = page.locator('.tokui-modal__overlay');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.tokui-modal__ok')).toHaveText('删除');
  await modal.locator('.tokui-modal__ok').click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.msg--system').last()).toContainText('确认');

  // --- preview-group：点第二图 → 灯箱带计数 2/3 ---
  await openDemo(page, '图片预览组');
  const pg = page.locator('.tokui-preview-group');
  await expect(pg).toBeVisible({ timeout: 15000 });
  await pg.locator('.tokui-img').nth(1).click();
  const lb = page.locator('.tokui-lightbox');
  await expect(lb).toBeVisible();
  await expect(lb.locator('.tokui-lightbox__counter')).toHaveText('2/3');
  await page.keyboard.press('Escape');

  // 全程无未捕获异常
  expect(errors).toEqual([]);
});
