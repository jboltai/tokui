# AI Chat Components

Components built for AI chat scenarios: message bubbles, reasoning chains, tool calls, agent status, plans and test results, cited sources, code diffs, terminals, file trees, artifacts, and more. Each example shows the formatted, highlighted TokUI DSL on the left and the live render on the right; click "Edit" to tweak it instantly.

## Reasoning Block `think`

A collapsible reasoning-process container, closed by `[/think]`. `open` expands by default, `tt` sets the title.

| Prop | Meaning | Example |
|------|---------|---------|
| `tt` | Title | `tt:思考过程` |
| `open` | Expanded by default | `open` |

<Playground dsl='[think open tt:思考过程][p 用户需要登录界面，应包含用户名、密码、提交按钮，并做必填校验。[/think][think tt:已折叠][p 默认收起，点击标题展开查看。[/think]' />

## Reasoning Chain `think-chain` / `think-step`

A step-by-step reasoning container. `think-chain` sets the overall title; each `think-step` shows its status, title, and duration.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `tt` | Overall title | `think-chain` |
| `status` | Step status (`pending`/`running`/`done`/`error`) | `think-step` |
| `tt` | Step title | `think-step` |
| `dur` | Duration | `think-step` |

<Playground dsl='[think-chain tt:分析用户问题][think-step status:done tt:理解需求 dur:0.3s][p 解析为"生成登录表单"任务][/think-step][think-step status:done tt:检索设计模式 dur:0.8s][p 找到 3 种参考实现[/think-step][think-step status:running tt:生成代码][p 正在输出表单组件…[/think-step][/think-chain]' />

## Chat Bubble `bubble`

A chat message container. `role` aligns the bubble left/right; `model` and `time` appear in the meta row.

| Prop | Meaning | Example |
|------|---------|---------|
| `role` | Role (`user` / `ai`) | `role:ai` |
| `model` | Model name (AI side) | `model:GLM-5.2` |
| `time` | Time text | `time:刚刚` |

<Playground dsl='[bubble role:user][p 帮我设计一个登录界面[/bubble][bubble role:ai model:GLM-5.2 time:刚刚][p 好的！已为你生成登录卡片：[/bubble]' />

## Toolbar `toolbar`

A horizontal action bar, usually placed at the top or bottom of a bubble.

| Prop | Meaning | Example |
|------|---------|---------|
| `pos` | Position | `pos:bottom` |
| `align` | Alignment | `align:right` |

<Playground dsl='[toolbar align:right][btn tx:复制 v:ghost sm][btn tx:重新生成 v:ghost sm][btn tx:分享 v:ghost sm][/toolbar]' />

## Tool Call `tool-call`

A tool/function-call card showing the name, status, and duration. Status is color-coded: `pending`/`running`/`done`/`error`/`denied`.

| Prop | Meaning | Example |
|------|---------|---------|
| `name` | Tool name | `name:web_search` |
| `status` | Status | `status:done` |
| `duration` | Duration | `duration:1.2s` |
| `id` | Identifier (updatable via `upd`) | `id:tc1` |

<Playground dsl='[tool-call name:web_search status:done duration:1.2s][p 已搜索「TokUI 流式 UI」，找到 8 条结果。[/tool-call][tool-call name:run_code status:running][p 正在执行 Python 代码…[/tool-call][tool-call name:read_file status:error duration:0.4s][p 文件不存在。[/tool-call]' />

## Typing Indicator `typing`

A "typing" three-dot animation, self-closing. `text` shows text alongside it.

| Prop | Meaning | Example |
|------|---------|---------|
| `text` | Hint text | `text:思考中` |

<Playground dsl='[bubble role:ai][typing text:正在生成回复][/bubble]' />

## Quick Reply `quick-reply`

A one-line quick-reply suggestion, self-closing container. `items` separates multiple suggestions with `|`.

| Prop | Meaning | Example |
|------|---------|---------|
| `items` | Suggestion list (`|`-separated) | `items:"A|B|C"` |

