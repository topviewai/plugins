# Compatibility

The bundled playbooks originated in Marketing Studio, where platform-specific logical gateways and internal agents may be available. Plugin users install one dependency: the remote `topview` MCP. Legacy gateway IDs are server-side routing details, not separate host plugins or MCP connections.

## Data-source policy

1. Inspect the tools exposed by the `topview` MCP before calling a named platform tool.
2. Use the exact Topview tool family when available.
3. If it is unavailable, use one of these explicit fallbacks:
   - Ask the user for a CSV, XLSX, report export, product URL, creator URL, ASIN, item ID, seller ID, or shop ID.
   - Use authoritative public web sources when the question can be answered from public data.
   - Provide a research or execution template and label unfilled metrics as required inputs.
4. Never invent GMV, sales, traffic, ad spend, conversion, inventory, creator demographics, audience overlap, or private seller performance.

## Marketing Studio tool-family mapping

The rows below describe capability families that a Topview deployment may expose through the single user-facing `topview` MCP connection. Inspect `tools/list` before relying on one. Names such as `amazon-mcp`, `shopee-mcp`, and `creator-discovery-mcp` are legacy backend logical gateway IDs retained for compatibility; users do not install or authenticate them separately.

| Tool family | Legacy backend routing detail | Host behavior when unavailable |
| --- | --- | --- |
| Amazon research | `amazon-mcp` | Use supplied Amazon exports or public product pages; state that private seller and Ads data are unavailable. |
| TikTok Shop `td_*` data | Topview core gateway | Use supplied TikTok Shop exports or links; do not claim Topview metrics were queried. |
| Shopee research | `shopee-mcp` | Use supplied reports or links; preserve site and currency boundaries. |
| Creator discovery | `creator-discovery-mcp` | Use supplied creator lists or public profiles; audience demographics and overlap require a real provider. |
| Paid media generation | `media-creator` | Use an available approved media tool only after confirming the requested generation action. |
| Durable reports | `html-writer` | Create a suitable local artifact with available document, spreadsheet, presentation, or site tools. |
| Authenticated browser actions | `cloud-browser` | Use an available browser tool only when the user requests the action and the session is authorized. |

## Cost and side effects

- Treat creator reports, overlap analysis, paid data searches, media generation, publishing, outreach, and ad changes as potentially billable or externally visible.
- Prefer a bounded query plan and reuse already returned data.
- Ask before any paid or externally mutating action.
