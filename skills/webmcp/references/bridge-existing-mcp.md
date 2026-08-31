# Bridge: expose an existing MCP server as page tools

Use when the product already runs a remote MCP server (Streamable HTTP or
SSE): its tools already encode the designed journeys, so bridge them onto
`document.modelContext` instead of re-implementing each one in page JS.

Three real paths exist. Pick by hosting and code access, and confirm the
choice with the user.

## Decision

| Situation | Path |
| --- | --- |
| Site is served through Cloudflare | Cloudflare's WebMCP feature (zero code changes) |
| You control the frontend code (any host) | `@ora-ai/webmcp-bridge` library in the page |
| You need page tools visible to MCP clients (Claude, Cursor, extensions) | different direction; use the `@mcp-b` bridge ecosystem, not this doc |

That third row is a common confusion: `@mcp-b/global` and the WebMCP-org
bridges mostly translate **page tools out to the MCP ecosystem**. This
doc's job is the opposite direction: **remote MCP tools into the page**.

## Path A: `@ora-ai/webmcp-bridge` (in-page library)

This plugin's own package (MIT, maintained in this repository under
`packages/webmcp-bridge`); built on the official
`@modelcontextprotocol/sdk`. It connects to the MCP endpoint from the
browser (Streamable HTTP with SSE fallback), discovers tools (with
pagination), and registers each on `document.modelContext` via
`registerTool`, so page-local tools coexist with bridged ones. It maps
MCP annotations onto WebMCP hints, returns MCP error results as `{ error }`
payloads so agents get actionable failures (a rejected `execute` would
reach them as a bare `UnknownError`), follows `tools/list_changed`
re-syncs, and no-ops with a warning in browsers without WebMCP.

```bash
npm install @ora-ai/webmcp-bridge
```

```js
import { createWebMcpBridge } from "@ora-ai/webmcp-bridge";

const bridge = await createWebMcpBridge({
  url: "https://mcp.example.com/mcp",
  // headers: { Authorization: `Bearer ${token}` },  // when the server needs it
  // include: ["search_products", "get_order_status"],  // curate; do not expose everything
  // namePrefix: "acme.",                              // avoid clashes with page tools
});
// bridge.tools -> registered tools; bridge.close() -> unregister + disconnect
```

React: `import { useWebMcpBridge, WebMcpBridgeProvider } from "@ora-ai/webmcp-bridge/react"`.
Vue: `import { useWebMcpBridge } from "@ora-ai/webmcp-bridge/vue"`.
Prefer `include` over bridging every server tool: the curated-journeys
rule applies to bridged tools too.

Checklist before shipping:

- [ ] MCP server speaks Streamable HTTP or SSE and allows **CORS** from
      the site's origin (browser calls it directly)
- [ ] Auth confirmed with the user: same OAuth client as the webapp lets
      the bridge ride the signed-in session; otherwise agree on the token
      source before adding `headers` (never hardcode secrets)
- [ ] No page-local tool overlaps a bridged tool for the same job
- [ ] Feature detection still no-ops cleanly without WebMCP support

## Path B: Cloudflare WebMCP (zero code)

For sites behind Cloudflare: a dashboard toggle (Agent Readiness >
WebMCP, developer preview) injects an edge-served bridge script via
HTMLRewriter. Point it at the product's MCP endpoint (`data-mcp-url`) and
it proxies those tools as WebMCP tools from the page, on the visitor's
origin and session. No repo changes, maintained by Cloudflare; the
trade-off is coupling to Cloudflare and a preview-stage feature. When the
user's site is on Cloudflare, present this option before writing any
code.

## What bridging does not give you

- **No in-page visual feedback.** Bridged tools execute on the MCP
  server; the DOM does not fill, highlight, or navigate. If the user
  wants visible effects on key journeys, add 1-2 imperative tools for
  those paths alongside the bridge.
- **No new authorization.** The MCP server's own authn/authz still
  gates every call; bridging never widens what the session may do.

## Verification differences

Tell the `verify` skill which tools are bridged: for them, assert the
returned MCP payload only; a missing DOM effect is expected, not a
failure. Registration discovery and security lint apply unchanged.

## Anti-patterns

- Hand-wrapping each remote tool in page JS instead of bridging
- Bridging *and* re-implementing the same tool imperatively
- Baking a bearer token into the page source to satisfy `headers`
- Bridging a server whose CORS you had to open to `*` to make it work
