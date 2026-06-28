#!/bin/bash
# TokUI Demo 管理脚本（自包含：静态前端 + SSE 后端同源）
# 用法: ./demo.sh {start|stop|restart|status}
# demo/ 目录可独立取出运行，路径均相对本脚本。

PORT=3109
DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/server.pid"
LOG_FILE="$DIR/server.log"
SERVER_JS="$DIR/server/sse-server.js"

start() {
  # 无论 PID 文件是否存在，先确保端口空闲（端口占用 → 关掉 → 启动）
  local port_pid
  port_pid=$(lsof -ti:"$PORT" 2>/dev/null)
  if [ -n "$port_pid" ]; then
    echo "端口 $PORT 被占用 (PID: $port_pid)，正在停止..."
    _kill_process "$port_pid"
  fi

  if [ -f "$PID_FILE" ]; then
    local old_pid
    old_pid=$(cat "$PID_FILE")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo "旧进程仍在运行 (PID: $old_pid)，正在停止..."
      _kill_process "$old_pid"
    fi
    rm -f "$PID_FILE"
  fi

  echo "正在启动 TokUI Demo (静态 + SSE)..."
  nohup node "$SERVER_JS" >> "$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"

  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    echo "启动成功 (PID: $pid, 端口: $PORT)"
    echo "日志文件: $LOG_FILE"
    echo "访问地址: http://localhost:$PORT"
  else
    echo "启动失败，请查看日志: $LOG_FILE"
    rm -f "$PID_FILE"
    return 1
  fi
}

# 强制停止进程：先 SIGTERM，等待 3 秒，不退则 SIGKILL
_kill_process() {
  local pid=$1
  kill -0 "$pid" 2>/dev/null || return 0

  kill "$pid" 2>/dev/null
  local i=0
  while kill -0 "$pid" 2>/dev/null && [ $i -lt 6 ]; do
    sleep 0.5
    i=$((i + 1))
  done

  if kill -0 "$pid" 2>/dev/null; then
    echo "SIGTERM 未生效，发送 SIGKILL..."
    kill -9 "$pid" 2>/dev/null
    sleep 0.5
  fi

  if kill -0 "$pid" 2>/dev/null; then
    echo "错误: 无法停止进程 $pid"
    return 1
  fi
  echo "进程 $pid 已停止"
}

stop() {
  local pid=""

  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE")
  fi

  # 也检查端口，防止 PID 文件与实际不一致
  local port_pid
  port_pid=$(lsof -ti:"$PORT" 2>/dev/null)

  if [ -z "$pid" ] && [ -z "$port_pid" ]; then
    echo "服务未运行"
    return 0
  fi

  # 合并要停止的 PID（去重）
  local pids_to_stop=()
  [ -n "$pid" ] && pids_to_stop+=("$pid")
  [ -n "$port_pid" ] && [ "$port_pid" != "$pid" ] && pids_to_stop+=("$port_pid")

  for p in "${pids_to_stop[@]}"; do
    _kill_process "$p"
  done

  rm -f "$PID_FILE"
}

restart() {
  stop
  # 等端口释放，最多 5 秒
  local i=0
  while lsof -ti:"$PORT" >/dev/null 2>&1 && [ $i -lt 10 ]; do
    sleep 0.5
    i=$((i + 1))
  done
  start
}

status() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo "运行中 (PID: $pid, 端口: $PORT)"
      return 0
    fi
    echo "PID 文件存在但进程已停止"
    rm -f "$PID_FILE"
    return 1
  fi

  if lsof -ti:"$PORT" >/dev/null 2>&1; then
    echo "端口 $PORT 有进程在监听，但非本脚本启动"
    return 0
  fi

  echo "服务未运行"
  return 1
}

case "$1" in
  start)   start   ;;
  stop)    stop    ;;
  restart) restart ;;
  status)  status  ;;
  *)       echo "用法: $0 {start|stop|restart|status}" ;;
esac
