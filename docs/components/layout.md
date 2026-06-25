# 布局组件

卡片、栅格、列表、标签页、折叠、对话框、抽屉、时间轴、步骤条、轮播、树、菜单等容器型布局组件。容器组件需用 `[/type]` 闭合，左侧为格式化的 TokUI DSL，右侧为实时渲染，点「编辑」可即时改动。

## 卡片 `card` / 页脚 `ft`

`card` 通用内容容器，`tt` 出标题、`tx` 直接写正文（自闭合模式），主体内容由子节点填充。`ft` 作为 `card` 的子容器，自动落到卡片底部作页脚。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `tt` | 标题 | `card` | `tt:用户信息` |
| `tx` | 自闭合正文 | `card` | `tx:一段说明` |
| `hc` | 标题色（预设或色值） | `card` | `hc:primary` |
| `ht` | 标题装饰样式 | `card` | `ht:underline` |
| `w` | 宽度 | `card` | `w:320` |
| `v` | 变体 | `card` | `v:highlight` |
| `v` | 对齐 | `ft` | `v:right` |

**`card` 变体**：`highlight`（高亮边）、`flat`（扁平无阴影）、`bordered`（描边）、`center` / `right`（标题对齐）。
**`ht` 标题装饰**：`fill`（填充色块）、`accent`（左侧色条）、`underline`（下划线）、`dot`（前缀圆点）、`pill`（胶囊）。
**`ft` 变体**：`left` / `center` / `right`。

<Playground dsl='[row][col span:6][card tt:基础卡片][p 这是基础卡片，承载正文与子组件。][/card][/col][col span:6][card tt:高亮卡片 v:highlight ht:underline hc:primary][p 带下划线标题的高亮卡片。][/card][/col][/row][card tt:带页脚的卡片 hc:danger ht:accent][p 主体内容：把操作按钮放进页脚区。][ft v:right][btn tx:取消] [btn tx:确定 v:primary][/ft][/card]' />

## 栅格 `row` / `col`

基于 12 栅格系统的响应式布局。`row` 容器行，`col` 列，`span` 指定列宽（1-12）。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `v` | 对齐方式 | `row` | `v:center` |
| `span` | 列宽（1-12） | `col` | `span:4` |

**`row` 变体**：`left` / `center` / `right`（水平对齐）、`inline`（行内排列）。

<Playground dsl='[row][col span:4][callout t:info]span:4[/callout][/col][col span:4][callout t:success]span:4[/callout][/col][col span:4][callout t:warning]span:4[/callout][/col][/row][row][col span:6][callout t:info]span:6[/callout][/col][col span:3][callout t:tip]span:3[/callout][/col][col span:3][callout t:tip]span:3[/callout][/col][/row]' />

## 列表 `list` / `item`

列表容器，`list` 默认无序（`ul`），`t:ol` 切换有序列表（`ol`）。`item` 列表项（`<li>` 语义），文本写标签内，可嵌套子 `list`，`plain` 隐藏前缀。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `t` | 列表类型 | `list` | `t:ol` |
| `plain` | 去除序号/圆点 | `list` | `plain` |
| `tx` | 项文本 | `item` | `tx:第一项` |

<Playground dsl='[row][col span:6][p v:bold 无序列表][list][item 第一项内容][item 第二项内容][item 第三项内容][/list][/col][col span:6][p v:bold 有序列表][list t:ol][item 步骤一][item 步骤二][item 步骤三][/list][/col][/row][p v:bold 嵌套列表][list][item 主分类一[list][item 子项 A][item 子项 B][/list]][item 主分类二][/list]' />

## 标签页 `tabs` / `tab`

`tabs` 容器包裹多个 `tab`，`tt` 为每个标签页的导航标题，纯 CSS 切换。支持键盘左右箭头导航。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `tt` | 标签页标题 | `tab` | `tt:详情` |

<Playground dsl='[tabs][tab tt:概览][p 这是概览页内容。][/tab][tab tt:详情][p 这是详情页内容，可放任意子组件。][stat tt:访问量 v:1024 trend:up][/tab][tab tt:设置][p 设置项放在这里。][/tab][/tabs]' />

## 手风琴 `accordion` / 折叠面板 `collapse`

