# Recipe: Asset and Product

## When

Short Film characters/environments/objects, Ecommerce products, or any stage that needs reusable identity media.

## Rules

1. Create or update Assets via `$operate-topview-canvas` (`create_topview_canvas_asset_node` / `update_topview_canvas_asset_node`). Prefer safe-parallel creates when coords are preplanned; stay serial when the next placement needs a previous returned height.
2. Visual Assets must have real primary/cover media before they are used as submit inputs.
   Generate that media **into the card**: `submit_topview_canvas_generation_task` with `parentId = <asset nodeId>` and no `nodeId`/`layout` (Tier C in `$operate-topview-canvas`). Distinct assets may submit in parallel under Safe Parallel Policy; the same asset slot stays serial. The card shows the generating overlay from submit time and the result lands in the card. Use `parameters.aspectRatio = "16:9"` to fill the card slot. After success only set `primaryReferenceIds` / `coverReferenceId`; do not call `set_topview_canvas_node_parent`.
3. Default selection: Product `all_enabled`; Character/Environment `primary`; then trim to live capability max.
4. Submit with `source.kind = canvas_node` and the Asset `nodeId` (plus capability role) — do not rely on Scene text mentions alone, and do not require `assetId`.
5. Style briefs (Short Film) are text only. Do not default style-brief images as downstream visual inputs; never use `<<@style_x>>` as a required visual ref.
6. Adopt user-origin images when present instead of regenerating identity from scratch.
7. Wait for `consistencyStatus=projected` when the next stage needs the new shortCode.

## Ecommerce specifics

- Prefer Product Asset for the selling SKU.
- Every product-appearing keyframe and video stage must also carry the **original product image** as a typed input, not only “keep packaging consistent” prose.
