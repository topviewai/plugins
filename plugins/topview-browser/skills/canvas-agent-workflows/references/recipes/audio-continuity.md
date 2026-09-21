# Recipe: Audio Continuity

Multi-clip same-speaker pipelines keep serial dependency ordering without user confirmation.

## State machine

```text
generate first speaking video
→ refresh to success
→ download/inspect; confirm a clean single-speaker span exists
→ extract or design voice ref (>=2s, prefer 2–5s; respect capability max, often <=15.2s)
→ upload bridge if local
→ refresh/bind until durable audio exists (Character bound_voice or audio node)
→ add typed reference_audio (+ prompt mention) to all dependent unsent video stages
→ generate later videos
```

## Constraints

- Never invent `aud_*`, taskId, fileId, or mediaRef.
- Respect live audio role counts and total duration (Seedance 2 baseline: ≤3 audios, total ≤15s) — live capability wins.
- Overlapping/unclear speakers → `partial` or an explicit voice-design path; do not blind-extract.
- Audio projection/refresh defects → mark audio continuity conditionally supported and return `partial` rather than fake binding.
- Element Editing dialogue replacement stays on an **independent audio track**; video prompts must not ask the model to rewrite dialogue in-picture unless that is a separate explicit visual edit.

## Which layer owns which sound

Classify every sound before spending credits. The three layers are mixed separately on the Timeline:

| Sound | Where it is produced | Acceptance check |
| --- | --- | --- |
| Dialogue, cries, and any sound made inside a shot (wings, rain, footsteps, impacts) | The video model's native audio — set `nativeAudio` per shot | In sync with the picture, right speaker, no stray music or voices |
| Narration that runs across shots | **One** standalone TTS task on its own track, not per-scene | Single timbre and pace end to end, independently mixable |
| Standalone SFX / ambience bed, score | `audio_design`, `music` | Loops cleanly, no dialogue bleed, leaves mid-range room for narration |

`voice_design` is none of these: it designs a reusable **voice identity**, not a rendered line. It takes `parameters.description` (the timbre) plus `parameters.script` (a one-or-two-sentence sample read in that timbre), and it refuses a `prompt` outright so a narration script cannot land in it by habit.

### Narrator track

A film-wide narrator is a single continuous audio asset, not one clip per scene. Splitting it across scene tasks drifts in timbre and pace, clips sentence tails, and leaves narration volume welded to whatever else that task produced.

```text
topview_list_voices → topview_generate_voice (whole script, one task) → topview_query_task
→ prepare_topview_canvas_media_upload / create_topview_canvas_media_node
→ its own timelineAudioClips[] entry
```

Character voice continuity (above) is a different problem and still applies to speaking clips.

## Short Film default

Multi-scene Short Film defaults to SFX-only / no baked BGM unless the user asks for music. Character voice continuity still applies when the same speaker talks across clips. Narration is only added when the user asks for it — but when they do, it is one track, not eight.
