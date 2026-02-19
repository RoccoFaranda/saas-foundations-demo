import { NextResponse } from "next/server";
import { handlers } from "@/src/lib/auth/config";
import {
  enforceRateLimit,
  getRequestIpFromHeaders,
  getRetryAfterSeconds,
  toEmailIdentifier,
} from "@/src/lib/auth/rate-limit";

function isCredentialsCallbackRequest(request: Request): boolean {
  const pathname = new URL(request.url).pathname;
  return /\/callback\/credentials\/?$/.test(pathname);
}

async function getCredentialsEmailIdentifier(request: Request): Promise<string> {
  try {
    const formData = await request.clone().formData();
    return toEmailIdentifier(formData.get("email"));
  } catch {
    return "";
  }
}

export const GET = handlers.GET;

export async function POST(request: Parameters<typeof handlers.POST>[0]) {
  if (!isCredentialsCallbackRequest(request)) {
    return handlers.POST(request);
  }

  const requestIp = getRequestIpFromHeaders(request.headers);
  const emailIdentifier = await getCredentialsEmailIdentifier(request);
  const loginRateLimit = await enforceRateLimit("login", [
    requestIp ? `ip:${requestIp}` : "",
    emailIdentifier,
  ]);
  if (loginRateLimit) {
    const retryAfter = getRetryAfterSeconds(loginRateLimit.retryAt);
    return NextResponse.json(
      { error: loginRateLimit.error, retryAt: loginRateLimit.retryAt },
      {
        status: 429,
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      }
    );
  }

  const loginSlowRateLimit = await enforceRateLimit("loginSlow", [
    requestIp ? `ip:${requestIp}` : "",
  ]);
  if (loginSlowRateLimit) {
    const retryAfter = getRetryAfterSeconds(loginSlowRateLimit.retryAt);
    return NextResponse.json(
      { error: loginSlowRateLimit.error, retryAt: loginSlowRateLimit.retryAt },
      {
        status: 429,
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      }
    );
  }

  return handlers.POST(request);
}
