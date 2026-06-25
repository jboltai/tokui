# Chart

Zero-dependency pure-SVG chart component, `chart` is self-closing. `t` selects the type, `d` feeds data, `l` provides labels, `c` customizes colors — 20 chart types render with no external chart library. Every example shows DSL on the left and a live render on the right; click "edit" to tweak instantly.

Supported types: `bar`, `line`, `area`, `pie`, `donut`, `rose`, `funnel`, `radar`, `scatter`, `bubble`, `heatmap`, `histogram`, `waterfall`, `boxplot`, `treemap`, `sankey`, `candlestick`, `progress`, `gauge`, `gantt`.

## Attribute Output Order (Streaming Render Constraint)

When emitting `[chart]`, attributes must follow **type → style/layout → labels → data** (skip absent segments):

1. `t` type (always first)
2. **Style/layout attributes** (affect render shape, data-independent): `tt`, `orient`, `stack`, `smooth`, `area`, `vals`, `w`, `h`, `range`, `anim`, `xl`, `yl`, `status`, `zones`, `zc`, `c`, `u`, `dec`, `ticks`, `sub`, `bins`, `mode`, `deps`, etc.
3. `l` labels (data-related, but must precede data — build axis/legend ticks first, then plot points)
4. **Data payload** (last): `d` / `tasks` / `rows` / `nodes`+`flows` / `ms` / `v`

```tokui
[chart t:bar tt:Daily output orient:h vals w:800 h:600 l:"Mon,Tue,Wed,Thu,Fri" d:"10,24,18,30,22"]
```

**Why**: during streaming, data grows point by point and the parser's half-built attributes only contain keys accumulated so far. If style keys (`orient`/`stack`/`vals`, etc.) are written after `d`, the preview can't see them yet → it first draws with the default layout, then flips when `]` closes and the style keys arrive (root cause of horizontal bars "suddenly turning" at the end). Putting them first means the preview is in its final layout from the start, with no flip/flicker. **Never write `d`/`tasks` before `l` or any style attribute.**

## Common Props

All chart types share these props, self-closing.

| Prop | Meaning | Example |
|------|---------|---------|
| `t` | Chart type | `t:bar` |
| `d` | Data. Single series comma-separated; multi-series (bar/line/donut) use `|`; scatter/bubble pairs use `;` | `d:"10,20,30"` / `d:"1,2;3,4"` |
| `l` | Labels, comma-separated | `l:"Jan,Feb,Mar"` |
| `c` | Custom color sequence, comma-separated; supports `#hex` / `rgb()` / `var(--x)` | `c:"#1677ff,#52c41a"` |
| `tt` | Title | `tt:Monthly Sales` |
| `w` / `h` | SVG width/height (px, internal coord ratio only) | `w:480` |
| `v` | Single value (donut center text / progress / gauge current) | `v:75` |
| `area` | Fill line chart (boolean) | `area` |
| `vals` | Show value labels on bars/lines (boolean) | `vals` |
| `stack` | Stack (boolean, bar/line/area/donut multi-series) | `stack` |
| `smooth` | Smooth curve for line/area (boolean) | `smooth` |
| `orient` | Bar orientation: `h` horizontal (default vertical) | `orient:h` |
| `xl` / `yl` | X / Y axis unit name | `xl:Input yl:Output` |
| `range` | Gauge sweep angle: `180` (default) / `270` / `360` | `range:270` |
| `anim` | Value animation duration (ms, progress/gauge, auto-stops under reduced-motion) | `anim:1200` |

> Attribute values containing commas or pipes must be double-quoted, or the parser splits on the delimiter. When colors are omitted a built-in 10-color palette is used. Long X-axis labels auto-rotate -35° to avoid overlap; empty data shows a "No data" placeholder.

> **Responsive sizing**: charts default to `width:100%` filling the container, capped per type (max-width × max-height): bar/line/area/scatter/bubble/histogram/waterfall/boxplot 1400×600 (**horizontal bars `orient:h` height cap 800**), candlestick 1400×600, gantt 1400×640, **pie/donut/radar/rose 600×600**, gauge 600×400, funnel 1000×600, heatmap/treemap 1000×600, sankey 1000×600, progress 780×120. Beyond the cap it scales & centers without distortion. `w`/`h` only affect the internal coord ratio, not final render size — usually leave them out; for horizontal bars with many categories you may set `h` explicitly (max 800).

