export type DemoItemStatus = "active" | "pending" | "completed" | "archived";
export type DemoItemTag = "feature" | "bugfix" | "docs" | "infra" | "design";

export interface DemoItem {
  id: string;
  name: string;
  status: DemoItemStatus;
  tag: DemoItemTag;
  updatedAt: string;
  summary: string;
  metric: number;
}

/**
 * Seeded demo dataset for guest mode.
 * This data resets on page refresh - no persistence.
 */
export const demoItems: DemoItem[] = [
  {
    id: "proj-001",
    name: "User Authentication Flow",
    status: "completed",
    tag: "feature",
    updatedAt: "2026-01-14T10:30:00Z",
    summary: "Implement OAuth2 login with Google and GitHub providers",
    metric: 100,
  },
  {
    id: "proj-002",
    name: "Dashboard Analytics",
    status: "active",
    tag: "feature",
    updatedAt: "2026-01-15T08:15:00Z",
    summary: "Real-time metrics and chart visualizations",
    metric: 72,
  },
  {
    id: "proj-003",
    name: "Payment Integration",
    status: "active",
    tag: "feature",
    updatedAt: "2026-01-14T16:45:00Z",
    summary: "Stripe subscription and billing management",
    metric: 45,
  },
  {
    id: "proj-004",
    name: "Mobile Responsive Fix",
    status: "completed",
    tag: "bugfix",
    updatedAt: "2026-01-13T14:20:00Z",
    summary: "Fix layout issues on tablet and mobile viewports",
    metric: 100,
  },
  {
    id: "proj-005",
    name: "API Documentation",
    status: "pending",
    tag: "docs",
    updatedAt: "2026-01-12T09:00:00Z",
    summary: "OpenAPI spec and developer guide for REST endpoints",
    metric: 15,
  },
  {
    id: "proj-006",
    name: "CI/CD Pipeline",
    status: "completed",
    tag: "infra",
    updatedAt: "2026-01-11T11:30:00Z",
    summary: "GitHub Actions workflow for testing and deployment",
    metric: 100,
  },
  {
    id: "proj-007",
    name: "Dark Mode Theme",
    status: "completed",
    tag: "design",
    updatedAt: "2026-01-10T15:00:00Z",
    summary: "System-aware dark mode with smooth transitions",
    metric: 100,
  },
  {
    id: "proj-008",
    name: "Email Notifications",
    status: "pending",
    tag: "feature",
    updatedAt: "2026-01-15T07:00:00Z",
    summary: "Transactional emails for account and billing events",
    metric: 8,
  },
  {
    id: "proj-009",
    name: "Rate Limiting",
    status: "active",
    tag: "infra",
    updatedAt: "2026-01-14T13:00:00Z",
    summary: "API rate limiting with Redis-backed token bucket",
    metric: 60,
  },
  {
    id: "proj-010",
    name: "Accessibility Audit",
    status: "archived",
    tag: "design",
    updatedAt: "2026-01-08T10:00:00Z",
    summary: "WCAG 2.1 AA compliance review and fixes",
    metric: 100,
  },
];

/** Derive simple KPI values from demo items */
export function getDemoKpis(items: DemoItem[]) {
  const total = items.length;
  const active = items.filter((i) => i.status === "active").length;
  const completed = items.filter((i) => i.status === "completed").length;
  const avgProgress =
    total === 0 ? 0 : Math.round(items.reduce((sum, i) => sum + i.metric, 0) / total);

  return { total, active, completed, avgProgress };
}

/** Filter options */
export interface FilterOptions {
  search: string;
  status: DemoItemStatus | "all";
  tag: DemoItemTag | "all";
}

/** Sort options */
export type SortField = "updatedAt" | "name";
export type SortDirection = "asc" | "desc";

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

/** Filter items by search, status, and tag */
export function filterItems(items: DemoItem[], filters: FilterOptions): DemoItem[] {
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
export function sortItems(items: DemoItem[], sort: SortOptions): DemoItem[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    let comparison = 0;

    if (sort.field === "updatedAt") {
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    } else if (sort.field === "name") {
      comparison = a.name.localeCompare(b.name);
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

/** All status options for filter dropdown */
export const statusOptions: Array<{ value: DemoItemStatus | "all"; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

/** All tag options for filter dropdown */
export const tagOptions: Array<{ value: DemoItemTag | "all"; label: string }> = [
  { value: "all", label: "All Tags" },
  { value: "feature", label: "Feature" },
  { value: "bugfix", label: "Bugfix" },
  { value: "docs", label: "Docs" },
  { value: "infra", label: "Infra" },
  { value: "design", label: "Design" },
];

/** Sort options for dropdown */
export const sortOptions: Array<{
  value: string;
  label: string;
  field: SortField;
  direction: SortDirection;
}> = [
  { value: "updatedAt-desc", label: "Recently Updated", field: "updatedAt", direction: "desc" },
  { value: "updatedAt-asc", label: "Oldest Updated", field: "updatedAt", direction: "asc" },
  { value: "name-asc", label: "Name A-Z", field: "name", direction: "asc" },
  { value: "name-desc", label: "Name Z-A", field: "name", direction: "desc" },
];

/** Activity entry for the activity feed */
export interface ActivityEntry {
  id: string;
  message: string;
  timestamp: string;
}

/** Deep clone items array for local state initialization */
export function cloneItems(items: DemoItem[]): DemoItem[] {
  return items.map((item) => ({ ...item }));
}

/** Generate a change description for the activity feed */
export function describeChanges(oldItem: DemoItem, newItem: DemoItem): string | null {
  const changes: string[] = [];

  if (oldItem.status !== newItem.status) {
    changes.push(`status: ${oldItem.status} → ${newItem.status}`);
  }
  if (oldItem.tag !== newItem.tag) {
    changes.push(`tag: ${oldItem.tag} → ${newItem.tag}`);
  }
  if (oldItem.metric !== newItem.metric) {
    changes.push(`progress: ${oldItem.metric}% → ${newItem.metric}%`);
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
