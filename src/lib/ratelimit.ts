import "server-only";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type AuthRateLimitAction = "signup" | "login" | "resendVerificationEmail" | "forgotPassword";

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  limit(identifier: string): Promise<RateLimitDecision>;
}

export type RateLimiterFactory = (action: AuthRateLimitAction) => RateLimiter;

export const AUTH_RATE_LIMIT_ERROR = "Too many requests. Please wait a few minutes and try again.";

const AUTH_RATE_LIMITS: Record<
  AuthRateLimitAction,
  { limit: number; window: Duration; windowMs: number }
> = {
  signup: { limit: 3, window: "10 m", windowMs: 10 * 60 * 1000 },
  login: { limit: 5, window: "1 m", windowMs: 60 * 1000 },
  resendVerificationEmail: { limit: 3, window: "10 m", windowMs: 10 * 60 * 1000 },
  forgotPassword: { limit: 3, window: "10 m", windowMs: 10 * 60 * 1000 },
};

const limiterCache = new Map<AuthRateLimitAction, RateLimiter>();
let testLimiterFactory: RateLimiterFactory | null = null;
let warnedMissingUpstashEnv = false;

export function setRateLimiterFactoryForTests(factory: RateLimiterFactory | null): void {
  testLimiterFactory = factory;
  limiterCache.clear();
}

function hasUpstashEnv(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function createInMemoryRateLimiter(limit: number, windowMs: number): RateLimiter {
  const entries = new Map<string, { count: number; resetAt: number }>();

  return {
    async limit(identifier: string) {
      const now = Date.now();
      const entry = entries.get(identifier);

      if (!entry || now >= entry.resetAt) {
        const resetAt = now + windowMs;
        entries.set(identifier, { count: 1, resetAt });
        return { allowed: true, limit, remaining: limit - 1, resetAt };
      }

      if (entry.count >= limit) {
        return { allowed: false, limit, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count += 1;
      return {
        allowed: true,
        limit,
        remaining: Math.max(limit - entry.count, 0),
        resetAt: entry.resetAt,
      };
    },
  };
}

function createUpstashRateLimiter(
  action: AuthRateLimitAction,
  limit: number,
  window: Duration
): RateLimiter {
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `auth:${action}`,
  });

  return {
    async limit(identifier: string) {
      const response = await ratelimit.limit(identifier);
      return {
        allowed: response.success,
        limit: response.limit,
        remaining: response.remaining,
        resetAt: response.reset,
      };
    },
  };
}

export function getAuthRateLimiter(action: AuthRateLimitAction): RateLimiter {
  if (testLimiterFactory) {
    return testLimiterFactory(action);
  }

  const cached = limiterCache.get(action);
  if (cached) {
    return cached;
  }

  const config = AUTH_RATE_LIMITS[action];
  const hasEnv = hasUpstashEnv();
  if (process.env.NODE_ENV === "production" && !hasEnv && !warnedMissingUpstashEnv) {
    warnedMissingUpstashEnv = true;
    console.warn("[rate-limit] Upstash env not configured; falling back to in-memory limiter.");
  }

  const limiter =
    process.env.NODE_ENV !== "test" && hasEnv
      ? createUpstashRateLimiter(action, config.limit, config.window)
      : createInMemoryRateLimiter(config.limit, config.windowMs);

  limiterCache.set(action, limiter);
  return limiter;
}
