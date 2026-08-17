# Install TopviewAI in Claude Desktop or Cowork

1. Download the approved production release metadata at `https://raw.githubusercontent.com/topviewai/plugins/main/releases/claude/latest.json`
   over HTTPS. Read `downloadUrl`, `sha256`, and `sizeBytes` from that same
   response.
2. Download the referenced `.plugin` file to a temporary directory. Require an
   exact byte-count and SHA-256 match, then run `unzip -t` successfully.
3. In Claude, open **Customize → Plugins → + → Upload plugin file**. Select the
   verified `.plugin` file and confirm installation yourself.
4. Start a new conversation. On first Topview use, complete browser OAuth and
   return to Claude only after the authorization succeeds.

Do not upload a Codex ZIP, use Claude Code shell commands, bypass the file
picker or OAuth confirmation, or enter credentials in a terminal.

For updates, repeat the same process from the current metadata document. Keep
the previous verified `.plugin` file until the new installation and OAuth have
been confirmed.
