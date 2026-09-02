# Image-to-Image

Used when the user explicitly requests editing, redrawing, extending, or modifying based on a valid input image. The goal is to clearly determine what to preserve, what to change, and what's uncertain, avoiding unintentionally altering the original image's subject, relationship, or key identifying features.

## Editing Boundaries

First distinguish:

```text
Preserve: Visual facts the user explicitly asked to keep, or that must be kept to
complete the task.
Change: Content the user asked to replace, enhance, remove, or add.
Uncertain: Content that cannot be reliably determined but would substantively
affect the result.
```

By default, do not arbitrarily restructure the character's identity, expression of age, key facial features, hairstyle, main clothing design, or subject relationship, unless the user explicitly allows it.

## Designing the Edit Proposal

| Image focus | Usually preserved | Can change |
| --- | --- | --- |
| Character visual | Identity anchors, face, hairstyle, main clothing design, character relationship | Scene, lighting, camera, composition, action, and story moment. |
| Scene / game visual | Core character or location anchor | Current situation, pressure, environmental scale, camera, and lighting. |
| Theater visual | Key character relationship or stage conflict | Lighting, character positioning, sense of stage, performance moment, and viewing angle. |
| General edit | The user's explicit subject and visual anchor | Everything else, handled per the editing goal. |

If uncertain information would change the subject's identity, relationship, or user intent, do a single minimal clarification; don't fabricate facts on your own.

## Prompt Writing

Every editing Prompt should clearly include:

```text
Edit based on the input image.
Preserve: [Preserve].
Change: [Change].
This proposal's visual narrative: [scene, composition, action, lighting, or
relational focus].
Avoid: [hard constraints, e.g., text, logos, watermarks, and features that must
not change].
```

## Designing Multiple Proposals

When the user hasn't specified the number of images or a direction, default to designing 4 variants; when the user specifies a number, follow it. Multiple variants should share the same Preserve / Change contract, but each should diverge on at least two dimensions:

```text
Camera, composition, environmental proportion, lighting, story moment, action,
gaze, or viewing position.
```

For example, all preserving the character's face and red coat:

```text
Proposal A: Rainy-night close-up, the character looks toward the camera through
a car window, the glass reflecting an incomplete clue.
Proposal B: Wide-angle platform, the character illuminated by a distant ad screen
amid an empty crowd, stronger environmental oppression.
Proposal C: Side-rear action shot, the character is tucking a photo into a filing
cabinet, another person's shadow cast outside the door.
```

The 4 proposals should provide different composition or visual-narrative angles; don't just add different styles, quality words, or suffixes to the same composition.

When a character is the main selling point or the user asks for a portrait, keep the character as a clear primary visual, avoiding letting the environment, effects, or a wide shot steal the subject during editing. For non-dark subject matter, don't unnecessarily add horror, ruins, excessive shadow, gore, or tragic elements; if the user explicitly requests a dark subject matter, follow their request.

## Checklist Before Confirmation

- Whether Preserve / Change is complete and not self-contradictory;
- Whether each proposal preserves the user's explicit identity, relationship, and hard constraints;
- Whether there's a substantively different composition or visual narrative;
- Whether the input image is an accessible URL;
- Whether uncertain features are not written as fact.
