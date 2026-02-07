"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/src/lib/auth";
import prisma from "@/src/lib/db";
import {
  createItem,
  updateItem,
  deleteItem,
  getItem,
  archiveItem,
  unarchiveItem,
  CompletionChecklistError,
} from "@/src/lib/items";
import { createActivityLog } from "@/src/lib/activity-log";
import { createItemSchema, updateItemSchema } from "@/src/lib/validation/item";
import { ItemStatus, ItemTag } from "@/src/generated/prisma/enums";
import type { ChecklistItem as UIChecklistItem } from "@/src/components/dashboard/model";
import { getSampleDashboardItems } from "@/src/lib/dashboard/sample-items";

/**
 * Action result type for dashboard mutations
 */
export type DashboardActionResult =
  | { success: true; itemId?: string }
  | { success: false; error: string };

/**
 * Convert UI checklist format to DB format (add position)
 */
function mapUiChecklistToDb(
  checklist: UIChecklistItem[]
): Array<{ text: string; done: boolean; position: number }> {
  return checklist.map((item, index) => ({
    text: item.text,
    done: item.done,
    position: index,
  }));
}

/**
 * Create a new item for the authenticated user
 */
export async function createItemAction(input: {
  name: string;
  status?: string;
  tag?: string | null;
  summary?: string;
  checklist?: UIChecklistItem[];
}): Promise<DashboardActionResult> {
  const user = await requireVerifiedUser();

  // Validate input
  const parsed = createItemSchema.safeParse({
    name: input.name,
    status: input.status ?? ItemStatus.active,
    tag: input.tag ?? undefined,
    summary: input.summary,
    checklist: input.checklist ? mapUiChecklistToDb(input.checklist) : undefined,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Invalid input" };
  }

  try {
    const item = await createItem(user.id, parsed.data);

    // Log activity
    await createActivityLog(user.id, {
      action: "item.created",
      entityType: "item",
      entityId: item.id,
      metadata: { itemName: item.name },
    });

    revalidatePath("/app/dashboard");
    return { success: true, itemId: item.id };
  } catch (error) {
    if (error instanceof CompletionChecklistError) {
      return { success: false, error: error.message };
    }
    console.error("[dashboard] createItemAction failed:", error);
    return { success: false, error: "Failed to create item. Please try again." };
  }
}

/**
 * Update an existing item for the authenticated user
 */
export async function updateItemAction(
  itemId: string,
  input: {
    name?: string;
    status?: string;
    tag?: string | null;
    summary?: string;
    checklist?: UIChecklistItem[];
  }
): Promise<DashboardActionResult> {
  const user = await requireVerifiedUser();

  // Validate input
  const parsed = updateItemSchema.safeParse({
    name: input.name,
    status: input.status as ItemStatus | undefined,
    tag: input.tag === null ? null : (input.tag as ItemTag | undefined),
    summary: input.summary,
    checklist: input.checklist ? mapUiChecklistToDb(input.checklist) : undefined,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message ?? "Invalid input" };
  }

  try {
    const item = await updateItem(user.id, itemId, parsed.data);

    // Log activity
    await createActivityLog(user.id, {
      action: "item.updated",
      entityType: "item",
      entityId: item.id,
      metadata: { itemName: item.name },
    });

    revalidatePath("/app/dashboard");
    return { success: true, itemId: item.id };
  } catch (error) {
    if (error instanceof CompletionChecklistError) {
      return { success: false, error: error.message };
    }
    if (error instanceof Error && error.message.includes("not found or access denied")) {
      return { success: false, error: "Item not found or you don't have permission to edit it." };
    }
    if (
      error instanceof Error &&
      error.message.includes("Archived items must be unarchived before editing")
    ) {
      return {
        success: false,
        error: "Unarchive the item before editing it.",
      };
    }
    console.error("[dashboard] updateItemAction failed:", error);
    return { success: false, error: "Failed to update item. Please try again." };
  }
}

/**
 * Archive an item for the authenticated user
 */
export async function archiveItemAction(itemId: string): Promise<DashboardActionResult> {
  const user = await requireVerifiedUser();

  try {
    const item = await archiveItem(user.id, itemId);

    // Log activity
    await createActivityLog(user.id, {
      action: "item.archived",
      entityType: "item",
      entityId: item.id,
      metadata: { itemName: item.name },
    });

    revalidatePath("/app/dashboard");
    return { success: true, itemId: item.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found or access denied")) {
      return {
        success: false,
        error: "Item not found or you don't have permission to archive it.",
      };
    }
    console.error("[dashboard] archiveItemAction failed:", error);
    return { success: false, error: "Failed to archive item. Please try again." };
  }
}

/**
 * Unarchive an item for the authenticated user
 */
export async function unarchiveItemAction(itemId: string): Promise<DashboardActionResult> {
  const user = await requireVerifiedUser();

  try {
    const item = await unarchiveItem(user.id, itemId);

    // Log activity
    await createActivityLog(user.id, {
      action: "item.unarchived",
      entityType: "item",
      entityId: item.id,
      metadata: { itemName: item.name },
    });

    revalidatePath("/app/dashboard");
    return { success: true, itemId: item.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found or access denied")) {
      return {
        success: false,
        error: "Item not found or you don't have permission to unarchive it.",
      };
    }
    console.error("[dashboard] unarchiveItemAction failed:", error);
    return { success: false, error: "Failed to unarchive item. Please try again." };
  }
}

/**
 * Delete an item for the authenticated user
 */
export async function deleteItemAction(itemId: string): Promise<DashboardActionResult> {
  const user = await requireVerifiedUser();

  try {
    const existingItem = await getItem(user.id, itemId);
    if (!existingItem) {
      return {
        success: false,
        error: "Item not found or you don't have permission to delete it.",
      };
    }
    if (!existingItem.archivedAt) {
      return {
        success: false,
        error: "Archive the item before deleting it permanently.",
      };
    }

    await deleteItem(user.id, itemId);

    // Log activity
    await createActivityLog(user.id, {
      action: "item.deleted",
      entityType: "item",
      entityId: itemId,
      metadata: { itemName: existingItem.name },
    });

    revalidatePath("/app/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found or access denied")) {
      return {
        success: false,
        error: "Item not found or you don't have permission to delete it.",
      };
    }
    console.error("[dashboard] deleteItemAction failed:", error);
    return { success: false, error: "Failed to delete item. Please try again." };
  }
}

