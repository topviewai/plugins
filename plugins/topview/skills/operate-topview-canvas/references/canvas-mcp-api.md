# Topview Canvas MCP 接口参数文档（Skill 优化用）

> 版本基准：2026-08-07 去掉外部 Agent Canvas revision CAS；回包 revision 仅观测；state filters 真实投影  
> 权威实现：`topview-mcp-gateway`（工具 schema）+ `topview-canvas`（BFF / Worker 执行）  
> 用途：供 Topview Plugin Skill / Agent 编排生成与画布操作；**以 text 回包可闭环为准**，`structuredContent` 作补充
> 不在范围：`topview_prepare_canvas_jump`（创意内置跳转，不属于 Canvas MCP 工具集）  
> Maintained in sync with `docs/TOPVIEW_CANVAS_MCP_API.md` in the plugin repository.

---

## 1. 调用方式总览

```text
Agent / Topview Plugin
    │  MCP tools/call
    ▼
topview-mcp-gateway（鉴权、schema、别名、转发）
    │  HTTP internal
    ▼
topview-canvas apps BFF（项目 / 生成 / timeline）
    │  Worker MCP
    ▼
packages/server Canvas Worker DO（节点读写、revision CAS）
```

### 1.1 调用原则（Skill 必守）

1. **Revision 仅观测**：成功回包可带 `revision`，**仅供观测**。Agent **不要**在 mutation / submit / refresh 上传 `expectedRevision`，不要做 revision 链式游标，不要在并行波次后取 `max(revision)` 作为下次写入依据，不要为拿 revision 去 `get_topview_canvas_state`，不要请求 `fields=["revision"]`（`revision` 始终在 state 根上返回，**不是**可过滤字段）。**不要**声称存在 `sinceRevision`。**不要**教 Agent 用 Canvas `REVISION_CONFLICT` + 刷新 `expectedRevision` 做恢复（Timeline ETag 冲突见 §5，另论）。
2. **Safe Parallel Policy（安全并行）**：同一 Agent turn 内可并行，但必须 **wait-all** 后再进入下一 turn。仅当下列条件**全部**成立时优先并行：同 DAG 层且不读本波 peer 产出（`nodeId`/`taskId`/`mediaRef`/`shortCode`）；目标 / `parentId` / `sceneNodeId` / task **互不重叠**（禁止同目标并发写）；每个付费意图 **distinct `commandId`**，参数已从 capabilities 冻结，禁止付费探测；顶层 create/submit 的几何已从**一次** state 快照预排且显式坐标不重叠——若下一落点依赖上一张返回高度 / eject 带 / Scene 堆叠则改串行；wait-all 后进入下一 turn；依赖 mention/投影的步骤等待 `consistencyStatus=projected`。优先并行：独立读、预排 Asset/Scene create、带 `layout`/`parentId` 的独立 submit、独立 refresh。必须串行：Asset→Scene、storyboard→video、同节点 mutation、同一资产槽 submit、几何依赖落点、`commandId` 重试。同目标 / 依赖不安全写保持禁止并行（`parallelSameCanvasWrites=false`）。后台生成任务在 submit 返回后可并发。
3. **生成三步流**：`capabilities`（先 summary，含 `inputRoles`）→ `submit`（可安全并行波次）→ 循环 `refresh`（默认 slim；独立任务可安全并行）；不要跳过 capabilities。
4. **优先读 text**：优化后成功/失败关键字段已写入 `content[0].text`；同时有 `structuredContent` 时也可读。
5. **不要为生成结果再建第二节点**：submit 成功后结果写在同一 generation 节点；用 refresh 取 `mediaRef`。
6. **Agent 身份字段**：create/submit/details 暴露 `nodeId` 以及可选 `shortCode` / `mentionToken` / `consistencyStatus`。Typed inputs 优先 `canvas_node.nodeId`；`shortCode`/`mentionToken` 仅用于 prompt mention。Agent **不**依赖 `assetId`。Gateway 仍可暴露 wire-level deprecated `canvas_asset`，但 **Agent 禁止使用**；资产一律 `canvas_node.nodeId`。

### 1.2 响应信封

```json
{
  "content": [{ "type": "text", "text": "..." }],
  "structuredContent": { },
  "isError": false
}
```

| 情况 | `isError` | text 形态 | structuredContent |
| --- | --- | --- | --- |
| 成功 | 缺省 / false | 人读摘要，含 `canvasId` / `revision` / `nodeId` / `taskId` 等键值 | 与 text 同语义字段 |
| 业务失败 | **true**（HTTP 常仍为 200） | `errorCode=… message=… canvasId=… currentRevision=… retryable=… nextAction=…` | 同字段 |
| 传输/鉴权失败 | JSON-RPC / HTTP 错误 | 依客户端 | 可能无 |

**公共错误字段**：`errorCode`、`message`、`currentRevision`、`retryable`、`nextAction`（以及可选 `status`）。

### 1.3 Canvas revision（Agent 侧）

外部 Agent **不再**使用 Canvas `expectedRevision` CAS。回包 `revision` / 错误里的 `currentRevision` 若出现，视为观测字段，不要据此维护写入游标。布局过期时重读投影 state 并重算坐标；付费意图用 `commandId` 幂等规则（见 §6.1）。**Timeline** 仍用 `expectedTimelineEtag`，ETag 冲突见 §5。

### 1.4 工具名别名

Gateway 对多数画布工具接受 `_test` 中间段别名，例如：

- `open_topview_canvas_test` → `open_topview_canvas`
- `create_topview_canvas_test_generation_card` → `create_topview_canvas_generation_card`

项目生命周期工具（`list/create/get/update/delete_topview_canvas*`）**无** `_test` 别名。Skill 应使用规范名。
`create_topview_canvas_scene_node`、`update_topview_canvas_scene_node`、`normalize_topview_canvas_layout` 也只提供规范名，不接受合成的 `_test` 别名。

### 1.5 公共 ID 约束

| 字段 | 约束 |
| --- | --- |
| `canvasId` | `^[\w.:@-]{1,128}$` |
| `nodeId` / `nodeIds[]` | `^node_[A-Za-z0-9_-]{1,128}$` |
| 坐标 `x`/`y` | number |
| 尺寸 `width`/`height` | number，20…5000 |

---

## 2. 工具清单（42）

### A. 项目生命周期（5）

| 工具 | 作用 | 必填 | 可选 |
| --- | --- | --- | --- |
| `list_topview_canvases` | 列出可访问画布 | — | `limit` 1…50，默认 20 |
| `create_topview_canvas` | 创建画布 | `name` 1…200 | — |
| `get_topview_canvas_metadata` | 读元数据（不加载节点） | `canvasId` | — |
| `update_topview_canvas_metadata` | 重命名 | `canvasId`, `name` | — |
| `delete_topview_canvas` | 删除 | `canvasId`, `confirmCanvasId`（必须与 canvasId 完全一致） | — |

