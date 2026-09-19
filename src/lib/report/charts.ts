import { ACTIVITY_WEIGHT, LESSON_WEIGHT } from "../progress";
import type {
  ClassroomAggregate,
  DistributionBucket,
  LessonAggregate,
  LessonRow,
  StudentReport,
} from "./model";
import { CURRICULUM_LESSONS } from "../curriculum";

// Charts are drawn straight onto a canvas and exported as PNG so exactly the
// same picture can be embedded in the PDF, the Word file and the Excel file.
// Browser-only (uses document.createElement("canvas")).

export interface ChartImage {
  png: Uint8Array;
  dataUrl: string;
  width: number; // logical px (aspect ratio is what matters for embedding)
  height: number;
}

export const COLORS = {
  lesson: "#1e4fa8",
  lessonSoft: "#8fb0e8",
  activity: "#d9a21b",
  activitySoft: "#f0d48a",
  good: "#2f9e6a",
  bad: "#d9534f",
  ink: "#1c2740",
  muted: "#66728c",
  grid: "#e2e7f0",
  track: "#eef1f7",
  peer: "#8a94a8",
};

const FONT = "Helvetica, Arial, sans-serif";
const SCALE = 2;

interface Surface {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  finish: () => ChartImage;
}

function surface(w: number, h: number): Surface {
  const canvas = document.createElement("canvas");
  canvas.width = w * SCALE;
  canvas.height = h * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "alphabetic";
  return {
    ctx,
    w,
    h,
    finish() {
      const dataUrl = canvas.toDataURL("image/png");
      const bin = atob(dataUrl.split(",")[1]);
      const png = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) png[i] = bin.charCodeAt(i);
      return { png, dataUrl, width: w, height: h };
    },
  };
}

function font(ctx: CanvasRenderingContext2D, size: number, weight: "normal" | "bold" = "normal") {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  corners: { tl?: boolean; tr?: boolean; bl?: boolean; br?: boolean } = { tl: true, tr: true, bl: true, br: true }
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + (corners.tl ? rr : 0), y);
  ctx.lineTo(x + w - (corners.tr ? rr : 0), y);
  if (corners.tr) ctx.arcTo(x + w, y, x + w, y + rr, rr);
  else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - (corners.br ? rr : 0));
  if (corners.br) ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + (corners.bl ? rr : 0), y + h);
  if (corners.bl) ctx.arcTo(x, y + h, x, y + h - rr, rr);
  else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + (corners.tl ? rr : 0));
  if (corners.tl) ctx.arcTo(x, y, x + rr, y, rr);
  else ctx.lineTo(x, y);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

interface Series {
  name: string;
  color: string;
  values: number[];
}

function drawLegend(ctx: CanvasRenderingContext2D, series: { name: string; color: string }[], rightX: number, y: number) {
  font(ctx, 13);
  let x = rightX;
  for (const s of [...series].reverse()) {
    const tw = ctx.measureText(s.name).width;
    x -= tw;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = "left";
    ctx.fillText(s.name, x, y);
    x -= 18;
    ctx.fillStyle = s.color;
    roundRect(ctx, x, y - 11, 12, 12, 3);
    ctx.fill();
    x -= 22;
  }
}

function drawHeader(ctx: CanvasRenderingContext2D, title: string, subtitle?: string) {
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.ink;
  font(ctx, 18, "bold");
  ctx.fillText(title, 24, 34);
  if (subtitle) {
    ctx.fillStyle = COLORS.muted;
    font(ctx, 13);
    ctx.fillText(subtitle, 24, 54);
  }
}

// ---------------------------------------------------------------------------
// Vertical grouped / stacked bars, one group per lesson.
// ---------------------------------------------------------------------------

interface VerticalBarOptions {
  title: string;
  subtitle?: string;
  categories: string[];
  series: Series[];
  stacked?: boolean;
  max?: number;
  unit?: string;
  width?: number;
  height?: number;
  totalLabels?: boolean;
}

