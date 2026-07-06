import type { Classroom, Student } from "@/types";
import { ProgressBar } from "./ProgressBar";
import {
  lessonBreakdown,
  progressPercent,
  summarizeProgress,
} from "@/lib/progress";

function progressMessage(percent: number) {
  if (percent >= 75) return "Excellent Progress";
  if (percent >= 40) return "Good Progress";
  if (percent > 0) return "Just Getting Started";
  return "Not Started Yet";
}

export function StudentDetail({
  student,
  classroom,
  onBack,
  onEdit,
  onDelete,
}: {
  student: Student;
  classroom: Classroom | undefined;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const summary = summarizeProgress(student.learningProgress);
  const percent = progressPercent(summary);
  const lessons = lessonBreakdown(student.learningProgress);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-muted hover:text-foreground transition-colors"
      >
        ← Back to all students
      </button>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              ✓ {percent}% Completed
            </span>
            <h1 className="mt-3 font-serif text-2xl font-semibold text-foreground">
              {progressMessage(percent)}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {student.fullName} · @{student.username} · {student.email}
            </p>
            <p className="mt-1 text-xs text-muted">
              Classroom: {classroom?.name ?? "Unassigned"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="mt-5">
          <ProgressBar percent={percent} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Lessons Completed</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {summary.lessonsCompleted} / {summary.totalLessons} Lessons
          </p>
          <div className="mt-3">
            <ProgressBar
              percent={
                summary.totalLessons
                  ? (summary.lessonsCompleted / summary.totalLessons) * 100
                  : 0
              }
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Activities Completed</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {summary.activitiesCompleted} / {summary.totalActivities} Activities
          </p>
          <div className="mt-3">
            <ProgressBar
              percent={
                summary.totalActivities
                  ? (summary.activitiesCompleted / summary.totalActivities) * 100
                  : 0
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Lesson Breakdown</h2>
        </div>
        {lessons.length === 0 ? (
          <p className="p-6 text-sm text-muted">No lesson progress recorded yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {lessons.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{row.title}</p>
                  <p className="text-xs text-muted">
                    {row.lessonCompleted} / {row.lessonTotal || "?"} sections
                    {row.activityCompleted
                      ? ` · Activity done (score ${row.score})`
                      : " · Activity not completed"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    row.lessonTotal > 0 && row.lessonCompleted >= row.lessonTotal
                      ? "bg-success/10 text-success"
                      : "bg-surface-alt text-muted"
                  }`}
                >
                  {row.lessonTotal > 0 && row.lessonCompleted >= row.lessonTotal
                    ? "Complete"
                    : "In progress"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
