# @jboltai/tokui-react

> TokUI 的 React 适配器：`<TokUIView>` 组件 + `useTokUIStream()` 流式 hook。

## 安装

```bash
npm install @jboltai/tokui-react react
```

## 声明式渲染

```jsx
import { TokUIView } from '@jboltai/tokui-react';

export function App() {
  return (
    <TokUIView
      dsl="[card tt:你好 TokUI][p 流式 UI，零依赖][/card]"
      theme="default"
    />
  );
}
```

`dsl` 变化时自动重新渲染；组件卸载时自动断开清理。

## 流式 / SSE

```jsx
import { useTokUIStream } from '@jboltai/tokui-react';

export function Chat() {
  const { ref, start, feed, end, connect } = useTokUIStream();
  return (
    <>
      <div ref={ref} />
      <button onClick={() => {
        start();
        feed('[card tt:');
        feed('流式卡片]');
        end();
      }}>渲染</button>
      <button onClick={() => connect('/api/chat', { prompt: '画登录卡片' })}>
        SSE 连接
      </button>
    </>
  );
}
```

## CSS

样式随 `@jboltai/tokui` 自动注入，无需手动引 CSS。

License: MIT
