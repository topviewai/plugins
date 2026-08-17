# Install TopviewAI in Codex

Read the [shared installation contract](installation-contract.md) first. Use a
current **local** Codex Desktop or CLI installation with plugin support. The
only approved repository is `https://github.com/topviewai/plugins.git`. During the private pilot, an
anonymous browser or web fetch can return 404 even when the local GitHub account
has access. In that case, use the authenticated `gh`/git credentials already
configured on the machine; never search for or install a replacement plugin.

## Install and authorize

Locate the Codex executable used by the local desktop app and assign its full
path to `CODEX`. Do not assume an unrelated `codex` found on `PATH` is the
desktop host. Confirm `"$CODEX" --version` first.

If `"$CODEX" plugin list --json` shows an earlier `topview@topview`, remove
that exact plugin first. If `"$CODEX" plugin marketplace list` shows an old
Topview marketplace source, remove only that exact marketplace registration.
Do not delete Codex-wide caches or configuration directories.

Then run these commands in order:

```bash
"$CODEX" plugin marketplace add https://github.com/topviewai/plugins.git --ref main --json
"$CODEX" plugin add topview@topview --json
"$CODEX" mcp login topview
```

The final command is mandatory: it opens the Topview OAuth flow. Complete it
**in this installation task** and wait for Codex to report a successful login.
Do not say that installation is complete, ask for a restart, or substitute a
different plugin if OAuth did not start or did not finish; report that exact
failure instead.

Verify the installed source and authenticated MCP before restarting:

```bash
"$CODEX" plugin list --json
"$CODEX" plugin marketplace list
"$CODEX" mcp get topview --json
```

Only after all three checks and OAuth succeed, ask the user to fully restart
Codex and create a new task. In that new task, verify that the `topview` MCP
and TopviewAI skills are available with one safe, read-only request. Do not
copy plugin files into Codex configuration directories manually.
