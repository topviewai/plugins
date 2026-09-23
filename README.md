# Topview

Official public plugin source for the browser-based Topview Canvas integration.
The public listing is named **Topview** and its stable internal plugin and MCP
identifier is `topview-browser`. The retained iframe/embed edition is private and
is intentionally absent from this repository and every public marketplace.

Topview lets an Agent create, organize, and edit Canvas content through MCP.
When the user asks to open a Canvas, the plugin returns an authorized normal web
URL and asks the host Browser capability to open it in the host browser pane.
If that capability is unavailable, the Agent presents the same URL as a
clickable fallback. URLs never carry OAuth tokens, embed tickets, passwords, or
cookies. A separate sign-in to the Topview website may be required.

- [Codex installation](docs/codex.md)
- [Claude installation](docs/claude.md)
- [Cursor installation](docs/cursor.md)
- [Grok Bot installation](docs/grok-bot.md)
- [Hermes installation](docs/hermes.md)
- [Security and host behavior](docs/browser-contract.md)

## Install Hermes with one prompt

Paste this into a local Hermes session:

```text
Read https://github.com/topviewai/plugins/blob/main/docs/hermes.md completely, then install and enable Topview in this local Hermes Agent. Use the documented `hermes config set --force` command to merge the exact bundled MCP configuration without changing my other settings; do not try to edit `config.yaml` with a file-writing tool. Complete Topview OAuth with me, verify the MCP connection, and tell me to start a new session. Do not claim success until the read-only verification in that new session succeeds.
```

Product home: https://www.topview.ai
