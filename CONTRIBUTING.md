# Contributing to webmcp

Thanks for helping improve the WebMCP skill and the `@ora-ai/webmcp-bridge`
package.

## Setup

Requires Node >= 20. Two installs — the root holds the commit tooling
(husky/commitlint), the bridge package has its own lockfile:

```sh
npm install                                  # root: enables the git hooks
npm --prefix packages/webmcp-bridge install  # the published bridge package
```

## Working on a change

```sh
npm run check      # repo sanity checks (scripts/check.mjs)
npm run lint       # eslint over the bridge package
npm run typecheck  # tsc --noEmit over bridge src + tests
npm test           # vitest
```

The pre-push hook runs all four. CI additionally builds the bridge and
verifies the npm tarball it would publish.

## Commit messages and PR titles

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat: …`, `fix: …`, `chore(scope): …`) — the commit-msg hook enforces this
locally and CI backstops it on every PR. This repo squash-merges, so **your PR
title becomes the commit message on `main`** and is linted too.

## Skill content

`skills/webmcp/references/spec.md` is a dated snapshot of the living WebMCP
draft spec. Don't hand-edit spec claims — the `Spec Drift Watch` workflow
tracks upstream and opens an issue when the snapshot needs re-verifying.
