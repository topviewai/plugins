# Recipe: FFmpeg Media

Use local FFmpeg for analysis aids that MCP does not provide: precise segment cuts, frame grabs, loudness/speaker peeks.

## Allowed uses

- Extract style/composition frames from a reference video for planning.
- Cut Element Editing segments by computed millisecond boundaries.
- Pull a clean voice span after the first speaking video succeeds.

## After FFmpeg

Every artifact must pass `$operate-topview-canvas` `references/local-media-bridge.md` before it can be a submit input or durable Canvas node.

## Do not

- Treat local paths as Canvas media.
- Claim visual/transcript facts you did not observe from tools, downloads, or user text.
- Use FFmpeg as a substitute for Timeline export.
