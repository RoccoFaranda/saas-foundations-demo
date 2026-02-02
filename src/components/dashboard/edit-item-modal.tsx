"use client";

import { useRef, useState } from "react";
import type { DashboardItem, ItemStatus, ItemTag, ChecklistItem } from "./model";
import { computeProgress, generateId } from "./model";

interface EditItemModalProps {
  item: DashboardItem | null;
  isOpen: boolean;
  onSave: (updated: DashboardItem) => void;
  onCancel: () => void;
}

const statusOptions: ItemStatus[] = ["active", "pending", "completed", "archived"];
const tagOptions: ItemTag[] = ["feature", "bugfix", "docs", "infra", "design"];

export function EditItemModal({ item, isOpen, onSave, onCancel }: EditItemModalProps) {
  // Track if mousedown started on backdrop (for proper click-to-close behavior)
  const mouseDownOnBackdrop = useRef(false);

  // Only render when open and item exists
  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="edit-modal-backdrop"
      onMouseDown={(e) => {
        // Only set true if mousedown is directly on backdrop, not on modal content
        mouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Only close if both mousedown and mouseup (click) happened on backdrop
        if (e.target === e.currentTarget && mouseDownOnBackdrop.current) {
          onCancel();
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      {/* Inner form component - remounts when item changes, initializing state from props */}
      <EditItemForm key={item.id} item={item} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

interface EditItemFormProps {
  item: DashboardItem;
  onSave: (updated: DashboardItem) => void;
  onCancel: () => void;
}

function EditItemForm({ item, onSave, onCancel }: EditItemFormProps) {
  // State initialized from props on mount (no effect needed)
  const [name, setName] = useState(item.name);
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [tag, setTag] = useState<ItemTag>(item.tag);
  const [summary, setSummary] = useState(item.summary);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(item.checklist);
  const [newChecklistText, setNewChecklistText] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
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
      className="w-full max-w-md rounded-lg border border-foreground/10 bg-background shadow-xl"
      data-testid="edit-modal"
      role="dialog"
      aria-labelledby="edit-modal-title"
    >
      {/* Header */}
      <div className="border-b border-foreground/10 px-4 py-3">
        <h2 id="edit-modal-title" className="font-medium">
          Edit Project
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="space-y-4">
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
              value={tag}
              onChange={(e) => setTag(e.target.value as ItemTag)}
              className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm capitalize focus:border-foreground/30 focus:outline-none"
              data-testid="edit-tag-select"
            >
              {tagOptions.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
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
              rows={2}
              className="mt-1 w-full resize-none rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:border-foreground/30 focus:outline-none"
              data-testid="edit-summary-input"
            />
          </div>

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
                      className="flex items-center gap-2 rounded border border-foreground/10 px-2 py-1.5"
                      data-testid={`checklist-item-${item.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="h-4 w-4 cursor-pointer rounded border-foreground/20"
                        data-testid={`checklist-checkbox-${item.id}`}
                      />
                      <span
                        className={`flex-1 text-sm ${item.done ? "text-foreground/40 line-through" : "text-foreground"}`}
                      >
                        {item.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                        aria-label={`Remove checklist item: ${item.text}`}
                        className="text-xs text-foreground/40 hover:text-foreground/70"
                        data-testid={`checklist-remove-${item.id}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {/* Add new checklist item */}
              <div className="flex gap-2">
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
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-foreground/10 bg-background px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
            data-testid="edit-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            data-testid="edit-save-btn"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
