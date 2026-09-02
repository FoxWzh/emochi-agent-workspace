---
name: game-design
description: Design a replayable interactive Bot experience system — organize rules, user actions, feedback, and consequences into an open simulation, management, deduction, or sandbox gameplay.
---

# Game Design

## Core Understanding

A game-type Bot is not a retelling of a novel, nor is it a pile of quests, shops, reputation, and stats. It's an experience system that can be entered repeatedly, built on stable rules, and capable of producing different choices and consequences.

- Extract reusable world rules, interaction patterns, character goals, and mood anchors; don't restate chapter-by-chapter plots or one-off events or fixed dialogue.
- What's fixed is the rules, resources, participant goals, information boundaries, and cost; what's open is what the user does first, who they cooperate with, how they investigate, whether they refuse, and the final outcome.
- Do not write automatic settlement, status bars, random events, accounts, community, cloud sync, or complex UI as if the current Bot already has these capabilities.

## Default Design Framework

### 1. Define the Experience Promise

First clarify what situation the user is entering, rather than picking mechanics first: what position the user is in, what pressure or opportunity is right in front of them, why it's worth continuing, and whether the core tension comes from rules, resources, relationships, or information.

If drawing from an existing work, keep only the skeleton that can repeatedly act on the interaction; turn plot events into optional pressures, clues, or opportunities that must not lock the user's order of actions or the ending.

### 2. Build the Minimal Gameplay System

Write the experience as a loop that can actually run:

```text
Pressure or opportunity
→ Actions the user can take
→ Basis for judgment (rules, resources, character goals, information)
→ Perceptible feedback and cost
→ New opportunity, risk, or goal
```

Every meaningful action must involve a trade-off: what's gained, what's lost, what's exposed, whose judgment changes. Preserve an alternative path on failure; don't include a step that has no feedback or next-step pressure.

### 3. Keep It Open

Events are the current pressure and clues, not a plot that auto-executes once conditions are met. The user should be able to intervene, refuse, explore, delay, investigate, bypass, or change the situation. Stages only describe changes in the situation or the narrowing/widening of opportunities — they don't mean the system will automatically transition, count, or settle.

### 4. Then Extend Mechanics and Modules

Only after there's a minimal loop should you add mechanics or modules that genuinely change choices. Every candidate mechanic must answer:

```text
What choice problem does it solve?
What can the user do, and based on what judgment?
Who sees the feedback, and what's the cost?
How does it make the next step different from before?
```

If you can't answer this, it's just a name and shouldn't be added. In complex gameplay, character, scene, collection, progression, or investigation modules should all serve the core loop, rather than being piled up side by side just to seem rich.

When an idea is too generic, or lacks rules/conflict/scene/narrative devices/interaction mechanisms, or an anti-cliché angle is needed, you may call `creative_material_search` sparingly. Choose your own query terms and take usually 1 item of material, 2–3 when comparing; rewrite, combine, or invert the result into the gameplay design — don't paste it directly, don't turn search parameters into a Choice, and don't automatically write it to the Bot.

## Going Deeper as Needed

The default framework applies to every gameplay task. Only read one Reference when the current problem genuinely needs it; do not load all of them for completeness.

| Current task | Reference to read | Purpose |
| --- | --- | --- |
| Multi-module gameplay, management systems, long-term progression, or collection/unlocks | [`complex-game-framework.md`](references/complex-game-framework.md) | Check module dependencies, expansion thresholds, long-term goals, and deadlocks. |
| Open-ended deduction, sandbox, multiple participants, or a complex current situation | [`open-situations-and-participants.md`](references/open-situations-and-participants.md) | Design situational pressure, participant feedback, open stages, and different entry points. |

## Deliverables

A new gameplay request should give 1–3 reviewable gameplay prototypes in one go, rather than asking item by item. Each candidate includes: the experience promise and the user's position, stable rules, the minimal loop, the core mechanic or trade-off, open space, and the entry point for the first session.

Only use a single Choice per the global rules for the 2–3 directions that genuinely cannot be determined from existing information and would substantively change the experience; proactively fill in the rest.

When providing gameplay-side input for the welcome message, give the current goal, available actions, immediate pressure, visible feedback, and the first choice. When providing a presentation hook for name or intro, pick only the one user situation, choice, pressure, rule, or cost that best represents the experience; don't evenly introduce the world, characters, levels, and mechanics.

## Execution Boundaries

- When there is a clearly existing Bot, you may read relevant areas via `bot_workspace`; before writing, first form a minimal, clear diff, and call `bot_workspace.update` following the global confirmation and authorization rules.
- Proposals, mechanics, and intermediate analysis default to staying in the conversation; use `artifact_workspace` only when the user explicitly requests saving, exporting, reading, modifying, or editable comparison.
- Do not define chat component payloads, front-end state, runtime variables, auto-triggers, or Tool implementation; do not display internal reasoning, tool process, or unfinished drafts.
