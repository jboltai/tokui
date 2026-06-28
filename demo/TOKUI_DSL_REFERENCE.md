# TokUI DSL 语法速查（完整版）

> TokUI 是零依赖的流式 UI 描述语言，后端通过 DSL 字符串描述组件，经 SSE 推送到前端实时渲染为真实 DOM。

---

## 1. 基本语法

```tokui
[h1 标题]                                    ; 自闭合标签
[card tt:标题] 内容 [/card]                  ; 容器标签，必须 [/type] 闭合
[btn tx:"点击我" v:primary clk:onClick]      ; 多属性用空格分隔
[tr 张三,25,北京]                            ; 同类型多值用逗号分隔
ph:"含空格的值"                              ; 值含空格用双引号包裹
v:"primary,sm"                               ; 多变体用逗号分隔，渲染器白名单校验
```

- `[type attrs... content]` 第一个 token 为组件类型，后续 `key:value` 为属性，最后剩余文本为内容。
- 容器组件必须写闭合标签 `[/type]`，自闭合组件不能包含子元素。
- 布尔属性只写 key 即可生效，例如 `req`、`stripe`、`dis`。
- `p` 段落是**双模**：有正文=叶子自闭合 `[p 文本]`（可夹内联子节点 `a`/`tag`/`b`/`strong`/`em`/`mark`/`spin`/`sub`/`sup`/`code`），遇块级兄弟自动闭合；无正文=容器 `[p]子节点[/p]`（放 `btn`/`form`/`card` 等块级组件用此模式）。判定见 `src/core/parser.js` 的 `P_INLINE_CHILDREN`。
- 正文里的 `英文:值`（如 `Q:`/`A:`/`step:1`）会被解析成**属性**（无空格→整段成属性值、正文空；带空格→前缀消失；`Q`/`A`/`step` 是合法英文标识符即当属性名）。规避：全角 `：`（`[p Q：如何？]`）、去冒号（`[p Q 如何？]`）、或整段双引号包裹（`[p "Q: 如何？"]`）。

---

## 2. 通用属性

| 简写 | 含义 | 说明 |
|------|------|------|
| `id` | 元素 ID | 也用于 `upd` 动态更新目标 |
| `tt` | title | 提示标题/弹窗标题 |
| `tx` | text | 文本内容 |
| `l` | label | 表单标签 |
| `ph` | placeholder | 占位提示 |
| `u` | url | 链接地址 |
| `s` | src / source | 图片、文件、视频、音频地址 |
| `n` | name | 表单字段名、文件名 |
| `v` | value / variant | 值或变体 |
| `act` | action | 表单提交地址 |
| `mtd` | method | 表单提交方法 |
| `clk` | onclick | 点击处理器名称（需 `TokUI.registerHandler` 预先注册） |
| `sub` | onsubmit | 提交处理器名称（需 `TokUI.registerHandler` 预先注册） |
| `dis` | disabled | 禁用 |
| `ro` | readonly | 只读 |
| `req` | required | 必填 |
| `chk` | checked | 选中 |
| `multi` | multiple | 多选 |
| `w` | width | 宽度 |
| `h` | height | 高度 |
| `bg` | background | 背景色 |
| `fc` | font-color | 文字色 |
| `target` | target | `a` 标签打开方式，如 `_blank` |
| `alt` | alt | `img` 替代文本 |

---

## 3. 布尔属性

以下属性无需赋值，直接写 key 即可生效：

`dis` `ro` `req` `chk` `multi` `plain` `round` `closable` `bordered` `open` `pill` `dot` `leaf` `inline` `rounded` `container` `copy` `regenerate` `like` `dislike` `visible` `controls` `active` `collapsible` `toggle` `search` `stripe` `auto`

---

## 4. 变体系统

通过 `v:` 指定，多个变体用逗号组合：

