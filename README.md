# TopviewAI Plugins

Official public installation repository for TopviewAI on Codex, Cursor, Claude
Code, and Claude Desktop / Cowork. This repository contains runtime-only plugin
files. Development, release automation, test data, and private infrastructure
are intentionally excluded.

## Install with one prompt

Paste the matching sentence into your host:

```text
/goal Read the Codex installation guide in my authenticated GitHub repository `topviewai/plugins`, install TopviewAI, complete OAuth, and set up a new task for me.
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
