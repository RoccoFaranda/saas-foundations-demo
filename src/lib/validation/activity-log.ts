import { z } from "zod";

/**
 * Schema for creating a new activity log entry
 */
export const createActivityLogSchema = z.object({
  action: z.string().min(1).max(100),
  entityType: z.string().max(50).optional(),
  entityId: z.string().max(255).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateActivityLogInput = z.infer<typeof createActivityLogSchema>;