**成功 text 要点**：含 `canvasId` / `name` / 列表条数等；`structuredContent` 可含 `canvases[]`、`total`、`revision`。

### B. 打开 / 读取 / UI（9）

| 工具 | 作用 | 必填 | 可选 |
| --- | --- | --- | --- |
| `open_topview_canvas` | 打开 MCP App 画布 | `canvasId` | — |
| `get_topview_canvas_web_link` | 取画布的**公开网页链接**（仅在用户明确要求可在浏览器打开的链接时调用） | `canvasId` | — |
| `get_topview_canvas_state` | 读投影后的节点摘要；根上带观测 `revision` | `canvasId` | `fields`、`nodeIds`、`types`（真实裁剪；**无** `sinceRevision` / `fields=["revision"]`） |
| `get_topview_canvas_node_details` | 类型化详情（≤50） | `canvasId`, `nodeIds` | — |
| `get_topview_canvas_timeline` | 读 Timeline 整稿 + ETag | `canvasId` | `ifNoneMatch`（原样强 ETag；未变化返回 `notModified=true`，省略稿件和媒体 URL） |
| `get_topview_canvas_timeline_export` | 轮询导出任务 | `canvasId`, `taskId` | — |
| `focus_topview_canvas_nodes` | 视口聚焦（不改持久化） | `canvasId`, `nodeIds` | — |
| `download_topview_canvas_nodes` | 短时下载工件 | `canvasId`, `nodeIds` | — |
| `open_topview_canvas_workspace` | 打开 Canvas 工作区 | `canvasId`, `workspace`=`canvas` | Timeline UI 在当前插件版本暂时隐藏 |

#### `get_topview_canvas_state` 输入过滤（Skill 优先）

`fields` / `nodeIds` / `types` **会真实投影/裁剪**回包（不是装饰性提示）。

| 可选字段 | 说明 |
| --- | --- |
| `fields` | 投影。枚举：`nodes.basic`、`nodes.geometry`、`nodes.identity`、`nodes.generation`、`nodes.hierarchy`。**不含** `revision` / `environment`（部署环境标记不是 Agent 投影字段；勿请求 `fields=["environment"]`），也**不含**画布地址（需要公开链接请调 `get_topview_canvas_web_link`） |
| `nodeIds` | 只返回这些节点 |
| `types` | 按节点类型过滤 |

根信封始终保留 `canvasId` + **观测用** `revision`。**不要**传或依赖 `sinceRevision`。**不要**请求 `fields=["revision"]`。

#### `get_topview_canvas_state` 输出（Skill 最常用）

- text：`revision=N`（观测）+ 按投影裁剪的节点摘要（`nodeCount` / `nodes=[…]` 等）
- structuredContent：`canvasId`, `revision`（观测）, 以及投影后的字段（如 `nodes[]`）

#### `get_topview_canvas_node_details` 输出

- text：含 `type`、`shortCode`、`taskId`、`generationStatus`、**`mediaRef=<objectKey 或对象摘要>`**、`title` 等
- structuredContent：`nodeDetails[]`；媒体节点 `data.mediaRef` 为对象（见 §4）

#### `download_topview_canvas_nodes` 输出

- text：`artifacts=[nodeId fileName=… url=…]`
- structuredContent：`downloadArtifacts[]`：`nodeId`, `type`, `url`, `fileName`, `expiresAt?`
- 这里的 `url` 是 Agent 工具契约里的短时工件地址。Canvas MCP App 会按同一套标准能力分支处理：宿主声明 `downloadFile` 时调用 `ui/download-file` 并传 `resource_link`，成功后报告 `saved`；只有 `openLinks` 时调用 `ui/open-link` 并报告 `delegated`，不把浏览器接管误报为已观测磁盘写入；两者都没有时明确返回 unsupported。下载流程不使用 `ui/message`。Codex 与 Cursor 共用这套桥接实现。

### C. 本地媒体上传（1）

`prepare_topview_canvas_media_upload` 是 Canvas App 专用写权限工具：输入 `canvasId`、`fileName`、`fileSize`（节点写工具同样不传 `expectedRevision`）。当前仅直接接受 JPG/JPEG/PNG（≤50 MB）、MP4/MOV/WebM（≤300 MB）、MP3/WAV/M4A（≤100 MB）。

返回 `uploadUrl`、持久 `objectKey`、`mediaType`、准确 `mimeType` 与 `requiredHeaders`，响应禁止缓存。Agent 必须使用 `requiredHeaders` PUT 到 `uploadUrl` 并确认 HTTP 2xx，随后调用 `create_topview_canvas_media_node`，传入 `url=objectKey`、`mediaType`、`mimeType`，再以返回 `nodeId` 作为 `source.kind="canvas_node"`。PUT 失败时不得建节点或提交任务；重新重试必须重新 prepare。不得保存/提交签名 `uploadUrl`。WebP、HEIC、GIF 等不在此契约内，Agent 不做转码。

### D. 创建节点（7）

均需：`canvasId` + 下表字段。**不要**传 `expectedRevision`。

| 工具 | 必填 | 主要可选 | 备注 |
| --- | --- | --- | --- |
| `create_topview_canvas_text_node` | `title`, `content`, `x`, `y` | `width/height`, 字体/颜色相关 | `title` 仅元数据；可见正文是非空 `content`，且 ≤4000。Agent 安全样式：`backgroundColor="#1A1A1A"`、`backgroundOpacity=1`、`color="#FFFFFF"` |
| `create_topview_canvas_media_node` | `mediaType` image\|video\|audio, `url`, `x`, `y` | `mimeType`（须与 mediaType 匹配）、`title`, poster/thumbnail 等 | 本地文件先走 prepare → PUT；只持久化 durable S3 key / URL；禁止给生成结果再建第二节点 |
| `create_topview_canvas_generation_card` | `mediaType` image\|video, `prompt`, `x`, `y` | `model`, `aspectRatio`, `resolution`, `duration`, `nativeAudio`… | **只建 draft，不付费提交** |
| `create_topview_canvas_scene_node` | `commandId`, `sceneNumber`, `sceneSummary`, `sceneText`, `x`, `y` | `duration`, `aspectRatio`, `width/height` | 持久化 `story_scene` + backend scene；**不提交任何生成任务**；素材引用写在 `sceneText` 的 `<<@shortCode>>`；改内容用 `update_topview_canvas_scene_node`，别新建 |
| `create_topview_canvas_file_node` | `fileName`, `fileType`, `x`, `y` | `url`, `fileSize` | 引用既有 URL/S3 |
| `create_topview_canvas_asset_node` | `assetKind`, `title`, `x`, `y` | `description`, `mentionName`, `width` | assetKind: style\|character\|object\|environment\|custom\|product；**不接受 `height`**，见下 |
| `create_topview_canvas_group_node` | `label`, `x`, `y` | `padding`, 颜色 | 空组；已有节点用 `group_topview_canvas_nodes` |

