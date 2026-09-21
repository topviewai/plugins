# Source status

## Current development snapshot

This bundle contains 29 Topview-authored prompt playbooks visible in the Marketing Studio repository at:

- Repository: `topview/marketing-studio`
- Reference commit: `4d49b9a8585ebd76a469cb58805438f38a7b716e`
- Source migrations:
  - `backend/sql/V030__ecommerce_ops_c1_agents.sql`
  - `backend/sql/V031__ecommerce_ops_mcp_skill_optimizations.sql`
  - `backend/sql/V041__modash_discovery_mcp.sql`
  - `backend/sql/V042__rename_modash_mcp_to_creator_discovery.sql`
  - `backend/sql/V060__shopee_ops_c1_agent.sql`

The referenced migration blobs match the inspected development checkout. They establish that these playbooks were authored as first-party, active, public prompt skills at migration time.

## What this snapshot does not prove

The repository cannot prove the current test or production database inventory. Official runtime visibility additionally requires an environment-matched, active, public, published skill with a non-null immutable release pointer. A skill may have been retired, replaced, or republished after the migration.

Before a public release of this plugin:

1. Export the target environment's official public published release inventory.
2. Pin each entry by release ID, semantic version, and artifact checksum.
3. Compare the live inventory with `references/catalog.json`.
4. Review redistribution rights and external tool requirements.
5. Fail the release if any public skill is missing, unreviewed, or cannot be represented safely in every supported host.

## Explicit exclusions

- Third-party `examples/linkfoxskill/**` content without verified redistribution rights.
- Third-party Skills seeded from skills.sh.
- User-owned or workspace-owned skills.
- Test fixtures and repository-navigation skills.
- Retired TikTok analyzer skills and the retired cloud-browser expert.
- Bootstrap-user document skills whose current code, artifact, and rights cannot be verified from the repository.
- Design-only or admin-entry documentation that does not prove a published release.
- Tool-only seeds without a portable prompt or compatible supported-host implementation.
