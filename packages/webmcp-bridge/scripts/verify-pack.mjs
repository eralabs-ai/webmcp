#!/usr/bin/env node
// Verifies the publishable tarball before it reaches npm.
//
// The failure this exists to catch is publishing without a build: `npm publish`
// happily ships a tarball with no `dist/`, and the broken version can never be
// reused. Every entry point that package.json `exports` promises (js + types)
// must be present and non-trivial in the tarball.
//
// Also asserts no .env slips in. Adapted from ora-cli's verify-pack.mjs.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// A truncated or empty module would still be "present"; this floor only
// catches something that went badly wrong.
const MIN_ENTRY_BYTES = 64;

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const stdout = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});

const [tarball] = JSON.parse(stdout);
const byPath = new Map(tarball.files.map((file) => [file.path, file]));

console.log(
  `tarball: ${tarball.name}@${tarball.version} — ${tarball.entryCount} files, ${tarball.size} bytes`,
);

const problems = [];

// Flatten exports into the concrete file paths consumers will resolve.
const entryPoints = [];
for (const [subpath, targets] of Object.entries(pkg.exports)) {
  for (const [condition, target] of Object.entries(targets)) {
    entryPoints.push({ label: `${subpath} (${condition})`, path: target.replace(/^\.\//, "") });
  }
}

for (const { label, path } of entryPoints) {
  const entry = byPath.get(path);
  if (!entry) {
    problems.push(`exports ${label} -> ${path} is missing — did the build run?`);
    continue;
  }
  if (entry.size < MIN_ENTRY_BYTES) {
    problems.push(`exports ${label} -> ${path} is only ${entry.size} bytes; the build looks truncated`);
  }
}

for (const path of byPath.keys()) {
  if (path === ".env" || (path.startsWith(".env.") && path !== ".env.example")) {
    problems.push(`${path} must not be published`);
  }
}

if (problems.length > 0) {
  console.error(`\npack verification failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log("pack verified");
