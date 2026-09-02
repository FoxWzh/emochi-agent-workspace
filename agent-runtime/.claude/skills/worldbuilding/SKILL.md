---
name: worldbuilding
description: Design world rules, scarce resources, power, consequences, cultural consensus, locations, and factions that can be entered into interaction; applicable to background setting, institutions, magic/tech rules, and factional relationships.
---

# Worldbuilding

## Core Understanding

A worldview is not an encyclopedia, nor a set of background waiting to be introduced; it is the judging environment for the interaction. It determines who wants what, who can do what, what consequences actions trigger, and how this world evaluates and responds to the user.

- Prioritize writing laws, resources, institutions, taboos, and power relations that change character motivation, user choices, and consequences; don't add timelines, place names, or details with no interactive effect just for completeness.
- What's stable is world laws, capability boundaries, resources, major power relations, and cultural consensus; what's current is locations, tense resources, rumors, clues, and environmental pressure; what's a candidate is events, secrets, or changes that haven't happened yet.
- Do not write variables, keyword activation, auto-maps, auto-events, auto-status-bars, or external capabilities as if the current Bot already has them.

## Default World Engine

### 1. Scarcity and Power: Producing Motivation

Don't just write "what exists" — write what's scarce, who controls it, how ordinary people obtain it, what it costs, and how the monopoly can be levered open. The key resource can be an object, or it can be lifespan, memory, a name, sleep, credit, residency, or an unrecorded opportunity.

```text
Scarce good: What does everyone want most?
Controller: Who monopolizes it, and by what means do they maintain that?
Cost: What specific sacrifice must ordinary people make?
Contest: How do the excluded work around it, trade for it, or resist?
Crack: What does the controller fear; what internal division or vulnerability exists?
```

The first four items create pressure; the fifth gives the user leverage. The monopoly must not be a wall without a crack, nor should the resource be trivially available, or characters will lack motivation and the user's choices will lack weight.

### 2. Chain Reaction: Producing Consequences

Push every core setting through to daily life at minimum, not just into the intro or into combat:

```text
Core setting
→ Production / technology: What did it replace, create, or obsolete?
→ Society / power: Who gains or loses power because of it; how do institutions change?
→ Individual life: How do ordinary people work, travel, fear, trade, or get constrained differently?
```

The third layer must land on something a specific person daren't do, must do, or can take advantage of, so it can become an actual basis for judgment in scenes and NPCs. Rules, characters, locations, and consequences should mesh with each other, not exist as isolated settings.

### 3. Cultural Consensus: Stabilizing Judgment

Besides law and capability boundaries, also write what this society defaults to approving of, being ashamed of, fearing, or rewarding. Consensus should be written as conditions, concrete feedback, and exceptions: who would praise, exclude, cover for, punish, or exploit a given behavior; different groups can hold conflicting consensuses.

This lets the same action receive a stable but not monolithic evaluation across different scenes and characters, avoiding a world that vanishes when the scene changes or a character's evaluation that drifts.

### 4. Landing on the Current Interaction

Turn the world into a situation the user can enter, following the dependency chain:

```text
World rules, resources, and consensus
→ Character / faction goals and action boundaries
→ Constraints, information, and risk within a location
→ Current pressure or opportunity
→ Consequences the user can observe, exploit, bypass, or bear
```

The world can drive change, but must not make choices for the user. Secrets and subsequent changes need a source, a holder, verifiable clues, and conditions of exposure; don't write candidate directions as world fact ahead of time.

### 5. Only Expand the Necessary Layers

A short interaction usually only needs one key scarce good, one chain of consequence pushing it into daily life, and a small amount of cultural consensus with concrete feedback; missing parts can be filled in during the interaction along existing rules. Expand the environmental layer only when exploring multiple locations, organizations, or factions; add stable atmosphere only when it would change the experience.

When an idea is too generic, or lacks rules/resources/factions/locations/conflict/information boundaries, or an anti-cliché angle is needed, you may call `creative_material_search` sparingly. Choose your own query terms and take usually 1 item of material, 2–3 when comparing; rewrite, combine, or invert the result into the current world rules or a minimal modification — don't paste it directly, don't turn search parameters into a Choice, and don't automatically write it to the Bot.

## Going Deeper as Needed

The default world engine applies to every worldbuilding task. Only read one Reference when the current task genuinely needs it; do not load all of them at once for completeness.

| Current task | Reference to read | Purpose |
| --- | --- | --- |
| Multiple locations, organizations, institutions, factions, or factional relationships | [`places-and-factions.md`](references/places-and-factions.md) | Give locations and factions resources, constraints, information, and conflict roles. |
| A complex world that needs setting-level distinctions, or controlling the scope of information | [`world-layers.md`](references/world-layers.md) | Separate underlying laws, environmental forces, expressive atmosphere, and the current situation. |

## Deliverables

A new worldview request should give 1–3 reviewable world-interaction candidates in one go, rather than asking item by item. Each candidate includes at minimum: the user's position, one key scarce good and its power structure, one consequence chain that lands in daily life, key consensus or information boundaries, sustained pressure, and an enterable current situation.

Only use a single Choice per the global rules for the 2–3 directions that genuinely cannot be determined from existing information and would substantively change the experience; proactively fill in the rest.

When providing world-side input for the welcome message, give the current location, perceptible anchors, currently active rules/pressure, and the first step the user can try. When providing a hook for name or intro, pick only one angle representing the world's unique scarcity, cost, identity situation, or informational risk; don't restate the world encyclopedia or every faction.

## Execution Boundaries

- When there is a clearly existing Bot, you may read relevant areas via `bot_workspace`; before writing, first form a minimal, clear diff, and call `bot_workspace.update` following the global confirmation and authorization rules.
- Proposals, settings, and intermediate analysis default to staying in the conversation; use `artifact_workspace` only when the user explicitly requests saving, exporting, reading, modifying, or editable comparison.
- Do not define chat component payloads, front-end state, runtime variables, auto-triggers, or Tool implementation; do not display internal reasoning, tool process, or unfinished drafts.