```tokui
v:primary                        ; 按钮类型
v:"primary,sm,pill"              ; 按钮类型 + 小尺寸 + 圆角
v:highlight                      ; 卡片高亮
v:left                           ; 标题/段落左对齐
v:top                            ; 抽屉/提示在上侧弹出
v:avatar                         ; 图片头像样式
```

常见变体白名单：

- **btn**: `primary` `danger` `success` `warning` `ghost` `sm` `lg` `pill` `square` `block`
- **btngroup**: `vertical` `pill`
- **card**: `highlight` `flat` `bordered` `center` `right`
- **table**: `bordered` `compact`
- **h1~h6**: `left` `center` `right` `ribbon` `underline` `badge` `pill`
- **p**: `left` `center` `right` `muted` `bold` `sm` `lg`
- **a**: `muted` `danger` `success` `underline`
- **ft**: `left` `center` `right`
- **row**: `left` `center` `right` `inline`
- **dv**: `dashed` `dotted` `sm` `md` `lg` `vert` `plain`
- **input/pwd**: `error` `success` `sm` `lg` `underline` `pill`
- **select/picker/cascader**: `error` `success`
- **img**: `avatar` `rounded` `bordered`
- **dot**: `sm` `lg`
- **avatar**: `sm` `md` `lg` `xl`
- **tooltip/drawer**: `top` `bottom` `left` `right`
- **pagination/switch/slider/rate/transfer/upload/tree**: `sm` `lg`
- **breadcrumb**: `arrow`

---

## 5. 组件列表

### 5.1 文本与基础

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `h1` ~ `h6` | 自闭合 | `tx` `v` | 标题，变体支持对齐/装饰 |
| `p` | 叶子/容器 | `v` | 段落；有正文自闭合（可夹内联子节点），无正文收子节点到 `[/p]` |
| `a` | 自闭合 | `u` `tx` `target` `v` | 链接 |
| `img` | 自闭合 | `s` `alt` `w` `h` `v` | 图片，点击可灯箱预览 |
| `hr` | 自闭合 | — | 水平分割线 |
| `dv` | 自闭合 | `tx` `v` `size` `align` `bg` | 带文本的分割线 |
| `md` | 容器 | — | Markdown 渲染容器 |
| `code` | 容器 | `lang` | 语法高亮代码块 |

