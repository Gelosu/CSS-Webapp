import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import { ApiError, getAdminAuth, getAdminDb } from "./firebase-admin";
import { sendPasswordResetCodeEmail } from "./mailer";

// "Forgot password" for every account (students, teachers, admins), used by the mobile app:
//   request -> a 6-digit code is e-mailed   verify -> the code is checked   confirm -> the new password is saved.
// Only a keyed hash of the code is stored (passwordResets/{sha256(email)}), a code works for 10 minutes and 5 wrong
// tries, and a new one can be asked for once a minute (5 an hour). Asking never reveals whether an e-mail has an account.

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

interface ResetRecord {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sentAt: number[];
}

function normalizeEmail(email: unknown) {
  const value = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ApiError(400, "Enter a valid email address.");
  }
  return value;
}

function normalizeCode(code: unknown) {
  const value = typeof code === "string" ? code.trim() : "";
  if (!/^\d{6}$/.test(value)) throw new ApiError(400, "The code is 6 digits.");
  return value;
}

function recordRef(email: string) {
  const key = createHash("sha256").update(email).digest("hex");
  return getAdminDb().ref(`passwordResets/${key}`);
}

function hashCode(email: string, code: string) {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.FIREBASE_PRIVATE_KEY || "css-password-reset";
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

async function findUser(email: string) {
  try {
    return await getAdminAuth().getUserByEmail(email);
  } catch {
    return null;
  }
}

export async function requestPasswordReset(rawEmail: unknown) {
  const email = normalizeEmail(rawEmail);
  const ref = recordRef(email);
  const now = Date.now();

  const existing = (await ref.get()).val() as ResetRecord | null;
  const recent = (existing?.sentAt ?? []).filter((t) => now - t < HOUR_MS);
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    throw new ApiError(429, `Please wait ${wait} seconds before asking for another code.`);
  }
  if (recent.length >= MAX_PER_HOUR) {
    throw new ApiError(429, "Too many codes asked for. Please try again in an hour.");
  }

  // no account for this e-mail: answer exactly as if a code was sent
  const user = await findUser(email);
  if (!user) return;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await ref.set({
    codeHash: hashCode(email, code),
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    lastSentAt: now,
    sentAt: [...recent, now],
  } satisfies ResetRecord);

  try {
    await sendPasswordResetCodeEmail({ to: email, code, minutes: CODE_TTL_MS / 60000 });
  } catch (err) {
    await ref.remove();
    throw new ApiError(500, err instanceof Error ? `Could not send the email: ${err.message}` : "Could not send the email.");
  }
}

// Returns normally when the code is right; throws a 400 with a clear message otherwise. `consume` removes the code.
export async function checkResetCode(rawEmail: unknown, rawCode: unknown, consume = false) {
  const email = normalizeEmail(rawEmail);
  const code = normalizeCode(rawCode);
  const ref = recordRef(email);
  const record = (await ref.get()).val() as ResetRecord | null;

  if (!record || record.expiresAt < Date.now()) {
    if (record) await ref.remove();
    throw new ApiError(400, "That code has expired. Ask for a new one.");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await ref.remove();
    throw new ApiError(400, "Too many wrong tries. Ask for a new code.");
  }
  if (!sameHash(record.codeHash, hashCode(email, code))) {
    const attempts = record.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await ref.remove();
      throw new ApiError(400, "Too many wrong tries. Ask for a new code.");
    }
    await ref.child("attempts").set(attempts);
    throw new ApiError(400, `That code is not right. ${MAX_ATTEMPTS - attempts} tries left.`);
  }
  if (consume) await ref.remove();
  return email;
}

export async function confirmPasswordReset(rawEmail: unknown, rawCode: unknown, password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    throw new ApiError(400, "The password needs at least 6 characters.");
  }
  const email = await checkResetCode(rawEmail, rawCode, true);
  const user = await findUser(email);
  if (!user) throw new ApiError(400, "That code has expired. Ask for a new one.");
  await getAdminAuth().updateUser(user.uid, { password });
  // any phone still signed in with the old password has to sign in again
  await getAdminAuth().revokeRefreshTokens(user.uid);
}
