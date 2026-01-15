interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
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
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i} className="border-b border-foreground/5 last:border-0 animate-pulse">
              <td className="py-3 pr-4">
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-foreground/10" />
                  <div className="h-3 w-48 rounded bg-foreground/5" />
                </div>
              </td>
              <td className="py-3 pr-4">
                <div className="h-5 w-16 rounded-full bg-foreground/10" />
              </td>
              <td className="py-3 pr-4">
                <div className="h-5 w-14 rounded-full bg-foreground/10" />
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-foreground/10" />
                  <div className="h-3 w-8 rounded bg-foreground/5" />
                </div>
              </td>
              <td className="py-3 pr-4">
                <div className="h-4 w-12 rounded bg-foreground/10" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
