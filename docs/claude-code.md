# Install Topview in Claude Code

Read the [shared installation contract](installation-contract.md) first. Run
these commands in a local Claude Code installation at user scope. During the
private pilot, the existing authenticated git/GitHub credential must be able to
read `https://github.com/topviewai/plugins`; never replace it with a similarly named marketplace.

If an earlier `topview@topview` plugin is installed, remove that exact plugin
through Claude Code's plugin manager before installing the replacement. Do not
remove unrelated plugins or global caches. Then run:

```bash
claude plugin marketplace add https://github.com/topviewai/plugins --scope user --sparse .claude-plugin plugins
claude plugin install topview@topview --scope user
```

Reload plugins if Claude Code asks for it. If it asks for an unsandboxed retry
to write user settings, stop and let the user approve or reject that security
prompt. Open `/mcp`, choose `plugin:topview:topview`, and select
**Authenticate** when it shows **Needs authentication**. Complete browser OAuth
and return only after Claude Code shows the connection as authenticated.

Start a new session, then confirm the Topview MCP/skills are visible and make
one safe, read-only Topview request. Do not use paid generation merely as an
installation test. If any command, `/mcp` state, or OAuth callback fails, stop
and preserve the exact error for recovery.
