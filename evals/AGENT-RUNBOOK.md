# Emochi Agent 评测脚本：执行手册

交给执行 Agent 的任务：使用本项目的黑盒评测脚本，运行指定场景，保存结果，并依据每轮 Trace 在 Langfuse 中核查 Agent 的实际行为、工具调用、token 和耗时。

## 1. 运行边界

- 项目目录：repository root
- 脚本只通过本地产品 API 发起真实 Agent 请求，**不会伪造模型回复**。
- 评测中的模拟 Bot 会在运行前创建，默认在结束时删除；评测 Session 会保留，标题以 `[Eval]` 开头，便于复盘。
- 不要把评测返回的 `trace_id` 当成 Session ID：每一轮用户请求都有独立 Trace。
- 不要修改生产 Bot。需要检查模拟 Bot 时，可使用 `--keep-fixtures`，并在检查完成后自行删除。

## 2. 启动前检查

在项目目录执行：

```bash
cd <repository-root>
curl -sS http://127.0.0.1:8789/api/health
```

预期：

```json
{"status":"ok","agent_gateway":"configured","image_gateway":"configured"}
```

若后端不可用，在一个保持运行的终端中启动：

```bash
npm run server
```

前端不是跑评测脚本的必要条件；如需手动查看页面，另开终端运行：

```bash
npm run dev
```

确认 `.env.local` 至少已配置 Agent Gateway 和 Langfuse 凭据。**不要输出或提交任何密钥值。**

## 3. 查看与运行已有场景

列出场景：

```bash
npm run eval:agent -- --list
```

当前场景：

| 场景 ID | 用途 |
| --- | --- |
| `new-idea-candidates` | 测试新创意是否先直接交付完整候选，而不是连续追问。 |
| `alba-review-choice` | 模拟已有 Alba Bot：请求优化方案，并自动选择一个方案。 |
| `alba-confirmed-content-write` | 模拟已有 Alba Bot：请求优化 → 自动选择 → 自动确认 → 测试实际写入收尾轮。 |

运行一个场景：

```bash
npm run eval:agent -- --scenario alba-confirmed-content-write
```

若希望保留本轮生成的模拟 Bot 用于人工检查：

```bash
npm run eval:agent -- --scenario alba-confirmed-content-write --keep-fixtures
```

## 4. 结果文件与 Langfuse 取证

每次运行都会输出结果路径，例如：

```text
evals/runs/eval_2026-09-01T04-41-38-376Z_2132e230.json
```

结果 JSON 中重点查看：

```json
{
  "session_id": "session_...",
  "status": "completed",
  "turns": [
    {
      "kind": "message",
      "content": "本轮用户输入",
      "assistant_text": "Agent 的最终可见回复",
      "trace_id": "Langfuse trace id",
      "langfuse_url": "可选直达链接",
      "interaction": {},
      "events": []
    }
  ]
}
```

操作步骤：

1. 打开结果 JSON，按 `turns` 顺序读取每一轮的 `trace_id`。
2. 在 Langfuse 的 **Traces** 搜索框粘贴该 `trace_id`。
3. 对每轮核对：
   - 最终回复是否满足场景预期；
   - 是否出现工具 schema 校验失败、无意义重试或错误写入；
   - `assistant_turn_*`、工具调用、Skill / Read、`query_usage_summary` 是否完整；
   - token、cache read、TTFT、总时长是否存在异常。
4. 汇报时同时给出：**场景 ID、结果文件路径、Session ID、每轮 Trace ID、结论和关键证据**。

如果想让结果文件自动生成项目内 Langfuse 链接，在 `.env.local` 添加（值由项目所有者提供）：

```bash
LANGFUSE_PROJECT_ID=<project-id>
```

改完后重启 `npm run server`，再运行评测。没有此变量时，Runner 仍会完整保存 `trace_id`，只是不生成直达 URL。

## 5. 新增场景

在 `evals/agent-scenarios.json` 的 `scenarios` 数组中添加。支持两种 step：

```json
{
  "id": "my-case",
  "title": "我的多轮场景",
  "fixtures": {
    "bots": [
      {
        "basic": {
          "name": "测试 Bot",
          "intro": "测试简介",
          "welcome": "测试欢迎语",
          "tags": ["测试"]
        },
        "content": "# 初始内容",
        "advanced": {"voice": "自然", "examples": "示例"}
      }
    ]
  },
  "steps": [
    {"type": "message", "content": "第一轮用户请求"},
    {"type": "respond_pending", "option_index": 0},
    {"type": "message", "content": "后续补充或确认"}
  ]
}
```

`respond_pending` 会处理上一轮 Agent 返回的 Choice 或 Confirmation：

- `option_index`：按 0 开始的选项序号；
- `option_id`：显式指定选项 ID，适合确认操作，例如 `"confirm"`；
- 默认会把选择/确认转成一条真实的下一轮用户消息并发送给 Agent。

场景写完后先检查：

```bash
npm run eval:agent -- --list
```

再运行新场景：

```bash
npm run eval:agent -- --scenario my-case
```

## 6. 执行完成后的最低交付格式

```text
场景：alba-confirmed-content-write
结果：evals/runs/<run-id>.json
Session：session_...

Trace：
1. <trace-id> — 结论
2. <trace-id> — 结论
3. <trace-id> — 结论

异常：无 / 具体异常、所在 turn 与证据。
```

不要只报告“脚本跑通”。必须查看结果文件，并至少按 Trace 核对一次真实执行链。
