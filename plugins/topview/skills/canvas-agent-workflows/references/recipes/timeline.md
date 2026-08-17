# Recipe: Timeline and Export

1. `get_topview_canvas_timeline` → full `draft` + strong `timelineEtag`.
2. Inspect the returned visual and audio clips before writing:
   - Empty draft: continue with append-only assembly.
   - Already exactly matches the requested video node sequence: do not append; continue to export.
   - Any other clip, audio, or order: stop. Ask the user to organize it in the web editor or provide an empty Canvas; this plugin version cannot safely clear or replace it.
3. Ensure every selected video node is persisted with durable media on the authorized Canvas. For generated nodes, refresh until terminal success before assembly.
4. Call `edit_topview_canvas_timeline` with the exact ETag, a stable `commandId`, and only `append_clip` operations in narrative order. Each operation uses a persisted `sourceNodeId`; never send duration or media paths. Split, trim, move, remove, duplicate, detach/reattach, setting changes, and full-draft replacement are unavailable.
5. On `MEDIA_INFO_PENDING`, wait `retryAfterMs`, then retry the identical ETag, commandId, and operations. Pending does not write.
6. On Timeline `REVISION_CONFLICT`, re-read and repeat the empty/exact-match safety check before replaying intent. This is not Canvas node `expectedRevision` CAS.
7. Read back the Timeline and verify the saved video order before export.
8. Call `submit_topview_canvas_timeline_export`, then poll `get_topview_canvas_timeline_export` until `success` or `fail`. Use optional `range {startMs,endMs}` and `hiddenVisualTrackIds[]` only as allowed by the export schema.
9. Report completion only after export success with a usable output artifact. A submitted task is not a finished deliverable.

Minimal generation-to-export assembly:

1. Refresh every selected generation task to terminal success and keep its projected Canvas `nodeId`.
2. Read Timeline, enforce the empty/exact-match safety check, and append those node IDs in narrative order with one stable command only when empty.
3. Read Timeline again and verify clip order/durations from the saved draft before export.
4. Submit export (optionally with an I/O range or full-video hidden tracks), then poll until `success`; a submitted task is not a finished deliverable.
