# Duration and Task Assembly

Universal duration algorithm (capability min/max, `T≤max` single task, balanced splits, no short tails, 1–3s handling, omitted duration/aspect defaults): `$operate-topview-canvas` → [`references/generation-planning.md`](../../operate-topview-canvas/references/generation-planning.md).

Read that file first. This file only adds **workflow-specific single-task gates** and Element Editing millisecond notes.

## Workflow-specific single-task gates

| Workflow | Single video task when |
| --- | --- |
| Direct | Final prompt is self-contained and `T ≤ max` |
| Replication | `T ≤ max` (after mode/plan locked) |
| Social | `T ≤ max` — even with hook/body/CTA |
| Ecommerce | `T ≤ max` AND same physical space AND same primary product context → one Scene / one video task |
| Short Film | `T ≤ max` AND same primary physical/narrative scene AND no explicit space-time hard cut → one Scene / one video task |
| Element Editing | Source segment duration ≤ max → one edit segment; else balanced `ceil(durationMs/maxMs)` splits |

See the matching file under [workflows/](workflows/) for full stage rules.

## Integer seconds vs millisecond sources

Element editing may need `ceil(sourceDurationMs/1000)` clamped to `[min,max]` for generation, then Timeline trim back to exact ms. See [workflows/video-element-editing.md](workflows/video-element-editing.md) and [recipes/timeline.md](recipes/timeline.md).
