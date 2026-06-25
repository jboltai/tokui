# @jboltai/tokui-webc

> TokUI 的 Web Component 适配器 —— 一个框架无关的 `<tokui-view>` 自定义元素。

装一次，**任何框架**都能用：React / Vue / Svelte / Angular / 原生 HTML / 无框架。

## 安装

```bash
npm install @jboltai/tokui-webc
```

## 用法

```js
import defineTokuiElement from '@jboltai/tokui-webc';
defineTokuiElement(); // 注册 <tokui-view>
```

然后任意 HTML / JSX / template：

```html
<tokui-view dsl="[card tt:你好][p 流式 UI，零依赖][/card]"></tokui-view>
```

属性：
- `dsl` —— 一次性渲染整段 DSL
- `theme` —— 切换主题（如 `dark`）

命令式 API（流式 / SSE）：

```js
const view = document.querySelector('tokui-view');
view.startStream();
view.feed('[card tt:');
view.feed('流式卡片]');
view.endStream();

// SSE
view.connect('/api/chat', { prompt: '画一个登录卡片' });
```

## CSS

`@jboltai/tokui` 的样式随包自动注入（通过 `import` 副作用），无需手动引入。如需显式引入：

```js
import '@jboltai/tokui/css';
```

License: MIT
