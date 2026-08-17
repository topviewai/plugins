# Workflow Routing

Pick exactly one primary workflow. Prefer the smallest workflow that can finish the user's goal.

## Decision order

1. **Web research only / research then import** → `web-research` ([workflows/web-research.md](workflows/web-research.md)). If the user also asks to generate after research, finish research/import first, then re-route.
2. **Frame-aligned edit of supplied footage** (keep duration/shots/actions/timing; replace selected elements) → `video-element-editing`.
3. **New production modeled on one concrete reference video** (remake / replicate / light or high restoration; not frame-aligned) → `video-replication`.
4. **Ambiguous replicate vs edit** → ask the two-way question once, then stop until the user chooses. Do not load either workflow or submit paid tasks before the choice.
5. **Ecommerce / product ad with staged keyframes or multi-beat product narrative** → `ecommerce-product-video`. A simple ≤max product video with a self-contained final prompt may use `direct-generation`.
6. **Short film / multi-asset story world** (characters, environments, objects, multi-Scene) → `short-film`. A self-contained ≤max final prompt may use `direct-generation`.
7. **Social / UGC / hook-body-CTA vertical video** → `social-media-video`. Simple ≤max self-contained prompts may use `direct-generation`.
8. **Direct image / video / audio / music from a self-contained prompt** → `direct-generation`.
9. Otherwise ask which creative goal to pursue; do not invent a multi-stage DAG.

## Ambiguous replicate vs edit question

```text
Which approach do you want?
1. Edit the original video directly, keeping its duration, shots, and character actions aligned frame by frame while replacing selected elements.
2. Generate a separate same-type video with similar creative concept, content structure, and visual style, without frame-by-frame alignment.
```

Choice 1 → `video-element-editing`. Choice 2 → `video-replication` (then resolve light/high if still unclear).

## Fast-path overrides into Direct

Use `direct-generation` when all are true:

- The user provided or approved a self-contained final prompt, or said to generate it unchanged.
- Target duration ≤ selected capability max.
- No replication, frame-aligned edit, multi-asset short-film world-building, or staged ecommerce keyframe DAG is required.

If duration exceeds capability max, route to the matching multi-stage workflow or split per [duration-and-task-assembly.md](duration-and-task-assembly.md).

## Non-goals for this skill

- Marketing-only research without Canvas creation → `$marketing-studio`.
- Non-Canvas standalone generation → `$topview-generate`.
- Atomic open/move/layout without a creation DAG → `$operate-topview-canvas`.
