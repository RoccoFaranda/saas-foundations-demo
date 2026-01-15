import type { DemoItem, DemoItemStatus, DemoItemTag } from "../demo-items";

interface ItemsTableProps {
  items: DemoItem[];
  emptyMessage?: string;
}

const statusColors: Record<DemoItemStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  archived: "bg-foreground/10 text-foreground/50",
};

const tagColors: Record<DemoItemTag, string> = {
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

export function ItemsTable({ items, emptyMessage = "No items found" }: ItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-foreground/40">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-foreground/60">
            <th className="pb-3 pr-4 font-medium">Name</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Tag</th>
            <th className="pb-3 pr-4 font-medium">Progress</th>
            <th className="pb-3 pr-4 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-foreground/5 last:border-0">
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
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tagColors[item.tag]}`}
                >
                  {item.tag}
                </span>
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className="h-full rounded-full bg-foreground/40"
                      style={{ width: `${item.metric}%` }}
                    />
                  </div>
                  <span className="text-xs text-foreground/50">{item.metric}%</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-foreground/60">{formatDate(item.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
