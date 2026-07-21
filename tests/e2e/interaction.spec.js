/**
 * 交互回路 e2e 冒烟（demo-interaction 案例，真实 Chromium）
 * 覆盖 Phase 1 全部交互路径：HITL 审批 / tabs·input·switch 事件上报 /
 * ins·del 动态增删 / chat-input 停止生成 / dialog close 上报。
 * 价值定位：dom-mock 单测覆盖逻辑，本用例覆盖 mock 与真实 DOM 的行为差异
 *（如 NodeList 无 indexOf 这类 mock 盲区）。
 */
const { test, expect } = require('@playwright/test');

test('demo-interaction 交互回路全链路', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');

  // 左侧导航触发「交互回路」案例（SSE 流式渲染，内含 _wait 延迟演示 del/ins）。
  // 用 JS 点击：分类头悬浮层会拦截 Playwright 的指针点击（collapsed 分类内项不可见点击点）
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.nav-item-name'))
      .find(e => e.textContent.trim() === '交互回路');
    if (!el) throw new Error('nav item 交互回路 not found');
    (el.closest('.nav-item') || el.parentElement).click();
  });

  // 等待流结束：卡片 B 已被 del 删除（DSL 内置 1.5s+1.5s+2.5s 延迟序列）
  await expect(page.locator('#ia-card-b')).toHaveCount(0, { timeout: 20000 });

  // --- ins/del 动态增删：callout 精确落在卡片 A 之后，锚点无残留 ---
  const callout = page.locator('.tokui-callout');
  await expect(callout).toHaveCount(1);
  const insAfterA = await page.evaluate(() => {
    const a = document.querySelector('#ia-card-a');
    return !!(a && a.nextSibling === document.querySelector('.tokui-callout'));
  });
  expect(insAfterA).toBe(true);
  await expect(page.locator('.tokui-ins-anchor')).toHaveCount(0);

  // --- HITL 审批：批准按钮 → 回显 + 按钮禁用 ---
  const approveBtn = page.locator('.tokui-tool-call__approve');
  await expect(approveBtn).toBeVisible();
  await approveBtn.click();
  await expect(approveBtn).toBeDisabled();
  await expect(page.locator('.msg--system').last()).toContainText('"approved": true');

  // --- tabs 用户切页上报 {index, title} ---
  await page.locator('.tokui-tabs-label', { hasText: '详情' }).click();
  await expect(page.locator('.msg--system').last()).toContainText('"index": 1');

  // --- input 防抖 change 上报 {value, name} ---
  await page.locator('input[name="city"]').fill('上海');
  await page.waitForTimeout(500); // 300ms 防抖 + 余量
  await expect(page.locator('.msg--system').last()).toContainText('"value": "上海"');

  // --- switch change 上报布尔值 ---
  await page.locator('.tokui-switch').first().click();
  await expect(page.locator('.msg--system').last()).toContainText('"value": true');

  // --- chat-input streaming：停止钮可见/发送钮隐藏，点击上报 stop ---
  const stopBtn = page.locator('.tokui-chat-input__stop');
  await expect(stopBtn).toBeVisible();
  await expect(page.locator('.tokui-chat-input__send')).toBeHidden();
  await stopBtn.click();
  await expect(page.locator('.msg--system').last()).toContainText('停止生成');

  // --- dialog：打开 → × 关闭 → close 事件上报 ---
  await page.locator('button', { hasText: '打开弹窗' }).click();
  const dlg = page.locator('#dlg');
  await expect(dlg).toBeVisible();
  await dlg.locator('.tokui-dialog-close').click();
  await expect(page.locator('.msg--system').last()).toContainText('Dialog 关闭');

  // 全程无未捕获异常
  expect(errors).toEqual([]);
});
