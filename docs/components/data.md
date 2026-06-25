# 数据展示组件

表格、描述列表、分页、面包屑、下拉菜单、日历、水印、头像、动态更新等结构化数据呈现组件。每个示例左侧为格式化 + 高亮的 TokUI DSL，右侧为实时渲染，点「编辑」可即时改动。

## 表格 `table` / `thead` / `tbody` / `tr`

最常用的数据展示组合：`table` 容器为外壳，`thead` 通过 `cols` 定义表头，`tbody` 容纳数据行，`tr` 自闭合、单元格用逗号分隔。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `stripe` | 斑马纹（布尔） | `table` | `stripe` |
| `cap` | 表格标题 | `table` | `cap:用户列表` |
| `v` | 变体 | `table` | `v:bordered` |
| `cols` | 表头列定义（逗号分隔，含逗号/中文必须双引号） | `thead` | `cols:"姓名,年龄"` |
| `cs` | 合并列数（作用于行首单元格） | `tr` | `cs:2` |
| `n` | 列标题（仅 `tcol` 子节点） | `tcol` | `n:名称` |

**`thead` 的 `cols` 特殊占位**：
- `chk` —— 该列渲染为表头复选框，行内对应单元格自动渲染行内复选框。
- `#` —— 序号列，行内单元格自动渲染 1/2/3...，无需手填。
- 普通文本 —— 直接作为表头标题。

**`tr` 单元格分隔符**：单元格用逗号分隔，`smartSplit` 会保留带引号子串，因此单元格含 `,` 时用双引号包裹整段。

<Playground dsl='[table stripe][thead cols:"姓名,年龄,城市,状态"][tbody][tr 张三,25,北京,在职][tr 李四,30,上海,休假][tr 王五,28,深圳,在职][/tbody][/table]' />

### 表格变体

`v:bordered`（全边框）、`v:compact`（紧凑行高，适合数据密集场景）、`stripe`（斑马纹）可叠加。

<Playground dsl='[table v:"bordered,compact"][thead cols:"ID,名称,价格,库存"][tbody][tr 1,商品A,¥99,200][tr 2,商品B,¥199,50][tr 3,商品C,¥299,0][/tbody][/table]' />

### 复选列

`thead cols` 中以 `chk` 占位声明复选列，对应行单元格留空或填 `#` 即可自动渲染行内复选框。

<Playground dsl='[table bordered][thead cols:"chk,任务,负责人,进度"][tbody][tr #,设计登录页,张三,80%][tr #,开发接口,李四,100%][tr #,联调测试,王五,30%][/tbody][/table]' />

### 合并单元格

`tr` 的 `cs:N` 让**行首单元格**横向合并 N 列，合并区间内的其余单元格直接省略不写。最常见用法是分组分隔行：让 `cs` 等于总列数，整行合并成一个 section 标题；其余数据行的单元格数量要与表头列数对齐。

<Playground dsl='[table bordered][thead cols:"分类,项目,负责人"][tbody][tr cs:3 "前端组（共 2 项）"][tr 重构,张三,进行中][tr 性能,李四,已完成][tr cs:3 "后端组（共 1 项）"][tr 接口,王五,规划中][/tbody][/table]' />

> **`tr` 含空格的解析器约束**：解析器按空格切 token，若某行带内联属性（`cs:2`、`tag:`、`btn:`、`progress`）或单元格内容含空格，**整行内容必须用双引号包裹**，例如 `[tr cs:2 "前端,合并区"]` 或 `[tr "任务 A,进度 80%,<...>"]`，否则空格后的部分会被误判为属性。详见 [DSL 语法](/guide/dsl-syntax)。

### 列占位 `tcol`

`thead` 不写 `cols` 时可改用 `tcol` 子节点逐列声明（`n` 列标题），适合动态生成列的场景。

<Playground dsl='[table stripe][thead][tcol n:月份][tcol n:销售额][tcol n:环比][/thead][tbody][tr 1月,120万,+12%][tr 2月,190万,+18%][/tbody][/table]' />

## 描述列表 `desc` / `desc-item`

