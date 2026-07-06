"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useClassrooms, useStudents } from "@/lib/hooks";
import {
  createClassroom,
  deleteClassroom,
  updateClassroom,
} from "@/lib/classrooms";
import { claimClassroom } from "@/lib/staff";
import { ClassroomFormModal } from "@/components/ClassroomFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ClassroomCard } from "@/components/ClassroomCard";
import type { Classroom } from "@/types";

export default function ClassroomsPage() {
  const { role, classCode, refreshRole } = useAuth();
  const { classrooms: allClassrooms, loading, error } = useClassrooms();
  const { students } = useStudents();

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [deletingClassroom, setDeletingClassroom] = useState<Classroom | null>(null);

  // Teachers only ever see the one classroom they're assigned to.
  const classrooms = useMemo(
    () =>
      role === "teacher"
        ? allClassrooms.filter((c) => c.code === classCode)
        : allClassrooms,
    [allClassrooms, role, classCode]
  );

  // A teacher with no classroom yet can create one — it becomes theirs
  // automatically. Once they have one, they're done; one teacher, one class.
  const canCreateClassroom = role === "admin" || (role === "teacher" && !classCode);

  const filteredClassrooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return classrooms;
    return classrooms.filter((c) => c.name.toLowerCase().includes(term));
  }, [classrooms, search]);

  const studentCountByClassroom = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of students) {
      if (!s.classCode) continue;
      counts.set(s.classCode, (counts.get(s.classCode) ?? 0) + 1);
    }
    return counts;
  }, [students]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Classrooms</h1>
          <p className="mt-1 text-sm text-muted">
            Create classrooms and manage which students are enrolled.
          </p>
        </div>
        {canCreateClassroom && (
          <button
            onClick={() => setShowAddModal(true)}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
          >
            + New Classroom
          </button>
        )}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search classrooms by name..."
        className="w-full rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary sm:max-w-sm"
      />

      {loading ? (
        <p className="text-sm text-muted">Loading classrooms...</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : classrooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">No classrooms yet.</p>
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">No classrooms match &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClassrooms.map((classroom) => (
            <ClassroomCard
              key={classroom.id}
              classroom={classroom}
              studentCount={studentCountByClassroom.get(classroom.id) ?? 0}
              onEdit={() => setEditingClassroom(classroom)}
              onDelete={() => setDeletingClassroom(classroom)}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <ClassroomFormModal
          mode="create"
          onClose={() => setShowAddModal(false)}
          onSubmit={async (input, code) => {
            await createClassroom(input, code);
            if (role === "teacher") {
              await claimClassroom(code);
              await refreshRole();
            }
          }}
        />
      )}

      {editingClassroom && (
        <ClassroomFormModal
          mode="edit"
          classroom={editingClassroom}
          onClose={() => setEditingClassroom(null)}
          onSubmit={async (input) => {
            await updateClassroom(editingClassroom.id, input);
          }}
        />
      )}

      {deletingClassroom && (
        <ConfirmDialog
          title="Delete classroom"
          message={`Delete "${deletingClassroom.name}"? Students enrolled here will become unassigned.`}
          confirmLabel="Delete"
          onCancel={() => setDeletingClassroom(null)}
          onConfirm={async () => {
            await deleteClassroom(deletingClassroom.id);
            setDeletingClassroom(null);
          }}
        />
      )}
    </div>
  );
}
