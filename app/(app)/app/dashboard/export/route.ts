import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { listItems } from "@/src/lib/items";
import { parseDashboardSearchParams } from "@/src/lib/dashboard/queries";
import { buildProjectsCsv, computeChecklistProgress } from "@/src/lib/dashboard/csv";
import { ItemStatus, ItemTag } from "@/src/generated/prisma/enums";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!user.emailVerified) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  const { searchParams } = new URL(request.url);
  const params = parseDashboardSearchParams(Object.fromEntries(searchParams.entries()));

  const filterOptions = {
    status: params.status !== "all" ? (params.status as ItemStatus) : undefined,
    tag: params.tag !== "all" ? (params.tag as ItemTag) : undefined,
    search: params.search || undefined,
    includeArchived: params.showArchived,
  };

  const items =
    params.sortBy === "progress" || params.sortBy === "archivedAt"
      ? (() => {
          return listItems(user.id, filterOptions).then((filteredItems) => {
            return [...filteredItems].sort((a, b) => {
              if (params.sortBy === "progress") {
                const comparison =
                  computeChecklistProgress(a.checklistItems) -
                  computeChecklistProgress(b.checklistItems);
                return params.sortDir === "desc" ? -comparison : comparison;
              }

              const aArchivedTime = a.archivedAt ? new Date(a.archivedAt).getTime() : null;
              const bArchivedTime = b.archivedAt ? new Date(b.archivedAt).getTime() : null;

              if (aArchivedTime === null && bArchivedTime === null) {
                return 0;
              }
              if (aArchivedTime === null) {
                return 1;
              }
              if (bArchivedTime === null) {
                return -1;
              }

              const comparison = aArchivedTime - bArchivedTime;
              return params.sortDir === "desc" ? -comparison : comparison;
            });
          });
        })()
      : listItems(user.id, {
          ...filterOptions,
          sortBy: params.sortBy,
          sortDirection: params.sortDir,
        });

  const rows = (await items).map((item) => {
    const checklistDone = item.checklistItems.filter((checklistItem) => checklistItem.done).length;
    const checklistTotal = item.checklistItems.length;
    return {
      id: item.id,
      name: item.name,
      status: item.status,
      tag: item.tag,
      summary: item.summary,
      checklistDone,
      checklistTotal,
      progress: computeChecklistProgress(item.checklistItems),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      completedAt: item.completedAt,
      archivedAt: item.archivedAt,
    };
  });

  const csv = buildProjectsCsv(rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `projects-${timestamp}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
