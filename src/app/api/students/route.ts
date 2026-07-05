import { NextResponse } from "next/server";
import { ApiError, getAdminAuth, getAdminDb, requireAdminUser } from "@/lib/firebase-admin";
import { buildInitialLearningProgress } from "@/lib/progress";
import type { CreateStudentInput } from "@/types";

export async function POST(request: Request) {
  try {
    await requireAdminUser(request);
    const body = (await request.json()) as CreateStudentInput;
    const { fullName, username, email, password, classCode } = body;

    if (!fullName || !username || !email || !password) {
      throw new ApiError(400, "fullName, username, email, and password are required.");
    }

    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName: fullName,
    });

    try {
      await getAdminDb().ref(`users/${userRecord.uid}`).set({
        uid: userRecord.uid,
        fullName,
        username,
        email,
        classCode: classCode ?? null,
        learningProgress: buildInitialLearningProgress(),
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
    const message = err instanceof Error ? err.message : "Failed to create student.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
