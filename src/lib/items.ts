import "server-only";
import prisma from "./db";
import { createItemSchema, updateItemSchema } from "./validation/item";
import type { CreateItemInput, UpdateItemInput } from "./validation/item";
import type { Item, ChecklistItem } from "../generated/prisma/client";
import { ItemStatus, ItemTag } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";

/**
 * Extended Item type that includes checklist items
 */
export type ItemWithChecklist = Item & {
  checklistItems: ChecklistItem[];
};

/**
 * Create a new item for a user
 */
export async function createItem(
  userId: string,
  input: CreateItemInput
): Promise<ItemWithChecklist> {
  const validated = createItemSchema.parse(input);

  // Set completedAt if status is completed
  const completedAt = validated.status === ItemStatus.completed ? new Date() : null;

  return await prisma.item.create({
    data: {
      userId,
      name: validated.name,
      status: validated.status,
      tag: validated.tag,
      summary: validated.summary,
      metricValue: validated.metricValue,
      completedAt,
      checklistItems: validated.checklist
        ? {
            create: validated.checklist.map((item) => ({
              text: item.text,
              done: item.done,
              position: item.position,
            })),
          }
        : undefined,
    },
    include: {
      checklistItems: {
        orderBy: { position: "asc" },
      },
    },
  });
}

/** Sort field options for listing items */
export type ItemSortField = "createdAt" | "updatedAt" | "name";

/** Sort direction options */
export type ItemSortDirection = "asc" | "desc";

/** Options for listing items */
export interface ListItemsOptions {
  status?: ItemStatus;
  tag?: ItemTag;
  search?: string;
  sortBy?: ItemSortField;
  sortDirection?: ItemSortDirection;
  limit?: number;
  offset?: number;
  /** Include archived items. Default: false (excludes archived) */
  includeArchived?: boolean;
}

/**
 * List items for a user with optional filtering, search, and sorting
 */
export async function listItems(
  userId: string,
  options?: ListItemsOptions
): Promise<ItemWithChecklist[]> {
  const where: Prisma.ItemWhereInput = {
    userId,
  };

  // Exclude archived items by default
  if (!options?.includeArchived) {
    where.archivedAt = null;
  }

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.tag) {
    where.tag = options.tag;
  }

  // Search by name (case-insensitive contains)
  if (options?.search) {
    where.name = {
      contains: options.search,
      mode: "insensitive",
    };
  }

  // Determine sort order
  const sortBy = options?.sortBy ?? "createdAt";
  const sortDirection = options?.sortDirection ?? "desc";
  const orderBy: Prisma.ItemOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  return await prisma.item.findMany({
    where,
    orderBy,
    take: options?.limit,
    skip: options?.offset,
    include: {
      checklistItems: {
        orderBy: { position: "asc" },
      },
    },
  });
}

/**
 * Count items for a user with optional filtering and search.
 * Useful for pagination total count.
 */
export async function countItems(
  userId: string,
  options?: Pick<ListItemsOptions, "status" | "tag" | "search" | "includeArchived">
): Promise<number> {
  const where: Prisma.ItemWhereInput = {
    userId,
  };

  // Exclude archived items by default
  if (!options?.includeArchived) {
    where.archivedAt = null;
  }

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.tag) {
    where.tag = options.tag;
  }

  if (options?.search) {
    where.name = {
      contains: options.search,
      mode: "insensitive",
    };
  }

  return await prisma.item.count({ where });
}

/**
 * Get a single item by ID, scoped to the user
 */
export async function getItem(userId: string, itemId: string): Promise<ItemWithChecklist | null> {
  return await prisma.item.findFirst({
    where: {
      id: itemId,
      userId,
    },
    include: {
      checklistItems: {
        orderBy: { position: "asc" },
      },
    },
  });
}

/**
 * Update an item, scoped to the user
 * For checklist updates, replaces the entire checklist (delete + recreate pattern)
 */
export async function updateItem(
  userId: string,
  itemId: string,
  input: UpdateItemInput
): Promise<ItemWithChecklist> {
  const validated = updateItemSchema.parse(input);

  // Verify the item belongs to the user
  const existing = await prisma.item.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Item not found or access denied");
  }
  if (existing.archivedAt) {
    throw new Error("Archived items must be unarchived before editing");
  }

  // Build update data, handling null values for optional fields
  const updateData: Prisma.ItemUpdateInput = {};

  if (validated.name !== undefined) {
    updateData.name = validated.name;
  }
  if (validated.status !== undefined) {
    updateData.status = validated.status;

    // Handle completedAt lifecycle transitions
    if (validated.status === ItemStatus.completed && !existing.completedAt) {
      // Transitioning TO completed: set completedAt
      updateData.completedAt = new Date();
    } else if (validated.status !== ItemStatus.completed && existing.completedAt) {
      // Transitioning AWAY FROM completed: clear completedAt
      updateData.completedAt = null;
    }
  }
  if (validated.tag !== undefined) {
    updateData.tag = validated.tag;
  }
  if (validated.summary !== undefined) {
    updateData.summary = validated.summary;
  }
  if (validated.metricValue !== undefined) {
    updateData.metricValue = validated.metricValue;
  }

  // Handle checklist updates: delete all existing and create new ones
  if (validated.checklist !== undefined) {
    updateData.checklistItems = {
      deleteMany: {},
      create: validated.checklist.map((item) => ({
        text: item.text,
        done: item.done,
        position: item.position,
      })),
    };
  }

  return await prisma.item.update({
    where: { id: itemId },
    data: updateData,
    include: {
      checklistItems: {
        orderBy: { position: "asc" },
      },
    },
  });
}

/**
 * Archive an item (soft delete), scoped to the user
 */
export async function archiveItem(userId: string, itemId: string): Promise<ItemWithChecklist> {
  // Verify the item belongs to the user
  const existing = await prisma.item.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Item not found or access denied");
  }

  return await prisma.item.update({
    where: { id: itemId },
    data: { archivedAt: new Date() },
    include: {
      checklistItems: {
        orderBy: { position: "asc" },
      },
    },
  });
}

/**
 * Unarchive an item (restore from archive), scoped to the user
 */
export async function unarchiveItem(userId: string, itemId: string): Promise<ItemWithChecklist> {
  // Verify the item belongs to the user
  const existing = await prisma.item.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Item not found or access denied");
  }

  return await prisma.item.update({
    where: { id: itemId },
    data: { archivedAt: null },
    include: {
      checklistItems: {
        orderBy: { position: "asc" },
      },
    },
  });
}

/**
 * Delete an item (hard delete), scoped to the user
 * Checklist items are cascade deleted automatically via FK constraint
 */
export async function deleteItem(userId: string, itemId: string): Promise<void> {
  // Verify the item belongs to the user
  const existing = await prisma.item.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Item not found or access denied");
  }

  await prisma.item.delete({
    where: { id: itemId },
  });
}
