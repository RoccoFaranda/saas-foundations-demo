/**
 * Dashboard query utilities: searchParams validation and KPI computation.
 */
import { z } from "zod";
import { ItemStatus, ItemTag } from "../../generated/prisma/enums";
import type { DashboardItem } from "../../components/dashboard/model";
import { computeProgress } from "../../components/dashboard/model";

const itemStatusValues = Object.values(ItemStatus) as [ItemStatus, ...ItemStatus[]];
const itemTagValues = Object.values(ItemTag) as [ItemTag, ...ItemTag[]];

/**
 * Zod schema for dashboard searchParams validation.
 * Normalizes and validates URL search parameters.
 */
export const dashboardSearchParamsSchema = z.object({
  // Search text (optional)
  search: z.string().max(100).optional().default(""),

  // Status filter (optional, defaults to "all")
  status: z
    .enum(["all", ...itemStatusValues])
    .optional()
    .default("all"),

  // Tag filter (optional, defaults to "all")
  tag: z
    .enum(["all", ...itemTagValues])
    .optional()
    .default("all"),

  // Sort field (optional, defaults to "updatedAt")
  sortBy: z
    .enum(["updatedAt", "createdAt", "archivedAt", "name", "progress"])
    .optional()
    .default("updatedAt"),

  // Sort direction (optional, defaults to "desc")
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),

  // Page number (optional, defaults to 1, min 1)
  page: z.coerce.number().int().min(1).optional().default(1),

  // Show archived items (optional, defaults to false)
  showArchived: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((val) => val === "true"),
});

export type DashboardSearchParams = z.infer<typeof dashboardSearchParamsSchema>;

/**
 * Parse and validate raw searchParams from Next.js.
 * Returns validated params with defaults applied.
 */
export function parseDashboardSearchParams(
  rawParams: Record<string, string | string[] | undefined>
): DashboardSearchParams {
  // Normalize searchParams: Next.js may pass arrays for repeated keys
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }

  // Parse each field independently so one invalid param does not reset all params
  const parsedSearch = dashboardSearchParamsSchema.shape.search.safeParse(normalized.search);
  const parsedStatus = dashboardSearchParamsSchema.shape.status.safeParse(normalized.status);
  const parsedTag = dashboardSearchParamsSchema.shape.tag.safeParse(normalized.tag);
  const parsedSortBy = dashboardSearchParamsSchema.shape.sortBy.safeParse(normalized.sortBy);
  const parsedSortDir = dashboardSearchParamsSchema.shape.sortDir.safeParse(normalized.sortDir);
  const parsedPage = dashboardSearchParamsSchema.shape.page.safeParse(normalized.page);
  const parsedShowArchived = dashboardSearchParamsSchema.shape.showArchived.safeParse(
    normalized.showArchived
  );

  return {
    search: parsedSearch.success ? parsedSearch.data : "",
    status: parsedStatus.success ? parsedStatus.data : "all",
    tag: parsedTag.success ? parsedTag.data : "all",
    sortBy: parsedSortBy.success ? parsedSortBy.data : "updatedAt",
    sortDir: parsedSortDir.success ? parsedSortDir.data : "desc",
    page: parsedPage.success ? parsedPage.data : 1,
    showArchived: parsedShowArchived.success ? parsedShowArchived.data : false,
  };
}

/**
 * Dashboard KPIs computed from items.
 */
export interface DashboardKpis {
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
  archived: number;
}

/**
 * Compute KPI values from dashboard items.
 * Note: For accurate total counts, use the full dataset (not paginated).
 */
export function computeDashboardKpis(items: DashboardItem[], archivedCount = 0): DashboardKpis {
  const total = items.length;
  const active = items.filter((i) => i.status === "active").length;
  const completed = items.filter((i) => i.status === "completed").length;

  const avgProgress =
    total === 0
      ? 0
      : Math.round(items.reduce((sum, i) => sum + computeProgress(i.checklist), 0) / total);

  return { total, active, completed, avgProgress, archived: archivedCount };
}

/** Page size constant for dashboard pagination */
export const DASHBOARD_PAGE_SIZE = 5;
