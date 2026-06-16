// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCronSecretMock = vi.hoisted(() => vi.fn());
const resolveUpstashRedisConfigMock = vi.hoisted(() => vi.fn());
const redisMocks = vi.hoisted(() => {
  const set = vi.fn();
  const Redis = vi.fn(function Redis() {
    return { set };
  });
  return { Redis, set };
});

vi.mock("@/src/lib/auth/account-deletion", () => ({
  getCronSecret: getCronSecretMock,
}));

vi.mock("@/src/lib/config/upstash", () => ({
  resolveUpstashRedisConfig: resolveUpstashRedisConfigMock,
}));

vi.mock("@upstash/redis", () => ({
  Redis: redisMocks.Redis,
}));

import { GET, POST } from "./route";

describe("POST /api/internal/redis/keepalive", () => {
  beforeEach(() => {
    getCronSecretMock.mockReset();
    resolveUpstashRedisConfigMock.mockReset();
    redisMocks.Redis.mockClear();
    redisMocks.set.mockReset();

    getCronSecretMock.mockReturnValue("secret-token");
    resolveUpstashRedisConfigMock.mockReturnValue({
      url: "https://example-upstash.upstash.io",
      token: "upstash-token",
    });
    redisMocks.set.mockResolvedValue("OK");
  });

  it("returns 503 when cron secret is not configured", async () => {
    getCronSecretMock.mockReturnValue(null);

    const response = await POST(new Request("https://example.com/api/internal/redis/keepalive"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("cron_not_configured");
    expect(redisMocks.Redis).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization is missing or invalid", async () => {
    const response = await POST(new Request("https://example.com/api/internal/redis/keepalive"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(redisMocks.Redis).not.toHaveBeenCalled();
  });

  it("returns 503 when Upstash Redis is not configured", async () => {
    resolveUpstashRedisConfigMock.mockReturnValue({ url: null, token: null });

    const response = await POST(
      new Request("https://example.com/api/internal/redis/keepalive", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("redis_not_configured");
    expect(redisMocks.Redis).not.toHaveBeenCalled();
  });

  it("touches Upstash Redis using a short-lived internal key", async () => {
    const response = await POST(
      new Request("https://example.com/api/internal/redis/keepalive", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.status).toBe("ok");
    expect(typeof body.touchedAt).toBe("string");
    expect(redisMocks.Redis).toHaveBeenCalledWith({
      url: "https://example-upstash.upstash.io",
      token: "upstash-token",
    });
    expect(redisMocks.set).toHaveBeenCalledWith(
      "internal:redis-keepalive:last-run",
      expect.any(String),
      { ex: 2592000 }
    );
  });

  it("returns 503 when the Redis touch fails", async () => {
    redisMocks.set.mockRejectedValueOnce(new Error("network unavailable"));

    const response = await POST(
      new Request("https://example.com/api/internal/redis/keepalive", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("redis_keepalive_failed");
  });
});

describe("GET /api/internal/redis/keepalive", () => {
  beforeEach(() => {
    getCronSecretMock.mockReset();
    resolveUpstashRedisConfigMock.mockReset();
    redisMocks.Redis.mockClear();
    redisMocks.set.mockReset();

    getCronSecretMock.mockReturnValue("secret-token");
    resolveUpstashRedisConfigMock.mockReturnValue({
      url: "https://example-upstash.upstash.io",
      token: "upstash-token",
    });
    redisMocks.set.mockResolvedValue("OK");
  });

  it("allows authorized GET requests for Vercel cron", async () => {
    const response = await GET(
      new Request("https://example.com/api/internal/redis/keepalive", {
        method: "GET",
        headers: { Authorization: "Bearer secret-token" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(redisMocks.set).toHaveBeenCalledTimes(1);
  });
});
