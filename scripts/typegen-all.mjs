import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const distDirs = [undefined, ".next-e2e-win", ".next-e2e-linux"];

for (const distDir of distDirs) {
  const env = { ...process.env };
  if (distDir) {
    env.NEXT_DIST_DIR = distDir;
  } else {
    delete env.NEXT_DIST_DIR;
  }

  const result = spawnSync(process.execPath, [nextBin, "typegen"], {
    stdio: "inherit",
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
