import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { normalizeThemePreference, setThemeCookie } from "@/src/lib/theme/cookies";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const theme = normalizeThemePreference(user.themePreference ?? null);
  await setThemeCookie(theme);

  return NextResponse.json({ theme });
}
