import type { Worksheet, Workbook, Fill, Borders } from "exceljs";
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
import { STATE_FILL, toneFor } from "./layout";
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

const argb = (c: string) => `FF${c.replace("#", "").toUpperCase()}`;
const BLUE = argb(COLORS.lesson);
const GOLD = argb(COLORS.activity);
const INK = argb(COLORS.ink);
const MUTED = argb(COLORS.muted);
const GRID = argb(COLORS.grid);

const solid = (color: string): Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: color } });
const hair = { style: "thin" as const, color: { argb: GRID } };
const box: Partial<Borders> = { top: hair, bottom: hair, left: hair, right: hair };

// Column layout shared by the summary / student sheets (A..H).
const TABLE_COLS = [6, 40, 13, 13, 13, 11, 16, 30];
const COL_PX = TABLE_COLS.map((w) => Math.round(w * 7 + 5));
const SHEET_PX = COL_PX.reduce((a, b) => a + b, 0);
const ROW_PX = 20;

function setupColumns(ws: Worksheet) {
  ws.columns = TABLE_COLS.map((width) => ({ width }));
  ws.views = [{ showGridLines: false }];
}

function banner(ws: Worksheet, eyebrow: string, title: string, subtitle: string, meta: string) {
  const rows: [number, string, number, string, boolean, number][] = [
    [1, eyebrow.toUpperCase(), 10, "FFF0D48A", true, 22],
    [2, title, 22, "FFFFFFFF", true, 38],
    [3, subtitle, 12, "FFDBE6FB", false, 22],
    [4, meta, 9, "FFB9CDF3", false, 20],
  ];
  for (const [r, text, size, color, bold, height] of rows) {
    ws.mergeCells(r, 1, r, 8);
    const cell = ws.getCell(r, 1);
    cell.value = text;
    cell.font = { name: "Calibri", size, bold, color: { argb: color } };
    cell.alignment = { vertical: "middle", indent: 1 };
    for (let c = 1; c <= 8; c++) ws.getCell(r, c).fill = solid(BLUE);
    ws.getRow(r).height = height;
  }
  ws.getRow(5).height = 5;
  for (let c = 1; c <= 8; c++) ws.getCell(5, c).fill = solid(GOLD);
  ws.getRow(6).height = 10;
}

function sectionTitle(ws: Worksheet, row: number, text: string) {
  ws.mergeCells(row, 1, row, 8);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { name: "Calibri", size: 14, bold: true, color: { argb: INK } };
  cell.alignment = { vertical: "middle" };
  cell.border = { bottom: { style: "medium", color: { argb: GOLD } } };
  ws.getRow(row).height = 26;
}

// KPI tiles: 4 tiles across A..H (A:B, C:D, E:F, G:H), three rows tall.
function kpiRow(
  ws: Worksheet,
  row: number,
  items: { label: string; value: string | number; hint?: string; accent: string }[]
) {
  const spans: [number, number][] = [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
  ];
  items.slice(0, 4).forEach((item, i) => {
    const [c1, c2] = spans[i];
    const lines: [number, string | number, object][] = [
      [row, item.label.toUpperCase(), { name: "Calibri", size: 9, bold: true, color: { argb: MUTED } }],
      [row + 1, item.value, { name: "Calibri", size: 22, bold: true, color: { argb: INK } }],
      [row + 2, item.hint ?? "", { name: "Calibri", size: 9, color: { argb: MUTED } }],
    ];
    for (const [r, value, font] of lines) {
      ws.mergeCells(r, c1, r, c2);
      const cell = ws.getCell(r, c1);
      cell.value = value;
      cell.font = font;
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      for (let c = c1; c <= c2; c++) ws.getCell(r, c).fill = solid("FFF5F7FB");
      ws.getCell(r, c1).border = { left: { style: "thick", color: { argb: argb(item.accent) } } };
    }
    ws.getRow(row).height = 18;
    ws.getRow(row + 1).height = 34;
    ws.getRow(row + 2).height = 18;
  });
}

function addImage(wb: Workbook, ws: Worksheet, image: ChartImage, row: number, maxWidth = SHEET_PX - 10) {
  const w = Math.min(maxWidth, image.width);
  const h = Math.round((w * image.height) / image.width);
  const id = wb.addImage({ base64: image.dataUrl, extension: "png" });
  ws.addImage(id, { tl: { col: 0.05, row: row - 1 }, ext: { width: w, height: h } });
  return row + Math.ceil(h / ROW_PX) + 1; // next free row
}

