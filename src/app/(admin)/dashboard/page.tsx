"use client";

import { useMemo, useState } from "react";
import { useClassrooms, useStudents } from "@/lib/hooks";
import { createStudent, deleteStudent, updateStudent } from "@/lib/students";
import { studentProgressPercent, summarizeProgress } from "@/lib/progress";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { StudentFormModal } from "@/components/StudentFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StudentDetail } from "@/components/StudentDetail";
import type { Student } from "@/types";

export default function DashboardPage() {
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { classrooms } = useClassrooms();

  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const classroomById = useMemo(
    () => new Map(classrooms.map((c) => [c.id, c])),
    [classrooms]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.username.toLowerCase().includes(term)
    );
  }, [students, search]);

  const aggregate = useMemo(() => {
    const totalStudents = students.length;
    const totalClassrooms = classrooms.length;
    const avgProgress = totalStudents
      ? Math.round(
          students.reduce((sum, s) => sum + studentProgressPercent(s), 0) /
            totalStudents
        )
      : 0;
    const totalActivitiesCompleted = students.reduce(
      (sum, s) => sum + summarizeProgress(s.learningProgress).activitiesCompleted,
      0
    );
    return { totalStudents, totalClassrooms, avgProgress, totalActivitiesCompleted };
  }, [students, classrooms]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  if (selectedStudent) {
    return (
      <>
        <StudentDetail
          student={selectedStudent}
          classroom={classroomById.get(selectedStudent.classCode ?? "")}
          onBack={() => setSelectedStudentId(null)}
          onEdit={() => setEditingStudent(selectedStudent)}
          onDelete={() => setDeletingStudent(selectedStudent)}
        />
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
        {deletingStudent && (
          <ConfirmDialog
            title="Delete student"
            message={`Remove ${deletingStudent.fullName} permanently? This deletes their account and cannot be undone.`}
            confirmLabel="Delete"
            onCancel={() => setDeletingStudent(null)}
            onConfirm={async () => {
              await deleteStudent(deletingStudent.id);
              setDeletingStudent(null);
              setSelectedStudentId(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Overview of all students enrolled in the course app.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
        >
          + Add Student
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={aggregate.totalStudents} />
        <StatCard label="Total Classrooms" value={aggregate.totalClassrooms} />
        <StatCard label="Average Progress" value={`${aggregate.avgProgress}%`} />
        <StatCard
          label="Activities Completed"
          value={aggregate.totalActivitiesCompleted}
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Students</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="w-64 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {studentsLoading ? (
          <p className="p-6 text-sm text-muted">Loading students...</p>
        ) : studentsError ? (
          <p className="p-6 text-sm text-danger">{studentsError}</p>
        ) : filteredStudents.length === 0 ? (
          <p className="p-6 text-sm text-muted">No students found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Classroom</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const percent = studentProgressPercent(student);
                  const classroom = classroomById.get(student.classCode ?? "");
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
                      <td className="px-4 py-3 text-muted">
                        {classroom?.name ?? "Unassigned"}
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

      {showAddModal && (
        <StudentFormModal
          mode="create"
          classrooms={classrooms}
          onClose={() => setShowAddModal(false)}
          onSubmit={async (input) => {
            await createStudent(input);
          }}
        />
      )}
    </div>
  );
}
