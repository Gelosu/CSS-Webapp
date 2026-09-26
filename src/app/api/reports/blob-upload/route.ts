import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/firebase-admin";

// Gmail's own attachment ceiling (~25MB after MIME/base64 overhead); this is the
// real limit once files skip Vercel's 4.5MB request-body cap via direct Blob upload.
const MAX_REPORT_BYTES = 18 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        await requireRole(request, ["admin", "teacher"]);
        if (!pathname.startsWith("report-uploads/")) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_REPORT_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not prepare the upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
