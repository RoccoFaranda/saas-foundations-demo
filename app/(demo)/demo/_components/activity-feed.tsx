import type { ActivityEntry } from "../demo-items";

interface ActivityFeedProps {
  title?: string;
  activities?: ActivityEntry[];
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityFeed({ title = "Recent Activity", activities = [] }: ActivityFeedProps) {
  return (
    <div
      className="rounded-lg border border-foreground/10 bg-background"
      data-testid="activity-feed"
    >
      <div className="border-b border-foreground/10 px-4 py-3">
        <h2 className="font-medium">{title}</h2>
      </div>
      {activities.length === 0 ? (
        <div className="flex h-40 items-center justify-center p-4">
          <p className="text-center text-sm text-foreground/40">
            Activity updates will appear here.
            <br />
            <span className="text-xs">Check back after making changes.</span>
          </p>
        </div>
      ) : (
        <ul
          className="max-h-64 divide-y divide-foreground/5 overflow-y-auto"
          data-testid="activity-list"
        >
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="px-4 py-3"
              data-testid={`activity-item-${activity.id}`}
            >
              <p className="text-sm text-foreground/80">{activity.message}</p>
              <p className="mt-1 text-xs text-foreground/40">{formatTime(activity.timestamp)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