<Playground dsl='[p v:muted 你可能想问：][quick-reply items:"如何接入 SSE？|支持哪些图表？|怎样自定义主题？|DSL 怎么写？"][/quick-reply]' />

## Suggestion Cards `suggestions` / `suggestion`

A grid suggestion container; child `suggestion` nodes show title, description, and icon. `cols` on `suggestions` controls the column count.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `cols` | Column count | `suggestions` |
| `clk` | Unified click handler | `suggestions` |
| `tt` | Title | `suggestion` |
| `tx` | Description | `suggestion` |
| `icon` | Icon | `suggestion` |
| `clk` | Click handler | `suggestion` |
| `dis` | Disabled | `suggestion` |

<Playground dsl='[suggestions cols:2][suggestion tt:快速入门 tx:五分钟跑起第一个组件 clk:a][suggestion tt:DSL 语法 tx:掌握组件描述语言 clk:b][suggestion tt:流式渲染 tx:理解增量解析原理 clk:c][suggestion tt:主题定制 tx:打造品牌视觉 clk:d][/suggestions]' />

## Cited Source `source`

A cited retrieval source / reference, self-closing. Typically listed as numbered `[1] [2]` citations under a "web search" answer.

| Prop | Meaning | Example |
|------|---------|---------|
| `n` | Index | `n:1` |
| `tt` | Title (quote if it has spaces) | `tt:"TokUI 官方文档"` |
| `sn` | Snippet excerpt (quote if it has spaces) | `sn:"零依赖流式 UI…"` |
| `u` / `url` | Link | `u:https://tokui.jboltai.com` |

> `tt`/`sn` values containing spaces must be double-quoted, otherwise they get truncated at the first space.

<Playground dsl='[card tt:参考来源][source n:1 tt:"TokUI 官方文档" sn:"零依赖流式 UI 描述与渲染框架" u:#][source n:2 tt:"SSE 协议规范" sn:"Server-Sent Events 实时推送" u:#][source n:3 tt:"MDN Web Docs" sn:"Using Server-Sent Events to push updates" u:#][/card]' />

## Code Diff `diff`

A code-diff container with line numbers and red/green coloring. `+`/`-` lines are colored; other lines are context. **Raw content mode**: inner `[` is treated as literal text until `[/diff]`.

| Prop | Meaning | Example |
|------|---------|---------|
| `title` | Title | `title:修复登录校验` |
| `lang` | Language tag | `lang:js` |

<Playground dsl='[diff title:修复登录校验 lang:js]- function login(user) {\n-   return true;\n- }\n+ function login(user, pwd) {\n+   if (!user || !pwd) return false;\n+   return verify(user, pwd);\n+ }[/diff]' />

> Use `\n` for line breaks: lines starting with `+` are additions (green), `-` are deletions (red), and the rest are context lines (gray).

## Execution Plan `plan` / `plan-step`

A task-plan checklist container. `plan` sets the title; each `plan-step` is one step, color-coded by `status`.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `tt` | Plan title | `plan` |
| `status` | Step status (`pending`/`running`/`done`/`error`/`skipped`) | `plan-step` |
| `tt` | Step title | `plan-step` |
| `desc` | Step description | `plan-step` |

<Playground dsl='[plan tt:重构登录模块][plan-step status:done tt:梳理现有代码][plan-step status:done tt:抽取校验逻辑][plan-step status:running tt:替换为新组件 desc:迁移到 TokUI form 组件][plan-step status:pending tt:补充单元测试][/plan]' />

## Agent Status `agent`

An agent-collaboration card showing name, status, current action, and duration; supports streaming status updates.

| Prop | Meaning | Example |
|------|---------|---------|
| `name` | Name | `name:资料研究员` |
| `status` | Status (`idle`/`running`/`paused`/`done`/`error`) | `status:running` |
| `action` | Current action | `action:正在检索文档` |
| `duration` | Duration | `duration:8s` |
| `id` | Identifier (status updatable via `upd`) | `id:agent1` |

