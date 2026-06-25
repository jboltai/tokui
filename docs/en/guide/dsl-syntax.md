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

> `clk:` / `sub:` handlers must be pre-registered via `TokUI.registerHandler(name, fn)` — the server ships no executable code.

## Boolean attributes

Just the key, no value:

```
stripe dis ro req chk multi auto plain round closable bordered open
pill dot leaf inline rounded container
```

## Variants

`v:primary` generates class `tokui-{type}--primary`. Combine with commas: `v:"primary,sm,pill"`. Unknown variants are silently dropped (whitelist).

| Component | Allowed variants |
|-----------|------------------|
| `btn` | `primary` `danger` `success` `warning` `ghost` `sm` `lg` `pill` `block` |
| `card` | `highlight` `flat` `bordered` `center` `right` |
| `h1~h6` | `left` `center` `right` `ribbon` `underline` `badge` |
| `p` | `left` `center` `right` `muted` `bold` `sm` `lg` |

<Playground dsl='[h1 v:underline Decorated title][p v:muted Muted text][p v:bold Bold text][dv v:dashed Divider with text]' />

## Dynamic update

`[upd]` updates an already-rendered component:

```text
[progress id:prog v:0 l:Progress]
[upd id:prog v:50]
[upd id:prog v:100 status:success]
```

<Playground dsl='[stat tt:Visits v:12345 trend:up][stat tt:Rate v:3.2 suf:% trend:down]' />

## Component categories

The 150+ components are organized into seven categories, each with full prop tables and editable examples:

| Category | Representative components | Docs |
|----------|--------------------------|------|
| Basic | headings, buttons, tags, callouts, progress, stats, Markdown, code | [basic](/en/components/basic) |
| Form | input, select, switch, slider, rate, date, cascader, transfer, upload | [form](/en/components/form) |
| Layout | card, grid, tabs, collapse, drawer, dialog, timeline, tree | [layout](/en/components/layout) |
| Data Display | table, descriptions, pagination, badge, avatar, skeleton, result, empty | [data](/en/components/data) |
| Chart | bar, line, pie, radar, scatter, gantt, funnel (pure SVG, zero deps) | [chart](/en/components/chart) |
| AI Chat | bubble, tool-call, thought chain, diff, plan, terminal, sandbox, artifact | [ai-chat](/en/components/ai-chat) |
| Showcase | signup form, CRUD, form+table linkage, report-style cards | [showcase](/en/components/showcase) |

## Raw content mode

Inside `code`, `md`, `diff`, `terminal`, `sandbox`, and `artifact-code` containers, `[` is treated as a literal character (not parsed as a tag) until the matching `[/type]`. So brackets inside code snippets never break parsing.

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

## Full reference

- In-site: the seven category docs above — every component has a prop table and a live example.
- Repo: full attribute tables and the container-type list live in [`TOKUI_DSL_REFERENCE.md`](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md).
- Source of truth: containers in `src/core/parser.js` (`CONTAINERS`), boolean attrs in `BOOLEAN_ATTRS`, variant whitelist in `src/core/renderer.js` (`VARIANTS`).
