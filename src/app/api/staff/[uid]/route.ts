import { NextResponse } from "next/server";
import { ApiError, classCodesOf, getAdminAuth, getAdminDb, requireRole } from "@/lib/firebase-admin";
import { emailAssignment, resolveClassCodes } from "@/lib/staff-assignment";
import type { StaffRole } from "@/types";

interface UpdateStaffInput {
  role?: StaffRole;
  classCode?: string | null;
  classCodes?: string[];
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
    const { role, fullName, email, password } = body;

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
    const before = classCodesOf((await getAdminDb().ref(`staff/${uid}`).get()).val());
    let after: string[] | null = null;
    if (body.classCodes !== undefined || body.classCode !== undefined) {
      after = await resolveClassCodes(body.classCodes ?? body.classCode);
      dbUpdates.classCodes = after;
      dbUpdates.classCode = after[0] ?? null;
    }
    if (role !== undefined) dbUpdates.role = role;
    if (fullName !== undefined) dbUpdates.fullName = fullName;
    if (email !== undefined) dbUpdates.email = email;
    if (Object.keys(dbUpdates).length > 0) {
      await getAdminDb().ref(`staff/${uid}`).update(dbUpdates);
    }

    // newly assigned classrooms: e-mail the teacher the class code of every classroom they now have
    let mail: { emailed: boolean; emailError?: string } = { emailed: false };
    const added = (after ?? []).filter((c) => !before.includes(c));
    if (after && added.length > 0) {
      const member = (await getAdminDb().ref(`staff/${uid}`).get()).val() as { email?: string; fullName?: string } | null;
      if (member?.email) {
        const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        mail = await emailAssignment({ to: member.email, name: member.fullName || member.email, classCodes: after, added, portalUrl: origin });
      }
    }

    return NextResponse.json({ ok: true, ...mail });
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
