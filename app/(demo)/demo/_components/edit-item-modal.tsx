"use client";

import { useRef, useState } from "react";
import type { DemoItem, DemoItemStatus, DemoItemTag } from "../demo-items";

interface EditItemModalProps {
  item: DemoItem | null;
  isOpen: boolean;
  onSave: (updated: DemoItem) => void;
  onCancel: () => void;
}

const statusOptions: DemoItemStatus[] = ["active", "pending", "completed", "archived"];
const tagOptions: DemoItemTag[] = ["feature", "bugfix", "docs", "infra", "design"];

export function EditItemModal({ item, isOpen, onSave, onCancel }: EditItemModalProps) {
  // Only render when open and item exists
  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="edit-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Inner form component - remounts when item changes, initializing state from props */}
      <EditItemForm key={item.id} item={item} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

interface EditItemFormProps {
  item: DemoItem;
  onSave: (updated: DemoItem) => void;
  onCancel: () => void;
}

function EditItemForm({ item, onSave, onCancel }: EditItemFormProps) {
  // State initialized from props on mount (no effect needed)
  const [name, setName] = useState(item.name);
  const [status, setStatus] = useState<DemoItemStatus>(item.status);
  const [tag, setTag] = useState<DemoItemTag>(item.tag);
  const [summary, setSummary] = useState(item.summary);
  const nameInputRef = useRef<HTMLInputElement>(null);
  // Store metric as string to allow empty field while typing
  const [metricStr, setMetricStr] = useState(String(item.metric));

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
    const metricValue = parseInt(metricStr, 10);
    const clampedMetric = Math.max(0, Math.min(100, isNaN(metricValue) ? 0 : metricValue));

    const hasChanges =
      trimmedName !== item.name ||
      status !== item.status ||
      tag !== item.tag ||
      trimmedSummary !== item.summary ||
      clampedMetric !== item.metric;

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
      metric: clampedMetric,
      updatedAt: new Date().toISOString(),
    });
  };

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
              onChange={(e) => setStatus(e.target.value as DemoItemStatus)}
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
              onChange={(e) => setTag(e.target.value as DemoItemTag)}
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

          {/* Metric / Progress */}
          <div>
            <label htmlFor="edit-metric" className="block text-sm font-medium text-foreground/70">
              Progress (%)
            </label>
            <input
              id="edit-metric"
              type="number"
              min={0}
              max={100}
              value={metricStr}
              onChange={(e) => setMetricStr(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(metricStr, 10);
                const clamped = isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
                setMetricStr(String(clamped));
              }}
              className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:border-foreground/30 focus:outline-none"
              data-testid="edit-metric-input"
            />
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
