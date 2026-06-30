# 表单组件

表单容器、各类输入控件与选择器。每个示例左侧为格式化 + 高亮的 TokUI DSL，右侧为实时渲染，点「编辑」可即时改动。

## 表单容器 `form`

包裹一组表单控件，提交时触发 `sub:` 处理器或 `act` 原生提交。

| 属性 | 含义 | 示例 |
|------|------|------|
| `id` | 表单标识，供按钮 `form:ID` 显式绑定 | `id:loginForm` |
| `act` | 提交地址 | `act:/api/save` |
| `mtd` | 提交方法 | `mtd:post` |
| `sub` | 提交处理器名 | `sub:onSubmit` |
| `clk` | 通用事件处理器名 | `clk:onFormClick` |

> `sub:` 指向的处理器需通过 `TokUI.registerHandler(name, fn)` 预先注册；`btn` 上用 `sub:xxx` 触发表单提交。
> 表单外的按钮可用 `form:ID` 显式绑定目标表单（见下节[表单动作](#表单动作-提交-重置-数据收集)），不再依赖 DOM 层级。

<Playground dsl='[card tt:登录表单][form id:loginForm act:/api/login mtd:post sub:onLogin][input l:账号 n:username ph:"请输入账号" req][pwd l:密码 n:password ph:"请输入密码" req][btngroup][btn tx:登录 v:primary form:loginForm sub:onLogin][btn tx:重置 v:ghost form:loginForm reset][/btngroup][/form][/card]' />

## 表单动作：提交 / 重置 / 数据收集

`btn` 内置三类动作，由 renderer 自动解析，**无需 `registerHandler`**（仅 `sub` 的业务处理仍需注册）。优先级 `print > reset > submit > clk`。

| DSL | 动作 | 说明 |
|-----|------|------|
| `[btn form:F sub:H]` | **提交** | 收集表单 F 的全部字段（含 slider/rate/picker 等自定义控件的 hidden 值），调用 handler `H` |
| `[btn form:F reset]` | **重置** | 一键复原表单 F：原生输入走 `form.reset()`，自定义控件走内置 `_tokuiReset`；可选 `reset:H` 在复位后回调 |
| `[btn form:F clk:H]` | **普通点击** | 不收集数据，走 event-bus（`form:` 可省略，仅用于让 handler 拿到 `data`） |

**`form:ID` 显式绑定**（关键能力）：按钮放在表单**外部**时，靠 `form:ID` 精确指明收集哪个表单，跨层级、多表单互不干扰。解析用 `getElementById` 且校验目标为 `<form>`，防 id 伪造。

```
[form id:formA sub:onA] ... [/form]
[form id:formB sub:onB] ... [/form]
[btn tx:"提交 A" form:formA sub:onA t:primary]   ← 只收集 formA
[btn tx:"提交 B" form:formB sub:onB t:primary]   ← 只收集 formB
```

**重置覆盖范围**：`input/pwd/select/textarea/checkbox` 等原生控件 + `slider/rate/numinput/switch/transfer/picker/cascader` 等自定义控件均实现复位契约（`data-tokui-resettable` + `_tokuiReset`），renderer 遍历调用并向 form 广播 `tokuireset` 事件供外部监听。

<Playground dsl='[h3 表单外按钮靠 form:ID 绑定][row][col span:6][card tt:表单 A][form id:fa sub:onA][input l:姓名 n:name ph:张三][input l:邮箱 n:email ph:a@x.com][/form][btngroup][btn tx:"提交 A" form:fa sub:onA v:primary][btn tx:重置 form:fa reset v:ghost][/btngroup][/card][/col][col span:6][card tt:表单 B][form id:fb sub:onB][input l:公司 n:company ph:TokUI][numinput l:人数 n:count v:5 min:1 max:99][/form][btngroup][btn tx:"提交 B" form:fb sub:onB v:primary][btn tx:重置 form:fb reset v:ghost][/btngroup][/card][/col][/row]' />

## 打印区 `print-area`

标记一块 **1:1 打印**区域，配合 `[btn print:ID]` 触发浏览器打印。打印时仅该区域可见、如实还原配色与布局；打印按钮自身不进预览。

| 属性 | 含义 | 示例 |
|------|------|------|
| `id` | 打印区标识，供 `print:ID` 引用 | `id:invoice` |
| `tt` | 可选标题（打印文档标题） | `tt:收款单` |

**触发打印**（`btn` 的 `print` 动作，内置、无需 handler）：

| DSL | 行为 |
|-----|------|
| `[btn print:invoice]` | 打印 `#invoice` 打印区 |
| `[btn print:self]` | 打印按钮所在的最近 `print-area` / `card` |
| `[btn print]` | 裸写，等价 `print:self` |

> 打印机制：renderer 给目标加 `.tokui-print-target` + `body[data-tokui-printing]`，`@media print` 用 visibility 仅令该作用域可见（1:1）。响应式断点已限定 `screen`，打印不触发堆叠。`@page` 页边 + 打印区内边距构成文档边界；暗色主题下强制白底省墨。

<Playground dsl='[print-area id:invoice tt:"收款单 #20260627"][row][col span:6][stat tt:应付金额 v:"12,800.00" pre:"¥ " trend:up][/col][col span:6][stat tt:已付定金 v:"3,000.00" pre:"¥ " trend:down][/col][/row][table bordered][thead cols:"项目,数量,单价,小计"][tr 产品授权,5,¥1800,¥9000][tr 实施服务,1,¥2800,¥2800][/table][p v:bold 合计：¥12,800.00  账期：30 天][/print-area][btngroup][btn tx:"🖨 打印此单" print:invoice v:primary][btn tx:打印本卡 print:self v:ghost][/btngroup]' />

## 输入框 `input`

单行文本输入，自闭合。`l` 标签、`ph` 占位、`t` 原生 type、`val` 初值。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:姓名` |
| `ph` | 占位提示 | `ph:"请输入姓名"` |
| `t` | 原生 input type | `t:email` |
| `n` | 字段名 | `n:username` |
| `val` | 默认值 | `val:Tom` |
| `id` | 元素 ID | `id:username` |
| `w` | 宽度 | `w:240` |
| `hint` | 提示文字 | `hint:6~16 个字符` |
| `search` | 搜索样式 | `search` |
| `req` / `dis` / `ro` | 必填 / 禁用 / 只读 | `req` |

**变体**：`error` / `success`（校验状态），`sm` / `lg`（尺寸），`underline`（下划线风格），`pill`（圆角）。

<Playground dsl='[input l:姓名 ph:"请输入姓名" req][input l:邮箱 t:email ph:name@example.com][input l:带默认值 val:张三][input l:搜索框 ph:"输入关键词搜索" search][input l:禁用态 ph:不可编辑 dis][input l:错误状态 v:error ph:校验失败]' />

## 密码框 `pwd`

带显隐切换的密码输入，自闭合。属性同 `input`，额外 `toggle` 控制是否允许切换明文。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:密码` |
| `ph` | 占位提示 | `ph:"至少 6 位"` |
| `toggle` | 显隐切换按钮 | `toggle` |
| `req` / `dis` | 必填 / 禁用 | `req` |
| `v` | 变体（同 `input`） | `v:error` |

<Playground dsl='[pwd l:登录密码 ph:"请输入密码" req toggle][pwd l:支付密码 ph:6 位数字 req][pwd l:禁用态 ph:不可编辑 dis]' />

## 多行文本 `textarea`

多行文本输入容器。`rows` 初始行数、`maxlen` 最大字数、`auto` 高度自适应。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:描述` |
| `ph` | 占位提示 | `ph:"请输入描述"` |
| `rows` | 初始行数 | `rows:4` |
| `maxrows` | 最大行数（auto 模式） | `maxrows:8` |
| `maxlen` | 最大字数 | `maxlen:200` |
| `auto` | 高度自适应 | `auto` |
| `tx` | 默认内容 | `tx:"默认文本"` |
| `req` / `dis` / `ro` | 必填 / 禁用 / 只读 | `req` |

<Playground dsl='[textarea l:默认值自闭合 tx:"热爱前端开发，擅长组件设计与性能优化。" maxlen:120][textarea l:只读协议自闭合 ro tx:"本服务仅供学习，禁止商用。"][textarea l:空容器嵌套 ph:"请简单介绍自己" rows:3][/textarea][textarea l:自适应高度 auto rows:2 maxrows:6 ph:"内容增多会自动撑开"][/textarea][textarea l:带内容嵌套 rows:4 ph:"请输入反馈"]希望增加暗色主题与多语言支持。[/textarea]' />

## 下拉选择 `select` / `opt`

`select` 容器，子节点 `opt` 选项。`multi` 多选、`req` 必填。

| 属性 | 含义 | 适用 |
|------|------|------|
| `l` | 标签 | `select` |
| `ph` | 占位提示 | `select` |
| `multi` | 多选 | `select` |
| `n` | 字段名 | `select` |
| `req` | 必填 | `select` |
| `v` | 变体 | `select` |
| `tx` | 选项文本 | `opt` |
| `v` | 选项值 | `opt` |
| `chk` | 默认选中 | `opt` |

**`select` 变体**：`error` / `success`。

<Playground dsl='[select l:单选部门 ph:"请选择"][opt 技术部][opt 市场部 chk][opt 运营部][/select][select l:多选技能 multi][opt React chk][opt Vue chk][opt Node][/select][select l:必选城市 req ph:"请选择城市"][opt 北京][opt 上海][/select]' />

## 单选组 `radio`

`radio` 容器，子节点 `opt` 选项；同组同 `n` 互斥。两种写法：容器（`[opt]` 子项）或 `opt:"..."` 简写（自闭合，无需 `[/radio]`）。

| 属性 | 含义 | 适用 |
|------|------|------|
| `l` | 组标签 | `radio` |
| `n` | 字段名（同组共享，提交键） | `radio` |
| `id` | 组 ID | `radio` |
| `v` | `inline`（标签与控件同行）/ `vertical`（选项竖排左对齐） | `radio` |
| `opt` | 简写选项串 `opt:"v:文;v:文"`（自闭合写法，与 `[opt]` 子项二选一） | `radio` |
| `tx` | 选项文本 | `opt` |
| `v` | 选项值 | `opt` |
| `chk` | 默认选中 | `opt` |

<Playground dsl='[radio l:性别 n:gender][opt v:1 tx:男][opt v:2 tx:女 chk][/radio][radio l:配送方式（简写） n:deliver opt:"1:快递;2:自提;3:同城配送"][radio l:渠道（竖排） n:ch v:vertical opt:"1:官方网站;2:手机APP;3:门店"]' />

## 复选框 `checkbox`

**三态**（按是否带 `opt` / `multi` 自动判定）：

| 形态 | 判定 | 写法 | 提交值 |
|------|------|------|--------|
| 单布尔 | 无 `opt` 无 `multi`（自闭合） | `[checkbox l:同意协议 n:agree chk]` | 布尔（勾选=agree 出现） |
| 简写多选 | 有 `opt`（自闭合） | `[checkbox n:tag l:标签 opt:"1:A;2:B;3:C"]` | `data.tag` = 数组 |
| 容器多选 | 有 `multi`（容器） | `[checkbox n:tag l:标签 multi][opt v:1 tx:A chk][/checkbox]` | `data.tag` = 数组 |

| 属性 | 含义 | 适用 |
|------|------|------|
| `l` | 标签 | `checkbox` |
| `n` | 字段名（多选提交键） | `checkbox` |
| `opt` | 简写选项串（自闭合多选） | `checkbox` |
| `multi` | 标记容器多选模式（需 `[/checkbox]`） | `checkbox` |
| `v` | `inline`/`vertical` | `checkbox` |
| `chk` | 默认勾选 / 选中 | `checkbox` / `opt` |
| `dis` | 禁用 | `checkbox` |

多选提交走原生 FormData，同 `n` 多值自动聚合为数组（如勾选 A、C → `data.tag = ["1","3"]`）。**单布尔 / 简写多选是自闭合，不写 `[/checkbox]`**；只有 `multi` 容器多选需要 `[/checkbox]`。

> **取值按钮位置**（写错就拿不到数据）：放 form **内** `[form id:F sub:H]...[btn tx:提交 clk:H][/form]`（clk 自动收集所在 form）；或放 form **外**但必须加 `form:表单ID` 显式绑定 `[btn tx:提交 form:F clk:H]`。按钮在 form 外、又不写 `form:ID` → handler 收到 `null`。

<Playground dsl='[checkbox l:我已阅读并同意服务条款 n:agree chk][checkbox l:订阅每周精选 n:weekly][checkbox l:禁用且勾选 n:x chk dis][checkbox n:tag l:标签（简写多选） opt:"1:篮球;2:足球;3:羽毛球"][checkbox n:f l:功能（竖排） v:vertical opt:"1:即时通讯;2:会议;3:日历;4:云盘"]' />

## 开关 `switch`

自闭合。`chk` 开启、`clk` 切换回调。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:邮件通知` |
| `chk` | 默认开启 | `chk` |
| `dis` | 禁用 | `dis` |
| `clk` | 切换处理器名 | `clk:onToggle` |
| `n` | 字段名 | `n:notify` |
| `v` | 值 | `v:1` |
| `id` | 元素 ID | `id:notify` |

**变体**：`sm` / `lg`。

<Playground dsl='[switch l:接收邮件通知 chk][switch l:免打扰模式][switch l:夜间静音 clk:onNight][switch l:小尺寸 chk v:sm][switch l:大尺寸 chk v:lg]' />

## 滑块 `slider`

自闭合。`min`/`max`/`step` 区间与步进、`v` 当前值。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:音量` |
| `min` | 最小值 | `min:0` |
| `max` | 最大值 | `max:100` |
| `step` | 步进 | `step:5` |
| `v` | 当前值 | `v:60` |
| `dis` | 禁用 | `dis` |
| `clk` | 拖动回调 | `clk:onSlide` |
| `n` | 字段名 | `n:volume` |
| `id` | 元素 ID | `id:volume` |

**变体**：`sm` / `lg`。

<Playground dsl='[slider l:音量 v:60 min:0 max:100][slider l:亮度 step:5 v:75][slider l:不透明度 v:30 clk:onOpacity][slider l:禁用 v:50 dis]' />

## 评分 `rate`

自闭合。`max` 星级上限、`v` 当前分、`clk` 选择回调。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:评分` |
| `v` | 当前值 | `v:4` |
| `max` | 最大星级 | `max:5` |
| `clk` | 选择回调 | `clk:onRate` |
| `dis` | 只读/禁用 | `dis` |
| `tx` | 文案 | `tx:很好` |

<Playground dsl='[rate l:商品评分 v:4 max:5][rate l:服务评分 v:0 max:5 clk:onRate][rate l:只读评分 v:5 dis]' />

## 数字输入 `numinput`

自闭合。带加减按钮的数字输入，`min`/`max`/`step` 约束范围。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:数量` |
| `v` | 当前值 | `v:1` |
| `min` | 最小值 | `min:1` |
| `max` | 最大值 | `max:99` |
| `step` | 步进 | `step:1` |
| `dis` | 禁用 | `dis` |
| `n` | 字段名 | `n:qty` |
| `id` | 元素 ID | `id:qty` |

<Playground dsl='[numinput l:购买数量 v:1 min:1 max:99 step:1][numinput l:时长（小时） v:8 min:0 max:24 step:0.5][numinput l:禁用 v:5 dis]' />

## 按钮组 `btngroup`

容器，包裹一组 `btn`。表单场景里常用于多按钮操作区（主要按钮用法见[基础组件](/components/basic)）。

| 属性 | 含义 | 示例 |
|------|------|------|
| `id` | 组 ID | `id:actions` |
| `v` | 变体 | `v:vertical` |

**变体**：`vertical`（垂直排列）、`pill`（圆角组）。

<Playground dsl='[btngroup][btn tx:保存 v:primary sub:onSave][btn tx:取消 v:ghost][/btngroup][btngroup v:vertical][btn tx:上传 v:primary][btn tx:下载][btn tx:删除 v:danger][/btngroup]' />

## 选择器 `picker`

容器，比 `select` 更丰富的选择面板（含搜索/多列）。`multi` 多选、`dis` 禁用。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:城市` |
| `ph` | 占位提示 | `ph:"请选择"` |
| `multi` | 多选 | `multi` |
| `dis` | 禁用 | `dis` |
| `n` | 字段名 | `n:city` |
| `v` | 值 | `v:bj` |
| `id` | 元素 ID | `id:city` |

**变体**：`error` / `success`。

<Playground dsl='[picker l:所在城市 ph:"请选择城市"][/picker][picker l:标签（多选） multi ph:"请选择标签"][/picker][picker l:禁用态 ph:不可选择 dis][/picker]' />

## 级联选择 `cascader`

容器，逐级展开的多级选择（如省市区）。`clk` 选择回调。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:地区` |
| `ph` | 占位提示 | `ph:"请选择"` |
| `dis` | 禁用 | `dis` |
| `clk` | 选择回调 | `clk:onPick` |
| `v` | 值 | `v:"北京-朝阳"` |
| `n` | 字段名 | `n:region` |
| `id` | 元素 ID | `id:region` |

**变体**：`error` / `success`。

<Playground dsl='[cascader l:所在地区 ph:"请选择省/市/区"][/cascader][cascader l:商品分类 clk:onCategory][/cascader]' />

## 文件上传 `upload`

自闭合。`accept` 限制类型、`multi` 多选、`max` 最大数量。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:附件` |
| `ph` | 占位提示 | `ph:"点击或拖拽上传"` |
| `accept` | 允许类型 | `accept:"image/*"` |
| `multi` | 多文件 | `multi` |
| `max` | 最大数量 | `max:5` |
| `dis` | 禁用 | `dis` |
| `clk` | 上传回调 | `clk:onUpload` |
| `n` | 字段名 | `n:file` |
| `id` | 元素 ID | `id:file` |

**变体**：`sm` / `lg`。

<Playground dsl='[upload l:头像 accept:"image/*" ph:"点击上传头像"][upload l:多文件上传 multi max:5 ph:"支持最多 5 个文件"][upload l:禁用上传 dis]' />

## 日期选择 `datepicker`

自闭合。`fmt` 日期格式、`v` 默认值、`clk` 选择回调。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:出生日期` |
| `ph` | 占位提示 | `ph:"请选择日期"` |
| `fmt` | 日期格式 | `fmt:yyyy-MM-dd` |
| `v` | 默认值 | `v:2026-06-20` |
| `clk` | 选择回调 | `clk:onDate` |
| `dis` | 禁用 | `dis` |
| `n` | 字段名 | `n:birthday` |
| `id` | 元素 ID | `id:birthday` |

<Playground dsl='[datepicker l:出生日期 ph:"请选择日期" fmt:yyyy-MM-dd][datepicker l:默认值示例 v:2026-06-20][datepicker l:禁用态 ph:不可选择 dis]' />

## 时间选择 `timepicker`

自闭合。`fmt` 时间格式、`v` 默认值。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:开始时间` |
| `ph` | 占位提示 | `ph:"请选择时间"` |
| `fmt` | 时间格式 | `fmt:HH:mm` |
| `v` | 默认值 | `v:09:30` |
| `clk` | 选择回调 | `clk:onTime` |
| `dis` | 禁用 | `dis` |
| `n` | 字段名 | `n:time` |
| `id` | 元素 ID | `id:time` |

<Playground dsl='[timepicker l:开始时间 ph:"请选择时间" fmt:HH:mm][timepicker l:默认值 v:09:30][timepicker l:禁用态 ph:不可选择 dis]' />

## 日期时间 `datetimepicker`

自闭合。日期 + 时间合一选择，`fmt` 自定义格式。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:预约时间` |
| `ph` | 占位提示 | `ph:"请选择日期时间"` |
| `fmt` | 格式 | `fmt:"yyyy-MM-dd HH:mm"` |
| `v` | 默认值 | `v:"2026-06-20 09:30"` |
| `clk` | 选择回调 | `clk:onDateTime` |
| `dis` | 禁用 | `dis` |
| `n` | 字段名 | `n:dt` |
| `id` | 元素 ID | `id:dt` |

<Playground dsl='[datetimepicker l:预约时间 ph:"请选择日期时间" fmt:"yyyy-MM-dd HH:mm"][datetimepicker l:默认值 v:"2026-06-20 09:30"][datetimepicker l:禁用态 ph:不可选择 dis]' />

## 穿梭框 `transfer`

容器，左右两栏互斥的多选移动。`tt`/`tt2` 两侧标题、`clk` 移动回调。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:分配角色` |
| `tt` | 左侧标题 | `tt:未选` |
| `tt2` | 右侧标题 | `tt2:已选` |
| `clk` | 移动回调 | `clk:onTransfer` |
| `h` | 固定高度（内容滚动） | `h:240` / `h:40vh` |
| `mh` | 最大高度（覆盖默认 320px） | `mh:200` |
| `dis` | 禁用 | `dis` |
| `n` | 字段名 | `n:roles` |
| `id` | 元素 ID | `id:roles` |

**变体**：`sm`（max 260px）/ `lg`（max 400px）。默认最大高度 320px，列表超出时内部滚动（滚动条默认透明，hover 显灰色半透明）。

`opt` 子项填数据：带 `chk` 的初始在右侧（已分配），其余在左侧（待分配）。勾选后点 `→` / `←` 穿梭。

<Playground dsl='[transfer l:角色分配 tt:待分配 tt2:已分配 clk:onTransfer][opt v:admin tx:系统管理员][opt v:editor tx:内容编辑 chk][opt v:viewer tx:只读访客][opt v:auditor tx:审计员 chk][opt v:dev tx:开发者][/transfer]' />

`h` 固定高度、`mh` 最大高度示例：

<Playground dsl='[transfer l:固定高度 h:160 tt:待 tt2:已][opt v:1 tx:选项一][opt v:2 tx:选项二 chk][opt v:3 tx:选项三][opt v:4 tx:选项四][opt v:5 tx:选项五 chk][opt v:6 tx:选项六][/transfer][transfer l:最大高度 mh:140 tt:候选 tt2:已选][opt v:a tx:短列表A][opt v:b tx:短列表B chk][/transfer]' />

## 标签输入 `input-tag`

回车添加标签、点击标签 `×` 移除。`tags` 初始标签、`max` 最大数量。带 `tags` 时可自闭合；无 `tags` 需 `[/input-tag]` 闭合。

| 属性 | 含义 | 示例 |
|------|------|------|
| `l` | 标签 | `l:标签` |
| `ph` | 占位提示 | `ph:"输入后回车添加"` |
| `n` | 字段名 | `n:tags` |
| `max` | 最大数量 | `max:8` |
| `tags` | 初始标签（逗号分隔） | `tags:"JS,Python"` |
| `dis` | 禁用 | `dis` |

<Playground dsl='[input-tag l:技术栈 ph:"输入后回车添加" max:8 tags:"JavaScript,Python,Go"][input-tag l:极简自闭合 tags:"React,Vue"][input-tag l:空容器 ph:"无初始标签，手动添加"][/input-tag][input-tag l:禁用态 tags:"只读模式" dis]' />

> 完整 DSL 语法（属性简写、变体白名单、流式渲染约束等）见 [DSL 语法](/guide/dsl-syntax)。
