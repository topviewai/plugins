# Install TopviewAI in Cursor

Read the [shared installation contract](installation-contract.md) first. Run
this process in the local Cursor desktop app. Cursor installs the Topview plugin
from a real local directory. Its Canvas right-editor integration is a separately
packaged `topview.topview-canvas-side-panel` VSIX from the matching GitHub
Release.

## Two-task protocol (mandatory)

A complete quit makes the current Agent task unavailable, and Cursor loads the
local plugin's MCP only after it restarts. Therefore **do not try to start
OAuth, inspect Available Tools, or wait for authorization in the installation
task**. This guide is intentionally repeatable:

- **Task 1 — install:** complete the version-checked plugin and VSIX steps
  below, then stop with the restart handoff.
- **Task 2 — authorize and verify:** after the user fully quits and reopens
  Cursor in the workspace where they will use Topview, paste this same short
  installation prompt again. If Task 1's versions are already installed, skip
  directly to [authorize and verify](#authorize-and-verify-after-restart);
  do not reinstall them.

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

At this point Task 1 is complete. Return exactly this handoff and stop; do not
attempt a Topview tool call in the current task:

```text
ACTION REQUIRED — RESTART CURSOR
Save your work and fully quit Cursor. Reopen the workspace where you will use
TopviewAI, create a new Agent task, and paste the same Cursor installation
prompt again to complete OAuth and verification.
```

## Authorize and verify after restart

1. In the **same Cursor window/workspace** where Topview will be used, open
   Cursor Settings and its MCP/Tools list. Find **TopviewAI** / `topview`.
   Cursor can display the internal identifier `plugin-topview-topview`; that is
   the expected Topview MCP server.
2. Its initial state should be **Needs authentication**. Click
   **Authenticate** in Cursor. This is a user action: the Agent must not merely
   say that it started OAuth. Complete the browser consent flow and return to
   the same Cursor window.

   When an Agent coordinates this step, it must show this handoff immediately
   after it starts the host OAuth flow; it must not silently poll or keep
   retrying while user consent is pending:

   ```text
   ACTION REQUIRED — AUTHORIZE TOPVIEW
   In Cursor Settings > MCP/Tools, open TopviewAI and click Authenticate.
   Complete the approval in the browser that Cursor opens, then return to this
   Cursor window. Do not share credentials or an OAuth code in chat.
   ```

   Cursor's local callback is short-lived. If its MCP status has not changed
   to **Connected** within one callback window (about two minutes), the Agent
   must stop and report **Needs authentication**. It must not loop, reinstall,
   or claim that OAuth was completed. After completing the browser approval,
   paste the same short prompt once more to resume verification if the original
   Agent task has ended.
3. Confirm the MCP status changes to **Connected**. Only then allow the new
   Agent task to use a safe, read-only Topview request such as
   `topview_check_plugin_update`. If Topview does not appear in the new task's
   Available Tools, stop and report the MCP status; do not claim authorization
   or retry installation in a loop.
4. After the read-only request succeeds, open a Canvas and choose **Open in side panel**.
   The Canvas opens in the right editor group, not the left Activity Bar
   sidebar.

## Update or reauthorize

- **Update:** repeat Task 1 with the matching repository files and verified
  VSIX, then perform the restart and Task 2 again. Replacing only
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
