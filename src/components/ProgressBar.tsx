export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-2 w-full rounded-full bg-surface-alt overflow-hidden">
      <div
        className="h-full rounded-full bg-success transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
