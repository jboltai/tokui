# Introduction

## Why TokUI

An LLM's output is fundamentally **a stream of plain text** — what users end up with is usually a dense wall of words.

TokUI gives AI **a structured expression language**: with very few tokens, it streams rich, interactive UI. Tables, charts, forms, agent status, and artifact previews can appear in the conversation as they're generated, instead of waiting for a slow block of Markdown to unfold.

One-line positioning: **let AI produce rich UI from minimal tokens, streamed live**.

## What it is

TokUI is a **zero-dependency streaming UI description and rendering framework**. A three-layer dataflow, frictionless across three tiers:

```
Backend TokUIBuilder emits DSL  →  SSE / WebSocket push  →  Frontend TokUIParser (incremental)  →  TokUIRenderer  →  DOM
```

One component semantics end to end: the Builder chains out DSL, the Parser state-machines through it incrementally, the Renderer turns each tag into real DOM. Drawing starts at the first token — no need to wait for the whole thing to close.

## Core features

- **Streaming-first** — a state machine (TEXT / TAG_OPEN / TAG_CLOSE) parses incrementally, rendering as bytes arrive. A perfect match for token-by-token AI output.
- **Token-economical** — a minimal DSL (`key:value`, comma multi-values, boolean attrs, nesting); the same UI costs far fewer tokens than HTML or a JSON Schema.
- **Zero-dependency** — native APIs only, no npm packages at runtime. Charts are pure SVG, highlighting is a hand-written tokenizer, the bundle stays tiny.
- **150+ components** — basic, form, table, layout, data display, chart, and AI-chat coverage out of the box; `renderer.register(type, fn)` is pluggable.
- **Chat-native** — built-in bubble, tool-call, reasoning-chain, code-diff, agent-status, and artifact-preview components for AI conversations.
- **Event-safe** — handlers are named references (`clk:` / `sub:`) that must be pre-registered with `registerHandler`; the DSL carries no executable code, eliminating injection at the root.
- **Theme & palettes** — CSS variables + `data-tokui-theme` toggle light/dark, with a built-in HSB 10-step palette generator.
- **Fault-tolerant** — unknown components render as `div.tokui-unknown`, render errors produce a fallback notice; a single failure never breaks the page, streaming stays robust.

## Key metrics

| Metric | Value | Meaning |
|--------|-------|---------|
| Runtime npm deps | **0** | Native APIs throughout |
| Registered components | **150+** | Out of the box |
| Highlighted languages | **11** | Hand-written tokenizer |
| Per-chunk incremental parse | **&lt;1ms** | First token renders immediately |

## Architecture overview

| Module | Responsibility |
|--------|----------------|
| `core/parser.js` | Streaming state-machine parser, `feed()` incremental + `parse()` one-shot, `maxBuffer` / `maxDepth` guards |
| `core/renderer.js` | Render engine, `slotStack` for nested containers, `VARIANTS` whitelist, depth cap 50 |
| `core/event-bus.js` | Event bus singleton, `registerHandler(name, fn)`, DSL binds via `clk:` / `sub:` |
| `core/theme.js` | CSS-variable theme manager, `data-tokui-theme` toggle |
| `core/color-generator.js` | HSB 10-step palette & theme token generator |
| `components/*` | Component library by category, `index.js` registers all |
| `server/tokui-builder.js` | Chainable DSL builder, `toString()` + `toChunks()` |
| `server/sse-server.js` | SSE demo server on Node native http |

## Try it

A typical TokUI render — edit the DSL on the left, preview live on the right:

<Playground dsl='[card tt:"TokUI at a glance" v:highlight][row][col span:7][h3 📊 Data table][table stripe][thead cols:"chk,#,Metric/c,Value,Trend/r"][tbody][tr chk,,MAU,128k,↑12%][tr chk,,Retention,64%,↑3%][tr chk,,Revenue,$39k,↑18%][/tbody][/table][/col][col span:5][h3 📈 Trend][chart t:line tt:"Last 6 months" l:"Jan,Feb,Mar,Apr,May,Jun" d:"42,55,48,70,82,95" area][/col][/row][callout t:info tt:Zero-dep tx:"The table, chart, and card above are all streamed from roughly 20 tokens of DSL — no frontend dependencies."][/card]' />
