"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { authedFetch } from "@/lib/api-client";

interface Account {
  uid: string;
  fullName: string;
  email: string;
}

// Teacher/admin accounts must not appear as students. This lists any that do and removes them from the student
// list after a confirmation (their sign-in and teacher record stay).
export function StaffAsStudentsModal({ onClose }: { onClose: () => void }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    authedFetch("/api/staff/cleanup-students", { method: "POST", body: JSON.stringify({ dryRun: true }) })
      .then((data) => setAccounts((data as { accounts: Account[] }).accounts))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not check the student list."));
  }, []);

  async function remove() {
    setRemoving(true);
    setError(null);
    try {
      await authedFetch("/api/staff/cleanup-students", { method: "POST", body: JSON.stringify({ dryRun: false }) });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove them.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Modal title="Teachers listed as students" onClose={onClose}>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && accounts === null && <p className="text-sm text-muted">Checking the student list...</p>}
      {done && <p className="text-sm text-success">Removed from the student list.</p>}
      {accounts && accounts.length === 0 && !done && (
        <p className="text-sm text-muted">No teacher or admin account is listed as a student.</p>
      )}
      {accounts && accounts.length > 0 && !done && (
        <>
          <p className="text-xs text-muted">
            These teacher/admin accounts also have a student record. Removing deletes only that student record (and its
            lesson progress). Their sign-in and teacher account stay.
          </p>
          <ul className="mt-3 max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface-alt">
            {accounts.map((a) => (
              <li key={a.uid} className="px-3 py-2">
                <p className="truncate text-sm font-medium text-foreground">{a.fullName || "(no name)"}</p>
                <p className="truncate text-xs text-muted">{a.email}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-alt transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={removing}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {removing ? "Removing..." : `Remove ${accounts.length} from students`}
            </button>
          </div>
        </>
      )}
      {(done || (accounts && accounts.length === 0)) && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </Modal>
  );
}
