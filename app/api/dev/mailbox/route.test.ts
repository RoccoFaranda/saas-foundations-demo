// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDevMailboxMessagesMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/auth/dev-mailbox", () => ({
  getDevMailboxMessages: getDevMailboxMessagesMock,
}));

import { GET } from "./route";

describe("GET /api/dev/mailbox", () => {
  beforeEach(() => {
    getDevMailboxMessagesMock.mockReset();
  });

  it("returns 404 outside development", async () => {
    vi.stubEnv("NODE_ENV", "test");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload).toEqual({ error: "Not found" });

    vi.unstubAllEnvs();
  });

  it("returns reversed messages in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getDevMailboxMessagesMock.mockResolvedValue([
      {
        id: "m1",
        to: "first@example.com",
        subject: "First",
        html: "<p>first</p>",
        text: "first",
        createdAt: "2026-02-23T00:00:00.000Z",
      },
      {
        id: "m2",
        to: "second@example.com",
        subject: "Second",
        html: "<p>second</p>",
        text: "second",
        createdAt: "2026-02-23T00:01:00.000Z",
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload.messages).toEqual([
      expect.objectContaining({ id: "m2" }),
      expect.objectContaining({ id: "m1" }),
    ]);

    vi.unstubAllEnvs();
  });

  it("returns 500 when mailbox read fails", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getDevMailboxMessagesMock.mockRejectedValue(new Error("mailbox read failed"));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload).toEqual({ error: "Unable to read dev mailbox." });

    vi.unstubAllEnvs();
  });
});
