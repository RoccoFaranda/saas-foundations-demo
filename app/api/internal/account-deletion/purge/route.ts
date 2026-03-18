import { NextResponse } from "next/server";
import prisma from "@/src/lib/db";
import { logAuthEvent } from "@/src/lib/auth/logging";
import { getCronSecret, getAccountDeletionPurgeBatchSize } from "@/src/lib/auth/account-deletion";

export const dynamic = "force-dynamic";

function hasValidCronAuthorization(request: Request, expectedSecret: string): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const provided = authHeader.slice("Bearer ".length).trim();
  return Boolean(provided) && provided === expectedSecret;
}

async function runPurge(request: Request) {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Account deletion purge is not configured." },
      { status: 503 }
    );
  }

  if (!hasValidCronAuthorization(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchSize = getAccountDeletionPurgeBatchSize();
  const now = new Date();

  const dueUsers = await prisma.user.findMany({
    where: {
      deletionScheduledFor: {
        not: null,
        lte: now,
      },
    },
    select: { id: true },
    orderBy: { deletionScheduledFor: "asc" },
    take: batchSize,
  });

  if (dueUsers.length === 0) {
    return NextResponse.json({
      purged: 0,
      remainingDue: 0,
      batchSize,
    });
  }

  const dueUserIds = dueUsers.map((user) => user.id);
  const { count: purgedCount } = await prisma.user.deleteMany({
    where: { id: { in: dueUserIds } },
  });

  const remainingDue = await prisma.user.count({
    where: {
      deletionScheduledFor: {
        not: null,
        lte: now,
      },
    },
  });

  logAuthEvent("delete_account_purged", {
    purged: purgedCount,
    remainingDue,
    batchSize,
  });

  return NextResponse.json({
    purged: purgedCount,
    remainingDue,
    batchSize,
  });
}

export async function GET(request: Request) {
  return runPurge(request);
}

export async function POST(request: Request) {
  return runPurge(request);
}
