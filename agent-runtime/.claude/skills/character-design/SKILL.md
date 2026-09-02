---
name: character-design
description: Design or strengthen characters, relationships, and character ensembles that act stably, form changing relationships, and let the user enter into interaction.
---

# Character Design

## Responsibilities and Boundaries

This Skill handles "why a character acts this way, when they change, and what consequences relationships produce." A character is not a personality label or background dossier, but an interactive object that makes recognizable trade-offs under pressure, information, and relationship change.

- Use this Skill for the creation, completion, restructuring, and partial refinement of characters, personas, relationships, companions, romantic interests, character groups, or character interactions.
- Complete world rules, theatrical events, gameplay loops, or full cross-domain restructuring is handled by the corresponding specialized Skill or coordinated by `content-design-and-creation`.
- The final name, intro, welcome message, and complete Bot write are not completed independently within this Skill; this Skill only provides character-side content or the minimal character/relationship diff.

## Choosing a Working Method

First choose the single Reference most central to this turn; only add relationship or ensemble references when they genuinely determine the character design — don't load all of them at once "for completeness."

| Current task | Reference to read | Focus of output |
| --- | --- | --- |
| Design a single core character, add reactions, fix persona contradictions | [`character-core.md`](references/character-core.md) | Drives, contradictions, conditional reactions, information layering, and boundaries. |
| Design/strengthen a user relationship or character relationship | [`relationships.md`](references/relationships.md) | Relationship premise, information boundaries, negotiable boundaries, and conditions for change. |
| Design a character group, NPC ensemble, or multi-character interaction | [`ensemble-characters.md`](references/ensemble-characters.md) | Character roles, differing goals/information/responses, and relationship networks. |
| Provide character-side input for the welcome message | [`opening-input.md`](references/opening-input.md) | Current goal, relationship starting point, environment, conflict, and the user's first move. |
| Provide a character-side presentation hook for name or intro | [`presentation-input.md`](references/presentation-input.md) | One concrete, perceptible, and clickable relationship or situation. |

## External Creative Material Reference

Whenever designing characters, strengthening relationships, differentiating an ensemble, or partially revising, you may call `creative_material_search` if you need inspiration, need to fill in any character-side dimension, or need an anti-cliché angle for an overly generic proposal. This is not a fallback for when you're stuck, nor is it required every turn.

```text
Identify this turn's gap: character / relationship / scene pressure / conflict / narrative device / interaction mechanism
→ Independently choose suitable query terms and a small amount of material (usually 1 item, 2–3 when comparing)
→ Extract usable relationships, constraints, pressures, or response logic
→ Rewrite, combine, or invert it into the current character proposal or a minimal modification
```

Material is only a controlled reference: do not paste it directly into the Bot, do not turn search parameters into a user Choice, and do not automatically write it to the Bot.

## Deliverables

A new character request should deliver 1–3 complete, reviewable interactive candidates in one go. Each candidate should let the user clearly see at least:

```text
The character's drives and contradictions
→ The starting relationship or boundary between the user and the character
→ Under what conditions the response differs
→ What change would affect the relationship, information, or situation
→ Where the user starts acting
```

These are components of the same candidate, not split into consecutive follow-up questions. Only use a single Choice per the global rules for the 2–3 directions that genuinely cannot be determined from existing input and would substantively change the experience; proactively fill in the rest.

A partial modification should only provide the minimal diff for the affected area, not use it as an opportunity to rewrite the character, relationship, or entire Bot. Before delivering, confirm:

- The core character has drives and trade-offs, not a pile of labels;
- The user's actions can change trust, cooperation, opposition, information, or the situation;
- Multiple characters have irreplaceable goals, information, or roles;
- The user's emotions, intimacy, or actions are not preset, and unimplemented runtime capabilities are not written as if they were real capabilities.

## Boundary with Bot / Artifact

- When there is a clearly existing Bot, you may read the relevant core areas for this turn via `bot_workspace`; do not assume or create a Bot when there is no target.
- When a write is needed, first form a minimal, clear diff, and follow the global confirmation and authorization rules to call `bot_workspace.update`. Cross-domain, complete content for a new Bot, or overall restructuring is coordinated by `content-design-and-creation`.
- Character proposals default to staying in the conversation. Use `artifact_workspace` only when the user explicitly requests saving, exporting, reading, or modifying a file; do not create or manage images.
- Do not define chat component payloads, front-end state, runtime variables, auto-triggers, or Tool implementation; do not display internal reasoning, tool process, or unfinished drafts.
