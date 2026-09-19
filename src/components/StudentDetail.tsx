import type { Classroom, Student } from "@/types";
import { ProgressBar, SplitProgressBar } from "./ProgressBar";
import {
  ACTIVITY_WEIGHT,
  LESSON_WEIGHT,
  activityPoints,
  lessonBreakdown,
  lessonPoints,
  progressPercent,
  summarizeProgress,
} from "@/lib/progress";
import { ReportMenu } from "./ReportMenu";

// One decimal, no trailing ".0" — keeps "7.1" but shows "50" not "50.0".
const pts = (n: number) => String(Math.round(n * 10) / 10);

function progressMessage(percent: number) {
  if (percent >= 75) return "Excellent Progress";
  if (percent >= 40) return "Good Progress";
  if (percent > 0) return "Just Getting Started";
  return "Not Started Yet";
}

export function StudentDetail({
  student,
  classroom,
  peers,
  classrooms,
  onBack,
  onEdit,
  onDelete,
}: {
  student: Student;
  classroom: Classroom | undefined;
  // Every student the current user can see — the report compares this student
  // with their classmates.
  peers: Student[];
  classrooms: Classroom[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const summary = summarizeProgress(student.learningProgress);
  const percent = progressPercent(summary);
  const lessons = lessonBreakdown(student.learningProgress);
  const lessonPts = lessonPoints(summary);
  const activityPts = activityPoints(summary);

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
          <div className="flex shrink-0 flex-wrap gap-2">
            <ReportMenu
              label="Download report"
              scopes={[{ label: "This student", scope: { type: "student", studentId: student.id } }]}
              students={peers}
              classrooms={classrooms}
            />
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
          <SplitProgressBar lessonPoints={lessonPts} activityPoints={activityPts} />
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-chart-series-1" />
              Lessons {pts(lessonPts)}% / {LESSON_WEIGHT}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-chart-series-2" />
              Activities {pts(activityPts)}% / {ACTIVITY_WEIGHT}%
            </span>
            <span className="ml-auto font-medium text-foreground">
              {pts(lessonPts)}% + {pts(activityPts)}% = {percent}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-l-4 border-border border-l-chart-series-1 bg-surface p-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-muted">Lessons · worth {LESSON_WEIGHT}%</p>
            <p className="text-xs font-medium text-foreground">
              {pts(lessonPts)}% / {LESSON_WEIGHT}%
            </p>
          </div>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {summary.lessonsCompleted} / {summary.totalLessons} Lessons completed
          </p>
          <div className="mt-3">
            <ProgressBar percent={(lessonPts / LESSON_WEIGHT) * 100} />
          </div>
          <p className="mt-2 text-xs text-muted">
            Every lesson counts equally, in proportion to the pages read.
          </p>
        </div>
        <div className="rounded-2xl border border-l-4 border-border border-l-chart-series-2 bg-surface p-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-muted">Activities · worth {ACTIVITY_WEIGHT}%</p>
            <p className="text-xs font-medium text-foreground">
              {pts(activityPts)}% / {ACTIVITY_WEIGHT}%
            </p>
          </div>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {summary.activitiesCompleted} / {summary.totalActivities} Activities completed
          </p>
          <div className="mt-3">
            <ProgressBar percent={(activityPts / ACTIVITY_WEIGHT) * 100} />
          </div>
          <p className="mt-2 text-xs text-muted">
            Every activity counts equally once it is completed.
          </p>
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
            {lessons.map((row) => {
              const lessonDone = row.lessonTotal > 0 && row.lessonCompleted >= row.lessonTotal;
              const fraction =
                row.lessonTotal > 0 ? Math.min(1, row.lessonCompleted / row.lessonTotal) : 0;
              const badge = lessonDone
                ? row.activityCompleted
                  ? { label: "Complete", tone: "bg-success/10 text-success" }
                  : { label: "Activity pending", tone: "bg-accent/10 text-accent" }
                : fraction > 0
                ? { label: "In progress", tone: "bg-primary/10 text-primary" }
                : row.activityCompleted
                ? { label: "Lesson pending", tone: "bg-accent/10 text-accent" }
                : { label: "Not started", tone: "bg-surface-alt text-muted" };
              return (
                <div key={row.key} className="space-y-3 px-4 py-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-foreground">{row.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${badge.tone}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="text-muted">
                          Lesson ·{" "}
                          {row.lessonTotal > 0
                            ? `${row.lessonCompleted} / ${row.lessonTotal} pages`
                            : "not started"}
                        </span>
                        <span className="shrink-0 font-medium text-foreground">
                          {Math.round(fraction * 100)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full bg-chart-series-1 transition-all"
                          style={{ width: `${fraction * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="text-muted">
                          Activity ·{" "}
                          {row.activityCompleted ? `done (score ${row.score})` : "not completed"}
                        </span>
                        <span className="shrink-0 font-medium text-foreground">
                          {row.activityCompleted ? 100 : 0}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full bg-chart-series-2 transition-all"
                          style={{ width: row.activityCompleted ? "100%" : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
