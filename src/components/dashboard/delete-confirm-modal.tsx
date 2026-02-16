"use client";

import { Modal } from "@/src/components/ui/modal";

interface DeleteConfirmModalProps {
  itemName: string;
  isOpen: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable delete confirmation modal.
 * Used by both demo and app dashboard.
 */
export function DeleteConfirmModal({
  itemName,
  isOpen,
  isPending = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      ariaLabelledBy="delete-modal-title"
      isDismissible={!isPending}
      backdropTestId="delete-modal-backdrop"
    >
      <div
        className="surface-card w-[min(32rem,calc(100vw-2rem))] shadow-xl"
        data-testid="delete-modal"
      >
        <div className="surface-card-header">
          <h2 id="delete-modal-title" className="font-medium">
            Delete Project
          </h2>
        </div>

        <div className="surface-card-body">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="break-words font-medium text-foreground">&quot;{itemName}&quot;</span>?
            This action cannot be undone.
          </p>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="btn-secondary btn-md"
              data-testid="delete-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="btn-danger btn-md"
              data-testid="delete-confirm-btn"
            >
              {isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
