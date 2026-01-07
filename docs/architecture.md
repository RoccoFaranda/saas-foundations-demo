# Architecture Overview

This document describes the current architecture of the SaaS Foundations Demo app. It is intentionally concise and updated as the project evolves.

---

## System Architecture

This is a single Next.js application that serves both:

- a public marketing website, and
- an interactive SaaS-style demo app (guest + authenticated).

High-level components:

- **Marketing (public):** landing pages, services/process, contact
- **Demo (public / guest):** seeded data, interactive UI, edits reset on refresh
- **App (authenticated):** per-user data persisted to the database
- **API / Route Handlers:** auth lifecycle, CRUD endpoints, billing endpoints, webhooks, health
- **Database:** Postgres via Prisma (users, items, tokens, logs, billing state)
- **External Services:**
  - transactional email provider (verification, reset, change email)
  - Stripe (test mode billing + webhooks)
  - bot protection provider

---

## Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (and a small component library if used)
- **Database:** Postgres + Prisma (migrations)
- **Auth:** Email + password + verification + account lifecycle flows
- **Billing:** Stripe (test mode only)
- **Bot Protection:** enabled at least on signup
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **Package Manager:** pnpm

---

## Directory Structure

Intended structure (may evolve slightly as features land):

- `app/`
  - `(marketing)/` marketing pages (home, about, process, foundations, contact)
  - `(demo)/` guest demo routes (dashboard with seeded data)
  - `(auth)/` signup/login/verify/reset flows
  - `(app)/` authenticated routes (dashboard, items, settings, billing)
  - `api/` route handlers (auth, items, billing, webhooks, health)
- `src/`
  - `components/` reusable UI components
  - `lib/` server-side modules and shared utilities (db, auth helpers, services)
  - `styles/` global styles / design tokens (if needed)
- `docs/` product + architecture docs and ADRs
- `e2e/` Playwright E2E tests
- `prisma/` Prisma schema and migrations (if using Prisma defaults)

---

## Data Flow

### Guest mode

- Guest routes render using seeded demo data (fixtures and/or read-only DB seed).
- Guest interactions (edit/create/delete in tables) are applied in client state only.
- Refresh resets the UI back to the seeded state.
- Theme preference persists via localStorage and OS preference.

### Authenticated mode (per-user)

- The current user is derived from the session.
- All business data access is scoped to the user:
  - queries always include `WHERE userId = session.userId`.
- Mutations follow a standard pattern:
  1. Validate input (schema validation)
  2. Authorize (must be authenticated and verified where required)
  3. Perform DB write
  4. Write an ActivityLog entry (where appropriate)
  5. Return a safe response shape

---

## External Services

### Transactional email

Used for:

- email verification
- password reset
- change email verification

Demo-safe behavior:

- Local/dev can use a console or dev mailbox adapter.
- Production uses a transactional provider with domain authentication.
- Never log tokens or full email links.

### Stripe (test mode only)

- No live charges and no production keys.
- Billing actions restricted to verified users.
- Required safety controls:
  - rate limiting on billing endpoints
  - webhook dedupe by Stripe `event.id` and idempotent processing
  - kill switch via environment variable: `BILLING_ENABLED=false`
  - tight logging (no secrets, no token/payload dumps)
- Frontend must handle billing disabled state gracefully.

### Bot protection

- Enabled at minimum on signup.
- Used alongside rate limiting to protect auth and billing surfaces and keep costs predictable.

---

## Security Considerations

Baseline security posture for this public demo:

- **Passwords**
  - stored only as strong hashes (never plaintext)
  - never logged
- **Tokens**
  - verification/reset/email-change tokens are short-lived and single-use
  - tokens should be stored hashed server-side where possible
- **Rate limiting**
  - applied to signup/login/reset/resend verification/billing endpoints
  - consider per-IP + per-user + global caps
- **Account enumeration**
  - password reset requests return a generic success response
- **Webhooks**
  - verify Stripe signatures (test mode)
  - deduplicate by event id and ensure idempotent processing
- **Logging**
  - structured logs in production
  - never log secrets/tokens/signatures/raw webhook bodies
- **Guest mode**
  - no DB writes from guest routes

---

## Deployment

Target deployment shape (MVP):

- host: Vercel (or equivalent Next.js hosting)
- DB: hosted Postgres (e.g. Neon/Supabase DB/Railway)
- secrets: environment variables only (never committed)
- provide `.env.example` listing required environment variables
- provide `/api/health` for a basic health check (and to expose flags like billing enabled)
