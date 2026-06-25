# Layout Components

Container-type layout components such as cards, grids, lists, tabs, collapse, dialogs, drawers, timelines, step bars, carousels, trees, menus, and more. Container components must be closed with `[/type]`. The left side shows the formatted TokUI DSL, the right side renders it in real time — click "Edit" to make changes on the fly.

## Card `card` / Footer `ft`

`card` is a general-purpose content container. `tt` sets the title, `tx` writes the body text directly (self-closing mode), and the main content is filled by child nodes. `ft` acts as a child container of `card`, automatically placed at the bottom of the card as a footer.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `tt` | Title | `card` | `tt:用户信息` |
| `tx` | Self-closing body text | `card` | `tx:一段说明` |
| `hc` | Title color (preset or color value) | `card` | `hc:primary` |
| `ht` | Title decoration style | `card` | `ht:underline` |
| `w` | Width | `card` | `w:320` |
| `v` | Variant | `card` | `v:highlight` |
| `v` | Alignment | `ft` | `v:right` |

**`card` variants**: `highlight` (highlighted border), `flat` (flat, no shadow), `bordered` (outlined), `center` / `right` (title alignment).
**`ht` title decorations**: `fill` (filled block), `accent` (left color bar), `underline` (underline), `dot` (leading dot), `pill` (pill).
**`ft` variants**: `left` / `center` / `right`.

<Playground dsl='[row][col span:6][card tt:基础卡片][p 这是基础卡片，承载正文与子组件。][/card][/col][col span:6][card tt:高亮卡片 v:highlight ht:underline hc:primary][p 带下划线标题的高亮卡片。][/card][/col][/row][card tt:带页脚的卡片 hc:danger ht:accent][p 主体内容：把操作按钮放进页脚区。][ft v:right][btn tx:取消] [btn tx:确定 v:primary][/ft][/card]' />

## Grid `row` / `col`

Responsive layout based on a 12-column grid system. `row` is the container row, `col` is the column, and `span` specifies the column width (1-12).

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `v` | Alignment | `row` | `v:center` |
| `span` | Column width (1-12) | `col` | `span:4` |

**`row` variants**: `left` / `center` / `right` (horizontal alignment), `inline` (inline layout).

<Playground dsl='[row][col span:4][callout t:info]span:4[/callout][/col][col span:4][callout t:success]span:4[/callout][/col][col span:4][callout t:warning]span:4[/callout][/col][/row][row][col span:6][callout t:info]span:6[/callout][/col][col span:3][callout t:tip]span:3[/callout][/col][col span:3][callout t:tip]span:3[/callout][/col][/row]' />

## List `list` / `item`

List container. `list` is unordered (`ul`) by default; `t:ol` switches it to an ordered list (`ol`). `item` is a list item (`<li>` semantics) — text is written inside the tag, child `list` can be nested, and `plain` hides the marker.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `t` | List type | `list` | `t:ol` |
| `plain` | Remove marker/number | `list` | `plain` |
| `tx` | Item text | `item` | `tx:第一项` |

<Playground dsl='[row][col span:6][p v:bold 无序列表][list][item 第一项内容][item 第二项内容][item 第三项内容][/list][/col][col span:6][p v:bold 有序列表][list t:ol][item 步骤一][item 步骤二][item 步骤三][/list][/col][/row][p v:bold 嵌套列表][list][item 主分类一[list][item 子项 A][item 子项 B][/list]][item 主分类二][/list]' />

## Tabs `tabs` / `tab`

`tabs` wraps multiple `tab` children. `tt` is each tab's navigation title, switched with pure CSS. Supports left/right arrow keyboard navigation.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `tt` | Tab title | `tab` | `tt:详情` |

<Playground dsl='[tabs][tab tt:概览][p 这是概览页内容。][/tab][tab tt:详情][p 这是详情页内容，可放任意子组件。][stat tt:访问量 v:1024 trend:up][/tab][tab tt:设置][p 设置项放在这里。][/tab][/tabs]' />

## Accordion `accordion` / Collapse `collapse`

