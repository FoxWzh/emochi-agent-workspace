---
name: image-creation
description: Plan, and after confirmation initiate, text-to-image and image-to-image tasks for a Bot's cover, character visuals, scene images, or visual references.
---

# Image Creation

## Responsibilities and Boundaries

This Skill turns the user's visual goal into a confirmable, independently generatable image proposal, and creates a real generation task via `image_task` only after the user explicitly confirms.

- Use it when the user asks to generate, redraw, extend, or modify an image, or wants to design a cover, character visual, scene image, or visual reference for a Bot.
- An image is not a pile of decorative style words; each image should express a clear subject, a moment in the frame, and a visual narrative.
- Does not create or modify Bots, Artifacts, or front-end state, and does not choose the generation result for the user. When the user explicitly clicks something like "set as cover" in the front end, that is handled by the corresponding business flow.

## Default Working Method

### 1. Determine Source and Goal

- If there is a valid input image and the user asks to edit, redraw, extend, or modify it: read [`image-to-image.md`](references/image-to-image.md).
- If there is no valid input image: read [`text-to-image.md`](references/text-to-image.md).

Determine the purpose, subject, scene moment, relationship or action, composition, visual focus, and hard constraints from the user's request and the current Bot's confirmed content. Ordinary composition, lighting, or style details can be filled in proactively; only when the subject's identity, relationship, or a major visual-narrative disagreement cannot be determined should you do a single minimal clarification or offer complete candidates for comparison.

### 2. Form a Comparable Proposal

When the user hasn't specified the number of images or a visual direction, default to giving **4** complete proposals and use `count: 4` in `image_task`; when the user specifies a number, follow it and put that number into `count`. Each proposal should stand independently while sharing the user's explicit subject and hard constraints; multiple proposals must differ on at least two dimensions that actually affect the image: camera, composition, spatial proportion, lighting/time, action, gaze, relational tension, or story moment.

The 4 proposals should cover different visual narratives or communication angles, not just swap "vintage, realistic, cinematic," quality words, or other suffixes. Use a Choice only when the user explicitly wants to compare, or when there's a major visual-narrative disagreement among the candidates.

When a character is the main selling point or the user asks for a portrait, the subject must be a clearly recognizable human figure: the character occupies the primary visual weight in the frame, with the face or upper body prioritized for readability; environment, props, and mood serve the character rather than overshadowing it. For non-dark subject matter, avoid piling on shadow, horror, ruins, oppression, gore, or tragic elements; prioritize a clear subject, readable action, healthy negative space, and genre-appropriate bright/neutral lighting to ensure first-glance recognizability and click appeal.

### 3. Create the Task After Confirmation

After the user explicitly confirms the visual proposal, call `image_task`, providing a self-contained Prompt for each variant. Only after the Tool returns a `job_id` may you state that the task has been created; the front end then displays progress and generation results.

- When based on an input image, you must pass an accessible HTTP(S) image URL as `images`; do not fabricate an input image address.
- When the user explicitly locks the visual style or a hard constraint, you may set `style_locked`; this does not allow candidates to repeat the same composition.
- Do not display image URLs in the reply, fabricate generation results, or ask the user to go find the result in the resource area.

## Delivery Checklist

Before creating the task, confirm:

```text
Subject, purpose, and image moment are clear;
When a character is the main selling point, the character is a clearly recognizable primary visual;
For non-dark subject matter, no unwarranted dark elements are dragging down readability or click appeal;
Does not conflict with the current Bot's confirmed appearance, relationships, and world setting;
The Prompt includes the subject, scene, key constraints, and necessary style;
Uncertain features are not written as fact;
Avoid text, logos, watermarks, and unrequested identifiable brand elements;
Each variant can be generated independently of the other proposals.
```

## Execution Boundaries

- The current Bot is only a visual reference; it does not mean the image automatically belongs to it, automatically becomes the cover, or is automatically written to the Bot; read `basic`, `content`, or `advanced` as needed for reference.
- Image task status, polling, candidate display, and selection state are handled by the front end/execution layer; do not fake a completed state when image generation fails.
- Do not display internal reasoning, tool execution process, or unfinished drafts.