成功 text 通常含新建 `node_…` 与 `revision`。

#### `create_topview_canvas_asset_node` 专用约定：尺寸由服务端决定

- schema 里**没有 `height`**。资产卡的渲染高度由内容和调用方看不到的 CSS 决定，且随
  `assetKind` 变化（character 卡多一个音色槽，比 object 卡高），所以由服务端算出后落库并回传。
- `width` 可选。不传取服务端缺省；传了会被 clamp 到合法区间，实际生效值同样从回包读。
- **不要假设任何尺寸，也不要把在别的卡上看到的高度套用过来。** 若下一张落点依赖上一张返回高度，
  必须串行：从上一次回包取真实 `w`/`h` 再算坐标。若已从一次 state 快照预排互不重叠坐标，
  可按 Safe Parallel Policy 并行 create，wait-all 后再进入下一 turn。
- `transform_topview_canvas_nodes` 同样不接受资产卡高度：服务端会重算，算不准时沿用节点
  已有高度。别指望用 transform 去修一个猜错的高度。

#### `create_topview_canvas_scene_node` 专用约定

- `commandId`：1…256；每张新 SceneCard 使用新值。仅 timeout、`retryable=true` 或结果不确定时，用同一业务输入和同一 `commandId` 重试。
- `sceneNumber` 为正整数；`sceneSummary` 1…512；`sceneText` 1…8000。
- `duration` 为 4…15 的整数；`aspectRatio` 为 `21:9|16:9|4:3|1:1|3:4|9:16`。
- 字段瘦身：`commandId` / `sceneNumber` / `sceneSummary` / `sceneText` / 可选 `referenceNodeIds`（≤32）/ `duration` / `aspectRatio` / layout（`x`/`y`，可选 `width`/`height`）。**禁止**传 `environmentText`、`plotText`、`storyboardPrompt`、`videoPrompt`。
- 素材位置写在 `sceneText` 的 `<<@shortCode>>`；`referenceNodeIds` 声明完整资产关系。服务端保留已有 token、仅在唯一精确 title/mention 命中处注入 token，或追加显式 `[References]` 并返回 warning。对应资产须已 projected（有可用 `shortCode`），禁止臆造 shortCode。

#### `update_topview_canvas_scene_node`

改已有 SceneCard 的内容，**同时**更新后端 scene 记录和画布卡片，不涉及 `commandId`，不付费。

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `nodeId` | 是 | 目标 `story_scene` 节点 |
| `sceneSummary` | 否 | 1…512 |
| `sceneText` | 否 | 1…8000；落到卡片的 `actionText` |
| `environmentText` | 否 | 0…8000，允许清空 |
| `duration` | 否 | 4…15 整数 |
| `aspectRatio` | 否 | `21:9\|16:9\|4:3\|1:1\|3:4\|9:16` |
| `videoPrompt` | 否 | 0…8000，允许清空 |

至少要传一个内容字段。返回 `status=updated`、`nodeId`、`sceneId`、`revision`、`updatedFields`。

要点：

- **先写后端再写画布**。后端 scene 记录是分镜生成推导 prompt 的依据，所以两者只能落一个时保住它。若后端成功而画布写失败，返回 `SCENE_NODE_WRITE_FAILED` 且 `retryable=true`——后端是幂等 PUT，原样重试即可对齐。
- `sceneNumber`、`referenceNodeIds`、`commandId` 传进来会被**拒绝**而不是静默丢弃：它们端到端 create-only，要改只能新建卡片。
- 目标不是 `story_scene` 时返回 `NOT_A_SCENE_NODE`，且不会碰后端。
- 只改 `sceneSummary` 时不产生画布写入，`revision` 不变。
- 未传尺寸时按网页 SceneCard 规则计算，布局预估使用约 `480×350`；几何依赖堆叠时下一张卡使用成功回包的实际 geometry。
- 成功 text/structuredContent 同时返回 `status=created|recovered`、`canvasId`、`revision`、`commandId`、`nodeId`、`sceneId`、最终 `sceneText`、`referenceBindings` 和 `warnings`。`REFERENCE_MEDIA_PENDING` 允许草稿创建，但付费分镜前必须补齐 durable image。
- 多卡：坐标已从一次快照预排且不重叠时可安全并行（wait-all）；否则串行并按回包 geometry 排布。布局过期时重读投影 state 并重算坐标——不要用 `expectedRevision` 恢复。
- 调用到此结束：不触发 storyboard/image/video submit，不产生付费生成调用。

### D. 即时生成（3）— Skill 核心

| 步骤 | 工具 | 说明 |
| --- | --- | --- |
| 1 | `get_topview_canvas_generation_capabilities` | 先用 `taskType`/`taskTypes`/`models` + `include=[]` 拿 summary（`capabilityVersion`、`requiredParameters`/`defaults`/`parameterEnums`/`inputRoles`）；仅当 summary 不足时再 `include=["schema"]`；storyboard 条目带 `generationKind=scene_storyboard` |
| 2 | `submit_topview_canvas_generation_task` | 全部付费生成（含 Scene 分镜 IMAGE 与 Scene 出视频）；可省略 `nodeId` 由服务端建 placeholder；资产卡生图加 `parentId` 直接挂进卡内 |
| 3 | `refresh_topview_canvas_generation_task` | 轮询；成功带回 `mediaRef` |

详见 **§3**。

### E. 更新 / 变换 / 时间线（16）

| 工具 | 必填额外字段 | 备注 |
| --- | --- | --- |
| `open_topview_canvas_node_tool` | `nodeId`, `tool` | UI；`mode` open\|highlight |
| `update_topview_canvas_node` | `nodeId`, `patch` | 不改 geometry；可写 generationStatus/taskId 等 |
| `update_topview_canvas_asset_node` | `nodeId`, `patch` | 资产卡字段 |
| `set_topview_canvas_node_parent` | `nodeId`, `parentId` (nodeId\|null), `x`, `y` | 相对父级坐标 |
| `set_topview_canvas_nodes_state` | `nodeIds` | `hidden` 和/或 `locked` 至少一个 |
| `edit_topview_canvas_timeline` | `expectedTimelineEtag`, `commandId`, `operations[]` | 当前插件仅允许 1…50 个 `append_clip`，按数组顺序原子追加以供视频导出 |
| `submit_topview_canvas_timeline_export` | `exportType` full_video\|all_segments, `removeWatermark` | 可选 `range {startMs,endMs}`；`hiddenVisualTrackIds[]` 仅 full_video；随后 poll export get |
| `move_topview_canvas_node` | `nodeId`, `x`, `y` | |
| `transform_topview_canvas_nodes` | `transforms[]` 1…50 | 每项 `nodeId` + 可选几何；资产卡的 `height` 由服务端重算，见 §C |
| `duplicate_topview_canvas_nodes` | `nodeIds` 1…20 | 可选 `offsetX/Y` |
| `arrange_topview_canvas_nodes` | `nodeIds` 2…50, `mode` | align_* / distribute_* |
| `set_topview_canvas_node_layer` | `nodeId`, `action` | forward\|backward\|front\|back |
| `group_topview_canvas_nodes` | `nodeIds` 2…50 | 可选 `label`, `padding` |
| `ungroup_topview_canvas_nodes` | `groupIds` 1…20 | |
| `normalize_topview_canvas_layout` | 均可选：`parentId`, `mode`, `dryRun` | 修重叠 + 重算组框；见下 |
| `delete_topview_canvas_nodes` | `nodeIds` 1…50 | 删到 `story_scene` 时连带回收后端 scene 记录，见下 |

