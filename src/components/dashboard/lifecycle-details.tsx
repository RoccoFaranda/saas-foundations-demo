import type { DashboardItem } from "./model";

interface LifecycleDetailsProps {
  item: DashboardItem;
  className?: string;
}

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "-";

  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LifecycleDetails({ item, className }: LifecycleDetailsProps) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
        Lifecycle
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-foreground/50">Created</dt>
        <dd className="text-foreground/80">{formatDateTime(item.createdAt)}</dd>

        <dt className="text-foreground/50">Updated</dt>
        <dd className="text-foreground/80">{formatDateTime(item.updatedAt)}</dd>

        <dt className="text-foreground/50">Completed</dt>
        <dd className="text-foreground/80">{formatDateTime(item.completedAt)}</dd>

        <dt className="text-foreground/50">Archived</dt>
        <dd className="text-foreground/80">{formatDateTime(item.archivedAt)}</dd>
      </dl>
    </div>
  );
}
