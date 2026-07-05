import type { LessonProgress, Student } from "@/types";
import { CURRICULUM_LESSONS } from "./curriculum";

export interface ProgressSummary {
  lessonsCompleted: number;
  totalLessons: number;
  activitiesCompleted: number;
  totalActivities: number;
}

function isLessonComplete(p: LessonProgress) {
  return p.lesson.total > 0 && p.lesson.completed >= p.lesson.total;
}

export function summarizeProgress(
  learningProgress: Student["learningProgress"] | undefined
): ProgressSummary {
  const entries = Object.values(learningProgress ?? {});
  return {
    lessonsCompleted: entries.filter(isLessonComplete).length,
    totalLessons: entries.length,
    activitiesCompleted: entries.filter((p) => p.activity.activityCompleted).length,
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
  return entries.map(([key, p], index) => ({
    key,
    title: CURRICULUM_LESSONS[index] ?? `Lesson ${index + 1}`,
    lessonCompleted: p.lesson.completed,
    lessonTotal: p.lesson.total,
    activityCompleted: p.activity.activityCompleted,
    score: p.activity.score,
  }));
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
