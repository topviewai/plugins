# Recipe: Image / Video Generation

Always use the `$operate-topview-canvas` three-step V2 flow.

## Image stages

- `text_to_image` for net-new frames.
- `image_edit` when editing existing durable images.
- Anchor-first workflows: submit exactly one anchor, refresh to success, run fidelity checks, then derived frames.
- N results ⇒ N submits (one node / one task / one result each) with layout gaps from operate skill.

## Video stages

- Prefer `video_edit` when multiple reference images/audio are required.
- Use `image_to_video` only when start/end semantics are sufficient.
- Use `text_to_video` only when no required visual refs exist.
- Resolve the exact live model before deciding references or splits. When Seedance 2.5 wins, follow `$operate-topview-canvas` `references/seedance-2.5.md` and pass `omniReferenceTaskType` only when the selected capability exposes it.
- Element Editing requires its own real `reference_video` on every segment. Seedance 2.5 uses `edit` for every segment, never `extend`; an unsplit source that fits the input budget skips extracted/edited keyframes.
- Seedance 2.5 Replication uses the original source as the first direct omni-reference with `auto`, then real generated results as serial `extend` references. Legacy Replication uses accepted AI keyframes and excludes the original source from final tasks.
- Do not put aspect ratio, duration, resolution, or Seedance task mode into prompt prose; keep them in live-schema structured parameters.

## Placement

- Tier A default: omit `nodeId` on submit; prefer `layout:{x,y,width?,height?}` from one state snapshot (forbidden with `nodeId`/`parentId`/`sceneNodeId`); omit `layout` keeps `(0,0)` compat with no BFF auto-avoidance — repair overlap with move/transform.
- Tier B: draft card with computed x/y, then submit with that `nodeId` (no `layout`).
- Independent same-layer submits/refreshes may run under Safe Parallel Policy (wait-all; slim refresh omit/`include=[]`); storyboard→video and same-target work stay serial. Do not send `expectedRevision`.
