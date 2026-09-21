# Local Media Bridge

Local FFmpeg outputs, downloads, and task-dir files are **not** durable Canvas inputs until they have been uploaded and turned into a Canvas media node.

This is the canonical bridge contract for every Canvas-owned generation or media create that starts from a local file. Multi-stage workflows may add extract/slice steps first; the upload path below still applies.

## Required path

```text
task-specific local file
→ prepare_topview_canvas_media_upload(canvasId, fileName, fileSize)
    → HTTP PUT to uploadUrl with requiredHeaders
    → require a 2xx response; on failure, prepare again before retrying
→ create_topview_canvas_media_node(mediaType, url=objectKey, mimeType)
→ V2 input.source.kind = canvas_node, nodeId
```

`prepare_topview_canvas_media_upload` is Canvas App-owned (like other Canvas writes, do not send `expectedRevision`). It accepts direct JPG/JPEG/PNG (≤50 MB), MP4/MOV/WebM (≤300 MB), and MP3/WAV/M4A (≤100 MB). It returns `uploadUrl`, durable `objectKey`, `mediaType`, exact `mimeType`, and `requiredHeaders`.

Use the response `objectKey` only after the PUT succeeds. Store it through the media node; never store or submit the short-lived `uploadUrl`. The returned `nodeId` can be attached to an Asset with the existing parent tool and used by Canvas Timeline according to its image/video/audio node support.

For non-Canvas Topview workflows, keep using the separate `ta_upload_*` flow. Canvas must not use `ta_upload_*` or `upload_file`.

## Hard bans

- Local filesystem paths in submit `inputs` or media creates.
- Temporary signed download URLs as if they were durable sources.
- Creating a media node or submitting a paid task when the PUT did not return HTTP 2xx.
- Using `upload_file` in Canvas generation inputs; legacy requests are rejected before card reservation or paid submission.
- Sending WebP, HEIC, GIF, or unsupported extensions to this bridge. Do not add Agent-side transcoding in this flow.

## When to bridge

- Frame extracts / video segments / voice clips produced by local FFmpeg (same bridge required).
- User files available only on the current host machine.
- Remote research media that must be imported before generation (after durable fetch).

Prefer Canvas-native durable nodes when the media already exists on the authorized Canvas.

## Failure handling

Prepare or PUT failure → do not create the dependent node or submit the paid stage. Report `partial` with the failing file role and nextAction to retry the Canvas prepare → PUT sequence.
