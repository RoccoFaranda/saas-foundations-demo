import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function buildCallbackUrl(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export default async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  if (!nextUrl.pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (!token?.id) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", buildCallbackUrl(nextUrl.pathname, nextUrl.search));
    return NextResponse.redirect(loginUrl);
  }

  const emailVerified =
    typeof token.emailVerified === "string"
      ? new Date(token.emailVerified)
      : (token.emailVerified ?? null);

  if (!emailVerified) {
    return NextResponse.redirect(new URL("/verify-email", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
