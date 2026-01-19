import "dotenv/config";
import "@testing-library/jest-dom";
import { vi } from "vitest";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/saas_foundations_dev?schema=public";
}

// Mock server-only for component tests
vi.mock("server-only", () => ({}));
