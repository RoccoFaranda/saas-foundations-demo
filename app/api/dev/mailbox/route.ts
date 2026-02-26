import { NextResponse } from "next/server";
import { getDevMailboxMessages } from "@/src/lib/auth/dev-mailbox";
import { isDevMailboxAccessAllowed } from "@/src/lib/auth/email";

export const dynamic = "force-dynamic";

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store",
  };
}

export async function GET() {
  if (!isDevMailboxAccessAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStoreHeaders() });
  }

  try {
    const messages = (await getDevMailboxMessages()).slice().reverse();
    return NextResponse.json({ messages }, { headers: noStoreHeaders() });
  } catch {
    return NextResponse.json(
      { error: "Unable to read dev mailbox." },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}
