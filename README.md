# Emochi Agent Workspace

> A **Claude Agent SDK** creative-agent application for creating and editing Bots, characters, worlds, interactive stories and image directions.

The repository contains the full delivery: React/Vite UI, Node/SSE API, Claude Agent SDK orchestration, in-process MCP tools, runtime Skills/References, portable JSON data, creative-material library, Langfuse observability, and multi-turn evaluation scripts/evidence.

## Deployment handoff

Read **[`DEPLOYMENT.md`](DEPLOYMENT.md)** first. It explains the Claude Agent SDK gateway requirement, runtime execution flow, secrets, durable JSON storage, reverse-proxy/SSE setup, Langfuse, evaluation, and the current release changes.

- Environment template: [`.env.example`](.env.example)
- Evaluation runbook: [`evals/AGENT-RUNBOOK.md`](evals/AGENT-RUNBOOK.md)

## Local verification

```bash
cp .env.example .env.local
# Populate with your own secrets; never commit .env.local.
npm ci
node scripts/verify-delivery.mjs
npm test
npm run build
npm run dev:full
```

- UI: `http://127.0.0.1:5175`
- API health: `http://127.0.0.1:8789/api/health`
