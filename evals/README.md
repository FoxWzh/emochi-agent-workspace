# Agent 评测 Runner

用真实本地 API 执行可复现的单轮或多轮 Agent 场景，并为每一轮保存完整 SSE 事件、可见回复、交互选择、Session ID 与 Langfuse trace ID。

## 运行

```bash
# 先确保本地服务启动
npm run server

# 查看场景
npm run eval:agent -- --list

# 执行场景
npm run eval:agent -- --scenario alba-review-choice
```

结果会写入 `evals/runs/<run-id>.json`。每一轮都有 `trace_id`，可直接在 Langfuse Trace 搜索中粘贴该 ID，审查完整 Agent loop、工具调用、token 与耗时。

如需结果文件同时输出项目内直达链接，在本地 `.env.local` 增加 `LANGFUSE_PROJECT_ID=<你的项目 ID>` 后重启本地 Agent 服务再执行评测。

## 场景格式

编辑 `evals/agent-scenarios.json`：

- `fixtures.bots`：运行前创建的模拟 Bot 数据；默认在运行结束后删除。
- `steps`：按顺序执行 `message` 或 `respond_pending`。
- `respond_pending`：自动点击上一轮产生的 Choice/Confirmation；用 `option_index` 或 `option_id` 指定，并将真实的选择/确认文字作为下一轮消息发回 Agent。
- `--keep-fixtures`：保留模拟 Bot，便于手动检查；默认清理。

Runner 是黑盒评测：只调用产品 API，不伪造 Agent 响应，也不写入生产 Bot。评测产生的 Session 会保留，方便复盘；其标题以 `[Eval]` 开头。
