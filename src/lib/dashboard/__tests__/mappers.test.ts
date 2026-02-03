import { describe, it, expect } from "vitest";
import {
  mapDbItemToUi,
  mapDbItemsToUi,
  mapDbActivityLogToUi,
  mapDbActivityLogsToUi,
} from "../mappers";
import type { ItemWithChecklist } from "../../items";
import type { ActivityLog } from "../../../generated/prisma/client";
import { ItemStatus, ItemTag } from "../../../generated/prisma/enums";

describe("Dashboard mappers", () => {
  describe("mapDbItemToUi", () => {
    it("should map a DB item to UI DashboardItem", () => {
      const dbItem: ItemWithChecklist = {
        id: "item-1",
        userId: "user-1",
        name: "Test Item",
        status: ItemStatus.active,
        tag: ItemTag.feature,
        summary: "Test summary",
        metricValue: 50,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-15T10:30:00Z"),
        checklistItems: [
          {
            id: "check-1",
            itemId: "item-1",
            text: "Task 1",
            done: true,
            position: 0,
            createdAt: new Date("2026-01-01T00:00:00Z"),
            updatedAt: new Date("2026-01-01T00:00:00Z"),
          },
          {
            id: "check-2",
            itemId: "item-1",
            text: "Task 2",
            done: false,
            position: 1,
            createdAt: new Date("2026-01-01T00:00:00Z"),
            updatedAt: new Date("2026-01-01T00:00:00Z"),
          },
        ],
      };

      const uiItem = mapDbItemToUi(dbItem);

      expect(uiItem).toEqual({
        id: "item-1",
        name: "Test Item",
        status: "active",
        tag: "feature",
        updatedAt: "2026-01-15T10:30:00.000Z",
        summary: "Test summary",
        checklist: [
          { id: "check-1", text: "Task 1", done: true },
          { id: "check-2", text: "Task 2", done: false },
        ],
      });
    });

    it("should preserve null tag for untagged items", () => {
      const dbItem: ItemWithChecklist = {
        id: "item-1",
        userId: "user-1",
        name: "No Tag Item",
        status: ItemStatus.pending,
        tag: null,
        summary: null,
        metricValue: null,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        checklistItems: [],
      };

      const uiItem = mapDbItemToUi(dbItem);

      expect(uiItem.tag).toBeNull();
    });

    it("should default summary to empty string when null", () => {
      const dbItem: ItemWithChecklist = {
        id: "item-1",
        userId: "user-1",
        name: "No Summary",
        status: ItemStatus.active,
        tag: ItemTag.bugfix,
        summary: null,
        metricValue: null,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        checklistItems: [],
      };

      const uiItem = mapDbItemToUi(dbItem);

      expect(uiItem.summary).toBe("");
    });

    it("should strip DB-specific fields from checklist items", () => {
      const dbItem: ItemWithChecklist = {
        id: "item-1",
        userId: "user-1",
        name: "Test",
        status: ItemStatus.active,
        tag: ItemTag.docs,
        summary: "",
        metricValue: null,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        checklistItems: [
          {
            id: "check-1",
            itemId: "item-1",
            text: "Task",
            done: false,
            position: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const uiItem = mapDbItemToUi(dbItem);
      const checklistItem = uiItem.checklist[0];

      // Should only have id, text, done
      expect(Object.keys(checklistItem).sort()).toEqual(["done", "id", "text"]);
      expect(checklistItem).not.toHaveProperty("position");
      expect(checklistItem).not.toHaveProperty("itemId");
      expect(checklistItem).not.toHaveProperty("createdAt");
      expect(checklistItem).not.toHaveProperty("updatedAt");
    });
  });

  describe("mapDbItemsToUi", () => {
    it("should map multiple DB items", () => {
      const dbItems: ItemWithChecklist[] = [
        {
          id: "item-1",
          userId: "user-1",
          name: "Item 1",
          status: ItemStatus.active,
          tag: ItemTag.feature,
          summary: "Summary 1",
          metricValue: null,
          completedAt: null,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          checklistItems: [],
        },
        {
          id: "item-2",
          userId: "user-1",
          name: "Item 2",
          status: ItemStatus.completed,
          tag: ItemTag.bugfix,
          summary: "Summary 2",
          metricValue: null,
          completedAt: null,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          checklistItems: [],
        },
      ];

      const uiItems = mapDbItemsToUi(dbItems);

      expect(uiItems).toHaveLength(2);
      expect(uiItems[0].id).toBe("item-1");
      expect(uiItems[1].id).toBe("item-2");
    });

    it("should handle empty array", () => {
      const uiItems = mapDbItemsToUi([]);
      expect(uiItems).toEqual([]);
    });
  });

  describe("mapDbActivityLogToUi", () => {
    it("should format item.created action", () => {
      const log: ActivityLog = {
        id: "log-1",
        userId: "user-1",
        action: "item.created",
        entityType: "item",
        entityId: "item-1",
        metadata: { itemName: "New Project" },
        createdAt: new Date("2026-01-15T10:30:00Z"),
      };

      const entry = mapDbActivityLogToUi(log);

      expect(entry).toEqual({
        id: "log-1",
        message: 'Created "New Project"',
        timestamp: "2026-01-15T10:30:00.000Z",
      });
    });

    it("should format item.updated action", () => {
      const log: ActivityLog = {
        id: "log-2",
        userId: "user-1",
        action: "item.updated",
        entityType: "item",
        entityId: "item-1",
        metadata: { itemName: "Updated Project" },
        createdAt: new Date("2026-01-15T11:00:00Z"),
      };

      const entry = mapDbActivityLogToUi(log);

      expect(entry.message).toBe('Updated "Updated Project"');
    });

    it("should format item.deleted action", () => {
      const log: ActivityLog = {
        id: "log-3",
        userId: "user-1",
        action: "item.deleted",
        entityType: "item",
        entityId: "item-1",
        metadata: { itemName: "Deleted Project" },
        createdAt: new Date("2026-01-15T12:00:00Z"),
      };

      const entry = mapDbActivityLogToUi(log);

      expect(entry.message).toBe('Deleted "Deleted Project"');
    });

    it("should handle missing itemName in metadata", () => {
      const log: ActivityLog = {
        id: "log-4",
        userId: "user-1",
        action: "item.created",
        entityType: "item",
        entityId: "item-1",
        metadata: null,
        createdAt: new Date("2026-01-15T10:30:00Z"),
      };

      const entry = mapDbActivityLogToUi(log);

      expect(entry.message).toBe("Created a new item");
    });

    it("should humanize unknown action types", () => {
      const log: ActivityLog = {
        id: "log-5",
        userId: "user-1",
        action: "some.unknown.action",
        entityType: null,
        entityId: null,
        metadata: null,
        createdAt: new Date("2026-01-15T10:30:00Z"),
      };

      const entry = mapDbActivityLogToUi(log);

      expect(entry.message).toBe("Some unknown action");
    });
  });

  describe("mapDbActivityLogsToUi", () => {
    it("should map multiple activity logs", () => {
      const logs: ActivityLog[] = [
        {
          id: "log-1",
          userId: "user-1",
          action: "item.created",
          entityType: "item",
          entityId: "item-1",
          metadata: { itemName: "Project A" },
          createdAt: new Date("2026-01-15T10:30:00Z"),
        },
        {
          id: "log-2",
          userId: "user-1",
          action: "item.updated",
          entityType: "item",
          entityId: "item-2",
          metadata: { itemName: "Project B" },
          createdAt: new Date("2026-01-15T11:00:00Z"),
        },
      ];

      const entries = mapDbActivityLogsToUi(logs);

      expect(entries).toHaveLength(2);
      expect(entries[0].message).toContain("Project A");
      expect(entries[1].message).toContain("Project B");
    });

    it("should handle empty array", () => {
      const entries = mapDbActivityLogsToUi([]);
      expect(entries).toEqual([]);
    });
  });
});
