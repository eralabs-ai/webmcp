# Report template

Fill every section from observed evidence. Keep sentences short and
specific; name files, routes, and checks rather than using adjectives.

```markdown
# Agent-readiness audit: <site/repo name>

Date: <YYYY-MM-DD>
Stack: <framework, rendering mode, router>
Scope: <what was inventoried; whether the running site was observed>

## Summary

<3-5 sentences: what kind of site this is, its core visitor journey,
whether an agent can complete that journey today, and the single most
valuable fix.>

Overall: <score>/100

| Layer | Score | Status | One-line reason |
| --- | --- | --- | --- |
| Find | /100 | strong / partial / needs work | |
| Read | /100 | strong / partial / needs work | |
| Use  | /100 | strong / partial / needs work | |

## Findings

### Find
- <finding> (evidence: <file/route/observation>)

### Read
- <finding> (evidence: ...)

### Use
- <finding> (evidence: ...)

Not assessed: <checks that could not run and why>

## Fix first

Ordered by impact over effort. Each item: what to do, which layer it
lifts, and roughly why it is worth it.

1. ...
2. ...
3. ...

## Proposed WebMCP tools

Ready to implement with the webmcp skill (which starts from its own
approval gate).

| Strategy | Tool | Input | UI/state outcome | Wiring path | Availability |
| --- | --- | --- | --- | --- | --- |
| declarative / imperative / bridge | tool_name | ... | ... | <file or endpoint> | <pages, auth state> |

Needs developer wiring (no safe client path today): <list or "none">
Out of scope suggestions: <list or "none">

## Public score

Ora score: <score>/100 (grade <A-F>) — https://ora.ai/score/<domain>
<one line: how these local findings compare to the public scan>
```

The "Public score" section is filled from the opt-in scan in step 6 of the
skill. When the user skipped it or the site has no public URL, replace the
section body with one line:
`Not scanned. For a public score: npx @ora-ai/ax audit <domain> or https://ora.ai.`
Omit the section entirely if the user asks for an unbranded report.