`accordion` 容器包裹多个 `collapse`，每个 `collapse` 独立可折叠。`tt` 标题、`open` 默认展开。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `tt` | 标题 | `collapse` | `tt:第一章` |
| `open` | 默认展开 | `collapse` | `open` |
| `id` | 标识 | `collapse` | `id:sec1` |

<Playground dsl='[accordion][collapse tt:什么是 TokUI？ open][p TokUI 是零依赖的流式 UI 描述与渲染框架。][/collapse][collapse tt:核心特性][p 流式增量解析、纯原生 DOM、零外部依赖。][/collapse][collapse tt:适用场景][p AI 对话中的流式 UI 生成、低代码可视化搭建。][/collapse][/accordion]' />

## 对话框 `dialog`

原生 `<dialog>` 元素实现，遮罩层 + 居中模态框，Esc / 点击遮罩 / 关闭按钮均可关闭。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tt` | 标题 | `tt:确认操作` |
| `id` | 标识（触发按钮 `data-target` 指向它） | `id:myDialog` |
| `clk` | 关联处理器名 | `clk:openDialog` |

> 由按钮触发：触发按钮写 `clk:openDialog data-target:"<dialog 的 id>"`，对应 `[dialog id:...]` 必须带**相同 id**。点击按钮调用内置 `openDialog` 处理器按 id 找到 dialog 并 `showModal()` 弹出；弹窗内的取消/确认按钮写 `clk:closeDialog` 自动收起所在弹窗（无需手写 id）。

<Playground dsl='[row][col span:6][btn tx:点击打开对话框 v:primary clk:openDialog data-target:demoDialog][dialog tt:用户协议 id:demoDialog][p 请仔细阅读以下协议内容，勾选同意后即可继续。][p v:muted 点击「同意并继续」或 ✕ / 遮罩可关闭对话框。][ft v:right][btn tx:取消 clk:closeDialog] [btn tx:同意并继续 v:primary clk:closeDialog][/ft][/dialog][/col][/row]' />

## 抽屉 `drawer`

侧边滑出的面板，`pos` 控制弹出方向，左右用 `w` 控宽、上下用 `h` 控高。Esc / 遮罩 / 关闭按钮均可关闭。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tt` | 标题 | `tt:筛选条件` |
| `pos` | 位置（`left`/`right`/`top`/`bottom`，默认 `right`） | `pos:left` |
| `w` | 宽度（左右抽屉，默认 `360px`） | `w:420` |
| `h` | 高度（上下抽屉，默认 `300px`） | `h:260` |
| `id` | 标识（触发按钮 `data-target` 指向它） | `id:myDrawer` |
| `clk` | 关联处理器名 | `clk:openDrawer` |

**`pos` 变体**：`left` / `right` / `top` / `bottom`。

> 由按钮触发：触发按钮写 `clk:openDrawer data-target:"<drawer 的 id>"`，对应 `[drawer id:...]` 必须带**相同 id**。点击按钮调用内置 `openDrawer` 处理器按 id 找到 drawer 并添加 `tokui-drawer--open` 类滑出；抽屉内取消/确认按钮写 `clk:closeDrawer` 自动收起。

<Playground dsl='[btn tx:打开筛选抽屉 clk:openDrawer v:primary data-target:demoDrawer][drawer tt:筛选条件 pos:right w:360 id:demoDrawer][p 在这里放置筛选表单或详情内容，Esc / 遮罩 / ✕ 可关闭。][ft v:right][btn tx:取消 clk:closeDrawer][btn tx:应用 v:primary clk:closeDrawer][/ft][/drawer]' />

## 时间轴 `timeline` / `ti`

`timeline` 容器，`ti` 单条记录。`tm` 时间戳、`tt` 标题、`t` 状态色（`primary`/`success`/`warning`/`error`/`info`），正文写标签内。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `v` | 布局（`h`/`alternate`/`card`） | `timeline` | `v:alternate` |
| `tm` | 时间戳 | `ti` | `tm:2026-06-01` |
| `tt` | 标题 | `ti` | `tt:提交申请` |
| `t` | 状态色 | `ti` | `t:success` |

