"use client";

import { useState, type FormEvent } from "react";
import { useTicketMessages } from "@/lib/hooks";
import { sendMessage } from "@/lib/support-tickets";
import type { StaffRole, SupportTicket } from "@/types";

export function TicketThread({
  ticket,
  viewerRole,
  viewerId,
  viewerName,
}: {
  ticket: SupportTicket;
  viewerRole: StaffRole;
  viewerId: string;
  viewerName: string;
}) {
  const { messages, loading } = useTicketMessages(ticket.id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(
        ticket.id,
        { from: viewerRole, authorId: viewerId, authorName: viewerName, text: text.trim() },
        ticket.status
      );
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="rounded-xl border border-border bg-surface-alt p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Original report
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {ticket.description}
        </p>
      </div>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-sm text-muted">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted">No replies yet.</p>
        ) : (
          messages.map((m) => {
            const isOwn = m.from === viewerRole;
            return (
              <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    isOwn
                      ? "bg-primary text-on-primary"
                      : "border border-border bg-surface text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isOwn ? "text-on-primary/70" : "text-muted"
                    }`}
                  >
                    {m.authorName} · {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a reply..."
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
