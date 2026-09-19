import { NextResponse } from "next/server";
import { ApiError, getAdminDb, requireRole } from "@/lib/firebase-admin";
import { sendReportEmail } from "@/lib/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 10;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const FORMATS = {
  pdf: {
    contentType: "application/pdf",
    isValid: (b: Buffer) => b.subarray(0, 4).toString("latin1") === "%PDF",
  },
  docx: {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    isValid: (b: Buffer) => b[0] === 0x50 && b[1] === 0x4b, // zip container ("PK")
  },
  xlsx: {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    isValid: (b: Buffer) => b[0] === 0x50 && b[1] === 0x4b,
  },
} as const;

interface Body {
  to?: string[];
  subject?: string;
  message?: string;
  format?: keyof typeof FORMATS;
  fileName?: string;
  title?: string;
  subtitle?: string;
  content?: string; // base64
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const caller = await requireRole(request, ["admin", "teacher"]);
    const body = (await request.json()) as Body;

    const to = Array.from(
      new Set((body.to ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))
    );
    if (to.length === 0) throw new ApiError(400, "Add at least one email address.");
    if (to.length > MAX_RECIPIENTS) {
      throw new ApiError(400, `You can send to at most ${MAX_RECIPIENTS} addresses at a time.`);
    }
    const invalid = to.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length > 0) throw new ApiError(400, `Not a valid email: ${invalid.join(", ")}`);

    const format = body.format && body.format in FORMATS ? body.format : null;
    if (!format) throw new ApiError(400, "Unsupported report format.");
    if (!body.content) throw new ApiError(400, "The report file is missing.");

    const content = Buffer.from(body.content, "base64");
    if (content.length === 0 || content.length > MAX_FILE_BYTES) {
      throw new ApiError(400, "The report file is empty or too large to email.");
    }
    if (!FORMATS[format].isValid(content)) {
      throw new ApiError(400, "The attached file doesn't look like a valid report.");
    }

    // Only a plain file name with the right extension ever reaches the mail
    // headers.
    const base = clean(body.fileName, 120)
      .replace(/\.(pdf|docx|xlsx)$/i, "")
      .replace(/[^\w.\- ]+/g, "_");
    const fileName = `${base || "progress-report"}.${format}`;

    const title = clean(body.title, 120) || "Progress Report";
    const subtitle = clean(body.subtitle, 160);

    // Prefer the staff record's display name over the raw email.
    const nameSnap = await getAdminDb().ref(`staff/${caller.uid}/fullName`).get();
    const senderName = (nameSnap.exists() ? String(nameSnap.val()) : "") || caller.email || "Your instructor";

    await sendReportEmail({
      to,
      subject: clean(body.subject, 200) || `${title} — ${subtitle}`.trim(),
      message: typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "",
      title,
      subtitle,
      senderName,
      senderEmail: caller.email ?? null,
      fileName,
      contentType: FORMATS[format].contentType,
      content,
    });

    return NextResponse.json({ ok: true, sent: to.length });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to send the report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
