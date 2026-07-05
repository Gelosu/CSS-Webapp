"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { useDownloadInvites } from "@/lib/hooks";
import { createDownloadInvite } from "@/lib/download-invites";
import type { DownloadInvite } from "@/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function latestByEmail(invites: DownloadInvite[]): DownloadInvite[] {
  const latest = new Map<string, DownloadInvite>();
  for (const invite of invites) {
    const existing = latest.get(invite.email);
    if (!existing || invite.createdAt > existing.createdAt) {
      latest.set(invite.email, invite);
    }
  }
  return Array.from(latest.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export function ManageInvitesModal({
  classroomId,
  onClose,
}: {
  classroomId: string;
  onClose: () => void;
}) {
  const { invites, loading } = useDownloadInvites(classroomId);
  const rows = useMemo(() => latestByEmail(invites), [invites]);

  const [emailsText, setEmailsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function inviteLink(token: string) {
    return typeof window !== "undefined"
      ? `${window.location.origin}/download/${token}`
      : token;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(inviteLink(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const emails = Array.from(
      new Set(
        emailsText
          .split(/[\n,]/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    );
    if (emails.length === 0) return;

    const invalid = emails.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length > 0) {
      setError(`Not a valid email: ${invalid.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      for (const email of emails) {
        await createDownloadInvite(classroomId, email);
      }
      setEmailsText("");
    } catch {
      setError("Something went wrong generating some links. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend(email: string) {
    setResendingEmail(email);
    try {
      await createDownloadInvite(classroomId, email);
    } finally {
      setResendingEmail(null);
    }
  }

  return (
    <Modal title="Manage download invites" onClose={onClose} size="lg">
      <form onSubmit={handleAdd} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Student emails</label>
          <textarea
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            rows={3}
            placeholder="one per line, or comma-separated"
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted">
            Generates a one-time download link per email. Each link works once — after
            it&apos;s opened, that student needs a &ldquo;Resend&rdquo; before they can
            download again. Automatic sending isn&apos;t wired up yet, so copy each link
            below and send it yourself for now.
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !emailsText.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {submitting ? "Generating..." : "Generate links"}
          </button>
        </div>
      </form>

      <div className="mt-6 max-h-72 overflow-y-auto rounded-lg border border-border">
        {loading ? (
          <p className="p-4 text-sm text-muted">Loading invites...</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-muted">No invites yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((invite) => (
                  <tr key={invite.email} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-foreground">
                      {invite.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          invite.status === "used"
                            ? "bg-surface-alt text-muted"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {invite.status === "used" ? "Used" : "Pending"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {invite.status !== "used" && (
                          <button
                            type="button"
                            onClick={() => copyLink(invite.id)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground hover:bg-surface-alt transition-colors"
                          >
                            {copiedToken === invite.id ? "Copied!" : "Copy link"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResend(invite.email)}
                          disabled={resendingEmail === invite.email}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground hover:bg-surface-alt disabled:opacity-50 transition-colors"
                        >
                          {resendingEmail === invite.email ? "..." : "Resend"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
