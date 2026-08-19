# Install Topview in Cursor

Read the [shared installation contract](installation-contract.md) first. Run
this process in the local Cursor desktop app. Cursor installs the Topview plugin
from a real local directory. Its Canvas right-editor integration is a separately
packaged `topview.topview-canvas-side-panel` VSIX from the matching GitHub
Release.

## One-prompt, one-restart protocol (mandatory)

A complete quit makes the current Agent task unavailable, and Cursor loads the
local plugin's MCP only after it restarts. Therefore **do not try to start
OAuth, inspect Available Tools, or wait for authorization in the installation
task**. The Agent installs the version-checked plugin and VSIX below, then
stops with one restart handoff. After the restart, the user performs one Cursor
OAuth approval and can begin using Topview directly. They do **not** paste the
installation prompt again.

## Install the matching plugin and extension

1. Clone the approved repository to a temporary directory. During the private
   pilot, use the local authenticated git/GitHub credential; do not download an
   HTML error page or substitute another repository:

   ```bash
   git clone --depth 1 --branch main https://github.com/topviewai/plugins /path/to/topviewai-plugins
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

At this point installation is complete. Return exactly this handoff and stop; do not
attempt a Topview tool call in the current task:

```text
ACTION REQUIRED — RESTART CURSOR
Save your work and fully quit Cursor. Reopen the workspace where you will use
Topview. In Cursor Settings > MCP/Tools, authenticate Topview once, then
start your normal Topview task. Do not paste the installation prompt again.
```

## Authorize once after restart — no second installation prompt

1. In the **same Cursor window/workspace** where Topview will be used, open
   Cursor Settings and its MCP/Tools list. Find **Topview** / `topview`.
   Cursor can display the internal identifier `plugin-topview-topview`; that is
   the expected Topview MCP server.
2. Its initial state should be **Needs authentication**. Click
   **Authenticate** in Cursor. This is a user action: the Agent must not merely
   say that it started OAuth. Complete the browser consent flow and return to
   the same Cursor window.

   This is the only post-restart user action. Do not ask an Agent to silently
   poll or retry while consent is pending, and do not share credentials or an
   OAuth code in chat. Cursor's local callback is short-lived: if the status
   remains **Needs authentication**, click **Authenticate** again and complete
   the newly opened browser flow; do not reinstall or clear caches.
3. Confirm the MCP status changes to **Connected**. Only then allow the new
   normal Agent task to use a safe, read-only Topview request such as
   `topview_check_plugin_update`. This is a normal use task, not a second
   installation prompt. If Topview does not appear in Available Tools, report
   the MCP status; do not retry installation in a loop.
4. After the read-only request succeeds, open a Canvas and choose **Open in side panel**.
   The Canvas opens in the right editor group, not the left Activity Bar
   sidebar.

## Update or reauthorize

- **Update:** repeat the installation flow with the matching repository files
  and verified VSIX, then restart and authenticate once. Replacing only
  `~/.cursor/plugins/local/topview/` and force-installing the matching Topview
  VSIX is the supported Topview reset; it does not require clearing Cursor
  caches.
- **Reauthorize:** in Cursor Settings, open the Topview MCP entry and use
  **Disconnect**, **Sign out**, or **Authenticate**, whichever control Cursor
  exposes. Complete the browser flow again in the same Cursor window. The
  browser approval, not a cache deletion, is what changes the OAuth account.
- **Do not broad-clear Cursor data:** never delete `Cache`, `CacheData`,
  `User/globalStorage`, or the whole `~/.cursor/` directory; never edit
  `extensions.json`. Those locations also contain unrelated extension and MCP
  state, and clearing them is neither a reliable reinstall nor a safe
  reauthorization method.

If the verified production plugin still opens an unexpected OAuth site after a
full restart, stop and report the exact plugin version, VSIX version, Cursor
workspace, MCP status, and observed URL. Do not attempt repeated reinstalls or
a global cache wipe; that is a host-registration fault requiring a targeted
support recovery.
