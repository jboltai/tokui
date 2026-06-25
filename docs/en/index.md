---
layout: home

title: TokUI
titleTemplate: Stream rich UI from minimal tokens

hero:
  name: TokUI
  text: From Token to UI
  tagline: The world's first For AI & zero-dependency streaming UI framework. Describe components with a minimal DSL on the backend, push over SSE or WebSocket, and render incrementally on the frontend — the first token starts painting the DOM, letting AI produce more flexible, expressive UI with minimal tokens.
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: Components
      link: /en/components/basic
    - theme: alt
      text: DSL Syntax
      link: /en/guide/dsl-syntax

features:
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>'
    title: Streaming First
    details: State-machine incremental parsing — render as bytes arrive. The first character starts painting the DOM, no need to wait for the full response. A perfect match for token-by-token AI output.
    link: /en/guide/streaming
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1Z"/><path d="M21 14h-7a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1Z"/></svg>'
    title: 150+ Components
    details: Basic, form, table, layout, chart, and AI-chat coverage out of the box. Markdown, syntax highlighting, agent status, artifact preview and more.
    link: /en/components/basic
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" x2="2" y1="8" y2="22"/><line x1="17.5" x2="9" y1="15" y2="15"/></svg>'
    title: Zero Dependencies
    details: Native APIs front and back, no npm packages at runtime. Charts are pure SVG, highlighting is a hand-written tokenizer, the bundle stays tiny.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>'
    title: Theming & Palettes
    details: CSS variables + data-tokui-theme toggle light/dark, with a built-in HSB 10-step palette generator — feed one primary color, get a full design-token set.
    link: /en/guide/theming
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    title: Event Safety
    details: Event handlers are named references (clk / sub) that must be registered first. The DSL carries no executable code, eliminating injection at the root.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>'
    title: Graceful Degradation
    details: Unknown components render as div.tokui-unknown, render errors produce a fallback notice. A single failure never breaks the page — streaming stays robust.
---

<!-- ==================== Signature Playground: code ↔ render ==================== -->
<div class="home-signature">
  <div class="home-section-eyebrow">Live Demo</div>
  <h2 class="home-section-title">One line of DSL, one component</h2>
  <p class="home-section-lead">On the left is the TokUI DSL source (auto-formatted + syntax highlighted); on the right is the real DOM it renders. Hit "Edit" to tweak it live.</p>

  <Playground dsl='[card tt:"TokUI 一览" v:highlight][row][col span:7][h3 📊 数据表格][table stripe][thead cols:"chk,#,指标/c,数值,趋势/r"][tbody][tr chk,,月活,128k,↑12%][tr chk,,留存,64%,↑3%][tr chk,,收入,¥39w,↑18%][/tbody][/table][/col][col span:5][h3 📈 趋势][chart t:line tt:"近 6 月" l:"1月,2月,3月,4月,5月,6月" d:"42,55,48,70,82,95" area][/col][/row][callout t:info tt:零依赖 tx:"上述表格、图表、卡片全部由 ~20 个 Token 的 DSL 流式渲染，无任何前端依赖。"][/card]' />

  <Playground dsl='[bubble role:ai][p 你好！我可以把回答渲染成富 UI，而不只是纯文本：][suggestions cols:2][suggestion tt:📊 数据看板 tx:用表格+图表呈现分析结果 clk:picks][suggestion tt:📝 结构化表单 tx:收集用户输入 clk:picks][suggestion tt:🤖 Agent 状态 tx:展示工具调用与推理 clk:picks][suggestion tt:🎨 成品卡片 tx:图文混排信息卡 clk:picks][/suggestions][/bubble]' />
</div>

<!-- ==================== Key metrics ==================== -->
<div class="home-metrics">
  <a class="home-metric" href="/en/guide/getting-started">
    <div class="home-metric-num">0</div>
    <div class="home-metric-label">Runtime npm deps</div>
  </a>
  <a class="home-metric" href="/en/components/basic">
    <div class="home-metric-num">150<span>+</span></div>
    <div class="home-metric-label">Registered components</div>
  </a>
  <a class="home-metric" href="/en/components/basic#代码块与高亮">
    <div class="home-metric-num">11</div>
    <div class="home-metric-label">Languages highlighted</div>
  </a>
  <a class="home-metric" href="/en/guide/streaming">
    <div class="home-metric-num">&lt;1<span>ms</span></div>
    <div class="home-metric-label">Per-chunk parse</div>
  </a>
</div>

