# Dashboard Components (Dashboard Pack)

The M1 component family for data dashboards: `panel` (tech border container), `kpi` (metric card), `flip-num` (flip counter), `scrollboard` (auto-scrolling leaderboard), and `fit-screen` (big-screen scaler) — together with the [`tech` theme](/en/guide/theming#built-in-themes) and the [`chart t:map` China map](/en/components/chart), they form the complete ChatBI dashboard capability.

## panel — tech border container

```html
[panel tt:Workshop Output v:corner]…children…[/panel]
```

| Attr | Notes |
|------|-------|
| `tt` | header text (with flanking decorative lines) |
| `v` | `corner` corner brackets / `glow` glow (tech tokens) / `plain` borderless transparent |
| `theme` | subtree theme (`theme:tech` switches to the tech look) |

## kpi — metric card

```html
[kpi tt:Today output v:12846 unit:units trend:12.4 icon:trending-up clk:drill]footnote[/kpi]
[kpi tt:OEE v:92.7 suf:% trend:-1.2 t:danger]
```

- Eased count-up animation (easeOutExpo; degrades instantly under `prefers-reduced-motion`);
- `trend:12.4` / `-1.2` / `up` / `down` renders an auto-colored ↑↓ badge (minus sign becomes ↓);
- `t:danger/success/warning` state colors for value & icon; `icon:` uses a built-in icon;
- `[upd id:x v:new trend:up tt:New]` updates go through the same animation path.

## flip-num — flip counter

```html
[flip-num v:"8,642,918" s:lg dur:600]
```

Digit-by-digit 3D flipping (ten-face reel + cubic-bezier transition); the value string may contain commas / decimal points / percent signs (auto separators); `s:sm/lg` sizes; `[upd v:]` rolls digits to the new value; reduced-motion falls back to static.

## scrollboard — auto-scrolling leaderboard

```html
[scrollboard h:264 speed:36 cols:"Team,Orders,WoW" rows:"LineA,128,↑12|LineB,96,↓3"]
  [tr appended,55,↑9]
[/scrollboard]
```

`rows:"a,1,↑2|b,2,↓3"` shorthand plus `[tr]` child rows; rAF constant-speed upward scroll with hover pause and seamless looping (auto-clones when content is shorter than the viewport); cells starting with ↑↓ are auto-colored; `speed:0` freezes; row clicks report through `clk` (`data-value` = first cell); empty state uses i18n.

## fit-screen — big-screen scaler

```html
[fit-screen w:1920 h:1080 mode:scale]…content laid out on the design canvas…[/fit-screen]
```

Content is laid out on a `w×h` design canvas (default 1920×1080) and scales with its host area:

| mode | Behavior | Best for |
|------|----------|----------|
| `scale` (default) | proportional, centered, letterboxed | monitoring walls (fixed ratio) |
| `width` | scale-to-width, hugs content height; with `maxh:` viewport cap (px) overflow scrolls vertically | long lists / capped scroll areas |
| `full` | stretch both axes to fill | when ratio may vary |

ResizeObserver recomputes on host resize (unbound via `_registerCleanup`); **the host area must have a definite height**; overlays need no coordinate correction — `getBoundingClientRect` returns post-transform visual coordinates.

## Streaming Skeleton Placeholders (grid areas)

When a `grid` with `areas` mounts during SSE streaming, skeleton placeholders are laid out per named area immediately — the layout is final from the first frame, each block shimmering while waiting. Real `[cell area:name]` nodes replace their placeholder in place; unnamed cells clear all placeholders (graceful fallback); unfilled areas are cleaned on stream close. Opt out with `skel:"false"`.

## Composition recipe (golden benchmark)

```html
[fit-screen w:1920 h:1080 mode:scale]
  [grid cols:"300px 1fr 360px" areas:"kpi main map|kpi trend map" theme:tech]
    [cell area:kpi][panel tt:Core metrics v:corner][kpi …]…[/panel][/cell]
    [cell area:main][panel tt:Live value v:glow][flip-num v:"8,642,918" s:lg][/panel][/cell]
    [cell area:map][panel tt:Regional map v:corner][chart t:map region:"Zhejiang:86|Jiangsu:74" …][/panel][/cell]
  [/grid]
[/fit-screen]
```

Live demos: gallery cases “Dashboard Kit / China Map / Fit Screen / Motion & Gradient / ChatBI Big Screen”.

## chart t:map — China map

See [Charts · China Map](/en/components/chart). `region:"Zhejiang:86|Jiangsu:74"` province heat (34 regions incl. HK/Macau/Taiwan, short or full names), `d:"lng,lat,val,name:city"` scatter layer; plus `label` 3-mode annotations, `unit`, hover multi-line tooltip with dim-others emphasis, province-click `mapClick` reporting (drill-down), bottom-left visualMap scale bar, and the bottom-right South China Sea inset (nine-dash line + four island groups).


## Chart animation & gradient

- Enter animation: on by default (whole-chart fade + rise + micro-scale, first render only; `enter:"false"` disables per chart; `prefers-reduced-motion` disables globally);
- `grad` boolean: linear gradient fill per series color (bar/area/donut and other filled types).
