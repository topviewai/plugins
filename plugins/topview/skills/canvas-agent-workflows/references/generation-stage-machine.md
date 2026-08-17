# Generation Stage Machine

## Plan Ledger (compact)

Freeze one ledger after the first capabilities summary. Update rows as stages advance — do not invent batch fields or blanket same-target parallel writes.

| Field | Meaning |
| --- | --- |
| `capabilityVersion` | From capabilities; resubmit if expired |
| `model` / `taskType` | Locked from live capability |
| required params | From `requiredParameters` / `defaults` / `parameterEnums` (schema only if needed) |
| `inputRoles` | Role + cardinality from summary (schema `inputs[]` only if summary lacks it) |
| `nodeId` / `mentionToken` | Identity from create/submit/details (`shortCode` for prompt mentions) |
| `taskId` | From successful submit |
| `status` | `planned` → `submitted` → `running` → `success` \| `fail` |
| `deps` | Upstream stage keys that must be `success` first |

Ledger rows are one stage each — no multi-write batch fields. Same-target / dependency-unsafe creates, paid submits, and refreshes stay serial (`parallelSameCanvasWrites=false`).

## Safe Parallel Policy

Prefer parallel tools in the **same Agent turn** only when **all** hold; always **wait-all** before the next turn:

1. Same DAG layer; do not read peer outputs (`nodeId` / `taskId` / `mediaRef` / `shortCode`) from this wave.
2. Distinct targets / `parentId` / `sceneNodeId` / tasks — never same-target concurrent writes.
3. Distinct `commandId` per paid intent; params frozen from capabilities; no paid probing.
4. Geometry preplanned from one state snapshot with non-overlapping explicit coords for top-level creates/submits; if next placement needs previous returned height / eject strip / scene stack → serial.
5. Wait-all wave results before the next turn (no revision cursor / `max(revision)` chaining).
6. Projection/mention dependents wait for `consistencyStatus=projected`.

Prefer parallel: independent reads; preplanned Asset/Scene creates; independent submits with `layout`/`parentId`; independent slim refreshes (`omit`/`include=[]`). Must serial: Asset→Scene, storyboard→video, same-node mutations, same asset-slot submit, geometry-dependent placements, `commandId` retries.

After submits return, background generation jobs may run concurrently on the server. Do **not** send `expectedRevision` or invent a revision cursor.

Also allowed alongside Canvas work when they do not mutate Canvas: local FFmpeg, pure content drafting, GetMcpTools already cached for the session.

## Per-stage lifecycle

```text
planned → submitted → running → success|fail
```

Transitions:

1. **planned** — ledger row has model/taskType/required params/deps; no paid node yet or draft only.
2. **submitted** — V2 submit returned `nodeId` + `taskId` + `commandId` (optional observational `revision`).
3. **running** — refresh shows non-terminal status; slim refresh by default.
4. **success** — refresh success with durable `mediaRef` **and** the Layout Gate below has passed; dependents may consume `nodeId` / mention tokens.
5. **fail** — terminal failure; follow recovery / `failed` reporting.

## Layout Gate

A task can produce durable media and still wreck the board: a generation node resizes when its media
lands, and neither the group frame nor its siblings move to accommodate it. Media state and geometry
state are two separate completion conditions.

Run this the **first** time a node with a parent reaches `success`, and after any write that changes
a child's geometry. Scope it to the **one affected parent** — do not sweep the canvas:

```text
normalize_topview_canvas_layout { parentId: <the parent that changed> }
→ clean=true            → gate passed, nothing was written
→ moved / frameResized  → gate passed, the report says what it fixed
```

The tool detects sibling overlap and children outside the frame, separates them, refits the group
frame, and returns the report. It writes nothing when the frame is already correct, so the gate costs
one call whether or not anything was wrong. Pass `dryRun: true` first when you want to show the user
the damage before repairing it.

Details and the manual fallback live in `$operate-topview-canvas` — `references/node-layout.md` §7
and §4.4, and `references/node-groups.md`. Do **not** reach for `arrange`: its `align_*` modes stack
nodes on top of each other rather than separating them.

Top-level nodes without a parent are already covered by the row table and need no gate.

A gate that reports `frameResized` grew the frame — a render wider or taller than the column it was
built for — and the server then shifted the neighbouring band outside the frame to keep that space
legal. So a gate can move nodes the stage does not own. Treat any coordinate you were holding as
stale once a gate has run, and re-read state before planning the next placement.

A stage whose Layout Gate has not passed is not `success`, so a dependent stage must not start on
it. If the geometry cannot be repaired, report `partial` rather than continuing the DAG.

## Auto-continue DAG

After success:

0. Pass the Layout Gate for the affected parent (skip for parentless top-level nodes).
1. Validate expected references actually landed (`nodeId` / `shortCode` / `mediaRef` / asset binding as required).
2. Compile the next stage’s Reference Resolution Table from real `nodeId`s (and mention tokens for prompts).
3. Submit the next stage without asking the user to continue — no Canvas revision cursor; re-fetch projected state only for geometry/identity.
4. Stop the DAG on `partial` / `failed` boundaries from [orchestration-runtime.md](orchestration-runtime.md).

## Recoverable errors

| Error | Action |
| --- | --- |
| `CAPABILITY_VERSION_EXPIRED` | Re-fetch capabilities; re-validate ledger; resubmit |
| `PARAMETER_VALIDATION_FAILED` | Fix `fieldErrors` from defaults/enums/schema; do not paid-probe |
| Ambiguous submit | Same intent/params/`commandId` (no `expectedRevision`) |
| `pending_projection` | Wait; do not duplicate create; do not invent shortCode |
| Refresh timeout | Keep polling the same task; do not resubmit |

## Non-silent failures

Return `partial` or `failed` (never fake complete) when:

- required input is not durable;
- model/capability missing;
- rich workflow only has text-to-video;
- frame-aligned edit lacks `reference_video`;
- task terminal fail;
- audio projection/refresh unusable for a required voice stage;
- local upload failed;
- product/character/environment identity media missing.

## Idempotency checklist before any retry

1. Does state/ledger already show the node/task for this `commandId`?
2. If yes and running → refresh only.
3. If yes and success → continue DAG; do not resubmit.
4. If confirmed absent after conflict → new `commandId`.
5. If uncertain → reuse `commandId`.
