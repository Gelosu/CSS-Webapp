import type { Classroom, Student } from "@/types";
import { CURRICULUM_LESSONS } from "../curriculum";
import {
  ACTIVITY_WEIGHT,
  LESSON_WEIGHT,
  isLessonComplete,
  lessonFraction,
  safeActivity,
  safeLesson,
  studentProgressPoints,
  summarizeProgress,
} from "../progress";

export const SCHOOL_NAME = "JPRSHS";
export const COURSE_NAME = "Computer Systems Servicing";

export type ReportScope =
  | { type: "student"; studentId: string }
  | { type: "classroom"; classroomId: string }
  | { type: "all" };

export type LessonState =
  | "completed"
  | "activity-pending"
  | "in-progress"
  | "activity-only"
  | "not-started";

export const LESSON_STATE_LABEL: Record<LessonState, string> = {
  completed: "Completed",
  "activity-pending": "Lesson done, activity pending",
  "in-progress": "In progress",
  "activity-only": "Activity done, lesson pending",
  "not-started": "Not started",
};

export interface LessonRow {
  index: number;
  key: string;
  title: string;
  pagesDone: number;
  pagesTotal: number;
  lessonComplete: boolean;
  lessonPct: number; // 0..100, share of the lesson finished
  activityDone: boolean;
  score: number;
  points: number; // 0..100, lesson half + activity half
  state: LessonState;
}

export interface StudentReport {
  id: string;
  name: string;
  username: string;
  email: string;
  classroomName: string;
  rows: LessonRow[];
  overall: number; // 0..100
  lessonPoints: number; // 0..LESSON_WEIGHT
  activityPoints: number; // 0..ACTIVITY_WEIGHT
  lessonPct: number; // 0..100 across all lessons
  activityPct: number; // 0..100 across all lessons
  lessonsDone: number;
  activitiesDone: number;
  totalLessons: number;
  totalScore: number;
  avgScore: number | null; // mean over completed activities
  standing: string;
}

export interface LessonAggregate {
  index: number;
  title: string;
  total: number; // students counted
  lessonDone: number;
  activityDone: number;
  lessonPct: number; // avg pages finished, 0..100
  activityPct: number; // share of students with the activity done, 0..100
  avgPoints: number; // avg of per-student lesson points, 0..100
  avgScore: number | null;
}

export interface ClassroomAggregate {
  name: string;
  students: number;
  avg: number;
  lessonPct: number;
  activityPct: number;
}

export interface DistributionBucket {
  label: string;
  count: number;
}

export interface ReportKpis {
  students: number;
  avgOverall: number;
  avgLessonPct: number;
  avgActivityPct: number;
  completed: number;
  notStarted: number;
  lessonsDone: number;
  activitiesDone: number;
  avgScore: number | null;
}

export interface ReportData {
  kind: "student" | "classroom" | "all";
  title: string;
  subtitle: string;
  generatedAt: Date;
  preparedBy: string;
  fileName: string; // without extension
  students: StudentReport[];
  kpis: ReportKpis;
  lessons: LessonAggregate[];
  classrooms: ClassroomAggregate[]; // only meaningful for kind === "all"
  distribution: DistributionBucket[];
  insights: string[];
  // For a single-student report: the peer group the student is compared with.
  comparison: { label: string; peers: number; overall: number; lessons: LessonAggregate[] } | null;
  includeStudentPages: boolean;
}

export function standingFor(overall: number): string {
  if (overall >= 100) return "Completed";
  if (overall >= 75) return "Excellent";
  if (overall >= 50) return "Good";
  if (overall > 0) return "Developing";
  return "Not started";
}

