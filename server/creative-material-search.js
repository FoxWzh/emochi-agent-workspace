// Controlled access to the project's curated creative-material table.
// Never expose source_entry_ids/source_file or the source corpus to the Agent.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomInt } from 'node:crypto';

const materialFile=path.join(process.cwd(),'docs','creative-material-library','creative-materials.json');
let cachedMaterials=null;
const loadMaterials=async()=>{
  if(cachedMaterials)return cachedMaterials;
  const parsed=JSON.parse(await readFile(materialFile,'utf8'));
  cachedMaterials=(parsed.materials||[]).filter(material=>material?.enabled===true);
  return cachedMaterials;
};
const matches=(material,genres=[],materialTypes=[])=>(!genres.length||material.genres?.some(genre=>genres.includes(genre)))&&(!materialTypes.length||materialTypes.includes(material.material_type));
const project=material=>({id:material.id,title:material.title,genres:material.genres,material_type:material.material_type,summary:material.summary,content:material.content,tier:material.tier});
const shuffled=items=>{const pool=[...items];for(let index=pool.length-1;index>0;index--){const swap=randomInt(index+1);[pool[index],pool[swap]]=[pool[swap],pool[index]];}return pool;};

export async function queryCreativeMaterials({mode='sample',genres=[],material_types=[],limit=1,tier='any'}){
  const materials=await loadMaterials();let pool=materials.filter(material=>matches(material,genres,material_types));
  if(tier!=='any')pool=pool.filter(material=>material.tier===tier);
  if(mode==='sample'&&tier==='any')pool=[...shuffled(pool.filter(material=>material.tier==='curated')),...shuffled(pool.filter(material=>material.tier==='auto'))];
  else if(mode==='sample')pool=shuffled(pool);
  return {mode,filters:{genres,material_types,tier},returned:Math.min(limit,pool.length),materials:pool.slice(0,limit).map(project),usage:'素材仅用于创作启发。必须结合当前任务改写、组合或反转；不要复述来源原文，不要把素材当成已确认的 Bot 事实。'};
}
