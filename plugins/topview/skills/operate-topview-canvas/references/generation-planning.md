# Generation Planning

Live `get_topview_canvas_generation_capabilities` is the generation authority for every Canvas-owned paid submit. Seedance 2 shared docs are planning knowledge only.

Multi-stage creative workflows may add workflow-specific single-task gates on top of the universal duration algorithm below; those gates live in `$canvas-agent-workflows`.

## Required order (capability-first)

For every flow that will submit paid generation:

1. Call `get_topview_canvas_generation_capabilities` with the needed `mediaType` / `taskType` (or `taskTypes` / `models`) and prefer `include=[]` for a summary index.
2. Prefer the user-named model when present and available; otherwise pick a compatible entry.
3. From the selected capability, read:
   - `taskType` / `model`
   - `requiredParameters` / `defaults` / `parameterEnums`
   - `inputRoles` (role + min/max cardinality) when present in the summary
   - duration / resolution / aspectRatio / nativeAudio bounds when present in summary
   - `capabilityVersion`
   - only if needed: `include=["schema"]` for full `parametersSchema`, `additionalProperties` rules, or `constraints` when the summary is insufficient — do **not** hard-require `parametersSchema` on every plan
4. Freeze an immutable plan: model, taskType(s), duration segments, required reference roles from `inputRoles` (`canvas_node.nodeId`), and any Scene vs task counts the caller tracks.
5. Only then create nodes or submit tasks.

**Forbidden:** default three Scenes / three video tasks first, then look up model config at submit time. **Forbidden:** call `topview_get_generation_config` as Canvas authority.

## `nativeAudio` is a decision, not a default

When the capability exposes `nativeAudio`, reading its bounds is not enough — pick a value per shot and be able to say why. There is no safe default: leaving it `false` silently drops the dialogue, cries, footsteps, rain and impacts that only the video model can lock to the picture, and no later `audio_design` pass can re-sync them.

Set it **on** when the shot contains sound made inside the frame: someone or something speaks or vocalizes, or an action makes a noise the viewer expects to hear on the exact frame it happens. Say in the prompt what should be heard and who makes it.

Set it **off** when the shot is deliberately silent, when the track is supplied separately (a film-wide narrator, a scored montage), or when in-shot sound would fight a mix you have already planned.

Cross-shot narration is never `nativeAudio`; it is one standalone TTS track. Full routing table in `$canvas-agent-workflows` → `references/recipes/audio-continuity.md`.

## Seedance 2 planning baseline (override with live capability)

When the selected live model matches 视频全能模型 S2 / Seedance 2 family and the live capability agrees:

- Generation duration selectable about **4–15s** (use live min/max).
- Images up to 9; videos up to 3 with referenced duration about 2–15s; audios up to 3 totaling ≤15s.
- Total files often capped around 12.
- Output up to about 2K when the capability allows.

If live capability differs, **live wins**.

## TaskType selection heuristics

| Need | Prefer when capability offers it |
| --- | --- |
| Prompt only | `text_to_image` / `text_to_video` / audio-music types |
| Edit existing images | `image_edit` + `reference_image` |
| Scene storyboard IMAGE | `storyboard_to_video` with `generationKind=scene_storyboard` + `sceneNodeId`; server derives prompt and ordered image inputs. Model is web-parity **`gpt-image-2` only** (do not pass seedream / other image-edit models). |
| Scene VIDEO | any video taskType plus `sceneNodeId`; caller still supplies prompt and inputs, the server only anchors the card to that Scene's column |
| One start (+ optional end) frame animate | `image_to_video` |
| Multi keyframe / product / style rich video | `video_edit` with multiple `reference_image` (+ audio if needed) |
| Frame-aligned source edit | `video_edit` with `reference_video` required |
| Motion drive | `motion_control` only when live capability provides it and constraints are met |

If a rich flow needs `video_edit` / `reference_video` and the capability is missing, return `partial` or blocked — never silently finish via `text_to_video`.

## Universal duration / task assembly

Use the selected capability’s min/max duration. Do not hardcode `15` as universal. When Seedance 2 / S2 live max is 15s, apply the rules with `max = liveMax` and `min = liveMin` (often 4).

Let `T` = user target duration in seconds, `max` / `min` = capability bounds.

1. If `min ≤ T ≤ max` and any caller-specific single-task gate passes → **exactly one** video task with duration `T` (do not pad a clear 12s request to 15 “to fill the model”).
2. If `T > max` → `n = ceil(T / max)` then **rebalance** into `n` segments so each is in `[min, max]` and no short tail remains.
   - Prefer even splits: 16 → 8+8 (not 15+1); 30 → 15+15; 20 → 10+10; 45 → 15+15+15 when max=15.
3. Multiple shots, timecodes, hook/body/CTA, keyframe counts, or camera moves are **not** reasons to split when `T ≤ max`.
4. Scene count ≠ task count when the caller uses Scene surrogates. One Scene may hold one continuous ≤max task that covers several narrative beats. Do not equate “three beats” with “three tasks”.
5. Only override the single-task default when the user explicitly wants independently retryable/editable clips, or a caller hard-cut / space-jump rule requires it.
6. “Fill the model” means minimize task count for continuous content that must split — not force-padding user durations.

Workflow-specific single-task gates (Direct / Social / Ecommerce / Short Film / Element Editing / …) are **not** defined here; read `$canvas-agent-workflows` `references/duration-and-task-assembly.md` when running those workflows.

## Short requests (1–3s)

If the user wants 1–3s but capability min is higher (for example 4):

- Submit at capability min.
- Put the action inside the requested seconds.
- Hold / freeze / loop the tail for the remainder.
- Do not invent extra story to fill the min.

## Defaults when user omits duration / aspect

Apply only as structured parameters — never rewrite into the user’s locked prompt text:

| Context | Default duration | Default aspect |
| --- | --- | --- |
| Direct / generic video | 10s | 16:9 (9:16 if strong vertical/social cue) |
| Direct / generic image | n/a | 1:1 |
| Vertical / social cue | 15s | 9:16 |
| Longer staged product total | often 15–25s total | 9:16 |
| Longer narrative / short film cue | user/suggested 30/60/90/120 | story-driven; often 16:9 unless specified |

## Plan immutability

After freezing the plan, do not change model/taskType/duration segmentation unless:

- `CAPABILITY_VERSION_EXPIRED` forces re-fetch and re-validate, or
- the user changes the creative goal, or
- a hard gate proves the plan impossible (then report `partial` / re-route).

Record `capabilityVersion` with the plan / stage ledger.
