---
layout: home

title: TokUI
titleTemplate: 全球首个 For AI & 零依赖的流式 UI 描述与渲染框架。让 AI 用极少的 Token，流式生成富 UI，让AI意图表达更清晰。

hero:
  name: TokUI
  text: From Token to UI
  tagline: 全球首个 For AI & 零依赖的流式 UI 描述与渲染框架。后端用极简 DSL 描述组件，经 SSE 或 WebSocket 流式推送，前端增量解析、首个 Token 即开始渲染 —— 让 AI 使用极少的 Token 去输出更灵活、更具表现力的 UI。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 组件总览
      link: /components/basic
    - theme: alt
      text: DSL 语法
      link: /guide/dsl-syntax

features:
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>'
    title: 流式优先
    details: 状态机增量解析，边收边渲染。首个字符到达即开始绘制 DOM，无需等待整段响应，完美匹配 AI 对话的逐 Token 生成。
    link: /guide/streaming
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1Z"/><path d="M21 14h-7a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1Z"/></svg>'
    title: 150+ 组件
    details: 基础、表单、表格、布局、图表、AI 对话全覆盖。Markdown、代码高亮、Agent 状态、Artifact 预览等场景组件开箱即用。
    link: /components/basic
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" x2="2" y1="8" y2="22"/><line x1="17.5" x2="9" y1="15" y2="15"/></svg>'
    title: 零依赖
    details: 前后端均为原生 API，运行时不引入任何 npm 包。图表用纯 SVG，高亮用自写 tokenizer，产物体积极小。
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>'
    title: 主题与色阶
    details: CSS 变量 + data-tokui-theme 一键切换深浅色，内置 HSB 算法的 10 级色阶生成器，输入一个主色即得整套设计 Token。
    link: /guide/theming
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    title: 事件安全
    details: "事件处理器为命名引用（clk: / sub:），需预先 registerHandler 注册。DSL 不含可执行代码，从根上杜绝注入。"
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>'
    title: 容错降级
    details: 未注册组件渲染为 div.tokui-unknown，渲染抛错生成降级提示。单点错误不炸整页，流式过程始终稳健。
---

<!-- ==================== 签名 Playground：代码 ↔ 渲染 ==================== -->
<div class="home-signature">
  <div class="home-section-eyebrow">实时演示</div>
  <h2 class="home-section-title">一行 DSL，一个组件</h2>
  <p class="home-section-lead">左侧是 TokUI DSL 源码（自动格式化 + 语法高亮），右侧是它渲染出的真实 DOM。点「编辑」即可即时改动。</p>

  <Playground dsl='[card tt:"TokUI 一览" v:highlight][row][col span:7][h3 📊 数据表格][table stripe][thead cols:"chk,#,指标/c,数值,趋势/r"][tbody][tr chk,,月活,128k,↑12%][tr chk,,留存,64%,↑3%][tr chk,,收入,¥39w,↑18%][/tbody][/table][/col][col span:5][h3 📈 趋势][chart t:line tt:"近 6 月" l:"1月,2月,3月,4月,5月,6月" d:"42,55,48,70,82,95" area][/col][/row][callout t:info tt:零依赖 tx:"上述表格、图表、卡片全部由 ~20 个 Token 的 DSL 流式渲染，无任何前端依赖。"][/card]' />

  <Playground dsl='[bubble role:ai][p 你好！我可以把回答渲染成富 UI，而不只是纯文本：][suggestions cols:2][suggestion tt:📊 数据看板 tx:用表格+图表呈现分析结果 clk:picks][suggestion tt:📝 结构化表单 tx:收集用户输入 clk:picks][suggestion tt:🤖 Agent 状态 tx:展示工具调用与推理 clk:picks][suggestion tt:🎨 成品卡片 tx:图文混排信息卡 clk:picks][/suggestions][/bubble]' />
</div>

<!-- ==================== 核心指标 ==================== -->
<div class="home-metrics">
  <a class="home-metric" href="/guide/getting-started">
    <div class="home-metric-num">0</div>
    <div class="home-metric-label">运行时 npm 依赖</div>
  </a>
  <a class="home-metric" href="/components/basic">
    <div class="home-metric-num">150<span>+</span></div>
    <div class="home-metric-label">已注册组件</div>
  </a>
  <a class="home-metric" href="/components/basic#代码块与高亮">
    <div class="home-metric-num">11</div>
    <div class="home-metric-label">语言语法高亮</div>
  </a>
  <a class="home-metric" href="/guide/streaming">
    <div class="home-metric-num">&lt;1<span>ms</span></div>
    <div class="home-metric-label">单块增量解析</div>
  </a>
