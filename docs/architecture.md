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
  - rate limiting store (Redis)
  - Stripe (test mode billing + webhooks)
  - bot protection provider

---

## Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (and a small component library if used)
- **Database:** Postgres + Prisma (migrations)
- **Auth:** Auth.js (NextAuth) with Credentials + email verification + account lifecycle flows
- **Password Hashing:** Argon2id
- **Billing:** Stripe (test mode only)
- **Rate Limiting:** Redis-backed (Upstash)
- **Bot Protection:** Cloudflare Turnstile (signup at minimum)
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **Package Manager:** pnpm

---

## Authentication Flow

The app implements a complete email/password authentication lifecycle:

### Signup Flow

1. User submits signup form with email and password
2. Server validates input and checks for duplicate email
3. Password is hashed with Argon2id
4. User record is created in database
5. Email verification token is generated (HMAC-SHA-256 hashed, 1-hour expiry)
6. Verification email is sent via email adapter (dev mailbox in development, Resend in production)
7. User is automatically signed in and redirected to `/verify-email` page
8. User must verify email before accessing authenticated routes

### Email Verification Flow

1. User clicks verification link in email (`/verify-email?token=...`)
2. Server validates token (checks hash, expiry, and single-use status)
3. Token is marked as used (prevents reuse)
4. User's `emailVerified` timestamp is set
5. User is redirected to dashboard if already signed in; otherwise prompted to sign in

### Login Flow

1. User submits login form with email and password
2. Server validates credentials using Auth.js Credentials provider
3. Password is verified against stored Argon2id hash
4. JWT session is created with user ID and email verification status
5. User is redirected to dashboard (or callback URL if provided)

### Password Reset Flow

1. User requests password reset from `/forgot-password` page
2. Server always returns generic success (prevents account enumeration)
3. If user exists, password reset token is generated and email is sent
4. User clicks reset link (`/reset-password?token=...`)
5. Server validates token and shows password reset form
6. User submits new password
7. Password is hashed and updated in database
8. Token is marked as used
9. User is signed out and redirected to login

### Change Password Flow (Authenticated)

1. Verified user navigates to `/app/settings/change-password`
2. User submits current password and new password
3. Server verifies current password
4. New password is hashed and updated
5. User sees success message

### Change Email Flow (Authenticated)

1. Verified user navigates to `/app/settings/change-email`
2. User submits current password and new email address
3. Server verifies current password and checks for duplicate email
4. Email change token is generated and sent to new email address
5. User clicks verification link (`/verify-email-change?token=...`)
6. Server validates token and updates user email
7. Token is marked as used
8. If signed in, session is refreshed and user is redirected to settings/dashboard; if logged out, user is prompted to sign in

### Session Management

- **Strategy:** JWT sessions (Auth.js compatible with Credentials provider)
- **Storage:** JWT stored in HTTP-only cookie
- **Expiry:** Configurable via Auth.js session maxAge
- **Verification Check:** Middleware enforces email verification for `/app/*` routes
- **Session Refresh:** On-demand via `update({ refresh: true })` after verification or email change

### Token Security

- All tokens (verification, reset, email change) are:
  - Generated using cryptographically secure random bytes (32 bytes, base64url encoded)
  - Stored as HMAC-SHA-256 hashes in database (never plaintext)
  - Single-use (marked as used after consumption)
  - Time-limited (default 1 hour expiry)
  - Invalidated when new tokens are issued (prevents multiple active tokens)

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
- Sessions use Auth.js JWT strategy (credentials-compatible).
- `/app/*` routes are protected by `proxy.ts` (auth + email verification).
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
- Production uses a transactional provider with domain authentication (Resend).
- Optional override: set `EMAIL_PROVIDER=resend` to force Resend outside production for debugging.
- Never log tokens or full email links.

### Rate limiting (Redis)

- Backed by Redis (Upstash) for shared limits across instances.
- Used on auth endpoints and billing endpoints to mitigate abuse.

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

- Enabled at minimum on signup (Cloudflare Turnstile).
- Used alongside rate limiting to protect auth and billing surfaces and keep costs predictable.

---

## Security Considerations

Baseline security posture for this public demo:

- **Passwords**
  - stored only as strong hashes (never plaintext)
  - Argon2id is the password hashing algorithm
  - never logged
- **Tokens**
  - verification/reset/email-change tokens are short-lived and single-use
  - tokens are stored as HMAC-SHA-256 hashes with a server-side secret
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

## Local Development Setup

### Database (Postgres)

The application uses Postgres via Docker Compose for local development.

**Start Postgres:**

```bash
docker compose up -d
```

This starts a Postgres 16 container with:

- Database: `saas_foundations_dev`
- User: `postgres`
- Password: `postgres`
- Port: `5432`
- Named volume: `postgres_data` (persists data across container restarts)

**Check Postgres status:**

```bash
docker compose ps
```

**Stop Postgres:**

```bash
docker compose down
```

**Stop and remove data:**

```bash
docker compose down -v
```

### Environment Variables

Copy `.env.example` to `.env.local` and update as needed:

```bash
cp .env.example .env.local
```

The `DATABASE_URL` in `.env.example` is configured for the local Docker Postgres instance.

### Database Migrations

Once Prisma is set up, run migrations with:

```bash
pnpm db:migrate
```

### Database Seeding

Once seed scripts are added, run with:

```bash
pnpm db:seed
```

### Running Tests

**Unit/Integration Tests:**

Integration tests that require database access will use the local Postgres instance. Ensure Postgres is running before running tests:

```bash
# Start Postgres if not already running
docker compose up -d

# Ensure migrations are applied
pnpm db:migrate

# Run tests
pnpm test
```

**Test Database Assumptions:**

- **Local Development**: Tests use the same database as development (`saas_foundations_dev`) with test user IDs (`items_test_user_001`, `items_test_user_002`, `activity_test_user_001`, `activity_test_user_002`) that are cleaned up between test runs.
- **CI**: Tests use a separate test database (`saas_foundations_test`) provisioned by GitHub Actions. The CI workflow runs migrations before tests.
- **Data Cleanup**: Integration tests in `src/lib/__tests__/` automatically clean up test data (items, activity logs, and test users) before each test run to ensure isolation.

**E2E Tests:**

E2E tests (Playwright) do not require database access and can run independently.

---

## Deployment

Target deployment shape (MVP):

- host: Vercel (Hobby)
- DB: Neon Postgres (via Vercel Marketplace)
- rate limiting: Upstash Redis (free tier)
- email: Resend (free tier)
- bot protection: Cloudflare Turnstile (free tier)
- secrets: environment variables only (never committed)
- provide `.env.example` listing required environment variables
- provide `/api/health` for a basic health check (and to expose flags like billing enabled)
