# Wintskill Salon Academy — Student Management System: Implementation Plan

Source requirements: [student-management-system-plan.md](student-management-system-plan.md).
Registration form reference: [resources/student-registration-form.JPG](resources/student-registration-form.JPG).
Each phase ends with success criteria. A phase is done only when every box is checked and `pnpm test` passes.

---

## 1. Architecture at a glance

```
wintskill-sms/
├── apps/
│   ├── api/          NestJS (REST, /api/v1; serves the built web app in production)
│   └── web/          React + Vite (SPA, mobile-first)
├── e2e/              Playwright tests
├── supabase/         Local Supabase config, seed.sql
├── Dockerfile        Single image for Railway
├── package.json      pnpm workspace root
└── .gitignore
```

| Concern | Choice | Why |
|---|---|---|
| Monorepo | pnpm workspaces | Simple, no extra build tool |
| Backend | NestJS 11, TypeScript | Required |
| ORM / migrations | Prisma | Most popular, typed, good migrations on Supabase Postgres |
| Auth | Supabase Auth, **username + password** (see §3 "Accounts and passwords"); API verifies Supabase JWT via JWKS | No hand-rolled password storage; students log in with their registration number |
| Account creation | Admin creates accounts with a generated temporary password; user must change it at first login | Matches "admin shares username and password"; no email server needed |
| Authorization | `role` on `Profile` table (ADMIN / TEACHER / STUDENT), Nest `RolesGuard` | Roles live in our DB, not in the client |
| Validation | `class-validator` DTOs + global `ValidationPipe` (whitelist, forbidNonWhitelisted) | Nest idiom |
| Logging | `nestjs-pino` (JSON logs, request id, redacts auth headers / PII) | Structured, fast |
| Security middleware | `helmet`, `@nestjs/throttler` counted per signed-in user (per IP only before sign-in); no CORS: Vite proxies `/api` in dev, same origin in production | Standard hardening; the academy Wi-Fi shares one public IP |
| Storage | Supabase Storage, **private** buckets only; API issues short-lived signed URLs | Files never public |
| Frontend | React 19 + Vite, React Router, TypeScript | Required |
| State | Redux Toolkit + RTK Query; `redux-persist` only for `auth` + UI prefs | Required; RTK Query avoids hand-written fetch state |
| UI | shadcn/ui + Tailwind CSS v4, `lucide-react` icons | Required |
| Forms | `react-hook-form` + `zod` | Popular, works with shadcn `Form` |
| Calendar | FullCalendar (`dayGrid`, `timeGrid`, `list` views; `listWeek` default on mobile) | Most mature React calendar |
| PDF viewing | `pdfjs-dist` rendered to `<canvas>` | No native download/print UI |
| Tests | Vitest (api + web; Nest 12 and Vite template default), Testing Library (web), Playwright (e2e) | Idiomatic per tool |
| Lint / format | oxlint (Nest 12 and Vite template default) + Prettier | Standard |
| Hosting | Railway, **one service**: NestJS serves the API and the built SPA (`@nestjs/serve-static`) | Same origin means no production CORS and one deploy; database and files stay on Supabase |

All secrets come from environment variables (`.env`, never committed; `.env.example` committed):

```
# apps/api/.env
DATABASE_URL=            # Supabase pooled connection, ending in ?schema=app
DIRECT_URL=              # Supabase direct connection (migrations), ending in ?schema=app
SUPABASE_URL=
SUPABASE_SECRET_KEY=     # sb_secret_..., API only, never shipped to the browser

# apps/web/.env  (build-time)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=   # sb_publishable_...
VITE_API_URL=/api/v1     # same in dev (Vite proxy) and production
```

---

## 2. Roles and permissions

