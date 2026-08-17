# Topview Canvas Node Layout Rules (Agent)

> Source of truth for host / MCP agents placing nodes via Canvas MCP tools.
> Derived from the web product placement engine in `topview-canvas`:  
> `packages/widget/src/collaborativeCanvas/utils/placement/engine.ts`  
> `packages/core/src/agentBatchPlacement.ts`  
> `packages/widget/src/utils/mediaNodeSize.ts`  
> Maintained in sync with `docs/TOPVIEW_CANVAS_NODE_LAYOUT_RULES.md` in the plugin repository.

---

## 1. Goals and invariants

MCP create tools require explicit `x` / `y` (and often `width` / `height`). Agents must compute them so the canvas stays scannable:

1. **No default stack**: never place every new node at `(0,0)` or the same point as an existing top-level node when you care about scanability — unless you intentionally omit `layout` on a top-level submit for `(0,0)` compat (no BFF auto-avoidance).
2. **Gap**: top-level node bounding boxes must leave at least **32px** between edges (`NODE_PLACEMENT_GAP`).
3. **Collision buffer**: when testing overlap, expand each rect by **24px** (`COLLISION_BUFFER`) before intersection checks.
4. **Top-level only**: placement geometry uses nodes without a parent (or parent cleared). Child nodes use parent-local coordinates and are out of scope for free placement.
5. **Preplanned vs serial geometry**: for safe parallel creates/submits, compute all non-overlapping coords from **one** state snapshot before the wave. If the next placement needs a previous returned height, eject strip, or scene column stack, stay **serial** and treat each response’s `revision` + geometry as authoritative.
6. **The canvas is the only memory**: rebuild the row table from `get_topview_canvas_state` at the start of **every** placement wave, not just the first one. See [§4.3](#43-never-place-from-memory).

---

## 2. Spacing constants

| Constant | Value | Use |
| --- | --- | --- |
| `GAP` | **32** | Edge gap, horizontal batch spacing, downward/rightward avoidance step |
| `BUFFER` | **24** | Inflate rects before overlap tests |
| `BATCH_ROW_GAP` | **150** | Vertical gap between one kind row and the next. See below for why it is this large |
| `MAX_SHIFT` | **50** | Max shift attempts before accepting overflow |
| `STACK_NUDGE` | **(+10, +12)** | Only when attach-below intentionally overlaps a non-chain node (web parity; MCP agents should prefer clear space instead) |

`BATCH_ROW_GAP` is deliberately ~5× `GAP`, for two reasons:

- At only 1.5× `GAP` a kind boundary is indistinguishable from the gap between two cards inside a
  row once the canvas is zoomed out, so the whole board reads as one undifferentiated grid.
- A group frame extends above its members by its padding (**24**), and the group title floats
  above the frame at a constant *screen* size, which costs `26 / zoom` in canvas units — 124px at
  21% zoom. Anything smaller lets a group title collide with the row above it. Leave this much room
  between kind rows even when the rows are not grouped yet: grouping happens afterwards, and while
  the server will take the space it needs, a row that has to be shoved is a row whose coordinates
  you no longer know.

**A SceneCard row wants 80px between cards, not 32.** Every Scene gets a frame when its first
output lands, and a frame is its members plus `BUFFER` of padding on each side. Two framed
neighbours therefore need `24 + 24 + GAP` between the cards themselves — lay a Scene strip out at
a **560px stride** for the default 480-wide card. At the bare 32 the strip still comes out correct
and in order, because each arriving frame pushes its neighbour aside by the missing 48, but every
storyboard in the batch then moves cards you did not touch.

`BATCH_ROW_GAP` is the space **between bounding boxes**. It is not a row pitch, and there is no
such thing as a row pitch here — rows of different kinds have different heights
([§3.1](#31-asset-card-height)), so any fixed `y` step is wrong for at least one of them.

Always derive the next row from the previous row's bottom:

```text
nextRowY = max(bottom of every card in the previous row) + BATCH_ROW_GAP
```

Worked example, three asset rows starting at `y = 0`:

```text
character row   y = 0                      h = 688   bottom = 688
environment row y = 688 + 150 = 838        h = 581   bottom = 1419
object row      y = 1419 + 150 = 1569      h = 581   bottom = 2150
```

A flat pitch instead — say `y = 0, 700, 1400` — puts the environment row 12px under the character
row, because 688 eats almost the whole 700 step. That is a collision, not a tight layout.

---

## 3. Default sizes (MCP create / draft cards)

Prefer these when the tool allows optional `width` / `height`, or when estimating collisions from `get_topview_canvas_state` summaries that omit size (assume defaults).

Asset cards do not take a `height` — the server derives it. The two numbers below are what it
derives **at create time**, and they are exact; after that the card grows with its cover, so read
geometry back from the response. See [§3.1](#31-asset-card-height).

| Node kind | Default `width × height` | Notes |
| --- | --- | --- |
| Image / generation image card | **480 × 270** | 16:9, image tier 2K anchor |
| Video / generation video card | **480 × 270** | 16:9, video tier 720p anchor |
| Asset card (`character`) | **480 × 688** | At create time only; grows once a cover lands. See [§3.1](#31-asset-card-height) |
| Asset card (other kinds) | **480 × 581** | Same caveat. `product` is not covered by the formula |
| Text | **320 × 240** | |
| Audio | **480 × 160** | |
| File | **360 × 120** | |
| Story scene | **480 × 350** | |
| Whiteboard | **480 × 270** | |
| Unknown fallback | **240 × 240** | |

### 3.1 Asset card height

`create_topview_canvas_asset_node` does not accept `height`; the server derives it from
`assetKind` and the card width. A freshly created card has no cover, so its height is fixed and
you can plan a whole multi-row wave against it:

| `assetKind` | Height at create (any width) |
| --- | --- |
| `character` | **688** — 581 plus a 107px voice slot no other kind renders |
| `style` / `object` / `environment` / `custom` | **581** |
| `product` | not derivable; read it from the response |

Description length does not change this: the description box has a fixed height and long text
scrolls inside it.

These numbers only hold **until the card gets a cover image**. After that the height follows the
cover's aspect ratio, so any later placement must use the geometry from a response or from
`get_topview_canvas_state`, never this table.

Other consequences:

- **A character row is 107px taller than every other asset row.** One row pitch cannot serve both.
  This is the single most common way an agent-built board ends up with rows nearly touching.
- `width` is optional. Send it only when the user asked for a specific width; otherwise leave it
  out and take the server default. Read the actual `w` back from the response either way.
- `transform_topview_canvas_nodes` will not let you set an asset card's height either; the server
  recomputes it. Do not use transform to "fix up" a height you guessed wrong.
- The server also **enforces vertical clearance** when it creates an asset card: if the requested
  `y` would leave the card too close under whatever occupies its columns, the card is moved down to
  the correct row gap. So `y` in the response can differ from the `y` you sent — read it back and
  use the returned value as the row anchor. Getting the arithmetic right up front is still your
  job; the guard exists so a mistake degrades into extra spacing rather than a collision.

### Aspect ratio

When the user or capability selects a non-16:9 ratio, keep the **longest side ≈ 480** (or the tier anchor) and derive the other side:

```text
ratio = w/h from "W:H"
if W >= H:  width = 480; height = round(480 * H / W)
else:       height = 480; width = round(480 * W / H)
clamp each side into tool limits (typically 20…5000)
```

Common presets: `16:9 → 480×270`, `9:16 → 270×480`, `1:1 → 480×480`, `4:3 → 480×360`, `3:4 → 360×480`.

---

## 4. Placement intents (web → MCP)

### 4.1 Row key: what counts as "the same kind"

Cards of one kind belong on **one horizontal row that never wraps**. Character cards share a row, prop
cards share a different row, SceneCards share another, and so on. The row key is:

| Node | Row key |
| --- | --- |
| `asset` | its `assetKind` — `character` / `object` / `environment` / `style` / `custom` / `product` |
| everything else | the node `type` — `story_scene`, `image`, `video`, `audio`, `text`, `file`, `group` |

Asset cards are keyed by `assetKind`, **not** by `type`. Treating all assets as one kind is what puts
character and prop cards in the same row.

`get_topview_canvas_state` reports `assetKind` on every asset node, so one state call is enough to
rebuild the full row table. (Canvases written before this field existed may omit it; fall back to
`get_topview_canvas_node_details` for those ids, 1…50 per call.)

### 4.2 Intents

Web `placeNodes` intents mapped for agents that only have `get_topview_canvas_state` (no live viewport):

| Intent | When to use | MCP rule |
| --- | --- | --- |
| `attach-below` | User selected a source node, or generation continues from a known node | `(x, y) = (source.x, source.y + source.h + GAP)` |
| `selection-right` | Multi-select as a group reference | `(x, y) = (sel.maxRight + GAP, sel.minY)` |
| `kind-row` | No source; that row key already exists on canvas | Extend its row rightward: `(anchor.right + GAP, anchor.top)`, then avoid **rightward** on collision. Never wrap, never fall back to `free` |
| `new-row` | No source; that row key is new to the canvas | Start a row below all existing content: `(contentMinX, contentMaxBottom + BATCH_ROW_GAP)` |
| `free` | Empty canvas, or a node that has no meaningful row key | Content-bbox free slot (below) |
| Batch | Creating N nodes in one user turn | Group by row key; each key gets one non-wrapping row |

**MCP vs web:** the web `free` path centers on the **viewport**. MCP has no viewport → approximate with the **content bounding box** of existing top-level nodes (see §5). This still yields ordered, non-overlapping layouts for preview and retrieval.

### 4.3 Never place from memory

A long build spreads placement across many turns: characters early, extra props once the script
names them, Scenes as each episode is written. It is tempting to remember "the object row sits at
y=2500 and ends at x=2800" and keep adding to it from that note.

Do not. Your context can be compacted between turns, and when it is, that note is gone with no
error and no way to notice. What follows is a board where the first wave obeys the row rules
perfectly and every later card starts a stray new row — including different kinds sharing one row,
because the rows they belonged to were forgotten wholesale.

**Before each wave of creates, call `get_topview_canvas_state` and rebuild the row table from the
returned nodes.** Group top-level nodes by row key (§4.1); a row's anchor is the member with the
largest `x + w`, and the row's `y` is that member's `y`. This costs one call and is the only source
that survives compaction.

A row is never "closed". If a row key already exists anywhere on the canvas, a new card of that kind
extends it rightward — no matter how many turns ago it was created, or how far down the canvas has
grown since. `placeNewRow` is only for a row key that appears nowhere in the state you just read.

### 4.4 Inside a parent: the local pass

Everything above is about top-level nodes ([§1.4](#1-goals-and-invariants)). Children of a Group or
Asset card live in their own coordinate space, and the row table never sees them — so a board can be
perfectly ordered at the top level and still have a video sitting on top of a storyboard inside a
Scene frame.

Run a **parent-local pass** whenever a child is created, moved, reparented, or resized (including
when an async generation lands and the result changes the node's height). One call does it:

```text
normalize_topview_canvas_layout { parentId: p }
```

It reads the children, separates any that overlap, refits the frame around them, and reports what it
did. On an already-correct frame it writes nothing, so running it every time is cheap.

**Refitting the frame can move nodes outside it.** A group hugs its children, so a wide render — a
720px video in a frame built for a 480px column — pushes the frame's edge into whatever stood beside
the group. The server handles this for you: whenever a frame grows, the band beyond the edge that
moved is translated by exactly the growth, so a row of SceneCards stays a row instead of one card
being singled out and dropped below its neighbours. It only fires on a real collision, so a frame
growing into empty space moves nothing.

The consequence for you is that **a generation can change the coordinates of nodes you never
touched**. That is already covered by [§4.3](#43-never-place-from-memory) — re-read state before each
wave and rebuild the row table — but it is the reason that rule has no exceptions on a board with
Scene frames.

The equivalent by hand, when you need a layout the tool will not produce:

```text
children = nodes with parentId == p, ordered by semantic slot then by y
cursor   = padding                       # 24, the group padding
for c in children:
  c.y = cursor
  c.x = padding                          # single-column frames; widen the frame, do not shrink cards
  cursor = c.y + c.h + GAP               # 32
resize p from the children (node-groups.md containment invariant)
```

Semantic slot order inside a Scene frame is **SceneCard → storyboard → video → later versions →
notes**; extra versions keep stacking downward at the same `GAP`. This is the order
`mode: "reflow"` produces. Any other frame orders by whatever reading order the composition implies,
but it must be an order you can restate — not "wherever the server put it".

Two rules that keep this pass safe:

- Derive coordinates, never memorize them. The `y = 406` you may see on a storyboard is just
  `24 + 350 + 32` for a default `480×350` SceneCard; a different SceneCard height changes it.
- The server runs the same stacking for Scene outputs submitted with `sceneNodeId`
  ([§6](#6-decision-tree-call-this-before-every-create)), so in the normal case this pass finds
  nothing to move. Run it anyway — it is the only thing that catches a child the server could not
  place.

## 5. Algorithms (agent-executable)

Read state first — every wave, not just the first ([§4.3](#43-never-place-from-memory)):

```text
nodes = top-level entries from get_topview_canvas_state
each: id, type, assetKind?, x, y, w, h   # use defaults from §3 if w/h missing
rows = group nodes by rowKeyOf(node)     # §4.1; this table is rebuilt, never carried over
```

### 5.1 Overlap test

```text
function overlaps(a, b):
  A = expand(a, BUFFER); B = expand(b, BUFFER)
  return rectangles intersect (edges touching after expand count as hit)
```

### 5.2 Avoid downward from a start

```text
function avoidDown(start, size, obstacles):
  pos = start
  for attempt in 1..MAX_SHIFT:
    cand = { x: pos.x, y: pos.y, w: size.w, h: size.h }
    hits = obstacles that overlaps(cand, _)
    if hits empty: return pos
    pos.y = max(hit.y + hit.h for hit in hits) + GAP
  return pos  # overflow: still place; user can arrange later
```

### 5.3 Free slot (content bbox)

```text
function placeFree(size, obstacles):
  if obstacles empty:
    return { x: 0, y: 0 }
  minX = min(o.x for o in obstacles)
  maxBottom = max(o.y + o.h for o in obstacles)
  return avoidDown({ x: minX, y: maxBottom + GAP }, size, obstacles)
```

### 5.4 Kind row

A row grows rightward forever. It does not wrap, and it does not give up and fall back to `free` —
falling back is what scatters same-kind cards across the canvas.

```text
function avoidRight(start, size, obstacles):
  pos = start
  for attempt in 1..MAX_SHIFT:
    cand = { x: pos.x, y: pos.y, w: size.w, h: size.h }
    hits = obstacles that overlaps(cand, _)
    if hits empty: return pos
    pos.x = max(hit.x + hit.w for hit in hits) + GAP
  return pos  # overflow: still place; user can arrange later

function placeKindRow(rowKey, size, obstacles):
  same = obstacles with rowKeyOf(obstacle) == rowKey
  if same empty:
    return placeNewRow(size, obstacles)
  anchor = same with maximum (x + w)
  return avoidRight({ x: anchor.x + anchor.w + GAP, y: anchor.y }, size, obstacles)

function placeNewRow(size, obstacles):
  if obstacles empty:
    return { x: 0, y: 0 }
  minX = min(o.x for o in obstacles)
  maxBottom = max(o.y + o.h for o in obstacles)
  return avoidDown({ x: minX, y: maxBottom + BATCH_ROW_GAP }, size, obstacles)
```

`avoidRight` keeps the row's `y` fixed, so a row stays a row even when it has to step past something.
`placeNewRow` uses `BATCH_ROW_GAP` rather than `GAP` so that rows read as separate bands and so a
group created on either row cannot overlap the other (see §2).

### 5.5 Attach below source

```text
function placeAttachBelow(source, size, obstacles):
  y = source.y + source.h + GAP
  # same-column chain: any obstacle overlapping the vertical strip under source
  for o in obstacles overlapping x-range [source.x, source.x+source.w] and below source:
    y = max(y, o.y + o.h + GAP)
  return avoidDown({ x: source.x, y: y }, size, obstacles)
```

### 5.6 Batch of N nodes (same turn)

There is no column limit. A batch of eight character cards is one row of eight, not two rows of four.
A mixed batch is split by row key, and each key gets its own row in creation order.

```text
function placeBatch(items[]):
  # items[i]: { rowKey, size }
  for item in items in creation order:
    pos = placeKindRow(item.rowKey, item.size, obstacles)
    create the node at pos
    obstacles += the created rect, read back from the response
```

Prefer precomputing non-overlapping cells from one state snapshot when sizes are known (image/video/
Scene defaults). A wave of fresh asset cards also qualifies: their create-time heights are exact
([§3.1](#31-asset-card-height)), so plan each row from the row above it — **per kind**, since a
character row is 688 tall and every other kind is 581. "Conservative spacing" is not a substitute
for that arithmetic; a single pitch applied to mixed kinds is what produces near-collisions.

After each successful MCP create (or after a parallel wave), append new rects to `obstacles` from
response geometry. Do **not** maintain an `expectedRevision` cursor.

When serializing height-dependent placements, after each call read that card's actual `w` / `h`
before computing the next position:

```text
# growing a column downward
y_next = created.y + created.h + GAP
# growing a row rightward
x_next = created.x + created.w + GAP
```

The rule is symmetric in both axes: the number you add always comes from the response, never from
this document. If you need a card **above** an existing one, you cannot know its height in advance,
so place it in clear space first and then move it with `move_topview_canvas_node` once the response
has told you how tall it is.

---

## 6. Decision tree (call this before every create)

```text
1. get_topview_canvas_state → revision + nodes (+ assetKind on assets)
   rebuild the row table from those nodes — always, even mid-project (§4.3)
2. pick size from §3 (+ aspect)
3. if user/selection gives a source nodeId (single):
     pos = placeAttachBelow(source, size, obstacles)
   else if selection has 2+ nodes:
     pos = { x: sel.maxRight + GAP, y: sel.minY }; pos = avoidDown(pos, size, obstacles)
   else:
     pos = placeKindRow(rowKeyOf(new node), size, obstacles)
4. create_* / generation_card with x=pos.x, y=pos.y, width/height when supported
5. read the created node's actual x/y/w/h back from the response; use those, not your estimate,
   as the obstacle rect and as the anchor for the next node
6. if geometry looks stale: re-read projected state, recompute pos, retry (no expectedRevision)
7. optional: focus_topview_canvas_nodes on the new id(s)
```

For an asset card, step 2 takes the height from the create-time table instead of picking one: omit
`height` (the tool does not accept it) and omit `width` unless the user asked for one. Step 5 is
still mandatory — the server can move `y` down to keep the row clear. See
[§3.1](#31-asset-card-height).

For a SceneCard, step 4 is `create_topview_canvas_scene_node`. Estimate `480×350` when size is omitted. Preplan multiple SceneCards from one snapshot when Safe Parallel Policy holds; otherwise replace the estimate with returned geometry before the next serial card. Do not chain Canvas revision.

### Paid generation layout

| Tier | When | How |
| --- | --- | --- |
| **A — Default top-level** | Normal paid generate | `submit_topview_canvas_generation_task` **omit `nodeId`**. Prefer `layout: { x, y, width?, height? }` from §5. `layout` is **forbidden** with `nodeId` / `parentId` / `sceneNodeId`. Omit `layout` → `(0,0)` compat; **no** BFF auto-avoidance — repair with `move` / `transform` if needed. |
| **B — Strict grid** | User asks for a grid / orderly board | First `create_topview_canvas_generation_card` with computed `x/y/size` → then `submit` **with that `nodeId`** (no `layout` on submit). |
| **C — Asset slot** | Image into an Asset card | `parentId` only; server auto layout at `{ x: 12, y: 80 }` — unchanged; no `layout`. |
| **Scene column** | Submit with `sceneNodeId` | Server stacks under that Scene — unchanged; no `layout`. |

Never create a second media node for the generation result; layout fixes move the same generation node.

A Scene is wrapped in a group frame the moment its **first** output lands, and the server slots that
frame into the Scene strip by the `x` you originally gave the Scene — not by when the render
finished. So place SceneCards left to right in story order at create time and the board stays in
story order, however the renders interleave. Do not try to correct the order afterwards by moving
Scenes: the strip is rebuilt from the authored `x` recorded when the group was created.

The server stacks a Scene's outputs under it and grows the frame **as it attaches each new output**.
It does not re-check the frame afterwards, so a placeholder that resizes when its media lands, or any
child you move yourself, leaves the frame stale. Close every Scene output with the parent-local pass
in [§4.4](#44-inside-a-parent-the-local-pass) and the containment check in
[node-groups.md](node-groups.md).

---

## 7. Repair existing overlap

**Default: `normalize_topview_canvas_layout`.** It does the whole read-detect-fix-refit loop
server-side, in one call, and it is the only repair that also resizes a group frame around the
children it just moved.

```text
normalize_topview_canvas_layout { parentId }   # one group / Asset card
normalize_topview_canvas_layout {}             # the top level
```

- `mode` defaults to **`repair`**: it writes only when visible siblings actually overlap, or a child
  hangs outside its group frame. It keeps every node's `x` and pushes only the colliding nodes down —
  a legal-but-tight gap is left alone. Nothing is written on a clean space, so calling it after every
  wave costs one revision-free round trip.
- `mode: "reflow"` re-lays the whole space from scratch: inside a parent, one column in
  SceneCard → storyboard → video order; at the top level, one row per node type with every group in a
  single strip ordered by authored `x`. It **discards manual placement**, so use it only when the user
  asked for a tidy-up.
- `dryRun: true` returns the identical report — `overlaps`, `outOfFrameNodeIds`, `moved`,
  `frameResized` — and writes nothing. Use it to show the user what would move.
- Hidden nodes are skipped, so superseded cards you hid with `set_topview_canvas_nodes_state` do not
  drag a clean board into a repair.
- It clears a group by **150px**, not `GAP` — the frame padding plus the floating title
  ([§2](#2-spacing-constants)) — and ordinary cards by `GAP`.
- A parent pass that **grows the frame** also makes room for it outside ([§4.4](#44-inside-a-parent-the-local-pass)),
  so it cannot fix the inside of a group by breaking the space around it. Those outside moves are
  applied on write and are not part of a `dryRun` preview.

Scope it to the one parent a wave touched. Sweeping the canvas after every generation makes the
board jump around under the user, which is exactly why the web client never does it.

Fall back to manual repair only when you need a layout the tool does not produce:

1. `transform_topview_canvas_nodes` with explicit positions computed from §5 batch packing (or §4.4 for children).
2. `arrange_topview_canvas_nodes` is an **alignment** tool, not an un-stacking tool. Use `distribute_horizontal` / `distribute_vertical` to even out spacing along the axis nodes are already spread on. Use `align_*` only across a perpendicular axis — e.g. `align_left` on a column that is already separated vertically.
3. Arrange requires nodes in the **same parent** coordinate space. Do not send `expectedRevision`.

> ⚠️ **`align_*` creates overlap.** Every selected node gets the same edge: `align_top` sets all of them to `min(y)`, `align_left` to `min(x)`. Running `align_top` on a Scene's storyboard `(24, 406)` and its video `(24, 708)` puts the video at `(24, 406)` — a pixel-perfect cover of the storyboard. Never call `align_top` / `align_middle` / `align_bottom` on nodes stacked in one column, or `align_left` / `align_center` / `align_right` on nodes spread along one row.

---

## 8. Tool checklist

| Goal | Tools |
| --- | --- |
| Read geometry | `get_topview_canvas_state` (then details if size missing) |
| Create with position | `create_topview_canvas_*` including `generation_card` and `scene_node` |
| Create SceneCard(s) | `create_topview_canvas_scene_node` with preplanned coords (safe parallel) or serial geometry-dependent placement |
| Nudge after server placeholder | `move_topview_canvas_node` / `transform_topview_canvas_nodes` |
| Fix overlap / refit a group frame | `normalize_topview_canvas_layout` ([§7](#7-repair-existing-overlap)) |
| Align / distribute | `arrange_topview_canvas_nodes` |
| Reveal | `focus_topview_canvas_nodes` |

---

## 9. Anti-patterns

- Placing every node at `(0,0)` or copying one fixed coordinate for a whole batch when orderly layout was requested
- Ignoring existing nodes from state when computing `x/y`
- Reusing a row table remembered from an earlier turn instead of rebuilding it from a fresh
  `get_topview_canvas_state` ([§4.3](#43-never-place-from-memory))
- Starting a new row for a kind that already has one, because the earlier wave scrolled out of context
- Putting two different kinds on one row because both were "the leftovers" of a late wave
- Stepping row `y` by a fixed pitch (`0, 700, 1400`) instead of `previousRowBottom + BATCH_ROW_GAP`;
  a character row is 107px taller than the rest and will eat the step ([§2](#2-spacing-constants))
- Parallel creates/submits that share a target, read peer outputs from the same wave, or need previous returned height / eject strip / scene stack (violate Safe Parallel Policy)
- Sending `layout` together with `nodeId` / `parentId` / `sceneNodeId`
- Using `arrange` `align_*` to fix a stacked column or row — it collapses the selection onto one edge instead ([§7](#7-repair-existing-overlap))
- Moving a group child and leaving the group frame at its old size ([node-groups.md](node-groups.md))
- Using preview / download URLs as geometry inputs
- Putting layout-only logic into generic `topview_generate_*` tools (Canvas MCP only)
- Claiming BFF auto-avoidance when `layout` is omitted
