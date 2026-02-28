import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  getRequestIpFromHeaders,
  getRetryAfterSeconds,
  toUserAgentIdentifier,
} from "@/src/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}

export async function GET(request: Request) {
  const requestIp = getRequestIpFromHeaders(request.headers);
  const userAgentIdentifier = toUserAgentIdentifier(request.headers.get("user-agent"));
  const healthRateLimit = await enforceRateLimit("healthLive", [
    requestIp ? `ip:${requestIp}` : "",
    userAgentIdentifier,
    "route:healthLive",
  ]);

  if (healthRateLimit) {
    const retryAfter = getRetryAfterSeconds(healthRateLimit.retryAt);
    return NextResponse.json(
      {
        error: healthRateLimit.error,
        retryAt: healthRateLimit.retryAt,
      },
      {
        status: 429,
        headers: retryAfter
          ? {
              ...noStoreHeaders(),
              "Retry-After": retryAfter,
            }
          : noStoreHeaders(),
      }
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: noStoreHeaders(),
    }
  );
}
