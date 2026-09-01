# creative_material_search

解锁项目内 `creative-material-library/creative-materials.json` 的受控素材查询。素材库包含已筛选的可再创作设定卡；本 Tool 不访问网页，不读取原始素材池，也不返回来源文件、原始条目或绝对路径。

## 何时使用

仅在以下情况调用：

- 用户明确要求参考外部素材、灵感或案例；
- 当前创意缺少关键的角色、关系、规则、冲突、场景或互动机制维度；
- 需要多个可比较的素材切口。

不要为了“完整”调用；已有明确创作方向、局部措辞修改、纯审查、Tool 参数问题时不调用。一次优先 1 条，确需比较时最多 3 条。

## 输入

```json
{
  "mode": "sample",
  "genres": ["school", "mystery"],
  "material_types": ["relationship", "conflict"],
  "tier": "curated",
  "limit": 1
}
```

- `mode`
  - `sample`：从符合条件的素材中抽取灵感；未指定 `tier` 时优先人工改写的 `curated`。
  - `filter`：按条件筛选，适合用户明确要求某类素材；结果顺序稳定，便于复查。
- `genres`（0–3）：`mystery`、`school`、`urban`、`fantasy`、`science_fiction`、`romance`、`workplace`、`historical`、`adventure`、`survival`、`slice_of_life`。
- `material_types`（0–3）：`character`、`relationship`、`world_rule`、`setting`、`scene`、`conflict`、`narrative_device`、`interaction_mechanic`、`style_detail`。
- 两个维度同时提供时必须同时匹配；同一维度内命中任一项即可。
- `tier`：`curated`（人工改写，优先）、`auto`（机器预标注，使用时自行复核）、`any`。
- `limit`：1–3；无结果时如实返回空列表，不伪造素材。

## 输出与使用

返回的每条素材仅有：`id`、`title`、`genres`、`material_type`、`summary`、`content`、`tier`。

- 将结果作为启发，结合用户需求改写、组合或反转；不要直接拼贴。
- 不把检索结果当成用户已确认的 Bot 事实，不自动创建或更新 Bot。
- 不要求或尝试读取来源文章、原始条目、`source_file` 或素材库全文。
