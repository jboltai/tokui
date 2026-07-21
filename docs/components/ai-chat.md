# AI 对话组件

专为 AI 对话场景设计的组件：消息气泡、思考链、工具调用、Agent 状态、计划与测试结果、引用来源、代码差异、终端、文件树、Artifact 等。每个示例左侧为格式化 + 高亮的 TokUI DSL，右侧为实时渲染，点「编辑」可即时改动。

## 思考块 `think`

可折叠的思考过程容器，自闭合边界由 `[/think]` 闭合。`open` 默认展开、`tt` 标题。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tt` | 标题 | `tt:思考过程` |
| `open` | 默认展开 | `open` |

<Playground dsl='[think open tt:思考过程][p 用户需要登录界面，应包含用户名、密码、提交按钮，并做必填校验。[/think][think tt:已折叠][p 默认收起，点击标题展开查看。[/think]' />

## 推理链 `think-chain` / `think-step`

分步推理过程容器。`think-chain` 整体标题，每个 `think-step` 显示状态、标题、耗时。

| 属性 | 含义 | 适用 |
|------|------|------|
| `tt` | 整体标题 | `think-chain` |
| `status` | 步骤状态（`pending`/`running`/`done`/`error`） | `think-step` |
| `tt` | 步骤标题 | `think-step` |
| `dur` | 耗时 | `think-step` |

<Playground dsl='[think-chain tt:分析用户问题][think-step status:done tt:理解需求 dur:0.3s][p 解析为"生成登录表单"任务][/think-step][think-step status:done tt:检索设计模式 dur:0.8s][p 找到 3 种参考实现[/think-step][think-step status:running tt:生成代码][p 正在输出表单组件…[/think-step][/think-chain]' />

## 对话气泡 `bubble`

对话消息容器。`role` 角色定位左右，`model` / `time` 显示在元信息行。

| 属性 | 含义 | 示例 |
|------|------|------|
| `role` | 角色（`user` / `ai`） | `role:ai` |
| `model` | 模型名（AI 侧） | `model:GLM-5.2` |
| `time` | 时间文案 | `time:刚刚` |

<Playground dsl='[bubble role:user][p 帮我设计一个登录界面[/bubble][bubble role:ai model:GLM-5.2 time:刚刚][p 好的！已为你生成登录卡片：[/bubble]' />

## 工具栏 `toolbar`

横向操作工具条容器，常出现在气泡顶部或底部。

| 属性 | 含义 | 示例 |
|------|------|------|
| `pos` | 位置 | `pos:bottom` |
| `align` | 对齐 | `align:right` |

<Playground dsl='[toolbar align:right][btn tx:复制 v:ghost sm][btn tx:重新生成 v:ghost sm][btn tx:分享 v:ghost sm][/toolbar]' />

## 工具调用 `tool-call`

工具/函数调用卡片，显示调用名、状态、耗时。状态着色，`pending`/`running`/`done`/`error`/`denied`。

| 属性 | 含义 | 示例 |
|------|------|------|
| `name` | 工具名 | `name:web_search` |
| `status` | 状态 | `status:done` |
| `duration` | 耗时 | `duration:1.2s` |
| `id` | 标识（可被 `upd` 更新） | `id:tc1` |
| `approval` | 人工审批模式（HITL，配 `status:pending`） | `approval` |
| `clk` | 审批决定处理器 | `clk:onApproval` |

<Playground dsl='[tool-call name:web_search status:done duration:1.2s][p 已搜索「TokUI 流式 UI」，找到 8 条结果。[/tool-call][tool-call name:run_code status:running][p 正在执行 Python 代码…[/tool-call][tool-call name:read_file status:error duration:0.4s][p 文件不存在。[/tool-call]' />

**HITL 人工审批**：加 `approval` 且 `status:pending` 时，卡片渲染「批准 / 拒绝」按钮。用户做出决定后经 `clk:` handler（或 `on:"approval:h"`）回传 `{approved, id, name}`；决定后按钮自动禁用，后续状态由服务端用 `upd` 推送。

```tokui
[tool-call id:tc1 name:delete_file approval status:pending clk:onApproval][p 即将删除 ./tmp/cache 目录，需人工确认。[/tool-call]

;; 用户点击后，onApproval 收到 {approved:true/false, id:"tc1", name:"delete_file"}
;; 服务端随后推送后续状态：
[upd id:tc1 status:running]
[upd id:tc1 status:done duration:0.8s]
```

## 打字指示 `typing`

「正在输入」三点动画，自闭合。`text` 旁边文字。

| 属性 | 含义 | 示例 |
|------|------|------|
| `text` | 提示文字 | `text:思考中` |

<Playground dsl='[bubble role:ai][typing text:正在生成回复][/bubble]' />

## 快捷回复 `quick-reply`

一行式快捷回复建议，自闭合容器。`items` 用 `|` 分隔多个建议。

| 属性 | 含义 | 示例 |
|------|------|------|
| `items` | 建议列表（`|` 分隔） | `items:"A|B|C"` |
| `clk` | 点击处理器（payload `{value: 标签}`） | `clk:onPick` |

<Playground dsl='[p v:muted 你可能想问：][quick-reply items:"如何接入 SSE？|支持哪些图表？|怎样自定义主题？|DSL 怎么写？"][/quick-reply]' />

> **点击上报**：声明 `on:"select:h"` 后，点击建议项上报 `{value: 标签}`。

## 建议卡片 `suggestions` / `suggestion`

网格化建议容器，子节点 `suggestion` 显示标题、描述、图标。`suggestions` 的 `cols` 控制列数。

| 属性 | 含义 | 适用 |
|------|------|------|
| `cols` | 列数 | `suggestions` |
| `clk` | 统一点击处理器 | `suggestions` |
| `tt` | 标题 | `suggestion` |
| `tx` | 描述 | `suggestion` |
| `icon` | 图标 | `suggestion` |
| `clk` | 点击处理器 | `suggestion` |
| `dis` | 禁用 | `suggestion` |

<Playground dsl='[suggestions cols:2][suggestion tt:快速入门 tx:五分钟跑起第一个组件 clk:a][suggestion tt:DSL 语法 tx:掌握组件描述语言 clk:b][suggestion tt:流式渲染 tx:理解增量解析原理 clk:c][suggestion tt:主题定制 tx:打造品牌视觉 clk:d][/suggestions]' />

> **选择上报**：声明 `on:"select:h"` 后，点击建议卡片上报 `{value: 标题}`。

## 引用来源 `source`

引用的检索来源/参考文献，自闭合。常用于「联网搜索」回答下方列出 `[1] [2]` 编号引用。

| 属性 | 含义 | 示例 |
|------|------|------|
| `n` | 序号 | `n:1` |
| `tt` | 标题（含空格须双引号） | `tt:"TokUI 官方文档"` |
| `sn` | 摘要片段（含空格须双引号） | `sn:"零依赖流式 UI…"` |
| `u` / `url` | 链接 | `u:https://tokui.jboltai.com` |

> `tt`/`sn` 含空格必须用双引号包裹，否则会被空格截断。

<Playground dsl='[card tt:参考来源][source n:1 tt:"TokUI 官方文档" sn:"零依赖流式 UI 描述与渲染框架" u:#][source n:2 tt:"SSE 协议规范" sn:"Server-Sent Events 实时推送" u:#][source n:3 tt:"MDN Web Docs" sn:"Using Server-Sent Events to push updates" u:#][/card]' />

## 代码差异 `diff`

带行号与红绿着色的代码差异容器。`+`/`-` 行染色，其余为上下文行。**原始内容模式**：内部 `[` 当字面文本，直到 `[/diff]`。

| 属性 | 含义 | 示例 |
|------|------|------|
| `title` | 标题 | `title:修复登录校验` |
| `lang` | 语言标识 | `lang:js` |

<Playground dsl='[diff title:修复登录校验 lang:js]- function login(user) {\n-   return true;\n- }\n+ function login(user, pwd) {\n+   if (!user || !pwd) return false;\n+   return verify(user, pwd);\n+ }[/diff]' />

> 内容用 `\n` 换行，`+` 开头为新增行（绿）、`-` 开头为删除行（红）、其余为上下文行（灰）。

## 执行计划 `plan` / `plan-step`

任务计划清单容器。`plan` 标题，每个 `plan-step` 表示一步，`status` 着色。

| 属性 | 含义 | 适用 |
|------|------|------|
| `tt` | 计划标题 | `plan` |
| `status` | 步骤状态（`pending`/`running`/`done`/`error`/`skipped`） | `plan-step` |
| `tt` | 步骤标题 | `plan-step` |
| `desc` | 步骤描述 | `plan-step` |

<Playground dsl='[plan tt:重构登录模块][plan-step status:done tt:梳理现有代码][plan-step status:done tt:抽取校验逻辑][plan-step status:running tt:替换为新组件 desc:迁移到 TokUI form 组件][plan-step status:pending tt:补充单元测试][/plan]' />

## Agent 状态 `agent`

智能体协作卡片，显示名称、状态、动作、耗时，支持流式状态更新。

| 属性 | 含义 | 示例 |
|------|------|------|
| `name` | 名称 | `name:资料研究员` |
| `status` | 状态（`idle`/`running`/`paused`/`done`/`error`） | `status:running` |
| `action` | 当前动作 | `action:正在检索文档` |
| `duration` | 耗时 | `duration:8s` |
| `id` | 标识（可被 `upd` 更新状态） | `id:agent1` |

<Playground dsl='[agent name:资料研究员 status:running action:正在检索文档][p 已查阅 12 篇资料…[/agent][agent name:代码工程师 status:done action:已生成代码 duration:8s][p 完成实现。[/agent][agent name:测试工程师 status:paused action:等待人工确认][/agent]' />

## 文件树 `file-tree` / `ft-folder` / `ft-file`

文件树容器，子节点 `ft-folder`（可嵌套）和 `ft-file`（叶节点）。

| 属性 | 含义 | 适用 |
|------|------|------|
| `name` | 名称 | 两者 |
| `open` | 默认展开 | `ft-folder` |
| `badge` | 角标（如 `M` 修改 / `A` 新增 / `D` 删除） | `ft-file` |

<Playground dsl='[file-tree][ft-folder name:src open][ft-folder name:components open][ft-file name:basic.js badge:M][ft-file name:form.js badge:A][/ft-folder][ft-file name:lib.js][/ft-folder][ft-folder name:tests][ft-file name:test-parser.js badge:D][/ft-folder][ft-file name:package.json badge:M][/file-tree]' />

## 终端 `terminal`

终端命令与输出容器。`title` 窗口标题、`status` 执行结果状态。**原始内容模式**：内部 `[` 当字面文本。

| 属性 | 含义 | 示例 |
|------|------|------|
| `title` | 窗口标题 | `title:bash` |
| `status` | 执行状态 | `status:success` |

<Playground dsl='[terminal title:bash status:success]$ npm install\n$ npm run dev\n\n✓ 服务已启动: http://localhost:5173[/terminal]' />

## 代码沙盒 `sandbox`

带预览的代码沙箱容器，可执行 HTML/CSS/JS。**原始内容模式**：内部 `[` 当字面文本，到 `[/sandbox]` 闭合。

| 属性 | 含义 | 示例 |
|------|------|------|
| `lang` | 语言 | `lang:html` |
| `title` | 标题 | `title:实时预览` |
| `height` | 预览高度 | `height:160` |

<Playground dsl='[sandbox title:Hello 卡片 lang:html height:160]<div style="padding:24px;font-family:sans-serif;text-align:center">\n  <h2 style="color:#4f46e5">Hello TokUI</h2>\n  <button style="padding:8px 16px;background:#4f46e5;color:#fff;border:0;border-radius:6px">点我</button>\n</div>[/sandbox]' />

## 测试结果 `test-result` / `test-case`（简写 `case`）

测试运行总结容器，子节点 `test-case`（**可简写为 `case`**，两者等价）列出每个用例（`pass` 绿 / `fail` 红 + 错误 / `skip` 灰）。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `pass` / `fail` / `skip` | 通过/失败/跳过计数 | `test-result` | `pass:3 fail:1` |
| `total` | 总数 | `test-result` | `total:5` |
| `duration` | 总耗时 | `test-result` | `duration:"2.4s"` |
| `status` | 用例状态（`pass`/`fail`/`skip`） | `test-case` / `case` | `status:fail` |
| `name` | 用例名（含空格须双引号） | `test-case` / `case` | `name:"解析基础标签"` |
| `duration` | 单条耗时 | `test-case` / `case` | `duration:"0.12s"` |
| `error` | 错误信息（`fail` 时，含空格/括号须双引号） | `test-case` / `case` | `error:"Expected [/card]"` |

> `name`/`error` 含空格或 `[` `]` 必须双引号包裹，否则被截断或误解析。

<Playground dsl='[test-result pass:3 fail:1 skip:1 total:5 duration:"2.4s"][case status:pass name:"解析基础标签" duration:"0.12s"][test-case status:pass name:"流式增量渲染" duration:"0.34s"][case status:fail name:"嵌套容器闭合" duration:"0.08s" error:"Expected [/card] but got EOF"][case status:skip name:"SSE 长连接测试"][test-case status:pass name:"属性引号处理" duration:"0.21s"][/test-result]' />

<Playground dsl='[test-result pass:24 fail:1 skip:2 total:27 duration:1.8s][test-case status:pass name:解析器解析简单标签 duration:2ms][test-case status:pass name:容器嵌套闭合 duration:5ms][test-case status:fail name:原始内容模式 duration:3ms error:Expected [/code] but got EOF][test-case status:skip name:流式压力测试][/test-result]' />

## Git 提交 `commit`

Git 提交信息卡片，自闭合。

| 属性 | 含义 | 示例 |
|------|------|------|
| `hash` | 提交哈希（取前 7 位） | `hash:abc1234` |
| `msg` | 提交信息（含空格须双引号） | `msg:"fix: 修复登录校验"` |
| `author` | 作者 | `author:sdxiaomu` |
| `branch` | 分支 | `branch:master` |
| `time` | 时间（含空格须双引号） | `time:"2 小时前"` |
| `additions` / `deletions` | 增/删行数 | `additions:12 deletions:5` |

> `msg`/`time` 等含空格的值**必须用双引号包裹**，否则会在第一个空格处被截断（`msg:fix login bug` 只取 `fix`）。

<Playground dsl='[commit hash:dbc08be msg:"扩展案例库，优化模型配置" author:sdxiaomu branch:master time:"刚刚" additions:128 deletions:24][commit hash:a6d758e msg:"docs: 配置 VitePress 文档站" author:sdxiaomu branch:master time:"1 天前" additions:56 deletions:8]' />

## 消息引用 `quote`

引用历史消息容器，`role` 来源角色、`tx` 引用文本、`msgid` 原消息标识。

| 属性 | 含义 | 示例 |
|------|------|------|
| `role` | 来源角色 | `role:user` |
| `tx` | 引用文本 | `tx:之前的提问` |
| `msgid` | 原消息 ID | `msgid:m1` |

<Playground dsl='[bubble role:ai][quote role:user tx:之前你提到 TokUI 支持流式渲染，能再讲讲吗？][/quote][p 当然，TokUI 通过 SSE 推送增量 DSL 片段…[/bubble]' />

## 延迟标记 `latency`

模型响应延迟/吞吐指标，自闭合。`v` 数值、`t` 类型（如 `ttfb` 首字节时间、`tok/s` 每秒 token）。

| 属性 | 含义 | 示例 |
|------|------|------|
| `v` | 数值 | `v:320ms` |
| `t` | 类型标签 | `t:ttfb` |

<Playground dsl='[toolbar align:right][latency v:320ms t:ttfb][latency v:48 tok/s t:throughput][/toolbar]' />

## 视频 `video` / 音频 `audio`

媒体播放器，均自闭合。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `s` | 媒体地址 | 两者 | `s:https://.../mov.mp4` |
| `poster` | 封面图（与播放器共用比例盒，同大小同比例） | `video` | `poster:https://.../pic.jpg` |
| `ratio` | 画面比例（aspect-ratio），设了自动铺满 | `video` | `ratio:"16:9"` / `"4:3"` / `"1:1"` / `"21:9"` |
| `w` | 宽（纯数字→px，余按字面 `%`/`rem`） | 两者 | `w:"320"` / `w:"50%"` |
| `h` | 高（优先于 ratio） | `video` | `h:"180"` |
| `fit` | 填充：有尺寸默认 `cover`（裁切铺满）、无尺寸默认 `contain`（留边） | `video` | `fit:contain` / `fit:cover` / `fit:fill` |
| `tt` | 标题（左对齐） | `audio` | `tt:演示音频` |
| `duration` | 时长（右对齐） | `audio` | `duration:0:48` |

> **封面与比例**：`poster` 是 `<video>` 自身首帧，给它设 `ratio` + `fit` 后，封面与正片共用同一比例盒，自然同大小、同比例、不变形。一行多列用 `row` + `col span:6` 包裹。

```dsl
[video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 poster:https://picsum.photos/seed/p/640/360 ratio:"16:9"]
[video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"1:1" w:"320" h:"320" fit:cover]
[audio s:https://assets.vdata.chat/jboltai/horse.mp3 tt:演示音频 duration:0:48]
[row][col span:6][video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"16:9"][/col][col span:6][video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"16:9"][/col][/row]
```

<Playground dsl='[video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 poster:https://picsum.photos/seed/poster/640/360 ratio:"16:9"][row][col span:6][video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"1:1" fit:cover][/col][col span:6][video s:https://assets.vdata.chat/jboltai/mov_bbb.mp4 ratio:"1:1" fit:contain][/col][/row][audio s:https://assets.vdata.chat/jboltai/horse.mp3 tt:演示音频 duration:0:48]' />

## 会话列表 `conversations` / `conv`

侧边会话历史列表容器，子节点 `conv` 表示单条会话。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `clk` | 统一切换处理器 | `conversations` | `clk:onSwitch` |
| `act` | 动作端点 | `conversations` | `act:conv-1` |
| `tt` | 会话标题（含空格须双引号） | `conv` | `tt:"如何接入 SSE"` |
| `time` | 时间（含空格须双引号） | `conv` | `time:"今天 14:20"` |
| `active` | 当前选中 | `conv` | `active` |
| `act` | 单条动作 | `conv` | `act:conv-2` |

> `tt`/`time` 含空格必须双引号，否则在第一个空格处截断。

<Playground dsl='[conversations][conv tt:"如何接入 SSE" time:"刚刚" active][conv tt:"DSL 语法学习" time:"今天 14:20"][conv tt:"主题定制方案" time:"昨天"][conv tt:"表格组件用法" time:"3 天前"][/conversations]' />

## 欢迎页 `welcome` / `welcome-feature`（简写 `feature`）

新会话欢迎页容器，子节点 `welcome-feature`（**可简写为 `feature`**，自闭合，两者等价）为功能特性卡片。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `tt` | 标题 | `welcome` | `tt:"你好，我是助手"` |
| `st` | 副标题 | `welcome` | `st:"有什么可以帮你？"` |
| `bd` | 能力徽标（逗号分隔） | `welcome` | `bd:"GPT-4,联网,代码"` |
| `hd` | 起步卡分区标题 | `welcome` | `hd:"你可以试试"` |
| `ft` | 页脚引导语 | `welcome` | `ft:"输入 / 查看更多"` |
| `tt` | 卡片标题 | `welcome-feature` / `feature` | `tt:写代码` |
| `tx` | 卡片描述 | `welcome-feature` / `feature` | `tx:"生成与调试代码"` |
| `i` | 图标（`code` / `chart` / `doc` / `dashboard` / `print` / `chat` / `table` / `form`） | `welcome-feature` / `feature` | `i:chart` |
| `clk` | 点击处理器 | `welcome-feature` / `feature` | `clk:onPick` |

> `[feature tt:x tx:y i:code]` 自闭合（推荐）；`[welcome-feature ...][/welcome-feature]` 为容器写法，效果相同。卡片由属性驱动，每个标签到达即渲染（真流式）。

<Playground dsl='[welcome tt:"你好，我是 TokUI 助手" st:"有什么可以帮你？"][feature tt:写代码 tx:"生成与调试代码" i:code clk:a][feature tt:画图表 tx:"用纯 SVG 渲染数据" i:chart clk:b][feature tt:查文档 tx:"检索与总结资料" i:doc clk:c][/welcome]' />

## 附件 `attachments` / `attach`

附件上传/列表容器，子节点 `attach` 为单个附件项。`attach` 的 `t` 决定文件类型图标颜色。

| 属性 | 含义 | 适用 |
|------|------|------|
| `clk` | 删除/点击处理器 | `attachments` |
| `t` | 文件类型（`image`/`pdf`/`word`/`excel`/`ppt`/`zip`/`code`/`video`/`audio`） | `attach` |
| `s` | 文件名 | `attach` |
| `u` | 下载地址 | `attach` |
| `size` | 大小 | `attach` |
| `clk` | 点击处理器 | `attach` |

<Playground dsl='[attachments clk:onRemove][attach t:pdf s:需求文档.pdf size:2.4 MB u:#][attach t:code s:app.js size:12 KB u:#][attach t:image s:设计稿.png size:580 KB u:https://picsum.photos/seed/att/120/80][attach t:excel s:数据统计.xlsx size:32 KB u:#][/attachments]' />

## Artifact `artifact` / `artifact-code` / `artifact-preview`

侧边预览面板 Artifact 容器，内部用 `artifact-code` 放代码槽、`artifact-preview` 放实时预览槽。

| 属性 | 含义 | 适用 |
|------|------|------|
| `tt` | 标题 | `artifact` |
| `lang` | 语言 | `artifact` |
| `pos` | 面板位置 | `artifact` |
| `w` | 面板宽度 | `artifact` |

<Playground dsl='[artifact tt:登录卡片 lang:html][artifact-code]<div class="card">\n  <h3>登录</h3>\n  <input placeholder="用户名"/>\n  <input placeholder="密码"/>\n  <button>提交</button>\n</div>[/artifact-code][artifact-preview]<div style="padding:16px;font-family:sans-serif"><h3 style="margin:0 0 8px">登录</h3><input placeholder="用户名" style="display:block;margin-bottom:8px;padding:6px"/><input placeholder="密码" style="display:block;margin-bottom:8px;padding:6px"/><button style="padding:6px 12px;background:#4f46e5;color:#fff;border:0;border-radius:4px">提交</button></div>[/artifact-preview][/artifact]' />

## 对话输入 `chat-input`

对话输入框容器，含发送按钮。`auto` 自适应高度、`rows` 默认行数、`max` 最大字符数。

| 属性 | 含义 | 示例 |
|------|------|------|
| `ph` | 占位符 | `ph:输入消息…` |
| `clk` | 发送处理器 | `clk:onSend` |
| `dis` | 禁用 | `dis` |
| `auto` | 自适应高度 | `auto` |
| `rows` | 默认行数 | `rows:3` |
| `max` | 最大字符 | `max:2000` |
| `streaming` | 生成中态：显示停止按钮（与发送钮互斥） | `streaming` |
| `on` | 事件上报声明 | `on:"stop:onStop"` |

<Playground dsl='[chat-input ph:输入消息，按 Enter 发送 clk:onSend auto rows:2][/chat-input]' />

**发送上报**：Enter / 发送按钮触发 `clk` handler（负载 `{value}`）的同时，也经 `on:"send:h"` 与统一出口上报 `send` 事件（detail `{value}`）。

**停止生成**：加 `streaming` 布尔属性后，发送按钮切换为「停止生成」按钮（二者互斥）。点击触发 `on:"stop:h"` 上报（detail `{}`）；未声明 `on` 时默认断开**该组件所属** TokUI 实例的 SSE 连接（`disconnect()`，幂等安全，多实例页面不会误停别的实例），点击后输入框立即恢复发送态（乐观 UI——流未停时服务端可 `upd streaming:true` 恢复）。生成结束后服务端推 `[upd id:x streaming:false]` 恢复发送按钮，`streaming:true` 再次进入生成态。

```tokui
[chat-input id:ci ph:"输入消息…" clk:onSend streaming on:"stop:onStop"][/chat-input]
[upd id:ci streaming:false]   ;; 生成结束，恢复发送按钮
```

## 消息操作 `msg-actions`

气泡底部消息操作栏容器，支持复制 / 重新生成 / 赞踩等开关。

| 属性 | 含义 | 示例 |
|------|------|------|
| `clk` | 通用处理器 | `clk:onAct` |
| `copy` | 显示复制 | `copy` |
| `regenerate` | 显示重新生成 | `regenerate` |
| `like` / `dislike` | 赞踩 | `like` |
| `visible` | 常驻可见（默认悬停） | `visible` |

<Playground dsl='[bubble role:ai][p 这是一段可操作的 AI 回复。[/bubble][msg-actions copy regenerate like dislike visible][/msg-actions]' />

## 赞踩 `thumb`

点赞 / 点踩按钮，自闭合。`t` 决定形态。

| 属性 | 含义 | 示例 |
|------|------|------|
| `t` | 类型（`like` / `dislike`） | `t:like` |
| `clk` | 点击处理器 | `clk:onLike` |
| `v` | 状态/数值 | `v:12` |

<Playground dsl='[toolbar][thumb t:like v:12 clk:onLike][thumb t:dislike clk:onDislike][/toolbar]' />

## 综合示例：一段真实 AI 回复

把气泡、思考链、工具调用、引用来源、Markdown 与操作栏组合成一段贴近真实场景的 AI 回复。

<Playground dsl='[bubble role:user][p 帮我查一下 TokUI 的最新特性并写一个登录卡片。[/bubble][bubble role:ai model:GLM-5.2 time:刚刚][think-chain tt:推理过程][think-step status:done tt:理解需求 dur:0.2s][p 搜索资料 + 生成代码[/think-step][think-step status:done tt:联网检索 dur:1.1s][p 找到 3 条结果[/think-step][think-step status:done tt:生成代码 dur:3.4s][/think-step][/think-chain][tool-call name:web_search status:done duration:1.1s][p 检索「TokUI 最新特性」完成。[/tool-call][md]根据检索结果，TokUI 的核心特性：- **零依赖** 纯原生实现- **流式渲染** 基于 SSE- **组件丰富** 覆盖 AI 对话全场景[/md][quote role:user tx:写一个登录卡片][/quote][artifact tt:登录卡片 lang:html][artifact-code]<form class="login">\n  <input name="user" placeholder="用户名"/>\n  <input name="pwd" type="password"/>\n  <button type="submit">登录</button>\n</form>[/artifact-code][/artifact][p v:muted 来源：][source n:1 tt:TokUI 官方文档 sn:零依赖流式 UI 框架 u:#][source n:2 tt:SSE 协议 sn:服务端实时推送 u:#][msg-actions copy regenerate like dislike visible][/msg-actions][/bubble]' />

> 提示：`clk:` / `sub:` 指向的处理器需通过 `TokUI.registerHandler(name, fn)` 预先注册，DSL 本身不含可执行代码。完整属性表见 [DSL 语法参考](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md) 第 6.3–6.4 节。
