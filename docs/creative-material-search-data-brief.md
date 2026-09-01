# 差异化创作素材：数据结构化与检索准备 Brief

## 目标

为 Emochi 的 `creative_material_search` 准备一份**真实可查询的轻量素材数据集**，使后续实现可以支持：

```text
sample  在给定条件下随机抽取少量素材
filter  使用“题材/体验 + 内容作用”两个维度组合筛选素材
```

本任务的重点是**处理素材数据本身**：整理、切分、改写、标注、统计和验证数据分布。

不需要实现 Agent Runtime、MCP Tool 注册、HTTP/SSE、前端组件或数据库服务；也不要修改现有 `CLAUDE.md`、Tool/Skill 文档。

---

## 已确定的产品语义

外部素材库用于降低创作时的泛化和同质化。它是：

```text
创作参考
不是事实知识库
不是 Bot Prompt 模板
不是默认上下文
不是可直接复制的原文
```

素材检索后，Agent/Skill 还会自行改写、组合、反转或具体化；素材不会自动写入 Bot。

当前 Tool 契约位于 Agent 规格项目：

```text
../../emochi-agent-spec/tools/creative_material_search.md
```

若执行环境不以本项目为工作目录，使用对应本地路径定位该文件；不要将机器绝对路径写入最终可部署的数据、Tool 或 Skill。

---

## 已定义的检索能力

### 1. `sample`：随机取样

```text
按可选 Tag 条件缩小候选池
→ 在候选中随机抽取少量记录
```

无需 Tag 时，未来数据层会进行类型均衡抽样；因此并非所有 `material_type` 都适合成为“开放创作起点”。需要在统计中标注样本量过低或不适合随机的类别。

### 2. `filter`：组合筛选

```text
genres（题材 / 体验）
∩
material_types（内容作用）
→ 返回少量匹配素材
```

同一维度内按“命中任意一个”理解；两个维度同时提供时必须同时满足。若某些交叉组合样本过少，后续检索层会自行决定回退策略；本任务需要把这种稀疏性统计出来，不要伪造数据补足。

---

## 两个 Tag 维度

### A. `genres`：题材 / 体验

它回答：**这条素材适合怎样的外层题材、场景或体验气质？**

当前候选枚举：

```text
mystery          悬疑
school           校园
urban            都市
fantasy          奇幻
science_fiction  科幻
romance          恋爱 / 情感关系
workplace        职场
historical       历史 / 架空历史
adventure        冒险
survival         生存 / 危机
slice_of_life    日常
```

### B. `material_type`：内容作用

它回答：**这条素材可给 Bot 创作补什么内容？**

当前枚举：

```text
character              人设、欲望、矛盾、行为边界
relationship           关系结构、秘密、信任、权力、依赖
world_rule             世界规则、代价、资源、信息边界
setting                地点、组织、制度、环境压力
scene                  可进入的当前场景
conflict               持续冲突、目标对抗、两难
narrative_device       信息差、叙事视角、秘密、反转
interaction_mechanic   用户行动、反馈、后果、循环
style_detail           生活、感官、表达等可互动细节
```

两个维度必须分开：

```text
genres
= 外层题材 / 体验

material_type
= 这条素材在创作中承担的作用
```

不要把“奇幻”“信息差”“世界规则”“玩法循环”等不同性质的词继续混在一个 `tags` 数组中。

---

## 输入数据

优先使用当前已整理的可用池和示范素材：

```text
docs/creative-material-library/usable-pool.json
docs/creative-material-library/sample-materials.json
docs/creative-material-library/slice-plan.json
docs/creative-material-library/sources.json
docs/creative-material-library/README.md
docs/creative-material-library/data-quality-notes.md
```

`usable-pool.json` 是已过滤的原始候选池，不是最终可检索数据表。它目前没有正式的 `genres` 与 `material_type` 标注，不能直接给 Tool 查询。

如确有必要，可只读使用原始来源文件；不要改动原始下载包或原始爬取文件。

---

## 数据处理要求

### 1. 生成最终可查询素材表

输出一份结构化数据，例如：

