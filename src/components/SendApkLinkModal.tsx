"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { authedFetch } from "@/lib/api-client";
import type { StaffMember } from "@/types";

interface SendResult {
  email: string;
  ok: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lets an admin e-mail the newest app version's permanent link to teachers (and other admins) by hand:
// tick people in the list, type any extra address, or send to everyone at once.
export function SendApkLinkModal({
  staff,
  onClose,
}: {
  staff: StaffMember[];
  onClose: () => void;
}) {
  const people = useMemo(
    () => staff.filter((m) => m.email).slice().sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [staff]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [typed, setTyped] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [sending, setSending] = useState<"selected" | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const allSelected = people.length > 0 && selected.size === people.length;
  const chosenCount = selected.size + typed.filter((e) => !people.some((p) => selected.has(p.uid) && p.email.toLowerCase() === e)).length;

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(people.map((p) => p.uid)));
  }

  function addEmail() {
    const email = emailInput.trim().toLowerCase();
    setInputError(null);
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setInputError("Not a valid email address.");
      return;
    }
    if (typed.includes(email)) {
      setInputError("Already added.");
      return;
    }
    setTyped((prev) => [...prev, email]);
    setEmailInput("");
  }

  async function send(mode: "selected" | "all") {
    setError(null);
    setResults(null);
    const emails = [
      ...people.filter((p) => selected.has(p.uid)).map((p) => p.email.toLowerCase()),
      ...typed,
    ];
    if (mode === "selected" && emails.length === 0) {
      setError("Tick at least one teacher or type an email address first.");
      return;
    }
    setSending(mode);
    try {
      const data = (await authedFetch("/api/apk-link", {
        method: "POST",
        body: JSON.stringify({ emails, all: mode === "all" }),
      })) as { version: string; results: SendResult[] };
      setResults(data.results);
      setVersion(data.version);
      const failed = new Set(data.results.filter((r) => !r.ok).map((r) => r.email));
      setTyped((prev) => prev.filter((e) => failed.has(e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong sending the emails. Please try again.");
    } finally {
      setSending(null);
    }
  }

  return (
    <Modal title="Send APK link" onClose={onClose} size="lg">
      <p className="text-xs text-muted">
        Emails the newest app version&apos;s download link. The link never expires and always gives the latest
        version.
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-muted">Teachers &amp; admins</label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={people.length === 0}
              className="h-4 w-4 accent-primary"
            />
            Select all
          </label>
        </div>

        {/* about five rows are visible; the rest scroll */}
        <div className="h-[19rem] overflow-y-auto rounded-lg border border-border bg-surface-alt">
          {people.length === 0 ? (
            <p className="p-4 text-sm text-muted">No staff accounts with an email yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {people.map((member) => (
                <li key={member.uid}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface">
                    <input
                      type="checkbox"
                      checked={selected.has(member.uid)}
                      onChange={() => toggle(member.uid)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{member.fullName}</span>
                      <span className="block truncate text-xs text-muted">{member.email}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        member.role === "admin" ? "bg-accent/10 text-accent" : "bg-surface text-muted"
                      }`}
                    >
                      {member.role === "admin" ? "Admin" : "Teacher"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-muted">Or type an email address</label>
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
            placeholder="name@example.com"
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
        {typed.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {typed.map((email) => (
              <li
                key={email}
                className="flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-alt px-2.5 py-1 text-xs text-foreground"
              >
                <span className="truncate">{email}</span>
                <button
                  type="button"
                  onClick={() => setTyped((prev) => prev.filter((e) => e !== email))}
                  aria-label={`Remove ${email}`}
                  className="shrink-0 text-muted hover:text-danger transition-colors"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {results && (
        <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface-alt p-3 text-xs">
          {version && <p className="font-medium text-foreground">Version {version}</p>}
          {results.map((r) => (
            <p key={r.email} className={`break-all ${r.ok ? "text-success" : "text-danger"}`}>
              {r.ok ? "Sent to " : "Failed for "}
              {r.email}
              {!r.ok && r.error ? `: ${r.error}` : ""}
            </p>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => send("all")}
          disabled={sending !== null || people.length === 0}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-alt disabled:opacity-60 transition-colors"
        >
          {sending === "all" ? "Sending..." : `Send to all (${people.length})`}
        </button>
        <button
          type="button"
          onClick={() => send("selected")}
          disabled={sending !== null || chosenCount === 0}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {sending === "selected" ? "Sending..." : `Send to selected${chosenCount > 0 ? ` (${chosenCount})` : ""}`}
        </button>
      </div>
    </Modal>
  );
}
