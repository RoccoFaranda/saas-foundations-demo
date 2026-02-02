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
 * Progress is now derived from checklist completion.
 */
export const demoItems: DashboardItem[] = [
  {
    id: "proj-001",
    name: "User Authentication Flow",
    status: "completed",
    tag: "feature",
    updatedAt: "2026-01-14T10:30:00Z",
    summary: "Implement OAuth2 login with Google and GitHub providers",
    checklist: [
      { id: "check-001-1", text: "Set up OAuth providers", done: true },
      { id: "check-001-2", text: "Implement login UI", done: true },
      { id: "check-001-3", text: "Add session management", done: true },
      { id: "check-001-4", text: "Write integration tests", done: true },
    ],
  },
  {
    id: "proj-002",
    name: "Dashboard Analytics",
    status: "active",
    tag: "feature",
    updatedAt: "2026-01-15T08:15:00Z",
    summary: "Real-time metrics and chart visualizations",
    checklist: [
      { id: "check-002-1", text: "Design data schema", done: true },
      { id: "check-002-2", text: "Implement chart components", done: true },
      { id: "check-002-3", text: "Add real-time updates", done: true },
      { id: "check-002-4", text: "Add export functionality", done: false },
      { id: "check-002-5", text: "Performance optimization", done: false },
      { id: "check-002-6", text: "Mobile responsiveness", done: false },
      { id: "check-002-7", text: "Accessibility review", done: true },
    ],
  },
  {
    id: "proj-003",
    name: "Payment Integration",
    status: "active",
    tag: "feature",
    updatedAt: "2026-01-14T16:45:00Z",
    summary: "Stripe subscription and billing management",
    checklist: [
      { id: "check-003-1", text: "Set up Stripe account", done: true },
      { id: "check-003-2", text: "Implement subscription logic", done: true },
      { id: "check-003-3", text: "Add webhook handlers", done: false },
      { id: "check-003-4", text: "Build billing UI", done: false },
      { id: "check-003-5", text: "Test payment flows", done: false },
    ],
  },
  {
    id: "proj-004",
    name: "Mobile Responsive Fix",
    status: "completed",
    tag: "bugfix",
    updatedAt: "2026-01-13T14:20:00Z",
    summary: "Fix layout issues on tablet and mobile viewports",
    checklist: [
      { id: "check-004-1", text: "Audit responsive issues", done: true },
      { id: "check-004-2", text: "Fix tablet layouts", done: true },
      { id: "check-004-3", text: "Fix mobile layouts", done: true },
      { id: "check-004-4", text: "Test on real devices", done: true },
    ],
  },
  {
    id: "proj-005",
    name: "API Documentation",
    status: "pending",
    tag: "docs",
    updatedAt: "2026-01-12T09:00:00Z",
    summary: "OpenAPI spec and developer guide for REST endpoints",
    checklist: [
      { id: "check-005-1", text: "Generate OpenAPI spec", done: true },
      { id: "check-005-2", text: "Write developer guide", done: false },
      { id: "check-005-3", text: "Add code examples", done: false },
      { id: "check-005-4", text: "Review and publish", done: false },
    ],
  },
  {
    id: "proj-006",
    name: "CI/CD Pipeline",
    status: "completed",
    tag: "infra",
    updatedAt: "2026-01-11T11:30:00Z",
    summary: "GitHub Actions workflow for testing and deployment",
    checklist: [
      { id: "check-006-1", text: "Set up GitHub Actions", done: true },
      { id: "check-006-2", text: "Configure test pipeline", done: true },
      { id: "check-006-3", text: "Add deployment stage", done: true },
      { id: "check-006-4", text: "Set up notifications", done: true },
    ],
  },
  {
    id: "proj-007",
    name: "Dark Mode Theme",
    status: "completed",
    tag: "design",
    updatedAt: "2026-01-10T15:00:00Z",
    summary: "System-aware dark mode with smooth transitions",
    checklist: [
      { id: "check-007-1", text: "Design dark color palette", done: true },
      { id: "check-007-2", text: "Implement theme toggle", done: true },
      { id: "check-007-3", text: "Add system preference detection", done: true },
      { id: "check-007-4", text: "Test across components", done: true },
    ],
  },
  {
    id: "proj-008",
    name: "Email Notifications",
    status: "pending",
    tag: "feature",
    updatedAt: "2026-01-15T07:00:00Z",
    summary: "Transactional emails for account and billing events",
    checklist: [
      { id: "check-008-1", text: "Set up email service", done: true },
      { id: "check-008-2", text: "Design email templates", done: false },
      { id: "check-008-3", text: "Implement email triggers", done: false },
      { id: "check-008-4", text: "Add unsubscribe handling", done: false },
      { id: "check-008-5", text: "Test email delivery", done: false },
      { id: "check-008-6", text: "Monitor delivery rates", done: false },
    ],
  },
  {
    id: "proj-009",
    name: "Rate Limiting",
    status: "active",
    tag: "infra",
    updatedAt: "2026-01-14T13:00:00Z",
    summary: "API rate limiting with Redis-backed token bucket",
    checklist: [
      { id: "check-009-1", text: "Design rate limit strategy", done: true },
      { id: "check-009-2", text: "Set up Redis", done: true },
      { id: "check-009-3", text: "Implement token bucket algorithm", done: true },
      { id: "check-009-4", text: "Add rate limit headers", done: false },
      { id: "check-009-5", text: "Add monitoring", done: false },
    ],
  },
  {
    id: "proj-010",
    name: "Accessibility Audit",
    status: "archived",
    tag: "design",
    updatedAt: "2026-01-08T10:00:00Z",
    summary: "WCAG 2.1 AA compliance review and fixes",
    checklist: [
      { id: "check-010-1", text: "Run accessibility audit", done: true },
      { id: "check-010-2", text: "Fix critical issues", done: true },
      { id: "check-010-3", text: "Verify WCAG compliance", done: true },
    ],
  },
];

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
