# Workflow: Video Element Editing

Source mapping: `workflow-video-element-editing`.

## Intent

Transform supplied source footage while keeping duration, shots, actions, camera, and timing frame-aligned; replace only declared elements.

## Read first

[duration-and-task-assembly.md](../duration-and-task-assembly.md), [reference-resolution.md](../reference-resolution.md), `$operate-topview-canvas` `references/local-media-bridge.md`, [recipes/ffmpeg-media.md](../recipes/ffmpeg-media.md), [recipes/timeline.md](../recipes/timeline.md), [recipes/audio-continuity.md](../recipes/audio-continuity.md).

## DAG

```text
Clarify replacements → collect target assets
→ read exact durationMs
→ segment if needed → extract all segment start frames once
→ edited first-frame image tasks → refresh + checks
→ per-segment video_edit submits with reference_video (+ images)
→ Timeline trim to source ms → export if requested
```

## Segmentation

- `durationMs` below capability min (or <4000ms when min=4s) → block.
- `durationMs ≤ maxMs` → one segment = whole source.
- Else `segmentCount = ceil(durationMs/maxMs)`, rebalance whole seconds; forbid short tails; only the last segment may keep fractional ms for Timeline trim.

## Per-segment submit (required)

- `taskType = video_edit`
- Source/segment as `reference_video`
- Edited first frame / replacement targets as `reference_image`
- `reference_audio` / `motion_control` only when live capability provides them and semantics need them
- Non-final segments may use the next segment’s edited first frame as a continuity end/anchor when capability roles allow; final segment uses its own start frame only

If capability lacks `reference_video`, **do not** degrade to start/end-only regeneration and claim frame-aligned edit — return `partial`.

## Dialogue

Replace dialogue on an independent audio track + Timeline align. Do not require the video model to rewrite spoken lines inside the visual prompt.
