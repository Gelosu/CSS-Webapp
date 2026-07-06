"use client";

import { useState } from "react";

export function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface-alt px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted">
        Your email
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {email}
        </p>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-foreground hover:bg-surface transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Copy this and paste it when the app asks for your email during sign-up.
      </p>
    </div>
  );
}
