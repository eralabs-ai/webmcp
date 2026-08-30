# Bridge: expose an existing MCP server as page tools

Use when the product already runs a remote MCP server (Streamable HTTP or
SSE): its tools already encode the designed journeys, so bridge them onto
`document.modelContext` instead of re-implementing each one in page JS.

Three real paths exist. Pick by hosting and code access, and confirm the
choice with the user; the packages below are third-party, so verify
current versions and APIs on npm before pinning anything.

## Decision

| Situation | Path |
| --- | --- |
| Site is served through Cloudflare | Cloudflare's WebMCP feature (zero code changes) |
| You control the frontend code (any host) | `webmcp-proxy` library in the page |
| You need page tools visible to MCP clients (Claude, Cursor, extensions) | different direction; use the `@mcp-b` bridge ecosystem, not this doc |

That third row is a common confusion: `@mcp-b/global` and the WebMCP-org
bridges mostly translate **page tools out to the MCP ecosystem**. This
doc's job is the opposite direction: **remote MCP tools into the page**.

## Path A: `webmcp-proxy` (in-page library)

Published by Alpic (ISC license); connects to the MCP endpoint from the
browser, discovers tools, and registers each on `document.modelContext`
via `registerTool`, so page-local tools coexist with bridged ones.

```bash
npm install webmcp-proxy
```

```js
import { createWebMcpProxy } from "webmcp-proxy";

const proxy = await createWebMcpProxy({
  url: "https://mcp.example.com/mcp",
  // headers: { Authorization: `Bearer ${token}` },  // when the server needs it
});
```

React and Vue wrappers exist (`webmcp-proxy/react`, `webmcp-proxy/vue`).
The package is young; treat it as a fast first patch, read its current
README before wiring, and pin the version.

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
