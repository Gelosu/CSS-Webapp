# App updates: release e-mails and in-app update check

## How a release reaches everyone

1. Build the APK and publish a **GitHub release** on `Gelosu/CSS-Webapp` with the `.apk` attached.
   - Tag it `vMAJOR.MINOR.PATCH` (e.g. `v1.1.0`). The app's `versionCode` must be
     `major*10000 + minor*100 + patch` (v1.1.0 = 10100); set it in `app/build.gradle.kts` before building.
   - Anything written in the release notes is shown in the e-mail and in the app. A line `versionCode: 10100`
     in the notes overrides the number worked out from the tag.
2. GitHub calls `POST /api/releases/webhook`. The site remembers the release as the latest one (`appRelease/latest`
   in the Realtime Database) and e-mails **every student and every teacher/admin** a permanent link: `/update`.
3. `/update` (and `/api/update/download`) never expire and always point at the newest APK.
4. The app asks `GET /api/app/latest` when it opens. If the release is newer than the installed `versionCode` it shows
   "Update available" and can download + install it from inside the app (Settings > Check for updates does the same on demand).

An e-mail is sent once per person per release tag, so repeated webhook deliveries never double-send. If a big school
runs past the time limit, an admin can call `POST /api/releases/send` (signed in, Bearer token) to carry on where it stopped.

## One-time setup

* Vercel environment variables (besides the existing SMTP / Firebase ones):
  * `GITHUB_WEBHOOK_SECRET` - any long random string.
  * `GITHUB_RELEASE_REPO` - optional, defaults to `Gelosu/CSS-Webapp`.
  * `NEXT_PUBLIC_APP_URL` - the site's public URL (already used by the invite e-mails).
* GitHub repo > Settings > Webhooks > Add webhook:
  * Payload URL `https://<site>/api/releases/webhook`, content type `application/json`,
    the same secret, and only the **Releases** event.
* Gmail SMTP sends about 500 e-mails a day; a school larger than that needs a different SMTP provider.

## Download-link expiry

In **Manage download invites** the teacher/admin picks how long the new links last (30 minutes to 90 days, default
7 days). A link stops working when its time is up (or after it has been opened once, apart from the short resume
window). The table shows each link's expiry and an "Expired" status; **Resend** issues a fresh link.
