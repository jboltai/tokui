# Streaming

TokUI's core strength is **streaming incremental rendering**. The parser is a state machine — one character advances the state — so it never needs the full string. As the LLM emits tokens, the frontend draws continuously.

## State machine

| State | Meaning |
|-------|---------|
| `TEXT` | Plain text — emitted as text nodes |
| `TAG_OPEN` | Saw `[`, reading attributes/content |
| `TAG_CLOSE` | Saw `[/`, reading the close tag |

Because the state can pause anywhere, **input cut at any position is handled correctly** — the foundation of streaming safety.

## feed() API

```js
const tokui = new TokUI.TokUI({ container: '#app' });
tokui.startStream();          // enter streaming mode
tokui.feed('[card tt:');
tokui.feed('Streaming card]');
tokui.feed('[p Renders as it arrives]');
tokui.feed('[/card]');
tokui.endStream();            // flush remaining buffer
```

- `startStream(container?)` — begin streaming.
- `feed(chunk)` — feed a slice; parsed and rendered immediately.
- `endStream()` — finish streaming, flush buffer.
- Constructor `onEvent(type, data)` receives `'streamEnd'` etc.

## SSE

`connect()` wraps EventSource:

```js
const tokui = new TokUI.TokUI({
  container: '#chat',
  onEvent: (type) => { if (type === 'streamEnd') console.log('done'); },
});
tokui.connect('/api/chat', { prompt: 'Draw a login card' });
```

**Protocol**: each `data:` line is JSON; its `tokui` field is the DSL chunk. `[DONE]` ends the stream.

Server-side, `TokUIBuilder.toChunks()` slices the DSL into chunks for incremental SSE push.

<Playground dsl='[think open tt:Reasoning]User wants a login card — needs username, password, submit…[/think][card tt:Login][input l:Username ph:Enter req][pwd l:Password ph:Enter req][btn tx:Login v:primary sub:login block][/card]' />

## Streaming render priority (how components stream)

Components stream differently. Three tiers by UX:

| Tier | Behavior | Components |
|---|---|---|
| **① True streaming** (progressive) | content renders char-by-char / cell-by-cell | text inside containers (`[card]text[/card]`, `[callout]text[/callout]`, `[p]text[/p]`, list/item); `[tr]` cell-level; `[chart]` preview redraw; table action column `btn:` per-button; `[thead]`/`[tbody]` |
| **② Skeleton → swap** | a `.tokui-stream-skeleton` pulse placeholder mounts on tag-open, swapped to the real node at `]` | strictly self-closing big blocks: `stat` `img` `avatar` `result` `empty` `video` `audio` `file` `attach` `commit` |
| **③ One-shot pop-in** | rendered as a whole at `]` (no placeholder) | small widgets: `tag` `badge` `dot` `btn` `a` `progress` `rate` `slider` `switch` `input` `pwd` `h1~h6` (short) `hr` |

### Big-text components: prefer container mode (true streaming)

`callout` / `code` / `md` / `terminal` / `diff` support **both** self-closing and container forms. **In streaming contexts prefer container mode** — text streams char-by-char instead of popping in at `]`:

```
# Self-closing (pop-in, text does NOT stream) — capability kept, for one-shot
[callout t:info tx:"A relatively long explanation..."]

# Container mode (true streaming, text char-by-char) — recommended for streaming
[callout t:info]A relatively long explanation...[/callout]
[code lang:js]const x = 1;[/code]
[md]## Title
Body streams char-by-char...[/md]
```

> **Literal brackets**: inside container mode, `[xxx]` is parsed as a child component. To show a literal `[img]`, use full-width brackets `［img］`, or fall back to self-closing `tx:"...[img]..."` (quoted = literal).

### Strictly self-closing big blocks: auto skeleton

`stat`/`img`/`avatar`/`result`/`empty`/`video`/`audio`/`file`/`attach`/`commit` cannot be containerized; the framework auto-mounts a skeleton placeholder during streaming (no DSL change needed), swapped to the real node at `]` to avoid a jarring pop-in hole. Small widgets (tag/btn/…) stay pop-in (a skeleton flash is worse than a quick pop).

## Resource guards

- `maxBuffer` (default **1MB**) — single parse buffer ceiling.
- `maxDepth` (default **100**) — nesting depth ceiling.

Overruns throw and degrade gracefully — the page never crashes.
