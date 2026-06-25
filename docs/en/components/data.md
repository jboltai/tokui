# Data Display Components

Structured-data components for tables, description lists, pagination, breadcrumbs, dropdowns, calendars, watermarks, avatars, and live updates. Each example shows the formatted, highlighted TokUI DSL on the left and a live render on the right; click "Edit" to modify it in place.

## Table `table` / `thead` / `tbody` / `tr`

The most common data-display combination: the `table` container is the shell, `thead` defines the header via `cols`, `tbody` holds the rows, and `tr` is self-closing with comma-separated cells.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `stripe` | Zebra striping (boolean) | `table` | `stripe` |
| `cap` | Table caption | `table` | `cap:用户列表` |
| `v` | Variant | `table` | `v:bordered` |
| `cols` | Header column definitions (comma-separated; quote if it contains `,` or CJK) | `thead` | `cols:"姓名,年龄"` |
| `cs` | Column span (applies to the leading cell) | `tr` | `cs:2` |
| `n` | Column title (only for `tcol` children) | `tcol` | `n:名称` |

**Special `thead cols` placeholders**:
- `chk` — renders a header checkbox in that column; corresponding row cells auto-render inline checkboxes.
- `#` — index column; row cells auto-render 1/2/3... with no need to fill them in.
- Plain text — used directly as the column title.

**`tr` cell separator**: Cells are separated by commas. `smartSplit` preserves quoted substrings, so wrap an entire cell in double quotes if it contains `,`.

<Playground dsl='[table stripe][thead cols:"姓名,年龄,城市,状态"][tbody][tr 张三,25,北京,在职][tr 李四,30,上海,休假][tr 王五,28,深圳,在职][/tbody][/table]' />

### Table Variants

`v:bordered` (full borders), `v:compact` (tight row height, good for dense data), and `stripe` (zebra striping) can be combined.

<Playground dsl='[table v:"bordered,compact"][thead cols:"ID,名称,价格,库存"][tbody][tr 1,商品A,¥99,200][tr 2,商品B,¥199,50][tr 3,商品C,¥299,0][/tbody][/table]' />

### Checkbox Column

Declare a checkbox column with the `chk` placeholder in `thead cols`; leave the corresponding row cell empty or fill it with `#` to auto-render an inline checkbox.

<Playground dsl='[table bordered][thead cols:"chk,任务,负责人,进度"][tbody][tr #,设计登录页,张三,80%][tr #,开发接口,李四,100%][tr #,联调测试,王五,30%][/tbody][/table]' />

### Cell Merging

`tr cs:N` makes the **leading cell** span N columns horizontally; the other cells inside the merged range are simply omitted. The most common use is a grouping divider row where `cs` equals the total column count, merging the whole row into one section title; other data rows must keep a cell count matching the header columns.

<Playground dsl='[table bordered][thead cols:"分类,项目,负责人"][tbody][tr cs:3 "前端组（共 2 项）"][tr 重构,张三,进行中][tr 性能,李四,已完成][tr cs:3 "后端组（共 1 项）"][tr 接口,王五,规划中][/tbody][/table]' />

> **Parser constraint for `tr` containing spaces**: The parser splits tokens on spaces. If a row has inline attributes (`cs:2`, `tag:`, `btn:`, `progress`) or a cell value containing spaces, **the entire row content must be wrapped in double quotes** — e.g. `[tr cs:2 "前端,合并区"]` or `[tr "任务 A,进度 80%,<...>"]` — otherwise anything after the space is misparsed as an attribute. See the [DSL syntax guide](/guide/dsl-syntax).

### Column Placeholders via `tcol`

When `thead` omits `cols`, you can declare columns one by one with `tcol` children (`n` sets the title), which is handy for dynamically generated columns.

<Playground dsl='[table stripe][thead][tcol n:月份][tcol n:销售额][tcol n:环比][/thead][tbody][tr 1月,120万,+12%][tr 2月,190万,+18%][/tbody][/table]' />

## Description List `desc` / `desc-item`

