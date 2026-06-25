# C# / .NET SDK

> 🚧 **Under active development** · Status: Evaluating
>
> The API described here is still being designed and is **not yet implemented**. Interested in contributing or have a requirement? Drop a note in [GitHub Issues](https://github.com/jboltai/tokui/issues).

## Goal

The C# / .NET SDK will provide a chained API aligned with the Node.js [`TokUIBuilder`](./builder) for generating TokUI DSL strings on ASP.NET Core and similar backends, paired with SSE streaming to the frontend.

## Proposed usage

> Draft design only — the final API may change.

```csharp
var b = new TokUIBuilder();
b.Card(tt: "Card").H2("Content").P("Desc").End();
Console.WriteLine(b.ToString());
// [card tt:Card][h2 Content][p Desc][/card]
```

Chunked output for ASP.NET Core SSE streaming:

```csharp
var chunks = b.Reset()
    .Card(tt: "Card")
    .P("Content")
    .End()
    .ToChunks();
foreach (var chunk in chunks) {
    // push
}
```

## Scope (aligned with the Node.js version)

- Chained calls: self-closing / containers (`Open` / `End`)
- `ToString()` one-shot output, `ToChunks()` chunked `IEnumerable<string>`
- Auto-closing unclosed containers
- Naming workaround: `RowLayout()` / `ColLayout()`

## Progress

- [ ] Core chained API
- [ ] Auto-close / chunked output
- [ ] Output-parity tests vs Node.js
- [ ] NuGet release

See the [Node.js Builder docs](./builder) for the full feature set.
