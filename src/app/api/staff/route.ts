import { NextResponse } from "next/server";
import { ApiError, getAdminAuth, getAdminDb, requireRole } from "@/lib/firebase-admin";
import { emailAssignment, resolveClassCodes } from "@/lib/staff-assignment";

interface CreateTeacherInput {
  fullName: string;
  email: string;
  password: string;
  classCode?: string | null;
  classCodes?: string[];
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const body = (await request.json()) as CreateTeacherInput;
    const { fullName, email, password } = body;

    if (!fullName || !email || !password) {
      throw new ApiError(400, "fullName, email, and password are required.");
    }

    const classCodes = await resolveClassCodes(body.classCodes ?? body.classCode);

    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName: fullName,
    });

    try {
      await getAdminDb().ref(`staff/${userRecord.uid}`).set({
        uid: userRecord.uid,
        fullName,
        email,
        role: "teacher",
        classCode: classCodes[0] ?? null,
        classCodes,
        createdAt: Date.now(),
      });
    } catch (err) {
      await getAdminAuth().deleteUser(userRecord.uid);
      throw err;
    }

    // the teacher is told the class code of every classroom they were given
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const mail = classCodes.length
      ? await emailAssignment({ to: email, name: fullName, classCodes, added: classCodes, portalUrl: origin })
      : { emailed: false };

    return NextResponse.json({ id: userRecord.uid, ...mail });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to create teacher account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