Structured key-value display, commonly used on detail pages. `desc` is the container; its children are `desc-item` nodes (`l` for label, `tx` for value, `span` for column span). Children of `desc` may also be written as `[item]` — inside `desc` it is rendered as a description item (same name as the `[item]` in `list`, but disambiguated by parent).

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `cols` | Columns per row (default 3) | `desc` | `cols:2` |
| `stripe` | Zebra striping (boolean) | `desc` | `stripe` |
| `bordered` | Bordered (boolean) | `desc` | `bordered` |
| `v` | Layout direction | `desc` | `v:horizontal` |
| `lw` | Label width (effective with horizontal) | `desc` | `lw:120px` |
| `l` | Label text | `desc-item` / `item` | `l:用户名` |
| `tx` | Value text | `desc-item` / `item` | `tx:张三` |
| `span` | Column span (must not exceed `cols`) | `desc-item` / `item` | `span:2` |

**`desc` variants**: `horizontal` / `h` (label and value side by side; default stacks them vertically).

<Playground dsl='[desc cols:2 bordered][item l:用户名 tx:张三][item l:角色 tx:管理员][desc-item l:邮箱 tx:zhangsan@example.com][desc-item l:注册时间 tx:2026-01-15][/desc]' />

`[item]` and `[desc-item]` are equivalent inside `desc` and can be mixed. `v:horizontal` puts the label and value on the same line; combine with `lw` to unify the label column width:

<Playground dsl='[desc cols:1 v:horizontal lw:100px stripe][desc-item l:姓名 tx:李四][desc-item l:部门 tx:产品中心][desc-item l:备注 tx:核心成员 span:1][/desc]' />

`v:horizontal` puts the label and value on the same line; combine with `lw` to unify the label column width:

<Playground dsl='[desc cols:1 v:horizontal lw:100px stripe][desc-item l:姓名 tx:李四][desc-item l:部门 tx:产品中心][desc-item l:备注 tx:核心成员 span:1][/desc]' />

## Pagination `pagination`

Self-closing. `page` is the current page, `total` is the total page count, `clk` is the page-turn handler, and `count` is the total item count (shown when `show-total` is set).

| Prop | Meaning | Example |
|------|---------|---------|
| `page` | Current page | `page:3` |
| `total` | Total pages | `total:10` |
| `count` | Total items | `count:128` |
| `show-total` | Show total count (boolean) | `show-total` |
| `s` | Size | `s:sm` |
| `clk` | Page-turn handler name | `clk:onPage` |

**Variants (size)**: `sm` / `lg`.

<Playground dsl='[pagination page:3 total:10 count:128 show-total clk:onPage][pagination page:5 total:8 s:sm]' />

> The page-switch UI is built in: clicking a page number refreshes it immediately and calls the `clk` handler with `{ page }`. Register the handler in advance via `TokUI.registerHandler`.

## Breadcrumb `breadcrumb`

Self-closing. `items` is a comma-separated list of node labels, `sep` is a custom separator (default `/`), and `v:arrow` switches the glyph to `›`.

| Prop | Meaning | Example |
|------|---------|---------|
| `items` | Node labels (comma-separated; quote if it contains `,` or CJK) | `items:"首页,用户,详情"` |
| `sep` | Separator | `sep:>` |
| `v` | Variant | `v:arrow` |
| `clk` | Click handler (the last item does not fire) | `clk:onCrumb` |

**Variant**: `arrow` (arrow style).

<Playground dsl='[breadcrumb items:"首页,用户管理,详情" clk:onCrumb][breadcrumb items:"控制台,数据,报表" v:arrow]' />

## Dropdown `dropdown` / `dd-item`

`dropdown` is a container; the trigger text goes in `tt` or `tx`, and its `dd-item` children are the menu entries. Clicking the trigger opens the menu; selecting an item closes it.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `tt` / `tx` | Trigger button text | `dropdown` | `tt:更多操作` |
| `v` | Trigger button variant | `dropdown` | `v:primary` |
| `tx` | Menu item text | `dd-item` | `tx:编辑` |
| `clk` | Click handler name | `dd-item` | `clk:onEdit` |
| `dis` | Disabled (boolean) | `dd-item` | `dis` |
| `v` | Menu item variant | `dd-item` | `v:danger` |

**`dd-item` variant**: `danger` (red, for destructive actions).

