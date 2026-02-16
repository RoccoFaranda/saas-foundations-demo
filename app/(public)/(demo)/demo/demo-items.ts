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
