# Install TopviewAI in Codex

Use a current Codex Desktop or CLI installation with plugin support. The only
approved repository is `https://github.com/topviewai/plugins`. During the private pilot, an
anonymous browser or web fetch can return 404 even when the local GitHub account
has access. In that case, use the authenticated `gh`/git credentials already
configured on the machine; never search for or install a replacement plugin.

First remove any existing Topview plugin and Marketplace registration if they
exist. Then run:

```bash
codex plugin marketplace add https://github.com/topviewai/plugins --ref main --json
codex plugin add topview@topview --json
```

`topview@topview` has an install-time authentication policy. Complete the
Topview OAuth browser flow **in this installation task**: open the authorization
page when Codex provides it, wait for the user to approve it, and confirm that
Codex reports the authorization has completed. Do not say that installation is
complete, ask for a restart, or substitute a different plugin if OAuth did not
start or did not finish; report that exact failure instead.

Only after OAuth succeeds, ask the user to fully restart Codex and create a new
task. In that new task, verify that the `topview` MCP and TopviewAI skills are
available. Do not copy plugin files into Codex configuration directories
manually.
