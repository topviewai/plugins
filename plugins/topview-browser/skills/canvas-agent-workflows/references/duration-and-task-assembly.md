# Duration and Task Assembly

Universal duration algorithm (capability min/max, `T≤max` single task, balanced splits, no short tails, 1–3s handling, omitted duration/aspect defaults): `$operate-topview-canvas` → [`references/generation-planning.md`](../../operate-topview-canvas/references/generation-planning.md).

Read that file first. This file only adds **workflow-specific single-task gates**, model-specific continuation behavior, and Element Editing millisecond notes.

## Workflow-specific single-task gates

| Workflow | Single video task when |
| --- | --- |
| Direct | Original Goal Contract passes every Direct Eligibility Gate and `T ≤ max` |
| Replication | `T ≤ output max` (after mode/model/plan locked); longer Seedance 2.5 output is a serial auto→extend chain, while legacy models use balanced independent splits |
| Social | `T ≤ max` — even with hook/body/CTA |
| Ecommerce | `T ≤ max` AND same physical space AND same primary product context → one Scene / one video task |
| Short Film | `T ≤ max` AND same primary physical/narrative scene AND no explicit space-time hard cut → one Scene / one video task |
| Element Editing | Source fits the selected model's advertised single-video input and output policy → one edit task; otherwise balanced physical source splits, every one retaining edit intent |

See the matching file under [workflows/](workflows/) for full stage rules.

Duration fit never selects a workflow. Route from the Original Goal Contract first; use this table only after narrative coverage, adaptation, consistency, and reusable-asset requirements are fixed.

## Output budget vs reference-input budget

Never use a reference-video input maximum as the generated-output maximum. For Seedance 2.5, current compatibility knowledge permits a source up to about 30.2s as one input while generated output remains at most 30s; live capability/constraints win. The extra input-only margin is not output and cannot be restored by Timeline trim.

For Seedance Replication `extend`, each task duration is only the new standalone footage. Do not add source duration. Generate the first segment, refresh to a real result, then use that result for the next serial extension.

## Integer seconds vs millisecond sources

Element editing may need `ceil(sourceDurationMs/1000)` within the live output range, then Timeline trim back to exact ms. When a longer source must split, forbid a sub-minimum tail: rebalance earlier whole-second segments and allow fractional milliseconds only on the final valid segment. See [workflows/video-element-editing.md](workflows/video-element-editing.md) and [recipes/timeline.md](recipes/timeline.md).
