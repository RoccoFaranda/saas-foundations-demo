import { NextResponse } from "next/server";
import { getHealthReport } from "@/src/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getHealthReport();

  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