#### `normalize_topview_canvas_layout`

一次调用完成「读几何 → 判重叠 / 越界 → 分开 → 重算组框 → 回报」，是唯一会**重算 Group 尺寸**的工具。

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `parentId` | 省略 | 省略 = 处理顶层节点；传 nodeId = 处理该父级的直接子节点 |
| `mode` | `repair` | `repair` 只在真的重叠 / 子节点越出组框时才写入，保留每个节点的 `x`，只把碰撞的往下推；`reflow` 整块重排（父级内按 SceneCard → storyboard → video 单列，顶层按类型分行、所有 group 归一条带按 authored x 排序），会丢弃手工摆位 |
| `dryRun` | `false` | 只回报告不写入，报告内容与真实执行完全一致 |

返回的 `structuredContent.layoutReport`：`scope` / `mode` / `dryRun` / `inspectedNodeIds` / `overlaps[]` / `outOfFrameNodeIds[]` / `moved[]`（含 from→to）/ `frameResized`（组框 before→after）/ `clean`。

要点：

- **隐藏节点不参与**。用 `set_topview_canvas_nodes_state` 藏起来的废弃卡片不会把干净的画布判成需要修复，也不会在重排里占位。
- 组框重算时**包含**隐藏成员，避免它重新显示时落在框外。
- 让位给 group 时留 **150px**（组 padding + 悬浮标题），普通卡片之间留 32px。
- **组框被撑大时会自动在框外腾地方**：哪条边向外扩了，就把该边外侧那一带节点整体平移同样距离（被带动的节点若又挡住别人，后者一起同距平移），行列关系保持不变；扩进空白区则一个节点都不动。这一步在写入时执行，`dryRun` 的报告里不包含它，且 `moved[]` 只覆盖本次 scope 内的节点——框外被平移的邻居需要重新读状态才能看到。
- 干净的空间**零写入**、revision 不变，所以每波生成后都调一次成本很低。
- 作用域是一个层级，不扫全画布——每次生成后整块重排会让画布在用户眼皮底下跳。

#### `delete_topview_canvas_nodes` 的 scene 清理

删除列表里若有 `story_scene` 节点，服务端在删掉画布节点后会回收对应的后端 scene 记录（软删 + 资产索引清理），并在 `structuredContent.sceneCleanup` 返回 `cleanedNodeIds` / `failedNodeIds`。

- **先删画布节点再回收记录**。清理失败只会留下一条孤儿记录（就是加这段逻辑之前的行为），而反过来会留下一张看得见、却被所有 scene 相关调用拒绝的卡片。
- 因此清理失败**不算删除失败**：返回不是 error，只在 text 末尾追加一条 warning 并点名孤儿节点。删除本身已经生效，重试只会打到不存在的节点。
- 删 group 不会删掉它的子节点（子节点会被提到顶层），所以只有显式列出的 id 会被清理。

---

## 3. 生成三步流（详细）

### 3.0 付费生成审批模式（Agent 行为门禁，无 MCP 新参数）

当前 Agent task / 对话内，**第一次**调用会消耗 credit 的 `submit_topview_canvas_generation_task` 之前（capabilities 已锁定且首笔 submit 计划已就绪），必须询问用户选择 **paid generation approval mode**：

必须使用宿主的原生 **Ask Question** 单选交互（或等价单选界面），提供且只提供两个互斥选项；不要让用户输入模式 id，也不要在选项标签中展示 `confirm_each_submit` 或 `autonomous`。根据用户语言显示选项，并在收到选择后映射回内部模式 id：

| 用户语言 | 问题 | 选项标签 | 内部模式 id | 说明 |
| --- | --- | --- | --- | --- |
| 中文 | 请选择付费生成的审批方式 | 逐步请求审批 | `confirm_each_submit` | 每次付费生成前展示本次参数，等待你的确认。 |
| 中文 | 请选择付费生成的审批方式 | 自动推进完成 | `autonomous` | 本任务内按计划自动提交后续付费生成，无需逐次确认。 |
| English | Choose how paid generations should be approved | Request approval step by step | `confirm_each_submit` | Review and approve the parameters before each paid generation. |
| English | Choose how paid generations should be approved | Automatically proceed to completion | `autonomous` | Automatically submit later paid generations in this task without asking each time. |

| 模式 id | 行为 |
| --- | --- |
| `confirm_each_submit` | 每一次付费 submit（或同一波列出的多笔）前展示具体参数摘要，获对该列表的明确批准后再调用工具 |
| `autonomous` | 选定后本 task 内后续付费提交由 Agent 自决参数，不再逐次询问 |

未选定模式前禁止付费 submit。草稿卡 / SceneCard / `get_state` / `refresh` / 非 Canvas `topview_generate_*` 不触发。这是付费参数审批澄清，不是用 `OK`/`continue`/`继续` 推进「只等任务完成」的阶段屏障，也不是 preview→approve→real submit。`autonomous` 仍要求用户已明确要求生成。新 task 重置模式。选择不明确时，重新弹出 Ask Question 单选框；不要猜测内部模式。

```text
get_topview_canvas_generation_capabilities(canvasId, taskType?/taskTypes?/models?, include=[])
        │  → capabilityVersion = sha256:<64hex>
        │  → summary：requiredParameters / defaults / parameterEnums / inputRoles
        │  → 仅当 summary 不足时再 include=["schema"]
        ▼
get_topview_canvas_state(fields/nodeIds/types…)  → 预排几何（revision 仅观测）
        │  # 仅需布局/确认节点时；过滤器真实裁剪；无 sinceRevision
        ▼
paid generation approval mode gate
        │  # 本 task 首笔付费前询问 confirm_each_submit vs autonomous
        │  # confirm_each_submit → 展示参数摘要并等待批准该 submit/wave
        ▼
safe parallel wave（Safe Parallel Policy）或串行：
  submit_topview_canvas_generation_task(... layout? ...)  # 勿传 expectedRevision
        │  → nodeId, taskId, commandId, status（+ 观测 revision）
        │  → 可选 shortCode / mentionToken / consistencyStatus
        ▼
wait-all → 下一 turn / 依赖阶段（投影屏障）
        ▼
loop（独立 task 可安全并行 refresh；默认 slim：omit 或 include=[]）:
  refresh_topview_canvas_generation_task(nodeId, taskId)  # 勿传 expectedRevision
        │  # 诊断才 include=["state"]
        │  → status=running|success|fail；success 含 mediaRef（revision 观测）
        │  → slim 仍可含 shortCode / mentionToken / consistencyStatus
        └── until success | fail
```

