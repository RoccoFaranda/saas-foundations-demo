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
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Lifecycle
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Created</dt>
        <dd className="text-foreground">{formatDateTime(item.createdAt)}</dd>

        <dt className="text-muted-foreground">Updated</dt>
        <dd className="text-foreground">{formatDateTime(item.updatedAt)}</dd>

        <dt className="text-muted-foreground">Completed</dt>
        <dd className="text-foreground">{formatDateTime(item.completedAt)}</dd>

        <dt className="text-muted-foreground">Archived</dt>
        <dd className="text-foreground">{formatDateTime(item.archivedAt)}</dd>
      </dl>
    </div>
  );
}
