import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getDatabase, type Database } from "firebase-admin/database";

let app: App | undefined;

function getAdminApp(): App {
  if (!app) {
    if (getApps().length) {
      app = getApps()[0];
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

      if (!projectId || !clientEmail || !privateKey || !databaseURL) {
        throw new Error(
          "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
          "FIREBASE_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_DATABASE_URL in .env.local."
        );
      }

      app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        databaseURL,
      });
    }
  }
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Database {
  return getDatabase(getAdminApp());
}

export async function requireAdminUser(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    throw new ApiError(401, "Missing Authorization header.");
  }
  const auth = getAdminAuth();
  try {
    return await auth.verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, "Invalid or expired session. Please sign in again.");
  }
}

export type StaffRole = "admin" | "teacher";

export interface StaffProfile {
  role: StaffRole;
  classCode: string | null;
}

// Accounts that existed before the role system shipped have no staff/{uid}
// record yet — treat and persist them as "admin" the first time we see them,
// so the original admin login is never locked out by this migration.
export async function getOrBootstrapStaffProfile(
  uid: string,
  email: string | null | undefined
): Promise<StaffProfile> {
  const ref = getAdminDb().ref(`staff/${uid}`);
  const snapshot = await ref.get();
  if (snapshot.exists()) {
    const data = snapshot.val();
    return { role: (data.role as StaffRole) ?? "admin", classCode: data.classCode ?? null };
  }
  await ref.set({
    uid,
    fullName: email ?? "Admin",
    email: email ?? "",
    role: "admin",
    classCode: null,
    createdAt: Date.now(),
  });
  return { role: "admin", classCode: null };
}

export async function requireRole(request: Request, allowed: StaffRole[]) {
  const decoded = await requireAdminUser(request);
  const profile = await getOrBootstrapStaffProfile(decoded.uid, decoded.email);
  if (!allowed.includes(profile.role)) {
    throw new ApiError(403, "You don't have permission to do that.");
  }
  return { ...decoded, role: profile.role, classCode: profile.classCode };
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
