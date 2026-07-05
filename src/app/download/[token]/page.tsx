import { redirect } from "next/navigation";
import { consumeDownloadInvite, type ConsumeResult } from "@/lib/download-invite-lookup";
import { Brand } from "@/components/Brand";

const MESSAGES: Record<Exclude<ConsumeResult, { ok: true }>["reason"], { title: string; body: string }> = {
  "not-found": {
    title: "Link not found",
    body: "This download link doesn't exist. Please ask your instructor to send you a new one.",
  },
  used: {
    title: "Link already used",
    body: "This download link has already been used. Please ask your instructor to generate a new one for you.",
  },
};

export default async function DownloadTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let result: ConsumeResult;
  try {
    result = await consumeDownloadInvite(token);
  } catch {
    result = { ok: false, reason: "not-found" };
  }

  if (result.ok) {
    redirect(result.downloadUrl);
  }

  const { title, body } = MESSAGES[result.reason];

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-xl">
        <Brand size="lg" center />
        <h1 className="mt-6 font-serif text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}
