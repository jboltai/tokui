// 文档 Playground / Demo 共用的交互 handler 注册。
// TokUI 核心不含这些 handler（dialog/drawer 开关由调用方按 id 触发），
// 文档站补齐，让 clk:openDialog / clk:closeDialog 等示例可点。
// 约定（与 demo/tokui.html、prompt 易错规则 11 一致）：
//   触发按钮写 clk:openDialog data-target:"<dialog/drawer 的 id>"，
//   对应 dialog/drawer 带相同 id。

type HandlerFn = (data: any, event: any, element: HTMLElement) => void;

// 按 id 打开 dialog / drawer
function openOverlayById(id: string | null) {
  if (!id) return;
  const node = document.getElementById(id);
  if (!node) return;
  if (node.tagName === 'DIALOG' && typeof (node as any).showModal === 'function') {
    (node as HTMLDialogElement).showModal();
  } else if (typeof (node as any)._update === 'function') {
    (node as any)._update({ act: 'open' });
  } else if (node.classList && node.classList.contains('tokui-drawer')) {
    node.classList.add('tokui-drawer--open');
  }
}

// 按 id 打开 / 关闭命令面板（触发按钮 clk:openCommand data-target:"<command 的 id>"）
function openCommandById(id: string | null) {
  if (!id) return;
  const node = document.getElementById(id) as any;
  if (node && typeof node._openCommand === 'function') node._openCommand();
}
function closeCommandById(id: string | null) {
  if (!id) return;
  const node = document.getElementById(id) as any;
  if (node && typeof node._closeCommand === 'function') node._closeCommand();
}

// 关闭最近的 dialog / drawer（按钮在弹窗内时）
function closeEnclosingOverlay(el: HTMLElement | null) {
  if (!el || !el.closest) return;
  const dlg = el.closest('dialog.tokui-dialog') || el.closest('.tokui-drawer');
  if (!dlg) return;
  if (dlg.tagName === 'DIALOG' && typeof (dlg as HTMLDialogElement).close === 'function') {
    (dlg as HTMLDialogElement).close();
  } else if (typeof (dlg as any)._update === 'function') {
    (dlg as any)._update({ act: 'close' });
  } else if ((dlg as HTMLElement).classList) {
    (dlg as HTMLElement).classList.remove('tokui-drawer--open');
  }
}

export function registerDemoHandlers(registerHandler: (name: string, fn: HandlerFn) => void) {
  registerHandler('openDialog', (_d, _e, el) => {
    openOverlayById(el.getAttribute('data-target'));
  });
  registerHandler('openDialogById', (_d, _e, el) => {
    openOverlayById(el.getAttribute('data-target'));
  });
  registerHandler('closeDialog', (_d, _e, el) => {
    closeEnclosingOverlay(el);
  });
  // drawer 别名：与 openDialog/closeDialog 同逻辑（openOverlayById / closeEnclosingOverlay
  // 已兼容 dialog 与 drawer），单独注册让 clk:openDrawer / clk:closeDrawer 更直观。
  registerHandler('openDrawer', (_d, _e, el) => {
    openOverlayById(el.getAttribute('data-target'));
  });
  registerHandler('closeDrawer', (_d, _e, el) => {
    closeEnclosingOverlay(el);
  });
  // 命令面板：clk:openCommand data-target:"<command id>" 打开（command 默认不再抢 Cmd+K）
  registerHandler('openCommand', (_d, _e, el) => {
    openCommandById(el.getAttribute('data-target'));
  });
  registerHandler('closeCommand', (_d, _e, el) => {
    closeCommandById(el.getAttribute('data-target'));
  });
}
