/**
 * Mappers between DB/service models and shared UI models.
 * These ensure no DB-specific fields leak into UI components.
 */
import type { ItemWithChecklist } from "../items";
import type { ActivityLog } from "../../generated/prisma/client";
import type { DashboardItem, ChecklistItem, ActivityEntry } from "../../components/dashboard/model";

/**
 * Map a DB Item with checklistItems to the UI DashboardItem shape.
 * - Converts checklist items: drops position/itemId/timestamps, keeps id/text/done
 * - Checklist is already ordered by position from the query
 * - Converts updatedAt Date to ISO string
 * - Preserves nullable tag so UI can represent untagged items
 */
export function mapDbItemToUi(dbItem: ItemWithChecklist): DashboardItem {
  const checklist: ChecklistItem[] = dbItem.checklistItems.map((ci) => ({
    id: ci.id,
    text: ci.text,
    done: ci.done,
  }));

  return {
    id: dbItem.id,
    name: dbItem.name,
    status: dbItem.status,
    tag: dbItem.tag,
    updatedAt: dbItem.updatedAt.toISOString(),
    summary: dbItem.summary ?? "",
    checklist,
  };
}

/**
 * Map multiple DB items to UI items.
 */
export function mapDbItemsToUi(dbItems: ItemWithChecklist[]): DashboardItem[] {
  return dbItems.map(mapDbItemToUi);
}

/**
 * Format an activity log action and metadata into a human-readable message.
 */
function formatActivityMessage(log: ActivityLog): string {
  const { action, entityType, metadata } = log;

  // Extract item name from metadata if available
  const meta = metadata as Record<string, unknown> | null;
  const itemName = meta?.itemName ?? meta?.name ?? null;

  // Build message based on action type
  switch (action) {
    case "item.created":
      return itemName ? `Created "${itemName}"` : "Created a new item";
    case "item.updated":
      return itemName ? `Updated "${itemName}"` : "Updated an item";
    case "item.deleted":
      return itemName ? `Deleted "${itemName}"` : "Deleted an item";
    case "checklist.updated":
      return itemName ? `Updated checklist on "${itemName}"` : "Updated a checklist";
    default:
      // Fallback: humanize the action string
      if (entityType && itemName) {
        return `${humanizeAction(action)} "${itemName}"`;
      }
      return humanizeAction(action);
  }
}

/**
 * Convert action string like "item.created" to "Item created"
 */
function humanizeAction(action: string): string {
  return action
    .replace(/\./g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Map a DB ActivityLog to the UI ActivityEntry shape.
 * - Constructs message from action/entityType/metadata
 * - Converts createdAt Date to ISO string as timestamp
 */
export function mapDbActivityLogToUi(log: ActivityLog): ActivityEntry {
  return {
    id: log.id,
    message: formatActivityMessage(log),
    timestamp: log.createdAt.toISOString(),
  };
}

/**
 * Map multiple DB activity logs to UI entries.
 */
export function mapDbActivityLogsToUi(logs: ActivityLog[]): ActivityEntry[] {
  return logs.map(mapDbActivityLogToUi);
}
