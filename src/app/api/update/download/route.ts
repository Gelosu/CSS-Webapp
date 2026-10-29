import { NextResponse } from "next/server";
import { getLatestRelease } from "@/lib/app-release";

// Permanent update link: never expires, never "used", always sends the newest APK.
export async function GET(request: Request) {
  const release = await getLatestRelease();
  if (!release) return NextResponse.redirect(new URL("/update", request.url));
  return NextResponse.redirect(release.assetUrl);
}
