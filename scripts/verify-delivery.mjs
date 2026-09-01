#!/usr/bin/env node
/** Verify the repository handoff without reading or printing secret values. */
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const required=['package.json','package-lock.json','.env.example','README.md','DEPLOYMENT.md','server/app.js','server/agent-adapter.js','server/observability.js','agent-runtime/CLAUDE.md','agent-runtime/tools/image_task.md','agent-spec/.claude/skills/image-creation/SKILL.md','data/workspace.json','data/image-tasks.json','data/bot-library.seed.json','demo-seed/bot-library.seed.json','docs/creative-material-library/usable-pool.json','evals/agent-scenarios.json','evals/AGENT-RUNBOOK.md'];
const forbidden=[/sk-[A-Za-z0-9_-]{12,}/, /gh[pousr]_[A-Za-z0-9_]{20,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/];
const failures=[];
for(const item of required){try{await access(path.join(root,item));}catch{failures.push(`Missing required delivery file: ${item}`);}}
for(const item of ['.env.local','.vercel']){try{await access(path.join(root,item)); console.log(`Ignored local-only path present: ${item}`);}catch{}}
const files=['README.md','DEPLOYMENT.md','.env.example','server/store.js','server/agent-adapter.js','scripts/eval-agent.mjs'];
for(const item of files){const content=await readFile(path.join(root,item),'utf8');if(forbidden.some(pattern=>pattern.test(content)))failures.push(`Possible credential found in ${item}`);}
const sessionRoot=path.join(root,'data','sessions');
const workspace=JSON.parse(await readFile(path.join(root,'data','workspace.json'),'utf8'));
if(!Array.isArray(workspace.bots)||!Array.isArray(workspace.sessions))failures.push('data/workspace.json is not a valid workspace snapshot');
console.log(`Workspace snapshot: ${workspace.bots.length} Bots, ${workspace.sessions.length} Sessions`);
console.log(`Portable session root: ${sessionRoot}`);
if(failures.length){console.error('\nDELIVERY CHECK FAILED');for(const failure of failures)console.error(`- ${failure}`);process.exitCode=1;}else console.log('\nDELIVERY CHECK PASSED');