### 3.1 `get_topview_canvas_generation_capabilities`

**输入**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `canvasId` | string | 是 | |
| `mediaType` | string | 否 | 如 `image` / `video` / `audio`，过滤列表 |
| `taskType` / `taskTypes` | string / string[] | 否 | 按任务类型过滤 |
| `models` | string[] | 否 | 按模型过滤 |
| `include` | string[] | 否 | `[]` = summary（含 `inputRoles`）；`["schema"]` = 含完整 `parametersSchema`/inputs/constraints；**省略 = 全量（兼容旧客户端）**；勿默认每次都拉 schema |
| `refresh` | boolean | 否 | true 时强制刷新配置缓存 |

**输出（text 已含关键信息）**

- `capabilityVersion=sha256:…`
- summary：`capabilities=[mediaType/taskType/model required=… defaults=… enums=… inputRoles=…]`
- `include=["schema"]` 或省略 `include` 时另含完整 `parametersSchema` / inputs / constraints

**structuredContent（概念）**

```ts
{
  canvasId: string;
  capabilityVersion: string; // sha256: + 64 hex
  capabilities: Array<{
    mediaType: 'image' | 'video' | 'audio';
    taskType: string;          // snake_case，见下表
    model: string;
    displayName?: string;
    requiredParameters?: string[];
    defaults?: Record<string, unknown>;
    parameterEnums?: Record<string, unknown[]>;
    inputRoles?: Array<{ role: string; mediaKinds?: string[]; min: number; max: number }>; // summary
    inputs?: Array<{ role: string; mediaKinds: string[]; min: number; max: number }>; // schema/全量
    parametersSchema?: object;  // JSON Schema；additionalProperties: false（schema/全量模式）
    constraints?: Array<{ type: string; roles?: string[]; message?: string }>;
    generationKind?: 'scene_storyboard'; // storyboard_to_video 条目携带；无 submissionTool 分叉
  }>;
}
```

> Skill：**原样回传** `capabilityVersion`；`model` / `taskType` / `parameters` 键与枚举必须来自选中 capability，禁止臆造。优先 `include=[]` 冻结计划（从 `inputRoles` 取 role/cardinality）；仅在 summary 不足（如需 `parametersSchema` / `additionalProperties` / constraints）时再拉 schema。
> 全部付费提交走统一的 `submit_topview_canvas_generation_task`；无 `submissionTool` / `sceneGenerationKind` 分叉。Scene 分镜 capability 以 `generationKind=scene_storyboard` 标识。

### 3.2 `submit_topview_canvas_generation_task`

Gateway schema 为 **oneOf** 两套：

#### V2（推荐，Skill 只用这套）

**普通 V2 公共必填**：`canvasId`, `mediaType`, `prompt`（**不要** `expectedRevision`）。`scene_storyboard` 改为必填 `sceneNodeId`，禁止 caller `prompt` 和非空 `inputs`。

**V2 必填**：`capabilityVersion`, `taskType`, `model`, `commandId`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `generationKind` | string | 可选；Scene 分镜提交时传 `scene_storyboard`（须与 capability 一致：`mediaType=image` + `taskType=storyboard_to_video`） |
| `model` | string | 须来自选中 capability；用户未指定时使用服务端标记为 `preferred` 的兼容 capability，禁止在 Skill 内固化模型名 |
| `sceneNodeId` | string | `scene_storyboard` 必填；必须是持久化 `story_scene`，服务端从其快照派生 prompt 与图片 inputs。`mediaType=video` 时可选：传了就把产物锚到该 Scene 的列（prompt / inputs 仍由 caller 提供）。其余情况传了会被拒 |
| `nodeId` | string | 可选；**省略则服务端创建 placeholder**（推荐） |
| `parentId` | string | 可选；资产卡 nodeId。提交时即把 image placeholder 挂进该卡 16:9 槽，见下方「挂进资产卡」 |
| `layout` | object | 可选；顶层 Tier A 优先 `layout: { x, y, width?, height? }`。**Forbidden** with `nodeId` / `parentId` / `sceneNodeId`。省略保持 `(0,0)` 兼容；**no BFF auto-avoidance**。Asset Tier C / Scene 列布局仍由服务端决定 |
| `parameters` | object | 键值须符合选中 capability；优先 summary defaults/enums，必要时再对 `parametersSchema` |
| `inputs` | array | typed inputs，见 §3.4；role/cardinality 来自 summary `inputRoles`；上限约 32（BFF）/ 50（gateway schema） |
| `aspectRatio` / `resolution` / `quality` / `duration` / `sound` / … | 扁平字段 | 遗留兼容；V2 优先放进 `parameters` |

**挂进资产卡（`parentId`）**

给资产卡（character / environment / object / product / style）生图时，传 `parentId = 资产卡 nodeId` 并**省略 `nodeId`**。服务端会在卡内 `{ x: 12, y: 80 }` 直接建 image 子节点，卡片立刻显示 generating 蒙层，与 web 端 `submitImageIntoContainer` 同一语义。

- 仅 `mediaType: "image"`；video / audio 传 `parentId` 会报 `INVALID_PARENT`。
- 与 `nodeId` 互斥；同传报 `INVALID_PARENT`。
- `parentId` 必须指向 `type=asset` 的节点；指向 group / image / scene 等会被 Worker 拒绝（`parentId must reference an asset node.`）。
- 槽位是 16:9：`parameters.aspectRatio` 建议传 `"16:9"`。卡内媒体按 `object-fit: contain` 渲染，3:4 / 9:16 等比例不会被裁切，但会留大片空边。
- 单内容槽语义：卡内已有 image 子节点会被 eject 到画布顶层保留（**不删除**），落点在**卡片正下方** `y = 卡片 bottom + gap`，多张则从卡片左边缘起向右排开。后续布局要把这片区域算进占用，别再往那儿放新节点。
- 任务 success 后结果写回同一子节点，**不要**再调 `set_topview_canvas_node_parent`；只需 `update_topview_canvas_asset_node` 设 `primaryReferenceIds` / `coverReferenceId`。

