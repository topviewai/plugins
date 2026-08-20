# Workflow Routing

Pick exactly one primary workflow that preserves the complete requested deliverable. Prefer the least complex workflow only after all scope, narrative coverage, continuity, and reusable-asset requirements are preserved. Fewer generation steps are not a valid reason to narrow the user's goal.

## Step 0: lock the Original Goal Contract

Before writing a production prompt or selecting a workflow, record these facts from the unmodified request and supplied materials:

- **Deliverable and coverage:** standalone image/clip, teaser, ad, full scene, episode, chapter adaptation, screenplay adaptation, or other requested unit; include story beats the user expects covered.
- **Source form:** an exact generation prompt versus a story, chapter, script, screenplay, brief, reference video, or set of assets that still needs creative adaptation.
- **Structure:** one continuous moment versus multiple scenes, locations, time jumps, dialogue turns, or explicit cuts.
- **Continuity:** named or recurring characters, environments, objects, products, voices, or visual identity that must survive across shots or future episodes.
- **Production constraints:** stated duration, aspect, dialogue/audio, asset reuse, and whether abridgment or a one-clip interpretation was explicitly authorized.

Unknown fields remain unknown. Do not infer permission to omit story beats, collapse a full episode into a teaser, remove dialogue, or replace reusable assets with prompt-only descriptions. A user's source story or approval to "make it" is not approval of an Agent-authored condensed prompt.

Do not summarize, rewrite, or convert source material into a supposedly self-contained prompt before routing. Agent-created prompts are downstream production artifacts and cannot be used as evidence that Direct was eligible.

When the request arrives inside a quick-start label, preset title, or wrapper such as “Clone this video and create a new video with the following content,” route from the substantive user-authored instruction inside it. The wrapper may identify the source but cannot override an inner request such as “replace the person in this video.” Direct source-transformation wording wins over outer clone/remake scaffolding.

## Automatic consistency requirement

Consistency is required when any of these appear in the Original Goal Contract:

- an episode, series, chapter, novel, script, screenplay, or story adaptation;
- named or recurring characters across shots, scenes, dialogue turns, or future installments;
- multiple locations or scenes sharing characters, environments, objects, wardrobe, product identity, or voice;
- a request for reusable character/environment/object assets, storyboards, or continuity.

When consistency is required, choose the matching staged workflow and propagate durable typed inputs. Do not use Direct even if the total requested duration is within one capability maximum.

## Canvas-first gate (before routing)

Resolve or create the target Canvas and make it visible before any creative action. In Codex / Cursor, use the one host UI open action selected by `$operate-topview-canvas`; in Claude, complete the browser-link handoff first. Reuse an already-visible matching Canvas instead of reopening it. This gate covers image, video, music, whiteboard, 3D world, and 3D director-stage creation and keeps the user able to participate directly.

## Decision order

1. **Web research only / research then import** → `web-research` ([workflows/web-research.md](workflows/web-research.md)). If the user also asks to generate after research, finish research/import first, then re-route.
2. **Frame-aligned edit of supplied footage** (keep duration/shots/actions/timing; replace selected elements) → `video-element-editing`. Clear wording such as “replace X in this video with Y” is sufficient; do not require a second sentence explicitly preserving everything else.
3. **New production modeled on one concrete reference video** (remake / replicate / light or high restoration; not frame-aligned) → `video-replication`.
4. **Ambiguous replicate vs edit** → ask the two-way question once, then stop until the user chooses. Do not load either workflow or submit paid tasks before the choice.
5. **Ecommerce / product ad with staged keyframes, product identity references, or a multi-beat product narrative** → `ecommerce-product-video`.
6. **Short film / narrative production / multi-asset story world** → `short-film`. This includes episodes, chapter/novel/script/screenplay adaptations, multiple Scenes, named recurring characters, dialogue across clips, reusable story-world assets, or source material that still needs adaptation and scene breakdown.
7. **Social / UGC / hook-body-CTA vertical video** → `social-media-video` when the user wants the social production structure or derived visual continuity.
8. **Atomic image / video / audio / music request** → `direct-generation` inside the visible Canvas only if every Direct Eligibility Gate below passes.
9. **Whiteboard / 3D world / 3D director-stage creation** → `$operate-topview-canvas` UI-assisted Canvas flow; never substitute a standalone media task. If the current MCP surface cannot create the base surface directly, leave the Canvas visible, ask the user to create/select it there, and resume the workflow from **Use in chat**.
10. Otherwise ask which creative goal to pursue; do not invent a multi-stage DAG.

