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

Status: authored against the shape documented by `claude plugin eval
--help`; not yet executed because the command is early access here.
Re-verify field names with `claude plugin eval init --bare` once enabled,
and adjust if the scaffolded template disagrees.

Cases:

- `audit-readiness/` — the audit skill triggers, produces a scored
  find/read/use report, proposes few tools, writes no app code
- `implement-gate/` — the webmcp skill triggers and stops at the
  approval gate instead of writing files
