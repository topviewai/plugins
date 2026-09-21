# Workflow: Video Replication

Source mapping: `workflow-video-replication`.

## Intent

Create a **new** video modeled on one concrete reference video. Not frame-aligned source editing.

## Entry guard

Run before source analysis, model selection, extraction, asset generation, or paid submits:

1. Read the substantive user-authored instruction, ignoring quick-start labels, preset titles, and outer clone/remake wrappers as routing evidence.
2. “Replace/change X in this video” means `video-element-editing`, even when an outer wrapper says to clone or create a new video. Re-route immediately; do not retain Replication mode, previews, or task-mode assumptions.
3. A clearly separate new production modeled on concept, structure, shot grammar, pacing, motion, or style remains Replication.
4. If the substantive instruction genuinely supports both methods, ask the two-way question in [workflow-routing.md](../workflow-routing.md) before doing any work.

If the user replaces the source video later, invalidate all source-derived duration, cuts, analysis, evidence frames, previews, and segment plans. Analyze the new source from scratch.

## Read first

[duration-and-task-assembly.md](../duration-and-task-assembly.md), [reference-resolution.md](../reference-resolution.md), [recipes/image-video-generation.md](../recipes/image-video-generation.md), [recipes/ffmpeg-media.md](../recipes/ffmpeg-media.md), [recipes/audio-continuity.md](../recipes/audio-continuity.md). When Seedance 2.5 wins model selection, also read `$operate-topview-canvas` `references/seedance-2.5.md`.

## Modes

| Mode | Fidelity |
| --- | --- |
| `light` | Preserve style; adapt content/story/composition/pacing |
| `high` | Preserve style/content/story/key composition/pacing except declared replacements |

Lock mode from clear intent; ask once if ambiguous or conflicting. Restate mode in the Replication Plan ledger.

## Resolve the model before the production path

Prefer a compatible Seedance 2.5 capability for reference-rich replication unless the user explicitly selected another model. The user's available explicit choice wins. Resolve the exact live model, output duration, reference-video budget, resolution enum, input roles, and task-mode enum before choosing splits or references.

Before the first paid submit, lock one exact planned resolution from the selected capability and include it in the plan/approval summary together with the live alternatives. If an existing default is absent or incompatible, resolve the choice before generation instead of guessing. Do not hardcode a Seedance resolution list or invent prices/credit savings.

Use the Seedance fast path only when the live capability supports its required inputs and modes. A single first segment may use `auto` semantics when its advertised task type accepts the references; a multi-segment continuation also requires advertised `extend`. If a required field or role is absent, do not paid-probe. Use the legacy path with a compatible model only when that does not override the user's explicit model choice; otherwise return `partial` and name the missing capability.

## Model-specific reference policy

### Seedance 2.5 fast path

The original source video **is** a direct `reference_video` for the first generated segment. It owns style, motion, camera, timing, structure, and audiovisual-continuity duties according to the locked mode.

- First segment: `parameters.omniReferenceTaskType=auto` when the field is exposed.
- Later segment: wait for the real preceding generated video, use that result as `reference_video`, and set `parameters.omniReferenceTaskType=extend`.
- Do not extract style frames, create anchor/derived keyframes, or extract a voice seed. Generate only missing reusable identity/product/object/environment images that the replacement brief truly needs.
- Every auxiliary image gets one bounded duty. It must not take over motion, camera, pacing, framing, or background from the source unless that duty was explicitly assigned.
- Light mode preserves the visual language while adapting content, story, composition, and pacing. High mode preserves content, structure, composition, pacing, motion, and look except declared replacements.

For an output longer than the live maximum, use the fewest valid balanced segments. Generate segment 1 first, refresh to a real result, then generate each continuation serially from the immediately preceding result. Do not create independent parallel continuation clips. Each `extend` duration and every prompt beat describe only newly generated standalone footage, never source plus extension.

If the original source exceeds the live reference-video input budget, physically extract only the first planned source range for segment 1. Do not pre-cut later ranges from the original: later Seedance segments continue from real generated results.

### Legacy non-Seedance path

Analyze the original source, but **do not** put its original `reference_video` into final submits. Extract 2–4 evidence frames, create exactly one AI anchor keyframe, refresh and check it, then derive the remaining AI keyframes. Final video tasks use only accepted AI-generated keyframes as typed visual inputs. Keep source-extracted and AI-generated frames in separate provenance registries.

## DAG

```text
Analyze source and exact duration → lock mode, dialogue, model, resolution, limits
→ Seedance 2.5: collect only missing element images
     → first task uses source + auto → refresh
     → serial real-result + extend tasks when longer
→ Other models: source evidence frames → one anchor → refresh/check
     → derived AI keyframes → final video task(s)
     → legacy voice-seed continuity only when multi-clip same speaker
```

## Anchor-first

On the legacy path, never batch all keyframes as independent first submits. The anchor must succeed and pass style-dimension checks before derived frames. The Seedance fast path has no keyframe stage.

## Dialogue Contract

If speech exists and user did not request silence: every plan/video stage states Speaker, Speech mode, Exact dialogue, Speech timing (or Dialogue: None for silent shots).

Seedance serial continuations use the preceding generated video for voice and audiovisual continuity. Do not detour through voice extraction. Legacy multi-clip generation may use the first approved speaking result as a voice seed per [recipes/audio-continuity.md](../recipes/audio-continuity.md).

## Duration

Use live output bounds, not the reference-video input bound. A Seedance source in `(30s, 30.2s]` may remain one direct input while defaulting to one 30-second output when the user did not request longer; disclose that the extra input-only margin is not output. For a legacy capability whose max is 15, a 15s target means **one** final submit; 16s prefers 8+8, never 15+1.
