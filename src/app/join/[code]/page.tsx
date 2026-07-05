import { getClassroomByCode } from "@/lib/classroom-lookup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brand } from "@/components/Brand";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  let classroom: Awaited<ReturnType<typeof getClassroomByCode>> = null;
  let configError = false;
  try {
    classroom = await getClassroomByCode(code);
  } catch {
    configError = true;
  }

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-xl">
        <Brand size="lg" center />

        {configError ? (
          <>
            <h1 className="mt-6 font-serif text-xl font-semibold text-foreground">
              Not set up yet
            </h1>
            <p className="mt-2 text-sm text-muted">
              The admin server isn&apos;t configured yet. Please try this link again later.
            </p>
          </>
        ) : !classroom ? (
          <>
            <h1 className="mt-6 font-serif text-xl font-semibold text-foreground">
              Classroom not found
            </h1>
            <p className="mt-2 text-sm text-muted">
              The code &ldquo;{code.toUpperCase()}&rdquo; doesn&apos;t match any classroom.
              Double-check the link with your instructor.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 font-serif text-xl font-semibold text-foreground">
              {classroom.name}
            </h1>
            {classroom.description && (
              <p className="mt-2 text-sm text-muted">{classroom.description}</p>
            )}

            <div className="mt-6 rounded-xl border border-primary/40 bg-primary/10 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-muted">
                Your classroom code
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary">
                {classroom.code}
              </p>
            </div>

            <a
              href={classroom.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
            >
              Download the app
            </a>

            <p className="mt-4 text-xs text-muted">
              After installing, sign up in the app and enter this code when asked for your
              classroom.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
