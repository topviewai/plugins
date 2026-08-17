# Install TopviewAI in Claude Desktop or Cowork

Read the [shared installation contract](installation-contract.md) first. Use
the local Claude Desktop or Cowork application, not Claude Code or a browser
only session.

1. Download the approved production release metadata at `https://raw.githubusercontent.com/topviewai/plugins/main/releases/claude/latest.json`
   over HTTPS. Read `downloadUrl`, `sha256`, and `sizeBytes` from that same
   response.
2. Download the referenced `.plugin` file to a temporary directory. Require an
   exact byte-count and SHA-256 match, then run `unzip -t` successfully.
3. In Claude, open **Customize → Plugins → + → Upload plugin file**. Select the
   verified `.plugin` file and confirm installation yourself.
4. Connect TopviewAI once as an account-level remote connector: open
   **Customize → Connectors → + → Add custom connector**, enter exactly
   `https://mcp.topview.ai`, then complete the browser OAuth flow. If a Custom
   `topview` connector is already connected, reuse it; do not add a second one.
5. Start a new conversation, enable the connected `topview` connector for that
   conversation, then make one safe, read-only Topview request to verify the
   connector and the plugin skills together.

The plugin intentionally contains skills only. It does not declare a second
plugin-scoped remote MCP, because Claude treats that as a separate connector
and would not reuse the OAuth connection above.

Do not upload a Codex ZIP, use Claude Code shell commands, bypass the file
picker or OAuth confirmation, or enter credentials in a terminal.

For updates, repeat the same process from the current metadata document. Keep
the previous verified `.plugin` file until the new installation and OAuth have
been confirmed. If upload, authentication, or the read-only verification fails,
stop and report the exact Claude UI state or error rather than deleting caches
or attempting a different package.
