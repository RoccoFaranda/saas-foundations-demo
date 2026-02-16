import type { ActivityEntry } from "./model";

interface ActivityFeedProps {
  title?: string;
  activities?: ActivityEntry[];
  helperText?: string;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityFeed({
  title = "Recent Activity",
  activities = [],
  helperText = "Showing latest 20 events.",
}: ActivityFeedProps) {
  return (
    <div className="rounded-lg border border-border bg-surface" data-testid="activity-feed">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-medium">{title}</h2>
        {activities.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
      {activities.length === 0 ? (
        <div className="flex h-40 items-center justify-center p-4">
          <p className="text-center text-sm text-muted-foreground/80">
            Activity updates will appear here.
            <br />
            <span className="text-xs text-muted-foreground">Check back after making changes.</span>
          </p>
        </div>
      ) : (
        <ul
          className="max-h-64 divide-y divide-border/60 overflow-y-auto"
          data-testid="activity-list"
        >
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="px-4 py-3"
              data-testid={`activity-item-${activity.id}`}
            >
              <p className="text-sm text-foreground">{activity.message}</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                {formatTime(activity.timestamp)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