function verticalBars(opts: VerticalBarOptions): ChartImage {
  const { title, subtitle, categories, series, stacked = false, max = 100, unit = "%" } = opts;
  const w = opts.width ?? 1000;
  const h = opts.height ?? 420;
  const s = surface(w, h);
  const { ctx } = s;

  drawHeader(ctx, title, subtitle);
  drawLegend(ctx, series, w - 24, 34);

  const left = 56;
  const right = 24;
  const top = subtitle ? 78 : 64;
  const bottom = 78;
  const plotW = w - left - right;
  const plotH = h - top - bottom;

  // grid + y axis
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  font(ctx, 12);
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = "right";
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    const y = top + plotH - (v / max) * plotH;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + plotW, y);
    ctx.stroke();
    ctx.fillText(`${Math.round(v)}${unit}`, left - 8, y + 4);
  }

  const slot = plotW / categories.length;
  const groupW = Math.min(slot * 0.72, 120);
  const barW = stacked ? Math.min(groupW * 0.7, 56) : groupW / series.length;

  categories.forEach((cat, ci) => {
    const cx = left + slot * ci + slot / 2;
    if (stacked) {
      let acc = 0;
      const x = cx - barW / 2;
      series.forEach((sr, si) => {
        const v = Math.max(0, sr.values[ci] ?? 0);
        if (v <= 0) return;
        const y0 = top + plotH - ((acc + v) / max) * plotH;
        const bh = (v / max) * plotH;
        const isTop = si === series.length - 1 || series.slice(si + 1).every((o) => !(o.values[ci] > 0));
        ctx.fillStyle = sr.color;
        roundRect(ctx, x, y0, barW, bh, 5, { tl: isTop, tr: isTop });
        ctx.fill();
        acc += v;
      });
      if (opts.totalLabels !== false && acc > 0) {
        ctx.fillStyle = COLORS.ink;
        font(ctx, 13, "bold");
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(acc)}${unit}`, cx, top + plotH - (acc / max) * plotH - 7);
      }
    } else {
      const startX = cx - (barW * series.length) / 2;
      series.forEach((sr, si) => {
        const v = Math.max(0, sr.values[ci] ?? 0);
        const bh = (Math.min(v, max) / max) * plotH;
        const x = startX + barW * si + 2;
        ctx.fillStyle = sr.color;
        if (bh > 0) {
          roundRect(ctx, x, top + plotH - bh, barW - 4, bh, 4, { tl: true, tr: true });
          ctx.fill();
        }
        ctx.fillStyle = COLORS.ink;
        font(ctx, 12, "bold");
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(v)}${unit === "%" ? "" : unit}`, x + (barW - 4) / 2, top + plotH - bh - 6);
      });
    }

    // category label: "L1" + wrapped title
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.ink;
    font(ctx, 13, "bold");
    ctx.fillText(cat.split("|")[0], cx, top + plotH + 20);
    const detail = cat.split("|")[1];
    if (detail) {
      ctx.fillStyle = COLORS.muted;
      font(ctx, 11);
      wrap(ctx, detail, slot - 10, 3).forEach((line, li) => ctx.fillText(line, cx, top + plotH + 36 + li * 13));
    }
  });

  // baseline
  ctx.strokeStyle = COLORS.muted;
  ctx.beginPath();
  ctx.moveTo(left, top + plotH);
  ctx.lineTo(left + plotW, top + plotH);
  ctx.stroke();

  return s.finish();
}

const lessonCategories = () => CURRICULUM_LESSONS.map((t, i) => `L${i + 1}|${t}`);

// Per-lesson: lesson half + activity half stacked — the "before activity" and
// "after activity" view of one student's progress.
export function studentLessonStack(rows: LessonRow[], studentName: string): ChartImage {
  const perLesson = (r: LessonRow) => (r.lessonPct / 100) * LESSON_WEIGHT;
  return verticalBars({
    title: "Progress per lesson — lesson (50%) + activity (50%)",
    subtitle: `${studentName} · the blue part is progress before the activity, gold is what the activity adds`,
    categories: lessonCategories(),
    stacked: true,
    max: 100,
    series: [
      { name: "Lesson progress", color: COLORS.lesson, values: rows.map(perLesson) },
      { name: "Activity completed", color: COLORS.activity, values: rows.map((r) => (r.activityDone ? ACTIVITY_WEIGHT : 0)) },
    ],
  });
}

