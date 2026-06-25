# Theming

All TokUI styles are driven by **CSS variables**: switching a theme = swapping variable values, and every component's color, radius, and shadow follows automatically — no component code changes.

## Built-in themes

TokUI ships **4 themes**, paired as "style family × light/dark":

| Theme | Mode | Style | Activation selector |
|-------|------|-------|---------------------|
| `default` | Light | style restrained blue (primary `#1677ff`) | `:root` / `[data-tokui-theme="default"]` |
| `dark` | Dark | dark counterpart of `default` | `[data-tokui-theme="dark"]` |
| `modern` | Light | Refined Neutral: cool-gray neutrals + restrained blue accent (`#3B6FF5`) + Inter font + soft layered shadows + 12px field radius | `[data-tokui-theme="modern"]` |
| `modern-dark` | Dark | dark counterpart of `modern`: deep-gray elevation + recessed forms + borderless buttons | `[data-tokui-theme="modern-dark"]` |

`default` lives on `:root` and is the out-of-the-box default. `modern` only declares under `[data-tokui-theme="modern"]`, so it coexists with and mutually excludes `default` — switch the attribute to swap.

The preview below lets you **toggle the style family and light/dark live** — see the same DSL rendered across all four themes:

<ThemeShowcase dsl='[card tt:"Theme preview"][row][col span:6][h4 Components & states][p v:muted Muted text][btn tx:Primary v:primary][btn tx:Success v:success][btn tx:Daner v:danger][callout t:info tt:Tip]Theming is all CSS variables[/callout][/col][col span:6][h4 Variants & palette][slider v:40][progress v:70 t:success][tag tx:Default][tag tx:Primary v:primary][tag tx:Warning t:warning][badge tx:8 t:danger][/col][/row][/card]' />

## Switching themes

Switching a theme is just setting the `data-tokui-theme` attribute on the container. Three ways:

**1. At construction (recommended)**

```js
import { TokUI } from '@jboltai/tokui';
import '@jboltai/tokui/css';

const ui = new TokUI({
  container: '#app',
  theme: 'modern',          // 'default' | 'dark' | 'modern' | 'modern-dark'
});
```

**2. At runtime**

```js
import { setTheme, getTheme } from '@jboltai/tokui';

setTheme('modern-dark');
getTheme();   // → 'modern-dark'
// equivalent to: document.querySelector('#app').setAttribute('data-tokui-theme', 'modern-dark')
```

> You can also pin the theme directly in HTML, no JS: `<body data-tokui-theme="modern">`.

**3. Follow the system color scheme**

Add a `matchMedia` listener so the theme tracks the OS light/dark setting:

```js
import { setTheme } from '@jboltai/tokui';

const mql = window.matchMedia('(prefers-color-scheme: dark)');
const apply = (e) => setTheme(e.matches ? 'dark' : 'default');
apply(mql);                       // apply initially
mql.addEventListener('change', apply);   // follow system changes
```

Swap `'dark' / 'default'` for `'modern-dark' / 'modern'` to run the Modern family.

## Three-layer token system

Each theme is a three-layer structure, semanticized bottom-up:

| Layer | Example | Role |
|-------|---------|------|
| **Palette** | `--tokui-primary-1` … `--tokui-primary-10` | 10-step ramp; `6` is usually the seed color itself |
| **Semantic** | `--tokui-primary`, `--tokui-danger-bg`, `--tokui-info-border` | stable public entry points |
| **Component** | `--tokui-radius`, `--tokui-shadow-md`, `--tokui-control-radius` | radius / shadow / control shape |

Component styles only reference the **semantic and component layers**, never a specific palette step. So when a theme remaps the semantic layer to a new palette, every component picks up the correct color automatically.

## Runtime custom palette

Generate a theme from a seed color at runtime, no build step. `setSeedColor` runs the built-in HSB algorithm to produce a 10-step ramp and injects a `<style data-tokui-dynamic-palette>` tag overriding the `default` / `dark` palette variables:

```js
import { TokUI } from '@jboltai/tokui';

const ui = new TokUI({ container: '#app' });

// Recolor primary to brand green; other semantic colors optional
TokUI.setSeedColor('#00a878', {
  danger: '#e5484d',
  success: '#00a878',
  warning: '#f5a623',
});

ui.render('[btn tx:Brand primary v:primary][callout t:success tt:Success]Palette applied live[/callout]');
```

Notes:

