# Form Components

Form containers, various input controls and selectors. Each example shows the formatted, highlighted TokUI DSL on the left and the live render on the right; click "Edit" to modify it instantly.

## Form Container `form`

Wraps a group of form controls. On submit, triggers the `sub:` handler or the native `act` submission.

| Prop | Meaning | Example |
|------|---------|---------|
| `act` | Submit URL | `act:/api/save` |
| `mtd` | Submit method | `mtd:post` |
| `sub` | Submit handler name | `sub:onSubmit` |
| `clk` | Generic event handler name | `clk:onFormClick` |

> The handler referenced by `sub:` must be pre-registered via `TokUI.registerHandler(name, fn)`; on a `btn`, use `sub:xxx` to trigger form submission.

<Playground dsl='[card tt:登录表单][form act:/api/login mtd:post sub:onLogin][input l:账号 ph:"请输入账号" req][pwd l:密码 ph:"请输入密码" req][ft][btn tx:登录 v:primary sub:onLogin][btn tx:重置 v:ghost t:reset][/ft][/form][/card]' />

## Value-Change Reporting (change event)

Form controls report user value changes in real time to a pre-registered handler via `on:"change:handler"` (**double quotes required**) — the "user → AI" interaction loop:

```tokui
[input n:city l:City on:"change:onCityChange"]
[switch l:Notifications n:notify on:"change:onNotifyChange"]
```

- **Input debounce**: `input` / `pwd` / `textarea` / `numinput` report 300ms after typing stops; override the milliseconds with `db:` (e.g. `db:500`).
- **Fire on change**: `select` / `radio` / `checkbox` / `switch` / `slider` / `rate` / `picker` / `transfer` / `cascader` / `datepicker` family / `input-tag` report immediately when the value changes.
- **upload**: reports `change` when files are selected / removed, with detail `{value: filename array, name}`.
- **detail shape**: handler signature `(detail, event, element)`, with `detail` = `{value, name}`.
- **Unified outlet**: every interaction also goes to `new TokUI({ onEvent })`'s `onEvent('component', { type, id, event, detail })` — the host can listen to everything without any `on:` declaration.