</div>

<!-- ==================== 为什么选 TokUI ==================== -->
<div class="home-why">
  <div class="home-section-eyebrow">为什么是 TokUI</div>
  <h2 class="home-section-title">AI 时代的流式 UI 框架</h2>
  <p class="home-section-lead">大模型输出纯文本，用户得到的是一堵文字墙。TokUI 给 AI 一种结构化的表达语言：用极少的 Token，流式生成可交互的富 UI。</p>

  <div class="home-why-grid">
    <div class="home-why-card">
      <div class="home-why-icon">🌊</div>
      <h3>真·流式渲染</h3>
      <p>基于状态机的增量解析器，<code>[card tt:...]</code> 标签到达即可创建容器，子节点陆续填充。无需等待闭合，首屏即现。</p>
    </div>
    <div class="home-why-card">
      <div class="home-why-icon">💴</div>
      <h3>Token 经济</h3>
      <p>极简 DSL 语法（<code>key:value</code>、逗号多值、布尔属性），相同 UI 的 Token 消耗远低于 HTML 或 JSON Schema。</p>
    </div>
    <div class="home-why-card">
      <div class="home-why-icon">🔌</div>
      <h3>三端零摩擦</h3>
      <p>服务端 <code>TokUIBuilder</code> 链式生成 DSL → SSE 推送 → 前端 <code>TokUI</code> 增量渲染。前后端同一套组件语义。</p>
    </div>
    <div class="home-why-card">
      <div class="home-why-icon">🧠</div>
      <h3>AI 场景组件</h3>
      <p>内置工具调用、推理链、代码差异、Agent 状态、Artifact 预览等对话专属组件，覆盖主流 AI 产品的交互形态。</p>
    </div>
  </div>
</div>

<!-- ==================== 组件分类速览 ==================== -->
<div class="home-cats">
  <div class="home-section-eyebrow">组件总览</div>
  <h2 class="home-section-title">七大类，覆盖你能想到的 UI</h2>
  <p class="home-section-lead">每一类都有完整文档：属性表、变体说明、可编辑的实时示例。</p>

  <div class="home-cat-grid">
    <a class="home-cat" href="/components/basic">
      <span class="home-cat-icon">🔤</span>
      <span class="home-cat-name">基础组件</span>
      <span class="home-cat-desc">标题、按钮、标签、提示、进度、统计、Markdown、代码高亮</span>
    </a>
    <a class="home-cat" href="/components/form">
      <span class="home-cat-icon">📝</span>
      <span class="home-cat-name">表单控件</span>
      <span class="home-cat-desc">输入、选择、开关、滑块、评分、日期、级联、穿梭、上传</span>
    </a>
    <a class="home-cat" href="/components/layout">
      <span class="home-cat-icon">📐</span>
      <span class="home-cat-name">布局容器</span>
      <span class="home-cat-desc">卡片、栅格、标签页、折叠、抽屉、对话框、时间轴、树</span>
    </a>
    <a class="home-cat" href="/components/data">
      <span class="home-cat-icon">📊</span>
      <span class="home-cat-name">数据展示</span>
      <span class="home-cat-desc">表格、描述列表、分页、徽标、头像、骨架、结果、空状态</span>
    </a>
    <a class="home-cat" href="/components/chart">
      <span class="home-cat-icon">📈</span>
      <span class="home-cat-name">图表</span>
      <span class="home-cat-desc">柱、折、饼、雷达、散点、甘特、漏斗，纯 SVG 零依赖</span>
    </a>
    <a class="home-cat" href="/components/ai-chat">
      <span class="home-cat-icon">🤖</span>
      <span class="home-cat-name">AI 对话</span>
      <span class="home-cat-desc">气泡、工具调用、推理链、差异、计划、终端、沙盒、Artifact</span>
    </a>
    <a class="home-cat" href="/components/showcase">
      <span class="home-cat-icon">✨</span>
      <span class="home-cat-name">综合案例</span>
      <span class="home-cat-desc">注册表单、CRUD、表单+表格联动、报告类成品</span>
    </a>
  </div>
</div>

<!-- ==================== 底部 CTA ==================== -->
<div class="home-cta">
  <h2 class="home-cta-title">3 分钟，跑起第一个流式 UI</h2>
  <p class="home-cta-lead">引入构建产物、挂载容器、喂数据 —— 就这么简单。</p>
  <div class="home-cta-actions">
    <a class="home-cta-btn home-cta-btn--primary" href="/guide/getting-started">查看快速开始 →</a>
    <a class="home-cta-btn" href="/guide/dsl-syntax">DSL 语法速查</a>
  </div>
</div>