**`timeline` 变体**：`h` / `horizontal`（水平）、`alternate` / `alt`（交替左右）、`card`（卡片样式）。

<Playground dsl='[timeline][ti tm:2026-06-01 09:00 tt:创建订单 t:primary 用户下单成功][ti tm:2026-06-01 10:30 tt:支付完成 t:success 已收到款项][ti tm:2026-06-02 08:00 tt:商家发货 t:warning 商品已出库][ti tm:2026-06-03 14:00 tt:签收确认 t:info 用户确认收货][/timeline]' />

## 步骤条 `steps` / `step`

横向流程指示，`v` 指定当前步序（1-based），`vd:vertical` 切换竖向，`s:sm` 缩小尺寸。`step` 子项的 `status:error` 标记错误态。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `v` | 当前步骤（1-based） | `steps` | `v:2` |
| `vd` | 方向（`horizontal`/`vertical`） | `steps` | `vd:vertical` |
| `s` | 尺寸 | `steps` | `s:sm` |
| `tt` | 步骤标题 | `step` | `tt:填写信息` |
| `status` | 单步状态 | `step` | `status:error` |

<Playground dsl='[steps v:3][step tt:填写信息 基本信息][step tt:身份验证 完成实名认证][step tt:设置支付 配置支付方式][step tt:完成注册 激活账号][/steps]' />

## 轮播 `carousel` / `carousel-item`

`carousel` 容器，子项为 `carousel-item`（或直接 `img`）。**`carousel` 的子项也可写 `[item]`**——在 `carousel` 内自动按幻灯片渲染（与 `list`/`desc` 内的 `[item]` 同名不同义，按父级区分；`item` 与 `carousel-item` 等价，可混用）。`auto` 设置自动播放间隔（毫秒），支持左右箭头、指示点、拖动、键盘左右键切换。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `auto` | 自动播放间隔（ms） | `carousel` | `auto:3000` |
| `id` | 标识 | `carousel` | `id:myCarousel` |
| `s` | 图片地址 | `carousel-item` / `item` | `s:https://...` |
| `tt` | 幻灯片标题 | `carousel-item` / `item` | `tt:第一张` |
| `tx` | 幻灯片描述 | `carousel-item` / `item` | `tx:说明文字` |

<Playground dsl='[carousel auto:4000][item s:https://picsum.photos/seed/c1/600/280 tt:第一张 tx:用 item 声明][carousel-item s:https://picsum.photos/seed/c2/600/280 tt:第二张 tx:两种可混用][item s:https://picsum.photos/seed/c3/600/280 tt:第三张 tx:等价于 carousel-item][/carousel]' />

## 树 `tree` / `tn`

`tree` 容器，子节点 `tn` 可递归嵌套。`tn` 的 `leaf` 标记叶节点、`open` 默认展开、`chk` 选中、`dis` 禁用。`tree` 的 `chk` 开启复选框模式。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `l` | 字段标签 | `tree` | `l:目录` |
| `clk` | 选中回调 | `tree` | `clk:onPick` |
| `chk` | 复选框模式 | `tree` | `chk` |
| `dis` | 整树禁用 | `tree` | `dis` |
| `v` / `tx` | 值 / 显示文本 | `tn` | `tx:src` |
| `leaf` | 叶节点 | `tn` | `leaf` |
| `open` | 默认展开 | `tn` | `open` |
| `chk` / `dis` | 选中 / 禁用 | `tn` | `chk` |

<Playground dsl='[tree l:项目结构][tn tx:src open][tn tx:components leaf][tn tx:core leaf][tn tx:styles leaf][/tn][tn tx:tests open][tn tx:test-parser.js leaf][tn tx:test-renderer.js leaf][/tn][tn tx:package.json leaf][/tree]' />

## 菜单 `menu` / `menu-item`

`menu` 容器，`menu-item` 自闭合。`v` 切换方向（`vertical` 默认 / `horizontal` 横向 / `inline` 内联），`act` 默认激活项的 `clk` 值，`bg`/`fc` 自定义配色。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `v` | 方向变体 | `menu` | `v:horizontal` |
| `act` | 默认激活项 clk | `menu` | `act:goHome` |
| `bg` / `fc` | 背景 / 文字色 | `menu` | `bg:1f2937` |
| `tx` | 文字 | `menu-item` | `tx:首页` |
| `clk` | 点击处理器 | `menu-item` | `clk:goHome` |
| `i` | 图标字符 | `menu-item` | `i:🏠` |
| `dis` | 禁用 | `menu-item` | `dis` |

