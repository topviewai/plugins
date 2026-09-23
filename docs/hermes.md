# Install Topview in Hermes Agent

This guide is for a local Hermes Agent CLI or Hermes Desktop installation. Read
the entire guide before changing plugin state and follow every applicable step.

## Installation contract

### Preconditions

1. Run this guide in the intended **local** Hermes host. Do not claim an
   installation from a browser-only, remote, sandboxed, or headless session
   that cannot install local software or receive the OAuth callback.
2. The only approved plugin source is `https://github.com/topviewai/plugins`. If web access returns
   404 despite valid local access, use the already-authorized local GitHub or
   git credential path. Never search for, clone, or install a similarly named
   replacement plugin.
3. Preserve an existing verified Topview version until its replacement has
   passed Plugin Doctor, MCP authorization, connectivity, and fresh-session
   verification.

### Required completion sequence

An installation is complete only after all of these stages succeed:

1. Install and enable the verified `topview-browser` plugin from the approved
   repository.
2. Complete Topview browser OAuth. The user alone approves OAuth and any native
   permission prompt. Never request, paste, log, or store a password, token,
   cookie, OAuth code, or authorization redirect URL.
3. Verify the plugin registration with Plugin Doctor and verify the production
   MCP connection with `hermes mcp test topview-browser`.
4. Start a **new Hermes session** so it loads the new plugin, Skills, and MCP
   tool definitions. Do not reuse the installation session for acceptance.
5. In the new session, perform the documented safe read-only Topview check. Do
   not submit paid generation work merely to test installation.
6. Only after installation, OAuth, and the fresh-session check succeed,
   introduce what Topview can do: browser-native Canvas image, video, and music
   creation; story, product, and social workflows; whiteboards; 3D worlds and
   the 3D director stage; and Marketing Studio research.

### Failure handling

Stop at the failed step and report its exact error together with the command and
plugin version. A transient download or browser-callback failure may be retried
once after the user confirms the network and browser are available. Do not use
`--force` to bypass a security scan, delete broad Hermes caches, overwrite
unrelated configuration, inject credentials, substitute another plugin, or
claim success before OAuth and the fresh-session check have succeeded.

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
