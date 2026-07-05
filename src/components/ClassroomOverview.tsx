"use client";

import { useMemo, useState } from "react";
import { useStudentsPolling } from "@/lib/hooks";
import {
  computeLessonStats,
  filterByLessonStatus,
  filterByOverallStatus,
  lessonEngagement,
  LESSON_ENGAGEMENT_LABEL,
  type LessonStatus,
  type OverallStatus,
} from "@/lib/classroom-analytics";
import { studentProgressPercent, summarizeProgress } from "@/lib/progress";
import { CURRICULUM_LESSONS } from "@/lib/curriculum";
import { LessonBarChart } from "./LessonBarChart";
import { StatCard } from "./StatCard";

const POLL_INTERVAL_MS = 15000;

export function ClassroomOverview({ classroomId }: { classroomId: string }) {
  const {
    students: allStudents,
    loading,
    error,
    lastUpdated,
  } = useStudentsPolling(POLL_INTERVAL_MS);

  const roster = useMemo(
    () => allStudents.filter((s) => s.classCode === classroomId),
    [allStudents, classroomId]
  );

  const [lessonKey, setLessonKey] = useState<string>("all");
  const [overallStatus, setOverallStatus] = useState<OverallStatus>("all");
  const [lessonStatus, setLessonStatus] = useState<LessonStatus>("all");

  const stats = useMemo(() => computeLessonStats(roster), [roster]);

  const avgProgress = roster.length
    ? Math.round(
        roster.reduce((sum, s) => sum + studentProgressPercent(s), 0) / roster.length
      )
    : 0;
  const activitiesCompleted = roster.reduce(
    (sum, s) => sum + summarizeProgress(s.learningProgress).activitiesCompleted,
    0
  );
  const lessonsFullyDone = stats.filter(
    (s) => roster.length > 0 && s.lessonCompletedCount === roster.length
  ).length;

  const filtered = useMemo(() => {
    if (lessonKey === "all") return filterByOverallStatus(roster, overallStatus);
    return filterByLessonStatus(roster, lessonKey, lessonStatus);
  }, [roster, lessonKey, overallStatus, lessonStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs text-muted">
        <p>Live snapshot · refreshes every 15s</p>
        {lastUpdated && <p>Updated {new Date(lastUpdated).toLocaleTimeString()}</p>}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading overview...</p>
      ) : roster.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">No students enrolled yet.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Enrolled Students" value={roster.length} />
            <StatCard label="Average Progress" value={`${avgProgress}%`} />
            <StatCard
              label="Lessons Fully Completed"
              value={lessonsFullyDone}
              hint={`out of ${stats.length} lessons`}
            />
            <StatCard label="Activities Completed" value={activitiesCompleted} />
          </div>

          <LessonBarChart stats={stats} />

          <div className="rounded-2xl border border-border bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <select
                value={lessonKey}
                onChange={(e) => {
                  setLessonKey(e.target.value);
                  setOverallStatus("all");
                  setLessonStatus("all");
                }}
                className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All lessons</option>
                {CURRICULUM_LESSONS.map((title, i) => (
                  <option key={i} value={`lesson${i + 1}`}>
                    {title}
                  </option>
                ))}
              </select>

              {lessonKey === "all" ? (
                <select
                  value={overallStatus}
                  onChange={(e) => setOverallStatus(e.target.value as OverallStatus)}
                  className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All students</option>
                  <option value="completed">Completed (100%)</option>
                  <option value="in-progress">In progress</option>
                  <option value="not-started">Not started</option>
                </select>
              ) : (
                <select
                  value={lessonStatus}
                  onChange={(e) => setLessonStatus(e.target.value as LessonStatus)}
                  className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All students</option>
                  <option value="lesson-complete">Lesson completed</option>
                  <option value="lesson-incomplete">Lesson not completed</option>
                  <option value="activity-complete">Activity completed</option>
                  <option value="activity-incomplete">Activity not completed</option>
                </select>
              )}

              <span className="ml-auto text-xs text-muted">{filtered.length} matching</span>
            </div>

            {filtered.length === 0 ? (
              <p className="p-6 text-sm text-muted">No students match this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Overall progress</th>
                      {lessonKey !== "all" && (
                        <th className="px-4 py-3 font-medium">Activity score</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((student) => {
                      const percent = studentProgressPercent(student);
                      const lessonProgress =
                        lessonKey !== "all" ? student.learningProgress?.[lessonKey] : undefined;
                      const engagement =
                        lessonKey !== "all" ? lessonEngagement(lessonProgress) : null;
                      return (
                        <tr key={student.id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium text-foreground">{student.fullName}</p>
                                <p className="text-xs text-muted">{student.email}</p>
                              </div>
                              {engagement && (
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    engagement === "completed"
                                      ? "bg-success/10 text-success"
                                      : engagement === "in-progress"
                                      ? "bg-accent/10 text-accent"
                                      : "bg-surface-alt text-muted"
                                  }`}
                                >
                                  {LESSON_ENGAGEMENT_LABEL[engagement]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted">{percent}%</td>
                          {lessonKey !== "all" && (
                            <td className="px-4 py-3 text-muted">
                              {lessonProgress?.activity.activityCompleted
                                ? `Done (score ${lessonProgress.activity.score})`
                                : "Not completed"}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
