import { z } from "zod";
import { ItemStatus, ItemTag } from "../../generated/prisma/enums";

const itemStatusValues = Object.values(ItemStatus) as [ItemStatus, ...ItemStatus[]];
const itemTagValues = Object.values(ItemTag) as [ItemTag, ...ItemTag[]];

/**
 * Schema for a single checklist item
 */
export const checklistItemSchema = z.object({
  text: z.string().min(1).max(500),
  done: z.boolean().default(false),
  position: z.number().int().min(0),
});

export type ChecklistItemInput = z.input<typeof checklistItemSchema>;
const checklistSchema = z
  .array(checklistItemSchema)
  .max(50)
  .superRefine((items, ctx) => {
    const seenPositions = new Set<number>();
    for (let index = 0; index < items.length; index += 1) {
      const checklistItem = items[index];
      if (seenPositions.has(checklistItem.position)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "position"],
          message: "Checklist positions must be unique per item",
        });
      } else {
        seenPositions.add(checklistItem.position);
      }
    }
  });

/**
 * Schema for creating a new item
 */
export const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  status: z.enum(itemStatusValues).default(ItemStatus.active),
  tag: z.enum(itemTagValues).optional(),
  summary: z.string().max(1000).optional(),
  checklist: checklistSchema.optional(),
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
    checklist: checklistSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided for update",
  });

export type UpdateItemInput = z.input<typeof updateItemSchema>;
export type UpdateItemOutput = z.output<typeof updateItemSchema>;