/**
 * Import sample data for the authenticated user.
 * Idempotent: Only imports if user has no items.
 */
export async function importSampleDataAction(): Promise<DashboardActionResult> {
  const user = await requireVerifiedUser();
  const sampleItems = getSampleDashboardItems();

  try {
    await prisma.$transaction(async (tx) => {
      // Check if user already has items (idempotency guard)
      const existingCount = await tx.item.count({
        where: { userId: user.id },
      });

      if (existingCount > 0) {
        throw new Error("SAMPLE_IMPORT_REQUIRES_EMPTY_STATE");
      }

      // Create sample items + activity logs in one atomic transaction
      for (const sampleItem of sampleItems) {
        const item = await tx.item.create({
          data: {
            userId: user.id,
            name: sampleItem.name,
            status: sampleItem.status as ItemStatus,
            completedAt: sampleItem.completedAt ? new Date(sampleItem.completedAt) : null,
            tag: sampleItem.tag as ItemTag | null,
            summary: sampleItem.summary || undefined,
            createdAt: sampleItem.createdAt ? new Date(sampleItem.createdAt) : undefined,
            updatedAt: sampleItem.updatedAt ? new Date(sampleItem.updatedAt) : undefined,
            checklistItems: {
              create: sampleItem.checklist.map((checklistItem, index) => ({
                text: checklistItem.text,
                done: checklistItem.done,
                position: index,
              })),
            },
          },
        });

        await tx.activityLog.create({
          data: {
            userId: user.id,
            action: "item.created",
            entityType: "item",
            entityId: item.id,
            metadata: { itemName: item.name, source: "sample_import" },
          },
        });
      }
    });

    revalidatePath("/app/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "SAMPLE_IMPORT_REQUIRES_EMPTY_STATE") {
      return {
        success: false,
        error: "Sample data can only be imported when you have no existing projects.",
      };
    }
    console.error("[dashboard] importSampleDataAction failed:", error);
    return { success: false, error: "Failed to import sample data. Please try again." };
  }
}