## Bar Chart `t:bar`

Grouped bar chart, self-closing. Multi-series `d` uses `|`, one group of bars per series; a legend is auto-generated at the bottom when series > 1. Add `stack` to stack, `orient:h` for horizontal.

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Data, multi-series via `|` | `d:"120,190,300|90,150,260"` |
| `l` | X-axis labels, comma-separated | `l:"Q1,Q2,Q3"` |
| `stack` | Stack (boolean) | `stack` |
| `orient` | `h` horizontal bars (long-label friendly) | `orient:h` |
| `vals` | Show bar-top values | `vals` |

<Playground dsl='[chart t:bar tt:季度销售额（万元） l:"Q1,Q2,Q3,Q4" d:"120,190,300,250"]' />

Multi-series comparison (auto legend):

<Playground dsl='[chart t:bar tt:销售 vs 目标 vals c:"#1677ff,#faad14" l:"1月,2月,3月,4月,5月" d:"30,45,38,60,52|40,42,50,55,58"]' />

Stacked bars (columns accumulate):

<Playground dsl='[chart t:bar tt:成本结构（堆叠） stack c:"#1677ff,#52c41a,#faad14" l:"Q1,Q2,Q3,Q4" d:"60,70,80,90|30,35,40,45|10,15,20,25"]' />

Horizontal bars (`orient:h`, good for long labels):

<Playground dsl='[chart t:bar tt:各端 DAU（横向） orient:h c:"#1677ff" l:"iOS,Android,Web,小程序,PC" d:"320,580,450,280,150"]' />

> Horizontal bars (`orient:h`) put categories on the y-axis, so height grows linearly with category count (~26px each); the render-side `max-height` auto-loosens to **800px** (vertical bars: 580px). **When categories are many (e.g. ≥15), you may explicitly set `h` to grow the canvas, max effective 800** (= the display cap — larger gets clipped, smaller cramps), e.g. `[chart t:bar orient:h h:800 l:"..." d:"..."]`; for few categories, leave `h` unset (auto). Vertical bars generally don't set `h`.

## Line Chart `t:line`

Line trend chart, self-closing. Add `area` for translucent fill; `smooth` for a smooth curve; `stack` to stack (with `area` → stacked area); multi-series via `|`.

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Data, multi-series via `|` | `d:"30,45,38,60,52"` |
| `l` | X-axis labels, comma-separated | `l:"Mon,Tue,Wed"` |
| `area` | Area fill (boolean) | `area` |
| `smooth` | Smooth curve (boolean) | `smooth` |
| `stack` | Stack (boolean) | `stack` |
| `vals` | Show node values | `vals` |

<Playground dsl='[chart t:line tt:每日访问趋势 area l:"周一,周二,周三,周四,周五,周六,周日" d:"120,150,140,180,210,260,220"]' />

Multi-series line + smooth curve:

<Playground dsl='[chart t:line tt:新老用户对比（平滑） smooth c:"#1677ff,#52c41a" l:"1月,2月,3月,4月,5月,6月" d:"80,120,160,200,240,300|40,60,90,120,150,200"]' />

## Area Chart `t:area`

Area chart = line chart + default fill, self-closing. Supports multi-series and `stack` for stacked area (later series layered on earlier).

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Data, multi-series via `|` | `d:"30,45,38,60,52"` |
| `l` | X-axis labels | `l:"Jan,Feb,Mar"` |
| `stack` | Stacked area (boolean) | `stack` |
| `smooth` | Smooth curve (boolean) | `smooth` |

<Playground dsl='[chart t:area tt:流量趋势 l:"1月,2月,3月,4月,5月,6月" d:"120,180,150,210,260,240"]' />

Stacked area (cumulative composition):

