# SaaS Foundations Demo — PRD (MVP)

## 1. Summary

**SaaS Foundations Demo** is a public Next.js demo app that serves as:

1. an interactive portfolio for prospective clients to click through, and
2. a personal marketing website (landing + services/process + contact).

The demo is intentionally “skeleton SaaS”: it’s not a real business product, but it proves professional implementation of common SaaS foundations:

- polished UI and dashboard patterns
- authentication lifecycle (verification, reset password, change email/password)
- theme selector (light/dark/system)
- safe, demo-friendly Stripe integration (test mode)
- abuse prevention (bot protection + rate limiting)
- tests, CI, docs, and clean architecture

---

## 2. Goals

### Product goals

- Visitors can explore a realistic SaaS UI instantly as a Guest (no friction).
- Visitors can optionally sign up and experience a real SaaS auth lifecycle.
- Technical reviewers can inspect a public repo that demonstrates professional standards:
  - clean structure, typed APIs, validation, testing, CI, and secure defaults.

### Success criteria (MVP)

- A client can click around the demo and quickly conclude: “This person can build a proper SaaS web app.”
- All core flows work reliably in production deployment (not just locally).
- The app remains safe/cost-controlled as a public demo.

---

## 3. Non-goals

- Not a full “real SaaS” for public use.
- No teams/orgs/multi-tenancy (per-user only).
- No live payments (Stripe test mode only).
- No complex RBAC/permission matrices beyond “guest vs authenticated”.
- No background jobs/queues beyond what’s required for the MVP.

---

## 4. Target users

### Primary

- Prospective clients (founders, CTOs, agencies) evaluating a freelancer.

### Secondary

- General visitors viewing the personal website.

---

## 5. Core product decisions (locked)

### Tenancy model

- **Per-user** data model only.
- No workspaces/tenants/memberships in MVP.

### Guest data policy

- Guest sees seeded demo data.
- Guest edits are **local-only** and reset on refresh.
- **Theme preference persists** for guests (localStorage + OS default).

### Auth approach

- Email + password auth.
- Email verification required before accessing authenticated app routes.
- Include common SaaS account flows: verify email, reset password, change email, change password.

### Billing approach

- Status: **planned** (Stripe integration is not implemented in code yet).
- Stripe will be implemented in **test mode only**.
- Billing actions will be available only to **verified users** (never guests).
- Safety controls (when implemented):
  - rate limiting
  - webhook event deduplication by Stripe `event.id`
  - kill switch (`BILLING_ENABLED=false`)
  - tight logging (no secrets/payload dumps)
  - bot protection in the app (at least on signup; optionally on billing endpoints)

---

## 6. User stories

### Guest

- As a guest, I can explore a realistic SaaS dashboard without creating an account.
- As a guest, I can interact with tables/forms and see changes reflected immediately.
- As a guest, I understand that my changes are demo-only and will reset.
- As a guest, I can switch theme (light/dark/system) and it persists.

### Authenticated user

- As a user, I can sign up with email/password and verify my email.
- As a user, I can log in only after verification.
- As a user, I can request a password reset and set a new password.
- As a user, I can change my password from settings.
- As a user, I can change my email safely (verification sent to new email).
- As a verified user, I can access a billing page and start a Stripe test checkout.
- As a user, I can use the dashboard features (CRUD, search/filter/sort, export) on my own data.

---

## 7. MVP feature set

### 7.1 Marketing site

Pages:

- Home (CTAs: Explore Demo, Create Account, Contact)
- About
- Process
- SaaS Foundations (explains what’s included + what’s real vs simulated)
- Contact (form with bot protection + rate limiting)

Site-wide:

- Responsive layout
- Theme selector
- Basic SEO metadata

### 7.2 Guest demo (no auth)

Routes:

- `/demo` dashboard
- optional: `/demo/items/[id]` detail

Features:

- KPI cards computed from demo seed data
- Primary table (search, filter, sort, pagination)
- Item view/edit UI
- Activity feed (can be client-only for guest)
- Clear “Guest mode: changes reset on refresh” messaging
- Theme selector persistence (localStorage + OS preference)

Constraints:

- No DB writes from guest mode.

### 7.3 Authenticated app (verified users)

Routes (example):

- `/app/dashboard`
- `/app/items`
- `/app/items/[id]`
- `/app/settings/profile`
- `/app/settings/security`
- `/app/settings/billing`

Features:

- CRUD for main domain object (Items/Projects)
- KPI cards computed from user data
- Activity feed persisted (recommended)
- Export CSV (real export of user’s data)
- Theme preference stored on user (and mirrored locally)
- Account settings:
  - change password
  - change email (verify new email)

### 7.4 Auth & email lifecycle

Auth pages:

- `/signup`, `/login`
- `/verify/[token]` (email verification)
- `/forgot-password`, `/reset-password/[token]`

