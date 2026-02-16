import type { DashboardItem, ItemStatus, ItemTag } from "./model";
import { computeProgress } from "./model";
import { HoverDetailsCard } from "./hover-details-card";
import { LifecycleDetails } from "./lifecycle-details";

interface ItemsTableProps {
  items: DashboardItem[];
  emptyMessage?: string;
  onEdit?: (item: DashboardItem) => void;
  onDelete?: (item: DashboardItem) => void;
  onArchive?: (item: DashboardItem) => void;
  onUnarchive?: (item: DashboardItem) => void;
  highlightArchiveActions?: boolean;
}

const statusColors: Record<ItemStatus, string> = {
  active: "chip-status-active",
  pending: "chip-status-pending",
  completed: "chip-status-completed",
};

const tagColors: Record<ItemTag, string> = {
  feature: "chip-tag-feature",
  bugfix: "chip-tag-bugfix",
  docs: "chip-tag-docs",
  infra: "chip-tag-infra",
  design: "chip-tag-design",
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ItemsTable({
  items,
  emptyMessage = "No items found",
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  highlightArchiveActions = false,
}: ItemsTableProps) {
  const hasActions = onEdit || onDelete || onArchive || onUnarchive;
  if (items.length === 0) {
    return (
      <div className="state-empty h-40" data-testid="items-table-empty">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="items-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-3 pr-4 font-medium">Name</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Tag</th>
            <th className="pb-3 pr-4 font-medium">Progress</th>
            <th className="pb-3 pr-4 font-medium">Updated</th>
            {hasActions && (
              <th
                className={`pb-3 pr-4 font-medium transition-colors ${
                  highlightArchiveActions ? "text-warning/80" : ""
                }`}
              >
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const progress = computeProgress(item.checklist);
            const hasChecklist = item.checklist.length > 0;
            const progressLabel = hasChecklist ? `${progress}%` : "--";
            return (
              <tr
                key={item.id}
                className="border-b border-border/70 last:border-0"
                data-testid={`table-row-${item.id}`}
              >
                <td className="py-3 pr-4">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {item.summary}
                    </p>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className={`chip capitalize ${statusColors[item.status]}`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {item.tag ? (
                    <span className={`chip ${tagColors[item.tag]}`}>{item.tag}</span>
                  ) : (
                    <span className="chip chip-untagged">Untagged</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <HoverDetailsCard
                      label={`Progress details for ${item.name}`}
                      trigger={
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            {hasChecklist && (
                              <div
                                className="h-full rounded-full bg-border-strong"
                                style={{ width: `${progress}%` }}
                              />
                            )}
                          </div>
                          <span
                            className={`text-xs ${hasChecklist ? "text-muted-foreground" : "text-muted-foreground/70"}`}
                          >
                            {progressLabel}
                          </span>
                        </div>
                      }
                    >
                      <div className="space-y-2 text-xs">
                        <p className="font-medium text-foreground">
                          Checklist (
                          {item.checklist.filter((checklistItem) => checklistItem.done).length}/
                          {item.checklist.length})
                        </p>
                        {item.checklist.length === 0 ? (
                          <p className="text-muted-foreground">No checklist items yet.</p>
                        ) : (
                          <ul className="space-y-1">
                            {item.checklist.map((checklistItem) => (
                              <li
                                key={checklistItem.id}
                                className="flex items-start gap-2 rounded border border-border px-2 py-1"
                              >
                                <span
                                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${checklistItem.done ? "bg-success" : "bg-muted-foreground/70"}`}
                                />
                                <span
                                  className={`min-w-0 flex-1 whitespace-normal wrap-break-word ${checklistItem.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                                >
                                  {checklistItem.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </HoverDetailsCard>
                  </div>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  <HoverDetailsCard
                    label={`Lifecycle details for ${item.name}`}
                    trigger={
                      <span className="text-muted-foreground">{formatDate(item.updatedAt)}</span>
                    }
                    align="right"
                  >
                    <LifecycleDetails item={item} />
                  </HoverDetailsCard>
                </td>
                {hasActions && (
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      {!item.archivedAt && onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="row-action"
                          data-testid={`edit-btn-${item.id}`}
                        >
                          Edit
                        </button>
                      )}
                      {!item.archivedAt && onArchive && (
                        <button
                          type="button"
                          onClick={() => onArchive(item)}
                          className={`row-action ${
                            highlightArchiveActions ? "row-action-warning" : ""
                          }`}
                          data-testid={`archive-btn-${item.id}`}
                        >
                          Archive
                        </button>
                      )}
                      {item.archivedAt && onUnarchive && (
                        <button
                          type="button"
                          onClick={() => onUnarchive(item)}
                          className="row-action"
                          data-testid={`unarchive-btn-${item.id}`}
                        >
                          Unarchive
                        </button>
                      )}
                      {item.archivedAt && onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          className="row-action row-action-danger"
                          data-testid={`delete-btn-${item.id}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
