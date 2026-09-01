# ui_interaction

仅用于聊天内的方向选择或业务确认；它不执行 Bot、Artifact 或图片操作。

## 当前可调用输入

```ts
{
  type: "choice" | "confirmation";
  title: string;
  description?: string;
  options?: Array<{ id: string; title: string; description?: string }>; // choice: 2–4 项
  allow_custom?: boolean;
  summary?: string;
  subject?: {
    kind: "text" | "file" | "image_plan" | "artifact" |
          "work_object" | "bot" | "bot_create" | "bot_change" |
          "bot_archive" | "bot_delete";
    id?: string;
    preview?: string;
  };
  impact?: string;
}
```

- Choice 必须提供 2–4 个 `options`；不拿它收集常规创作字段。
- `subject.kind: "bot"` 仅表示正在讨论/审查的 Bot，不会写入；`bot_change` 仅用于待确认的 Bot 修改。
- Confirmation 用于已有可审阅对象或业务动作。它只记录决定；真实写入仍由对应 Tool 完成。
- 用户可用自然语言绕过旧组件；旧决定不得授权后续不同操作。


## 完整调用示例

Choice（`options` 中用 `description`；兼容 `prompt`，但不要同时传两者）：

```json
{
  "type": "choice",
  "title": "Alba 的优化方向",
  "description": "请选择一个可继续展开的方向。",
  "options": [
    {"id": "relationship", "title": "强化关系张力", "description": "补足信任变化与退缩条件。"},
    {"id": "gameplay", "title": "增强互动玩法", "description": "让电台连线形成可重复的互动回路。"}
  ],
  "allow_custom": true,
  "subject": {"kind": "bot", "id": "bot_...", "preview": "Alba"},
  "impact": "只选择讨论方向，不写入 Bot。"
}
```

Confirmation（`title`、`description`、`impact` 在顶层；`subject` **只能**有 `kind`、`id`、`preview`，不能放 `title`、`description`、`bot_id` 或 `area`）：

```json
{
  "type": "confirmation",
  "title": "确认更新 Alba 的内容设定？",
  "summary": "补足角色关系、互动回路和开场场景。",
  "subject": {"kind": "bot_change", "id": "bot_...", "preview": "Alba 内容设定"},
  "impact": "会写入该 Bot 的 content，其他区域保持不变。"
}
```
