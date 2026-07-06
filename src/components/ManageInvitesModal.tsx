"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { useDownloadInvites } from "@/lib/hooks";
import { authedFetch } from "@/lib/api-client";
import type { DownloadInvite } from "@/types";

interface SendResult {
  email: string;
  ok: boolean;
  error?: string;
}

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

  const [emailInput, setEmailInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);

  async function sendInvites(emails: string[]): Promise<SendResult[]> {
    const data = (await authedFetch("/api/download-invites", {
      method: "POST",
      body: JSON.stringify({ classroomId, emails }),
    })) as { results: SendResult[] };
    return data.results;
  }

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

  function addEmail() {
    const email = emailInput.trim().toLowerCase();
    setInputError(null);
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setInputError("Not a valid email address.");
      return;
    }
    if (pendingEmails.includes(email)) {
      setInputError("Already added.");
      return;
    }
    setPendingEmails((prev) => [...prev, email]);
    setEmailInput("");
  }

  function removeEmail(email: string) {
    setPendingEmails((prev) => prev.filter((e) => e !== email));
  }

  async function handleSend() {
    setError(null);
    setSendResults(null);
    if (pendingEmails.length === 0) return;

    setSubmitting(true);
    try {
      const results = await sendInvites(pendingEmails);
      setSendResults(results);
      const failed = new Set(results.filter((r) => !r.ok).map((r) => r.email));
      setPendingEmails((prev) => prev.filter((e) => failed.has(e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong sending the emails. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend(email: string) {
    setResendingEmail(email);
    setSendResults(null);
    try {
      const results = await sendInvites([email]);
      setSendResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend.");
    } finally {
      setResendingEmail(null);
    }
  }

  return (
    <Modal title="Manage download invites" onClose={onClose} size="lg">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Student emails</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setInputError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              placeholder="student@example.com"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={addEmail}
              disabled={!emailInput.trim()}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-alt disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
          {inputError && <p className="mt-1 text-xs text-danger">{inputError}</p>}
        </div>

        {pendingEmails.length > 0 && (
          <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-surface-alt p-2">
            {pendingEmails.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between gap-2 rounded-md bg-surface px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 truncate text-foreground">{email}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  aria-label={`Remove ${email}`}
                  className="shrink-0 text-muted hover:text-danger transition-colors"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted">
          Add each student&apos;s email to the list, then send. Each gets a one-time
          download link with the class code and a Download APK button — after it&apos;s
          opened once, they&apos;ll need a &ldquo;Resend&rdquo; to download again.
        </p>

        {error && <p className="text-sm text-danger">{error}</p>}

        {sendResults && (
          <div className="space-y-1 rounded-lg border border-border bg-surface-alt p-3 text-xs">
            {sendResults.map((r) => (
              <p key={r.email} className={r.ok ? "text-success" : "text-danger"}>
                {r.ok ? "Sent to " : "Failed for "}
                {r.email}
                {!r.ok && r.error ? `: ${r.error}` : ""}
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting || pendingEmails.length === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {submitting
              ? "Sending..."
              : `Send email${pendingEmails.length > 1 ? "s" : ""}${
                  pendingEmails.length > 0 ? ` (${pendingEmails.length})` : ""
                }`}
          </button>
        </div>
      </div>

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
