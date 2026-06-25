/**
 * TokUI 类型测试（type-level）— 仅由 `tsc` 检查，不参与运行时测试。
 *
 * 策略：
 *   - 正向：按公共 API 正确使用，应零错误编译。
 *   - 反向：`@ts-expect-error` 断言错误用法确实被类型系统拒绝，
 *           防止 .d.ts 写得过宽（如全 any）使校验形同虚设。
 */
import TokUIDefault, {
  TokUI,
  registerHandler,
  removeHandler,
  setTheme,
  getTheme,
  el,
} from '@jboltai/tokui';
import { TokUIBuilder } from '@jboltai/tokui/builder';

// ============ 正向：TokUI 类 ============
const ui = new TokUI({
  container: '#app',
  theme: 'dark',
  streaming: true,
  onEvent: (name, data) => {
    // name: string, data: any
    const n: string = name;
    return n;
  },
});

ui.render('[h1 Hi]');
ui.render('[h1 Hi]', document.createElement('div'));
ui.startStream();
ui.startStream(document.body);
ui.feed('[p chunk]');
ui.endStream();
ui.disconnect();
const p: Promise<void> = ui.connect('/api/chat/stream', { prompt: 'hi' });

// container 选择器或元素都接受
new TokUI({ container: document.getElementById('x') });
new TokUI({}); // 全可选

// ============ 命名导出 ============
registerHandler('cb', (data, event, element) => {
  const e: Event = event;
  const el2: HTMLElement = element;
  return { e, el2, data };
});
removeHandler('cb');

setTheme('dark');
const theme: string = getTheme();

const div: HTMLElement = el('div', { class: 'x', id: 'y' }, 'text');
el('span'); // attrs/textContent 可选

// ============ default 命名空间 ============
const NS: typeof TokUIDefault = TokUIDefault;
const TokUICls: typeof NS.TokUI = NS.TokUI;
const ui2 = new NS.TokUI({ container: '#app' });
NS.registerHandler('x', () => {});
NS.removeHandler('x');
NS.setTheme('default');
const t2: string = NS.getTheme();
const span: HTMLElement = NS.el('span');

// ============ Builder（tokui/builder 子路径）============
const b = new TokUIBuilder();
b.card({ tt: '标题' }).h2('内容').p('描述').end();
b.toString();
b.toChunks();
b.reset();
b.endAll();
// 底层原语（任意组件的强类型逃逸口）
b._open('drawer', { tt: '抽屉' });
b._selfClosing('gantt', null, { data: [[1, 2]] });
b._finalizeChunks();
// 自闭合叶子 / 容器
b.btn({ v: 'primary' });
b.input({ ph: '占位' });
b.table({ stripe: true });
b.theadCols(['a', 'b']);

// ============ 反向：错误用法必须被拒绝 ============
// @ts-expect-error render 只接受 string
ui.render(123);

// @ts-expect-error handler 必须是函数
registerHandler('cb', 'not a function');

// @ts-expect-error container 不接受 number
new TokUI({ container: 123 });

// @ts-expect-error theme 必须是 string
setTheme(42);

// @ts-expect-error el 第一个参数必须 string
el(123);

// @ts-expect-error startStreem 拼错，无此方法
ui.startStreem();

// @ts-expect-error connect 返回 Promise<void>，不是 string
const bad: string = ui.connect('/api');

// @ts-expect-error builder 未列出方法不在类型上（用 _selfClosing/_open 兜底）
b.nonExistentDslMethod({});

// @ts-expect-error toString 返回 string，不是 number
const badNum: number = b.toString();
