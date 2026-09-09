# Changelog

All notable changes to this project will be documented in this file.

## [0.2.5] - 2026-09-09

ChatBI 数据大屏体系打磨（fit-screen 适配 / 翻牌器 / 轮播榜 / 监控大屏布局）+ 中国地图组件 T0~T6 精修 + cls/style 样式定制通道 + grid areas 流式骨架占位。

修复：Tech 主题下明暗切换按钮可点但无效——置灰禁用消除死角（demo 层）。

### 修复

- **demo 明暗 toggle 在 tech 族失效死角**：`computeTokuiTheme` 对 tech 短路（深色专属主题，不参与明暗乘法），但按钮照常可点、图标照变、无任何视觉反馈。现 tech 激活时置 `disabled` + `aria-disabled` + 中英 tooltip「Tech 为深色专属主题，不支持明暗切换 / Tech is a dark-only theme」，置灰样式（opacity 0.35 + not-allowed + 禁 hover 反馈）；`applyLang` 补调 `syncTokuiThemeUI`，切语言时 tooltip 跟随。浏览器实测：default↔tech 恢复/禁用切换正常、EN 文案正确。

修复：轮播榜滚动出现空白段再回补——根治为首尾相接真无缝循环（用户反馈：滚动会出现空白内容一段时间再变幻补充）。

### 根因（三层叠加）

1. **副本条件错**：旧逻辑仅当「内容矮于视口」才复制一份——内容高于视口时根本没有第二份，滚过尾部即空白，直到 offset 回绕跳回顶部（正是「空白一段时间再补充」）。
2. **挂载前测量恒为 0**：`startCycle` 在渲染器内执行时元素尚未入 DOM，浏览器 `scrollHeight` 恒 0，首集高度永远走 `行数×36` 兜底猜测——真实行高（padding/字号/dashed 边框）对不上，回绕时机错位跳变。
3. **克隆后 `scrollHeight/2` 少算半个 gap**：每圈固定多滚半个行距，累积可见错位。

### 修复（无缝三原则）

- 动画路径**恒定**复制一份首集（marquee 标准手法），内容高矮皆无缝；
- 首集高度改在**挂载后首个 rAF 帧**测量：双份总高 = 2×S + 1 gap → S = (total − gap)/2，回绕周期 = S + gap 精确对齐（副本与首集像素级重合）；
- 静态路径（无 rAF / reduced-motion / speed:0）**不再复制**——旧逻辑静态也克隆，无动画时视觉重复行。

### 实测

- 12 秒 48 次采样（demo-map-bigscreen 榜单）：**0 次空白**、视口均显 14.7 行、回绕恰 1 次且跳变量 455px = 精确一个周期（回绕瞬间副本占据首集原位，视觉零变化）；dashboard 18/0（新增静态零克隆用例）、全量 51 文件绿、e2e 2/2、demo:validate 197/197。


精修：中国地图组件全面升级（T0~T6，依据 docs/plans/2026-09-09-china-map-enhancement-dev-plan.md）——hover tooltip 失效根治 + 版图完整性 + 标注数值化 + 交互 + 图例 + Demo 1→4。

### 修复（P0/P1）

- **hover tooltip 失效根治（T0）**：根因双处——`renderMap` 漏调 `bindTooltips(svg)`（全库 19 个图表渲染器唯一漏绑），且委托 `findGroup` 只认 `tokui-chart-tip-group` 包装类而地图省份/散点是裸 `data-tip-id` 注册。修复：补绑 + 委托命中条件扩为「类祖先或自带 data-tip-id」，既有图表零行为变化（红-绿纪律，失败测试同 commit）。
- **vendor 版图完整性（T2）**：第 34 条空名数据实为九段线（坐标超画布被裁剪不可见），且澳门特别行政区真缺失。修复：补澳门多边形（region 双写法可匹配上色）、九段线独立 dash path（主图描 18°N 以北段）、右下南海诸岛 inset 小图（迷你海南 + 全量十段线 + 西沙/中沙黄岩/南沙/曾母暗沙四群岛点 + 标签 + hover tooltip），net +570B。
- **builder `hasInline` 漏 `region`（T6 顺带）**：仅 region 的 map chart 误入容器分支，`.end()` 错位闭合致栅格结构串味（demo 校验器拦截）。builder 与 renderer 两侧判定同步补 `region`。

### 新增（T1/T3/T4/T5）

- `label:full|name|off` 标注三档（T1）：默认 full——含数据省「名+值」两行（值主题色加重）、无数据省灰名，文字盒碰撞自动避让（密集区不叠字）；name=原行为；off=纯色块。
- hover emphasis（T3）：hover 省描边提亮 1.6 + `:has()` 压暗其余（渐进增强）；点击含数据省份上报 `mapClick {province,value}`（`on:"mapClick:handler"` / `options.onEvent` 双通道）。
- tooltip 多行 + `unit`（T5）：省名 / 值+单位+区域占比 双行；散点城市/值+单位；无数据省单行。
- visualMap 色阶条 + 散点半径图例（T4）：左下 MAP_STOPS 渐变条（vmin/vmax 刻度带 unit，vmin/vmax 锁定跟随）；仅散点模式自动换半径图例（1→max 示意圆）。

### Demo（T6）

- 案例 1→4：`demo-map` 升级（unit/点击上报系统消息/label 对照）、`demo-map-heat`（34 省全量+色阶条特写）、`demo-map-scatter`（17 城散点+半径图例+双图层叠加）、`demo-map-bigscreen`（tech fit-screen 地图大屏单页）；NAV「数据大屏」组 4→7 项。

### 验证

- 单测 chart 127/0（新增 10 组用例：委托红绿/数据完整性/label 三档/tooltip 多行/点击载荷/色阶条/半径图例）、全量 51 文件绿、typecheck 过、demo:validate 197/197 ALL_DEMOS_STRUCTURE_OK、e2e 2/2、lint-smoke 89/89；浏览器实测：省份/散点/南海诸岛三态 hover tooltip、emphasis 描边压暗、点击→系统消息 `{province:"山东省",value:60}`、34 省全上色、大屏无溢出。五面文档已同步（DSL REFERENCE / llms.txt / VitePress 中英 / Chat prompt / agent component-data）。


优化：Demo 左侧导航分组梳理——「基础组件」39 项杂烩拆分归类（用户反馈：新增 Demo 全塞基础组件，大屏/地图/缩放不属于基础）。

### 变更

- **新增「数据大屏」组**（置于 SVG 图表后）：大屏四件套、fit-screen 缩放、中国地图、ChatBI 监控大屏。
- **新增「设计与全局」组**（导航首位）：Design Tokens、图标体系、cls/style 样式定制、样式安全过滤、多语言 i18n——框架级能力不再混入组件。
- **新增「文本与内容」组**：段落与链接、行内格式、Kbd、代码块、Markdown、语法高亮。
- **归位既有组**：input/select/radio/checkbox/textarea/Picker → 表单控件（组头）；img/imgs/图片预览组 → 媒体组件；响应式断点 → 布局系统（组头）。
- **基础组件 39 → 14 项**：标题/按钮（含尺寸白名单）/图标按钮/对齐/分割线/标签/进度步骤/提示框/复制/加载/分页/下拉/倒计时——纯基础原语。

### 验证

- 17 组 188 项总量与触发器集合不变（跨组双列 demo-typing-to-bubble/demo-interaction 为重组前既有）；`node --check` 语法过；demo:validate 197/197 结构 OK；浏览器全展开走查：三新组图标/排版正常、搜索按分组名自动适配。

新增：grid areas 流式骨架占位——大屏推送渲染时每个区块先以骨架屏占位（用户需求）。

### 实现

- **铺骨架（layout）**：grid 渲染器检测「流式首挂（`rc._streamMounting`）+ 有 `areas` 模板 + 无一次性子节点」→ 按 areas 去重铺 `tokui-cell--skel` 占位格（内含 `tokui-stream-skeleton--block`，role=status 复用既有流式骨架视觉），记 `_areaSkel` 映射 + `_streamCloseHook` 流结束清残留。一次性渲染（children 非空）零行为变化；`skel:"false"` 可显式关闭。
- **标记透传（renderer）**：`rc` 是每次渲染的闭包而非 renderer 实例，`render()` 中将 `self._streamMounting` 透传为 `rc._streamMounting`；`_streamOpen()` 用该标记包裹首挂渲染。
- **原位替换（renderer）**：流式打开 cell 时，若父 grid 已铺骨架——具名 area 的 cell 原位替换对应骨架格（区块落位零回流跳动）；未匹配/匿名 cell 到达则撤掉全部剩余骨架防悬挂；`_streamCloseHook` 兜底清理。
- **CSS**：`.tokui-cell--skel` flex 满占格位 + block 骨架 min-height 96px。

### 实测

- 浏览器流式推送：流中 5 块骨架已在最终栅格位置占位（无布局跳动）、终态 0 骨架残留、11 真实 cell（4 KPI + 4 图表 + 滚动板）无控制台错误；layout 85/0、全量 1577/0、demo:validate 197/197、e2e 2/2、lint-smoke 89/89。五面文档已同步（DSL REFERENCE / VitePress zh+en / Chat prompt / agent component-data）。

根治：大屏底行被 1080 画布裁剪——grid fr 轨道防撑破 + 画布满高挂载（用户连续反馈：告警/产量趋势最下方显示不全）。

### 根因（两层叠加，非图表最小高度限制）

1. **外层 grid 未挂画布高**：`height:auto` 下 `1fr` 轨道没有确定分配空间，按内容解析（实测行3 涨到 511+ 设计px，规格应为 468）——底行整体被顶出 1080 画布，被 fit-screen `overflow:hidden` 裁掉。历史上内容总高恰 <1080 时 grid 矮于画布无碍，几轮「图表加大」迭代后超限才暴露。
2. **裸 `1fr` = minmax(auto,1fr)**：即使容器定高，内容最小高仍可撑破分配额。

