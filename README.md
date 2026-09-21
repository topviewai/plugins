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
- [Security and host behavior](docs/browser-contract.md)

Product home: https://www.topview.ai
