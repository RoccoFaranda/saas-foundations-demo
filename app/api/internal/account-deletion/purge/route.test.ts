// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCronSecretMock = vi.hoisted(() => vi.fn());
const getAccountDeletionPurgeBatchSizeMock = vi.hoisted(() => vi.fn());
const logAuthEventMock = vi.hoisted(() => vi.fn());
const userFindManyMock = vi.hoisted(() => vi.fn());
const userDeleteManyMock = vi.hoisted(() => vi.fn());
const userCountMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/auth/account-deletion", () => ({
  getCronSecret: getCronSecretMock,
  getAccountDeletionPurgeBatchSize: getAccountDeletionPurgeBatchSizeMock,
}));

vi.mock("@/src/lib/auth/logging", () => ({
  logAuthEvent: logAuthEventMock,
}));

vi.mock("@/src/lib/db", () => ({
  default: {
    user: {
      findMany: userFindManyMock,
      deleteMany: userDeleteManyMock,
      count: userCountMock,
    },
  },
}));

import { GET, POST } from "./route";

describe("POST /api/internal/account-deletion/purge", () => {
  beforeEach(() => {
    getCronSecretMock.mockReset();
    getAccountDeletionPurgeBatchSizeMock.mockReset();
    logAuthEventMock.mockReset();
    userFindManyMock.mockReset();
    userDeleteManyMock.mockReset();
    userCountMock.mockReset();

    getCronSecretMock.mockReturnValue("secret-token");
    getAccountDeletionPurgeBatchSizeMock.mockReturnValue(100);
    userFindManyMock.mockResolvedValue([]);
    userDeleteManyMock.mockResolvedValue({ count: 0 });
    userCountMock.mockResolvedValue(0);
  });

  it("returns 503 when cron secret is not configured", async () => {
    getCronSecretMock.mockReturnValue(null);

    const response = await POST(
      new Request("https://example.com/api/internal/account-deletion/purge")
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("not configured");
  });

  it("returns 401 when authorization is missing or invalid", async () => {
    const response = await POST(
      new Request("https://example.com/api/internal/account-deletion/purge")
    );
    expect(response.status).toBe(401);
  });

  it("returns zero purge when there are no due users", async () => {
    const response = await POST(
      new Request("https://example.com/api/internal/account-deletion/purge", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        purged: 0,
        remainingDue: 0,
        batchSize: 100,
      })
    );
    expect(userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("purges due users in a batch and reports remaining", async () => {
    userFindManyMock.mockResolvedValueOnce([{ id: "user-1" }, { id: "user-2" }]);
    userDeleteManyMock.mockResolvedValueOnce({ count: 2 });
    userCountMock.mockResolvedValueOnce(5);

    const response = await POST(
      new Request("https://example.com/api/internal/account-deletion/purge", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(userDeleteManyMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual(
      expect.objectContaining({
        purged: 2,
        remainingDue: 5,
        batchSize: 100,
      })
    );
    expect(logAuthEventMock).toHaveBeenCalledWith(
      "delete_account_purged",
      expect.objectContaining({ purged: 2, remainingDue: 5, batchSize: 100 })
    );
  });
});

describe("GET /api/internal/account-deletion/purge", () => {
  beforeEach(() => {
    getCronSecretMock.mockReset();
    getAccountDeletionPurgeBatchSizeMock.mockReset();
    logAuthEventMock.mockReset();
    userFindManyMock.mockReset();
    userDeleteManyMock.mockReset();
    userCountMock.mockReset();

    getCronSecretMock.mockReturnValue("secret-token");
    getAccountDeletionPurgeBatchSizeMock.mockReturnValue(100);
    userFindManyMock.mockResolvedValue([]);
    userDeleteManyMock.mockResolvedValue({ count: 0 });
    userCountMock.mockResolvedValue(0);
  });

  it("returns 401 when authorization is missing", async () => {
    const response = await GET(
      new Request("https://example.com/api/internal/account-deletion/purge")
    );

    expect(response.status).toBe(401);
  });

  it("allows authorized GET requests for Vercel cron", async () => {
    const response = await GET(
      new Request("https://example.com/api/internal/account-deletion/purge", {
        method: "GET",
        headers: { Authorization: "Bearer secret-token" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        purged: 0,
        remainingDue: 0,
        batchSize: 100,
      })
    );
  });
});
