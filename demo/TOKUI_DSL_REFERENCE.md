# TokUI DSL 语法速查（完整版）

> TokUI 是零依赖的流式 UI 描述语言。后端用 DSL 字符串描述组件，经 SSE 推送到前端，前端增量解析并渲染为真实 DOM。
> 本文件是**权威速查**：以源码为准（`src/core/parser.js` 的 `CONTAINERS` / `BOOLEAN_ATTRS`、`src/core/renderer.js` 的 `VARIANTS`、`src/components/*` 的各渲染函数）。中文文档站分册见 `docs/components/*.md`，图表细节见 `docs/components/chart.md`。

---

## 0. 铁律速记（写之前先读，违反即渲染失败）

1. **属性之间必须空格分隔**——CJK/全角字符（`（）。，！？`）后接新属性也要空格。错 `[item l:服务费（10%）tx:¥48]` → 对 `[item l:服务费（10%） tx:¥48]`。
2. **`tr` 单元格用英文逗号**，含逗号的 cell 双引号包（`[tr 1,"x,y",2]`），**tr 不要外层引号**。唯二例外：① 单元格是带空格的内联组件（`btn:`/`tag:`/`progress`/`[xxx]`）→ 整行外层引号 + `|` 分隔多钮；② **货币符号金额（`¥/$/€/£/₩` 等）千分位自动识别、无需引号**——`¥2,688.00`、`$1,234,567` 直接裸写，parser 不切。
3. **变体必须带 `v:` 前缀**，多变体逗号合并 `v:"primary,sm"`。裸写 `muted`/`primary` 会变正文乱码。
4. **`card` 有子元素时禁用 `tx`**（`tx` = 自闭合叶子卡，子内容会漏到卡外）。价签用 `[h3]`/`[stat]`。
5. **`p` 双模**：有正文=叶子自闭合（可夹内联子节点），无正文=容器 `[p]...[/p]`（放块级组件）。
6. **正文里别写 `英文:值`**（`Q:`/`A:`/`step:1` 会被当属性）→ 用全角 `：` 或双引号包。
7. **正文含字面 `[` `]` 整段双引号包**：`[item "arr[0] 与 arr[1]"]`。
8. **`chart` 属性顺序**：`t 类型 → 样式/布局 → l 标签 → 数据 d/tasks/...`（流式强约束，否则预览翻转）。
9. **组件名必须在本清单内**，禁止臆造（`barcode-box`/`price-card` 等都不存在）。
10. **正文文本块（`p`/`h1~h6`/`item`）用裸内容**，`tx:` 是 `btn`/`tag`/`callout`/`stat`/`badge` 等自闭合展示组件的文本属性。

---

## 1. 基本语法

```tokui
[h1 标题]                                    ;; 自闭合标签
[card tt:标题] 内容 [/card]                  ;; 容器标签，必须 [/type] 闭合
[btn tx:"点击我" v:primary clk:onClick]      ;; 多属性用空格分隔
[tr 张三,25,北京]                            ;; 同类型多值用逗号分隔
ph:"含空格的值"                              ;; 值含空格用双引号包裹
v:"primary,sm"                               ;; 多变体用逗号分隔，渲染器白名单校验
```

- `[type attrs... content]`：第一个 token 为组件类型，后续 `key:value` 为属性，最后剩余文本为内容。
- **容器组件**必须写闭合标签 `[/type]`，自闭合组件不能包含子元素。
- **布尔属性**只写 key 即可生效（见 §3）。
- 属性 key 须为英文标识符（`tt`/`tx`/`clk`/`data-*` 等）；含中文的 `标签:值`（如 `框架:React`）按正文处理。
- **智能变体吸收**：标签已出 `v:` 时，紧跟的裸 token 若命中该组件已知变体名，会并入 `v`（逗号续写）而非当正文。兼容 `[p v:center muted 文本]`，但仍建议规范写 `v:"center,muted"`。
- **漏空格容错**：CJK 值尾部若粘连「非 ASCII + 已知属性 key + `:`」会被自动切分（仅 CJK 边界触发，URL/时间/版本号等 ASCII 冒号值不误切）；仍以写空格为规范。
- **别名**：`ol`/`ul` → `list`（带 `t:ol`/`t:ul`）；`i` → `item`；`case` → `test-case`；`feature` → `welcome-feature`（自闭合简写）。

### 值类型与颜色

- 颜色：语义名 `primary/success/warning/danger/info/dark/light`，或 6 位 hex **不带 `#`**（`bg:FF0000`），部分组件支持 `#hex`/`rgb()`/`var(--x)`（图表 `c`）。
- 数值：纯数字（`w:480`、`span:6`、`v:72`）；含逗号/竖线/分号的值必须双引号包（`d:"1,2|3,4"`）。
- 布尔：只写 key（`stripe`、`req`、`dis`）。

---

## 2. 通用属性

| 简写 | 含义 | 说明 |
|------|------|------|
| `id` | 元素 ID | 也用于 `upd` 动态更新目标、`print:ID` / `form:ID` / `openDialog data-target` 解析 |
| `tt` | title | 提示标题 / 弹窗 / 卡片标题 |
| `tx` | text | 文本内容（自闭合展示组件专用，p/h 用裸内容） |
| `l` | label | 表单标签 / gauge 指标名 / desc 项标签 |
| `ph` | placeholder | 占位提示 |
| `u` | url | 链接地址 / gauge 单位 |
| `s` | src / source / size | 图片/视频/音频源；或尺寸（视组件） |
| `n` | name | 表单字段名、文件名 |
| `v` | value / variant | 值或变体（见 §4 与各组件） |
| `val` | value | 仅 `input`/`pwd` 用此存初值（`v` 在它们身上是变体） |
| `t` | type | 组件子类型 / 按钮变体 / 图表类型 / tag 颜色 |
| `act` | action | 表单提交地址 / `upd` 动作（`act:open`/`act:close`） |
| `mtd` | method | 表单提交方法 |
| `clk` | onclick | 点击处理器名（需 `TokUI.registerHandler` 预注册） |
| `sub` | onsubmit | 提交处理器名 / 按钮内置提交动作 |
| `dis` | disabled | 禁用 |
| `ro` | readonly | 只读 |
| `req` | required | 必填 |
| `chk` | checked | 选中 |
| `multi` | multiple | 多选 |
| `opt` | options | 选项简写串 `v:label;…`，radio/checkbox/select 共用，**必须双引号** |
| `w` `h` | width / height | 宽 / 高 |
| `bg` `fc` | background / font-color | 背景色 / 文字色 |
| `target` | target | `a` 打开方式，默认 `_blank` |
| `alt` | alt | `img` 替代文本 |
| `pos` | position | `top/bottom/left/right`（tooltip/drawer/popover/popconfirm/hover-card 等） |
| `icon` | SVG 图标名 | btn / 表格操作列，取内置 Lucide 图标（见 §7），stroke=currentColor 自动配色 |
| `i` | emoji / 字符图标 | btn / menu-item / welcome-feature |
| `form` | 表单 ID | btn 显式绑定表单（按钮在 form 外时收集其数据） |
| `reset` | 重置动作 | btn 内置：裸写或 `reset:H` |
| `print` | 打印动作 | btn 内置：`print:ID` / `print:self` / 裸写 |
| `data-*` | 任意自定义数据 | 透传为 `data-*` 属性（如 `data-prompt:`、`data-target:`） |

> `clk:` / `sub:` 处理器签名 `(data, event, element)`；表单按钮的 `data` 为 `_collectFormData(form)` 收集结果，同 name 多值自动聚合为数组。

---

## 3. 布尔属性

只写 key 即生效（出现即为 true）。完整列表以 `parser.js` 的 `BOOLEAN_ATTRS` Set 为准：

