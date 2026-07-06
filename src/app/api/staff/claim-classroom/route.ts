import { NextResponse } from "next/server";
import { ApiError, getAdminDb, requireRole } from "@/lib/firebase-admin";

// Narrow self-service action: a teacher who has no classroom yet can claim
// the one they just created as their own scope. Deliberately does NOT allow
// reassigning an existing classCode — that stays an admin-only action via
// PATCH /api/staff/[uid], so a teacher can't wander between rosters.
export async function POST(request: Request) {
  try {
    const decoded = await requireRole(request, ["teacher"]);
    const { classCode } = (await request.json()) as { classCode?: string };
    if (!classCode) {
      throw new ApiError(400, "classCode is required.");
    }

    const ref = getAdminDb().ref(`staff/${decoded.uid}`);
    const snapshot = await ref.get();
    if (snapshot.val()?.classCode) {
      throw new ApiError(
        400,
        "You already have a classroom assigned. Ask an admin to change it."
      );
    }

    await ref.update({ classCode });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to assign classroom.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
