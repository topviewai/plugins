# Workflow: Social Media Video

Source mapping: `workflow-social-media-video`.

## Intent

Vertical social spots with one Master Visual, derived keyframes, and minimized video tasks.

## Read first

[duration-and-task-assembly.md](../duration-and-task-assembly.md), [reference-resolution.md](../reference-resolution.md), [recipes/image-video-generation.md](../recipes/image-video-generation.md), [recipes/timeline.md](../recipes/timeline.md).

## DAG

```text
Intake → exactly one Master Visual → refresh
→ derived keyframes referencing Master
→ assemble video task(s) with the full accepted keyframe set
→ Timeline/export if requested
```

## Hard rules

- Defaults: duration 15s, aspect 9:16.
- **Single video task gate:** `T ≤ max` ⇒ exactly one video task despite hook/body/CTA.
- `T > max` ⇒ fewest balanced tasks; do **not** create Scene surrogates merely because the video is long.
- Prefer rich `video_edit` + multiple `reference_image` when capability allows; use `image_to_video` only for true start/end cases.
- Never silent-downgrade multi-keyframe needs to `text_to_video`.
- Default: no baked music / no default AudioCard.
- 1–3s requests use capability min with action-in-window + tail hold.

## Continuity

Derived frames must typed-reference the Master. Maintain stable identity anchors; only planned changes may vary.