### 修复

- **库端**：`_gridTrack` 的 fr 轨道统一输出 `minmax(0, Nfr)`（Tailwind 网格同款防撑破手段）——轨道恒等于分配额，内容自适应自负其责；px/auto/minmax 轨道不变。
- **demo**：外层 grid 补 `h:100%` 挂到 1080 画布（fr 有了确定分配空间）；右尺寸两处内容——良品率柱图 h:370→300、地图 max-width 780→768。
- **实测（四视口 1920/1600/1440/1280）**：grid 底边 = 画布底边（偏差 0）、行轨道稳定 132|150|444|288、全 cell/面板/图表完整包含（map -1.4 / bar -43.7 / line -3.5 / area -10.8 全为负余量）、告警 7/7 + 趋势 30/30 轴标签全显、页面零滚动；全量 1575/0、demo:validate 197/197、e2e 2/2。**验收方法论升级：包含链逐层断言（svg⊆panel⊆cell⊆grid⊆canvas）× 多视口，不再只看页面级指标。**

修复：大屏底部趋势图被面板裁剪（用户反馈：下方图表裁剪遮住不显示）——chart 新增「显式 w+h 跳过比例带」。

### 修复

- **根因链**：上一轮为全显 30 标签把趋势图画布加宽到 820，等比渲染高 241px 超出 288px 行高对应的面板体（189px）98px 被裁；改 1540 更宽时又被「宽高比带」（w/h ≤ 4，防意外过扁）自动抬到 385 高，仍裁。**验收盲区**：此前只验了标签数量与页面零滚动，未断言 svg-面板边界——已补边界断言。
- **修复（库端）**：新增 `chartH` 统一入口——**w 与 h 同时显式给出时视为作者定向设计**（大屏宽幅底条趋势图 1540×200、宽高比 7.7 正是所需），跳过比例带仅受 hCap 上限；h 缺省或自动尺寸仍走 bandHeight 兜底防意外超宽 letterbox。6 处调用点统一替换。
- **实测**：viewBox 1540×200、渲染高 133px 完整入面板（底部余量 10.8px）、30/30 标签、四图 overflow 全负（完整入面板）、页面零滚动；chart 117/0、全量 1575/0、demo:validate 197/197、e2e 2/2。

修复：大屏底部趋势图 x 轴标签显示不全（用户反馈：ChatBI 案例下方图表轴数据展示不全）。

### 修复

- **诊断**：非高度问题、无裁剪——30 点序列标签 `1日…30日` 横排放不下，`axisXLayout` 自动抽稀为隔一显示（16/30）；且横排槽位下限 `X_LABEL_MIN_SLOT=38`（viewBox 单位）远大于纯数字短标签实际宽度（"30"≈20），数字密集序列恒被判「放不下」。
- **修复（两层）**：① 库端横排槽位下限 38→24（纯数字短标签序列可横排全显；CJK/长标签不受影响——其槽位由文字宽度主导恒大于下限），旋转判定口径解耦为 `X_LABEL_ROT_FLOOR=38×0.72` 保持保守（高密度仍走抽稀而非全部旋转，行为与既有测试一致）；② demo 趋势图标签改纯数字 `1~30`（面板标题补「单位: 日」语境）+ 画布 w:820。
- **实测**：趋势图 30/30 标签横排全显（最小间距 26.3 单位、无旋转无重叠）、告警图 7/7；chart 单测 116/0、全量 1574/0、demo:validate 197/197、e2e 通过。

修复：图表放大查看弹层主题丢失（用户反馈：Tech 下原图正确、弹层 theme 丢了）。

### 修复

- **根因**：`openChartModal` 把弹层挂到 `document.body`——脱离原图的 `[data-tokui-theme]` 子树，图表文字/网格/系列色板等令牌在 body 上下文解析回 default 主题（弹层白底 + 浅色图表配色）。
- **修复**：打开时取原图最近的 `[data-tokui-theme]` 祖先，把主题属性复制到弹层 overlay——令牌级联与原图完全一致（卡片底色/边框/图表文字/色板全跟随）。
- **实测**：Tech 族下点 fullscreen——弹层 `data-tokui-theme="tech"`、卡片底 rgb(10,18,32)、图表文字 72% 白、系列色 c1=#22d3ee 青色，视觉与原图一致；全量 1574/0、demo:validate 197/197、e2e 2/2。

修复：Demo 站 Tech 族页面外壳未联动暗色——裸文本浅字落浅底不可见（用户反馈：`[p 纯 SVG 零依赖图表组件…]` 在 tech 下出不来）。

### 修复

- **根因**：`computeTokuiTheme()` 在 styleFamily=tech 时返回 tech（深色令牌族），但 `syncTokuiThemeUI()` 的 `body.dark` 只跟明暗开关走——浅色状态下选 Tech，页面外壳保持浅底，而 TokUI 容器文本令牌已是浅色：卡片/面板自绘深底正常，**裸 p（无自绘背景的组件）浅字落浅底不可见**。
- **修复**：tech 族强制页面暗色（`body.dark = darkMode || styleFamily === 'tech'`，昼夜图标同步）。实测 Tech 族下页面深蓝底 rgb(15,23,42)、开篇 p 85% 白可读。

修复：仪表盘中心文字发糊发胖（4px 描边）+ tech/modern-dark 图表深色适配缺失（用户反馈：gauge 文字看不清、图表外文字不适配）。

### 修复

- **gauge 中心文字描边过粗**（用户猜中「文字外边框」）：`.tokui-chart-gauge-label` 描边 3px / value 4px——本意遮穿字指针线，实际把小字号字形撑胖发糊（浅色主题白色 halo 尤甚）。减细至 label 1.5px / value 2px（遮挡功能保留，hub 圆盖指针原点）。
- **深色主题图表覆盖缺失**：`[data-tokui-theme="dark"]` 的图表适配块（label-stroke 透明 / chart-text 72% / grid / axis / slice-stroke）未覆盖 **modern-dark 与 tech**——`--tokui-card-bg` 所有主题均未定义，label-stroke 恒回落 `#fff`，深底浅字被 4px 白边侵蚀成「看不清的糊块」；tech 图表文字仅 45% 白偏淡。覆盖选择器扩展至三个深色主题统一（文字 72% 白、描边透明）。
- **实测**：四主题（default/dark/modern-dark/tech）label 描边 2px 白 / 透明 / 透明 / 透明，图表文字浅色 #999 / 深色统一 72% 白；浅色与 tech 截图中心值清晰；全量 1574/0、demo:validate 197/197、e2e 2/2。

修复：大屏缩放文字发虚变胖——fit-screen 改用 CSS zoom 栅格化（用户反馈：tech 主题图表文字模糊太粗）。

### 修复

- **根因**：fit-screen 用 `transform: scale()` 缩放 1920×1080 设计稿（实测 scale≈0.66），SVG 文字按 16px 布局栅格化后经合成层 GPU 降采样——笔画发虚且视觉变「胖」（与 tech 主题无因果，大屏 demo 均在 tech + fit-screen 内，浅色主题图表不在缩放画布故显得仅 tech 出问题）。
- **修复**：`scale`/`width` 模式优先 **CSS `zoom`**——内容按最终尺寸重新布局栅格化，文字物理清晰（Chrome/Safari 久支持、Firefox 126+；不支持时回落 transform，视觉等价）；`full` 双轴非等比 zoom 无法表达，恒用 transform。width 模式 wrap 高度数学同步适配（zoom 下 scrollHeight 即视觉像素）。
- **实测**：zoom=0.657 生效、地图标签「河北」笔画清晰（对照 transform 版发虚）、inner 1262×710 几何正确、图表无双重缩放、大屏零滚动保持、fit-screen 三模式（scale zoom 居中/width zoom+maxh 滚/full transform）全对、无页面报错；全量 1574/0、demo:validate 197/197、e2e 2/2。

精修：fit-screen 滚动条主题化——细轨圆角、默认隐藏 hover 显现（用户反馈）。

### 变更

- **`.tokui-fitscreen` 滚动条精修**：`scrollbar-width: thin` + 双通道着色（标准 `scrollbar-color` 过渡 + `::-webkit-scrollbar*` 兜底）；拇指色 `color-mix(in srgb, var(--tokui-text) 32%, transparent)` 由主题文字令牌派生——五主题（含 tech）自动适配，拇指悬停加深 48%；默认全透明，悬停滚动区显现，0.2s 平滑过渡。
- **demo-fit-screen width 面板 `theme:tech` 上移到 fit-screen 本身**：滚动条在 wrap 上，theme 挂 inner grid 时 wrap 处于浅色作用域导致拇指解析成黑色（深底不可见）——上移后实测 hover 色 `rgba(255,255,255,.27)`。

调优：ChatBI 大屏底条图表加大至可读（用户反馈：底部两图高度不足显示不全）。

### 变更

- **行高重配** `132|188|1fr|196` → `132|150|1fr|288`：底条 196→288px，告警/趋势图可视高度近乎翻倍。
- **产量趋势改 30 点长序列**：viewBox 宽随点数增长（7 点 360 宽 → 30 点 ~1540 宽），天然「宽而矮」铺满 1400px 宽幅底条（此前 7 点纵横比把图撑高溢出被裁）；轴标签自动抽稀。
- **地图实例级限宽** `style:max-width:780px;margin:0 auto`：行高变化后 svg 高度精确贴满面板体（564px）并保持居中。
- **联动调整**：良品率柱图 h:430→370、工单榜 h:600→548、翻牌行 188→150。
- **实测**：零滚动（scrollX/Y=0）、7 面板零溢出、四图表全部贴合面板体、地图居中偏移 0px、demo:validate 197/197。


