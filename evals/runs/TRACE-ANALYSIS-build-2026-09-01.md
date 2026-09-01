# Bot 构建评测 · Trace 分析（2026-09-01）

范围：15 个建 Bot 场景，42 条 trace（Langfuse）。
结论：**9/42 trace 出现工具校验失败，共 15 次（ui_interaction 12 / bot_workspace 3），全部由模型读取错误后自愈重试成功；无静默失败、无向用户播报调试过程。**

## 一、失败分类（有完整错误原文证据）

### 1. ui_interaction 用 `action` 代替 `type`（5 次）——最大类
- 例：`{"action":"choice","title":...,"options":[...]}` 缺 `type` → `No matching discriminator`
- 出现：94913548、2030a7a0、bd08c37b、81e21dc4、5ea3ac2a
- 根因：模型把 bot_workspace 的 `action` 字段习惯带到了 ui_interaction（后者用 `type`）

### 2. subject 里塞创建/描述字段（4 次）
- 例：subject 内出现 `name`/`basic`/`description`/`summary`（subject 只允许 kind/id/preview）
- 出现：1961b297×2、2030a7a0
- 根因：模型把"要创建什么"的内容塞进 subject，字段层级放错

### 3. options 包进 `data`（2 次）
- 例：`{"action":"choice","type":"choice","data":{"options":[...]}}` → options 应为顶层
- 出现：bd08c37b×2

### 4. bot_workspace.create 误用 update 的 `changes`（2 次）
- 例：`{"action":"create","changes":[{area,operation,value}]}` → create 要求 basic/content/advanced 平铺
- 出现：6ff49ab5（记忆城）、fa76f8a2（雾海信号灯）

### 5. create 的 basic 传字符串 + 顶层 name/welcome（1 次）
- 例：`"basic":"{...json字符串...}"` + 顶层 name/welcome
- 出现：e657a916（雾田说书人）

## 二、失败分布规律

- 失败集中在**确认/创建环节**（ui_interaction confirmation + bot_workspace.create），即多轮对话的最后一步——上下文最长时模型最容易在参数组装上"赶工"。
- 全部发生在工具参数形状，**没有一次是业务内容错误**；模型每次都能读 MCP error 并重试成功。

## 三、性能与用量（约数，受 Langfuse 限流影响）

- 42 条 trace；token 总量 ~1.0M+（多轮拉取口径 0.78M~1.77M 波动，建议以 Langfuse 项目页为准）
- 估算成本 ~$2.5~4；总时长 ~8~15 分钟
- TTFT：平均 ~6-10s，波动 0.97s~113s（异常峰值出现在长上下文/工具密集轮）
- cache_read 占比 ~85%（多轮重读同一上下文）

## 四、与「效果评估」的对应

- 15 次失败全部自愈 → **不影响最终 Bot 效果**（10/10 已建 Bot 内容质量达标），但每次失败烧一整轮 token，是本批 1M+ token 的主要浪费源之一。
- 修法优先级：① ui_interaction/ bot_workspace 契约各给完整示例 JSON；② 错误信息附带"正确写法"提示；③ subject 层级文档明确（只 kind/id/preview）；④ create 与 update 的 schema 用 discriminated union 收窄，从根上避免字段习惯串台。
