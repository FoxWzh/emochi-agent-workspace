# Detailed Content Writing

Used to turn a determined blueprint into Bot core content that supports sustained interaction and can be executed by the model. Content settings are free-form long text, not an old-platform field tree or an auto-trigger system.

## Expand by Dependency

Write the parts that constrain other content first, then write what's constrained by them:

```text
World / rule-led: boundaries and cost → current situation → object reaction → conflict and entry point
Character / relationship-led: user position and relationship premise → object drive → environmental pressure → current situation
Gameplay-led: goal → actions the user can take → basis for judgment → perceptible feedback → next-step pressure
```

A partial task should only expand the necessary affected part; don't use it as an opportunity to rewrite the entire Bot.

## Turn Abstract Requirements into Executable Content

| Abstract phrasing | Should be converted to |
| --- | --- |
| "The character is complex" | Under what pressure they persist/avoid/misunderstand/concede, and how these reactions change the relationship. |
| "The world feels immersive" | What can happen, who knows what, what cost the resources/rules carry, how the user verifies or exploits it. |
| "Rich gameplay" | What the user can do, how the object judges, what feedback the user sees, how the next step changes. |
| "Slow-burn romance" | The relationship's negotiable boundaries, how trust is built/damaged, which events actually change the relationship — rather than only writing "don't progress too fast." |

Example:

```text
Not executable: The character has depth and proactively leads the user through a great plot.

Executable: The character will proactively raise an investigable clue, an unfinished
contradictory piece of information, or a risk requiring a joint decision; but must not
choose the action, draw the investigative conclusion, or preset the user's emotion on
the user's behalf. After each advance, preserve at least one entry point that can be
questioned, doubted, refused, or bypassed.
```

## Content Organization Principles

### Characters and Relationships

Clearly write the core drive, information boundaries, conditional reactions, and negotiable boundaries. Only characters that have a long-term impact on the interaction need a complete drive and changing relationship; secondary characters only need stable identification and plot function.

### World, Scene, and Rules

World rules must affect choices: state what's possible/impossible, how information is obtained, how resources or power are distributed, and what cost an action carries. Locations/organizations should provide resources, constraints, risk, or opportunity — not just a list of names.

### Current Interaction and Sustainability

Give the pressure, opportunity, or unresolved problem currently in effect; let the user investigate, negotiate, refuse, leave, bear consequences, or exploit the rules. Don't lock in a single-line ending, and don't write future twists as fact ahead of time.

### Expression and Examples

Tone, narrative point of view, the ratio of dialogue to action, the range of information that can be used, and expressions to avoid should be clear and consistent with the character/world facts. Examples should only illustrate stable response patterns, and must not conflict with the core rules.

## Stable Setting vs. Current Information

Distinguish between:

```text
Stable setting: Character drives, relationship premises, world boundaries, and response
rules that hold across scenes.
Current information: The current location, event pressure, visible clues, and immediate
goal right now.
```

This is content organization — it does not mean the system has conditional injection, an automatic status bar, variables, a map, or random-trigger capability.

## Checklist When Finished Writing

- Whether the user has choices to make, rather than having the plot arranged for them;
- Whether key reactions can be traced back to a character drive, rule, or current information;
- Whether there's setting that only adds nouns without a reader, consequence, or interactive effect;
- Whether it repeats facts, shows unconditional compliance, or omniscience;
- Whether unimplemented runtime capabilities are written as if they were real capabilities.
