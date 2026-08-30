# Runtime: native, polyfill, iframes

## Feature detection (always)

```js
export function getModelContext() {
  if (typeof document !== "undefined" && document.modelContext) {
    return document.modelContext;
  }
  if (typeof navigator !== "undefined" && navigator.modelContext) {
    return navigator.modelContext; // legacy implementations only
  }
  return null;
}

export function canRegisterWebMCP() {
  const mc = getModelContext();
  return Boolean(mc && typeof mc.registerTool === "function");
}
```

When `canRegisterWebMCP()` is false, log once and skip registration. Never
throw during app boot; the human UI must work in every browser.

Secure context is required: HTTPS in production, localhost in development.

## Native support

Chrome ships WebMCP behind an origin trial and flags (`chrome://flags`
WebMCP entry / `--enable-features=WebMCP`). Check the Chrome docs linked in
SKILL.md for the current channel and version; availability changes fast.
Prefer native when the target agent browser has it.

## Polyfill

When tools must work without native support:

```bash
npm install @mcp-b/webmcp-polyfill
```

Initialize **once**, before any registration, at the app entry:

```ts
import { initializeWebMCPPolyfill } from "@mcp-b/webmcp-polyfill";
initializeWebMCPPolyfill();
```

`@mcp-b/global` is the broader-runtime alternative. Prefer the smallest
package that provides `document.modelContext.registerTool`.

Declarative-only plans need no polyfill and no JS at all.

## No bundler (static sites, PHP/Rails/Django templates)

A bare import map or CDN `<script>` is fragile under CSP. Vendor the
polyfill file into the site's static assets and load it with a relative
`<script type="module">` before any registration module. Pin the version;
never hot-link an unpinned CDN build in production. Details for MPA wiring:
[frameworks/vanilla-mpa.md](frameworks/vanilla-mpa.md).

## Iframes and cross-origin

Permissions Policy feature `"tools"` defaults to `['self']`:

```html
<iframe src="https://widget.example" allow="tools"></iframe>
```

A child document sharing tools with its parent registers with an explicit
allowlist:

```js
await mc.registerTool(tool, {
  signal: controller.signal,
  exposedTo: ["https://parent.example"],
});
```

Only secure origins are valid in `exposedTo` / `fromOrigins`. Never expose
privileged tools to origins the site does not control.

## Do not

- Rely on `navigator.modelContext` alone in new code
- Call removed APIs: `unregisterTool()`, `provideContext()`, `clearContext()`
- Register the same name twice without aborting the first registration
- Ship the polyfill on pages that register nothing
