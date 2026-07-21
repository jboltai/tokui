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
| `cs` | Column span (leading cell, legacy; prefer cell suffix `=cN`) | `tr` | `cs:2` |
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

Append a cell suffix `=cN` / `=rN` to merge horizontally (colspan) / vertically (rowspan) — **supported in both header and body**. The browser's native table layout tracks column positions automatically: a column occupied by a rowspan from above is simply **omitted on the next row** — no `,,,` empty placeholders needed.

| Suffix | Meaning | Example |
|--------|---------|---------|
| `=cN` | span N columns | `Total=c4` |
| `=rN` | span N rows | `Region=r4` |
| `=cNrM` | both, c/r order irrelevant | `val=c2r2` |

Strict trailing regex — only matches `=c<digit>` / `=r<digit>`; values like `formula=x=2` or `ver=v2` are preserved verbatim.

<Playground dsl='[table bordered][thead cols:"大区=r2,客户,金额/r"][tbody][tr 华北区=r2,字节,¥1280][tr 星辰,¥960][tr 华东区,云图,¥2100][/tbody][/table]' />

> Above, `大区=r2` makes 「华北区」 span 2 rows; the second row omits that column (browser reserves the slot). `金额/r` also declares that column right-aligned.

### Column Alignment & Color

Each `thead cols` entry may append `/align` and `/color` after the column name:

| Suffix | Values | Example |
|--------|--------|---------|
| `/align` | `c` center / `r` right / `l` left | `单价/r`, `数量/c` |
| `/color` | `primary` / `success` / `warning` / `danger` / `info` | `金额/r/danger` |

Alignment / color **propagate by column position to the body** (the renderer tracks rowspan offsets, so shifted rows and component cells align correctly). Full col-spec order: `name[=cN[rM]][/align][/color]`, e.g. `金额/r/danger` (right + red). Single-segment suffix is also valid — `金额/danger` (color only, no align) and `金额/r` (align only): the lone segment is matched against the align table first, then the color table.

<Playground dsl='[table stripe bordered][thead cols:"商品,数量/c/primary,单价/r/warning,金额/r/danger"][tbody][tr 键盘,5,¥128,¥640][tr 鼠标,8,¥45,¥360][tr 显示器,3,¥999,¥2997][/tbody][/table]' />

### Per-cell Alignment / Color (overrides column)

