# Go SDK

> 🚧 **Under active development** · Status: Planned
>
> The API described here is still being designed and is **not yet implemented**. Interested in contributing or have a requirement? Drop a note in [GitHub Issues](https://github.com/jboltai/tokui/issues).

## Goal

The Go SDK will provide a chained API aligned with the Node.js [`TokUIBuilder`](./builder) for generating TokUI DSL strings on a Go backend, paired with SSE streaming to the frontend.

## Proposed usage

> Draft design only — the final API may change.

```go
b := tokui.NewBuilder()
b.Card(tokui.Attr{"tt": "Card"}).H2("Content").P("Desc").End()
fmt.Println(b.ToString())
// [card tt:Card][h2 Content][p Desc][/card]
```

Chunked output for SSE streaming:

```go
chunks := b.Reset().
    Card(tokui.Attr{"tt": "Card"}).
    P("Content").
    End().
    ToChunks()
for _, c := range chunks {
    // SSE push
}
```

## Scope (aligned with the Node.js version)

- Chained calls: self-closing / containers (`Open` / `End`)
- `ToString()` one-shot output, `ToChunks()` chunked `[]string`
- Auto-closing unclosed containers
- Naming workaround: `RowLayout()` / `ColLayout()`

## Progress

- [ ] Core chained API
- [ ] Auto-close / chunked output
- [ ] Output-parity tests vs Node.js
- [ ] Module release (`go get`)

See the [Node.js Builder docs](./builder) for the full feature set.