## Ambiguous replicate vs edit question

```text
Which approach do you want?
1. Edit the original video directly, keeping its duration, shots, and character actions aligned frame by frame while replacing selected elements.
2. Generate a separate same-type video with similar creative concept, content structure, and visual style, without frame-by-frame alignment.
```

Choice 1 → `video-element-editing`. Choice 2 → `video-replication` (then resolve light/high if still unclear).

## Direct Eligibility Gate

Use `direct-generation` only when **all** are true:

- The user's original request is itself an atomic generation instruction, or the user explicitly approved a specific final generation prompt. A source story, chapter, script, screenplay, creative brief, or request to "make the first episode" is not a final generation prompt.
- The requested output is a standalone media result, not coverage of a larger narrative unit and not a foundation for later scenes or episodes.
- No adaptation, story-beat selection, scene breakdown, reusable asset creation, cross-scene identity/voice continuity, replication, frame-aligned edit, staged ecommerce, or structured social production is required.
- The Agent does not need to omit, summarize, or reinterpret requested content to make it fit one prompt. Any narrowing from source material to a teaser, summary, or single clip was explicitly requested or approved by the user.
- Any remaining unknown can use an already-authorized default without changing story scope, scene structure, dialogue, continuity, or the paid task plan.

Duration is task assembly, not evidence for Direct eligibility. After semantic routing, fetch live capabilities. If an otherwise atomic Direct request exceeds capability max, split it per [duration-and-task-assembly.md](duration-and-task-assembly.md); never route narrative source material to Direct merely because a condensed version would fit the max.

## Routing ambiguity and production unknowns

- If the unresolved choice is **standalone clip versus adaptation/episode production**, ask which deliverable the user wants before selecting Direct or submitting paid tasks.
- If the goal is clearly an episode or narrative adaptation but target coverage, duration, dialogue, or compression policy is missing, select `short-film`, then ask only the focused production question needed before freezing paid task counts. Missing specifications never justify Direct.
- If both a rich-workflow signal and a Direct signal appear, the rich-workflow signal wins unless the user explicitly narrows the deliverable to one standalone output and waives the conflicting continuity/adaptation requirement.

## Calibration examples

| Original request | Route | Why |
| --- | --- | --- |
| "Make chapter one of this novel into episode one." | `short-film` | Chapter adaptation and episodic continuity require assets and scene planning; unspecified duration is not permission to create a condensed clip. |
| "Turn this premise into exactly one standalone 10-second teaser, one shot, no reusable assets." | `direct-generation` | The user explicitly narrowed the deliverable and waived staged continuity. |
| "Generate this exact prompt unchanged: a puppy dances in a kitchen for 8 seconds." | `direct-generation` | The original request is already an atomic final prompt. |
| "Create two scenes with the same named heroine and keep her voice consistent." | `short-film` | Cross-scene character and voice consistency are mandatory. |
| "Make a product ad with a hero frame and three derived angles." | `ecommerce-product-video` | Staged product identity and keyframes are part of the requested deliverable. |

## Non-goals for this skill

- Marketing-only research without Canvas creation → `$marketing-studio`.
- Non-Canvas standalone generation → `$topview-generate`.
- Atomic open/move/layout and whiteboard / 3D creative surfaces without a generation DAG → `$operate-topview-canvas`.
