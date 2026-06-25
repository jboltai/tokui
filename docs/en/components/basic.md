# Basic Components

The most frequently used display components: headings, text, buttons, tags, callouts, progress, statistics, loaders, Markdown, syntax highlighting, and more. In each example, the left panel shows the formatted and highlighted TokUI DSL, while the right panel renders it live; click "Edit" to modify it on the fly.

## Headings `h1` ~ `h6`

Six-level headings, self-closing. `tx` is the text (optional — you can write the content inline), and `v` controls alignment and decoration.

| Prop | Meaning | Example |
|------|---------|---------|
| `tx` | Text content (or write content inline) | `[h1 标题]` |
| `v` | Variant | `v:underline` |

**Variants**: `left` / `center` / `right` (alignment), `ribbon`, `underline`, `badge` / `pill`.

<Playground dsl='[h1 v:underline TokUI 一级标题][h2 二级标题][h3 三级标题][h4 四级标题][h5 v:badge 五级带徽标][h6 六级标题]' />

## Paragraph `p`

Body paragraph, self-closing. `v` controls alignment and weight.

**Variants**: `left` / `center` / `right` (alignment), `muted`, `bold`, `sm` / `lg` (font size).

<Playground dsl='[p 这是默认段落，用于承载正文内容。][p v:muted 弱化段落，用于次要信息或辅助说明。][p v:bold 加粗段落，用于强调重点。][p v:sm 小字号段落，常用于脚注。][p v:lg 大字号段落，用于引语。]' />

## Link `a`

Hyperlink, self-closing. `u` is the URL, `tx` is the text, and `target` controls how it opens.

| Prop | Meaning | Example |
|------|---------|---------|
| `u` | URL | `u:https://example.com` |
| `tx` | Text | `tx:官网` |
| `target` | Open behavior | `target:_blank` |
| `v` | Variant | `v:underline` |

**Variants**: `muted` / `danger` / `success` / `underline`.

