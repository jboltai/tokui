# Builder API（服务端）

`TokUIBuilder` 提供链式调用生成 DSL 字符串，供后端（Node.js）使用。源码：`src/server/tokui-builder.js`。

## 基本用法

```js
const TokUIBuilder = require('./src/server/tokui-builder');
const b = new TokUIBuilder();

b.card({ tt: '用户信息' })
  .h2('张三')
  .p('一名前端工程师')
  .end();

console.log(b.toString());
// [card tt:用户信息][h2 张三][p 一名前端工程师][/card]
```

## 两种输出

| 方法 | 用途 |
|------|------|
| `toString()` | 一次性输出完整 DSL 字符串 |
| `toChunks()` | 输出分块数组，配合 SSE 逐块推送 |

```js
// 流式：重置后生成分块
const chunks = b.reset().card({ tt: '卡片' }).p('内容').end().toChunks();
// → ['[card tt:卡片]', '[p 内容]', '[/card]']
```

## 自动闭合

`toString()` / `toChunks()` 内部调用 `_finalizeChunks()`，**未关闭的容器会自动补全**，无需手动 `endAll()`。

## 表单动作与打印

按钮的内置动作直接作为 `btn()` 的属性透传，无需额外方法：

```js
b.btn({ tx: '提交', form: 'loginForm', sub: 'onLogin', v: 'primary' })  // → [btn ... form:loginForm sub:onLogin v:primary]
b.btn({ tx: '重置', form: 'loginForm', reset: true })                   // → [btn ... form:loginForm reset]
b.btn({ tx: '打印', print: 'invoice' })                                 // → [btn ... print:invoice]
```

打印区是容器，用 `printArea()`：

```js
b.printArea({ id: 'invoice', tt: '收款单' })
  .stat({ tt: '应付金额', v: '12800', pre: '¥ ', trend: 'up' })
  .end()
// → [print-area id:invoice tt:收款单][stat ...][/print-area]
```

详见[表单组件 · 表单动作 / 打印区](/components/form)。

## 双行为方法

下列方法根据参数自动选择自闭合或容器模式：

- `thead()` / `inputTag()` / `quickReply()` / `agent()`

## 命名避让

布局的栅格行/列用 `row_layout()` / `col_layout()`，以避让表格的 `row()`。

## 内部约定

- **自闭合标签**用 `_selfClosing(type, attrs)`：如 `b.btn({ tx: '确定', v: 'primary' })`。
- **容器**用 `_open(type, attrs)` 开标签 + `end()` 闭标签：如 `b.card({}).p('x').end()`。
- `reset()` 清空状态，复用同一实例。

## 完整示例

```js
const b = new TokUIBuilder();
b.card({ tt: '登录' })
  .input({ l: '用户名', ph: '请输入', req: true })
  .pwd({ l: '密码', ph: '请输入', req: true })
  .ft()
    .btn({ tx: '登录', v: 'primary', sub: 'login' })
    .btn({ tx: '取消', v: 'ghost' })
  .end()
  .end();

// 直接喂给前端渲染
const dsl = b.toString();
```

上面 Builder 生成的 DSL 渲染效果：

<Playground dsl='[card tt:登录][input l:用户名 ph:请输入 req][pwd l:密码 ph:请输入 req][ft][btn tx:登录 v:primary sub:login][btn tx:取消 v:ghost][/ft][/card]' />
