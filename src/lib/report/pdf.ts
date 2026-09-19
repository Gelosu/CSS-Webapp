import type { jsPDF as JsPDF } from "jspdf";
import type { Block, Cell } from "./layout";
import { toneFor } from "./layout";
import { COLORS } from "./charts";
import { COURSE_NAME, SCHOOL_NAME, type ReportData } from "./model";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP_PAGE = 18; // start of content on continuation pages
const BOTTOM = PAGE_H - 16;

const BLUE = COLORS.lesson;
const GOLD = COLORS.activity;

const withHash = (c: string) => (c.startsWith("#") ? c : `#${c}`);

export async function buildPdf(data: ReportData, blocks: Block[]): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({
    title: `${data.title} — ${data.subtitle}`,
    subject: `${SCHOOL_NAME} ${COURSE_NAME} progress`,
    author: data.preparedBy || SCHOOL_NAME,
  });

  let y = TOP_PAGE;

  const newPage = () => {
    doc.addPage();
    y = TOP_PAGE;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };

  // jsPDF's per-call `charSpace` option sticks to every later text call, so
  // letter-spacing is applied and reset explicitly around the one draw.
  const spaced = (space: number, draw: () => void) => {
    doc.setCharSpace(space);
    draw();
    doc.setCharSpace(0);
  };

  const setText = (color: string, size: number, style: "normal" | "bold" = "normal") => {
    doc.setTextColor(withHash(color));
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
  };

  for (const block of blocks) {
    switch (block.t) {
      case "banner": {
        const h = 46;
        doc.setFillColor(BLUE);
        doc.rect(0, 0, PAGE_W, h, "F");
        doc.setFillColor(GOLD);
        doc.rect(0, h, PAGE_W, 2.2, "F");
        // decorative circles
        doc.setFillColor("#2a5db8");
        doc.circle(PAGE_W - 18, 8, 26, "F");
        doc.setFillColor("#1a449a");
        doc.circle(PAGE_W - 4, 40, 18, "F");

        setText("#f0d48a", 8.5, "bold");
        spaced(0.4, () => doc.text(block.eyebrow.toUpperCase(), MARGIN, 14));
        setText("#ffffff", 23, "bold");
        doc.text(block.title, MARGIN, 26);
        setText("#dbe6fb", 12);
        doc.text(doc.splitTextToSize(block.subtitle, CONTENT_W - 30)[0], MARGIN, 34);
        setText("#b9cdf3", 8.5);
        doc.text(block.meta.join("   ·   "), MARGIN, 41.5);
        y = h + 10;
        break;
      }

      case "heading": {
        ensure(block.level === 1 ? 24 : 18);
        if (block.level === 1) {
          y += 3;
          doc.setFillColor(GOLD);
          doc.roundedRect(MARGIN, y - 4.6, 1.6, 6.4, 0.8, 0.8, "F");
          setText(COLORS.ink, 14, "bold");
          doc.text(block.text, MARGIN + 4, y);
          doc.setDrawColor(COLORS.grid);
          doc.setLineWidth(0.3);
          doc.line(MARGIN, y + 2.6, PAGE_W - MARGIN, y + 2.6);
          y += 8;
        } else {
          setText(BLUE, 11, "bold");
          doc.text(block.text, MARGIN, y);
          y += 5;
        }
        break;
      }

      case "kpis": {
        const n = block.items.length;
        const gap = 4;
        const w = (CONTENT_W - gap * (n - 1)) / n;
        const h = 22;
        ensure(h + 4);
        block.items.forEach((item, i) => {
          const x = MARGIN + i * (w + gap);
          doc.setFillColor("#f5f7fb");
          doc.setDrawColor(COLORS.grid);
          doc.setLineWidth(0.25);
          doc.roundedRect(x, y, w, h, 2.2, 2.2, "FD");
          doc.setFillColor(item.accent ?? BLUE);
          doc.roundedRect(x, y, 1.8, h, 0.9, 0.9, "F");
          setText(COLORS.muted, 7.5);
          spaced(0.2, () => doc.text(item.label.toUpperCase(), x + 5, y + 6));
          setText(COLORS.ink, 17, "bold");
          doc.text(item.value, x + 5, y + 14.5);
          if (item.hint) {
            setText(COLORS.muted, 7.5);
            doc.text(doc.splitTextToSize(item.hint, w - 8)[0], x + 5, y + 19.2);
          }
        });
        y += h + 5;
        break;
      }

      case "image": {
        const ratio = block.image.height / block.image.width;
        const w = CONTENT_W * (block.maxWidthRatio ?? 1);
        const h = w * ratio;
        ensure(h + 3);
        doc.addImage(block.image.dataUrl, "PNG", MARGIN + (CONTENT_W - w) / 2, y, w, h, undefined, "FAST");
        doc.setDrawColor(COLORS.grid);
        doc.setLineWidth(0.2);
        doc.roundedRect(MARGIN + (CONTENT_W - w) / 2, y, w, h, 1.5, 1.5, "S");
        y += h + 5;
        break;
      }

      case "table": {
        const totalW = block.columns.reduce((s, c) => s + c.width, 0);
        const columnStyles: Record<number, { cellWidth: number; halign: "left" | "center" | "right" }> = {};
        block.columns.forEach((c, i) => {
          columnStyles[i] = { cellWidth: (c.width / totalW) * CONTENT_W, halign: c.align ?? "left" };
        });
        const bars = new Map<string, NonNullable<Cell["bar"]>>();
        const body = block.rows.map((row, ri) =>
          row.map((cell, ci) => {
            if (cell.bar) bars.set(`${ri}:${ci}`, cell.bar);
            return {
              content: cell.text,
              styles: {
                ...(cell.fill ? { fillColor: withHash(cell.fill) } : {}),
                ...(cell.color ? { textColor: withHash(cell.color) } : {}),
                ...(cell.bold ? { fontStyle: "bold" as const } : {}),
                ...(cell.align ? { halign: cell.align } : {}),
                ...(cell.bar ? { valign: "top" as const } : {}),
              },
            };
          })
        );
        ensure(24);
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN, top: TOP_PAGE, bottom: 16 },
          tableWidth: CONTENT_W,
          head: [block.columns.map((c) => ({ content: c.header, styles: { halign: c.align ?? "left" } }))],
          body,
          columnStyles,
          theme: "grid",
          showHead: "everyPage",
          rowPageBreak: "avoid",
          styles: {
            font: "helvetica",
            fontSize: block.compact ? 8 : 8.5,
            cellPadding: block.compact ? { top: 1.9, bottom: 3.2, left: 2, right: 2 } : { top: 2.4, bottom: 3.8, left: 2.2, right: 2.2 },
            lineColor: withHash(COLORS.grid),
            lineWidth: 0.2,
            textColor: withHash(COLORS.ink),
            valign: "middle",
          },
          headStyles: {
            fillColor: BLUE,
            textColor: "#ffffff",
            fontStyle: "bold",
            fontSize: block.compact ? 8 : 8.5,
            lineColor: BLUE,
            cellPadding: { top: 2.4, bottom: 2.4, left: 2.2, right: 2.2 },
          },
          alternateRowStyles: { fillColor: "#f8f9fc" },
          didDrawCell: (hook) => {
            if (hook.section !== "body") return;
            const bar = bars.get(`${hook.row.index}:${hook.column.index}`);
            if (!bar) return;
            const bx = hook.cell.x + 2;
            const bw = hook.cell.width - 4;
            const by = hook.cell.y + hook.cell.height - 2.3;
            doc.setFillColor("#ffffff");
            doc.roundedRect(bx, by, bw, 1.3, 0.65, 0.65, "F");
            const lw = (Math.max(0, Math.min(50, bar.lesson)) / 100) * bw;
            const aw = (Math.max(0, Math.min(50, bar.activity)) / 100) * bw;
            if (lw > 0) {
              doc.setFillColor(BLUE);
              doc.roundedRect(bx, by, lw, 1.3, 0.65, 0.65, "F");
            }
            if (aw > 0) {
              doc.setFillColor(GOLD);
              doc.roundedRect(bx + lw, by, aw, 1.3, 0.65, 0.65, "F");
            }
          },
        });
        const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
        y = (last?.finalY ?? y) + 6;
        break;
      }

      case "bullets": {
        setText(COLORS.ink, 9.5);
        for (const item of block.items) {
          const lines = doc.splitTextToSize(item, CONTENT_W - 8) as string[];
          ensure(lines.length * 4.7 + 2);
          doc.setFillColor(GOLD);
          doc.circle(MARGIN + 2, y - 1.1, 0.9, "F");
          setText(COLORS.ink, 9.5);
          doc.text(lines, MARGIN + 6, y);
          y += lines.length * 4.7 + 1.8;
        }
        y += 2;
        break;
      }

      case "paragraph": {
        setText(block.muted ? COLORS.muted : COLORS.ink, 8.5);
        const lines = doc.splitTextToSize(block.text, CONTENT_W) as string[];
        ensure(lines.length * 4 + 2);
        doc.text(lines, MARGIN, y);
        y += lines.length * 4 + 2;
        break;
      }

      case "legend": {
        ensure(8);
        let x = MARGIN;
        setText(COLORS.muted, 8);
        for (const item of block.items) {
          const tw = doc.getTextWidth(item.label);
          if (x + tw + 12 > PAGE_W - MARGIN) {
            x = MARGIN;
            y += 5.5;
            ensure(6);
          }
          doc.setFillColor(item.color);
          doc.setDrawColor(COLORS.grid);
          doc.roundedRect(x, y - 3, 4, 4, 0.8, 0.8, "FD");
          setText(COLORS.muted, 8);
          doc.text(item.label, x + 5.5, y);
          x += tw + 12;
        }
        y += 6;
        break;
      }

      case "studentCard": {
        const h = 26;
        ensure(h + 4);
        const tone = toneFor(block.overall);
        doc.setFillColor("#eef3fc");
        doc.setDrawColor("#d3def4");
        doc.setLineWidth(0.25);
        doc.roundedRect(MARGIN, y, CONTENT_W, h, 3, 3, "FD");
        // avatar disc with initials
        doc.setFillColor(BLUE);
        doc.circle(MARGIN + 12, y + h / 2, 7.5, "F");
        setText("#ffffff", 11, "bold");
        const initials = block.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("");
        doc.text(initials, MARGIN + 12, y + h / 2 + 1.6, { align: "center" });
        setText(COLORS.ink, 14, "bold");
        doc.text(doc.splitTextToSize(block.name, 100)[0], MARGIN + 23, y + 9.5);
        setText(COLORS.muted, 8.8);
        block.lines.forEach((line, i) => doc.text(doc.splitTextToSize(line, 110)[0], MARGIN + 23, y + 15.2 + i * 4.6));
        // overall pill on the right
        const pw = 34;
        const px = PAGE_W - MARGIN - pw - 5;
        doc.setFillColor(withHash(tone.fill));
        doc.roundedRect(px, y + 4.5, pw, h - 9, 3, 3, "F");
        setText(withHash(tone.color), 16, "bold");
        doc.text(`${block.overall}%`, px + pw / 2, y + 13.2, { align: "center" });
        setText(withHash(tone.color), 7.5, "bold");
        spaced(0.2, () => doc.text(block.standing.toUpperCase(), px + pw / 2, y + 18.3, { align: "center" }));
        y += h + 6;
        break;
      }

      case "signatures": {
        ensure(34);
        y += 12;
        const n = block.labels.length;
        const gap = 10;
        const w = (CONTENT_W - gap * (n - 1)) / n;
        block.labels.forEach((label, i) => {
          const x = MARGIN + i * (w + gap);
          doc.setDrawColor(COLORS.muted);
          doc.setLineWidth(0.3);
          doc.line(x, y, x + w, y);
          setText(COLORS.muted, 8);
          doc.text(label, x, y + 4.5);
        });
        y += 10;
        break;
      }

      case "pageBreak":
        newPage();
        break;
    }
  }

  // Footer / running header on every page (needs the final page count).
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (p > 1) {
      doc.setFillColor(BLUE);
      doc.rect(0, 0, PAGE_W, 8, "F");
      doc.setFillColor(GOLD);
      doc.rect(0, 8, PAGE_W, 0.8, "F");
      setText("#ffffff", 7.5, "bold");
      doc.text(`${SCHOOL_NAME} · ${COURSE_NAME}`, MARGIN, 5.3);
      setText("#dbe6fb", 7.5);
      doc.text(data.title, PAGE_W - MARGIN, 5.3, { align: "right" });
    }
    doc.setDrawColor(COLORS.grid);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, PAGE_H - 11, PAGE_W - MARGIN, PAGE_H - 11);
    setText(COLORS.muted, 7.5);
    doc.text(data.subtitle, MARGIN, PAGE_H - 6.5);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 6.5, { align: "right" });
  }

  return doc.output("blob");
}
