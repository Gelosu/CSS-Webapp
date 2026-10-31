"use client";

import type { Classroom } from "@/types";

// A teacher can have several classrooms: tick as many as needed (about five rows show, the rest scroll).
export function ClassroomMultiSelect({
  classrooms,
  value,
  onChange,
}: {
  classrooms: Classroom[];
  value: string[];
  onChange: (codes: string[]) => void;
}) {
  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  }

  if (classrooms.length === 0) {
    return <p className="rounded-lg border border-border bg-surface-alt p-3 text-sm text-muted">No classrooms yet.</p>;
  }

  return (
    <div className="max-h-[14rem] overflow-y-auto rounded-lg border border-border bg-surface-alt">
      <ul className="divide-y divide-border">
        {classrooms.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface">
              <input
                type="checkbox"
                checked={value.includes(c.code)}
                onChange={() => toggle(c.code)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{c.name}</span>
              <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 font-mono text-xs tracking-widest text-accent">{c.code}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
