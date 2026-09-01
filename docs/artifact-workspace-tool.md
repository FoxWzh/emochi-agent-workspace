# `artifact_workspace`

管理当前对话右侧 **Artifact 浏览器**中的可打开工作页。Artifact 是独立的查看、编辑、比较或应用载体；它可以是与 Bot 三个业务区域对应的业务工作页，也可以是图片、文本、代码、文件或其他常规内容页。

它不管理 Bot 的创建、更新、归档、删除或当前工作对象；这些只由 `bot_workspace` 处理。Artifact 的编辑不自动写入 Bot。

## Artifact 类型

```ts
type ArtifactType =
  | "bot_basic"    // 基础信息工作页：表单/GUI
  | "bot_content"  // 内容设定工作页：自由文本编辑器
  | "bot_advanced" // 高级设置工作页：表单/GUI
  | "image"        // 图片预览/资源页
  | "text"         // 普通文本页
  | "code"         // 代码页
  | "file"         // 文件预览/下载页
  | "other";
```

前三种是**业务化 Artifact**：前端应按类型渲染专属编辑/展示页面，并可指向某个 Bot 的 `basic`、`content` 或 `advanced` 区域。其余类型按常规内容展示即可。

## 输入

```ts
type ArtifactRef = {
  artifact_id: string;
  type: ArtifactType;
  title: string;
  description?: string;
  bot_ref?: { bot_id: string; area?: "basic" | "content" | "advanced" };
  uri?: string;
};

type ArtifactWorkspaceRequest =
  | { action: "create"; artifact: ArtifactInput }
  | { action: "list" }
  | { action: "read"; artifact_id: string }
  | { action: "update"; artifact_id: string; patch: ArtifactPatch }
  | { action: "delete"; artifact_id: string };

type ArtifactInput = ArtifactRef & {
  data?: unknown;
};

type ArtifactPatch = Partial<Pick<ArtifactInput, "title" | "description" | "uri" | "data" | "bot_ref">>;
```

## 动作语义

| 动作 | 含义 | 返回 |
| --- | --- | --- |
| `create` | 创建一个可在右侧打开的 Artifact 工作页。 | 最新 `ArtifactRef`。 |
| `list` | 列出当前对话的 Artifact 浏览器目录。 | `ArtifactRef[]`，不带所有页面正文。 |
| `read` | 读取用户明确打开、引用或本轮确实需要的 Artifact 数据。 | 目标页面数据与引用。 |
| `update` | 更新 Artifact 的可编辑数据、描述或资源引用。 | 更新后的 `ArtifactRef`。 |
| `delete` | 从当前对话 Artifact 浏览器移除工作页。 | `deleted_artifact_id`。 |

普通聊天、短建议、Choice、Confirmation、Activity 和未被作为工作页打开的过程内容默认留在对话轨迹；不得因其“可能有用”自动创建 Artifact。需要给用户一个可查看/可编辑/可应用的右侧页面，或用户明确要求打开、保存、导出、比较、编辑某份内容时，才创建 Artifact。

## Bot 与前端边界

- `bot_basic`、`bot_content`、`bot_advanced` 可引用 Bot 区域，但编辑 Artifact 不等于更新 Bot。
- 用户或 Agent 明确要求将业务化 Artifact 应用到 Bot 时，由 `bot_workspace.update` 读取/接收 Artifact 数据并完成最终业务写入；必须遵循全局确认与授权规则。
- 图片生成与任务状态由 `image_task` 和前端处理；本 Tool 可承载一个已有图片资源的浏览页面，但不发起图片生成或管理轮询。
- 文件 Artifact 的 `uri` 必须是部署可访问的相对资源引用，不得返回机器绝对路径。具体文件落盘、静态服务、右侧标签页和渲染实现属于工程层。

## 结果与前端传递

```ts
type ArtifactWorkspaceResult = {
  artifact?: ArtifactRef;
  artifacts?: ArtifactRef[];
  deleted_artifact_id?: string;
};
```

运行时将结果传递给前端，用于更新右侧 Artifact 浏览器的目录、打开页或当前页内容；Tool 不直接控制前端 UI 状态。
