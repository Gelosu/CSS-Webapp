"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useClassrooms, useStaff } from "@/lib/hooks";
import { deleteStaffMember, updateStaffRole } from "@/lib/staff";
import { TeacherFormModal } from "@/components/TeacherFormModal";
import { StaffEditModal } from "@/components/StaffEditModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { StaffMember, StaffRole } from "@/types";

export default function RolesPage() {
  const { user, role, roleLoading } = useAuth();
  const router = useRouter();
  const { staff, loading } = useStaff();
  const { classrooms } = useClassrooms();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<StaffMember | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const classroomNameByCode = useMemo(
    () => new Map(classrooms.map((c) => [c.code, c.name])),
    [classrooms]
  );

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") {
      router.replace("/dashboard");
    }
  }, [roleLoading, role, router]);

  if (roleLoading || !role || role !== "admin") {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  async function handleRoleChange(uid: string, newRole: StaffRole) {
    setUpdatingUid(uid);
    setError(null);
    try {
      await updateStaffRole(uid, newRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setUpdatingUid(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Role &amp; Permission
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage teacher and admin accounts for this portal.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
        >
          + Add Teacher
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="rounded-2xl border border-border bg-surface">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading staff...</p>
        ) : staff.length === 0 ? (
          <p className="p-6 text-sm text-muted">No staff accounts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Classroom</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const isSelf = member.uid === user?.uid;
                  return (
                    <tr key={member.uid} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{member.fullName}</p>
                        <p className="text-xs text-muted">{member.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            member.role === "admin"
                              ? "bg-accent/10 text-accent"
                              : "bg-surface-alt text-muted"
                          }`}
                        >
                          {member.role === "admin" ? "Admin" : "Teacher"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {member.role === "admin"
                          ? "—"
                          : member.classCode
                          ? classroomNameByCode.get(member.classCode) ?? member.classCode
                          : "Unassigned"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {isSelf ? (
                            <span className="text-xs text-muted">You</span>
                          ) : (
                            <>
                              <select
                                value={member.role}
                                disabled={updatingUid === member.uid}
                                onChange={(e) =>
                                  handleRoleChange(member.uid, e.target.value as StaffRole)
                                }
                                className="rounded-lg border border-border bg-surface-alt px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                              >
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => setEditingMember(member)}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-surface-alt transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingMember(member)}
                                className="rounded-lg border border-danger/40 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && <TeacherFormModal onClose={() => setShowAddModal(false)} />}
      {editingMember && (
        <StaffEditModal member={editingMember} onClose={() => setEditingMember(null)} />
      )}
      {deletingMember && (
        <ConfirmDialog
          title="Delete account"
          message={`Permanently delete ${deletingMember.fullName}'s account (${deletingMember.email})? This deletes their sign-in and cannot be undone. Their classroom and its students are not affected.`}
          confirmLabel="Delete"
          onCancel={() => setDeletingMember(null)}
          onConfirm={async () => {
            await deleteStaffMember(deletingMember.uid);
            setDeletingMember(null);
          }}
        />
      )}
    </div>
  );
}