> For the full event list see [DSL Syntax · Interaction event reporting](/en/guide/dsl-syntax#interaction-event-reporting).

## Input `input`

Single-line text input, self-closing. `l` for label, `ph` for placeholder, `t` for native type, `val` for initial value.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:姓名` |
| `ph` | Placeholder hint | `ph:"请输入姓名"` |
| `t` | Native input type | `t:email` |
| `n` | Field name | `n:username` |
| `val` | Default value | `val:Tom` |
| `id` | Element ID | `id:username` |
| `w` | Width | `w:240` |
| `hint` | Hint text | `hint:6~16 个字符` |
| `search` | Search style | `search` |
| `req` / `dis` / `ro` | Required / Disabled / Read-only | `req` |

**Variants**: `error` / `success` (validation states), `sm` / `lg` (sizes), `underline` (underline style), `pill` (rounded).

<Playground dsl='[input l:姓名 ph:"请输入姓名" req][input l:邮箱 t:email ph:name@example.com][input l:带默认值 val:张三][input l:搜索框 ph:"输入关键词搜索" search][input l:禁用态 ph:不可编辑 dis][input l:错误状态 v:error ph:校验失败]' />

## Password `pwd`

Password input with show/hide toggle, self-closing. Same props as `input`, plus `toggle` to control whether plain text can be revealed.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:密码` |
| `ph` | Placeholder hint | `ph:"至少 6 位"` |
| `toggle` | Show/hide toggle button | `toggle` |
| `req` / `dis` | Required / Disabled | `req` |
| `v` | Variant (same as `input`) | `v:error` |

<Playground dsl='[pwd l:登录密码 ph:"请输入密码" req toggle][pwd l:支付密码 ph:6 位数字 req][pwd l:禁用态 ph:不可编辑 dis]' />

## Textarea `textarea`

Multi-line text input container. `rows` for initial row count, `maxlen` for max character count, `auto` for auto-growing height.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:描述` |
| `ph` | Placeholder hint | `ph:"请输入描述"` |
| `rows` | Initial rows | `rows:4` |
| `maxrows` | Max rows (auto mode) | `maxrows:8` |
| `maxlen` | Max character count | `maxlen:200` |
| `auto` | Auto-grow height | `auto` |
| `tx` | Default content | `tx:"默认文本"` |
| `req` / `dis` / `ro` | Required / Disabled / Read-only | `req` |

<Playground dsl='[textarea l:默认值自闭合 tx:"热爱前端开发，擅长组件设计与性能优化。" maxlen:120][textarea l:只读协议自闭合 ro tx:"本服务仅供学习，禁止商用。"][textarea l:空容器嵌套 ph:"请简单介绍自己" rows:3][/textarea][textarea l:自适应高度 auto rows:2 maxrows:6 ph:"内容增多会自动撑开"][/textarea][textarea l:带内容嵌套 rows:4 ph:"请输入反馈"]希望增加暗色主题与多语言支持。[/textarea]' />

## Dropdown `select` / `opt`

`select` is a container; `opt` are child option nodes. `multi` for multi-select, `req` for required.

| Prop | Meaning | Applies to |
|------|---------|------------|
| `l` | Label | `select` |
| `ph` | Placeholder hint | `select` |
| `multi` | Multi-select | `select` |
| `n` | Field name | `select` |
| `req` | Required | `select` |
| `v` | Variant | `select` |
| `tx` | Option text | `opt` |
| `v` | Option value | `opt` |
| `chk` | Default selected | `opt` |

**`select` variants**: `error` / `success`.

<Playground dsl='[select l:单选部门 ph:"请选择"][opt 技术部][opt 市场部 chk][opt 运营部][/select][select l:多选技能 multi][opt React chk][opt Vue chk][opt Node][/select][select l:必选城市 req ph:"请选择城市"][opt 北京][opt 上海][/select]' />

## Radio Group `radio`

`radio` is a container; `opt` are child option nodes. Options sharing the same `n` are mutually exclusive. Two forms: container (`[opt]` children) or `opt:"..."` shorthand (self-closing, no `[/radio]` needed).

| Prop | Meaning | Applies to |
|------|---------|------------|
| `l` | Group label | `radio` |
| `n` | Field name (shared by group, submission key) | `radio` |
| `id` | Group ID | `radio` |
| `v` | `inline` (label beside control) / `vertical` (options stacked, left-aligned) | `radio` |
| `opt` | Shorthand option string `opt:"v:label;v:label"` (self-closing form) | `radio` |
| `tx` | Option text | `opt` |
| `v` | Option value | `opt` |
| `chk` | Default selected | `opt` |

<Playground dsl='[radio l:性别 n:gender][opt v:1 tx:男][opt v:2 tx:女 chk][/radio][radio l:配送方式（简写） n:deliver opt:"1:快递;2:自提;3:同城配送"][radio l:渠道（竖排） n:ch v:vertical opt:"1:官方网站;2:手机APP;3:门店"]' />

## Checkbox `checkbox`

**Three modes** (auto-detected by presence of `opt` / `multi`):

| Mode | Detection | Syntax | Submitted value |
|------|-----------|--------|-----------------|
| Single boolean | no `opt`, no `multi` (self-closing) | `[checkbox l:同意协议 n:agree chk]` | boolean (checked = `agree` present) |
| Shorthand multi | has `opt` (self-closing) | `[checkbox n:tag l:标签 opt:"1:A;2:B;3:C"]` | `data.tag` = array |
| Container multi | has `multi` (container) | `[checkbox n:tag l:标签 multi][opt v:1 tx:A chk][/checkbox]` | `data.tag` = array |

| Prop | Meaning | Applies to |
|------|---------|------------|
| `l` | Label | `checkbox` |
| `n` | Field name (multi-select submission key) | `checkbox` |
| `opt` | Shorthand option string (self-closing multi) | `checkbox` |
| `multi` | Marks container multi mode (needs `[/checkbox]`) | `checkbox` |
| `v` | `inline`/`vertical` | `checkbox` |
| `chk` | Default checked / selected | `checkbox` / `opt` |
| `dis` | Disabled | `checkbox` |

Multi-select submission uses native FormData; same-`n` values auto-aggregate into an array (e.g. checking A and C → `data.tag = ["1","3"]`). **Single-boolean and shorthand-multi are self-closing — do NOT write `[/checkbox]`**; only `multi` container-multi needs `[/checkbox]`.

> **Submit-button placement** (get this wrong → no data): put it **inside** the form `[form id:F sub:H]...[btn tx:Submit clk:H][/form]` (clk auto-collects the owning form); OR **outside** the form but with explicit `form:FORM_ID` binding `[btn tx:Submit form:F clk:H]`. A button outside the form with no `form:ID` → handler receives `null`.

<Playground dsl='[checkbox l:我已阅读并同意服务条款 n:agree chk][checkbox l:订阅每周精选 n:weekly][checkbox l:禁用且勾选 n:x chk dis][checkbox n:tag l:标签（简写多选） opt:"1:篮球;2:足球;3:羽毛球"][checkbox n:f l:功能（竖排） v:vertical opt:"1:即时通讯;2:会议;3:日历;4:云盘"]' />

## Switch `switch`

Self-closing. `chk` to turn on, `clk` for the toggle callback.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:邮件通知` |
| `chk` | Default on | `chk` |
| `dis` | Disabled | `dis` |
| `clk` | Toggle handler name | `clk:onToggle` |
| `n` | Field name | `n:notify` |
| `v` | Value | `v:1` |
| `id` | Element ID | `id:notify` |

**Variants**: `sm` / `lg`.

<Playground dsl='[switch l:接收邮件通知 chk][switch l:免打扰模式][switch l:夜间静音 clk:onNight][switch l:小尺寸 chk v:sm][switch l:大尺寸 chk v:lg]' />

## Slider `slider`

Self-closing. `min`/`max`/`step` for range and step, `v` for current value.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:音量` |
| `min` | Minimum value | `min:0` |
| `max` | Maximum value | `max:100` |
| `step` | Step | `step:5` |
| `v` | Current value | `v:60` |
| `dis` | Disabled | `dis` |
| `clk` | Drag callback | `clk:onSlide` |
| `n` | Field name | `n:volume` |
| `id` | Element ID | `id:volume` |

**Variants**: `sm` / `lg`.

<Playground dsl='[slider l:音量 v:60 min:0 max:100][slider l:亮度 step:5 v:75][slider l:不透明度 v:30 clk:onOpacity][slider l:禁用 v:50 dis]' />

## Rate `rate`

Self-closing. `max` for max star count, `v` for current rating, `clk` for the select callback.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:评分` |
| `v` | Current value | `v:4` |
| `max` | Max stars | `max:5` |
| `clk` | Select callback | `clk:onRate` |
| `dis` | Read-only / disabled | `dis` |
| `tx` | Caption text | `tx:很好` |

<Playground dsl='[rate l:商品评分 v:4 max:5][rate l:服务评分 v:0 max:5 clk:onRate][rate l:只读评分 v:5 dis]' />

## Number Input `numinput`

Self-closing. Number input with increment/decrement buttons; `min`/`max`/`step` constrain the range.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:数量` |
| `v` | Current value | `v:1` |
| `min` | Minimum value | `min:1` |
| `max` | Maximum value | `max:99` |
| `step` | Step | `step:1` |
| `dis` | Disabled | `dis` |
| `n` | Field name | `n:qty` |
| `id` | Element ID | `id:qty` |

<Playground dsl='[numinput l:购买数量 v:1 min:1 max:99 step:1][numinput l:时长（小时） v:8 min:0 max:24 step:0.5][numinput l:禁用 v:5 dis]' />

## Button Group `btngroup`

Container that wraps a set of `btn`s. In form scenarios, commonly used as a multi-button action area (for primary button usage see [Basic Components](/components/basic)).

| Prop | Meaning | Example |
|------|---------|---------|
| `id` | Group ID | `id:actions` |
| `v` | Variant | `v:vertical` |

**Variants**: `vertical` (vertical layout), `pill` (rounded group).

<Playground dsl='[btngroup][btn tx:保存 v:primary sub:onSave][btn tx:取消 v:ghost][/btngroup][btngroup v:vertical][btn tx:上传 v:primary][btn tx:下载][btn tx:删除 v:danger][/btngroup]' />

## Picker `picker`

Container; a richer selection panel than `select` (with search / multiple columns). `multi` for multi-select, `dis` for disabled.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:城市` |
| `ph` | Placeholder hint | `ph:"请选择"` |
| `multi` | Multi-select | `multi` |
| `dis` | Disabled | `dis` |
| `n` | Field name | `n:city` |
| `v` | Value | `v:bj` |
| `id` | Element ID | `id:city` |

**Variants**: `error` / `success`.

<Playground dsl='[picker l:所在城市 ph:"请选择城市"][/picker][picker l:标签（多选） multi ph:"请选择标签"][/picker][picker l:禁用态 ph:不可选择 dis][/picker]' />

## Cascader `cascader`

Container; a multi-level selector that expands level by level (e.g. province/city/district). `clk` for the select callback.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:地区` |
| `ph` | Placeholder hint | `ph:"请选择"` |
| `dis` | Disabled | `dis` |
| `clk` | Select callback | `clk:onPick` |
| `v` | Value | `v:"北京-朝阳"` |
| `n` | Field name | `n:region` |
| `id` | Element ID | `id:region` |

**Variants**: `error` / `success`.

<Playground dsl='[cascader l:所在地区 ph:"请选择省/市/区"][/cascader][cascader l:商品分类 clk:onCategory][/cascader]' />

## Upload `upload`

Self-closing. `accept` restricts file types, `multi` for multiple files, `max` for maximum count.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:附件` |
| `ph` | Placeholder hint | `ph:"点击或拖拽上传"` |
| `accept` | Allowed types | `accept:"image/*"` |
| `multi` | Multiple files | `multi` |
| `max` | Max count | `max:5` |
| `dis` | Disabled | `dis` |
| `clk` | Upload callback | `clk:onUpload` |
| `n` | Field name | `n:file` |
| `id` | Element ID | `id:file` |

**Variants**: `sm` / `lg`.

<Playground dsl='[upload l:头像 accept:"image/*" ph:"点击上传头像"][upload l:多文件上传 multi max:5 ph:"支持最多 5 个文件"][upload l:禁用上传 dis]' />

> The server can push `[upd id:file act:clear]` to clear the selected-file list.

## Date Picker `datepicker`

Self-closing. `fmt` for date format, `v` for default value, `clk` for the select callback.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:出生日期` |
| `ph` | Placeholder hint | `ph:"请选择日期"` |
| `fmt` | Date format | `fmt:yyyy-MM-dd` |
| `v` | Default value | `v:2026-06-20` |
| `clk` | Select callback | `clk:onDate` |
| `dis` | Disabled | `dis` |
| `n` | Field name | `n:birthday` |
| `id` | Element ID | `id:birthday` |

<Playground dsl='[datepicker l:出生日期 ph:"请选择日期" fmt:yyyy-MM-dd][datepicker l:默认值示例 v:2026-06-20][datepicker l:禁用态 ph:不可选择 dis]' />

## Time Picker `timepicker`

Self-closing. `fmt` for time format, `v` for default value.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:开始时间` |
| `ph` | Placeholder hint | `ph:"请选择时间"` |
| `fmt` | Time format | `fmt:HH:mm` |
| `v` | Default value | `v:09:30` |
| `clk` | Select callback | `clk:onTime` |
| `dis` | Disabled | `dis` |
| `n` | Field name | `n:time` |
| `id` | Element ID | `id:time` |

<Playground dsl='[timepicker l:开始时间 ph:"请选择时间" fmt:HH:mm][timepicker l:默认值 v:09:30][timepicker l:禁用态 ph:不可选择 dis]' />

## Datetime Picker `datetimepicker`

Self-closing. Combined date + time picker; `fmt` for custom format.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:预约时间` |
| `ph` | Placeholder hint | `ph:"请选择日期时间"` |
| `fmt` | Format | `fmt:"yyyy-MM-dd HH:mm"` |
| `v` | Default value | `v:"2026-06-20 09:30"` |
| `clk` | Select callback | `clk:onDateTime` |
| `dis` | Disabled | `dis` |
| `n` | Field name | `n:dt` |
| `id` | Element ID | `id:dt` |

<Playground dsl='[datetimepicker l:预约时间 ph:"请选择日期时间" fmt:"yyyy-MM-dd HH:mm"][datetimepicker l:默认值 v:"2026-06-20 09:30"][datetimepicker l:禁用态 ph:不可选择 dis]' />

## Transfer `transfer`

Container; a two-column mutually exclusive multi-select mover. `tt`/`tt2` for the two column titles, `clk` for the move callback.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:分配角色` |
| `tt` | Left column title | `tt:未选` |
| `tt2` | Right column title | `tt2:已选` |
| `clk` | Move callback | `clk:onTransfer` |
| `h` | Fixed height (inner scroll) | `h:240` / `h:40vh` |
| `mh` | Max height (overrides default 320px) | `mh:200` |
| `dis` | Disabled | `dis` |
| `n` | Field name | `n:roles` |
| `id` | Element ID | `id:roles` |

**Variants**: `sm` (max 260px) / `lg` (max 400px). Default max-height 320px; overflowing lists scroll inside (scrollbar transparent by default, grey semi-transparent on hover).

<Playground dsl='[transfer l:角色分配 tt:待分配 tt2:已分配 clk:onTransfer][opt v:admin tx:系统管理员][opt v:editor tx:内容编辑 chk][opt v:viewer tx:只读访客][opt v:auditor tx:审计员 chk][opt v:dev tx:开发者][/transfer]' />

`h` fixed height and `mh` max height examples:

<Playground dsl='[transfer l:固定高度 h:160 tt:待 tt2:已][opt v:1 tx:选项一][opt v:2 tx:选项二 chk][opt v:3 tx:选项三][opt v:4 tx:选项四][opt v:5 tx:选项五 chk][opt v:6 tx:选项六][/transfer][transfer l:最大高度 mh:140 tt:候选 tt2:已选][opt v:a tx:短列表A][opt v:b tx:短列表B chk][/transfer]' />

## Input Tag `input-tag`

Press Enter to add a tag, click a tag's `×` to remove it. `tags` for initial tags, `max` for maximum count. Self-closing when `tags` is present; otherwise close with `[/input-tag]`.

| Prop | Meaning | Example |
|------|---------|---------|
| `l` | Label | `l:标签` |
| `ph` | Placeholder hint | `ph:"输入后回车添加"` |
| `n` | Field name | `n:tags` |
| `max` | Max count | `max:8` |
| `tags` | Initial tags (comma-separated) | `tags:"JS,Python"` |
| `dis` | Disabled | `dis` |

<Playground dsl='[input-tag l:技术栈 ph:"输入后回车添加" max:8 tags:"JavaScript,Python,Go"][input-tag l:极简自闭合 tags:"React,Vue"][input-tag l:空容器 ph:"无初始标签，手动添加"][/input-tag][input-tag l:禁用态 tags:"只读模式" dis]' />

> For the full DSL syntax (prop shorthands, variant whitelist, streaming render constraints, etc.), see [DSL Syntax](/guide/dsl-syntax).