<Playground dsl='[chart t:area tt:收入构成（堆叠面积） stack c:"#1677ff,#52c41a,#faad14" l:"Q1,Q2,Q3,Q4" d:"60,80,100,120|40,50,60,70|20,30,40,50"]' />

## Pie Chart `t:pie`

Proportion pie, self-closing. `d` holds per-item values, `l` their names; slices carry leader lines and percentage labels.

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Per-item values, comma-separated | `d:"45,30,25"` |
| `l` | Per-item names, comma-separated | `l:"Search,Direct,Referral"` |
| `c` | Per-item colors | `c:"#1677ff,#52c41a,#faad14"` |

<Playground dsl='[chart t:pie tt:流量来源占比 l:"搜索引擎,直接访问,推荐链接,社交媒体" d:"45,25,15,15"]' />

## Donut Chart `t:donut`

Donut chart, self-closing. Same structure as pie, plus a `v` prop to show a number at the center. Multi-series `d:"1,2|3,4"` renders concentric rings (outer→inner).

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Per-item values; multi-ring via `|` | `d:"55,35,10"` |
| `l` | Per-item names, comma-separated | `l:"PC,Mobile,Tablet"` |
| `c` | Per-item colors | `c:"#1677ff,#52c41a,#faad14"` |
| `v` | Center text (single ring) | `v:78` |

<Playground dsl='[chart t:donut tt:目标完成率 l:"已完成,剩余" d:"78,22" v:78]' />

Multi-ring comparison (current vs previous, outer = current):

<Playground dsl='[chart t:donut tt:本期 vs 上期 c:"#1677ff,#52c41a,#faad14,#f5222d" l:"A,B,C,D" d:"40,30,20,10|35,25,30,10"]' />

## Rose Chart `t:rose`

Nightingale rose, self-closing. Like pie but with equal angles and **slice radius proportional to value** (larger value = longer petal); good for proportion comparison with wide value ranges.

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Per-item values, comma-separated | `d:"30,25,20,25"` |
| `l` | Per-item names, comma-separated | `l:"Spring,Summer,Fall,Winter"` |
| `c` | Per-item colors | `c:"#1677ff,#52c41a,#faad14,#f5222d"` |

<Playground dsl='[chart t:rose tt:四季销量（玫瑰图） c:"#52c41a,#faad14,#fa8c16,#1677ff" l:"春,夏,秋,冬" d:"320,580,450,280"]' />

## Funnel Chart `t:funnel`

Conversion/sales funnel, self-closing. Tapered trapezoids stacked top-to-bottom, **width proportional to value**, for progressively-shrinking flows (checkout, signup, screening). Data should be **descending** (top = funnel mouth, max value); each stage auto-labels its name and **conversion rate vs the first stage**.

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Per-stage values, comma-separated (descending recommended) | `d:"12000,5400,2800,1600,920"` |
| `l` | Per-stage names, comma-separated | `l:"曝光,点击,加购,下单,付款"` |
| `c` | Per-stage colors | `c:"#1677ff,#52c41a,#faad14"` |

<Playground dsl='[chart t:funnel tt:电商销售漏斗 l:"曝光,点击,加购,下单,付款" d:"12000,5400,2800,1600,920"]' />

## Radar Chart `t:radar`

Multi-dimension radar, self-closing. `l` is dimension names, `d` the scores (0-100 recommended). **Multi-series supported** (`d` via `|`) for entity comparison.

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Per-dimension values, multi-series via `|` | `d:"80,90,70,85,75"` |
| `l` | Dimension names, comma-separated | `l:"Speed,Quality,Cost,UX,Stability"` |
| `c` | Per-series fill color | `c:"#1677ff,#52c41a"` |

<Playground dsl='[chart t:radar tt:综合能力评估 l:"速度,质量,成本,体验,稳定,创新" d:"80,90,70,85,75,88"]' />

Multi-series comparison (Product A vs B):

<Playground dsl='[chart t:radar tt:产品能力对比 c:"#1677ff,#52c41a" l:"性能,体验,价格,生态,服务,创新" d:"85,90,70,80,75,88|70,75,90,85,88,72"]' />

