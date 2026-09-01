# Emochi Agent Workspace

A full-stack creative-agent workspace for developing Bots, characters, worlds, interactive scenarios and image directions. It includes the React workspace, Node/SSE agent service, local MCP tools, skill runtime, creative-material library, JSON data snapshot, Langfuse observability, and repeatable multi-turn evaluations.

## Quick start

```bash
cp .env.example .env.local
# Add your own gateway / optional Langfuse / optional image credentials.
npm ci
npm test
npm run dev:full
```

- UI: `http://127.0.0.1:5175`
- API: `http://127.0.0.1:8789/api/health`

Full deployment, persistence, Langfuse, and evaluation instructions are in [DEPLOYMENT.md](DEPLOYMENT.md). The evaluation runbook is [evals/AGENT-RUNBOOK.md](evals/AGENT-RUNBOOK.md).

## Security

`.env.local` and all `.env*` files are ignored. Commit only `.env.example`; set real credentials in the deployment provider's encrypted environment-variable settings.
