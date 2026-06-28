# DSL 语法

TokUI DSL 极简：方括号包裹一个组件，第一个 token 是类型，后续 `key:value` 是属性，剩余文本是内容。

## 基本语法

```text
[h1 标题]                                    ; 自闭合标签
[card tt:标题] 内容 [/card]                  ; 容器标签，必须 [/type] 闭合
[btn tx:"点击我" v:primary clk:onClick]      ; 多属性用空格分隔
[tr 张三,25,北京]                            ; 同类型多值用逗号分隔
ph:"含空格的值"                              ; 值含空格用双引号包裹
v:"primary,sm"                               ; 多变体用逗号分隔
```

- `[type attrs... content]`：第一个 token 为组件类型，后续 `key:value` 为属性，最后剩余文本为内容。
- **容器组件**必须写闭合标签 `[/type]`，自闭合组件不能包含子元素。
- **布尔属性**只写 key 即可生效，例如 `req`、`stripe`、`dis`。

<Playground dsl='[btn tx:主按钮 v:primary][btn tx:危险 v:danger][btn tx:幽灵 v:ghost][btn tx:圆角 v:"primary,pill"]' />

## 通用属性

| 简写 | 含义 | 简写 | 含义 |
|------|------|------|------|
| `id` | 元素 ID（也作 `upd` 更新目标） | `tt` | title |
| `tx` | text | `l` | label |
| `ph` | placeholder | `u` | url |
| `s` | src / source | `n` | name |
| `v` | value / variant | `act` | action |
| `mtd` | method | `clk` | onclick 处理器名 |
| `sub` | onsubmit 处理器名 | `dis` | disabled |
| `ro` | readonly | `req` | required |
| `chk` | checked | `multi` | multiple |
| `form` | 按钮显式绑定表单 ID | `reset` | 重置动作（裸写或 `reset:H`） |
| `print` | 打印动作（`print:ID` / `print:self`） | `w/h/bg/fc` | 宽/高/背景/字色 |
| `target` | `a` 打开方式 | | |

