// Diagnostic script: prints every Firebase Auth user and their role source.
// Useful for verifying the staff/{uid} records match what the Android app expects.
//
// Usage:
//   node scripts/set-roles.js
//
// Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and
// NEXT_PUBLIC_FIREBASE_DATABASE_URL to be set in .env.local.

const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getAuth } = require("firebase-admin/auth");
const { config } = require("dotenv");

config({ path: ".env.local" });

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    console.error(
      "Missing Firebase Admin credentials in .env.local.\n" +
      "Fill in FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
    process.exit(1);
  }

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });

  const auth = getAuth();
  const db = getDatabase();

  let nextPageToken;
  let processed = 0;

  console.log("uid                          | email                          | role   | source");
  console.log("-".repeat(90));

  do {
    const result = await auth.listUsers(1000, nextPageToken);

    for (const user of result.users) {
      const staffSnap = await db.ref(`staff/${user.uid}`).get();
      const userSnap = await db.ref(`users/${user.uid}/role`).get();

      let role, source;
      if (staffSnap.exists()) {
        role = staffSnap.child("role").val() ?? "(missing)";
        source = "staff/";
      } else if (userSnap.exists()) {
        role = userSnap.val();
        source = "users/ (legacy)";
      } else {
        role = "(none)";
        source = "not in db";
      }

      console.log(
        `${user.uid.padEnd(28)} | ${(user.email ?? "").padEnd(30)} | ${role.padEnd(6)} | ${source}`
      );
      processed++;
    }

    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(`\nDone. ${processed} users scanned.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