```
stripe  dis  ro  req  chk  multi  disabled  readonly  required  checked  multiple  striped
auto  plain  round  closable  bordered  open  pill  dot  leaf  inline  rounded  container
copy  regenerate  like  dislike  visible  delete  controls  active  collapsible  toggle
search  thumb  reset  print
```

> `reset` / `print` 是按钮内置动作；`thumb`/`delete` 多用于 `msg-actions` 等生成默认按钮；`controls` 用于 `video` 显示原生控件栏；`leaf` 让 `tn` 自闭合；`collapsible` 用于 `sidebar`。

---

## 4. 变体系统

DSL 写 `v:primary` → 渲染器生成 CSS 类 `tokui-{type}--primary`。多变体逗号组合：`v:"primary,sm,pill"`。变体名经 `renderer.js` 的 `VARIANTS` 白名单校验，未知变体**静默丢弃**。

**完整白名单**（以 `VARIANTS` 为准）：

| 组件 | 允许的变体 |
|------|-----------|
| `btn` | `primary` `danger` `success` `warning` `ghost` `sm` `lg` `pill` `square` `block`（图标走 `icon:` / `i:` 属性，非变体） |
| `btngroup` | `vertical` `pill` |
| `card` | `highlight` `flat` `bordered` `center` `right` |
| `table` | `bordered` `compact` |
| `h1`~`h6` | `left` `center` `right` `ribbon` `underline` `badge` `pill` |
| `p` | `left` `center` `right` `muted` `bold` `sm` `lg` |
| `a` | `muted` `danger` `success` `underline` |
| `ft` | `left` `center` `right` |
| `row` | `left` `center` `right` `inline` |
| `dv` | `dashed` `dotted` `sm` `md` `lg` `vert` `plain` |
| `img` | `avatar` `rounded` `bordered` |
| `dot` | `sm` `lg` |
| `avatar` | `sm` `md` `lg` `xl` |
| `tooltip` `drawer` | `top` `bottom` `left` `right` |
| `pagination` `switch` `slider` `rate` `transfer` `upload` `tree` | `sm` `lg` |
| `input` `pwd` | `error` `success` `sm` `lg` `underline` `pill`（另有 `inline` 非白名单，单独处理） |
| `select` `picker` `cascader` | `error` `success` |
| `breadcrumb` | `arrow` |

> `radio`/`checkbox` 的 `v:inline`（标签与控件同行）/ `v:vertical`（竖排左对齐）是**手动标记**，不在 `VARIANTS` 白名单内，由组件自身解析；二者互斥。`timeline` 的 `v:h`/`horizontal`/`alt`/`alternate`/`card`、`steps` 的 `vd:v`/`vertical` 同理。

---

## 5. 容器与自闭合规则

**容器组件**（在 `CONTAINERS` Set 内，需 `[/type]` 闭合）：

```
form table thead tbody card ft row col list select radio checkbox code imgs md
textarea tabs tab accordion collapse dialog btngroup picker timeline steps drawer
ol ul i item think think-chain think-step bubble toolbar badge-box dropdown transfer callout
cascader tree tn desc carousel popover input-tag watermark menu print-area
chat-input msg-actions tool-call diff quick-reply plan file-tree ft-folder
terminal sandbox test-result quote toggle-group conversations welcome welcome-feature
suggestions attachments artifact artifact-code artifact-preview scroll-area
sidebar sidebar-content sidebar-footer command command-group hover-card hover-trigger hover-content
resizable canvas canvas-content chart p
```

**自闭合逃逸**（在容器清单内但特定条件下自动当自闭合叶子）：

- 有 `tx` 属性的容器 → 自闭合（`[callout t:info tx:说明]`），**除外**：`tn` / `popover` / `input-tag` / `watermark` / `badge-box`（其 `tx` 是触发文本/水印文本，不当 body）。
- `tn` 带 `leaf` → 自闭合叶子节点。
- `input-tag` 带 `tags` → 自闭合（初始标签串）。
- `radio`/`select`/`checkbox` 带 `opt:"..."` → 自闭合简写。
- `checkbox` 单布尔（无 `opt` 无 `multi`）→ 自闭合（legacy 兼容）。
- `thead` 带 `cols` → 自闭合（多行表头串）。
- `chart` 带 `d`/`tasks`/`rows`/（`nodes`+`flows`）/（`gauge`/`progress` 的 `v`）→ 自闭合；否则容器模式收 `pt`/`hrow`/`flow`/`task`/`ms` 子节点。
- `desc`/`suggestions`/`chart` 的 `cols` 是数据/布局属性，**不**触发自闭合。

**原始内容模式**（容器内 `[` 视为字面文本，直到 `[/type]`）：`code`、`md`、`diff`、`terminal`、`sandbox`、`artifact-code`。

---

## 6. 组件分册

### 6.1 文本与基础

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `h1`~`h6` | 自闭合 | `tx`/裸内容 `v` `bg` `fc` | 标题。`v:underline` 时 bg 走 `::after` 下划线色；其余变体见 §4 |
| `p` | 叶子/容器 | `v` 裸内容 | 段落，**双模**：有正文=叶子自闭合（内联白名单 `a`/`tag`/`b`/`strong`/`em`/`mark`/`spin`/`sub`/`sup`/`code`/`i`），遇块级兄弟自动闭合；无正文=容器 `[p]...[/p]` 放块级组件 |
| `a` | 自闭合 | `u` `tx`/裸内容 `tt` `target` `dis` `v` | 链接。href 协议白名单 `http(s)`/`mailto`/`tel`/`/`/`#`，其余强制 `#` |
| `img` | 自闭合 | `s` `alt` `w` `h` `tt` `v` | 图片，点击灯箱预览。变体 `avatar`/`rounded`/`bordered` |
| `hr` | 自闭合 | — | 水平分割线 |
| `dv` | 自闭合 | `tx`/裸内容 `v` `vert` `size` `align` `bg` `th` `plain` | 带文本分割线。`vert` 垂直，`align` 对齐，`th` 边框宽度 |
| `md` | 容器·原始 | — | Markdown 渲染（表格/列表/任务/引用/代码围栏/链接图片） |
| `code` | 容器·原始 | `lang` | 语法高亮代码块，带复制按钮 + 行号。`lang`：`js`/`ts`/`py`/`html`/`css`/`sql`/`json`/`java`/`go`/`rust`/`bash` 及别名 |
| `tag` | 自闭合 | `tx` `t` `s` `round` `bordered` `closable` `dis` `bg` `fc` | 标签。颜色用 `t:`（`default`/`primary`/`success`/`warning`/`danger`/`info`），尺寸 `s:small`/`medium`/`large` |
| `b`/`strong`/`em`/`mark`/`del`/`sub`/`sup` | 自闭合 | 裸内容 | 行内格式（加粗/斜体/高亮/删除/上下标） |

