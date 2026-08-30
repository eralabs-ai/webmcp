---
name: webmcp
description: >-
  This skill should be used when the user asks to make a website or web app
  "WebMCP-compatible", "agent-ready", or usable by in-browser AI agents, or
  mentions WebMCP, document.modelContext, navigator.modelContext, registerTool,
  declarative form tools (toolname/tooldescription), or exposing page tools to
  browser agents. Plans which user journeys to expose, then implements them on
  the standard document.modelContext API and verifies them in a real browser.
---

# WebMCP: make a website agent-ready

WebMCP lets a **web page** register typed tools that in-browser AI agents call
directly, so agents act through the site's own logic instead of scraping the
DOM. It is not a remote MCP server and not a ChatGPT/Claude MCP App.

Canonical surface: `document.modelContext.registerTool(...)` (the only surface
in the current spec). `navigator.modelContext` exists only in older
implementations; feature-detect `document` first. Declarative surface: HTML
`<form>` attributes (`toolname`, `tooldescription`), currently a Chrome origin
trial. Exact API contract: [references/spec.md](references/spec.md).

**Do not use this skill** for building remote MCP servers or MCP Apps. For a
read-only agent-readiness report with no code changes, use the `audit` skill
from this plugin instead.

## Hard rules

1. **No file is written before the plan is approved.** Which journeys become
   tools is a product decision; present the proposal and wait for an explicit
   yes. Skipping the gate is the primary failure mode of this workflow.
2. **Standard API only.** Generated code targets `document.modelContext` with
   feature detection and graceful no-op. Never invent a wrapper SDK; never
   import a vendor SDK the repo does not already use.
3. **Client-reachable wiring only.** `execute` may call the app's client data
   layer, same-origin routes, or client-safe actions. Never server-only
   imports, secrets, or third-party endpoints. A journey with no safe client
   path is reported as *needs developer wiring*, never faked.
4. **Authorization stays on the server.** Registration gating by auth state is
   UX, not security. Only wrap mutations whose routes independently enforce
   authn/authz server-side.
5. **Irreversible or cost-bearing writes stop at a reversible boundary.**
   Payments, deletes, cancellations never complete in one agent call: create
   the app's own pending state and hand the final step to the app's confirm
   UI, or use a prepare/confirm two-call shape.
6. **Code and analysis stay local.** Never send the repo's code, routes, or
   schemas to any external service.

## Workflow

Copy and track:

```
WebMCP progress:
- [ ] 1. Inventory the app (read-only)
- [ ] 2. Propose journeys + strategy (HARD GATE: wait for approval)
- [ ] 3. Wire the runtime
- [ ] 4. Implement the approved plan
- [ ] 5. Verify in a browser (mandatory)
- [ ] 6. Harden
```

### 1. Inventory (read-only)

Identify the stack from manifests: framework, rendering mode (SPA / SSR /
MPA / static), router, package manager, whether a bundler exists at all.
Read high-signal sources before app code: README, route manifests, sitemap,
nav, homepage CTAs, existing `<form>` elements, the client data layer, auth
boundaries. Check for an existing remote MCP server and any existing WebMCP
registration (search for `modelContext`, `registerTool`, `toolname`). Batch
these reads in parallel; do not read one file per turn.

### 2. Propose journeys and strategy (hard gate)

Read [references/strategies.md](references/strategies.md) and
[references/tool-design.md](references/tool-design.md) together.

Think in **visitor journeys, not endpoints**: put a concrete visitor on
concrete pages and list what they would ask and ask for. Most sites converge
on 3-10 tools; a content-only site gets one retrieval tool and stops. For
each candidate tool decide: strategy (Declarative / Imperative / Bridge),
availability (which pages, which auth states), input, UI and state outcome,
and annotations.

Present the plan in this shape and **stop until the user approves**:

```
Proposed WebMCP tools:
- [strategy] tool_name — input -> UI/state outcome (pages, auth state)
- ...
Needs developer wiring (no safe client path): ...
Out of scope this round: ...
```

Tool descriptions ship verbatim from the approved plan; the description is
the product. If implementation later forces a deviation, stop and re-present.

### 3. Wire the runtime

