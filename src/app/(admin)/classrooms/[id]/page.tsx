"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useClassrooms, useStudents } from "@/lib/hooks";
import {
  createStudent,
  deleteStudent,
  setStudentClassCode,
  updateStudent,
} from "@/lib/students";
import { studentProgressPercent } from "@/lib/progress";
import { ProgressBar } from "@/components/ProgressBar";
import { StudentFormModal } from "@/components/StudentFormModal";
import { StudentDetail } from "@/components/StudentDetail";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { JoinLinkBadge } from "@/components/JoinLinkBadge";
import { ClassroomOverview } from "@/components/ClassroomOverview";
import { ManageInvitesModal } from "@/components/ManageInvitesModal";
import type { Student } from "@/types";

type Tab = "students" | "overview";

export default function ClassroomDetailPage() {
  const params = useParams<{ id: string }>();
  const classroomId = params.id;

  const { classrooms } = useClassrooms();
  const { students, loading } = useStudents();

  const [tab, setTab] = useState<Tab>("students");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [enrollSelection, setEnrollSelection] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const classroom = classrooms.find((c) => c.id === classroomId);
  const roster = useMemo(
    () => students.filter((s) => s.classCode === classroomId),
    [students, classroomId]
  );
  const unassignedOrOther = useMemo(
    () => students.filter((s) => s.classCode !== classroomId),
    [students, classroomId]
  );
  const selectedStudent = roster.find((s) => s.id === selectedStudentId) ?? null;

  if (!loading && !classroom) {
    return (
      <div className="space-y-4">
        <Link href="/classrooms" className="text-sm text-muted hover:text-foreground">
          ← Back to classrooms
        </Link>
        <p className="text-sm text-danger">Classroom not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/classrooms" className="text-sm text-muted hover:text-foreground">
          ← Back to classrooms
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">
              {classroom?.name ?? "Loading..."}
            </h1>
            {classroom?.description && (
              <p className="mt-1 text-sm text-muted">{classroom.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
          >
            + Create Student
          </button>
        </div>
        {classroom && (
          <div className="mt-4 flex max-w-2xl items-start gap-3">
            <div className="max-w-sm flex-1">
              <JoinLinkBadge code={classroom.code} />
            </div>
            <button
              onClick={() => setShowInvitesModal(true)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
            >
              Manage download invites
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(
          [
            ["students", "Students"],
            ["overview", "Overview"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === value
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && classroom ? (
        <ClassroomOverview classroomId={classroom.id} />
      ) : selectedStudent ? (
        <StudentDetail
          student={selectedStudent}
          classroom={classroom}
          onBack={() => setSelectedStudentId(null)}
          onEdit={() => setEditingStudent(selectedStudent)}
          onDelete={() => setDeletingStudent(selectedStudent)}
        />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="mb-2 text-sm font-semibold text-foreground">
              Enroll an existing student
            </p>
            <div className="flex gap-3">
              <select
                value={enrollSelection}
                onChange={(e) => setEnrollSelection(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a student...</option>
                {unassignedOrOther.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.classCode ? "enrolled elsewhere" : "unassigned"})
                  </option>
                ))}
              </select>
              <button
                disabled={!enrollSelection}
                onClick={async () => {
                  await setStudentClassCode(enrollSelection, classroomId);
                  setEnrollSelection("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt disabled:opacity-50 transition-colors"
              >
                Enroll
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold text-foreground">
                Enrolled Students ({roster.length})
              </h2>
            </div>

            {loading ? (
              <p className="p-6 text-sm text-muted">Loading students...</p>
            ) : roster.length === 0 ? (
              <p className="p-6 text-sm text-muted">No students enrolled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Progress</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((student) => {
                      const percent = studentProgressPercent(student);
                      return (
                        <tr
                          key={student.id}
                          className="cursor-pointer border-t border-border hover:bg-surface-alt transition-colors"
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{student.fullName}</p>
                            <p className="text-xs text-muted">{student.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-32">
                                <ProgressBar percent={percent} />
                              </div>
                              <span className="text-xs text-muted">{percent}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs text-primary">View →</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <StudentFormModal
          mode="create"
          classrooms={classrooms}
          defaultClassCode={classroomId}
          onClose={() => setShowAddModal(false)}
          onSubmit={async (input) => {
            await createStudent(input);
          }}
        />
      )}

      {editingStudent && (
        <StudentFormModal
          mode="edit"
          student={editingStudent}
          classrooms={classrooms}
          onClose={() => setEditingStudent(null)}
          onSubmit={async (input) => {
            await updateStudent(editingStudent.id, input);
          }}
        />
      )}

      {showInvitesModal && classroom && (
        <ManageInvitesModal
          classroomId={classroom.id}
          onClose={() => setShowInvitesModal(false)}
        />
      )}

      {deletingStudent && (
        <ConfirmDialog
          title="Delete student"
          message={`Permanently delete ${deletingStudent.fullName}? This deletes their account and cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeletingStudent(null)}
          onConfirm={async () => {
            await deleteStudent(deletingStudent.id);
            setDeletingStudent(null);
            setSelectedStudentId(null);
          }}
        />
      )}
    </div>
  );
}