<Playground dsl='[row][col span:6][p v:bold 竖向菜单][menu act:goHome][menu-item tx:首页 i:🏠 clk:goHome][menu-item tx:产品 i:📦 clk:goProduct][menu-item tx:文档 i:📖 clk:goDocs][menu-item tx:设置 i:⚙️ dis][/menu][/col][col span:6][p v:bold 横向菜单][menu v:horizontal][menu-item tx:概览 clk:go1][menu-item tx:分析 clk:go2][menu-item tx:报告 clk:go3][/menu][/col][/row]' />

## 可调面板 `resizable`

双面板可拖拽分隔条，`dir` 控制方向，`min`/`max`/`default` 限制第一面板尺寸。第一个子节点进第一面板，其余进第二面板。支持键盘箭头微调。

| 属性 | 含义 | 示例 |
|------|------|------|
| `dir` | 方向（`h` 横向默认 / `v` 纵向） | `dir:v` |
| `min` | 最小尺寸（px） | `min:120` |
| `max` | 最大尺寸（px） | `max:600` |
| `default` | 初始尺寸（px） | `default:240` |
| `w` | 整体宽度 | `w:100%` |

**横向 · 侧边导航 + 主内容** — 最常见的 IDE / 后台布局：左栏定宽可拖宽，右栏吃满剩余空间。

<Playground dsl='[resizable dir:h min:140 max:320 default:200][menu][menu-item tx:首页 i:🏠][menu-item tx:产品 i:📦][menu-item tx:订单 i:📋][menu-item tx:设置 i:⚙️ dis][/menu][card tt:主内容区][p v:muted 左侧导航可拖宽，右侧自适应剩余空间。][p 常见于 IDE、后台管理、邮件客户端布局。][/card][/resizable]' />

**纵向 · 编辑器 + 终端** — `dir:v` 上下分割：上方代码 / 预览，下方日志 / 控制台。

<Playground dsl='[resizable dir:v min:80 max:240 default:140][code lang:js]const greet = name => "Hello, " + name;\nconsole.log(greet("TokUI"));[/code][terminal status:success]$ npm run dev\n✓ ready on http://localhost:3109[/terminal][/resizable]' />

**嵌套 · 三栏工作台** — `resizable` 可嵌套：外层横向分左右，右栏内再纵向分上下，构成三区域。

<Playground dsl='[resizable dir:h min:120 max:260 default:160][card tt:文件树][list][item src/][item components/][item core/][item styles/][/list][/card][resizable dir:v min:60 max:200 default:120][card tt:预览][p v:muted 上层：渲染结果或文档。][/card][card tt:控制台][terminal]$ build ok\n✓ dist/tokui.umd.js[/terminal][/card][/resizable][/resizable]' />

**紧约束 · 浮动徽标条** — `min` 接近 `max` 时第一面板尺寸几乎固定，仅留微调余量。

<Playground dsl='[resizable dir:h min:120 max:160 default:140][callout t:info]固定栏（120–160px）[/callout][callout t:success]自适应区：拖动范围被紧约束，常用于侧边徽标 / 工具条。[/callout][/resizable]' />

## 滚动区域 `scroll-area`

固定外层尺寸 + 自定义滚动条样式的内容区。`h`/`w` 控制视口大小，超长内容即可滚动。

| 属性 | 含义 | 示例 |
|------|------|------|
| `h` | 高度 | `h:160` |
| `w` | 宽度 | `w:100%` |
| `id` | 标识 | `id:myScroll` |

<Playground dsl='[scroll-area h:180][p 第一段：滚动区域内可放任意长内容，超出部分出现自定义滚动条。][p 第二段：固定高度 180px，自动纵向滚动。][p 第三段：常用于侧边栏长列表、聊天记录区、日志面板。][p 第四段：配合 row/col 可做多栏滚动。][p 第五段：滚动到底部。][/scroll-area]' />

## 侧边栏 `sidebar`

