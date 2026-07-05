import { getFirebaseAuth } from "./firebase";

export async function authedFetch(path: string, options: RequestInit = {}) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("You must be signed in.");
  const idToken = await user.getIdToken();

  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }

  return res.json();
}
