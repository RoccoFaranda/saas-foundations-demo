import { z } from "zod";
import { ItemStatus, ItemTag } from "../../generated/prisma/enums";

const itemStatusValues = Object.values(ItemStatus) as [ItemStatus, ...ItemStatus[]];
const itemTagValues = Object.values(ItemTag) as [ItemTag, ...ItemTag[]];

/**
 * Schema for creating a new item
 */
export const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  status: z.enum(itemStatusValues).default(ItemStatus.active),
  tag: z.enum(itemTagValues).optional(),
  summary: z.string().max(1000).optional(),
  metricValue: z.number().int().min(0).max(100).optional(),
});

export type CreateItemInput = z.input<typeof createItemSchema>;
export type CreateItemOutput = z.output<typeof createItemSchema>;

/**
 * Schema for updating an item
 * Requires at least one field to be provided
 */
export const updateItemSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    status: z.enum(itemStatusValues).optional(),
    tag: z.enum(itemTagValues).nullable().optional(),
    summary: z.string().max(1000).nullable().optional(),
    metricValue: z.number().int().min(0).max(100).nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided for update",
  });

export type UpdateItemInput = z.input<typeof updateItemSchema>;
export type UpdateItemOutput = z.output<typeof updateItemSchema>;
