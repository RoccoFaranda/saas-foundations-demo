// @vitest-environment node
import "dotenv/config";
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import prisma from "@/src/lib/db";
import { createItem, listItems } from "@/src/lib/items";
import { listActivityLogs } from "@/src/lib/activity-log";
import { ItemStatus } from "@/src/generated/prisma/enums";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth to return test user
const TEST_USER_ID = "dashboard_actions_test_user";
const TEST_USER_EMAIL = "dashboard_actions_test@example.com";

vi.mock("@/src/lib/auth", () => ({
  requireVerifiedUser: vi.fn().mockResolvedValue({
    id: TEST_USER_ID,
    email: TEST_USER_EMAIL,
    emailVerified: new Date(),
  }),
}));

// Import actions after mocks are set up
const {
  createItemAction,
  updateItemAction,
  deleteItemAction,
  archiveItemAction,
  unarchiveItemAction,
  importSampleDataAction,
} = await import("../actions");

describe("Dashboard actions", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.activityLog.deleteMany({
      where: { userId: TEST_USER_ID },
    });
    await prisma.item.deleteMany({
      where: { userId: TEST_USER_ID },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [{ id: TEST_USER_ID }, { email: TEST_USER_EMAIL }],
      },
    });

    // Create test user
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        passwordHash: "test_hash",
        emailVerified: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.activityLog.deleteMany({
      where: { userId: TEST_USER_ID },
    });
    await prisma.item.deleteMany({
      where: { userId: TEST_USER_ID },
    });
    await prisma.user.deleteMany({
      where: { id: TEST_USER_ID },
    });
    await prisma.$disconnect();
  });

  describe("createItemAction", () => {
    it("should create an item and log activity", async () => {
      const result = await createItemAction({
        name: "Test Project",
        status: "active",
        tag: "feature",
        summary: "Test summary",
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty("itemId");

      // Verify item was created
      const items = await listItems(TEST_USER_ID);
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("Test Project");

      // Verify activity log was created
      const logs = await listActivityLogs(TEST_USER_ID);
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("item.created");
      expect(logs[0].entityType).toBe("item");
      expect(logs[0].metadata).toEqual({ itemName: "Test Project" });
    });

    it("should create item with checklist", async () => {
      const result = await createItemAction({
        name: "Project with Checklist",
        checklist: [
          { id: "temp-1", text: "Task 1", done: false },
          { id: "temp-2", text: "Task 2", done: true },
        ],
      });

      expect(result.success).toBe(true);

      const items = await listItems(TEST_USER_ID);
      expect(items[0].checklistItems).toHaveLength(2);
      expect(items[0].checklistItems[0].text).toBe("Task 1");
      expect(items[0].checklistItems[1].text).toBe("Task 2");
    });

    it("should reject invalid input", async () => {
      const result = await createItemAction({
        name: "", // Empty name should fail
      });

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("updateItemAction", () => {
    it("should update an item and log activity", async () => {
      // Create an item first
      const item = await createItem(TEST_USER_ID, {
        name: "Original Name",
        status: ItemStatus.active,
      });

      const result = await updateItemAction(item.id, {
        name: "Updated Name",
        status: "completed",
      });

      expect(result.success).toBe(true);

      // Verify item was updated
      const items = await listItems(TEST_USER_ID);
      expect(items[0].name).toBe("Updated Name");
      expect(items[0].status).toBe("completed");

      // Verify activity log was created
      const logs = await listActivityLogs(TEST_USER_ID);
      const updateLog = logs.find((l) => l.action === "item.updated");
      expect(updateLog).toBeDefined();
      expect(updateLog?.entityId).toBe(item.id);
      expect(updateLog?.metadata).toEqual({ itemName: "Updated Name" });
    });

    it("should update checklist", async () => {
      const item = await createItem(TEST_USER_ID, {
        name: "Item with checklist",
        checklist: [{ text: "Old task", done: false, position: 0 }],
      });

      const result = await updateItemAction(item.id, {
        checklist: [
          { id: "new-1", text: "New task 1", done: true },
          { id: "new-2", text: "New task 2", done: false },
        ],
      });

      expect(result.success).toBe(true);

      const items = await listItems(TEST_USER_ID);
      expect(items[0].checklistItems).toHaveLength(2);
      expect(items[0].checklistItems[0].text).toBe("New task 1");
    });

    it("should reject update for non-existent item", async () => {
      const result = await updateItemAction("non-existent-id", {
        name: "Updated",
      });

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error");
    });

    it("should reject update for archived item", async () => {
      const item = await createItem(TEST_USER_ID, {
        name: "Archived Item",
      });
      await archiveItemAction(item.id);

      const result = await updateItemAction(item.id, {
        name: "Updated Name",
      });

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error");
      if (!result.success) {
        expect(result.error).toContain("Unarchive");
      }
    });
  });

  describe("deleteItemAction", () => {
    it("should delete an archived item and log activity", async () => {
      const item = await createItem(TEST_USER_ID, {
        name: "To Be Deleted",
      });
      await archiveItemAction(item.id);

      const result = await deleteItemAction(item.id);

      expect(result.success).toBe(true);

      // Verify item was deleted
      const items = await listItems(TEST_USER_ID);
      expect(items).toHaveLength(0);

      // Verify activity log was created
      const logs = await listActivityLogs(TEST_USER_ID);
      const deleteLog = logs.find((l) => l.action === "item.deleted");
      expect(deleteLog).toBeDefined();
      expect(deleteLog?.entityId).toBe(item.id);
      expect(deleteLog?.metadata).toEqual({ itemName: "To Be Deleted" });
    });

    it("should reject delete for non-archived item", async () => {
      const item = await createItem(TEST_USER_ID, {
        name: "Not Archived",
      });

      const result = await deleteItemAction(item.id);

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error");
      if (!result.success) {
        expect(result.error).toContain("Archive");
      }
    });

    it("should reject delete for non-existent item", async () => {
      const result = await deleteItemAction("non-existent-id");

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("archiveItemAction", () => {
    it("should archive an item and log activity", async () => {
      const item = await createItem(TEST_USER_ID, {
        name: "Item to Archive",
      });

      const result = await archiveItemAction(item.id);

      expect(result.success).toBe(true);

      // Verify item was archived
      const items = await listItems(TEST_USER_ID, { includeArchived: true });
      expect(items).toHaveLength(1);
      expect(items[0].archivedAt).toBeDefined();

      // Verify not in default list (archived excluded by default)
      const nonArchivedItems = await listItems(TEST_USER_ID);
      expect(nonArchivedItems).toHaveLength(0);

      // Verify activity log was created
      const logs = await listActivityLogs(TEST_USER_ID);
      const archiveLog = logs.find((l) => l.action === "item.archived");
      expect(archiveLog).toBeDefined();
      expect(archiveLog?.entityId).toBe(item.id);
      expect(archiveLog?.metadata).toEqual({ itemName: "Item to Archive" });
    });

    it("should reject archive for non-existent item", async () => {
      const result = await archiveItemAction("non-existent-id");

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("unarchiveItemAction", () => {
    it("should unarchive an item and log activity", async () => {
      const item = await createItem(TEST_USER_ID, {
        name: "Item to Unarchive",
      });

      // First archive it
      await archiveItemAction(item.id);

      // Then unarchive it
      const result = await unarchiveItemAction(item.id);

      expect(result.success).toBe(true);

      // Verify item was unarchived
      const items = await listItems(TEST_USER_ID);
      expect(items).toHaveLength(1);
      expect(items[0].archivedAt).toBeNull();

      // Verify activity log was created
      const logs = await listActivityLogs(TEST_USER_ID);
      const unarchiveLog = logs.find((l) => l.action === "item.unarchived");
      expect(unarchiveLog).toBeDefined();
      expect(unarchiveLog?.entityId).toBe(item.id);
      expect(unarchiveLog?.metadata).toEqual({ itemName: "Item to Unarchive" });
    });

    it("should reject unarchive for non-existent item", async () => {
      const result = await unarchiveItemAction("non-existent-id");

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error");
    });
  });

  describe("importSampleDataAction", () => {
    it("should import sample data for user with no items", async () => {
      const result = await importSampleDataAction();

      expect(result.success).toBe(true);

      // Verify items were created
      const items = await listItems(TEST_USER_ID);
      expect(items.length).toBeGreaterThan(0);

      // Verify activity logs were created for each item
      const logs = await listActivityLogs(TEST_USER_ID);
      const createLogs = logs.filter((l) => l.action === "item.created");
      expect(createLogs.length).toBe(items.length);

      // Verify metadata includes source
      expect(createLogs[0].metadata).toHaveProperty("source", "sample_import");
    });

    it("should preserve varied timestamps from sample data", async () => {
      const result = await importSampleDataAction();

      expect(result.success).toBe(true);

      // Fetch all items
      const items = await listItems(TEST_USER_ID, { includeArchived: true });

      // Verify timestamps are varied (not all the same)
      const uniqueMonths = new Set(
        items.map((item) => item.updatedAt.toISOString().substring(0, 7))
      );
      expect(uniqueMonths.size).toBeGreaterThan(1); // Should span multiple months

      // Verify completed items have completedAt
      const completedItems = items.filter((item) => item.status === ItemStatus.completed);
      expect(completedItems.length).toBeGreaterThan(0);
      for (const item of completedItems) {
        expect(item.completedAt).not.toBeNull();
        expect(item.completedAt).toBeInstanceOf(Date);
      }

      // Verify non-completed items don't have completedAt
      const nonCompletedItems = items.filter((item) => item.status !== ItemStatus.completed);
      for (const item of nonCompletedItems) {
        expect(item.completedAt).toBeNull();
      }

      // Verify createdAt dates are preserved and varied
      const uniqueCreatedMonths = new Set(
        items.map((item) => item.createdAt.toISOString().substring(0, 7))
      );
      expect(uniqueCreatedMonths.size).toBeGreaterThan(1); // Should span multiple months
    });

    it("should reject import when user already has items (idempotency)", async () => {
      // Create an existing item
      await createItem(TEST_USER_ID, { name: "Existing Item" });

      const result = await importSampleDataAction();

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("no existing projects");

      // Verify no additional items were created
      const items = await listItems(TEST_USER_ID);
      expect(items).toHaveLength(1);
    });
  });
});
