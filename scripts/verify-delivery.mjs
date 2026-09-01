#!/usr/bin/env node
/** Verify the repository handoff without reading or printing secret values. */
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const required=['package.json','package-lock.json','.env.example','README.md','DEPLOYMENT.md','server/app.js','server/agent-adapter.js','server/observability.js','agent-runtime/CLAUDE.md','agent-runtime/tools/image_task.md','agent-spec/.claude/skills/image-creation/SKILL.md','data/workspace.json','data/image-tasks.json','data/bot-library.seed.json','demo-seed/bot-library.seed.json','docs/creative-material-library/usable-pool.json','evals/agent-scenarios.json','evals/AGENT-RUNBOOK.md'];
const forbidden=[/sk-[A-Za-z0-9_-]{12,}/, /gh[pousr]_[A-Za-z0-9_]{20,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/];
const failures=[];
for(const item of required){try{await access(path.join(root,item));}catch{failures.push(`Missing required delivery file: ${item}`);}}
for(const item of ['.env.local']){try{await access(path.join(root,item)); console.log(`Ignored local-only path present: ${item}`);}catch{}}
const ignored=await readFile(path.join(root,'.gitignore'),'utf8');
for(const pattern of ['.env*','node_modules/','dist/'])if(!ignored.includes(pattern))failures.push(`.gitignore must exclude ${pattern}`);
const textExtensions=new Set(['.js','.mjs','.jsx','.json','.md','.yaml','.yml','.txt','.html','.css','.env','.example']);
async function walk(dir){const entries=await (await import('node:fs/promises')).readdir(dir,{withFileTypes:true});const all=[];for(const entry of entries){if(['.git','node_modules','vendor','dist','.tmp'].includes(entry.name))continue;const absolute=path.join(dir,entry.name);if(entry.isDirectory())all.push(...await walk(absolute));else if(textExtensions.has(path.extname(entry.name))||entry.name==='.env.example')all.push(absolute);}return all;}
for(const absolute of await walk(root)){const content=await readFile(absolute,'utf8');if(forbidden.some(pattern=>pattern.test(content)))failures.push(`Possible credential found in ${path.relative(root,absolute)}`);}

const sessionRoot=path.join(root,'data','sessions');
const workspace=JSON.parse(await readFile(path.join(root,'data','workspace.json'),'utf8'));
if(!Array.isArray(workspace.bots)||!Array.isArray(workspace.sessions))failures.push('data/workspace.json is not a valid workspace snapshot');
console.log(`Workspace snapshot: ${workspace.bots.length} Bots, ${workspace.sessions.length} Sessions`);
console.log(`Portable session root: ${sessionRoot}`);
if(failures.length){console.error('\nDELIVERY CHECK FAILED');for(const failure of failures)console.error(`- ${failure}`);process.exitCode=1;}else console.log('\nDELIVERY CHECK PASSED');
