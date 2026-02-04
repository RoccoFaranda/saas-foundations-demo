/**
 * Shared dashboard types and options.
 * Used by both demo and authenticated dashboard components.
 */

// Core item types
export type ItemStatus = "active" | "pending" | "completed";
export type ItemTag = "feature" | "bugfix" | "docs" | "infra" | "design";
export type SortField = "name" | "createdAt" | "updatedAt" | "archivedAt" | "progress";
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
  completedAt?: string | null; // ISO timestamp or null - when item was marked completed
  createdAt?: string; // ISO timestamp - when item was created
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

export const sortFieldOptions = [
  { value: "updatedAt" as const, label: "Updated" },
  { value: "createdAt" as const, label: "Created" },
  { value: "name" as const, label: "Name" },
  { value: "progress" as const, label: "Progress" },
  { value: "archivedAt" as const, label: "Archived Date" },
];

export function getDefaultSortDirection(field: SortField): SortDirection {
  if (field === "name") return "asc";
  return "desc";
}

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
