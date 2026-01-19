import "server-only";
import prisma from "./db";
import { createActivityLogSchema } from "./validation/activity-log";
import type { CreateActivityLogInput } from "./validation/activity-log";
import type { ActivityLog, Prisma } from "../generated/prisma/client";

/**
 * Create a new activity log entry for a user
 */
export async function createActivityLog(
  userId: string,
  input: CreateActivityLogInput
): Promise<ActivityLog> {
  const validated = createActivityLogSchema.parse(input);

  return await prisma.activityLog.create({
    data: {
      userId,
      action: validated.action,
      entityType: validated.entityType,
      entityId: validated.entityId,
      metadata: validated.metadata as Prisma.InputJsonValue,
    },
  });
}

/**
 * List activity logs for a user with optional filtering
 */
export async function listActivityLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    entityType?: string;
    entityId?: string;
  }
): Promise<ActivityLog[]> {
  const where: {
    userId: string;
    entityType?: string;
    entityId?: string;
  } = {
    userId,
  };

  if (options?.entityType) {
    where.entityType = options.entityType;
  }

  if (options?.entityId) {
    where.entityId = options.entityId;
  }

  return await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit,
    skip: options?.offset,
  });
}
