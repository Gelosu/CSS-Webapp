import {
  COLORS,
  classroomCompare,
  compositionBar,
  distributionChart,
  groupLessonStack,
  lessonVsActivity,
  statusDonut,
  studentBarCharts,
  studentLessonStack,
  studentVsPeers,
  type ChartImage,
} from "./charts";
import {
  COURSE_NAME,
  LESSON_STATE_LABEL,
  SCHOOL_NAME,
  comparisonFor,
  fmtDateTime,
  studentPageInsights,
  type LessonState,
  type ReportData,
  type StudentReport,
} from "./model";
import { ACTIVITY_WEIGHT, LESSON_WEIGHT } from "../progress";

// A format-neutral description of the document. The PDF and Word writers both
// walk this list, so the two files always carry the same content and design.

export interface Cell {
  text: string;
  fill?: string; // hex without #
  color?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  // PDF only: split progress bar (lesson + activity points, 0..100 track).
  bar?: { lesson: number; activity: number };
}

export interface Column {
  header: string;
  width: number; // relative
  align?: "left" | "center" | "right";
}

export type Block =
  | { t: "banner"; eyebrow: string; title: string; subtitle: string; meta: string[] }
  | { t: "heading"; text: string; level: 1 | 2 }
  | { t: "kpis"; items: { label: string; value: string; hint?: string; accent?: string }[] }
  | { t: "image"; image: ChartImage; maxWidthRatio?: number }
  | { t: "table"; columns: Column[]; rows: Cell[][]; compact?: boolean }
  | { t: "bullets"; items: string[] }
  | { t: "paragraph"; text: string; muted?: boolean }
  | { t: "legend"; items: { label: string; color: string }[] }
  | { t: "studentCard"; name: string; lines: string[]; overall: number; standing: string }
  | { t: "signatures"; labels: string[] }
  | { t: "pageBreak" };

export const STATE_FILL: Record<LessonState, string> = {
  completed: "BFE6CF",
  "activity-pending": "F7E3A1",
  "in-progress": "CFDEF7",
  "activity-only": "F9D9C2",
  "not-started": "ECEFF5",
};

export function toneFor(overall: number) {
  if (overall >= 100) return { fill: "BFE6CF", color: "14532D" };
  if (overall >= 75) return { fill: "D9F2E4", color: "14532D" };
  if (overall >= 50) return { fill: "DCE8FA", color: "1E3A8A" };
  if (overall > 0) return { fill: "FBEFC9", color: "7A5A05" };
  return { fill: "ECEFF5", color: "55617A" };
}

// lesson/activity are points on the 0..50 scale each, filling a 0..100 track.
function overallCell(overall: number, lesson: number, activity: number): Cell {
  const tone = toneFor(overall);
  return {
    text: `${overall}%`,
    fill: tone.fill,
    color: tone.color,
    bold: true,
    align: "center",
    bar: { lesson, activity },
  };
}

function studentSection(
  r: StudentReport,
  data: ReportData,
  opts: { standalone: boolean }
): Block[] {
  const blocks: Block[] = [];
  const comparison = opts.standalone ? data.comparison : comparisonFor(data);

  if (!opts.standalone) {
    blocks.push({
      t: "studentCard",
      name: r.name,
      lines: [`@${r.username || "—"} · ${r.email || "—"}`, `Classroom: ${r.classroomName}`],
      overall: r.overall,
      standing: r.standing,
    });
  }

  blocks.push({
    t: "kpis",
    items: [
      { label: "Overall progress", value: `${r.overall}%`, hint: r.standing, accent: COLORS.good },
      {
        label: "Lessons",
        value: `${r.lessonsDone}/${r.totalLessons}`,
        hint: `${r.lessonPoints} of ${LESSON_WEIGHT} pts`,
        accent: COLORS.lesson,
      },
      {
        label: "Activities",
        value: `${r.activitiesDone}/${r.totalLessons}`,
        hint: `${r.activityPoints} of ${ACTIVITY_WEIGHT} pts`,
        accent: COLORS.activity,
      },
      {
        label: "Avg activity score",
        value: r.avgScore === null ? "—" : String(r.avgScore),
        hint: r.avgScore === null ? "no activity yet" : `total ${r.totalScore}`,
        accent: COLORS.peer,
      },
    ],
  });

  blocks.push({ t: "image", image: compositionBar(r) });
  blocks.push({ t: "image", image: studentLessonStack(r.rows, r.name) });
  if (comparison && comparison.peers > 1) {
    blocks.push({
      t: "image",
      image: studentVsPeers(r.rows, comparison.lessons, r.name.split(" ")[0] || r.name, comparison.label),
    });
  } else {
    blocks.push({
      t: "image",
      image: lessonVsActivity(
        "Lesson vs activity completion",
        "Share of each lesson finished compared with whether its activity is done",
        r.rows.map((row) => ({ lessonPct: row.lessonPct, activityPct: row.activityDone ? 100 : 0 }))
      ),
    });
  }

  blocks.push({ t: "heading", text: "Lesson-by-lesson progress", level: 2 });
  blocks.push({
    t: "table",
    columns: [
      { header: "#", width: 5, align: "center" },
      { header: "Lesson", width: 34 },
      { header: "Pages", width: 11, align: "center" },
      { header: "Lesson", width: 10, align: "center" },
      { header: "Activity", width: 12, align: "center" },
      { header: "Score", width: 8, align: "center" },
      { header: "Progress", width: 12, align: "center" },
      { header: "Status", width: 18 },
    ],
    rows: r.rows.map((row) => [
      { text: `L${row.index + 1}`, align: "center", bold: true },
      { text: row.title },
      {
        text: row.pagesTotal ? `${row.pagesDone}/${row.pagesTotal}` : "—",
        align: "center",
      },
      { text: `${row.lessonPct}%`, align: "center" },
      {
        text: row.activityDone ? "Done" : "Pending",
        align: "center",
        bold: true,
        color: row.activityDone ? "14532D" : "7A5A05",
        fill: row.activityDone ? "D9F2E4" : "FBEFC9",
      },
      { text: row.activityDone ? String(row.score) : "—", align: "center" },
      overallCell(row.points, row.lessonPct / 2, row.activityDone ? ACTIVITY_WEIGHT : 0),
      { text: LESSON_STATE_LABEL[row.state], fill: STATE_FILL[row.state] },
    ]),
  });

  blocks.push({ t: "heading", text: "Summary & remarks", level: 2 });
  blocks.push({ t: "bullets", items: studentPageInsights(r, comparison) });
  return blocks;
}

