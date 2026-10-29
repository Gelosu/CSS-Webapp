import { NextResponse } from "next/server";
import { after } from "next/server";
import {
  type AppRelease,
  releaseFromGithub,
  saveLatestRelease,
  sendUpdateEmails,
  verifyGithubSignature,
} from "@/lib/app-release";

// Long enough to e-mail a whole school; anything left over is finished by POST /api/releases/send.
export const maxDuration = 300;

function getAppOrigin(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return new URL(request.url).origin;
}

// GitHub "release" webhook. Add it in the repo: Settings > Webhooks > Add webhook
//   Payload URL  https://<this site>/api/releases/webhook
//   Content type application/json
//   Secret       the value of GITHUB_WEBHOOK_SECRET
//   Events       "Releases" only
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyGithubSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") return NextResponse.json({ ok: true, pong: true });
  if (event !== "release") return NextResponse.json({ ok: true, ignored: event });

  const payload = JSON.parse(raw) as { action?: string; release?: Parameters<typeof releaseFromGithub>[0] };
  const action = payload.action ?? "";
  const gh = payload.release;
  if (!gh || !["published", "released", "edited"].includes(action) || gh.draft || gh.prerelease) {
    return NextResponse.json({ ok: true, ignored: action });
  }

  const release = releaseFromGithub(gh);
  if (!release) return NextResponse.json({ ok: true, ignored: "no .apk asset" });

  await saveLatestRelease(release);
  const origin = getAppOrigin(request);
  // answer GitHub right away, send the e-mails afterwards
  after(async () => {
    await sendUpdateEmails(release as AppRelease, origin);
  });
  return NextResponse.json({ ok: true, version: release.versionName });
}
