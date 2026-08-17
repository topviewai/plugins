# Workflow: Direct Generation

Source mapping: `workflow-direct-image-video-generation`.

## Intent

Fast path for self-contained image/video/audio/music generation on Canvas without staged world-building.

## Read first

[duration-and-task-assembly.md](../duration-and-task-assembly.md), [reference-resolution.md](../reference-resolution.md), [recipes/image-video-generation.md](../recipes/image-video-generation.md).

## Steps

1. Confirm Direct is correct via [workflow-routing.md](../workflow-routing.md). Route out if replication, frame-aligned edit, or staged ecommerce/short-film is required.
2. Fetch capabilities; pick model/taskType; freeze duration/aspect defaults (video 10s / 16:9 unless social vertical → 9:16; image 1:1).
3. If the user said to use a prompt unchanged, copy it verbatim into submit `prompt` — do not translate or rewrite.
4. Multi-shot / timecode prompts with `T ≤ max` stay **one** continuous video task.
5. If `T > max`, re-route or split per duration rules; do not force a single illegal duration.
6. Attach typed inputs for any media the user referenced; upload-bridge local files first.
7. V2 submit → refresh to terminal → report. No preview approval round.

## Boundaries

- Instant multi-option requests: honor count up to a small cap (≤4); default 1 when unspecified.
- Precise visual dependency on a video frame: extract/upload frame first, wait for durable id, then submit downstream.
