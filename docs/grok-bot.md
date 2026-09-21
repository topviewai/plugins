# Install Topview in Grok Bot

Grok Bot uses the Cursor Marketplace and the same Cursor account. Install the
approved Cursor Marketplace entry named **Topview**, complete MCP OAuth, and
start a new Bot conversation so the new Skills and tool definitions are loaded.

Ask Grok Bot to list your Topview Canvas projects before doing any paid
generation. When opening a Canvas, Grok Bot must use Bot Browser to open the
exact server-authorized `webLink`; if Bot Browser is unavailable, it should
return that exact URL as a clickable fallback. The plugin does not use iframe,
side-panel, or Grok Build `.grok-plugin` APIs.

Source: https://github.com/topviewai/plugins
