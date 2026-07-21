# DSL Syntax

TokUI DSL is minimal: brackets wrap one component. The first token is the type, then `key:value` attributes, trailing text is content.

## Basics

```text
[h1 Title]                                    ; self-closing
[card tt:Title] content [/card]               ; container, must close with [/type]
[btn tx:"Click me" v:primary clk:onClick]     ; space-separated attributes
[tr Alice,25,NYC]                             ; comma-separated values
ph:"value with spaces"                        ; quote values with spaces
v:"primary,sm"                                ; comma-separated variants
```

- Containers must close with `[/type]`; self-closing tags hold no children.
- Boolean attributes need no value: `req`, `stripe`, `dis`.

<Playground dsl='[btn tx:Primary v:primary][btn tx:Danger v:danger][btn tx:Ghost v:ghost][btn tx:Pill v:"primary,pill"]' />

## Common attributes

| Short | Meaning | Short | Meaning |
|-------|---------|-------|---------|
| `id` | element id (also `upd` target) | `tt` | title |
| `tx` | text | `l` | label |
| `ph` | placeholder | `u` | url |
| `s` | src / source | `n` | name |
| `v` | value / variant | `act` | action |
| `mtd` | method | `clk` | onclick handler |
| `sub` | onsubmit handler | `dis` | disabled |
| `ro`/`req`/`chk` | readonly/required/checked | `w/h/bg/fc` | width/height/bg/color |
| `form` | button → bind a form id | `reset` | reset action (`reset` or `reset:H`) |
| `print` | print action (`print:ID` / `print:self`) | `target` | `a` open target |
| `icon` | SVG icon name (btn / action col) | `i` | emoji icon (btn / action col / menu-item) |
| `on` | event reporting declaration `on:"event:handler,…"` (**double quotes required**, see [Interaction event reporting](#interaction-event-reporting)) | | |

> `clk:` / `sub:` handlers must be pre-registered via `TokUI.registerHandler(name, fn)` — the server ships no executable code.
> `sub` / `reset` / `print` are button **built-in actions**, resolved automatically by the renderer; `reset` / `print` need no registered handler. See [Form components](/en/components/form#form-actions-submit-reset-data-collection).

> **Where text goes — bare content vs `tx:`**: text-**block** components `p` / `h1~h6` / `item` take text as **bare content** inside the tag: `[p body text]`, `[h1 Title]`; `tx:` is the text prop of **self-closing display** components (`btn` / `tag` / `callout` / `stat` / `badge` / `dot`…): `[btn tx:Click]`. Mixing loses content. Combine variants with commas `v:"muted,center"` — never write two `v:` (the second overwrites the first).

## Boolean attributes

Just the key, no value:

```
stripe dis ro req chk multi auto plain round closable bordered open
pill dot leaf inline rounded container reset print approval streaming
```

> `approval` puts `tool-call` into human-approval mode, and `streaming` shows the stop-generating button on `chat-input` (see [AI Chat](/en/components/ai-chat)).

## Variants

`v:primary` generates class `tokui-{type}--primary`. Combine with commas: `v:"primary,sm,pill"`. Unknown variants are silently dropped (whitelist).

| Component | Allowed variants |
|-----------|------------------|
| `btn` | `primary` `danger` `success` `warning` `ghost` `sm` `lg` `pill` `square` `block` (icons use the `icon:` / `i:` props, not variants; see [Button · Icon Buttons](/en/components/basic#icon-buttons)) |
| `card` | `highlight` `flat` `bordered` `center` `right` |
| `h1~h6` | `left` `center` `right` `ribbon` `underline` `badge` `pill` |
| `p` | `left` `center` `right` `muted` `bold` `sm` `lg` |
| `img` | `avatar` `rounded` `bordered` |
| `dv` | `dashed` `dotted` `sm` `md` `lg` `vert` `plain` |

<Playground dsl='[h1 v:underline Decorated title][p v:muted Muted text][p v:bold Bold text][dv v:dashed Divider with text]' />

> **Badging a heading**: `h3` and other headings are self-closing — never nest `[h3 text [badge]]`. Two official patterns — inline pill via `row v:inline` (flex; **must use `v:inline`** — the default `row` is a 12-col grid that squeezes the heading): `[row v:inline][h3 SaaS Pro][badge tx:v2.4 pill][/row]`; top-right corner badge via `badge-box`: `[badge-box tx:v2.4][h3 SaaS Pro][/badge-box]`. Use `tx` for versions/decimals (`count` runs through `parseInt` and truncates `2.4` to `2`). `badge-box` text badge uses `tx` (legacy `label` still works).

## Dynamic update

`[upd]` updates an already-rendered component:

```text
[progress id:prog v:0 l:Progress]
[upd id:prog v:50]
[upd id:prog v:100 status:success]
```

<Playground dsl='[progress id:prog v:0 l:Progress][upd id:prog v:50][upd id:prog v:100 status:success]' />

> `[upd]` shines in **async incremental** updates: the server first sends `[progress id:prog v:0]`, then pushes `[upd id:prog v:50]` as it advances. Click **⚡ Stream** at the bottom-right to replay token by token — the bar jumps 0% → 50% → 100% live.

`id` accepts comma-separated targets for batch updates: `[upd id:prog1,prog2 status:success]` (the same props are applied to every matched component).

### Delete `del` & Insert `ins`

`[del id:x]` is a self-closing directive that removes the component with the given `id` — when an inner element is hit, it climbs to the component root and removes the whole component; a missing target is silently skipped and no DOM is produced.

> If the target is a container that is **still streaming** (not yet closed), `del` warns via `console.warn` and skips — deleting half a component would scramble the slot stack. Wait for it to close before sending `del`.

`[ins]` is a container directive that inserts its children after / before / inside a target component, depending on the position prop:

```tokui
[del id:old-card]
[ins after:target-id][p inserted after the target][/ins]
[ins before:target-id][p inserted before the target][/ins]
[ins into:target-id][p appended as a child of the target][/ins]
```

`into` appends to the target's content insertion point (`_slot`). During streaming, children first go into a detached staging area and are moved to the target in one shot when `[/ins]` arrives (no layout flicker). The target must be an **already-rendered** component; if it doesn't exist, the content is discarded.

> `into` only works on containers whose content is a plain child flow (card / list / callout / bubble / dialog body, etc.). Structural containers (`tabs` / `table` / `chart` / `select` / `radio` / `checkbox` / `picker` / `transfer` / `cascader` / `steps` / `menu` / `tree` — their children mount through dedicated protocols) forbid `into`: it warns via `console.warn` and skips. To append content to those, use their own streaming child-node protocols.

<Playground dsl='[card tt:"Target card" id:insDemo][p Original card content][/card][ins into:insDemo][p A paragraph appended by ins][/ins][p id:delDemo This paragraph is removed by del right after render][del id:delDemo]' />

> **Directive receipts**: after `upd` / `del` / `ins` executes, the result is reported to the unified outlet: `{type:'upd'|'del'|'ins', id, event:'applied', detail:{applied}}` / `{removed}` / `{moved}` — the server can use this to confirm the directive landed (when the target doesn't exist, `applied` / `removed` is `false` and `moved` is `0`).

### Interaction event reporting

Declare interaction reporting on a component with `on:"event:handler,…"` (**double quotes required**). Handlers are pre-registered via `TokUI.registerHandler`, with the signature `(detail, event, element)`; `detail` carries the context (e.g. `{value}` / `{index, title}`):

```tokui
[input n:city ph:"City" on:"change:onCityChange"]
[tabs on:"change:onTabSwitch"][tab tt:A]…[/tab][tab tt:B]…[/tab][/tabs]
[dialog tt:"Confirm" id:dlg on:"close:onDialogClose"]…[/dialog]
```

Beyond the named handler, every interaction is also delivered to the unified outlet of `new TokUI({ onEvent })`: `onEvent('component', { type, id, event, detail })` — the host can listen to everything even without any `on:` declaration; `new TokUI({ eventFilter })` filters component events as needed (return `false` to drop).

> Referencing an unregistered handler name (a typo in `on:` / `clk:`) triggers a `console.warn` reminder (once per name) — events are no longer dropped silently.
> **Programmatic behavior never reports**: `upd` switches/closes, carousel autoplay, initial render, etc. — only real user actions are reported, preventing the "server upd → client report → upd again" loop.

| Component | Event | detail |
|-----------|-------|--------|
| `input` / `pwd` / `textarea` / `numinput` | `change` (300ms input debounce; `db:` overrides the milliseconds) | `{value, name}` |
| `select` / `radio` / `checkbox` / `switch` / `slider` / `rate` / `picker` / `transfer` / `cascader` / `input-tag` / `datepicker` family | `change` (fires on every value change) | `{value, name}` |
| `upload` | `change` (file selected / removed) | `{value: filename array, name}` |
| `tabs` / `steps` | `change` (user tab switch / step click) | `{index, title}` |
| `menu` | `change` (item identity: id > v > text) | `{value}` |
| `pagination` | `change` (page turn / jump) | `{value: page number}` |
| `tree` | `change` (node selected) / `check` (checkbox change) | `{value, id}` / `{value: checked values array}` |
| `carousel` | `change` (manual switch; autoplay does not fire) | `{index}` |
| `conversations` | `change` (conversation selected) / `delete` (conversation deleted) | `{value}` (conversation identity) |
| `dialog` / `drawer` / `artifact` | `close` (user paths only; programmatic `act:close` does not fire) | `{}` |
| `chat-input` | `send` (message sent) / `stop` (stop button in `streaming` state) | `{value}` / `{}` |
| `msg-actions` | `action` (built-in buttons) | `{act: 'copy'/'regenerate'/'like'/'dislike'/'delete'}` |
| `quick-reply` / `suggestion` | `select` (item clicked) | `{value: label/title}` |
| `tool-call` | `approval` (HITL human approval) | `{approved, id, name}` |

> Per-component details live in the component docs: [Form](/en/components/form), [Layout](/en/components/layout), [AI Chat](/en/components/ai-chat); full description in §8.4 of the [DSL reference](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md).

## Component categories

The 150+ components are organized into seven categories, each with full prop tables and editable examples:

| Category | Representative components | Docs |
|----------|--------------------------|------|
| Basic | headings, buttons, tags, callouts, progress, stats, Markdown, code | [basic](/en/components/basic) |
| Form | input, select, radio, checkbox, switch, slider, rate, date, cascader, transfer, upload | [form](/en/components/form) |
| Layout | card, grid, tabs, collapse, drawer, dialog, timeline, tree | [layout](/en/components/layout) |
| Data Display | table, descriptions, pagination, badge, avatar, skeleton, result, empty | [data](/en/components/data) |
| Chart | bar, line, area, pie, donut, rose, funnel, radar, scatter, bubble, heatmap, histogram, waterfall, boxplot, treemap, sankey, candlestick, progress, gauge, gantt (20 types, pure SVG, zero deps) | [chart](/en/components/chart) |
| AI Chat | bubble, tool-call, thought chain, diff, plan, terminal, sandbox, artifact | [ai-chat](/en/components/ai-chat) |
| Showcase | signup form, CRUD, form+table linkage, report-style cards | [showcase](/en/components/showcase) |

## Raw content mode

Inside `code`, `md`, `diff`, `terminal`, `sandbox`, and `artifact-code` containers, `[` is treated as a literal character (not parsed as a tag) until the matching `[/type]`. So brackets inside code snippets never break parsing.

## The two modes of paragraph `p` (leaf vs container)

`p` is a **dual-mode** tag: it switches automatically based on whether there is **body text inside the tag**. Getting it wrong makes child nodes break out as siblings or body text disappear (same trap as card's `tx` self-closing).

- **Leaf mode** (body text present): `[p text]`, `[p v:bold text]`. The text becomes the paragraph body; it auto-closes when the next **block-level** sibling arrives (mirrors HTML `<p>`). The body stream may contain **inline** children — inline whitelist only: `a`, `tag`, `b`/`strong`, `em`, `mark`, `spin`, `sub`/`sup`, `code`.

```dsl
[p First [a u:# register], then run [b npm install].]   ✅ inline children sit inside the body
```

- **Container mode** (no body text, only attrs or empty): `[p]...[/p]`, `[p v:muted]...[/p]`. It collects **all** children until `[/p]`. When a paragraph must hold **block-level** components like `btn`/`form`/`card`/`list`/`table`/another `[p]`, use this mode and list children one per line.

```dsl
[p]
[btn tx:Agree clk:agree]
[btn tx:Decline v:danger clk:reject]
[/p]
```

**Common mistake** — stuffing a block component into a leaf-mode body stream:

```dsl
[p Click [btn tx:Submit] to continue.]   ❌ btn is not in the inline whitelist; leaf p auto-closes on [btn], which breaks out as a top-level sibling
```

Rule of thumb: paragraph holds `btn`/`form`/`card`/`list`/`table` or any container → container mode `[p]...[/p]`; holds `a`/`tag`/`strong` inline or plain text → leaf mode `[p text]`. Full inline whitelist: `src/core/parser.js` `P_INLINE_CHILDREN`.

<Playground dsl='[p Leaf mode allows [a u:# tx:inline link] and [b inline bold] children.][p][btn tx:block btn in container clk:ok][btn tx:another v:danger clk:cancel][/p]' />

## Body text shaped like `word:value` (e.g. `Q:` `A:`) is parsed as an attribute

For every token after `[`, the parser checks for an ASCII `:`: as long as the part before `:` is an English identifier (`Q`, `A`, `step`, `note`, `id`… all qualify), the whole `key:value` is treated as an **attribute**. So a "Q&A prefix" like this loses all its body text:

```dsl
[p Q:How to submit?]            ❌ no space: Q becomes the attr name, the whole sentence its value — paragraph body empty, nothing renders
[p Q: How to submit?]            ❌ with space: the Q: prefix is eaten as an attribute, only "How to submit?" remains
```

This applies to any text component: `item`, `h1~h6`, `callout`'s `tt`, etc. **Three fixes**:

```dsl
[p Q：How to submit?]       ✅ full-width colon ：（parser only matches ASCII :, full-width counts as text）
[p Q How to submit?]         ✅ drop the colon, fold the prefix into the body
[p "Q: How to submit?"]      ✅ wrap the whole body in double quotes (literal text)
```

For Q&A scenarios prefer the full-width `：` or no prefix at all — don't write `Q:`/`A:` as a Markdown-style prefix into the DSL.

## Text containing literal `[` `]` must be wrapped in double quotes

`[` is the tag-start character. When the body text of a normal component (`item`, `p`, `h1–h6`, card title `tt`, etc.) contains a literal `[` or `]`, it is misread as a nested child tag — the content gets truncated and the tail becomes an orphan node:

```dsl
[item Math.random() returns [0, 1) float]   ❌ [0 parsed as a child tag, item body truncated to "Math.random() returns"
```

**Fix: wrap the whole body in double quotes** — brackets inside the quotes are kept literal and do not trigger tag parsing:

```dsl
[item "Math.random() returns [0, 1) float"]   ✅
[item "array arr[0] and arr[1]"]              ✅
[p "coefficient range [0, 1) half-open"]      ✅
```

> Note: text inside double quotes is treated as a **literal string in full** — any `[tag]` within is also no longer parsed as a child. If you need both a literal bracket and a real nested child, quote only the bracketed literal and keep the child tag outside the quotes.

Body text without `[` `]` needs no quoting.

## Don't embed component tags in attribute values (`tx`/`l` quoted vs real child)

Writing a whole component tag inside an attribute value (`tx`, `l`, `tt`…) triggers tag parsing on `[` — the nested tag's own `]` is read as the outer tag's closing bracket. The result: the attribute value goes empty, the embedded `[tag]` leaks out as a **real** child component (wrong place/semantics), and trailing body text becomes orphan nodes:

```dsl
[item l:Table tx:[table]a,b[/table] is used]   ❌ tx goes empty, [table] leaks as a real child, body becomes orphan
```

Two ways out, depending on intent:

- **Want `[table]` shown as literal text** (docs, examples) → wrap the whole attribute value in **double quotes** — brackets inside become literal, no tag parsing:

```dsl
[item l:Table tx:"[table]a,b[/table] is used"]   ✅ tx keeps the literal value "[table]a,b[/table] is used"
```

- **Want a real table rendered** → **don't** stuff it into `tx`/`l`; pull `[table]...[/table]` out as a real child of a container:

```dsl
[item l:Table][table]a,b[/table][/item]   ✅ table is a real child of item
[card tt:Table][table]a,b[/table][/card]  ✅ table as a card child
```

> **Rule**: double-quoting an attribute value makes **every** `[tag]` inside it a literal character. So when you want a real component, **never** quote it — pull the tag out of the attribute value and write it as a real child; quote only when you want literal text.

## Full reference

- In-site: the seven category docs above — every component has a prop table and a live example.
- Repo: full attribute tables and the container-type list live in [`TOKUI_DSL_REFERENCE.md`](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md).
- Source of truth: containers in `src/core/parser.js` (`CONTAINERS`), boolean attrs in `BOOLEAN_ATTRS`, variant whitelist in `src/core/renderer.js` (`VARIANTS`).
