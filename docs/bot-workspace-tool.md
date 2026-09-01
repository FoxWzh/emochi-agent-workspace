# `bot_workspace`

管理 Demo 中 Bot 的传统 CRUD 与当前工作对象。它在本地 Bot Table 上搜索、读取、创建、更新、归档、删除 Bot，并返回前端刷新 Bot 列表、当前工作对象与业务 Artifact 页所需的状态。

它不管理当前对话的消息、Artifact 浏览器页面、图片任务或前端组件打开/关闭状态。

## Bot 数据

```ts
type BotArea = "basic" | "content" | "advanced";

type BotInput = {
  basic?: Record<string, unknown>;
  content?: string;
  advanced?: Record<string, unknown>;
};
```

`basic`、`content`、`advanced` 是 Bot 的三个权威业务区域。`init_prompt` 由它们通过 Demo Prompt Assembler 派生生成，不是 Agent 的直接编辑输入，也不进入默认 Agent Snapshot。

## 输入

```ts
type SourceRef = {
  type: "conversation_turn" | "artifact";
  id: string;
};

type BotChange = {
  area: BotArea;
  operation: "replace" | "merge" | "clear";
  value: unknown;
  reason: string;
};

type BotWorkspaceRequest =
  | { action: "search"; query: string }
  | { action: "read"; bot_id: string; area?: BotArea }
  | { action: "set_work_object"; bot_id?: string }
  | { action: "create"; bot: BotInput }
  | { action: "update"; bot_id: string; changes: BotChange[]; source_ref?: SourceRef }
  | { action: "archive"; bot_id: string }
  | { action: "delete"; bot_id: string };
```

## 动作语义

| 动作 | 含义 |
| --- | --- |
| `search` / `read` | 搜索或读取 Bot。`read` 可读取一个区域或完整三块业务内容。只读操作不改变工作对象。 |
| `set_work_object` | 指定当前工作对象；省略 `bot_id` 表示清除。只改变当前对话的工作上下文。 |
| `create` | 在本地 Table 新建 Bot。 |
| `update` | 更新 `basic`、`content`、`advanced` 的最小明确差异，并重新生成派生 `init_prompt`。`source_ref` 只作来源追溯，不改变来源对象归属。 |
| `archive` / `delete` | 归档或删除 Bot；删除当前工作对象时同步清除它。 |

## 结果与前端传递

```ts
type BotSummary = { id: string; title: string; description?: string; cover_url?: string; updated_at?: string };
type BotSnapshot = { summary: BotSummary; basic?: Record<string, unknown>; content?: string; advanced?: Record<string, unknown> };
type BotWorkspaceView = { work_object: BotSummary | null; bot?: BotSnapshot };
type BotWorkspaceResult = { bots?: BotSummary[]; bot?: BotSnapshot; workspace: BotWorkspaceView; deleted_bot_id?: string };
```

返回状态供前端刷新 Bot 列表、当前工作对象，以及引用该 Bot 的 `bot_basic` / `bot_content` / `bot_advanced` Artifact 页面。不要返回完整生产表、用户 ID、运营/审核字段、`init_prompt` 或机器本地路径。

## 边界

- Bot 更新、归档、删除默认须按 `CLAUDE.md` 与 `ui_interaction` 获得用户确认；仅对本次明确操作的免确认授权可例外。
- `artifact_workspace` 管理右侧 Artifact 页面；`bot_workspace` 不拥有、迁移或删除 Artifact。业务 Artifact 应用到 Bot 时，仅由本 Tool 完成最终写入。
- 当前只支持单个工作对象；多 Bot 是未来扩展。
