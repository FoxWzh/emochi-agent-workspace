# Emochi Agent Workspace — Deployment Handoff

> **This is a Claude Agent SDK application.** It is not a plain chat-completions service. Each user turn invokes `@anthropic-ai/claude-agent-sdk`, uses a project instruction and on-demand Skills, can call native `Skill` / `Read` / `WebSearch` / `WebFetch`, and uses an in-process MCP server for Bot, interaction, image-task and creative-material tools.

This document is the handoff for the online deployment agent. The private Git repository contains the complete deployable snapshot: app source, lockfile, Agent runtime/spec, Bot/session/image data, uploaded images, creative-material library, Langfuse instrumentation, evaluation runner, scenarios and evaluation evidence. **No real credentials are committed.**

## 1. Technology architecture

| Layer | Location | Responsibility |
| --- | --- | --- |
| Browser UI | `src/` | React 19 + Vite 7 workspace, conversations, Bot library/editor, image task progress. |
| API | `server/` | Node HTTP server, REST endpoints and SSE agent endpoint `POST /api/sessions/:id/messages`. |
| **Agent orchestration** | `server/agent-adapter.js` | **Claude Agent SDK** `query()` loop. Sets SDK cwd to `agent-runtime/`, resumes SDK sessions, bridges tools and returns cleaned final replies. |
| Local MCP tools | `server/agent-tools.js` | Claude Agent SDK MCP server `emochi_workspace`: Bot workspace, artifacts, UI interactions, image tasks, creative-material search. |
| Runtime | `agent-runtime/` | Exact deployed `CLAUDE.md`, Skills, References and tool contracts used by the SDK. |
| Spec source | `agent-spec/` | Source-of-truth Skills/contracts. Keep synchronized with `agent-runtime/` after changes. |
| Data | `data/`, `demo-seed/`, `docs/creative-material-library/` | JSON state, uploads, Bot seed and creative-material corpus. |
| Observability | `server/observability.js`, `evals/` | Langfuse OTEL traces plus black-box multi-turn evaluation. |

## 2. Claude Agent SDK execution flow

```text
React UI
  → POST /api/sessions/:sessionId/messages
  → server/app.js creates SSE turn + Langfuse trace
  → server/agent-adapter.js calls Claude Agent SDK query()
      cwd = agent-runtime/
      settingSources = [project]
      skills = bundled on-demand Skills
      MCP = in-process emochi_workspace
      KAON gateway config is mapped to ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL
  → SDK reads Skills/References and calls MCP tools as needed
  → API streams visible status/activity/interaction/Bot/image events + final reply
  → JSON session state and Langfuse trace are retained
```

### Gateway requirement

The configured endpoint **must be Claude Agent SDK-compatible** and support the agent/tool/streaming loop. An OpenAI-compatible chat-completions-only endpoint is insufficient.

```text
KAON_GATEWAY_BASE_URL  # SDK-compatible Anthropic base URL
KAON_GATEWAY_MODEL     # falls back to deepseek-v4-flash if omitted
KAON_GATEWAY_API_KEY   # secret; never commit
```

The adapter maps those values internally to `ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY` for the SDK process.

## 3. Demo data, temporary database and persistence

### This is a demo-scale file database

The current persistence layer is deliberately a **small, demo-oriented JSON database**, not a production multi-user database service. `server/store.js` treats the configured data directory as its database and serializes mutations in-process. The repository ships only small, usable production-like samples for demonstration, visual verification and evaluation; it does **not** contain a complete production dataset, customer database or a managed DB dump.

The online deployment agent must preserve this distinction:

- Deploying the repository as-is produces a functioning **demo** with the committed sample Bots, sessions, image-task records and creative-material subset.
- Writes made by users (new sessions, Bot edits, uploaded images, image tasks) are stored in JSON files in `EMOCHI_DATA_DIR`.
- It is suitable for a small internal demo or single-instance evaluation. It is not safe for horizontal scaling, multiple independently running API instances, high concurrent writes, backups/restore guarantees, user isolation or a large production dataset.
- Do not call the committed samples “production database data.” They are intentionally limited production-like demo data.

All demo/evaluation data required to reproduce the current project state is tracked in this private repository:

```text
data/workspace.json                         # Bot/artifact index + Session metadata
data/sessions/*.json                         # Demo conversation records
data/image-tasks.json                        # Demo image task state/history
data/uploads/*                               # Uploaded demo/reference image bytes
demo-seed/bot-library.seed.json              # First-run Bot sample seed
docs/creative-material-library/*.json        # Small curated material-search dataset
evals/agent-scenarios.json                   # Multi-turn fixtures/scenarios
evals/runs/*                                 # Prior SSE/evaluation/Langfuse evidence
```

