"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { REPORT_FORMATS, emailReport, type ReportFormat } from "@/lib/report";
import type { ReportData } from "@/lib/report/model";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function ReportEmailModal({
  data,
  ownEmail,
  onClose,
}: {
  data: ReportData;
  ownEmail: string | null;
  onClose: () => void;
}) {
  const [recipients, setRecipients] = useState("");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [subject, setSubject] = useState(`${data.title} — ${data.subtitle}`);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string[] | null>(null);

  const emails = parseEmails(recipients);
  const invalid = emails.filter((e) => !EMAIL_RE.test(e));

  async function send() {
    setError(null);
    if (emails.length === 0) return setError("Add at least one email address.");
    if (invalid.length > 0) return setError(`Not a valid email: ${invalid.join(", ")}`);
    if (emails.length > 10) return setError("You can send to at most 10 addresses at a time.");
    setSending(true);
    try {
      await emailReport(format, data, { to: emails, subject: subject.trim(), note: note.trim() });
      setSentTo(emails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the report.");
    } finally {
      setSending(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary";

  if (sentTo) {
    return (
      <Modal title="Report sent" onClose={onClose}>
        <div className="space-y-4 py-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-xl text-success">
            ✓
          </div>
          <p className="text-sm text-foreground">
            The {REPORT_FORMATS.find((f) => f.value === format)?.label} report was emailed to
          </p>
          <p className="break-words text-sm font-medium text-primary">{sentTo.join(", ")}</p>
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Send report by email" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-alt px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">{data.title}</p>
          <p className="text-xs text-muted">{data.subtitle}</p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="report-to" className="text-xs font-medium text-muted">
              Send to
            </label>
            {ownEmail && !emails.includes(ownEmail.toLowerCase()) && (
              <button
                type="button"
                onClick={() => setRecipients((r) => (r.trim() ? `${r.trim()}, ${ownEmail}` : ownEmail))}
                className="text-xs text-primary hover:underline"
              >
                + Add my email
              </button>
            )}
          </div>
          <textarea
            id="report-to"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            rows={2}
            placeholder="name@example.com, another@example.com"
            className={inputClass}
          />
          <p className={`mt-1 text-[11px] ${invalid.length ? "text-danger" : "text-muted"}`}>
            {invalid.length
              ? `Not a valid email: ${invalid.join(", ")}`
              : emails.length
              ? `${emails.length} recipient${emails.length === 1 ? "" : "s"}`
              : "Separate several addresses with commas, spaces or new lines (up to 10)."}
          </p>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted">File type</p>
          <div className="grid grid-cols-3 gap-2">
            {REPORT_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                aria-pressed={format === f.value}
                className={`rounded-xl border px-2 py-2 text-center text-xs font-semibold transition-colors ${
                  format === f.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface-alt text-foreground hover:border-primary"
                }`}
              >
                {f.label}
                <span className="mt-0.5 block text-[10px] font-normal text-muted">{f.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="report-subject" className="mb-1 block text-xs font-medium text-muted">
            Subject
          </label>
          <input
            id="report-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="report-note" className="mb-1 block text-xs font-medium text-muted">
            Message <span className="font-normal">(optional)</span>
          </label>
          <textarea
            id="report-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Add a short note to go with the report…"
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {sending ? "Sending…" : "Send report"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