function bullets(ws: Worksheet, row: number, items: string[]) {
  for (const item of items) {
    ws.mergeCells(row, 1, row, 8);
    const cell = ws.getCell(row, 1);
    cell.value = `•  ${item}`;
    cell.font = { name: "Calibri", size: 11, color: { argb: INK } };
    cell.alignment = { wrapText: true, vertical: "top", indent: 1 };
    ws.getRow(row).height = Math.max(20, Math.ceil(item.length / 120) * 17 + 4);
    row++;
  }
  return row + 1;
}

function headerRow(ws: Worksheet, row: number, headers: string[], startCol = 1) {
  headers.forEach((text, i) => {
    const cell = ws.getCell(row, startCol + i);
    cell.value = text;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = solid(BLUE);
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "center" : "center", wrapText: true };
    cell.border = box;
  });
  ws.getRow(row).height = 30;
}

function styleBody(cell: { font?: unknown; border?: unknown; alignment?: unknown; fill?: unknown }, o: { center?: boolean; bold?: boolean; fill?: string; color?: string; wrap?: boolean } = {}) {
  cell.font = { name: "Calibri", size: 10, bold: o.bold, color: { argb: o.color ?? INK } };
  cell.border = box;
  cell.alignment = { vertical: "middle", horizontal: o.center ? "center" : "left", wrapText: o.wrap };
  if (o.fill) cell.fill = solid(o.fill);
}

function overallStyle(overall: number) {
  const t = toneFor(overall);
  return { fill: argb(t.fill), color: argb(t.color) };
}

function dataBar(ws: Worksheet, ref: string, color = BLUE) {
  ws.addConditionalFormatting({
    ref,
    rules: [
      {
        type: "dataBar",
        priority: 1,
        gradient: false,
        minLength: 0,
        maxLength: 100,
        cfvo: [
          { type: "num", value: 0 },
          { type: "num", value: 100 },
        ],
        color: { argb: color },
      } as never,
    ],
  });
}

function lessonTable(ws: Worksheet, row: number, r: StudentReport) {
  headerRow(ws, row, ["#", "Lesson", "Pages read", "Lesson %", "Activity", "Score", "Progress %", "Status"]);
  const first = row + 1;
  r.rows.forEach((l, i) => {
    const rr = first + i;
    const values: (string | number)[] = [
      `L${l.index + 1}`,
      l.title,
      l.pagesTotal ? `${l.pagesDone}/${l.pagesTotal}` : "—",
      l.lessonPct / 100,
      l.activityDone ? "Done" : "Pending",
      l.activityDone ? l.score : "—",
      l.points / 100,
      LESSON_STATE_LABEL[l.state],
    ];
    values.forEach((v, ci) => {
      const cell = ws.getCell(rr, ci + 1);
      cell.value = v;
      styleBody(cell, { center: ci !== 1 && ci !== 7, bold: ci === 0 });
    });
    ws.getCell(rr, 4).numFmt = "0%";
    ws.getCell(rr, 7).numFmt = "0%";
    styleBody(ws.getCell(rr, 5), {
      center: true,
      bold: true,
      fill: l.activityDone ? "FFD9F2E4" : "FFFBEFC9",
      color: l.activityDone ? "FF14532D" : "FF7A5A05",
    });
    styleBody(ws.getCell(rr, 8), { fill: argb(STATE_FILL[l.state]) });
    ws.getRow(rr).height = 22;
  });
  const last = first + r.rows.length - 1;
  dataBar(ws, `G${first}:G${last}`);

  // Totals row with live formulas.
  const tr = last + 1;
  ws.getCell(tr, 2).value = "Overall";
  ws.getCell(tr, 4).value = { formula: `AVERAGE(D${first}:D${last})`, result: r.lessonPct / 100 };
  ws.getCell(tr, 5).value = { formula: `COUNTIF(E${first}:E${last},"Done")&"/"&ROWS(E${first}:E${last})`, result: `${r.activitiesDone}/${r.totalLessons}` };
  ws.getCell(tr, 6).value = r.avgScore === null ? "—" : { formula: `IFERROR(AVERAGE(F${first}:F${last}),"—")`, result: r.avgScore };
  ws.getCell(tr, 7).value = { formula: `AVERAGE(G${first}:G${last})`, result: r.overall / 100 };
  for (let c = 1; c <= 8; c++) styleBody(ws.getCell(tr, c), { center: c !== 2 && c !== 8, bold: true, fill: "FFEEF3FC" });
  ws.getCell(tr, 4).numFmt = "0%";
  ws.getCell(tr, 7).numFmt = "0%";
  ws.getCell(tr, 6).numFmt = "0.0";
  ws.getRow(tr).height = 24;
  return tr + 2;
}

