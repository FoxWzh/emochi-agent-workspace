# Emochi Agent Workspace — Deployment Handoff

This repository is a full-stack creative-agent workspace: React/Vite UI, a Node.js API with Server-Sent Events, Claude Agent SDK orchestration, local MCP business tools, image generation integration, Langfuse observability, a bundled Bot snapshot, creative-material data, skills, and repeatable multi-turn evaluation scripts.

## Architecture

| Layer | Location | Role |
| --- | --- | --- |
| UI | `src/` | React 19 + Vite 7 workspace, conversations, Bot library/editor, image-task progress. |
| API | `server/` | Node HTTP server; session/Bot/artifact APIs and SSE agent stream. |
| Agent runtime | `agent-runtime/` | Project instruction, skills and tool contracts used by Claude Agent SDK. |
| Agent spec | `agent-spec/` | Source-of-truth editable skill/tool specification; keep it synchronized with `agent-runtime/` when changing skills. |
| Data | `data/`, `demo-seed/`, `docs/creative-material-library/` | JSON workspace snapshot, uploads, Bot seed and creative-material library. |
| Observability | `server/observability.js`, `evals/` | Langfuse OTEL traces and black-box multi-turn evaluation runner. |

## Repository data

All current JSON data, evaluation scenarios/results, uploaded demo images and creative-material files are committed in this **private** repository. They contain no API keys. Upload paths are persisted relative to `data/`, so the snapshot is portable after cloning.

The current storage engine is file-backed JSON:

```text
data/workspace.json       # Bot/artifact index and session metadata
data/sessions/*.json      # Full conversation records
data/image-tasks.json     # Image task history
data/uploads/*            # Uploaded demo/reference images
demo-seed/bot-library.seed.json
```

For a production deployment, set `EMOCHI_DATA_DIR` to a durable mounted volume/path. Do **not** rely on a serverless `/tmp` directory for persistent user data: it is ephemeral and may be reset on cold start. If deploying to Vercel, migrate these JSON records to a durable database/blob store first, or use the deployment only as an ephemeral demo.

## Prerequisites

- Node.js **20+** (Node 22 LTS recommended)
- npm (lockfile is committed; use `npm ci`)
- An Agent gateway compatible with the configured Claude Agent SDK endpoint
- Optional: Langfuse project credentials for trace capture
- Optional: Image gateway credentials for image generation

## Configure secrets

1. Clone the repository and create a local secret file:

   ```bash
   cp .env.example .env.local
   ```

2. Fill only `.env.local`; never add actual values to source files, GitHub Actions logs, eval result JSON, or commits.
3. Configure the same variables as encrypted secrets/environment variables in the hosting provider.

Required for agent turns:

```text
KAON_GATEWAY_BASE_URL
KAON_GATEWAY_MODEL
KAON_GATEWAY_API_KEY
```

Required for Langfuse tracing:

```text
LANGFUSE_PUBLIC_KEY
LANGFUSE_SECRET_KEY
LANGFUSE_BASE_URL
LANGFUSE_TRACING_ENVIRONMENT
```

`LANGFUSE_PROJECT_ID` is optional: it only enables direct Langfuse links in evaluation result files. Image generation additionally requires the three `IMAGE_GATEWAY_*` variables.

## Local run and verification

```bash
npm ci
npm test
npm run build
npm run server                 # API at http://127.0.0.1:8789
# In another terminal:
npm run dev                    # UI at http://127.0.0.1:5175
# Or use both:
npm run dev:full
```

Health check:

```bash
curl -sS http://127.0.0.1:8789/api/health
```

Expected result is a JSON object with `status: "ok"`. The gateway fields report only configuration state; no secrets are returned.

Run the portable delivery audit before deploying:

```bash
node scripts/verify-delivery.mjs
```

## Langfuse and evaluation

Langfuse is optional at boot: without keys, the app works but trace export is disabled. With keys set, each agent query creates a trace containing the agent loop, prompt/source breakdown, tool calls, skill/reference reads, usage and timing.

The black-box runner calls the real local API, simulates fixtures and multi-turn responses, persists full SSE evidence and records every `trace_id`:

```bash
npm run eval:agent -- --list
npm run eval:agent -- --scenario alba-confirmed-content-write
```

Results are saved in `evals/runs/`. See `evals/AGENT-RUNBOOK.md` for scenario authoring and Langfuse trace review.

## Deployment notes

### Vercel (included configuration)

`vercel.json` builds the Vite UI and routes `/api/*` to `api/[...path].js`. It bundles `agent-runtime/` and the Bot seed. Set environment variables in the Vercel project, then deploy with the repository integration or Vercel CLI.

**Important:** Vercel Functions have read-only source files and ephemeral `/tmp` storage. It is appropriate for a demo, not durable data. Before production, replace `server/store.js` with a persistent database/blob adapter or run this Node service on infrastructure with a persistent volume and set `EMOCHI_DATA_DIR`.

### Persistent Node deployment

Use a host/container with a writable mounted data volume. Set:

```text
EMOCHI_DATA_DIR=/persistent/emochi-data
AGENT_PORT=8789
```

Copy the repository `data/` directory into that volume for the initial snapshot, install with `npm ci`, run `npm run build`, then start `npm run server`. Serve `dist/` with a reverse proxy and route `/api/*` to port 8789 (or deploy through the included Vercel adapter).

## Agent-maintenance rules

- Do not modify `agent-runtime/CLAUDE.md` unless explicitly authorized by the project owner.
- Update skills under `agent-spec/.claude/skills/`, then synchronize changed directories to `agent-runtime/.claude/skills/`.
- Tool contracts must remain synchronized between `agent-spec/tools/` and `agent-runtime/tools/`.
- Run `npm test`, `npm run build`, and a focused `eval:agent` scenario for agent/tooling changes.
