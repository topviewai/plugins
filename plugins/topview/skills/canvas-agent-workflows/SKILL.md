---
name: canvas-agent-workflows
description: Run end-to-end Topview Canvas creation workflows through the unified Topview MCP. Use when a user asks to generate, remake, edit, replicate, storyboard, produce product/social/short-film video, or research then create on Canvas — including multi-stage DAGs that submit generation tasks, refresh to terminal state, and continue without asking the user to reply OK/continue just to wake the next stage.
---

# Canvas Agent Workflows

Achieve a complete Canvas creation goal in one agent task. Business rules live here; atomic MCP writes live in `$operate-topview-canvas`.

### Plugin version / upgrade

When the user asks whether the Topview plugin is up to date, which version is installed, or asks to upgrade/reinstall the plugin, call `topview_check_plugin_update` first. Use its returned `downloadUrl` and host-specific `upgradePrompt` verbatim — never invent a CloudFront URL or substitute a host marketplace command. After a successful upgrade, call `topview_ack_plugin_update` with `action=upgraded`; if the user declines, call it with `action=dismissed`.

## Skill boundaries

| Skill | Owns |
| --- | --- |
| `$operate-topview-canvas` | MCP tools, V2 generation contract, paid generation approval mode (`confirm_each_submit` / `autonomous`), observational revision, layout, Group composition, local-media bridge, capability-first + universal duration planning, Timeline, auth |
| `$canvas-agent-workflows` | Workflow routing, orchestration runtime, workflow-specific single-task gates, Scene creative contract, typed references, quality gates, DAG completion |
| `$topview-generate` | Non-Canvas standalone generation — never use its results as Canvas-owned substitutes |
| `$marketing-studio` | Research / marketing data stages that may precede a Canvas workflow |

## Progressive reads

**Mandatory before planning:**

1. [references/workflow-routing.md](references/workflow-routing.md) — pick exactly one primary workflow.
2. [references/generation-stage-machine.md](references/generation-stage-machine.md) — Plan Ledger, Safe Parallel Policy, recovery (no Canvas revision cursor).
3. The selected file under [references/workflows/](references/workflows/).

**Conditional (read only when the stage needs it):**

- `$operate-topview-canvas` `references/generation-planning.md` + [references/duration-and-task-assembly.md](references/duration-and-task-assembly.md) — before freezing paid task counts / duration splits.
- [references/reference-resolution.md](references/reference-resolution.md) — before any consistency-critical typed `inputs[]` submit (except `scene_storyboard`, which uses `sceneNodeId`).
- `$operate-topview-canvas` `references/local-media-bridge.md` — when inputs come from local files / FFmpeg artifacts.
- [references/orchestration-runtime.md](references/orchestration-runtime.md) — multi-stage auto-continue / partial-fail boundaries.
- Recipes under [references/recipes/](references/recipes/) — only the ones the current stage needs.

Do **not** copy live capability / MCP JSON schemas into this Skill; call capabilities tools and cache GetMcpTools schemas per `$operate-topview-canvas`.

Also follow `$operate-topview-canvas` for every MCP call shape, observational revision rules, capability summary/`include`, Group composition, and **paid generation approval mode** (ask on first credit-consuming `submit_topview_canvas_generation_task`; then honor `confirm_each_submit` or `autonomous`).

## End-to-end loop

```text
route workflow
→ get_topview_canvas_generation_capabilities (taskType(+models), include=[] first)
→ get_topview_canvas_state once if geometry/identity needed (fields/nodeIds/types truly project)
→ freeze Plan Ledger (capabilityVersion, model/taskType, required params,
     inputRoles, nodeId/mentionToken, taskId, status, deps)
→ for each DAG layer under Safe Parallel Policy (wait-all before next turn):
     paid generation approval mode gate (first submit asks; confirm_each_submit → param approval)
     submit_topview_canvas_generation_task (V2; prefer layout on top-level;
       distinct commandId; no expectedRevision)
     refresh* until success|fail (slim omit/include=[]; independent refreshes OK when safe)
     update ledger from response identity fields (no assetId)
→ auto-continue dependent stages (serial across deps; projection barrier)
→ Timeline / export only if the user asked for a final cut
→ report complete | partial | failed
```

Do not ask the user to reply `OK`, `continue`, or `继续` just to advance a stage that only needs task completion; clarify only when creative intent is ambiguous. Exception: under `$operate-topview-canvas` **paid generation approval mode** `confirm_each_submit`, waiting for approval of a concrete paid-parameter summary is required and allowed. Never treat a draft card as paid generation. Never call `topview_get_generation_config` or generic `topview_generate_*` for Canvas-owned results. There is no multi-write batch API. Prefer safe parallel independent tools in one turn (wait-all); keep same-target / dependency-unsafe writes serial. Do not chain Canvas `expectedRevision`. Background generation jobs may run concurrently after submits return.

## Hard bans

- No global default of three Scenes / three video tasks.
- No planning task counts before live capabilities.
- No prompt-only “keep identity” without matching typed inputs when consistency is required.
- No silent downgrade to `text_to_video` when rich references are required.
- No local paths, temp signed URLs, or download URLs as submit sources.
- No second result node for a generation task; results stay on the same generation node.
- No claiming Timeline export complete until export polling succeeds.
- No Agent-facing `assetId` requirement; prefer `canvas_node.nodeId` + mention tokens.

## Completion statuses

- `complete` — required stages succeeded; references, nodes, and any requested Timeline/export verified.
- `partial` — executable stages done, but a capability, durability, upload, audio, or export boundary blocks the rest.
- `failed` — a required upstream task reached terminal fail with no authorized recovery.

## Skill feedback

If this task used Topview MCP tools, immediately before the final user reply follow [`../../references/skill-feedback.md`](../../references/skill-feedback.md) once with `skillName="canvas-agent-workflows"`. Diagnose whether this Skill or its Topview MCP contract should improve using the current task context; this is best-effort guidance, never a blocking Hook.
