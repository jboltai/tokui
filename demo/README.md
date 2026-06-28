# TokUI Demo（独立演示）

TokUI 的独立演示包：**组件画廊 + AI 对话式 SSE 流式渲染**。整个 `demo/` 目录自包含，可从主项目中单独取出运行，不依赖外层 `src/` 或 `dist/`。

## 特性

- 🎨 **组件画廊** —— 全量 TokUI 组件展示，左侧分类导航 + 搜索
- 💬 **AI 对话流式** —— 模拟后端 SSE 流式推送 DSL，前端实时增量渲染
- 🌗 **主题切换** —— default / dark / modern / modern-dark
- 🌐 **中英双语** —— 一键切换
- 📦 **零依赖** —— Node.js 原生 `http`，无需 `npm install`

## 快速开始

```bash
# 方式一：管理脚本（推荐，支持 start/stop/restart/status，端口占用自动处理）
./demo.sh start          # 启动 → http://localhost:3109
./demo.sh stop           # 停止
./demo.sh restart        # 重启
./demo.sh status         # 查看状态

# 方式二：npm 脚本
npm start                # 等价于 node server/sse-server.js

# 方式三：直接跑
node server/sse-server.js
```

启动后浏览器打开 **http://localhost:3109** 。

> **端口占用**：`3109` 被占时，`demo.sh start`/`restart` 会自动杀掉占用进程再启动；直接 `node` 启动时 `sse-server.js` 内部也有同样的自动释放逻辑。

## 目录结构

```
demo/
├── demo.sh                 # 管理脚本（start/stop/restart/status）
├── package.json            # demo 自己的脚本（start / server）
├── index.html              # 演示入口（画廊 + AI 对话）
├── modern-preview.html     # Modern 主题验证页（纯静态）
├── README.md               # 本文档
├── README_EN.md            # 英文文档
├── lib/                    # 库快照（已提交，非 dist）
│   ├── tokui.umd.js        # <script> 引入的 UMD 产物
│   └── tokui.css           # 库样式
├── server/                 # demo 自带后端（从 src 冻结复制，与 src 解耦）
│   ├── sse-server.js       # SSE 服务 + 静态托管（端口 3109）
│   └── tokui-builder.js    # Builder 冻结副本（sse-server require 用）
└── assets/                 # 演示页静态资源
    ├── css/demo.css
    ├── imgs/
    └── js/demo.js          # 演示页逻辑（双语、主题、SSE 连接、DSL 格式化）
```

## SSE 接口

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| GET | `/` | 演示页（index.html） |
| GET | `/api/demo/list` | 演示场景列表（JSON） |
| POST | `/api/chat/stream` | SSE 流式推送 TokUI 组件，body: `{"prompt": "..."}` |

触发演示：在对话框输入对应 `trigger`（见 `/api/demo/list`），或点左侧导航的引导按钮。

## 端口被占了怎么办

```bash
./demo.sh restart          # 自动处理
# 或手动
lsof -ti:3109 | xargs kill
```

## 日志

运行日志写入 `demo/server.log`（已 gitignore）。启动失败先看这里。

## 与主项目的关系

本目录是主项目 [TokUI](../) 的演示快照：

- `lib/` 是某次构建产物的**冻结副本**，不会随主项目 `src/` 变动自动更新。
- `server/tokui-builder.js` 同理，是 Builder 的冻结副本。

**在完整主项目里改了 `src/` 想刷新本 demo**（需在主项目根目录执行）：

```bash
npm run demo:sync          # build dist → 覆盖 demo/lib/{tokui.umd.js,tokui.css}
```

单独取出本目录时无需此操作——快照已随目录携带。

## 环境

- Node.js ≥ 14
- 任何现代浏览器
