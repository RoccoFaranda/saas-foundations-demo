interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function KpiCard({ label, value, subtitle }: KpiCardProps) {
  return (
    <div className="h-full rounded-lg border border-border bg-surface p-3 sm:p-4">
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="mt-1 text-xl font-semibold sm:text-2xl">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground/80">{subtitle}</p>}
    </div>
  );
}
