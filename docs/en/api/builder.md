# Builder API (Server)

`TokUIBuilder` is a chainable DSL generator for the backend (Node.js). Source: `src/server/tokui-builder.js`.

## Basic usage

```js
const TokUIBuilder = require('./src/server/tokui-builder');
const b = new TokUIBuilder();

b.card({ tt: 'Profile' })
  .h2('Alice')
  .p('A frontend engineer')
  .end();

console.log(b.toString());
// [card tt:Profile][h2 Alice][p A frontend engineer][/card]
```

## Two outputs

| Method | Use |
|--------|-----|
| `toString()` | One-shot full DSL string |
| `toChunks()` | Array of chunks for incremental SSE push |

```js
const chunks = b.reset().card({ tt: 'Card' }).p('Body').end().toChunks();
// → ['[card tt:Card]', '[p Body]', '[/card]']
```

## Auto-close

`toString()` / `toChunks()` internally call `_finalizeChunks()` — **unclosed containers are auto-completed**; no manual `endAll()` needed.

## Dual-behavior methods

These pick self-closing vs container based on args:

- `thead()` / `inputTag()` / `quickReply()` / `agent()`

## Name avoidance

Grid rows/columns use `row_layout()` / `col_layout()` to avoid clashing with the table's `row()`. Supported grid props: `gutter` (uniform column/row gap) and `gy` (row gap) on `row_layout()`; `span` (column width 1-12), `offset` (columns left empty, 1-11, offset+span clamped to ≤ 12) and `rspan` (row span 1-12) on `col_layout()`.

The advanced grid uses `grid(attrs)` / `cell(attrs)` (both containers, closed with `end()`; values containing spaces are auto-quoted during serialization):

```js
b.grid({ cols: '200px 1fr 1fr', rows: '64px 1fr', gap: 12, areas: 'nav main main|nav aside aside' })
  .cell({ area: 'nav' }).p('Nav').end()
  .cell({ area: 'main' }).p('Main').end()
  .cell({ area: 'aside' }).p('Aside').end()
  .end();
// → [grid cols:"200px 1fr 1fr" rows:"64px 1fr" gap:12 areas:"nav main main|nav aside aside"][cell area:nav][p Nav][/cell][cell area:main][p Main][/cell][cell area:aside][p Aside][/cell][/grid]
```

`grid` props: `cols`/`rows` (tracks), `areas` (template areas), `gap`/`gx`/`gy` (gaps), `h`/`minh` (height), `v` (`dense`/`flush`); `cell` props: `area`, `c` (column span N or `"1/3"`), `r` (row span N), `align`/`justify`. See [Layout Components · Advanced Grid](/components/layout).

## Internals

- **Self-closing** via `_selfClosing(type, attrs)`: `b.btn({ tx: 'OK', v: 'primary' })`.
- **Containers** via `_open(type, attrs)` + `end()`: `b.card({}).p('x').end()`.
- `reset()` clears state to reuse the instance.

## Full example

```js
const b = new TokUIBuilder();
b.card({ tt: 'Login' })
  .input({ l: 'Username', ph: 'Enter', req: true })
  .pwd({ l: 'Password', ph: 'Enter', req: true })
  .ft()
    .btn({ tx: 'Login', v: 'primary', sub: 'login' })
    .btn({ tx: 'Cancel', v: 'ghost' })
  .end()
  .end();

const dsl = b.toString();
```

Rendered result of the DSL above:

<Playground dsl='[card tt:Login][input l:Username ph:Enter req][pwd l:Password ph:Enter req][ft][btn tx:Login v:primary sub:login][btn tx:Cancel v:ghost][/ft][/card]' />