### 5.2 状态、反馈与交互

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `tag` | 自闭合 | `tx` `t` `s` `round` `closable` `bordered` | 标签 |
| `callout` | 自闭合 | `t` `tt` `tx` | 提示框 |
| `spin` | 自闭合 | `t` `s` `tx` | 加载指示器 |
| `skeleton` | 自闭合 | `t` `rows` `w` `h` | 骨架屏 |
| `shimmer` | 自闭合 | `t` `rows` | 闪光骨架 |
| `empty` | 自闭合 | `tx` `icon` `s` | 空状态 |
| `result` | 自闭合 | `t` `tt` `tx` | 结果页 |
| `dot` | 自闭合 | `t` `tx` `s` `pulse` | 状态点 |
| `badge` | 自闭合 | `count` `dot` `t` `tx` `pill` `size` | 徽标 |
| `badge-box` | 容器 | `t` `dot` `count` `overflow` `label` | 包裹子元素 + 角标（点/数字/文字），`t`：primary/success/warning/info/error |
| `toast` | 自闭合 | `t` `tx` `duration` `pos` | 全局 Toast |
| `notification` | 自闭合 | `t` `tt` `tx` `duration` `pos` `clk` | 全局通知 |
| `progress` | 自闭合 | `v` `t` `l` `stripe` | 进度条 |
| `stat` | 自闭合 | `tt` `v` `pre` `suf` `trend` `anim` `dec` | 统计数字 |
| `countdown` | 自闭合 | `target` `dur` `fmt` `tx` | 倒计时 |
| `thumb` | 自闭合 | `t` `clk` `v` | 赞/踩 |
| `toggle` | 自闭合 | `tx` `chk` `clk` `s` | 切换按钮 |
| `toggle-group` | 容器 | `multi` `clk` `s` | 切换按钮组 |
| `copy` | 自闭合 | `id` `tx` `tt` | 复制到剪贴板 |
| `upd` | 自闭合 | `id` + 更新属性 | 动态更新目标元素 |
| `tooltip` | 自闭合 | `tt` `pos` `tx` | 文字提示 |
| `popover` | 容器 | `tx` `tt` `pos` `trig` | 气泡卡片 |
| `popconfirm` | 自闭合 | `tt` `tx` `clk` `t` `pos` | 确认气泡 |
| `hover-card` | 容器 | `pos` `w` `delay` | 悬停卡片，子：`hover-trigger` / `hover-content` |
| `hover-trigger` | 容器 | — | 悬停触发器（`hover-card` 子） |
| `hover-content` | 容器 | — | 悬停内容（`hover-card` 子） |
| `input-tag` | 容器 | `ph` `n` `max` `tags` | 标签输入框 |
| `dropdown` | 容器 | `tx` `tt` | 下拉菜单，子：`dd-item` |
| `dd-item` | 自闭合 | `tx` `clk` `dis` `v` | 下拉菜单项 |
| `backtop` | 自闭合 | `t` `v` `container` `tx` | 回到顶部 |
| `pagination` | 自闭合 | `page` `total` `count` `clk` `s` | 分页 |
| `breadcrumb` | 自闭合 | `items` `sep` `clk` `v` | 面包屑 |
| `calendar` | 自闭合 | `month` `v:card/mini` `marks` `sel` `range` `ranges` `tt` | 日历（`marks` 标记日 / `sel` 离散选中 / `range:"a-b"` 单区间 / `ranges:"a-b;c-d"` 多区间） |
| `watermark` | 容器 | `tx` `s` `c` `gap` `ro` `font` | 水印容器 |
| `avatar` | 自闭合 | `s` `tx` `size` `bg` `fc` | 头像 |
| `file` | 自闭合 | `n` `s` `t` `u` `tt` | 文件卡片 |
| `chat-input` | 容器 | `ph` `clk` `dis` `max` `auto` `rows` | 对话输入框 |
| `msg-actions` | 容器 | `clk` `copy` `regenerate` `like` `dislike` `visible` | 消息操作栏 |

### 5.3 思考与折叠

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `think` | 容器 | `tt` `open` | 思考块 |
| `think-chain` | 容器 | `tt` `status` | 思考链 |
| `think-step` | 容器 | `status` `tt` `dur` | 思考步骤 |