Attachment locations are committed as relative `uploads/<filename>` paths and hydrated against the active data directory at runtime. The clone does not depend on the original developer machine path.

### Demo deployment storage

For a disposable online demo, initialize a writable volume from the repository `data/` folder and mount it at `EMOCHI_DATA_DIR`. It will begin with the included sample state. If the volume is deleted/recreated, copy `data/` again to reset the demo.

### Required durable storage for a retained demo

For a demo whose edits should survive restart/redeploy, attach a persistent volume/path and set:

```text
EMOCHI_DATA_DIR=/persistent/emochi-agent-data
AGENT_PORT=8789
NODE_ENV=production
```

Before first boot, copy repository `data/` into that volume:

```bash
mkdir -p /persistent/emochi-agent-data
cp -a data/. /persistent/emochi-agent-data/
```

Do not use an ephemeral filesystem when the demo's edits must survive. For a real production rollout, replace `server/store.js` with a durable database/blob adapter (and move uploads to object storage) before enabling multi-user or multi-instance usage. Perform an explicit migration from this demo JSON snapshot; do not assume it is a production database.

## 3.1 If replacing the JSON database: required implementation contract

Do **not** do a mechanical “JSON files → tables” replacement. The current code mixes data shape normalization, attachment path hydration, atomic mutation ordering, public-response redaction, session/SDK continuity and image-task recovery in `server/store.js` and `server/app.js`. A database replacement must preserve these observable behaviors before changing schemas or scaling topology.

### Current logical model and ownership

| Logical record | Current location | Important fields / relationship |
| --- | --- | --- |
| Workspace | `data/workspace.json` | Global `bots[]`, `artifacts[]`, `sessions[]` **metadata only** and `bot_samples_imported`. |
| Session | `data/sessions/<sessionId>.json` | Full `messages[]`, `interactions[]`, `timeline[]`, `artifactIds[]`, `workObjectId`, `business_revision`, SDK resume fields. Workspace contains a matching lightweight metadata record. |
| Bot | Workspace `bots[]` | `id`, `basic`, `content`, `advanced`, timestamps; `init_prompt` is derived from these fields. A Session's `workObjectId` references it. |
| Artifact | Workspace `artifacts[]` | `id`, type/title/data, optional `bot_ref`; Session `artifactIds[]` owns/links artifacts. `timeline[]` references artifacts for message anchoring. |
| Interaction | Session `interactions[]` | `id`, pending/resolved status, option/response, `turn_id`, `after_message_id`. Exactly-once response behavior is enforced by status. |
| Image task | `data/image-tasks.json` | `session_id`, `turn_id`, `after_message_id`, task lifecycle and image result references. It must be recoverable after process restart. |
| Upload | `data/uploads/*` | Attachment metadata stores public relative URL `/api/uploads/<file>` plus a data-relative `file_path` (`uploads/<file>`). Bytes must move to durable object/blob storage when replacing local disk. |

### Non-negotiable invariants

The deployment/migration Agent must retain and test all of these:

1. **Atomicity / concurrency:** today `transact()` serializes all mutations in a single process. A database adapter must use database transactions and appropriate optimistic locking/row locking. In particular, a Session must reject a second overlapping Agent turn, and concurrent updates must not overwrite another Session/Bot/Artifact change.
2. **Session split model:** the workspace index has only session navigation metadata; full conversation state lives per Session. Do not accidentally return full private session/SDK state in the list endpoint.
3. **Private SDK fields:** `sdk_session_id` and `sdk_seen_tool_use_ids` are persisted to resume Claude Agent SDK and suppress replayed tool events, but are stripped by `publicState()` before reaching the browser. Preserve this redaction boundary.
4. **Agent resume correctness:** persist the SDK session ID immediately when first received; persist seen tool-use IDs; preserve `business_revision`. Losing them changes context/resume behavior and can replay old tools or increase token usage.
5. **Message/event anchoring:** interactions, image tasks and timeline artifacts start with `turn_id` and receive `after_message_id` only when the final assistant message is saved. Keep this order or cards can attach above the wrong user turn.
6. **Bot canonicalization:** preserve current canonical fields (`basic.name`, `basic.intro`, `basic.welcome`, `basic.cover_url`, `basic.visibility`, `basic.tags`, `advanced.voice`, `advanced.examples`). `normaliseBot()` reads legacy aliases only for compatibility; do not write legacy aliases in the new database.
7. **Derived prompt:** `init_prompt` is derived from Bot fields by `prompt(bot)`. Recompute it on create/update or derive it at read time; do not let it become stale or treat it as an unrelated source of truth.
8. **Artifact ownership / cleanup:** deleting a Bot unbinds Sessions that reference it and removes its linked artifacts. Deleting a Session removes its session record but must not indiscriminately delete shared/global Bot data. Preserve the single `image_library`-per-Session consolidation behavior.
9. **Uploads:** never persist machine-absolute paths. Preserve public attachment URLs and store an opaque object key / data-relative key. The Agent runtime still needs a secure readable local stream/path when it turns an uploaded image into a Claude SDK image block.
10. **Data isolation:** the demo is currently effectively one workspace. If adding authentication/multi-tenancy, add `workspace_id` / tenant ownership to **every** Session, Bot, Artifact, Interaction, ImageTask and upload query before exposing the service; do not rely on client-supplied IDs alone.

