# 安全策略

TokUI 把 AI / 服务端生成的 DSL 字符串渲染为真实 DOM，**注入面是首要安全考量**。本文档说明安全模型与漏洞上报流程。

## 支持版本

| 版本 | 支持状态 |
|------|--------|
| 0.1.x | ✅ 安全修复 |

## 安全模型

### 事件处理器：命名引用，无代码注入

DSL 中的 `clk:`/`sub:` 只能引用**预先用 `registerHandler(name, fn)` 注册的函数名**，不允许在 DSL 里写可执行代码。即使 DSL 来自不可信来源，也无法调用未注册的处理函数。

```js
TokUI.registerHandler('doLogin', (data, event, element) => { /* ... */ });
// DSL: [btn clk:doLogin 登录]  —— 只能调 doLogin，不能写 clk:alert(1)
```

### innerHTML 受限

`innerHTML` 仅用于：
- `md`（Markdown）组件 —— 经过转义
- 可信代码块（`code` 等）的高亮输出 —— 经 `escapeHtml` 转义

其余所有组件一律用 `textContent`，杜绝 HTML 注入。

### 原型链污染防护

事件总线（`event-bus.js`）的 `DANGEROUS_NAMES` Set 屏蔽 `__proto__` / `constructor` / `prototype` 等危险名，防止原型链污染。

### 资源耗尽防护

解析器的 `maxBuffer`（默认 1MB）与 `maxDepth`（默认 100）防止恶意 / 超长输入导致内存耗尽或栈溢出。渲染器深度上限 50。

### XSS 过滤

`renderer.el()` 过滤 `on*` 事件属性与 `formaction`，防止属性级 XSS。

## 不可信内容的安全建议

- AI / LLM 输出的 DSL 视为**半可信**：组件类型与属性受限（白名单 + 命名处理器），但文本内容仍应来自受控来源。
- 用户上传 / 第三方拼接的 DSL 视为**不可信**：渲染到受限容器，不要把 DSL 内容直接当作可信 HTML。
- 如需渲染用户 Markdown，`md` 组件已转义；但请审计你的处理器注册逻辑，避免处理器被诱导执行敏感操作。

## 上报漏洞

**请不要通过公开 Issue 上报安全漏洞。**

请私下联系：

- 邮箱：mumengmeng@vecspc.com
- 主题前缀：`[SECURITY] TokUI`

请在邮件中说明：
1. 受影响版本与组件
2. 复现步骤（最小 DSL 片段）
3. 影响评估（XSS / 原型污染 / 资源耗尽 / 其他）

我们会在 **72 小时内**确认收悉，并在修复后致谢上报者（除非你希望匿名）。

## 已知缓解

| 风险 | 缓解措施 |
|------|---------|
| XSS（事件属性） | `el()` 过滤 `on*` / `formaction` |
| XSS（HTML 注入） | 非 md/code 组件强制 `textContent` |
| 原型链污染 | `DANGEROUS_NAMES` 屏蔽 |
| ReDoS / 资源耗尽 | `maxBuffer` / `maxDepth` / 渲染深度上限 50 |
| 任意代码执行 | 事件处理器命名引用，禁止 DSL 内联代码 |
