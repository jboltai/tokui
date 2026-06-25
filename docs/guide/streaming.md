# 流式渲染

TokUI 的核心能力是**流式增量渲染**：解析器基于状态机，输入一个字符就能推进状态，无需等待完整字符串。这让 AI 逐 Token 输出时，前端能边收边画。

## 状态机解析

解析器在三个状态间切换：

| 状态 | 含义 |
|------|------|
| `TEXT` | 普通正文，原样输出为文本节点 |
| `TAG_OPEN` | 遇到 `[`，正在读取开标签的属性与内容 |
| `TAG_CLOSE` | 遇到 `[/`，正在读取闭标签 |

由于状态可中途暂停，**任意位置切断的输入都能正确处理** —— 这是流式安全的基础。

## feed() 增量 API

```js
const tokui = new TokUI.TokUI({ container: '#app' });
tokui.startStream();          // 进入流式模式
tokui.feed('[card tt:');
tokui.feed('流式卡片]');
tokui.feed('[p 内容边到边渲染]');
tokui.feed('[/card]');
tokui.endStream();            // 结束流式，刷出缓冲区残余
```

- `startStream(container?)`：开启流式，可指定挂载点。
- `feed(chunk)`：喂入一个分片，立即增量解析并渲染。
- `endStream()`：结束流式，刷出缓冲区内未闭合的内容。
- 构造函数 `onEvent(type, data)` 回调接收 `'streamEnd'` 等事件。

## SSE 接入

`connect()` 封装了 EventSource，对接服务端 SSE：

```js
const tokui = new TokUI.TokUI({
  container: '#chat',
  onEvent: (type, data) => {
    if (type === 'streamEnd') console.log('完成');
  },
});
tokui.connect('/api/chat', { prompt: '画一个登录卡片' });
```

**SSE 协议约定**：

- 每个 `data:` 行内为 JSON，取其中的 `tokui` 字段作为 DSL 分片喂给解析器。
- `[DONE]` 标记流结束。

服务端可用 `TokUIBuilder.toChunks()` 把 DSL 切成分块数组，逐块 `data:` 推送。

<Playground dsl='[think open tt:思考过程]用户想要登录卡片，需要用户名、密码、提交按钮…[/think][card tt:登录][input l:用户名 ph:请输入 req][pwd l:密码 ph:请输入 req][btn tx:登录 v:primary sub:login block][/card]' />

## 资源防护

为防止恶意或超长输入耗尽资源：

- `maxBuffer`（默认 **1MB**）：单次解析缓冲上限。
- `maxDepth`（默认 **100**）：嵌套深度上限。

超限会抛出错误并由渲染器降级处理，不会崩溃整页。