### 6.2 状态、反馈与交互

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `callout` | 自闭合/容器 | `t` `tt` `tx`/裸内容 | 警示框。`t:info`/`success`/`warning`/`error`/`tip`。流式优先容器模式 `[callout t:info]文[/callout]`（真流式）；自闭合 `tx:` 一次性 |
| `spin` | 自闭合 | `t` `s` `tx` | 加载指示器。`t:spinner`/`dots`/`pulse` |
| `skeleton` | 自闭合 | `t` `rows` `w` `h` | 骨架屏。`t:text`/`card`/`avatar`/`image` |
| `shimmer` | 自闭合 | `t` `rows` | 闪光骨架。`t:text`/`card`/`avatar` |
| `empty` | 自闭合 | `tx` `icon` `s` | 空状态。`icon:default`/`box`/`folder`/`search`；`s` 自定义图源 |
| `result` | 自闭合 | `t` `tt` `tx` | 结果页。`t:success`/`error`/`warning`/`info` |
| `barcode` | 自闭合 | `tx` `l` `s` | Code128 Set B 条码（纯 SVG，扫描器识别）。`s:sm`/`md`/`lg`。运单号/订单号/序列号 |
| `qrcode` | 自闭合 | `tx` `l` `s` `ec` | QR 二维码（纯 SVG）。`ec:L`/`M`/`Q`/`H`（默认 M）。URL/文本/UTF-8/Wi-Fi |
| `dot` | 自闭合 | `t` `tx` `s` `pulse` | 状态点。`t:success`/`warning`/`error`/`info`/`primary` |
| `badge` | 自闭合 | `count` `overflow` `dot` `t`/`status` `tx` `pill` `size` `title` | 徽标。`count` 0-999，`overflow` 默认 99；版本号/小数用 `tx`（`count` 走 parseInt 会截断） |
| `badge-box` | 容器 | `t`/`status` `dot` `count` `overflow` `tx`/`label` `size` | 包裹子元素 + 角标（点/数字/文字）。`t` 颜色 |
| `toast` | 自闭合 | `id` `t` `tx` `duration` `pos` | 全局 Toast。`pos:top`/`bottom`，`duration` 默认 2000ms |
| `notification` | 自闭合 | `id` `t` `tt` `tx` `duration` `pos` `clk` | 全局通知。`pos:top-right` 等，`duration` 默认 4500ms（0=手动） |
| `progress` | 自闭合 | `v` `t` `l` `s` `stripe` `status` `id` | 进度条。`v` 百分比 0-100；`t:line`/`circle`/`span`；`status:success`/`error` |
| `stat` | 自闭合 | `tt` `v` `pre` `suf` `trend` `anim` `dec` `id` | 统计数字。`pre:¥` `suf:%` `trend:up`/`down` `anim` 滚动动画 ms `dec` 小数位 |
| `countdown` | 自闭合 | `target`/`dur` `fmt` `tx` `l` `s` `clk` `id` | 倒计时。`target` ms 时间戳或 `dur` 秒；`fmt:dhms`/`hms`/`ms`/`s`（每字母启用一单位）；`clk` 结束回调 |
| `thumb` | 自闭合 | `t` `v` `s` `clk` | 赞/踩。`t:up`/`down`，点击 emit `{direction, active}` |
| `toggle` | 自闭合 | `tx` `chk` `clk` `s` `dis` | 切换按钮 |
| `toggle-group` | 容器 | `multi` `s` `clk` | 切换按钮组。单选互斥（默认）/`multi` 多选；子项 `toggle` |
| `copy` | 自闭合 | `id` `tx` `tt` | 复制到剪贴板。`id` 目标元素，`tx` 按钮文字，`tt` 成功提示 |
| `upd` | 自闭合 | `id` + 更新键 | 动态更新已渲染组件（`v`/`tx`/`dis`/`tt`/`status`/`act`/`trend`/`count`/`chk` 等，取决于目标 `_update`） |
| `tooltip` | 自闭合 | `tt` `pos` `tx`/裸内容 | 文字提示。`pos:top`/`bottom`/`left`/`right` |
| `popover` | 容器 | `tx` `tt` `pos` `w` `trig` | 气泡卡片。`trig:click`/`hover` |
| `popconfirm` | 自闭合 | `tt` `tx` `clk` `t` `pos` `ok-text` `cancel-text` | 确认气泡。`t:primary`/`danger`；`ok-text`/`cancel-text` 自定义按钮文字 |
| `hover-card` | 容器 | `pos` `w` `delay` | 悬停卡片。子项须为 `hover-trigger` + `hover-content` |
| `hover-trigger` / `hover-content` | 容器 | — | `hover-card` 的子结构 |
| `input-tag` | 容器 | `ph` `n` `id` `max` `tags` `clk` `l` | 标签输入框。带 `tags` 自闭合（初始逗号分隔标签）；Enter 添加/Backspace 删除 |
| `dropdown` | 容器 | `tx`/`tt` `v` | 下拉菜单。`v` 按钮变体；子项 `dd-item`；键盘导航 |
| `dd-item` | 自闭合 | `tx` `clk` `dis` `v` | 下拉菜单项 |
| `backtop` | 自闭合 | `t` `v` `tx` `s` `bottom` `right` `container` | 回到顶部。`t` 滚动阈值 px；`v:circle`/`round`/`square` |
| `pagination` | 自闭合 | `page` `total` `count` `show-total` `s` `clk` | 分页。点击 emit `{page}` |
| `breadcrumb` | 自闭合 | `items` `sep` `clk` `v` | 面包屑。`items` 逗号路径；`v:arrow` 用 › |
| `calendar` | 自闭合 | `month` `v` `tt` `marks` `sel`/`selected` `range` `ranges` | 日历。`v:card`/`mini`；`marks:"3,15"` 标记日；`sel:"15,20"` 离散选中；`range:"15-21"` 单区间；`ranges:"1-3;15-21"` 多区间 |
| `watermark` | 容器 | `tx` `s` `font` `c` `gap` `ro` | 水印容器。`ro` 旋转角度（默认 -22），`gap` 间距（默认 40），canvas 平铺 |
| `avatar` | 自闭合 | `s` `tx` `size` `bg` `fc` | 头像。无 src 时文字头像（取前 2 字），无 bg 时按 hash 自动配色 |
| `file` | 自闭合 | `n` `s` `t` `u` `tt` | 文件卡片。`t:pdf`/`word`/`excel`/`ppt`/`image`/`zip`/`code`/`default` |
| `chat-input` | 容器 | `ph` `clk` `dis` `max` `auto` `rows` | 对话输入框。Enter 发送/Shift+Enter 换行 |
| `msg-actions` | 容器 | `clk` `copy` `regenerate` `like`/`dislike` `delete` `visible` | 消息操作栏。布尔属性生成默认按钮 |

### 6.3 思考与计划

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `think` | 容器 | `tt` `open` | 思考块（`<details>` 折叠），默认展开 |
| `think-chain` | 容器 | `tt` `status` `open` | 推理链。`status:running`/`done`；子项 `think-step` |
| `think-step` | 容器 | `status` `tt` `dur` | 推理步骤。`status:done`/`running`/`pending`/`error` |
| `plan` | 容器 | `tt` | 执行计划；子项 `plan-step` |
| `plan-step` | 自闭合 | `status` `tt` `desc` | 计划步骤。`status:pending`/`doing`/`done`/`error`/`skipped`（接受 `running`/`complete`/`fail` 等同义词） |
| `agent` | 容器 | `name` `status` `action` `duration` `id` | 智能体状态。`status:idle`/`running`/`paused`/`done`/`error` |