thead cols sets **whole-column** alignment/color. When a **single cell in a single row** needs its own style (e.g. a refund row's amount red while other rows in the same column are not), append the same `/align` `/color` to the **cell value** — it overrides only that cell and leaves other rows untouched:

| Form | Meaning |
|------|---------|
| `"-¥58.00/danger"` | this cell only: danger color (no align) |
| `"x/r"` | this cell only: right-aligned |
| `"-¥58.00/r/danger"` | this cell: right + red |
| `"合计=c4/r/danger"` | combined with span: span 4 cols + right + red |

The cell-level suffix overrides the column-level: where a cell specifies a value, the column-level align/color gives way.

<Playground dsl='[table stripe bordered][thead cols:"菜品,数量,金额/r"][tbody][tr 酸汤肥牛,1,¥58.00][tr 牛肉面,2,¥36.00][tr 酸汤肥牛（已退）,-1,"-¥58.00/danger"][tr 合计=c2,"¥36.00" v:total][/tbody][/table]' />

> ⚠️ Slashed values (`api/v2`, `2026/07/04`, `v1.2.3`) are **not** mis-stripped because their trailing segment isn't in the align/color vocabulary; but if a value happens to end with `/c` `/r` `/l` `/danger` etc. (e.g. `path/r`), it will be treated as a suffix — add a trailing space or reorder columns to avoid.

### Total Row `v:total`

Adding the `v:total` variant to a `tr` makes it a total row: whole row bold, the leading (summary) cell right-aligned, the trailing (amount) cell bold + centered + `--danger` colored. Often combined with `汇总=cN` to span the whole row.

<Playground dsl='[table stripe bordered][thead cols:"商品,数量/c,单价/r,金额/r"][tbody][tr 键盘,5,¥128,¥640][tr 鼠标,8,¥45,¥360][tr 汇总=c3,"¥1,000" v:total][/tbody][/table]' />

### Multi-row Header

Separate `thead cols` rows with `;` (thead stays a single self-closing tag — no container mode). Group columns span with `=cN`, leaf columns span down with `=rN`; `chk`/`#` special columns only take effect on the **last row**.

<Playground dsl='[table stripe bordered][thead cols:"基本信息=c2,金额=r2,操作=r2;姓名,年龄"][tbody][tr 张三,28,"¥12,800",查看][tr 李四,32,"¥9,600",编辑][/tbody][/table]' />

> Above, 「基本信息」 spans the 姓名/年龄 columns, while 「金额」/「操作」 span both header rows; the second header row lists only the 姓名/年龄 leaves, and each body row has 4 cells for the 4 leaf columns.

> **legacy `cs:N`**: the old `tr cs:N` only merges the **leading** cell horizontally and requires `,,,` empty placeholders (e.g. `[tr cs:3 "前端组"]`). Prefer `=cN[rM]` for new code (any cell, no placeholders). `cs:N` is still supported.

> **Parser constraint for `tr` containing spaces**: The parser splits tokens on spaces. If a row has inline attributes (`tag:`, `btn:`, `progress`; note `=cN`/`=rN` are cell suffixes and `v:total` is a row variant — **neither triggers this**) or a cell value containing spaces, **the entire row content must be wrapped in double quotes** — e.g. `[tr "任务 A,进度 80%,<...>"]` — otherwise anything after the space is misparsed as an attribute. See the [DSL syntax guide](/guide/dsl-syntax).

### Action Column (inline button shorthand)

A cell starting with `btn:` is recognized as an action column; `|` separates multiple buttons (`clk:` still points to a pre-registered handler):

| Syntax | Description |
|------|------|
| `btn:文本 clk:H` | text button |
| `btn:文本 v:danger clk:H` | colored (`primary`/`danger`/`warning`/`success`/`info`) |
| `btn:文本 icon:view clk:H` | SVG icon + text |
| `btn: i:🔍 clk:H` | emoji icon |
| `btn: icon:delete l:删除 v:danger clk:H` | **icon-only**: `l:` provides tooltip + a11y label |

Icon names match [Button · Icon Buttons](/en/components/basic#icon-buttons). `icon:NAME` renders built-in SVG (inherits button color); `i:GLYPH` renders emoji.

<Playground dsl='[table stripe bordered][thead cols:"姓名,操作/c"][tbody][tr 张三,btn: icon:view l:详情 v:primary clk:toast|btn: icon:edit l:编辑 v:warning clk:toast|btn: icon:delete l:删除 v:danger clk:toast][tr 李四,btn:详情 clk:toast|btn:删除 v:danger clk:toast][/tbody][/table]' />

> **Streaming**: the action column is always the last cell — during streaming it shows a skeleton and only renders the buttons once the whole cell arrives (finalize), so there are never half-SVGs or split emoji surrogates.

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

**Usage**: First render a component with an `id`, then use the `upd` directive to override its state. The example below first renders progress at 30%, and the following `upd` updates the same target to 80% and marks it success — so the final state you see after rendering is the updated one. `id` accepts comma-separated targets for batch updates: `[upd id:a,b v:80]` (the same props are applied to every matched component).

<Playground dsl='[progress id:demo v:30 l:下载中][upd id:demo v:80 status:success]' />

**Delete & insert directives**: `[del id:x]` removes the component with the given id (a missing target is silently skipped; if the target is a container that is still streaming and not yet closed, `del` warns via `console.warn` and skips — wait for it to close before sending `del`); the container directives `[ins after:ID]` / `before:ID` / `into:ID` insert their children after / before / inside the target (`into` appends to the target's content slot) — children are staged off-document during streaming and moved in one shot when `[/ins]` closes. See [DSL Syntax · Dynamic update](/en/guide/dsl-syntax#dynamic-update).

**`calendar` live update**: `[upd id:cal v:"8,15"]` / `[upd id:cal sel:"8,15"]` resets the selected days (comma-separated day numbers, full replacement).

> `upd` only takes effect when the target component implements `_update` (e.g. `progress`, `stat`, `steps`). If the target is not rendered or has no `_update` method, `upd` is a silent no-op and renders as an empty text node. For the full prop list, see section 8 of the [DSL reference](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md).
