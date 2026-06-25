# 贡献指南

感谢你对 TokUI 的兴趣！这是一个零依赖的流式 UI 描述与渲染框架，任何贡献都欢迎：新组件、Bug 修复、文档、主题、框架适配器、多语言 Builder SDK。

## 开发环境

```bash
git clone https://github.com/jboltai/tokui.git
cd tokui
pnpm install          # 装依赖并链接 workspace 适配器
npm run build         # 构建核心库 → dist/（demo 与适配器引用构建产物）
npm test              # 全量测试（24 文件 / 866+ 用例）
```

三终端开发（边改边看）：

```bash
# 终端 A：库 watch 重建
npm run dev:lib
# 终端 B：demo 静态服务（5173，/api 代理到 3109）
npm run dev
# 终端 C：SSE 演示服务器（可选）
npm run server
```

## 提交前检查清单

每个 PR 必须通过：

```bash
npm run typecheck     # tsc 类型检查（含反向 @ts-expect-error 断言）
npm run test:all      # 全量测试
npm run build         # 构建无错
```

新增组件必须附带 `tests/test-*.js` 测试。

## 新增一个组件（四步）

1. **注册渲染函数**（`src/components/*.js`）：

   ```js
   renderer.register('mycard', (node, rc, parentType) => {
     const el = renderer.el('div', { class: 'tokui-mycard' });
     el.textContent = node.attrs.tt || '';      // 用 textContent，不要 innerHTML（防 XSS）
     rc(node.children, el);
     return el;
   });
   ```

2. **若为容器类型**，加入 `src/core/parser.js` 的 `CONTAINERS` Set；内容含 `[` 不应被解析（如代码），同时加入 `_isRawContent()` 列表。

3. **加 Builder 方法**（`src/server/tokui-builder.js`）：自闭合 `_selfClosing()`，容器 `_open()` / `end()`。

4. **加样式**（`src/styles/tokui.css`）：`.tokui-mycard`；变体 `.tokui-mycard--{variant}` 并加入 `renderer.js` 的 `VARIANTS` 白名单。

详见 [`README.md` 的「扩展组件」](./README.md#扩展组件) 与 [`CLAUDE.md`](./CLAUDE.md)。

## 代码规范

- **零运行时依赖** —— 前后端均用原生 API，禁止引入 npm 包（devDependency 除外）。
- **UMD 双模式** —— 每个模块文件末尾同时导出 `window.TokUI._internal`（浏览器）和 `module.exports`（Node）。
- **严格模式** —— 每个文件顶部 `'use strict';`。
- **2 空格缩进，单引号**。
- **CSS 命名空间** —— `.tokui-` 前缀，CSS 变量 `--tokui-` 前缀。
- **注释** —— 中英双语，API 说明用中文。
- **安全** —— `innerHTML` 仅限 `md` 与可信代码块；其余一律 `textContent`。事件处理器为命名引用，禁止注入可执行代码。

## 提交信息格式

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<可选正文>

type: feat / fix / docs / style / refactor / test / chore / perf
scope: parser / renderer / builder / chart / table / form / layout / basic / docs / pkg ...
```

例：`feat(chart): 新增 funnel 漏斗图组件`、`fix(parser): 修复嵌套容器自闭合逃逸`。

## 测试

基于 Node.js 内置 `assert` 的自定义 runner，零测试框架依赖。在对应 `tests/test-*.js` 末尾追加：

```js
test('mycard 渲染标题', () => {
  const rc = makeRenderer();
  const dom = rc.render({ type: 'mycard', attrs: { tt: '标题' }, children: [] });
  assert.ok(dom.className.indexOf('tokui-mycard') !== -1);
});
```

renderer 测试依赖 `tests/helpers/dom-mock.js`。注意该 mock 的 `textContent` 是 DOM 忠实的（聚合后代文本），断言时按真实 DOM 行为写。

## 框架适配器

适配器位于 `packages/<framework>/`，peer-depend 对应框架。新增适配器请遵循现有 react/vue/svelte/webc 的结构：`package.json`（`type: module` + `exports` + peerDep）+ `src/index.js` + `src/index.d.ts` + `README.md`。

## 行为准则

参与本项目即代表你同意遵守 [Code of Conduct](./CODE_OF_CONDUCT.md)。请友善、尊重。
