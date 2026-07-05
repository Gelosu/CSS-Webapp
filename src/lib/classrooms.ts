import {
  equalTo,
  get,
  onValue,
  orderByChild,
  query,
  ref,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { getFirebaseDb } from "./firebase";
import { DEFAULT_APK_DOWNLOAD_URL } from "./constants";
import type { Classroom, ClassroomInput } from "@/types";

function classroomsRef() {
  return ref(getFirebaseDb(), "classrooms");
}

function usersRef() {
  return ref(getFirebaseDb(), "users");
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

export function generateJoinCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function isJoinCodeAvailable(code: string) {
  const snapshot = await get(ref(getFirebaseDb(), `classrooms/${code.toUpperCase()}`));
  return !snapshot.exists();
}

// The join code doubles as the classroom's key, so there's a single
// identifier admins and students both work with (no separate internal id).
export async function generateAvailableJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinCode();
    if (await isJoinCodeAvailable(code)) return code;
  }
  throw new Error("Could not generate a unique join code. Please try again.");
}

export function subscribeToClassrooms(
  onData: (classrooms: Classroom[]) => void,
  onError: (error: Error) => void
) {
  return onValue(
    classroomsRef(),
    (snapshot) => {
      const value = snapshot.val() as Record<string, Omit<Classroom, "id">> | null;
      const classrooms = Object.entries(value ?? {}).map(([id, data]) => ({
        id,
        name: data.name,
        description: data.description ?? "",
        code: data.code ?? id,
        downloadUrl: data.downloadUrl ?? DEFAULT_APK_DOWNLOAD_URL,
        createdAt: data.createdAt ?? 0,
      } satisfies Classroom));
      classrooms.sort((a, b) => b.createdAt - a.createdAt);
      onData(classrooms);
    },
    onError
  );
}

export async function createClassroom(input: ClassroomInput, code: string) {
  const key = code.toUpperCase();
  const existing = await get(ref(getFirebaseDb(), `classrooms/${key}`));
  if (existing.exists()) {
    throw new Error("That join code was just taken. Please regenerate and try again.");
  }
  await set(ref(getFirebaseDb(), `classrooms/${key}`), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return key;
}

export async function updateClassroom(id: string, input: ClassroomInput) {
  await update(ref(getFirebaseDb(), `classrooms/${id}`), { ...input });
}

export async function deleteClassroom(id: string) {
  const db = getFirebaseDb();
  const enrolled = await get(
    query(usersRef(), orderByChild("classCode"), equalTo(id))
  );
  const updates: Record<string, null> = { [`classrooms/${id}`]: null };
  enrolled.forEach((studentSnapshot) => {
    updates[`users/${studentSnapshot.key}/classCode`] = null;
  });
  await update(ref(db), updates);
}
