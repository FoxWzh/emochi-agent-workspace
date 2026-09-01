# `image_task`

创建一组图片生成任务。每个 `variant` 是一张图片的独立视觉方案；Tool 返回一个任务标识，用于后续获取该组图片的结果。

## 输入

```ts
type ImageTaskRequest = {
  title: string;
  purpose: "cover" | "reference" | "scene";
  count?: 1 | 2 | 3 | 4; // 缺省为 4；只有用户明确指定数量时才改写
  variants: Array<{
    id: string;
    title: string;
    prompt: string;
  }>;
  images?: Array<{ image_url: string }>;
  size?: "auto" | "1024x1024" | "768x1024" | "1024x768";
  style_locked?: boolean;
};
```

- `title`：这组图片在对话中显示的简短名称。
- `purpose`：图片用途。`cover` 为封面，`reference` 为角色/视觉参考，`scene` 为场景图。
- `count`：生成数量。缺省为 4；只有用户明确指定数量时才传 1–4。
- `variants`：优先为每张图片提供一个独立视觉方案。未提供足够数量时，执行层仍按 `count` 补齐生成，不能因少传 variants 而把默认 4 张降为 2 张。
- `prompt`：自包含地描述主体、画面、关键约束与必要风格。候选之间应有实际的构图、机位、场景、光影、动作或叙事重点差异，不能只机械追加后缀。
- `images`：可选图像参考；使用时为 HTTP(S) URL，可供多个 variants 共享。
- `size`：可选输出尺寸。
- `style_locked`：仅当用户已明确指定必须保留的视觉风格或硬约束时使用；锁定风格不代表各候选可以重复构图。

## 输出

```ts
type ImageTaskResult = {
  job_id: string;
};
```

`job_id` 标识本次由多个 variants 组成的图片任务组。每张图片的生成结果、状态和资源信息通过该任务组关联。

## 边界

- Tool 只创建图片任务；不修改 Bot，不管理 Artifact，也不替用户选择结果。
- 任务中每个 variant 都是一张独立图片；本 Tool 不提供“同一 Prompt 批量生成多张”的数量参数。
- 图片方案如何形成、生成几张、何时调用本 Tool，由上层 Agent 规则和图片创作 Skill 决定。
