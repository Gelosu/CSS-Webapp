import { NextResponse } from "next/server";
import { consumeDownloadInvite } from "@/lib/download-invite-lookup";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let result;
  try {
    result = await consumeDownloadInvite(token);
  } catch {
    result = { ok: false as const, reason: "not-found" as const };
  }

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/download/${token}`, request.url));
  }

  return NextResponse.redirect(result.downloadUrl);
}