### 6.4 AI / 对话

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `bubble` | 容器 | `role` `model` `time` | 对话气泡。`role:user`/`ai`/`system`（chat 场景系统已包气泡，勿嵌套） |
| `toolbar` | 容器 | `pos` `align` | 工具栏。`pos:top`/`bottom`，`align:left`/`center`/`right` |
| `tool-call` | 容器 | `name` `status` `duration` `id` | 工具调用卡片。`status:pending`/`running`/`done`/`error`/`denied` |
| `typing` | 自闭合 | `text` | 输入中指示（注意用 `text` 非 `tx`） |
| `quick-reply` | 容器 | `items` `clk` | 快捷回复。`items` 逗号标签；或子节点追加 |
| `suggestions` | 容器 | `cols` `clk` `id` | 建议卡片网格。`cols` 1-4（默认 2）；子项 `suggestion` |
| `suggestion` | 自闭合 | `tt` `tx` `clk` `icon` `dis` | 建议项 |
| `source` | 自闭合 | `n` `tt` `sn` `u`/`url` | 引用源。`n` 序号，`sn` 片段 |
| `diff` | 容器·原始 | `title` `lang` | 代码差异。内容行以 `+` 增（绿）/`-` 删（红）/其它上下文 |
| `file-tree` | 容器 | — | 文件树；子项 `ft-folder` / `ft-file` |
| `ft-folder` | 容器 | `name` `open` | 文件夹 |
| `ft-file` | 自闭合 | `name` `badge` | 文件 |
| `terminal` | 容器·原始 | `title` `status` | 终端输出。`status` 非 0 则 error 样式 |
| `sandbox` | 容器·原始 | `lang` `title` `height` | 代码预览沙箱。`lang:html` 用 iframe srcdoc 沙箱；否则 `<pre>` |
| `test-result` | 容器 | `pass` `fail` `skip` `total` `duration` | 测试结果；子项 `test-case` 或 `case`（推荐 `case`） |
| `test-case` / `case` | 自闭合 | `status` `name` `duration` `error` | 测试用例。`status:pass`/`fail`/`skip`；`case` 是简写别名 |
| `commit` | 自闭合 | `hash` `msg` `author` `branch` `time` `additions` `deletions` | Git 提交 |
| `quote` | 容器 | `role` `tx` `msgid` | 引用消息 |
| `latency` | 自闭合 | `v` `t` | 延迟指标。`t:thinking`/`generating`/`total` |
| `video` | 自闭合 | `s` `poster` `ratio` `w` `h` `fit` | 视频。`ratio:16:9`/`4:3`/`1:1`/`21:9`；`fit:cover`/`contain`/`fill`；poster 与画面共用同一比例盒 |
| `audio` | 自闭合 | `s` `tt` `duration` `w` | 音频播放器 |
| `conversations` | 容器 | `clk` `act` | 会话列表；子项 `conv`；按 `time` 自动分组 今天/昨天/更早 |
| `conv` | 自闭合 | `tt` `time` `active` `act` | 会话项 |
| `welcome` | 容器 | `tt` `st` `bd` `hd` `ft` | 欢迎页。`st` 副标题、`bd` 能力徽标（逗号）、`hd` 卡分区标题、`ft` 页脚引导语；子项 `welcome-feature`/`feature` |
| `welcome-feature` / `feature` | 容器/自闭合 | `tt` `tx` `i` `clk` | 欢迎特性卡片。`i:code`/`chart`/`doc`/`dashboard`/`print`/`chat`/`table`/`form`；推荐简写 `feature`（自闭合） |
| `attachments` | 容器 | `clk` | 附件列表；子项 `attach` |
| `attach` | 自闭合 | `t` `s` `u` `size` `clk` | 附件项。`t:image`/`pdf`/`word`/`excel`/`ppt`/`zip`/`code`/`video`/`audio` |
| `artifact` | 容器 | `tt` `lang` `pos` `w` | Artifact 侧边预览。`pos:left`/`right`，`w` 百分比；子项 `artifact-code` + `artifact-preview` |
| `artifact-code` | 容器·原始 | — | Artifact 代码槽 |
| `artifact-preview` | 容器 | — | Artifact 预览槽 |
| `command` | 容器 | `ph` `clk` `id` `hotkey` | 命令面板。`hotkey` 启用 Cmd/Ctrl+K（页面只应一个）；按钮唤起 `clk:openCommand data-target:"<id>"`；子项 `command-group` |
| `command-group` | 容器 | `tt` | 命令分组；子项 `command-item` 或 `item`（等价，推荐 `item`） |
| `command-item` | 自闭合 | `tx` `v` `clk` `shortcut` | 命令项；推荐改用 `item`（command-group 内行为一致） |
| `canvas` | 容器 | `tt` `pos` `w` `tx` `open` `closable` | 画布面板。`pos:left`/`right`，`w` px；子项 `canvas-content` |
| `canvas-content` | 容器 | — | 画布内容（透传） |

### 6.5 布局容器

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `card` | 容器 | `tt` `tx` `v` `w` `hc` `ht` | 卡片。`hc` 头部自定义色；`ht:fill`/`accent`/`underline`/`dot`/`pill` 头部类型。**`tx`=自闭合叶子卡**，有子元素时禁用 |
| `ft` | 容器 | `tx`/裸内容 `v` | 卡片页脚（card/dialog/drawer 内自动分离为页脚区）。无内容时不渲染 |
| `row` | 容器 | `v` | 栅格行。默认 12 列 grid；`v:inline` 转 flex（并排标题+徽标用） |
| `col` | 容器 | `span` | 栅格列（`span` 1-12，默认 1） |
| `list` | 容器 | `t` `plain` | 列表。`t:ol` 有序/默认无序；`plain` 去标记 |
| `item` | 容器 | `tx`/裸内容 `l` `span` | 同名按父级区分：`list` 内=`<li>`（文本当首段，可嵌套子 `list`，靠 `[/item]`/下个 `[item]`/父闭标签隐式闭合）；`desc` 内=描述项（`l` 标签 `tx` 值）；`carousel` 内=幻灯片；`command-group` 内=命令项。别名 `i` |
| `tabs` | 容器 | — | 标签页容器；子项 `tab`；默认激活第 0 个 |
| `tab` | 容器 | `tt` | 标签项（`tt` 为标签名） |
| `accordion` | 容器 | — | 手风琴；子项 `collapse` |
| `collapse` | 容器 | `tt` `open` `id` | 折叠面板（原生 details）。`upd` 支持 `act:open`/`act:close` |
| `dialog` | 容器 | `tt` `id` `clk` | 对话框（原生 dialog）。`upd` 支持 `act:open`/`act:close` |
| `drawer` | 容器 | `tt` `pos` `w` `h` `id` | 抽屉。`pos:left`/`right`/`top`/`bottom` |
| `imgs` | 容器 | `s` | 图片网格（`s` 逗号图源，或子项 `img`）；点击灯箱 |
| `timeline` | 容器 | `v` | 时间轴。`v:h`/`horizontal`/`alt`/`alternate`/`card`；子项 `ti` |
| `ti` | 自闭合 | `tm` `t` `tt` 裸内容 | 时间轴项。`t:primary`/`success`/`warning`/`error`/`info` |
| `steps` | 容器 | `v` `s` `vd` `id` | 步骤条。`v` 当前步（1-based）；`vd:v`/`vertical`；子项 `step` |
| `step` | 容器 | `tt` `status` 裸内容 | 步骤。`status:error`/`danger` |
| `desc` | 容器 | `cols` `stripe` `bordered` `v` `lw` | 描述列表。`cols` 每行列数；`v:h`/`horizontal`；`lw` 标签宽；子项 `item`（推荐）或 `desc-item` |
| `desc-item` | 自闭合 | `l` `tx` `span` | 描述项；推荐改用 `item`（desc 内自动按描述项渲染） |
| `carousel` | 容器 | `id` `auto` `thumb` `w` `h` `ratio` | 轮播。`auto` 毫秒自动播放；`thumb` 缩略图图例；`ratio:16:9`/`4:3`/`1`；子项 `carousel-item`/`item`/`img` |
| `carousel-item` | 自闭合 | `s` `tt` `tx` | 轮播项 |
| `tree` | 容器 | `id` `l` `clk` `chk` `dis` | 树。`chk` 可勾选（父子联动）；子项 `tn` |
| `tn` | 容器/自闭合 | `v` `tx` `open` `leaf` `chk` `dis` | 树节点。`leaf` 自闭合；可递归嵌套 `tn` |
| `menu` | 容器 | `v` `act` `bg` `fc` `id` | 菜单。`v:vertical`/`horizontal`/`inline`；子项 `menu-item` |
| `menu-item` | 自闭合 | `tx` `clk` `i` `dis` `act` | 菜单项 |
| `resizable` | 容器 | `dir` `min` `max` `default` `w` | 分割面板。`dir:h`/`v`；须 2 个子面板 |
| `scroll-area` | 容器 | `h` `w` `id` | 自定义滚动区域 |
| `sidebar` | 容器 | `w` `pos` `collapsible` `tt` `bg` `fc` `id` | 侧边栏。`pos:left`/`right`；子项 `sidebar-content` / `sidebar-footer` |
| `sidebar-content` / `sidebar-footer` | 容器 | — | 侧边栏内容区 / 页脚 |

