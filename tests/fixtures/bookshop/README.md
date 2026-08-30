# Fixture: Paged & Bound bookshop

A minimal static MPA for exercising this plugin's skills by hand or in
evals. Two pages, two real forms, two pre-registered imperative tools.

## Serve

```
cd tests/fixtures/bookshop
python3 -m http.server 8080   # or: npx serve .
```

WebMCP needs a secure context; localhost qualifies. For native tools,
use Chrome with `chrome://flags/#enable-webmcp-testing`; otherwise load
`@mcp-b/webmcp-polyfill` in the console before testing.

## What each skill should find

**audit** (read-only) — expected report shape:

- Find: partial. Titles/descriptions present; no `sitemap.xml`, no
  `robots.txt`, no `llms.txt`, no JSON-LD.
- Read: strong-ish. Semantic HTML, two real labeled `<form>`s, static
  content readable without JS.
- Use: partial. Two imperative tools already registered
  (`search_books` everywhere, `add_to_cart` contextual on book.html);
  forms not yet annotated declaratively; no MCP server; no checkout, so
  no payment-boundary findings.
- Proposal should stay small (3-5 tools) and must NOT invent checkout or
  booking tools this site does not support.

**webmcp** — reasonable approved plan:

- Declarative: annotate `#search-form` (`toolname="search_catalog"`,
  autosubmit acceptable) and `#newsletter-form` (no autosubmit debate is
  fine either way; it is low-risk).
- Imperative: keep the two existing tools; names must stay stable.

**verify** — expected ladder results:

- `search_books`: registered on both pages; read-only invocation returns
  matches for "rivers", empty-with-note for "zeppelin"; results render
  in `#results` on index.html (UI effect).
- `add_to_cart`: registered on book.html only, absent on index.html;
  invocation with `{"quantity": 2}` bumps `#cart-count` and returns the
  new count; `{"quantity": 0}` throws an actionable error.
- Security lint: both descriptions clean, `readOnlyHint` honest, no
  `toolautosubmit` on anything destructive (nothing destructive exists).
