import { NextResponse } from "next/server";
import { getClassroomByCode } from "@/lib/classroom-lookup";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const classroom = await getClassroomByCode(code);
    if (!classroom) {
      return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
    }
    return NextResponse.json(classroom);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to look up classroom.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
