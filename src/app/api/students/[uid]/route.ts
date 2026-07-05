import { NextResponse } from "next/server";
import { ApiError, getAdminAuth, getAdminDb, requireAdminUser } from "@/lib/firebase-admin";
import type { StudentInput } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireAdminUser(request);
    const { uid } = await params;
    const body = (await request.json()) as Partial<StudentInput> & { password?: string };
    const { fullName, username, email, classCode, password } = body;

    const authUpdates: { email?: string; password?: string; displayName?: string } = {};
    if (email) authUpdates.email = email;
    if (password) authUpdates.password = password;
    if (fullName) authUpdates.displayName = fullName;
    if (Object.keys(authUpdates).length > 0) {
      await getAdminAuth().updateUser(uid, authUpdates);
    }

    const dbUpdates: Record<string, unknown> = {};
    if (fullName !== undefined) dbUpdates.fullName = fullName;
    if (username !== undefined) dbUpdates.username = username;
    if (email !== undefined) dbUpdates.email = email;
    if (classCode !== undefined) dbUpdates.classCode = classCode;
    if (Object.keys(dbUpdates).length > 0) {
      await getAdminDb().ref(`users/${uid}`).update(dbUpdates);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update student.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireAdminUser(request);
    const { uid } = await params;
    await getAdminDb().ref(`users/${uid}`).remove();
    await getAdminAuth().deleteUser(uid).catch(() => {
      // Auth account may already be gone; the DB record removal above is what matters most.
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to delete student.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
