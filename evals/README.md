# Eval suite

Cases for `claude plugin eval` (early access; enable it on the account,
then run from the repo root):

```
claude plugin eval . --allow-tools Bash Write Edit
```

Each case is a directory with `prompt.md` (the user request), optional
`case.yaml` (runs, limits, scaffold), and `graders/*.md` rubrics scored by
an LLM judge. `scaffold_script` copies the bookshop fixture
(`tests/fixtures/bookshop/`) into the scaffold dir so cases run against a
real site; pass `--scaffold` to enable it.

Status: CI runs the suite via `.github/workflows/evals.yml` on manual
dispatch and on PRs touching `skills/`, `evals/`, or `.claude-plugin/`,
gated on the `ANTHROPIC_API_KEY` repo secret (skipped cleanly when absent,
e.g. on forks). The account behind the key needs eval early access; until
that is enabled the run exits with "plugin eval is currently in early
access". Field names were authored against `claude plugin eval --help`;
re-verify with `claude plugin eval init --bare` once enabled.

Cases:

- `audit-readiness/` — the audit skill triggers, produces a scored
  find/read/use report, proposes few tools, writes no app code
- `implement-gate/` — the webmcp skill triggers and stops at the
  approval gate instead of writing files
