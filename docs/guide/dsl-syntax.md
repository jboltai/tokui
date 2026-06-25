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
| `w/h/bg/fc` | 宽/高/背景/字色 | `target` | `a` 打开方式 |

> `clk:` / `sub:` 的处理器名称需通过 `TokUI.registerHandler(name, fn)` 预先注册，服务端不下发可执行代码。

## 布尔属性

无需赋值，直接写 key：

```
stripe dis ro req chk multi auto plain round closable bordered open
pill dot leaf inline rounded container
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
| 表单控件 | 输入、选择、开关、滑块、评分、日期、级联、穿梭、上传 | [form](/components/form) |
| 布局容器 | 卡片、栅格、标签页、折叠、抽屉、对话框、时间轴、树 | [layout](/components/layout) |
| 数据展示 | 表格、描述列表、分页、徽标、头像、骨架、结果、空状态 | [data](/components/data) |
| 图表 | 柱、折、饼、雷达、散点、甘特、漏斗（纯 SVG 零依赖） | [chart](/components/chart) |
| AI 对话 | 气泡、工具调用、推理链、差异、计划、终端、沙盒、Artifact | [ai-chat](/components/ai-chat) |
| 综合案例 | 注册表单、CRUD、表单+表格联动、报告类成品 | [showcase](/components/showcase) |

## 原始内容模式

`code`、`md`、`diff`、`terminal`、`sandbox`、`artifact-code` 容器内部，`[` 被视为字面文本（不解析为标签），直到遇到对应的 `[/type]`。这样代码片段里的方括号不会破坏解析。

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

## 完整参考

- 站内：上方七大类组件文档，每个组件都有属性表与实时示例。
- 仓库：完整属性表与容器类型清单见 [`TOKUI_DSL_REFERENCE.md`](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md)。
- 源码为准：容器类型见 `src/core/parser.js` 的 `CONTAINERS` Set，布尔属性见 `BOOLEAN_ATTRS` Set，变体白名单见 `src/core/renderer.js` 的 `VARIANTS`。
