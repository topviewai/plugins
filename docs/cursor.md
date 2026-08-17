# Install TopviewAI in Cursor

Read the [shared installation contract](installation-contract.md) first. Run
this process in the local Cursor desktop app. Cursor installs the Topview plugin
from a real local directory. Its Canvas right-editor integration is a separately
packaged `topview.topview-canvas-side-panel` VSIX from the matching GitHub
Release.

## Install the matching plugin and extension

1. Clone the approved repository to a temporary directory. During the private
   pilot, use the local authenticated git/GitHub credential; do not download an
   HTML error page or substitute another repository:

   ```bash
   git clone --depth 1 --branch main https://github.com/topviewai/plugins.git /path/to/topviewai-plugins
   ```

   Inspect `plugins/topview/.cursor-plugin/plugin.json` and record its version.
   Do not use a symlink for the final plugin directory.
2. Copy only `plugins/topview/` into `~/.cursor/plugins/local/topview/`, keeping
   any existing installation as a dated backup.
3. Download the approved Cursor release metadata at `https://raw.githubusercontent.com/topviewai/plugins/main/releases/cursor/latest.json`. Read
   `downloadUrl`, `sha256`, and `sizeBytes`, then download that VSIX to a
   temporary directory. Require an exact byte-count and SHA-256 match before
   installing it. The artifact version must equal the local plugin version.
4. Install the verified side-panel extension through Cursor itself:

   ```bash
   cursor --install-extension /path/to/topview-canvas-side-panel.vsix --force
   cursor --list-extensions --show-versions
   ```

5. Confirm the list contains `topview.topview-canvas-side-panel` at the same
   version as `~/.cursor/plugins/local/topview/.cursor-plugin/plugin.json`.
6. Save work, fully quit Cursor, reopen it, and start a new Agent session. Make
   one safe, read-only Topview request. If Cursor asks to authenticate the
   Topview MCP, choose its OAuth action, complete the browser flow, then retry
   the same request. Do not count an unanswered authentication prompt as a
   successful install.
7. After the request succeeds, open a Canvas and choose **Open in side panel**.
   The Canvas opens in the right editor group, not the left Activity Bar
   sidebar.

Never manually delete `~/.cursor/extensions/topview.topview-canvas-side-panel-*`,
edit `extensions.json`, or clear Cursor global caches. If the extension or
OAuth prompt is absent after a full restart, stop and report the exact verified
artifact version and the host-visible failure.
