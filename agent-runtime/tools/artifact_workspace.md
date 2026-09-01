# artifact_workspace

唯一负责当前对话右侧可打开的工作页。它不修改 Bot，也不直接控制前端开关。

## 当前可调用输入

```ts
{
  action: "create" | "list" | "read" | "update" | "delete";
  artifact_id?: string;
  type?: "bot_basic" | "bot_content" | "bot_advanced" |
          "image" | "text" | "code" | "file" | "other";
  title?: string;
  description?: string;
  data?: unknown;
  bot_ref?: { bot_id: string; area: "basic" | "content" | "advanced" };
}
```

- `list` 只返回目录信息；需要正文时才 `read` 指定页面。
- 普通过程内容默认留在对话，不自动创建 Artifact。
- 业务页可引用 Bot 区域，但编辑它不等于写回 Bot；写回必须使用 `bot_workspace.update` 并获得本次授权。
