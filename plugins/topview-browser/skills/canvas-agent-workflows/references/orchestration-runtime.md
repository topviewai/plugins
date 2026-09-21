# Orchestration Runtime

Complete a Canvas creation goal in one agent task with Agent-managed waits. The business DAG stays; stages advance after real task terminals, not after user wake-ups.

## Loop

```text
capabilities → (projected state once if geometry needed) → V2 submit wave (Safe Parallel Policy)
        → wait-all → slim refresh* (independent tasks OK when safe)
        → next DAG layer (projection barrier when needed)
```

`$operate-topview-canvas` owns the MCP call shapes. This file owns orchestration semantics. Use only Topview MCP tools from that skill for Canvas reads, writes, generation, and Timeline.

## Must do

1. Stay in the same agent task until `complete`, `partial`, or `failed`.
2. After every paid submit, poll `refresh_topview_canvas_generation_task` with the same `nodeId` + `taskId` until `success` or `fail`.
3. Treat response `revision` as **observational only**. Do **not** send `expectedRevision`, chain revisions, take `max(revision)` after a wave, or call `get_topview_canvas_state` solely for a write cursor. Call projected `get_state` when geometry/identity must be recomputed. Do **not** claim `sinceRevision` or request `fields=["revision"]`.
4. Treat user phrases like “generate / make / remake / edit this video” as authorization for the **first required generation DAG** of that goal. That authorizes paid **intent**, not the **paid generation approval mode**. Before the first credit-consuming `submit_topview_canvas_generation_task` in this task, still complete the `$operate-topview-canvas` approval-mode ask (`confirm_each_submit` vs `autonomous`), and under `confirm_each_submit` also obtain approval of the concrete paid-parameter summary.
5. Draft-only requests stop at `create_topview_canvas_generation_card` and never submit.
6. Honor `consistencyStatus`: on `pending_projection`, wait; never invent shortCodes or repeat the write. Projection/mention dependents are a serial barrier until `projected`.
7. Follow **Safe Parallel Policy**: prefer parallel independent creates/submits/refreshes in one turn when the condition matrix holds (distinct targets/`commandId`, preplanned non-overlapping geometry, same DAG layer, no peer-output reads); always wait-all before the next turn. Same-target writes, Asset→Scene, storyboard→video, geometry-dependent placements, and `commandId` retries stay serial. Default refresh is slim (omit `include` or `include=[]`; diagnostics only `include=["state"]`). Prefer top-level submit `layout:{x,y,…}` when not using `nodeId`/`parentId`/`sceneNodeId`. Non-mutating work may run alongside (local FFmpeg, content planning, cached GetMcpTools).

## Must not do

- Ask the user to reply `OK`, `continue`, `继续`, or `start generation` to advance a stage that only needs task completion. Clarify only when creative intent is ambiguous. **Exception:** when paid generation approval mode is `confirm_each_submit`, waiting for explicit approval of a **concrete paid-parameter summary** for that submit/wave is required and allowed — that is parameter approval, not a continue barrier.
- Tell the user that generation “will not wake the Agent” or that they must come back to continue the DAG.
- Call non-MCP Canvas Agent internals; stay on `$operate-topview-canvas` / Topview MCP tools.
- Run preview → user approve → real submit rounds. Auto-check quality gates instead. Readiness → (approval-mode gate) → real `submit_topview_canvas_generation_task`.
- Re-submit a still-running task because refresh is slow.
- Start the next dependent paid stage before the upstream stage is terminal success with durable media.
- Same-target / dependency-unsafe parallel writes. Do not invent a Canvas revision cursor or `expectedRevision` chain.
- Paid-submit before the task's paid generation approval mode is set, or bypass `confirm_each_submit` parameter approval via quality-gate auto-continue.

## Stage ledger (in-task)

Maintain a ledger for the current agent task (memory is enough; do not invent a Canvas singleton):

```json
{
  "canvasId": "...",
  "workflow": "video-replication",
  "capabilityVersion": "sha256:...",
  "stages": {
    "anchor-keyframe": {
      "taskType": "text_to_image",
      "model": "...",
      "commandId": "...",
      "nodeId": "...",
      "taskId": "...",
      "status": "success",
      "expectedReferences": ["style-frames"]
    }
  }
}
```

Update `capabilityVersion` after capability recovery. Do not track a write `revision` cursor.

## Quality gates without user approval

Replace “wait for user accept” of **media/quality outcomes** with automatic checks. Do **not** use this section to skip `$operate-topview-canvas` **paid generation approval mode** (`confirm_each_submit` still requires parameter approval before each listed paid submit/wave).

| Gate | Plugin behavior |
| --- | --- |
| Preview / visual accept | Read success mediaRef; run style/identity checks from details/download when required |
| After generation cards | Refresh to terminal; then plan next stage |
| Voice ready | Confirm durable audio exists and passes duration rules; then bind/register |
| Script / plan lock | Keep the locked plan in the ledger; only re-ask when intent is ambiguous or conflicting |

Still ask the user when product intent is ambiguous (for example replicate vs edit, light vs high conflict, missing owned assets). That is clarification, not a continue barrier. Under `autonomous`, after the mode is chosen, do not re-ask for per-submit parameters; under `confirm_each_submit`, always present the paid-parameter summary before submit.

## Paid retry authorization

- Capability expiry / ambiguous submit → idempotent recovery; not a new creative retry.
- Same uncertain intent → reuse `commandId`; confirmed no card → new `commandId`. Do not recover via Canvas `expectedRevision`.
- Terminal model fail → do not auto-open a new paid draw unless the original request authorized multi-candidate or auto-retry.
- Do not spend more credits because a result “feels” weak.