## Scatter Chart `t:scatter`

2D scatter, self-closing. `d` uses **semicolon `;`** to separate coordinate pairs, each `x,y`; `xl`/`yl` set axis names (default X/Y).

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Coordinate pairs, `;` between, `,` inside | `d:"1,2;3,5;6,4"` |
| `xl` | X-axis name | `xl:Input` |
| `yl` | Y-axis name | `yl:Output` |
| `c` | Point color sequence | `c:"#1677ff"` |
| `xmin`/`xmax`/`ymin`/`ymax` | Explicitly lock axis range | `ymin:0 ymax:100` |

> Scatter differs from bar/line: pairs are `;`-separated, coords inside a pair are `,`-separated.

> **Streaming jitter-free**: in container mode points are fed incrementally and the X/Y axes auto-fit by default (expand-only + nice rounding); existing points may reflow once when an extremum expands. For absolute zero-jitter, set `xmin`/`xmax`/`ymin`/`ymax` to lock the axes.

<Playground dsl='[chart t:scatter tt:投入产出关系 xl:投入 yl:产出 d:"1,2;2,3.5;3,4;4,6.5;5,5.8;6,8;7,7.5;8,9.2;9,10"]' />

## Bubble Chart `t:bubble`

3D bubble chart, self-closing. Scatter plus a third dimension: `d` uses `;` between points, each `x,y,size`; bubble radius is proportional to `size`. Supports `xmin`/`xmax`/`ymin`/`ymax` explicit axis locking (same as scatter; jitter-free in streaming).

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Points `x,y,size`, `;`-separated | `d:"1,2,5;3,4,10"` |
| `xl` / `yl` | X / Y axis name | `xl:GDP yl:Population` |
| `sl` | Third-dim (size) name (tooltip) | `sl:Output` |
| `xmin`/`xmax`/`ymin`/`ymax` | Explicitly lock axis range (jitter-free streaming) | `ymin:0 ymax:100` |

<Playground dsl='[chart t:bubble tt:城市经济气泡图 xl:GDP(万亿) yl:人口(百万) sl:产值 d:"1.2,8,300;2.5,15,800;3.8,24,1500;1.8,10,450;4.5,30,2200;2.0,12,600"]' />

## Heatmap `t:heatmap`

Matrix heatmap, self-closing. `rows` holds grid data (`|` between rows, `,` between cols), `cols` column labels, `l` row labels (**cols count must = values per row, l count must = number of `|`-separated rows — must match or cells misalign**); color scale linearly interpolates between stops over the min→max range. Supports container-mode streaming (feed `[hrow v:"v,v,v"]` per row; hrow = heatmap row, avoids the layout `row`). In container streaming, the opening tag first draws an `l`×`cols` single-color skeleton grid; each `hrow` arriving fills that row. Value range is expand-only by default (prevents filled-cell color jitter); set `vmin`/`vmax` to lock it. A `hrow`'s `v` arriving in fragments fills cell-by-cell (no waiting for the full tag).

| Prop | Meaning | Example |
|------|---------|---------|
| `rows` | Grid data, rows via `|`, cols via `,` | `rows:"1,2,3|4,5,6"` |
| `cols` | Column labels, comma-separated | `cols:"Mon,Tue,Wed"` |
| `l` | Row labels, comma-separated | `l:"Morning,Noon,Night"` |
| `c` | Color-scale stops (comma-separated, low→high) | `c:"#bae0ff,#1677ff,#0958d9"` |
| `vmin`/`vmax` | Explicitly lock color-scale range (jitter-free streaming) | `vmin:0 vmax:100` |

<Playground dsl='[chart t:heatmap tt:一周访问热力 cols:"周一,周二,周三,周四,周五,周六,周日" l:"早,中,晚" rows:"20,35,40,45,50,80,90|60,75,80,85,90,95,98|30,50,55,60,65,70,75"]' />

## Histogram `t:histogram`