<Playground dsl='[agent name:资料研究员 status:running action:正在检索文档][p 已查阅 12 篇资料…[/agent][agent name:代码工程师 status:done action:已生成代码 duration:8s][p 完成实现。[/agent][agent name:测试工程师 status:paused action:等待人工确认][/agent]' />

## File Tree `file-tree` / `ft-folder` / `ft-file`

A file-tree container with `ft-folder` children (nestable) and `ft-file` leaves.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `name` | Name | both |
| `open` | Expanded by default | `ft-folder` |
| `badge` | Badge (e.g. `M` modified / `A` added / `D` deleted) | `ft-file` |

<Playground dsl='[file-tree][ft-folder name:src open][ft-folder name:components open][ft-file name:basic.js badge:M][ft-file name:form.js badge:A][/ft-folder][ft-file name:lib.js][/ft-folder][ft-folder name:tests][ft-file name:test-parser.js badge:D][/ft-folder][ft-file name:package.json badge:M][/file-tree]' />

## Terminal `terminal`

A container for terminal commands and output. `title` is the window title; `status` is the execution result status. **Raw content mode**: inner `[` is treated as literal text.

| Prop | Meaning | Example |
|------|---------|---------|
| `title` | Window title | `title:bash` |
| `status` | Execution status | `status:success` |

<Playground dsl='[terminal title:bash status:success]$ npm install\n$ npm run dev\n\n✓ 服务已启动: http://localhost:5173[/terminal]' />

## Code Sandbox `sandbox`

A code-sandbox container with live preview that can execute HTML/CSS/JS. **Raw content mode**: inner `[` is treated as literal text, closed by `[/sandbox]`.

| Prop | Meaning | Example |
|------|---------|---------|
| `lang` | Language | `lang:html` |
| `title` | Title | `title:实时预览` |
| `height` | Preview height | `height:160` |

<Playground dsl='[sandbox title:Hello 卡片 lang:html height:160]<div style="padding:24px;font-family:sans-serif;text-align:center">\n  <h2 style="color:#4f46e5">Hello TokUI</h2>\n  <button style="padding:8px 16px;background:#4f46e5;color:#fff;border:0;border-radius:6px">点我</button>\n</div>[/sandbox]' />

## Test Results `test-result` / `test-case` (shorthand `case`)

A test-run summary container; child `test-case` nodes (**shorthand `case`, equivalent**) list each individual case (`pass` green / `fail` red + error / `skip` gray).

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `pass` / `fail` / `skip` | Pass / fail / skip counts | `test-result` | `pass:3 fail:1` |
| `total` | Total count | `test-result` | `total:5` |
| `duration` | Total duration | `test-result` | `duration:"2.4s"` |
| `status` | Case status (`pass`/`fail`/`skip`) | `test-case` / `case` | `status:fail` |
| `name` | Case name (quote if it has spaces) | `test-case` / `case` | `name:"parser: basic tags"` |
| `duration` | Single-case duration | `test-case` / `case` | `duration:"0.12s"` |
| `error` | Error message (on `fail`; quote if spaces/brackets) | `test-case` / `case` | `error:"Expected [/card]"` |

> `name`/`error` containing spaces or `[` `]` must be double-quoted, otherwise they get truncated or misparsed.

<Playground dsl='[test-result pass:3 fail:1 skip:1 total:5 duration:"2.4s"][case status:pass name:"parser: basic tags" duration:"0.12s"][test-case status:pass name:"streaming incremental render" duration:"0.34s"][case status:fail name:"nested container close" duration:"0.08s" error:"Expected [/card] but got EOF"][case status:skip name:"SSE long-connection stress"][test-case status:pass name:"attr quote handling" duration:"0.21s"][/test-result]' />

## Git Commit `commit`

A git-commit info card, self-closing.

