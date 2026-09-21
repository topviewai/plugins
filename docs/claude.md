# Install Topview in Claude

Claude Code can add this Git marketplace and install the Browser plugin:

```bash
claude plugin marketplace add https://github.com/topviewai/plugins --scope user --sparse .claude-plugin plugins
claude plugin install topview-browser@topview --scope user
```

For Claude Desktop or Cowork, install the marketplace-approved Topview plugin
through the Plugins UI. Complete OAuth on first use and start a new conversation.
When the built-in Browser is available, Claude opens the returned Canvas link in
its browser panel; otherwise it returns a clickable link. No iframe is required.
