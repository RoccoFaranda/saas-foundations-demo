import { NextResponse } from "next/server";
import { getHealthReport } from "@/src/lib/health";

export const dynamic = "force-dynamic";

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function GET(request: Request) {
  const readinessSecret = process.env.READINESS_SECRET?.trim() ?? "";
  const isProduction = process.env.NODE_ENV === "production";
  const bearerToken = getBearerToken(request);

  if (isProduction && !readinessSecret) {
    return NextResponse.json(
      { error: "Readiness endpoint is not configured." },
      { status: 503, headers: noStoreHeaders() }
    );
  }

  if (readinessSecret && bearerToken !== readinessSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders() });
  }

  const report = await getHealthReport();

  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: noStoreHeaders(),
  });
}