function studentBlock(wb: Workbook, ws: Worksheet, startRow: number, r: StudentReport, data: ReportData, standalone: boolean) {
  let row = startRow;
  const comparison = standalone ? data.comparison : comparisonFor(data);

  // Student card
  ws.mergeCells(row, 1, row, 6);
  ws.getCell(row, 1).value = r.name;
  ws.getCell(row, 1).font = { name: "Calibri", size: 16, bold: true, color: { argb: INK } };
  ws.mergeCells(row + 1, 1, row + 1, 6);
  ws.getCell(row + 1, 1).value = `@${r.username || "—"}  ·  ${r.email || "—"}  ·  ${r.classroomName}`;
  ws.getCell(row + 1, 1).font = { name: "Calibri", size: 10, color: { argb: MUTED } };
  const tone = overallStyle(r.overall);
  ws.mergeCells(row, 7, row + 1, 8);
  ws.getCell(row, 7).value = `${r.overall}%  ·  ${r.standing.toUpperCase()}`;
  ws.getCell(row, 7).font = { name: "Calibri", size: 16, bold: true, color: { argb: tone.color } };
  ws.getCell(row, 7).alignment = { vertical: "middle", horizontal: "center" };
  for (let rr = row; rr <= row + 1; rr++) {
    for (let c = 1; c <= 8; c++) ws.getCell(rr, c).fill = solid(c >= 7 ? tone.fill : "FFEEF3FC");
    ws.getCell(rr, 1).alignment = { vertical: "middle", indent: 1 };
  }
  ws.getRow(row).height = 26;
  ws.getRow(row + 1).height = 20;
  row += 3;

  kpiRow(ws, row, [
    { label: "Overall progress", value: `${r.overall}%`, hint: r.standing, accent: COLORS.good },
    { label: "Lessons", value: `${r.lessonsDone}/${r.totalLessons}`, hint: `${r.lessonPoints} of ${LESSON_WEIGHT} pts`, accent: COLORS.lesson },
    { label: "Activities", value: `${r.activitiesDone}/${r.totalLessons}`, hint: `${r.activityPoints} of ${ACTIVITY_WEIGHT} pts`, accent: COLORS.activity },
    {
      label: "Avg activity score",
      value: r.avgScore === null ? "—" : r.avgScore,
      hint: r.avgScore === null ? "no activity yet" : `total ${r.totalScore}`,
      accent: COLORS.peer,
    },
  ]);
  row += 4;

  sectionTitle(ws, row, "Lesson-by-lesson progress");
  row = lessonTable(ws, row + 1, r) + 0;

  sectionTitle(ws, row, "Charts");
  row += 2;
  row = addImage(wb, ws, compositionBar(r), row);
  row = addImage(wb, ws, studentLessonStack(r.rows, r.name), row);
  if (comparison && comparison.peers > 1) {
    row = addImage(wb, ws, studentVsPeers(r.rows, comparison.lessons, r.name.split(" ")[0] || r.name, comparison.label), row);
  } else {
    row = addImage(
      wb,
      ws,
      lessonVsActivity(
        "Lesson vs activity completion",
        "Share of each lesson finished compared with whether its activity is done",
        r.rows.map((l) => ({ lessonPct: l.lessonPct, activityPct: l.activityDone ? 100 : 0 }))
      ),
      row
    );
  }

  sectionTitle(ws, row, "Summary & remarks");
  row = bullets(ws, row + 1, studentPageInsights(r, comparison));
  return row;
}

function sheetName(base: string, used: Set<string>) {
  const clean = base.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim() || "Student";
  let name = clean.slice(0, 28);
  let n = 2;
  while (used.has(name.toLowerCase())) name = `${clean.slice(0, 25)} ${n++}`;
  used.add(name.toLowerCase());
  return name;
}