### 5.4 AI / 对话组件

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `bubble` | 容器 | `role` `model` `time` | 对话气泡 |
| `toolbar` | 容器 | `pos` `align` | 工具栏 |
| `tool-call` | 容器 | `name` `status` `duration` `id` | 工具调用卡片 |
| `typing` | 自闭合 | `text` | 输入中指示 |
| `quick-reply` | 容器 | `items` | 快捷回复 |
| `suggestions` | 容器 | `cols` `clk` `id` | 建议卡片网格，子：`suggestion` |
| `suggestion` | 自闭合 | `tt` `tx` `clk` `icon` `dis` | 建议项 |
| `source` | 自闭合 | `n` `tt` `sn` `u` `url` | 引用源 |
| `diff` | 容器 | `title` `lang` | 代码差异 |
| `plan` | 容器 | `tt` | 执行计划，子：`plan-step` |
| `plan-step` | 容器 | `status` `tt` `desc` | 计划步骤 |
| `agent` | 容器 | `name` `status` `action` `duration` `id` | 智能体状态 |
| `file-tree` | 容器 | — | 文件树，子：`ft-folder` / `ft-file` |
| `ft-folder` | 容器 | `name` `open` | 文件夹 |
| `ft-file` | 自闭合 | `name` `badge` | 文件 |
| `terminal` | 容器 | `title` `status` | 终端输出 |
| `sandbox` | 容器 | `lang` `title` `height` | 沙箱 |
| `test-result` | 容器 | `pass` `fail` `skip` `total` `duration` | 测试结果，子：`test-case` 或 `case`（推荐 `case`） |
| `test-case` | 自闭合 | `status` `name` `duration` `error` | 测试用例；推荐简写 `case` |
| `commit` | 自闭合 | `hash` `msg` `author` `branch` `time` `additions` `deletions` | Git 提交 |
| `quote` | 容器 | `role` `tx` `msgid` | 引用消息 |
| `latency` | 自闭合 | `v` `t` | 延迟指标 |
| `video` | 自闭合 | `s` `poster` | 视频 |
| `audio` | 自闭合 | `s` `tt` `duration` | 音频 |
| `conversations` | 容器 | `clk` `act` | 会话列表，子：`conv` |
| `conv` | 自闭合 | `tt` `time` `active` `act` | 会话项 |
| `welcome` | 容器 | `tt` `st` | 欢迎页，子：`welcome-feature` 或 `feature`（推荐 `feature`） |
| `welcome-feature` | 自闭合/容器 | `tt` `tx` `i` `clk` | 欢迎特性卡片；推荐简写 `feature` |
| `feature` | 自闭合 | `tt` `tx` `i` `clk` | `welcome-feature` 简写 |
| `attachments` | 容器 | `clk` | 附件列表，子：`attach` |
| `attach` | 自闭合 | `t` `s` `u` `size` `clk` | 附件项 |
| `artifact` | 容器 | `tt` `lang` `pos` `w` | Artifact，子：`artifact-code` / `artifact-preview` |
| `artifact-code` | 容器 | — | Artifact 代码槽 |
| `artifact-preview` | 容器 | — | Artifact 预览槽 |
| `command` | 容器 | `ph` `clk` `id` | 命令面板，子：`command-group`（其下 `command-item` 或 `item`，等价） |
| `command-group` | 容器 | `tt` | 命令分组；子项 `command-item` 或 `item`（推荐 `item`） |
| `command-item` | 自闭合 | `tx` `clk` `v` `shortcut` | 命令项；推荐改用 `item`（command-group 内等价） |
| `canvas` | 容器 | `tt` `pos` `w` `tx` `open` `closable` | 画布面板，子：`canvas-content` |
| `canvas-content` | 容器 | — | 画布内容 |

### 5.5 布局容器

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `card` | 容器 | `tt` `tx` `v` | 卡片 |
| `ft` | 容器 | `v` | 卡片页脚 |
| `row` | 容器 | `v` | 栅格行 |
| `col` | 容器 | `span` | 栅格列（1-12） |
| `list` | 容器 | `t` `plain` | 列表，别名 `[ol]` `[ul]` |
| `item` | 容器 | `tx` | 同名按父级区分：`[list]` 内为列表项（`<li>` 语义，`[item 文本]` 当首段，可嵌套 `[list]`，`[/item]` 或隐式闭合）；`[desc]` 内自动按描述项渲染（`l` 标签 `tx` 值，等价 `desc-item`，desc 内优先用）。别名 `[i]` |
| `tabs` | 容器 | — | 标签页容器 |
| `tab` | 容器 | `tt` | 标签项 |
| `accordion` | 容器 | — | 手风琴 |
| `collapse` | 容器 | `tt` `open` `id` | 折叠面板 |
| `dialog` | 容器 | `tt` `id` `clk` | 对话框 |
| `drawer` | 容器 | `tt` `pos` `w` `h` `id` | 抽屉 |
| `imgs` | 容器 | `s` | 图片网格 |
| `timeline` | 容器 | `v` | 时间轴 |
| `ti` | 自闭合 | `tm` `t` `tt` | 时间轴项 |
| `steps` | 容器 | `v` `s` `vd` | 步骤条 |
| `step` | 容器 | `tt` `status` | 步骤 |
| `desc` | 容器 | `cols` `stripe` `bordered` `v` `lw` | 描述列表；子项用 `item`（推荐）或 `desc-item`，两者等价 |
| `desc-item` | 自闭合 | `l` `tx` `span` | 描述项；推荐改用 `item`（desc 内自动按描述项渲染） |
| `carousel` | 容器 | `auto` `id` `thumb` `w` `h` `ratio` | 轮播 |
| `carousel-item` | 容器 | `s` `tt` `tx` | 轮播项 |
| `tree` | 容器 | `l` `id` `clk` `chk` `dis` | 树 |
| `tn` | 容器 | `v` `tx` `open` `leaf` `chk` `dis` | 树节点 |
| `menu` | 容器 | `v` `act` `bg` `fc` | 菜单 |
| `menu-item` | 自闭合 | `tx` `clk` `i` `dis` `act` | 菜单项 |
| `resizable` | 容器 | `dir` `min` `max` `default` | 可调整面板 |
| `scroll-area` | 容器 | `h` `w` `id` | 滚动区域 |
| `sidebar` | 容器 | `w` `pos` `collapsible` `tt` `bg` `fc` | 侧边栏 |
| `sidebar-content` | 容器 | — | 侧边栏内容 |
| `sidebar-footer` | 容器 | — | 侧边栏页脚 |

