# Install TopviewAI in Claude Code

Run these commands at user scope:

```bash
claude plugin marketplace add https://github.com/topviewai/plugins --scope user --sparse .claude-plugin plugins
claude plugin install topview@topview --scope user
```

If Claude Code asks for an unsandboxed retry to write its user settings, stop
and let the user approve or reject that security prompt. If the MCP shows
**Needs authentication**, open `/mcp`, choose `plugin:topview:topview`, and
select **Authenticate**. Start a new session only after authentication completes.
