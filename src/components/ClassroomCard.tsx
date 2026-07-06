"use client";

import { useState } from "react";
import Link from "next/link";
import { JoinLinkBadge } from "./JoinLinkBadge";
import type { Classroom } from "@/types";

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 13.09H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function ClassroomCard({
  classroom,
  studentCount,
  onEdit,
  onDelete,
}: {
  classroom: Classroom;
  studentCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-foreground">{classroom.name}</h2>
          {classroom.description && (
            <p className="mt-1 text-xs text-muted line-clamp-2">{classroom.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-primary">
            {studentCount} students
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Classroom options"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-alt hover:text-foreground transition-colors"
            >
              <GearIcon />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <JoinLinkBadge code={classroom.code} />
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          href={`/classrooms/${classroom.id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Manage students →
        </Link>
      </div>
    </div>
  );
}
