# Install TopviewAI in Cursor

Cursor installs the Topview plugin from a real local directory. Its Canvas
right-editor integration is a separately packaged
`topview.topview-canvas-side-panel` VSIX from the matching GitHub Release.

1. Download or clone this repository to a temporary directory. Do not use a
   symlink for the final plugin directory.
2. Copy only `plugins/topview/` into `~/.cursor/plugins/local/topview/`, keeping
   any existing installation as a dated backup.
3. Download the approved Cursor release metadata at `https://raw.githubusercontent.com/topviewai/plugins/main/releases/cursor/latest.json`. Read
   `downloadUrl`, `sha256`, and `sizeBytes`, then download that VSIX to a
   temporary directory. Require an exact byte-count and SHA-256 match.
4. Install the verified side-panel extension through Cursor itself:

   ```bash
   cursor --install-extension /path/to/topview-canvas-side-panel.vsix --force
   cursor --list-extensions --show-versions
   ```

5. Confirm the list contains `topview.topview-canvas-side-panel` at the same
   version as `~/.cursor/plugins/local/topview/.cursor-plugin/plugin.json`.
6. Save work, fully quit Cursor, reopen it, start a new Agent session, complete
   OAuth if requested, then open a Canvas and choose **Open in side panel**.

Never manually delete `~/.cursor/extensions/topview.topview-canvas-side-panel-*`,
edit `extensions.json`, or clear Cursor global caches. The Canvas opens in the
right editor group, not the left Activity Bar sidebar.