`sidebar` 容器，子节点为 `sidebar-content`（主内容区）和 `sidebar-footer`（页脚区）。`collapsible` 开启折叠按钮。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `w` | 宽度（默认 260） | `sidebar` | `w:240` |
| `pos` | 位置（`left`/`right`） | `sidebar` | `pos:left` |
| `collapsible` | 可折叠 | `sidebar` | `collapsible` |
| `tt` | 标题 / Logo 文本 | `sidebar` | `tt:控制台` |
| `bg` / `fc` | 背景 / 文字色 | `sidebar` | `bg:111827` |

<Playground dsl='[sidebar tt:控制台 w:240][sidebar-content][menu][menu-item tx:仪表盘 clk:goDash][menu-item tx:用户管理 clk:goUsers][menu-item tx:系统设置 clk:goSettings][/menu][/sidebar-content][sidebar-footer][p v:muted v:sm v:center 当前用户：admin][/sidebar-footer][/sidebar]' />

## 文字提示 `tooltip`

悬浮显示的轻量文字提示，`tt` 为提示内容、`tx` 为触发文本、`pos` 控制方向。鼠标移入即弹出，移出/失焦/Esc 收起。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tt` | 提示文本 | `tt:这是提示` |
| `tx` | 触发文本 | `tx:悬停看我` |
| `pos` | 方向（默认 `top`） | `pos:bottom` |

**变体**：`top` / `bottom` / `left` / `right`。

<Playground dsl='[p][tooltip tt:上方提示 tx:悬停（上） pos:top] · [tooltip tt:下方提示 tx:悬停（下） pos:bottom] · [tooltip tt:左侧提示 tx:悬停（左） pos:left] · [tooltip tt:右侧提示 tx:悬停（右） pos:right][/p][p v:muted 移入触发文本即可看到提示气泡。][/p]' />

## 气泡卡片 `popover`

比 `tooltip` 更丰富的弹出卡片，可放标题与任意子节点内容。`trig` 切换触发方式（`click` 默认 / `hover`），`pos` 控制方向，`w` 控制面板宽。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tx` | 触发文本 | `tx:点击查看` |
| `tt` | 标题 | `tt:用户信息` |
| `pos` | 方向（默认 `top`） | `pos:bottom` |
| `trig` | 触发方式 | `trig:hover` |
| `w` | 面板宽度 | `w:240` |

<Playground dsl='[popover tt:操作菜单 tx:点击展开 pos:bottom w:240 trig:click][list plain][item 新建项目][item 导入数据][item 导出报表][/list][/popover] [popover tt:悬浮预览 tx:悬停预览 pos:top trig:hover][p 鼠标悬停即可展示富内容。[/popover]' />

## 悬停卡片 `hover-card`

`hover-card` 容器，子节点为 `hover-trigger`（触发区）与 `hover-content`（弹出内容）。`delay` 控制显示延迟，`pos` 控制方向，内容用 `position:fixed` 定位避免裁切。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `pos` | 方向（默认 `bottom`） | `hover-card` | `pos:right` |
| `w` | 弹层宽度（px） | `hover-card` | `w:280` |
| `delay` | 显示延迟（ms，默认 300） | `hover-card` | `delay:200` |

<Playground dsl='[hover-card pos:bottom w:240 delay:200][hover-trigger][a u:# tx:@TokUI v:underline][/hover-trigger][hover-content][card tt:TokUI][p v:sm 零依赖的流式 UI 描述与渲染框架。][tag tx:开源 t:success round][/card][/hover-content][/hover-card]' />

## 确认气泡 `popconfirm`

