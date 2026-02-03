"use client";

import { useState, useCallback, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ItemsTable, EditItemModal } from "@/src/components/dashboard";
import type { DashboardItem } from "@/src/components/dashboard/model";
import {
  createItemAction,
  updateItemAction,
  deleteItemAction,
  importSampleDataAction,
} from "../actions";
import type { DashboardActionResult } from "../actions";

interface DashboardMutationsProps {
  items: DashboardItem[];
  emptyMessage: string;
  hasItems: boolean;
}

/**
 * Client component wrapper that handles all dashboard mutations.
 * Manages modal state and calls server actions.
 */
export function DashboardMutations({ items, emptyMessage, hasItems }: DashboardMutationsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [itemPendingDelete, setItemPendingDelete] = useState<DashboardItem | null>(null);

  // Open edit modal
  const handleEditClick = useCallback((item: DashboardItem) => {
    setEditingItem(item);
    setIsCreating(false);
    setIsModalOpen(true);
    setError(null);
  }, []);

  // Open create modal
  const handleCreateClick = useCallback(() => {
    setEditingItem(null);
    setIsCreating(true);
    setIsModalOpen(true);
    setError(null);
  }, []);

  // Close modal
  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setIsCreating(false);
    setError(null);
  }, []);

  // Save handler (create or update)
  const handleSave = useCallback(
    async (updatedItem: DashboardItem) => {
      setError(null);

      startTransition(async () => {
        let result: DashboardActionResult;

        if (isCreating) {
          result = await createItemAction({
            name: updatedItem.name,
            status: updatedItem.status,
            tag: updatedItem.tag,
            summary: updatedItem.summary,
            checklist: updatedItem.checklist,
          });
        } else {
          result = await updateItemAction(updatedItem.id, {
            name: updatedItem.name,
            status: updatedItem.status,
            tag: updatedItem.tag,
            summary: updatedItem.summary,
            checklist: updatedItem.checklist,
          });
        }

        if (result.success) {
          setIsModalOpen(false);
          setEditingItem(null);
          setIsCreating(false);
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    },
    [isCreating, router]
  );

  // Delete handler
  const handleDelete = useCallback(
    async (item: DashboardItem) => {
      setItemPendingDelete(item);
    },
    [setItemPendingDelete]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!itemPendingDelete) return;

    setError(null);

    startTransition(async () => {
      const result = await deleteItemAction(itemPendingDelete.id);

      if (result.success) {
        setItemPendingDelete(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }, [itemPendingDelete, router]);

  const handleCancelDelete = useCallback(() => {
    if (isPending) return;
    setItemPendingDelete(null);
  }, [isPending]);

  const handleDeleteDialogBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        handleCancelDelete();
      }
    },
    [handleCancelDelete]
  );

  // Import sample data handler
  const handleImportSampleData = useCallback(async () => {
    setError(null);

    startTransition(async () => {
      const result = await importSampleDataAction();

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }, [router]);

  // Derive the item for modal (either existing or new placeholder)
  const modalItem: DashboardItem | null = isCreating
    ? {
        id: "new",
        name: "",
        status: "active",
        tag: "feature",
        summary: "",
        checklist: [],
        updatedAt: new Date().toISOString(),
      }
    : editingItem;

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
          <h3 className="font-medium">Get Started</h3>
          <p className="mt-1 text-sm text-foreground/60">
            Create your first project or import sample data to explore.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleCreateClick}
              disabled={isPending}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              Create Project
            </button>
            <button
              type="button"
              onClick={handleImportSampleData}
              disabled={isPending}
              className="rounded-md border border-foreground/20 bg-background px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 disabled:opacity-50"
            >
              {isPending ? "Importing..." : "Import Sample Data"}
            </button>
          </div>
        </div>
      )}

      {/* Create button when has items */}
      {hasItems && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleCreateClick}
            disabled={isPending}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            Create Project
          </button>
        </div>
      )}

      {/* Items table */}
      <ItemsTable
        items={items}
        emptyMessage={emptyMessage}
        onEdit={handleEditClick}
        onDelete={handleDelete}
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
      {itemPendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="delete-modal-backdrop"
          onClick={handleDeleteDialogBackdropClick}
        >
          <div
            className="w-full max-w-md rounded-lg border border-foreground/10 bg-background shadow-xl"
            role="dialog"
            aria-labelledby="delete-modal-title"
            aria-modal="true"
            data-testid="delete-modal"
          >
            <div className="border-b border-foreground/10 px-4 py-3">
              <h2 id="delete-modal-title" className="font-medium">
                Delete Project
              </h2>
            </div>

            <div className="p-4">
              <p className="text-sm text-foreground/70">
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  &quot;{itemPendingDelete.name}&quot;
                </span>
                ? This action cannot be undone.
              </p>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isPending}
                  className="rounded-md border border-foreground/10 bg-background px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/5 disabled:opacity-50"
                  data-testid="delete-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isPending}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                  data-testid="delete-confirm-btn"
                >
                  {isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
