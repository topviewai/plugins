# TopviewAI Plugins

Official public installation repository for TopviewAI on Codex, Cursor, Claude
Code, and Claude Desktop / Cowork. This repository contains runtime-only plugin
files. Development, release automation, test data, and private infrastructure
are intentionally excluded.

## Install with one prompt

Paste the matching sentence into your host:

```text
/goal Install TopviewAI only from https://github.com/topviewai/plugins. For this private-repository pilot, use authenticated GitHub CLI or git credentials to read `docs/codex.md`; never use anonymous web search or substitute another repository. Clean any old Topview install, add this repository as the Codex Marketplace, install `topview@topview`, and complete the browser OAuth flow before asking me to restart Codex and verify in a new task.
```

```text
Read https://github.com/topviewai/plugins/blob/main/docs/cursor.md to install and use the TopviewAI plugin.
```

```text
/goal Read https://github.com/topviewai/plugins/blob/main/docs/claude.md to install and use the TopviewAI plugin.
```

Claude's guide selects the correct flow for Claude Code or Claude Desktop /
Cowork. Do not use Claude Code terminal commands in Claude Desktop, and do not
upload a `.plugin` file to Claude Code.

## Security

Install only from this repository and complete OAuth in the Topview browser
flow. File selection, install confirmation, permission approval, and OAuth are
user security boundaries; an installation agent must not bypass them.

Product home: https://www.topview.ai
