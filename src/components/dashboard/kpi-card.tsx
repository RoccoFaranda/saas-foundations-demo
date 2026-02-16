interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function KpiCard({ label, value, subtitle }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground/80">{subtitle}</p>}
    </div>
  );
}
