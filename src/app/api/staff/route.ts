import { NextResponse } from "next/server";
import { ApiError, getAdminAuth, getAdminDb, requireRole } from "@/lib/firebase-admin";

interface CreateTeacherInput {
  fullName: string;
  email: string;
  password: string;
  classCode: string | null;
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const body = (await request.json()) as CreateTeacherInput;
    const { fullName, email, password, classCode } = body;

    if (!fullName || !email || !password) {
      throw new ApiError(400, "fullName, email, and password are required.");
    }

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
        classCode: classCode || null,
        createdAt: Date.now(),
      });
    } catch (err) {
      await getAdminAuth().deleteUser(userRecord.uid);
      throw err;
    }

    return NextResponse.json({ id: userRecord.uid });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to create teacher account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
