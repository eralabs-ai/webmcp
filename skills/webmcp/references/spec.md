# WebMCP API contract (current spec snapshot)

Snapshot of https://webmachinelearning.github.io/webmcp/ plus Chrome's
origin-trial surface, taken 2026-08. When this file and the live spec
disagree, the live spec wins; re-check it before relying on edge details.

## Surface

- **`document.modelContext`** returns the `ModelContext` object. This is the
  only surface in the spec. It is `SecureContext`-gated: HTTPS or localhost.
- **`navigator.modelContext` is not in the spec.** Older implementations and
  some polyfills still expose it. Feature-detect in this order:

```js
function getModelContext() {
  if (typeof document !== "undefined" && document.modelContext) {
    return document.modelContext;
  }
  if (typeof navigator !== "undefined" && navigator.modelContext) {
    return navigator.modelContext; // legacy implementations only
  }
  return null;
}
```

## registerTool

```webidl
Promise<undefined> registerTool(
  ModelContextTool tool,
  optional ModelContextRegisterToolOptions options = {}
)
```

Tool descriptor:

| Field | Required | Contract |
| --- | --- | --- |
| `name` | yes | 1-128 chars, ASCII `[a-zA-Z0-9_.-]` only, unique; duplicate name **rejects the registration promise** |
| `description` | yes | non-empty; what it does, when to use it, what it returns |
| `execute` | yes | `async (input, { signal }) => any`; return must survive `JSON.stringify` |
| `title` | no | human-readable label |
| `inputSchema` | no | JSON Schema object; use `type: "object"`, describe every property, set `additionalProperties: false` |
| `annotations` | no | `{ readOnlyHint?: boolean, untrustedContentHint?: boolean }` |

Options:

| Field | Contract |
| --- | --- |
| `signal` | `AbortSignal`; aborting it **unregisters the tool**. This is the only unregistration mechanism: `unregisterTool()`, `provideContext()`, and `clearContext()` do not exist |
| `exposedTo` | list of origins allowed to see/call the tool from other documents; default is same-origin only |

Re-registering after abort requires a **new** `AbortController`.

## Introspection and self-testing

```webidl
Promise<sequence<RegisteredTool>> getTools(optional { fromOrigins })
Promise<DOMString> executeTool(RegisteredTool tool, optional object input, optional options)
```

`getTools()` sees registered tools across the document tree (subject to
origin exposure). `executeTool()` lets the page (or a console/test harness)
invoke a tool exactly as an agent would; use it for verification.

## Events

- `toolchange` fires on `ModelContext` when tools register or unregister
  (`ontoolchange` handler property is also defined).

## Cross-origin and iframes

- Permissions Policy feature name: **`"tools"`**, default allowlist `['self']`.
- A cross-origin iframe needs the parent to delegate:
  `<iframe src="https://widget.example" allow="tools">`.
- The iframe's tools become visible to other documents only for origins
  listed in `exposedTo`. Only secure (potentially trustworthy) origins are
  valid. Never list origins the site does not control.

## Declarative form API (Chrome origin trial)

The spec marks the declarative section TODO; the shipped behavior is
Chrome's origin trial (see the declarative-api explainer in the spec repo).

Form attributes:

| Attribute | On | Role |
| --- | --- | --- |
| `toolname` | `<form>` | tool id; removing it unregisters the tool |
| `tooldescription` | `<form>` | agent-facing purpose; also required for registration |
| `toolautosubmit` | `<form>` | boolean; agent may submit and navigate without a human click |
| `toolparamdescription` | controls / `<fieldset>` | property description in the synthesized schema; falls back to `<label>` text, then `aria-description` |

Schema synthesis: control `name` becomes the property name; `required`
carries into the schema; radio groups take their description from the
nearest parent `<fieldset>`.

Submit handling:

- `SubmitEvent.agentInvoked` is `true` when an agent triggered the submit.
- `event.respondWith(promise)` (after `preventDefault()`) returns a
  JSON-serializable result to the model instead of navigating.

```js
form.addEventListener("submit", (event) => {
  if (!event.agentInvoked) return;
  event.preventDefault();
  event.respondWith(runSearchAndReturnHits());
});
```

Events: `toolactivated` (agent pre-filled fields) and `toolcancel` (user
cancelled / `reset()`).
CSS state: `form:tool-form-active`, submit control `:tool-submit-active`.

## Browser availability (verify before promising)

- Chrome ships WebMCP behind an origin trial and flags
  (`chrome://flags` WebMCP entry / `--enable-features=WebMCP`; DevTools
  integration needs a recent Dev/Canary build). Edge tracks Chrome.
- Everything else needs `@mcp-b/webmcp-polyfill`.
- Availability moves quickly; check the Chrome docs listed in SKILL.md
  rather than trusting version numbers found in third-party READMEs.

## Removed / renamed things still found in old examples

| Seen in the wild | Status |
| --- | --- |
| `navigator.modelContext` as primary surface | replaced by `document.modelContext` |
| `unregisterTool(name)` | removed; abort the registration signal |
| `provideContext()` / `clearContext()` | removed |
| returning DOM nodes or class instances from `execute` | never valid; JSON-serializable only |
