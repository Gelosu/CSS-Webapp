import type { Block, Cell } from "./layout";
import { toneFor } from "./layout";
import { COLORS } from "./charts";
import { COURSE_NAME, SCHOOL_NAME, type ReportData } from "./model";

// A4 with 15mm side margins → 10206 twips of usable width, ≈ 680px.
const CONTENT_TWIPS = 10206;
const IMAGE_MAX_PX = 672;

const hex = (c: string) => c.replace("#", "").toUpperCase();
const BLUE = hex(COLORS.lesson);
const GOLD = hex(COLORS.activity);
const INK = hex(COLORS.ink);
const MUTED = hex(COLORS.muted);
const GRID = hex(COLORS.grid);

export async function buildDocx(data: ReportData, blocks: Block[]): Promise<Blob> {
  const docx = await import("docx");
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    ImageRun,
    Packer,
    PageBreak,
    PageNumber,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
  } = docx;

  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
  const noBorders = { top: none, bottom: none, left: none, right: none } as const;
  const hairline = { style: BorderStyle.SINGLE, size: 4, color: GRID } as const;
  const allHairline = { top: hairline, bottom: hairline, left: hairline, right: hairline } as const;

  const align = (a?: "left" | "center" | "right") =>
    a === "center" ? AlignmentType.CENTER : a === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT;

  const run = (text: string, o: { size?: number; bold?: boolean; color?: string; caps?: boolean } = {}) =>
    new TextRun({ text, size: o.size ?? 20, bold: o.bold, color: o.color ?? INK, allCaps: o.caps });

  const spacer = (after = 120) => new Paragraph({ spacing: { after }, children: [] });

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  for (const block of blocks) {
    switch (block.t) {
      case "banner": {
        children.push(
          new Table({
            width: { size: CONTENT_TWIPS, type: WidthType.DXA },
            columnWidths: [CONTENT_TWIPS],
            layout: TableLayoutType.FIXED,
            borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: CONTENT_TWIPS, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: BLUE, color: "auto" },
                    margins: { top: 260, bottom: 260, left: 320, right: 320 },
                    borders: { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 36, color: GOLD } },
                    children: [
                      new Paragraph({
                        spacing: { after: 60 },
                        children: [run(block.eyebrow, { size: 17, bold: true, color: "F0D48A", caps: true })],
                      }),
                      new Paragraph({
                        spacing: { after: 40 },
                        children: [run(block.title, { size: 46, bold: true, color: "FFFFFF" })],
                      }),
                      new Paragraph({
                        spacing: { after: 80 },
                        children: [run(block.subtitle, { size: 24, color: "DBE6FB" })],
                      }),
                      new Paragraph({
                        children: [run(block.meta.join("   ·   "), { size: 17, color: "B9CDF3" })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          spacer(200)
        );
        break;
      }

      case "heading": {
        children.push(
          new Paragraph({
            keepNext: true,
            spacing: { before: block.level === 1 ? 280 : 200, after: 120 },
            border:
              block.level === 1
                ? {
                    left: { style: BorderStyle.SINGLE, size: 24, color: GOLD, space: 8 },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: GRID, space: 4 },
                  }
                : undefined,
            children: [
              run(block.text, {
                size: block.level === 1 ? 28 : 23,
                bold: true,
                color: block.level === 1 ? INK : BLUE,
              }),
            ],
          })
        );
        break;
      }

      case "kpis": {
        const n = block.items.length;
        const gap = 120;
        const cellW = Math.floor((CONTENT_TWIPS - gap * (n - 1)) / n);
        const cells: InstanceType<typeof TableCell>[] = [];
        block.items.forEach((item, i) => {
          if (i > 0) {
            cells.push(
              new TableCell({
                width: { size: gap, type: WidthType.DXA },
                borders: noBorders,
                children: [new Paragraph({ children: [] })],
              })
            );
          }
          cells.push(
            new TableCell({
              width: { size: cellW, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: "F5F7FB", color: "auto" },
              margins: { top: 100, bottom: 100, left: 180, right: 120 },
              borders: {
                top: hairline,
                bottom: hairline,
                right: hairline,
                left: { style: BorderStyle.SINGLE, size: 24, color: hex(item.accent ?? COLORS.lesson) },
              },
              children: [
                new Paragraph({ children: [run(item.label, { size: 15, color: MUTED, caps: true })] }),
                new Paragraph({ children: [run(item.value, { size: 36, bold: true })] }),
                new Paragraph({ children: [run(item.hint ?? " ", { size: 15, color: MUTED })] }),
              ],
            })
          );
        });
        children.push(
          new Table({
            width: { size: CONTENT_TWIPS, type: WidthType.DXA },
            columnWidths: block.items.flatMap((_, i) => (i > 0 ? [gap, cellW] : [cellW])),
            layout: TableLayoutType.FIXED,
            borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
            rows: [new TableRow({ cantSplit: true, children: cells })],
          }),
          spacer(160)
        );
        break;
      }

      case "image": {
        const w = Math.round(IMAGE_MAX_PX * (block.maxWidthRatio ?? 1));
        const h = Math.round((w * block.image.height) / block.image.width);
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            keepNext: false,
            children: [
              new ImageRun({
                type: "png",
                data: block.image.png,
                transformation: { width: w, height: h },
                altText: { title: "Chart", description: "Progress chart", name: "chart" },
              }),
            ],
          })
        );
        break;
      }

      case "table": {
        const totalW = block.columns.reduce((s, c) => s + c.width, 0);
        const widths = block.columns.map((c) => Math.floor((c.width / totalW) * CONTENT_TWIPS));
        const size = block.compact ? 17 : 18;
        const pad = block.compact ? 50 : 70;

        const cellFor = (cell: Cell, i: number, alt: boolean) =>
          new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: pad, bottom: pad, left: 90, right: 90 },
            borders: allHairline,
            shading: {
              type: ShadingType.CLEAR,
              color: "auto",
              fill: cell.fill ? hex(cell.fill) : alt ? "F8F9FC" : "FFFFFF",
            },
            children: [
              new Paragraph({
                alignment: align(cell.align ?? block.columns[i].align),
                children: [run(cell.text, { size, bold: cell.bold, color: cell.color ? hex(cell.color) : INK })],
              }),
            ],
          });

        const head = new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: block.columns.map(
            (c, i) =>
              new TableCell({
                width: { size: widths[i], type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 80, bottom: 80, left: 90, right: 90 },
                shading: { type: ShadingType.CLEAR, color: "auto", fill: BLUE },
                borders: { top: none, bottom: none, left: none, right: none },
                children: [
                  new Paragraph({
                    alignment: align(c.align),
                    children: [run(c.header, { size, bold: true, color: "FFFFFF" })],
                  }),
                ],
              })
          ),
        });

        children.push(
          new Table({
            width: { size: CONTENT_TWIPS, type: WidthType.DXA },
            columnWidths: widths,
            layout: TableLayoutType.FIXED,
            rows: [
              head,
              ...block.rows.map(
                (row, ri) =>
                  new TableRow({ cantSplit: true, children: row.map((cell, ci) => cellFor(cell, ci, ri % 2 === 1)) })
              ),
            ],
          }),
          spacer(160)
        );
        break;
      }

      case "bullets": {
        for (const item of block.items) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 70 },
              children: [run(item, { size: 20 })],
            })
          );
        }
        children.push(spacer(80));
        break;
      }

      case "paragraph": {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [run(block.text, { size: 17, color: block.muted ? MUTED : INK })],
          })
        );
        break;
      }

      case "legend": {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: block.items.flatMap((item) => [
              new TextRun({ text: "■ ", size: 22, color: hex(item.color) }),
              run(`${item.label}     `, { size: 16, color: MUTED }),
            ]),
          })
        );
        break;
      }

      case "studentCard": {
        const tone = toneFor(block.overall);
        const left = CONTENT_TWIPS - 2400;
        children.push(
          new Table({
            width: { size: CONTENT_TWIPS, type: WidthType.DXA },
            columnWidths: [left, 2400],
            layout: TableLayoutType.FIXED,
            borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
            rows: [
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({
                    width: { size: left, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, color: "auto", fill: "EEF3FC" },
                    margins: { top: 160, bottom: 160, left: 240, right: 120 },
                    verticalAlign: VerticalAlign.CENTER,
                    borders: { ...noBorders, left: { style: BorderStyle.SINGLE, size: 36, color: BLUE } },
                    children: [
                      new Paragraph({ spacing: { after: 40 }, children: [run(block.name, { size: 30, bold: true })] }),
                      ...block.lines.map((l) => new Paragraph({ children: [run(l, { size: 18, color: MUTED })] })),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2400, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, color: "auto", fill: tone.fill },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: { top: 120, bottom: 120, left: 120, right: 120 },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [run(`${block.overall}%`, { size: 44, bold: true, color: tone.color })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [run(block.standing, { size: 15, bold: true, color: tone.color, caps: true })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          spacer(160)
        );
        break;
      }

      case "signatures": {
        const n = block.labels.length;
        const gap = 400;
        const cellW = Math.floor((CONTENT_TWIPS - gap * (n - 1)) / n);
        const cells: InstanceType<typeof TableCell>[] = [];
        block.labels.forEach((label, i) => {
          if (i > 0) {
            cells.push(
              new TableCell({
                width: { size: gap, type: WidthType.DXA },
                borders: noBorders,
                children: [new Paragraph({ children: [] })],
              })
            );
          }
          cells.push(
            new TableCell({
              width: { size: cellW, type: WidthType.DXA },
              margins: { top: 60, bottom: 0, left: 0, right: 0 },
              borders: { ...noBorders, top: { style: BorderStyle.SINGLE, size: 6, color: MUTED } },
              children: [new Paragraph({ children: [run(label, { size: 16, color: MUTED })] })],
            })
          );
        });
        children.push(
          spacer(500),
          new Table({
            width: { size: CONTENT_TWIPS, type: WidthType.DXA },
            columnWidths: block.labels.flatMap((_, i) => (i > 0 ? [gap, cellW] : [cellW])),
            layout: TableLayoutType.FIXED,
            borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
            rows: [new TableRow({ cantSplit: true, children: cells })],
          })
        );
        break;
      }

      case "pageBreak":
        children.push(new Paragraph({ children: [new PageBreak()] }));
        break;
    }
  }

  const header = new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: "right", position: CONTENT_TWIPS }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 4 } },
        children: [
          run(`${SCHOOL_NAME} · ${COURSE_NAME}`, { size: 16, bold: true, color: BLUE }),
          new TextRun({ text: `\t${data.title}`, size: 16, color: MUTED }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: "right", position: CONTENT_TWIPS }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: GRID, space: 4 } },
        children: [
          run(data.subtitle, { size: 15, color: MUTED }),
          new TextRun({
            children: ["\tPage ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
            size: 15,
            color: MUTED,
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: data.preparedBy || SCHOOL_NAME,
    title: `${data.title} — ${data.subtitle}`,
    description: `${SCHOOL_NAME} ${COURSE_NAME} progress report`,
    styles: { default: { document: { run: { font: "Calibri", size: 20, color: INK } } } },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1000, bottom: 900, left: 850, right: 850, header: 450, footer: 400 },
          },
        },
        headers: { default: header, first: new Header({ children: [new Paragraph({ children: [] })] }) },
        footers: { default: footer, first: footer },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
