"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { useClassrooms } from "@/lib/hooks";
import { createTeacher, DEFAULT_TEACHER_PASSWORD } from "@/lib/staff";
import { ClassroomMultiSelect } from "./ClassroomMultiSelect";

const inputClass =
  "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-xs font-medium text-muted";

export function TeacherFormModal({ onClose }: { onClose: () => void }) {
  const { classrooms } = useClassrooms();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEFAULT_TEACHER_PASSWORD);
  const [classCodes, setClassCodes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createTeacher({ fullName, email, password, classCodes });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Teacher" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Juana Dela Cruz"
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="teacher@example.com"
          />
        </div>
        <div>
          <label className={labelClass}>Assigned classrooms</label>
          <ClassroomMultiSelect classrooms={classrooms} value={classCodes} onChange={setClassCodes} />
          <p className="mt-1 text-xs text-muted">
            Tick every classroom this teacher handles. They only see students and data for these classrooms, and
            they are emailed the class code of each one. You can change this later.
          </p>
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="At least 6 characters"
          />
          <p className="mt-1 text-xs text-muted">
            Defaults to &ldquo;{DEFAULT_TEACHER_PASSWORD}&rdquo; — change it here or let the
            teacher update it after signing in.
          </p>
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
            {submitting ? "Creating..." : "Create teacher account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
