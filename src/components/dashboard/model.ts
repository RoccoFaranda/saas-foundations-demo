/**
 * Shared dashboard types and options.
 * Used by both demo and authenticated dashboard components.
 */

// Core item types
export type ItemStatus = "active" | "pending" | "completed";
export type ItemTag = "feature" | "bugfix" | "docs" | "infra" | "design";
export type SortField = "name" | "updatedAt" | "progress";
export type SortDirection = "asc" | "desc";

// Checklist model for progress tracking
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

// Core item shape (view model)
export interface DashboardItem {
  id: string;
  name: string;
  status: ItemStatus;
  tag: ItemTag | null;
  updatedAt: string; // ISO timestamp
  summary: string;
  checklist: ChecklistItem[];
  archivedAt?: string | null; // ISO timestamp or null
}

// Activity log entry
export interface ActivityEntry {
  id: string;
  message: string;
  timestamp: string; // ISO timestamp
}

// Filter & sort options for dropdowns
export const statusOptions = [
  { value: "all" as const, label: "All Status" },
  { value: "active" as const, label: "Active" },
  { value: "pending" as const, label: "Pending" },
  { value: "completed" as const, label: "Completed" },
];

export const tagOptions = [
  { value: "all" as const, label: "All Tags" },
  { value: "feature" as const, label: "Feature" },
  { value: "bugfix" as const, label: "Bugfix" },
  { value: "docs" as const, label: "Docs" },
  { value: "infra" as const, label: "Infra" },
  { value: "design" as const, label: "Design" },
];

export const sortOptions = [
  {
    value: "updatedAt-desc",
    label: "Recently Updated",
    field: "updatedAt" as const,
    direction: "desc" as const,
  },
  {
    value: "updatedAt-asc",
    label: "Oldest First",
    field: "updatedAt" as const,
    direction: "asc" as const,
  },
  { value: "name-asc", label: "Name (A-Z)", field: "name" as const, direction: "asc" as const },
  { value: "name-desc", label: "Name (Z-A)", field: "name" as const, direction: "desc" as const },
  {
    value: "progress-desc",
    label: "Progress (High-Low)",
    field: "progress" as const,
    direction: "desc" as const,
  },
  {
    value: "progress-asc",
    label: "Progress (Low-High)",
    field: "progress" as const,
    direction: "asc" as const,
  },
];

/**
 * Compute progress percentage from checklist completion.
 * Returns 0 if checklist is empty, otherwise percentage of done items.
 */
export function computeProgress(checklist: ChecklistItem[]): number {
  if (checklist.length === 0) return 0;
  const doneCount = checklist.filter((item) => item.done).length;
  return Math.round((doneCount / checklist.length) * 100);
}

/**
 * Generate a unique ID for checklist items or activity entries.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
