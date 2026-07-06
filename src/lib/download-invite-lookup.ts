import { getAdminDb } from "./firebase-admin";
import { DEFAULT_APK_DOWNLOAD_URL, toDriveDirectDownloadUrl } from "./constants";
import type { Database } from "firebase-admin/database";

export type ConsumeResult =
  | { ok: true; downloadUrl: string }
  | { ok: false; reason: "not-found" | "used" };

export type PeekResult =
  | { ok: true; classroomId: string; email: string }
  | { ok: false; reason: "not-found" | "used" };

// Large APKs (200MB+) over a mobile connection routinely get interrupted and
// resumed — and Android's download manager resumes by re-requesting the
// *original* link, not the final redirected file URL. Since the link is
// meant to be single-use, that resume would otherwise hit "already used" and
// get a tiny HTML error page instead of the rest of the file, which looks
// exactly like a stuck/corrupted download. Re-serving the same download URL
// for a short window after first use lets that resume succeed, while the
// link still stops working for anyone re-sharing/reusing it later.
const RESUME_GRACE_MS = 30 * 60 * 1000;

async function resolveDownloadUrl(
  db: Database,
  classroomId: string
): Promise<ConsumeResult> {
  const classroomSnapshot = await db.ref(`classrooms/${classroomId}`).get();
  if (!classroomSnapshot.exists()) return { ok: false, reason: "not-found" };

  const downloadUrl = classroomSnapshot.val().downloadUrl as string | undefined;
  return { ok: true, downloadUrl: toDriveDirectDownloadUrl(downloadUrl || DEFAULT_APK_DOWNLOAD_URL) };
}

function withinResumeGrace(usedAt: number | null | undefined): boolean {
  return Boolean(usedAt) && Date.now() - (usedAt as number) < RESUME_GRACE_MS;
}

// Read-only lookup so the /download/[token] page can show the branded
// "ready to download" screen without spending the token's single use —
// the token is only actually consumed once the visitor clicks the
// Download APK button (see consumeDownloadInvite / /api/download/[token]).
export async function peekDownloadInvite(token: string): Promise<PeekResult> {
  const snapshot = await getAdminDb().ref(`downloadInvites/${token}`).get();
  if (!snapshot.exists()) return { ok: false, reason: "not-found" };

  const invite = snapshot.val() as {
    classroomId: string;
    email: string;
    status: "pending" | "used";
    usedAt: number | null;
  };
  if (invite.status === "used" && !withinResumeGrace(invite.usedAt)) {
    return { ok: false, reason: "used" };
  }
  return { ok: true, classroomId: invite.classroomId, email: invite.email };
}

// Atomically flips a pending invite to "used" so the same token can never be
// redeemed twice, even under concurrent/duplicate requests (link scanners,
// double-clicks, etc) — except within RESUME_GRACE_MS of the original use,
// where the same download URL is re-served to support interrupted-download
// resume (see comment above).
export async function consumeDownloadInvite(token: string): Promise<ConsumeResult> {
  const db = getAdminDb();
  const inviteRef = db.ref(`downloadInvites/${token}`);

  const existing = await inviteRef.get();
  if (!existing.exists()) return { ok: false, reason: "not-found" };

  const existingData = existing.val() as {
    classroomId: string;
    status: "pending" | "used";
    usedAt: number | null;
  };

  if (existingData.status === "used") {
    if (withinResumeGrace(existingData.usedAt)) {
      return resolveDownloadUrl(db, existingData.classroomId);
    }
    return { ok: false, reason: "used" };
  }

  const txResult = await inviteRef.transaction((current) => {
    // The Admin SDK has no local cache, so it always calls this function once
    // with current === null before fetching the real value from the server —
    // aborting on that first call (as opposed to only on a genuine "used")
    // would abort the whole transaction before it ever sees the real data.
    if (current === null) return { status: "used", usedAt: Date.now() };
    if (current.status === "used") return; // abort, lost the race — handled below
    return { ...current, status: "used", usedAt: Date.now() };
  });

  if (!txResult.committed) {
    // Lost a race to a concurrent request (or it was a resume that arrived
    // between our two reads) — fall back to the same grace-window check.
    const snapshot = await inviteRef.get();
    if (!snapshot.exists()) return { ok: false, reason: "not-found" };
    const data = snapshot.val() as { classroomId: string; usedAt: number | null };
    if (withinResumeGrace(data.usedAt)) {
      return resolveDownloadUrl(db, data.classroomId);
    }
    return { ok: false, reason: "used" };
  }

  const invite = txResult.snapshot.val() as { classroomId: string };
  return resolveDownloadUrl(db, invite.classroomId);
}

// Server-side (Admin SDK) equivalent of createDownloadInvite, used by the
// /api/download-invites route so it can create the invite and send its
// email in one request without a signed-in client SDK session.
export async function createDownloadInviteAdmin(
  classroomId: string,
  email: string
): Promise<string> {
  const db = getAdminDb();
  const newRef = db.ref("downloadInvites").push();
  if (!newRef.key) throw new Error("Failed to create download invite.");
  await newRef.set({
    classroomId,
    email: email.toLowerCase(),
    status: "pending",
    createdAt: Date.now(),
    usedAt: null,
  });
  return newRef.key;
}
