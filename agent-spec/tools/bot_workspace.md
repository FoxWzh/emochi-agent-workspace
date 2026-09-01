# bot_workspace

唯一负责 Bot 搜索、读取、当前工作对象与 Bot CRUD。`basic`、`content`、`advanced` 是权威区域；`init_prompt` 由后端派生，不能直接编辑。

## 何时使用

- 搜索、读取、创建、更新、归档、删除 Bot，或设置/清空当前工作对象时使用。
- 不用它创建或编辑资源区页面；那是 `artifact_workspace` 的职责。
- `bot_ref` 只属于 `artifact_workspace`，**绝不能**传给本 Tool。


## 返回体边界

Tool 返回给 Agent 的内容是继续推理所需的最小事实：

- `search`：Bot 摘要（`id`、名称、简介、封面、更新时间）。
- `read`：只读请求的区域；未指定区域时返回三个权威区域，但**永不返回**派生的 `init_prompt`、内部记录或前端事件数据。
- `create` / `update`：Bot 摘要、`written` 写入区域与 `work_object`；不返回完整 Bot 内容或 `init_prompt`。前端所需完整数据走独立 SSE 事件，不是本 Tool 的 Agent 返回体。

## 创建示例

`create` 用于创建可立即使用的完整 Bot，不用于创建空白草稿。它必须一次传入：非空的 `basic.name`、`basic.intro`、`basic.welcome` 和非空 `content`；名称、简介、标签和欢迎语都放进 `basic`，不要平铺在顶层。不要先只创建名称、再分多次补简介或欢迎语：一次 create 成功后，基础信息与内容设定必须已经完整。

```json
{
  "action": "create",
  "basic": {
    "name": "Bot 名称",
    "intro": "一句简介",
    "tags": ["角色", "悬疑"],
    "welcome": "欢迎语"
  },
  "content": "角色与互动设定",
  "advanced": {
    "voice": "语气风格",
    "examples": "示例对话"
  }
}
```

## 更新示例

`update` 只接受 `bot_id` 与非空 `changes` 数组。每项必须有 `area` 和 `operation`；`clear` 不带 `value`，其他操作必须带 `value`。`reason` 可省略，后端会补为 `更新 <area>`：

```json
{
  "action": "update",
  "bot_id": "bot_...",
  "changes": [
    {
      "area": "basic",
      "operation": "merge",
      "reason": "更新名称和简介",
      "value": {"name": "新名称", "intro": "新简介"}
    }
  ]
}
```

- `basic` 的唯一字段：名称=`name`、**简介=`intro`（不是 `description`）**、标签=`tags`（1–5 个非空标签）、**欢迎语=`welcome`（不是 `greeting`）**、封面=`cover_url`（不是 `cover`）、可见性=`visibility`（仅 `public` 或 `private`）。对 `create`，`name`、`intro` 和 `welcome` 均必填；对 `update`，使用 `merge` 可只更新其中一项。
- `advanced` 的唯一字段：语气=`voice`、示例=`examples`。不要传 `tone`、`example_dialogue`、`rules`、`response_rules` 或 `character_dynamics`。
- `content` 的 value 必须是字符串。
- 更新只使用 `changes: [{area, operation, value?, reason?}]`；不要传 `path`，也不要将 `basic`、`content` 或 `advanced` 平铺到 `changes` 下。`basic` 的 `replace` 必须包含非空 `name`，不会允许把 Bot 写成“未命名”。
- **每次调用都必须传 `action`；禁止空对象 `{}`。** 搜索用 `{ action: "search", query?: "名称或关键词" }`；读取用 `{ action: "read", bot_id: "..." }`。
- `search` / `read` 不修改 Bot 内容。`search` 若仅命中一个 Bot，会自动将其填入当前 Session 的工作对象/输入框，并打开该 Bot 的资源区；多结果时不猜测、不切换。
- `update` 成功后也会自动把该 Bot 填入当前 Session，并展开对应资源区。`set_work_object` 的 `bot_id` 省略时清空当前工作对象。
- 创建、更新、归档、删除与切换/清空工作对象，遵循 `CLAUDE.md` 的本次授权规则。
