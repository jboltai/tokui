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

## Resource guards

- `maxBuffer` (default **1MB**) — single parse buffer ceiling.
- `maxDepth` (default **100**) — nesting depth ceiling.

Overruns throw and degrade gracefully — the page never crashes.
