import { NextResponse } from "next/server";
import { ApiError, getAdminDb, requireRole } from "@/lib/firebase-admin";

interface Found {
  uid: string;
  fullName: string;
  email: string;
}

// Admin-only. Finds teacher/admin accounts that are also listed as students (their uid, or their email, matches a
// staff account) and, unless `dryRun`, removes them from the student list. Only the student record (users/{uid})
// is deleted: the sign-in account and the staff record are never touched.
export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean };
    const db = getAdminDb();

    const staff = ((await db.ref("staff").get()).val() ?? {}) as Record<string, { email?: string }>;
    const staffUids = new Set(Object.keys(staff));
    const staffEmails = new Set(
      Object.values(staff)
        .map((m) => (m?.email ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    const users = ((await db.ref("users").get()).val() ?? {}) as Record<string, { fullName?: string; email?: string }>;
    const found: Found[] = [];
    for (const [uid, data] of Object.entries(users)) {
      const email = (data?.email ?? "").trim().toLowerCase();
      if (staffUids.has(uid) || (email && staffEmails.has(email))) {
        found.push({ uid, fullName: data?.fullName ?? "", email: data?.email ?? "" });
      }
    }

    if (!body.dryRun && found.length > 0) {
      const updates: Record<string, null> = {};
      for (const f of found) updates[`users/${f.uid}`] = null;
      await db.ref().update(updates);
    }

    return NextResponse.json({ removed: !body.dryRun, accounts: found });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Clean-up failed." }, { status: 500 });
  }
}