| Capability | Admin | Teacher | Student |
|---|:-:|:-:|:-:|
| Manage courses, modules, batches | ✅ | – | – |
| Register students, add enrollments | ✅ | – | – |
| Create teacher accounts, reset any user's password | ✅ | – | – |
| Create class sessions & events, assign teachers | ✅ | – | – |
| Mark attendance | ✅ (any session) | ✅ (own sessions only) | – |
| Upload materials & assignments | ✅ | ✅ (edit/delete own uploads only) | – |
| View materials & assignments | ✅ all | ✅ all | enrolled courses, view-only |
| View calendar | ✅ all | own sessions | own batches |
| View own profile & attendance | – | ✅ | ✅ |

Enforced server-side on every endpoint (`@Roles()` + ownership checks in services). The UI only hides what the API already forbids.

---

## 3. Data model (Prisma)

A **Student** is a person and has one login. Each course they join is an **Enrollment** in a batch, and each enrollment gets its own registration number.

```
Profile        id (= Supabase auth user id), role, username (unique, login), fullName,
               email? (contact only), phone (mobile), avatarPath, isActive, mustChangePassword
Course         id, code (unique, e.g. HSC), name, description, isActive
Module         id, courseId, code (unique per course), title, sortOrder
Batch          id, courseId, code (YYYY + letter, e.g. 2026A; unique per course), name,
               startDate, endDate, status (PLANNED|ACTIVE|COMPLETED)
BatchCounter   batchId (pk), lastSeq          -- backs registration number generation

Student        id, profileId (unique), nameWithInitials, nicOrPassport (unique), dateOfBirth,
               address, schoolAttended, landPhone?, guardianName, guardianPhone, notes?
Qualification  id, studentId, level (OL|AL), year, indexNo,
               subjects Json [{ subject, result }]          unique(studentId, level)
Enrollment     id, studentId, batchId, registrationNo (unique), enrolledAt,
               status (ACTIVE|COMPLETED|WITHDRAWN)          unique(studentId, batchId)

ClassSession   id, batchId, moduleId?, teacherId (Profile), startsAt, endsAt, venue, notes
Attendance     id, sessionId, enrollmentId, status (PRESENT|ABSENT|LATE|EXCUSED),
               markedById, markedAt                         unique(sessionId, enrollmentId)
CalendarEvent  id, batchId?, title, type (EXAM|HOLIDAY|OTHER), startsAt, endsAt, description

Material       id, moduleId, title, kind (PDF|VIDEO|IMAGE), storagePath, sortOrder, uploadedById
Assignment     id, moduleId, title, description, dueAt?, storagePath?, uploadedById   -- read-only for students
MaterialView   studentId, materialId, firstViewedAt           pk(studentId, materialId)
```

How the admission form maps to the model:

| Form field | Stored in |
|---|---|
| 1 Full Name | `Profile.fullName` |
| 2 Name With Initials | `Student.nameWithInitials` |
| 3 Address | `Student.address` |
| 4 NIC / Passport Number | `Student.nicOrPassport` (also used to find returning students) |
| 5 Date of Birth | `Student.dateOfBirth` |
| 6 School Attended | `Student.schoolAttended` |
| 7 Contact: Land / Mobile | `Student.landPhone` / `Profile.phone` |
| 8 Guardian's Name / Contact | `Student.guardianName` / `Student.guardianPhone` |
| 9 Email | `Profile.email` (optional, contact only) |
| Photo box | `Profile.avatarPath` |
| O/L and A/L: Year, Index, Subject, Result | `Qualification` (one row per level) |

All tables live in a private `app` schema (`?schema=app` in the connection strings). Supabase's Data API only exposes `public`, so the publishable key cannot reach any table; all data access goes through the API.

### Registration number generation (pluggable)

```ts
// apps/api/src/enrollments/registration-number/registration-number.generator.ts
export interface RegistrationNumberGenerator {
  next(tx: Prisma.TransactionClient, ctx: { course: Course; batch: Batch }): Promise<string>;
}
export const REGISTRATION_NUMBER_GENERATOR = Symbol('REGISTRATION_NUMBER_GENERATOR');
```

