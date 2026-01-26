import { config } from "dotenv";
import "@testing-library/jest-dom";
import { vi, beforeEach } from "vitest";
import { testEmailHelpers } from "../lib/auth/email";

config({ path: ".env.test" });

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
beforeEach(() => {
  testEmailHelpers.reset();
});