- Accepts only `#rrggbb` seed colors; invalid values are silently ignored.
- Tracks the current light/dark mode (when `getTheme()` is `dark`, a dark ramp is generated).
- It overrides `:root` / `[data-tokui-theme="default"]` / `[data-tokui-theme="dark"]` — **it does not affect the `modern` family**. To recolor Modern, use the build-time approach below or ship a new theme file.

## Palette generator (build-time)

`setSeedColor` calls the built-in HSB palette algorithm at runtime. To generate tokens offline at build time and ship them in a theme file (no runtime injection), call the same generator directly:

```js
// In-repo / source-clone usage (generator source: src/core/color-generator.js)
const { generatePalette, generateThemeTokens } = require('./src/core/color-generator');

// 10-step ramp (array, index 0 = level 1)
const light = generatePalette('#1677ff');                // light
const dark  = generatePalette('#1677ff', { dark: true }); // dark (mixed with dark bg)

// All CSS variables for the 4 semantic colors at once
const tokens = generateThemeTokens({
  primary: '#1677ff',
  danger:  '#f5222d',
  success: '#52c41a',
  warning: '#faad14',
});
// → { '--tokui-primary-1': '#e6f4ff', ..., '--tokui-warning-10': '...' }
```

> Note: `color-generator` is an internal module and **is not published with the npm package** (not in `package.json` `files`). npm consumers should use the runtime `setSeedColor` above; for offline generation, clone the source repo.

Serialize `Object.entries(tokens)` into a `[data-tokui-theme="brand"] { ... }` block to get a custom theme file.

## Variants & themes

Writing `v:primary` in the DSL makes the renderer emit class `tokui-btn--primary`, whose CSS references the `--tokui-primary-*` variables. So:

> **Changing the theme = changing variable values.** `v:primary` / `v:success` / `v:danger` variant colors follow the theme automatically — zero component edits.

## Custom themes

Create a CSS file declaring variables under a `[data-tokui-theme="your-name"]` scope, import it on the page, then activate with `setTheme('your-name')` or `new TokUI({ theme: 'your-name' })`:

```css
/* my-brand.css */
[data-tokui-theme="brand"] {
  /* Palette layer (use generateThemeTokens to avoid hand-writing 40 values) */
  --tokui-primary-1: #e6f4ff;
  /* ... --tokui-primary-10 ... */

  /* Semantic layer — MUST be redefined inside the theme scope */
  --tokui-primary: var(--tokui-primary-6);
  --tokui-primary-bg: var(--tokui-primary-1);
  --tokui-info: var(--tokui-primary);
  --tokui-info-bg: var(--tokui-primary-1);
  --tokui-danger-bg: var(--tokui-danger-1);
  /* ... remaining success / warning / callout / tag / code / chart semantic vars ... */
}
```

```js
import '@jboltai/tokui/css';
import './my-brand.css';
import { TokUI } from '@jboltai/tokui';

new TokUI({ container: '#app', theme: 'brand' });
```

### ⚠️ Three pitfalls when writing themes / components

1. **Never write `color-scheme` inside a token block.**
   Vite 8's Lightning CSS rewrites the entire `[data-tokui-theme="xxx"]` variable block into `light-dark()` conditional logic when it sees `color-scheme: light/dark`, so the variables stop applying directly and the theme breaks. If you need `color-scheme`, put it in a **separate rule**.

2. **Semantic variables MUST be redefined inside the theme scope.**
   `default.css`'s `:root` defines a batch of secondary variables (`--tokui-callout-info-bg`, `--tokui-tag-*-bg`, `--tokui-code-bg`, `--tokui-chart-*`, etc.) whose `var()` resolves at `:root` and **locks to the default palette**. A new theme container that doesn't override them inherits the locked default values, not the new palette. So you must **fully redefine every secondary variable** — see `modern.css` / `modern-dark.css` — not just the palette layer.

3. **Write both `--danger` and `--error` classes.**
   DSL `t:danger` → renderer emits `.tokui-X--danger`; but historically some components only defined `.tokui-X--error` (callout / tag / badge / dot / progress / step). For any new state-colored component, write rules for **both** class names, or `t:danger` falls back to the default color.

## Next steps

- [Component Showcase](/en/components/showcase) — see components across themes
- [Quick Start](./getting-started) — import and render modes
- Source: [`core/theme.js`](https://github.com/jboltai/tokui/blob/master/src/core/theme.js) · [`core/color-generator.js`](https://github.com/jboltai/tokui/blob/master/src/core/color-generator.js) · [`styles/themes/`](https://github.com/jboltai/tokui/tree/master/src/styles/themes)
