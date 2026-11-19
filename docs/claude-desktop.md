# Install Topview in Claude Desktop or Cowork

Use the local Claude Desktop or Cowork application. An Agent may download and
verify the file, but the user performs every Claude UI step and approves OAuth.

1. Read `https://raw.githubusercontent.com/topviewai/plugins/main/releases/claude/latest.json` over HTTPS. Take `downloadUrl`, `sha256`, and
   `sizeBytes` from that same response. If it is unavailable, stop and report
   it; do not substitute an older release or another package.
2. Download the referenced `topview-plugin-<version>.plugin` to a temporary
   directory. Require an exact byte count and SHA-256 match, then run
   `unzip -t` successfully.
3. In Claude, open **Customize → Plugins → Add → Upload plugin** and select the
   verified file. Confirm the plugin ID is `topview-browser` and its version matches the metadata
   document (`1.0.6` for this release).
4. Open **Customize → Connectors → topview-browser**, choose **Connect**, and
   complete Topview consent in the browser.
5. Start a new conversation and ask Claude to list your Topview Canvas
   projects. Allow the read-only `list_topview_canvases` call. Do not submit
   paid generation merely to test installation.

## Third-party inference (Gateway) deployments

When Claude Desktop runs with a third-party inference provider, Connect on a
plugin-provided connector reports "Ask your admin to set it up as a managed
connector". The plugin's Skills still install; its MCP server must be added as
a managed MCP server in that deployment's configuration:

```json
{
  "name": "topview-browser",
  "transport": "http",
  "url": "https://mcp-browser.topview.ai",
  "oauth": { "mode": "dcr" },
  "headers": {
    "X-Topview-Plugin-Version": "1.0.6",
    "X-Topview-Plugin-Client": "claude"
  }
}
```

Restart Claude, then continue from step 4.

For updates, repeat the process with the current metadata document. Keep the
previous verified `.plugin` file until the new installation and OAuth have been
confirmed. If upload, authentication, or the read-only check fails, stop and
report the exact Claude UI state or error.
