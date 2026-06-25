# Java SDK

> 🚧 **Under active development** · Status: Planned
>
> The API described here is still being designed and is **not yet implemented**. Interested in contributing or have a requirement? Drop a note in [GitHub Issues](https://github.com/jboltai/tokui/issues).

## Goal

The Java SDK will provide a chained API aligned with the Node.js [`TokUIBuilder`](./builder) for generating TokUI DSL strings on Java / Spring backends, paired with SSE streaming to the frontend.

## Proposed usage

> Draft design only — the final API may change.

```java
TokUIBuilder b = new TokUIBuilder();
b.card(Map.of("tt", "Card")).h2("Content").p("Desc").end();
System.out.println(b.toString());
// [card tt:Card][h2 Content][p Desc][/card]
```

Chunked output for Spring SSE streaming:

```java
List<String> chunks = b.reset()
    .card(Map.of("tt", "Card"))
    .p("Content")
    .end()
    .toChunks();
// push each chunk as a Flux<String>
```

## Scope (aligned with the Node.js version)

- Chained calls: self-closing / containers (`open` / `end`)
- `toString()` one-shot output, `toChunks()` chunked `List<String>`
- Auto-closing unclosed containers
- Naming workaround: `rowLayout()` / `colLayout()`

## Progress

- [ ] Core chained API
- [ ] Auto-close / chunked output
- [ ] Output-parity tests vs Node.js
- [ ] Maven Central release

See the [Node.js Builder docs](./builder) for the full feature set.
