"use client";

import { useRef, useState, type FormEvent, type RefObject } from "react";
import type { DashboardItem, ItemStatus, ItemTag, ChecklistItem } from "./model";
import { computeProgress, generateId } from "./model";
import { Modal } from "@/src/components/ui/modal";
import { LifecycleDetails } from "./lifecycle-details";

interface EditItemModalProps {
  item: DashboardItem | null;
  isOpen: boolean;
  onSave: (updated: DashboardItem) => void;
  onCancel: () => void;
  title?: string;
  saveLabel?: string;
  isPending?: boolean;
}

const statusOptions: ItemStatus[] = ["active", "pending", "completed"];
const tagOptions: Array<{ value: ItemTag | ""; label: string }> = [
  { value: "", label: "Untagged" },
  { value: "feature", label: "Feature" },
  { value: "bugfix", label: "Bugfix" },
  { value: "docs", label: "Docs" },
  { value: "infra", label: "Infra" },
  { value: "design", label: "Design" },
];

export function EditItemModal({
  item,
  isOpen,
  onSave,
  onCancel,
  title = "Edit Project",
  saveLabel = "Save Changes",
  isPending = false,
}: EditItemModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Only render when open and item exists
  if (!isOpen || !item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      ariaLabelledBy="edit-modal-title"
      initialFocusRef={nameInputRef}
      isDismissible={!isPending}
      backdropTestId="edit-modal-backdrop"
    >
      <EditItemForm
        key={item.id}
        item={item}
        onSave={onSave}
        onCancel={onCancel}
        title={title}
        saveLabel={saveLabel}
        isPending={isPending}
        nameInputRef={nameInputRef}
      />
    </Modal>
  );
}

interface EditItemFormProps {
  item: DashboardItem;
  onSave: (updated: DashboardItem) => void;
  onCancel: () => void;
  title: string;
  saveLabel: string;
  isPending: boolean;
  nameInputRef: RefObject<HTMLInputElement | null>;
}