### 5.6 表单组件

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `form` | 容器 | `act` `mtd` `sub` `clk` | 表单 |
| `input` | 自闭合 | `t` `l` `ph` `id` `n` `val` `v` `w` `hint` `search` | 输入框 |
| `pwd` | 自闭合 | 同 `input` + `toggle` | 密码框 |
| `textarea` | 容器 | `l` `ph` `rows` `maxrows` `maxlen` `auto` `tx` `dis` `ro` `req` | 多行文本 |
| `select` | 容器 | `l` `ph` `multi` `id` `n` `req` `v` | 下拉选择，子：`opt` |
| `radio` | 容器 | `l` `id` `n` `v` | 单选组，子：`opt` |
| `opt` | 自闭合 | `v` `tx` `chk` | 选项 |
| `checkbox` | 自闭合 | `l` `chk` `id` `n` `v` | 复选框 |
| `switch` | 自闭合 | `l` `chk` `dis` `clk` `id` `n` `v` | 开关 |
| `slider` | 自闭合 | `l` `min` `max` `step` `v` `dis` `clk` `id` `n` | 滑块 |
| `rate` | 自闭合 | `l` `v` `max` `clk` `dis` `tx` | 评分 |
| `numinput` | 自闭合 | `v` `min` `max` `step` `dis` `id` `n` `l` | 数字输入 |
| `btn` | 自闭合 | `tx` `clk` `sub` `id` `dis` `w` `bg` `fc` `radius` `t` `v` | 按钮 |
| `btngroup` | 容器 | `id` `v` | 按钮组 |
| `picker` | 容器 | `l` `ph` `multi` `dis` `id` `n` `v` | 选择器 |
| `cascader` | 容器 | `l` `ph` `dis` `clk` `v` `id` `n` | 级联选择 |
| `upload` | 自闭合 | `l` `ph` `accept` `multi` `dis` `clk` `max` `id` `n` | 文件上传 |
| `datepicker` | 自闭合 | `l` `ph` `fmt` `v` `clk` `dis` `id` `n` | 日期选择 |
| `timepicker` | 自闭合 | `l` `ph` `fmt` `v` `clk` `dis` `id` `n` | 时间选择 |
| `datetimepicker` | 自闭合 | `l` `ph` `fmt` `v` `clk` `dis` `id` `n` | 日期时间选择 |
| `transfer` | 容器 | `l` `tt` `tt2` `clk` `id` `dis` `n` | 穿梭框 |

### 5.7 数据与图表

