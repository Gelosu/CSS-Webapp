"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAllTickets, useOwnTickets } from "@/lib/hooks";
import { createTicket, resolveTicket } from "@/lib/support-tickets";
import { TicketThread } from "@/components/TicketThread";
import type { SupportTicket } from "@/types";

function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        status === "resolved" ? "bg-surface-alt text-muted" : "bg-success/10 text-success"
      }`}
    >
      {status === "resolved" ? "Resolved" : "Open"}
    </span>
  );
}

function TicketListItem({
  ticket,
  active,
  onClick,
  subtitle,
}: {
  ticket: SupportTicket;
  active: boolean;
  onClick: () => void;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-surface hover:bg-surface-alt"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">
          {subtitle ?? ticket.teacherName}
        </p>
        <StatusBadge status={ticket.status} />
      </div>
      <p className="mt-1 truncate text-xs text-muted">{ticket.description}</p>
      <p className="mt-1 text-[10px] text-muted">
        {new Date(ticket.updatedAt).toLocaleString()}
      </p>
    </button>
  );
}

function TeacherSupportView({
  uid,
  fullName,
  email,
}: {
  uid: string;
  fullName: string;
  email: string;
}) {
  const { tickets, loading } = useOwnTickets(uid);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTicket({
        teacherId: uid,
        teacherName: fullName,
        teacherEmail: email,
        description: description.trim(),
      });
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send report.");
    } finally {
      setSubmitting(false);
    }
  }

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-border bg-surface p-5"
      >
        <h2 className="text-sm font-semibold text-foreground">Report an issue to admin</h2>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Your email</label>
          <input
            value={email}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-muted"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the issue..."
            className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !description.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {submitting ? "Sending..." : "Send report"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Your reports</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted">You haven&apos;t sent any reports yet.</p>
        ) : selected ? (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <button
              onClick={() => setSelectedId(null)}
              className="mb-3 text-sm text-muted hover:text-foreground transition-colors"
            >
              ← Back to your reports
            </button>
            <TicketThread
              ticket={selected}
              viewerRole="teacher"
              viewerId={uid}
              viewerName={fullName}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <TicketListItem
                key={t.id}
                ticket={t}
                active={false}
                subtitle={new Date(t.createdAt).toLocaleDateString()}
                onClick={() => setSelectedId(t.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminSupportView({ uid, fullName }: { uid: string; fullName: string }) {
  const { tickets, loading } = useAllTickets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  async function handleResolve() {
    if (!selected) return;
    await resolveTicket(selected.id);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Teacher reports</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted">No reports yet.</p>
        ) : (
          tickets.map((t) => (
            <TicketListItem
              key={t.id}
              ticket={t}
              active={t.id === selectedId}
              onClick={() => setSelectedId(t.id)}
            />
          ))
        )}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5">
        {!selected ? (
          <p className="text-sm text-muted">Select a report to view the conversation.</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {selected.teacherName}
                </p>
                <p className="truncate text-xs text-muted">{selected.teacherEmail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={selected.status} />
                {selected.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={handleResolve}
                    className="rounded-lg border border-success/40 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10 transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
            <TicketThread
              ticket={selected}
              viewerRole="admin"
              viewerId={uid}
              viewerName={fullName}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function SupportPage() {
  const { user, role, roleLoading } = useAuth();

  if (roleLoading || !role) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  const fullName = user?.displayName || user?.email || "Unknown";
  const email = user?.email ?? "";
  const uid = user?.uid ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Support</h1>
        <p className="mt-1 text-sm text-muted">
          {role === "admin"
            ? "Review and respond to reports from teachers."
            : "Report an issue and hear back from an admin."}
        </p>
      </div>
      {role === "admin" ? (
        <AdminSupportView uid={uid} fullName={fullName} />
      ) : (
        <TeacherSupportView uid={uid} fullName={fullName} email={email} />
      )}
    </div>
  );
}
