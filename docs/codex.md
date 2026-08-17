# Install TopviewAI in Codex

Use a current Codex Desktop or CLI installation with plugin support. Run:

```bash
codex plugin marketplace add https://github.com/topviewai/plugins --ref main --json
codex plugin add topview@topview --json
```

Restart Codex, start a new task, and complete Topview OAuth when requested.
Verify that the `topview` MCP and TopviewAI skills are available. Do not copy
plugin files into Codex configuration directories manually.
