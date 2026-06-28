# TokUI - From Token To UI

English | **[简体中文](./README.md)**

> TokUI is the world's first For AI & zero-dependency streaming UI framework. Describe components with a minimal DSL on the backend, push over SSE or WebSocket, and render incrementally on the frontend — the first token starts painting the DOM, letting AI produce more flexible, expressive UI with minimal tokens.

[![npm version](https://img.shields.io/npm/v/@jboltai/tokui.svg)](https://www.npmjs.com/package/@jboltai/tokui)
[![npm downloads](https://img.shields.io/npm/dm/@jboltai/tokui.svg)](https://www.npmjs.com/package/@jboltai/tokui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![zero runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen.svg)](#)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@jboltai/tokui.svg)](https://bundlephobia.com/package/@jboltai/tokui)

[Official Docs site](https://tokui.jboltai.com/) · [Component gallery demo](https://tokui_demo.jboltai.com) · [DSL reference](./demo/TOKUI_DSL_REFERENCE.md) · [Try on StackBlitz](https://stackblitz.com/github/jboltai/tokui)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [DSL Syntax Cheatsheet](#dsl-syntax-cheatsheet)
- [Component Inventory](#component-inventory)
- [Builder API (Server-side)](#builder-api-server-side)
- [Theme System](#theme-system)
- [Extending Components](#extending-components)
- [Testing](#testing)
- [Demo](#demo)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

- **Zero runtime dependencies** — pure native APIs on both frontend and backend, no runtime npm packages; the built artifact is self-contained (~86KB gzipped ESM).
- **Streaming-first** — state-machine incremental parser, renders as chunks arrive, starts drawing DOM on the first character.
- **Concise DSL** — `[card tt:Title][p Content][/card]` describes a component in one line; easy for AI to generate, easy for humans to read.
- **Framework-agnostic** — usable with vanilla JS, plus official React / Vue / Svelte / Web Component adapters.
- **Pluggable components** — register with `renderer.register(type, fn)`, 30+ components out of the box (card, table, form, chart, Markdown, code highlight, etc.).
- **Safe events** — handlers are named references (`clk:` / `sub:`), must be pre-registered via `registerHandler`; no executable code injection.
- **Theme-driven** — CSS variables + `data-tokui-theme` switching, with a built-in 10-level palette generator using an HSB algorithm.
- **SSR-friendly** — `import` does not touch `window`/`document`; safe to import on the server in Next.js / Nuxt / SvelteKit (rendering happens on the client).
- **Graceful degradation** — unregistered components render as `div.tokui-unknown`; render errors produce a `details.tokui-error`; a single failure won't crash the page.
- **Resource protection** — `maxBuffer` (1MB) and `maxDepth` (100) prevent resource exhaustion from malicious or oversized input.

---

## Architecture

### Three-layer Data Flow

```
Backend TokUIBuilder emits DSL  →  SSE push  →  Frontend TokUIParser incremental parse  →  TokUIRenderer renders DOM
```

### Core Modules

| Module | Responsibility |
|--------|----------------|
| `core/parser.js` | State-machine (TEXT / TAG_OPEN / TAG_CLOSE) streaming parser; supports `feed()` incremental and `parse()` one-shot |
| `core/renderer.js` | Component rendering engine; `slotStack` for nested container slots, `VARIANTS` whitelist for variants, depth cap 50 |
| `core/event-bus.js` | Event bus singleton; `registerHandler(name, fn)` registration, `clk:`/`sub:` binding in DSL |
| `core/theme.js` | CSS-variable-driven theme manager; `data-tokui-theme` switching |
| `core/color-generator.js` | 10-level palette and theme-token generator using an HSB algorithm |
| `components/*` | Component library split by type; unified registration via `index.js` |
| `server/tokui-builder.js` | Chainable API to generate DSL; `toString()` and `toChunks()` outputs |
| `server/sse-server.js` | Node.js native `http` SSE demo server |

---

## Quick Start

### Install

```bash
# npm
npm install @jboltai/tokui

# pnpm
pnpm add @jboltai/tokui

# yarn
yarn add @jboltai/tokui
```

### CDN (zero-build)

```html
<link rel="stylesheet" href="https://unpkg.com/@jboltai/tokui/dist/tokui.css">
<script src="https://unpkg.com/@jboltai/tokui/dist/tokui.umd.js"></script>
<!-- Exposed as the window.TokUI namespace -->
```

> jsdelivr works too: replace `unpkg.com` with `cdn.jsdelivr.net/npm`.

### Import the stylesheet (npm projects)

```js
import '@jboltai/tokui/css';   // import once (bundled library styles)
```

### Three Rendering Modes

**1. One-shot render**

```js
import { TokUI } from '@jboltai/tokui';

const tokui = new TokUI({ container: '#app' });
tokui.render('[h1 Hello TokUI][p Some text]');
```

**2. Streaming render (`feed()` incremental input)**

```js
const tokui = new TokUI({ container: '#app' });
tokui.startStream();
tokui.feed('[card tt:');
tokui.feed('Streaming Card]');
tokui.feed('[p Content renders as it arrives]');
tokui.feed('[/card]');
tokui.endStream();   // flush buffer
```

**3. SSE connection (server push)**

```js
const tokui = new TokUI({
  container: '#chat',
  onEvent: (type, data) => {
    if (type === 'streamEnd') console.log('stream ended');
  }
});
tokui.connect('/api/chat', { prompt: 'Draw a login card' });
```

> SSE protocol convention: each `data:` line is JSON; the `tokui` field is fed to the parser; `[DONE]` marks end of stream.

### Node.js Usage (server-side Builder)

```js
import { TokUIBuilder } from '@jboltai/tokui/builder';

const b = new TokUIBuilder();
b.card({ tt: 'Title' }).h2('Content').p('Description').end();
console.log(b.toString());  // [card tt:Title][h2 Content][p Description][/card]
```

> The Builder is pure logic and runs in any Node runtime (incl. Edge / Serverless); no DOM required.

---

## Using in Frameworks

Official adapters let you render DSL with a familiar declarative API. Each adapter peer-depends on its framework (no double-bundling) and pulls in `@jboltai/tokui` styles automatically.

| Package | For | Entry |
|---------|-----|-------|
| [`@jboltai/tokui-react`](./packages/react) | React 16.8+ | `<TokUIView dsl={...} />` + `useTokUIStream()` |
| [`@jboltai/tokui-vue`](./packages/vue) | Vue 3 | `<TokUIView :dsl="..." />` + `useTokUIStream()` |
| [`@jboltai/tokui-svelte`](./packages/svelte) | Svelte 3.46+ | `use:tokui={{ dsl }}` action + `<TokUI />` |
| [`@jboltai/tokui-webc`](./packages/webc) | Any / no framework | `<tokui-view dsl="..."></tokui-view>` custom element |

**React**

```jsx
import { TokUIView } from '@jboltai/tokui-react';
export function App() {
  return <TokUIView dsl="[card tt:Hi][p Streaming UI][/card]" theme="default" />;
}
```

**Vue 3**

```vue
<script setup>
import { TokUIView } from '@jboltai/tokui-vue';
const dsl = '[card tt:Hi][p Streaming UI][/card]';
</script>
<template><TokUIView :dsl="dsl" /></template>
```

**Svelte**

```svelte
<script>
  import { tokui } from '@jboltai/tokui-svelte';
</script>
<div use:tokui={{ dsl: '[card tt:Hi][p Streaming UI][/card]' }}></div>
```

**Web Component**

```js
import defineTokuiElement from '@jboltai/tokui-webc';
defineTokuiElement(); // registers <tokui-view>
```
```html
<tokui-view dsl="[card tt:Hi][p Streaming UI][/card]"></tokui-view>
```

See each adapter's README for streaming / SSE usage.

---

## DSL Syntax Cheatsheet

```tokui
[type attr:value content]              ; self-closing
[card tt:Title][p Content][/card]      ; nested container
ph:"value with spaces"                 ; quote values containing spaces
v:"primary,sm"                         ; multiple variants comma-separated
stripe                                 ; boolean attribute (key only)
```

### Common Attribute Shorthands

| Shorthand | Meaning | Shorthand | Meaning |
|-----------|---------|-----------|---------|
| `tt` | title | `tx` | text |
| `l`  | label | `ph` | placeholder |
| `u`  | url   | `s`  | src / source |
| `n`  | name  | `v`  | value / variant |
| `act`| action | `mtd`| method |
| `clk`| onclick handler name | `sub`| onsubmit handler name |
| `dis`| disabled | `ro` | readonly |
| `req`| required | `chk`| checked |
| `id` | element id (also target of `upd`) | `w/h/bg/fc` | width/height/background/font-color |

### Boolean Attributes (key only)

`stripe` `dis` `ro` `req` `chk` `multi` `auto` `plain` `round` `closable` `bordered` `open` `pill` `dot` `leaf` `inline` `rounded` `container`

The full list is defined in the `BOOLEAN_ATTRS` Set in `parser.js`.

### Variant System

Writing `v:primary` in DSL produces the CSS class `tokui-btn--primary`. Variant names are validated against the `VARIANTS` whitelist; unknown variants are silently dropped.

### Dynamic Updates

```tokui
[upd id:targetId v/act/tt/tx:newValue]    ; update value/action/title/text of a rendered component
```

### Full Reference

For the complete attribute table and container type list, see [`demo/TOKUI_DSL_REFERENCE.md`](./demo/TOKUI_DSL_REFERENCE.md).

---

## Component Inventory

Grouped by file, ready out of the box:

| File | Components |
|------|------------|
| `basic.js` | headings h1–h6, paragraph, link, Markdown, code block, syntax highlight, badge, button, tooltip, divider, etc. |
| `table.js` | tables (`table` / `thead` / `tbody` / `tr` / `desc`) |
| `form.js` | form, input, textarea, select, radio/checkbox, switch, date picker, tag input, etc. |
| `layout.js` | card, grid row/col, list, image gallery, description list, etc. |
| `chart.js` | pure-SVG zero-dependency charts: bar / line / pie / radar / donut / scatter / gantt / funnel |
| `lightbox.js` | image lightbox preview |

Container types (require `[/type]` closing tag; full list in the `CONTAINERS` Set of `parser.js`):

```
form table thead tbody card ft row col list select radio code imgs md textarea
tabs tab accordion collapse dialog btngroup picker timeline steps drawer ol ul i
item think bubble toolbar badge-box dropdown transfer cascader tree tn step desc
carousel popover input-tag watermark menu
```

---

## Builder API (Server-side)

`TokUIBuilder` offers a chainable API to generate DSL, with two output modes:

```js
const b = new TokUIBuilder();

// toString() — one-shot full string output
b.card({ tt: 'Card' }).p('Content').end();
const dsl = b.toString();

// toChunks() — array of chunks, push one block at a time via SSE
const chunks = b.reset().card({ tt: 'Card' }).p('Content').end().toChunks();
```

**Auto-close**: `toString()` / `toChunks()` internally call `_finalizeChunks()`, which auto-completes any unclosed containers — no manual `endAll()` needed.

**Dual-behavior methods**: `thead()`, `inputTag()`, `quickReply()`, `agent()` automatically switch between self-closing and container mode based on their arguments.

**Name avoidance**: layout uses `row_layout()` / `col_layout()` to avoid clashing with the table's `row()`.

---

## Theme System

Switch via CSS variables + `data-tokui-theme` attribute:

```js
TokUI.setTheme('dark');   // switch to dark theme
```

Built-in themes live in `src/styles/themes/`: `default.css`, `dark.css`.

Generate a custom theme palette with the color generator:

```js
import { generatePalette, generateThemeTokens } from '@jboltai/tokui';
const tokens = generateThemeTokens({ primary: '#1677ff', danger: '#ff4d4f' });
// outputs { '--tokui-primary-1' ... '--tokui-primary-10' }, a 10-level CSS-variable mapping
```

---

## Extending Components

Adding a new component takes four steps:

1. **Register the render function** (`src/components/*.js`):

   ```js
   renderer.register('mycard', (node, rc, parentType) => {
     const el = renderer.el('div', { class: 'tokui-mycard' });
     el.textContent = node.attrs.tt || '';
     rc(node.children, el);   // recursively render children
     return el;
   });
   ```

2. **If it is a container type**, add it to the `CONTAINERS` Set in `src/core/parser.js`. If its content contains `[` that should not be parsed (e.g. code), also add it to the list in `_isRawContent()`.

3. **Add a Builder method** (`src/server/tokui-builder.js`): use `_selfClosing()` for self-closing, `_open()` / `end()` for containers.

4. **Add styles** (`src/styles/tokui.css`): class `.tokui-mycard`; variants use `.tokui-mycard--{variant}` and must be added to the `VARIANTS` whitelist in `renderer.js`.

Finally, add a test in `tests/`, and optionally a demo in the `DEMOS` array of `demo/server/sse-server.js`.

---

## Testing

A custom runner built on Node.js's built-in `assert` module — zero test-framework dependencies:

```bash
npm test            # full suite: 24 files, 866+ cases
npm run test:parser # parser only
npm run test:builder
npm run test:core   # event-bus + theme + renderer
npm run typecheck   # tsc type check (with reverse @ts-expect-error assertions)
npm run coverage    # c8 coverage (core modules ~91%)

node tests/test-xxx.js          # run a single test file
```

A failed assertion exits with code 1. Renderer tests depend on the minimal DOM mock in `tests/helpers/dom-mock.js`.

---

## Demo

Start the SSE demo server (port 3109; auto-kills and restarts the old process if the port is taken):

```bash
npm run server
# open http://localhost:3109
```

Demo entry:

- **`demo/index.html`** — component gallery showcasing all components, with theme switching and bilingual (zh/en) switching.

---

## Project Structure

```
.
├── src/
│   ├── core/              # parser, renderer, event bus, theme, color generator
│   ├── components/        # component library (basic/table/form/layout/chart/lightbox)
│   ├── server/            # Builder chainable API + SSE demo server
│   ├── styles/            # tokui.css + themes/ (default, dark)
│   └── index.js           # main entry, integrates the TokUI class
├── packages/              # framework adapter monorepo (pnpm workspace)
│   ├── react/             # @jboltai/tokui-react
│   ├── vue/               # @jboltai/tokui-vue
│   ├── svelte/            # @jboltai/tokui-svelte
│   ├── webc/              # @jboltai/tokui-webc (Web Component)
│   └── tokui/             # bare-name `tokui` alias package
├── demo/                  # gallery demo
├── tests/                 # custom-runner test suite (24 files / 866+ cases)
├── docs/                  # VitePress docs site
└── package.json
```

---

## Roadmap

TokUI is evolving toward multi-language backend SDKs and multi-styling-library frontend themes. The tables below summarize current and planned capabilities.

> Legend: ✅ Supported　·　🚧 Planned

### Backend SDK — Multi-language Support

| Language / Runtime | Status | Notes |
|--------------------|:------:|-------|
| Node.js | ✅ | `TokUIBuilder` chainable API + SSE demo server (current implementation) |
| Python | 🚧 | Planned |
| Rust | 🚧 | Planned |
| Java | 🚧 | Planned |
| Go | 🚧 | Planned |
| C# / .NET | 🚧 | Under evaluation |
| Cross-language DSL spec lock-down | 🚧 | Shared parse contract so all SDKs produce identical output |

### Frontend Integration

| Capability | Status | Notes |
|------------|:------:|-------|
| React / Vue / Svelte / Web Component adapters | ✅ | `@jboltai/tokui-{react,vue,svelte,webc}` |
| CSS-variable themes (`default` / `dark`) | ✅ | `data-tokui-theme` switching |
| HSB palette generator | ✅ | Generate a 10-level scale from any seed color |
| Variant system (`VARIANTS` whitelist) | ✅ | `v:primary` → `tokui-{type}--primary` |
| TailwindCSS adapter | 🚧 | Atomic-class mapping / theme-token bridge |
| UnoCSS adapter | 🚧 | Planned |
| Theme marketplace / sharing | 🚧 | Community-shareable theme packages |

---

## License

[MIT](./LICENSE)
