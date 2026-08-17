# TopviewAI installation contract

This contract applies to the Codex, Cursor, Claude Code, and Claude Desktop /
Cowork guides in this repository. It intentionally follows a short-prompt,
fully-documented installation model: the user gives one sentence; the agent
must carry out every applicable documented step and must not silently shorten
the flow.

## Preconditions

1. Run the guide in the intended **local desktop host**. Do not claim an
   installation from a browser-only, remote, sandboxed, or headless session
   that cannot install local software or receive the OAuth callback.
2. The only approved distribution source is `https://github.com/topviewai/plugins.git`. While this
   repository is private, web access can return 404 despite valid local access;
   use the already-authorized local `gh`/git credential path. Never search for,
   clone, or install a similarly named replacement plugin.
3. Read the entire platform guide before changing plugin state. Preserve an
   existing verified version until its replacement has passed verification.

## Required completion sequence

An installation is complete only when all applicable stages have succeeded:

1. Install the exact `topview@topview` plugin or the verified matching release
   artifact.
2. Start and finish the Topview browser OAuth flow when the platform guide
   requires it. The user alone approves OAuth, native file pickers, install
   permissions, and application restart.
   Do not request, paste, log, or store a password, token, cookie, or OAuth
   code in a terminal or document.
3. Verify the local plugin/MCP or extension registration using the commands or
   host UI named by the platform guide.
4. Fully restart the host when the guide requires it, then create a **new**
   task or conversation. A current task may retain its old plugin registry.
5. In the new task, make one safe, read-only Topview request or confirm the
   registered Topview MCP/skills are visible. Do not submit paid generation
   work merely to test installation.

### Cursor exception: one prompt, one restart

For Cursor, the one installation task installs the local plugin and VSIX, then
stops with the restart handoff. It must **not** claim that it started OAuth or
wait for authorization: the current Cursor process has not loaded the newly
installed plugin. After the user fully quits and reopens Cursor in the intended
workspace, Cursor loads the MCP automatically. The user authorizes TopviewAI
once in Cursor Settings, then starts their normal Topview task. They do **not**
paste the installation prompt again.

Canvas rendering depends on the Cursor host mode, not on installation or OAuth:
use **IDE mode** to open a Canvas in the right editor-group side panel. In
**Agent mode**, Canvas output is available only in the chat conversation.

## Failure handling

Stop at the failed step and report its unmodified error plus the platform,
command or UI action, and version being installed. A transient download or
browser-callback failure may be retried once after the user confirms the
network/browser is available. Do not delete broad application caches, edit
host-managed extension indexes, inject credentials, substitute another plugin,
or report success before OAuth and the fresh-task check have succeeded.

For updates, repeat the same sequence from the current release metadata or
repository `main` branch. The public release metadata is authoritative for
Cursor VSIX and Claude Desktop / Cowork artifacts; Git repository `main` is
authoritative for Codex, Cursor local-plugin, and Claude Code runtime files.
