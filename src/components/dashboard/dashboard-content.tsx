"use client";

import { useState, useCallback, type ReactNode } from "react";
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
  /** Controlled create modal visibility (optional) */
  isCreateModalOpen?: boolean;
  /** Controlled create modal visibility handler (optional) */
  onCreateModalOpenChange?: (open: boolean) => void;
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
  isCreateModalOpen,
  onCreateModalOpenChange,
  error = null,
  canImportSampleData = true,
  emptyStateContent,
  handlers,
  onClearError,
}: DashboardContentProps) {
  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpenLocal, setIsCreateModalOpenLocal] = useState(false);
  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [itemPendingDelete, setItemPendingDelete] = useState<DashboardItem | null>(null);
  const isCreateModalControlled = typeof isCreateModalOpen === "boolean";
  const createModalOpen = isCreateModalControlled ? isCreateModalOpen : isCreateModalOpenLocal;

  const setCreateModalOpen = useCallback(
    (open: boolean) => {
      if (isCreateModalControlled) {
        onCreateModalOpenChange?.(open);
        return;
      }
      setIsCreateModalOpenLocal(open);
    },
    [isCreateModalControlled, onCreateModalOpenChange]
  );

  // Open edit modal
  const handleEditClick = useCallback(
    (item: DashboardItem) => {
      setEditingItem(item);
      setCreateModalOpen(false);
      setIsEditModalOpen(true);
      onClearError?.();
    },
    [onClearError, setCreateModalOpen]
  );

  // Open create modal
  const handleCreateClick = useCallback(() => {
    setCreateModalOpen(true);
    setIsEditModalOpen(false);
    setEditingItem(null);
    onClearError?.();
  }, [onClearError, setCreateModalOpen]);

  // Close modal
  const handleCancel = useCallback(() => {
    if (createModalOpen) {
      setCreateModalOpen(false);
    }
    setIsEditModalOpen(false);
    setEditingItem(null);
  }, [createModalOpen, setCreateModalOpen]);

  // Save handler (create or update)
  const handleSave = useCallback(
    async (updatedItem: DashboardItem) => {
      onClearError?.();

      if (createModalOpen) {
        await handlers.onCreate(updatedItem);
        setCreateModalOpen(false);
      } else {
        await handlers.onUpdate(updatedItem);
        setIsEditModalOpen(false);
        setEditingItem(null);
      }
    },
    [createModalOpen, handlers, onClearError, setCreateModalOpen]
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
  const modalItem: DashboardItem | null = createModalOpen
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
  const isModalOpen = createModalOpen || isEditModalOpen;

  return (
    <>
      {/* Error banner */}
      {error && <div className="state-error mb-4 px-4 py-3">{error}</div>}

      {/* Empty state with import option */}
      {!hasItems && (
        <div className="surface-card mb-6 p-6 text-center">
          {emptyStateContent ?? (
            <>
              <h3 className="font-medium">Get Started</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first project or import sample data to explore.
              </p>
            </>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleCreateClick}
              disabled={isPending}
              className="btn-primary btn-md"
            >
              Create Project
            </button>
            {canImportSampleData && (
              <button
                type="button"
                onClick={handleImportSampleData}
                disabled={isPending}
                className="btn-secondary btn-md"
              >
                {isPending ? "Importing..." : "Import Sample Data"}
              </button>
            )}
          </div>
        </div>
      )}

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
        title={createModalOpen ? "Create Project" : "Edit Project"}
        saveLabel={createModalOpen ? "Create" : "Save Changes"}
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
