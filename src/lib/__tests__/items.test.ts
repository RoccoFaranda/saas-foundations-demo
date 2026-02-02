// @vitest-environment node
import "dotenv/config";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createItem, listItems, getItem, updateItem, deleteItem } from "../items";
import { ItemStatus, ItemTag } from "../../generated/prisma/enums";
import prisma from "../db";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

// Test user IDs for isolation
const TEST_USER_1 = "items_test_user_001";
const TEST_USER_2 = "items_test_user_002";
const TEST_USER_EMAIL_1 = "items_test1@example.com";
const TEST_USER_EMAIL_2 = "items_test2@example.com";

describe("Items data layer", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    // Checklist items are cascade deleted via FK, so just delete items
    await prisma.item.deleteMany({
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

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("createItem", () => {
    it("should create an item for a user", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Test Item",
        status: ItemStatus.active,
        tag: ItemTag.feature,
        summary: "Test summary",
        metricValue: 50,
      });

      expect(item).toBeDefined();
      expect(item.userId).toBe(TEST_USER_1);
      expect(item.name).toBe("Test Item");
      expect(item.status).toBe(ItemStatus.active);
      expect(item.tag).toBe(ItemTag.feature);
      expect(item.summary).toBe("Test summary");
      expect(item.metricValue).toBe(50);
    });

    it("should create an item with default status", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Test Item Default",
      });

      expect(item.status).toBe(ItemStatus.active);
    });

    it("should create items scoped to different users", async () => {
      const item1 = await createItem(TEST_USER_1, {
        name: "User 1 Item",
      });
      const item2 = await createItem(TEST_USER_2, {
        name: "User 2 Item",
      });

      expect(item1.userId).toBe(TEST_USER_1);
      expect(item2.userId).toBe(TEST_USER_2);
      expect(item1.id).not.toBe(item2.id);
    });

    it("should reject checklist with duplicate positions on create", async () => {
      await expect(
        createItem(TEST_USER_1, {
          name: "Invalid checklist positions",
          checklist: [
            { text: "Step 1", done: false, position: 0 },
            { text: "Step 2", done: true, position: 0 },
          ],
        })
      ).rejects.toThrow("Checklist positions must be unique per item");
    });
  });

  describe("listItems", () => {
    it("should list items for a specific user", async () => {
      await createItem(TEST_USER_1, { name: "Item 1" });
      await createItem(TEST_USER_1, { name: "Item 2" });
      await createItem(TEST_USER_2, { name: "User 2 Item" });

      const items = await listItems(TEST_USER_1);

      expect(items).toHaveLength(2);
      expect(items.every((item) => item.userId === TEST_USER_1)).toBe(true);
    });

    it("should filter items by status", async () => {
      await createItem(TEST_USER_1, {
        name: "Active Item",
        status: ItemStatus.active,
      });
      await createItem(TEST_USER_1, {
        name: "Completed Item",
        status: ItemStatus.completed,
      });

      const activeItems = await listItems(TEST_USER_1, { status: ItemStatus.active });
      expect(activeItems).toHaveLength(1);
      expect(activeItems[0].name).toBe("Active Item");

      const completedItems = await listItems(TEST_USER_1, { status: ItemStatus.completed });
      expect(completedItems).toHaveLength(1);
      expect(completedItems[0].name).toBe("Completed Item");
    });

    it("should filter items by tag", async () => {
      await createItem(TEST_USER_1, {
        name: "Feature Item",
        tag: ItemTag.feature,
      });
      await createItem(TEST_USER_1, {
        name: "Bugfix Item",
        tag: ItemTag.bugfix,
      });

      const featureItems = await listItems(TEST_USER_1, { tag: ItemTag.feature });
      expect(featureItems).toHaveLength(1);
      expect(featureItems[0].name).toBe("Feature Item");
    });

    it("should support pagination", async () => {
      await createItem(TEST_USER_1, { name: "Item 1" });
      await createItem(TEST_USER_1, { name: "Item 2" });
      await createItem(TEST_USER_1, { name: "Item 3" });

      const firstPage = await listItems(TEST_USER_1, { limit: 2 });
      expect(firstPage).toHaveLength(2);

      const secondPage = await listItems(TEST_USER_1, { limit: 2, offset: 2 });
      expect(secondPage).toHaveLength(1);
    });

    it("should order items by createdAt descending", async () => {
      const item1 = await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "First Item",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      });
      const item2 = await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "Second Item",
          createdAt: new Date("2026-01-02T00:00:00Z"),
        },
      });

      const items = await listItems(TEST_USER_1);
      expect(items[0].id).toBe(item2.id);
      expect(items[1].id).toBe(item1.id);
    });
  });

  describe("getItem", () => {
    it("should get an item by ID for the user", async () => {
      const created = await createItem(TEST_USER_1, { name: "Test Item" });

      const item = await getItem(TEST_USER_1, created.id);

      expect(item).toBeDefined();
      expect(item?.id).toBe(created.id);
      expect(item?.userId).toBe(TEST_USER_1);
    });

    it("should return null if item does not exist", async () => {
      const item = await getItem(TEST_USER_1, "non-existent-id");
      expect(item).toBeNull();
    });

    it("should return null if item belongs to different user", async () => {
      const item = await createItem(TEST_USER_1, { name: "User 1 Item" });

      const result = await getItem(TEST_USER_2, item.id);
      expect(result).toBeNull();
    });
  });

  describe("updateItem", () => {
    it("should update an item", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Original Name",
        status: ItemStatus.active,
      });

      const updated = await updateItem(TEST_USER_1, item.id, {
        name: "Updated Name",
        status: ItemStatus.completed,
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.status).toBe(ItemStatus.completed);
    });

    it("should update partial fields", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Original Name",
        status: ItemStatus.active,
      });

      const updated = await updateItem(TEST_USER_1, item.id, {
        name: "Updated Name",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.status).toBe(ItemStatus.active); // Unchanged
    });

    it("should allow setting tag to null", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Item with tag",
        tag: ItemTag.feature,
      });

      const updated = await updateItem(TEST_USER_1, item.id, {
        tag: null,
      });

      expect(updated.tag).toBeNull();
    });

    it("should throw error if item does not belong to user", async () => {
      const item = await createItem(TEST_USER_1, { name: "User 1 Item" });

      await expect(updateItem(TEST_USER_2, item.id, { name: "Hacked" })).rejects.toThrow(
        "Item not found or access denied"
      );
    });

    it("should throw error if item does not exist", async () => {
      await expect(updateItem(TEST_USER_1, "non-existent-id", { name: "Test" })).rejects.toThrow(
        "Item not found or access denied"
      );
    });

    it("should reject checklist with duplicate positions on update", async () => {
      const item = await createItem(TEST_USER_1, { name: "Duplicate positions update target" });

      await expect(
        updateItem(TEST_USER_1, item.id, {
          checklist: [
            { text: "Step 1", done: false, position: 0 },
            { text: "Step 2", done: true, position: 0 },
          ],
        })
      ).rejects.toThrow("Checklist positions must be unique per item");
    });
  });

  describe("deleteItem", () => {
    it("should delete an item", async () => {
      const item = await createItem(TEST_USER_1, { name: "To Delete" });

      await deleteItem(TEST_USER_1, item.id);

      const found = await getItem(TEST_USER_1, item.id);
      expect(found).toBeNull();
    });

    it("should throw error if item does not belong to user", async () => {
      const item = await createItem(TEST_USER_1, { name: "User 1 Item" });

      await expect(deleteItem(TEST_USER_2, item.id)).rejects.toThrow(
        "Item not found or access denied"
      );
    });

    it("should throw error if item does not exist", async () => {
      await expect(deleteItem(TEST_USER_1, "non-existent-id")).rejects.toThrow(
        "Item not found or access denied"
      );
    });

    it("should cascade delete checklist items", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Item with checklist",
        checklist: [
          { text: "Step 1", done: false, position: 0 },
          { text: "Step 2", done: true, position: 1 },
        ],
      });

      // Verify checklist items exist
      const checklistItems = await prisma.checklistItem.findMany({
        where: { itemId: item.id },
      });
      expect(checklistItems).toHaveLength(2);

      // Delete the item
      await deleteItem(TEST_USER_1, item.id);

      // Verify checklist items are also deleted
      const remainingChecklistItems = await prisma.checklistItem.findMany({
        where: { itemId: item.id },
      });
      expect(remainingChecklistItems).toHaveLength(0);
    });
  });

  describe("Checklist persistence", () => {
    describe("createItem with checklist", () => {
      it("should create an item with checklist items", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "Item with checklist",
          checklist: [
            { text: "First task", done: false, position: 0 },
            { text: "Second task", done: true, position: 1 },
            { text: "Third task", done: false, position: 2 },
          ],
        });

        expect(item.checklistItems).toHaveLength(3);
        expect(item.checklistItems[0].text).toBe("First task");
        expect(item.checklistItems[0].done).toBe(false);
        expect(item.checklistItems[0].position).toBe(0);
        expect(item.checklistItems[1].text).toBe("Second task");
        expect(item.checklistItems[1].done).toBe(true);
        expect(item.checklistItems[2].text).toBe("Third task");
      });

      it("should create an item without checklist", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "Item without checklist",
        });

        expect(item.checklistItems).toHaveLength(0);
      });

      it("should create an item with empty checklist", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "Item with empty checklist",
          checklist: [],
        });

        expect(item.checklistItems).toHaveLength(0);
      });

      it("should order checklist items by position", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "Ordered checklist",
          checklist: [
            { text: "Third", done: false, position: 2 },
            { text: "First", done: false, position: 0 },
            { text: "Second", done: false, position: 1 },
          ],
        });

        expect(item.checklistItems[0].text).toBe("First");
        expect(item.checklistItems[1].text).toBe("Second");
        expect(item.checklistItems[2].text).toBe("Third");
      });
    });

    describe("listItems includes checklists", () => {
      it("should include checklist items when listing", async () => {
        await createItem(TEST_USER_1, {
          name: "Item 1",
          checklist: [{ text: "Task 1", done: false, position: 0 }],
        });
        await createItem(TEST_USER_1, {
          name: "Item 2",
          checklist: [
            { text: "Task A", done: true, position: 0 },
            { text: "Task B", done: false, position: 1 },
          ],
        });

        const items = await listItems(TEST_USER_1);

        expect(items).toHaveLength(2);
        expect(items[0].checklistItems).toBeDefined();
        expect(items[1].checklistItems).toBeDefined();
        // Most recent first (Item 2)
        expect(items[0].name).toBe("Item 2");
        expect(items[0].checklistItems).toHaveLength(2);
        expect(items[1].checklistItems).toHaveLength(1);
      });
    });

    describe("getItem includes checklist", () => {
      it("should include checklist items when getting", async () => {
        const created = await createItem(TEST_USER_1, {
          name: "Test Item",
          checklist: [
            { text: "Step 1", done: true, position: 0 },
            { text: "Step 2", done: false, position: 1 },
          ],
        });

        const item = await getItem(TEST_USER_1, created.id);

        expect(item).not.toBeNull();
        expect(item!.checklistItems).toHaveLength(2);
        expect(item!.checklistItems[0].text).toBe("Step 1");
        expect(item!.checklistItems[0].done).toBe(true);
      });
    });

    describe("updateItem with checklist", () => {
      it("should replace checklist items", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "Item",
          checklist: [
            { text: "Old 1", done: false, position: 0 },
            { text: "Old 2", done: true, position: 1 },
          ],
        });

        const updated = await updateItem(TEST_USER_1, item.id, {
          checklist: [
            { text: "New 1", done: true, position: 0 },
            { text: "New 2", done: false, position: 1 },
            { text: "New 3", done: false, position: 2 },
          ],
        });

        expect(updated.checklistItems).toHaveLength(3);
        expect(updated.checklistItems[0].text).toBe("New 1");
        expect(updated.checklistItems[0].done).toBe(true);
        expect(updated.checklistItems[1].text).toBe("New 2");
        expect(updated.checklistItems[2].text).toBe("New 3");
      });

      it("should clear checklist when updated to empty array", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "Item",
          checklist: [{ text: "Task", done: false, position: 0 }],
        });

        const updated = await updateItem(TEST_USER_1, item.id, {
          checklist: [],
        });

        expect(updated.checklistItems).toHaveLength(0);
      });

      it("should update item fields without affecting checklist", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "Original",
          status: ItemStatus.active,
          checklist: [{ text: "Task", done: false, position: 0 }],
        });

        const updated = await updateItem(TEST_USER_1, item.id, {
          name: "Updated",
          status: ItemStatus.completed,
        });

        expect(updated.name).toBe("Updated");
        expect(updated.status).toBe(ItemStatus.completed);
        expect(updated.checklistItems).toHaveLength(1);
        expect(updated.checklistItems[0].text).toBe("Task");
      });

      it("should update both item fields and checklist together", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "Original",
          checklist: [{ text: "Old", done: false, position: 0 }],
        });

        const updated = await updateItem(TEST_USER_1, item.id, {
          name: "Updated",
          status: ItemStatus.completed,
          checklist: [
            { text: "New 1", done: true, position: 0 },
            { text: "New 2", done: false, position: 1 },
          ],
        });

        expect(updated.name).toBe("Updated");
        expect(updated.status).toBe(ItemStatus.completed);
        expect(updated.checklistItems).toHaveLength(2);
        expect(updated.checklistItems[0].text).toBe("New 1");
      });
    });

    describe("Cross-user checklist access", () => {
      it("should not allow user to update another users checklist", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "User 1 Item",
          checklist: [{ text: "Task", done: false, position: 0 }],
        });

        await expect(
          updateItem(TEST_USER_2, item.id, {
            checklist: [{ text: "Hacked", done: true, position: 0 }],
          })
        ).rejects.toThrow("Item not found or access denied");

        // Verify original checklist unchanged
        const verified = await getItem(TEST_USER_1, item.id);
        expect(verified!.checklistItems[0].text).toBe("Task");
      });

      it("should not expose checklist in cross-user getItem", async () => {
        const item = await createItem(TEST_USER_1, {
          name: "User 1 Item",
          checklist: [{ text: "Secret task", done: false, position: 0 }],
        });

        const result = await getItem(TEST_USER_2, item.id);
        expect(result).toBeNull();
      });

      it("should not list another users items with checklists", async () => {
        await createItem(TEST_USER_1, {
          name: "User 1 Item",
          checklist: [{ text: "Task", done: false, position: 0 }],
        });
        await createItem(TEST_USER_2, {
          name: "User 2 Item",
          checklist: [{ text: "My task", done: false, position: 0 }],
        });

        const user1Items = await listItems(TEST_USER_1);
        const user2Items = await listItems(TEST_USER_2);

        expect(user1Items).toHaveLength(1);
        expect(user2Items).toHaveLength(1);
        expect(user1Items[0].name).toBe("User 1 Item");
        expect(user2Items[0].name).toBe("User 2 Item");
      });
    });
  });
});
