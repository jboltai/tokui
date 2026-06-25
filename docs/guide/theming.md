# 主题系统

TokUI 的样式全部由 **CSS 变量**驱动：换主题 = 换变量值，所有组件颜色、圆角、阴影自动跟随，无需改一行组件代码。

## 内置主题

TokUI 内置 **4 套主题**，两两构成「风格族 × 明暗」的组合：

| 主题名 | 明暗 | 风格 | 激活选择器 |
|--------|------|------|-----------|
| `default` | 浅色 | 克制蓝（主色 `#1677ff`） | `:root` / `[data-tokui-theme="default"]` |
| `dark` | 深色 | `default` 的暗色对应 | `[data-tokui-theme="dark"]` |
| `modern` | 浅色 | Refined Neutral：冷灰中性 + 克制蓝 accent（`#3B6FF5`）+ Inter 字体 + 柔光分层 + 12px 表单圆角 | `[data-tokui-theme="modern"]` |
| `modern-dark` | 深色 | `modern` 的暗色对应：深灰 elevation + 凹陷表单 + 无边框按钮 | `[data-tokui-theme="modern-dark"]` |

`default` 写在 `:root`，是开箱即用的默认主题；`modern` 仅声明在 `[data-tokui-theme="modern"]` 作用域，与 `default` 互斥并存，切换即生效。

下面这份预览可以**实时切换风格族与明暗**，直接看同一份 DSL 在四套主题下的差异：

<ThemeShowcase dsl='[card tt:"主题预览"][row][col span:6][h4 组件与状态][p v:muted 弱化文本][btn tx:主按钮 v:primary][btn tx:成功 v:success][btn tx:危险 v:danger][callout t:info tt:提示]主题由 CSS 变量统一驱动[/callout][/col][col span:6][h4 变体与色阶][slider v:40][progress v:70 t:success][tag tx:默认][tag tx:标签 v:primary][tag tx:警告 t:warning][badge tx:8 t:danger][/col][/row][/card]' />

## 切换主题

切换主题就是设置容器上的 `data-tokui-theme` 属性。三种方式：

**1. 构造时指定**（推荐）

```js
import { TokUI } from '@jboltai/tokui';
import '@jboltai/tokui/css';

const ui = new TokUI({
  container: '#app',
  theme: 'modern',          // 'default' | 'dark' | 'modern' | 'modern-dark'
});
```

**2. 运行时切换**

```js
import { setTheme, getTheme } from '@jboltai/tokui';

setTheme('modern-dark');
getTheme();   // → 'modern-dark'
// 等价于：document.querySelector('#app').setAttribute('data-tokui-theme', 'modern-dark')
```

> 也可以直接在 HTML 上写死主题，不经过 JS：`<body data-tokui-theme="modern">`。

**3. 跟随系统明暗偏好**

配一段 `matchMedia` 监听，让主题随操作系统的深浅色自动切换：

```js
import { setTheme } from '@jboltai/tokui';

const mql = window.matchMedia('(prefers-color-scheme: dark)');
const apply = (e) => setTheme(e.matches ? 'dark' : 'default');
apply(mql);                       // 初始应用
mql.addEventListener('change', apply);   // 系统切换时跟随
```

把 `'dark' / 'default'` 换成 `'modern-dark' / 'modern'` 即可走 Modern 风格族。

## 三层令牌体系

每套主题都是三层结构，从底往上逐层语义化：

| 层 | 示例 | 作用 |
|----|------|------|
| **色板层** | `--tokui-primary-1` … `--tokui-primary-10` | 10 级色阶，`6` 通常是种子色本体 |
| **语义层** | `--tokui-primary`、`--tokui-danger-bg`、`--tokui-info-border` | 对外稳定的语义入口 |
| **组件层** | `--tokui-radius`、`--tokui-shadow-md`、`--tokui-control-radius` | 圆角 / 阴影 / 控件形态 |

组件样式只引用**语义层与组件层**，绝不直接绑色板某一档。因此换主题时，只要语义层映射到新色板，所有组件颜色自动正确。

## 运行时自定义色板

无需构建，运行时从一个种子色即时生成主题。`setSeedColor` 会用内置 HSB 算法生成 10 级色板，注入一个 `<style data-tokui-dynamic-palette>` 标签覆盖 `default` / `dark` 的色板变量：

```js
import { TokUI } from '@jboltai/tokui';

const ui = new TokUI({ container: '#app' });

// 把主色换成品牌绿，其余语义色可选
TokUI.setSeedColor('#00a878', {
  danger: '#e5484d',
  success: '#00a878',
  warning: '#f5a623',
});

ui.render('[btn tx:品牌主按钮 v:primary][callout t:success tt:成功]色板已即时生效[/callout]');
```

特点：

