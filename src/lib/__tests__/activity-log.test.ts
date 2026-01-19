// @vitest-environment node
import "dotenv/config";
import { describe, it, expect, beforeEach } from "vitest";
import { createActivityLog, listActivityLogs } from "../activity-log";
import prisma from "../db";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/saas_foundations_dev?schema=public";
}

// Test user IDs for isolation
const TEST_USER_1 = "activity_test_user_001";
const TEST_USER_2 = "activity_test_user_002";
const TEST_USER_EMAIL_1 = "activity_test1@example.com";
const TEST_USER_EMAIL_2 = "activity_test2@example.com";

describe("ActivityLog data layer", () => {
  beforeEach(async () => {
    // Clean up test data before each test (activity logs first due to FK)
    await prisma.activityLog.deleteMany({
      where: {
        userId: {
          in: [TEST_USER_1, TEST_USER_2],
        },
      },
    });

    // Delete and recreate test users
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: { in: [TEST_USER_1, TEST_USER_2] } },
          { email: { in: [TEST_USER_EMAIL_1, TEST_USER_EMAIL_2] } },
        ],
      },
    });

    await prisma.user.createMany({
      data: [
        {
          id: TEST_USER_1,
          email: TEST_USER_EMAIL_1,
          passwordHash: "test_hash",
        },
        {
          id: TEST_USER_2,
          email: TEST_USER_EMAIL_2,
          passwordHash: "test_hash",
        },
      ],
    });
  });

  describe("createActivityLog", () => {
    it("should create an activity log entry", async () => {
      const log = await createActivityLog(TEST_USER_1, {
        action: "item.created",
        entityType: "Item",
        entityId: "item_123",
        metadata: { name: "Test Item" },
      });

      expect(log).toBeDefined();
      expect(log.userId).toBe(TEST_USER_1);
      expect(log.action).toBe("item.created");
      expect(log.entityType).toBe("Item");
      expect(log.entityId).toBe("item_123");
      expect(log.metadata).toEqual({ name: "Test Item" });
    });

    it("should create activity log with minimal fields", async () => {
      const log = await createActivityLog(TEST_USER_1, {
        action: "user.login",
      });

      expect(log.action).toBe("user.login");
      expect(log.entityType).toBeNull();
      expect(log.entityId).toBeNull();
      expect(log.metadata).toBeNull();
    });

    it("should create logs scoped to different users", async () => {
      const log1 = await createActivityLog(TEST_USER_1, {
        action: "action.1",
      });
      const log2 = await createActivityLog(TEST_USER_2, {
        action: "action.2",
      });

      expect(log1.userId).toBe(TEST_USER_1);
      expect(log2.userId).toBe(TEST_USER_2);
      expect(log1.id).not.toBe(log2.id);
    });
  });

  describe("listActivityLogs", () => {
    it("should list activity logs for a specific user", async () => {
      await createActivityLog(TEST_USER_1, { action: "action.1" });
      await createActivityLog(TEST_USER_1, { action: "action.2" });
      await createActivityLog(TEST_USER_2, { action: "action.3" });

      const logs = await listActivityLogs(TEST_USER_1);

      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.userId === TEST_USER_1)).toBe(true);
    });

    it("should filter by entityType", async () => {
      await createActivityLog(TEST_USER_1, {
        action: "item.created",
        entityType: "Item",
      });
      await createActivityLog(TEST_USER_1, {
        action: "user.updated",
        entityType: "User",
      });

      const itemLogs = await listActivityLogs(TEST_USER_1, { entityType: "Item" });
      expect(itemLogs).toHaveLength(1);
      expect(itemLogs[0].entityType).toBe("Item");

      const userLogs = await listActivityLogs(TEST_USER_1, { entityType: "User" });
      expect(userLogs).toHaveLength(1);
      expect(userLogs[0].entityType).toBe("User");
    });

    it("should filter by entityId", async () => {
      await createActivityLog(TEST_USER_1, {
        action: "item.created",
        entityId: "item_123",
      });
      await createActivityLog(TEST_USER_1, {
        action: "item.updated",
        entityId: "item_456",
      });

      const logs = await listActivityLogs(TEST_USER_1, { entityId: "item_123" });
      expect(logs).toHaveLength(1);
      expect(logs[0].entityId).toBe("item_123");
    });

    it("should support pagination", async () => {
      await createActivityLog(TEST_USER_1, { action: "action.1" });
      await createActivityLog(TEST_USER_1, { action: "action.2" });
      await createActivityLog(TEST_USER_1, { action: "action.3" });

      const firstPage = await listActivityLogs(TEST_USER_1, { limit: 2 });
      expect(firstPage).toHaveLength(2);

      const secondPage = await listActivityLogs(TEST_USER_1, { limit: 2, offset: 2 });
      expect(secondPage).toHaveLength(1);
    });

    it("should order logs by createdAt descending", async () => {
      const log1 = await prisma.activityLog.create({
        data: {
          userId: TEST_USER_1,
          action: "first",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      });
      const log2 = await prisma.activityLog.create({
        data: {
          userId: TEST_USER_1,
          action: "second",
          createdAt: new Date("2026-01-02T00:00:00Z"),
        },
      });

      const logs = await listActivityLogs(TEST_USER_1);
      expect(logs[0].id).toBe(log2.id);
      expect(logs[1].id).toBe(log1.id);
    });

    it("should combine filters", async () => {
      const log1 = await createActivityLog(TEST_USER_1, {
        action: "item.created",
        entityType: "Item",
        entityId: "item_123",
      });
      await createActivityLog(TEST_USER_1, {
        action: "item.created",
        entityType: "Item",
        entityId: "item_456",
      });
      const log3 = await createActivityLog(TEST_USER_1, {
        action: "item.updated",
        entityType: "Item",
        entityId: "item_123",
      });

      const logs = await listActivityLogs(TEST_USER_1, {
        entityType: "Item",
        entityId: "item_123",
      });
      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.entityType === "Item" && log.entityId === "item_123")).toBe(
        true
      );
      expect(logs.map((log) => log.id).sort()).toEqual([log1.id, log3.id].sort());
    });
  });
});
