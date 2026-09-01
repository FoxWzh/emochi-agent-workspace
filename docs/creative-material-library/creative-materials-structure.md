# `creative-materials.json` 结构说明

> 用途：给 `creative_material_search`（sample / filter）提供真实可查询的最终素材表。
> 关联文件：`tag-distribution.md`（分布统计）、`material-query-smoke.mjs`（烟测）、`sources.json`（来源追溯）、`usable-pool.json`（原始候选池，本表的前置来源）。

---

## 1. 文件概览

| 项 | 值 |
|---|---|
| 文件 | `creative-materials.json` |
| schema_version | `1.1` |
| 生成时间 | 2026-08-28 |
| 素材总数 | **1,958 条**（curated 74 / auto 1,884） |
| 全部 `enabled` | true（安全与质量过滤通过后才置 true） |
| 数据层级 | 顶层元信息 + `materials[]` 素材数组 |

---

## 2. 顶层结构

```jsonc
{
  "schema_version": "1.1",          // 表结构版本
  "generated_at": "2026-08-28",     // 生成日期
  "note": "…说明文字…",              // curated/auto 定义
  "tiers": {
    "curated": 74,                  // 人工改写条数
    "auto": 1884,                   // 机器预标注条数
    "total": 1958                   // 合计
  },
  "materials": [ /* CreativeMaterial 记录数组 */ ]
}
```

---

## 3. 素材记录字段（`materials[]` 内每条）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✅ | 唯一标识。curated 用 `cm-001…cm-074`；auto 用 `cm-a0001…cm-a1884` |
| `title` | string | ✅ | 素材短标题（auto 来自条目 comment 或正文首句） |
| `genres` | string[] | ✅ | 0–3 个受控题材枚举（见 §4），空数组=跨题材方法论型 |
| `material_type` | string | ✅ | 恰好 1 个受控内容作用枚举（见 §4） |
| `summary` | string | ✅ | 短预览（auto 为压缩首句） |
| `content` | string | ✅ | 可再创作设定卡；curated=人工转述改写，auto=压缩摘录（≤150 字） |
| `enabled` | boolean | ✅ | 安全/质量过滤通过后为 `true` |
| `tier` | string | ✅ | `curated`（人工，可直接用）/ `auto`（机器预标注，需复核） |
| `source_id` | string | ⭕ | 来源追溯 id（`sources.json` 主键）；auto 统一为 `"src-auto"` |
| `source_entry_ids` | string[] | ⭕ | 原始条目 uid，仅内部追溯 |
| `source_file` | string\|null | ⭕ | 原始文件名（仅文件名，非绝对路径）；curated 多为 null |

> 说明：`tier`、`source_file` 是 brief 最小 schema 之外的扩展字段。`tier` 用于区分“人工可直接用 / 机器需复核”；`source_file` 仅用于审查时定位，**不进入常规查询结果**。

---

## 4. 枚举字典

### 4.1 `genres`（题材 / 体验，0–3 个）

| 枚举 | 中文 | | 枚举 | 中文 |
|---|---|---|---|---|
| mystery | 悬疑 | | workplace | 职场 |
| school | 校园 | | historical | 历史/架空历史 |
| urban | 都市 | | adventure | 冒险 |
| fantasy | 奇幻 | | survival | 生存/危机 |
| science_fiction | 科幻 | | slice_of_life | 日常 |
| romance | 恋爱/情感关系 | | | |

### 4.2 `material_type`（内容作用，恰好 1 个）

| 枚举 | 中文 |
|---|---|
| character | 人设、欲望、矛盾、行为边界 |
| relationship | 关系结构、秘密、信任、权力、依赖 |
| world_rule | 世界规则、代价、资源、信息边界 |
| setting | 地点、组织、制度、环境压力 |
| scene | 可进入的当前场景 |
| conflict | 持续冲突、目标对抗、两难 |
| narrative_device | 信息差、叙事视角、秘密、反转 |
| interaction_mechanic | 用户行动、反馈、后果、循环 |
| style_detail | 生活、感官、表达等可互动细节 |

> 两个维度正交：`genres` 回答“适合什么外层题材/体验”，`material_type` 回答“这条素材在创作中承担什么作用”，不可互相替代。

