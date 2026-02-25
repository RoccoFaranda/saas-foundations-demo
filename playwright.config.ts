import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const testEnvPath = path.resolve(process.cwd(), ".env.test");
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath, override: true });
}

const defaultE2eDistDir = process.platform === "win32" ? ".next-e2e-win" : ".next-e2e-linux";
const e2eOutputDir = process.env.PW_OUTPUT_DIR ?? "test-results-e2e";
const configuredWorkers = process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : undefined;

export default defineConfig({
  testDir: "./e2e",
  outputDir: e2eOutputDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: configuredWorkers ?? (process.env.CI ? 1 : undefined),
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      PORT: "3001",
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? defaultE2eDistDir,
      TURNSTILE_ALLOW_BYPASS: process.env.TURNSTILE_ALLOW_BYPASS ?? "true",
      NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS: process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS ?? "false",
    },
  },
});
