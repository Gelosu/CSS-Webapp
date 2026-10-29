import { NextResponse } from "next/server";
import { ApiError, requireAdminUser } from "@/lib/firebase-admin";
import { createDownloadInviteAdmin } from "@/lib/download-invite-lookup";
import { getClassroomByCode } from "@/lib/classroom-lookup";
import { sendDownloadInviteEmail } from "@/lib/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// how long a new link stays valid: from 15 minutes up to 90 days (default 7 days)
const MIN_HOURS = 0.25;
const MAX_HOURS = 24 * 90;
const DEFAULT_HOURS = 24 * 7;

function getAppOrigin(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const url = new URL(request.url);
  return url.origin;
}

export async function POST(request: Request) {
  try {
    await requireAdminUser(request);
    const body = (await request.json()) as { classroomId?: string; emails?: string[]; expiresInHours?: number };
    const classroomId = body.classroomId;
    const emails = Array.from(
      new Set((body.emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean))
    );

    if (!classroomId || emails.length === 0) {
      throw new ApiError(400, "classroomId and at least one email are required.");
    }
    const invalid = emails.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length > 0) {
      throw new ApiError(400, `Not a valid email: ${invalid.join(", ")}`);
    }

    const hours = body.expiresInHours === undefined ? DEFAULT_HOURS : Number(body.expiresInHours);
    if (!Number.isFinite(hours) || hours < MIN_HOURS || hours > MAX_HOURS) {
      throw new ApiError(400, "The link duration must be between 15 minutes and 90 days.");
    }
    const expiresAt = Date.now() + Math.round(hours * 60 * 60 * 1000);

    const classroom = await getClassroomByCode(classroomId);
    if (!classroom) {
      throw new ApiError(404, "Classroom not found.");
    }

    const origin = getAppOrigin(request);
    const results = await Promise.all(
      emails.map(async (email) => {
        try {
          const token = await createDownloadInviteAdmin(classroomId, email, expiresAt);
          await sendDownloadInviteEmail({
            to: email,
            classroomName: classroom.name,
            classCode: classroom.code,
            downloadLink: `${origin}/download/${token}`,
            expiresAt,
          });
          return { email, ok: true as const };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to send email.";
          return { email, ok: false as const, error: message };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to send download invites.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