| Tag | 类型 | 常用属性 | 说明 |
|-----|------|----------|------|
| `table` | 容器 | `stripe` `cap` `v` | 表格 |
| `thead` | 容器 | `cols` | 表头，`cols:"姓名,年龄"` 支持 `chk` / `#`；`;` 分多行；列名后 `/c`/`/r`/`/l` 对齐、`/primary`/`/danger` 配色 |
| `tbody` | 容器 | — | 表体 |
| `tr` | 自闭合 | `cs`(legacy) `v:total` | 表格行，内容逗号分隔单元格；cell 尾缀 `=cN`/`=rN`/`=cNrM` 合并 |
| `tcol` | 自闭合 | `n` | 列占位 |
| `chart` | 自闭合 | `t` `d` `l` `c` `tt` `w` `h` `v` `area` / gantt: `tasks` `gnames` `deps` `ms` `mode` | SVG 图表 |

**表格合并 / 对齐 / 配色 / 汇总（cell 尾缀，表头+表体通用）**：`值=cN` 横跨 N 列、`值=rN` 纵跨 N 行（被占列下行直接省略，浏览器自动占位，无需 `,,,`）、`值=c2r2` 组合。多行表头 `thead cols` 用 `;` 分行。列对齐 `/c`/`/r`/`/l`、列配色 `/primary`/`/success`/`/warning`/`/danger`/`/info`，按列位传导表体。`tr v:total` 汇总行（加粗、首格右、末格居中带色）。col spec 顺序 `列名[=cN[rM]][/对齐][/配色]`。例：`[thead cols:"大区=r2/c,金额=c2/c;客户,单价/r/danger"]`、`[tr 华北区=r4,ORD-1,字节,5,¥1280,¥6400]`、`[tr 汇总=c8,"¥779,574" v:total]`。旧 `cs:N` 仅行首横跨+`,,,` 占位，已淘汰但兼容。

`chart` 类型：`bar` `line` `pie` `radar` `donut` `scatter` `gantt` `funnel`。

`funnel` 漏斗图（销售/转化/招聘漏斗）：单系列逗号分隔，建议数据**降序**（首层=漏斗口最大）。层内自动标注名称与**相对首层的转化率**（如 5400/12000=45%）。例：`[chart t:funnel tt:销售漏斗 l:"曝光,点击,加购,下单,付款" d:"12000,5400,2800,1600,920"]`。

`gantt` 甘特图专属属性：
- `tasks`：任务列表，格式 `名称,开始,结束[,进度[,组号]]`，多条用 `|` 分隔
- `gnames`：组名列表，按**组号**映射图例文字，多条用 `|` 分隔，如 `产品设计|开发|测试`。tasks 中用了组号（第 5 字段）就**必须**同步给 `gnames`，否则图例只会显示无意义的「组1/组2」占位符
- `deps`：依赖关系，格式 `源索引->目标索引`，多条用 `,` 分隔（finish→start）
- `ms`：里程碑，格式 `名称,时间点[,组号]`，多条用 `|` 分隔
- `mode`：`days`（天数）/`dates`（日期），留空自动判断（含 `-`/`/` 为日期）

时间值：天数用数字（如 `1,3`），日期用 `2026-06-15` 或 `2026/6/15`。

- `d`: 数据，多系列用 `|` 分隔，如 `10,20,30|5,15,25`。
- `l`: 标签，逗号分隔。
- `c`: 颜色，逗号分隔。
- `area`: 折线图填充。

---

## 6. 完整示例

```tokui
[h1 欢迎使用 TokUI]
[p v:muted 这是一段带样式的文本段落]

[btn tx:"点击我" v:primary clk:handleClick]

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

[chart t:bar tt:"月度销售" l:"1月,2月,3月" d:"120,190,300"]

[bubble role:ai]
  [p 你好，有什么可以帮你的？]
[/bubble]

[progress id:prog v:0 l:"处理进度"]
[upd id:prog v:50]
[upd id:prog v:100 status:success]
```

> 提示：`clk:handleClick` / `sub:handleSubmit` 中的处理器名称需通过 `TokUI.registerHandler(name, fn)` 预先注册，服务端不会下发可执行代码。
