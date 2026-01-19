import "server-only";
import prisma from "./db";
import { createItemSchema, updateItemSchema } from "./validation/item";
import type { CreateItemInput, UpdateItemInput } from "./validation/item";
import type { Item } from "../generated/prisma/client";
import { ItemStatus, ItemTag } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";

/**
 * Create a new item for a user
 */
export async function createItem(userId: string, input: CreateItemInput): Promise<Item> {
  const validated = createItemSchema.parse(input);

  return await prisma.item.create({
    data: {
      userId,
      name: validated.name,
      status: validated.status,
      tag: validated.tag,
      summary: validated.summary,
      metricValue: validated.metricValue,
    },
  });
}

/**
 * List items for a user with optional filtering
 */
export async function listItems(
  userId: string,
  options?: {
    status?: ItemStatus;
    tag?: ItemTag;
    limit?: number;
    offset?: number;
  }
): Promise<Item[]> {
  const where: Prisma.ItemWhereInput = {
    userId,
  };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.tag) {
    where.tag = options.tag;
  }

  return await prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit,
    skip: options?.offset,
  });
}

/**
 * Get a single item by ID, scoped to the user
 */
export async function getItem(userId: string, itemId: string): Promise<Item | null> {
  return await prisma.item.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });
}

/**
 * Update an item, scoped to the user
 */
export async function updateItem(
  userId: string,
  itemId: string,
  input: UpdateItemInput
): Promise<Item> {
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

  // Build update data, handling null values for optional fields
  const updateData: Prisma.ItemUpdateInput = {};

  if (validated.name !== undefined) {
    updateData.name = validated.name;
  }
  if (validated.status !== undefined) {
    updateData.status = validated.status;
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

  return await prisma.item.update({
    where: { id: itemId },
    data: updateData,
  });
}

/**
 * Delete an item, scoped to the user
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
