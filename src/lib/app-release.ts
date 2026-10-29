import { createHmac, timingSafeEqual } from "crypto";
import { getAdminDb } from "./firebase-admin";
import { sendAppUpdateEmail } from "./mailer";

// Where the APK releases live. A new GitHub release (with an .apk asset) is the
// signal that a new app version exists: GitHub calls /api/releases/webhook, we
// remember it as the "latest" release, e-mail everyone one permanent update
// link, and the app asks /api/app/latest whether it is out of date.
export const RELEASE_REPO = process.env.GITHUB_RELEASE_REPO || "Gelosu/CSS-Webapp";

export interface AppRelease {
  tag: string;
  /** Human version, e.g. "1.2.0". */
  versionName: string;
  /** Monotonic number the app compares with its own versionCode; null when the tag/notes carry no version. */
  versionCode: number | null;
  notes: string;
  /** Direct (GitHub) URL of the .apk asset. */
  assetUrl: string;
  assetName: string;
  sizeBytes: number;
  publishedAt: number;
}

interface GithubAsset { name: string; browser_download_url: string; size: number }
interface GithubRelease {
  tag_name: string;
  name?: string | null;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
  created_at?: string | null;
  assets?: GithubAsset[];
}

/** "v1.2.3" -> 10203, "2" -> 20000. Same scheme as the app's versionCode (major*10000 + minor*100 + patch). */
export function versionCodeFromTag(tag: string): number | null {
  const m = tag.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  return Number(m[1]) * 10000 + Number(m[2] ?? 0) * 100 + Number(m[3] ?? 0);
}

export function releaseFromGithub(r: GithubRelease): AppRelease | null {
  const apk = (r.assets ?? []).find((a) => a.name.toLowerCase().endsWith(".apk"));
  if (!apk) return null;
  const notes = (r.body ?? "").trim();
  // a release can pin the number explicitly: "versionCode: 12"
  const pinned = notes.match(/version\s*[_-]?\s*code\s*[:=]\s*(\d+)/i);
  const tagVersion = r.tag_name.replace(/^v/i, "");
  return {
    tag: r.tag_name,
    versionName: /\d/.test(tagVersion) ? tagVersion : r.name || r.tag_name,
    versionCode: pinned ? Number(pinned[1]) : versionCodeFromTag(r.tag_name),
    notes: notes.replace(/version\s*[_-]?\s*code\s*[:=]\s*\d+\s*/gi, "").trim().slice(0, 600),
    assetUrl: apk.browser_download_url,
    assetName: apk.name,
    sizeBytes: apk.size,
    publishedAt: Date.parse(r.published_at ?? r.created_at ?? "") || Date.now(),
  };
}

export function verifyGithubSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function saveLatestRelease(release: AppRelease) {
  await getAdminDb().ref("appRelease/latest").set(release);
}

/** Latest release: what the webhook stored, else asked from GitHub directly (so it also works before the first webhook). */
export async function getLatestRelease(): Promise<AppRelease | null> {
  try {
    const snap = await getAdminDb().ref("appRelease/latest").get();
    if (snap.exists()) return snap.val() as AppRelease;
  } catch {
    /* fall through to GitHub */
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${RELEASE_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "css-webapp" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return releaseFromGithub((await res.json()) as GithubRelease);
  } catch {
    return null;
  }
}

function keyOf(email: string) {
  return Buffer.from(email.toLowerCase()).toString("base64url");
}

/** Every student and staff e-mail, once each. */
export async function collectRecipients(): Promise<string[]> {
  const db = getAdminDb();
  const [users, staff] = await Promise.all([db.ref("users").get(), db.ref("staff").get()]);
  const emails = new Set<string>();
  for (const snap of [users, staff]) {
    const value = (snap.val() ?? {}) as Record<string, { email?: string }>;
    for (const v of Object.values(value)) {
      const e = (v?.email ?? "").trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) emails.add(e);
    }
  }
  return Array.from(emails);
}

/**
 * Sends the update e-mail to everyone who has not had it for this release yet. Progress is stored per release, so
 * calling it again (e.g. after a timeout) carries on where it stopped and nobody gets the e-mail twice.
 */
export async function sendUpdateEmails(
  release: AppRelease,
  origin: string,
  budgetMs = 240_000
): Promise<{ sent: number; failed: number; remaining: number }> {
  const db = getAdminDb();
  const tagKey = release.tag.replace(/[.#$/\[\]]/g, "_");
  const sentRef = db.ref(`appRelease/emailed/${tagKey}`);
  const already = new Set(Object.keys((await sentRef.get()).val() ?? {}));
  const todo = (await collectRecipients()).filter((e) => !already.has(keyOf(e)));
  const updateLink = `${origin}/update`;
  const started = Date.now();
  let sent = 0;
  let failed = 0;
  let index = 0;
  const workers = Array.from({ length: 5 }, async () => {
    while (index < todo.length && Date.now() - started < budgetMs) {
      const email = todo[index++];
      try {
        await sendAppUpdateEmail({ to: email, version: release.versionName, notes: release.notes, updateLink });
        await sentRef.child(keyOf(email)).set(Date.now());
        sent++;
      } catch {
        failed++;
      }
    }
  });
  await Promise.all(workers);
  return { sent, failed, remaining: Math.max(todo.length - sent - failed, 0) };
}
