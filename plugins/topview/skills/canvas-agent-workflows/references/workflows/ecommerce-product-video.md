# Workflow: Ecommerce Product Video

Source mapping: `workflow-ecommerce-product-video`.

## Intent

Staged product video: script → primary keyframes → derived keyframes → Scene/video, with product identity on every relevant submit.

## Read first

[duration-and-task-assembly.md](../duration-and-task-assembly.md), [reference-resolution.md](../reference-resolution.md), [recipes/asset-product.md](../recipes/asset-product.md), [recipes/scene-surrogate.md](../recipes/scene-surrogate.md), [recipes/audio-continuity.md](../recipes/audio-continuity.md), [recipes/timeline.md](../recipes/timeline.md).

## DAG

```text
Intake → content type → script (ledger lock)
→ primary keyframe(s) (1, max 2) with original product typed input
→ refresh + auto quality check
→ derived keyframes (2–5) each referencing accepted primary + original product
→ Scene surrogate(s)
→ video task(s) with keyframes + original product inputs
→ optional voice continuity for multi-clip UGC
→ Timeline/export if requested
```

## Hard rules

- Simple ≤max product generate with a self-contained prompt → prefer Direct.
- **Single-task gate:** `T ≤ max` AND same physical space AND same primary product context ⇒ exactly one Scene and one video task. Keyframe count/angles/steps are not split reasons.
- Do **not** create Style/Character/Environment/Object cards by default; people/environments live inside integrated keyframes.
- Never promise captions/stitching/mixing the product does not support via MCP.
- Every product-appearing stage must include the original product image as a typed input.
- Do not ask the user to reply OK/continue between stages; refresh + automatic checks advance the DAG.

## Defaults

- Aspect `9:16` unless specified.
- Staged total duration often 15–25s; assemble per live max.
