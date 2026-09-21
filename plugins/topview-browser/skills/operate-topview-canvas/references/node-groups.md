# Node Groups (composition)

Use Canvas Group nodes to keep related nodes scannable. This is the **generic** composition pattern for MCP — not a Scene-specific API. Scene / storyboard contracts (Text field semantics, typed refs, Timeline eligibility) live in `$canvas-agent-workflows` when needed.

## Tools

| Intent | Tools |
| --- | --- |
| Empty group shell | `create_topview_canvas_group_node` |
| Wrap existing top-level nodes | `group_topview_canvas_nodes` |
| Attach / reparent a child | `set_topview_canvas_node_parent` (destination coordinates are parent-local) |
| Dissolve group, keep children | `ungroup_topview_canvas_nodes` |

Do **not** send `expectedRevision`. Prefer Safe Parallel Policy for independent group ops; same-target writes stay serial.

## Common children inside a Group

- Text brief / contract / notes
- Media or generation result nodes
- Asset nodes (product / character packs)
- Other explanatory nodes (file, secondary text)

Do not invent a second result node for a generation task; keep the result on the same generation node, then reparent or arrange it under the group after success when composition requires it.

## Layout with node-layout

Read [`node-layout.md`](node-layout.md) for gaps and collision rules.

- Place the Group and its top-level neighbors with the usual **32px** gap / **24px** collision buffer.
- Children use parent-local coordinates; keep them readable inside the group without stacking every child at `(0,0)`. Lay them out with the parent-local rules in [`node-layout.md`](node-layout.md) §4.4 — the top-level row table does not see children.
- Prefer: create or succeed the media/generation node first → then `set_topview_canvas_node_parent` (or group existing nodes) so paid results are real before composition. **Exception — asset cards**: image generation for an Asset uses submit `parentId` (Tier C) and mounts at submit time; do not reparent it afterwards.
- Avoid overlapping the group bbox with other top-level content; repair with `normalize_topview_canvas_layout` (omit `parentId` for the top level), or by writing explicit coordinates with `transform_topview_canvas_nodes`. Do not reach for `arrange_topview_canvas_nodes` here: its `align_*` modes collapse every selected sibling onto one edge, which is how two children end up at the same `(x, y)`.

## The group does not resize itself

A Group's `width` / `height` are set **once**, from the member bbox at creation time, and are then static. The only server-side recompute is when a **new Scene-linked generation output** is attached to an existing Scene group.

**No editing tool resizes a group as a side effect.** `move_topview_canvas_node`, `transform_topview_canvas_nodes`, `set_topview_canvas_node_parent` and `ungroup_topview_canvas_nodes` all leave the frame exactly as it was. So a child you move down, or a placeholder that grows when its media lands with a taller aspect ratio, will hang outside the frame until you ask for a recompute — `normalize_topview_canvas_layout { parentId }` is that ask, and the only tool that performs it.

Owner of the recompute: whoever performed the last write that changed a child's geometry. That includes the turn in which an async generation reaches `success`, because the result can resize the node.

### Containment invariant

With `padding = 24` (the server's group padding, and the default for `group_topview_canvas_nodes`), every direct child `c` of group `g` must satisfy:

```text
c.x >= padding
c.y >= padding
c.x + c.w <= g.w - padding
c.y + c.h <= g.h - padding
```

and no two visible siblings may intersect. After any child geometry change, recompute the frame from the children:

```text
g.w = max(c.x + c.w for c in children) + padding
g.h = max(c.y + c.h for c in children) + padding
```

If a child ends up at a local `x` or `y` below `padding`, grow the frame **up / left** instead: shift the group's own position by the deficit and add the same amount to every child's local coordinate, so nothing moves on screen.

### Do the recompute with one call

`normalize_topview_canvas_layout { parentId: <groupId> }` runs exactly this: it separates overlapping children, then refits the frame from **all** members — hidden ones included, so a card you hid stays inside the frame if it is ever shown again — applying the up/left shift for you. It writes nothing when the frame is already correct, and it returns `frameResized` with the before/after rectangle when it is not.

### A growing frame makes its own room

Hugging the children is only half the invariant: a frame that grows has to grow *into* something. A 720px-wide video landing in a frame built for a 480px column drives the right edge 240px outwards, and whatever stood there — typically the next SceneCard in the row — ends up inside the group.

The server closes this itself, on every path that refits a frame (a Scene output landing, or a `normalize` parent pass). Whichever edge moved outwards, the band of nodes beyond it is translated by exactly that distance. The whole band travels together, so a row stays a row rather than one card being singled out and pushed below its neighbours, and nodes that band would then run into join it and travel the same distance. Growing into empty space moves nothing.

You do not call anything for this. What you do owe it is a fresh `get_topview_canvas_state` before your next placement: a generation inside a frame can have changed the coordinates of nodes outside it.

The same rule covers a frame *appearing*. A Scene gets its frame when its first output lands, which follows render order rather than story order, so on a board of thirteen episodes the frames show up in whatever sequence the generations happen to finish. The frame is built around the SceneCard **where you put it** — grouping never relocates a Scene to sort it against the frames that already exist — so an episode authored at the head of the row stays at the head, whichever order the renders come back in.

A frame does cost the row 24px on each side, so at the default 32px gap two framed neighbours no longer fit. The neighbour that gets clipped moves aside by the missing 48, towards whichever side it is already nearer, taking the rest of its row with it; the strip stays in order at an even gap. You can avoid the churn entirely by laying Scene strips out at a 560px stride (see `node-layout.md` §2) rather than the 512 a 480-wide card would suggest.

Only fall back to `transform_topview_canvas_nodes` plus a manual frame update when you need geometry the tool will not produce. Either way, read the children back and confirm containment before treating the composition as done.

## Example uses (non-exhaustive)

- Storyboard / paragraph organization (one group per beat or paragraph)
- Product data cluster (brief + product images + assets)
- Reference pack (style / character / environment refs)
- Multi-version comparison cluster
- Pre-export final-cut pack (success media ready for Timeline)

Scene surrogate Groups are one application of this pattern; creative contract fields are not defined in this file.
