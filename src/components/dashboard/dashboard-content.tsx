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
  /** Whether write actions are temporarily disabled (e.g. rate limited) */
  isMutationsDisabled?: boolean;
  /** Optional write-rate-limit countdown label */
  rateLimitLabel?: string | null;
  /** Controlled create modal visibility (optional) */
  isCreateModalOpen?: boolean;
  /** Controlled create modal visibility handler (optional) */
  onCreateModalOpenChange?: (open: boolean) => void;
  /** Whether import sample data is available */
  canImportSampleData?: boolean;
  /** Custom empty state content (optional) */
  emptyStateContent?: ReactNode;
  /** Mutation handlers provided by adapter */
  handlers: DashboardMutationHandlers;
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
  isMutationsDisabled = false,
  rateLimitLabel = null,
  isCreateModalOpen,
  onCreateModalOpenChange,
  canImportSampleData = true,
  emptyStateContent,
  handlers,
}: DashboardContentProps) {
  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpenLocal, setIsCreateModalOpenLocal] = useState(false);
  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [itemPendingDelete, setItemPendingDelete] = useState<DashboardItem | null>(null);
  const isCreateModalControlled = typeof isCreateModalOpen === "boolean";
  const createModalOpen = isCreateModalControlled ? isCreateModalOpen : isCreateModalOpenLocal;
  const isActionDisabled = isPending || isMutationsDisabled;
  const createButtonLabel =
    isMutationsDisabled && rateLimitLabel ? rateLimitLabel : "Create Project";
  const importButtonLabel = isPending
    ? "Importing..."
    : isMutationsDisabled && rateLimitLabel
      ? rateLimitLabel
      : "Import Sample Data";

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
      if (isActionDisabled) return;
      setEditingItem(item);
      setCreateModalOpen(false);
      setIsEditModalOpen(true);
    },
    [isActionDisabled, setCreateModalOpen]
  );

  // Open create modal
  const handleCreateClick = useCallback(() => {
    if (isActionDisabled) return;
    setCreateModalOpen(true);
    setIsEditModalOpen(false);
    setEditingItem(null);
  }, [isActionDisabled, setCreateModalOpen]);

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
      if (isActionDisabled) return;

      if (createModalOpen) {
        await handlers.onCreate(updatedItem);
        setCreateModalOpen(false);
      } else {
        await handlers.onUpdate(updatedItem);
        setIsEditModalOpen(false);
        setEditingItem(null);
      }
    },
    [createModalOpen, handlers, isActionDisabled, setCreateModalOpen]
  );

  // Delete handlers
  const handleDeleteClick = useCallback(
    (item: DashboardItem) => {
      if (isActionDisabled) return;
      setItemPendingDelete(item);
    },
    [isActionDisabled]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!itemPendingDelete || isActionDisabled) return;

    await handlers.onDelete(itemPendingDelete);
    setItemPendingDelete(null);
  }, [itemPendingDelete, handlers, isActionDisabled]);

  const handleCancelDelete = useCallback(() => {
    if (isPending) return;
    setItemPendingDelete(null);
  }, [isPending]);

  // Archive/Unarchive handlers
  const handleArchiveClick = useCallback(
    async (item: DashboardItem) => {
      if (!handlers.onArchive || isActionDisabled) return;
      await handlers.onArchive(item);
    },
    [handlers, isActionDisabled]
  );

  const handleUnarchiveClick = useCallback(
    async (item: DashboardItem) => {
      if (!handlers.onUnarchive || isActionDisabled) return;
      await handlers.onUnarchive(item);
    },
    [handlers, isActionDisabled]
  );

  // Import sample data handler
  const handleImportSampleData = useCallback(async () => {
    if (isActionDisabled) return;
    await handlers.onImportSampleData();
  }, [handlers, isActionDisabled]);

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
              disabled={isActionDisabled}
              className="btn-primary btn-md"
            >
              {createButtonLabel}
            </button>
            {canImportSampleData && (
              <button
                type="button"
                onClick={handleImportSampleData}
                disabled={isActionDisabled}
                className="btn-secondary btn-md"
              >
                {importButtonLabel}
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
        actionsDisabled={isActionDisabled}
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
        isDisabled={isMutationsDisabled}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        itemName={itemPendingDelete?.name ?? ""}
        isOpen={!!itemPendingDelete}
        isPending={isPending}
        isDisabled={isMutationsDisabled}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
