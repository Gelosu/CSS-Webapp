// The APK isn't on the Play Store, so every classroom currently shares this
// same manually-hosted download link. Read-only in the admin UI for now —
// flip ClassroomFormModal's download link field back to editable if/when
// classrooms need different links (e.g. different app versions).
//
// Hosted as a GitHub Release asset (Gelosu/CSS-Webapp, tag "apk-latest") since
// Google Drive shows an unskippable "executable file" warning interstitial
// for .apk files this size (~260MB) when a real browser navigates to it —
// GitHub's release asset CDN serves the bytes directly with no such warning,
// and it's free with no size-based billing concerns. To ship a new APK
// version, upload a new asset to that release (or a new release) and update
// this URL.
export const DEFAULT_APK_DOWNLOAD_URL =
  "https://github.com/Gelosu/CSS-Webapp/releases/download/apk-latest/Computer-System-Service.apk";

// Rewrites a Google Drive "view" share link (the human-friendly form shown in
// the admin UI) into Drive's direct-download endpoint, which streams the file
// bytes straight to the browser instead of Drive's viewer page / virus-scan
// warning interstitial. Undocumented Drive behavior, not a public API — if
// Google ever changes it, this just falls back to the original share link.
// Kept as a safety net in case a classroom's downloadUrl is ever set back to
// a raw Drive link; non-Drive URLs (like the GitHub one above) pass through
// unchanged.
export function toDriveDirectDownloadUrl(shareUrl: string): string {
  const fileId = shareUrl.match(/\/d\/([^/]+)/)?.[1] ?? shareUrl.match(/[?&]id=([^&]+)/)?.[1];
  if (!fileId) return shareUrl;
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
}