Frequency histogram, self-closing. `d` holds raw values; binning happens client-side (`bins` sets count, default ~√n), and per-bin frequency renders as bars. **Streaming WYSIWYG: range-segment labels `l:"40-50,...,90-100"` auto-lock lo/hi/bins (recommended, streaming==final); or set explicit `bins`+`min`+`max`; by default bins is fixed at first frame and lo/hi expand-only, so an expanding extremum makes bars jump once.** `bins` must = number of `l` segments.

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Raw value sequence, comma-separated | `d:"1.2,3.4,5.1,..."` |
| `bins` | Bin count, default auto; must = number of `l` segments | `bins:10` |
| `l` | Bin labels; range segments `40-50,...,90-100` auto-lock lo/hi/bins (streaming==final) | `l:"40-50,...,90-100"` |
| `min`/`max` | Explicitly lock value range (jitter-free streaming) | `min:0 max:100` |
| `ymax` | Explicitly lock frequency cap (y-axis jitter-free) | `ymax:30` |

<Playground dsl='[chart t:histogram tt:考试成绩分布 bins:8 d:"56,62,68,71,73,75,78,80,82,84,85,87,88,90,91,92,94,95,96,98,72,76,83,89,77,81,86,93,79,88"]' />

## Waterfall Chart `t:waterfall`

Increment/decrement waterfall, self-closing. `d` is a signed delta sequence; bars float cumulatively with dual color (default green/red), dashed connectors between adjacent segments — for stepping from an initial to a final value (P&L, inventory).

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Delta sequence (signed), comma-separated | `d:"100,-30,50,-15"` |
| `l` | Per-segment labels | `l:"Revenue,Cost,Profit,Tax"` |
| `c` | Positive/negative colors (first two) | `c:"#52c41a,#f5222d"` |

<Playground dsl='[chart t:waterfall tt:利润构成 c:"#52c41a,#f5222d" l:"营收,成本,毛利,费用,税费,净利" d:"100,-35,28,-12,-8,10"]' />

## Boxplot `t:boxplot`

Statistical boxplot, self-closing. `d` uses `;` between groups, each group five numbers `min,Q1,median,Q3,max`; shows distribution center, spread and range, multiple groups side-by-side.

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | Five-number list, `;` between groups, `,` inside | `d:"1,3,5,7,9;2,4,6,8,10"` |
| `l` | Group names | `l:"Group A,Group B,Group C"` |

<Playground dsl='[chart t:boxplot tt:三组成绩分布 l:"甲班,乙班,丙班" d:"45,62,72,85,98|50,65,70,82,95|40,58,68,78,92"]' />

## Treemap `t:treemap`

Proportion treemap, self-closing. `d` is `name:value` comma-separated; rectangles are split by area proportion (largest first), each tile shows name, value and share — a one-glance view of hierarchy/category proportions. Supports container-mode streaming (feed `[pt v:"name:value"]` per item).

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | `name:value` list, comma-separated | `d:"A:100,B:60,C:40"` |
| `c` | Color sequence | `c:"#1677ff,#52c41a,#faad14,#f5222d"` |

<Playground dsl='[chart t:treemap tt:市场份额（树图） c:"#1677ff,#52c41a,#faad14,#f5222d,#722ed1" d:"iOS:320,Android:580,Web:450,小程序:280,其他:150"]' />

## Sankey `t:sankey`

Flow sankey, self-closing. `nodes` lists nodes, `flows` gives `source->target:volume` (comma-separated); volume drives the connecting band width — for resource/money/user flow distribution. Supports container-mode streaming (feed `[flow v:"source->target:volume"]` per flow; nodes auto-extracted from flows, `nodes` optional). A `flow`'s `v` arriving in fragments fills flow-by-flow.

| Prop | Meaning | Example |
|------|---------|---------|
| `nodes` | Node names, comma-separated | `nodes:"A,B,C"` |
| `flows` | Flows `src->dst:vol`, comma-separated | `flows:"A->B:10,B->C:5"` |
| `c` | Per-flow colors | `c:"#1677ff,#52c41a"` |

<Playground dsl='[chart t:sankey tt:用户路径流转 c:"#1677ff,#52c41a,#faad14,#f5222d,#722ed1,#13c2c2" nodes:"首页,搜索,详情,加购,下单,支付" flows:"首页->搜索:100,首页->详情:40,搜索->详情:70,详情->加购:60,加购->下单:45,下单->支付:38,详情->下单:15"]' />