修复：fit-screen demo 画布空置 + width 模式补齐「贴合内容高 / maxh 纵滚」。

### 修复

- **demo-fit-screen 三面板视觉空壳**（用户截图）：640×360 设计画布内只装 ~171px 自然高内容（`.tokui-fitscreen__inner` 不撑子元素），缩放后呈「小条 + 大片空白」。**重写为满幅排版示范**：scale 面板 grid `h:100%` + `rows:"1fr 1fr auto"` + `areas` 四 KPI 填满画布；full 面板 `rows:"1fr auto"` 大号翻牌铺满；width 面板 6 KPI 撑高画布演示纵滚。实测：scale grid 视觉 213px 满画布、width wrap 钳 240px 可滚、full 360px 铺满，三面板三列并排无报错。
- **width 模式未兑现文档承诺**：原实现只做宽度缩放——不贴合视觉内容高（挂载区下方留 159px 空洞），也无纵滚通道。现：inner `height:auto` + 画布高作 minHeight（内容可撑高），wrap 贴合视觉高 + `overflow-y:auto` 顶对齐，新增 **`maxh` 属性**（40-8640px 视口高上限，超出滚动）；RO 增观察 inner（流式子内容后到也重算）；暴露 `_fitApply` 供强刷/单测。

### 新增

- **测试** +2（贴合视觉高/内容撑高跟随/maxh 钳制/顶对齐）；全量 1574/0、demo:validate 197/197、e2e 2/2。
- **文档五面同步** `maxh` 与满幅排版建议：DSL REFERENCE / VitePress dashboard.md（zh+en）/ TokUI-Chat 提示词 / tokui-skill component-data（lint-smoke 89/89）。

重排：ChatBI 大屏「中央大地图·内容环绕」经典布局（用户需求：地图居中放大、无滚动条、无遮挡）。

### 变更

- **布局重构**（demo-bigscreen，1920×1080 精确配格 `400px 1fr 400px` × `132px 188px 1fr 196px`）：顶部 KPI 带（4 指标横排）→ 左列（产值翻牌 + 良品率柱图）/ **中央中国地图跨两行居中放大** / 右列工单滚动榜 → 底部（告警折线 + 宽幅产量趋势面积图）。
- **地图专属高度上限**：`.tokui-chart__svg--map { max-height: 640px }`（全局 600 兜底不动），viewBox meet 居中不裁切——中央主视觉位可放大至 ~1046×640。
- **实测**：页面零滚动（scrollX/Y=0）；7 cell 结构归位（demo:validate 197/197）；地图水平居中偏移 0px；四图表均在面板体内（余量 12~22px）；翻牌卷轴/轮播轨道的越界均属 overflow:hidden 设计内裁切，无可见遮挡。


优化：ChatBI 监控大屏（demo-bigscreen）版面填充——消除大片空白（用户反馈）。

### 变更

- **三张趋势图表撑满行高**：产量趋势/良品率对比/告警趋势补 `h:360`（默认 ~200px 图在 ~436px 行内下方空 ~270px）。
- **地图列双联布局**：地图（w:600）下方新增「省份·稼动率·环比」区域排名轮播榜（`h:520`，speed:24，与热力数据同源），填充原 ~650px 竖向空白。
- **工单榜撑满整列**：`h:420→900`，数据 9→14 行（补 SMT一线/组装二线/包装班组/设备组/仓储一班）。
- **实测**：7 个 cell 底部空隙 200~580px → 全部 1px；结构校验 197/197 ALL OK；无页面报错。

修复：flip-num 翻牌器数字显示被「切半」/滚动动画从未播放（用户截图反馈，bigscreen 实时产值位）。

### 修复

- **CSS**：`.tokui-flip__reel` 误设 `height:100%`（= 窗口高 56px），10 个数字面被 flex 压缩至每个 ~5.6px、字形溢出被切成横条；移除该声明让卷轴按内容撑高（10×face），`.tokui-flip__face` 补 `flex-shrink:0` 防压缩。
- **JS**（`dashboard.js`）：初值态 `apply(0,true)` 写入的内联 `transition:none` 此后从未清除，`translateY` 直跳终位、0.6s 滚动从未播放；动画态改为清内联回落样式表过渡（立即/reduced-motion 仍直跳）。
- **实测**：修复前卷轴 31px（应 ~560px）、computed transition 0s；修复后 321px（fit-screen 缩放后 ≈10×56px）、过渡 0.6s 生效、`8,642,918` 各位完整对齐，`upd` 至 `1,234,567` 各位精确滚动到位。
- **测试** +1（初值态内联 none → set() 清内联 + transform 终位）；套件 837/837；dist/demo:sync/TokUI-Chat lib 同步。

修复：grid 轨道列表带首尾引号被静默拒绝 → 大屏 Demo 单列堆叠；库端增加引号容错。

### 修复

- **现象**：`demo-dashboard-kit`（用户截图）三区块独占全行、KPI 纵排 100% 宽、翻牌器观感异常；`demo-bigscreen` 300px/360px 轨道丢失（仅 areas 具名区域在隐式列下"看起来对"）、`demo-map`/`demo-chart-motion` 同病。
- **根因（后端 DSL 再背锅）**：demo 构建侧 `.grid({ cols: '"360px 1fr 1fr"' })` 把 DSL 层的引号写进了 builder API 值 → 序列化为 `cols:"\"360px 1fr 1fr\""` → 前端解析回带字面引号的值 → `_gridTrackList` 逐 token 白名单校验遇 `"360px` 直接整体拒绝 → `grid-template-columns` 不输出 → 单列堆叠。翻牌器 DOM 本身完好（3 个 flip 根节点、reel 结构齐全），观感问题均为单列挤压连带。
- **修复（两层）**：① 4 处 demo cols 去掉值内引号；② `layout.js` `_gridTrackList`/`_gridAreas` 校验前剥离首尾引号对（builder 双重引号、AI 手写直译的常见误用），中间引号仍整体拒绝。

### 新增

- **测试** +1：带首尾引号的 cols/rows/areas 容错放行、中间引号仍拒绝（test-layout.js）。
- **浏览器实测**：dashboard-kit 三列 `360px 427px 427px`、bigscreen 四轨道 `300px 597px 597px 360px`、map `890px 360px`，KPI 360px 窄轨 4 卡纵排（设计意图）、flip `354×56px` 正常；全量回归 1572/0、demo:validate 197/197、e2e 2/2。

修复：5 个 demo 案例的 Builder 嵌套错位（内容掉出容器），并新增全量结构校验器。

### 修复

- **根因**：TokUIBuilder 的 `callout/p/stat/menu-item/flip-num/chart(内联数据)` 是自闭合叶子（不需 `.end()`），`kpi/panel/cell/fit-screen/scrollboard/select/chart(无内联)/menu/card/row_layout` 是容器（需 `.end()`）；此前 demo 案例里两类误用并存（叶子后多写 `.end()`、容器漏写 `.end()`、表格行 `.row()` 误当布局行 `.row_layout()` 用），闭合链逐级错位 → 后端推送的 DSL 本身嵌套损坏（如 `[/card]` 提前出现），解析器忠实渲染坏结构。
- **受损修复**（共 6 案例 25 处）：`demo-design-tokens`（圆角/阴影卡各 5 组 callout 后多余 `.end()`——截图所见 lg/xl/pill 掉出卡片）、`demo-responsive`（3 组 callout 多余 `.end()` + menu 逐项 `.end()` + 2 处 `.row()` 误用）、`demo-fit-screen`（p 叶子多余 `.end()` + kpi 容器漏 `.end()`，第三面板 cell 嵌套）、`demo-i18n`（无内联 chart 漏 `.end()`，3 col 嵌套）、`demo-bigscreen`（4 个 kpi + 3 处 scrollboard 容器漏 `.end()`，3 cell 嵌套）、`demo-dashboard-kit`（首块 panel 4 个 kpi + 工单榜 scrollboard 漏 `.end()`，cell2/cell3/默认主题卡全嵌进「设备稼动率」KPI 卡——用户截图所见）。
- **浏览器实测**：design-tokens 圆角/阴影卡各 5 callout 归位；responsive 断点三列并排 + offset 换行正确；fit-screen 三面板同排且 grid 直挂 3 cell；i18n 空图表卡 4 col 正常；bigscreen 7 cell 零嵌套、7 panel/4 KPI/地图 104 path 完整；dashboard-kit grid 直挂 3 cell + 默认主题卡为 grid 兄弟节点，`.tokui-kpi .tokui-cell`/`.tokui-cell .tokui-cell` 归零。

### 新增

- **`npm run demo:validate`**（`demo/server/validate-demos.js`）：全量 demo DSL 结构校验器——起隔离服务实例（`TOKUI_DEMO_PORT`/`TOKUI_DEMO_RATE_LIMIT`/`TOKUI_DEMO_CHUNK_DELAY` 三个新 env 覆盖口，默认行为不变），经真实 SSE 链路拉取全部 demo 的 DSL，用 `TokUIParser` 建树校验结构不变量（col∈row、cell∈grid、menu-item∈menu、无空流/限流降级），197/197 通过；可拦截本类 Builder 嵌套错误复发。

示例配色三次精修：暗色模式适配（明暗双模式可读）。

### 变更