> `clk:` / `sub:` 的处理器名称需通过 `TokUI.registerHandler(name, fn)` 预先注册，服务端不下发可执行代码。
> `sub` / `reset` / `print` 是按钮**内置动作**，由 renderer 自动解析；`reset` / `print` 无需注册 handler。详见[表单组件](/components/form#表单动作-提交-重置-数据收集)。

> **文本写哪：裸内容 vs `tx:` 属性**——文本**块**组件 `p` / `h1~h6` / `item` 把文本当**裸内容**写在标签内：`[p 段落文本]`、`[h1 标题]`；`tx:` 是**自闭合展示**组件（`btn` / `tag` / `callout` / `stat` / `badge` / `dot` 等）的文本属性：`[btn tx:按钮]`。混用会丢内容——`[p tx:文本]` 不符合规范（p/h 现已兼容 `tx:` 兜底，但标准写法是裸内容）。多变体用逗号 `v:"muted,center"`，不要写两个 `v:`（后者覆盖前者）。

> **标题加徽标**：`h3` 等标题是自闭合组件，禁止嵌套 `[h3 文本 [badge]]`。两种官方写法——并排 pill 用 `row v:inline`（flex，**必须 `v:inline`**，默认 `row` 是 12 列 grid 会挤窄标题）`[row v:inline][h3 SaaS Pro][badge tx:v2.4 pill][/row]`；右上角角标用 `badge-box` 包裹 `[badge-box tx:v2.4][h3 SaaS Pro][/badge-box]`。版本号/小数用 `tx` 文本模式（`count` 走 `parseInt` 会把 `2.4` 截成 `2`）。`badge-box` 文本徽标用 `tx`（兼容旧写 `label`）。



## 布尔属性

无需赋值，直接写 key：

```
stripe dis ro req chk multi auto plain round closable bordered open
pill dot leaf inline rounded container reset print
```

完整列表以 `parser.js` 的 `BOOLEAN_ATTRS` Set 为准。

## 变体系统

DSL 写 `v:primary`，渲染器生成 CSS 类 `tokui-{type}--primary`。多个变体逗号组合：`v:"primary,sm,pill"`。变体名经 `VARIANTS` 白名单校验，未知变体静默丢弃。

常见变体白名单：

| 组件 | 允许的变体 |
|------|-----------|
| `btn` | `primary` `danger` `success` `warning` `ghost` `sm` `lg` `pill` `square` `block` |
| `card` | `highlight` `flat` `bordered` `center` `right` |
| `h1~h6` | `left` `center` `right` `ribbon` `underline` `badge` `pill` |
| `p` | `left` `center` `right` `muted` `bold` `sm` `lg` |
| `img` | `avatar` `rounded` `bordered` |
| `dv` | `dashed` `dotted` `sm` `md` `lg` `vert` `plain` |

<Playground dsl='[h1 v:underline 标题装饰][p v:muted 弱化文本][p v:bold 加粗文本][dv v:dashed 带文本分割线]' />

## 动态更新

`[upd]` 可更新已渲染组件：

```text
[progress id:prog v:0 l:处理进度]
[upd id:prog v:50]
[upd id:prog v:100 status:success]
```

<Playground dsl='[progress id:prog v:0 l:处理进度][upd id:prog v:50][upd id:prog v:100 status:success]' />

> `[upd]` 的精髓在**异步增量**：服务端先推 `[progress id:prog v:0]`，进度变化时再推 `[upd id:prog v:50]`。点右下角 **⚡ 流式** 可逐 Token 重放，进度条会 0% → 50% → 100% 实时跳动。

## 组件分类速览

150+ 组件按七大类组织，每类文档都有完整属性表与可编辑示例：

| 分类 | 代表组件 | 文档 |
|------|----------|------|
| 基础组件 | 标题、按钮、标签、提示、进度、统计、Markdown、代码高亮 | [basic](/components/basic) |
| 表单控件 | 输入、选择、开关、滑块、评分、日期、级联、穿梭、上传、表单动作（提交/重置）、打印区 | [form](/components/form) |
| 布局容器 | 卡片、栅格、标签页、折叠、抽屉、对话框、时间轴、树 | [layout](/components/layout) |
| 数据展示 | 表格、描述列表、分页、徽标、头像、骨架、结果、空状态 | [data](/components/data) |
| 图表 | 柱、折、饼、雷达、散点、甘特、漏斗（纯 SVG 零依赖） | [chart](/components/chart) |
| AI 对话 | 气泡、工具调用、推理链、差异、计划、终端、沙盒、Artifact | [ai-chat](/components/ai-chat) |
| 综合案例 | 注册表单、CRUD、表单+表格联动、报告类成品 | [showcase](/components/showcase) |

## 原始内容模式

`code`、`md`、`diff`、`terminal`、`sandbox`、`artifact-code` 容器内部，`[` 被视为字面文本（不解析为标签），直到遇到对应的 `[/type]`。这样代码片段里的方括号不会破坏解析。

## 段落 `p` 的两种模式（叶子 vs 容器）

`p` 是**双模**标签：根据标签内**有没有正文**自动切换，写错会导致子节点断裂成兄弟或正文丢失（与 card 的 `tx` 自闭合陷阱同理）。

- **叶子模式**（标签内有正文）：`[p 文本]`、`[p v:bold 文本]`。文本拼成段落正文，遇到下一个**块级**兄弟节点时自动闭合（对标 HTML `<p>`）。正文流里可夹**内联**子节点，内联白名单仅：`a`、`tag`、`b`/`strong`、`em`、`mark`、`spin`、`sub`/`sup`、`code`。

```dsl
[p 请先 [a u:# 注册账号]，再 [b npm install] 安装。]   ✅ 内联子节点正常嵌在正文里
```

- **容器模式**（标签内无正文，只有属性或为空）：`[p]...[/p]`、`[p v:muted]...[/p]`。压栈收集**所有**子节点直到 `[/p]`。段落里要放 `btn`/`form`/`card`/`list`/`table`/另一个 `[p]` 等**块级**组件时，必须用此模式，子节点逐个单列。

```dsl
[p]
[btn tx:同意 clk:agree]
[btn tx:拒绝 v:danger clk:reject]
[/p]
```

**常见错误**：把块级组件塞进叶子模式的正文流——

```dsl
[p 请点击 [btn tx:提交] 继续]   ❌ btn 不在内联白名单，叶 p 一遇 [btn] 立即闭合，btn 断裂成 p 的顶层兄弟
```

判定：段落含 `btn`/`form`/`card`/`list`/`table` 等容器 → 容器模式 `[p]...[/p]`；含 `a`/`code`/`tag`/`strong` 等内联或纯文本 → 叶子模式 `[p 文本]`。完整内联白名单见 `src/core/parser.js` 的 `P_INLINE_CHILDREN`。

<Playground dsl='[p 段落可夹 [a u:# tx:内联链接] 与 [b code] 等内联子节点。][p][btn tx:容器模式里的按钮 clk:ok][btn tx:另一个按钮 v:danger clk:cancel][/p]' />

## 正文里的 `英文:值`（如 `Q:` `A:`）会被解析成属性

`[` 后的每个 token，parser 都会检查 ASCII `:`：只要 `:` 前是一个英文标识符（`Q`、`A`、`step`、`note`、`id`… 都算），整个 `key:value` 就被当成**属性**。所以下面这种「问答前缀」写法，正文会全部丢失：

```dsl
[p Q:如何提交表单？]            ❌ 无空格：Q 变属性名，整句成属性值，段落正文为空、不渲染
[p Q: 如何提交表单？]            ❌ 带空格：Q: 前缀被吃成属性，只剩 "如何提交表单？"
```

这对 `item`、`h1~h6`、`callout` 的 `tt` 等任何文本组件都成立。**规避三选一**：

```dsl
[p Q：如何提交表单？]      ✅ 全角冒号 ：（parser 只认 ASCII :，全角当正文）
[p Q 如何提交表单？]        ✅ 去掉冒号，前缀并入正文
[p "Q: 如何提交表单？"]     ✅ 整段双引号包裹（引号内当字面文本）
```

问答 / QA 场景推荐全角 `：` 或纯正文无前缀，不要把 `Q:`/`A:` 当 Markdown 风格前缀写进 DSL。

## 文本含字面 `[` `]` 必须用双引号包裹

`[` 是标签起始符。普通文本组件（`item`、`p`、`h1~h6`、卡片标题 `tt` 等）的正文里若出现字面 `[` 或 `]`，会被误判为嵌套子标签，导致内容被截断、后半段变孤儿节点：

```dsl
[item Math.random() 生成 [0, 1) 浮点数]   ❌ [0 被当子标签，item 内容截断成 "Math.random() 生成"
```

**解决：把整段正文用双引号包裹**，引号内的 `[` `]` 作字面字符保留，不触发标签解析：

```dsl
[item "Math.random() 生成 [0, 1) 浮点数"]   ✅
[item "数组 arr[0] 与 arr[1]"]              ✅
[p "系数区间 [0, 1) 半开半闭"]              ✅
```

> 注意：双引号内**整段**作字面文本，其内的 `[标签]` 也不再解析为子标签。若需既有字面括号又嵌套真子标签，把字面括号部分单独引号、子标签放引号外。

不含 `[` `]` 的正文无需引号。

## 属性值里不要塞组件标签（`tx`/`l` 双引号 vs 真子节点）

属性值（`tx`、`l`、`tt` 等）里若直接写整个组件标签，`[` 会触发标签解析——`[table]` 自己的 `]` 会被当成外层标签的闭合，结果是属性值丢空、`[table]` 漏成一个**真实**子组件（位置/语义错乱）、后续正文散落成孤儿：

```dsl
[item l:表格 tx:[table]a,b[/table] 用于展示]   ❌ tx 变空、[table] 漏成真实子组件、正文成孤儿
```

取决于你想得到什么，两种写法二选一：

- **想把 `[table]` 当字面文本原样显示**（示例说明、文档引用等）→ 整段属性值用**双引号**包裹，引号内的 `[` `]` 作字面字符、不再解析为标签：

```dsl
[item l:表格 tx:"[table]a,b[/table] 用于展示"]   ✅ tx 完整保留字面值 "[table]a,b[/table] 用于展示"
```

- **想渲染真实的表格组件** → **不要**把它塞进 `tx`/`l` 属性值；把 `[table]...[/table]` 挪出来，作为真子节点放进容器：

```dsl
[item l:表格][table]a,b[/table][/item]   ✅ table 是 item 的真实子组件
[card tt:表格][table]a,b[/table][/card]  ✅ table 作为 card 子节点
```

> **铁律**：双引号包属性值，会令其内**所有** `[标签]` 退化为字面字符。因此「想要真组件」时**绝不能**用引号包——必须把组件标签挪出属性值、写成真子节点；反之「只想要字面文本」才用引号包。

## 完整参考

- 站内：上方七大类组件文档，每个组件都有属性表与实时示例。
- 仓库：完整属性表与容器类型清单见 [`TOKUI_DSL_REFERENCE.md`](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md)。
- 源码为准：容器类型见 `src/core/parser.js` 的 `CONTAINERS` Set，布尔属性见 `BOOLEAN_ATTRS` Set，变体白名单见 `src/core/renderer.js` 的 `VARIANTS`。
