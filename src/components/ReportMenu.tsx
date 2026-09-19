"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { REPORT_FORMATS, downloadReport, type ReportFormat } from "@/lib/report";
import { buildReport, type ReportData, type ReportScope } from "@/lib/report/model";
import { ReportEmailModal } from "./ReportEmailModal";
import type { Classroom, Student } from "@/types";

export interface ReportScopeOption {
  label: string;
  scope: ReportScope;
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

// "Download report" button + popover. `students` is everything the current
// user is allowed to see (already scoped for teachers), and each scope option
// is one report the user can pick — a single student, a classroom, or all.
export function ReportMenu({
  label = "Download report",
  scopes,
  students,
  classrooms,
}: {
  label?: string;
  scopes: ReportScopeOption[];
  students: Student[];
  classrooms: Classroom[];
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scopeIndex, setScopeIndex] = useState(0);
  const [includePages, setIncludePages] = useState(true);
  const [busy, setBusy] = useState<ReportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailData, setEmailData] = useState<ReportData | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = scopes[Math.min(scopeIndex, scopes.length - 1)];
  const isGroup = current.scope.type !== "student";

  function buildData() {
    const data = buildReport({
      scope: current.scope,
      students,
      classrooms,
      preparedBy: user?.displayName || user?.email || "",
      includeStudentPages: isGroup && includePages,
    });
    if (!data) throw new Error("Nothing to report for this selection.");
    return data;
  }

  function openEmail() {
    setError(null);
    try {
      setEmailData(buildData());
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare the report.");
    }
  }

  async function generate(format: ReportFormat) {
    setError(null);
    setBusy(format);
    try {
      await downloadReport(format, buildData());
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the report.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
      >
        <DownloadIcon />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Download progress report"
          className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-border bg-surface p-4 shadow-xl"
        >
          <p className="text-sm font-semibold text-foreground">Progress report</p>
          <p className="mt-0.5 text-xs text-muted">
            Includes charts, lesson &amp; activity breakdowns and remarks.
          </p>

          {scopes.length > 1 && (
            <select
              value={scopeIndex}
              onChange={(e) => setScopeIndex(Number(e.target.value))}
              className="mt-3 w-full rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {scopes.map((s, i) => (
                <option key={i} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          )}

          {isGroup && (
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={includePages}
                onChange={(e) => setIncludePages(e.target.checked)}
                className="mt-0.5 accent-[var(--primary)]"
              />
              <span>
                Add an individual report for each student
                <span className="block text-[11px]">One page (or sheet in Excel) per student.</span>
              </span>
            </label>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            {REPORT_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                disabled={busy !== null}
                onClick={() => generate(f.value)}
                title={f.hint}
                className="rounded-xl border border-border bg-surface-alt px-2 py-2.5 text-center text-xs font-semibold text-foreground hover:border-primary hover:text-primary disabled:opacity-60 transition-colors"
              >
                {busy === f.value ? "Creating…" : f.label}
                <span className="mt-0.5 block text-[10px] font-normal text-muted">{f.hint}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openEmail}
            disabled={busy !== null}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-60 transition-colors"
          >
            <MailIcon />
            Send by email…
          </button>

          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </div>
      )}

      {emailData && (
        <ReportEmailModal
          data={emailData}
          ownEmail={user?.email ?? null}
          onClose={() => setEmailData(null)}
        />
      )}
    </div>
  );
}