键值对形式的结构化展示，常用于详情页。`desc` 容器，子节点 `desc-item`（`l` 标签、`tx` 值、`span` 列跨距）。`desc` 的子节点也可直接写 `[item]`——在 `desc` 内自动按描述项渲染（与 `list` 内的 `[item]` 同名不同义，按父级区分）。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `cols` | 每行列数（默认 3） | `desc` | `cols:2` |
| `stripe` | 斑马纹（布尔） | `desc` | `stripe` |
| `bordered` | 带边框（布尔） | `desc` | `bordered` |
| `v` | 布局方向 | `desc` | `v:horizontal` |
| `lw` | 标签宽度（horizontal 生效） | `desc` | `lw:120px` |
| `l` | 标签文本 | `desc-item` / `item` | `l:用户名` |
| `tx` | 值文本 | `desc-item` / `item` | `tx:张三` |
| `span` | 列跨距（不超过 `cols`） | `desc-item` / `item` | `span:2` |

**`desc` 变体**：`horizontal` / `h`（标签与值左右排列，默认上下排列）。

<Playground dsl='[desc cols:2 bordered][item l:用户名 tx:张三][item l:角色 tx:管理员][desc-item l:邮箱 tx:zhangsan@example.com][desc-item l:注册时间 tx:2026-01-15][/desc]' />

`[item]` 与 `[desc-item]` 在 `desc` 内等价，可混用。`v:horizontal` 让标签与值同排，配合 `lw` 统一标签列宽：

<Playground dsl='[desc cols:1 v:horizontal lw:100px stripe][desc-item l:姓名 tx:李四][desc-item l:部门 tx:产品中心][desc-item l:备注 tx:核心成员 span:1][/desc]' />

`v:horizontal` 让标签与值同排，配合 `lw` 统一标签列宽：

<Playground dsl='[desc cols:1 v:horizontal lw:100px stripe][desc-item l:姓名 tx:李四][desc-item l:部门 tx:产品中心][desc-item l:备注 tx:核心成员 span:1][/desc]' />

## 分页 `pagination`

自闭合。`page` 当前页、`total` 总页数、`clk` 翻页处理器、`count` 总条目数（配 `show-total` 显示总数）。

| 属性 | 含义 | 示例 |
|------|------|------|
| `page` | 当前页 | `page:3` |
| `total` | 总页数 | `total:10` |
| `count` | 总条目数 | `count:128` |
| `show-total` | 显示总数（布尔） | `show-total` |
| `s` | 尺寸 | `s:sm` |
| `clk` | 翻页处理器名 | `clk:onPage` |

**变体（尺寸）**：`sm` / `lg`。

<Playground dsl='[pagination page:3 total:10 count:128 show-total clk:onPage][pagination page:5 total:8 s:sm]' />

> 分页内部已实现页码切换 UI，点击页码会即时刷新并调用 `clk` 处理器（参数 `{ page }`）；处理器需通过 `TokUI.registerHandler` 预先注册。

## 面包屑 `breadcrumb`

自闭合。`items` 逗号分隔路径节点，`sep` 自定义分隔符（默认 `/`），`v:arrow` 改用箭头 `›`。

| 属性 | 含义 | 示例 |
|------|------|------|
| `items` | 节点文本（逗号分隔，含逗号/中文必须双引号） | `items:"首页,用户,详情"` |
| `sep` | 分隔符 | `sep:>` |
| `v` | 变体 | `v:arrow` |
| `clk` | 点击处理器（最后一项不触发） | `clk:onCrumb` |

**变体**：`arrow`（箭头样式）。

<Playground dsl='[breadcrumb items:"首页,用户管理,详情" clk:onCrumb][breadcrumb items:"控制台,数据,报表" v:arrow]' />

## 下拉菜单 `dropdown` / `dd-item`

`dropdown` 容器，触发文字写在 `tt` 或 `tx`，子节点 `dd-item` 为菜单项。点击触发按钮展开，选中后自动收起。

| 属性 | 含义 | 适用 | 示例 |
|------|------|------|------|
| `tt` / `tx` | 触发按钮文字 | `dropdown` | `tt:更多操作` |
| `v` | 触发按钮变体 | `dropdown` | `v:primary` |
| `tx` | 菜单项文字 | `dd-item` | `tx:编辑` |
| `clk` | 点击处理器名 | `dd-item` | `clk:onEdit` |
| `dis` | 禁用（布尔） | `dd-item` | `dis` |
| `v` | 菜单项变体 | `dd-item` | `v:danger` |

**`dd-item` 变体**：`danger`（危险操作红色）。

