import { NextResponse } from "next/server";
import { ApiError, getOrBootstrapStaffProfile, requireAdminUser } from "@/lib/firebase-admin";

// Called once after sign-in so pre-existing (pre-role-system) accounts get a
// staff/{uid} record on first contact, and the caller learns their own role
// and class-code scope.
export async function POST(request: Request) {
  try {
    const decoded = await requireAdminUser(request);
    const profile = await getOrBootstrapStaffProfile(decoded.uid, decoded.email);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to resolve role.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
