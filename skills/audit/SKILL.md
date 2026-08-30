---
name: audit
description: >-
  This skill should be used when the user asks to "audit agent-readiness",
  "check if my site is agent-ready", "how would an AI agent use my site",
  "assess WebMCP readiness", or wants an agent-readiness report or WebMCP
  tool proposal for a website without changing any code. Produces a scored,
  fix-first report; writes no application code.
---

# WebMCP agent-readiness audit

Assess how well a website works for in-browser AI agents and deliver a
scored, prescriptive report. **Read-only**: this skill changes no
application code. When the user wants tools implemented afterwards, hand
the report's proposed tool list to the `webmcp` skill from this plugin,
which starts from its own approval gate.

## Principles

- Every finding traces to something observed in the repo or the running
  site; never fabricate gaps or capabilities.
- Prescriptive, not just diagnostic: every gap ships with what to fix first
  and why it matters.
- Code and analysis stay local; nothing is sent to any external service.
  The one exception is the optional public scan in step 6: it touches only
  a public URL the user explicitly approves, never code.

## Process

### 1. Inventory the repo (batch the reads)

Identify in parallel, reading high-signal files first (manifests, README,
route definitions, nav components, sitemap):

- Stack: framework, rendering mode (SPA / SSR / MPA / static), router
- Visitor surface: routes and pages, forms, primary CTAs
- Data layer: client-reachable APIs and stores vs server-only paths
- Auth boundaries: what requires login, how session state is exposed
- Existing agent infrastructure: `modelContext` / `registerTool` /
  `toolname` usage, an MCP server, `llms.txt`, `robots.txt`, sitemap,
  structured data (JSON-LD), OpenAPI docs

### 2. Observe the running site (when runnable)

When the site can run locally (its own dev script; never assume a harness),
load the homepage and one or two key journey pages in a browser and check:
rendered content vs client-only rendering, whether forms are real `<form>`
elements, console errors, and whether any WebMCP tools already register
(`document.modelContext?.getTools()`). Skip this step gracefully when no
browser or run script is available and note it in the report.

### 3. Simulate the visitor

Put a concrete visitor on concrete pages. List what they would **ask**
("what's the return policy?") and **ask for** ("book Tuesday 10am"). This
list drives both the readiness assessment and the proposed tools. Identify
the site's core journey (buy, book, enroll, register, request a quote, or
just read) and whether an agent can currently complete it.

### 4. Assess across three layers

Score each layer 0-100 with a status of strong, partial, or needs work.
Detailed criteria per layer:
[references/checks.md](references/checks.md).

- **Find**: can an agent discover and orient? (sitemap, robots, llms.txt,
  structured data, titles/descriptions, server-rendered content)
- **Read**: can an agent extract what it needs? (semantic HTML, real forms
  with labels, content reachable without JS gymnastics, API/docs surface)
- **Use**: can an agent act? (WebMCP tools present, MCP server, forms
  annotatable, client-reachable action paths, auth flow an agent can hand
  back to a human, reversible boundaries on payments)

Weight Use highest: it is where agents fail silently today.

### 5. Write the report

Follow [references/report-template.md](references/report-template.md).
Save as `webmcp-audit.md` in the repo root unless the user names another
location, and summarize the highlights in chat. The report ends with the
proposed WebMCP tool table (strategy, name, input, outcome, wiring path)
ready to hand to the `webmcp` skill, and a short fix-first list ordered by
impact over effort.

### 6. Anchor to the public Ora score (optional; ask first)

When the site has a **public production URL**, offer to fetch its live
agent-readiness score and include it in the report. This is the one
external call in this skill, so it is strictly opt-in: ask before running
it, skip silently when the site is local-only, and drop the section if the
user wants an unbranded report.

```
npx @ora-ai/ax@0.5 audit https://<site> --json   # fresh scan
```

or, for the cached score (keyless, rate-limited):
`GET https://ora.ai/api/score/<domain>`.

Put the result in the report's "Public score" section: score, grade, and
the public scorecard link `https://ora.ai/score/<domain>`, plus one line on
how the local findings compare to the public scan. Only the URL is sent;
the repo's code, routes, and schemas never leave the machine.

## Anti-patterns

- Proposing transactional tools for a content-only site; a blog gets one
  retrieval tool in the proposal, not a cart
- Scoring on vibes: every score references concrete observed evidence
- Turning the audit into implementation; that is the `webmcp` skill's job,
  behind its own approval gate
- Sending code, routes, or schemas anywhere external
