import { computeProgress } from "@/src/components/dashboard/model";
import type {
  DashboardItem,
  ItemStatus,
  ItemTag,
  SortDirection,
  SortField,
} from "@/src/components/dashboard/model";

export interface InMemoryDashboardFilters {
  search: string;
  status: ItemStatus | "all";
  tag: ItemTag | "all";
  showArchived?: boolean;
}

export interface InMemoryDashboardSort {
  field: SortField;
  direction: SortDirection;
}

export interface InMemoryDashboardKpis {
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
  archived: number;
}

export interface InMemoryDashboardQueryInput {
  filters: InMemoryDashboardFilters;
  sort: InMemoryDashboardSort;
  page: number;
  pageSize: number;
}

export interface InMemoryDashboardQueryResult {
  filteredItems: DashboardItem[];
  paginatedItems: DashboardItem[];
  totalPages: number;
  safePage: number;
}

export function filterDashboardItems(
  items: DashboardItem[],
  filters: InMemoryDashboardFilters
): DashboardItem[] {
  return items.filter((item) => {
    if (!filters.showArchived && item.archivedAt) {
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!item.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }

    if (filters.tag !== "all" && item.tag !== filters.tag) {
      return false;
    }

    return true;
  });
}

export function sortDashboardItems(
  items: DashboardItem[],
  sort: InMemoryDashboardSort
): DashboardItem[] {
  const sorted = [...items];

  sorted.sort((left, right) => {
    if (sort.field === "archivedAt") {
      const leftArchived = left.archivedAt ? new Date(left.archivedAt).getTime() : null;
      const rightArchived = right.archivedAt ? new Date(right.archivedAt).getTime() : null;

      if (leftArchived === null && rightArchived !== null) return 1;
      if (leftArchived !== null && rightArchived === null) return -1;
      if (leftArchived === null && rightArchived === null) return 0;

      const archivedDiff = (leftArchived ?? 0) - (rightArchived ?? 0);
      return sort.direction === "desc" ? -archivedDiff : archivedDiff;
    }

    let comparison = 0;

    if (sort.field === "updatedAt") {
      comparison = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
    } else if (sort.field === "createdAt") {
      const leftCreated = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightCreated = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      comparison = leftCreated - rightCreated;
    } else if (sort.field === "name") {
      comparison = left.name.localeCompare(right.name);
    } else if (sort.field === "progress") {
      comparison = computeProgress(left.checklist) - computeProgress(right.checklist);
    }

    return sort.direction === "desc" ? -comparison : comparison;
  });

  return sorted;
}

export function paginateDashboardItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function queryDashboardItems(
  items: DashboardItem[],
  input: InMemoryDashboardQueryInput
): InMemoryDashboardQueryResult {
  const filteredItems = sortDashboardItems(filterDashboardItems(items, input.filters), input.sort);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / input.pageSize));
  const safePage = Math.min(Math.max(1, input.page), totalPages);
  const paginatedItems = paginateDashboardItems(filteredItems, safePage, input.pageSize);

  return {
    filteredItems,
    paginatedItems,
    totalPages,
    safePage,
  };
}

export function computeInMemoryDashboardKpis(items: DashboardItem[]): InMemoryDashboardKpis {
  const archived = items.filter((item) => Boolean(item.archivedAt)).length;
  const nonArchivedItems = items.filter((item) => !item.archivedAt);
  const total = nonArchivedItems.length;
  const active = nonArchivedItems.filter((item) => item.status === "active").length;
  const completed = nonArchivedItems.filter((item) => item.status === "completed").length;
  const avgProgress =
    total === 0
      ? 0
      : Math.round(
          nonArchivedItems.reduce((sum, item) => sum + computeProgress(item.checklist), 0) / total
        );

  return { total, active, completed, avgProgress, archived };
}
