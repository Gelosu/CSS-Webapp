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
  try {
    return await getAdminAuth().verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, "Invalid or expired session. Please sign in again.");
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
