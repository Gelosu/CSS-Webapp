import { onValue, ref } from "firebase/database";
import { getFirebaseDb } from "./firebase";
import { authedFetch } from "./api-client";
import type { StaffMember, StaffRole } from "@/types";

export const DEFAULT_TEACHER_PASSWORD = "Teacher12345";

function staffRef() {
  return ref(getFirebaseDb(), "staff");
}

export function subscribeToStaff(
  onData: (staff: StaffMember[]) => void,
  onError: (error: Error) => void
) {
  return onValue(
    staffRef(),
    (snapshot) => {
      const value = snapshot.val() as Record<string, Omit<StaffMember, "uid">> | null;
      const staff = Object.entries(value ?? {}).map(([uid, data]) => ({
        uid,
        fullName: data.fullName ?? "",
        email: data.email ?? "",
        role: data.role ?? "teacher",
        classCode: data.classCode ?? null,
        createdAt: data.createdAt ?? 0,
      } satisfies StaffMember));
      staff.sort((a, b) => a.fullName.localeCompare(b.fullName));
      onData(staff);
    },
    onError
  );
}

export interface BootstrapProfile {
  role: StaffRole;
  classCode: string | null;
}

export async function bootstrapRole(): Promise<BootstrapProfile> {
  return (await authedFetch("/api/staff/bootstrap", { method: "POST" })) as BootstrapProfile;
}

export async function createTeacher(input: {
  fullName: string;
  email: string;
  password: string;
  classCode: string | null;
}) {
  await authedFetch("/api/staff", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateStaffRole(uid: string, role: StaffRole) {
  await authedFetch(`/api/staff/${uid}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function updateStaffMember(
  uid: string,
  updates: {
    fullName?: string;
    email?: string;
    password?: string;
    classCode?: string | null;
  }
) {
  await authedFetch(`/api/staff/${uid}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// Lets a teacher with no classroom yet claim the one they just created.
export async function claimClassroom(classCode: string) {
  await authedFetch("/api/staff/claim-classroom", {
    method: "POST",
    body: JSON.stringify({ classCode }),
  });
}

export async function deleteStaffMember(uid: string) {
  await authedFetch(`/api/staff/${uid}`, { method: "DELETE" });
}
