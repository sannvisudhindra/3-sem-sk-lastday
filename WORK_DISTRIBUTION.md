# Encore — Work Distribution (4 People · 4 Agents · 2 Hours)

> Read together with [PRD.md](PRD.md). The PRD says **what** to build. This doc says **who builds which files, in what order, and how to merge without conflicts**.

---

## Contents
1. [Team Roles at a Glance](#1-team-roles-at-a-glance)
2. [File Ownership Map (the no-conflict rule)](#2-file-ownership-map-the-no-conflict-rule)
3. [Timeline (120 minutes)](#3-timeline-120-minutes)
4. [Interfaces Between People (frozen at T+0)](#4-interfaces-between-people-frozen-at-t0)
5. [P1: Database, Seeds, Tests & Docs](#5-p1--database-seeds-tests--docs)
6. [P2: Backend API, Payments, Infra](#6-p2--backend-api-payments-infra)
7. [P3: Customer Frontend](#7-p3--customer-frontend)
8. [P4: App Shell, Auth, Design System, Organiser Frontend](#8-p4--app-shell-auth-design-system-organiser-frontend)
9. [Git Workflow & Merge Rules](#9-git-workflow--merge-rules)
10. [Integration Checkpoints](#10-integration-checkpoints)
11. [If Something Goes Wrong](#11-if-something-goes-wrong)
12. [Hand-off to Testing](#12-hand-off-to-testing)

---

## 1. Team Roles at a Glance

| Person / Agent | Role | Owns | Main deliverables |
|---|---|---|---|
| **P1** | Database & QA lead | `supabase/`, `tests/`, `README.md` | Schema, constraints, RLS, all SQL functions (`create_hold`, `confirm_booking`, …), seed venues/seats/users/events, race test, Playwright E2E, README |
| **P2** | Backend lead | `server/`, `infra/`, `render.yaml` | Express app, middleware (auth, single-session, roles, rate limits), all routes from PRD §7, mailer, OTP/links, sweeper, nginx LB, Render deploy |
| **P3** | Customer frontend | `client/src/pages/customer/`, `client/src/features/booking/`, `client/src/mocks/customer/` | Coverflow events, seat map, section/free pickers, waiting room, checkout + payment UI, mock bank page, confetti, My Bookings, hold timer |
| **P4** | Shell & organiser frontend | everything else in `client/` | **Scaffold (first 10 min)**, design tokens, Kokonut components, router, auth/login page, session-conflict UX, header, organiser pages and dashboard, Vercel deploy |

**Workload balance:** P1 front-loads SQL (hardest correctness work) and switches to tests/E2E after T+50. P2 is pure backend. P3 and P4 split the frontend by **user role**, so they never share a page.

---

## 2. File Ownership Map (the no-conflict rule)

> **Rule: you may only create or edit files inside your own paths.** Anything else is read only for you. If you need a change in someone else's file, message the owner. Owners respond within 5 minutes.

```
/
├─ PRD.md, WORK_DISTRIBUTION.md ............ FROZEN (change only by team agreement)
├─ README.md ............................... P1
├─ CLAUDE.md (agent rules) ................. P4 creates at T+0, then FROZEN
├─ .gitignore .............................. P4 (at scaffold)
├─ render.yaml ............................. P2
├─ infra/ .................................. P2
├─ supabase/ ............................... P1
├─ tests/ .................................. P1   (db/, e2e/, playwright.config.ts, tests/package.json)
├─ server/ ................................. P2   (incl. server/package.json, server/.env.example)
└─ client/
   ├─ package.json, package-lock.json ...... P4   (ALL client deps added at scaffold; nobody else installs)
   ├─ vite.config.ts, tsconfig*, index.html, components.json, vercel.json, .env.example ... P4
   ├─ public/ .............................. P4   (P3 may ADD files only under public/customer/)
   └─ src/
      ├─ main.tsx, App.tsx (router) ........ P4
      ├─ lib/ .............................. P4   (supabase.ts, api.ts, auth.tsx, types.ts, format.ts, config.ts)
      ├─ ui/ ............................... P4   (tokens.css, kokonut components, Button, Card, Modal, GeneratedPoster…)
      ├─ components/kokonutui/ ............. P4   (shadcn/kokonut CLI output)
      ├─ layouts/ .......................... P4   (AppShell, Header, ProfileMenu, BottomNav)
      ├─ pages/auth/ ....................... P4
      ├─ pages/organiser/ .................. P4
      ├─ features/organiser/ ............... P4
      ├─ mocks/organiser/ .................. P4
      ├─ pages/customer/ ................... P3
      ├─ features/booking/ ................. P3   (SeatMap, Coverflow, HoldTimerPill, Confetti, api.ts, store…)
      └─ mocks/customer/ ................... P3
```

### Cross-imports (allowed: import, never edit)
| Importer | Imports | From owner |
|---|---|---|
| P3 | `lib/api`, `lib/auth`, `lib/types`, `lib/format`, `ui/*`, `components/kokonutui/*` | P4 |
| P4 (venue detail, dashboard) | `features/booking/SeatMap` (`readOnly` prop) | P3 |
| P4 (Header) | `features/booking/HoldTimerPill` | P3 |
| P4 (router) | default exports of `pages/customer/*` | P3 |

All of these files exist as **stubs** from P4's scaffold commit at T+10, so imports never break the build.

### Why there will be no conflicts
- Each file has exactly one owner, so two people never edit the same lines.
- `package.json`/lockfiles have one owner each (client = P4, server = P2, tests = P1). All dependencies are declared up front (below).
- The router (`App.tsx`) is written **once** at scaffold with every route. P3 only fills in page files.
- Shared types live in `lib/types.ts` (P4, written from PRD §7 at scaffold). P3 needing a new type defines it locally in `features/booking/types.ts`.
- DB changes only happen through P1's numbered migration files.

### Pre-declared dependencies (installed at scaffold, nobody adds more without asking the owner)
**client (P4):** `react react-dom react-router-dom @supabase/supabase-js motion lucide-react qrcode.react sonner date-fns clsx tailwind-merge class-variance-authority` · dev: `vite @vitejs/plugin-react typescript tailwindcss @tailwindcss/vite @types/react @types/react-dom vitest`
**server (P2):** `express cors helmet express-rate-limit zod @supabase/supabase-js nodemailer pino pino-http dotenv` · dev: `vitest supertest nodemon`
**tests (P1):** `@playwright/test pg dotenv @supabase/supabase-js`

---

## 3. Timeline (120 minutes)

| Clock | P1 (DB/QA) | P2 (Backend) | P3 (Customer UI) | P4 (Shell/Organiser UI) |
|---|---|---|---|---|
| **T+0 → 10** | Create the Supabase project, share URL + keys **privately** (not in git). Start `0001_schema.sql` | Scaffold `server/` (express, config, health, error handler, `.env.example`), push | Start pure components in `features/booking/` (Coverflow, SeatMap math) — no app needed yet | **Scaffold `client/`** + root files + all stubs + `CLAUDE.md`, **push by T+10** |
| ⛳ **T+10** | **Checkpoint 1:** everyone `git pull`. P3/P4 run the client with mocks | ← | ← | ← |
| **T+10 → 50** | Migrations 0001–0006 (schema, constraints, functions, views, RLS), seed venues/seats/users/events, run in Supabase | Auth + session + role middleware, all routes calling P1's RPCs (stub RPC errors until T+40), mailer (console mode), sweeper | Events coverflow, booking page (3 seating modes), waiting room, checkout UI, mock bank page, My Bookings, all on **mocks** | Tokens + Kokonut components, Login/Signup page (the showcase), session-conflict modals, Header/Shell, Venues, Host Event form, GeneratedPoster |
| ⛳ **T+50** | **Checkpoint 2:** P1 merges migrations + seeds (applied to Supabase). P2 merges server running against the real DB. P2 shares the local/Render API URL | ← | ← | ← |
| **T+50 → 85** | `tests/db/race.js`, reconciliation script, Playwright E2E-01/04/05, README | Fix integration bugs, nginx docker-compose, `render.yaml`, **deploy to Render**, SMTP mode | Flip `VITE_USE_MOCKS=false`, wire realtime seats + payment status, confetti, error states | My Events + Event Dashboard, realtime forced logout, `vercel.json`, **deploy to Vercel** |
| ⛳ **T+85** | **Checkpoint 3:** everything merged; deployed URLs work; run E2E-01 together on prod | ← | ← | ← |
| **T+85 → 110** | Run the full test catalogue, file bugs to owners | Fix own bugs | Fix own bugs, mobile polish | Fix own bugs, polish |
| **T+110 → 120** | **Code freeze**, tag `v1.0`, hand to tester | ← | ← | ← |

---

## 4. Interfaces Between People (frozen at T+0)

### 4.1 P1 → P2: SQL function signatures
All functions are `security definer`, `execute` granted **only** to `service_role`. On a business error they `raise exception '<CODE>'` (the message is exactly a code from PRD §7.2, optionally followed by `:{json details}`). Functions that must **persist** a failure state return `{ "ok": false, "code": "..." }` instead of raising.

| Function | Args | Returns (jsonb) |
|---|---|---|
| `claim_session` | `p_user uuid, p_session uuid, p_device text, p_force boolean` | `{ok:true}` or `{ok:false, code:'EXISTING_SESSION', device, since}` |
| `queue_join` | `p_user, p_event, p_max_active int, p_admission_seconds int` | `{entryId, status, position, admissionExpiresAt}` |
| `queue_status` | `p_user, p_entry bigint, p_max_active, p_admission_seconds` | same as above |
| `create_hold` | `p_user, p_event, p_seat_ids uuid[], p_sections jsonb, p_idem text, p_hold_seconds int, p_max_tickets int` | `{holdId, expiresAt, items:[...], totalPaise, ticketCount}` |
| `release_hold` | `p_user, p_hold` | `{released:true}` |
| `create_payment` | `p_user, p_hold, p_method text, p_payment_seconds int, p_max_attempts int, p_token_hash text` | `{paymentId, amountPaise, expiresAt, attemptNo}` |
| `set_payment_otp` | `p_user, p_payment, p_otp_hash text` | `{ok:true}` |
| `verify_payment_otp` | `p_user, p_payment, p_otp_hash text, p_max_otp int` | `{ok:true, bookingId}` or `{ok:false, code:'OTP_INVALID', attemptsLeft}` / `{ok:false, code:'OTP_LOCKED'\|'PAYMENT_EXPIRED'\|'HOLD_EXPIRED'}` |
| `get_payment_by_token` | `p_token_hash` | `{paymentId, amountPaise, eventTitle, email, status, expiresAt}` |
| `approve_payment_link` | `p_token_hash` | `{ok:true, bookingId}` or `{ok:false, code}` |
| `confirm_booking` | `p_payment` (internal, called by the two above) | `{ok:true, bookingId}` / `{ok:false, code}` |
| `check_event_availability` | `p_organiser, p_venue, p_title, p_starts timestamptz, p_ends timestamptz, p_turnover_min int` | `{available, conflicts:[...]}` |
| `create_event` | `p_organiser, p_payload jsonb, p_turnover_min int` | `{eventId}` (raises `VENUE_CLASH`/`EVENT_CLASH`/`CAPACITY_INVALID`) |
| `sweep_expired` | `p_max_active, p_admission_seconds` | `{holds, payments, queue}` counts |
| views | `event_stats`, `event_section_stats` | columns: `event_id, capacity, sold, held_now, available, revenue_paise, bookings, attempts_succeeded, attempts_failed, attempts_expired` |

**Hashing rule (P2 computes, P1 compares):** `otp_hash = sha256(paymentId + ':' + otp)` hex. `token_hash = sha256(token)` hex.

### 4.2 P2 → P3/P4: HTTP API
Exactly PRD §7.3 (paths, bodies, response fields) and §7.2 (error codes). P3/P4 mocks mirror these shapes.

### 4.3 P4 → P3: client foundation (ready at T+10, real implementations by T+30)
```ts
// lib/api.ts
export const api: { get<T>(path: string): Promise<T>; post<T>(path: string, body?: unknown, opts?: { idempotencyKey?: string }): Promise<T> };
export class ApiError extends Error { code: string; status: number; details?: any }
export const USE_MOCKS: boolean;

// lib/auth.tsx
export function useAuth(): { user: { id: string; role: 'customer'|'organiser'; username: string; fullName: string; email: string } | null; loading: boolean; signOut(): Promise<void> };

// lib/format.ts
export const formatINR: (paise: number) => string;   // "₹1,999"
export const formatIST: (iso: string) => string;     // "Sat, 13 Mar · 7:00 PM"

// lib/supabase.ts
export const supabase: SupabaseClient;               // for Realtime subscriptions only (no writes)

// ui/
export { Button, Card, GlassCard, Modal, Badge, Stepper, Tabs, Skeleton } from '@/ui';
export { GeneratedPoster } from '@/ui/GeneratedPoster'; // props: { title, venueName, startsAt, eventType, className? }
```

### 4.4 P3 → P4: components P4 renders
```ts
// features/booking/SeatMap.tsx  (default export)
props: { layout: VenueLayout; seats?: Seat[]; sections?: SectionInfo[]; selected?: string[];
         onToggleSeat?(id: string): void; onSelectSection?(id: string): void; readOnly?: boolean; highlightBooked?: boolean }

// features/booking/HoldTimerPill.tsx  (default export, no props; renders null when no active hold)
```

### 4.5 Routes (written by P4 in `App.tsx` at scaffold)
| Path | Page file | Owner | Guard |
|---|---|---|---|
| `/login`, `/signup` | `pages/auth/LoginPage.tsx`, `SignupPage.tsx` | P4 | public |
| `/onboarding/role` | `pages/auth/RoleOnboardingPage.tsx` | P4 | auth |
| `/events` | `pages/customer/EventsPage.tsx` | P3 | customer |
| `/events/:id/queue` | `pages/customer/WaitingRoomPage.tsx` | P3 | customer |
| `/events/:id/book` | `pages/customer/BookingPage.tsx` | P3 | customer |
| `/checkout/:holdId` | `pages/customer/CheckoutPage.tsx` | P3 | customer |
| `/pay/:token` | `pages/customer/MockPayPage.tsx` | P3 | **public** |
| `/bookings` | `pages/customer/MyBookingsPage.tsx` | P3 | customer |
| `/organiser/venues` | `pages/organiser/VenuesPage.tsx` | P4 | organiser |
| `/organiser/venues/:id` | `pages/organiser/VenueDetailPage.tsx` | P4 | organiser |
| `/organiser/host` | `pages/organiser/HostEventPage.tsx` | P4 | organiser |
| `/organiser/events` | `pages/organiser/MyEventsPage.tsx` | P4 | organiser |
| `/organiser/events/:id` | `pages/organiser/EventDashboardPage.tsx` | P4 | organiser |
| `/` | redirect by role (`/events` or `/organiser/venues`), `/login` if signed out | P4 | n/a |

---

## 5. P1: Database, Seeds, Tests & Docs

### Tasks (in order)
| # | Task | File(s) | Done when |
|---|---|---|---|
| 1 | Create the Supabase project; share keys in the team chat (private) | n/a | Everyone has `.env` values by T+5 |
| 2 | Schema: all tables, checks, FKs, indexes from PRD §5.2; `btree_gist`, `citext`, `pgcrypto` extensions | `supabase/migrations/0001_schema.sql` | Runs clean |
| 3 | Constraints: exclusion constraints (R22/R23), partial unique indexes (active hold per user/event, pending/succeeded payment per hold, booking seat uniqueness, queue) | `0002_constraints.sql` | Overlap insert fails with `23P01` |
| 4 | `profiles` trigger on `auth.users` insert (role/username/full_name from metadata) | `0003_auth.sql` | Sign-up creates a profile |
| 5 | Functions: `create_hold`, `release_hold`, `create_payment`, `set_payment_otp`, `verify_payment_otp`, `get_payment_by_token`, `approve_payment_link`, `confirm_booking`, `claim_session`, `queue_join`, `queue_status`, `check_event_availability`, `create_event`, `sweep_expired` (signatures in §4.1; logic in PRD §6, §9) | `0004_functions.sql` | Manual SQL calls behave |
| 6 | Views `event_stats`, `event_section_stats` (PRD §11) | `0005_views.sql` | Numbers match hand count |
| 7 | RLS: enable on all tables; select-only policies as PRD §10; revoke function execute from `anon`,`authenticated`; Realtime publication for `event_seats`, `payments`, `user_sessions` | `0006_rls_realtime.sql` | Anon insert into `bookings` is denied |
| 8 | Seeds: 4 venues with `layout` JSON (PRD §5.3) + `generate-seats.js` (arc/grid → `venue_seats`); demo users (PRD §14.4) via admin API; 6 events incl. one past event | `supabase/seed/*` | Seat map data looks right |
| 9 | **Push migrations + seeds at T+50** | n/a | P2 runs against them |
| 10 | Race test (T-05) + reconciliation (T-23) | `tests/db/race.js`, `tests/db/reconcile.js` | 1 success / 49 `SEAT_TAKEN`; invariants pass |
| 11 | Playwright E2E-01, 04, 05, 09, 10 (+ more if time) | `tests/e2e/*.spec.ts` | Green locally |
| 12 | README (PRD §15.3) | `README.md` | Someone new can run it |

**Seed events:** *Neon Nights* (Sabarmati Bowl, assigned), *Hamlet Reimagined* (Courtyard Theatre, assigned), *Lakeside Live* (Lakeside Grounds, sectioned), *Laugh Riot* (Lakeside Grounds, sectioned, different day), *Open Mic @ The Loft* (The Loft, free), *Yesterday's Gig* (started 1 h ago, for T-04). Prices follow the reference tier ladders (₹999 → ₹49,999).

### Agent prompt for P1 (paste into Claude Code)
```
You are Agent P1 (Database & QA) on the Encore event-booking project. Read PRD.md and WORK_DISTRIBUTION.md
fully before writing code. You may ONLY create/edit files in: supabase/, tests/, README.md.

Build, in order:
1) supabase/migrations/0001_schema.sql … 0006_rls_realtime.sql exactly per PRD §5 and WORK_DISTRIBUTION §5.
2) The plpgsql functions with the EXACT signatures in WORK_DISTRIBUTION §4.1. Follow PRD §6 for seat-locking
   (FOR UPDATE SKIP LOCKED, id order, advisory lock per user+event, raise 'SEAT_TAKEN' etc.), lazy expiry
   (held_until < now() counts as available), and PRD §9 state machines. Functions that must persist a failed
   state (verify_payment_otp, approve_payment_link, confirm_booking) RETURN {ok:false, code} instead of raising.
   All functions SECURITY DEFINER, set search_path = public, execute only for service_role.
3) Views event_stats and event_section_stats per PRD §11.
4) Seeds in supabase/seed/: 4 venues with layout JSON (PRD §5.3), generate-seats.js computing seat x/y for
   arc and grid shapes, demo users via supabase admin API (PRD §14.4), 6 events (WORK_DISTRIBUTION §5).
5) tests/db/race.js (50 parallel holds on one seat via the HTTP API → expect 1x201, 49x409) and
   tests/db/reconcile.js (PRD §11 invariants). Then Playwright specs in tests/e2e/ for E2E-01,04,05,09,10.
6) README.md per PRD §15.3.
Money = integer paise, times = timestamptz. Keep SQL readable with short comments on the tricky parts.
Commit with prefix "p1(db): …". Do not touch client/ or server/.
```

---

## 6. P2: Backend API, Payments, Infra

### Tasks (in order)
| # | Task | File(s) | Done when |
|---|---|---|---|
| 1 | Scaffold: `package.json` (deps §2), `src/index.js`, `src/app.js` (exported for supertest), `src/config.js` (all env from PRD §15.1 with defaults), `/healthz`, error handler, `.env.example`. **Push by T+10** | `server/*` | `npm run dev` serves `/healthz` |
| 2 | `services/supabaseAdmin.js` (service-role client), `lib/rpc.js` (calls RPC, maps raised codes → HTTP via PRD §7.2, maps `23P01` constraint names → `VENUE_CLASH`/`EVENT_CLASH`) | `server/src/…` | Errors come out in the standard JSON format |
| 3 | Middleware: `requireAuth` (`getUser`, 30 s cache), `requireActiveSession` (JWT `session_id` vs `user_sessions`), `requireRole`, rate limiters (PRD §7.4), `validate(zodSchema)`, `X-Instance-Id` header | `middleware/*` | Wrong role → 403; revoked session → 401 |
| 4 | Routes: `auth` (signup via admin createUser, username-login, role), `session/claim`, `me` | `routes/auth.js` | Username login returns tokens |
| 5 | Routes: `events`, `events/:id/seats`, `queue` | `routes/events.js`, `queue.js` | Shapes match PRD §7.3 |
| 6 | Routes: `holds` (Idempotency-Key header required), `payments` (create, send-otp, verify-otp, link get/approve, status), `bookings` | `routes/holds.js`, `payments.js`, `bookings.js` | Full flow via curl |
| 7 | `services/otp.js` (crypto.randomInt 6 digits, sha256 per §4.1; 32-byte tokens), `services/mailer.js` (smtp/console modes, OTP + confirm-link + ticket templates per PRD §9.4). In console mode and non-production, include `devOtp`/`devLink` in responses | `services/*` | Ticket email arrives |
| 8 | Routes: `venues`, `organiser/events` (check-availability, create, list, stats, bookings, payments), every query scoped by `organiser_id` | `routes/venues.js`, `organiser.js` | Stats come from the views |
| 9 | `services/sweeper.js`: `setInterval(10s)` → `sweep_expired`, started in `index.js` (not in `app.js`, so tests stay clean) | n/a | Expired holds free up |
| 10 | Tests: supertest for validation, role guards, IDOR 404s, error mapping | `server/test/*` | `npm test` green |
| 11 | `infra/docker-compose.yml` (api1, api2, nginx) + `infra/nginx.conf` round-robin; `server/Dockerfile` | `infra/*` | `X-Instance-Id` alternates (T-27) |
| 12 | `render.yaml` + **deploy at T+60–85**; set CORS `CLIENT_URL` | `render.yaml` | Public `/healthz` OK |

### Agent prompt for P2 (paste into Claude Code)
```
You are Agent P2 (Backend) on the Encore event-booking project. Read PRD.md and WORK_DISTRIBUTION.md fully
first. You may ONLY create/edit files in: server/, infra/, render.yaml.

Build a Node 20 ESM Express API exactly matching PRD §7 (middleware order §7.1, error format/codes §7.2,
endpoints §7.3, rate limits §7.4, sweeper §7.5). All business rules live in P1's SQL functions — call them via
supabase.rpc with the EXACT signatures in WORK_DISTRIBUTION §4.1; do not reimplement seat locking in JS.
Map raised exception messages (e.g. 'SEAT_TAKEN' or 'SEAT_TAKEN:{json}') and {ok:false,code} results to the
HTTP statuses in PRD §7.2; map Postgres 23P01 by constraint name to VENUE_CLASH / EVENT_CLASH.
Auth: verify Bearer JWT with supabase.auth.getUser (cache 30s); single-session middleware compares the JWT
session_id claim with user_sessions (PRD R20). Every customer query is scoped by user_id and every organiser
query by organiser_id; return 404 for others' data. Never trust client prices.
Payments per PRD §9: OTP = crypto.randomInt 6 digits, otp_hash = sha256(paymentId+':'+otp); confirm tokens =
32 random bytes base64url, store sha256. Mailer with EMAIL_MODE smtp|console (console returns devOtp/devLink
when NODE_ENV!=='production'). Ticket email per PRD §9.4. Add X-Instance-Id header on every response.
Export app from src/app.js (for supertest); start server + sweeper in src/index.js. Write supertest tests for
guards, validation and IDOR. Then infra/ (docker-compose with 2 api instances behind nginx) and render.yaml.
Until P1's migrations land (~T+50), keep going; RPC calls will just error. Commit with prefix "p2(api): …".
```

---

## 7. P3: Customer Frontend

### Tasks (in order)
| # | Task | File(s) | Done when |
|---|---|---|---|
| 1 | (T+0–10, before scaffold) Pure logic: coverflow transform math, seat-map SVG renderer from layout JSON, mock fixtures matching PRD §7.3 | `features/booking/*`, `mocks/customer/*.json` | Files ready to drop in |
| 2 | `features/booking/api.ts`: wrappers for every customer endpoint; return mocks when `USE_MOCKS` | `features/booking/api.ts` | Switching the flag works |
| 3 | **EventsPage**: filter chips + motion **coverflow** (PRD §8.3 P-2) + centred info panel + Book button + grid below | `pages/customer/EventsPage.tsx`, `features/booking/Coverflow.tsx` | Drag/keys/snap smooth |
| 4 | **SeatMap** (assigned), **SectionPicker** (sectioned), **QuantityPicker** (free), legend with prices, pan/zoom, tooltips, state colours (PRD §8.1) | `features/booking/SeatMap.tsx` … | All 3 modes work on mocks |
| 5 | **BookingPage**: venue panel, qty stepper (respect `10 − myTicketCount`), sticky summary bar, Confirm → `POST /holds` with an idempotency key (`crypto.randomUUID()` per Confirm click), handle `SEAT_TAKEN`/`SOLD_OUT`/`LIMIT_EXCEEDED`/`NOT_ADMITTED` | `pages/customer/BookingPage.tsx` | Navigates to checkout |
| 6 | **WaitingRoomPage** + join-queue flow before booking (PRD P-4) | `pages/customer/WaitingRoomPage.tsx` | Polls and auto-admits |
| 7 | **Active hold store** (`useActiveHold`, persisted in sessionStorage) + **HoldTimerPill** | `features/booking/holdStore.ts`, `HoldTimerPill.tsx` | Shows in header |
| 8 | **CheckoutPage**: summary, hold ring timer, tabs UPI QR / Net Banking, 60 s payment ring, OTP boxes, Hold-to-Pay, success/failure/expired modals, retry logic (PRD P-5, §9) | `pages/customer/CheckoutPage.tsx`, `features/booking/payment/*` | All states reachable on mocks |
| 9 | **Confetti** (motion particles, brand colours) + "Payment confirmed" modal → `/bookings` | `features/booking/Confetti.tsx` | Fires once |
| 10 | **MockPayPage** (public bank page for QR/email link) | `pages/customer/MockPayPage.tsx` | Approve works |
| 11 | **MyBookingsPage**: ticket cards, Upcoming/Past, empty state, Back to events | `pages/customer/MyBookingsPage.tsx` | n/a |
| 12 | (T+50+) Real API: realtime `event_seats` (filter `event_id=eq.<id>`) and `payments` (filter `id=eq.<id>`), with 2–3 s polling fallback | n/a | Two-browser race visible live |

### Agent prompt for P3 (paste into Claude Code)
```
You are Agent P3 (Customer Frontend) on the Encore event-booking project. Read PRD.md (especially §2, §8, §9)
and WORK_DISTRIBUTION.md fully first. You may ONLY create/edit files in: client/src/pages/customer/,
client/src/features/booking/, client/src/mocks/customer/, client/public/customer/. Never edit package.json,
App.tsx, lib/, ui/ or layouts/ — import from them (contracts in WORK_DISTRIBUTION §4.3). Do not install packages;
the available deps are listed in WORK_DISTRIBUTION §2.

Build with React + TypeScript + Tailwind (use tokens from ui/tokens.css) + motion ("motion/react") +
Kokonut components that P4 placed in components/kokonutui/:
- EventsPage with a motion coverflow gallery (PRD §8.3 P-2): drag, snap, keyboard, rotateY/scale/z by distance.
- BookingPage supporting seating_mode assigned (SVG SeatMap from venue layout JSON, pan/zoom, tier colours,
  legend with prices), sectioned (clickable sections + qty) and free (qty only); max qty = 10 - myTicketCount.
- WaitingRoomPage, CheckoutPage (UPI QR via qrcode.react + Net Banking with 6-box OTP + hold-to-pay; hold
  timer and 60s payment timer both derived from server expiresAt; success → confetti + confirmation modal →
  /bookings; failure/expiry modals with Retry rules from PRD §9), MockPayPage (public), MyBookingsPage.
- HoldTimerPill (default export, no props) and SeatMap (default export, props in WORK_DISTRIBUTION §4.4,
  incl. readOnly) — P4 imports these.
Put all endpoint wrappers in features/booking/api.ts, returning fixtures from mocks/customer/*.json when
USE_MOCKS is true; fixtures must match PRD §7.3 shapes exactly. Handle every error code listed for your
endpoints with friendly UI. Mobile-first, respect prefers-reduced-motion. After T+50, switch to the real API
and add Supabase Realtime subscriptions (event_seats, payments) with polling fallback.
Commit with prefix "p3(customer): …".
```

---

## 8. P4: App Shell, Auth, Design System, Organiser Frontend

### Tasks (in order)
| # | Task | File(s) | Done when |
|---|---|---|---|
| 1 | **Scaffold by T+10 (top priority, blocks P3):** delete the stray root `package.json`, `package-lock.json`, `node_modules/` and the `Waste` file; root `.gitignore` (node_modules, .env, dist, playwright-report); `CLAUDE.md` = PRD §13 block; `npm create vite@latest client -- --template react-ts`; install **all** client deps (§2); Tailwind v4 via `@tailwindcss/vite`; `@/` path alias; `components.json` for shadcn/Kokonut; `.env.example`; `App.tsx` with **all routes** (§4.5); **stub files** for every page and for `features/booking/SeatMap.tsx`, `HoldTimerPill.tsx`, `ui/GeneratedPoster.tsx` (each a default export returning a placeholder); `lib/*` with the §4.3 signatures (minimal working versions) | `client/*`, root files | `npm run build` passes; pushed |
| 2 | Design system: `ui/tokens.css` (PRD §8.1), fonts (Sora + Inter), aurora background, GlassCard, Button variants, Modal, Badge, Tabs, Stepper, Skeleton; add Kokonut components (e.g. Beams Background / Background Paths, Particle Button, Hold Button, Profile Dropdown, Shimmer Text — check kokonutui.com for exact names) into `components/kokonutui/` | `ui/*`, `components/kokonutui/*` | P3 can use them by T+30 |
| 3 | `lib/auth.tsx`: Supabase session listener, profile fetch (`GET /me`), **claim session after login** → conflict modal (Switch → `force:true` + `supabase.auth.signOut({scope:'others'})`; Cancel → sign out locally); realtime on `user_sessions` + `SESSION_REVOKED` handler → "Signed out elsewhere" modal; route guards by role | `lib/auth.tsx`, `lib/api.ts` | Two-browser test passes (T-20) |
| 4 | **LoginPage / SignupPage / RoleOnboardingPage**, the showcase screen (PRD §8.3 P-1): category tiles with bobbing 3D icons and tinted glows, spotlight strip, glass auth card with role toggle, Google button, username/password, mobile bottom sheet | `pages/auth/*`, `public/icons3d/*` | Looks like the reference, coral/teal palette |
| 5 | **AppShell/Header/ProfileMenu/BottomNav**: logo left; tabs + `HoldTimerPill` + profile right; role-specific tabs | `layouts/*` | n/a |
| 6 | **GeneratedPoster** (gradient by event type, title, venue, date/time) | `ui/GeneratedPoster.tsx` | P3 coverflow uses it |
| 7 | **VenuesPage + VenueDetailPage** (uses P3's `SeatMap readOnly`) | `pages/organiser/*` | n/a |
| 8 | **HostEventPage**: 5-step form, live availability check (debounced), seating/pricing per venue type, poster upload to Storage `posters/<uid>/…` or description, live preview, publish | `pages/organiser/HostEventPage.tsx`, `features/organiser/*` | Conflicts shown; event created |
| 9 | **MyEventsPage + EventDashboardPage** (KPI tiles, section table, payments table, bookings table, mini seat map, 10 s refresh). All numbers from `/stats`; no client math beyond formatting | `pages/organiser/*` | Matches T-23 numbers |
| 10 | `vercel.json` + **deploy to Vercel** (root `client`) + add the URL to Supabase Auth redirect URLs | n/a | Prod login works |

### Agent prompt for P4 (paste into Claude Code)
```
You are Agent P4 (App Shell, Auth, Design System, Organiser UI) on the Encore event-booking project. Read
PRD.md (especially §1, §8, §10, §11, §13) and WORK_DISTRIBUTION.md fully first. You own everything in client/
EXCEPT client/src/pages/customer/, client/src/features/booking/, client/src/mocks/customer/ (those belong to P3
— never edit them after your scaffold commit). You also own root .gitignore and CLAUDE.md.

STEP 1 (must be pushed within 10 minutes — it unblocks the team): remove the stray root package.json,
package-lock.json, node_modules and the "Waste" file; create root .gitignore and CLAUDE.md (= PRD §13 block);
scaffold client/ with Vite react-ts, install ALL client deps from WORK_DISTRIBUTION §2, Tailwind v4 via
@tailwindcss/vite, "@/" alias, components.json for shadcn/Kokonut, .env.example, App.tsx with every route in
WORK_DISTRIBUTION §4.5 (role guards), stub default-export components for every page file (including P3's) and
for features/booking/SeatMap.tsx, features/booking/HoldTimerPill.tsx, ui/GeneratedPoster.tsx, and lib/ files
with the exact exports in WORK_DISTRIBUTION §4.3. Verify `npm run build` passes, commit "p4(scaffold): …", push.

STEP 2+: design tokens and components per PRD §8.1 ("Midnight Aurora": deep ink background, coral→amber
primary, teal→blue secondary, tinted glass tiles — NOT purple-only); add Kokonut components; auth with Supabase
(Google + username/password via POST /auth/username-login), single-session claim + conflict modal + realtime
forced logout (PRD R20); the Login/Signup page as the showcase screen (PRD §8.3 P-1, modelled on the dark
glassy category-tile reference); AppShell/Header (logo left; tabs + HoldTimerPill + profile right);
GeneratedPoster; organiser Venues, VenueDetail (import P3's SeatMap with readOnly), HostEvent (5-step form,
debounced availability check, seating/pricing by venue type, poster upload or generated poster), MyEvents and
EventDashboard (numbers only from /organiser/events/:id/stats). Use mocks in mocks/organiser/ until the API is
ready (USE_MOCKS). Finally vercel.json and deploy. Commit with prefix "p4(…): …".
```

---

## 9. Git Workflow & Merge Rules

1. **Branches:** `main` (protected by convention) plus personal branches `p1/db`, `p2/api`, `p3/customer`, `p4/shell` (create more like `p3/checkout` if you like).
2. **Sync often:** every ~20 minutes:
   ```bash
   git fetch origin && git rebase origin/main   # on your branch
   git push --force-with-lease                  # only your own branch
   ```
3. **Merging to main:** fast PRs (no review wait needed for your own paths). Merge order at each checkpoint: **P1 → P2 → P4 → P3**.
4. **Pre-push checks:** client → `npm run build`; server → `npm test`; P1 → migrations run clean on a fresh schema.
5. **Never commit:** `.env`, keys, `node_modules`, `dist`.
6. **Commit format:** `p<N>(<area>): <what>`, for example `p3(checkout): add OTP boxes`.
7. **If you see a conflict, you edited a file you don't own.** Revert your change to that file and message the owner.
8. **Contract change protocol:** a renamed field or new endpoint must be (a) announced in chat, (b) agreed by the affected owners, (c) made by P2 (API) or P1 (SQL) with a 1-line note appended to the PRD changelog. Avoid this after T+50.

---

## 10. Integration Checkpoints

| Checkpoint | Gate | Who verifies |
|---|---|---|
| **T+10** | `main` has client scaffold + server scaffold; everyone pulled; `npm run dev` works for client (mocks) and server (`/healthz`) | P4, P2 |
| **T+30** (soft) | P4's `ui/` components and `lib/api`/`auth` real implementations merged, so P3 swaps placeholders | P4 → P3 |
| **T+50** | Migrations + seeds live on Supabase; server talks to the DB; `curl` hold → payment → OTP → booking works | P1 + P2 |
| **T+70** (soft) | Clients flipped to the real API; E2E-01 works locally | P3 + P4 |
| **T+85** | Render + Vercel deployed; E2E-01 passes on prod URLs; race test passes on prod | All |
| **T+110** | Code freeze, tag `v1.0` | P1 |

**Integration smoke script (T+50, P2 runs):**
```
POST /api/auth/username-login customer1      → token
POST /api/session/claim {force:true}
POST /api/events/<neon>/queue/join           → admitted
POST /api/holds {eventId, seatIds:[2 ids]}   → holdId, totalPaise
POST /api/payments {holdId, method:netbanking}
POST /api/payments/<id>/send-otp             → devOtp (console mode)
POST /api/payments/<id>/verify-otp {otp}     → succeeded, bookingId
GET  /api/bookings                           → 1 booking
GET  /api/organiser/events/<neon>/stats (organiser1) → sold 2
```

---

## 11. If Something Goes Wrong

| Problem | Fallback |
|---|---|
| Scaffold late (P4) | P3 keeps building components in `features/booking/`; there is nothing to merge until the scaffold lands |
| SQL functions late (P1) | P2 continues routes; P3/P4 stay on mocks; P1 prioritises `create_hold` → `confirm_booking` → `create_event` → the rest |
| Google OAuth setup blocked | Ship username/password first; OAuth is config-only later |
| SMTP blocked | `EMAIL_MODE=console` (dev OTP/link shown in the UI in non-prod). Still demoable |
| Realtime flaky | Polling fallbacks are already in place (seats 3 s, payment 2 s) |
| Render multi-instance needs a paid plan | Demo the LB locally via `infra/docker-compose.yml` (T-27); explain statelessness |
| Kokonut component unavailable | Build an equivalent with Tailwind + motion in `ui/` (P4) |
| Running out of time | Cut in this order: waiting room UI polish → organiser payments table → venue pan/zoom → mobile bottom nav. **Never cut:** seat locking, hold/payment timers, confirmation flow, dashboard numbers, deploy |

---

## 12. Hand-off to Testing

At T+120 the tester receives:
- **URLs:** Vercel app, Render API `/healthz`, Supabase project (read access).
- **Accounts:** PRD §14.4.
- **Test env toggle:** a second Render env (or local) with `HOLD_SECONDS=20 PAYMENT_SECONDS=8 QUEUE_MAX_ACTIVE=1 EMAIL_MODE=console` for fast timing tests.
- **Checklist:** PRD §14.2 (T-01 … T-27) and §14.3 (E2E-01 … E2E-11). Mark each ✅/❌ with a screenshot, and file bugs as `[T-xx] <owner> <summary>`.
- **Commands:**
  ```bash
  node tests/db/race.js        # T-05
  node tests/db/reconcile.js   # T-23
  npx playwright test -c tests/e2e
  cd server && npm test
  ```
- **Evaluation mapping:** PRD §0 lists where each of the 10 evaluation questions is answered and demonstrated.
