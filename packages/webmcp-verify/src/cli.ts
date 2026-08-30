#!/usr/bin/env node
import { parseArgs, USAGE } from "./cli-args.js";
import { openPage } from "./chrome.js";
import {
  executeTool,
  lintTools,
  listTools,
  type ExecuteResult,
  type LintFinding,
  type VerifiedTool,
} from "./verify.js";

interface Report {
  url: string;
  tools: VerifiedTool[];
  lint: LintFinding[];
  execution?: { tool: string; ok: boolean; result?: ExecuteResult; error?: string };
}

function printHuman(report: Report): void {
  if (report.tools.length === 0) {
    console.log("No WebMCP tools registered on this page.");
  } else {
    console.log(`${report.tools.length} tool(s) registered:\n`);
    for (const tool of report.tools) {
      const hints = tool.annotations
        ? ` [readOnly=${tool.annotations.readOnlyHint ?? "unset"}]`
        : " [no annotations]";
      console.log(`  ${tool.name}${hints}`);
      console.log(`    ${tool.description || "(no description)"}`);
    }
  }
  if (report.lint.length > 0) {
    console.log(`\nLint findings (${report.lint.length}):`);
    for (const finding of report.lint) {
      console.log(`  ${finding.tool}: ${finding.message}`);
    }
  }
  if (report.execution) {
    const exec = report.execution;
    if (exec.ok && exec.result) {
      console.log(`\nExecuted ${exec.tool}:`);
      console.log(JSON.stringify(exec.result.parsed, null, 2));
    } else {
      console.log(`\nExecuting ${exec.tool} FAILED: ${exec.error}`);
    }
  }
}

async function main(): Promise<number> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const options = parseArgs(process.argv.slice(2));
  const session = await openPage(options.url, {
    headless: options.headless,
    timeoutMs: options.timeoutMs,
    chromeFlags: options.chromeFlags,
  });
  try {
    const tools = await listTools(session);
    const report: Report = { url: options.url, tools, lint: lintTools(tools) };
    if (options.exec) {
      try {
        const result = await executeTool(session, options.exec, options.input);
        report.execution = { tool: options.exec, ok: true, result };
      } catch (error) {
        report.execution = {
          tool: options.exec,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else printHuman(report);
    const failed =
      report.lint.length > 0 || (report.execution ? !report.execution.ok : false);
    return failed ? 1 : 0;
  } finally {
    await session.close();
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  },
);
