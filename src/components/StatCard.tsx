import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border border-l-4 border-l-primary bg-surface p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      {icon && (
        <div className="rounded-xl bg-surface-alt p-2.5 text-primary">{icon}</div>
      )}
    </div>
  );
}
