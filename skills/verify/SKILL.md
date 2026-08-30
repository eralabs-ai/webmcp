---
name: verify
description: >-
  This skill should be used when the user asks to "verify WebMCP tools",
  "test document.modelContext tools", "check that page tools register", or
  after implementing WebMCP tools that need browser verification. Runs a
  registration, invocation, and security-lint ladder against a locally
  running site and reports every tool as verified, failed, or
  could-not-verify.
---

# Verify WebMCP tools

Runtime check that a site's WebMCP tools register and work as designed.
Runs standalone on any site with existing tools, and serves as step 5 of
this plugin's `webmcp` skill.

Treat tools like a public API: a tool is done when an agent can call it,
not when the build passes.

## Prerequisites

- The site runs locally (its own dev script or runbook; never assume a
  harness exists).
- A browser with WebMCP active: Chrome with the WebMCP flag/origin trial
  (`--enable-features=WebMCP`), or the site loads
  `@mcp-b/webmcp-polyfill`.
- Preferred driver: **Chrome DevTools MCP** (`list_webmcp_tools`,
  `execute_webmcp_tool`; recent Dev/Canary builds expose them). No DevTools
  MCP available: use the console fallback below with any browser
  automation available, or hand the user the snippets to run.

## The ladder

Run in order; navigation is the expensive unit, so visit each page and
auth state once and settle everything for that page in one pass.

1. **Boot.** Site starts; baseline page renders; no new console errors
   versus a clean load.
2. **Discover.** On each page and auth state where tools are declared
   (check anonymous and signed-in where relevant): list registered tools.
   Confirm each tool is present where declared, **absent** where it should
   not be (logged-out account tools), gone after its declared exits
   (logout, emptied cart), and re-registered correctly after client-side
   route changes (SPA contextual tools must not point at the previous
   entity). Compare names and schemas against the approved plan when one
   exists.
3. **Invoke read-only.** Call every read-only tool with realistic inputs.
   Assert the returned payload (JSON-serializable, useful, empty results
   carry an explanatory note) and the visible UI effect where one is
   declared. Also probe one invalid input per tool: the error must be
   actionable, not a silent empty success.
4. **Invoke state-changing.** Only against local/dev/seeded data and with
   the user's explicit go-ahead. Never fire writes at production or
   third-party services. Assert both the state change and the visible
   effect. No safe way to invoke: mark could-not-verify.
5. **Security lint.** Static pass over registrations:
   - `readOnlyHint` true only for tools with no state change
   - `untrustedContentHint` true wherever returns carry UGC
   - no agent instructions, secrets, or URLs-to-elsewhere in names,
     titles, or descriptions
   - destructive/payment tools stop at a reversible boundary and
     declarative destructive forms omit `toolautosubmit`
   - `exposedTo` lists only origins the site controls

## Console fallback

```js
const mc = document.modelContext ?? navigator.modelContext;
const tools = await mc.getTools();
console.table(tools.map((t) => ({ name: t.name, description: t.description })));

const tool = tools.find((t) => t.name === "search_docs");
await mc.executeTool(tool, { query: "webmcp" });
```

`getTools()` / `executeTool()` are spec APIs: the page can be driven
exactly as an agent would drive it from any console or automation harness.

## Failure cheatsheet

| Symptom | Likely cause |
| --- | --- |
| Empty tool list | no `modelContext` (flag/polyfill missing), insecure context, registration module not loaded on this page |
| Tool missing after navigation | aborted on unmount without re-register on the new page/route |
| Tool targets the wrong entity | contextual tool not re-registered on param change |
| Duplicate-name rejection | re-registered without aborting the previous controller |
| Execute error | input schema mismatch, throw inside `execute` |
| Null/failed result | non-JSON-serializable return or rejected promise |

## Report

One state per tool, in a table: **verified** (note the rung reached),
**failed** (must be fixed or dropped; never ship known-broken), or
**could-not-verify** (ships flagged, with the reason). Restate
could-not-verify items and any security-lint findings in the closing
summary.