点击触发后弹出小型确认框，含确定 / 取消按钮。`tt` 询问文案、`tx` 触发按钮文字、`clk` 确定回调、`t` 确定按钮类型、`pos` 方向。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tt` | 询问文案 | `tt:确定删除吗？` |
| `tx` | 触发按钮文字 | `tx:删除` |
| `clk` | 确定回调 | `clk:onConfirm` |
| `t` | 确定按钮类型（默认 `primary`） | `t:danger` |
| `pos` | 方向（默认 `top`） | `pos:right` |
| `ok-text` / `cancel-text` | 按钮文字 | `ok-text:删除` |

<Playground dsl='[p][popconfirm tt:确定要删除这条记录吗？ tx:删除 t:danger clk:onDelDelete pos:bottom ok-text:删除] [popconfirm tt:确认提交本次表单？ tx:提交 clk:onSubmit pos:top][/p]' />

## 回到顶部 `backtop`

页面或容器滚动超过阈值后浮现的回到顶部按钮。`t` 设置阈值（默认 200），`container` 切换为容器内模式，`v` 控形状。

| 属性 | 含义 | 示例 |
|------|------|------|
| `t` | 出现阈值（px，默认 200） | `t:300` |
| `v` | 形状（`circle` / `round` / `square`） | `v:round` |
| `tx` | 按钮文字（默认 `↑`） | `tx:顶部` |
| `s` | 尺寸 | `s:lg` |
| `container` | 容器内模式 | `container` |
| `bottom` / `right` | 距底 / 距右（px） | `bottom:40` |

> `backtop` 浮于右下角，滚动后才可见；下例用 callout 说明其行为。

<Playground dsl='[callout t:tip tt:回到顶部组件][p [backtop t:200 v:circle tx:↑] 滚动页面超过 200px 即在右下角出现，点击平滑回到顶部。][/callout]' />

## 命令面板 `command`

`command` 容器，子节点为 `command-group`（分组，`tt` 标题），其下命令项用 `item`（或 `command-item`，两者等价；推荐 `item`）。内置模糊搜索、键盘上下选择、回车确认。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `ph` | 搜索框占位 | `command` | `ph:搜索命令...` |
| `clk` | 选中回调 | `command` | `clk:onCommand` |
| `id` | 标识（触发按钮 `data-target` 指向它） | `command` | `id:cmdMain` |
| `tt` | 分组标题 | `command-group` | `tt:常用` |
| `tx` | 显示文本 | `item` / `command-item` | `tx:新建文件` |
| `v` | 搜索值（默认同 `tx`） | `item` / `command-item` | `v:new file` |
| `clk` | 项回调 | `item` / `command-item` | `clk:cmdNew` |
| `shortcut` | 快捷键提示 | `item` / `command-item` | `shortcut:⌘N` |

> 命令面板默认隐藏，由按钮触发：触发按钮写 `clk:openCommand data-target:"<command 的 id>"`，对应 `[command id:...]` 带相同 id。需要 `Cmd/Ctrl+K` 时显式写 `hotkey`（页面只应有一个 hotkey 实例）。

<Playground dsl='[btn tx:⌘ 打开命令面板 clk:openCommand data-target:demoCmd v:primary][command ph:输入命令或搜索... clk:onCommand id:demoCmd][command-group tt:常用操作][item tx:新建文件 clk:cmdNew shortcut:⌘N][item tx:打开项目 clk:cmdOpen shortcut:⌘O][item tx:搜索替换 clk:cmdSearch shortcut:⌘F][/command-group][command-group tt:导航][item tx:跳到行 clk:cmdGoto][item tx:切换主题 clk:cmdTheme][/command-group][/command]' />

## 画布面板 `canvas`

`canvas` 容器，子节点为 `canvas-content`（内容区）。`pos` 控制停靠方向、`w` 控宽、`open` 默认展开、`closable` 是否可关闭。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `tt` | 标题（默认 `Canvas`） | `canvas` | `tt:预览` |
| `pos` | 位置（`left`/`right`，默认 `right`） | `canvas` | `pos:right` |
| `w` | 宽度（默认 400） | `canvas` | `w:360` |
| `open` | 默认展开 | `canvas` | `open` |
| `closable` | 是否可关闭（默认开） | `canvas` | `closable` |
| `tx` | 自闭合正文 | `canvas` | `tx:简单内容` |

<Playground dsl='[canvas tt:实时预览 pos:right w:340 open][canvas-content][p 这是画布面板的内容区，常用于代码/设计预览。][callout t:success tt:就绪][p v:sm 面板默认展开，可点击边缘标签折叠。[/callout][/canvas-content][/canvas]' />

> 容器型组件层级较深时，建议在每个容器后立即写好闭合标签 `[/type]`，避免流式解析下因隐式闭合时机错位导致渲染异常。
