# Workflow: Direct Generation

Source mapping: `workflow-direct-image-video-generation`.

## Intent

Eligibility-gated fast path for an atomic, user-provided or explicitly approved image/video/audio/music generation instruction on Canvas. It is not an adaptation or prompt-condensation workflow.

## Read first

[duration-and-task-assembly.md](../duration-and-task-assembly.md), [reference-resolution.md](../reference-resolution.md), [recipes/image-video-generation.md](../recipes/image-video-generation.md).

## Steps

1. Re-check every Direct Eligibility Gate in [workflow-routing.md](../workflow-routing.md) against the Original Goal Contract. Route out if the input is source material needing adaptation, or if replication, frame-aligned edit, reusable assets, consistency, structured social production, or staged ecommerce/short-film work is required.
2. Resolve/create and visibly open the target Canvas using the Canvas-first gate. Do not fetch standalone generation config or submit before the user can see the project.
3. Fetch Canvas capabilities; pick model/taskType from the Gateway-owned `defaultSelectionPolicy` and capability `preferred` marker; copy the selected capability's `defaults`; freeze workflow duration/aspect decisions (video 10s / 16:9 unless social vertical → 9:16; image 1:1).
4. If the user said to use a prompt unchanged, copy it verbatim into submit `prompt` — do not translate or rewrite.
5. Multi-shot / timecode prompts with `T ≤ max` stay **one** continuous video task.
6. If `T > max`, re-route or split per duration rules; do not force a single illegal duration.
7. Attach typed inputs for any media the user referenced; upload-bridge local files first.
8. V2 submit → refresh to terminal while the Canvas remains visible → report. No preview approval round.

## Boundaries

- Do not turn a chapter, script, screenplay, episode request, multi-scene story, or other larger source into a Direct prompt by summarizing or dropping content. Only the user can explicitly narrow that deliverable.
- Capability max and a short target duration control task assembly; neither proves Direct eligibility.
- Instant multi-option requests: honor count up to a small cap (≤4); default 1 when unspecified.
- Precise visual dependency on a video frame: extract/upload frame first, wait for durable id, then submit downstream.