```ts
type CreativeMaterial = {
  id: string;
  title: string;
  genres: GenreTag[];
  material_type: MaterialType;
  summary: string;
  content: string;
  enabled: boolean;
  source_id?: string;
  source_entry_ids?: string[];
};
```

要求：

- `genres` 为 0–3 个受控枚举值；
- `material_type` 只能有 1 个主类型；
- `summary` 是短预览；
- `content` 是经过转述/改写的可再创作设定卡，不是大段原文；
- `enabled=true` 的记录必须符合通用安全与质量边界；
- 来源字段仅供内部追溯，不能让原始文件路径或大段原文进入常规查询结果；
- 不新增无限 `tags` 自由文本体系。如有辅助关键词，需说明其必要性和受控范围。

### 2. 长文本处理

- 不强制将所有整本世界书或所有长 entry 切片；
- 短且独立的可迁移内容可直接转化为一条素材；
- 长内容仅在存在独立、可复用机制时按语义职责提取，例如规则、关系、地点、冲突、互动入口；
- 不使用固定字符数机械切块；
- 不把整本设定集、原文 Prompt、角色卡全文直接塞入 `content`。

### 3. 质量与安全过滤

排除或不启用：

```text
NSFW、未成年敏感、非自愿/违法导向内容
旧平台正则、变量表、状态栏、按钮、自动触发、运行时配置
纯目录、空条目、禁用条目、无互动价值的格式模板
强依赖 IP/同人专有世界设定的原文
```

IP/同人内容若保留，必须转化为无专属名词的抽象机制/结构，并在报告中标明处理原则；不要声称已解决授权问题。

---

## 必须交付

在以下目录中创建或更新数据交付物：

```text
docs/creative-material-library/
```

### A. `creative-materials.json`（必须）

- 最终可供 `creative_material_search` 使用的结构化素材表；
- 不要求一次覆盖全部 10,809 条原始候选；优先保证第一批数据真实、干净、可查询；
- 说明实际产出数量与范围；
- 至少覆盖所有有足够质量来源的 `material_type`，若某类不能安全/可靠覆盖，明确写入统计。

### B. `tag-distribution.md`（必须）

必须包含：

```text
1. 总素材数
2. material_type 分布
3. genre 分布
4. genre × material_type 交叉分布
5. 无 genre / 多 genre 的数量
6. 样本过少、极度偏斜、不可用于 sample 的类型或组合
7. 对 sample/filter 的数据层限制建议
```

### C. `README.md`（更新）

简洁补充：

```text
- 当前最终素材表的字段定义
- 数据来源与转述原则
- 长文本提取原则
- Tag 规则
- 已知局限
```

不要重新加入长篇爬取过程日志或机器绝对路径。

### D. `material-query-smoke.mjs`（必须）

实现一个**仅针对数据文件的本地查询烟测**，不接 Agent Runtime。

至少验证：

```text
1. sample：无 Tag 时能返回有效、enabled 的记录；
2. sample：指定 material_type 时只返回对应类型；
3. filter：genres + material_types 同时给出时，结果同时满足两者；
4. filter：无匹配时返回空数组，不伪造内容；
5. 所有返回记录满足 schema，且没有绝对文件路径、原始运行时字段或禁用标记。
```

这个脚本应直接读取 `creative-materials.json`，并可以通过以下方式运行：

```bash
node docs/creative-material-library/material-query-smoke.mjs
```

---

## 不在范围内

```text
- 修改 emochi-agent-spec/CLAUDE.md
- 修改任何 Tool / Skill 文档
- 注册 Agent Tool 或实现 MCP / HTTP / SSE
- 修改前端页面或前端 Mock Repository
- 实现向量库、Embedding、RAG、知识图谱
- 复制全部原始 entry 入表
- 对素材做生产版权、授权或审核结论
```

---

## 验收

完成时报告：

1. 新增/修改的文件路径；
2. 最终素材数量；
3. 两套 Tag 的分布和关键稀疏组合；
4. 哪些内容被排除或未启用；
5. 烟测命令与实际输出；
6. 还需总控决定的 Tag、回退或内容边界问题。
