# 基础组件

标题、文本、按钮、标签、提示、进度、统计、加载、Markdown、代码高亮等最高频的展示组件。每个示例左侧为格式化 + 高亮的 TokUI DSL，右侧为实时渲染，点「编辑」可即时改动。

## 标题 `h1` ~ `h6`

六级标题，自闭合。`tx` 文本（可省略直接写正文），`v` 控制对齐与装饰。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tx` | 文本内容（亦可直接写正文） | `[h1 标题]` |
| `v` | 变体 | `v:underline` |

**变体**：`left` / `center` / `right`（对齐），`ribbon`（缎带），`underline`（下划线），`badge` / `pill`（徽标）。

<Playground dsl='[h1 v:underline TokUI 一级标题][h2 二级标题][h3 三级标题][h4 四级标题][h5 v:badge 五级带徽标][h6 六级标题]' />

## 段落 `p`

正文段落，自闭合。`v` 控制对齐与字重。

**变体**：`left` / `center` / `right`（对齐），`muted`（弱化），`bold`（加粗），`sm` / `lg`（字号）。

<Playground dsl='[p 这是默认段落，用于承载正文内容。][p v:muted 弱化段落，用于次要信息或辅助说明。][p v:bold 加粗段落，用于强调重点。][p v:sm 小字号段落，常用于脚注。][p v:lg 大字号段落，用于引语。]' />

## 链接 `a`

超链接，自闭合。`u` 地址、`tx` 文本、`target` 打开方式。

| 属性 | 含义 | 示例 |
|------|------|------|
| `u` | 链接地址 | `u:https://example.com` |
| `tx` | 文本 | `tx:官网` |
| `target` | 打开方式 | `target:_blank` |
| `v` | 变体 | `v:underline` |

**变体**：`muted` / `danger` / `success` / `underline`。

