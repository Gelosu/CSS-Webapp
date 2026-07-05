"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseAuth } from "@/lib/firebase";
import { Modal } from "@/components/Modal";

const inputClass =
  "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-xs font-medium text-muted";

export default function SettingsPage() {
  const { logout } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user?.email) throw new Error("Not signed in.");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setShowSuccess(true);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Current password is incorrect.");
      } else if (code === "auth/weak-password") {
        setError("New password is too weak.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDone() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">Update your admin password.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-border bg-surface p-6"
      >
        <div>
          <label className={labelClass}>Current password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className={labelClass}>New password</label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label className={labelClass}>Confirm new password</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            placeholder="Re-enter new password"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {submitting ? "Saving..." : "Update password"}
        </button>
      </form>

      {showSuccess && (
        <Modal title="Password updated" onClose={handleDone}>
          <p className="text-sm text-muted">
            Your password has been updated successfully. Please sign in again with your
            new password.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleDone}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
            >
              OK
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
