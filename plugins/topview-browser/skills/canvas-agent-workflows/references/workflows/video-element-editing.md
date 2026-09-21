# Workflow: Video Element Editing

Source mapping: `workflow-video-element-editing`.

## Intent

Transform supplied source footage while keeping duration, shots, actions, camera, and timing frame-aligned; replace only declared elements.

Lock this in-place edit intent for the entire workflow. A retry, split, later segment, or phrase such as “continue with segment 2” does not turn it into an extension. If the user replaces the source video, invalidate every duration, split, source extract, boundary image, preview, and pending submit derived from the old source.

## Read first

[duration-and-task-assembly.md](../duration-and-task-assembly.md), [reference-resolution.md](../reference-resolution.md), `$operate-topview-canvas` `references/local-media-bridge.md`, [recipes/ffmpeg-media.md](../recipes/ffmpeg-media.md), [recipes/timeline.md](../recipes/timeline.md), [recipes/audio-continuity.md](../recipes/audio-continuity.md). When Seedance 2.5 wins model selection, also read `$operate-topview-canvas` `references/seedance-2.5.md`.

## Resolve source and model first

Clarify the source-role → target-role mapping and collect durable target images. Read the exact source `durationMs`. Then resolve the exact live model, output bounds, reference-video input budget, resolution enum, input roles, and Seedance task-mode enum before choosing direct versus split editing.

Lock the exact planned resolution from the selected capability before the first paid submit and show it in the plan/approval summary. Never copy a resolution from an example or silently substitute an unsupported default.

Prefer a compatible Seedance 2.5 capability because it can edit from the source video directly. An explicit available user model choice wins; if the user chooses another model, explain the recommendation once and honor the choice. Seedance fast editing requires advertised `omniReferenceTaskType=edit` plus `reference_video`. If either is absent, do not paid-probe or submit as `auto`: use the legacy path with a compatible model only when permitted, otherwise return `partial`.

## Seedance 2.5 direct edit

When the whole source fits the live single-reference input budget:

```text
Confirm source + targets → one video_edit submit
  source as reference_video
  targets as reference_image
  parameters.omniReferenceTaskType = edit
→ refresh → Timeline/export only when requested
```

- Do not split the source, extract frames, create edited first frames, or create separate anchor previews.
- Set output duration from the live output schema. For a normal millisecond source use `ceil(durationMs/1000)` within the live range. Under the current Seedance compatibility margin, a source in `(30000ms, 30200ms]` stays one direct reference but produces at most 30 seconds; disclose the input-only tail.
- Keep the prompt minimal: the source is the sole master for duration, shots, actions, pose, camera, timing, background, lighting, and audio; target images supply only declared identity, clothing, product, object, or style traits. Ignore target-image background and framing. Preserve everything unspecified.
- Every selected target must correspond to a visible source role. Do not introduce an off-screen target simply because it exists in the project.

## Seedance 2.5 split edit

When the source exceeds the live direct-edit input policy, or otherwise cannot be represented by one advertised edit task (the documented Seedance input-only compatibility margin remains on the direct path):

1. Let `minSegmentMs = outputMin*1000`, `maxSegmentMs = outputMax*1000`, and `maxInputVideoMs` be the live single/total reference-video limit. Build the fewest source segments that fit both input and output budgets, have no short tail, and preserve exact millisecond coverage. Prefer near-maximum whole-second non-final segments; only the final segment may retain fractional milliseconds. For example, with a 30s output max, `30248ms` becomes `26000ms + 4248ms`, not `30000ms + 248ms`.
2. Physically extract every real source segment through the local-media bridge.
3. Extract exactly one shared source boundary frame for each internal boundary (`segmentCount - 1` total), create one edited boundary image per boundary, refresh, and verify it. Do not create one independent first frame for every segment.
4. Submit each segment as `video_edit` with its own real source segment as `reference_video`, applicable target images, and `parameters.omniReferenceTaskType=edit`. Segment 1 may use the first shared boundary as its end anchor; a middle segment may use the preceding boundary as start and the following boundary as end; the last segment may use the preceding boundary as start, but only when the live capability advertises those roles.
5. Reuse the exact same edited boundary image on both adjacent segments. Every segment remains `edit`; `extend` is forbidden even for segment 2 and later.
6. Refresh all results, assemble in source order, and Timeline-trim each segment back to its exact source milliseconds before any requested export.

## Legacy non-Seedance path

```text
Confirm source + targets → read exact durationMs
→ balanced physical source segments when needed
→ extract required start/boundary frames once
→ edited anchor image tasks → refresh + checks
→ per-segment video_edit submits with reference_video (+ images)
→ Timeline trim to source ms → export if requested
```

Use only input roles the live capability advertises. The legacy path may require an edited first-frame anchor even when unsplit; keep that anchor separate from target identity images.

## Segmentation

- `durationMs` below the live output minimum → block rather than invent extra source content.
- Output duration and source-reference duration are separate limits. A source can fit one reference while slightly exceeding maximum generated output.
- Do not split merely because there are several replacements. Split only for a live input/output bound or an explicit independently editable-deliverables request.

## Per-segment submit (required)

- `taskType = video_edit`
- Source/segment as `reference_video`
- Replacement targets and any applicable edited boundary/start anchor as `reference_image`
- On Seedance 2.5, `parameters.omniReferenceTaskType = edit` on **every** segment
- `reference_audio` / `motion_control` only when live capability provides them and semantics need them
- Never reuse one segment's source video as an extension anchor for the next edit segment; each segment edits its own real source range

If capability lacks `reference_video`, **do not** degrade to start/end-only regeneration and claim frame-aligned edit — return `partial`.

## Dialogue

Replace dialogue on an independent audio track + Timeline align. Do not require the video model to rewrite spoken lines inside the visual prompt.

For an unsplit source in the Seedance input-only margin above the live output max, Timeline trim cannot restore milliseconds the model never generated. State that limitation instead of claiming exact full-length preservation.