const LEGEND_STATES: { label: string; state: LessonState }[] = [
  { label: "Lesson + activity done", state: "completed" },
  { label: "Lesson done, activity pending", state: "activity-pending" },
  { label: "In progress", state: "in-progress" },
  { label: "Activity only", state: "activity-only" },
  { label: "Not started", state: "not-started" },
];

export function buildBlocks(data: ReportData): Block[] {
  const meta = [
    `Generated ${fmtDateTime(data.generatedAt)}`,
    data.preparedBy ? `Prepared by ${data.preparedBy}` : "",
  ].filter(Boolean);

  const blocks: Block[] = [
    {
      t: "banner",
      eyebrow: `${SCHOOL_NAME} · ${COURSE_NAME}`,
      title: data.title,
      subtitle: data.subtitle,
      meta,
    },
  ];

  if (data.kind === "student") {
    const r = data.students[0];
    blocks.push({
      t: "studentCard",
      name: r.name,
      lines: [`@${r.username || "—"} · ${r.email || "—"}`, `Classroom: ${r.classroomName}`],
      overall: r.overall,
      standing: r.standing,
    });
    blocks.push(...studentSection(r, data, { standalone: true }));
    blocks.push({
      t: "signatures",
      labels: ["Prepared by", "Adviser / Teacher", "Date"],
    });
    return blocks;
  }

  const k = data.kpis;
  blocks.push({
    t: "kpis",
    items: [
      { label: "Students", value: String(k.students), accent: COLORS.lesson },
      { label: "Average progress", value: `${k.avgOverall}%`, accent: COLORS.good },
      { label: "Completed all", value: String(k.completed), hint: "100% progress", accent: COLORS.good },
      { label: "Not started", value: String(k.notStarted), accent: COLORS.bad },
    ],
  });
  blocks.push({
    t: "kpis",
    items: [
      { label: "Avg lesson %", value: `${k.avgLessonPct}%`, hint: `worth ${LESSON_WEIGHT}%`, accent: COLORS.lesson },
      { label: "Avg activity %", value: `${k.avgActivityPct}%`, hint: `worth ${ACTIVITY_WEIGHT}%`, accent: COLORS.activity },
      { label: "Lessons finished", value: String(k.lessonsDone), hint: "all students", accent: COLORS.lesson },
      { label: "Avg activity score", value: k.avgScore === null ? "—" : String(k.avgScore), accent: COLORS.peer },
    ],
  });

  blocks.push({ t: "heading", text: "Key findings", level: 1 });
  blocks.push({ t: "bullets", items: data.insights });

  if (data.students.length === 0) return blocks;

  const scopeNote = data.subtitle;
  blocks.push({ t: "heading", text: "Progress analysis", level: 1 });
  blocks.push({ t: "image", image: groupLessonStack(data.lessons, scopeNote) });
  blocks.push({
    t: "image",
    image: lessonVsActivity(
      "Lesson vs activity completion",
      "Average share of each lesson finished, next to the share of students who completed its activity",
      data.lessons
    ),
  });

  // How every (student × lesson) record is currently standing.
  const stateCounts = new Map<LessonState, number>();
  for (const s of data.students) for (const row of s.rows) stateCounts.set(row.state, (stateCounts.get(row.state) ?? 0) + 1);
  blocks.push({
    t: "image",
    image: statusDonut(
      [
        { label: "Lesson + activity done", value: stateCounts.get("completed") ?? 0, color: "#" + STATE_FILL.completed },
        { label: "Lesson done, activity pending", value: stateCounts.get("activity-pending") ?? 0, color: COLORS.activity },
        { label: "In progress", value: stateCounts.get("in-progress") ?? 0, color: COLORS.lessonSoft },
        { label: "Activity only", value: stateCounts.get("activity-only") ?? 0, color: "#F0A97A" },
        { label: "Not started", value: stateCounts.get("not-started") ?? 0, color: "#C9D1E0" },
      ],
      "Where every lesson record stands",
      `Each student has ${data.students[0].totalLessons} lesson records — ${data.students.length * data.students[0].totalLessons} in total here`
    ),
  });
  blocks.push({ t: "image", image: distributionChart(data.distribution, scopeNote) });
  if (data.kind === "all" && data.classrooms.length > 1) {
    blocks.push({ t: "image", image: classroomCompare(data.classrooms) });
  }

  blocks.push({ t: "heading", text: "Lesson analysis", level: 1 });
  blocks.push({
    t: "table",
    columns: [
      { header: "#", width: 5, align: "center" },
      { header: "Lesson", width: 38 },
      { header: "Lesson done", width: 12, align: "center" },
      { header: "Activity done", width: 12, align: "center" },
      { header: "Avg lesson %", width: 11, align: "center" },
      { header: "Avg score", width: 10, align: "center" },
      { header: "Avg progress", width: 12, align: "center" },
    ],
    rows: data.lessons.map((l) => [
      { text: `L${l.index + 1}`, align: "center", bold: true },
      { text: l.title },
      { text: `${l.lessonDone}/${l.total}`, align: "center" },
      { text: `${l.activityDone}/${l.total}`, align: "center" },
      { text: `${l.lessonPct}%`, align: "center" },
      { text: l.avgScore === null ? "—" : String(l.avgScore), align: "center" },
      overallCell(l.avgPoints, l.lessonPct / 2, l.activityPct / 2),
    ]),
  });

  blocks.push({ t: "heading", text: "Student ranking", level: 1 });
  const showRoom = data.kind === "all";
  blocks.push({
    t: "table",
    compact: true,
    columns: [
      { header: "#", width: 5, align: "center" },
      { header: "Student", width: showRoom ? 24 : 32 },
      ...(showRoom ? [{ header: "Classroom", width: 16 }] : []),
      { header: "Lessons", width: 10, align: "center" as const },
      { header: "Activities", width: 10, align: "center" as const },
      { header: "Avg score", width: 9, align: "center" as const },
      { header: "Overall", width: 11, align: "center" as const },
      { header: "Standing", width: 13 },
    ],
    rows: data.students.map((s, i) => [
      { text: String(i + 1), align: "center" },
      { text: s.name, bold: true },
      ...(showRoom ? [{ text: s.classroomName }] : []),
      { text: `${s.lessonsDone}/${s.totalLessons}`, align: "center" as const },
      { text: `${s.activitiesDone}/${s.totalLessons}`, align: "center" as const },
      { text: s.avgScore === null ? "—" : String(s.avgScore), align: "center" as const },
      overallCell(s.overall, s.lessonPoints, s.activityPoints),
      { text: s.standing },
    ]),
  });

  for (const image of studentBarCharts(data.students, scopeNote)) {
    blocks.push({ t: "image", image });
  }

  blocks.push({ t: "heading", text: "Lesson progress matrix", level: 1 });
  blocks.push({
    t: "paragraph",
    muted: true,
    text: "Each cell is that student's progress in the lesson (lesson 50% + activity 50%), coloured by status.",
  });
  blocks.push({
    t: "legend",
    items: LEGEND_STATES.map((l) => ({ label: l.label, color: "#" + STATE_FILL[l.state] })),
  });
  blocks.push({
    t: "table",
    compact: true,
    columns: [
      { header: "Student", width: 26 },
      ...data.lessons.map((l) => ({ header: `L${l.index + 1}`, width: 8, align: "center" as const })),
      { header: "Overall", width: 10, align: "center" as const },
    ],
    rows: data.students.map((s) => [
      { text: s.name, bold: true },
      ...s.rows.map((row) => ({
        text: `${row.points}%`,
        align: "center" as const,
        fill: STATE_FILL[row.state],
      })),
      overallCell(s.overall, s.lessonPoints, s.activityPoints),
    ]),
  });
  blocks.push({
    t: "paragraph",
    muted: true,
    text: data.lessons.map((l) => `L${l.index + 1} = ${l.title}`).join("   ·   "),
  });

  if (data.includeStudentPages) {
    for (const s of data.students) {
      blocks.push({ t: "pageBreak" });
      blocks.push({ t: "heading", text: "Individual report", level: 1 });
      blocks.push(...studentSection(s, data, { standalone: false }));
    }
  }

  blocks.push({
    t: "signatures",
    labels: ["Prepared by", "Adviser / Teacher", "Date"],
  });
  return blocks;
}