🚫 禁止对资产卡生图沿用「顶层 placeholder → 等 success → `set_topview_canvas_node_parent` 搬进卡」的旧路径：卡片在整个生成期间是空的，且多出一次可失败的写操作。

**关于 `resolution` / `duration`（2026-08-04 修复后）**

- capabilities 里视频分辨率可能是 **number 枚举**（如 `480`）或 string（如 `"1K"`）。
- Skill 应按 schema 传：数字就传 number，字符串就传 string。
- 服务端建卡路径会将 number coerce 为 string；视频 `resolution` 提交给后端时会去掉尾缀 `p`（`"480p"` → `"480"`）。
- Gateway 顶层 `resolution` 属性类型仍为 string；**V2 请放在 `parameters.resolution`**。

**关于 Seedance 2.5 的任务模式**

- 只有选中 capability 的 `parameterEnums` 或 `parametersSchema` 明确暴露 `omniReferenceTaskType` 时，才把它放进 `parameters`；常见语义为 `auto`（普通生成/全能参考）、`edit`（原视频内修改）和 `extend`（生成独立续写片段）。
- `edit` / `extend` 必须同时提供真实 `reference_video`。视频仅作为风格、运动、镜头、节奏或结构参考时仍是 `auto`，不能仅凭存在视频输入推断成编辑。
- 分段的视频元素替换每段都保持 `edit`；只有新制作视频的后续串行续写段使用 `extend`。
- capability 未暴露该字段时必须省略；`additionalProperties: false` 会拒绝未知键。禁止用付费 submit 探测字段支持，也禁止把前后端内部的自适应比例或 `duration=-1` 实现值写进 Agent 参数。
- 输入参考时长与输出生成时长是不同限制。完整规则见 `$operate-topview-canvas` `references/seedance-2.5.md`，实时 capability/constraints 优先。

#### Legacy（临时兼容，Skill 勿用）

必填：`nodeId`, `toolType`；且 `capabilityVersion` / `taskType` / `inputs` 为 null。可带 `sourceNodeIds`。

#### submit 成功 text 示例

```text
status=init nodeId=node_gen_… taskId=… revision=143 commandId=… capabilityVersion=sha256:… submissionId=…
```

| structuredContent 字段 | 说明 |
| --- | --- |
| `status` | init / queuing / running / … |
| `nodeId` / `taskId` / `commandId` | 后续 refresh 用 |
| `revision` | 观测字段；不要链式传回下次写 |
| `shortCode` / `mentionToken` | 可选；仅用于 prompt mention |
| `capabilityVersion` | 回显 |
| `submissionId` | 幂等/对账 |
| `consistencyStatus` | `projected` \| `pending_projection` \| `committed`（资产投影） |

> Agent 身份以 `nodeId`（+ 可选 `shortCode`/`mentionToken`/`consistencyStatus`）为准；**无** Agent-facing `assetId`。

#### 常见错误

| errorCode | 含义 | Skill 动作 |
| --- | --- | --- |
| `CAPABILITY_VERSION_EXPIRED` | 能力快照过期 | 重拉 capabilities，用新 version 重提 |
| `PARAMETER_VALIDATION_FAILED` | 参数/枚举不合规 | 读 `fieldErrors[]`，按 `requiredParameters`/`defaults`/`parameterEnums`（或 schema）修正；禁止付费试错 |
| 参数 / role 校验失败 | 未满足 constraints | 按 capabilities 的 inputs/constraints 补齐 |

#### Scene 分镜 / Scene 出视频（统一走本工具）

- **分镜 IMAGE**：`mediaType=image` + `taskType=storyboard_to_video` + `generationKind=scene_storyboard` + `sceneNodeId`；禁止 caller `prompt`、非空 `inputs` 和 `parentId`。服务端验证 Scene 资产关系与 durable image，按 Scene token 首次出现顺序编译 `<<<ImageN>>>` 和 typed inputs。parameters 以该 capability 的 `parametersSchema` 为准。产物为 IMAGE / 后端 `storyboardToVideo`。
- **Scene 出视频**：普通 video submit（`video_edit` / `image_to_video` 等），**没有** `scene_video` 专用 `generationKind`。要让产物落进该 Scene 的列，就在 submit 里带上 `sceneNodeId`；prompt 和 inputs 照常由 caller 提供。省略 `sceneNodeId` 则是一张不归属任何 Scene 的普通视频卡。
- “基于分镜生成视频”：先分镜 submit → refresh 成功 → 再以 storyboard IMAGE 为 `start_frame` 走 `image_to_video`，同样带上原 Scene 的 `sceneNodeId`。
- **Scene 产物不要自己算坐标**：带了 `sceneNodeId` 就由服务端把卡片压在该 Scene 已有产物下方、与 Scene 同列。分镜图与视频共用这一列，按创建顺序往下堆。

### 3.3 `refresh_topview_canvas_generation_task`

**输入**

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `canvasId` | 是 | |
| `nodeId` | 是 | submit 返回 |
| `taskId` | 是 | submit 返回 |
| `commandId` | 否 | 幂等 |
| `include` | 否 | **默认 slim**（omit 或 `include=[]`）：正常轮询用 slim；仍返回该节点 `shortCode`/`mentionToken`/`consistencyStatus`（若有）。仅诊断时 `include=["state"]`（带回完整 worker state）。**不要**传 `expectedRevision` |

**成功 text 示例**

```text
status=running nodeId=… taskId=… revision=119 updated=false
status=success nodeId=… taskId=… revision=… updated=true mediaRef=analyzed_video/task/.../x.mp4
```

失败终态会带 `errorMessage`（text + structuredContent）。

**`updated`**：本次 refresh 是否写了节点；节点已与后端一致时可为 `false`（仍返回当前 status）。

独立 `nodeId`/`taskId` 的 refresh 可在 Safe Parallel Policy 下同 turn 并行（wait-all）；同目标或不安全依赖仍串行。

### 3.4 Typed `inputs`

Agent 默认用 **`canvas_node` + `nodeId`** 引用资产卡 / 生成结果 / 媒体节点。`shortCode` 仅出现在 prompt mention；**不要**读取或提交 Agent-facing `assetId`。

Gateway schema 仍暴露 `source.kind=canvas_asset` + `assetId` 作为 **wire-level deprecated compatibility**。**Agent 禁止使用** `canvas_asset` / `assetId`；资产引用一律 `canvas_node` + `nodeId`。

```ts
{
  role: string;  // 来自 summary inputRoles[].role（或 schema inputs[].role）
  source: {
    kind: 'canvas_node' | 'task_result' | 'canvas_asset';
    // 优先 canvas_node；canvas_asset = wire-level deprecated，Agent 禁用
    nodeId?: string;       // canvas_node（Asset / media 节点）
    assetId?: string;      // canvas_asset only（deprecated；Agent 禁用）
    taskId?: string;       // task_result
    selection?: string;    // 可选：primary|cover|all_enabled|reference_ids|bound_voice
    referenceIds?: string[];
  };
  mention?: { shortCode: string };  // prompt 中需出现 <<@shortCode>>
}
```

