# Rust SDK

> 🚧 **Under active development** · Status: Planned
>
> The API described here is still being designed and is **not yet implemented**. Interested in contributing or have a requirement? Drop a note in [GitHub Issues](https://github.com/jboltai/tokui/issues).

## Goal

The Rust SDK will provide a chained API aligned with the Node.js [`TokUIBuilder`](./builder) for generating TokUI DSL strings on a Rust backend, paired with SSE streaming to the frontend. Emphasis on zero dependencies and high-throughput streaming.

## Proposed usage

> Draft design only — the final API may change.

```rust
use tokui::TokUIBuilder;

let mut b = TokUIBuilder::new();
b.card(tt("Card")).h2("Content").p("Desc").end();
println!("{}", b.to_string());
// [card tt:Card][h2 Content][p Desc][/card]
```

Chunked output for SSE streaming:

```rust
let chunks: Vec<String> = b.reset()
    .card(tt("Card"))
    .p("Content")
    .end()
    .to_chunks();
for chunk in chunks {
    // SSE push
}
```

## Scope (aligned with the Node.js version)

- Chained calls: self-closing / containers (`open` / `end`)
- `to_string()` one-shot output, `to_chunks()` chunked `Vec<String>`
- Auto-closing unclosed containers
- Naming workaround: `row_layout()` / `col_layout()`

## Progress

- [ ] Core chained API
- [ ] Auto-close / chunked output
- [ ] Output-parity tests vs Node.js
- [ ] crates.io release

See the [Node.js Builder docs](./builder) for the full feature set.