## Candlestick `t:candlestick`

OHLC candlestick, self-closing. `d` uses `;` between candles, each `open,high,low,close`; close≥open is bullish (default red), otherwise bearish (default green), with wicks and bodies — for financial quotes. Follows the Chinese convention (red=up, green=down).

| Prop | Meaning | Example |
|------|---------|---------|
| `d` | OHLC list, `;` between candles, `,` inside | `d:"10,12,8,11;11,13,9,10"` |
| `l` | Date/time labels | `l:"Mon,Tue,Wed"` |
| `c` | Bullish/bearish colors (first two, bullish red / bearish green) | `c:"#f5222d,#52c41a"` |

<Playground dsl='[chart t:candlestick tt:某股 8 日行情 l:"6/10,6/11,6/12,6/13,6/14,6/17,6/18,6/19" d:"10.2,10.8,9.8,10.5;10.5,11.2,10.3,11.0;11.0,11.5,10.7,10.9;10.9,11.3,10.6,11.1;11.1,11.6,10.9,11.4;11.4,11.7,11.0,11.2;11.2,11.4,10.8,10.9;10.9,11.3,10.7,11.2"]' />

## Progress `t:progress`

Horizontal progress bar, self-closing. Track + fill + percentage text; `v` sets current, `max`/`min` the range, `anim` animates from min to v. Lighter than gauge, good for KPI/task progress.

| Prop | Meaning | Example |
|------|---------|---------|
| `v` | Current value | `v:65` |
| `max` / `min` | Upper/lower bound, default `100` / `0` | `max:100` |
| `u` | Unit suffix; auto `%` when `min:0 max:100` | `u:pcs` |
| `l` | Prefix label | `l:Done` |
| `c` | Fill color | `c:"#1677ff"` |
| `anim` | Animation duration (ms) | `anim:1000` |

<Playground dsl='[chart t:progress tt:迭代进度 anim:1000 l:完成 v:68]' />

## Gauge `t:gauge`

Single-value gauge / KPI speedometer, self-closing. Half-circle track + value arc + needle + center number + ticks, for showing **where a single value sits in a range** (completion rate, CPU load, speed, health, compliance). Feed the value via `v`, not `d`.

| Prop | Meaning | Example |
|------|---------|---------|
| `v` | Current value (required) | `v:72` |
| `max` / `min` | Upper/lower bound, default `100` / `0` | `max:240 min:0` |
| `range` | Sweep angle: `180` (default) / `270` / `360` | `range:270` |
| `u` | Unit suffix; auto `%` when `min:0 max:100` | `u:"km/h"` |
| `dec` | Decimal places; default 1 when `span≤10` else 0 | `dec:1` |
| `status` | Semantic color + badge: `success` / `warning` / `danger` / `info` | `status:danger` |
| `c` | Custom arc color (lower priority than `status`/`zones`) | `c:"#1677ff"` |
| `zones` | **Stage band** thresholds, comma-separated; arc color follows the band the value lands in | `zones:"60,85"` |
| `zc` | Zone band colors (low→high); default green/yellow/red | `zc:"#52c41a,#faad14,#f5222d"` |
| `anim` | Number + arc + needle animation (ms, from min to v; respects reduced-motion) | `anim:1200` |
| `ticks` | Tick density, default `6` | `ticks:10` |
| `l` | Metric name (under center value) | `l:CPU Usage` |
| `sub` | Subtitle (bottom small text) | `sub:"Source: monitor"` |

> Color priority: `zones` band > `status` semantic > `c` custom > default palette. Out-of-range values clamp to `[min, max]`.

Basic gauge (status color + subtitle):

<Playground dsl='[chart t:gauge tt:CPU 使用率 status:warning sub:"数据来源: 监控系统" l:8核均值 v:72]' />

Gauge with unit (custom max & unit):

<Playground dsl='[chart t:gauge tt:当前时速 max:240 u:" km/h" status:success l:限速240 v:120]' />

