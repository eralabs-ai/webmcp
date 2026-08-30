export interface CliOptions {
  url: string;
  exec: string | undefined;
  input: Record<string, unknown>;
  json: boolean;
  headless: boolean;
  timeoutMs: number;
  chromeFlags: string[];
}

export const USAGE = `Usage: webmcp-verify <url> [options]

Launches Chrome with WebMCP enabled, opens <url>, lists the page's
registered WebMCP tools, and lints them. With --exec, also executes a tool
the way an agent would.

Options:
  --exec <tool>       execute this tool after listing
  --input <json>      JSON input object for --exec (default: {})
  --json              machine-readable JSON output
  --headless          run Chrome headless (default: headed)
  --timeout <ms>      page settle timeout (default: 10000)
  --chrome-flag <f>   extra Chrome flag (repeatable)
`;

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    url: "",
    exec: undefined,
    input: {},
    json: false,
    headless: false,
    timeoutMs: 10000,
    chromeFlags: [],
  };
  let rawInput: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value\n${USAGE}`);
      return value;
    };
    switch (arg) {
      case "--exec":
        options.exec = next();
        break;
      case "--input":
        rawInput = next();
        break;
      case "--json":
        options.json = true;
        break;
      case "--headless":
        options.headless = true;
        break;
      case "--timeout": {
        const ms = Number(next());
        if (!Number.isFinite(ms) || ms <= 0) {
          throw new Error(`--timeout must be a positive number of ms\n${USAGE}`);
        }
        options.timeoutMs = ms;
        break;
      }
      case "--chrome-flag":
        options.chromeFlags.push(next());
        break;
      default:
        if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}\n${USAGE}`);
        if (options.url) throw new Error(`Unexpected argument ${arg}\n${USAGE}`);
        options.url = arg;
    }
  }

  if (!options.url) throw new Error(`A url is required\n${USAGE}`);
  if (rawInput !== undefined) {
    if (!options.exec) throw new Error(`--input requires --exec\n${USAGE}`);
    try {
      options.input = JSON.parse(rawInput) as Record<string, unknown>;
    } catch {
      throw new Error(`--input is not valid JSON: ${rawInput}\n${USAGE}`);
    }
  }
  return options;
}
