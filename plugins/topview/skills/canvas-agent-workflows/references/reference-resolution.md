# Reference Resolution

Every consistency-critical reference must become a real V2 typed input. Prompt prose alone is not enough, except `scene_storyboard`, whose service derives typed image inputs from the persisted scene record via `sceneNodeId`.

## Reference Resolution Table

Build this table before each paid submit (except `scene_storyboard`, which only needs `sceneNodeId`):

| Semantic ref | MCP source | Recommended selection / role |
| --- | --- | --- |
| Character / Environment / Object / Product Asset | `canvas_node` + Asset `nodeId` | Product: `all_enabled`; Character/Environment: `primary`; trim to capability max. Role from capability |
| Generated keyframe / image node | `canvas_node` + `nodeId` | `reference_image` or start/end frame roles |
| Source / reference video node | `canvas_node` + `nodeId` | `reference_video`. Element Editing uses the real source/segment. Seedance 2.5 Replication uses the original source for segment 1 and each real preceding generated result for a serial extension; legacy Replication final tasks do **not** use the original video. |
| Local extract/clip/audio | prepare → PUT → media `canvas_node` + `nodeId` | matching capability role |
| Just-finished task in this workflow | `task_result` + `taskId` | matching role |
| Bound character voice | `canvas_node` (audio child / bound voice) | `reference_audio` |

Empty Assets without primary/cover media are not visual references.

For every local Canvas file, complete `$operate-topview-canvas` `references/local-media-bridge.md` first. Canvas generation never uses `upload_file` / `fileId`; the durable media node is the single source for generation, Asset attachment, and Timeline use.

**Identity rules:** prefer `canvas_node.nodeId` for all Asset / media inputs. Use `shortCode` / `mentionToken` only inside prompt mentions (`<<@shortCode>>`). The Agent does **not** read or submit `assetId`.

## Pre-submit checks (all required)

1. Every `<<@shortCode>>` in the prompt has a matching `inputs[].mention.shortCode`.
2. Every consistency-critical input has an explicit role sentence in the prompt (Style / Identity / Composition / Product / Voice, as applicable).
3. Source IDs come from create/submit/details responses or current Canvas state — never invented; never require `assetId`.
4. Input count and combinations satisfy capability min/max/constraints.
5. Missing required references → fix refs, pick a compatible capability, or return `partial`. **Never** degrade to `text_to_video` and claim success.
6. Results write back to the **same** generation node; never create a second result media node.
7. Do not write backend wire tokens such as `<<<Image1>>>` in prompts.

## Reference-duty and provenance registry

Every selected reference gets exactly one declared duty. Explicit user mapping wins over approved plan wording, visible content, node title, and node order. Do not allow a target-person image's background, pose, framing, or camera to override a source video when the image owns identity/clothing only.

On the legacy Replication path, keep source-extracted frames and AI-generated keyframes in separate registries:

- Source-extracted frames may be Style / Composition evidence during planning.
- Final legacy Replication video tasks use **AI-generated** keyframes as typed inputs.
- Do not mix undeclared provenance.

Seedance 2.5 Replication does not create this frame registry: the source video directly owns its declared style/motion/structure duties. Element Editing always uses the real source/segment as `reference_video`; shared edited boundary images only control the join and do not change task intent.

## Mention + input example

```json
{
  "prompt": "Animate product <<@prd_1>> using keyframe <<@img_2>> with a slow push-in.",
  "inputs": [
    {
      "role": "reference_image",
      "source": { "kind": "canvas_node", "nodeId": "node_asset_…", "selection": "all_enabled" },
      "mention": { "shortCode": "prd_1" }
    },
    {
      "role": "reference_image",
      "source": { "kind": "canvas_node", "nodeId": "node_gen_…" },
      "mention": { "shortCode": "img_2" }
    }
  ]
}
```

Exact `role` / `selection` fields must match the live capability schema from `$operate-topview-canvas`.

## Persisted scene refs vs submit inputs

For a native persisted scene, `referenceNodeIds` persists the asset relation and `<<@shortCode>>` preserves the role position. A `scene_storyboard` submit carries only `sceneNodeId`; the service verifies the relation, selects durable images, and compiles tokens to ordered image inputs. Ordinary video submits still require caller-owned typed `inputs[]` using `canvas_node.nodeId`; when such a video belongs to a scene, also pass that scene's `sceneNodeId` so the output stacks in the scene's column. That field only anchors placement here — it derives nothing.
