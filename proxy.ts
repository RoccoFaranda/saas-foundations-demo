import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/config";
import { applySecurityResponseHeaders } from "@/src/lib/security-headers";

function buildCallbackUrl(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

function withSecurityResponseHeaders(response: NextResponse): NextResponse {
  applySecurityResponseHeaders(response.headers);
  return response;
}

function securityResponseInit(init: ResponseInit = {}): ResponseInit {
  const headers = new Headers(init.headers);
  applySecurityResponseHeaders(headers);
  return { ...init, headers };
}

export default auth((req) => {
  const { nextUrl } = req;
  if (!nextUrl.pathname.startsWith("/app")) {
    return withSecurityResponseHeaders(NextResponse.next());
  }

  if (!req.auth?.user?.id) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", buildCallbackUrl(nextUrl.pathname, nextUrl.search));
    return NextResponse.redirect(loginUrl, securityResponseInit());
  }

  if (!req.auth.user.emailVerified) {
    return NextResponse.redirect(new URL("/verify-email", nextUrl), securityResponseInit());
  }

  return withSecurityResponseHeaders(NextResponse.next());
});

export const config = {
  matcher: ["/app/:path*"],
};
