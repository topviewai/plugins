# Finish Topview setup in Hermes

The Topview Skills are installed and enabled. The remote MCP connection and
OAuth authorization are intentionally a separate, user-visible step.

Merge the exact `mcp_servers.topview-browser` mapping from
`.mcp.hermes.yaml` into the active Hermes `config.yaml`, preserving all other
settings. Then run:

```bash
hermes mcp login topview-browser
hermes mcp test topview-browser
```

Complete the Topview authorization in the browser yourself. Start a new Hermes
session after the test succeeds, explicitly load
`topview-browser:operate-topview-canvas`, and make one safe read-only Topview
request. Installation is not complete until the OAuth login and MCP test both
succeed.
