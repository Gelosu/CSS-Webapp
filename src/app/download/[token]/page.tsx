import { peekDownloadInvite } from "@/lib/download-invite-lookup";
import { getClassroomByCode } from "@/lib/classroom-lookup";
import { Brand } from "@/components/Brand";
import { CopyEmailButton } from "@/components/CopyEmailButton";

const MESSAGES: Record<"not-found" | "used", { title: string; body: string }> = {
  "not-found": {
    title: "Link not found",
    body: "This download link doesn't exist. Please ask your instructor to send you a new one.",
  },
  used: {
    title: "Link already used",
    body: "This download link has already been used. Please ask your instructor to resend it.",
  },
};

export default async function DownloadTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const peek = await peekDownloadInvite(token).catch(
    () => ({ ok: false as const, reason: "not-found" as const })
  );

  if (!peek.ok) {
    const { title, body } = MESSAGES[peek.reason];
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

  const classroom = await getClassroomByCode(peek.classroomId);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-xl">
        <Brand size="lg" center />
        <h1 className="mt-6 font-serif text-xl font-semibold text-foreground">
          Your app download is ready
        </h1>
        {classroom && (
          <div className="mt-5 rounded-xl border border-border bg-surface-alt px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted">
              Classroom
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{classroom.name}</p>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-widest text-muted">
              Class Code
            </p>
            <p className="mt-0.5 text-lg font-bold tracking-[0.3em] text-accent">
              {classroom.code}
            </p>
          </div>
        )}
        <CopyEmailButton email={peek.email} />
        <a
          href={`/api/download/${token}`}
          className="mt-6 inline-block w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
        >
          Download APK
        </a>
        <p className="mt-4 text-xs text-muted">
          This is a one-time link — once you download, it can&apos;t be used again.
        </p>
      </div>
    </div>
  );
}
