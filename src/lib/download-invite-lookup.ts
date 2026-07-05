import { getAdminDb } from "./firebase-admin";
import { DEFAULT_APK_DOWNLOAD_URL } from "./constants";

export type ConsumeResult =
  | { ok: true; downloadUrl: string }
  | { ok: false; reason: "not-found" | "used" };

// Atomically flips a pending invite to "used" so the same token can never be
// redeemed twice, even under concurrent/duplicate requests (link scanners,
// double-clicks, etc).
export async function consumeDownloadInvite(token: string): Promise<ConsumeResult> {
  const db = getAdminDb();
  const inviteRef = db.ref(`downloadInvites/${token}`);

  const txResult = await inviteRef.transaction((current) => {
    if (!current || current.status === "used") return; // abort, leave untouched
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
  return { ok: true, downloadUrl: downloadUrl || DEFAULT_APK_DOWNLOAD_URL };
}