The default `CourseBatchSequenceGenerator` builds `${course.code}${batch.code}${seq.padStart(3,'0')}`, which gives `HSC2026A001`.
`seq` comes from an atomic `UPDATE BatchCounter SET lastSeq = lastSeq + 1 ... RETURNING lastSeq` inside the enrollment transaction, so concurrent registrations never collide. To change the format later, write a new class and swap the provider in `EnrollmentsModule`. Nothing else changes.

### Accounts and passwords
- **Everyone logs in with a username, not an email.**
  - **Students:** the username is the registration number from their **first** enrollment (e.g. `HSC2026A001`). It never changes, even when they enroll in more courses, and it is shown on their profile.
  - **Teachers and admins:** the admin chooses a username (e.g. `nimali.p`).
  - Usernames are case-insensitive and stored in uppercase for students and lowercase for staff.
- Supabase Auth requires an email, so each account gets an internal address `<username>@users.wintskill.local` that nobody sees. It never receives mail and is derived from the username, so the login form converts the username before calling `signInWithPassword`. A student's real email stays optional contact data, and changing it never affects login.
- The admin creates a student or teacher account. The API calls `supabase.auth.admin.createUser({ email: internalEmail(username), password, email_confirm: true })` with a 12-character temporary password from `crypto.randomInt`, and returns it **once**. The UI shows the username and password in a dialog with a copy button.
- `mustChangePassword = true` until the user sets their own password. While it is set, `AuthGuard` returns `403 PASSWORD_CHANGE_REQUIRED` for everything except `GET /me` and `POST /me/password`, and the web app redirects to `/change-password`.
- "Reset password" on any user page issues a new temporary password the same way.

---

## 4. Branding and theme

Taken from the wintskillacademy.lk stylesheet. Map these to shadcn CSS variables in `apps/web/src/index.css`:

| Token | Value | Use |
|---|---|---|
| forest-900 | `#14301f` | Primary (buttons, header, sidebar) |
| forest-950 | `#0b1d12` | Dark surfaces, sidebar background |
| forest-700 | `#2c4d26` | Hover / secondary |
| forest-50 / 100 | `#f1f7f1` / `#dcebdc` | Subtle backgrounds, muted |
| gold-500 | `#c6974a` | Accent, focus ring, highlights |
| gold-300 / 400 | `#e8cc94` / `#d9b26a` | Gradients, badges |
| rose-gold | `#d8a48a` | Logo-matching accents |
| cream | `#fbf8f1` | App background |

Fonts (self-hosted via Fontsource, so no third-party requests): **Montserrat** for headings, **Lato** for body text, **Great Vibes** only for the decorative wordmark on the login page, **Noto Sans Sinhala** as a fallback for Sinhala names.
Logos: `resources/academy_logo_transparent.png` in the header, sidebar and favicon; `academy_logo_default.png` and `about_us_cover.png` on the login screen.

---

## 5. Protecting course materials (what is realistic)

No website can fully prevent screenshots: the OS, a second phone camera or devtools can always capture the screen. The plan makes copying difficult and traceable:

1. Files live in a private bucket. Staff upload straight to storage with a one-time token from the API (large videos never pass through the server); the API then checks the file's real type from its bytes. To view, the API checks enrollment and returns a **60-second signed URL** for one file (videos get 2 hours, because they stream in many requests during playback).
2. PDFs render page by page into `<canvas>` with pdf.js, so there is no download or print button and no file link in the DOM.
3. Videos use `<video controlsList="nodownload" disablePictureInPicture>` with a signed URL.
4. Every viewer shows a **visible watermark overlay** with the student's name, the registration number for that course and the date. A leaked screenshot can be traced back to the student who took it.
5. Right-click, text selection, drag, `Ctrl/Cmd+S/P` and printing (`@media print { display:none }`) are disabled in the viewer. The content is blurred when the tab or window loses focus or visibility.
6. The first time a student opens a material, a `MaterialView` row is recorded (it drives progress), and every open is logged.