### Recommended migration sequence

1. Make a **read-only backup** of the mounted `EMOCHI_DATA_DIR`, including `workspace.json`, `sessions/`, `image-tasks.json` and `uploads/`; record file hashes and counts.
2. Define an explicit relational/document schema from the logical model above. Keep JSON-shaped Bot `content`/`advanced` only where it is intentional; do not flatten without preserving semantics.
3. Build a storage adapter behind the existing `load`, `transact`, `save`, `publicState`, `readImageTasks`, `writeImageTasks` contract. Avoid changing UI/API/Agent behavior in the same PR as data migration.
4. Import in dependency order: uploads/object keys → Bots → Artifacts → Session metadata/full records → interactions/timeline/message anchors → image tasks. Validate every foreign reference (`workObjectId`, `artifactIds`, `bot_ref`, `after_message_id`, `session_id`, `turn_id`).
5. Run dual-read or a staging import, compare logical counts and sampled full records, then run the automated tests and black-box evaluation suite against the new adapter.
6. Only after functional parity, switch writes atomically to the new store. Retain the JSON backup and a tested rollback path until post-deploy evaluation and Langfuse traces are accepted.

### Required database-migration acceptance tests

At minimum run:

```bash
npm test
npm run build
npm run eval:agent -- --scenario alba-review-choice
npm run eval:agent -- --scenario alba-confirmed-content-write
```

Additionally verify: a restart retains data; public `/api/state` never returns `sdk_session_id`, `sdk_seen_tool_use_ids` or absolute upload paths; an uploaded image can still be supplied to the Agent; a resolved interaction cannot be resolved twice; a Bot delete repairs references; and Langfuse still records one trace per Agent query with tool/input/output evidence.

## 4. Secrets configuration

```bash
cp .env.example .env.local
```

For online deployment, configure the values below as encrypted platform secrets/environment variables. Never commit `.env.local`, print secrets in logs, send them to Langfuse, or put them in evaluation output.

### Required for Claude Agent SDK turns

```text
KAON_GATEWAY_BASE_URL
KAON_GATEWAY_MODEL
KAON_GATEWAY_API_KEY
```

### Required for Langfuse tracing

```text
LANGFUSE_PUBLIC_KEY
LANGFUSE_SECRET_KEY
LANGFUSE_BASE_URL
LANGFUSE_TRACING_ENVIRONMENT
```

Optional: `LANGFUSE_PROJECT_ID` adds direct trace URLs to evaluation result JSON. `LANGFUSE_AGENT_ID` and `LANGFUSE_AGENT_VERSION` annotate traces.

### Required to generate images

```text
IMAGE_GATEWAY_BASE_URL
IMAGE_GATEWAY_MODEL
IMAGE_GATEWAY_API_KEY
```

Without Langfuse the app still works but no traces are exported. Without image variables the text/Bot system works but image generation returns a configuration error.

## 5. Deployment procedure

This repository has **no Vercel-specific deployment configuration**. It includes a provider-neutral `Dockerfile`: one Node 22 container serves the built Vite SPA and `/api/*` on the same origin. Attach a persistent volume at `EMOCHI_DATA_DIR`.

### A. Preferred online deployment: container

Use the committed `Dockerfile` with any online service that supports a persistent volume and encrypted environment variables:

```bash
docker build -t emochi-agent-workspace .
docker run --rm -p 8789:8789 \
  -v <durable-volume>:/var/lib/emochi \
  -e EMOCHI_DATA_DIR=/var/lib/emochi \
  -e AGENT_PORT=8789 \
  -e KAON_GATEWAY_BASE_URL -e KAON_GATEWAY_MODEL -e KAON_GATEWAY_API_KEY \
  -e LANGFUSE_PUBLIC_KEY -e LANGFUSE_SECRET_KEY -e LANGFUSE_BASE_URL -e LANGFUSE_TRACING_ENVIRONMENT \
  -e IMAGE_GATEWAY_BASE_URL -e IMAGE_GATEWAY_MODEL -e IMAGE_GATEWAY_API_KEY \
  emochi-agent-workspace
```