<!-- ==================== Why TokUI ==================== -->
<div class="home-why">
  <div class="home-section-eyebrow">Why TokUI</div>
  <h2 class="home-section-title">The streaming UI framework for the AI era</h2>
  <p class="home-section-lead">LLMs emit plain text, leaving users staring at a wall of words. TokUI gives the model a structured expression language: stream rich, interactive UI from minimal tokens.</p>

  <div class="home-why-grid">
    <div class="home-why-card">
      <div class="home-why-icon">🌊</div>
      <h3>True streaming</h3>
      <p>A state-machine incremental parser — a <code>[card tt:…]</code> tag creates its container on arrival, children fill in as they come. No waiting for close tags; first paint is instant.</p>
    </div>
    <div class="home-why-card">
      <div class="home-why-icon">💴</div>
      <h3>Token economy</h3>
      <p>Minimal DSL syntax (<code>key:value</code>, comma multi-values, boolean attrs) — the same UI costs far fewer tokens than HTML or a JSON schema.</p>
    </div>
    <div class="home-why-card">
      <div class="home-why-icon">🔌</div>
      <h3>Three-tier, zero friction</h3>
      <p>Server <code>TokUIBuilder</code> chains the DSL → SSE push → frontend <code>TokUI</code> incremental render. One component vocabulary across the stack.</p>
    </div>
    <div class="home-why-card">
      <div class="home-why-icon">🧠</div>
      <h3>AI-scene components</h3>
      <p>Built-in tool-call, thought chain, code diff, agent status, artifact preview and more — the interaction patterns of mainstream AI products, ready to go.</p>
    </div>
  </div>
</div>

<!-- ==================== Component categories ==================== -->
<div class="home-cats">
  <div class="home-section-eyebrow">Components</div>
  <h2 class="home-section-title">Seven categories, the UI you have in mind</h2>
  <p class="home-section-lead">Every category ships full docs: prop tables, variant notes, and editable live examples.</p>

  <div class="home-cat-grid">
    <a class="home-cat" href="/en/components/basic">
      <span class="home-cat-icon">🔤</span>
      <span class="home-cat-name">Basic</span>
      <span class="home-cat-desc">Headings, buttons, tags, callouts, progress, stats, Markdown, code highlight</span>
    </a>
    <a class="home-cat" href="/en/components/form">
      <span class="home-cat-icon">📝</span>
      <span class="home-cat-name">Form</span>
      <span class="home-cat-desc">Input, select, switch, slider, rate, date, cascader, transfer, upload</span>
    </a>
    <a class="home-cat" href="/en/components/layout">
      <span class="home-cat-icon">📐</span>
      <span class="home-cat-name">Layout</span>
      <span class="home-cat-desc">Card, grid, tabs, collapse, drawer, dialog, timeline, tree</span>
    </a>
    <a class="home-cat" href="/en/components/data">
      <span class="home-cat-icon">📊</span>
      <span class="home-cat-name">Data Display</span>
      <span class="home-cat-desc">Table, descriptions, pagination, badge, avatar, skeleton, result, empty</span>
    </a>
    <a class="home-cat" href="/en/components/chart">
      <span class="home-cat-icon">📈</span>
      <span class="home-cat-name">Chart</span>
      <span class="home-cat-desc">Bar, line, pie, radar, scatter, gantt, funnel — pure SVG, zero deps</span>
    </a>
    <a class="home-cat" href="/en/components/ai-chat">
      <span class="home-cat-icon">🤖</span>
      <span class="home-cat-name">AI Chat</span>
      <span class="home-cat-desc">Bubble, tool-call, thought chain, diff, plan, terminal, sandbox, artifact</span>
    </a>
    <a class="home-cat" href="/en/components/showcase">
      <span class="home-cat-icon">✨</span>
      <span class="home-cat-name">Showcase</span>
      <span class="home-cat-desc">Signup form, CRUD, form+table linkage, report-style finished cards</span>
    </a>
  </div>
</div>

<!-- ==================== CTA ==================== -->
<div class="home-cta">
  <h2 class="home-cta-title">Ship your first streaming UI in 3 minutes</h2>
  <p class="home-cta-lead">Import the build, mount a container, feed data — that simple.</p>
  <div class="home-cta-actions">
    <a class="home-cta-btn home-cta-btn--primary" href="/en/guide/getting-started">Read the quick start →</a>
    <a class="home-cta-btn" href="/en/guide/dsl-syntax">DSL syntax cheat sheet</a>
  </div>
</div>
