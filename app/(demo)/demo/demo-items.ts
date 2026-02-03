import type {
  DashboardItem,
  ItemStatus,
  ItemTag,
  SortField,
  SortDirection,
  ChecklistItem,
  ActivityEntry,
} from "@/src/components/dashboard/model";
import { computeProgress } from "@/src/components/dashboard/model";
import { getSampleDashboardItems } from "@/src/lib/dashboard/sample-items";

/**
 * Re-export shared types for convenience in demo context
 */
export type {
  DashboardItem as DemoItem,
  ItemStatus as DemoItemStatus,
  ItemTag as DemoItemTag,
  SortField,
  SortDirection,
  ChecklistItem,
  ActivityEntry,
};

/**
 * Seeded demo dataset for guest mode.
 * This data resets on page refresh - no persistence.
 * Progress is derived from checklist completion.
 */
export const demoItems: DashboardItem[] = getSampleDashboardItems();

/** Derive simple KPI values from demo items */
export function getDemoKpis(items: DashboardItem[]) {
  const total = items.length;
  const active = items.filter((i) => i.status === "active").length;
  const completed = items.filter((i) => i.status === "completed").length;
  const avgProgress =
    total === 0
      ? 0
      : Math.round(items.reduce((sum, i) => sum + computeProgress(i.checklist), 0) / total);

  return { total, active, completed, avgProgress };
}

/** Filter options */
export interface FilterOptions {
  search: string;
  status: ItemStatus | "all";
  tag: ItemTag | "all";
}

/** Sort options */
export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

/** Filter items by search, status, and tag */
export function filterItems(items: DashboardItem[], filters: FilterOptions): DashboardItem[] {
  return items.filter((item) => {
    // Search filter (case-insensitive name match)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!item.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }

    // Tag filter
    if (filters.tag !== "all" && item.tag !== filters.tag) {
      return false;
    }

    return true;
  });
}

/** Sort items by field and direction */
export function sortItems(items: DashboardItem[], sort: SortOptions): DashboardItem[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    let comparison = 0;

    if (sort.field === "updatedAt") {
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    } else if (sort.field === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sort.field === "progress") {
      comparison = computeProgress(a.checklist) - computeProgress(b.checklist);
    }

    return sort.direction === "desc" ? -comparison : comparison;
  });

  return sorted;
}

/** Paginate items */
export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** Deep clone items array for local state initialization */
export function cloneItems(items: DashboardItem[]): DashboardItem[] {
  return items.map((item) => ({
    ...item,
    checklist: item.checklist.map((c) => ({ ...c })),
  }));
}

/**
 * Generate a change description for the activity feed.
 * Describes changes between old and new item states.
 */
export function describeChanges(oldItem: DashboardItem, newItem: DashboardItem): string | null {
  const changes: string[] = [];

  if (oldItem.status !== newItem.status) {
    changes.push(`status: ${oldItem.status} → ${newItem.status}`);
  }
  if (oldItem.tag !== newItem.tag) {
    changes.push(`tag: ${oldItem.tag} → ${newItem.tag}`);
  }

  // Checklist changes
  const oldProgress = computeProgress(oldItem.checklist);
  const newProgress = computeProgress(newItem.checklist);
  if (oldProgress !== newProgress) {
    changes.push(`progress: ${oldProgress}% → ${newProgress}%`);
  }

  // Checklist item count changes
  if (oldItem.checklist.length !== newItem.checklist.length) {
    const diff = newItem.checklist.length - oldItem.checklist.length;
    if (diff > 0) {
      changes.push(`+${diff} checklist item${diff > 1 ? "s" : ""}`);
    } else {
      changes.push(`${diff} checklist item${diff < -1 ? "s" : ""}`);
    }
  }

  if (oldItem.name !== newItem.name) {
    changes.push(`renamed`);
  }
  if (oldItem.summary !== newItem.summary) {
    changes.push(`summary updated`);
  }

  if (changes.length === 0) return null;
  return changes.join(", ");
}
