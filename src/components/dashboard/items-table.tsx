import type { DashboardItem, ItemStatus, ItemTag } from "./model";
import { computeProgress } from "./model";

interface ItemsTableProps {
  items: DashboardItem[];
  emptyMessage?: string;
  onEdit?: (item: DashboardItem) => void;
  onDelete?: (item: DashboardItem) => void;
}

const statusColors: Record<ItemStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

const tagColors: Record<ItemTag, string> = {
  feature: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  bugfix: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  docs: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  infra: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  design: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
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
}: ItemsTableProps) {
  const hasActions = onEdit || onDelete;
  if (items.length === 0) {
    return (
      <div
        className="flex h-40 items-center justify-center text-sm text-foreground/40"
        data-testid="items-table-empty"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="items-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-foreground/60">
            <th className="pb-3 pr-4 font-medium">Name</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Tag</th>
            <th className="pb-3 pr-4 font-medium">Progress</th>
            <th className="pb-3 pr-4 font-medium">Updated</th>
            {hasActions && <th className="pb-3 pr-4 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const progress = computeProgress(item.checklist);
            return (
              <tr
                key={item.id}
                className="border-b border-foreground/5 last:border-0"
                data-testid={`table-row-${item.id}`}
              >
                <td className="py-3 pr-4">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-foreground/50 line-clamp-1">{item.summary}</p>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[item.status]}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {item.tag ? (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tagColors[item.tag]}`}
                    >
                      {item.tag}
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground/60">
                      Untagged
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full bg-foreground/40"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-foreground/50">{progress}%</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-foreground/60">{formatDate(item.updatedAt)}</td>
                {hasActions && (
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
                          data-testid={`edit-btn-${item.id}`}
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-red-600/70 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-red-400/70 dark:hover:text-red-400"
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
