# Admin Shell (Admin Pack · M2)

The `page` application-shell family for admin CRUD layouts ("list page + dialogs + detail drawer"). It fills hosts with a definite height (`height:100%`) or sizes naturally otherwise (with a `min-height` floor); all styling derives from theme tokens, so it works across all built-in themes.

## page — application shell

A grid-areas skeleton: `header` spans the top, `sidebar + content` form two columns below. Direct children are expected to be the three-part set; any other child falls back into the main area via CSS (non-canonical — lint will warn).

| Attr | Notes | Default |
|---|---|---|
| `w` | sidebar width px (140~480; invalid values silently ignored) | 240 |
| `theme` | subtree theme (default/dark/modern/modern-dark/tech) | — |

```html
[page w:240]
  [page-header …][/page-header]
  [page-sidebar …][/page-sidebar]
  [page-content] …main area… [/page-content]
[/page]
```

## page-header — page header

Left side "breadcrumb + title", right side an action slot (children such as btn land on the right). `[upd id:x tt/bc:new]` updates in place.

| Attr | Notes |
|---|---|
| `tt` | page title |
| `bc` | comma-leveled breadcrumb (`Home,System,Users`; last item auto-marked current) |
| `sticky` | boolean, stick to top while the host scrolls |

## page-sidebar — sidebar

Brand row (`tt`) + collapse toggle (panel-left icon) + scrollable body (children). The toggle drives the `page` column-width transition (240px ⇄ 64px icon rail) and reports `toggle {folded}`; standalone usage outside `page` collapses its own class without breaking.

## page-content — main area

Thin wrapper: vertical stacking + own scrolling + overflow clipping guard (tall content never spills).

## page-tabs / page-tab — multi tabs

```html
[page-tabs act:list on:"change:onTab,close:onTabClose"]
  [page-tab n:list tt:Users] …content… [/page-tab]
  [page-tab n:detail tt:Detail closeable] …content… [/page-tab]
[/page-tabs]
```

| Attr | Notes |
|---|---|
| `act` | initially active tab key (falls back to the first enabled tab on miss; disabled tabs skipped) |
| `n` / `tt` | tab key / title (`n` defaults to `tt`) |
| `closeable` | boolean, closable (× reports `close {key,title}` and activates a neighbor) |
| `dis` | disabled tab |

- Clicking a tab reports `change {key,title}`; `[upd id:tabs act:key]` switches **silently** (same contract as `tabs`, no echo);
- `[del id:tabX]` removes the **whole tab** (button + panel share one wrapper — deletion works natively);
- Keyboard `←/→` navigates tabs; during streaming, newly arrived tabs follow-active and the stream close snaps back to `act`.

## Menu ↔ breadcrumb linkage pattern

The `menu` `change` payload is `{value, item, path}` (path = title path array; single segment for flat menus). One `upd` syncs the header breadcrumb:

```js
TokUI.registerHandler('onMenu', (d) => {
  TokUI.getInstance().push('[upd id:pageHeader bc:' + ['Home'].concat(d.path).join(',') + ']');
});
```

## Composition pattern

```html
[page]
  [page-header tt:Users bc:"Home,System,Users" sticky][btn t:primary Add clk:add][/page-header]
  [page-sidebar tt:Console][menu act:users][menu-item tx:Users i:👥 v:users][/menu][/page-sidebar]
  [page-content]
    [page-tabs act:list]
      [page-tab n:list tt:Users][table cols:"Name,Dept,Status" stripe]…[/table][/page-tab]
      [page-tab n:stat tt:Stats closeable][kpi tt:Total v:1286 unit:users][/page-tab]
    [/page-tabs]
  [/page-content]
[/page]
```

Live demo: gallery "Admin Shell / Page Tabs" cases.