- **demo-cls-style 编辑卡宿主 CSS 明暗适配**（配合 `cls:demo-brand-card`，呼应该 demo 宣讲的宿主精修能力）：暗色下暖纸卡自动翻转暖炭微渐变 `#2a2721→#1f1d18` + 暖白文字 `#e8e4da`，CTA 反转为纸色按钮 `#efe9dc→#ddd4c2` + 墨字（编辑风正负反转）；灰绿标题暗色提亮 `#6b7a63→#a8b89a`。实测对比度：标题 8.96:1（浅）/ 11.73:1（暗），按钮文字 9.8:1+。
- **文档/提示词/skill 示例改主题令牌自适应渐变**：`linear-gradient(135deg,#faf8f4,#efe9df)` → `linear-gradient(135deg,var(--tokui-primary-1),var(--tokui-bg))`——浅色淡蓝→白、暗色深蓝黑→炭黑，全主题（default/dark/modern/modern-dark）自动适配，杜绝固定浅底在暗色下不可读的反面教学；lint-smoke 夹具同步（89/89 通过）。
- **demo 说明文案**补宿主 CSS 深色适配提示（本卡暗色自动翻转）。

示例配色二次精修：淡雅编辑风（低饱和暖纸 + 墨色，去高饱和渐变）。

### 变更

- **demo-cls-style 品牌卡**：高饱和青蓝渐变 → 暖纸色微渐变 `#faf8f4→#efe9df` + 发丝边框 `#e7e0d3` + 墨色文字 `#4a453d`（编辑杂志风，参照 ui-ux-pro-max Editorial 系色板）。
- **渐变按钮**：琥珀金渐变 → 墨色纵向微渐变 `#3f3c36→#2e2b26` + 米白文字 `#f5f2ec`（对比度 ~10:1）。
- **示例标题强调色**：深青 → 灰绿 sage `#6b7a63`；自定义阴影改暖中性 `rgba(120,113,94,.2)`；diff CSS 示例头改墨色单色系渐变。
- **Demo 站渐变文字收淡**：紫/青第二色端改同族石板灰（`#0d9488→#64748b`、暗色 `#2dd4bf→#94a3b8`），tonal 渐变去跳色。
- **同源示例文案全量同步**：TOKUI_DSL_REFERENCE / llms.txt / VitePress zh+en / 计划文档 / TokUI-Chat 提示词 / tokui-skill component-data + SKILL.md + lint-smoke 夹具。

示例配色精修：去除「AI 味」蓝靛紫渐变示例色系。

### 变更

- **demo-cls-style 渐变示例换专业色系**：品牌卡渐变 `#667eea→#764ba2`（蓝靛紫）→ `#0f766e→#0369a1`（深青→湛蓝，Trust teal + professional blue）；渐变按钮 `#f093fb→#f5576c`（粉紫）→ `#d97706→#f59e0b`（琥珀金 CTA，深字 `#451a03` 保对比度）；示例标题紫色 `#7c3aed` → 深青 `#0f766e`，紫色调阴影 → 青色调。
- **同源示例文案全量同步**：diff CSS 示例、卡片自定义色样张（`#8b5cf6` 紫 → `#0d9488` 青）、`TOKUI_DSL_REFERENCE.md` §2.1、`llms.txt`、VitePress `dsl-syntax.md`（zh/en）、开发计划文档中的渐变示例统一替换。
- **Demo 站渐变文字去紫**：`.token-flow-accent` / `.app-welcome-credit-link` / `.app-qr-footer-link` 渐变文字紫色端 `#a78bfa` → 深青 `#0d9488`（暗色端 `#c084fc` → `#2dd4bf`）。DSL 语法高亮 tag 紫（`#7c3aed/#c084fc`）属代码编辑器配色，保留。

数据大屏 M1 · 任务五：图表入场动画 + 渐变填充（M1 收官，金标杆大屏交付）。

### 新增

- **图表入场动画**：首渲染整图 fade + 上浮 + 微缩放（0.5s cubic-bezier，类挂外层 wrapper 不污染 SVG 序列化；`enter:"false"` DSL 级关闭；`prefers-reduced-motion` 关闭；同 wrapper 重渲不重播）。
- **`grad` 渐变填充**（布尔属性入 parser BOOLEAN_ATTRS）：defs 注入每系列 linearGradient（系列色 0.9 → 0.06 垂直渐变）+ 系列填充替换为 `url()` 引用，适用于 bar/area/donut/pie 等填充型图表；gradient id 全局自增防冲突。
- **金标杆 demo `demo-bigscreen`**：fit-screen 1920×1080 × tech 主题 × grid areas 四区 × KPI/翻牌/轮播榜/地图/渐变图表全家桶——M1 五任务能力的总集成验收案例。
- **测试** +2（enter 首渲染/不重播/关闭、grad defs+url 替换）；真浏览器验证 animationName=tokui-chart-enter 与 defs/url 生效。

数据大屏 M1 · 任务四：中国地图图表（choropleth + 散点）。

### 新增

- **`chart t:map`**：34 省级行政区简化轮廓（源：阿里云 DataV GeoAtlas 公开数据，等距圆柱投影 + 中纬度 35°N 纵横比较正 + Douglas-Peucker 简化，vendor 数据 32KB 按需加载不进主路径）。`region:"浙江:86|江苏:74"` 省级热力——省名归一化支持简称（浙江/浙江省、内蒙古/内蒙古自治区双写法），值经多 stop 色阶插值（蓝→青→绿→黄→红）复用 lerpColor，`vmin/vmax` 锁定色阶域；`d:"lng,lat,val,name:城市"` 散点层——经纬度等距投影、值对数映射半径（3~16）、越界点钳制画布内、name 进 tooltip 与标注；省名/城市名标注自动（≤3 字防重叠）；空省走主题网格色、数据省 hover 提亮、散点光晕脉冲（reduced-motion 关闭）。
- **测试** +4（34 省完整性/简称匹配/色阶插值/投影钳制/空态）；真浏览器 tech 主题实测 34 省 + 8 省填色 + 4 城市散点 + 12 标注。
- **Demo** `demo-map`（tech 主题热力地图 + 区域排名轮播榜联动）。

数据大屏 M1 · 任务三：fit-screen 大屏缩放容器。

### 新增

- **`fit-screen`**：1920×1080 设计稿等比适配容器。`mode:scale`（等比缩放居中留空，默认）/`width`（等宽缩放可纵滚）/`full`（双轴拉伸铺满）；`w/h` 设计稿尺寸可调（320~7680/240~4320 钳制）；ResizeObserver 随挂载区尺寸重算（`_registerCleanup` 解绑），无 RO 环境回退 window resize；builder `fitScreen()` + `.d.ts`。
- **测试** +2（结构/白名单/钳制）；真浏览器验证 scale/width/full 三模式与 2560×1440（×1.33）/1366×768（×0.71）/960×540（×0.5）多视口精确缩放；full 模式 wrap 高度 100% 修正（不被设计稿内容撑开）。
- 注：浮层（tooltip/popover）在 scale 容器内定位无需修正——`getBoundingClientRect` 返回 transform 后的视觉坐标。

数据大屏 M1 · 任务二：大屏组件四件套（panel / kpi / flip-num / scrollboard）。

### 新增

- **`panel` 科技边框容器**：`tt` 装饰线标题栏 + `v:corner`（四角角标）/`v:glow`（发光，tech 令牌联动）/`v:plain` 三变体 + `theme:` 子树主题；四主题下用主题表面色令牌。
- **`kpi` 指标卡**：`tt/v/pre/suf/unit/trend/dec/icon/clk/t` 全属性面；数值 easeOutExpo 滚动动画（reduced-motion 降级）；trend 自动 ↑↓ 徽章与升降着色（负号转 ↓）；`t:danger/success/warning` 状态色；`[upd id:] v:/trend:/tt:` 更新走动画。
- **`flip-num` 数字翻牌器**：逐位 3D 翻牌（reel 十面 translateY + cubic-bezier 过渡），数字串可含逗号/小数点/百分号；`dur` 时长、`s:sm/lg` 尺寸档；`[upd v:]` 各位滚动到位；reduced-motion 直显。
- **`scrollboard` 轮播榜单**：`rows:"a,1,↑2|b,2,↓3"` 简写 + `[tr]` 子节点双数据面；表头 `cols`；rAF 匀速上滚 + hover 暂停 + 无缝循环（内容不足视口自动克隆）；↑↓ 趋势列自动着色；`speed:0` 静止；`h/gap` 控制；rAF 经 `_registerCleanup` 登记；空态走 i18n（`scrollboard.empty`）。
- **接线**：parser CONTAINERS +3（cols 自闭合豁免纳入 scrollboard）、VARIANTS +panel、components/index.js + lib.js 注册 dashboard 模块、builder 四方法 + `.d.ts`、CSS 段（tech 令牌 + 四主题表面色双轨）。
- **测试** `tests/test-dashboard-components.js` 12 例；真浏览器验证翻牌 translateY 滚动/轮播 translateY 运行/kpi 动画到位/tech 子树生效。
- **Demo** `demo-dashboard-kit`（tech 子树实景 + 默认主题对照）；DSL_REFERENCE/llms.txt 文档。

数据大屏 M1 · 任务一：tech 科技风主题（内置主题 4 → 5 套）。

### 新增

- **`tech` 主题（ChatBI 数据大屏）**：深蓝底 `#0a1220` + 荧光青 accent（`#43c8d8`/`#22d3ee` 系，经内置 HSB 色阶算法生成 10 级 × 4 族色板）+ 科技风图表系列色板（青/蓝/紫/橙高饱和 10 色）+ tech 专属令牌（`--tokui-glow-primary/-accent` 发光、`--tokui-tech-grid` 网格纹理、`--tokui-tech-panel-bg/-border` 面板底/边）。基于 dark 模板完整重定义全部语义变量（规避令牌继承坑）。
- **图表色板作用域修复**：`getColors` 支持 `closest('[data-tokui-theme]')` 上下文解析（按主题名分桶缓存）——多主题并存时挂载后的重绘取最近主题作用域；首次渲染（未挂载）回退页面锚点（整页单主题场景完全正确，子树混排主题图表建议显式 `c:`）。
- demo 主题切换器新增 Tech 选项（tech 族不参与明暗乘法）；`theme:` 子树属性白名单纳入 tech。
- **测试** +2：tech 关键色值/发光令牌/组件覆盖完整性、`_THEME_NAMES` 白名单；theme-tokens 全部扫描纳入 tech（31 过）。