---

## 6. Phases

### Phase 0 — Scaffolding & tooling
- pnpm workspace, `apps/api` (Nest CLI), `apps/web` (Vite React TS), `e2e` (Playwright)
- Root `.gitignore` (node_modules, dist, .env*, !.env.example, coverage, playwright-report, .DS_Store, supabase/.temp)
- oxlint + Prettier, `tsconfig` strict mode on both apps
- Root scripts: `dev`, `build`, `lint`, `test`, `test:e2e`
- Supabase CLI local stack (`supabase start`) for development and tests
- Minimal README: prerequisites, env setup, run commands

**Success criteria**
- [x] `git init` done, first commit contains no secrets
- [x] `pnpm install && pnpm dev` starts the API on :3000 and the web app on :5173
- [x] `pnpm lint`, `pnpm build`, `pnpm test` all pass on a clean checkout
- [x] `.env.example` files list every required variable

### Phase 1 — Backend foundation
- `ConfigModule` with env validation (zod) that fails fast when a variable is missing
- `PrismaModule`, full schema from §3, first migration, `seed` script (1 admin, 1 teacher, 1 course with 3 modules, 1 batch, 3 students, one of them enrolled in two courses)
- `AuthGuard` (global): verifies the Supabase JWT against JWKS, loads the `Profile`, rejects inactive users and enforces `mustChangePassword`; `@Public()` opt-out
- `RolesGuard` + `@Roles()` decorator; `@CurrentUser()` param decorator
- `GET /me`, `POST /me/password` (checks the current password, sets the new one through the admin API, clears the flag and signs out other sessions)
- Global `ValidationPipe`, exception filter (consistent `{ statusCode, message, requestId }`, no stack traces in production)
- `nestjs-pino`, `helmet`, throttler
- `GET /health`

**Success criteria**
- [x] Unit tests: guards (missing/invalid/expired token → 401, wrong role → 403, inactive → 401, password change pending → 403 except allowed routes), exception filter shape, config validation
- [x] Unknown DTO fields rejected with 400
- [x] Logs are JSON with a request id and never contain `Authorization` headers or passwords
- [x] Migration applies cleanly to an empty Supabase DB; seed runs without errors

### Phase 2 — Frontend foundation
- Tailwind v4 + shadcn/ui init, theme tokens and fonts from §4
- Redux store: `authSlice` (persisted), `uiSlice` (persisted: theme, sidebar), RTK Query `api` with base query that attaches the Supabase access token and refreshes it on 401
- Supabase client (anon key) used **only for sign-in and session refresh**
- Login form takes **username + password** and converts it with a one-line `internalEmail(username)` helper (the API has the same one-liner)
- Routes: `/login`, `/change-password`, then role-based areas `/admin/*`, `/teacher/*`, `/student/*` behind `<RequireRole>`
- Mobile-first app shell: bottom navigation on phones, collapsible sidebar from `md:` up; logo in the header
- Shared components: `PageHeader`, `DataTable` (cards on mobile, table from `md:` up), `ConfirmDialog`, `EmptyState`, `TempPasswordDialog` (show once + copy), toast via `sonner`
- Global error boundary + 404 page

**Success criteria**
- [x] Login redirects each role to its own dashboard; wrong-role URLs redirect away
- [x] A user with `mustChangePassword` can only reach `/change-password` until they change it
- [x] Session survives a page reload; logout clears persisted state
- [x] No horizontal scroll at 360px width on any page; touch targets ≥ 44px
- [x] Vitest: auth slice, `RequireRole`, base-query token refresh

### Phase 3 — Courses, modules, batches (Admin)
- CRUD: courses (code, name), modules per course (code, title, order), batches per course
- "Start new batch intake": the batch code defaults to the next free letter for the current year (`2026A` → `2026B`), and the admin can edit it. Creating the batch also creates its `BatchCounter`
- Soft-deactivate instead of delete when a course or batch has dependants

