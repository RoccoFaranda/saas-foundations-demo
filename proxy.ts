import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/config";

function buildCallbackUrl(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export default auth((req) => {
  const { nextUrl } = req;
  if (!nextUrl.pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  if (!req.auth?.user?.id) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", buildCallbackUrl(nextUrl.pathname, nextUrl.search));
    return NextResponse.redirect(loginUrl);
  }

  if (!req.auth.user.emailVerified) {
    return NextResponse.redirect(new URL("/verify-email", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*"],
};