<Playground dsl='[p][a u:# tx:默认链接] · [a u:# tx:下划线链接 v:underline] · [a u:# tx:弱化链接 v:muted] · [a u:# tx:危险链接 v:danger] · [a u:# tx:成功链接 v:success][/p]
[p][a u:https://github.com/jboltai/tokui tx:新窗口打开 GitHub target:_blank v:underline][/p]' />

## 分割线 `hr` / `dv`

`hr` 普通水平线（自闭合）。`dv` 带文本与样式的分割线（自闭合）。

| 属性 | 含义 | 适用 |
|------|------|------|
| `tx` | 分割线文本 | `dv` |
| `v` | 线型/方向 | `dv` |
| `bg` | 颜色 | `dv` |

**`dv` 变体**：`dashed` / `dotted`（线型），`sm` / `md` / `lg`（间距），`vert`（竖向），`plain`。

<Playground dsl='[p 上方内容][hr][p 下方内容][dv tx:章节分隔][dv v:dashed][dv tx:垂直场景 v:vert]' />

## 图片 `img` / 多图 `imgs`

`img` 单图，点击可灯箱预览。`imgs` 容器，多图自适应九宫格。

| 属性 | 含义 | 示例 |
|------|------|------|
| `s` | 图片地址 | `s:https://...` |
| `alt` | 替代文本 | `alt:封面` |
| `w` / `h` | 宽 / 高 | `w:120` |
| `v` | 变体 | `v:avatar` |

**`img` 变体**：`avatar`（头像），`rounded`（圆角），`bordered`（边框）。

<Playground dsl='[row][col span:4][img s:https://assets.vdata.chat/jboltai/aiimg/logo_60.png v:avatar w:72 alt:头像][/col][col span:4][img s:https://picsum.photos/seed/tokui1/200/120 v:rounded w:200 alt:圆角图][/col][col span:4][img s:https://picsum.photos/seed/tokui2/200/120 v:bordered w:200 alt:边框图][/col][/row]' />

`imgs` 多图：`s` 用逗号分隔多个 URL，自动排成 1~9 宫格。

<Playground dsl='[imgs s:"https://picsum.photos/seed/a/200,https://picsum.photos/seed/b/200,https://picsum.photos/seed/c/200,https://picsum.photos/seed/d/200"]' />

## 按钮 `btn` / 按钮组 `btngroup`

`btn` 自闭合，最常用交互组件。`btngroup` 容器包裹一组按钮。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tx` | 文本 | `tx:提交` |
| `clk` | 点击处理器名 | `clk:onSave` |
| `sub` | 表单提交处理器名（内置 submit 动作） | `sub:onSubmit` |
| `reset` | 重置绑定表单（内置 reset 动作，裸写或 `reset:H` 回调） | `reset` |
| `print` | 打印目标区域（内置 print 动作，`print:ID` / `print:self`） | `print:invoice` |
| `form` | 显式绑定表单 ID（按钮在表单外时用） | `form:loginForm` |
| `dis` | 禁用 | `dis` |
| `w` | 宽度 | `w:200` |
| `bg` / `fc` | 背景色 / 文字色 | `bg:4f46e5` |
| `v` | 变体（类型/尺寸/形状） | `v:"primary,pill"` |

> **内置动作**：`sub` / `reset` / `print` 由 renderer 自动解析，无需 `registerHandler`（仅 `sub` 的业务回调仍需注册）。优先级 `print > reset > submit > clk`。详见[表单组件 · 表单动作](/components/form#表单动作-提交-重置-数据收集)与[打印区](/components/form#打印区-print-area)。

**类型变体**：`primary` / `danger` / `success` / `warning` / `ghost`。
**尺寸/形状变体**：`sm` / `lg` / `pill`（圆角）/ `square`（直角）/ `block`（块级宽）。

<Playground dsl='[btngroup][btn tx:主要 v:primary][btn tx:成功 v:success][btn tx:警告 v:warning][btn tx:危险 v:danger][btn tx:幽灵 v:ghost][/btngroup][p v:muted][btn tx:小 v:"primary,sm"] [btn tx:默认 v:primary] [btn tx:大 v:"primary,lg"][btn tx:块级 v:"primary,block" tx:占满整行][/p][p v:muted][btn tx:圆角 v:"primary,pill"] [btn tx:直角 v:"primary,square"] [btn tx:禁用 v:primary dis][/p]' />

> `clk:` / `sub:` 指向的处理器需通过 `TokUI.registerHandler(name, fn)` 预先注册，DSL 本身不含可执行代码。

## 标签 `tag`

标记与分类，自闭合。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tx` | 文本 | `tx:新功能` |
| `t` | 类型/颜色 | `t:danger` |
| `s` | 尺寸 | `s:sm` |
| `round` | 圆角 | `round` |
| `closable` | 可关闭 | `closable` |
| `bordered` | 描边 | `bordered` |

<Playground dsl='[tag tx:新功能 v:primary round][tag tx:热门 t:danger][tag tx:推荐 t:success bordered][tag tx:默认][tag tx:可关闭 t:warning closable][tag tx:小尺寸 s:sm]' />

## 提示框 `callout`

带图标的信息提示，自闭合。

| 属性 | 含义 | 示例 |
|------|------|------|
| `t` | 类型 | `t:success` |
| `tt` | 标题 | `tt:操作成功` |
| `tx` | 正文 | `tx:已保存` |

**类型**：`info` / `success` / `warning` / `error` / `tip`。

<Playground dsl='[callout t:info tt:信息提示]这是一条普通信息提示。[/callout][callout t:success tt:操作成功]数据已成功保存。[/callout][callout t:warning tt:请注意]该操作不可撤销。[/callout][callout t:error tt:发生错误]请求失败，请稍后重试。[/callout]' />

## 状态点 `dot`

状态指示器，自闭合。

| 属性 | 含义 | 示例 |
|------|------|------|
| `t` | 状态类型 | `t:success` |
| `tx` | 文本 | `tx:运行中` |
| `s` | 尺寸 | `s:lg` |
| `pulse` | 脉冲动画 | `pulse` |

<Playground dsl='[dot t:success tx:在线 pulse][dot t:warning tx:忙碌][dot t:danger tx:离线][dot tx:默认 s:lg]' />

## 徽标 `badge` / `badge-box`

`badge` 数字/小红点徽标（自闭合），包裹子元素。`badge-box` 容器，给子元素加角标。

| 属性 | 含义 | 适用 |
|------|------|------|
| `count` | 数字 | `badge` |
| `dot` | 小红点 | `badge` |
| `t` | 状态色 | 两者 |
| `overflow` | 数字溢出显示（如 99+） | `badge-box` |

<Playground dsl='[badge count:5][btn tx:消息 v:ghost][/badge] [badge count:99][btn tx:通知 v:ghost][/badge] [badge dot][btn tx:待办 v:ghost][/badge]' />

## 进度条 `progress`

自闭合。`v` 当前值（0-100）。

| 属性 | 含义 | 示例 |
|------|------|------|
| `v` | 当前值 | `v:60` |
| `l` | 标签 | `l:下载中` |
| `t` | 形态 | `t:circle` |
| `stripe` | 斑马纹 | `stripe` |
| `status` | 状态色 | `status:success` |

**形态**：`line`（默认）/ `circle`（环形）/ `span`（内联）。

<Playground dsl='[progress v:30 l:下载中][progress v:65 l:处理中 stripe][progress v:100 status:success l:完成][row][col span:4][progress t:circle v:75][/col][/row]' />

## 统计 `stat`

数据展示卡片，自闭合。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tt` | 标签 | `tt:今日访问` |
| `v` | 数值 | `v:12345` |
| `pre` / `suf` | 前缀 / 后缀 | `suf:%` |
| `trend` | 趋势 | `trend:up` |
| `dec` | 小数位 | `dec:1` |
| `anim` | 数字动画 | `anim` |

<Playground dsl='[row][col span:6][stat tt:今日访问 v:12834 trend:up][/col][col span:6][stat tt:转化率 v:3.2 suf:% trend:down dec:1][/col][/row][row][col span:6][stat tt:营收 pre:¥ v:98210 trend:up][/col][col span:6][stat tt:退款 v:12 suf:笔 trend:down][/col][/row]' />

## 倒计时 `countdown`

自闭合。`target` 目标时间戳或 `dur` 倒计时秒数。

| 属性 | 含义 | 示例 |
|------|------|------|
| `target` | 目标时间 | `target:2026-12-31` |
| `dur` | 持续秒数 | `dur:3600` |
| `fmt` | 格式 | `fmt:dd天hh:mm:ss` |
| `tx` | 结束文案 | `tx:已结束` |

<Playground dsl='[callout t:info tt:秒杀倒计时][countdown dur:86400 fmt:hh:mm:ss tx:活动已结束][/callout]' />

## 加载 `spin` / 骨架 `skeleton` / 闪光 `shimmer`

`spin` 加载指示器、`skeleton` 骨架屏、`shimmer` 闪光占位，均自闭合。

| 属性 | 含义 | 适用 |
|------|------|------|
| `t` | 类型 | 三者 |
| `s` | 尺寸 | `spin` |
| `tx` | 文本 | `spin` |
| `rows` | 行数 | `skeleton` / `shimmer` |

<Playground dsl='[row][col span:4][spin t:spinner tx:加载中…][/col][col span:4][spin t:dots][/col][col span:4][spin t:pulse s:lg][/col][/row][skeleton t:card rows:3][shimmer t:text rows:2]' />

## 空状态 `empty` / 结果页 `result`

`empty` 无数据占位、`result` 操作结果页，均自闭合。

| 属性 | 含义 | 适用 |
|------|------|------|
| `tx` | 描述文本 | 两者 |
| `icon` | 图标 | `empty` |
| `t` | 类型 | `result` |
| `tt` | 标题 | `result` |

**`result` 类型**：`success` / `error` / `warning` / `info`。

<Playground dsl='[row][col span:6][card tt:空状态][empty tx:暂无数据][/card][/col][col span:6][card tt:结果页][result t:success tt:提交成功 tx:我们将在 3 个工作日内审核][/card][/col][/row]' />

## 复制 `copy`

一键复制按钮，自闭合。`id` 指向要复制的目标元素 ID，或复制 `tx` 文本。

| 属性 | 含义 | 示例 |
|------|------|------|
| `id` | 目标元素 ID | `id:codeBlock` |
| `tx` | 按钮文本 | `tx:复制` |
| `tt` | 成功提示 | `tt:已复制` |

<Playground dsl='[p v:muted v:bold id:copyTarget 这段文字可以被一键复制。][copy id:copyTarget tx:复制这段 tt:已复制到剪贴板]' />

## Markdown `md`

Markdown 渲染容器。支持标题、列表、引用、代码、表格、链接等常用语法。

<Playground dsl='[md]## Markdown 渲染支持 **加粗**、*斜体*、`行内代码`、[链接](#)。- 无序列表项一- 无序列表项二> 引用块文字。[/md]' />

## 代码块 `code`

语法高亮代码块容器。`lang` 指定语言，零依赖内置 **11 种语言**着色：`js` / `ts` / `python` / `java` / `go` / `rust` / `sql` / `html` / `css` / `json` / `bash`。

| 属性 | 含义 | 示例 |
|------|------|------|
| `lang` | 语言 | `lang:js` |
| `tx` | 标题（文件名） | `tx:app.js` |

<Playground dsl='[code lang:js]function greet(name) {\n  return `Hello, ${name}!`;\n}\nconsole.log(greet("TokUI"));[/code]' />

<Playground dsl='[code lang:python]def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint(fib(10))[/code]' />

> 代码内容中的换行用 `\n` 表示。完整属性表见 [DSL 语法](/guide/dsl-syntax)。
