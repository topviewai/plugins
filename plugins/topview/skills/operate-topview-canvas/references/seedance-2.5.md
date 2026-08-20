# Seedance 2.5 Canvas Contract

Use this reference only after a live Canvas capability selects a Seedance 2.5 model. The exact `model`, task type, parameter spelling, enum values, input roles, resolution choices, and duration bounds still come from `get_topview_canvas_generation_capabilities`; this file supplies model semantics, not a substitute schema.

## Resolve model before structure

1. Honor an explicit user model choice when the exact model is available.
2. Otherwise prefer a compatible Seedance 2.5 capability for reference-rich replication and element editing.
3. Resolve the exact live model entry before deciding reference strategy, segment count, resolution, or prompt format.
4. If the model or required input combination is unavailable, choose a compatible live capability only when that does not override an explicit user choice. Otherwise report `partial` and explain the missing capability.

Never copy a model ID, resolution, or price assumption from an example. Resolution follows the selected capability's live enum.

## One structured mode per video task

Seedance 2.5 distinguishes three intents. Keep the mode out of prompt prose and, when the selected capability exposes `omniReferenceTaskType`, pass it under `parameters` with the exact live enum spelling.

| Mode | Use when | Source-video rule |
| --- | --- | --- |
| `auto` | Ordinary generation or a new production that uses video only for style, motion, camera, timing, or structure | A video reference is allowed; its presence alone does not make the task an edit |
| `edit` | Modify selected pixels, subjects, regions, styling, or sound inside existing footage | At least one real `reference_video` is required |
| `extend` | Generate standalone new footage immediately before or after an unchanged source | At least one real `reference_video` is required |

Task intent is immutable across retries and split segments. A split in-place edit remains `edit` on every segment. A serial replication continuation uses `extend` only after the first newly generated segment. Wording such as “next segment” or “continue processing segment 2” is not extension intent when that segment has its own source footage to edit.

If the capability does not advertise `omniReferenceTaskType` in `parameterEnums` or `parametersSchema`, omit it; `additionalProperties: false` means it would be rejected. An ordinary `auto` generation may continue only when the advertised task type and input roles already support its references. An exact Seedance edit or extension must instead use a capability that exposes the required mode, use a compatible legacy workflow with the user's consent when model choice changes, or return `partial`. Never discover support through a paid submit.

Do not send frontend/backend implementation values such as an internal adaptive-ratio sentinel or `duration=-1` unless the live Agent-facing capability explicitly exposes them. Agent submits contain only advertised parameters.

## Input duration and output duration are different budgets

Use live capability and constraint data first. When the selected Seedance 2.5 capability has no conflicting bound, the current compatibility baseline is:

- generated output: integer duration from 4 through 30 seconds;
- a single reference video: about 2 through 30.2 seconds;
- total reference-video budget: about 30.2 seconds.

The extra input margin is not generated output. A source of exactly 30.2 seconds may remain one reference input while producing at most a 30-second result. Do not claim that the final 0.2 seconds were preserved, restored by Timeline trim, or included in an extension.

For `extend`, `parameters.duration` is only the newly generated standalone clip. “Extend by 6 seconds” means duration 6, not source length plus 6. The source supplies the boundary state and audiovisual continuity; it is not replayed inside the new result.

## Prompt compilation

Do not rewrite a user-supplied exact final prompt. For prompts authored by the Agent:

- give every reference exactly one declared duty;
- explicit user mapping outranks approved plan wording, visible content, node title, and node order;
- keep aspect ratio, duration, resolution, and task mode in structured parameters, not prompt sentences;
- use named stages by default; use numeric ranges only when the user supplied timing or precise timing control is necessary;
- write exact spoken dialogue as `{line}`, music instructions as `(music)`, and subtitle text as `【text】`; describe ambience and sound effects in ordinary prose;
- do not add generic quality boilerplate, negative prompts, watermark bans, or subtitle bans that the user did not request.

For `edit`, keep the prompt minimal and scope-closed: name the source as master, list only requested replacements, assign each target image to identity/clothing/style as applicable, ignore target backgrounds and framing, and preserve everything unspecified. Dialogue replacement stays on a separate audio track rather than in the visual-edit prompt.

For `extend`, describe the source boundary state, direction of continuation, new action, and closing state. Keep stable subjects and objects single-instance across the join. Every prompt beat describes only the new clip.
