# Agent → 对话组件与 Artifact 浏览器路由

本文件说明 Agent 语义与前端三栏工作区的边界，不定义 HTTP/SSE schema。

```text
左侧：Session 对话列表
中间：当前 Session 的对话时间线
右侧：当前 Session 的 Artifact 浏览器 / 可打开工作页
```

| 场景 | Agent / Tool 动作 | 中间对话 | 右侧 Artifact 浏览器 | Bot 影响 |
| --- | --- | --- | --- | --- |
| 普通解释、灵感、诊断、过程总结 | 普通回复 | 普通消息 | 无 | 无 |
| 2–4 个实质不同方向 | `ui_interaction(choice)` | Choice | 无 | 无 |
| 已形成方案或 Bot 变更提议 | `ui_interaction(confirmation)` | 确认卡 | 可按需打开对应草案页 | 仅 Bot 业务确认后可写入 |
| 需给用户可查看、可编辑、比较或应用的工作页 | `artifact_workspace.create` | Artifact 引用/提示 | 创建并打开 Artifact 页面 | 无，直到明确应用 |
| 浏览/编辑 Bot 基础信息、内容设定、高级设置 | `artifact_workspace` 使用 `bot_basic` / `bot_content` / `bot_advanced` | 可提示当前草案/页面 | 专属 GUI 或编辑器 | 编辑 Artifact 不自动写 Bot |
| 用户/Agent 明确应用业务 Artifact 到 Bot | `artifact_workspace.read` + `bot_workspace.update` | 确认/结果 | 保留并可继续编辑 Artifact | 仅授权后写入 |
| 图片生成 | `image_task` | 图片任务状态 | 可创建/打开 `image` 预览页 | 用户前端“设为封面”或 Bot 更新才影响 |
| 长任务 | 运行时事实状态 | Activity / Todo | 仅需工作页时创建 Artifact | 无 |

## 固定原则

1. 时间线按 Agent 事件语义顺序渲染；任务结果原位更新，不为完成结果重排消息。
2. 普通对话过程不自动创建 Artifact。只有需要右侧可打开、可编辑、可比较或可应用工作页时，才调用 `artifact_workspace`。
3. Artifact Browser 可有多个页，但默认只将页面名称、描述、类型和引用提供给 Agent；用户/Agent 明确打开/引用或任务确实需要时才读页面数据。
4. 业务化 Artifact 不等于 Bot。本体 `basic/content/advanced` 的最终写入只由 `bot_workspace` 完成。
5. Choice 和 Confirmation 是 Agent 发起的用户决策；图片轮询、候选选中、右侧页面标签状态与“设为封面”是前端状态/明确业务操作，不属于 `ui_interaction`。
6. 用户提交、确认/拒绝、关闭引用或发送新消息时，前端关闭过期建议气泡和 pending 状态。
