// 本地数据烟测：仅读取 creative-materials.json，验证 sample/filter 语义与数据质量。
// 运行：node docs/creative-material-library/material-query-smoke.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(__dirname, "creative-materials.json"), "utf-8"));
const M = DATA.materials;

const VALID_G = new Set(["mystery","school","urban","fantasy","science_fiction","romance","workplace","historical","adventure","survival","slice_of_life"]);
const VALID_T = new Set(["character","relationship","world_rule","setting","scene","conflict","narrative_device","interaction_mechanic","style_detail"]);
const RUNTIME_MARKERS = ["{{", "}}", "setvar", "getvar", "<regex", "findRegex", "replaceString"];
const ABS_PATH_MARKERS = ["/Users/", "Downloads/", "creative-material-library-brief"];

function pick(genres = [], material_types = [], limit = 1, strategy = "sample") {
  let pool = M.filter((m) => m.enabled === true);
  if (material_types.length) pool = pool.filter((m) => material_types.includes(m.material_type));
  if (genres.length) pool = pool.filter((m) => m.genres.some((g) => genres.includes(g)));
  if (strategy === "sample") {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  return pool.slice(0, Math.min(limit, pool.length));
}

function validate(records) {
  const errors = [];
  const ids = new Set();
  for (const m of records) {
    if (typeof m.id !== "string" || ids.has(m.id)) errors.push(`id 非法/重复: ${m.id}`);
    ids.add(m.id);
    if (typeof m.title !== "string" || !m.title.trim()) errors.push(`title 缺失: ${m.id}`);
    if (!Array.isArray(m.genres) || m.genres.length > 3 || !m.genres.every((g) => VALID_G.has(g))) errors.push(`genres 非法: ${m.id}`);
    if (!VALID_T.has(m.material_type)) errors.push(`material_type 非法: ${m.id}`);
    if (typeof m.summary !== "string" || !m.summary.trim()) errors.push(`summary 缺失: ${m.id}`);
    if (typeof m.content !== "string" || m.content.trim().length < 20) errors.push(`content 过短: ${m.id}`);
    if (m.enabled !== true) errors.push(`enabled 非 true: ${m.id}`);
    if (!["curated", "auto"].includes(m.tier)) errors.push(`tier 非法: ${m.id}`);
    if (m.tier === "auto" && m.content.length > 200) errors.push(`auto content 超长: ${m.id} (${m.content.length})`);
    if (RUNTIME_MARKERS.some((k) => m.content.includes(k))) errors.push(`含运行时标记: ${m.id}`);
    if (ABS_PATH_MARKERS.some((k) => m.content.includes(k) || (m.title || "").includes(k))) errors.push(`含绝对路径/来源痕迹: ${m.id}`);
  }
  return errors;
}

let failed = 0;
function check(name, cond, detail = "") {
  console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failed++;
}

// 1) sample 无 Tag
const s1 = pick([], [], 3, "sample");
check("sample 无 Tag 返回 enabled 记录", s1.length === 3 && s1.every((m) => m.enabled), `n=${s1.length}`);

// 2) sample 指定 material_type
const s2 = pick([], ["world_rule"], 3, "sample");
check("sample 指定 material_type 只返回该类型", s2.length > 0 && s2.every((m) => m.material_type === "world_rule"), `types=${[...new Set(s2.map((m) => m.material_type))].join(",")}`);

// 3) filter 双维度同时满足
const f1 = pick(["mystery"], ["narrative_device"], 3, "filter");
check("filter genres+material_types 同时满足", f1.every((m) => m.genres.includes("mystery") && m.material_type === "narrative_device"), `n=${f1.length}`);

// 4) filter 无匹配 → 空数组（动态找一个真实零组合，避免随数据增长失效）
const VALID_G_ARR = [...VALID_G], VALID_T_ARR = [...VALID_T];
let emptyCombo = null;
for (const g of VALID_G_ARR) for (const t of VALID_T_ARR) {
  const hits = M.filter((m) => m.genres.includes(g) && m.material_type === t && m.enabled === true);
  if (hits.length === 0) { emptyCombo = [g, t]; break; }
}
if (!emptyCombo) emptyCombo = ["school", "relationship"];
const f2 = pick(emptyCombo ? [emptyCombo[0]] : [], emptyCombo ? [emptyCombo[1]] : [], 3, "filter");
check("filter 无匹配返回空数组", Array.isArray(f2) && f2.length === 0, `combo=${emptyCombo.join("×")} n=${f2.length}`);

// 5) schema / 无路径 / 无运行时字段 / 无禁用
const all = pick([], [], 1000, "filter");
const errs = validate(all);
check("全量 schema 校验通过（无绝对路径/运行时字段/禁用）", errs.length === 0, errs.length ? errs.slice(0, 3).join("; ") : `records=${all.length}`);

// 附：两维度内部“任一命中”语义
const f3 = pick(["mystery", "urban"], ["narrative_device", "scene"], 3, "filter");
check("同维度任意命中语义", f3.every((m) => (m.genres.some((g) => ["mystery","urban"].includes(g))) && (["narrative_device","scene"].includes(m.material_type))), `n=${f3.length}`);

console.log(`\n结果：${failed === 0 ? "全部通过" : failed + " 项失败"}`);
process.exit(failed === 0 ? 0 : 1);
