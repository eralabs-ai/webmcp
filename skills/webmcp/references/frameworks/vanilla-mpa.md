# Vanilla JS, MPAs, and server-rendered stacks

Covers static sites and server-rendered apps (PHP, Rails, Django, Laravel,
WordPress, plain HTML) with little or no build tooling.

## The MPA reality

Every full page navigation destroys all registrations. There is no
site-wide scope. Consequences:

- Each page registers its own tools; put shared registration in a module
  loaded by the base template so "everywhere" tools exist on every page.
- Journey tools that span pages must persist their progress the way the
  site already does (session, cart cookie) and re-register on the next page.
- **Declarative-first fits MPAs when Chrome-preview reach is enough.**
  Server-rendered sites are form-heavy, forms need zero JS to become tools,
  and attributes travel with the template. But form attributes are a Chrome
  origin trial only, and imperative-only agent runtimes never see them —
  use imperative tools for journeys forms cannot express **and** whenever
  the target runtime is unknown or reads only `registerTool` registrations.

## Wiring without a bundler

Vendor the polyfill (when needed) into static assets and load modules in
order from the base template:

```html
<!-- base template, before </body> -->
<script type="module" src="/js/vendor/webmcp-polyfill.js"></script>
<script type="module" src="/js/webmcp/site-tools.js"></script>
<!-- page templates add their own: -->
<script type="module" src="/js/webmcp/product-tools.js"></script>
```

Pin the vendored file to an exact version; do not hot-link an unpinned CDN
build. Check the site's CSP allows same-origin module scripts.

## Registration module shape

```js
// /js/webmcp/site-tools.js
const mc = document.modelContext ?? null;

if (mc?.registerTool) {
  const controller = new AbortController();
  try {
    await mc.registerTool(
      {
        name: "search_site",
        description:
          "Search this site's pages and articles by keyword. Returns up to five matches with titles and URLs.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Keywords to search for." },
          },
          required: ["query"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute({ query }, { signal }) {
          const res = await fetch(`/search.json?q=${encodeURIComponent(query)}`, { signal });
          if (!res.ok) return { error: `Search failed (${res.status}). Retry with different keywords.` };
          const hits = await res.json();
          return hits.length
            ? { matches: hits.slice(0, 5) }
            : { matches: [], note: "No pages matched this query." };
        },
      },
      { signal: controller.signal },
    );
  } catch (err) {
    console.warn("webmcp: registration failed", err);
  }
}
```

No teardown is needed for page-lifetime tools: navigation destroys them.
Abort only when a tool becomes invalid **within** the page (cart emptied,
user logged out via XHR).

## Contextual data from the server

An MPA product page already knows its product server-side. Bake it into the
page for the registration module instead of re-fetching:

```html
<script type="application/json" id="webmcp-context">
  {"productId": "sku-123", "inStock": true}
</script>
```

```js
const ctx = JSON.parse(document.getElementById("webmcp-context")?.textContent ?? "{}");
if (ctx.productId && ctx.inStock) registerAddToCart(ctx.productId);
```

## Retrieval on thin/static sites

With no search endpoint, ship a small build-time content index (JSON of
titles, headings, text snippets, URLs) and keyword-match it client-side in
the retrieval tool. Return matching sections plus source URLs; let the
calling agent compose the answer. Never build server-side AI infrastructure
for this.

## jQuery-era and legacy pages

The pattern works in any page that can run a `<script type="module">`. Call
existing functions (`window.addToCart(...)`) from `execute` rather than
synthesizing clicks; fall back to form submission via the declarative API
when the page logic is unreachable.