#### taskType → roles / 约束

| taskType | mediaType | roles | 约束 |
| --- | --- | --- | --- |
| `text_to_image` | image | — | |
| `image_edit` | image | `reference_image` 1…16 | |
| `text_to_video` | video | — | |
| `image_to_video` | video | `start_frame` 1…1，`end_frame` 0…1 | |
| `video_edit` | video | `reference_video` 0…1，`reference_image` 0…16，`reference_audio` 0…16 | **至少** reference_video 或 reference_image 之一 |
| `storyboard_to_video` | image | 由服务端从 Scene token 派生，最多 16 张 | 提交时带 `generationKind=scene_storyboard` + `sceneNodeId` |
| `motion_control` | video | `reference_image` 1…1，`reference_video` 1…1，`reference_audio` 0…16 | 图+驱动视频都必填（独立于 video_edit） |
| `music` | audio | reference_* 各 0…8 | 配乐 / BGM |
| `audio_design` | audio | reference_* 各 0…8 | 独立音效与环境床，不是语音 |
| `voice_design` | audio | — | **音色身份设计，不是 TTS**。必填 `parameters.description` + `parameters.script`，**不接受 `prompt`**，见下 |

> **`voice_design` 的提交形状**：它是唯一不吃 `prompt` 的能力。
>
> - `description`（音色描述）与 `script`（用该音色试读的短样句）都走 `parameters`，都必填、都不能为空白。
> - 长度上限来自模型配置，直接体现在 capability 的 `parametersSchema.maxLength`；提交前读一次能力表，别硬塞长文本。
> - 传了 `prompt` 会被拒。网关 schema 用 `oneOf` 把 voice_design 单列成一个变体，带 `prompt` 会同时命中两个变体从而不合法；BFF 也会再拒一次并指回 `parameters.description`。这是刻意的：`prompt` 是「把旁白脚本塞错地方」唯一的入口。
> - 无 `inputs`。产物是普通 audio 节点。
>
> Canvas 音频能力**只有**上面三种，没有普通 TTS。跨镜头旁白走独立 `topview_generate_voice` 生成后导入 Canvas 音频节点，见 SKILL.md「Audio routing」。

#### taskType → 内部 toolType / 后端定价 key

| MCP `taskType` | 节点 / toolType | 后端 camelCase（定价） |
| --- | --- | --- |
| `text_to_image` | text-to-image | textToImage |
| `image_edit` | image-edit | imageEdit |
| `storyboard_to_video` | storyboard-to-video | storyboardToVideo |
| `text_to_video` | text-to-video | textToVideo |
| `image_to_video` | image-to-video | imageToVideo |
| `video_edit` | video-edit | videoEdit |
| `motion_control` | video-edit | motionControl |
| `music` | text-to-audio | music |
| `voice_design` | voice-design | voiceDesign |
| `audio_design` | audio-design | audioDesign |

> Skill 只传 snake_case `taskType`；后端映射由 Canvas BFF 完成。不要把 `imageToVideo` 当作 MCP `taskType`。

### 3.5 推荐 submit 示例

**image_to_video（图 → 视频）**

```json
{
  "canvasId": "<canvasId>",
  "capabilityVersion": "sha256:…",
  "mediaType": "video",
  "taskType": "image_to_video",
  "model": "seedance-2.0-mini",
  "prompt": "Animate <<@img_1>> with a gentle camera push-in.",
  "parameters": { "resolution": 480, "duration": 5 },
  "inputs": [{
    "role": "start_frame",
    "source": { "kind": "canvas_node", "nodeId": "node_gen_…" },
    "mention": { "shortCode": "img_1" }
  }],
  "commandId": "cmd_i2v_<unique>"
}
```

**video_edit（参考图或参考视频）**

```json
{
  "canvasId": "<canvasId>",
  "capabilityVersion": "sha256:…",
  "mediaType": "video",
  "taskType": "video_edit",
  "model": "seedance-2.0-mini",
  "prompt": "Create a short cinematic video from <<@img_1>>.",
  "parameters": {
    "aspectRatio": "16:9",
    "resolution": 480,
    "duration": 5
  },
  "inputs": [{
    "role": "reference_image",
    "source": { "kind": "canvas_node", "nodeId": "node_gen_…" },
    "mention": { "shortCode": "img_1" }
  }],
  "commandId": "cmd_vedit_<unique>"
}
```

> 两个示例都**故意不写** `nativeAudio`。该参数暴露时必须逐镜判断（画内对白 / 动作声 → 开；静默镜头、旁白或配乐单独成轨 → 关），不要从示例里抄一个固定值。判定规则见 [`generation-planning.md`](generation-planning.md)。

---

## 4. `mediaRef` 对象形状

刷新成功 / 节点详情中的耐久媒体引用：

```ts
{
  storage: 's3';           // 仅 s3
  objectKey: string;       // S3 key；禁止 http(s)/blob/data/绝对路径
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  checksum?: string;
}
```

- text 常打印 `mediaRef=<objectKey>`；structuredContent 为完整对象。
- Skill **不要**把预签名 URL 再塞回创建/生成资源字段；需要展示时用 download 工具拿短时 URL。

---

## 5. Timeline 专用协议

Timeline ETag 是独立于节点 revision 的另一套锁：

1. `get_topview_canvas_timeline` → 得到 `timelineEtag` + `draft`
2. 写入前检查视觉轨和音频轨：空稿才允许 append；若已与目标视频节点及顺序完全一致，禁止重复 append，直接导出；若存在其它 clip、音频或顺序差异，停止写入并让用户去网页版整理，或改用空 Canvas
3. `edit_topview_canvas_timeline` 当前只允许 `append_clip`：`expectedTimelineEtag` + `commandId` + `operations[]`
4. 导出：`submit_topview_canvas_timeline_export` → `get_topview_canvas_timeline_export` 轮询到 `success` 或 `fail`
   - `exportType`: `full_video` \| `all_segments`
   - 可选 `range { startMs, endMs }`：先按 `[startMs,endMs]` 裁剪并平移到 0，再生成导出稿；区间至少 100ms
   - 可选 `hiddenVisualTrackIds[]`：只用于 `full_video`，格式为 `visual-track-1`…`visual-track-50`；`all_segments` 携带该参数会返回 400（网页会静默忽略，这是 MCP 的有意差异）
   - 成功含 `outputUrl` / `fileName` / `status`

### Append-only 合同

顶层 `commandId` 与每条 `operationId` 都匹配 `^[A-Za-z0-9_-]{1,64}$`；同一请求内 `operationId` 唯一。`operations` 为 1…50 条，按数组顺序串行应用；任一条失败则整批不写。每条只能是：