### 6.6 表单组件

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `form` | 容器 | `act` `mtd` `sub` `clk` `id` | 表单。`act` 提交地址、`sub` 提交处理器 |
| `input` | 自闭合 | `t` `l` `ph` `id` `n` `val` `ml` `min` `max` `step` `req` `dis` `ro` `w` `hint` `search` `v` `pre`/`app`/`prebtn`/`appbtn` | 输入框。`val` 存初值（`v` 是变体）；`ml` maxlength；`hint` 提示；`search` 加搜索图标（`search right` 右侧）；`pre`/`app` 前置/后置文本（可 `文本\|变体`）；`prebtn`/`appbtn` 前置/后置按钮（`文本:处理器\|变体`） |
| `pwd` | 自闭合 | 同 `input` + `toggle` | 密码框。`toggle` 显隐开关 |
| `textarea` | 容器 | `l` `id` `n` `ph` `rows` `maxlen` `maxrows` `auto` `tx`/裸内容 `req` `dis` `ro` | 多行文本。`auto` 自适应高度 |
| `select` | 容器 | `l` `ph` `multi` `id` `n` `req` `v` `opt` | 下拉选择。子项 `opt`；或 `opt:"v:标签;…"` 简写自闭合 |
| `radio` | 容器 | `l` `id` `n` `v` `opt` | 单选组。子项 `opt`；或简写 `opt:"…"`；同 name 互斥 |
| `opt` | 自闭合 | `v` `tx` `chk` `p` | 选项。随父容器变 select/radio/checkbox/picker/cascader/transfer 选项；`p` 指定父值（仅 cascader） |
| `checkbox` | 自闭合/容器 | `l` `chk` `id` `n` `v` `opt` `multi` | 复选框（**三态**：见下方专节） |
| `switch` | 自闭合 | `l` `chk` `dis` `clk` `id` `n` `v` | 开关 |
| `slider` | 自闭合 | `l` `min` `max` `step` `v` `dis` `clk` `id` `n` | 滑块 |
| `rate` | 自闭合 | `l` `v` `max` `tx` `ro` `dis` `clk` `id` `n` | 评分。`max` 默认 5；`ro` 只读（报告/展示类必加） |
| `numinput` | 自闭合 | `l` `v` `min` `max` `step` `dis` `id` `n` | 数字输入 |
| `btn` | 自闭合 | `tx` `t` `sub` `clk` `id` `dis` `w` `bg` `fc` `radius` `icon` `i` `l`/`tt` `form` `reset` `print` | 按钮（见下方专节） |
| `btngroup` | 容器 | `id` `v` | 按钮组。`v:vertical`/`pill` |
| `print-area` | 容器 | `id` `tt` | 打印区（配合 `[btn print:ID]` 1:1 打印） |
| `picker` | 容器 | `l` `ph` `multi` `dis` `id` `n` `v` | 选择器（搜索下拉）；子项 `opt` |
| `cascader` | 容器 | `l` `ph` `dis` `clk` `v` `id` `n` | 级联选择。`v` 预选路径（`/` 分隔）；扁平 `opt` 用 `p` 指定父值 |
| `transfer` | 容器 | `l` `tt` `tt2` `clk` `id` `dis` `n` `h` `mh` | 穿梭框。`tt`/`tt2` 左/右标题；`h`/`mh` 固定/最大高度；子项 `opt`（`chk` 进右栏） |
| `upload` | 自闭合 | `l` `ph` `accept` `multi` `dis` `clk` `max` `id` `n` | 文件上传 |
| `datepicker` | 自闭合 | `l` `ph` `fmt` `v` `clk` `dis` `id` `n` | 日期选择。`fmt` 默认 `YYYY-MM-DD` |
| `timepicker` | 自闭合 | `l` `ph` `fmt` `v` `clk` `dis` `id` `n` | 时间选择。`fmt` 默认 `HH:mm`（含 `ss` 显示秒） |
| `datetimepicker` | 自闭合 | `l` `ph` `fmt` `v` `clk` `dis` `id` `n` | 日期时间选择。`fmt` 默认 `YYYY-MM-DD HH:mm` |

#### `opt:"..."` 选项简写（radio / checkbox / select 通用）

`;` 分隔项，`:` 分隔 value:label（可缺，则等于 value），整串**必须双引号**：

```tokui
[radio n:gender l:性别 opt:"1:男;2:女"]              ;; 等价 [radio n:gender l:性别][opt v:1 tx:男][opt v:2 tx:女][/radio]
[select n:city l:城市 opt:"bj:北京;sh:上海"]
[checkbox n:brand l:品牌 opt:"1:篮球;2:足球;3:羽毛球"]
```

#### checkbox 三态（按是否带 `opt` / `multi` 自动判定）

| 形态 | 判定 | 写法 | 提交值 |
|------|------|------|--------|
| 单布尔（legacy） | 无 `opt` 无 `multi` | `[checkbox l:同意协议 n:agree]`（自闭合） | 勾选=该 name 出现 |
| 简写多选 | 有 `opt` | `[checkbox n:brand l:品牌 opt:"1:篮球;2:足球"]`（自闭合） | `data[brand]` = 数组 |
| 容器多选 | 有 `multi` | `[checkbox n:brand l:品牌 multi][opt v:1 tx:篮球]…[/checkbox]` | `data[brand]` = 数组 |

#### radio/checkbox 排列（`v:` 手动标记）

| 标记 | 排列 |
|------|------|
| 默认 | 横排（flex 自动换行，移动端 ≤640px 转竖排） |
| `v:inline` | 标签与控件同行 |
| `v:vertical` | 竖排左对齐（与 `inline` 互斥） |

> 多选提交走原生 FormData → `data[name]` 为**数组**；radio 始终单值；select 多值由原生 `multiple` 决定。

#### btn 内置动作（renderer 自动解析，无需 registerHandler）

优先级 `print > reset > submit > clk`：

```tokui
[form id:login sub:onLogin]...[/form]
[btn tx:提交 form:login sub:onLogin t:primary]    ;; form:ID 显式绑定表单（优先于 DOM 祖先推断）
[btn tx:重置 form:login reset]                     ;; reset 裸写：重置绑定表单
[btn tx:重置 form:login reset:onReset]             ;; reset:H：复位后回调
[btn tx:打印 print:pa1]                            ;; 打印 print-area#pa1（1:1）
[btn tx:打印本卡 print:self]                       ;; 打印最近祖先 print-area / card
[btn print]                                        ;; 裸写 = print:self
[print-area id:pa1 tt:订单详情]...[/print-area]
```

- `reset`：原生 input 由 `form.reset()` 复位；自定义控件（slider/rate/numinput/switch/transfer/picker/cascader）实现 `_tokuiReset()` + `data-tokui-resettable` 印章，renderer 遍历调用并向 form 广播 `tokuireset` 事件。
- `print`：给目标加 `.tokui-print-target` + `body[data-tokui-printing="1"]`，`@media print` 仅该作用域可见（1:1），`[data-tokui-print-trigger]` 按钮自身隐藏。`form:ID` 用 `getElementById` 解析且校验为 FORM（防 id 伪造）。

#### btn 图标（`icon:` SVG / `i:` emoji / icon-only）

