# Changelog

All notable changes to this project will be documented in this file.

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
