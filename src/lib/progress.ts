import type { LessonProgress, Student } from "@/types";
import { CURRICULUM_LESSONS } from "./curriculum";

export interface ProgressSummary {
  lessonsCompleted: number;
  totalLessons: number;
  activitiesCompleted: number;
  totalActivities: number;
}

// Real-world learningProgress entries (written by the Android app) aren't
// always the full { lesson, activity } shape the type promises — a partial
// write can leave one sub-object missing. Every reader below goes through
// these instead of touching `.lesson`/`.activity` directly, so a malformed
// entry degrades to "not started" instead of crashing the whole page.
export function safeLesson(p: LessonProgress | undefined | null) {
  return p?.lesson ?? { completed: 0, total: 0 };
}

export function safeActivity(p: LessonProgress | undefined | null) {
  return p?.activity ?? { activityCompleted: false, score: 0 };
}

function isLessonComplete(p: LessonProgress) {
  const lesson = safeLesson(p);
  return lesson.total > 0 && lesson.completed >= lesson.total;
}

export function summarizeProgress(
  learningProgress: Student["learningProgress"] | undefined
): ProgressSummary {
  const entries = Object.values(learningProgress ?? {});
  return {
    lessonsCompleted: entries.filter(isLessonComplete).length,
    totalLessons: entries.length,
    activitiesCompleted: entries.filter((p) => safeActivity(p).activityCompleted).length,
    totalActivities: entries.length,
  };
}

export function progressPercent(summary: ProgressSummary): number {
  if (!summary.totalLessons) return 0;
  return Math.round((summary.lessonsCompleted / summary.totalLessons) * 100);
}

export function studentProgressPercent(student: Student): number {
  return progressPercent(summarizeProgress(student.learningProgress));
}

export interface LessonBreakdownRow {
  key: string;
  title: string;
  lessonCompleted: number;
  lessonTotal: number;
  activityCompleted: boolean;
  score: number;
}

export function lessonBreakdown(
  learningProgress: Student["learningProgress"] | undefined
): LessonBreakdownRow[] {
  const entries = Object.entries(learningProgress ?? {});
  entries.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  return entries.map(([key, p], index) => {
    const lesson = safeLesson(p);
    const activity = safeActivity(p);
    return {
      key,
      title: CURRICULUM_LESSONS[index] ?? `Lesson ${index + 1}`,
      lessonCompleted: lesson.completed,
      lessonTotal: lesson.total,
      activityCompleted: activity.activityCompleted,
      score: activity.score,
    };
  });
}

export function buildInitialLearningProgress(): Student["learningProgress"] {
  const progress: Student["learningProgress"] = {};
  CURRICULUM_LESSONS.forEach((_, index) => {
    progress[`lesson${index + 1}`] = {
      lesson: { completed: 0, total: 0 },
      activity: { activityCompleted: false, score: 0 },
    };
  });
  return progress;
}
