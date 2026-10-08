# SNS OneConnect: From Notice to Action (MVP)

Announcement, then student action, then department processing, then status tracking, then resolution.

**Stack:** Next.js 14 (App Router, plain JavaScript) + Supabase (Auth, Postgres, Row Level Security, Realtime) + Vercel.

## What is built (the blueprint's MUST HAVE list, nothing more)

Student: login, announcement feed filtered by own department and year (category chips, search, deadline chips),
"Needs your action this week" strip, announcement detail with an optional action button, Upcoming (deadlines and events),
request form with tracking ID, My requests (Active/Closed), request detail with status timeline, notification bell with live updates.

Faculty and Admin: login, create announcement (audience, deadline, action button, live "visible to N students" count),
request queue with status filter and search (admin also filters by department), request detail, status update with note, history.

Security: Row Level Security on every table. Browsers can only read; all writes go through three database functions
(`create_request`, `transition_request`, `publish_announcement`) that check role, department and allowed status changes.

## Not built on purpose (blueprint SHOULD HAVE / FUTURE)

Urgent priority, unread tracking, needs-info status, attachments, dashboard counters, share to WhatsApp, edit or archive
announcements, event creation screen, request cancel, reassign, user management UI, email notifications, AI.

## Setup (about 15 minutes)

1. **Create a Supabase project** (supabase.com, free tier).
2. **Run the schema.** Supabase dashboard > SQL Editor > New query > paste all of `supabase/schema.sql` > Run.
   Run it once on a fresh project. If you need to start over, create a new project or drop the objects first.
3. **Disable public signup.** Authentication > Sign In / Providers > Email: turn OFF "Allow new users to sign up".
   Accounts are created by the seed script below.
4. **Add keys.** Copy `.env.example` to `.env.local` and fill the three values (Project Settings > API).
5. **Install and seed** (Node 20.6 or newer):
   ```
   npm install
   npm run seed
   ```
   `npm run seed` also resets all requests, notifications, announcements and events, so run it before every demo.
6. **Run:** `npm run dev` then open http://localhost:3000

## Demo accounts (password for all: `Demo@12345`)

| Role | Email | Notes |
|---|---|---|
| Student | student1@oneconnect.demo | CSE, Year 3 (Arun Kumar) |
| Student | student2@oneconnect.demo | CSE, Year 3 |
| Student | student3@oneconnect.demo | CSE, Year 3 |
| Student | student4@oneconnect.demo | IT, Year 2 (use to prove filtering) |
| Faculty | faculty@oneconnect.demo | CSE, can post only to CSE |
| Admin | admin@oneconnect.demo | Administrative Office, handles Bonafide and ID card requests |

Change these passwords (Supabase > Authentication > Users) before sharing the live link with anyone.

## Deploy to Vercel

Push to GitHub, import the repo in Vercel, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Never add `SUPABASE_SERVICE_ROLE_KEY` to Vercel.

## 2.5 minute demo path

1. Admin (laptop): New announcement, "Bonafide needed for scholarship, due Friday", Department CSE, Year 3, deadline in 2 days, action button "Request Bonafide Certificate". Point at "Visible to 3 students". Publish.
2. Student1 (phone window): bell lights up, the red "Due in 2 days" chip shows. Open the notice and tap Request Bonafide Certificate.
3. Add a reason, Submit, show the tracking ID.
4. Admin: Requests, open it, Start review, then Mark ready for collection with a note (where and when to collect).
5. Student1: bell updates live, request detail shows the timeline and "Ready for collection".

Optional proof of filtering: log in as student4 (IT, Year 2) and show the notice is not visible.

## Optional

Restart tracking IDs from 1 before the demo (SQL editor): `alter sequence public.request_seq restart with 1;`

## Notes

- The login redirect by role happens in the browser. The real protection is the database: a student cannot read staff data or call staff functions even if they open /staff.
- Styling is plain CSS in `app/globals.css` (no Tailwind), to keep the setup to four dependencies.
- Realtime has a 10 to 15 second polling fallback, so updates still appear if Realtime is unavailable.