产品级表达基建 M0 · 任务五：图表主题色变量化 + 三硬伤修复。

### 新增

- **图表系列色板主题化**：四主题新增 `--tokui-chart-c1..c10`（default 沿用原 10 色；dark/modern-dark 提亮降饱和；modern 对齐克制蓝色系）。chart.js `getColors()` 惰性读取页面主题锚点（`[data-tokui-theme]` 或 `:root`）的色板变量并缓存；`theme.setTheme()` / `setSeedColor()` 自动调 `invalidateChartColors()` 失效缓存——**主题切换图表系列色即联动**。无 DOM / 变量缺失回退原 DEFAULT_COLORS。`invalidateChartColors` 经 `_internal` 与 module.exports 导出。

### 修复（红-绿：均先确认缺陷后修复）

- **图表导出白底**：PNG 导出底色改读 `--tokui-bg`（原硬编码 `#fff`，暗色主题导出浅色文字铺白底不可读）。
- **theme.js 暗色判断漏 modern-dark**：`setSeedColor` 在 modern-dark 主题下现按暗色生成色板；动态注入选择器同步覆盖 modern-dark。
- **stat `upd v:` 无动画**：`_update` 数值更新改走与首次渲染相同的 easeOutExpo 滚动动画（原直接 textContent 直改）；顺带清理动画收尾处连续两次赋值的冗余残留。

### 测试与文档

- `tests/test-theme.js` +2（modern-dark 暗色分支 + 四主题色板完整性）；`invalidateChartColors` 导出验证。

产品级表达基建 M0 · 任务四：图标体系统一（registerIcon + 全库去 emoji）。

### 新增

- **`TokUI.registerIcon(name, pathContent, { alias })` 正式 API**：自定义图标注册/覆盖（name 须 `^[a-zA-Z][\w-]{0,63}$`；pathContent 仅允许 path/circle/rect/line/polyline/polygon 几何标签，`on*` 事件属性/`javascript:`/非白名单标签拒绝；覆盖内置自动刷新节点缓存）。
- **内置图标 27 → 61 个**（Lucide 风 stroke，与既有同规格）：folder/folder-open/file-text、volume-high/volume-x、circle-check/x/alert/info/help、chevron 四向、arrow 四向、plus/minus、user/users、home/inbox/bell/calendar/clock、map-pin、trending-up/down、external-link、panel-left、play/pause、terminal、zap。
- **测试** `tests/test-icons.js`（7 例）：注册/别名/注入防御矩阵/覆盖缓存/图标总数。

### 变更（行为预期变化，断言更新在 test-notification.js）

- **全库组件 chrome 去 emoji**：tree 的 📁/📄→folder/file-text SVG、file-tree 的 📁/📄/▾/▸→folder(-open)/file-text/chevron SVG、upload 文件 📄→file-text、audio 🔊→volume-high、terminal 🔴🟡🟢→纯 CSS 三色圆点（新 tokui-terminal__dot--red/amber/green）、callout/toast/notification 的 ✓✕⚠ℹ💡→circle-* /lightbulb SVG、latency 💡⚡⏱→lightbulb/zap/clock、test-result/test-case ✓✗○→check/close/minus。图标体系由「注册表 + emoji + 内联硬编码」三源并存归一为单一注册表。
- **文档**：DSL_REFERENCE §7 图标清单重写（61 个分类 + registerIcon）、llms.txt「图标体系」节、demo-icons 案例（按钮图标墙 + 树/callout/terminal 实景对照）。

产品级表达基建 M0 · 任务三：响应式断点系统（容器查询）。

### 新增

- **col/grid 五档断点属性 `xs`/`sm`/`md`/`lg`/`xl`**：声明式响应式，**断点基于容器（row/grid 自身）宽度而非视口**——嵌套布局（dialog 内栅格、sidebar 内卡片墙）各自独立响应。`col` 断点值 = span 1-12 或 `"span/offset"` 组合（offset 1-11）；`grid` 断点值 = 列数 1-12。档位：xs 基础档全宽生效 → sm≥576 → md≥768 → lg≥992 → xl≥1200（容器 px）递增覆盖，未写某档继承上一档。
- **实现**：断点属性落 `data-bp-*` → tokui.css 新增 200+ 条 `@container` 规则（col 走 CSS 变量桥接 `grid-column: span var(--bp-*)`；grid 因 Chromium `repeat()` 计数位不接受 `var()` 而逐值枚举完整声明）；带断点的 grid 自动外包 `.tokui-grid-cq` 容器 wrapper（元素不能查询自身容器，opt-in 设计——无断点的 grid 结构零变化）。整段 `@supports (container-type)` 包裹，不支持容器查询的浏览器回退既有 1024/640 媒体查询兜底。
- **测试** `tests/test-responsive.js`（12 例）：断点落点/值校验/组合 offset/无断点零变化/CSS 完整性/流式分片；真浏览器 4 档宽度实测（grid 1→2→3 列、col span12→span6→7/span6 跨档覆盖）。
- **Demo** `demo-responsive`：三断点卡片墙 + offset 组合 + 侧栏主区堆叠案例。
- **文档**：DSL_REFERENCE「响应式断点」节 + row/col/grid 属性表、dsl-syntax 双语「Responsive breakpoints」节、llms.txt。

产品级表达基建 M0 · 任务二：Design Token 版式 scale 补全（四主题统一）。

### 新增

- **六组版式 scale 令牌**（default/dark/modern/modern-dark 全量提供）：`--tokui-space-1~8`（4px 基数间距）、`--tokui-font-xs~display`（12~32px 字号七档）、`--tokui-radius-sm/md/lg/xl/pill`（default 系 2~12px · modern 系 4~16px，`--tokui-radius` 改为 `md` 档别名向后兼容）、`--tokui-shadow-xs~xl`（default 对齐 modern 柔光体系 / dark 对齐 modern-dark 深投影体系，modern 双主题补 `xl` 档）、`--tokui-blur-sm/lg`（玻璃态模糊）、`--tokui-density-v`（排版密度，compact 场景覆盖）。
- **测试**（`tests/test-theme-tokens.js` +4）：四主题 scale 完整性扫描、radius 别名一致性、modern 系既有阴影零回归守卫、高频组件迁移断言。
- **Demo** `demo-design-tokens`：圆角/阴影/间距/字号四组 scale 可视化 + 主题联动演示。
- **文档**：VitePress `docs/guide/theming.md` + `docs/en/guide/theming.md`「版式与密度 scale」节（含 `style:` 通道 `var()` 引用示例）。

### 变更

- 高频组件无损迁移至 scale 令牌（计算值不变）：`card`（圆角 `calc(radius+4px)` → `radius-lg`，恰等价于两系取值；header/body/footer 间距）、`btn`（内边距/外边距）、`radio`（组间距）。

产品级表达基建 M0 · 任务一：通用样式安全通道（cls: / style: 全组件根级定制）。

### 新增

- **`cls:` / `style:` 全组件通用属性**：新增 `src/core/style-guard.js` 样式安全通道，`renderer.render()` 新增 `_applyUserStyle` 集中挂载点——两个属性对全部已注册组件生效，落在组件根元素上。`style:` 走属性名白名单（background/border/padding/margin/box-shadow/opacity/backdrop-filter/aspect-ratio/transform/letter-spacing/gap/flex 族等 60+ 属性）+ 值级安全过滤（拒绝 `expression()`/`javascript:`/`behavior:`/`@import`；`url()` 仅放行 http(s) 与站内相对路径；`transform` 仅放行 translate/scale/rotate 函数族；拒绝 `position`/`top`/`left` 布局逃逸），违规声明静默丢弃、合法声明照常生效。`cls:` 类名须 `^[a-zA-Z][\w-]{0,63}$`、拒绝 `tokui-` 前缀、上限 8 个去重。
- **测试** `tests/test-style-guard.js`（17 例）：白名单/注入矩阵、cls 规则、多组件根级应用、流式分片（含半标签劈开 style 值）、与 `w:` 私有属性共存、未知组件降级语义。
- **Demo** 两案例：`demo-cls-style`（渐变品牌卡/排版微调/布局微调三栏）与 `demo-cls-style-guard`（放行/拦截对照），进「基础组件」分组。
- **文档**：`TOKUI_DSL_REFERENCE.md` §2.1「样式定制通道」、`llms.txt`「样式定制 DSL」节、VitePress `docs/guide/dsl-syntax.md` + `docs/en/guide/dsl-syntax.md` 双语「样式定制」小节、AGENTS.md（浏览器加载序加入 style-guard.js、安全注意事项改指 core/style-guard.js、DSL 速查补 cls/style）。

### 变更

- `layout.js` card 组件私有 `_filterStyle`/`_SAFE_STYLE_PROPS` 下线，改走 renderer 中央通道（白名单较原 card 版扩充；`[card w:480 style:"width:…"]` 同名属性时 `style:` 现在优先生效——原实现 `w:` 覆盖 style，属行为微调）。

## [0.2.4] - 2026-08-18

高级网格布局系统 grid/cell + 子树级主题 + parser 引号容错。

### 新增

