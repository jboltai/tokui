# Theming

All TokUI styles are driven by **CSS variables** — switching themes is one attribute.

## CSS variables + data-tokui-theme

Built-in themes: `default` (light) and `dark`. Set `data-tokui-theme`:

```js
TokUI.setTheme('dark');
```

```html
<body data-tokui-theme="dark">
  <div id="app"></div>
</body>
```

## Preview

<Playground dsl='[card tt:Theme preview][p v:muted Muted text][btn tx:Primary v:primary][btn tx:Success v:success][btn tx:Danger v:danger][callout t:info tt:Tip]Theming is all CSS variables[/callout][/card]' />

## Palette generator

Built-in HSB 10-step palette generator — derive a full ramp from any base color:

```js
const { generatePalette, generateThemeTokens } = require('./src/core/color-generator');

const palette = generatePalette('#1677ff', { dark: false });

const tokens = generateThemeTokens({
  primary: '#1677ff',
  danger: '#ff4d4f',
  success: '#52c41a',
  warning: '#faad14',
});
// → { '--tokui-primary-1' ... '--tokui-primary-10' } CSS variables
```

Inject the tokens into `:root` or `[data-tokui-theme="brand"]` to ship a custom brand theme.

## Variants & themes

`v:primary` → class `tokui-btn--primary` references `--tokui-primary-*`. So **changing the theme = changing variable values** — all variant colors follow automatically, no component edits needed.

See [`core/color-generator.js`](https://github.com/jboltai/tokui/blob/master/src/core/color-generator.js) and `src/styles/themes/`.
