# Workflow: Web Research

Source mapping: `workflow-web-research`.

## Intent

Evidence-backed web research that can optionally import durable media into Canvas before a creative workflow.

## Read first

`$operate-topview-canvas` `references/local-media-bridge.md`, and `$marketing-studio` when platform commerce research is the real need.

## Rules

1. Report only titles, URLs, and facts actually returned by tools.
2. Every factual claim needs a traceable source URL.
3. Separate facts, inferences, and recommendations.
4. Do not bypass logins, captchas, or private pages.
5. Prefer the current host's web tools and Marketing Studio playbooks; import via Canvas media nodes or the local upload bridge — do not use non-MCP import resume callbacks.
6. Remote media must become durable Canvas sources (media node or upload bridge) before any generation submit.
7. Default bounded source counts (for example max_sources=3) unless the user asks for more; never fabricate URLs.
8. After import, briefly group findings and return to the original creative goal / re-route to the right generation workflow.

## Non-goals

Paid generation belongs to other workflows after durable import. Research-only requests end in a research deliverable without submit.
