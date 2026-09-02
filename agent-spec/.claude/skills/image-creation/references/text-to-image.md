# Text-to-Image

Used when there is no valid input image and a cover, character visual, scene image, or visual reference needs to be generated from text. The goal is to turn abstract creative requirements into a single independent visual proposal that tells a clear pictorial story, rather than piling up style tags.

## Visual Brief

First extract, from the user's request and the current Bot content, the information that genuinely affects the image:

| Dimension | What to clarify |
| --- | --- |
| Purpose | Cover, character visual, scene, or reference image; what appeal/explanatory function the image should serve. |
| Subject | Who/what is the visual focus among the character, object, location, or relationship. |
| Scene and moment | What is happening in the frame, not just the genre background. |
| Relationship and action | How characters are positioned relative to each other, where they look, what they're doing or avoiding. |
| Composition | Camera, shot angle, subject placement, environmental proportion, visual flow, and negative space. |
| Visual focus | Key clothing, props, materials, environmental detail, lighting, color, and mood. |
| Hard constraints | Content that must be kept/avoided, e.g., no text, logo, or watermark. |

## From Abstract to Image

```text
Abstract: Make an oppressive cyberpunk detective cover.

Concrete: A half-body detective in a rain-soaked archive room, leaning against
an altered evidence wall; a cold white scan light cuts across the face, and
photos of names deleted by the system are scattered on the desk. The character
is positioned left, with a neon-lit window and city reflection on the right,
suggesting someone watching from outside. No text, logo, or watermark.
```

Here, "oppressive" is achieved through gaze, evidence, lighting, space, and the being-watched relationship, rather than just appending suffixes like "cinematic, high quality."

## Designing Multiple Proposals

When the user hasn't specified the number of images or a direction, default to designing 4 variants; when the user specifies a number, follow it. Each should be a complete Prompt sharing the subject and hard constraints; candidates should differ substantively on at least two visual dimensions.

```text
Proposal A: Character close-up hook — carrying the relational tension through the
face, gaze, and a key hand gesture.
Proposal B: Spatial narrative — the character is smaller, letting the location,
props, and environment convey the rule or crisis.
Proposal C: Conflict moment — expressing the choice happening right now through
action, gaze, camera angle, and lighting.
```

The 4 proposals should provide different composition or visual-narrative angles; don't treat swapping the same image between "vintage / realistic / cinematic," quality words, or other suffixes as different proposals.

When a character is the main selling point or the user asks for a portrait, the character must occupy the primary visual, with the face or upper body clearly readable, and the environment only used to reinforce the character's story. For non-dark subject matter, avoid unnecessarily adding horror, ruins, excessive shadow, gore, or tragic elements; prioritize a clear subject, genre-appropriate lighting, and appropriate negative space to ensure first-glance recognizability and click appeal.

## Checklist Before Confirmation

- Whether the subject, purpose, and image moment are clear;
- Whether it conflicts with the current Bot's confirmed appearance, relationships, and world setting;
- Whether necessary hard constraints are preserved for a style the user specified;
- Whether text, logos, watermarks, and unrequested identifiable brand elements are avoided;
- Whether each variant can be generated independently of the other items.
