---
name: canvas-agent-workflows
description: Orchestrate end-to-end Topview Canvas creation while preserving the user's original deliverable and choosing the correct production workflow. Use for image, video, music, whiteboard, 3D world, or 3D director-stage creation; storyboarding, remakes, edits, replication, product/social videos; and story, episode, chapter, screenplay, or short-film adaptations that may require reusable character/environment/object assets and per-scene generation. Never compress narrative source material into a direct single-prompt video unless the user explicitly requests that narrower deliverable.
---

# Canvas Agent Workflows

Achieve a complete Canvas creation goal in one agent task. Business rules live here; atomic MCP writes live in `$operate-topview-canvas`.

### Plugin version / upgrade

When the user asks whether the Topview plugin is up to date, which version is installed, or asks to upgrade/reinstall the plugin, call `topview_check_plugin_update` first. Use its returned `downloadUrl` and host-specific `upgradePrompt` verbatim — never invent a CloudFront URL or substitute a host marketplace command. After a successful upgrade, call `topview_ack_plugin_update` with `action=upgraded`; if the user declines, call it with `action=dismissed`.

## Canvas-first creative gate

Every Topview creation request starts in a real Canvas project. This applies to image, video, music, whiteboard, 3D world (`world_3d`), and 3D director stage (`director_stage`) creation.

1. Resolve the target Canvas, or create one when the user asks for a new project. If no target is known and multiple existing projects plausibly match, let the user choose.
2. Make that Canvas visible **before** any generation submit or creative-surface action. In Codex / Cursor, open it exactly once with `open_topview_canvas` (or the single workspace-specific alternative required by `$operate-topview-canvas`). In Claude hosts, return the official browser link and wait for the user to open it; this is a required host handoff, not a generic stage-advance barrier.
3. Only after the Canvas is visible, create nodes, submit Canvas-owned image/video/music work, or open the whiteboard / 3D surface. Keep the project visible throughout so the user can inspect, select, rearrange, edit, or use **Use in chat** while the Agent continues.
4. If the matching Canvas is already visibly open in the current flow, reuse it and do not create a duplicate UI result.

Never route these requests to standalone `topview_generate_image`, `topview_generate_video`, or `topview_generate_music`. The narrow cross-shot narration exception remains `topview_generate_voice` because Canvas currently has no TTS capability; import its result back into the already-open Canvas.

## Skill boundaries

| Skill | Owns |
| --- | --- |
| `$operate-topview-canvas` | MCP tools, V2 generation contract, paid generation approval mode (`confirm_each_submit` / `autonomous`), observational revision, layout, Group composition, local-media bridge, capability-first + universal duration planning, Timeline, auth |
| `$canvas-agent-workflows` | Workflow routing, orchestration runtime, workflow-specific single-task gates, Scene creative contract, typed references, quality gates, DAG completion |
| `$topview-generate` | Non-Canvas standalone generation — never use its results as Canvas-owned substitutes |
| `$marketing-studio` | Research / marketing data stages that may precede a Canvas workflow |

## Progressive reads

**Mandatory before planning:**

1. [references/workflow-routing.md](references/workflow-routing.md) — lock the Original Goal Contract, then pick exactly one primary workflow.
2. [references/generation-stage-machine.md](references/generation-stage-machine.md) — Plan Ledger, Safe Parallel Policy, recovery (no Canvas revision cursor).
3. The selected file under [references/workflows/](references/workflows/).

**Conditional (read only when the stage needs it):**

- `$operate-topview-canvas` `references/generation-planning.md` + [references/duration-and-task-assembly.md](references/duration-and-task-assembly.md) — before freezing paid task counts / duration splits.
- `$operate-topview-canvas` `references/seedance-2.5.md` — when the selected exact live video model is Seedance 2.5; lock `auto` / `edit` / `extend` intent before prompt authoring or submits.
- [references/reference-resolution.md](references/reference-resolution.md) — before any consistency-critical typed `inputs[]` submit (except `scene_storyboard`, which uses `sceneNodeId`).
- `$operate-topview-canvas` `references/local-media-bridge.md` — when inputs come from local files / FFmpeg artifacts.
- [references/orchestration-runtime.md](references/orchestration-runtime.md) — multi-stage auto-continue / partial-fail boundaries.
- Recipes under [references/recipes/](references/recipes/) — only the ones the current stage needs.

Do **not** copy live capability / MCP JSON schemas into this Skill; call capabilities tools and cache GetMcpTools schemas per `$operate-topview-canvas`.

Also follow `$operate-topview-canvas` for every MCP call shape, observational revision rules, capability summary/`include`, Group composition, and **paid generation approval mode** (ask on first credit-consuming `submit_topview_canvas_generation_task`; then honor `confirm_each_submit` or `autonomous`).

## Routing invariant

Route from the user's original request and supplied source material, not from an Agent-written summary or generation prompt. Preserve requested narrative coverage, continuity, reusable assets, dialogue, and scene structure. Missing production details are unknowns, not permission to shorten an episode, omit story beats, or turn an adaptation into one standalone clip.

Treat character and environment consistency as required for episodes, chapters or scripts being adapted, named or recurring characters across shots, dialogue spanning clips, multiple scenes sharing story-world elements, and any deliverable intended to continue as a series. These signals require a workflow that creates or adopts durable typed assets before dependent scene video generation.

`direct-generation` is an eligibility-gated fast path, never the fallback merely because it uses fewer steps or the requested duration fits one model call. Apply every gate in [references/workflow-routing.md](references/workflow-routing.md). If Direct and a staged workflow remain genuinely ambiguous, resolve that distinction before any paid submit.

## End-to-end loop

```text
lock Original Goal Contract from the unmodified user request
→ resolve/create target Canvas
→ show that Canvas to the user (or complete the Claude browser-open handoff)
→ route workflow without shrinking the contract
→ resolve any production unknown that changes scope, structure, dialogue, or paid task count
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

Do not ask the user to reply `OK`, `continue`, or `继续` just to advance a stage that only needs task completion. Ask a focused question when an unresolved choice would change the primary workflow or materially change narrative coverage, continuity assets, dialogue, duration, or the paid task plan; do not use Direct to avoid that question. Exception: under `$operate-topview-canvas` **paid generation approval mode** `confirm_each_submit`, waiting for approval of a concrete paid-parameter summary is required and allowed. Never treat a draft card as paid generation. Never call `topview_get_generation_config` or generic `topview_generate_*` for Canvas-owned results. There is no multi-write batch API. Prefer safe parallel independent tools in one turn (wait-all); keep same-target / dependency-unsafe writes serial. Do not chain Canvas `expectedRevision`. Background generation jobs may run concurrently after submits return.

## Hard bans

- No global default of three Scenes / three video tasks.
- No creative submit or whiteboard / 3D surface action before the target Canvas is visible.
- No planning task counts before live capabilities.
- No rewriting, summarizing, or abridging source material before routing in order to make it qualify for Direct.
- No treating a request to create an episode, chapter adaptation, screenplay, or multi-scene story as approval for a standalone condensed clip.
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
