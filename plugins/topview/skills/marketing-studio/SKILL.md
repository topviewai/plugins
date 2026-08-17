---
name: marketing-studio
description: Plan and execute Topview Marketing Studio workflows for ecommerce market research, product analysis, listing and content optimization, TikTok Shop operations, Amazon operations, Shopee operations, YouTube or Instagram creator discovery, audience analysis, outreach, and campaign reporting. Use when a user asks for a marketing strategy, platform-specific research, creator campaign, content plan, product selection, trend analysis, or an operational review.
---

# Marketing Studio

Route each request to the smallest relevant bundled playbook, verify data and tool availability, and produce an evidence-backed marketing deliverable.

### Skill feedback

If this task used Topview MCP tools, immediately before the final user reply follow [`../../references/skill-feedback.md`](../../references/skill-feedback.md) once with `skillName="marketing-studio"`. Diagnose whether this Skill or its Topview MCP contract should improve using the current task context; this is best-effort guidance, never a blocking Hook.

### Plugin version / upgrade

When the user asks whether the Topview plugin is up to date, which version is installed, or asks to upgrade/reinstall the plugin, call `topview_check_plugin_update` first. Use its returned `downloadUrl` and host-specific `upgradePrompt` verbatim — never invent a CloudFront URL or substitute a host marketplace command. After a successful upgrade, call `topview_ack_plugin_update` with `action=upgraded`; if the user declines, call it with `action=dismissed`.

## Workflow

1. Identify the platform, market, objective, time window, product or category, and requested output.
2. Run `python3 scripts/search_catalog.py "<request>"` from this skill directory, or inspect [references/catalog.md](references/catalog.md), to select at most three matching playbooks.
3. Read [references/compatibility.md](references/compatibility.md), then read only the domain reference returned by the catalog:
   - [references/ecommerce.md](references/ecommerce.md) for shared routing, reviews, and durable outputs.
   - [references/amazon.md](references/amazon.md) for Amazon research and optimization.
   - [references/tiktok-shop.md](references/tiktok-shop.md) for TikTok Shop research, content, affiliate, ads, and live operations.
   - [references/influencer.md](references/influencer.md) for YouTube and Instagram creator workflows.
   - [references/shopee.md](references/shopee.md) for Shopee market, product, shop, brand, and keyword analysis.
4. Check whether the required data source exists among the tools exposed by the unified `topview` MCP. Use a matching Topview tool when available. Otherwise use user-provided exports or authoritative public sources, state the limitation, and never fabricate private platform metrics.
5. Separate evidence, inference, and recommendation. Include source dates, market or region, currency, units, and material exclusions. Do not convert missing evidence into a precise score.
6. Produce the requested deliverable. Prefer a compact table for comparisons and an owner, date, and action list for operational plans.
7. Obtain explicit user approval before publishing content, spending money, contacting creators, generating paid media, or changing external state.

## Routing rules

- Prefer one platform-specific playbook plus one shared playbook. Do not load every reference.
- Ask for a product or category, region, and date window only when their absence would materially change the result.
- Treat Amazon, TikTok Shop, Shopee, YouTube, and Instagram as distinct data contracts; do not silently substitute one platform's evidence for another.
- Use uploaded private reports before public estimates when the user asks about their own store, ads, inventory, costs, or conversion.
- Do not expose Marketing Studio internal credentials, environment paths, release metadata, or private workspace data.

## Source status

This development bundle contains 29 Topview-authored repository playbooks. It is not a claim that all 29 are currently published in test or production. Read [references/source-status.md](references/source-status.md) when the user asks about catalog completeness, publication state, provenance, or redistribution.