Skip when the plan is Declarative-only. Otherwise ensure
`document.modelContext` exists (native or polyfill), with feature detection
that no-ops on unsupported browsers. Secure context (HTTPS or localhost) is
required. Details, polyfill choice, and iframe permissions policy:
[references/runtime.md](references/runtime.md).

### 4. Implement

Pick the per-strategy guide, then the framework guide that matches the stack:

- Declarative form annotations:
  [references/declarative-forms.md](references/declarative-forms.md)
- Imperative `registerTool` design (naming, schemas, returns, lifecycle):
  [references/tool-design.md](references/tool-design.md)
- Bridge to an existing MCP server (`webmcp-proxy`, or Cloudflare's
  zero-code toggle when the site is on Cloudflare); never hand-wrap each
  remote tool: [references/bridge-existing-mcp.md](references/bridge-existing-mcp.md)
- Framework wiring: [references/frameworks/react-next.md](references/frameworks/react-next.md),
  [references/frameworks/vue.md](references/frameworks/vue.md),
  [references/frameworks/svelte.md](references/frameworks/svelte.md),
  [references/frameworks/vanilla-mpa.md](references/frameworks/vanilla-mpa.md)

Non-negotiables for imperative tools (full contract in
[references/spec.md](references/spec.md)):

1. Feature-detect before `registerTool`; human UI must survive a browser
   without WebMCP
2. Pass `{ signal }` at registration; abort to unregister
   (`unregisterTool()` does not exist)
3. Honor `execute`'s `{ signal }` in fetches and long work
4. `annotations.readOnlyHint` must match reality;
   `untrustedContentHint: true` when returns carry user or third-party text
5. Validate input inside `execute`; throw actionable errors; a read that
   finds nothing returns an empty result plus an explicit note, never a bare
   throw or silent success
6. Return values must survive `JSON.stringify`
7. Names: ASCII `[a-zA-Z0-9_.-]`, 1-128 chars; one tool per approved journey;
   duplicate names reject at registration
8. Match the repo's language, lint config, and file conventions

### 5. Verify (mandatory)

Work is not done until each tool is exercised the way an agent would call it.
Use the `verify` skill from this plugin: registration on the declared pages
and auth states, invocation of every tool, UI/state assertions, security
lint. Every tool ends **verified**, **failed** (fix or drop, never ship), or
**could-not-verify** (ship flagged). Quick fallback when no DevTools MCP is
available:

```js
const mc = document.modelContext ?? navigator.modelContext;
const tools = await mc.getTools();
await mc.executeTool(tools.find(t => t.name === "search_docs"), { query: "x" });
```

### 6. Harden

Read [references/security.md](references/security.md). Minimum bar: least
privilege (drop tools on logout), honest annotations, no instructions or
secrets in tool metadata, sanitized outputs, server-side authz on every
mutating path, reversible boundaries on destructive actions, `exposedTo`
never listing origins the site does not control.

## Decision tree

```
Make this site agent-ready?
├─ Propose journeys with the user first (never skip)
├─ Real HTML <form>s that should stay forms?      -> Declarative attributes
├─ Packaged scenario (tunnel, store update, nav)? -> Imperative registerTool
└─ Existing remote MCP server with right tools?   -> Bridge via webmcp-proxy
```

If the user is unsure: Bridge when an MCP server exists, Declarative when the
site is form-heavy, Imperative for the one high-value journey they care about.

## Anti-patterns

- Implementing before the user approves journeys and strategy
- Wrapping REST endpoints 1:1 instead of packaging journeys
- Tool proliferation: near-duplicate tools dilute agent selection accuracy
- Inventing transactional tools on a content-only site
- Registering overlapping tools for one job across strategies
- Calling `registerTool` in server code; WebMCP is a document API
- Leaving a stale contextual tool registered after route or state change
- Skipping browser verification because the build passes

## Sources of truth

- Spec: https://webmachinelearning.github.io/webmcp/
- Chrome imperative API: https://developer.chrome.com/docs/ai/webmcp/imperative-api
- Chrome declarative API: https://developer.chrome.com/docs/ai/webmcp/declarative-api
- Chrome best practices: https://developer.chrome.com/docs/ai/webmcp/best-practices

The web view of these pages outranks any snapshot in this skill, including
[references/spec.md](references/spec.md); when they disagree, trust the docs.
