import "server-only";

import { createHash } from "node:crypto";
import { headers as getHeaders } from "next/headers";
import {
  AUTH_RATE_LIMIT_ERROR,
  AUTH_RATE_LIMIT_UNAVAILABLE_ERROR,
  formatRateLimitMessage,
  getAuthRateLimiter,
  getFailClosedDecision,
  getInMemoryRateLimiter,
  isInMemoryRateLimitFallbackEnabled,
  type AuthRateLimitAction,
  type RateLimiter,
} from "../ratelimit";
import { logAuthEvent } from "./logging";

export interface RateLimitResult {
  error: string;
  retryAt?: number;
}

type RateLimitIdentifierType = "ip" | "email" | "user" | "token" | "ua" | "unknown";

function getIdentifierType(identifier: string): RateLimitIdentifierType {
  if (identifier.startsWith("ip:")) return "ip";
  if (identifier.startsWith("email:")) return "email";
  if (identifier.startsWith("user:")) return "user";
  if (identifier.startsWith("token:")) return "token";
  if (identifier.startsWith("ua:")) return "ua";
  return "unknown";
}

function getIdentifierHash(identifier: string): string {
  return createHash("sha256").update(identifier).digest("hex");
}

function parseIpAddress(requestHeaders: Headers): string | null {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const realIp = requestHeaders.get("x-real-ip");
  const source = forwardedFor ?? realIp;
  if (!source) {
    return null;
  }
  const [first] = source.split(",");
  return first?.trim() ?? null;
}

export function getRequestIpFromHeaders(requestHeaders: Headers): string | null {
  return parseIpAddress(requestHeaders);
}

export async function getRequestIp(): Promise<string | null> {
  try {
    const requestHeaders = await getHeaders();
    return parseIpAddress(requestHeaders);
  } catch {
    return null;
  }
}

export async function getRequestUserAgent(): Promise<string | null> {
  try {
    const requestHeaders = await getHeaders();
    const userAgent = requestHeaders.get("user-agent");
    const normalized = userAgent?.trim();
    return normalized || null;
  } catch {
    return null;
  }
}

export function toEmailIdentifier(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().toLowerCase();
  return normalized ? `email:${normalized}` : "";
}

export function toHashedTokenIdentifier(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }
  const hashedToken = createHash("sha256").update(normalized).digest("hex");
  return `token:${hashedToken}`;
}

export function toUserAgentIdentifier(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  return `ua:${createHash("sha256").update(normalized).digest("hex")}`;
}

export function getRetryAfterSeconds(retryAt: number | undefined): string | null {
  if (!retryAt || retryAt <= Date.now()) {
    return null;
  }

  return Math.max(1, Math.ceil((retryAt - Date.now()) / 1000)).toString();
}

export async function enforceRateLimit(
  action: AuthRateLimitAction,
  identifiers: string[]
): Promise<RateLimitResult | null> {
  const limiter = getAuthRateLimiter(action);
  const allowFallback = isInMemoryRateLimitFallbackEnabled();
  let fallbackLimiter: RateLimiter | null = null;
  let loggedLimiterError = false;

  for (const identifier of identifiers) {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      continue;
    }

    let result;
    try {
      const activeLimiter = fallbackLimiter ?? limiter;
      result = await activeLimiter.limit(normalizedIdentifier);
    } catch (error) {
      if (!loggedLimiterError) {
        loggedLimiterError = true;
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[rate-limit] Upstash error; applying fallback policy.", {
          action,
          error: message,
          allowFallback,
        });
        logAuthEvent("rate_limit_upstash_error", {
          action,
          error: message,
          allowFallback,
        });
      }

      if (allowFallback) {
        if (!fallbackLimiter) {
          fallbackLimiter = getInMemoryRateLimiter(action);
        }
        result = await fallbackLimiter.limit(normalizedIdentifier);
      } else {
        result = getFailClosedDecision(action);
      }
    }

    if (!result.allowed) {
      const retryAfterSeconds =
        result.resetAt && result.resetAt > Date.now()
          ? Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
          : null;
      const logDetails = {
        action,
        identifierType: getIdentifierType(normalizedIdentifier),
        identifierHash: getIdentifierHash(normalizedIdentifier),
        limit: result.limit,
        remaining: result.remaining,
        retryAfterSeconds: retryAfterSeconds ?? undefined,
      };

      if (result.reason === "unavailable") {
        logAuthEvent("rate_limit_unavailable", logDetails);
      } else {
        logAuthEvent("rate_limit_blocked", logDetails);
      }

      const message =
        result.reason === "unavailable"
          ? AUTH_RATE_LIMIT_UNAVAILABLE_ERROR
          : result.resetAt
            ? formatRateLimitMessage(result.resetAt)
            : AUTH_RATE_LIMIT_ERROR;

      return {
        error: message,
        retryAt: result.resetAt,
      };
    }
  }

  return null;
}
