# 主题系统

TokUI 的样式全部由 **CSS 变量**驱动，切换主题只需改一个属性。

## CSS 变量 + data-tokui-theme

所有组件样式以 `--tokui-` 前缀的 CSS 变量为锚点。内置两套主题：

- `default.css` —— 浅色
- `dark.css` —— 深色

切换时设置 `data-tokui-theme` 属性：

```js
TokUI.setTheme('dark');   // 切换为暗色主题
```

```html
<body data-tokui-theme="dark">
  <div id="app"></div>
</body>
```

## 内置主题预览

<Playground dsl='[card tt:主题预览][p v:muted 这是一段弱化文本][btn tx:主按钮 v:primary][btn tx:成功 v:success][btn tx:危险 v:danger][callout t:info tt:提示]主题由 CSS 变量统一驱动[/callout][/card]' />

## 色阶生成器

内置基于 HSB 算法的 10 级色阶生成器，可从任意主色生成完整调色板：

```js
const { generatePalette, generateThemeTokens } = require('./src/core/color-generator');

// 从主色生成 10 级色板
const palette = generatePalette('#1677ff', { dark: false });

// 生成主题 CSS 变量映射
const tokens = generateThemeTokens({
  primary: '#1677ff',
  danger: '#ff4d4f',
  success: '#52c41a',
  warning: '#faad14',
});
// 输出 { '--tokui-primary-1' ... '--tokui-primary-10' } 共 10 级 CSS 变量
```

把生成的 token 注入 `:root` 或 `[data-tokui-theme="xxx"]` 即可定制品牌主题。

## 变体与主题的关系

`v:primary` 生成的类名 `tokui-btn--primary` 内部引用 `--tokui-primary-*` 变量。因此**换主题 = 换变量值**，所有变体颜色自动跟随，无需改组件代码。

详见 [`core/color-generator.js`](https://github.com/jboltai/tokui/blob/master/src/core/color-generator.js) 与 `src/styles/themes/`。
