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

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const addChecklistItem = () => {
    const text = newChecklistText.trim();
    if (text.length === 0) return;

    setChecklist((prev) => [...prev, { id: generateId("check"), text, done: false }]);
    setNewChecklistText("");
  };

  const removeChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
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

    // Check if anything changed (deep equality for checklist)
    const hasChanges =
      trimmedName !== item.name ||
      status !== item.status ||
      tag !== item.tag ||
      trimmedSummary !== item.summary ||
      JSON.stringify(checklist) !== JSON.stringify(item.checklist);

    if (!hasChanges) {
      onCancel();
      return;
    }

    onSave({
      ...item,
      name: trimmedName,
      status,
      tag,
      summary: trimmedSummary,
      checklist,
      updatedAt: new Date().toISOString(),
    });
  };

  const progress = computeProgress(checklist);

  return (
    <div
      className="w-[min(56rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-foreground/10 bg-background shadow-xl"
      data-testid="edit-modal"
    >
      {/* Header */}
      <div className="border-b border-foreground/10 px-4 py-3">
        <h2 id="edit-modal-title" className="font-medium">
          {title}
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex max-h-[75vh] flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* Name */}
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-foreground/70">
              Name
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              ref={nameInputRef}
              required
              className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:border-foreground/30 focus:outline-none"
              data-testid="edit-name-input"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="edit-status" className="block text-sm font-medium text-foreground/70">
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ItemStatus)}
              className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm capitalize focus:border-foreground/30 focus:outline-none"
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
            <label htmlFor="edit-tag" className="block text-sm font-medium text-foreground/70">
              Tag
            </label>
            <select
              id="edit-tag"
              value={tag ?? ""}
              onChange={(e) => setTag(e.target.value ? (e.target.value as ItemTag) : null)}
              className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm capitalize focus:border-foreground/30 focus:outline-none"
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
            <label htmlFor="edit-summary" className="block text-sm font-medium text-foreground/70">
              Summary
            </label>
            <textarea
              id="edit-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-none rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:border-foreground/30 focus:outline-none"
              data-testid="edit-summary-input"
            />
          </div>

          {/* Lifecycle */}
          {item.id !== "new" && (
            <div className="rounded-md border border-foreground/10 bg-foreground/2 p-3">
              <LifecycleDetails item={item} />
            </div>
          )}

          {/* Checklist / Progress */}
          <div>
            <label className="block text-sm font-medium text-foreground/70">
              Progress Checklist ({progress}%)
            </label>
            <div className="mt-2 space-y-2">
              {checklist.length === 0 ? (
                <p className="text-xs text-foreground/40">No checklist items yet.</p>
              ) : (
                <ul className="space-y-1" data-testid="checklist-items">
                  {checklist.map((item) => (
                    <li
                      key={item.id}
                      className="flex min-w-0 items-start gap-2 rounded border border-foreground/10 px-2 py-1.5"
                      data-testid={`checklist-item-${item.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-foreground/20"
                        data-testid={`checklist-checkbox-${item.id}`}
                      />
                      <span
                        className={`min-w-0 flex-1 whitespace-normal wrap-break-word text-sm ${item.done ? "text-foreground/40 line-through" : "text-foreground"}`}
                      >
                        {item.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                        aria-label={`Remove checklist item: ${item.text}`}
                        className="shrink-0 text-xs text-foreground/40 hover:text-foreground/70"
                        data-testid={`checklist-remove-${item.id}`}
                      >
                        ×
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
                  className="flex-1 rounded-md border border-foreground/10 bg-background px-2 py-1.5 text-sm focus:border-foreground/30 focus:outline-none"
                  data-testid="checklist-add-input"
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="rounded-md border border-foreground/10 bg-background px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
                  data-testid="checklist-add-btn"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-foreground/10 bg-background px-4 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-foreground/10 bg-background px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/5 disabled:opacity-50"
            data-testid="edit-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            data-testid="edit-save-btn"
          >
            {isPending ? "Saving..." : saveLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
