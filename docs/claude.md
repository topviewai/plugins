# Install Topview in Claude

Pick the guide for the Claude application you are using:

- **Claude Code** (terminal): add this Git marketplace and install the plugin.

  ```bash
  claude plugin marketplace add https://github.com/topviewai/plugins --scope user --sparse .claude-plugin plugins
  claude plugin install topview-browser@topview --scope user
  ```

  Run `/mcp`, authenticate `topview-browser`, and start a new session.
- **Claude Desktop or Cowork**: follow [claude-desktop.md](claude-desktop.md).
  The Desktop app cannot run the commands above; it installs a verified
  `.plugin` file from the GitHub Release.

Complete OAuth on first use and start a new conversation. When the built-in
Browser is available, Claude opens the returned Canvas link in its browser
panel; otherwise it returns a clickable link. No iframe is required.