| op | 必填 | 可选 / 约束 |
| --- | --- | --- |
| `append_clip` | `operationId`, `sourceNodeId`, `startMs` | `visualTrackId` 或 `audioTrackId`；不能提交媒体路径或源时长；拒绝任何未知字段 |

当前版本从 Gateway schema 拒绝 split、trim、move、remove、duplicate、detach/reattach、clip/track/project settings 以及整稿替换，不会转发到 Canvas server。成功返回 `operationResults[]`，每项从 `createdClipIds[]` 读取新增 ID，不要自行推导。

只编排具备 durable media 的已持久化视频节点；若节点来自生成任务，先等待 terminal success。视频节点缓存缺可信时长时，Canvas 服务端会按需提交只读 MediaInfoTask：

- `MEDIA_INFO_PENDING`：`retryable=true`，读取 `retryAfterMs` 与 `mediaInfoTaskIds[]`；等待后以**完全相同**的 `expectedTimelineEtag`、`commandId` 和 `operations` 原样重试。pending 不写 Timeline。
- `MEDIA_INFO_UNAVAILABLE`：不可通过 Agent 猜测 duration 绕过；换用可读取的持久媒体节点或修复源文件。
- 探测成功后本次 compiler 直接使用结果；Timeline 保存成功后服务端才 best-effort 条件回填 Node metadata。回填失败不回滚 Timeline。

`expectedTimelineEtag` 必须原样传回 get 结果（含 strong ETag 引号）。遇到 `REVISION_CONFLICT` 后重新 get，并重新执行空稿/完全一致检查，不能直接盲重放 append。

### 常见错误码

| errorCode | 含义 | retryable |
| --- | --- | --- |
| `REVISION_CONFLICT` | ETag 过期（412） | true — 重新 get 并重做安全检查后再决定是否重放 |
| `MEDIA_INFO_PENDING` | 源媒体信息仍在按需探测 | true — 按 `retryAfterMs` 原样重试同一命令 |
| `MEDIA_INFO_UNAVAILABLE` | 源媒体无法取得可信 metadata | false |
| `INVALID_ARGUMENT` | sourceNodeId / 节点缺失等参数问题 | false |
| `MEDIA_FORBIDDEN` / `FORBIDDEN` | 媒体未授权 | false |
| `TASK_NOT_FOUND` | 导出任务不存在或不属于该画布 | false |

错误同样走 `isError` + text/structuredContent 双通道；错误回包应带 `canvasId` 以便 Agent 关联画布。

---

## 6. Skill 编排速查

| 目标 | 推荐工具序列 |
| --- | --- |
| 打开并了解画布 | `open_topview_canvas` → 精简 `get_topview_canvas_state`（`fields`/过滤）→（需要时）`get_topview_canvas_node_details` |
| 创建 SceneCard | layout 预排 → `create_topview_canvas_scene_node`（安全并行或串行）；wait-all；不付费 |
| 修改 SceneCard | `update_topview_canvas_scene_node`（改文案 / 时长 / 画幅）；改 `sceneNumber` 或资产引用才需新建卡 |
| Scene 分镜 | Asset readiness barrier → capabilities(`taskType=storyboard_to_video`, `include=[]`) → submit(`generationKind=scene_storyboard` + `sceneNodeId`) → refresh* |
| Scene 出视频 | capabilities(`video`, summary) → submit(`video_edit` / `image_to_video` + `sceneNodeId` + prompt/`canvas_node` inputs) → refresh* |
| 文生图 | capabilities(`image`, summary) → submit(`text_to_image`) → refresh* |
| 图生图 | capabilities → submit(`image_edit` + `canvas_node` reference_image) → refresh* |
| 文生视频 | capabilities(`video`, summary) → submit(`text_to_video`) → refresh* |
| 图生视频 | capabilities → submit(`image_to_video` + start_frame) → refresh* |
| 视频编辑 | capabilities → submit(`video_edit` + reference_image 或 reference_video) → refresh* |
| 下载结果 | refresh/details 确认 success → `download_topview_canvas_nodes` |
| 布局调整 | 需要几何时 state → move/transform/arrange/group |
| Timeline 视频合并导出 | get timeline → 校验空稿/完全一致 → 空稿时 append-only edit → read-back → submit export → poll 到终态 |

### 6.1 commandId 规则

- V2 submit **必填**，长度 1…256。
- 每次「新意图」用新 id；「不确定是否成功」的重试**复用同一 commandId**。
- 确认建卡失败（未返回 nodeId）后，**换新 commandId** 再提。不要用 Canvas `expectedRevision` 做 CAS。

### 6.2 与网页端并存

- 网页与 MCP **共享同一 DO**；并发编辑时用 Safe Parallel Policy + 投影屏障，需要几何时再拉投影 state。
- MCP 生成的节点会出现在网页上。

---

## 7. 输出字段速查（成功 text 关键词）

| 工具族 | text 中应能读到 |
| --- | --- |
| state | `revision`, `nodeCount`, 各 `nodeId`, `type`, `shortCode`, `generation.status/taskId` |
| node_details | `mediaRef`, `taskId`, `generationStatus`, `shortCode` |
| capabilities | `capabilityVersion`, `mediaType/taskType/model`, `requiredParameters`/`defaults`/`parameterEnums`；schema 模式另含 `params`/`constraints` |
| submit | `status`, `nodeId`, `taskId`, `revision`, `commandId`, `capabilityVersion`, `submissionId`；可选 `shortCode`/`mentionToken`/`consistencyStatus` |
| refresh | `status`, `nodeId`, `taskId`, `revision`, `updated`, `mediaRef` 或 `errorMessage` |
| download | `fileName`, `url`, `nodeId` |
| mutations / creates | `revision`, `affectedNodeIds` / 新建 `nodeId`；可选 `shortCode`/`mentionToken`/`consistencyStatus` |
| SceneCard create | `status`, `revision`, `commandId`, `nodeId`, `sceneId`；可选 `shortCode`/`mentionToken` |
| errors | `errorCode`, `message`, `currentRevision`, `retryable`, `nextAction`；校验失败可含 `fieldErrors` |

---

## 8. 维护说明

- Gateway schema 源：`CanvasMcpTools.java` / `CanvasProjectMcpTools.java` / `CanvasMcpOutputSchemas.java`
- Canvas 执行源：`apps/canvas/src/server/canvasMcp*`、`packages/server/src/mcp/*`
- 契约变更时：同步更新本文 + Plugin Skill 中的调用示例；**以测试环境实测 text 闭环为准**。

相关审计（问题背景，非现行契约）：`topview-marketplace/TOPVIEW_CANVAS_MCP_TOOL_RESPONSE_USABILITY_AUDIT.md`