Before the first container run, initialize `<durable-volume>` with the repository `data/` directory. The container serves the UI at `/` and the API at `/api/*`; no separate frontend service or proxy is required. If the platform terminates TLS itself, expose container port `8789` through its normal HTTPS ingress.

### B. Source install and validate

```bash
git clone https://github.com/FoxWzh/emochi-agent-workspace.git
cd emochi-agent-workspace
npm ci
node scripts/verify-delivery.mjs
npm test
npm run build
```

### C. Configure storage and secrets

1. Prepare/mount the persistent data volume, copy `data/` as shown above. This is the demo's temporary file database.
2. Set `EMOCHI_DATA_DIR`, `AGENT_PORT`, Agent SDK gateway variables, and optional Langfuse/image gateway values as encrypted runtime configuration.
3. If this is only an ephemeral demo, document its reset policy; deleting/recreating the volume resets all runtime changes to the Git snapshot.

### D. Start and route

```bash
npm run server
```

The Node service serves `dist/` as the public SPA root and `/api/*` itself, so a standalone host needs no separate static server. If you place a proxy in front, preserve same-origin `/api/*`, support Server-Sent Events, and **do not buffer** `POST /api/sessions/:id/messages`.

```bash
curl -sS http://127.0.0.1:8789/api/health
```

Expected output contains `"status":"ok"`; it reports only configuration state, never keys.

## 6. Current release changes to preserve

1. **Visible progress:** persistent thinking status while the SDK runs, plus current Skill/Reference/Web activity. Old activity is reset every turn.
2. **No internal narration leakage:** text is buffered; text tied to a later SDK `tool_use` is treated as internal retry/planning text, never shown or written to session history.
3. **Strict Bot writes:** only canonical explicit `bot_workspace` changes are accepted; invalid legacy forms cannot silently produce incomplete Bots.
4. **Bot context behavior:** an agent-created/searched/updated Bot binds to the composer and opens the right-side Bot workspace; sidebar and composer open the Bot library.
5. **Image default:** image Skill/tool/service defaults to **four** generated images unless the user explicitly requests another count; variants require material visual differences.
6. **Simplified UI:** transient “currently editing Bot” and “cover staged” notices are removed while real save/live-generation state remains.
7. **Langfuse evidence:** traces include tool failures/retry metadata, SDK-generation usage deduplicated by SDK message ID, and later-stream backfilled tool input snapshots.

## 7. Langfuse and evaluation

`server/observability.js` creates one Langfuse trace per Agent query. Trace contents include `agent_query_loop`, context/prompt breakdown, `assistant_turn_*`, tools, Skill/reference retrievers, `query_usage_summary`, timing and token usage.

The black-box runner invokes the real API, creates temporary fixtures, simulates multi-turn messages/confirmation choices, captures all SSE events and saves `trace_id` values:

```bash
npm run eval:agent -- --list
npm run eval:agent -- --scenario alba-confirmed-content-write
```

Results are saved under `evals/runs/`. Inspect each `trace_id` in Langfuse; confirm tool schemas do not retry unexpectedly, final visible messages contain no internal debug narration, and token/TTFT behavior is acceptable. Full runbook: [`evals/AGENT-RUNBOOK.md`](evals/AGENT-RUNBOOK.md).

## 8. Post-deploy checklist

```bash
curl -sS http://127.0.0.1:8789/api/health
npm run eval:agent -- --list
npm run eval:agent -- --scenario alba-confirmed-content-write
```

Verify:

- `/api/health` says `status: ok` and gateway configuration is present;
- evaluation result has a `session_id`, per-turn SSE events, final visible reply and trace IDs;
- Langfuse contains the expected agent/tool/Skill/reference/usage spans;
- uncounted image request creates four candidates after the image gateway completes;
- the mounted `EMOCHI_DATA_DIR` survives service restart;
- the deployment is labeled as a demo and its temporary JSON data/reset policy is clear to users and operators.

## 9. Safe maintenance / rollback

- Do **not** change `agent-runtime/CLAUDE.md` without explicit owner authorization.
- Edit Skills under `agent-spec/.claude/skills/`, then synchronize changed directories into `agent-runtime/.claude/skills/`.
- Keep `agent-spec/tools/` and `agent-runtime/tools/` synchronized.
- For Agent/tool changes run `npm test`, `npm run build`, and focused `npm run eval:agent -- --scenario <id>`.
- Back up `$EMOCHI_DATA_DIR` before migration, destructive tests, or rollback. Eval fixture Bots are cleaned up by default; `[Eval]` sessions are kept for trace inspection.
