# Install Topview in Hermes Agent

Read the [shared installation contract](installation-contract.md) first. This
flow is for a local Hermes Agent CLI or Hermes Desktop installation. The only
approved plugin source is `https://github.com/topviewai/plugins`.

## Install the plugin

Run:

```bash
hermes plugins install topviewai/plugins/plugins/topview-browser --enable
hermes plugins doctor topview-browser --ci
```

The install command performs Hermes' plugin security scan. If it reports a
caution or block, stop and show the exact report; do not bypass it with
`--force`. Confirm Doctor reports the manifest and registration as healthy.

## Configure and authorize MCP

Read the installed
`~/.hermes/plugins/topview-browser/.mcp.hermes.yaml`. Merge only its exact
`mcp_servers.topview-browser` mapping into the active Hermes configuration,
preserving every unrelated setting. The equivalent command for this release is:

```bash
hermes config set --force mcp_servers.topview-browser '{"url":"https://mcp-browser.topview.ai","auth":"oauth","enabled":true,"headers":{"X-Topview-Plugin-Version":"1.0.4","X-Topview-Plugin-Client":"hermes"}}'
hermes mcp login topview-browser
hermes mcp test topview-browser
```

The user must complete Topview consent in the browser. Never request, paste,
log, or store a password, cookie, OAuth code, or token. If login or the MCP test
fails, stop with the exact error rather than clearing unrelated Hermes state.

## Fresh-session verification

After `hermes mcp test` reports a connected server and tools, start a new Hermes
session. Explicitly load `topview-browser:operate-topview-canvas`, call
`topview_check_plugin_update` as the first safe read-only Topview request with
`client=hermes`, and verify the result identifies Hermes and does not expose an
iframe `ui://` resource. Only then introduce the browser-native Canvas,
image/video/music creation, story and marketing workflows, whiteboards, and 3D
workspaces. Paid generation is not an installation test.