```tokui
[btn tx:查看 icon:view t:primary clk:view]         ;; icon: 取 icons.js 的 Lucide SVG 名，stroke=currentColor 自动配色
[btn icon:edit l:保存 clk:save]                    ;; 无 tx 仅有 icon → icon-only 紧凑钮，l:/tt: 作 aria-label + CSS tooltip
[btn tx:复制 i:📋 clk:copy]                        ;; i: 注入 emoji / 字面字符
```

可用图标名（24 个，见 §7）：`view edit delete add copy download upload refresh check close search setting warn info lock unlock more save export filter sort star link menu`。

### 6.7 数据与表格

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `table` | 容器 | `stripe` `cap`/`caption` `v` `id` | 表格。`cap` 标题；`v:bordered`/`compact`（注：bordered 由 CSS 类驱动） |
| `thead` | 容器/自闭合 | `cols` | 表头。`cols:"姓名,年龄"` 支持 `chk`（全选列）/`#`（序号列）；`;` 分多行；列名后 `/c`/`/r`/`/l` 对齐、`/primary`/`/danger`/`/success`/`/warning`/`/info` 配色 |
| `tbody` | 容器 | — | 表体（区间勾选 + 列位追踪） |
| `tr` | 自闭合 | `cs`(legacy) `v:total` | 表格行，内容逗号分隔单元格；cell 尾缀 `=cN`/`=rN`/`=cNrM` 合并 |
| `tcol` | 自闭合 | `n` | 列占位（thead 无 cols 时用） |

#### `tr` 单元格内联渲染（除纯文本外）

- **序号列**：thead 写 `#`，tr 对应位置留空。
- **勾选列**：thead 写 `chk`。
- **进度条**：`progress v:98 t:span`（≥80 自动绿，或 `status:error`）。
- **标签**：`tag:VIP t:success`。
- **操作按钮**：`btn:详情 clk:fillSubmit data-prompt:查看详情:<行ID>|btn:删除 v:danger clk:fillSubmit data-prompt:删除:<行ID>`（多个 `|` 分隔，属性空格分）。icon 操作钮 `btn: icon:edit l:编辑 v:warning clk:fillSubmit data-prompt:编辑:<行ID>`。
- **任意内联组件**：`[badge count:5]`、`[dot t:success tx:运行中]`（方括号包裹组件会内联渲染）。

> **🔴 带空格属性的内联组件格 / 多按钮格 → 整行外层双引号包**：凡 tr 行内有 `btn:`/`progress v:`/`tag:`/`[xxx]` 这类**带空格属性**的格，整行外层双引号包，单元格内不含逗号、多按钮用 `|` 分隔。**货币符号金额（¥/$/€/£ 等）千分位无需引号、整行包也无需内层转义**：
>
> ```tokui
> [tr "ZS001,张三,¥2,688.00,progress v:90 t:span,tag:在职 t:success,btn:详情 clk:fillSubmit data-prompt:详情:ZS001"]
> ```

#### 各列类型引号速查（系统性）

| 列类型 | 示例 | 含空格 | 含逗号 | 引号处理 |
|---|---|---|---|---|
| 纯文本 | `张三` / `技术部` | 否 | 否 | 无需 |
| 普通数字 | `42` / `320` | 否 | 否 | 无需 |
| **货币符号金额** | `¥2,688.00` / `$1,234,567` | 否 | 是（千分位） | **无需**（parser 自动识别千分位） |
| 百分比/单位 | `0.8%` / `95分` | 否 | 否 | 无需 |
| 裸数字千分位（无符号） | `12800,00` | 否 | 是 | **该格双引号包**（无符号歧义） |
| 多值文本（逗号） | `量程0-50MPa,精度0.1%` | 否 | 是 | **该格双引号包** |
| 标签 `tag:` | `tag:已发货 t:primary` | 是 | 否 | 整行外层引号（或该格引号） |
| 进度 `progress` | `progress v:80 t:span` | 是 | 否 | 整行外层引号（或该格引号） |
| 按钮 `btn:` | `btn:详情 clk:...` | 是 | 否 | 整行外层引号（或该格引号） |
| 多按钮 | `btn:...|btn:...` | 是 | 否 | 整行外层引号（`|` 分隔） |

**混搭规则**：一行里既有货币金额又有组件格 → 整行外层引号包，货币金额无需内层转义（千分位自动识别）：`[tr ",ORD-001,星辰,¥2,688.00,tag:已发货 t:primary,btn:查看 clk:x"]`。一行里有多值文本逗号格 + 组件格 → 整行外层引号 + 多值格内层 `\"` 转义。
>
> **不引号包的后果（实测高频翻车点）**：parser 按**空格**切 tr token，`btn:详情 clk:fillSubmit data-prompt:...` 里的 `clk:`/`data-prompt:` 会被吃成 **tr 自身属性**、content 被截断、操作列/进度列整列渲染不出来。错例：
>
> ```tokui
> [tr 01,项目01,42,0.8%,progress v:42 t:span,btn:详情 clk:fillSubmit data-prompt:查看详情:项目01]
> ```
>
> → `tr.attrs` 变 `{v:"42", t:"span,btn:详情", clk:"fillSubmit", data-prompt:"查看详情:项目01"}`、`tr.content` 只剩前 5 格 `"01,项目01,42,0.8%,progress"`、操作列消失。
>
> **改法（整行外层引号包即可）**：`[tr "01,项目01,42,0.8%,progress v:42 t:span,btn:详情 clk:fillSubmit data-prompt:查看详情:项目01"]`。无空格组件格不需引号。

#### 操作列范例（多按钮 + icon-only）

整行 tr 外层引号包（btn 格含空格）；多按钮 `|` 分隔；`v:danger` 删钮红；**每行 ID 烧进 `data-prompt`**（`动作:ID`）；icon-only 用 `l:` 作 tooltip+无障碍；可用 icon 名：view/edit/delete/copy/download/refresh/check/close/search 等。

```tokui
[table stripe bordered]
[thead cols:"#,项目,数值,趋势,操作"]
[tbody]
[tr ",P01,42,progress v:42 t:span,btn:详情 clk:fillSubmit data-prompt:查看详情:P01|btn:编辑 clk:fillSubmit data-prompt:编辑:P01|btn:删除 v:danger clk:fillSubmit data-prompt:删除:P01"]
[tr ",P02,88,progress v:88 t:span,btn: icon:view l:详情 v:primary clk:fillSubmit data-prompt:查看详情:P02|btn: icon:edit l:编辑 v:warning clk:fillSubmit data-prompt:编辑:P02|btn: icon:delete l:删除 v:danger clk:fillSubmit data-prompt:删除:P02"]
[/tbody]
[/table]
```

#### 表格合并 / 对齐 / 配色 / 汇总（cell 尾缀，表头+表体通用）

- **横向合并**：`值=cN` 横跨 N 列（**无需 `,,,` 占位**）。
- **纵向合并**：`值=rN` 纵跨 N 行（被占列下行直接省略，浏览器自动占位）。
- **组合**：`值=c2r2`（`c`/`r` 顺序无关）。严格尾缀正则 `=([cr]\d+){1,2}$`，`公式=x=2`/`版本=v2` 不误判。
- **多行表头**：`thead cols` 用 `;` 分行（thead 仍单自闭合标签）。
- **列对齐**：cell 后 `/c` 居中 `/r` 居右 `/l` 居左。
- **列配色**：对齐后再 `/primary` `/success` `/warning` `/danger` `/info`。
- **传导**：表头某格的 `/align`/`/color` 按列位传导到 body（renderer 用列位追踪器 `placeRow` 修正 rowspan 偏移）。
- **汇总行**：`tr v:total` → 整行加粗、汇总格（行首）居右、末格（金额）加粗居中带 `--danger` 色。常配 `汇总=c8`（整行横跨）。
- **旧 `cs:N`**：仅首格 colspan 且要 `,,,` 占位，已由 `=cN` 取代但向后兼容。