**Success criteria**
- [x] Course codes are unique; module codes and batch codes are unique per course (DB constraint + friendly 409 message)
- [x] Batch code must match `^\d{4}[A-Z]$`; suggested next code is unit tested
- [x] Non-admin calls return 403 (tested)
- [x] Service behaviour covered by API tests against the database (pure logic unit tested); UI works at 360px

### Phase 4 — Students, enrollments, teacher accounts
- **Registration wizard** that mirrors the admission form, one step per screen on mobile:
  1. *Find*: enter the NIC/passport number. If the student already exists, skip to step 5 with that student
  2. *Personal*: full name, name with initials, NIC/passport, date of birth, school attended, photo (`<input accept="image/*" capture="user">` so the phone camera opens)
  3. *Contact*: address, land and mobile numbers, email (optional), guardian's name and contact
  4. *Education*: O/L and A/L, each with year, index number and editable subject/result rows (both optional)
  5. *Enrollment*: course → batch (dependent select)
  6. *Done*: shows the registration number. For a new student it also shows the login: username (the same registration number) and the temporary password
- One transaction generates the registration number, then creates the auth user (new students only, username = that number), `Profile`, `Student`, `Qualification`s and `Enrollment`. If any step fails, the auth user is deleted
- Photo upload to the private `avatars` bucket (image type and size checked server-side, max 2 MB)
- Student list: search (name, NIC, registration number, phone), filter by course/batch, pagination. Student detail page: personal data, qualifications, all enrollments, "Add enrollment", "Reset password", edit, change enrollment status
- **Teachers**: admin creates them (username, name, phone, optional email, photo; username + temporary password shown once), edits, deactivates and resets their passwords

**Success criteria**
- [x] First enrollment in HSC/2026A gets `HSC2026A001`, second `HSC2026A002`; 20 parallel enrollments produce 20 unique, gap-free numbers (test)
- [x] Generator swapped via provider in a unit test without touching `EnrollmentsService`
- [x] Same NIC cannot create a second student; same student cannot enroll twice in one batch (409)
- [x] A returning student enrolled in a second course gets a new number and keeps the same login (their first number)
- [x] New student logs in with their registration number (any letter case) and the temporary password, is forced to change it, then reaches their dashboard; same for a teacher with their username
- [x] Usernames are unique; a teacher username shaped like a registration number is rejected
- [x] Registering a student without an email works
- [x] A failed registration leaves no orphan auth user or DB rows

### Phase 5 — Calendar & class sessions
- Admin calendar (FullCalendar): month/week/list views, filter by batch; tap a date to add a class session (batch, module, teacher, time, venue) or an event (exam/holiday/other)
- "Repeat weekly until <date>" option when creating sessions (creates individual rows, each one editable)
- Drag to reschedule (desktop), edit sheet on mobile
- Teacher clash warning: the same teacher in two overlapping sessions
- Teacher and student calendars are read-only. A teacher sees their own sessions; a student sees every batch they are actively enrolled in

**Success criteria**
- [x] `GET /calendar?from&to&batchId` returns sessions + events in a single call
- [x] Students only receive items from their own batches (tested, including a student with two enrollments)
- [x] Overlapping teacher assignment returns a warning the UI shows
- [x] Calendar usable on a 360px screen (list view default)

### Phase 6 — Attendance
- From a session (calendar or "Today" list), open the attendance sheet: roster of the batch's active enrollments, everyone defaults to **Present**, tap to cycle the status, one save button
- Teachers can mark attendance only for their own sessions; admins for any session
- Reports: per-session summary, attendance % per enrollment (overall and per module), batch overview; CSV export for admins

**Success criteria**
- [x] Re-saving updates records (upsert on `sessionId+enrollmentId`) and creates no duplicates
- [x] Teacher marking another teacher's session → 403 (tested)
- [x] Attendance % calculation unit tested (excused sessions excluded from the denominator)
- [x] A batch of 30 students can be marked in under 30 seconds on a phone

