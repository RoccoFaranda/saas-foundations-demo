"use client";

import { useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DashboardItem } from "./model";
import { ItemsTable } from "./items-table";
import { EditItemModal } from "./edit-item-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";

/**
 * Props for mutation handlers.
 * Adapters provide implementations for these.
 */
export interface DashboardMutationHandlers {
  onCreate: (item: DashboardItem) => void | Promise<void>;
  onUpdate: (item: DashboardItem) => void | Promise<void>;
  onDelete: (item: DashboardItem) => void | Promise<void>;
  onArchive?: (item: DashboardItem) => void | Promise<void>;
  onUnarchive?: (item: DashboardItem) => void | Promise<void>;
  onImportSampleData: () => void | Promise<void>;
}

interface DashboardContentProps {
  /** Paginated items to display in table */
  items: DashboardItem[];
  /** Message shown when no items match filters */
  emptyMessage: string;
  /** Whether user has any items (for showing empty state CTA) */
  hasItems: boolean;
  /** Whether a mutation is in progress */
  isPending?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether import sample data is available */
  canImportSampleData?: boolean;
  /** Custom empty state content (optional) */
  emptyStateContent?: ReactNode;
  /** Mutation handlers provided by adapter */
  handlers: DashboardMutationHandlers;
  /** Clear error callback */
  onClearError?: () => void;
}

/**
 * Shared dashboard content component with table and mutation UI.
 * Data-source agnostic - works with both demo (in-memory) and app (DB-backed).
 */
export function DashboardContent({
  items,
  emptyMessage,
  hasItems,
  isPending = false,
  error = null,
  canImportSampleData = true,
  emptyStateContent,
  handlers,
  onClearError,
}: DashboardContentProps) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] = useState<DashboardItem | null>(null);
  const actionsHost =
    typeof document !== "undefined"
      ? document.getElementById("dashboard-table-actions-slot")
      : null;

  // Open edit modal
  const handleEditClick = useCallback(
    (item: DashboardItem) => {
      setEditingItem(item);
      setIsCreating(false);
      setIsModalOpen(true);
      onClearError?.();
    },
    [onClearError]
  );

  // Open create modal
  const handleCreateClick = useCallback(() => {
    setEditingItem(null);
    setIsCreating(true);
    setIsModalOpen(true);
    onClearError?.();
  }, [onClearError]);

  // Close modal
  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setIsCreating(false);
  }, []);

  // Save handler (create or update)
  const handleSave = useCallback(
    async (updatedItem: DashboardItem) => {
      onClearError?.();

      if (isCreating) {
        await handlers.onCreate(updatedItem);
      } else {
        await handlers.onUpdate(updatedItem);
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setIsCreating(false);
    },
    [isCreating, handlers, onClearError]
  );

  // Delete handlers
  const handleDeleteClick = useCallback((item: DashboardItem) => {
    setItemPendingDelete(item);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemPendingDelete) return;

    onClearError?.();
    await handlers.onDelete(itemPendingDelete);
    setItemPendingDelete(null);
  }, [itemPendingDelete, handlers, onClearError]);

  const handleCancelDelete = useCallback(() => {
    if (isPending) return;
    setItemPendingDelete(null);
  }, [isPending]);

  // Archive/Unarchive handlers
  const handleArchiveClick = useCallback(
    async (item: DashboardItem) => {
      if (!handlers.onArchive) return;
      onClearError?.();
      await handlers.onArchive(item);
    },
    [handlers, onClearError]
  );

  const handleUnarchiveClick = useCallback(
    async (item: DashboardItem) => {
      if (!handlers.onUnarchive) return;
      onClearError?.();
      await handlers.onUnarchive(item);
    },
    [handlers, onClearError]
  );

  // Import sample data handler
  const handleImportSampleData = useCallback(async () => {
    onClearError?.();
    await handlers.onImportSampleData();
  }, [handlers, onClearError]);

  // Derive the item for modal (either existing or new placeholder)
  const modalItem: DashboardItem | null = isCreating
    ? {
        id: "new",
        name: "",
        status: "active",
        tag: null,
        summary: "",
        checklist: [],
        updatedAt: new Date().toISOString(),
      }
    : editingItem;

  const createProjectButton = hasItems ? (
    <button
      type="button"
      onClick={handleCreateClick}
      disabled={isPending}
      className="h-8 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
    >
      + Create Project
    </button>
  ) : null;

  return (
    <>
      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Empty state with import option */}
      {!hasItems && (
        <div className="mb-6 rounded-lg border border-foreground/10 bg-background p-6 text-center">
          {emptyStateContent ?? (
            <>
              <h3 className="font-medium">Get Started</h3>
              <p className="mt-1 text-sm text-foreground/60">
                Create your first project or import sample data to explore.
              </p>
            </>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleCreateClick}
              disabled={isPending}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              Create Project
            </button>
            {canImportSampleData && (
              <button
                type="button"
                onClick={handleImportSampleData}
                disabled={isPending}
                className="rounded-md border border-foreground/20 bg-background px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 disabled:opacity-50"
              >
                {isPending ? "Importing..." : "Import Sample Data"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create button when has items */}
      {createProjectButton &&
        (actionsHost ? (
          createPortal(createProjectButton, actionsHost)
        ) : (
          <div className="mb-4 flex justify-end">{createProjectButton}</div>
        ))}

      {/* Items table */}
      <ItemsTable
        items={items}
        emptyMessage={emptyMessage}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onArchive={handlers.onArchive ? handleArchiveClick : undefined}
        onUnarchive={handlers.onUnarchive ? handleUnarchiveClick : undefined}
      />

      {/* Edit/Create Modal */}
      <EditItemModal
        item={modalItem}
        isOpen={isModalOpen}
        onSave={handleSave}
        onCancel={handleCancel}
        title={isCreating ? "Create Project" : "Edit Project"}
        saveLabel={isCreating ? "Create" : "Save Changes"}
        isPending={isPending}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        itemName={itemPendingDelete?.name ?? ""}
        isOpen={!!itemPendingDelete}
        isPending={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
