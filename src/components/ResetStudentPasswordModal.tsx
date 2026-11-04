"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { DEFAULT_STUDENT_PASSWORD, updateStudent } from "@/lib/students";
import type { Student } from "@/types";

const inputClass =
  "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-xs font-medium text-muted";

// no 0/O, 1/l/I so a password read out loud or copied by hand is not misread
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 10) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_CHARS[v % PASSWORD_CHARS.length]).join("");
}

// Admin only: sets a new password for a student's sign-in. The old password stops working straight away, so the
// admin is shown the new one once the change is saved (to hand to the student).
export function ResetStudentPasswordModal({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function save(newPassword: string) {
    setError(null);
    if (newPassword.length < 6) {
      setError("The password needs at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await updateStudent(student.id, { password: newPassword });
      setSavedPassword(newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void save(password);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (savedPassword) {
    return (
      <Modal title="Password changed" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {student.fullName} can now sign in to the course app with this password. The old one no longer works.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-alt p-3">
            <code className="flex-1 break-all text-sm font-semibold text-foreground">{savedPassword}</code>
            <button
              type="button"
              onClick={() => copy(savedPassword)}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition-colors"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-muted">
            This is the only time it is shown. Tell the student to change it after signing in.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Reset password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Set a new sign-in password for <span className="font-medium text-foreground">{student.fullName}</span> (
          {student.email}).
        </p>
        <div>
          <label className={labelClass}>New password</label>
          <div className="flex gap-2">
            <input
              required
              minLength={6}
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 6 characters"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
            >
              {visible ? "Hide" : "Show"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setPassword(generatePassword());
              setVisible(true);
            }}
            className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
          >
            Generate a password
          </button>
        </div>

        <div className="rounded-lg border border-border bg-surface-alt p-3">
          <p className="text-xs text-muted">Or put the student back on the default password.</p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => save(DEFAULT_STUDENT_PASSWORD)}
            className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface disabled:opacity-50 transition-colors"
          >
            Reset to default ({DEFAULT_STUDENT_PASSWORD})
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {submitting ? "Saving..." : "Reset password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
