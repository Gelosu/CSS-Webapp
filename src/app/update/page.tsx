import { Brand } from "@/components/Brand";
import { getLatestRelease } from "@/lib/app-release";

export const dynamic = "force-dynamic";

function formatSize(bytes: number) {
  return bytes > 0 ? `${(bytes / (1024 * 1024)).toFixed(0)} MB` : "";
}

// The link in the update e-mail. It never expires and always shows the newest version.
export default async function UpdatePage() {
  const release = await getLatestRelease().catch(() => null);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-xl">
        <Brand size="lg" center />
        {release ? (
          <>
            <h1 className="mt-6 font-serif text-xl font-semibold text-foreground">A new version is ready</h1>
            <p className="mt-3 text-2xl font-bold tracking-widest text-accent">{release.versionName}</p>
            {release.notes && <p className="mt-3 whitespace-pre-line text-sm text-muted">{release.notes}</p>}
            <a
              href="/api/update/download"
              className="mt-6 inline-block w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors"
            >
              Download the update {formatSize(release.sizeBytes) && `(${formatSize(release.sizeBytes)})`}
            </a>
            <p className="mt-4 text-xs text-muted">
              Open the downloaded file to install it over the current app. Your progress stays on your account.
              This link never expires.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 font-serif text-xl font-semibold text-foreground">No update found</h1>
            <p className="mt-2 text-sm text-muted">There is no new version right now. Please try again later.</p>
          </>
        )}
      </div>
    </div>
  );
}
