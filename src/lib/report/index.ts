import type { ReportData } from "./model";

export type ReportFormat = "pdf" | "docx" | "xlsx";

export const REPORT_FORMATS: { value: ReportFormat; label: string; hint: string }[] = [
  { value: "pdf", label: "PDF", hint: "Best for printing & sharing" },
  { value: "docx", label: "Word", hint: "Editable .docx" },
  { value: "xlsx", label: "Excel", hint: "Data sheets + charts" },
];

export const REPORT_MIME: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Builds the report file in the browser. Each generator (and its library) is
// loaded on demand so none of this weighs on the normal dashboard pages.
export async function generateReportBlob(format: ReportFormat, data: ReportData): Promise<Blob> {
  if (format === "xlsx") {
    const { buildXlsx } = await import("./xlsx");
    return buildXlsx(data);
  }
  const { buildBlocks } = await import("./layout");
  const blocks = buildBlocks(data);
  if (format === "pdf") {
    const { buildPdf } = await import("./pdf");
    return buildPdf(data, blocks);
  }
  const { buildDocx } = await import("./docx");
  return buildDocx(data, blocks);
}

export function reportFileName(format: ReportFormat, data: ReportData) {
  return `${data.fileName}.${format}`;
}

export async function downloadReport(format: ReportFormat, data: ReportData) {
  const blob = await generateReportBlob(format, data);
  saveBlob(blob, reportFileName(format, data));
}

// Gmail's own attachment ceiling (~25MB after MIME/base64 overhead). The file
// is uploaded straight to Vercel Blob from the browser, so Vercel's 4.5MB
// serverless request-body limit never comes into play — this is the real
// remaining constraint, set by the mail provider on the receiving end.
export const MAX_EMAIL_FILE_BYTES = 18 * 1024 * 1024;

export async function emailReport(
  format: ReportFormat,
  data: ReportData,
  message: { to: string[]; subject: string; note: string }
) {
  const blob = await generateReportBlob(format, data);
  if (blob.size > MAX_EMAIL_FILE_BYTES) {
    const mb = (blob.size / 1024 / 1024).toFixed(1);
    throw new Error(
      `This report is ${mb} MB — too large for email (limit ${MAX_EMAIL_FILE_BYTES / 1024 / 1024} MB, ` +
        "set by mail providers like Gmail). Turn off the individual student pages, pick a smaller group, " +
        "or download it instead."
    );
  }

  const { getFirebaseAuth } = await import("../firebase");
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("You must be signed in.");
  const idToken = await user.getIdToken();

  const { upload } = await import("@vercel/blob/client");
  const fileName = reportFileName(format, data);
  const uploaded = await upload(`report-uploads/${crypto.randomUUID()}-${fileName}`, blob, {
    access: "public",
    handleUploadUrl: "/api/reports/blob-upload",
    contentType: REPORT_MIME[format],
    headers: { Authorization: `Bearer ${idToken}` },
  });

  const { authedFetch } = await import("../api-client");
  return authedFetch("/api/reports/email", {
    method: "POST",
    body: JSON.stringify({
      to: message.to,
      subject: message.subject,
      message: message.note,
      format,
      fileName,
      title: data.title,
      subtitle: data.subtitle,
      blobUrl: uploaded.url,
    }),
  });
}
