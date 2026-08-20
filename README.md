# Topview Plugins

Official public installation repository for Topview on Codex, Cursor, Claude
Code, and Claude Desktop / Cowork. This repository contains runtime-only plugin
files. Development, release automation, test data, and private infrastructure
are intentionally excluded.

## Install with one prompt

Paste the matching sentence into the **local desktop application** you intend
to use. It directs the agent to the full installation guide, where it must
install, complete OAuth, verify the result, and then open a fresh task. During
the private pilot, use the authenticated GitHub account that has access to
this repository; do not replace the repository with a search result.

```text
/goal Read https://github.com/topviewai/plugins/blob/main/docs/codex.md to install TopviewAI, complete OAuth, and set up a new task for me. After installation and authorization succeed, introduce to me what things the Topview plugin can do.
```

```text
Read https://github.com/topviewai/plugins/blob/main/docs/cursor.md to install TopviewAI in one prompt, then follow its single-restart authorization handoff exactly. After installation and authorization succeed, introduce to me what things the Topview plugin can do.
```

```text
/goal Read https://github.com/topviewai/plugins/blob/main/docs/claude.md to install TopviewAI, complete OAuth, and set up a new task for me. After installation and authorization succeed, introduce to me what things the Topview plugin can do.
```

## What Topview can do

- Open or create a shared Canvas before creation so the user can watch, select,
  rearrange, edit, and guide the work directly.
- Create and refine images, videos, music, storyboards, product ads, social
  videos, and short films with Canvas-owned generation and editable results.
- Work with interactive whiteboards, 3D worlds, and the 3D director stage
  inside Canvas instead of hiding the creative process in chat.
- Research markets and products with Marketing Studio, then carry the selected
  evidence and assets into a visible Canvas workflow.

Read the shared [installation contract](docs/installation-contract.md) before
using any platform guide. Claude's guide selects the correct flow for Claude
Code or Claude Desktop / Cowork. Do not use Claude Code terminal commands in
Claude Desktop, and do not upload a `.plugin` file to Claude Code.

## Security

Install only from this repository and complete OAuth in the Topview browser
flow. File selection, install confirmation, permission approval, and OAuth are
user security boundaries; an installation agent must not bypass them.

Product home: https://www.topview.ai