**Stage bands** (compliance: thresholds 60/85 split into 3 bands, ticks auto-mark thresholds; arc color follows the band) + number animation:

<Playground dsl='[chart t:gauge tt:达标率 zones:"60,85" anim:1200 sub:"红线 85%" l:Q2目标90% v:92]' />

**Reversed palette** (error rate: high = bad, red at top; with decimals):

<Playground dsl='[chart t:gauge tt:错误率 zones:"3,8" zc:"#52c41a,#faad14,#f5222d" u:% dec:1 anim:1000 l:近1小时 v:3.4]' />

**270° gauge** (`range:270`, fuller arc):

<Playground dsl='[chart t:gauge tt:健康度 range:270 status:success anim:1000 l:满分100 v:78]' />

Multi-KPI dashboard (with grid):

<Playground dsl='[row][col span:6][chart t:gauge tt:项目完成率 w:260 h:200 v:78][/col][col span:6][chart t:gauge tt:CPU 使用率 status:danger w:260 h:200 v:92][/col][/row]' />

## Gantt `t:gantt`

Project schedule gantt, self-closing. Task bars laid out by row, with progress fill, dependency arrows, milestones and group colors. Leave `mode` empty to auto-detect (a start value containing `-` or `/` is treated as a date).

### Gantt-specific Props

| Prop | Meaning | Example |
|------|---------|---------|
| `tasks` | Task list. Each `name,start,end[,progress[,group]]`, multiple via `|` | `tasks:"需求,1,3\|开发,3,12,70,1"` |
| `gnames` | Group names, mapped by **group number** to legend text, multiple via `|`. If tasks use a group number (5th field) you must supply `gnames` or the legend shows placeholders "组1/组2" | `gnames:"设计\|开发\|测试"` |
| `deps` | Dependencies (finish→start), format `srcIdx->dstIdx`, multiple via `,`. Indices are task order (0-based) | `deps:"0->1,1->2"` |
| `ms` | Milestones. Each `name,time[,group]`, multiple via `|` | `ms:"上线,20\|验收,18"` |
| `mode` | Time mode: `days` / `dates`, empty = auto | `mode:dates` |

**Time values**: days as numbers (`1,3`); dates as `2026-06-15` or `2026/6/15`. In date mode a "today" reference line is drawn when it falls within the range.

> Click any task bar to highlight its dependency transitive closure (upstream + downstream + self) for critical-path tracing.

### Basic gantt (days mode)

`mode:days`, time values are plain numbers = day N.

<Playground dsl='[chart t:gantt tt:项目排期（天数） mode:days gnames:"需求|设计|开发|测试|部署" tasks:"需求分析,1,3|原型设计,3,6|开发实现,6,14,70|联调测试,14,18|上线部署,18,20"]' />

### Gantt with dependencies & milestones

`deps` uses `src->dst` to mean the next task starts after the prior finishes; `ms` marks key nodes as diamonds.

<Playground dsl='[chart t:gantt tt:产品迭代（含依赖） deps:"0->1,1->2,2->3" mode:days gnames:"需求|设计|开发|测试" tasks:"需求,1,3,100,0|设计,3,6,100,1|开发,6,14,80,2|测试,14,18,0,3" ms:"评审,3|联调,14|发布,18"]' />

### Date-mode gantt

`mode:dates` (or empty for `-` auto-detect), times as `YYYY-MM-DD` or `YYYY/M/D`, with a "today" dashed line.

<Playground dsl='[chart t:gantt tt:2026 Q3 排期 deps:"0->1,1->2,2->3" mode:dates gnames:"调研|设计|开发|测试" tasks:"调研,2026-07-01,2026-07-10,100,0|设计,2026-07-08,2026-07-20,80,1|开发,2026-07-15,2026-08-25,40,2|测试,2026-08-20,2026-09-05,0,3"]' />

> Full props and gantt fields are in the [DSL syntax reference](/en/guide/dsl-syntax) section 5.7; if that page isn't generated, see `demo/TOKUI_DSL_REFERENCE.md` in the repo.
