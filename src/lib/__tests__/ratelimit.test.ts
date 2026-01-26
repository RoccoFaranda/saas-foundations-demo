// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthRateLimiter, setRateLimiterFactoryForTests } from "../ratelimit";

describe("getAuthRateLimiter in production", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK", "");
    setRateLimiterFactoryForTests(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    setRateLimiterFactoryForTests(null);
  });

  it("fails closed when env is missing and fallback is disabled", async () => {
    vi.stubEnv("ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK", "false");
    const limiter = getAuthRateLimiter("login");
    const result = await limiter.limit("ip:203.0.113.10");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toBe("unavailable");
  });

  it("uses in-memory when env is missing and fallback is enabled", async () => {
    vi.stubEnv("ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK", "true");
    const limiter = getAuthRateLimiter("login");
    const result = await limiter.limit("ip:203.0.113.10");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeLessThan(result.limit);
  });
});
