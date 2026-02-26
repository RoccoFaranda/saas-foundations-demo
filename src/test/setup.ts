import { config } from "dotenv";
import "@testing-library/jest-dom";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { vi, beforeEach } from "vitest";

config({ path: ".env.test" });

const unitMailboxPath = path.join(process.cwd(), ".dev-mailbox.unit.json");
process.env.DEV_MAILBOX_PATH = process.env.DEV_MAILBOX_PATH ?? unitMailboxPath;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests. Set it in .env.test.");
}

if (!process.env.TOKEN_HASH_SECRET) {
  // Use a test secret for tests (not for production)
  process.env.TOKEN_HASH_SECRET = "test_token_hash_secret_do_not_use_in_production";
}

// Mock server-only for component tests
vi.mock("server-only", () => ({}));

// Reset test email mailbox before each test
beforeEach(async () => {
  await writeFile(process.env.DEV_MAILBOX_PATH ?? unitMailboxPath, "[]\n", "utf8");
  const { testEmailHelpers } = await import("../lib/auth/email");
  testEmailHelpers.reset();
});