| Prop | Meaning | Example |
|------|---------|---------|
| `hash` | Commit hash (first 7 chars) | `hash:abc1234` |
| `msg` | Commit message (quote if it has spaces) | `msg:"fix: login validation"` |
| `author` | Author | `author:sdxiaomu` |
| `branch` | Branch | `branch:master` |
| `time` | Time (quote if it has spaces) | `time:"2 hours ago"` |
| `additions` / `deletions` | Added / deleted lines | `additions:12 deletions:5` |

> Values with spaces (e.g. `msg`, `time`) **must be double-quoted**, otherwise they get truncated at the first space (`msg:fix login bug` yields only `fix`).

<Playground dsl='[commit hash:dbc08be msg:"扩展案例库，优化模型配置" author:sdxiaomu branch:master time:"刚刚" additions:128 deletions:24][commit hash:a6d758e msg:"docs: 配置 VitePress 文档站" author:sdxiaomu branch:master time:"1 天前" additions:56 deletions:8]' />

## Message Quote `quote`

A container that quotes a historical message: `role` for the source role, `tx` for the quoted text, `msgid` for the original message identifier.

| Prop | Meaning | Example |
|------|---------|---------|
| `role` | Source role | `role:user` |
| `tx` | Quoted text | `tx:之前的提问` |
| `msgid` | Original message ID | `msgid:m1` |

<Playground dsl='[bubble role:ai][quote role:user tx:之前你提到 TokUI 支持流式渲染，能再讲讲吗？][/quote][p 当然，TokUI 通过 SSE 推送增量 DSL 片段…[/bubble]' />

## Latency Marker `latency`

A model-response latency / throughput indicator, self-closing. `v` is the value; `t` is the type (e.g. `ttfb` for time-to-first-byte, `tok/s` for tokens per second).

| Prop | Meaning | Example |
|------|---------|---------|
| `v` | Value | `v:320ms` |
| `t` | Type label | `t:ttfb` |

<Playground dsl='[toolbar align:right][latency v:320ms t:ttfb][latency v:48 tok/s t:throughput][/toolbar]' />

## Video `video` / Audio `audio`