---

## 5. `tier` 语义与使用建议

| tier | 来源 | 质量 | 使用建议 |
|---|---|---|---|
| `curated` | 人工改写（早期 37 样本 + 37 高价值文件新写） | 高：转述改写、无运行时字段、IP 已抽象 | 可直接用于 sample/filter，优先返回 |
| `auto` | 全量可用池**非 IP** 候选，机器关键词标注 + 压缩摘录 | 中：可能误标 genres、内容为压缩摘录 | 正式生产前需人工抽检；filter 结果可作补充 |

安全红线（两层通用）：无 NSFW/未成年敏感、无旧平台运行时字段（`{{}}`/正则/变量/状态栏）、无绝对路径、禁用条目不入表。

---

## 6. 示例记录

### 6.1 curated 示例（cm-001）
```jsonc
{
  "id": "cm-001",
  "title": "替身人生模拟：一局完整的一生",
  "genres": ["fantasy", "adventure"],
  "material_type": "world_rule",
  "summary": "以“可观察的完整一生 + 结局兑换”为核心的一局式人生模拟设定。",
  "content": "每次开局，系统在世界里生成一具「替身」……替身死亡即结算，系统给出最终评价，并把一生获得的知识、技能、血脉等兑换为使用者真实拥有的力量。",
  "enabled": true,
  "tier": "curated",
  "source_id": "src-life-sim",
  "source_entry_ids": ["0"],
  "source_file": null
}
```

### 6.2 auto 示例（cm-a0001）
```jsonc
{
  "id": "cm-a0001",
  "title": "催眠暗示",
  "genres": [],                       // 未命中题材关键词 → 空
  "material_type": "world_rule",
  "summary": "- 贴在目标身上后,目标会听从其余人的话,无条件相信其他人的话。",
  "content": "- 贴在目标身上后,目标会听从其余人的话,无条件相信其他人的话。",  // 压缩摘录
  "enabled": true,
  "tier": "auto",
  "source_id": "src-auto",
  "source_entry_ids": ["16"],
  "source_file": "1233810226373984317__Fuzhou_1.0_1.json"   // 仅文件名
}
```

---

## 7. 数据约束（烟测 `material-query-smoke.mjs` 覆盖）

1. `id` 唯一；`title/summary/content` 非空，`content` ≥ 12 字（auto ≤ 200 字）。
2. `genres` 必须是 11 个受控枚举、0–3 个；`material_type` 必须是 9 个受控枚举之一。
3. `enabled === true` 才进入检索候选。
4. content/title 不含：绝对路径（`/Users/`、`Downloads/`）、运行时标记（`{{`、`setvar`、`<regex` 等）。
5. sample：无 Tag → 返回 enabled 记录；指定 material_type → 只返回该类型。
6. filter：genres + material_types 同时给 → 结果同时满足两维度；无匹配 → 返回空数组，不伪造。

---

## 8. 消费方式（给调用方）

- **sample（随机）**：`enabled=true` →（可选按 genres/material_type 缩小）→ 随机取 limit 条。无 Tag 时建议按 `material_type` 类型均衡（前四类占 78%）。
- **filter（筛选）**：同一维度“命中任意一个”，两维度同时给须同时满足；不足 limit 返回实际命中。
- **稀疏处理**：`school`（77）、`romance`（158）及 `质感细节×校园`（0）等组合命中率低——建议回退（school→urban、romance→slice_of_life），不伪造结果。
- **追溯**：`source_id`/`source_entry_ids`/`source_file` 仅供内部审查，不进入常规查询结果。

---

## 9. 已知局限

- auto 批 1,884 条为**机器预标注**：genres/material_type 关键词启发式，fantasy/historical 占比偏高可能有误标；正式开放检索前建议抽检（可先抽 100 条核准确率）。
- auto 的 content 是压缩摘录，不是人工再创作设定卡；需要更高质量时可对 auto 条目做二次改写（逐批）。
- IP/同人内容已从 auto 批剔除（机器无法抽象）；curated 中的 IP 内容已抽象为无专属名词的机制。
- 版权/授权未解决：仅内部使用；生产分发前需总控确认 IP 二创边界。
