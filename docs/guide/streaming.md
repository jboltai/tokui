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

## 流式渲染优先级（组件如何流）

不同组件在流式下表现不同，按"用户体验"分三档：

| 档 | 行为 | 组件 |
|---|---|---|
| **① 真流式**（边到边渲染） | 内容逐字/逐格渐显 | 容器内文本（`[card]文[/card]`、`[callout]文[/callout]`、`[p]文[/p]`、list/item）；`[tr]` cell 级；`[chart]` 预览重绘；表格操作列 `btn:` 逐钮；`[thead]`/`[tbody]` |
| **② 骨架占位→转正** | 开标签到达即挂 `.tokui-stream-skeleton` 脉冲占位，`]` 到达原地 swap 为真节点 | 纯自闭合大块：`stat` `img` `avatar` `result` `empty` `video` `audio` `file` `attach` `commit` |
| **③ 一次性 pop-in** | `]` 处整渲染（无占位） | 小件：`tag` `badge` `dot` `btn` `a` `progress` `rate` `slider` `switch` `input` `pwd` `h1~h6`(短) `hr` 等 |

### 大文本组件：优先容器模式（真流式）

`callout` / `code` / `md` / `terminal` / `diff` 等同时支持**自闭合**与**容器**两种写法。**流式场景优先容器模式**——文本逐字渐显，而非 `]` 处一次性 pop-in：

```
# 自闭合（pop-in，文本不流）——能力保留，适合一次性渲染
[callout t:info tx:"一段较长的说明文字..."]

# 容器模式（真流式，文本逐字）——流式场景推荐
[callout t:info]一段较长的说明文字...[/callout]
[code lang:js]const x = 1;[/code]
[md]## 标题
正文逐字流式...[/md]
```

> **字面方括号**：容器模式内 `[xxx]` 会被解析为子组件。若文本需显示字面 `[img]`，用全角括号 `［img］` 或改自闭合 `tx:"...[img]..."`（引号内为字面）。

### 纯自闭合大块：自动骨架占位

`stat`/`img`/`avatar`/`result`/`empty`/`video`/`audio`/`file`/`attach`/`commit` 无法容器化，流式期框架自动挂骨架占位（无需写法改动），`]` 到达平滑替换为真节点，避免空洞 pop-in。小件（tag/btn 等）保持 pop-in（骨架一闪反不如直接出）。

## 资源防护

为防止恶意或超长输入耗尽资源：

- `maxBuffer`（默认 **1MB**）：单次解析缓冲上限。
- `maxDepth`（默认 **100**）：嵌套深度上限。

超限会抛出错误并由渲染器降级处理，不会崩溃整页。
