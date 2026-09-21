# Browser opening contract

1. MCP OAuth authorizes Agent tool calls. The ordinary Topview website may ask
   the user to sign in separately because browser cookies and MCP tokens are
   intentionally isolated.
2. The Agent calls one MCP open tool and receives `webLink`; it never constructs
   a Canvas URL from an ID.
3. The Agent prefers the host's Browser/navigation tool. Right-side or in-app
   placement is best effort because each host controls its own Browser UI.
4. If Browser use is unavailable, disabled, or requires approval, the Agent
   returns the exact `webLink` as a clickable fallback and explains the boundary.
5. The plugin has no iframe resource, MCP App HTML resource, embed bootstrap
   ticket, or companion Cursor extension.
