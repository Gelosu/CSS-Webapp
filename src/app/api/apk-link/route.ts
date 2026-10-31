import { NextResponse } from "next/server";
import { ApiError, getAdminDb, requireRole } from "@/lib/firebase-admin";
import { getLatestRelease } from "@/lib/app-release";
import { sendAppUpdateEmail } from "@/lib/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 300;

function getAppOrigin(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return new URL(request.url).origin;
}

// Admin-only: e-mail the newest app version's permanent link (/update) to chosen teachers/admins, to typed
// e-mail addresses, or to every staff account (`all`).
export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const body = (await request.json()) as { emails?: string[]; all?: boolean };

    const emails = new Set((body.emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean));
    if (body.all) {
      const staff = ((await getAdminDb().ref("staff").get()).val() ?? {}) as Record<string, { email?: string }>;
      for (const member of Object.values(staff)) {
        const e = (member?.email ?? "").trim().toLowerCase();
        if (e) emails.add(e);
      }
    }
    if (emails.size === 0) throw new ApiError(400, "Choose at least one teacher or type an e-mail address.");
    if (emails.size > MAX_RECIPIENTS) throw new ApiError(400, `Too many recipients (max ${MAX_RECIPIENTS}).`);
    const invalid = Array.from(emails).filter((e) => !EMAIL_RE.test(e));
    if (invalid.length > 0) throw new ApiError(400, `Not a valid email: ${invalid.join(", ")}`);

    const release = await getLatestRelease();
    if (!release) throw new ApiError(404, "No app release with an .apk file was found on GitHub yet.");
    const updateLink = `${getAppOrigin(request)}/update`;

    const list = Array.from(emails);
    const results: { email: string; ok: boolean; error?: string }[] = [];
    let index = 0;
    await Promise.all(
      Array.from({ length: 5 }, async () => {
        while (index < list.length) {
          const email = list[index++];
          try {
            await sendAppUpdateEmail({ to: email, version: release.versionName, notes: release.notes, updateLink });
            results.push({ email, ok: true });
          } catch (err) {
            results.push({ email, ok: false, error: err instanceof Error ? err.message : "Failed to send." });
          }
        }
      })
    );
    results.sort((a, b) => a.email.localeCompare(b.email));
    return NextResponse.json({ version: release.versionName, results });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send the app link." }, { status: 500 });
  }
}
