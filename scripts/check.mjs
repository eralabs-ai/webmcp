#!/usr/bin/env node
// Repo sanity checks: manifest validity, version sync across the three
// platform manifests, skill frontmatter, relative markdown link integrity,
// and the spec snapshot pin. Zero dependencies; run locally or in CI:
//   node scripts/check.mjs
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const errors = [];
const fail = (msg) => errors.push(msg);

// --- 1. Manifests parse ---------------------------------------------------
const manifestPaths = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".codex-plugin/plugin.json",
  ".agents/plugins/marketplace.json",
];
const manifests = {};
for (const p of manifestPaths) {
  try {
    manifests[p] = JSON.parse(readFileSync(join(root, p), "utf8"));
  } catch (e) {
    fail(`${p}: invalid JSON (${e.message})`);
  }
}

// --- 2. Name and version sync ---------------------------------------------
const claude = manifests[".claude-plugin/plugin.json"];
const market = manifests[".claude-plugin/marketplace.json"];
const codex = manifests[".codex-plugin/plugin.json"];
if (claude && market && codex) {
  const entry = market.plugins?.find((pl) => pl.name === claude.name);
  if (!entry) fail(`marketplace.json: no plugin entry named "${claude.name}"`);
  const versions = {
    ".claude-plugin/plugin.json": claude.version,
    ".claude-plugin/marketplace.json (plugin entry)": entry?.version,
    ".codex-plugin/plugin.json": codex.version,
  };
  const distinct = new Set(Object.values(versions).filter(Boolean));
  if (distinct.size !== 1) {
    fail(`version mismatch across manifests: ${JSON.stringify(versions)}`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(claude.version ?? "")) {
    fail(`plugin.json: version "${claude.version}" is not plain semver`);
  }
  if (codex.name !== claude.name) {
    fail(`codex plugin name "${codex.name}" != claude plugin name "${claude.name}"`);
  }
}

// --- 3. Skill frontmatter ---------------------------------------------------
const skillsDir = join(root, "skills");
const skillDirs = readdirSync(skillsDir).filter((d) =>
  statSync(join(skillsDir, d)).isDirectory(),
);
if (skillDirs.length === 0) fail("skills/: no skills found");
for (const dir of skillDirs) {
  const skillPath = join(skillsDir, dir, "SKILL.md");
  if (!existsSync(skillPath)) {
    fail(`skills/${dir}: missing SKILL.md`);
    continue;
  }
  const text = readFileSync(skillPath, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) {
    fail(`skills/${dir}/SKILL.md: missing YAML frontmatter`);
    continue;
  }
  const name = fm[1].match(/^name:\s*(\S+)\s*$/m)?.[1];
  if (name !== dir) {
    fail(`skills/${dir}/SKILL.md: frontmatter name "${name}" != directory name`);
  }
  if (!/^description:/m.test(fm[1])) {
    fail(`skills/${dir}/SKILL.md: missing description`);
  }
}

// --- 4. Relative markdown links resolve -------------------------------------
function mdFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return mdFiles(p);
    return e.name.endsWith(".md") ? [p] : [];
  });
}
const docs = [...mdFiles(skillsDir), join(root, "README.md")];
for (const file of docs) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = m[1].split("#")[0].trim();
    if (!target || /^[a-z]+:/.test(target) || target.startsWith("/")) continue;
    if (!existsSync(resolve(dirname(file), target))) {
      fail(`${file.slice(root.length + 1)}: broken link -> ${target}`);
    }
  }
}

// --- 5. Spec snapshot pin ----------------------------------------------------
const spec = readFileSync(join(root, "skills/webmcp/references/spec.md"), "utf8");
if (!/^Snapshot: \d{4}-\d{2}-\d{2}$/m.test(spec)) {
  fail("skills/webmcp/references/spec.md: missing 'Snapshot: YYYY-MM-DD' pin");
}

// --- Report ------------------------------------------------------------------
if (errors.length) {
  console.error(`FAIL (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `OK: ${manifestPaths.length} manifests, ${skillDirs.length} skills, ${docs.length} markdown files checked`,
);
