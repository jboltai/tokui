# 介绍

## 为什么需要 TokUI

大模型的输出本质是**一串纯文本**——用户最终看到的，往往是一堵密集的文字墙。

TokUI 给 AI 一种**结构化的表达语言**：用极少的 Token，流式生成可交互的富 UI。表格、图表、表单、Agent 状态、Artifact 预览，都能在对话中边生成边呈现，而不是等一段 Markdown 慢慢铺开。

一句话定位：**让 AI 用极少的 Token，流式生成富 UI**。

## 它是什么

TokUI 是一个**零依赖的流式 UI 描述与渲染框架**。三层数据流，三端零摩擦：

```
后端 TokUIBuilder 生成 DSL  →  SSE / WebSocket 推送  →  前端 TokUIParser 增量解析  →  TokUIRenderer 渲染 DOM
```

同一套组件语义贯穿前后端：Builder 链式产出 DSL，Parser 状态机增量解析，Renderer 把每个标签翻成真实 DOM。首个 Token 到达即开始绘制，无需等待整段闭合。

## 核心特性

- **流式优先** —— 状态机（TEXT / TAG_OPEN / TAG_CLOSE）增量解析，边收边渲染。完美匹配 AI 逐 Token 输出的节奏。
- **Token 经济** —— 极简 DSL（`key:value`、逗号多值、布尔属性、容器嵌套），相同 UI 的 Token 消耗远低于 HTML 或 JSON Schema。
- **零依赖** —— 前后端均为原生 API，运行时不引入任何 npm 包。图表用纯 SVG，高亮用自写 tokenizer，产物体积极小。
- **150+ 组件** —— 基础、表单、表格、布局、数据展示、图表、AI 对话全覆盖，`renderer.register(type, fn)` 插件化注册。
- **AI 对话原生** —— 内置气泡、工具调用、推理链、代码差异、Agent 状态、Artifact 预览等对话专属组件。
- **事件安全** —— 事件处理器为命名引用（`clk:` / `sub:`），需预先 `registerHandler` 注册；DSL 不含可执行代码，从根上杜绝注入。
- **主题与色阶** —— CSS 变量 + `data-tokui-theme` 一键切换深浅色，内置 HSB 算法的 10 级色阶生成器。
- **容错降级** —— 未注册组件渲染为 `div.tokui-unknown`，渲染抛错生成降级提示，单点错误不炸整页，流式始终稳健。

## 关键指标

| 指标 | 值 | 含义 |
|------|-----|------|
| 运行时 npm 依赖 | **0** | 全程原生 API |
| 已注册组件 | **150+** | 开箱即用 |
| 语法高亮语言 | **11** | 自写 tokenizer |
| 单块增量解析 | **&lt;1ms** | 首 Token 即渲染 |

## 架构概览

| 模块 | 职责 |
|------|------|
| `core/parser.js` | 流式状态机解析器，`feed()` 增量 + `parse()` 一次性，`maxBuffer` / `maxDepth` 资源防护 |
| `core/renderer.js` | 渲染引擎，`slotStack` 管嵌套容器，`VARIANTS` 白名单校验变体，深度上限 50 |
| `core/event-bus.js` | 事件总线单例，`registerHandler(name, fn)` 注册，DSL 用 `clk:` / `sub:` 绑定 |
| `core/theme.js` | CSS 变量驱动主题，`data-tokui-theme` 切换 |
| `core/color-generator.js` | HSB 算法 10 级色板与主题 token 生成器 |
| `components/*` | 按类型分文件的组件库，`index.js` 统一注册 |
| `server/tokui-builder.js` | 链式 API 生成 DSL，`toString()` + `toChunks()` 两种输出 |
| `server/sse-server.js` | Node 原生 http 实现的 SSE 演示服务器 |

## 试一下

下面是一个典型的 TokUI 渲染结果，可以直接编辑左侧 DSL，右侧实时预览：

<Playground dsl='[card tt:"TokUI 一览" v:highlight][row][col span:7][h3 📊 数据表格][table stripe][thead cols:"chk,#,指标/c,数值,趋势/r"][tbody][tr chk,,月活,128k,↑12%][tr chk,,留存,64%,↑3%][tr chk,,收入,¥39w,↑18%][/tbody][/table][/col][col span:5][h3 📈 趋势][chart t:line tt:"近 6 月" l:"1月,2月,3月,4月,5月,6月" d:"42,55,48,70,82,95" area][/col][/row][callout t:info tt:零依赖 tx:"上述表格、图表、卡片全部由约 20 个 Token 的 DSL 流式渲染，无任何前端依赖。"][/card]' />