// Student vs the classroom (or school) average, per lesson.
export function studentVsPeers(
  rows: LessonRow[],
  peers: LessonAggregate[],
  studentName: string,
  peerLabel: string
): ChartImage {
  return verticalBars({
    title: `${studentName} vs ${peerLabel} average`,
    subtitle: "Combined lesson + activity progress per lesson (0–100%)",
    categories: lessonCategories(),
    max: 100,
    series: [
      { name: studentName, color: COLORS.lesson, values: rows.map((r) => r.points) },
      { name: `${peerLabel[0].toUpperCase()}${peerLabel.slice(1)} average`, color: COLORS.peer, values: peers.map((p) => p.avgPoints) },
    ],
  });
}

// Lesson completion vs activity completion, per lesson (for one student it is
// the share of the lesson read vs 0/100 for the activity).
export function lessonVsActivity(
  title: string,
  subtitle: string,
  lessons: { lessonPct: number; activityPct: number }[]
): ChartImage {
  return verticalBars({
    title,
    subtitle,
    categories: lessonCategories(),
    max: 100,
    series: [
      { name: "Lesson completion", color: COLORS.lesson, values: lessons.map((l) => l.lessonPct) },
      { name: "Activity completion", color: COLORS.activity, values: lessons.map((l) => l.activityPct) },
    ],
  });
}

export function groupLessonStack(lessons: LessonAggregate[], subtitle: string): ChartImage {
  return verticalBars({
    title: "Average progress per lesson — before vs after activities",
    subtitle,
    categories: lessonCategories(),
    stacked: true,
    max: 100,
    series: [
      { name: "Lessons (50%)", color: COLORS.lesson, values: lessons.map((l) => (l.lessonPct / 100) * LESSON_WEIGHT) },
      { name: "Activities (50%)", color: COLORS.activity, values: lessons.map((l) => (l.activityPct / 100) * ACTIVITY_WEIGHT) },
    ],
  });
}

export function distributionChart(buckets: DistributionBucket[], subtitle: string): ChartImage {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const ramp = ["#c9d1e0", "#f0b8a0", "#f0d48a", "#b6d7a8", "#6fbf8a", "#2f9e6a"];
  const s = surface(1000, 340);
  const { ctx } = s;
  drawHeader(ctx, "How students are distributed", subtitle);

  const left = 56;
  const right = 24;
  const top = 78;
  const bottom = 52;
  const plotW = 1000 - left - right;
  const plotH = 340 - top - bottom;
  ctx.strokeStyle = COLORS.grid;
  font(ctx, 12);
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const v = (niceMax / 4) * i;
    const y = top + plotH - (v / niceMax) * plotH;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + plotW, y);
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), left - 8, y + 4);
  }
  const slot = plotW / buckets.length;
  buckets.forEach((b, i) => {
    const bw = Math.min(slot * 0.6, 90);
    const x = left + slot * i + (slot - bw) / 2;
    const bh = (b.count / niceMax) * plotH;
    ctx.fillStyle = ramp[i % ramp.length];
    if (bh > 0) {
      roundRect(ctx, x, top + plotH - bh, bw, bh, 5, { tl: true, tr: true });
      ctx.fill();
    }
    ctx.fillStyle = COLORS.ink;
    font(ctx, 14, "bold");
    ctx.textAlign = "center";
    ctx.fillText(String(b.count), x + bw / 2, top + plotH - bh - 7);
    font(ctx, 12);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(b.label, x + bw / 2, top + plotH + 22);
  });
  return s.finish();
}

// ---------------------------------------------------------------------------
// Horizontal bars.
// ---------------------------------------------------------------------------

