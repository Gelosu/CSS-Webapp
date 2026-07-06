import { NextResponse } from "next/server";
import { ApiError, getAdminAuth, getAdminDb, requireRole } from "@/lib/firebase-admin";
import type { StaffRole } from "@/types";

interface UpdateStaffInput {
  role?: StaffRole;
  classCode?: string | null;
  fullName?: string;
  email?: string;
  password?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const decoded = await requireRole(request, ["admin"]);
    const { uid } = await params;
    const body = (await request.json()) as UpdateStaffInput;
    const { role, classCode, fullName, email, password } = body;

    if (uid === decoded.uid) {
      throw new ApiError(400, "Use Settings to manage your own account.");
    }
    if (role !== undefined && role !== "admin" && role !== "teacher") {
      throw new ApiError(400, 'role must be "admin" or "teacher".');
    }

    const authUpdates: { email?: string; password?: string; displayName?: string } = {};
    if (email) authUpdates.email = email;
    if (password) authUpdates.password = password;
    if (fullName) authUpdates.displayName = fullName;
    if (Object.keys(authUpdates).length > 0) {
      await getAdminAuth().updateUser(uid, authUpdates);
    }

    const dbUpdates: Record<string, unknown> = {};
    if (role !== undefined) dbUpdates.role = role;
    if (classCode !== undefined) dbUpdates.classCode = classCode || null;
    if (fullName !== undefined) dbUpdates.fullName = fullName;
    if (email !== undefined) dbUpdates.email = email;
    if (Object.keys(dbUpdates).length > 0) {
      await getAdminDb().ref(`staff/${uid}`).update(dbUpdates);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update staff member.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const decoded = await requireRole(request, ["admin"]);
    const { uid } = await params;

    if (uid === decoded.uid) {
      throw new ApiError(400, "You can't delete your own account.");
    }

    await getAdminDb().ref(`staff/${uid}`).remove();
    await getAdminAuth().deleteUser(uid).catch(() => {
      // Auth account may already be gone; the staff record removal above is
      // what actually revokes their access to the portal.
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to delete staff member.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