- 仅接受 `#rrggbb` 格式种子色，非法值静默忽略。
- 自动跟随当前明暗（`getTheme()` 为 `dark` 时生成暗色色板）。
- 覆盖目标是 `:root` / `[data-tokui-theme="default"]` / `[data-tokui-theme="dark"]`，**不影响 `modern` 系**。要让 Modern 也换色，请用下一节的构建期方案或新建主题文件。

## 色阶生成器（构建期离线生成）

`setSeedColor` 在运行时调用的就是内置 HSB 色阶算法。想在构建期离线生成 token 落到主题文件里（不依赖运行时注入），直接调用同一套生成器：

```js
// 仓库内 / 源码克隆使用（生成器源文件：src/core/color-generator.js）
const { generatePalette, generateThemeTokens } = require('./src/core/color-generator');

// 10 级色板（数组，索引 0 = level 1）
const light = generatePalette('#1677ff');                // 亮色
const dark  = generatePalette('#1677ff', { dark: true }); // 暗色（与深色背景混合）

// 一次性生成 4 类语义色的全部 CSS 变量
const tokens = generateThemeTokens({
  primary: '#1677ff',
  danger:  '#f5222d',
  success: '#52c41a',
  warning: '#faad14',
});
// → { '--tokui-primary-1': '#e6f4ff', ..., '--tokui-warning-10': '...' }
```

> 注意：`color-generator` 是内部模块，**不随 npm 包发布**（不在 `package.json` 的 `files` 内）。npm 消费者请用上面的运行时 `setSeedColor`；需要离线生成请克隆源码仓库。

把 `Object.entries(tokens)` 序列化进 `[data-tokui-theme="brand"] { ... }` 即得到一份自定义主题文件。

## 变体与主题

DSL 里写 `v:primary`，渲染器生成类名 `tokui-btn--primary`，其 CSS 内部引用 `--tokui-primary-*` 变量。所以：

> **换主题 = 换变量值**。`v:primary` / `v:success` / `v:danger` 等变体颜色自动跟随主题，组件代码零改动。

## 自定义主题

新建一份 CSS 文件，用 `[data-tokui-theme="你的主题名"]` 作用域声明变量，引入页面后用 `setTheme('你的主题名')` 或 `new TokUI({ theme: '你的主题名' })` 激活：

```css
/* my-brand.css */
[data-tokui-theme="brand"] {
  /* 一级色板（用 generateThemeTokens 生成，避免手写 40 个值） */
  --tokui-primary-1: #e6f4ff;
  /* ... --tokui-primary-10 ... */

  /* 二级语义变量 —— 必须在主题作用域内重定义 */
  --tokui-primary: var(--tokui-primary-6);
  --tokui-primary-bg: var(--tokui-primary-1);
  --tokui-info: var(--tokui-primary);
  --tokui-info-bg: var(--tokui-primary-1);
  --tokui-danger-bg: var(--tokui-danger-1);
  /* ... 其余 success / warning / callout / tag / code / chart 语义变量 ... */
}
```

```js
import '@jboltai/tokui/css';
import './my-brand.css';
import { TokUI } from '@jboltai/tokui';

new TokUI({ container: '#app', theme: 'brand' });
```

### ⚠️ 写新主题 / 组件的三个坑

1. **token 块禁写 `color-scheme`**
   Vite 8 的 Lightning CSS 检测到 `color-scheme: light/dark` 会把整个 `[data-tokui-theme="xxx"]` 变量块改写成 `light-dark()` 条件逻辑，导致变量不直接生效、主题整体失效。需要 `color-scheme` 时拆到**单独的规则**里写。

2. **二级语义变量必须在主题作用域内重定义**
   `default.css` 的 `:root` 定义了一批二级变量（`--tokui-callout-info-bg`、`--tokui-tag-*-bg`、`--tokui-code-bg`、`--tokui-chart-*` 等），它们的 `var()` 在 `:root` 求值后**锁定为 default 色板**。新主题容器若不覆盖，会继承到 default 的锁定值，而非新色板。所以必须像 `modern.css` / `modern-dark.css` 那样**完整重定义全部二级变量**，不能只定义一级色板。

3. **`--danger` 类与 `--error` 类名都要写**
   DSL 写 `t:danger` → 渲染器生成 `.tokui-X--danger` 类；但历史上部分组件只定义了 `.tokui-X--error`（callout / tag / badge / dot / progress / step 等）。新增带状态色的组件时，`--danger` 与 `--error` 两个类名都要写规则，否则 `t:danger` 会退化成默认色。

## 下一步

- [组件总览](/components/showcase) —— 在不同主题下看组件表现
- [快速开始](./getting-started) —— 引入与渲染方式
- 源码：[`core/theme.js`](https://github.com/jboltai/tokui/blob/master/src/core/theme.js) · [`core/color-generator.js`](https://github.com/jboltai/tokui/blob/master/src/core/color-generator.js) · [`styles/themes/`](https://github.com/jboltai/tokui/tree/master/src/styles/themes)