// One bar per student split into its lesson half (blue) and activity half
// (gold) on a 0–100 track. Returns several images so long rosters can flow
// across pages instead of producing one giant picture.
export function studentBarCharts(students: StudentReport[], subtitle: string, perChart = 18): ChartImage[] {
  const out: ChartImage[] = [];
  for (let start = 0; start < students.length; start += perChart) {
    const slice = students.slice(start, start + perChart);
    const rowH = 30;
    const top = 84;
    const h = top + slice.length * rowH + 22;
    const w = 1000;
    const s = surface(w, h);
    const { ctx } = s;
    drawHeader(
      ctx,
      start === 0 ? "Overall progress by student" : "Overall progress by student (continued)",
      subtitle
    );
    drawLegend(
      ctx,
      [
        { name: "Lessons (max 50)", color: COLORS.lesson },
        { name: "Activities (max 50)", color: COLORS.activity },
      ],
      w - 24,
      34
    );
    const nameW = 220;
    const barX = 24 + nameW;
    const barW = w - barX - 70;

    // vertical guides at 25/50/75/100
    ctx.strokeStyle = COLORS.grid;
    font(ctx, 11);
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = "center";
    [0, 25, 50, 75, 100].forEach((v) => {
      const x = barX + (v / 100) * barW;
      ctx.beginPath();
      ctx.moveTo(x, top - 8);
      ctx.lineTo(x, top + slice.length * rowH - 6);
      ctx.stroke();
      ctx.fillText(`${v}%`, x, top - 14);
    });

    slice.forEach((st, i) => {
      const y = top + i * rowH;
      ctx.textAlign = "left";
      ctx.fillStyle = COLORS.ink;
      font(ctx, 13);
      ctx.fillText(truncate(ctx, `${start + i + 1}. ${st.name}`, nameW - 12), 24, y + 14);

      ctx.fillStyle = COLORS.track;
      roundRect(ctx, barX, y, barW, 18, 9);
      ctx.fill();
      const lw = (st.lessonPoints / 100) * barW;
      const aw = (st.activityPoints / 100) * barW;
      if (lw > 0) {
        ctx.fillStyle = COLORS.lesson;
        roundRect(ctx, barX, y, lw, 18, 9, { tl: true, bl: true, tr: aw <= 0, br: aw <= 0 });
        ctx.fill();
      }
      if (aw > 0) {
        ctx.fillStyle = COLORS.activity;
        roundRect(ctx, barX + lw, y, aw, 18, 9, { tl: lw <= 0, bl: lw <= 0, tr: true, br: true });
        ctx.fill();
      }
      ctx.fillStyle = COLORS.ink;
      font(ctx, 13, "bold");
      ctx.textAlign = "left";
      ctx.fillText(`${st.overall}%`, barX + barW + 10, y + 14);
    });
    out.push(s.finish());
  }
  return out;
}

export function classroomCompare(classrooms: ClassroomAggregate[]): ChartImage {
  const rows = classrooms.slice(0, 12);
  const rowH = 44;
  const top = 84;
  const w = 1000;
  const h = top + rows.length * rowH + 16;
  const s = surface(w, h);
  const { ctx } = s;
  drawHeader(ctx, "Classroom comparison", "Average progress per classroom");
  drawLegend(
    ctx,
    [
      { name: "Lessons", color: COLORS.lesson },
      { name: "Activities", color: COLORS.activity },
      { name: "Overall", color: COLORS.good },
    ],
    w - 24,
    34
  );
  const nameW = 200;
  const barX = 24 + nameW;
  const barW = w - barX - 70;
  rows.forEach((c, i) => {
    const y = top + i * rowH;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.ink;
    font(ctx, 13, "bold");
    ctx.fillText(truncate(ctx, c.name, nameW - 12), 24, y + 14);
    font(ctx, 11);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`${c.students} student${c.students === 1 ? "" : "s"}`, 24, y + 29);
    ([
      [c.lessonPct, COLORS.lesson, 0],
      [c.activityPct, COLORS.activity, 1],
      [c.avg, COLORS.good, 2],
    ] as const).forEach(([v, color, k]) => {
      const by = y + k * 12;
      ctx.fillStyle = COLORS.track;
      roundRect(ctx, barX, by, barW, 9, 4);
      ctx.fill();
      if (v > 0) {
        ctx.fillStyle = color;
        roundRect(ctx, barX, by, (v / 100) * barW, 9, 4);
        ctx.fill();
      }
      ctx.fillStyle = COLORS.ink;
      font(ctx, 11, "bold");
      ctx.fillText(`${Math.round(v)}%`, barX + barW + 10, by + 9);
    });
  });
  return s.finish();
}