function pageSetup(ws: Worksheet, landscape = false) {
  ws.pageSetup = {
    paperSize: 9,
    orientation: landscape ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  ws.headerFooter.oddFooter = `&L${SCHOOL_NAME} · ${COURSE_NAME}&RPage &P of &N`;
}

export async function buildXlsx(data: ReportData): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = data.preparedBy || SCHOOL_NAME;
  wb.created = data.generatedAt;
  wb.title = `${data.title} — ${data.subtitle}`;

  const meta = `Generated ${fmtDateTime(data.generatedAt)}${data.preparedBy ? `   ·   Prepared by ${data.preparedBy}` : ""}`;
  const eyebrow = `${SCHOOL_NAME} · ${COURSE_NAME}`;
  const used = new Set<string>();

  // ---------------------------------------------------------------- student
  if (data.kind === "student") {
    const ws = wb.addWorksheet(sheetName("Progress Report", used), { properties: { tabColor: { argb: BLUE } } });
    setupColumns(ws);
    banner(ws, eyebrow, data.title, data.subtitle, meta);
    studentBlock(wb, ws, 7, data.students[0], data, true);
    pageSetup(ws);
    return toBlob(wb);
  }

  // ------------------------------------------------------ classroom / school
  const k = data.kpis;
  const summary = wb.addWorksheet(sheetName("Summary", used), { properties: { tabColor: { argb: BLUE } } });
  setupColumns(summary);
  banner(summary, eyebrow, data.title, data.subtitle, meta);
  kpiRow(summary, 7, [
    { label: "Students", value: k.students, accent: COLORS.lesson },
    { label: "Average progress", value: `${k.avgOverall}%`, accent: COLORS.good },
    { label: "Completed all", value: k.completed, hint: "100% progress", accent: COLORS.good },
    { label: "Not started", value: k.notStarted, accent: COLORS.bad },
  ]);
  kpiRow(summary, 11, [
    { label: "Avg lesson %", value: `${k.avgLessonPct}%`, hint: `worth ${LESSON_WEIGHT}%`, accent: COLORS.lesson },
    { label: "Avg activity %", value: `${k.avgActivityPct}%`, hint: `worth ${ACTIVITY_WEIGHT}%`, accent: COLORS.activity },
    { label: "Lessons finished", value: k.lessonsDone, hint: "all students", accent: COLORS.lesson },
    { label: "Avg activity score", value: k.avgScore === null ? "—" : k.avgScore, accent: COLORS.peer },
  ]);
  let row = 15;
  sectionTitle(summary, row, "Key findings");
  row = bullets(summary, row + 1, data.insights);

  if (data.students.length) {
    sectionTitle(summary, row, "Progress analysis");
    row += 2;
    row = addImage(wb, summary, groupLessonStack(data.lessons, data.subtitle), row);
    row = addImage(
      wb,
      summary,
      lessonVsActivity(
        "Lesson vs activity completion",
        "Average share of each lesson finished, next to the share of students who completed its activity",
        data.lessons
      ),
      row
    );
    const counts = new Map<LessonState, number>();
    for (const s of data.students) for (const l of s.rows) counts.set(l.state, (counts.get(l.state) ?? 0) + 1);
    row = addImage(
      wb,
      summary,
      statusDonut(
        [
          { label: "Lesson + activity done", value: counts.get("completed") ?? 0, color: "#" + STATE_FILL.completed },
          { label: "Lesson done, activity pending", value: counts.get("activity-pending") ?? 0, color: COLORS.activity },
          { label: "In progress", value: counts.get("in-progress") ?? 0, color: COLORS.lessonSoft },
          { label: "Activity only", value: counts.get("activity-only") ?? 0, color: "#F0A97A" },
          { label: "Not started", value: counts.get("not-started") ?? 0, color: "#C9D1E0" },
        ],
        "Where every lesson record stands",
        `${data.students.length * data.students[0].totalLessons} lesson records in total`
      ),
      row
    );
    row = addImage(wb, summary, distributionChart(data.distribution, data.subtitle), row);
    if (data.kind === "all" && data.classrooms.length > 1) row = addImage(wb, summary, classroomCompare(data.classrooms), row);
    for (const image of studentBarCharts(data.students, data.subtitle)) row = addImage(wb, summary, image, row);
  }
  pageSetup(summary);

  if (!data.students.length) return toBlob(wb);

  // ---------------------------------------------------------------- Students
  const st = wb.addWorksheet(sheetName("Students", used), { properties: { tabColor: { argb: GOLD } } });
  const stHeaders = [
    "Rank", "Student", "Username", "Email", "Classroom", "Lessons done", "Lessons %", "Activities done", "Activities %",
    `Lesson pts (/${LESSON_WEIGHT})`, `Activity pts (/${ACTIVITY_WEIGHT})`, "Overall %", "Avg score", "Total score", "Standing",
  ];
  const stWidths = [7, 28, 18, 30, 20, 12, 11, 13, 12, 13, 14, 12, 10, 11, 14];
  st.columns = stWidths.map((width) => ({ width }));
  st.views = [{ state: "frozen", ySplit: 1, xSplit: 2, showGridLines: false }];
  headerRow(st, 1, stHeaders);
  data.students.forEach((s, i) => {
    const r = i + 2;
    const values: (string | number)[] = [
      i + 1, s.name, s.username, s.email, s.classroomName, `${s.lessonsDone}/${s.totalLessons}`, s.lessonPct / 100,
      `${s.activitiesDone}/${s.totalLessons}`, s.activityPct / 100, s.lessonPoints, s.activityPoints, s.overall / 100,
      s.avgScore ?? "—", s.totalScore, s.standing,
    ];
    values.forEach((v, ci) => {
      const cell = st.getCell(r, ci + 1);
      cell.value = v;
      styleBody(cell, { center: ![1, 2, 3, 4, 14].includes(ci), bold: ci === 1 });
    });
    for (const c of [7, 9, 12]) st.getCell(r, c).numFmt = "0%";
    for (const c of [10, 11]) st.getCell(r, c).numFmt = "0.0";
    const tone = overallStyle(s.overall);
    styleBody(st.getCell(r, 15), { fill: tone.fill, color: tone.color, bold: true });
    st.getRow(r).height = 22;
  });
  const lastRow = data.students.length + 1;
  const avgRow = lastRow + 1;
  st.getCell(avgRow, 2).value = "Average";
  const avgs: [number, number][] = [
    [7, k.avgLessonPct / 100], [9, k.avgActivityPct / 100],
    [10, Math.round(data.students.reduce((a, s) => a + s.lessonPoints, 0) / data.students.length * 10) / 10],
    [11, Math.round(data.students.reduce((a, s) => a + s.activityPoints, 0) / data.students.length * 10) / 10],
    [12, k.avgOverall / 100],
  ];
  for (const [c, result] of avgs) {
    const col = st.getColumn(c).letter;
    st.getCell(avgRow, c).value = { formula: `AVERAGE(${col}2:${col}${lastRow})`, result };
  }
  for (let c = 1; c <= stHeaders.length; c++) styleBody(st.getCell(avgRow, c), { center: c > 5, bold: true, fill: "FFEEF3FC" });
  for (const c of [7, 9, 12]) st.getCell(avgRow, c).numFmt = "0%";
  for (const c of [10, 11]) st.getCell(avgRow, c).numFmt = "0.0";
  st.getRow(avgRow).height = 24;
  st.autoFilter = { from: { row: 1, column: 1 }, to: { row: lastRow, column: stHeaders.length } };
  dataBar(st, `L2:L${lastRow}`, argb("#2f9e6a"));
  dataBar(st, `G2:G${lastRow}`, BLUE);
  dataBar(st, `I2:I${lastRow}`, GOLD);
  pageSetup(st, true);

  // ------------------------------------------------------------ Lesson matrix
  const mx = wb.addWorksheet(sheetName("Lesson Matrix", used), { properties: { tabColor: { argb: BLUE } } });
  mx.columns = [{ width: 30 }, { width: 20 }, ...data.lessons.map(() => ({ width: 11 })), { width: 12 }];
  mx.views = [{ state: "frozen", ySplit: 1, xSplit: 1, showGridLines: false }];
  headerRow(mx, 1, ["Student", "Classroom", ...data.lessons.map((l) => `L${l.index + 1}`), "Overall"]);
  data.students.forEach((s, i) => {
    const r = i + 2;
    mx.getCell(r, 1).value = s.name;
    styleBody(mx.getCell(r, 1), { bold: true });
    mx.getCell(r, 2).value = s.classroomName;
    styleBody(mx.getCell(r, 2));
    s.rows.forEach((l, li) => {
      const cell = mx.getCell(r, 3 + li);
      cell.value = l.points / 100;
      cell.numFmt = "0%";
      styleBody(cell, { center: true, fill: argb(STATE_FILL[l.state]) });
    });
    const oc = mx.getCell(r, 3 + data.lessons.length);
    oc.value = s.overall / 100;
    oc.numFmt = "0%";
    const tone = overallStyle(s.overall);
    styleBody(oc, { center: true, bold: true, fill: tone.fill, color: tone.color });
    mx.getRow(r).height = 20;
  });
  const legendRow = data.students.length + 3;
  mx.getCell(legendRow, 1).value = "Legend";
  mx.getCell(legendRow, 1).font = { name: "Calibri", size: 10, bold: true, color: { argb: INK } };
  (Object.keys(LESSON_STATE_LABEL) as LessonState[]).forEach((state, i) => {
    const cell = mx.getCell(legendRow + 1 + i, 1);
    cell.value = LESSON_STATE_LABEL[state];
    styleBody(cell, { fill: argb(STATE_FILL[state]) });
  });
  const keyRow = legendRow + 7;
  data.lessons.forEach((l, i) => {
    mx.getCell(keyRow + i, 1).value = `L${l.index + 1} = ${l.title}`;
    mx.getCell(keyRow + i, 1).font = { name: "Calibri", size: 10, color: { argb: MUTED } };
  });
  mx.autoFilter = { from: { row: 1, column: 1 }, to: { row: data.students.length + 1, column: 2 + data.lessons.length + 1 } };
  pageSetup(mx, true);

  // --------------------------------------------------------- Lesson analysis
  const la = wb.addWorksheet(sheetName("Lesson Analysis", used), { properties: { tabColor: { argb: GOLD } } });
  la.columns = [6, 42, 13, 14, 13, 12, 12, 13].map((width) => ({ width }));
  la.views = [{ state: "frozen", ySplit: 1, showGridLines: false }];
  headerRow(la, 1, ["#", "Lesson", "Lessons done", "Activities done", "Avg lesson %", "Activity %", "Avg score", "Avg progress"]);
  data.lessons.forEach((l, i) => {
    const r = i + 2;
    const values: (string | number)[] = [
      `L${l.index + 1}`, l.title, `${l.lessonDone}/${l.total}`, `${l.activityDone}/${l.total}`, l.lessonPct / 100,
      l.activityPct / 100, l.avgScore ?? "—", l.avgPoints / 100,
    ];
    values.forEach((v, ci) => {
      const cell = la.getCell(r, ci + 1);
      cell.value = v;
      styleBody(cell, { center: ci !== 1, bold: ci === 0 });
    });
    for (const c of [5, 6, 8]) la.getCell(r, c).numFmt = "0%";
    la.getRow(r).height = 22;
  });
  dataBar(la, `E2:E${data.lessons.length + 1}`, BLUE);
  dataBar(la, `F2:F${data.lessons.length + 1}`, GOLD);
  dataBar(la, `H2:H${data.lessons.length + 1}`, argb("#2f9e6a"));
  pageSetup(la, true);

  // ---------------------------------------------------------------- Details
  const dt = wb.addWorksheet(sheetName("All Records", used), { properties: { tabColor: { argb: GRID } } });
  dt.columns = [28, 20, 8, 40, 10, 10, 11, 12, 9, 12, 28].map((width) => ({ width }));
  dt.views = [{ state: "frozen", ySplit: 1, showGridLines: false }];
  headerRow(dt, 1, ["Student", "Classroom", "Lesson", "Lesson title", "Pages read", "Total pages", "Lesson %", "Activity", "Score", "Progress %", "Status"]);
  let dr = 2;
  for (const s of data.students) {
    for (const l of s.rows) {
      const values: (string | number)[] = [
        s.name, s.classroomName, `L${l.index + 1}`, l.title, l.pagesDone, l.pagesTotal, l.lessonPct / 100,
        l.activityDone ? "Done" : "Pending", l.activityDone ? l.score : "", l.points / 100, LESSON_STATE_LABEL[l.state],
      ];
      values.forEach((v, ci) => {
        const cell = dt.getCell(dr, ci + 1);
        cell.value = v;
        styleBody(cell, { center: ci >= 2 && ci !== 3 && ci !== 10 });
      });
      dt.getCell(dr, 7).numFmt = "0%";
      dt.getCell(dr, 10).numFmt = "0%";
      dt.getCell(dr, 11).fill = solid(argb(STATE_FILL[l.state]));
      dr++;
    }
  }
  dt.autoFilter = { from: { row: 1, column: 1 }, to: { row: dr - 1, column: 11 } };
  pageSetup(dt, true);

  // ----------------------------------------------------- individual sheets
  if (data.includeStudentPages) {
    for (const s of data.students) {
      const ws = wb.addWorksheet(sheetName(s.name, used), { properties: { tabColor: { argb: argb(COLORS.peer) } } });
      setupColumns(ws);
      banner(ws, eyebrow, "Individual Progress Report", `${s.name} · ${s.classroomName}`, meta);
      studentBlock(wb, ws, 7, s, data, false);
      pageSetup(ws);
    }
  }

  return toBlob(wb);
}

async function toBlob(wb: Workbook) {
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