function EditItemForm({
  item,
  onSave,
  onCancel,
  title,
  saveLabel,
  isPending,
  nameInputRef,
}: EditItemFormProps) {
  // State initialized from props on mount (no effect needed)
  const [name, setName] = useState(item.name);
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [tag, setTag] = useState<ItemTag | null>(item.tag);
  const [summary, setSummary] = useState(item.summary);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(item.checklist);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<DashboardItem | null>(null);
  const isFormLocked = showCompletionConfirm || isPending;
  const [dismissedSuggestCompleteKey, setDismissedSuggestCompleteKey] = useState<string | null>(
    null
  );
  const [checklistVersion, setChecklistVersion] = useState(0);

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
    setChecklistVersion((prev) => prev + 1);
  };

  const addChecklistItem = () => {
    const text = newChecklistText.trim();
    if (text.length === 0) return;

    setChecklist((prev) => [...prev, { id: generateId("check"), text, done: false }]);
    setNewChecklistText("");
    setChecklistVersion((prev) => prev + 1);
  };

  const removeChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
    setChecklistVersion((prev) => prev + 1);
  };

  const hasMeaningfulChanges = (candidate: DashboardItem) =>
    candidate.name !== item.name ||
    candidate.status !== item.status ||
    candidate.tag !== item.tag ||
    candidate.summary !== item.summary ||
    JSON.stringify(candidate.checklist) !== JSON.stringify(item.checklist);

  const saveIfChanged = (candidate: DashboardItem) => {
    const normalizedCandidate: DashboardItem = {
      ...candidate,
      name: candidate.name.trim(),
      summary: candidate.summary.trim(),
      updatedAt: item.updatedAt,
    };

    if (!hasMeaningfulChanges(normalizedCandidate)) {
      onCancel();
      return;
    }

    onSave({
      ...normalizedCandidate,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setName("");
      if (nameInputRef.current) {
        nameInputRef.current.value = "";
        nameInputRef.current.reportValidity();
      }
      return;
    }

    const trimmedSummary = summary.trim();

    const nextItem: DashboardItem = {
      ...item,
      name: trimmedName,
      status,
      tag,
      summary: trimmedSummary,
      checklist,
      updatedAt: item.updatedAt,
    };

    const hasIncompleteChecklist =
      nextItem.status === "completed" && nextItem.checklist.some((entry) => !entry.done);

    if (hasIncompleteChecklist) {
      setPendingSave(nextItem);
      setShowCompletionConfirm(true);
      return;
    }

    saveIfChanged(nextItem);
  };

  const progress = computeProgress(checklist);
  const completedCount = checklist.filter((entry) => entry.done).length;
  const isChecklistComplete = checklist.length > 0 && completedCount === checklist.length;
  const suggestCompleteKey = `${checklistVersion}-${status}`;
  const shouldSuggestComplete =
    !showCompletionConfirm &&
    isChecklistComplete &&
    status !== "completed" &&
    dismissedSuggestCompleteKey !== suggestCompleteKey;

  const handleBackToEdit = () => {
    setShowCompletionConfirm(false);
    setPendingSave(null);
  };

  const handleMarkStatusActive = () => {
    if (!pendingSave) return;
    setStatus("active");
    saveIfChanged({
      ...pendingSave,
      status: "active",
    });
  };

  const handleMarkAllComplete = () => {
    if (!pendingSave) return;
    const updatedChecklist = pendingSave.checklist.map((entry) => ({ ...entry, done: true }));
    setChecklist(updatedChecklist);
    saveIfChanged({
      ...pendingSave,
      checklist: updatedChecklist,
    });
  };

  const handleMarkProjectCompleted = () => {
    setStatus("completed");
    setDismissedSuggestCompleteKey(suggestCompleteKey);
  };

  const handleKeepStatus = () => {
    setDismissedSuggestCompleteKey(suggestCompleteKey);
  };

  return (
    <div
      className="surface-card w-[min(56rem,calc(100vw-2rem))] overflow-hidden shadow-xl"
      data-testid="edit-modal"
    >
      {/* Header */}
      <div className="surface-card-header">
        <h2 id="edit-modal-title" className="font-medium">
          {title}
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex max-h-[75vh] flex-col">
        <div
          className={`min-h-0 flex-1 space-y-4 overflow-y-auto p-4 transition-opacity ${
            showCompletionConfirm ? "opacity-40" : "opacity-100"
          }`}
        >
          {/* Name */}
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-muted-foreground">
              Name
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              ref={nameInputRef}
              required
              disabled={isFormLocked}
              className="form-field form-field-md mt-1"
              data-testid="edit-name-input"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="edit-status"
              className="block text-sm font-medium text-muted-foreground"
            >
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ItemStatus)}
              disabled={isFormLocked}
              className="form-field form-field-md mt-1 capitalize"
              data-testid="edit-status-select"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Tag */}
          <div>
            <label htmlFor="edit-tag" className="block text-sm font-medium text-muted-foreground">
              Tag
            </label>
            <select
              id="edit-tag"
              value={tag ?? ""}
              onChange={(e) => setTag(e.target.value ? (e.target.value as ItemTag) : null)}
              disabled={isFormLocked}
              className="form-field form-field-md mt-1 capitalize"
              data-testid="edit-tag-select"
            >
              {tagOptions.map((tagOption) => (
                <option key={tagOption.value || "untagged"} value={tagOption.value}>
                  {tagOption.label}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div>
            <label
              htmlFor="edit-summary"
              className="block text-sm font-medium text-muted-foreground"
            >
              Summary
            </label>
            <textarea
              id="edit-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              disabled={isFormLocked}
              className="form-field form-field-md mt-1 resize-none"
              data-testid="edit-summary-input"
            />
          </div>

          {/* Lifecycle */}
          {item.id !== "new" && (
            <div className="surface-card bg-muted/40 p-3">
              <LifecycleDetails item={item} />
            </div>
          )}

          {/* Checklist / Progress */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Progress Checklist ({progress}%)
            </label>
            <div className="mt-2 space-y-2">
              {checklist.length === 0 ? (
                <p className="text-xs text-muted-foreground/80">No checklist items yet.</p>
              ) : (
                <ul className="space-y-1" data-testid="checklist-items">
                  {checklist.map((item) => (
                    <li
                      key={item.id}
                      className="flex min-w-0 items-start gap-2 rounded border border-border px-2 py-1.5"
                      data-testid={`checklist-item-${item.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklistItem(item.id)}
                        disabled={isFormLocked}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border-strong"
                        data-testid={`checklist-checkbox-${item.id}`}
                      />
                      <span
                        className={`min-w-0 flex-1 whitespace-normal wrap-break-word text-sm ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                      >
                        {item.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                        aria-label={`Remove checklist item: ${item.text}`}
                        disabled={isFormLocked}
                        className="shrink-0 text-xs text-muted-foreground/80 hover:text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground/50"
                        data-testid={`checklist-remove-${item.id}`}
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {/* Add new checklist item */}
              <div className="flex min-w-0 gap-2">
                <input
                  type="text"
                  placeholder="Add checklist item..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  disabled={isFormLocked}
                  className="form-field form-field-sm flex-1"
                  data-testid="checklist-add-input"
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  disabled={isFormLocked}
                  className="btn-secondary btn-sm"
                  data-testid="checklist-add-btn"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-border bg-surface px-4 py-4">
          {shouldSuggestComplete && (
            <div className="mb-3 flex flex-col gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>All checklist items are complete. Mark project as completed?</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleKeepStatus}
                  disabled={isPending}
                  className="btn-secondary btn-sm"
                  data-testid="edit-complete-keep-btn"
                >
                  Keep status
                </button>
                <button
                  type="button"
                  onClick={handleMarkProjectCompleted}
                  disabled={isPending}
                  className="btn-primary btn-sm"
                  data-testid="edit-complete-mark-btn"
                >
                  Mark completed
                </button>
              </div>
            </div>
          )}
          {showCompletionConfirm ? (
            <div className="flex flex-col gap-3">
              <p className="text-center text-sm text-muted-foreground">
                This project is marked completed but some checklist items are unchecked.
              </p>
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleMarkStatusActive}
                  disabled={isPending}
                  className="btn-primary btn-md w-full text-center sm:w-64"
                  data-testid="edit-confirm-active-btn"
                >
                  Mark status active and save
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllComplete}
                  disabled={isPending}
                  className="btn-primary btn-md w-full text-center sm:w-64"
                  data-testid="edit-confirm-mark-all-btn"
                >
                  Mark checklist complete and save
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleBackToEdit}
                  disabled={isPending}
                  className="btn-secondary btn-xs rounded-full"
                  data-testid="edit-confirm-back-btn"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="btn-secondary btn-md"
                data-testid="edit-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary btn-md"
                data-testid="edit-save-btn"
              >
                {isPending ? "Saving..." : saveLabel}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