### Phase 7 — LMS: materials & assignments
- Admin and teachers, per module: upload materials (PDF, MP4, images; max size set in config) and assignments (title, description, due date, optional file; read-only for students). Reorder them, edit them, delete them (deleting also removes the stored file). Teachers can only edit or delete what they uploaded
- `GET /materials/:id/view-url` checks that the user is staff or has an active enrollment in the module's course, then returns a 60-second signed URL
- Protected viewer as described in §5
- Student LMS: course switcher (one entry per enrollment) → modules → materials and assignments, with "viewed" ticks

**Success criteria**
- [x] A student without an enrollment in the course gets 403 on every material endpoint (tested)
- [x] A teacher editing or deleting another user's upload → 403 (tested)
- [x] The bucket is private: direct storage URLs without a signature return 400/403
- [x] Viewer shows the watermark, blocks right-click/print/save shortcuts, and blurs on tab switch (Playwright)
- [x] The first time a student opens a material, a `MaterialView` row is created

### Phase 8 — Dashboards & progress
- **Admin:** active batches, enrollments per batch, today's sessions, low-attendance alert (< 80%, set in config)
- **Teacher:** today's and upcoming sessions, sessions still waiting for attendance, quick link to upload materials
- **Student:** for each enrollment: next class, attendance %, module progress (materials viewed / total), upcoming assignment due dates. Also a profile page with photo and registration numbers

**Success criteria**
- [x] Each dashboard loads with ≤ 3 API calls
- [x] All numbers match the seeded data (tested)

### Phase 9 — Integration testing & hardening
- Playwright suite against the local Supabase stack + seeded data, in **mobile (Pixel 7)** and **desktop Chrome** projects:
  - Login for each role (students with their registration number), forced password change, admin password reset, logout
  - Admin: create course → modules → batch → register student → see the registration number and temporary password
  - Admin: enroll an existing student (found by NIC) in a second course → new number, same login
  - Admin: create teacher → teacher uploads a PDF → student views it in the protected viewer; a student from another course is denied
  - Admin: schedule sessions → teacher marks attendance → student sees their %
  - Role access matrix from §2 checked through the API (one table-driven spec)
- Security pass: `pnpm audit`, check that no service-role key is in the web bundle, rate limits, security headers, file-type checks on uploads
- Fix every defect found, add a regression test for each one

**Success criteria**
- [x] All Playwright specs pass in both projects
- [x] No high/critical findings from `pnpm audit --prod` (shipped code). Full `pnpm audit` has one high in dev-only tooling with no fix yet: `braces` via the shadcn CLI (glob DoS; not in the app or server)
- [x] Lighthouse mobile scores on the login page and the student dashboard: Accessibility ≥ 90, Performance ≥ 80
- [x] All earlier phase checkboxes still pass

### Phase 10 — Deployment to Railway
- Multi-stage `Dockerfile`: build web + api, run `node apps/api/dist/main` (production deps only)
- NestJS serves `apps/web/dist` for every non-`/api` route (SPA fallback)
- Railway service settings: pre-deploy command `pnpm --filter api prisma migrate deploy`, health check `/api/v1/health`, env vars from §1 (the `VITE_*` ones as build args)
- Production Supabase project: create private buckets `avatars` and `materials`, then run the seed once to create the first admin account only
- Custom domain + HTTPS (Railway-managed)

**Success criteria**
- [ ] A push to `main` deploys automatically; migrations run before the new version starts
- [ ] `/api/v1/health` returns 200 on the Railway URL; deep links like `/student/calendar` load after refresh
- [ ] Playwright smoke spec (login + dashboard) passes against the deployed URL
- [ ] No secrets in the image or the repo

---

## 7. Out of scope (for now)
Online assignment submission and grading, payments and fees, notifications (SMS or email), self-service "forgot password" (admins reset passwords instead), and certificates. The data model and module layout leave room to add these later.