<Playground dsl='[p][a u:# tx:默认链接] · [a u:# tx:下划线链接 v:underline] · [a u:# tx:弱化链接 v:muted] · [a u:# tx:危险链接 v:danger] · [a u:# tx:成功链接 v:success][/p]
[p][a u:https://github.com/jboltai/tokui tx:新窗口打开 GitHub target:_blank v:underline][/p]' />

## Divider `hr` / `dv`

`hr` is a plain horizontal rule (self-closing). `dv` is a divider with text and styling (self-closing).

| Prop | Meaning | Applies to |
|------|---------|------------|
| `tx` | Divider text | `dv` |
| `v` | Line style / direction | `dv` |
| `bg` | Color | `dv` |

**`dv` variants**: `dashed` / `dotted` (line style), `sm` / `md` / `lg` (spacing), `vert` (vertical), `plain`.

<Playground dsl='[p 上方内容][hr][p 下方内容][dv tx:章节分隔][dv v:dashed][dv tx:垂直场景 v:vert]' />

## Image `img` / Gallery `imgs`

`img` renders a single image with click-to-zoom lightbox preview. `imgs` is a container that lays out multiple images in an adaptive grid (up to 3×3).

| Prop | Meaning | Example |
|------|---------|---------|
| `s` | Image URL | `s:https://...` |
| `alt` | Alt text | `alt:封面` |
| `w` / `h` | Width / Height | `w:120` |
| `v` | Variant | `v:avatar` |

**`img` variants**: `avatar`, `rounded`, `bordered`.

<Playground dsl='[row][col span:4][img s:https://assets.vdata.chat/jboltai/aiimg/logo_60.png v:avatar w:72 alt:头像][/col][col span:4][img s:https://picsum.photos/seed/tokui1/200/120 v:rounded w:200 alt:圆角图][/col][col span:4][img s:https://picsum.photos/seed/tokui2/200/120 v:bordered w:200 alt:边框图][/col][/row]' />

`imgs` multiple images: pass comma-separated URLs via `s`, and they are arranged into a 1–9 cell grid automatically.

<Playground dsl='[imgs s:"https://picsum.photos/seed/a/200,https://picsum.photos/seed/b/200,https://picsum.photos/seed/c/200,https://picsum.photos/seed/d/200"]' />

## Button `btn` / Button Group `btngroup`

`btn` is self-closing and is the most commonly used interactive component. `btngroup` is a container that wraps a set of buttons.

| Prop | Meaning | Example |
|------|---------|---------|
| `tx` | Text | `tx:提交` |
| `clk` | Click handler name | `clk:onSave` |
| `sub` | Form submit handler name | `sub:onSubmit` |
| `dis` | Disabled | `dis` |
| `w` | Width | `w:200` |
| `bg` / `fc` | Background / text color | `bg:4f46e5` |
| `t` | Native type | `t:reset` |
| `v` | Variant (type / size / shape) | `v:"primary,pill"` |

**Type variants**: `primary` / `danger` / `success` / `warning` / `ghost`.
**Size / shape variants**: `sm` / `lg` / `pill` (rounded) / `square` (sharp corners) / `block` (full-width).

<Playground dsl='[btngroup][btn tx:主要 v:primary][btn tx:成功 v:success][btn tx:警告 v:warning][btn tx:危险 v:danger][btn tx:幽灵 v:ghost][/btngroup][p v:muted][btn tx:小 v:"primary,sm"] [btn tx:默认 v:primary] [btn tx:大 v:"primary,lg"][btn tx:块级 v:"primary,block" tx:占满整行][/p][p v:muted][btn tx:圆角 v:"primary,pill"] [btn tx:直角 v:"primary,square"] [btn tx:禁用 v:primary dis][/p]' />

> Handlers referenced by `clk:` / `sub:` must be pre-registered via `TokUI.registerHandler(name, fn)`; the DSL itself never carries executable code.

## Tag `tag`

Labels and categorization, self-closing.

| Prop | Meaning | Example |
|------|---------|---------|
| `tx` | Text | `tx:新功能` |
| `t` | Type / color | `t:danger` |
| `s` | Size | `s:sm` |
| `round` | Rounded | `round` |
| `closable` | Closable | `closable` |
| `bordered` | Outlined | `bordered` |

<Playground dsl='[tag tx:新功能 v:primary round][tag tx:热门 t:danger][tag tx:推荐 t:success bordered][tag tx:默认][tag tx:可关闭 t:warning closable][tag tx:小尺寸 s:sm]' />

## Callout `callout`

Informational prompt with an icon, self-closing.

| Prop | Meaning | Example |
|------|---------|---------|
| `t` | Type | `t:success` |
| `tt` | Title | `tt:操作成功` |
| `tx` | Body | `tx:已保存` |

**Types**: `info` / `success` / `warning` / `error` / `tip`.

<Playground dsl='[callout t:info tt:信息提示]这是一条普通信息提示。[/callout][callout t:success tt:操作成功]数据已成功保存。[/callout][callout t:warning tt:请注意]该操作不可撤销。[/callout][callout t:error tt:发生错误]请求失败，请稍后重试。[/callout]' />

## Status Dot `dot`

Status indicator, self-closing.

| Prop | Meaning | Example |
|------|---------|---------|
| `t` | Status type | `t:success` |
| `tx` | Text | `tx:运行中` |
| `s` | Size | `s:lg` |
| `pulse` | Pulse animation | `pulse` |

<Playground dsl='[dot t:success tx:在线 pulse][dot t:warning tx:忙碌][dot t:danger tx:离线][dot tx:默认 s:lg]' />

## Badge `badge` / `badge-box`

`badge` is a numeric / dot badge (self-closing) that wraps its children. `badge-box` is a container that attaches a corner badge to its children.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `count` | Number | `badge` |
| `dot` | Dot | `badge` |
| `t` | Status color | both |
| `overflow` | Overflow display (e.g. 99+) | `badge-box` |

<Playground dsl='[badge count:5][btn tx:消息 v:ghost][/badge] [badge count:99][btn tx:通知 v:ghost][/badge] [badge dot][btn tx:待办 v:ghost][/badge]' />

## Progress `progress`

Self-closing. `v` is the current value (0–100).

| Prop | Meaning | Example |
|------|---------|---------|
| `v` | Current value | `v:60` |
| `l` | Label | `l:下载中` |
| `t` | Shape | `t:circle` |
| `stripe` | Striped | `stripe` |
| `status` | Status color | `status:success` |

**Shapes**: `line` (default) / `circle` (ring) / `span` (inline).

<Playground dsl='[progress v:30 l:下载中][progress v:65 l:处理中 stripe][progress v:100 status:success l:完成][row][col span:4][progress t:circle v:75][/col][/row]' />

## Statistic `stat`

Data display card, self-closing.

| Prop | Meaning | Example |
|------|---------|---------|
| `tt` | Label | `tt:今日访问` |
| `v` | Value | `v:12345` |
| `pre` / `suf` | Prefix / suffix | `suf:%` |
| `trend` | Trend | `trend:up` |
| `dec` | Decimal places | `dec:1` |
| `anim` | Number animation | `anim` |

<Playground dsl='[row][col span:6][stat tt:今日访问 v:12834 trend:up][/col][col span:6][stat tt:转化率 v:3.2 suf:% trend:down dec:1][/col][/row][row][col span:6][stat tt:营收 pre:¥ v:98210 trend:up][/col][col span:6][stat tt:退款 v:12 suf:笔 trend:down][/col][/row]' />

## Countdown `countdown`

Self-closing. Provide `target` as a target timestamp or `dur` as the countdown duration in seconds.

| Prop | Meaning | Example |
|------|---------|---------|
| `target` | Target time | `target:2026-12-31` |
| `dur` | Duration in seconds | `dur:3600` |
| `fmt` | Format | `fmt:dd天hh:mm:ss` |
| `tx` | End text | `tx:已结束` |

<Playground dsl='[callout t:info tt:秒杀倒计时][countdown dur:86400 fmt:hh:mm:ss tx:活动已结束][/callout]' />

## Loader `spin` / Skeleton `skeleton` / Shimmer `shimmer`

`spin` is a loading indicator, `skeleton` is a skeleton screen, and `shimmer` is a shimmering placeholder. All are self-closing.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `t` | Type | all three |
| `s` | Size | `spin` |
| `tx` | Text | `spin` |
| `rows` | Number of rows | `skeleton` / `shimmer` |

<Playground dsl='[row][col span:4][spin t:spinner tx:加载中…][/col][col span:4][spin t:dots][/col][col span:4][spin t:pulse s:lg][/col][/row][skeleton t:card rows:3][shimmer t:text rows:2]' />

## Empty State `empty` / Result Page `result`

`empty` is a no-data placeholder and `result` is an operation result page. Both are self-closing.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `tx` | Description | both |
| `icon` | Icon | `empty` |
| `t` | Type | `result` |
| `tt` | Title | `result` |

**`result` types**: `success` / `error` / `warning` / `info`.

<Playground dsl='[row][col span:6][card tt:空状态][empty tx:暂无数据][/card][/col][col span:6][card tt:结果页][result t:success tt:提交成功 tx:我们将在 3 个工作日内审核][/card][/col][/row]' />

## Copy `copy`

One-click copy button, self-closing. `id` points to the target element to copy, or it copies the `tx` text.

| Prop | Meaning | Example |
|------|---------|---------|
| `id` | Target element ID | `id:codeBlock` |
| `tx` | Button text | `tx:复制` |
| `tt` | Success toast | `tt:已复制` |

<Playground dsl='[p v:muted v:bold id:copyTarget 这段文字可以被一键复制。][copy id:copyTarget tx:复制这段 tt:已复制到剪贴板]' />

## Markdown `md`

Markdown rendering container. Supports common syntax: headings, lists, blockquotes, code, tables, links, and more.

<Playground dsl='[md]## Markdown 渲染支持 **加粗**、*斜体*、`行内代码`、[链接](#)。- 无序列表项一- 无序列表项二> 引用块文字。[/md]' />

## Code Block `code`

Syntax-highlighted code container. `lang` specifies the language; the zero-dependency built-in highlighter covers **11 languages**: `js` / `ts` / `python` / `java` / `go` / `rust` / `sql` / `html` / `css` / `json` / `bash`.

| Prop | Meaning | Example |
|------|---------|---------|
| `lang` | Language | `lang:js` |
| `tx` | Title (file name) | `tx:app.js` |

<Playground dsl='[code lang:js]function greet(name) {\n  return `Hello, ${name}!`;\n}\nconsole.log(greet("TokUI"));[/code]' />

<Playground dsl='[code lang:python]def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint(fib(10))[/code]' />

> Inside code content, newlines are encoded as `\n`. See the [DSL syntax reference](/guide/dsl-syntax) for the full prop table.
