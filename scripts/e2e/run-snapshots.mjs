import { spawnSync } from "node:child_process";
import process from "node:process";

const scopeToGrep = {
  all: "@visual",
  demo: "@visual-demo",
  landing: "@visual-landing",
  technical: "@visual-technical",
};

const validTargets = new Set(["win", "linux", "both"]);

function printHelp() {
  console.log(`Usage: pnpm test:e2e:snapshots -- [options]

Options:
  --scope <name>   Snapshot scope: landing | demo | technical | all (default: landing)
  --target <name>  Run target: win | linux | both (default: both)
  --grep <expr>    Custom Playwright grep expression (overrides --scope mapping)
  --help           Show this help

Examples:
  pnpm test:e2e:snapshots -- --scope landing --target linux
  pnpm test:e2e:snapshots -- --scope all --target both
  pnpm test:e2e:snapshots -- --grep @visual-demo --target win
`);
}

function parseArgs(argv) {
  const parsed = {
    grep: null,
    help: false,
    scope: "landing",
    target: "both",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--scope") {
      parsed.scope = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--target") {
      parsed.target = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--grep") {
      parsed.grep = argv[i + 1];
      i += 1;
      continue;
    }

    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }

  return parsed;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    env: options.env ?? process.env,
    stdio: "inherit",
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

function runWindows(grep, scopeLabel) {
  const updateOutput = `test-results-snapshots-win-${scopeLabel}-update`;
  const verifyOutput = `test-results-snapshots-win-${scopeLabel}-verify`;
  const baseArgs = ["exec", "playwright", "test", "--project=chromium", "--grep", grep];

  run("pnpm", [...baseArgs, "--update-snapshots", "--output", updateOutput], {
    env: { ...process.env, NEXT_DIST_DIR: ".next-e2e-win" },
  });
  run("pnpm", [...baseArgs, "--output", verifyOutput], {
    env: { ...process.env, NEXT_DIST_DIR: ".next-e2e-win" },
  });
}

function runLinux(grep, scopeLabel) {
  const outputPrefix = `test-results-snapshots-linux-${scopeLabel}`;
  run("docker", [
    "compose",
    "-p",
    "saas-foundations-playwright",
    "-f",
    "docker-compose.playwright.yml",
    "run",
    "--rm",
    "-e",
    `SNAPSHOT_GREP=${grep}`,
    "-e",
    `SNAPSHOT_OUTPUT_PREFIX=${outputPrefix}`,
    "playwright-linux",
  ]);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!validTargets.has(args.target)) {
    console.error(`Invalid --target "${args.target}". Use: win | linux | both`);
    process.exit(1);
  }

  const grep = args.grep ?? scopeToGrep[args.scope];
  if (!grep) {
    console.error(
      `Invalid --scope "${args.scope}". Use: ${Object.keys(scopeToGrep).join(" | ")} or pass --grep`
    );
    process.exit(1);
  }

  const scopeLabel = args.scope in scopeToGrep ? args.scope : "custom";
  if (args.target === "win" || args.target === "both") {
    runWindows(grep, scopeLabel);
  }
  if (args.target === "linux" || args.target === "both") {
    runLinux(grep, scopeLabel);
  }
}

main();
