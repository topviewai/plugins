# Recipe: Scene Surrogate

Prefer the native scene tools in `$operate-topview-canvas` (`create_topview_canvas_scene_node` for persistence; paid storyboard / Scene video via unified `submit_topview_canvas_generation_task`) when a persisted `story_scene` node is appropriate. Follow that skill’s Create / generation contract; do not restate it here.

Use this Group + Text + media pattern only when the native scene tools are unavailable, or the user only wants Group organization without a `story_scene` node. Compose with the generic Group pattern in `$operate-topview-canvas` → [`references/node-groups.md`](../../../operate-topview-canvas/references/node-groups.md) (with [`node-layout.md`](../../../operate-topview-canvas/references/node-layout.md)).

## Structure (Group application)

- One Group node per Scene (title = Scene label).
- One Text node for the Scene contract (beats, dialogue, planned refs, duration).
- Generation/result media nodes parented or arranged under the group after success.

## Contract fields (Text body)

Record at least:

- `scene_id`, duration target, narrative beats
- `reference_node_ids` — human-readable plan only
- `video_task_ids` / `result_node_ids` — filled after real submits
- speaker / dialogue lines when applicable

## Critical semantics

1. `reference_node_ids` are **not** generation inputs.
2. Before submit, compile a Reference Resolution Table into typed `inputs[]`.
3. Scene count and video task count are tracked separately.
4. After success, attach the real result node into the Scene group and write real `nodeId` / `taskId` / status back into the Text contract.
5. Only success nodes with durable `mediaRef` may enter Timeline.
