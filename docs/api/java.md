# Java SDK

> 🚧 **正在迭代开发中**　·　状态：规划中
>
> 本页描述的 API 尚在设计中，**尚未实现**。如有意向参与或反馈需求，欢迎在 [GitHub Issues](https://github.com/jboltai/tokui/issues) 留言。

## 定位

Java SDK 将提供与 Node.js [`TokUIBuilder`](./builder) 对齐的链式 API，用于在 Java / Spring 等服务端生成 TokUI DSL 字符串，配合 SSE 推送到前端。

## 拟议用法

> 以下为设计草案，最终 API 可能调整。

```java
TokUIBuilder b = new TokUIBuilder();
b.card(Map.of("tt", "卡片")).h2("内容").p("描述").end();
System.out.println(b.toString());
// [card tt:卡片][h2 内容][p 描述][/card]
```

分块输出配合 Spring SSE 推流：

```java
List<String> chunks = b.reset()
    .card(Map.of("tt", "卡片"))
    .p("内容")
    .end()
    .toChunks();
// 作为 Flux<String> 逐块推送
```

## 能力范围（对齐 Node.js 版）

- 链式调用：自闭合 / 容器（`open` / `end`）
- `toString()` 一次性输出、`toChunks()` 分块 `List<String>`
- 自动闭合未关闭容器
- 命名避让：`rowLayout()` / `colLayout()`

## 进度

- [ ] 核心链式 API
- [ ] 自动闭合 / 分块输出
- [ ] 与 Node.js 版的输出一致性测试
- [ ] Maven Central 发布

完整能力参考见 [Node.js Builder 文档](./builder)。
