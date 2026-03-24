// @vitest-environment node
import { describe, expect, it } from "vitest";

import { resolveUpstashRedisConfig } from "../config/upstash";

describe("resolveUpstashRedisConfig", () => {
  it("uses explicit Upstash env names when present", () => {
    const result = resolveUpstashRedisConfig({
      UPSTASH_REDIS_REST_URL: "https://explicit.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "explicit-token",
      KV_REST_API_URL: "https://kv.upstash.io",
      KV_REST_API_TOKEN: "kv-token",
    });

    expect(result).toEqual({
      url: "https://explicit.upstash.io",
      token: "explicit-token",
    });
  });

  it("falls back to Vercel KV env names", () => {
    const result = resolveUpstashRedisConfig({
      KV_REST_API_URL: "https://kv.upstash.io",
      KV_REST_API_TOKEN: "kv-token",
    });

    expect(result).toEqual({
      url: "https://kv.upstash.io",
      token: "kv-token",
    });
  });
});
