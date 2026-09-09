#!/usr/bin/env node
/**
 * demo/server/validate-demos.js — 全量 Demo DSL 结构校验器
 *
 * 背景：demo 案例经 TokUIBuilder 链式生成 DSL，若在「自闭合叶子」（callout/p/stat/menu-item…）
 * 之后多写 .end()，会提前闭合外层容器（row/card/grid…），解析器仍能渲染但结构错位
 * （如 col 掉到 card 外、grid 提前闭合）。此类错误肉眼易漏，本脚本用真实解析器建树做不变量校验：
 *
 *   1. col       的父级必须是 row
 *   2. cell      的父级必须是 grid
 *   3. menu-item 的父级必须是 menu
 *   4. DSL 必须可被解析器完整解析（无异常）
 *
 * 用法：npm run demo:validate
 * 实现：以 TOKUI_DEMO_PORT 起隔离服务实例（限流经 env 放开），拉取全部 demo 的
 * 流式 DSL（真实 SSE 链路）→ TokUIParser 建树 → 遍历校验 → 退出码 0/1。
 */
'use strict';

const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { TokUIParser } = require('../../src/core/parser');


/** 找一个空闲端口（必须预检：sse-server 的 EADDRINUSE 处理会尝试杀掉占端口进程，不可让子进程撞端口） */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(base, child, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('隔离服务启动超时')), timeoutMs);
    const poll = async (tries) => {
      try {
        const res = await fetch(`${base}/api/demo/list`);
        if (res.ok) { clearTimeout(timer); resolve(); return; }
      } catch (e) { /* 尚未监听，继续轮询 */ }
      if (child.exitCode !== null) { clearTimeout(timer); reject(new Error(`隔离服务提前退出 code=${child.exitCode}`)); return; }
      if (tries > 60) { clearTimeout(timer); reject(new Error('轮询超时')); return; }
      setTimeout(() => poll(tries + 1), 250);
    };
    poll(0);
  });
}

async function fetchDemoDsl(base, trigger) {
  const res = await fetch(`${base}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: trigger })
  });
  const text = await res.text();
  let dsl = '';
  for (const m of text.matchAll(/data: (\{.*?\})\n/g)) {
    try {
      const j = JSON.parse(m[1]);
      if (typeof j.tokui === 'string') dsl += j.tokui;
    } catch (e) { /* 非 JSON data 帧，跳过 */ }
  }
  return dsl;
}

function validateTree(trigger, dsl, problems) {
  const roots = [];
  try {
    new TokUIParser(n => roots.push(n)).parse(dsl);
  } catch (e) {
    problems.push(`[${trigger}] 解析异常: ${e.message}`);
    return;
  }
  const walk = (node, parent) => {
    const tag = node.type || '';
    if (tag === 'col' && parent !== 'row') problems.push(`[${trigger}] col 的父级是 ${parent || 'ROOT'}（应为 row）`);
    if (tag === 'cell' && parent !== 'grid') problems.push(`[${trigger}] cell 的父级是 ${parent || 'ROOT'}（应为 grid）`);
    if (tag === 'menu-item' && parent !== 'menu') problems.push(`[${trigger}] menu-item 的父级是 ${parent || 'ROOT'}（应为 menu）`);
    for (const c of (node.children || [])) walk(c, tag);
  };
  for (const r of roots) walk(r, null);
}

async function main() {
  const port = await findFreePort();
  const base = `http://localhost:${port}`;
  const child = spawn(process.execPath, [path.join(__dirname, 'sse-server.js')], {
    env: Object.assign({}, process.env, {
      TOKUI_DEMO_PORT: String(port),
      TOKUI_DEMO_RATE_LIMIT: '999999',
      TOKUI_DEMO_CHUNK_DELAY: '1'
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stderr.on('data', d => { const s = String(d); if (!/EADDRINUSE/.test(s)) process.stderr.write(s); });

  try {
    await waitForServer(base, child);
    const list = await (await fetch(`${base}/api/demo/list`)).json();
    const demos = (Array.isArray(list) ? list : (list.demos || list.data || [])).map(d => d.trigger || d.id || d).filter(t => typeof t === 'string');
    if (!demos.length) throw new Error('demo 列表为空');
    console.log(`demo 数量: ${demos.length}（隔离实例 :${port}）`);

    const problems = [];
    let done = 0;
    for (const trig of demos) {
      const dsl = await fetchDemoDsl(base, trig);
      if ((++done % 25) === 0) console.log(`… ${done}/${demos.length}`);
      if (!dsl) { problems.push(`[${trig}] 未取到 DSL（空流）`); continue; }
      if (dsl.includes('请求过于频繁')) { problems.push(`[${trig}] 命中限流降级回复`); continue; }
      validateTree(trig, dsl, problems);
    }

    if (problems.length) {
      console.log(`发现 ${problems.length} 个结构问题:`);
      problems.forEach(p => console.log(' -', p));
      process.exitCode = 1;
    } else {
      console.log('ALL_DEMOS_STRUCTURE_OK');
    }
  } finally {
    child.kill('SIGTERM');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
