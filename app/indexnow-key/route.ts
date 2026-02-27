import { NextResponse } from "next/server";
import { getIndexNowKey } from "@/src/lib/seo/indexnow";

export const dynamic = "force-dynamic";

export function GET() {
  const key = getIndexNowKey();

  if (!key) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
