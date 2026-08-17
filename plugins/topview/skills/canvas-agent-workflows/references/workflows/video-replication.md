# Workflow: Video Replication

Source mapping: `workflow-video-replication`.

## Intent

Create a **new** video modeled on one concrete reference video. Not frame-aligned source editing.

## Read first

[duration-and-task-assembly.md](../duration-and-task-assembly.md), [reference-resolution.md](../reference-resolution.md), [recipes/image-video-generation.md](../recipes/image-video-generation.md), [recipes/ffmpeg-media.md](../recipes/ffmpeg-media.md), [recipes/audio-continuity.md](../recipes/audio-continuity.md).

## Modes

| Mode | Fidelity |
| --- | --- |
| `light` | Preserve style; adapt content/story/composition/pacing |
| `high` | Preserve style/content/story/key composition/pacing except declared replacements |

Lock mode from clear intent; ask once if ambiguous or conflicting. Restate mode in the Replication Plan ledger.

## Hard product policy

- Analyze the original reference video; **do not** put the original `reference_video` into final video submits (Replication final-input policy).
- Final video tasks use AI-generated keyframes as typed inputs.
- `reference_video` remains for Element Editing. Do not silently flip Replication policy.

## DAG

```text
Analyze reference (details/download/FFmpeg as needed)
→ extract 2–4 style/composition evidence frames → upload bridge
→ Style DNA in ledger
→ Replication Plan + Dialogue Contract + Fidelity Contract
→ exactly one anchor keyframe submit → refresh → style-fidelity gate
→ derived keyframes with explicit Style / Identity / Composition roles
→ final video task(s): T≤max ⇒ one task; else balanced splits
→ voice-seed continuity when multi-clip same speaker
```

## Anchor-first

Never batch all keyframes as independent parallel first submits. Anchor must succeed and pass style-dimension checks before derived frames.

## Dialogue Contract

If speech exists and user did not request silence: every plan/video stage states Speaker, Speech mode, Exact dialogue, Speech timing (or Dialogue: None for silent shots).

## Duration

15s target with max=15 ⇒ **one** final video submit. 16s ⇒ prefer 8+8, never 15+1.
