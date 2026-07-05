import { get, onValue, ref, update, type DataSnapshot } from "firebase/database";
import { getFirebaseDb } from "./firebase";
import { authedFetch } from "./api-client";
import type { CreateStudentInput, Student, StudentInput } from "@/types";

function usersRef() {
  return ref(getFirebaseDb(), "users");
}

function mapStudentsSnapshot(snapshot: DataSnapshot): Student[] {
  const value = snapshot.val() as Record<string, Omit<Student, "id">> | null;
  const students = Object.entries(value ?? {}).map(([id, data]) => ({
    id,
    fullName: data.fullName ?? "",
    username: data.username ?? "",
    email: data.email ?? "",
    classCode: data.classCode ?? null,
    learningProgress: data.learningProgress ?? {},
  } satisfies Student));
  students.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return students;
}

export function subscribeToStudents(
  onData: (students: Student[]) => void,
  onError: (error: Error) => void
) {
  return onValue(usersRef(), (snapshot) => onData(mapStudentsSnapshot(snapshot)), onError);
}

// One-shot read, used where a live subscription would be unnecessary overhead
// (e.g. a periodically-polled analytics view).
export async function fetchStudentsOnce(): Promise<Student[]> {
  return mapStudentsSnapshot(await get(usersRef()));
}

export async function createStudent(input: CreateStudentInput) {
  await authedFetch("/api/students", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateStudent(
  id: string,
  input: Partial<StudentInput> & { password?: string }
) {
  await authedFetch(`/api/students/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteStudent(id: string) {
  await authedFetch(`/api/students/${id}`, { method: "DELETE" });
}

// Used for quick, non-auth-sensitive field changes (e.g. enroll/remove from a
// classroom) where going through the API route would be unnecessary overhead.
export async function setStudentClassCode(id: string, classCode: string | null) {
  await update(ref(getFirebaseDb(), `users/${id}`), { classCode });
}