- **grid/cell 高级网格布局**（与 12 栅格 row/col 并行的新布局系统）：`grid` 容器支持 `cols`/`rows` 轨道定义（纯数字 `N` → `repeat(N,1fr)`；`auto:180px` → `auto-fill` 自适应列数；显式列表支持 `fr`/`px`/`%`/`minmax()`/`fit-content`，白名单校验防 CSS 注入）、`areas` 模板区域（`|` 分行、`.` 空位）、`gap`/`gx`/`gy`、`h`/`minh`、变体 `v:dense`/`flush`；`cell` 子项支持 `area`（命名区域落位）、`c`/`r`（跨列/跨行，`N` 或 `"1/3"` 线号写法）、`align`/`justify`。`grid` 入 parser `CONTAINERS`，`cols` 属性在 `_emitStreaming`/`_emitBuffered` 两处加自闭合豁免。Builder 新增 `.grid(attrs)`/`.cell(attrs)`（含 `.d.ts`）。
- **row/col 增强**：`row` 新增 `gutter`/`gy`（行列间距）；`col` 新增 `offset`（1-11，clamp 不超 12）与 `rspan`（行高跨距 1-12）。
- **子树级主题**：`grid`/`cell`/`card` 支持 `theme` 属性（default/dark/modern/modern-dark），落 `data-tokui-theme` 到元素自身，主题令牌对自身及后代级联——车机 HMI 等局部暗色场景不再依赖臆造的 `bg:`/`fc:` 属性；`.tokui-grid[data-tokui-theme]` 自带底色。
- **stat 底部小标签**：`stat` 支持 `l` 属性（`.tokui-stat__label`），存量 `l:` 写法此前被静默丢弃。
- **parser 引号容错**：①属性值内「空格+已知 key+冒号」误拆分修复（引号只开不关时的吞噬）；②`findCloseBracket`/`findTrCloseBracket` 对紧跟 `]` 的悬空引号不切换引号状态；③`_flush` 期间（`_flushing`）引号不平衡的标签允许朴素 `]` 闭合——AI 生成 `l:"商品金额 tx:¥6,299"` 这类缺引号 DSL 不再整树解析崩坏。
- **demo 布局案例扩容**：新增 9 个布局案例——圣杯布局、监控大屏（grid 行列混跨图表墙）、车机 HMI（不规则区域拼接中控）、auto-fill 自适应卡片墙、杂志混排（cell 跨格 + offset/rspan），及 AI 对话场景找加油站/找酒店/沿途服务区 3 个 POI 数据布局；NAV_DATA 拆分为「布局系统」与「容器类组件」两组。
- **文档对齐**：`docs/components/layout.md` 双语新增「高级网格 grid/cell」章（含固定轨道溢出警示：chart `h` 是 viewBox 非实高、薄轨道不放 card）、`demo/TOKUI_DSL_REFERENCE.md` §6.5、`demo/llms.txt`、`docs/api/builder.md` 双语；CLAUDE.md `cols` 豁免名单、AGENTS.md 布局条目同步。

### 修复

- **grid 布局渲染不撑起外层**：修复圣杯/HMI 等 grid 案例中内容溢出盖住 footer、外层 card 不被撑开的问题；`.tokui-cell > :only-child` 独生子女撑满 cell（`height:100%`）。
- **无标题 card 空 header**（demo 页）：源码按钮注入不再为无 `tt` 的 card 创建空 header 区域，改绝对定位右上角（`demo/assets/js/demo.js` injectCardSourceButtons），消除 card 顶部空白带。


## [0.2.3] - 2026-08-13

AI 对话组件专项（缺陷修复 + 令牌体系统一 + 视觉重设计 + upd/事件能力补齐 + 流式性能）。

### 新增

- **plan-step 支持 upd 推进**：`plan-step` 落 `id` 并新增 `_update`——`[upd id:step1 status:doing]` 即可推进步骤；`status` 同义词自动归一（`running`→`doing`、`complete`→`done`、`fail`→`error` 等），`tt`/`desc` 同步可改。
- **AI 组件 id 锚点补全**：`bubble`/`typing`/`terminal`/`diff`/`artifact`/`quick-reply`/`msg-actions`/`think`/`think-chain` 的 `id` 均落 DOM，作 `del`/`ins` 定位锚点（typing→正文切换等编排场景）。
- **tool-call 可折叠**：新增 `collapsed` 布尔属性（入 parser `BOOLEAN_ATTRS`）初始收起 body；header 点击 / Enter/Space 随时收展（`aria-expanded` 同步），状态徽章常显，body 只切 display 不销毁内容。
- **`streamAnimation` 公共选项**：`new TokUI({ streamAnimation:false })` 关闭流式入场动画（默认 true；不影响一次性 `render()`）。
- **新 i18n key**（zh-CN / en-US 双份）：`agent.defaultName`、`terminal.title`、`sandbox.title`、`canvas.title`、`toolCall.defaultName`、`artifact.codeTab`、`artifact.previewTab`、`testResult.total`（含 `{n}` 插值）。
- **新测试文件**：`tests/test-cleanup.js`（`_registerCleanup` 清理机制）、`tests/test-theme-tokens.js`（主题令牌引用完整性扫描）、`tests/test-stream-perf.js`（fade-in 闸门 / 流式 Text 合并）。

### 修复

- **chat-input upd 全通路**：`id` 落 DOM，`[upd id:x dis:true]` / `[upd id:x streaming:false]` 真实生效；`dis:'false'` 字符串按布尔语义视为「主动启用」；流式 `_slot` 由 textarea 改挂 actions 区（textarea 纯文本内容模型不渲染子元素）。
- **artifact 复制保留换行**：复制改用渲染期留档的原始文本（含流式追加），不再读丢失 `\n` 的 `textContent`。
- **callout / agent 流式落位**：callout 补 `_tokuiType` 盖章（流式闭合类型匹配）；agent 无条件建 body 插槽，open 后流入子节点落位正确。
- **监听器泄漏**：renderer 新增 `_registerCleanup(el, fn)` 清理机制（`destroy()` 统一调用，要求幂等）；affix / backtop / command hotkey 的 window/document 监听接入解绑。
- **sandbox 流式**：`lang:html` 分支流式期间只累积文本、闭合时才一次性写 iframe srcdoc；非 html 分支流式文本落入 pre 代码区。
- **tool-call upd 幂等**：`result`/`error` 重复推送就地更新既有节点，不再堆叠。
- **command**：键盘 ↑↓ 与鼠标悬停选中状态同步；选中 emit 合并为单一通路（同一 item 一次选中只 emit 一轮）；分组显隐改数据驱动；带 `v:` 项的显示文本不再被 value 冲掉。

### 变更

- **AI 组件全令牌化**：tool-call / agent / diff / artifact / welcome / callout / chat-input 等状态色、阴影、边框全部改吃三层令牌（无裸 hex/rgba）；新增 `--tokui-font-mono`、`--tokui-bubble-*`（6 个，四主题）、`--tokui-terminal-bg/-text/-titlebar`、`--tokui-code-*`（7 个高亮令牌，default = GitHub Light 板 / dark = One Dark 板）。
- **视觉重设计**（对齐 card 调性）：bubble user 浅灰气泡、AI 头像淡底、system 更轻；suggestions 去左条与双层影（1px border + hover stripe）；chat-input 边框归一 1px + 单层 focus 环；welcome 降饱和；terminal 深色令牌化；source 轻量化（去实色 primary 序号圆/主题色标题/底色边框，改纯文本行：muted 序号与标题、hover 才显链接色，视觉权重低于正文）。
- **事件出口统一**：thumb `like{value:up|down}`、source `open{url,title}`、code/terminal/copy/artifact `copy{}`、command `select{value,text}`、sidebar `toggle{collapsed}`、ft-folder `toggle{name,open}`、attach `delete{name,url,type}`、welcome-feature `select{value}` 全部接入 `createReporter` 统一出口；全局 bus 直连清零（conv/thumb/attach/command 改 `renderer.eventBus`，多实例安全）；原 `clk` 通道行为保持不变。
- **error/danger 双类名补齐**：tool-call / agent / think-step 的 `--error` 规则双写 `--danger`，DSL 写 `status:danger` 不再失色。
- **流式 fade-in 收敛**：`tokui-fade-in` 仅顶层流式挂载元素挂载（嵌套元素与文本 chunk 不挂），动画改 opacity-only 关键帧。
- **流式 Text 合并**：连续文本 chunk 合并进同一 Text 节点（`textContent +=`），大对话 DOM 节点数收敛。

## [0.2.2] - 2026-08-09

a11y 无障碍巡检专项 + Phase 5 体系债务清理收官。

### 新增

- **datepicker/datetimepicker 键盘网格导航**：日期格 APG 方向键导航（←/→ 逐日、↑/↓ 逐周、Home/End 行首行尾），跨月边界自动翻页并聚焦对应日期。
- **chart dataZoom 键盘化**：缩放窗口与左右手柄支持键盘操作（role=slider + 方向键步进 + Home/End 直达边界），`aria-valuenow` 实时同步，复用共享 `bindZoomKeyboard` helper。
- **分页焦点保持**：pagination 与 table pager 重绘后焦点不丢失（翻页按钮重建时焦点落回同位置页码）。

### 修复

- **menu 变体纳入白名单**：`v:horizontal`/`v:inline` 迁入 renderer `VARIANTS` 机制，与全局变体体系一致。
- **parser**：`BOOLEAN_ATTRS` 重复的 `'open'` 去重。
- **table.js**：`'\x00SKELETON\x00'` 哨兵改为 `'\u0000SKELETON\u0000'` 转义写法，源码不再有裸 NUL 字节。
- **禁用态点击闸门**：`aria-disabled` 元素不再触发 `clk` 回调（鼠标/键盘同口径）。
- **a11y 巡检批量修复**（~60 处）：tabs/menu 补 ARIA 角色与 roving tabindex；灯箱、tag 关闭钮、file-tree 折叠钮键盘可达；popover/command 面板焦点管理完善；chart SVG 统一 `role="img"`。

