"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useClassrooms, useStudents } from "@/lib/hooks";
import { deleteStudent, updateStudent } from "@/lib/students";
import { studentProgressPercent, studentProgressPoints } from "@/lib/progress";
import { SplitProgressBar } from "@/components/ProgressBar";
import { StudentDetail } from "@/components/StudentDetail";
import { StudentFormModal } from "@/components/StudentFormModal";
import { ResetStudentPasswordModal } from "@/components/ResetStudentPasswordModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Student } from "@/types";

const PAGE_SIZE = 50;
const UNASSIGNED = "__unassigned__";

const inputClass =
  "rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary";

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// Admin only: every student in one searchable list. From here an admin can open a student's progress, change their
// account details or classroom, set a new sign-in password, or delete the account.
export default function StudentsPage() {
  const { role, roleLoading } = useAuth();
  const router = useRouter();
  const { classrooms } = useClassrooms();
  const { students, loading, error } = useStudents();

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [resetting, setResetting] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") router.replace("/dashboard");
  }, [roleLoading, role, router]);

  const classroomById = useMemo(() => new Map(classrooms.map((c) => [c.id, c])), [classrooms]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter === UNASSIGNED && s.classCode) return false;
      if (classFilter && classFilter !== UNASSIGNED && s.classCode !== classFilter) return false;
      if (!q) return true;
      const classroomName = (s.classCode ? classroomById.get(s.classCode)?.name : "") ?? "";
      return [s.fullName, s.username, s.email, classroomName, s.classCode ?? ""].some((v) =>
        v.toLowerCase().includes(q)
      );
    });
  }, [students, search, classFilter, classroomById]);

  if (roleLoading || !role || role !== "admin") {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  const selected = students.find((s) => s.id === selectedId) ?? null;

  const modals = (
    <>
      {editing && (
        <StudentFormModal
          mode="edit"
          student={editing}
          classrooms={classrooms}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await updateStudent(editing.id, input);
          }}
        />
      )}
      {resetting && <ResetStudentPasswordModal student={resetting} onClose={() => setResetting(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete student"
          message={`Permanently delete ${deleting.fullName}? This deletes their account and progress and cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteStudent(deleting.id);
            if (selectedId === deleting.id) setSelectedId(null);
            setDeleting(null);
          }}
        />
      )}
    </>
  );

  if (selected) {
    return (
      <>
        <StudentDetail
          student={selected}
          classroom={selected.classCode ? classroomById.get(selected.classCode) : undefined}
          peers={students}
          classrooms={classrooms}
          onBack={() => setSelectedId(null)}
          onEdit={() => setEditing(selected)}
          onDelete={() => setDeleting(selected)}
          onResetPassword={() => setResetting(selected)}
        />
        {modals}
      </>
    );
  }

  const shown = filtered.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Students</h1>
        <p className="mt-1 text-sm text-muted">
          Every student account. Search, open a student to see their classroom and progress, edit their details, or
          reset their password.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE); // a new search starts again at the top of the list
            }}
            placeholder="Search by name, username, email or classroom"
            aria-label="Search students"
            className={`${inputClass} w-full pl-9`}
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          aria-label="Filter by classroom"
          className={`${inputClass} sm:w-64`}
        >
          <option value="">All classrooms</option>
          <option value={UNASSIGNED}>Unassigned</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">
            {filtered.length === students.length
              ? `All students (${students.length})`
              : `${filtered.length} of ${students.length} students`}
          </h2>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-muted">Loading students...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {students.length === 0 ? "No students yet." : "No student matches your search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Classroom</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((student) => {
                  const classroom = student.classCode ? classroomById.get(student.classCode) : undefined;
                  const percent = studentProgressPercent(student);
                  const points = studentProgressPoints(student);
                  return (
                    <tr
                      key={student.id}
                      className="cursor-pointer border-t border-border hover:bg-surface-alt transition-colors"
                      onClick={() => setSelectedId(student.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{student.fullName}</p>
                        <p className="text-xs text-muted">
                          @{student.username} · {student.email}
                        </p>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {classroom ? (
                          <Link
                            href={`/classrooms/${classroom.id}`}
                            className="text-primary hover:underline"
                          >
                            {classroom.name}
                          </Link>
                        ) : student.classCode ? (
                          <span className="text-muted">{student.classCode}</span>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-28">
                            <SplitProgressBar lessonPoints={points.lesson} activityPoints={points.activity} />
                          </div>
                          <span className="text-xs text-muted">{percent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedId(student.id)}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-surface transition-colors"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(student)}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-surface transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetting(student)}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-surface transition-colors"
                          >
                            Reset password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > shown.length && (
          <div className="border-t border-border p-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors"
            >
              Show more ({filtered.length - shown.length} more)
            </button>
          </div>
        )}
      </div>

      {modals}
    </div>
  );
}
