import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { getCronSecret } from "@/src/lib/auth/account-deletion";
import { resolveUpstashRedisConfig } from "@/src/lib/config/upstash";

export const dynamic = "force-dynamic";

const KEEPALIVE_KEY = "internal:redis-keepalive:last-run";
const KEEPALIVE_TTL_SECONDS = 30 * 24 * 60 * 60;

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}

function hasValidCronAuthorization(request: Request, expectedSecret: string): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const provided = authHeader.slice("Bearer ".length).trim();
  return Boolean(provided) && provided === expectedSecret;
}

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: noStoreHeaders(),
    }
  );
}

async function runKeepalive(request: Request) {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return errorResponse("cron_not_configured", "Redis keepalive is not configured.", 503);
  }

  if (!hasValidCronAuthorization(request, cronSecret)) {
    return errorResponse("unauthorized", "Unauthorized", 401);
  }

  const { url, token } = resolveUpstashRedisConfig();
  if (!url || !token) {
    return errorResponse("redis_not_configured", "Upstash Redis is not configured.", 503);
  }

  const touchedAt = new Date().toISOString();

  try {
    const redis = new Redis({ url, token });
    await redis.set(KEEPALIVE_KEY, touchedAt, { ex: KEEPALIVE_TTL_SECONDS });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[redis-keepalive] Upstash keepalive failed.", { error: message });

    return errorResponse("redis_keepalive_failed", "Unable to touch Upstash Redis.", 503);
  }

  return NextResponse.json(
    {
      status: "ok",
      touchedAt,
    },
    {
      status: 200,
      headers: noStoreHeaders(),
    }
  );
}

export async function GET(request: Request) {
  return runKeepalive(request);
}

export async function POST(request: Request) {
  return runKeepalive(request);
}