function round(n: number, digits = 0) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function avg(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function lessonState(lessonDone: boolean, fraction: number, activityDone: boolean): LessonState {
  if (lessonDone && activityDone) return "completed";
  if (lessonDone) return "activity-pending";
  if (fraction > 0) return "in-progress";
  if (activityDone) return "activity-only";
  return "not-started";
}

export function buildStudentReport(student: Student, classroomName: string): StudentReport {
  const rows: LessonRow[] = CURRICULUM_LESSONS.map((title, index) => {
    const key = `lesson${index + 1}`;
    const p = student.learningProgress?.[key];
    const lesson = safeLesson(p);
    const activity = safeActivity(p);
    const fraction = lessonFraction(p);
    const done = isLessonComplete(p);
    return {
      index,
      key,
      title,
      pagesDone: lesson.completed,
      pagesTotal: lesson.total,
      lessonComplete: done,
      lessonPct: round(fraction * 100),
      activityDone: activity.activityCompleted,
      score: activity.score,
      points: round(fraction * LESSON_WEIGHT + (activity.activityCompleted ? ACTIVITY_WEIGHT : 0)),
      state: lessonState(done, fraction, activity.activityCompleted),
    };
  });

  const summary = summarizeProgress(student.learningProgress);
  const points = studentProgressPoints(student);
  const scored = rows.filter((r) => r.activityDone);
  const total = CURRICULUM_LESSONS.length;

  return {
    id: student.id,
    name: student.fullName || student.username || student.email,
    username: student.username,
    email: student.email,
    classroomName,
    rows,
    overall: points.total,
    lessonPoints: round(points.lesson, 1),
    activityPoints: round(points.activity, 1),
    lessonPct: round(avg(rows.map((r) => r.lessonPct))),
    activityPct: round((summary.activitiesCompleted / Math.max(total, 1)) * 100),
    lessonsDone: summary.lessonsCompleted,
    activitiesDone: summary.activitiesCompleted,
    totalLessons: total,
    totalScore: scored.reduce((s, r) => s + r.score, 0),
    avgScore: scored.length ? round(avg(scored.map((r) => r.score)), 1) : null,
    standing: standingFor(points.total),
  };
}

function aggregateLessons(reports: StudentReport[]): LessonAggregate[] {
  return CURRICULUM_LESSONS.map((title, index) => {
    const rows = reports.map((r) => r.rows[index]);
    const scored = rows.filter((r) => r.activityDone);
    return {
      index,
      title,
      total: rows.length,
      lessonDone: rows.filter((r) => r.lessonComplete).length,
      activityDone: scored.length,
      lessonPct: round(avg(rows.map((r) => r.lessonPct))),
      activityPct: rows.length ? round((scored.length / rows.length) * 100) : 0,
      avgPoints: round(avg(rows.map((r) => r.points))),
      avgScore: scored.length ? round(avg(scored.map((r) => r.score)), 1) : null,
    };
  });
}

const BUCKETS: { label: string; test: (n: number) => boolean }[] = [
  { label: "Not started", test: (n) => n <= 0 },
  { label: "1–25%", test: (n) => n > 0 && n <= 25 },
  { label: "26–50%", test: (n) => n > 25 && n <= 50 },
  { label: "51–75%", test: (n) => n > 50 && n <= 75 },
  { label: "76–99%", test: (n) => n > 75 && n < 100 },
  { label: "Completed", test: (n) => n >= 100 },
];

function buildKpis(reports: StudentReport[]): ReportKpis {
  const scored = reports.filter((r) => r.avgScore !== null);
  return {
    students: reports.length,
    avgOverall: round(avg(reports.map((r) => r.overall))),
    avgLessonPct: round(avg(reports.map((r) => r.lessonPct))),
    avgActivityPct: round(avg(reports.map((r) => r.activityPct))),
    completed: reports.filter((r) => r.overall >= 100).length,
    notStarted: reports.filter((r) => r.overall <= 0).length,
    lessonsDone: reports.reduce((s, r) => s + r.lessonsDone, 0),
    activitiesDone: reports.reduce((s, r) => s + r.activitiesDone, 0),
    avgScore: scored.length ? round(avg(scored.map((r) => r.avgScore as number)), 1) : null,
  };
}

function studentInsights(r: StudentReport, comparison: ReportData["comparison"]): string[] {
  const out: string[] = [];
  out.push(
    `${r.name} has reached ${r.overall}% overall progress (${r.lessonPoints} of ${LESSON_WEIGHT} points from lessons, ${r.activityPoints} of ${ACTIVITY_WEIGHT} from activities) — ${r.standing.toLowerCase()}.`
  );
  const pending = r.rows.filter((row) => row.state === "activity-pending");
  if (pending.length) {
    const gain = round((pending.length * ACTIVITY_WEIGHT) / r.totalLessons, 1);
    out.push(
      `${pending.length} lesson${pending.length > 1 ? "s are" : " is"} finished but the activity has not been completed: ${pending
        .map((p) => `L${p.index + 1}`)
        .join(", ")}. Completing ${pending.length > 1 ? "them" : "it"} would add ${gain} points.`
    );
  }
  const started = r.rows.filter((row) => row.points > 0);
  if (started.length) {
    const best = [...started].sort((a, b) => b.points - a.points)[0];
    out.push(`Strongest lesson: L${best.index + 1} ${best.title} (${best.points}%).`);
  }
  const inProgress = r.rows.filter((row) => row.state === "in-progress");
  if (inProgress.length) {
    out.push(
      `Currently in progress: ${inProgress.map((p) => `L${p.index + 1} (${p.lessonPct}%)`).join(", ")}.`
    );
  }
  const untouched = r.rows.filter((row) => row.state === "not-started");
  if (untouched.length && untouched.length < r.totalLessons) {
    out.push(`Not started yet: ${untouched.map((p) => `L${p.index + 1}`).join(", ")}.`);
  }
  if (r.avgScore !== null) {
    out.push(`Average activity score: ${r.avgScore} across ${r.activitiesDone} completed activit${r.activitiesDone === 1 ? "y" : "ies"}.`);
  }
  if (comparison && comparison.peers > 1) {
    const diff = r.overall - comparison.overall;
    out.push(
      diff === 0
        ? `Progress is in line with the ${comparison.label} average (${comparison.overall}%).`
        : `Progress is ${Math.abs(diff)} point${Math.abs(diff) === 1 ? "" : "s"} ${diff > 0 ? "above" : "below"} the ${comparison.label} average (${comparison.overall}%).`
    );
  }
  if (r.overall === 0) out.push("No lessons or activities have been recorded yet.");
  return out;
}

function groupInsights(
  reports: StudentReport[],
  kpis: ReportKpis,
  lessons: LessonAggregate[]
): string[] {
  if (!reports.length) return ["No students are enrolled in this scope yet."];
  const out: string[] = [];
  out.push(
    `${kpis.students} student${kpis.students === 1 ? "" : "s"} · average overall progress ${kpis.avgOverall}% (lessons ${kpis.avgLessonPct}%, activities ${kpis.avgActivityPct}%).`
  );
  const ranked = [...reports].sort((a, b) => b.overall - a.overall);
  out.push(`Top performer: ${ranked[0].name} (${ranked[0].overall}%).`);
  const lowestActivity = [...lessons].sort((a, b) => a.activityPct - b.activityPct)[0];
  out.push(
    `Lowest activity completion: L${lowestActivity.index + 1} ${lowestActivity.title} (${lowestActivity.activityPct}% of students).`
  );
  const best = [...lessons].sort((a, b) => b.avgPoints - a.avgPoints)[0];
  out.push(`Strongest lesson overall: L${best.index + 1} ${best.title} (${best.avgPoints}% average).`);
  const gap = kpis.avgLessonPct - kpis.avgActivityPct;
  if (gap >= 15) {
    out.push(
      `Students are finishing lessons ${gap} points more often than activities — activities are where progress is stalling.`
    );
  }
  if (kpis.notStarted) {
    out.push(`${kpis.notStarted} student${kpis.notStarted === 1 ? " has" : "s have"} not started.`);
  }
  if (kpis.completed) {
    out.push(`${kpis.completed} student${kpis.completed === 1 ? " has" : "s have"} completed everything.`);
  }
  return out;
}

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "report"
  );
}

function dateStamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface BuildReportInput {
  scope: ReportScope;
  // Every student the current user is allowed to see (already role-scoped).
  students: Student[];
  classrooms: Classroom[];
  preparedBy: string;
  includeStudentPages?: boolean;
}

export function buildReport(input: BuildReportInput): ReportData | null {
  const { scope, students, classrooms, preparedBy } = input;
  const generatedAt = new Date();
  const classroomName = (code: string | null) =>
    classrooms.find((c) => c.id === code)?.name ?? "Unassigned";
  const toReport = (s: Student) => buildStudentReport(s, classroomName(s.classCode));

  if (scope.type === "student") {
    const student = students.find((s) => s.id === scope.studentId);
    if (!student) return null;
    const report = toReport(student);
    const peers = student.classCode
      ? students.filter((s) => s.classCode === student.classCode).map(toReport)
      : [];
    const comparison: ReportData["comparison"] =
      peers.length > 1
        ? {
            label: "classroom",
            peers: peers.length,
            overall: round(avg(peers.map((p) => p.overall))),
            lessons: aggregateLessons(peers),
          }
        : null;
    const lessons = aggregateLessons([report]);
    return {
      kind: "student",
      title: "Student Progress Report",
      subtitle: `${report.name} · ${report.classroomName}`,
      generatedAt,
      preparedBy,
      fileName: `progress-${slug(report.name)}-${dateStamp(generatedAt)}`,
      students: [report],
      kpis: buildKpis([report]),
      lessons,
      classrooms: [],
      distribution: [],
      insights: studentInsights(report, comparison),
      comparison,
      includeStudentPages: false,
    };
  }

  const inScope =
    scope.type === "classroom" ? students.filter((s) => s.classCode === scope.classroomId) : students;
  const reports = inScope.map(toReport).sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
  const kpis = buildKpis(reports);
  const lessons = aggregateLessons(reports);
  const scopeName =
    scope.type === "classroom" ? classroomName(scope.classroomId) : "All Classrooms";

  const byRoom = new Map<string, StudentReport[]>();
  for (const r of reports) {
    const list = byRoom.get(r.classroomName) ?? [];
    list.push(r);
    byRoom.set(r.classroomName, list);
  }
  const classroomAgg: ClassroomAggregate[] = [...byRoom.entries()]
    .map(([name, list]) => ({
      name,
      students: list.length,
      avg: round(avg(list.map((r) => r.overall))),
      lessonPct: round(avg(list.map((r) => r.lessonPct))),
      activityPct: round(avg(list.map((r) => r.activityPct))),
    }))
    .sort((a, b) => b.avg - a.avg);

  return {
    kind: scope.type === "classroom" ? "classroom" : "all",
    title: scope.type === "classroom" ? "Classroom Progress Report" : "School-wide Progress Report",
    subtitle: `${scopeName} · ${reports.length} student${reports.length === 1 ? "" : "s"}`,
    generatedAt,
    preparedBy,
    fileName: `progress-${slug(scopeName)}-${dateStamp(generatedAt)}`,
    students: reports,
    kpis,
    lessons,
    classrooms: classroomAgg,
    distribution: BUCKETS.map((b) => ({
      label: b.label,
      count: reports.filter((r) => b.test(r.overall)).length,
    })),
    insights: groupInsights(reports, kpis, lessons),
    comparison: null,
    includeStudentPages: input.includeStudentPages ?? false,
  };
}

// The same student report but compared against the group the class report
// covers — used for the per-student pages inside a class report.
export function comparisonFor(data: ReportData): ReportData["comparison"] {
  if (data.students.length < 2) return null;
  return {
    label: data.kind === "classroom" ? "classroom" : "school-wide",
    peers: data.students.length,
    overall: data.kpis.avgOverall,
    lessons: data.lessons,
  };
}

export function studentPageInsights(r: StudentReport, comparison: ReportData["comparison"]) {
  return studentInsights(r, comparison);
}

export function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function fmtDateTime(d: Date) {
  return `${fmtDate(d)}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
