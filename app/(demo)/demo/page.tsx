export default function DemoPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Welcome to demo mode - explore without signing up.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Projects" value="--" />
        <StatCard label="Active Tasks" value="--" />
        <StatCard label="Team Members" value="--" />
        <StatCard label="Completed" value="--" />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Primary Panel */}
        <div className="lg:col-span-2">
          <Panel title="Recent Activity">
            <EmptyState message="No activity yet - this is a demo preview." />
          </Panel>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <Panel title="Quick Actions">
            <div className="space-y-2">
              <PlaceholderButton label="Create Project" />
              <PlaceholderButton label="Invite Team" />
              <PlaceholderButton label="View Reports" />
            </div>
          </Panel>

          <Panel title="Notifications">
            <EmptyState message="No notifications" />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-background">
      <div className="border-b border-foreground/10 px-4 py-3">
        <h2 className="font-medium">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-foreground/40">
      {message}
    </div>
  );
}

function PlaceholderButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="w-full rounded-md border border-foreground/10 bg-foreground/5 px-3 py-2 text-left text-sm text-foreground/60 transition-colors hover:bg-foreground/10"
    >
      {label}
    </button>
  );
}