Media players; both are self-closing.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `s` | Media URL | both | `s:https://.../mov.mp4` |
| `poster` | Cover image (shares the player's ratio box — same size & ratio) | `video` | `poster:https://.../pic.jpg` |
| `ratio` | Aspect ratio; fills the box when set | `video` | `ratio:"16:9"` / `"4:3"` / `"1:1"` / `"21:9"` |
| `w` | Width (plain number → px, otherwise literal `%`/`rem`) | both | `w:"320"` / `w:"50%"` |
| `h` | Height (overrides ratio) | `video` | `h:"180"` |
| `fit` | Fill: `cover` (crop, default when sized) / `contain` (letterbox, default when unsized) / `fill` | `video` | `fit:contain` |
| `tt` | Title (left-aligned) | `audio` | `tt:Demo audio` |
| `duration` | Duration (right-aligned) | `audio` | `duration:0:48` |

> **Cover & ratio**: `poster` is the `<video>`'s first frame. Setting `ratio` + `fit` makes the cover and the playback share one ratio box — same size, same ratio, no distortion. For a side-by-side row, wrap with `row` + `col span:6`.

```dsl
[video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 poster:https://picsum.photos/seed/p/640/360 ratio:"16:9"]
[video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"1:1" w:"320" h:"320" fit:cover]
[audio s:https://assets.vdata.chat/jboltai/horse.mp3 tt:Demo duration:0:48]
[row][col span:6][video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"16:9"][/col][col span:6][video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"16:9"][/col][/row]
```

<Playground dsl='[video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 poster:https://picsum.photos/seed/poster/640/360 ratio:"16:9"][row][col span:6][video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"1:1" fit:cover][/col][col span:6][video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"1:1" fit:contain][/col][/row][audio s:https://assets.vdata.chat/jboltai/horse.mp3 tt:演示音频 duration:0:48]' />

## Conversation List `conversations` / `conv`

A sidebar conversation-history container; child `conv` nodes are individual conversations.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `clk` | Unified switch handler | `conversations` | `clk:onSwitch` |
| `act` | Action endpoint | `conversations` | `act:conv-1` |
| `tt` | Conversation title (quote if spaces) | `conv` | `tt:"How to use SSE"` |
| `time` | Time (quote if spaces) | `conv` | `time:"today 14:20"` |
| `active` | Currently selected | `conv` | `active` |
| `act` | Single-item action | `conv` | `act:conv-2` |

> `tt`/`time` with spaces must be double-quoted, otherwise truncated at the first space.

<Playground dsl='[conversations][conv tt:"如何接入 SSE" time:"刚刚" active][conv tt:"DSL 语法学习" time:"今天 14:20"][conv tt:"主题定制方案" time:"昨天"][conv tt:"表格组件用法" time:"3 天前"][/conversations]' />

## Welcome Screen `welcome` / `welcome-feature` (shorthand `feature`)

A new-session welcome-screen container; child `welcome-feature` nodes (**shorthand `feature`, self-closing, equivalent**) are feature cards.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `tt` | Title | `welcome` | `tt:"Hi, I'm the assistant"` |
| `st` | Subtitle | `welcome` | `st:"How can I help?"` |
| `tt` | Card title | `welcome-feature` / `feature` | `tt:Write code` |
| `tx` | Card description | `welcome-feature` / `feature` | `tx:"Generate & debug code"` |
| `i` | Icon (`code` / `chart` / `doc`) | `welcome-feature` / `feature` | `i:chart` |
| `clk` | Click handler | `welcome-feature` / `feature` | `clk:onPick` |

> `[feature tt:x tx:y i:code]` is self-closing (recommended); `[welcome-feature ...][/welcome-feature]` is the container form — equivalent. Cards are attr-driven and render as each tag arrives (true streaming).

<Playground dsl='[welcome tt:"你好，我是 TokUI 助手" st:"有什么可以帮你？"][feature tt:写代码 tx:"生成与调试代码" i:code clk:a][feature tt:画图表 tx:"用纯 SVG 渲染数据" i:chart clk:b][feature tt:查文档 tx:"检索与总结资料" i:doc clk:c][/welcome]' />

## Attachments `attachments` / `attach`

An attachment-upload / list container; child `attach` nodes are individual attachment items. The `t` on `attach` decides the file-type icon color.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `clk` | Delete / click handler | `attachments` |
| `t` | File type (`image`/`pdf`/`word`/`excel`/`ppt`/`zip`/`code`/`video`/`audio`) | `attach` |
| `s` | File name | `attach` |
| `u` | Download URL | `attach` |
| `size` | Size | `attach` |
| `clk` | Click handler | `attach` |

<Playground dsl='[attachments clk:onRemove][attach t:pdf s:需求文档.pdf size:2.4 MB u:#][attach t:code s:app.js size:12 KB u:#][attach t:image s:设计稿.png size:580 KB u:https://picsum.photos/seed/att/120/80][attach t:excel s:数据统计.xlsx size:32 KB u:#][/attachments]' />

## Artifact `artifact` / `artifact-code` / `artifact-preview`

A side-preview Artifact container: use `artifact-code` for the code slot and `artifact-preview` for the live-preview slot inside.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `tt` | Title | `artifact` |
| `lang` | Language | `artifact` |
| `pos` | Panel position | `artifact` |
| `w` | Panel width | `artifact` |

<Playground dsl='[artifact tt:登录卡片 lang:html][artifact-code]<div class="card">\n  <h3>登录</h3>\n  <input placeholder="用户名"/>\n  <input placeholder="密码"/>\n  <button>提交</button>\n</div>[/artifact-code][artifact-preview]<div style="padding:16px;font-family:sans-serif"><h3 style="margin:0 0 8px">登录</h3><input placeholder="用户名" style="display:block;margin-bottom:8px;padding:6px"/><input placeholder="密码" style="display:block;margin-bottom:8px;padding:6px"/><button style="padding:6px 12px;background:#4f46e5;color:#fff;border:0;border-radius:4px">提交</button></div>[/artifact-preview][/artifact]' />

## Chat Input `chat-input`

A chat-input container with a send button. `auto` enables auto-growing height, `rows` sets the default row count, and `max` is the max character count.

| Prop | Meaning | Example |
|------|---------|---------|
| `ph` | Placeholder | `ph:输入消息…` |
| `clk` | Send handler | `clk:onSend` |
| `dis` | Disabled | `dis` |
| `auto` | Auto-grow height | `auto` |
| `rows` | Default rows | `rows:3` |
| `max` | Max characters | `max:2000` |

<Playground dsl='[chat-input ph:输入消息，按 Enter 发送 clk:onSend auto rows:2][/chat-input]' />

## Message Actions `msg-actions`

A message-action bar container at the bottom of a bubble; supports copy / regenerate / like-dislike toggles.

| Prop | Meaning | Example |
|------|---------|---------|
| `clk` | Generic handler | `clk:onAct` |
| `copy` | Show copy | `copy` |
| `regenerate` | Show regenerate | `regenerate` |
| `like` / `dislike` | Like / dislike | `like` |
| `visible` | Always visible (default: hover) | `visible` |

<Playground dsl='[bubble role:ai][p 这是一段可操作的 AI 回复。[/bubble][msg-actions copy regenerate like dislike visible][/msg-actions]' />

## Thumbs `thumb`

A like / dislike button, self-closing. `t` decides the variant.

| Prop | Meaning | Example |
|------|---------|---------|
| `t` | Type (`like` / `dislike`) | `t:like` |
| `clk` | Click handler | `clk:onLike` |
| `v` | State / value | `v:12` |

<Playground dsl='[toolbar][thumb t:like v:12 clk:onLike][thumb t:dislike clk:onDislike][/toolbar]' />

## Comprehensive Example: A Real AI Reply

Combining bubble, reasoning chain, tool call, cited sources, markdown, and an action bar into a realistic AI reply.

<Playground dsl='[bubble role:user][p 帮我查一下 TokUI 的最新特性并写一个登录卡片。[/bubble][bubble role:ai model:GLM-5.2 time:刚刚][think-chain tt:推理过程][think-step status:done tt:理解需求 dur:0.2s][p 搜索资料 + 生成代码[/think-step][think-step status:done tt:联网检索 dur:1.1s][p 找到 3 条结果[/think-step][think-step status:done tt:生成代码 dur:3.4s][/think-step][/think-chain][tool-call name:web_search status:done duration:1.1s][p 检索「TokUI 最新特性」完成。[/tool-call][md]根据检索结果，TokUI 的核心特性：- **零依赖** 纯原生实现- **流式渲染** 基于 SSE- **组件丰富** 覆盖 AI 对话全场景[/md][quote role:user tx:写一个登录卡片][/quote][artifact tt:登录卡片 lang:html][artifact-code]<form class="login">\n  <input name="user" placeholder="用户名"/>\n  <input name="pwd" type="password"/>\n  <button type="submit">登录</button>\n</form>[/artifact-code][/artifact][p v:muted 来源：][source n:1 tt:TokUI 官方文档 sn:零依赖流式 UI 框架 u:#][source n:2 tt:SSE 协议 sn:服务端实时推送 u:#][msg-actions copy regenerate like dislike visible][/msg-actions][/bubble]' />

> Tip: handlers referenced by `clk:` / `sub:` must be pre-registered via `TokUI.registerHandler(name, fn)`; the DSL itself carries no executable code. For the full prop tables, see sections 5.3–5.4 of the [DSL syntax reference](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md).
