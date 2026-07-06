"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { useClassrooms } from "@/lib/hooks";
import { updateStaffMember, DEFAULT_TEACHER_PASSWORD } from "@/lib/staff";
import type { StaffMember } from "@/types";

const inputClass =
  "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-xs font-medium text-muted";

export function StaffEditModal({
  member,
  onClose,
}: {
  member: StaffMember;
  onClose: () => void;
}) {
  const { classrooms } = useClassrooms();
  const [email, setEmail] = useState(member.email);
  const [classCode, setClassCode] = useState(member.classCode ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyUpdate(updates: Parameters<typeof updateStaffMember>[1]) {
    setError(null);
    setSubmitting(true);
    try {
      await updateStaffMember(member.uid, updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const updates: Parameters<typeof updateStaffMember>[1] = {};
    if (email !== member.email) updates.email = email;
    if ((classCode || null) !== member.classCode) updates.classCode = classCode || null;
    if (newPassword) updates.password = newPassword;
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    await applyUpdate(updates);
  }

  return (
    <Modal title={`Edit ${member.fullName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        {member.role === "teacher" && (
          <div>
            <label className={labelClass}>Assigned classroom</label>
            <select
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              className={inputClass}
            >
              <option value="">Unassigned</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              The teacher only sees students and data for this classroom.
            </p>
          </div>
        )}

        <div>
          <label className={labelClass}>New password (optional)</label>
          <input
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className={inputClass}
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => applyUpdate({ password: DEFAULT_TEACHER_PASSWORD })}
            className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt disabled:opacity-50 transition-colors"
          >
            Reset to default ({DEFAULT_TEACHER_PASSWORD})
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
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
