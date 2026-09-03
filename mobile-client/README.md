# Emochi Mobile Client

独立的移动端 React/Vite 客户端，不修改桌面端 `src/`。它复用现有 Node Agent API：本地开发会把 `/api/*` 代理到 `http://127.0.0.1:8789`；跨域部署时设置 `VITE_AGENT_API_ORIGIN`。

## 运行

```bash
npm install
npm run dev
```

在仓库根目录执行也可以：

```bash
npm --prefix mobile-client install
npm --prefix mobile-client run dev
```

## 会话语义

- 打开或点击“新对话”只进入本地空白态，不创建服务端 Session；
- 只有首次实际发送文字或图片时才会请求 `POST /api/sessions`，获得新的 `session_id`；
- 当前客户端不会把全局 `sessions[0]` 自动当作当前会话；
- 历史抽屉仍展示服务端提供的完整 Session 列表。并发编辑同一个手动选择的 Session 不属于此阶段的处理范围。
