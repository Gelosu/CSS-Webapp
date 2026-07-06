import { getAdminDb } from "./firebase-admin";
import { DEFAULT_APK_DOWNLOAD_URL, toDriveDirectDownloadUrl } from "./constants";

export type ConsumeResult =
  | { ok: true; downloadUrl: string }
  | { ok: false; reason: "not-found" | "used" };

export type PeekResult =
  | { ok: true; classroomId: string; email: string }
  | { ok: false; reason: "not-found" | "used" };

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
  };
  if (invite.status === "used") return { ok: false, reason: "used" };
  return { ok: true, classroomId: invite.classroomId, email: invite.email };
}

// Atomically flips a pending invite to "used" so the same token can never be
// redeemed twice, even under concurrent/duplicate requests (link scanners,
// double-clicks, etc).
export async function consumeDownloadInvite(token: string): Promise<ConsumeResult> {
  const db = getAdminDb();
  const inviteRef = db.ref(`downloadInvites/${token}`);

  const existing = await inviteRef.get();
  if (!existing.exists()) return { ok: false, reason: "not-found" };

  const txResult = await inviteRef.transaction((current) => {
    // The Admin SDK has no local cache, so it always calls this function once
    // with current === null before fetching the real value from the server —
    // aborting on that first call (as opposed to only on a genuine "used")
    // would abort the whole transaction before it ever sees the real data.
    if (current === null) return { status: "used", usedAt: Date.now() };
    if (current.status === "used") return; // abort, already used
    return { ...current, status: "used", usedAt: Date.now() };
  });

  if (!txResult.committed) {
    const snapshot = await inviteRef.get();
    return { ok: false, reason: snapshot.exists() ? "used" : "not-found" };
  }

  const invite = txResult.snapshot.val() as { classroomId: string };
  const classroomSnapshot = await db.ref(`classrooms/${invite.classroomId}`).get();
  if (!classroomSnapshot.exists()) return { ok: false, reason: "not-found" };

  const downloadUrl = classroomSnapshot.val().downloadUrl as string | undefined;
  return { ok: true, downloadUrl: toDriveDirectDownloadUrl(downloadUrl || DEFAULT_APK_DOWNLOAD_URL) };
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
