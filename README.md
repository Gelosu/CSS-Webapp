# Admin CSS

Admin panel for managing students and classrooms for the CSS (Computer Systems Servicing) course app. Built with Next.js (App Router), TypeScript, Tailwind CSS, and Firebase (Auth + Realtime Database). Reads/writes the **same** `users/{uid}` tree the Android course app uses, so student accounts and progress shown here are the real data, not a separate admin-only copy.

## Features

- **Login** — Firebase email/password authentication, admin-only access.
- **Dashboard** — Aggregate stats across all students (total students, classrooms, average progress, activities completed) plus a searchable student table. Click any student to drill into their per-lesson progress breakdown (lesson completion + activity score), with edit/delete.
- **Classrooms** — Create, edit, and delete classrooms. A classroom's join code **is** its database key (chosen and locked in at creation — pick from a live-generated code or regenerate before saving; immutable afterward) and doubles as a shareable `/join/<code>` link (public page, no login required) showing the code and an app download link. Open a classroom for a **Students** tab (enroll existing students, create new accounts directly into it, or open a student's full record) and an **Overview** tab (live-ish snapshot stats, a per-lesson completion chart, and filters by lesson/status).
- **Real account creation** — "Add Student" creates an actual Firebase Auth account (the student can log into the course app with it), not just a database row. This runs through a server-side API route using the Firebase Admin SDK, so creating a student doesn't sign the admin out of their own session (a limitation of the client-side Auth SDK).
- **Download invites** — Since the app isn't on the Play Store, each classroom can generate single-use, emailed-by-hand download links per student (`/download/<token>`): opening the link redirects to the classroom's real download URL and immediately invalidates that token, so a leaked link can't be reused — the admin issues a fresh one ("Resend") if a student needs it again. Automatic email sending isn't wired up yet (no email provider configured); the admin panel currently gives you a "Copy link" button to send it yourself.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

Use the **same Firebase project** as the Android course app. Enable:

- **Authentication** → Sign-in method → Email/Password
- **Realtime Database** (already set up if the Android app uses it — note its region/URL, e.g. `asia-southeast1`)

Create at least one admin user under Authentication → Users so you can log into this panel. (Admin and student accounts live in the same Auth user pool — there's no separate "admin" role yet, just whoever you give the login to.)

#### Client config (`.env.local`)

Copy `.env.local.example` to `.env.local` and fill in your project's **Web app** config (Project settings → General → Your apps → Web app `</>` → SDK setup and configuration — not the Android `google-services.json`):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

#### Server config (Admin SDK, for creating/deleting real student accounts)

Firebase Console → Project settings → Service accounts → **Generate new private key** downloads a JSON file. Add these to `.env.local` too (these are secret — never prefix with `NEXT_PUBLIC_`, never commit them):

```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

- `FIREBASE_PROJECT_ID` and `FIREBASE_CLIENT_EMAIL` come straight from the JSON file's `project_id` / `client_email`.
- `FIREBASE_PRIVATE_KEY` is the JSON file's `private_key` value, pasted as a single line — keep the `\n` escape sequences exactly as they appear in the JSON (don't convert them to real line breaks). Wrap the whole thing in quotes.

### 3. Realtime Database security rules

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "users": { ".indexOn": ["classCode"] },
    "downloadInvites": { ".indexOn": ["classroomId"] }
  }
}
```

The `.indexOn` hints speed up classroom roster lookups and the "Manage download invites" list. Classrooms no longer need an index — a classroom's join code **is** its database key (`classrooms/{CODE}`), so lookups are a direct key read, not a query. The public `/join/<code>` and `/download/<token>` pages don't need a rules exception either — they look things up server-side with the Admin SDK, which bypasses rules entirely.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

## Data model (Realtime Database nodes)

- `users/{uid}` — **same shape the Android app writes** on signup:
  ```
  {
    uid, fullName, username, email,
    classCode,              // the classroom's join code; absent/null = unassigned
    learningProgress: {
      lesson1: { lesson: { completed, total }, activity: { activityCompleted, score } },
      lesson2: { ... },
      ...
    }
  }
  ```
- `classrooms/{CODE}` — keyed by the classroom's own join code (no separate id):
  `{ name, description, downloadUrl, createdAt }`
- `downloadInvites/{token}` — single-use APK download links:
  `{ classroomId, email, status: "pending" | "used", createdAt, usedAt }`. `classroomId` is
  the classroom's code (same value as its key above). `token` is the random key itself,
  used directly in `/download/<token>`.

A lesson counts as "completed" when `lesson.completed >= lesson.total`. The course curriculum (used to label `lesson1..lessonN` in the UI) lives in `src/lib/curriculum.ts`.

### Known gap: lesson totals for admin-created students

The Android app computes each lesson's `total` from bundled JSON assets at signup. The admin panel doesn't have access to those assets, so students created here start with `lesson.total: 0` until the Android app sets it. See [`docs/android-classroom-join.md`](docs/android-classroom-join.md) for the related Android-side change needed to also capture classroom codes at signup.

## Build

```bash
npm run build
npm run start
```