### 变更

- **ARIA 语义统一**：开关类控件 `aria-pressed` 统一调整为 `aria-checked`。
- **i18n 字典扩充**：新增 17 条 chrome 文案（lightbox 上下张、sidebar 折叠、canvas 面板、pagination 翻页、carousel、numinput 增减、transfer 移动/全选、calendar 翻月、table 全选、pwd 显隐），zh-CN / en-US 双份。
- **DSL 参考**：`dis:false` 语义坑写入 `demo/TOKUI_DSL_REFERENCE.md` §3 与 `docs/guide/dsl-syntax.md` 双语醒目警告；steps `vd:`/`s:` 与 tabs 值语义 `v` 在 §4/§8.1 明示。
- **文档示例完善**：h1-h6 标题补 `bg`/`fc` 配色属性说明与装饰变体（ribbon/badge/pill 等）示例；masonry 瀑布流示例改为多卡片不同高度；editable 示例改为规范嵌套段落形式（`docs/components/` 中英双语同步）。

## [0.2.1] - 2026-08-03

Phase 4 新组件补位 + P2 社区组件落地，配色体系整体柔化。

### 新增

- **分段控制器 `segmented`**：双模式表单控件。简写 `opt:"v:label;…"` 原子自闭合；容器模式 `[opt v:值 tx:文 i:图标 chk dis]` 支持图标与单项禁用；`v` 当前值（可与形态变体组合 `v:"sm,grid"`），变体 `sm`/`lg`/`block`/`pill`/`vertical`；`on:"change:h"` 上报 `{value,name}`；支持 `upd v:值` 程序化切换与 form reset 恢复。
- **颜色选择 `color-picker`**：自闭合。面板含饱和明度取色区 + hue 滑条 + hex 输入 + 预设色 + 清除；开启时 portal 到 `body` 并 fixed 定位（不被父容器 overflow 裁切），滚动跟随重定位，外点/Esc 关闭，取色拖拽带 pointer capture；`v` 初始 `#rrggbb`（缺省 `#1677ff`），`presets` 逗号分隔预设 hex；支持 `upd v:#hex` / `upd dis:false` 与 form reset。
- **固钉 `affix`**：容器。滚动越过偏移即 `position:fixed` 固定：`top` 固顶（缺省 0）、`bottom` 固底（经过原位置后释放，同 AntD `offsetBottom`）、`target` 显式滚动容器；自动插占位防跳动，`change` 上报 `{fixed}`；滚动监听挂 window 捕获阶段，嵌套滚动容器（对话区/scroll-area）均可感知。
- **锚点导航 `anchor`**：双模式。简写 `opt:"目标id:标题;…"` 原子自闭合；容器模式 `[lk h:目标 tx:标题 d:层级]` 支持二级锚点；`top` 指定 scroll-spy 激活偏移（缺省 12）；变体 `horizontal` 横向模式；点击平滑滚动 + scroll-spy 自动高亮；支持 `upd v:目标id` 程序化高亮（silent）。
- **漫游引导 `tour` / `tour-step`**：`tour` 容器 + `tour-step` 自闭合标记（`tgt`/`tt`/`tx`/`pos`）。`open` 闭合后自动开启，`mask:false` 关遮罩；键盘 Esc 关、←/→ 切步；事件 `change`（`{index,target}`）/`finish`/`close`；upd 契约 `act:open`（`v` 可选起始步）/`act:goto v:N`/`act:close`（程序化均 silent）。
- **图片预览组 `preview-group`**：容器。一组 `img` 共享灯箱预览会话（缩放/旋转/翻转/计数/前后切换），流式后到的图自动入组。
- **命令式确认 `modal.confirm`**：宿主侧 JS API（非 DSL），`TokUI.modal.confirm(opts)` / 别名 `TokUI.confirm(opts)` → `Promise<boolean>`；opts `{tt, tx, t:'danger'|'primary', 'ok-text', 'cancel-text', onOk, onCancel}`；Esc/遮罩点击=取消；按钮与 aria 文案走 i18n（`common.ok`/`common.cancel`/`modal.aria`）。
- **P2 组件四连**：`kbd` 行内键帽（`p` 行内子节点白名单同步收录）、`editable` 行内编辑（点击即编辑，Enter/失焦提交 `change` 上报，Esc 还原）、`float-button` 视口四角固位悬浮组（子组件自动圆形悬浮化）、`masonry` CSS columns 瀑布流（`cols` 固定列 / `minw` 自动列 / `gap`，流式追加自然流动）。

### 修复

- **imgs 灯箱**：`cloneNode` 加环境守卫，非浏览器环境（SSR/测试）不再报错。
- **affix/anchor 滚动感知**：scroll 不冒泡导致嵌套滚动容器（对话区）监听失效，改为 window 捕获阶段监听 + 惰性重探（流式期内层容器后于外层变得可滚）；anchor scroll-spy 增加点击后 900ms 抑制窗，不再抢回用户点击的高亮。
- **color-picker 面板**：fixed portal 修复被父容器裁切；取色拖拽越界松手不再误触外点关闭（pointer capture）。
- **parser**：`cols` 自闭合触发豁免名单补 `masonry`（其 `cols` 是布局列数属性，此前带 `cols` 的 masonry 会被误判自闭合、容器写法报「未匹配闭合标签」）。

### 变更

- **color-generator**：新导出 `hexToRgb` / `rgbToHex` / `rgbToHsv` / `hsvToRgb` 颜色换算工具函数。
- **dom-mock**：document 级事件监听可触发，交互回路测试更贴近真实 DOM 行为。
- **配色体系柔化**：file 文件卡图标、h1-h6 标题 ribbon/badge/pill 变体、card 头部 fill/pill 统一改为「10% 主色浅底 + 主色文字 + 淡描边」（color-mix 派生，深浅主题自适应）；自定义色经白名单校验后同色体系浅化。
- **demo**：`sending` 发送状态镜像到 `body[data-sending]`，e2e/外部脚本可精确等待流结束。

## [0.2.0] - 2026-07-29

交互回路闭环收尾 + 表单/数据展示增强 + 流式渲染性能专项。「用户 → AI」回路打通后，TokUI 从流式展示框架升级为 Agent 双向交互协议层。

### 新增

- **交互事件上报统一出口**：`onEvent` 升级为统一事件总线出口，DSL `on:"事件:处理器,…"` 声明组件交互上报，`createReporter` 统一发送，`eventFilter` 可按需过滤；approval 审批组件落地。
- **表单校验增强**：多种校验规则补充；upload 组件 XHR 传输三态 UI（进度/成功/失败）与失败重试。
- **数据展示增强**：table 客户端排序/筛选/分页（`sortable`/`filter`/`pagination`）；scroll-area `virtual` 虚拟滚动 + `loadmore` 触底上报；tree `load` 懒加载。
- **Markdown 增强**：mermaid / KaTeX 宿主插件按需加载（不进核心零依赖承诺），代码块行号（CSS counter）。
- **气泡与终端**：bubble 头像文案入 i18n；terminal 复制按钮（i18n 文案）。

### 修复

- **事件系统**：修复 eventBus emit 断链，以及 popconfirm/thumb/conv/command 等组件的点击双发与死链；修复流式期间 conversations 选中上报丢失；统一组件内部点击事件处理，消除 handler 重复调用。
- **浮层定位**：tooltip/popover/popconfirm 读齐 rect 一次写完，消除重复布局（layout thrashing）。
- **渲染稳定性**：消息与通知容器缓存机制，容器被移除时不再重复创建；密码输入框眼睛图标缓存复用，减少 DOM 解析开销。

### 变更（流式渲染性能专项）

- **code/diff/chart 流式增量渲染**：`_streamAppendHook` 增量重绘，替代整树重渲。
- **table 合帧**：tr cell 级流式渲染合帧优化。
- **淡入统一**：内联动画样式统一改为 `.tokui-fade-in` 类。
- **textarea 自动调整与时间选择器性能优化**。
- **parser**：豁免 katex 与 md 内容的转义解码。

## [0.1.9] - 2026-07-21

表单声明式校验 + 输入联想。

### 新增

- **chat-input @提及**：`mention:` 属性配置提及数据源（事件处理器同步/异步返回匹配列表），输入 @ 触发联想下拉，键盘导航选择，选中插入文本并触发 `mention` 事件上报。
- **DSL 校验规则**：`input`/`pwd`/`textarea`/`select` 支持 `rule:"required|email|len:N|…"` 声明式校验 + `msg:` 自定义错误文案，提交闸门统一执行，错误态视觉体系统一。
- **实时校验**：`live` blur 实时校验，`live:input` 即时模式，error 态输入即时重检。
- **input 联想**：`sug:` 联想建议下拉，支持异步数据源与键盘操作。
- **必填标记**：表单控件 `req` 属性显示必填星号样式（label 必填星号 + hint 错误位布局统一）。

## [0.1.8] - 2026-07-21

人工审批（HITL）+ 统一事件上报 + 动态更新指令。（版本号跳过 0.1.7）

### 新增

- **HITL 人工审批**：`tool-call` 的 `approval` 模式渲染批准/拒绝按钮，决定经 `clk` 事件回传。
- **统一事件上报**：quick-reply 点击回调、suggestion 点击、select 事件、conversations 交互（点击/删除）、msg-actions 动作按钮均纳入统一事件出口上报。
- **停止生成契约**：chat-input 新增 `streaming` 状态显示停止生成按钮，支持 `stop` 事件上报与乐观复位。
- **`[del]` / `[ins]` 指令**：动态删除组件（安全删除）；在已渲染目标 before/after/into 位置插入子树（闭标签到达时一次性搬运，无错位闪动）。
- **指令回执**：全部组件支持按 id 定位元素，upd/del/ins 指令的查找与回执机制完善。
- **calendar**：支持动态更新选中日期。