// ---------------------------------------------------------------------------
// Single-student summary strip + donut.
// ---------------------------------------------------------------------------

// The 50/50 bar: left half lessons, right half activities.
export function compositionBar(student: StudentReport): ChartImage {
  const w = 1000;
  const h = 170;
  const s = surface(w, h);
  const { ctx } = s;
  drawHeader(ctx, "Overall progress", `${LESSON_WEIGHT}% of the score comes from lessons and ${ACTIVITY_WEIGHT}% from activities`);
  const x = 24;
  const y = 84;
  const bw = w - 48;
  const bh = 34;
  ctx.fillStyle = COLORS.track;
  roundRect(ctx, x, y, bw, bh, 17);
  ctx.fill();
  const lw = (student.lessonPoints / 100) * bw;
  const aw = (student.activityPoints / 100) * bw;
  if (lw > 0) {
    ctx.fillStyle = COLORS.lesson;
    roundRect(ctx, x, y, lw, bh, 17, { tl: true, bl: true, tr: aw <= 0, br: aw <= 0 });
    ctx.fill();
  }
  if (aw > 0) {
    ctx.fillStyle = COLORS.activity;
    roundRect(ctx, x + bw / 2, y, aw, bh, 17, { tl: false, bl: false, tr: true, br: true });
    ctx.fill();
  }
  // halfway divider
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + bw / 2, y - 4);
  ctx.lineTo(x + bw / 2, y + bh + 4);
  ctx.stroke();
  ctx.lineWidth = 1;

  font(ctx, 12);
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = "left";
  ctx.fillText("0%", x, y + bh + 20);
  ctx.textAlign = "center";
  ctx.fillText("50% · lessons finished, no activities", x + bw / 2, y + bh + 20);
  ctx.textAlign = "right";
  ctx.fillText("100%", x + bw, y + bh + 20);

  ctx.textAlign = "left";
  font(ctx, 13, "bold");
  ctx.fillStyle = COLORS.lesson;
  ctx.fillText(`Lessons ${student.lessonPoints} / ${LESSON_WEIGHT}`, x, y - 12);
  ctx.textAlign = "right";
  ctx.fillStyle = "#a87b0c";
  ctx.fillText(`Activities ${student.activityPoints} / ${ACTIVITY_WEIGHT}`, x + bw, y - 12);
  return s.finish();
}

// Donut of every (student × lesson) cell by state.
export function statusDonut(
  counts: { label: string; value: number; color: string }[],
  title: string,
  subtitle: string
): ChartImage {
  const w = 1000;
  const h = 300;
  const s = surface(w, h);
  const { ctx } = s;
  drawHeader(ctx, title, subtitle);
  const sum = counts.reduce((a, c) => a + c.value, 0);
  const total = sum || 1;
  const cx = 210;
  const cy = 176;
  const r = 90;
  let angle = -Math.PI / 2;
  counts.forEach((c) => {
    if (c.value <= 0) return;
    const sweep = (c.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = c.color;
    ctx.fill();
    angle += sweep;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = "center";
  font(ctx, 26, "bold");
  ctx.fillText(String(sum), cx, cy + 4);
  font(ctx, 12);
  ctx.fillStyle = COLORS.muted;
  ctx.fillText("lesson records", cx, cy + 22);

  counts.forEach((c, i) => {
    const y = 100 + i * 34;
    ctx.fillStyle = c.color;
    roundRect(ctx, 400, y - 12, 16, 16, 4);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.ink;
    font(ctx, 15);
    ctx.fillText(c.label, 426, y);
    font(ctx, 15, "bold");
    ctx.textAlign = "right";
    ctx.fillText(`${c.value}`, 800, y);
    font(ctx, 13);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`${Math.round((c.value / total) * 100)}%`, 860, y);
  });
  return s.finish();
}
