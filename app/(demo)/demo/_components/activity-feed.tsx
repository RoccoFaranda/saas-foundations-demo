interface ActivityFeedProps {
  title?: string;
}

export function ActivityFeed({ title = "Recent Activity" }: ActivityFeedProps) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-background">
      <div className="border-b border-foreground/10 px-4 py-3">
        <h2 className="font-medium">{title}</h2>
      </div>
      <div className="flex h-40 items-center justify-center p-4">
        <p className="text-center text-sm text-foreground/40">
          Activity updates will appear here.
          <br />
          <span className="text-xs">Check back after making changes.</span>
        </p>
      </div>
    </div>
  );
}
