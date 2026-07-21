import type { LessonProgress, Student } from "@/types";
import { CURRICULUM_LESSONS } from "./curriculum";
import { safeActivity, safeLesson, studentProgressPercent } from "./progress";

export interface LessonStat {
  key: string;
  title: string;
  lessonCompletedCount: number;
  activityCompletedCount: number;
  total: number;
}

export function computeLessonStats(students: Student[]): LessonStat[] {
  return CURRICULUM_LESSONS.map((title, index) => {
    const key = `lesson${index + 1}`;
    let lessonCompletedCount = 0;
    let activityCompletedCount = 0;
    for (const s of students) {
      const p = s.learningProgress?.[key];
      if (!p) continue;
      const lesson = safeLesson(p);
      const activity = safeActivity(p);
      if (lesson.total > 0 && lesson.completed >= lesson.total) lessonCompletedCount++;
      if (activity.activityCompleted) activityCompletedCount++;
    }
    return { key, title, lessonCompletedCount, activityCompletedCount, total: students.length };
  });
}

export type LessonEngagement = "not-started" | "in-progress" | "completed";

export function lessonEngagement(progress: LessonProgress | undefined): LessonEngagement {
  const lesson = safeLesson(progress);
  if (lesson.total > 0 && lesson.completed >= lesson.total) return "completed";
  if (lesson.completed > 0) return "in-progress";
  return "not-started";
}

export const LESSON_ENGAGEMENT_LABEL: Record<LessonEngagement, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  completed: "Completed",
};

export type OverallStatus = "all" | "completed" | "in-progress" | "not-started";
export type LessonStatus =
  | "all"
  | "lesson-complete"
  | "lesson-incomplete"
  | "activity-complete"
  | "activity-incomplete";

export function filterByOverallStatus(students: Student[], status: OverallStatus): Student[] {
  if (status === "all") return students;
  return students.filter((s) => {
    const percent = studentProgressPercent(s);
    if (status === "completed") return percent >= 100;
    if (status === "not-started") return percent <= 0;
    return percent > 0 && percent < 100;
  });
}

export function filterByLessonStatus(
  students: Student[],
  lessonKey: string,
  status: LessonStatus
): Student[] {
  if (status === "all") return students;
  return students.filter((s) => {
    const p = s.learningProgress?.[lessonKey];
    if (!p) return false;
    const lesson = safeLesson(p);
    const activity = safeActivity(p);
    switch (status) {
      case "lesson-complete":
        return lesson.total > 0 && lesson.completed >= lesson.total;
      case "lesson-incomplete":
        return !(lesson.total > 0 && lesson.completed >= lesson.total);
      case "activity-complete":
        return activity.activityCompleted;
      case "activity-incomplete":
        return !activity.activityCompleted;
      default:
        return true;
    }
  });
}
