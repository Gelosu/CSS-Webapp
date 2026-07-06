import { NextResponse } from "next/server";
import { ApiError, getAdminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== "string") {
      throw new ApiError(400, "idToken is required.");
    }
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const customToken = await getAdminAuth().createCustomToken(decoded.uid);
    return NextResponse.json({ customToken });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Token exchange failed." }, { status: 401 });
  }
}
