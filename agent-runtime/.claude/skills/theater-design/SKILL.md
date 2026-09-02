---
name: theater-design
description: Design the theatrical narrative of an interactive Bot — organize an interventable plot experience through scenes, character goals, information asymmetry, dialogue, and shifts in the situation.
---

# Theater Design

## Core Understanding

The focus of a theater-type Bot is narrative, character ensemble, scene, and performance — not a pile of game mechanics, nor a chapter-by-chapter retelling of a novel's plot. It should let the user enter a situation that is currently unfolding: characters each have goals and secrets, and the user's intervention changes information, relationships, or the situation.

- What's stable is character goals, world constraints, information boundaries, narrative voice, and current pressure; what's open is how the user intervenes, what they deal with first, who they cooperate with, and the outcome.
- Extract reusable relationships, conflicts, scene pressures, and narrative strategies; don't transplant one-off events, fixed dialogue, or predetermined endings directly.
- Do not write variables, auto-triggers, automatic stage transitions, status bars, or other runtime capabilities the current Bot doesn't have as if they were fact.

## Default Design Framework

### 1. Establish the Current Stage

Write "what is happening right now" first, rather than starting with a worldview introduction: the current location and anomaly, what each party present wants to obtain or conceal, what position the user is in, and what the user's first move can be.

### 2. Let Conflict Drive Interaction

Create tension using conflicting goals, resource constraints, time, information asymmetry, or relational cost. Each advance should form:

```text
Current pressure
→ The user's action or inaction
→ Characters / factions respond according to their goals and information
→ Perceptible change in information, relationships, resources, or the situation for the user
→ New opportunity, risk, or problem
```

Each scene should carry only one primary function: exposing information, creating conflict, changing a relationship, providing a resource, raising the cost, or offering a choice. Don't cram secrets, twists, and all the characters into the same scene.

### 3. Preserve the Agency of Characters and the User

Key characters need different goals, information, positions, and priority actions; even when the user isn't currently responding, they can't all be lined up waiting to serve the user. The user can ask further, question, negotiate, refuse, delay, leave, investigate, or bear consequences; they must not have key decisions made for them or emotions preset for them.

Secrets, misunderstandings, and twists must have a source, investigable clues, and conditions for exposure. Events are only enterable pressure or clues, not an auto-executing script.

### 4. Complete the Performance Through Expression

Dialogue and description serve the scene, character goals, and information asymmetry. Use action, pauses, avoidance, objects, and environmental detail to carry unspoken pressure; don't use a long voiceover to act, speak, or confirm feelings on the user's behalf. Determine the narrative point of view, the order in which information is revealed, and pacing first, then choose the language texture; only read the corresponding Reference when writing style, dialogue strategy, or narrative point of view itself is the focus of this turn.

## External Narrative Knowledge Reference

When you need to supplement scenes, conflicts, character relationships, clues, narrative devices, dialogue strategy, or writing-style angles, you may call `creative_material_search` sparingly. It is not a fallback for when you're stuck, nor is it required every turn.

```text
Identify this turn's gap: scene pressure / conflict / relationship / information asymmetry / narrative device / dialogue and style
→ Independently choose query terms and take a small amount of material (usually 1 item, 2–3 when comparing)
→ Extract reusable narrative strategies, pressure relationships, or information-reveal methods
→ Rewrite, combine, or invert it into the current theater's scene, route, or minimal modification
```

Material is only a controlled reference: do not paste it directly, do not turn search parameters into a Choice, and do not automatically write it to the Bot. When a strong writing style is needed, the material should be converted into an executable point of view, information control, pacing, or dialogue strategy — not raw text infusion, fixed lines, or an implementation mechanism invisible to the user.

## Going Deeper as Needed

The default framework applies to every theater task. Only read one Reference when the current problem genuinely needs it; do not load all of them at once.

| Current task | Reference to read | Purpose |
| --- | --- | --- |
| Multi-route plot, mystery/twist, long-form narrative, or complex character ensemble | [`narrative-structure-and-routes.md`](references/narrative-structure-and-routes.md) | Organize a stable framework, open routes, clues, twists, and multi-party information. |
| Strong writing style, a specific narrative point of view, dialogue style, or performance pacing | [`style-and-dialogue.md`](references/style-and-dialogue.md) | Write the style as an executable narrative and dialogue strategy. |

## Deliverables

A new theater or narrative request should give 1–3 reviewable scene candidates in one go, rather than asking for fields one by one. Each candidate includes at minimum: the user's position, the current stage and pressure, multi-party goals/information asymmetry, the user's entry point, how the situation would change with different interventions, and, where applicable, the narrative voice.

Only use a single Choice per the global rules for the 2–3 directions that genuinely cannot be determined from existing information and would substantively change the final experience; proactively fill in the rest.

When providing input for the welcome message, give the current location and anomaly, the goals of each party present, visible clues, immediate pressure, and the user's first move. When providing a hook for name or intro, pick only one ongoing conflict, unspoken secret, choice that must be faced, or relational tension; don't write a plot summary, an ending, or every character's selling point.

## Execution Boundaries

- When there is a clearly existing Bot, you may read relevant areas via `bot_workspace`; before writing, first form a minimal, clear diff, and call `bot_workspace.update` following the global confirmation and authorization rules.
- Proposals, sketches, and intermediate analysis default to staying in the conversation; use `artifact_workspace` only when the user explicitly requests saving, exporting, reading, modifying, or editable comparison.
- Do not define chat component payloads, front-end state, runtime variables, auto-triggers, or Tool implementation; do not display internal reasoning, tool process, or unfinished drafts.