col spec 顺序：`列名[=cN[rM]][/对齐][/配色]`。

```tokui
[thead cols:"大区=r2/c,订单=c2/c,商品=r2/c,交易=c3/c,状态=r2/c,操作=r2/c;订单号,客户,数量/c/primary,单价/r/warning,金额/r/danger"]
[tbody]
[tr "华北区=r4,ORD-1,字节,键盘,5,¥1280,¥6400,tag:已发货 t:success,btn: icon:view l:详情 v:primary clk:fillSubmit data-prompt:详情:ORD-1"]
[tr "ORD-2,星辰,鼠标,8,¥336,¥2688,tag:待付款 t:warning,btn: icon:view l:详情 v:primary clk:fillSubmit data-prompt:详情:ORD-2"]
[tr 汇总=c8,"¥17,129" v:total]
[/tbody]
```

### 6.8 图表（`chart`，纯 SVG 零依赖，20 种）

**🔴 属性输出顺序铁律（流式强约束）**：`t 类型 → 样式/布局 → l 标签 → 数据`。样式属性必须在数据之前、`l` 必须在 `d` 之前，否则流式预览先按默认布局画、闭合才翻转。

```
正确：[chart t:bar tt:日产量 orient:h vals w:800 h:600 l:"Mon,Tue,Wed,Thu,Fri" d:"10,24,18,30,22"]
错误：[chart t:bar d:"10,24,18,30,22" l:"Mon,..." vals orient:h]   ;; 样式写在数据后 → 预览翻转
```

支持类型（20）：`bar` `line` `area` `pie` `donut` `rose` `funnel` `radar` `scatter` `bubble` `heatmap` `histogram` `waterfall` `boxplot` `treemap` `sankey` `candlestick` `progress` `gauge` `gantt`。

#### 通用属性

| 属性 | 含义 |
|------|------|
| `t` | 图表类型（恒首） |
| `tt` | 标题 |
| `d` | 数据（格式随类型，见下表） |
| `l` | 标签（数量须 = 数据点数/类别数） |
| `c` | 颜色序列（逗号分隔；缺省 10 色板；heatmap 当色阶 stops） |
| `w` `h` | SVG 宽/高（仅影响内部坐标系比例，不决定最终渲染大小） |
| `v` | 单值（gauge/progress/donut 中心） |
| `area` | 折线填充（布尔） |
| `vals` | 柱/线显数值（布尔） |
| `stack` | 堆叠（布尔，bar/line/area/donut 多系列） |
| `smooth` | 折线/面积平滑（布尔） |
| `orient` | `h` 横向柱（默认纵向） |
| `xl` `yl` `sl` | X / Y / 第三维 轴名 |
| `xmin`/`xmax`/`ymin`/`ymax` | 显式锁轴（scatter/bubble，流式防已画点跳） |
| `range` | gauge 扫掠角 180（默认）/270/360 |
| `anim` | 数值动画 ms（progress/gauge，尊重无障碍偏好自动停） |
| `interval` | X 轴标签密度：`auto`（默认，横排→-45°旋转→跳过三级降级）/ `0`（全显）/ `N`（每 N 个显一个，保留首末） |
| `zoom` | dataZoom 拖拽缩放：`auto`（>30 点自动开）/ `N`（>N 开）/ `on`/`off`。bar/line/area/histogram/boxplot/candlestick |

#### 数据格式 `d` 速查

| 图表 | `d` 格式 | 例 |
|------|---------|-----|
| `bar` `line` `area` `radar` | 多系列 `|`、点 `,` | `d:"10,20,30\|15,25,35"` |
| `pie` `donut`(单环) `rose` `funnel` `waterfall` `histogram` | 单系列 `,` | `d:"10,20,30"` |
| `donut` 多环 | 环 `|`、点 `,` | `d:"40,30,20,10\|35,25,30,10"` |
| `scatter` | 点 `;`、坐标 `,` | `d:"1,2;3,5;6,4"` |
| `bubble` | 点 `;`、`x,y,size` `,` | `d:"1,2,5;3,4,10"` |
| `boxplot` | 组 `;`、五数 `,`（min,Q1,中,Q3,max） | `d:"1,3,5,7,9;2,4,6,8,10"` |
| `candlestick` | 根 `;`、OHLC `,` | `d:"10,12,8,11;11,13,9,10"` |
| `heatmap` | `rows` 属性：行 `|`、列 `,` | `rows:"1,2,3\|4,5,6"` |
| `treemap` | `名:值` `,` | `d:"A:100,B:60,C:40"` |
| `sankey` | `flows` 属性：`源->目标:值` `,` | `flows:"A->B:10,B->C:5"` |
| `gauge` `progress` | `v` 单值 | `v:72` |

#### 各类型专属属性

