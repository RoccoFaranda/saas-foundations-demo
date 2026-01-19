// @vitest-environment node
import "dotenv/config";
import { describe, it, expect, beforeEach } from "vitest";
import { createItem, listItems, getItem, updateItem, deleteItem } from "../items";
import { ItemStatus, ItemTag } from "../../generated/prisma/enums";
import prisma from "../db";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/saas_foundations_dev?schema=public";
}

// Test user IDs for isolation
const TEST_USER_1 = "items_test_user_001";
const TEST_USER_2 = "items_test_user_002";
const TEST_USER_EMAIL_1 = "items_test1@example.com";
const TEST_USER_EMAIL_2 = "items_test2@example.com";

describe("Items data layer", () => {
  beforeEach(async () => {
    // Clean up test data before each test (items first due to FK)
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
  });
});
