# Workflow: Short Film

Source mapping: `workflow-short-film-creation`.

## Intent

World-building short film with reusable Character/Environment/Object Assets and persisted scene records.

## Read first

[duration-and-task-assembly.md](../duration-and-task-assembly.md), [reference-resolution.md](../reference-resolution.md), [recipes/asset-product.md](../recipes/asset-product.md), [recipes/scene-surrogate.md](../recipes/scene-surrogate.md), [recipes/audio-continuity.md](../recipes/audio-continuity.md), [recipes/timeline.md](../recipes/timeline.md).

## DAG

```text
story outline (Plan Ledger)
→ style text brief only (not a default visual input)
→ create/adopt character/environment/object Asset nodes
     (safe-parallel when preplanned; else serial if height-dependent)
→ wait for identity projection (consistencyStatus=projected) and durable primary/cover media
→ create persisted scenes with positioned `<<@shortCode>>` references
     (safe-parallel when coords preplanned from one snapshot)
→ Scene storyboard submits by `sceneNodeId` (when requested; independent scenes may parallel)
→ scene videos carrying their `sceneNodeId` + per-segment `canvas_node` inputs
     (storyboard→video on the same scene is serial; independent scenes may parallel)
→ voice continuity across speaking clips (serial dependency)
→ film-wide narration, if requested: one standalone TTS task → import as a Canvas audio node
→ Timeline/export if requested
```

Order invariant: **Asset nodes → persisted scenes → storyboard (`sceneNodeId`) → video**. Cross-layer deps stay serial; same-layer independent work follows Safe Parallel Policy (wait-all). Do not submit storyboard before required Asset media is durable; do not invent `assetId`; do not chain Canvas `expectedRevision`.

## Hard rules

- Self-contained ≤max final prompt → prefer Direct.
- **Single-task gate:** continuous narrative `T ≤ max` without hard space-time cuts ⇒ one Scene / one video task even with multiple camera beats.
- Explicit hard cuts / location jumps / long-form targets may split; each segment repeats that segment’s asset typed inputs via Asset `nodeId`.
- Style images are not default downstream refs.
- A scene draft may reference an Asset whose media is pending, but scene storyboard submission has a hard readiness barrier: every visual reference needs a durable image. Asset media tasks may generate in the background after safe-parallel or serial submits; only submit the scene storyboard after all required assets are ready and projected when mentions are needed.
- Default multi-scene audio: SFX-only, no baked BGM unless requested.
- Voice continuity barrier blocks later speaking videos until durable audio is bound/registered.
- Route every sound by layer before submitting — in-shot sound rides the video model's `nativeAudio`, cross-shot narration is one standalone TTS track, `voice_design` designs a timbre and is never a narration renderer. See [recipes/audio-continuity.md](../recipes/audio-continuity.md).
- Scene outputs land inside a Scene group; each one closes with the Layout Gate in [generation-stage-machine.md](../generation-stage-machine.md) before the next stage starts.

## Suggested lengths

30 / 60 / 90 / 120s totals, segmented by capability max.
