# Install Topview in Codex

Add the approved marketplace repository and install `topview-browser@topview`:

```bash
codex plugin marketplace add https://github.com/topviewai/plugins --ref main --json
codex plugin add topview-browser@topview --json
codex mcp login topview-browser
```

Complete OAuth in the browser, fully restart Codex, and use a new task so the
new MCP and Skills are loaded. Verify with one safe read-only Topview request.
When opening a Canvas, Codex should prefer its Browser pane and may fall back to
a clickable URL if Browser access is unavailable.
