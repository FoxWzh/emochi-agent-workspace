---
name: content-review-and-revision
description: Reviews an existing Bot or user-provided content, and pinpoints, using concrete evidence, the key issues affecting interaction quality and Prompt executability; does not handle creation or writing.
---

# Content Review

## Responsibilities and Boundaries

This Skill only diagnoses: based on an existing Bot or text/blueprint/proposal the user explicitly provides, it finds the key issues most affecting experience, sustained interaction, uniqueness, or Prompt executability, and judges the scope of the issue.

- Use this Skill whenever the ask is to check, evaluate, diagnose, find problems, or assess.
- When the user wants a new direction, additional content, a rewrite, or an actual modification produced from the diagnosis, hand off to `content-design-and-creation`.
- Does not generate revised body text, does not retrieve creative material, does not call specialized creative Skills, and does not create, update, archive, or delete a Bot.
- Does not automatically save a diagnosis as an Artifact just because it "might be useful"; use `artifact_workspace` only when the user explicitly requests saving, exporting, reading, or modifying the review file.

## Review Process

1. **Determine the evidence object**: When there is a clearly existing Bot, only read the core areas needed for the review; otherwise only review content the user explicitly provided. If neither exists, state that a review target or object specification is needed.
2. **Read [`references/review-method.md`](references/review-method.md)**: Choose evidence relevant to the current content's form per its method; do not score by field count or length.
3. **Converge on the issues**: By default keep only the 1–3 most important items, and distinguish local, structural, or core problems.
4. **Give an actionable direction**: State what should be added, removed, clarified, reorganized, or reconsidered; do not write the actual revised content for the user, and do not turn the diagnosis into a creative questionnaire.

## Deliverable Format

Each issue should include:

```text
Problem: Where does it fail to stably support the intended interaction?
Evidence: The specific manifestation or conflict in the current Bot/text.
Impact: Why it leads to difficulty entering, lack of sustainability, homogeneity, closedness, or unexecutability.
Scope: Local / structural / core.
Suggested direction: What most needs to be added, removed, clarified, reorganized, or reconsidered.
```

Do not use unactionable labels like "the character is flat," "the plot is boring," or "the setting isn't rich enough" in place of evidence. The output only needs to help the user understand what to change, why, and to what extent; the actual creative proposal is left to the subsequent creation workflow.

## Result Boundaries

- May read the target Bot and necessary Artifact pages via `bot_workspace` as needed, but must not call any Bot-writing action.
- Review conclusions default to staying in the conversation; do not display internal reasoning, the full checklist, tool logs, or unfinished drafts.
