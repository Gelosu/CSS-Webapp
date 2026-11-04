import { NextResponse } from "next/server";
import { ApiError } from "@/lib/firebase-admin";
import { checkResetCode } from "@/lib/password-reset";

// Public (no sign-in): the mobile app's "Forgot password" screen calls this.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown; code?: unknown; password?: unknown };
    await checkResetCode(body.email, body.code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
