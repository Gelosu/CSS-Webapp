import type { LessonProgress, Student } from "@/types";
import { CURRICULUM_LESSONS } from "./curriculum";

export interface ProgressSummary {
  lessonsCompleted: number;
  totalLessons: number;
  activitiesCompleted: number;
  totalActivities: number;
  // Sum of each lesson's completion fraction (0..1), so a half-read lesson
  // counts as half — used for the lesson half of the overall percentage.
  lessonFractionSum: number;
}

// Overall progress is split evenly: half of the bar is lessons, half is
// activities. Finishing every lesson but no activities therefore reads 50%.
export const LESSON_WEIGHT = 50;
export const ACTIVITY_WEIGHT = 50;

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

export function isLessonComplete(p: LessonProgress | undefined | null) {
  const lesson = safeLesson(p);
  return lesson.total > 0 && lesson.completed >= lesson.total;
}

// 0..1 — how much of a single lesson's pages have been finished.
export function lessonFraction(p: LessonProgress | undefined | null) {
  const lesson = safeLesson(p);
  if (!(lesson.total > 0)) return 0;
  return Math.min(1, Math.max(0, lesson.completed / lesson.total));
}

export function summarizeProgress(
  learningProgress: Student["learningProgress"] | undefined
): ProgressSummary {
  const entries = Object.values(learningProgress ?? {});
  // A student whose record is missing some lessons still owes all of them,
  // so the denominator never drops below the curriculum length.
  const total = Math.max(entries.length, CURRICULUM_LESSONS.length);
  return {
    lessonsCompleted: entries.filter(isLessonComplete).length,
    totalLessons: total,
    activitiesCompleted: entries.filter((p) => safeActivity(p).activityCompleted).length,
    totalActivities: total,
    lessonFractionSum: entries.reduce((sum, p) => sum + lessonFraction(p), 0),
  };
}

// The lesson half of the bar, 0..LESSON_WEIGHT.
export function lessonPoints(summary: ProgressSummary): number {
  if (!summary.totalLessons) return 0;
  return (summary.lessonFractionSum / summary.totalLessons) * LESSON_WEIGHT;
}

// The activity half of the bar, 0..ACTIVITY_WEIGHT.
export function activityPoints(summary: ProgressSummary): number {
  if (!summary.totalActivities) return 0;
  return (summary.activitiesCompleted / summary.totalActivities) * ACTIVITY_WEIGHT;
}

export function progressPercent(summary: ProgressSummary): number {
  return Math.round(lessonPoints(summary) + activityPoints(summary));
}

export function studentProgressPercent(student: Student): number {
  return progressPercent(summarizeProgress(student.learningProgress));
}

export function studentProgressPoints(student: Student) {
  const summary = summarizeProgress(student.learningProgress);
  return {
    lesson: lessonPoints(summary),
    activity: activityPoints(summary),
    total: progressPercent(summary),
  };
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
