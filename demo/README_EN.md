# TokUI Demo (Standalone)

A self-contained demo for TokUI: **component gallery + AI chat with SSE streaming rendering**. The entire `demo/` directory is self-contained — it can be lifted out of the main project and run on its own, with no dependency on the outer `src/` or `dist/`.

## Features

- 🎨 **Component gallery** — full TokUI component showcase with categorized nav + search
- 💬 **AI streaming chat** — simulated backend streams DSL over SSE; frontend renders incrementally in real time
- 🌗 **Theme switching** — default / dark / modern / modern-dark
- 🌐 **Bilingual** — toggle Chinese / English
- 📦 **Zero dependencies** — Node.js native `http`, no `npm install` needed

## Quick Start

```bash
# Option 1: manager script (recommended; start/stop/restart/status, auto port-conflict handling)
./demo.sh start           # start → http://localhost:3109
./demo.sh stop            # stop
./demo.sh restart         # restart
./demo.sh status          # show status

# Option 2: npm script
npm start                 # equivalent to node server/sse-server.js

# Option 3: run directly
node server/sse-server.js
```

Then open **http://localhost:3109** in your browser.

> **Port conflict**: if `3109` is taken, `demo.sh start`/`restart` automatically kills the occupying process before starting; `sse-server.js` itself has the same auto-release logic when run directly via `node`.

## Directory Layout

```
demo/
├── demo.sh                # manager script (start/stop/restart/status)
├── package.json           # demo's own scripts (start / server)
├── index.html             # demo entry (gallery + AI chat)
├── modern-preview.html    # Modern theme preview (static only)
├── README.md              # Chinese docs
├── README_EN.md           # this file
├── lib/                   # frozen library snapshot (committed, not dist)
│   ├── tokui.umd.js       # UMD bundle loaded via <script>
│   └── tokui.css          # library styles
├── server/                # demo's own backend (frozen copy from src, decoupled)
│   ├── sse-server.js      # SSE server + static hosting (port 3109)
│   └── tokui-builder.js   # frozen Builder copy (required by sse-server)
└── assets/                # demo static assets
    ├── css/demo.css
    ├── imgs/
    └── js/demo.js         # demo logic (i18n, theme, SSE, DSL formatting)
```

## SSE Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/` | demo page (index.html) |
| GET | `/api/demo/list` | list of demo scenarios (JSON) |
| POST | `/api/chat/stream` | stream TokUI components over SSE, body: `{"prompt": "..."}` |

Trigger a demo: type the matching `trigger` (see `/api/demo/list`) in the chat box, or click the prompt buttons in the left nav.

## Port Already in Use

```bash
./demo.sh restart          # handled automatically
# or manually
lsof -ti:3109 | xargs kill
```

## Logs

Runtime logs are written to `demo/server.log` (gitignored). Check here first if startup fails.

## Relationship to the Main Project

This directory is a demo snapshot of the main [TokUI](../) project:

- `lib/` is a **frozen copy** of one build output; it does NOT auto-update when the main project's `src/` changes.
- `server/tokui-builder.js` is likewise a frozen copy of the Builder.

**To refresh this demo after editing `src/` inside the full main project** (run from the main project root):

```bash
npm run demo:sync          # build dist → overwrite demo/lib/{tokui.umd.js,tokui.css}
```

Not needed when lifting this directory out alone — the snapshot ships with it.

## Requirements

- Node.js ≥ 14
- Any modern browser
