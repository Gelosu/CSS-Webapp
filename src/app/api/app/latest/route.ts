import { NextResponse } from "next/server";
import { getLatestRelease } from "@/lib/app-release";

// Public: the mobile app asks this on start-up whether a newer version exists.
export async function GET(request: Request) {
  const release = await getLatestRelease();
  if (!release) return NextResponse.json({ available: false }, { status: 404 });
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return NextResponse.json(
    {
      available: true,
      tag: release.tag,
      versionName: release.versionName,
      versionCode: release.versionCode,
      notes: release.notes,
      sizeBytes: release.sizeBytes,
      publishedAt: release.publishedAt,
      // permanent links: they always lead to the newest APK, so an old e-mail or an old app can still update
      downloadUrl: `${origin}/api/update/download`,
      pageUrl: `${origin}/update`,
    },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}
