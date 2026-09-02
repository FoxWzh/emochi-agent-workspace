# Review Method

Review is not scored by length, field count, or subjective "looks good or not." Quality goals follow `CLAUDE.md`; this Reference only helps convert them into observable evidence within the current content.

Applicable to character, theater, game, worldbuilding, or hybrid-type Bots. First determine what primarily drives the interaction, then check with the corresponding lens; don't treat "does the character feel like a real person" as the only standard.

## First Look at Four Categories of Evidence

Look only for evidence relevant to the problem within the current content:

```text
Entry: Does the user know what they're facing, and is there an object, pressure, or
opportunity they can respond to?
Sustainability: After the user acts, do they get a differentiated response and
perceptible consequence, without decisions being made for them?
Uniqueness: Does the unique core actually change the interaction, rather than just
swapping genre or labels?
Executability: Are the facts, rules, examples, and requirements consistent, and
written as conditions, boundaries, and feedback?
```

## Review Order

### 1. Static Consistency

First find problems that can be confirmed without simulating the interaction:

- The name, intro, welcome message, content settings, and advanced settings conflict with each other;
- The same fact, rule, or instruction is repeated, contradictory, or has unclear priority;
- Unimplemented memory, variables, a status bar, auto-triggers, a map, or an external capability is written as if it already exists;
- Abstract words like "advanced, immersive, deep, proactively drives forward" are used in place of executable requirements.

### 2. Minimal Interaction Loop

Check whether the current content can support:

```text
What the user can do
→ How who/what responds
→ What change the user can perceive
→ Why a next action would follow
```

| Gap | Observable manifestation | Suggested direction |
| --- | --- | --- |
| Missing action space | The opening decides for the user; they can only passively hear the setting | Add an entry point for asking, observing, refusing, negotiating, or acting. |
| Missing response | The character, scene, or rule doesn't change with the user's action | Add conditional responses, constraints, participants, or a basis for judgment. |
| Missing change | No matter how you chat, it always returns to the same small talk or the same result | Add consequences after information, relationship, situation, resource, pressure, or action. |
| Missing current drive | There's setting, but no "why continue right now" | Add a current event, goal, misunderstanding, risk, opportunity, or solvable problem. |
| Missing feedback | There's a mechanism/rule name, but no perceptible change | Add response and consequence, or remove a mechanism with no interactive effect. |

### 3. Check by Interaction Driver

Only check the part this turn's content genuinely relies on; multiple lenses can be used together.

| Content form | Driver chain to check | Common failures |
| --- | --- | --- |
| Character / relationship | Drive and blind spot → conditional reaction and trade-off → relationship/information change | Label repetition, unconditional compliance, omniscience, relationship that doesn't change. |
| Theater / narrative | Scene pressure and multi-party goals → information asymmetry/event progression → situation change after user intervention | Only background introduction, a single-line plot that advances for the user, NPCs lining up to perform. |
| Game / simulation | Goal and rules → user action → basis for judgment → feedback and cost → next-step loop | Only rule nouns, no differentiation in actions, pretending to have an automatic stat system. |
| Worldbuilding / environment | Rules, resources, power, and information boundaries → character/scene constraints or opportunities → verifiable/exploitable consequences | Worldview turned into an encyclopedia, rules that only exist in the description, locations/factions with no effect on interaction. |

Example:

```text
Not useful: This game's gameplay isn't rich enough.

Useful: The content lists "quests, reputation, shop," but doesn't explain how one
user action affects resources, character judgment, or the next opportunity; these
nouns don't form a perceptible loop. Suggest first adding an
action → judgment → feedback → consequence chain before deciding whether more
gameplay modules are needed.
```

### 4. Independence and Anti-Template

Regardless of content form, also check for mere compliance with the user or reliance on high-frequency templates:

| Risk | Observable manifestation | Suggested direction |
| --- | --- | --- |
| Unconditional compliance | Any user request is immediately satisfied; conflict dissolves quickly | Add an independent goal, constraint, cost, reason for objection, or judgment condition. |
| Label/genre reskinning | After swapping the name or occupation, the interaction is no different | Make the unique relationship, rule, conflict, or mechanism actually change responses and choices. |
| Omniscience | Always gives the correct answer, automatically solves problems, or holds all information | Add an information source, knowledge blind spot, verification cost, and the possibility of a wrong judgment. |

## Evidence and Scope

Conclude with a specific conflict or gap:

```text
Not useful: The character isn't three-dimensional enough.

Useful: The character is simultaneously required to "never reveal case clues" and
to "proactively drive the investigation forward every turn," but there's no
statement of under what conditions what information can be revealed; the reply
will waver between refusing to progress and solving the case for the user.
Suggest adding a conditional-response rule for "verifiable but incomplete clues."
```

| Scope | Meaning | Direction the review should provide |
| --- | --- | --- |
| Local | The problem is concentrated in one clear area and doesn't change the core experience | State the specific content that should be added, removed, clarified, or adjusted. |
| Structural | A key dimension is missing, imbalanced, or self-contradictory, but the core experience still holds | Point out the missing or imbalanced relationship, rule, conflict, feedback, scene, or expressive constraint. |
| Core | The experience promise, user position, core relationship, world rules, or interactive prototype itself has a problem | State the core assumption that needs to be reconsidered, and why. |

## Checklist Before Delivery

Each issue should have concrete evidence, actual impact, a clear scope, and a suggested direction — that's sufficient. By default deliver only 1–3 items; don't list a large number of low-value issues just to seem thorough, and don't write the actual revised text or subsequent call routing within the review.
