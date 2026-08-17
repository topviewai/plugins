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
- Element Editing requires `reference_video` on each segment.
- Replication final tasks use AI keyframes, not the original reference video.

## Placement

- Tier A default: omit `nodeId` on submit; prefer `layout:{x,y,width?,height?}` from one state snapshot (forbidden with `nodeId`/`parentId`/`sceneNodeId`); omit `layout` keeps `(0,0)` compat with no BFF auto-avoidance — repair overlap with move/transform.
- Tier B: draft card with computed x/y, then submit with that `nodeId` (no `layout`).
- Independent same-layer submits/refreshes may run under Safe Parallel Policy (wait-all; slim refresh omit/`include=[]`); storyboard→video and same-target work stay serial. Do not send `expectedRevision`.
