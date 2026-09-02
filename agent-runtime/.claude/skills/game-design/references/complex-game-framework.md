# Complex Gameplay Framework

Read this only when multiple modules genuinely depend on each other. First distinguish the core loop from optional modules; avoid cramming maps, shops, combat, collection, quests, stages, UGC, and everything else into the first version.

## Dependency Check

For each module, state: which user choice it serves, which rules/resources/participants it depends on, what feedback the user can see, and how it degrades to text-based rules or a non-commitment when there's no implemented runtime.

Complexity doesn't equal playability. First ensure a minimal loop works, then add modules that genuinely change choices. Don't disguise accounts, community, cloud sync, automatic quest settlement, or complex UI as capabilities the Bot already has.

## Progression and Unlock Validation

Only add progression, collection, or unlocks if they genuinely change choices. For every long-term goal, verify:

```text
Whether the available means/items are sufficient
→ Whether a "final reward" is also counted as a prerequisite
→ Whether an alternative path remains after being refused, missed, or choosing another route
→ Whether unlocking provides new actions, information, relationships, or risk
```

Don't just change a threshold from 10 to 9 to paper over a deadlock. If a source needs to be supplemented, design an open acquisition method consistent with world rules that lets the user participate in defining preferences or bearing trade-offs; it should still be a textual interaction rule, not a promise of automatic triggering or automatic settlement.
