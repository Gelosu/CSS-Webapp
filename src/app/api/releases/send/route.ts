import { NextResponse } from "next/server";
import { ApiError, requireRole } from "@/lib/firebase-admin";
import { getLatestRelease, sendUpdateEmails } from "@/lib/app-release";

export const maxDuration = 300;

// Admin-only: (re)send the update e-mail for the latest release to everyone who has not had it yet.
export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const release = await getLatestRelease();
    if (!release) throw new ApiError(404, "No release with an .apk file was found.");
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const result = await sendUpdateEmails(release, origin);
    return NextResponse.json({ version: release.versionName, ...result });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send update emails." }, { status: 500 });
  }
}