<Playground dsl='[dropdown tt:更多操作][dd-item tx:编辑 clk:onEdit][dd-item tx:复制 clk:onCopy][dd-item tx:导出 clk:onExport][dd-item tx:删除 v:danger clk:onDel][dd-item tx:已锁定 dis][/dropdown]' />

## Calendar `calendar`

Self-closing. `month` sets the year and month (`2026-06`), `marks` highlights specific days (comma-separated day numbers), `sel` selects discrete days, `range:"a-b"` selects a single range, and `ranges:"a-b;c-d"` selects multiple ranges.

| Prop | Meaning | Example |
|------|---------|---------|
| `month` | Year and month (defaults to the current month) | `month:2026-06` |
| `tt` | Custom title | `tt:6 月排期` |
| `marks` | Highlighted days (comma-separated) | `marks:"5,12,20"` |
| `sel` | Discrete selected days | `sel:"8,15"` |
| `range` | Single range | `range:"10-18"` |
| `ranges` | Multiple ranges (`;`-separated) | `ranges:"3-7;20-25"` |
| `v` | Variant | `v:card` |

**Variants**: `card` (card style), `mini` (mini size).

<Playground dsl='[calendar month:2026-06 marks:"5,12,20" range:"10-18" sel:"8,25" v:card]' />

## Watermark `watermark`

Container. `tx` is the watermark text, `c` the color, `gap` the tile spacing, `ro` the rotation in degrees, and `font` the font size. Children are the protected content.

| Prop | Meaning | Example |
|------|---------|---------|
| `tx` | Watermark text | `tx:内部资料` |
| `c` | Color | `c:rgba(0,0,0,0.15)` |
| `gap` | Tile spacing (px) | `gap:60` |
| `ro` | Rotation angle | `ro:-30` |
| `font` | Font size | `font:18` |
| `s` | Size preset (`sm`/`lg`) | `s:lg` |

<Playground dsl='[watermark tx:TokUI c:rgba(0,0,0,0.12) font:18 gap:60][card tt:受水印保护的卡片][p 这段内容被水印覆盖，水印以 canvas 平铺生成，不影响内容交互。][p 适合用于内部资料、防截图泄露等场景。][/card][/watermark]' />

## Avatar `avatar`

Self-closing. `s` is the image URL (image mode); `tx` is the text fallback (first two characters used). When `s` is omitted, the background color is auto-assigned by hashing `tx`.

| Prop | Meaning | Example |
|------|---------|---------|
| `s` | Image URL | `s:https://.../a.png` |
| `tx` | Text fallback (first 2 chars) | `tx:张三` |
| `size` | Size | `size:lg` |
| `bg` | Background color (effective in text mode) | `bg:1677ff` |
| `fc` | Text color | `fc:fff` |

**Sizes**: `sm` / `md` (default) / `lg` / `xl`.

<Playground dsl='[avatar s:https://assets.vdata.chat/jboltai/aiimg/logo_60.png size:lg] [avatar tx:张三 size:md] [avatar tx:李四 size:md bg:1677ff fc:fff] [avatar tx:王五 size:sm] [avatar tx:产品 size:lg]' />

## Live Update `upd`

A self-closing directive. `id` targets an already-rendered component's ID, and the remaining props are the new field values; at render time it looks up the target element and calls its `_update` method to refresh. This is typically pushed by the backend over SSE to reflect asynchronous state changes (progress, steps, status colors).

| Prop | Meaning | Example |
|------|---------|---------|
| `id` | Target element ID (required) | `id:demo` |
| `v` | New value | `v:80` |
| `status` | New status | `status:success` |
| `tt` / `tx` | New title / new text | `tt:已完成` |
| `act` | New action | `act:restart` |

**Usage**: First render a component with an `id`, then use the `upd` directive to override its state. The example below first renders progress at 30%, and the following `upd` updates the same target to 80% and marks it success — so the final state you see after rendering is the updated one.

<Playground dsl='[progress id:demo v:30 l:下载中][upd id:demo v:80 status:success]' />

> `upd` only takes effect when the target component implements `_update` (e.g. `progress`, `stat`, `steps`). If the target is not rendered or has no `_update` method, `upd` is a silent no-op and renders as an empty text node. For the full prop list, see section 5.2 of the [DSL reference](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md).
