# 后台应用壳（Admin Pack · M2）

`page` 应用壳六件套，面向「列表页 + 弹窗 + 详情」的后台 CRUD 布局。宿主容器有确定高度时自动铺满（`height:100%`），否则按内容自然高度（内置 `min-height` 兜底）；样式全走主题令牌，四主题通用。

## page 应用壳

grid areas 三行两列骨架：`header` 横贯顶部，`sidebar + content` 两列于下。子元素约定为三件套，其余子元素 CSS 兜底落主区（不规范写法，lint 会告警）。

| 属性 | 说明 | 默认 |
|---|---|---|
| `w` | 侧栏宽 px（140~480，非法值静默忽略） | 240 |
| `theme` | 子树主题（default/dark/modern/modern-dark/tech） | — |

```html
[page w:240]
  [page-header …][/page-header]
  [page-sidebar …][/page-sidebar]
  [page-content] …主区… [/page-content]
[/page]
```

## page-header 页头

左侧「面包屑 + 标题」、右侧动作插槽（子节点如 btn 落右侧）。`[upd id:x tt/bc:新值]` 就地更新。

| 属性 | 说明 |
|---|---|
| `tt` | 页面标题 |
| `bc` | 逗号分级面包屑（`首页,系统,用户`，末项自动标记当前页） |
| `sticky` | 布尔，吸顶（宿主滚动时） |

## page-sidebar 侧栏

品牌行（`tt`）+ 折叠钮（icon panel-left）+ 滚动主体（子节点）。折叠钮联动 `page` 的列宽过渡（240px ⇄ 64px 图标导航），上报 `toggle {folded}`；脱离 `page` 单独使用时折叠自身类，不崩。

## page-content 主区

薄包装：纵向排列 + 自滚动 + overflow 裁剪防护（内容超高不外溢）。

## page-tabs / page-tab 多页签

```html
[page-tabs act:列表 on:"change:onTab,close:onTabClose"]
  [page-tab n:列表 tt:用户列表] …内容… [/page-tab]
  [page-tab n:详情 tt:详情 closeable] …内容… [/page-tab]
[/page-tabs]
```

| 属性 | 说明 |
|---|---|
| `act` | 初始激活页签 key（未命中回落首个可用，禁用项跳过） |
| `n` / `tt` | 页签 key / 标题（`n` 缺省用 `tt`） |
| `closeable` | 布尔，可关闭（× 上报 `close {key,title}` 并激活让位邻签） |
| `dis` | 禁用页签 |

- 点击页签上报 `change {key,title}`；`[upd id:tabs act:key]` 程序化切换**静默**（与 tabs 组件一致，防回环）；
- `[del id:tabX]` **整签移除**（按钮+面板一体包装，天然支持）；
- 键盘 `←/→` 页签间导航；流式输出时新页签跟随激活，流闭合按 `act` 归位。

## 菜单 ↔ 面包屑联动范式

`menu` 的 `change` 载荷为 `{value, item, path}`（path 为各级标题路径数组，扁平菜单单段）。宿主一条 `upd` 同步页头面包屑：

```js
TokUI.registerHandler('onMenu', (d) => {
  // path 拼面包屑：首页 + 菜单路径
  TokUI.getInstance().push('[upd id:pageHeader bc:' + ['首页'].concat(d.path).join(',') + ']');
});
```

## 组合范式

```html
[page]
  [page-header tt:用户管理 bc:"首页,系统,用户" sticky][btn t:primary 新增用户 clk:add][/page-header]
  [page-sidebar tt:运营后台][menu act:users][menu-item tx:用户管理 i:👥 v:users][/menu][/page-sidebar]
  [page-content]
    [page-tabs act:list]
      [page-tab n:list tt:用户列表][table cols:"姓名,部门,状态" stripe]…[/table][/page-tab]
      [page-tab n:stat tt:统计概览 closeable][kpi tt:总用户 v:1286 unit:人][/page-tab]
    [/page-tabs]
  [/page-content]
[/page]
```

在线演示：组件画廊「后台应用壳 / 多页签」案例。