## [0.1.6] - 2026-07-13

图表交互专项 + 构建修复。

### 新增

- **图表缩放**：圆点独立缩放与重定位、缩放后索引计算修正。
- **ECharts 风格轴触发十字线 tooltip**。
- **X 轴标签旋转布局**与底部留白自适应；zoom 重绘文字字号保持。
- **大规模柱状图演示**与图表示例结构调整。

### 变更

- **Modern 主题卡片柔光阴影**优化。
- **CI**：pnpm/action-setup 升级 v6，精确指定 pnpm 版本并启用独立模式，修复退出码问题。

## [0.1.5] - 2026-07-02

演示与文档修补版本。

### 变更

- 文档站配置优化，新增版本号显示。
- 演示平台域名修正；示例图片资源链接更新为 webp 格式。

## [0.1.4] - 2026-07-02

接口文本全面国际化 + 图表/媒体增强。

### 新增

- **i18n 国际化**：组件 chrome 文案（aria-label / placeholder / 空态 / 分页总数 / 默认按钮字）统一收口 `i18n.js` 字典，内置 zh-CN / en-US，`registerLocale` 可扩展语种；文档新增 i18n 指南（中英）。
- **图表全屏弹层**；饼图标签字号保底及图例布局优化；rate 只读评分状态样式。
- **视频/音频组件**功能与演示示例丰富。

## [0.1.3] - 2026-06-30

表单选择器三态统一 + 图标/条码组件 + 表格流式增强。

### 新增

- **checkbox 三态**：单布尔 / `opt` 简写多选 / 容器多选（`multi` 标记）三态渲染，流式 opt 注入共享 name（镜像 radio）。
- **`opt` 简写统一**：`_parseOptShorthand` + `_expandOptChildren`，radio/select/checkbox 均支持 `opt:"v:label;…"` 简写展开。
- **radio/checkbox `v:vertical` 竖排左对齐变体**。
- **图标系统**：零依赖 SVG 图标注册表 `icons.js`（Lucide 风格）；btn 支持 `icon:`/`i:` 图标属性与 icon-only 模式；表格操作列支持 `icon:`/`i:`/`l:` 简写。
- **`barcode`**：Code128 条码组件（纯 JS 零依赖 SVG）。
- **`qrcode`**：QR 二维码组件（vendored Arase 库 + 纯 SVG，中文 UTF-8 编码修复）。
- **表格增强**：tr 单元格级真流式渲染；末格 btn 操作列真流式（逐钮边解析边渲染）；单元格合并与多行表头。
- **desc**：描述列表多列末行边框智能处理（含计数法兜底）。
- **大文本容器真流式 + 纯自闭合大块骨架占位机制**。
- **SSE 接口 IP 限流**（每分钟 10 次，超限 429 + 冷却）。

### 变更

- **demo 目录独立重构**：自包含演示（`demo.sh` 管理脚本 + 同源于 3109 的静态/SSE 服务）。

## [0.1.2] - 2026-06-27

轮播图增强 + 表单动作与打印区 + 流式跟随。

### 新增

- **carousel**：固定尺寸、比例尺寸与缩略图图例支持。
- **表单动作与打印区**：btn 内置动作（print > reset > submit > clk），`print-area` 标记 1:1 打印区域。
- **tabs / accordion 流式跟随**。
- **stat**：支持透传 id 属性，供 upd 指令准确定位。
- **智能变体吸收**：`v:` 多变体写法（空格分隔变体 token 自动并入）。

### 修复

- **ribbon 缎带暗色主题可见性**优化。
- **表格**：列错位警告信息与标签断裂检测、列分隔处理逻辑、单元格内未加引号逗号告警。
- **parser**：CJK 值粘连多属性漏空格修复；流式渲染 finalize 后代码区丢失修复。
- **打印**：复位祖主链 containing-block 样式，修复打印位置偏移。

### 变更

- **输入框验证态样式**及主题支持优化。

## [0.1.1] - 2026-06-26

文档站主题交互与指南完善，附带一处多实例主题装配的 bug 修复。

### 修复

- **多实例主题装配**：`new TokUI({ theme })` 现在对 `'default'` 也调用 `setTheme`，修复连续构造 `dark` → `default` 实例时后者容器残留 `data-tokui-theme="dark"` 的问题。根因：主题管理是单例，`init()` 会把「上一次实例残留的 `currentTheme`」写到新容器，而构造器原先对 `'default'` 跳过了 `setTheme`。`ThemeShowcase` 切回 default 不生效即此因。新增 `test-theme.js` 多实例回归用例。
- **DSL 语法示例**：动态更新章节的 Playground 原为无关的 `stat` 示例，改为 `[progress]` + `[upd]` 序列，并提示 ⚡ 流式可重放 0% → 50% → 100% 跳动。

### 新增

- **主题切换演示器**（`ThemeShowcase`）：theming 页可实时切换风格族（default / modern）× 明暗（light / dark），驱动同一份 DSL 在四套主题下的渲染对比。Playground 新增 `theme` prop。

### 变更

- **Playground 跟随站点明暗**：渲染主题默认跟随 VitePress header 的 light/dark 切换（站点 dark → `'dark'`，light → `'default'`）；显式传 `theme` 则覆盖、不再跟随。
- **快速开始指南重写**：补全 npm 安装 / CDN / 浏览器示例 / 三种渲染方式 / React · Vue · Svelte · Next.js(Nuxt) SSR 集成 / 服务端 Builder 命名导出 `{ TokUIBuilder }` / 引入与样式路径。
- **主题指南重写**：4 套内置主题（default / dark / modern / modern-dark）、三层令牌体系、运行时 `setSeedColor` 自定义色板、构建期 `generateThemeTokens`、自定义主题步骤与三个坑（`color-scheme` / 二级语义变量 / `--danger` 别名）。

## [0.1.0] - 2026-06-25

首个公开 npm 发布版本（开源就绪）。零依赖流式 UI 描述与渲染框架。

### 新增

- **多格式构建产物**：`dist/tokui.{mjs,cjs}` + `dist/tokui.umd.js` + `tokui.css`，均带 sourcemap。`.mjs`/`.cjs` 用标准扩展名显式声明模块类型（消除 Node `MODULE_TYPELESS` 警告），ESM（打包器）/ UMD（CDN/`<script>`）/ CJS（Node `require`）三全。
- **框架适配器 monorepo**（pnpm workspace）：
  - `@jboltai/tokui-react` — `<TokUIView>` 组件 + `useTokUIStream()` hook
  - `@jboltai/tokui-vue` — `<TokUIView>` 组件 + `useTokUIStream()` 组合式
  - `@jboltai/tokui-svelte` — `use:tokui` action + `<TokUI>` 组件
  - `@jboltai/tokui-webc` — `<tokui-view>` 自定义元素（框架无关）
- **SSR 安全**：核心入口懒解析 + 三态守卫（Node CJS / 浏览器 / SSR no-op），`import` 不依赖 `window`/`document`，可在 Next.js / Nuxt / SvelteKit 服务端导入。
- **测试基建**：`npm test` 改为全量 `test:all`（24 文件 / 866+ 用例）；新增 `typecheck`（tsc，含反向断言）与 `coverage`（c8，核心模块 ~91%）。
- **发布防护**：`package.json` 的 `exports` 分流（import/require/browser/node）、`files` 白名单、`.npmignore`、`sideEffects`、`publishConfig.provenance`。
- **CDN 支持**：unpkg / jsdelivr 直接引用 UMD + CSS。

### 变更

- 包名从内部 `tokui` 改为 scoped `@jboltai/tokui`。
- `exports.require` 由 UMD 改指真 CJS（`tokui.cjs`），消除 Node `require` 的 UMD/伪 CJS 歧义。
- `engines.node` 提升到 `>=18`。
- DOM mock 的 `textContent`/`innerHTML` 改为 DOM 忠实行为（getter 聚合后代 / setter 以文本节点替换子节点），修复 `p v:muted` 变体与代码块未知语言回退两处测试。

### 修复

- `test-basic.js` 因 countdown 组件 `setInterval` 无销毁钩子导致进程挂起 —— runner 改为强制 `process.exit`。
- `test-layout.js` 的 `item content + nested list` 断言改为符合真实 DOM 聚合语义。
- `src/index.js` 与 `src/components/index.js` 的模块求值期裸读 `window.TokUI._internal` 改为运行期懒解析，SSR 导入不再依赖 bundler 保留 `require` 的怪癖。

[0.2.4]: https://github.com/jboltai/tokui/releases/tag/v0.2.4
[0.2.1]: https://github.com/jboltai/tokui/releases/tag/v0.2.1
[0.2.0]: https://github.com/jboltai/tokui/releases/tag/v0.2.0
[0.1.9]: https://github.com/jboltai/tokui/releases/tag/v0.1.9
[0.1.8]: https://github.com/jboltai/tokui/releases/tag/v0.1.8
[0.1.6]: https://github.com/jboltai/tokui/releases/tag/v0.1.6
[0.1.5]: https://github.com/jboltai/tokui/releases/tag/v0.1.5
[0.1.4]: https://github.com/jboltai/tokui/releases/tag/v0.1.4
[0.1.3]: https://github.com/jboltai/tokui/releases/tag/v0.1.3
[0.1.2]: https://github.com/jboltai/tokui/releases/tag/v0.1.2
[0.1.1]: https://github.com/jboltai/tokui/releases/tag/v0.1.1
[0.1.0]: https://github.com/jboltai/tokui/releases/tag/v0.1.0