<Playground dsl='[dropdown tt:更多操作][dd-item tx:编辑 clk:onEdit][dd-item tx:复制 clk:onCopy][dd-item tx:导出 clk:onExport][dd-item tx:删除 v:danger clk:onDel][dd-item tx:已锁定 dis][/dropdown]' />

## 日历 `calendar`

自闭合。`month` 指定年月（`2026-06`），`marks` 标记日（逗号分隔日号），`sel` 离散选中日，`range:"a-b"` 单区间，`ranges:"a-b;c-d"` 多区间。

| 属性 | 含义 | 示例 |
|------|------|------|
| `month` | 年月（默认本月） | `month:2026-06` |
| `tt` | 自定义标题 | `tt:6 月排期` |
| `marks` | 标记日（逗号分隔） | `marks:"5,12,20"` |
| `sel` | 离散选中日 | `sel:"8,15"` |
| `range` | 单区间 | `range:"10-18"` |
| `ranges` | 多区间（`;` 分隔） | `ranges:"3-7;20-25"` |
| `v` | 变体 | `v:card` |

**变体**：`card`（卡片化）、`mini`（迷你尺寸）。

<Playground dsl='[calendar month:2026-06 marks:"5,12,20" range:"10-18" sel:"8,25" v:card]' />

## 水印 `watermark`

容器。`tx` 水印文字，`c` 颜色，`gap` 单元格间距，`ro` 旋转角度，`font` 字号，子节点为受保护的正文内容。

| 属性 | 含义 | 示例 |
|------|------|------|
| `tx` | 水印文字 | `tx:内部资料` |
| `c` | 颜色 | `c:rgba(0,0,0,0.15)` |
| `gap` | 平铺间距（px） | `gap:60` |
| `ro` | 旋转角度 | `ro:-30` |
| `font` | 字号 | `font:18` |
| `s` | 尺寸预设（`sm`/`lg`） | `s:lg` |

<Playground dsl='[watermark tx:TokUI c:rgba(0,0,0,0.12) font:18 gap:60][card tt:受水印保护的卡片][p 这段内容被水印覆盖，水印以 canvas 平铺生成，不影响内容交互。][p 适合用于内部资料、防截图泄露等场景。][/card][/watermark]' />

## 头像 `avatar`

自闭合。`s` 图片地址（图片模式），`tx` 文字回退（取前两字符），不传 `s` 时按 `tx` 哈希自动分配背景色。

| 属性 | 含义 | 示例 |
|------|------|------|
| `s` | 图片地址 | `s:https://.../a.png` |
| `tx` | 文字回退（取前 2 字） | `tx:张三` |
| `size` | 尺寸 | `size:lg` |
| `bg` | 背景色（文字模式生效） | `bg:1677ff` |
| `fc` | 文字色 | `fc:fff` |

**尺寸**：`sm` / `md`（默认）/ `lg` / `xl`。

<Playground dsl='[avatar s:https://assets.vdata.chat/jboltai/aiimg/logo_60.png size:lg] [avatar tx:张三 size:md] [avatar tx:李四 size:md bg:1677ff fc:fff] [avatar tx:王五 size:sm] [avatar tx:产品 size:lg]' />

## 动态更新 `upd`

自闭合指令。`id` 指向已渲染组件的 ID，其余属性为更新内容；渲染时立即查找目标元素并调用其 `_update` 方法刷新。常见于后端 SSE 推送异步状态变化（进度、步骤、状态色）。

| 属性 | 含义 | 示例 |
|------|------|------|
| `id` | 目标元素 ID（必填） | `id:demo` |
| `v` | 新值 | `v:80` |
| `status` | 新状态 | `status:success` |
| `tt` / `tx` | 新标题 / 新文本 | `tt:已完成` |
| `act` | 新动作 | `act:restart` |

**用法**：先在页面上渲染一个带 `id` 的组件，再用 `upd` 指令覆盖其状态。下面的示例先把进度渲染到 30%，`upd` 紧接着把同一目标更新到 80% 并标记为成功——渲染完成时你看到的就是更新后的最终态。

<Playground dsl='[progress id:demo v:30 l:下载中][upd id:demo v:80 status:success]' />

> `upd` 仅在目标组件实现了 `_update` 时生效（如 `progress`、`stat`、`steps` 等）。若目标未渲染或无 `_update` 方法，`upd` 静默无操作，渲染为空文本节点。完整属性见 [DSL 参考](https://github.com/jboltai/tokui/blob/master/demo/TOKUI_DSL_REFERENCE.md) 第 5.2 节。
