import {
  equalTo,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set,
} from "firebase/database";
import { getFirebaseDb } from "./firebase";
import type { DownloadInvite } from "@/types";

function invitesRef() {
  return ref(getFirebaseDb(), "downloadInvites");
}

export function subscribeToInvites(
  classroomId: string,
  onData: (invites: DownloadInvite[]) => void,
  onError: (error: Error) => void
) {
  return onValue(
    query(invitesRef(), orderByChild("classroomId"), equalTo(classroomId)),
    (snapshot) => {
      const value = snapshot.val() as Record<string, Omit<DownloadInvite, "id">> | null;
      const invites = Object.entries(value ?? {}).map(([id, data]) => ({
        id,
        classroomId: data.classroomId,
        email: data.email,
        status: data.status,
        createdAt: data.createdAt ?? 0,
        usedAt: data.usedAt ?? null,
      } satisfies DownloadInvite));
      invites.sort((a, b) => b.createdAt - a.createdAt);
      onData(invites);
    },
    onError
  );
}

// Creates a fresh single-use token for an email. Calling this again for an
// email that already has one (e.g. "Resend") simply issues a new token —
// the old one stays whatever it was (pending or used) as history.
export async function createDownloadInvite(
  classroomId: string,
  email: string
): Promise<string> {
  const newRef = push(invitesRef());
  if (!newRef.key) throw new Error("Failed to create download invite.");
  await set(newRef, {
    classroomId,
    email: email.toLowerCase(),
    status: "pending",
    createdAt: serverTimestamp(),
    usedAt: null,
  });
  return newRef.key;
}
