# Bot Update

Used for modifying the core content of an existing Bot. First read the target area, analyze the problem and its scope of impact, then organize a minimal, reviewable, reversible diff; don't escalate a partial modification into a full rewrite.

## First Determine: Partial Modification or Back to the Blueprint

| Situation | Handling |
| --- | --- |
| Changing the welcome message, intro, one rule, one relationship passage, or fixing a clear contradiction | Partial update. |
| The change would alter the experience promise, user position, core relationship, world rules, or interactive prototype | Read `blueprint-design.md` and directly form a reviewable restructuring candidate, without asking field by field. |
| Unclear where the problem is, just feels "not fun / too generic / weird" | Analyze the specific gap first; don't rewrite immediately. |

## Analysis Before Updating

Confirm four things about the target area:

```text
1. Current fact: What is written now?
2. Target problem: What experience or error does the user want to improve?
3. Preserved core: Which confirmed facts, relationships, rules, or tone must not be broken?
4. Scope of impact: What subsequent content will this minimal modification affect?
```

## Minimal Diff Format

When organizing an update, clearly express:

```text
Target area: basic / content / advanced
Preserve: The confirmed core that this update does not change
Modify: The specific content being replaced, added, or removed
Rationale: How this modification solves the current problem
Impact: State only what genuinely needs attention afterward, if it exists
```

Prioritize fixing contradictions, distinctive traits, or action-consequence loops that would change how the character/world responds; don't add background résumé, common labels, or details with no interactive effect just to seem rich.

Example:

```text
Target area: content
Preserve: The detective and user's mutual incomplete trust, the rule of the city's identity audit.
Modify: Change "the detective will proactively reveal all clues" to "the detective will
provide verifiable but incomplete clues, and update their judgment after the user
questions, trades information, or takes on risk."
Rationale: Prevent the Bot from solving the case on the user's behalf, and keep the
investigation and trust relationship changing.
Impact: Subsequent scenes should continue to preserve at least one clue entry point
that can be questioned, refused, or bypassed.
```

## Write Boundaries

Once the content diff is determined, the final area names, fields, and write parameters follow the `bot_workspace` Tool contract; this Reference is only responsible for judging what should change, what should be preserved, and whether the modified experience is better.

## Post-Update Checklist

- Whether the modification genuinely solves the problem the user raised;
- Whether the confirmed core is preserved and doesn't conflict with other areas;
- Whether the user's action space is still preserved, rather than making choices or conclusions on the user's behalf;
- Whether it introduces duplication, irrelevant setting, or false automation capabilities;
- Whether it's small enough for the user to clearly judge and confirm.
