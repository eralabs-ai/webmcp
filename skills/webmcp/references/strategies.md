# Strategies: how each journey ships

Three ways to expose a journey. Mixing is fine; overlapping is not. Never
register two tools for the same job across strategies.

## Declarative: annotate existing forms

Add `toolname` / `tooldescription` (plus `toolparamdescription` on vague
fields) to real `<form>` elements. The browser synthesizes the schema and
fills fields visibly; humans see the same form as before; browsers without
WebMCP ignore the attributes entirely.

**Fit:** the site already has genuine HTML forms (search, contact, filters,
booking steps that are real `<form>`s) and visible fill-in is the desired
UX. Fastest strategy, zero JS, works on MPAs with no bundler.

**Not a fit:** click-handler "forms" with no `<form>` element, or multi-step
tunnels that should collapse into one agent call.

Implementation: [declarative-forms.md](declarative-forms.md).

## Imperative: craft dedicated journey tools

`registerTool` packages a real journey, not a 1:1 map of today's UI. A
4-step checkout becomes **one** tool registered on step 1 that persists the
selections and lands the user on the review/pay step; four chained form
tools would be the anti-pattern.

**Fit:** the agent should complete a job that humans do across several
screens, or `execute` needs the app's stores, APIs, and router.

Requires the planning pass in [tool-design.md](tool-design.md): scenario,
input, UI outcome, state outcome, availability, boundary for irreversible
steps.

## Bridge: reuse an existing remote MCP server

When the product already ships a Streamable HTTP / SSE MCP server, its tools
and journeys are already designed. Bridge them onto `document.modelContext`
so browsing agents see them on the page: the `webmcp-proxy` library when you
control the frontend, or Cloudflare's zero-code WebMCP toggle when the site
is served through Cloudflare. Do not hand-wrap each remote tool.
Implementation and checklists: [bridge-existing-mcp.md](bridge-existing-mcp.md).

Trade-offs to state out loud:

- Fast to ship: install, point at the MCP URL, done.
- No in-page visual feedback: the DOM does not fill or navigate.
- Credentials: when the MCP server uses the **same OAuth client** as the
  webapp, the proxy can ride the user's existing session instead of
  inventing a second auth path. Confirm CORS and the OAuth client with the
  user before wiring anything.

## Journey selection guardrails

- Think in journeys (find product, in cart, booked, answered), never in
  endpoints. The agent picks tools by name + description alone.
- One goal-shaped tool with parameters beats near-duplicates: one
  `search_products` with filters, never `search_by_color` + `search_by_size`.
- Live sites converge on **3-10 tools**. Every extra tool dilutes selection.
- A read-only retrieval tool that answers visitor questions from the site's
  own content is worth having on almost every site (wrap the existing search
  API or a content bundle; never build new AI infrastructure for it).
- **Content-only sites are the over-proposal trap.** A blog, portfolio, or
  brochure gets the retrieval tool and stops. Inventing carts, bookings, or
  a fleet of nav tools there is the classic failure.
- The conversion-entry tool (checkout, book, enroll, register) stays
  registered for anonymous visitors; that is where the journey starts.
  Account tools register on login and abort on logout.

## Typical mixes

| Mix | Reason |
| --- | --- |
| Bridge + Imperative | proxy for coverage, 1-2 hand-crafted money paths with real UI feedback |
| Declarative + Imperative | annotate the simple forms, collapse the tunnel |
| Bridge + Declarative | MCP tools for product actions, page forms for contact/marketing |

Keep the first ship small: the smallest set that makes the core journey
completable by an agent.