- **bar**：`stack` `orient:h` `vals` `ymax`。横向柱（`orient:h`）类别多（≥15）时显式 `h`（最大有效 800）。
- **line**：`area` `smooth` `stack` `vals`。
- **area**：= line + 默认填充，同 line。
- **pie**/**donut**/**rose**：`l` 各项名；donut `v` 中心文字（单环）。
- **funnel**：建议数据**降序**（首层=漏斗口），自动标相对首层转化率。
- **radar**：多系列 `|` 对比。
- **scatter**/**bubble**：`xl`/`yl`（bubble 加 `sl` 第三维名）+ `xmin/xmax/ymin/ymax` 锁轴。
- **heatmap**：`rows` 矩阵、`cols` 列标签、`l` 行标签（须匹配）、`vmin`/`vmax` 锁值域、`c` 色阶 stops。
- **histogram**：`d` 原始值序列（前端分箱）；`bins` 箱数（须 = `l` 段数）；`l` 范围段标签（`40-50,...,90-100` 自动锁 lo/hi/bins）；`min`/`max`/`ymax` 锁值域/频次。
- **waterfall**：`d` 带符号增减；`c` 前 2 个为正/负色（默认绿/红）。
- **boxplot**：`d` 五数；`l` 组名。
- **treemap**：`d` `名:值`；`c` 配色。
- **sankey**：`nodes`（可省，从 flows 提）+ `flows`；`c` 配色。
- **candlestick**：`d` OHLC；`l` 日期；`c` 阳/阴色（默认红涨绿跌，中国惯例）。
- **progress**：`v` `max`/`min` `u` `l` `c` `anim`。
- **gauge**：见下方专节。

#### X 轴密度 + dataZoom 缩放（大数据点）

- bar/line/area/histogram/boxplot/candlestick 的 X 轴标签自动【横排 → -45° 旋转 → 按步长跳过（保留首末）】三级降级，默认 `interval:auto`。
- `interval:N` 锁步长（每 N 个显一个，保留首末）；`interval:0` 强制全显（仅按需旋转）。
- 数据点 ≥30（长时间序列、大规模柱/线、多根 K 线/多组箱线）加 `zoom:auto` 开底部 dataZoom 滑块，用户拖拽看局部（单系列柱图池化、丝滑跟手）。

```tokui
[chart t:line tt:"近90天访问趋势" zoom:auto l:"D1,D2,...,D90" d:"30,45,38,60,..."]
[chart t:bar tt:"50点柱状" interval:5 l:"D1,D2,...,D50" d:"120,200,150,80,..."]
```

#### gauge 仪表盘完整属性

| 属性 | 含义 | 默认 |
|------|------|------|
| `v` | 当前值（必填） | — |
| `max`/`min` | 上/下限 | 100 / 0 |
| `u` | 单位（min:0&max:100 时自动 `%`） | — |
| `dec` | 小数位 | span≤10→1，否则 0 |
| `range` | 扫掠角 180/270/360 | 180 |
| `status` | 语义染弧色 + 角标：`success`/`warning`/`danger`/`info` | — |
| `zones` | 阶段阈值逗号分隔（如 `60,85`），多色带分段 | — |
| `zc` | zones 段色（low→high，默认 `绿,黄,红`） | `#52c41a,#faad14,#f5222d` |
| `ticks` | 刻度密度 | 6 |
| `l` | 指标名（中心） | — |
| `sub` | 副标题（底部） | — |
| `anim` | 数字+弧+指针动画 ms | 0 |
| `c` | 自定义弧色（优先级低于 zones/status） | — |

色判定优先级：`zones` 命中段色 > `status` 语义色 > `c` > 默认调色板。

```tokui
[chart t:gauge tt:CPU使用率 status:warning sub:"数据来源:监控系统" l:8核均值 v:72]
[chart t:gauge tt:达标率 zones:"60,85" anim:1200 sub:"红线85%" l:Q2目标90% v:92]
[chart t:gauge tt:错误率 zones:"3,8" zc:"#52c41a,#faad14,#f5222d" u:% dec:1 v:3.4]   ;; 反向配色（高值=差）
```

#### gantt 甘特图完整属性（不用 d/l）

| 属性 | 含义 |
|------|------|
| `tasks` | 任务 `名称,开始,结束[,进度[,组号]]`，多条 `|` 分隔。进度 0-100，组号从 0 起 |
| `gnames` | 组名 `|` 分隔，按组号映射图例。**用了组号就必须给 gnames**，否则图例显「组1/组2」 |
| `deps` | 依赖 `源索引->目标索引`（finish→start），多条 `,` 分隔。索引 0 起，须 < tasks 总数 |
| `ms` | 里程碑 `名称,时间点[,组号]`，多条 `|` 分隔，渲染为菱形 ◆ |
| `mode` | `days`（数字天数）/ `dates`（`2026-06-15` 或 `2026/6/15`）。留空自动判（含 `-`/`/` 为日期） |
| `w` | 宽（默认 720） |

> dates 模式自动画「今天」竖线。点击任务条高亮其依赖传递闭包。task 名严禁含空格/逗号/`|`。

```tokui
[chart t:gantt tt:V2.0排期 w:720 tasks:"需求,1,3,100,0|设计,3,5,100,0|开发,5,14,60,1|测试,14,18,0,2" ms:"评审,5,0|上线,18,2" gnames:"设计|开发|测试" deps:"0->1,1->2,2->3"]
[chart t:gantt tt:工单排程 mode:dates w:720 tasks:"下发,2026-06-15,2026-06-16,100,0|生产,2026-06-16,2026-06-20,40,0|质检,2026-06-20,2026-06-22,0,1" ms:"放行,2026-06-22,1" gnames:"生产|质检" deps:"0->1,1->2"]
```

#### 容器模式（流式逐点喂入，数据增长过程可见）

无 `d`/`tasks`/`rows`/`nodes+flows`/（gauge·progress 的 `v`）时，`chart` 走容器模式收子节点：

| 子节点 | 适用图表 | `v` 内容 |
|--------|---------|---------|
| `pt` | scatter/bubble/treemap/其他点图 | scatter/bubble/treemap 保留原串（`x,y[,s]` / `名:值`），其余 parseFloat |
| `hrow` | heatmap | `v,v,v` 一行（逗号分隔，勿含 `|`） |
| `flow` | sankey | `源->目标:值` |
| `task` | gantt | `名,起,止,进度,组` |
| `ms` | gantt | `名,时间,组` |

```tokui
[chart t:bar tt:日产量 vals l:"Mon,Tue,Wed,Thu,Fri"]
[pt v:10][pt v:24][pt v:18][pt v:30][pt v:22]
[/chart]

[chart t:heatmap tt:访问热力 cols:"周一,周二,周三" l:"早,中,晚"]
[hrow v:"1,2,3"][hrow v:"4,5,6"][hrow v:"7,8,9"]
[/chart]
```

> 自闭合 `[chart ... d:...]` 与容器写法**都支持流式**（含 gantt 长数据、双引号多任务值）。数据点少/单值用自闭合更简洁；数据点多或 gantt 复杂用容器更直观。

---

## 7. 内置图标名（icons.js，24 个）

`btn` 的 `icon:` 属性与表格操作列 `btn: icon:NAME` 取这些 Lucide 风格 SVG 名（stroke=currentColor，自动继承钮色，彩色图标无需另配色）：

```
view  edit  delete  add  copy  download  upload  refresh  check  close
search  setting  warn  info  lock  unlock  more  save  export  filter
sort  star  link  menu
```

未知名返回空字符串。

---

## 8. 动态更新（`upd`）

```tokui
[progress id:prog v:0 l:处理进度]
[upd id:prog v:50]
[upd id:prog v:100 status:success]
```

`upd` 找目标后向上爬到有 `_update` 的组件根，按组件支持的键更新：

- `progress`：`v` / `status`
- `stat`：`v` / `trend`
- `badge`：`tx` / `count` / `overflow` / `act:hide`
- `tag`：`tx` / `act:close`
- `collapse`/`dialog`/`drawer`/`canvas`：`act:open` / `act:close` / `act:toggle` / `tt`
- `input`/`pwd`/`select`/`slider`/`rate`/`numinput`/`switch`/`textarea`/`chat-input`/`input-tag`：`v` / `dis` / `ph` / `ro` / `hint` / `chk` 等
- `steps`/`tabs`：`v`（切当前步 / 激活页）

> `upd` 的 `dis:false` / `ro:false` / `chk:false` 是「主动关闭」语义（渲染端判 `=== 'false'`）；初始渲染的 `dis:false` 会被 parser 读成字符串 `'false'`（truthy），故初始禁用应省略而非写 `false`。

---

## 9. 完整示例

```tokui
[h1 欢迎使用 TokUI]
[p v:muted 这是一段带样式的文本段落]

[btn tx:"点击我" v:primary clk:handleClick]

;; 图标按钮：icon:NAME 出内置 SVG（自动继承钮色），i:GLYPH 出 emoji，l: 提供 icon-only 的 tooltip+无障碍
[btn icon:view tx:详情 t:primary clk:handleView]
[btn icon:delete l:删除 t:danger clk:handleDelete]   ;; icon-only，悬停显"删除"
[btn i:🔍 tx:搜索 clk:handleSearch]

[card tt:"用户信息"]
  [row]
    [col span:6]
      [input l:"姓名" ph:"请输入" req]
    [/col]
    [col span:6]
      [select l:"部门"]
        [opt 技术部]
        [opt 市场部]
      [/select]
    [/col]
  [/row]
  [ft]
    [btn tx:"提交" v:primary sub:handleSubmit]
    [btn tx:"取消"]
  [/ft]
[/card]

[table stripe]
  [thead cols:"姓名,年龄,城市"]
  [tbody]
    [tr 张三,25,北京]
    [tr 李四,30,上海]
  [/tbody]
[/table]

;; 操作列：单元格以 btn: 开头，| 分隔多钮；支持 icon(SVG)/i(emoji)/l(标签+tooltip)/v(配色)
[table stripe]
  [thead cols:"姓名,操作"]
  [tbody]
    [tr "张三,btn: icon:view l:详情 v:primary clk:handleView|btn: icon:edit l:编辑 v:warning clk:handleEdit|btn: icon:delete l:删除 v:danger clk:handleDelete"]
  [/tbody]
[/table]

[chart t:bar tt:"月度销售" vals l:"1月,2月,3月" d:"120,190,300"]

[bubble role:ai]
  [p 你好，有什么可以帮你的？]
[/bubble]

[progress id:prog v:0 l:"处理进度"]
[upd id:prog v:50]
[upd id:prog v:100 status:success]
```

> 提示：`clk:handleClick` / `sub:handleSubmit` 处理器名需通过 `TokUI.registerHandler(name, fn)` 预注册，服务端不下发可执行代码。