Behaviors:

- Signup sends verification email
- Unverified users cannot access `/app/*` (show “verify your email” UX + resend button)
- Reset password uses secure token flow and invalidates sessions
- Change email uses verify-new-email flow

Email provider:

- Local/dev can use console/dev-mailbox adapter.
- Production uses a transactional provider with domain authentication.
- Never log tokens or raw email links.

### 7.5 Billing (Stripe test mode only)

Status: **planned** (billing UI and API endpoints are not implemented yet).

Billing page:

- Shows current plan state (e.g. Free vs Pro (Test))
- Upgrade button (verified users only)

Backend (intended):

- Endpoint to create Stripe Checkout Session (test mode)
- Webhook endpoint validates and processes Stripe events:
  - dedupe by `event.id`
  - idempotent plan update
- Kill switch:
  - when disabled, frontend shows “Billing temporarily disabled” (not an error)

Security:

- rate limiting on billing endpoints
- tight logging
- optional bot check on billing endpoints if needed

---

## 8. Dashboard content (MVP)

The dashboard is a showcase of common SaaS UI patterns:

- KPI cards (counts + date-filtered summary)
- Primary table:
  - search by name
  - filter by status/tag
  - sort by updated/name
  - pagination
  - row actions: view/edit/archive/delete
- Quick actions:
  - create item
  - import sample data (authenticated)
  - export CSV (guest: demo data; auth: real data)
- Activity feed:
  - create/update/delete
  - export
  - theme change
  - billing events (if applicable)

---

## 9. Data model (MVP)

### Core tables

**User**

- id, email (unique), passwordHash
- emailVerifiedAt (nullable)
- name (nullable)
- themePreference: `light | dark | system | null`
- plan: `free | pro_test | ...` (simple)
- createdAt, updatedAt

**Item** (or Project)

- id, userId (FK)
- name, status, tag?, summary?
- createdAt, updatedAt

**ActivityLog**

- id, userId
- action (string enum style)
- metadata (small JSON, no secrets)
- createdAt

### Token tables (recommended)

- EmailVerificationToken (hashed token, expiresAt, usedAt)
- PasswordResetToken (hashed token, expiresAt, usedAt)
- EmailChangeToken (hashed token, newEmail, expiresAt, usedAt)

### Stripe support

- BillingCustomer (userId, stripeCustomerId) OR on User
- StripeEvent (stripeEventId unique, type, processedAt)

---

## 10. Security, abuse prevention, privacy

### Security baseline

- Passwords are hashed (never stored plaintext).
- Tokens are stored hashed, short-lived, single-use.
- No secrets or tokens in logs.
- Input validation on all endpoints (Zod recommended).
- Prevent account enumeration for password reset.

### Abuse prevention

- Rate limit: signup, login, resend verification, forgot password, billing endpoints
  - per IP + per user + global where relevant
- Bot protection on signup (and optionally login/reset/billing).

### Privacy

- Collect minimal personal data: email + optional name + theme preference.
- Provide “Demo & Privacy” text/page explaining what is stored and why.
- Avoid logging PII beyond what’s necessary.

---

## 11. Testing (MVP)

Tools:

- Vitest (unit/integration)
- React Testing Library (light UI tests)
- Playwright (E2E)

Required Playwright E2E:

1. Guest edit resets on refresh
2. Signup -> verify email -> login -> dashboard
3. Billing:
   - billing enabled: can start checkout session
   - billing disabled: graceful UI state
   - webhook dedupe: replay same event id doesn’t double-apply

Required unit/integration tests:

- Token logic (hashing, expiry, single-use)
- Password reset flow behavior
- Stripe webhook handler idempotency/dedupe
- Validation schemas

---

## 12. Tooling & CI (MVP)

- ESLint + Prettier + TypeScript typecheck
- Scripts: format, lint, typecheck, test, test:e2e, build
- GitHub Actions:
  - format:check, lint, typecheck, test, build on PR/push
  - E2E either on main only or scheduled to keep CI stable early

---

## 13. Deployment (MVP)

- Deploy to a modern Next.js host (e.g. Vercel).
- Postgres hosted (e.g. Neon/Supabase DB/Railway).
- Secrets via environment variables (never committed).
- Provide `.env.example` with required variables.

---

## 14. Milestones (high-level)

1. Foundations: theme + layouts + CI + basic marketing pages
2. Guest demo dashboard: seeded data + polished interactions + guest-reset test
3. DB + authenticated dashboard CRUD + export + activity log
4. Auth lifecycle: signup/verify/login/reset/change password/change email + E2E
5. Abuse prevention: rate limiting + bot protection + docs updates
6. Stripe test mode: checkout + webhook dedupe + kill switch + E2E
7. Documentation polish + “what’s simulated vs real” walkthrough

---
