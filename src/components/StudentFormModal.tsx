"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import type { Classroom, CreateStudentInput, Student, StudentInput } from "@/types";

const inputClass =
  "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-xs font-medium text-muted";

type Props =
  | {
      mode: "create";
      classrooms: Classroom[];
      defaultClassCode?: string | null;
      onClose: () => void;
      onSubmit: (input: CreateStudentInput) => Promise<void>;
    }
  | {
      mode: "edit";
      student: Student;
      classrooms: Classroom[];
      onClose: () => void;
      onSubmit: (input: StudentInput) => Promise<void>;
    };

export function StudentFormModal(props: Props) {
  const { mode, classrooms, onClose, onSubmit } = props;
  const student = mode === "edit" ? props.student : undefined;

  const [fullName, setFullName] = useState(student?.fullName ?? "");
  const [username, setUsername] = useState(student?.username ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [password, setPassword] = useState("");
  const [classCode, setClassCode] = useState<string>(
    student?.classCode ?? (mode === "create" ? props.defaultClassCode ?? "" : "")
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        await onSubmit({
          fullName,
          username,
          email,
          password,
          classCode: classCode || null,
        });
      } else {
        await onSubmit({
          fullName,
          username,
          email,
          classCode: classCode || null,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={mode === "create" ? "Add Student" : "Edit Student"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Juan Dela Cruz"
          />
        </div>
        <div>
          <label className={labelClass}>Username</label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            placeholder="juandc"
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
            placeholder="student@example.com"
          />
        </div>
        {mode === "create" && (
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
              This creates a real account the student can sign in with on the course app.
            </p>
          </div>
        )}
        <div>
          <label className={labelClass}>Classroom</label>
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
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
