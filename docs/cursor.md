# Install Topview in Cursor

In Cursor’s plugin marketplace, look for **Topview** and check the installed
plugin ID (`topview-browser`) and version (`1.0.6`) under **Customize → Plugins**.

For a fresh local installation of this exact version, download and extract the
[source archive for v1.0.6](https://github.com/topviewai/plugins/archive/refs/tags/v1.0.6.zip).
Copy the entire `plugins/topview-browser` directory, including hidden files, into
`~/.cursor/plugins/local/`. If `~/.cursor/plugins/local/topview-browser` already
exists, move it to a backup outside `local` before copying. Verify that
`~/.cursor/plugins/local/topview-browser/.cursor-plugin/plugin.json` contains
`"name": "topview-browser"` and `"version": "1.0.6"`.

Reload Cursor, authorize `topview-browser` in MCP settings, and start a new Agent
task. Ask it to open an existing canvas and verify the project title in Cursor’s
built-in Browser. Sign in to the Topview website there if prompted.

Source: https://github.com/topviewai/plugins
