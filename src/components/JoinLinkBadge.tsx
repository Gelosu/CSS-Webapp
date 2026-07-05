"use client";

import { useState } from "react";

export function JoinLinkBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const link =
      typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : code;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted">Join code</p>
        <p className="font-mono text-sm font-semibold text-primary">{code}</p>
      </div>
      <button
        type="button"
        onClick={copyLink}
        className="ml-auto rounded-lg border border-border px-2.5 py-1 text-xs text-foreground hover:bg-surface transition-colors"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
