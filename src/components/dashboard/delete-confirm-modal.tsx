"use client";

import { useRef, type MouseEvent } from "react";

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
  const mouseDownOnBackdrop = useRef(false);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop.current && !isPending) {
      onCancel();
    }
    mouseDownOnBackdrop.current = false;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="delete-modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
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
            <span className="font-medium text-foreground">&quot;{itemName}&quot;</span>? This action
            cannot be undone.
          </p>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-md border border-foreground/10 bg-background px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/5 disabled:opacity-50"
              data-testid="delete-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
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
  );
}
