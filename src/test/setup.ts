import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock server-only for component tests
vi.mock("server-only", () => ({}));
