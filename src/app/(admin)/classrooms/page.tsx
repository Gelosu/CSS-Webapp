"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useClassrooms, useStudents } from "@/lib/hooks";
import {
  createClassroom,
  deleteClassroom,
  updateClassroom,
} from "@/lib/classrooms";
import { ClassroomFormModal } from "@/components/ClassroomFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { JoinLinkBadge } from "@/components/JoinLinkBadge";
import type { Classroom } from "@/types";

export default function ClassroomsPage() {
  const { classrooms, loading, error } = useClassrooms();
  const { students } = useStudents();

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [deletingClassroom, setDeletingClassroom] = useState<Classroom | null>(null);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Classrooms</h1>
          <p className="mt-1 text-sm text-muted">
            Create classrooms and manage which students are enrolled.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
        >
          + New Classroom
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search classrooms by name..."
        className="w-full max-w-sm rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
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
            <div
              key={classroom.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">{classroom.name}</h2>
                  {classroom.description && (
                    <p className="mt-1 text-xs text-muted line-clamp-2">
                      {classroom.description}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-primary">
                  {studentCountByClassroom.get(classroom.id) ?? 0} students
                </span>
              </div>

              <div className="mt-4">
                <JoinLinkBadge code={classroom.code} />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href={`/classrooms/${classroom.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Manage students →
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingClassroom(classroom)}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground hover:bg-surface-alt transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingClassroom(classroom)}
                    className="rounded-lg border border-danger/40 px-2.5 py-1 text-xs text-danger hover:bg-danger/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <ClassroomFormModal
          mode="create"
          onClose={() => setShowAddModal(false)}
          onSubmit={async (input, code) => {
            await createClassroom(input, code);
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
