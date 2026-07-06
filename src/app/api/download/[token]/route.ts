import { NextResponse } from "next/server";
import { consumeDownloadInvite } from "@/lib/download-invite-lookup";

// Resolves through any intermediate redirects (e.g. GitHub's release URL ->
// its signed Azure blob URL) so the client gets one direct hop to the actual
// file instead of bouncing through extra domains. Fewer hops means fewer
// places a mobile download manager's resume/retry logic can trip over a
// stale or already-consumed intermediate link. Falls back to the original
// URL if resolution fails for any reason (e.g. a network blip) — worst case
// the client just follows the normal redirect chain itself.
async function resolveFinalUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.url || url;
  } catch {
    return url;
  }
}

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

  const finalUrl = await resolveFinalUrl(result.downloadUrl);
  return NextResponse.redirect(finalUrl);
}
