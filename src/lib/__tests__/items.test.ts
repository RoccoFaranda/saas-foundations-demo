// @vitest-environment node
import "dotenv/config";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
  countItems,
  archiveItem,
  unarchiveItem,
} from "../items";
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

  describe("completedAt lifecycle", () => {
    it("should set completedAt when creating item with completed status", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Completed Item",
        status: ItemStatus.completed,
      });

      expect(item.completedAt).toBeDefined();
      expect(item.completedAt).toBeInstanceOf(Date);
      expect(item.status).toBe(ItemStatus.completed);
    });

    it("should not set completedAt when creating item with non-completed status", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Active Item",
        status: ItemStatus.active,
      });

      expect(item.completedAt).toBeNull();
      expect(item.status).toBe(ItemStatus.active);
    });

    it("should set completedAt when transitioning TO completed status", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Item to Complete",
        status: ItemStatus.active,
      });

      expect(item.completedAt).toBeNull();

      const updated = await updateItem(TEST_USER_1, item.id, {
        status: ItemStatus.completed,
      });

      expect(updated.completedAt).toBeDefined();
      expect(updated.completedAt).toBeInstanceOf(Date);
      expect(updated.status).toBe(ItemStatus.completed);
    });

    it("should clear completedAt when transitioning AWAY FROM completed status", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Completed Item",
        status: ItemStatus.completed,
      });

      expect(item.completedAt).toBeDefined();

      const updated = await updateItem(TEST_USER_1, item.id, {
        status: ItemStatus.active,
      });

      expect(updated.completedAt).toBeNull();
      expect(updated.status).toBe(ItemStatus.active);
    });

    it("should not change completedAt if already set and status remains completed", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Completed Item",
        status: ItemStatus.completed,
      });

      const originalCompletedAt = item.completedAt;
      expect(originalCompletedAt).toBeDefined();

      // Update name but keep completed status
      const updated = await updateItem(TEST_USER_1, item.id, {
        name: "Updated Name",
        status: ItemStatus.completed,
      });

      // completedAt should remain the same
      expect(updated.completedAt?.getTime()).toBe(originalCompletedAt?.getTime());
    });

    it("should not affect completedAt when updating other fields", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Test Item",
        status: ItemStatus.active,
      });

      expect(item.completedAt).toBeNull();

      const updated = await updateItem(TEST_USER_1, item.id, {
        name: "Updated Name",
        summary: "New summary",
      });

      expect(updated.completedAt).toBeNull();
    });
  });

  describe("archived filtering", () => {
    it("should exclude archived items by default in listItems", async () => {
      // Create non-archived items
      await createItem(TEST_USER_1, { name: "Active Item 1" });
      await createItem(TEST_USER_1, { name: "Active Item 2" });

      // Create archived item manually via raw query
      const archived = await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "Archived Item",
          status: ItemStatus.active,
          archivedAt: new Date(),
        },
      });

      const items = await listItems(TEST_USER_1);

      expect(items).toHaveLength(2);
      expect(items.find((i) => i.id === archived.id)).toBeUndefined();
      expect(items.every((i) => i.archivedAt === null)).toBe(true);
    });

    it("should include archived items when includeArchived=true in listItems", async () => {
      // Create non-archived items
      await createItem(TEST_USER_1, { name: "Active Item" });

      // Create archived item
      await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "Archived Item",
          status: ItemStatus.completed,
          archivedAt: new Date(),
        },
      });

      const allItems = await listItems(TEST_USER_1, { includeArchived: true });
      const nonArchivedItems = await listItems(TEST_USER_1, { includeArchived: false });

      expect(allItems).toHaveLength(2);
      expect(nonArchivedItems).toHaveLength(1);
    });

    it("should exclude archived items by default in countItems", async () => {
      // Create non-archived items
      await createItem(TEST_USER_1, { name: "Active Item 1" });
      await createItem(TEST_USER_1, { name: "Active Item 2" });

      // Create archived item
      await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "Archived Item",
          status: ItemStatus.active,
          archivedAt: new Date(),
        },
      });

      const count = await countItems(TEST_USER_1);

      expect(count).toBe(2);
    });

    it("should include archived items when includeArchived=true in countItems", async () => {
      // Create non-archived items
      await createItem(TEST_USER_1, { name: "Active Item" });

      // Create archived item
      await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "Archived Item",
          status: ItemStatus.completed,
          archivedAt: new Date(),
        },
      });

      const allCount = await countItems(TEST_USER_1, { includeArchived: true });
      const nonArchivedCount = await countItems(TEST_USER_1, { includeArchived: false });

      expect(allCount).toBe(2);
      expect(nonArchivedCount).toBe(1);
    });

    it("should respect archived filtering with other filters", async () => {
      // Create non-archived completed item
      await createItem(TEST_USER_1, {
        name: "Completed Item",
        status: ItemStatus.completed,
      });

      // Create archived completed item
      await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "Archived Completed Item",
          status: ItemStatus.completed,
          archivedAt: new Date(),
        },
      });

      const completedNonArchived = await listItems(TEST_USER_1, {
        status: ItemStatus.completed,
        includeArchived: false,
      });

      const completedAll = await listItems(TEST_USER_1, {
        status: ItemStatus.completed,
        includeArchived: true,
      });

      expect(completedNonArchived).toHaveLength(1);
      expect(completedAll).toHaveLength(2);
    });

    it("should maintain user isolation with archived filtering", async () => {
      // User 1 items
      await createItem(TEST_USER_1, { name: "User 1 Item" });
      await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "User 1 Archived",
          status: ItemStatus.active,
          archivedAt: new Date(),
        },
      });

      // User 2 items
      await createItem(TEST_USER_2, { name: "User 2 Item" });
      await prisma.item.create({
        data: {
          userId: TEST_USER_2,
          name: "User 2 Archived",
          status: ItemStatus.active,
          archivedAt: new Date(),
        },
      });

      const user1Items = await listItems(TEST_USER_1, { includeArchived: true });
      const user2Items = await listItems(TEST_USER_2, { includeArchived: true });

      expect(user1Items).toHaveLength(2);
      expect(user2Items).toHaveLength(2);
      expect(user1Items.every((i) => i.userId === TEST_USER_1)).toBe(true);
      expect(user2Items.every((i) => i.userId === TEST_USER_2)).toBe(true);
    });
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

    it("should search items by name (case-insensitive)", async () => {
      await createItem(TEST_USER_1, { name: "Alpha Project" });
      await createItem(TEST_USER_1, { name: "Beta Test" });
      await createItem(TEST_USER_1, { name: "Gamma alpha" });

      const results = await listItems(TEST_USER_1, { search: "alpha" });

      expect(results).toHaveLength(2);
      expect(results.map((i) => i.name).sort()).toEqual(["Alpha Project", "Gamma alpha"]);
    });

    it("should search items with partial match", async () => {
      await createItem(TEST_USER_1, { name: "Dashboard Analytics" });
      await createItem(TEST_USER_1, { name: "API Documentation" });
      await createItem(TEST_USER_1, { name: "User Authentication" });

      const results = await listItems(TEST_USER_1, { search: "tion" });

      expect(results).toHaveLength(2);
      expect(results.map((i) => i.name).sort()).toEqual([
        "API Documentation",
        "User Authentication",
      ]);
    });

    it("should combine search with status filter", async () => {
      await createItem(TEST_USER_1, { name: "Auth Flow", status: ItemStatus.active });
      await createItem(TEST_USER_1, { name: "Auth Tests", status: ItemStatus.completed });
      await createItem(TEST_USER_1, { name: "Dashboard", status: ItemStatus.active });

      const results = await listItems(TEST_USER_1, {
        search: "Auth",
        status: ItemStatus.active,
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Auth Flow");
    });

    it("should sort items by name ascending", async () => {
      await createItem(TEST_USER_1, { name: "Charlie" });
      await createItem(TEST_USER_1, { name: "Alpha" });
      await createItem(TEST_USER_1, { name: "Bravo" });

      const items = await listItems(TEST_USER_1, {
        sortBy: "name",
        sortDirection: "asc",
      });

      expect(items.map((i) => i.name)).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("should sort items by name descending", async () => {
      await createItem(TEST_USER_1, { name: "Alpha" });
      await createItem(TEST_USER_1, { name: "Charlie" });
      await createItem(TEST_USER_1, { name: "Bravo" });

      const items = await listItems(TEST_USER_1, {
        sortBy: "name",
        sortDirection: "desc",
      });

      expect(items.map((i) => i.name)).toEqual(["Charlie", "Bravo", "Alpha"]);
    });

    it("should sort items by updatedAt", async () => {
      const item1 = await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "Old Item",
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        },
        include: { checklistItems: true },
      });
      const item2 = await prisma.item.create({
        data: {
          userId: TEST_USER_1,
          name: "New Item",
          updatedAt: new Date("2026-01-15T00:00:00Z"),
        },
        include: { checklistItems: true },
      });

      const ascItems = await listItems(TEST_USER_1, {
        sortBy: "updatedAt",
        sortDirection: "asc",
      });
      expect(ascItems[0].id).toBe(item1.id);
      expect(ascItems[1].id).toBe(item2.id);

      const descItems = await listItems(TEST_USER_1, {
        sortBy: "updatedAt",
        sortDirection: "desc",
      });
      expect(descItems[0].id).toBe(item2.id);
      expect(descItems[1].id).toBe(item1.id);
    });
  });

  describe("countItems", () => {
    it("should count all items for a user", async () => {
      await createItem(TEST_USER_1, { name: "Item 1" });
      await createItem(TEST_USER_1, { name: "Item 2" });
      await createItem(TEST_USER_1, { name: "Item 3" });
      await createItem(TEST_USER_2, { name: "Other User Item" });

      const count = await countItems(TEST_USER_1);

      expect(count).toBe(3);
    });

    it("should count items with status filter", async () => {
      await createItem(TEST_USER_1, { name: "Active 1", status: ItemStatus.active });
      await createItem(TEST_USER_1, { name: "Active 2", status: ItemStatus.active });
      await createItem(TEST_USER_1, { name: "Completed", status: ItemStatus.completed });

      const activeCount = await countItems(TEST_USER_1, { status: ItemStatus.active });
      const completedCount = await countItems(TEST_USER_1, { status: ItemStatus.completed });

      expect(activeCount).toBe(2);
      expect(completedCount).toBe(1);
    });

    it("should count items with tag filter", async () => {
      await createItem(TEST_USER_1, { name: "Feature 1", tag: ItemTag.feature });
      await createItem(TEST_USER_1, { name: "Feature 2", tag: ItemTag.feature });
      await createItem(TEST_USER_1, { name: "Bugfix", tag: ItemTag.bugfix });

      const featureCount = await countItems(TEST_USER_1, { tag: ItemTag.feature });

      expect(featureCount).toBe(2);
    });

    it("should count items with search filter", async () => {
      await createItem(TEST_USER_1, { name: "Alpha Project" });
      await createItem(TEST_USER_1, { name: "Beta Project" });
      await createItem(TEST_USER_1, { name: "Gamma Test" });

      const projectCount = await countItems(TEST_USER_1, { search: "project" });

      expect(projectCount).toBe(2);
    });

    it("should combine multiple filters for count", async () => {
      await createItem(TEST_USER_1, {
        name: "Auth Feature",
        status: ItemStatus.active,
        tag: ItemTag.feature,
      });
      await createItem(TEST_USER_1, {
        name: "Auth Bug",
        status: ItemStatus.active,
        tag: ItemTag.bugfix,
      });
      await createItem(TEST_USER_1, {
        name: "Dashboard Feature",
        status: ItemStatus.completed,
        tag: ItemTag.feature,
      });

      const count = await countItems(TEST_USER_1, {
        search: "Auth",
        status: ItemStatus.active,
      });

      expect(count).toBe(2);
    });

    it("should return 0 for user with no items", async () => {
      const count = await countItems(TEST_USER_1);
      expect(count).toBe(0);
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

    it("should throw error when updating archived item", async () => {
      const item = await createItem(TEST_USER_1, { name: "Archived Item" });
      await archiveItem(TEST_USER_1, item.id);

      await expect(updateItem(TEST_USER_1, item.id, { name: "Attempted update" })).rejects.toThrow(
        "Archived items must be unarchived before editing"
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

  describe("archiveItem / unarchiveItem", () => {
    it("should archive an item (set archivedAt)", async () => {
      const item = await createItem(TEST_USER_1, { name: "Item to Archive" });

      expect(item.archivedAt).toBeNull();

      const archived = await archiveItem(TEST_USER_1, item.id);

      expect(archived.id).toBe(item.id);
      expect(archived.archivedAt).toBeDefined();
      expect(archived.archivedAt).toBeInstanceOf(Date);
    });

    it("should unarchive an item (clear archivedAt)", async () => {
      // Create and archive an item
      const item = await createItem(TEST_USER_1, { name: "Item to Unarchive" });
      const archived = await archiveItem(TEST_USER_1, item.id);

      expect(archived.archivedAt).toBeDefined();

      const unarchived = await unarchiveItem(TEST_USER_1, item.id);

      expect(unarchived.id).toBe(item.id);
      expect(unarchived.archivedAt).toBeNull();
    });

    it("should throw error if archiving item that does not belong to user", async () => {
      const item = await createItem(TEST_USER_1, { name: "User 1 Item" });

      await expect(archiveItem(TEST_USER_2, item.id)).rejects.toThrow(
        "Item not found or access denied"
      );
    });

    it("should throw error if unarchiving item that does not belong to user", async () => {
      const item = await createItem(TEST_USER_1, { name: "User 1 Item" });
      await archiveItem(TEST_USER_1, item.id);

      await expect(unarchiveItem(TEST_USER_2, item.id)).rejects.toThrow(
        "Item not found or access denied"
      );
    });

    it("should throw error if archiving non-existent item", async () => {
      await expect(archiveItem(TEST_USER_1, "non-existent-id")).rejects.toThrow(
        "Item not found or access denied"
      );
    });

    it("should throw error if unarchiving non-existent item", async () => {
      await expect(unarchiveItem(TEST_USER_1, "non-existent-id")).rejects.toThrow(
        "Item not found or access denied"
      );
    });

    it("should be able to archive already archived item (idempotent)", async () => {
      const item = await createItem(TEST_USER_1, { name: "Item" });
      const firstArchive = await archiveItem(TEST_USER_1, item.id);
      const secondArchive = await archiveItem(TEST_USER_1, item.id);

      expect(secondArchive.archivedAt).toBeDefined();
      // Second archive updates timestamp
      expect(secondArchive.archivedAt?.getTime()).toBeGreaterThanOrEqual(
        firstArchive.archivedAt?.getTime() ?? 0
      );
    });

    it("should be able to unarchive non-archived item (idempotent)", async () => {
      const item = await createItem(TEST_USER_1, { name: "Item" });

      expect(item.archivedAt).toBeNull();

      const unarchived = await unarchiveItem(TEST_USER_1, item.id);

      expect(unarchived.archivedAt).toBeNull();
    });

    it("should preserve checklist when archiving", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Item with Checklist",
        checklist: [
          { text: "Task 1", done: false, position: 0 },
          { text: "Task 2", done: true, position: 1 },
        ],
      });

      const archived = await archiveItem(TEST_USER_1, item.id);

      expect(archived.checklistItems).toHaveLength(2);
      expect(archived.checklistItems[0].text).toBe("Task 1");
      expect(archived.checklistItems[1].done).toBe(true);
    });

    it("should preserve all item fields when archiving/unarchiving", async () => {
      const item = await createItem(TEST_USER_1, {
        name: "Full Item",
        status: ItemStatus.active,
        tag: ItemTag.feature,
        summary: "Test summary",
        metricValue: 42,
      });

      const archived = await archiveItem(TEST_USER_1, item.id);

      expect(archived.name).toBe("Full Item");
      expect(archived.status).toBe(ItemStatus.active);
      expect(archived.tag).toBe(ItemTag.feature);
      expect(archived.summary).toBe("Test summary");
      expect(archived.metricValue).toBe(42);

      const unarchived = await unarchiveItem(TEST_USER_1, item.id);

      expect(unarchived.name).toBe("Full Item");
      expect(unarchived.status).toBe(ItemStatus.active);
      expect(unarchived.tag).toBe(ItemTag.feature);
      expect(unarchived.summary).toBe("Test summary");
      expect(unarchived.metricValue).toBe(42);
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
