import { ACTIVITY_WEIGHT, LESSON_WEIGHT } from "@/lib/progress";

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

// Overall progress bar with a fixed 50/50 split: the left half fills with
// lesson progress (blue), the right half with activity progress (gold). A
// faint divider marks the halfway point so "lessons done, no activities" is
// visibly a full left half.
export function SplitProgressBar({
  lessonPoints,
  activityPoints,
}: {
  lessonPoints: number;
  activityPoints: number;
}) {
  const lesson = Math.min(LESSON_WEIGHT, Math.max(0, lessonPoints));
  const activity = Math.min(ACTIVITY_WEIGHT, Math.max(0, activityPoints));
  return (
    <div
      className="relative flex h-2 w-full overflow-hidden rounded-full bg-surface-alt"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(lesson + activity)}
      title={`Lessons ${Math.round(lesson)}/${LESSON_WEIGHT} · Activities ${Math.round(activity)}/${ACTIVITY_WEIGHT}`}
    >
      <div className="h-full bg-chart-series-1 transition-all" style={{ width: `${lesson}%` }} />
      <div
        className="h-full bg-chart-series-2 transition-all"
        style={{ marginLeft: `${LESSON_WEIGHT - lesson}%`, width: `${activity}%` }}
      />
      <div className="absolute inset-y-0 left-1/2 w-px bg-background/60" />
    </div>
  );
}
