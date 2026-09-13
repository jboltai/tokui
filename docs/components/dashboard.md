# 数据大屏组件（Dashboard Pack）

M1 交付的大屏组件族：`panel` 科技边框容器、`kpi` 指标卡、`flip-num` 数字翻牌器、`scrollboard` 轮播榜单、`fit-screen` 大屏缩放容器，配合 [`tech` 主题](/guide/theming#内置主题)与 [`chart t:map` 中国地图](/components/chart) 构成 ChatBI 数据大屏完整能力。

## panel 科技边框容器

```html
[panel tt:车间实时产量 v:corner]…子内容…[/panel]
```

| 属性 | 说明 |
|------|------|
| `tt` | 标题栏文本（左右装饰线） |
| `v` | `corner` 四角角标 / `glow` 发光（tech 令牌联动）/ `plain` 无边框透明 |
| `theme` | 子树主题（`theme:tech` 切换科技风） |

## kpi 指标卡

```html
[kpi tt:今日产量 v:12846 unit:件 trend:12.4 icon:trending-up clk:drill]说明行[/kpi]
[kpi tt:稼动率 v:92.7 suf:% trend:-1.2 t:danger]
```

- 数值滚动动画（easeOutExpo，`prefers-reduced-motion` 自动降级直显）；
- `trend:12.4` / `-1.2` / `up` / `down` 自动 ↑↓ 徽章并按升降着色（负号转 ↓）；
- `t:danger/success/warning` 数值与图标状态色；`icon:` 取[内置图标](/guide/dsl-syntax)；
- `[upd id:x v:新值 trend:up tt:新标题]` 更新走同一动画通路。

## flip-num 数字翻牌器

```html
[flip-num v:"8,642,918" s:lg dur:600]
```

逐位 3D 翻牌（reel 十面 + cubic-bezier 过渡）；数字串可含逗号/小数点/百分号（自动识别为分隔符）；`s:sm/lg` 尺寸档；`[upd v:]` 各位滚动到位；reduced-motion 直显。

## scrollboard 轮播榜单

```html
[scrollboard h:264 speed:36 cols:"班组,工单,环比" rows:"A线,128,↑12|B线,96,↓3"]
  [tr 追加行,55,↑9]
[/scrollboard]
```

`rows:"a,1,↑2|b,2,↓3"` 简写与 `[tr]` 子节点双数据面；rAF 匀速上滚 + hover 暂停 + 无缝循环（内容不足视口自动克隆一份）；↑↓ 开头单元格自动着色；`speed:0` 静止；`h` 视口高 / `gap` 行距；行点击经 `clk` 上报（`data-value` 为行首列）；空态走 i18n。

## fit-screen 大屏缩放容器

```html
[fit-screen w:1920 h:1080 mode:scale]…按设计稿排版的任意内容…[/fit-screen]
```

内容按 `w×h` 设计稿（默认 1920×1080）排版，随挂载区等比缩放：

| mode | 行为 | 适用 |
|------|------|------|
| `scale`（默认） | 等比缩放居中留空 | 监控大屏（比例锁定） |
| `width` | 等宽缩放贴合内容高；配 `maxh:` 视口高上限（px）后内容超高部分纵向滚动 | 长列表 / 限高滚动区 |
| `full` | 双轴拉伸铺满 | 允许比例变化 |

设计稿内容**满幅排版（铁律）**：fit-screen 内的 grid **必须带 `h:100%`**（如 `[grid rows:"1fr auto" h:100%]`）挂满画布——缺省时 `1fr` 行按内容解析，总高超出设计稿后**底行被画布裁剪**（显示不全）。行高按内容预算：裸 kpi 单排 110~130px、panel 包 kpi（标题头约 40px）单排 ≥150px / 2×2 ≥310px（panel 与 kpi 勿重复 `tt` 双标题）；定高格内用嵌套 `[grid cols:N]` 排子项、**勿用 `[row][col span]` 页面栅格**（行高不受轨道约束，超高溢出）；定高行内容超高会被裁剪在本格内（cell 自带防护，不叠压邻区）。定高格内 chart 可省略 `w`/`h`——自动按格位纵横比重绘铺满（map 画布固定除外）。`width` 模式画布高为最小高、内容可撑高（inner `height:auto`），wrap 贴合视觉内容高，挂载区不再下方留空；窄容器（对话流内嵌）建议 `mode:width`，全屏画布才 `mode:scale`。

ResizeObserver 随挂载区重算（width 模式同时观察 inner，流式子内容后到也会重算；`_registerCleanup` 解绑）；`scale`/`full` 模式**要求挂载区有确定高度**；浮层（tooltip 等）定位无需修正——`getBoundingClientRect` 返回缩放后的视觉坐标。缩放实现：`scale`/`width` 优先 CSS `zoom`（内容按最终尺寸重新布局栅格化，SVG/文字物理清晰，不产生 transform 合成层降采样发虚），环境不支持时回落 `transform: scale()`；`full` 双轴非等比恒用 transform。

## 流式骨架占位（grid areas）

SSE 推送大屏时，`grid` 声明 `areas` 后流式打开即**按区名铺骨架占位**——布局从第一帧就是终布局，各区块 shimmer 呼吸等待；真实 `[cell area:名]` 到达后按区名原地替换，非具名 cell 到达自动撤除全部骨架降级，流闭合时未填充区清位。`skel:"false"` 可关闭。

```html
[grid cols:"400px 1fr 400px" rows:"132px 150px 1fr 288px" areas:"kpi kpi kpi|flip map rank" theme:tech h:100%]
  [cell area:kpi]…[/cell]  <!-- 到达即替换 kpi 区骨架 -->
```

## 组合范式（金标杆）

```html
[fit-screen w:1920 h:1080 mode:scale]
  [grid cols:"300px 1fr 360px" areas:"kpi main map|kpi trend map" theme:tech]
    [cell area:kpi][panel tt:核心指标 v:corner][kpi …]…[/panel][/cell]
    [cell area:main][panel tt:实时产值 v:glow][flip-num v:"8,642,918" s:lg][/panel][/cell]
    [cell area:map][panel tt:区域分布 v:corner][chart t:map region:"浙江:86|江苏:74" …][/panel][/cell]
  [/grid]
[/fit-screen]
```

在线演示：组件画廊「大屏四件套 / 中国地图 / fit-screen 缩放 / 动画与渐变 / ChatBI 监控大屏」案例。

## chart t:map 中国地图

详见 [图表组件 · 中国地图](/components/chart)。`region:"浙江:86|江苏:74"` 省级热力（34 省含港澳台，省名简称/全名均可），`d:"lng,lat,val,name:城市"` 散点层；`label` 三档标注、`unit` 单位、hover 多行 tooltip + 高亮压暗、点击省份 `mapClick` 上报（大屏下钻）、左下 visualMap 色阶条、右下南海诸岛小图（九段线+四大群岛）。

## 图表动画与渐变

- 入场动画：默认开启（整图 fade+上浮+微缩放，仅首渲染；`enter:"false"` 单图关闭；`prefers-reduced-motion` 自动关闭）；
- `grad` 布尔属性：系列色线性渐变填充（bar/area/donut 等填充型图表，系列色 → 同色透明）。