`accordion` wraps multiple `collapse` panels, each independently collapsible. `tt` sets the title; `open` expands by default.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `tt` | Title | `collapse` | `tt:第一章` |
| `open` | Expand by default | `collapse` | `open` |
| `id` | Identifier | `collapse` | `id:sec1` |

<Playground dsl='[accordion][collapse tt:什么是 TokUI？ open][p TokUI 是零依赖的流式 UI 描述与渲染框架。][/collapse][collapse tt:核心特性][p 流式增量解析、纯原生 DOM、零外部依赖。][/collapse][collapse tt:适用场景][p AI 对话中的流式 UI 生成、低代码可视化搭建。][/collapse][/accordion]' />

## Dialog `dialog`

Built on the native `<dialog>` element, with a backdrop + centered modal. Esc / click backdrop / close button all dismiss it.

| Prop | Meaning | Example |
|------|---------|---------|
| `tt` | Title | `tt:确认操作` |
| `id` | Identifier (the trigger button's `data-target` points to it) | `id:myDialog` |
| `clk` | Handler name | `clk:openDialog` |

> Triggered by a button: the trigger button uses `clk:openDialog data-target:"<the dialog's id>"`, and the matching `[dialog id:...]` must carry the **same id**. Clicking calls the built-in `openDialog` handler, which finds the dialog by id and calls `showModal()`. Cancel/confirm buttons inside use `clk:closeDialog` to dismiss the enclosing dialog (no id needed).

<Playground dsl='[row][col span:6][btn tx:点击打开对话框 v:primary clk:openDialog data-target:demoDialog][dialog tt:用户协议 id:demoDialog][p 请仔细阅读以下协议内容，勾选同意后即可继续。][p v:muted 点击「同意并继续」或 ✕ / 遮罩可关闭对话框。][ft v:right][btn tx:取消 clk:closeDialog] [btn tx:同意并继续 v:primary clk:closeDialog][/ft][/dialog][/col][/row]' />

## Drawer `drawer`

A panel that slides in from the side. `pos` controls the direction; `w` sets the width for left/right drawers and `h` sets the height for top/bottom drawers. Esc / backdrop / close button all dismiss it.

| Prop | Meaning | Example |
|------|---------|---------|
| `tt` | Title | `tt:筛选条件` |
| `pos` | Position (`left`/`right`/`top`/`bottom`, default `right`) | `pos:left` |
| `w` | Width (left/right drawers, default `360px`) | `w:420` |
| `h` | Height (top/bottom drawers, default `300px`) | `h:260` |
| `id` | Identifier (the trigger button's `data-target` points to it) | `id:myDrawer` |
| `clk` | Handler name | `clk:openDrawer` |

**`pos` variants**: `left` / `right` / `top` / `bottom`.

> Triggered by a button: the trigger button uses `clk:openDrawer data-target:"<the drawer's id>"`, and the matching `[drawer id:...]` must carry the **same id**. Clicking calls the built-in `openDrawer` handler, which finds the drawer by id and adds the `tokui-drawer--open` class to slide it in. Cancel/confirm buttons inside use `clk:closeDrawer` to dismiss the enclosing drawer.

<Playground dsl='[btn tx:打开筛选抽屉 clk:openDrawer v:primary data-target:demoDrawer][drawer tt:筛选条件 pos:right w:360 id:demoDrawer][p 在这里放置筛选表单或详情内容，Esc / 遮罩 / ✕ 可关闭。][ft v:right][btn tx:取消 clk:closeDrawer][btn tx:应用 v:primary clk:closeDrawer][/ft][/drawer]' />

## Timeline `timeline` / `ti`

`timeline` is the container; `ti` is a single record. `tm` sets the timestamp, `tt` the title, `t` the status color (`primary`/`success`/`warning`/`error`/`info`). The body text goes inside the tag.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `v` | Layout (`h`/`alternate`/`card`) | `timeline` | `v:alternate` |
| `tm` | Timestamp | `ti` | `tm:2026-06-01` |
| `tt` | Title | `ti` | `tt:提交申请` |
| `t` | Status color | `ti` | `t:success` |

**`timeline` variants**: `h` / `horizontal` (horizontal), `alternate` / `alt` (alternating left/right), `card` (card style).

<Playground dsl='[timeline][ti tm:2026-06-01 09:00 tt:创建订单 t:primary 用户下单成功][ti tm:2026-06-01 10:30 tt:支付完成 t:success 已收到款项][ti tm:2026-06-02 08:00 tt:商家发货 t:warning 商品已出库][ti tm:2026-06-03 14:00 tt:签收确认 t:info 用户确认收货][/timeline]' />

## Steps `steps` / `step`

A horizontal flow indicator. `v` sets the current step (1-based), `vd:vertical` switches to a vertical layout, and `s:sm` reduces the size. A `step` child can use `status:error` to mark an error state.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `v` | Current step (1-based) | `steps` | `v:2` |
| `vd` | Direction (`horizontal`/`vertical`) | `steps` | `vd:vertical` |
| `s` | Size | `steps` | `s:sm` |
| `tt` | Step title | `step` | `tt:填写信息` |
| `status` | Per-step status | `step` | `status:error` |

<Playground dsl='[steps v:3][step tt:填写信息 基本信息][step tt:身份验证 完成实名认证][step tt:设置支付 配置支付方式][step tt:完成注册 激活账号][/steps]' />

## Carousel `carousel` / `carousel-item`

`carousel` is the container; children are `carousel-item` (or plain `img`). **Children may also be written as `[item]`** — inside `carousel` it renders as a slide (same name as `[item]` in `list`/`desc`, disambiguated by parent; `item` and `carousel-item` are equivalent and can be mixed). `auto` sets the autoplay interval (in milliseconds). Supports left/right arrows, indicator dots, dragging, and left/right keyboard navigation.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `auto` | Autoplay interval (ms) | `carousel` | `auto:3000` |
| `id` | Identifier | `carousel` | `id:myCarousel` |
| `s` | Image URL | `carousel-item` / `item` | `s:https://...` |
| `tt` | Slide title | `carousel-item` / `item` | `tt:第一张` |
| `tx` | Slide description | `carousel-item` / `item` | `tx:说明文字` |

<Playground dsl='[carousel auto:4000][item s:https://picsum.photos/seed/c1/600/280 tt:第一张 tx:用 item 声明][carousel-item s:https://picsum.photos/seed/c2/600/280 tt:第二张 tx:两种可混用][item s:https://picsum.photos/seed/c3/600/280 tt:第三张 tx:等价于 carousel-item][/carousel]' />

## Tree `tree` / `tn`

`tree` is the container; child nodes `tn` can be nested recursively. On `tn`, `leaf` marks a leaf node, `open` expands by default, `chk` selects, and `dis` disables. On `tree`, `chk` enables checkbox mode.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `l` | Field label | `tree` | `l:目录` |
| `clk` | Select callback | `tree` | `clk:onPick` |
| `chk` | Checkbox mode | `tree` | `chk` |
| `dis` | Disable the whole tree | `tree` | `dis` |
| `v` / `tx` | Value / display text | `tn` | `tx:src` |
| `leaf` | Leaf node | `tn` | `leaf` |
| `open` | Expand by default | `tn` | `open` |
| `chk` / `dis` | Selected / disabled | `tn` | `chk` |

<Playground dsl='[tree l:项目结构][tn tx:src open][tn tx:components leaf][tn tx:core leaf][tn tx:styles leaf][/tn][tn tx:tests open][tn tx:test-parser.js leaf][tn tx:test-renderer.js leaf][/tn][tn tx:package.json leaf][/tree]' />

## Menu `menu` / `menu-item`

`menu` is the container; `menu-item` is self-closing. `v` switches direction (`vertical` default / `horizontal` / `inline`), `act` sets the `clk` value of the active item, and `bg`/`fc` customize colors.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `v` | Direction variant | `menu` | `v:horizontal` |
| `act` | Active item clk | `menu` | `act:goHome` |
| `bg` / `fc` | Background / text color | `menu` | `bg:1f2937` |
| `tx` | Text | `menu-item` | `tx:首页` |
| `clk` | Click handler | `menu-item` | `clk:goHome` |
| `i` | Icon glyph | `menu-item` | `i:🏠` |
| `dis` | Disabled | `menu-item` | `dis` |

<Playground dsl='[row][col span:6][p v:bold 竖向菜单][menu act:goHome][menu-item tx:首页 i:🏠 clk:goHome][menu-item tx:产品 i:📦 clk:goProduct][menu-item tx:文档 i:📖 clk:goDocs][menu-item tx:设置 i:⚙️ dis][/menu][/col][col span:6][p v:bold 横向菜单][menu v:horizontal][menu-item tx:概览 clk:go1][menu-item tx:分析 clk:go2][menu-item tx:报告 clk:go3][/menu][/col][/row]' />

## Resizable Panel `resizable`

A two-pane layout with a draggable splitter. `dir` controls the direction; `min`/`max`/`default` constrain the first pane's size. The first child node goes into the first pane; the rest go into the second. Supports fine-tuning with arrow keys.

| Prop | Meaning | Example |
|------|---------|---------|
| `dir` | Direction (`h` horizontal default / `v` vertical) | `dir:v` |
| `min` | Minimum size (px) | `min:120` |
| `max` | Maximum size (px) | `max:600` |
| `default` | Initial size (px) | `default:240` |
| `w` | Overall width | `w:100%` |

**Horizontal · Sidebar + Main** — The most common IDE / admin layout: a fixed-width left pane that can be dragged wider, and a right pane that fills the rest.

<Playground dsl='[resizable dir:h min:140 max:320 default:200][menu][menu-item tx:Home i:🏠][menu-item tx:Product i:📦][menu-item tx:Orders i:📋][menu-item tx:Settings i:⚙️ dis][/menu][card tt:"Main Content"][p v:muted Left nav is draggable; right pane fills the remaining space.][p Common in IDEs, admin panels, and mail clients.][/card][/resizable]' />

**Vertical · Editor + Terminal** — `dir:v` splits top/bottom: code or preview above, logs or console below.

<Playground dsl='[resizable dir:v min:80 max:240 default:140][code lang:js]const greet = name => "Hello, " + name;\nconsole.log(greet("TokUI"));[/code][terminal status:success]$ npm run dev\n✓ ready on http://localhost:3109[/terminal][/resizable]' />

**Nested · Three-pane Workspace** — `resizable` nests: outer splits horizontally, the right pane splits vertically again, yielding three regions.

<Playground dsl='[resizable dir:h min:120 max:260 default:160][card tt:"File Tree"][list][item src/][item components/][item core/][item styles/][/list][/card][resizable dir:v min:60 max:200 default:120][card tt:Preview][p v:muted Top: rendered output or docs.][/card][card tt:Console][terminal]$ build ok\n✓ dist/tokui.umd.js[/terminal][/card][/resizable][/resizable]' />

**Tight Constraint · Floating Rail** — When `min` is close to `max`, the first pane is nearly fixed with only fine-tuning room.

<Playground dsl='[resizable dir:h min:120 max:160 default:140][callout t:info]Fixed rail (120–160px)[/callout][callout t:success]Adaptive area: drag range is tightly constrained — handy for side badges or toolbars.[/callout][/resizable]' />

## Scroll Area `scroll-area`

A content region with a fixed outer size and custom scrollbar styling. `h`/`w` set the viewport size; overflowing content scrolls.

| Prop | Meaning | Example |
|------|---------|---------|
| `h` | Height | `h:160` |
| `w` | Width | `w:100%` |
| `id` | Identifier | `id:myScroll` |

<Playground dsl='[scroll-area h:180][p 第一段：滚动区域内可放任意长内容，超出部分出现自定义滚动条。][p 第二段：固定高度 180px，自动纵向滚动。][p 第三段：常用于侧边栏长列表、聊天记录区、日志面板。][p 第四段：配合 row/col 可做多栏滚动。][p 第五段：滚动到底部。][/scroll-area]' />

## Sidebar `sidebar`

`sidebar` is a container; children are `sidebar-content` (main content) and `sidebar-footer` (footer). `collapsible` enables the collapse button.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `w` | Width (default 260) | `sidebar` | `w:240` |
| `pos` | Position (`left`/`right`) | `sidebar` | `pos:left` |
| `collapsible` | Collapsible | `sidebar` | `collapsible` |
| `tt` | Title / logo text | `sidebar` | `tt:控制台` |
| `bg` / `fc` | Background / text color | `sidebar` | `bg:111827` |

<Playground dsl='[sidebar tt:控制台 w:240][sidebar-content][menu][menu-item tx:仪表盘 clk:goDash][menu-item tx:用户管理 clk:goUsers][menu-item tx:系统设置 clk:goSettings][/menu][/sidebar-content][sidebar-footer][p v:muted v:sm v:center 当前用户：admin][/sidebar-footer][/sidebar]' />

## Tooltip `tooltip`

A lightweight hover-revealed text tip. `tt` is the tip content, `tx` is the trigger text, and `pos` controls the direction. It pops up on mouse enter and dismisses on leave/blur/Esc.

| Prop | Meaning | Example |
|------|---------|---------|
| `tt` | Tip text | `tt:这是提示` |
| `tx` | Trigger text | `tx:悬停看我` |
| `pos` | Direction (default `top`) | `pos:bottom` |

**Variants**: `top` / `bottom` / `left` / `right`.

<Playground dsl='[p][tooltip tt:上方提示 tx:悬停（上） pos:top] · [tooltip tt:下方提示 tx:悬停（下） pos:bottom] · [tooltip tt:左侧提示 tx:悬停（左） pos:left] · [tooltip tt:右侧提示 tx:悬停（右） pos:right][/p][p v:muted 移入触发文本即可看到提示气泡。][/p]' />

## Popover `popover`

A richer popup card than `tooltip`, supporting a title and arbitrary child content. `trig` switches the trigger mode (`click` default / `hover`), `pos` controls the direction, and `w` sets the panel width.

| Prop | Meaning | Example |
|------|---------|---------|
| `tx` | Trigger text | `tx:点击查看` |
| `tt` | Title | `tt:用户信息` |
| `pos` | Direction (default `top`) | `pos:bottom` |
| `trig` | Trigger mode | `trig:hover` |
| `w` | Panel width | `w:240` |

<Playground dsl='[popover tt:操作菜单 tx:点击展开 pos:bottom w:240 trig:click][list plain][item 新建项目][item 导入数据][item 导出报表][/list][/popover] [popover tt:悬浮预览 tx:悬停预览 pos:top trig:hover][p 鼠标悬停即可展示富内容。[/popover]' />

## Hover Card `hover-card`

`hover-card` is a container; children are `hover-trigger` (trigger area) and `hover-content` (pop-up content). `delay` controls the show delay, `pos` controls the direction, and the content is positioned with `position:fixed` to avoid clipping.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `pos` | Direction (default `bottom`) | `hover-card` | `pos:right` |
| `w` | Pop-up width (px) | `hover-card` | `w:280` |
| `delay` | Show delay (ms, default 300) | `hover-card` | `delay:200` |

<Playground dsl='[hover-card pos:bottom w:240 delay:200][hover-trigger][a u:# tx:@TokUI v:underline][/hover-trigger][hover-content][card tt:TokUI][p v:sm 零依赖的流式 UI 描述与渲染框架。][tag tx:开源 t:success round][/card][/hover-content][/hover-card]' />

## Popconfirm `popconfirm`

A small confirmation popup with OK / Cancel buttons triggered on click. `tt` is the question text, `tx` the trigger button text, `clk` the confirm callback, `t` the confirm button type, and `pos` the direction.

| Prop | Meaning | Example |
|------|---------|---------|
| `tt` | Question text | `tt:确定删除吗？` |
| `tx` | Trigger button text | `tx:删除` |
| `clk` | Confirm callback | `clk:onConfirm` |
| `t` | Confirm button type (default `primary`) | `t:danger` |
| `pos` | Direction (default `top`) | `pos:right` |
| `ok-text` / `cancel-text` | Button text | `ok-text:删除` |

<Playground dsl='[p][popconfirm tt:确定要删除这条记录吗？ tx:删除 t:danger clk:onDelDelete pos:bottom ok-text:删除] [popconfirm tt:确认提交本次表单？ tx:提交 clk:onSubmit pos:top][/p]' />

## Back to Top `backtop`

A back-to-top button that appears after a page or container scrolls past a threshold. `t` sets the threshold (default 200), `container` switches to in-container mode, and `v` sets the shape.

| Prop | Meaning | Example |
|------|---------|---------|
| `t` | Visibility threshold (px, default 200) | `t:300` |
| `v` | Shape (`circle` / `round` / `square`) | `v:round` |
| `tx` | Button text (default `↑`) | `tx:顶部` |
| `s` | Size | `s:lg` |
| `container` | In-container mode | `container` |
| `bottom` / `right` | Distance from bottom / right (px) | `bottom:40` |

> `backtop` floats in the bottom-right corner and is only visible after scrolling. The example below uses a callout to describe its behavior.

<Playground dsl='[callout t:tip tt:回到顶部组件][p [backtop t:200 v:circle tx:↑] 滚动页面超过 200px 即在右下角出现，点击平滑回到顶部。][/callout]' />

## Command Palette `command`

`command` is a container; children are `command-group` (group, `tt` title), whose items use `item` (or `command-item` — equivalent; `item` recommended). Built-in fuzzy search, keyboard up/down selection, and Enter to confirm.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `ph` | Search box placeholder | `command` | `ph:搜索命令...` |
| `clk` | Select callback | `command` | `clk:onCommand` |
| `id` | Identifier (the trigger button's `data-target` points to it) | `command` | `id:cmdMain` |
| `tt` | Group title | `command-group` | `tt:常用` |
| `tx` | Display text | `item` / `command-item` | `tx:新建文件` |
| `v` | Search value (defaults to `tx`) | `item` / `command-item` | `v:new file` |
| `clk` | Item callback | `item` / `command-item` | `clk:cmdNew` |
| `shortcut` | Shortcut hint | `item` / `command-item` | `shortcut:⌘N` |

> The palette is hidden by default and triggered by a button: the trigger uses `clk:openCommand data-target:"<the command's id>"`, and the matching `[command id:...]` carries the same id. Use `hotkey` to opt into `Cmd/Ctrl+K` (only one hotkey instance per page).

<Playground dsl='[btn tx:⌘ 打开命令面板 clk:openCommand data-target:demoCmd v:primary][command ph:输入命令或搜索... clk:onCommand id:demoCmd][command-group tt:常用操作][item tx:新建文件 clk:cmdNew shortcut:⌘N][item tx:打开项目 clk:cmdOpen shortcut:⌘O][item tx:搜索替换 clk:cmdSearch shortcut:⌘F][/command-group][command-group tt:导航][item tx:跳到行 clk:cmdGoto][item tx:切换主题 clk:cmdTheme][/command-group][/command]' />

## Canvas Panel `canvas`

`canvas` is a container; children are `canvas-content` (content area). `pos` controls the dock direction, `w` the width, `open` expands it by default, and `closable` whether it can be closed.

| Prop | Meaning | Applies to | Example |
|------|---------|------------|---------|
| `tt` | Title (default `Canvas`) | `canvas` | `tt:预览` |
| `pos` | Position (`left`/`right`, default `right`) | `canvas` | `pos:right` |
| `w` | Width (default 400) | `canvas` | `w:360` |
| `open` | Expand by default | `canvas` | `open` |
| `closable` | Closable (default on) | `canvas` | `closable` |
| `tx` | Self-closing body text | `canvas` | `tx:简单内容` |

<Playground dsl='[canvas tt:实时预览 pos:right w:340 open][canvas-content][p 这是画布面板的内容区，常用于代码/设计预览。][callout t:success tt:就绪][p v:sm 面板默认展开，可点击边缘标签折叠。[/callout][/canvas-content][/canvas]' />

> When nesting container components deeply, close each container with `[/type]` immediately after its content to avoid rendering glitches caused by misplaced implicit closing during streaming parsing.
