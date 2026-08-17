# Install TopviewAI in Cursor

Cursor installs the Topview plugin from a real local directory and needs the
bundled `topview.topview-canvas-side-panel` VSIX for Canvas to open in the
right editor group.

1. Download or clone this repository to a temporary directory. Do not use a
   symlink for the final plugin directory.
2. Copy only `plugins/topview/` into `~/.cursor/plugins/local/topview/`, keeping
   any existing installation as a dated backup.
3. Install the bundled side-panel extension through Cursor itself:

   ```bash
   cursor --install-extension "$HOME/.cursor/plugins/local/topview/cursor-extension/topview-canvas-side-panel.vsix" --force
   cursor --list-extensions --show-versions
   ```

4. Confirm the list contains `topview.topview-canvas-side-panel` at the same
   version as `~/.cursor/plugins/local/topview/.cursor-plugin/plugin.json`.
5. Save work, fully quit Cursor, reopen it, start a new Agent session, complete
   OAuth if requested, then open a Canvas and choose **Open in side panel**.

Never manually delete `~/.cursor/extensions/topview.topview-canvas-side-panel-*`,
edit `extensions.json`, or clear Cursor global caches. The Canvas opens in the
right editor group, not the left Activity Bar sidebar.
