---
name: content-design-and-creation
description: Coordinates the creative direction, blueprint, content settings, name, intro, and welcome message for interactive entertainment Bots; applicable to creation from scratch, overall completion, and non-specialized content modification.
---

# Content Design and Creation

## Responsibilities

This Skill advances scattered ideas or existing content to the deliverable appropriate for the current stage: a complete candidate, a blueprint, content settings, or a minimal modification. It coordinates experience, content, and scope, and does not aim to fill in every setting, produce long text, automatically create a Bot, or automatically save in-process data.

When character, world, theater, or gameplay issues require deep specialization, collaborate with the corresponding Skill. As long as this turn's goal is to produce a new direction, addition, rewrite, or modification, this Skill coordinates it; the routing for pure review is handled by the dedicated review Skill and is not re-judged here.

## Workflow

This Skill is responsible for deciding how this turn moves from intent to a reviewable deliverable, and only then proceeds to business action once explicitly authorized; the specialized Skills are only responsible for designing one dimension of character, world, theater, or gameplay well.

```text
1. Locate this turn's goal
   → Explore a new direction / expand a future new Bot / modify a clearly existing Bot.
   → When there is an existing Bot, first read the affected area; when there isn't, don't assume a Bot has been created.

2. Determine the depth of deliverable
   → Direction undecided: form 1–3 complete candidates.
   → Direction decided, needs expansion: read the blueprint or body-writing method and produce the corresponding content.
   → A localized problem in an existing Bot: form a minimal, clear diff.
   → If it touches the experience promise, core relationship, world rules, or gameplay prototype: return to the candidate/blueprint layer to re-converge, do not patch it locally.

3. Fill in necessary dimensions
   → Only read the character, world, theater, gameplay, or other specialized Skill for the current gap.
   → When inspiration, an anti-cliché angle, or a dimension-specific supplement is needed, use `creative_material_search` as needed.

4. Form a reviewable deliverable
   → A new creative candidate includes the experience promise, the user's position, the unique core, sustained tension, and the first entry point.
   → For overall creation or overall modification, simultaneously check the name, intro, welcome message, and core content.

5. Proceed to business action
   → Only call bot_workspace.create / bot_workspace.update after the user explicitly creates or confirms a modification.
   → Otherwise the proposal stays in the conversation; do not automatically create a Bot, Artifact, or image task.

6. Verify after writing
   → Verify the result covers the expected areas, preserves the confirmed core, and binds the current Session to the target Bot.
```

When a new creative request already has enough valid information, directly give 1–3 complete interactive candidates, without splitting candidate content into consecutive Choices. Only let the user choose, per the global rules, when there are 2–3 directions that genuinely cannot be inferred from existing input and would substantively change the experience; proactively fill in the rest.

## Default Presentation and Opening Rules

Name, intro, and welcome message are default deliverables of a full creation or overall modification, and should be checked together with the core content; there is no need to set up a separate round of Q&A for this.

```text
Name: Lets me recognize the object, world, or relationship entry point at a glance.
Intro: Makes me want to click in.
Welcome message: Lets me immediately know what's happening and how I can respond.
Content settings: Lets the model keep getting the interaction right afterward.
```

- The **name** should be clear and memorable, prioritizing the object, world, relationship, or unique angle; don't stack occupations and adjectives.
- The **intro**'s goal is to attract clicks, not to fully explain the setting. Keep it short and quickly scannable; freely choose whichever single most attractive angle fits the genre — e.g., character charm, relationship tension, an unusual setting, a secret, risk, the user's situation, or the experience promise of free entry/story creation. Do not mechanically apply a fixed structure, and do not restate the worldview, character dossier, or gameplay checklist.
- The **welcome message** starts from an anomaly, pressure, or opportunity that has already occurred and requires the user's response. Give the event, the character/environment reaction, and the user's position first, then add the minimum necessary background. The user must be positioned within the web of relationships around the event, able to explain, ask further, choose, stop, negotiate, refuse, leave, or bear consequences; the user cannot merely be a bystander watching the character perform.
- When phrasing inspiration is needed, different presentation angles need comparing, or `basic` actually needs to be written, read [`presentation-and-welcome-examples.md`](references/presentation-and-welcome-examples.md). Its examples are only for learning length, information density, and entry style — not fixed templates.

## Judgment and References

First determine whether there is a clearly existing Bot target; when there isn't, explore freely or create toward a future new Bot, but neither implies immediately creating a Bot. Read the necessary Reference for the current deliverable; do not load all of them at once.

| Current task | Reference to read | Usage principle |
| --- | --- | --- |
| Form or restructure the core direction | [`blueprint-design.md`](references/blueprint-design.md) | Read during the candidate/blueprint stage. |
| Turn a confirmed direction into the Bot's body content | [`detailed-content-writing.md`](references/detailed-content-writing.md) | Read only when complete body content is needed. |
| Modify an existing Bot's content | [`bot-update.md`](references/bot-update.md) | Read only when there is a clearly existing Bot and this turn is about changing it. |
| Actually write the name, intro, or welcome message, needing phrasing reference | [`presentation-and-welcome-examples.md`](references/presentation-and-welcome-examples.md) | Learn high-density presentation and opening-writing techniques; do not copy the examples verbatim. |

When the current idea is too generic, a key dimension is undefined, or a homogeneity/interaction gap is diagnosed, you may call `creative_material_search` as needed, taking a small amount of material yourself and rewriting, combining, or inverting it into a candidate, content, or minimal diff; do not paste it directly, do not turn search parameters into a Choice, and do not automatically write it to the Bot.

## Branch Acceptance Criteria

- **Free exploration / new Bot creation**: The user gets a direction they can continue discussing or land; a Bot is only created upon explicit creation.
- **Modifying an existing Bot**: Resolves the current problem, preserves the confirmed core, and gives a minimal, clear diff, without expanding into an overall rewrite.

Before delivery, check experience, entry, sustainability, user agency, novelty, richness, self-consistency, Prompt executability, and scope control.

## Boundaries of This Domain

- Do not run an extra LLM loop for intent classification first; judge based on this turn's Query, the conversation trajectory, and the latest Bot Snapshot.
- Blueprints, proposals, ordinary replies, image candidates, Todos, and the review process default to staying in the conversation trajectory; do not automatically create an Artifact or Bot update just because they "might be useful."
- Use `bot_workspace` for Bot search, read, create, update, or working-target operations; do not bypass the Tool to modify a Bot directly. Only use `artifact_workspace` when a right-side editable working page is actually needed.
- Do not define chat component payloads, front-end state, image polling, or Tool implementation details; do not display internal reasoning, tool execution process, or unfinished drafts.
