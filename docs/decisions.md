# Architecture Decision Records (ADRs)

This file records key architecture and product decisions for the SaaS Foundations Demo app.

---

## ADR Template

Use this structure for new ADRs:

- **Status:** Proposed | Accepted | Deprecated | Superseded
- **Context:** What is the issue we’re addressing?
- **Decision:** What are we choosing, and why?
- **Consequences:** What are the trade-offs and follow-on implications?

---

## ADR-001: Use Next.js App Router

- **Status:** Accepted
- **Context:** We need a modern React framework with SSR and a strong full-stack story that fits the Next.js ecosystem.
- **Decision:** Use Next.js with the App Router for routing and React Server Components where appropriate.
- **Consequences:**
  - Benefits from React Server Components and built-in routing conventions.
  - Requires discipline around server/client boundaries.
  - Strong TypeScript support and broad ecosystem adoption.

---

## ADR-002: Use pnpm as package manager

- **Status:** Accepted
- **Context:** We want fast installs and consistent dependency resolution for a professional repo.
- **Decision:** Use pnpm for dependency management.
- **Consequences:**
  - Faster installs via content-addressable storage.
  - Stricter dependency resolution (generally a good thing).
  - Contributors must use pnpm consistently.

---

## ADR-003: MVP uses a per-user data model (no multi-tenancy)

- **Status:** Accepted
- **Context:** This is a public “skeleton SaaS” demo. We want to keep it basic and broadly reusable. Not all SaaS products require teams/orgs, and multi-tenancy introduces extra schema, authorization, and UX complexity that doesn’t provide MVP value here.
- **Decision:** Use a **per-user** model where all business data is scoped directly to `userId`. Do not implement tenants/workspaces/memberships in the MVP.
- **Consequences:**
  - Simpler schema and queries (`WHERE userId = session.userId`).
  - Faster to build and easier to reason about.
  - If a future project requires orgs/teams, we can extend later (Workspace + Membership + migration).

---

## ADR-004: Guest mode edits are local-only and reset on refresh

- **Status:** Accepted
- **Context:** The demo is public. Guests should be able to explore and interact without an account, while keeping costs predictable and avoiding abuse/cleanup.
- **Decision:** Guest mode reads seeded demo data and applies edits **in memory only** (client state). On refresh, guest “business data” resets to the seeded state.
- **Consequences:**
  - No guest DB writes (reduced abuse surface and no cleanup jobs).
  - Guest interactions still feel real (table edits, modals, etc.).
  - Authenticated mode supports real persistence.

---

## ADR-005: Theme selector (Light/Dark/System) with correct persistence

- **Status:** Accepted
- **Context:** Theme control is a common SaaS expectation and a high-impact UX polish feature. We want to demonstrate correct preference persistence and OS default handling.
- **Decision:** Implement a theme selector with **Light / Dark / System**:
  - Guests: stored in `localStorage`, defaulting to OS preference.
  - Authenticated users: stored on `User.themePreference` and mirrored locally for instant UX.
- **Consequences:**
  - Must avoid theme “flash” during hydration.
  - Adds a clear example of user preference persistence across the app.

---

## ADR-006: Auth includes full “normal SaaS” lifecycle flows

- **Status:** Accepted
- **Context:** A core proof point is implementing SaaS account foundations that real clients need (not just “login works”).
- **Decision:** Implement email/password authentication plus:
  - Email verification (required before accessing app routes)
  - Password reset (request + token + set new password)
  - Change password (requires current password)
  - Change email (verify new email before switching)
- **Consequences:**
  - Requires secure token handling (TTL + single-use + ideally hashed tokens in DB).
  - Requires rate limiting and careful UX to reduce account enumeration.
  - Strong credibility signal for technical reviewers.

---

## ADR-007: Stripe is test-mode only, verified users only, with safety controls

- **Status:** Accepted
- **Context:** Billing is common to SaaS and valuable to demonstrate. This demo is public, so we must avoid real payments and reduce abuse/cost risk.
- **Decision:** Implement Stripe in **test mode only** and restrict billing actions to **verified users** (no guests). Required controls:
  - Rate limiting on billing endpoints
  - Webhook processing is idempotent and deduplicated by Stripe `event.id`
  - Kill switch via environment variable: `BILLING_ENABLED=false`
  - Tight logging: no secrets, no tokens, no payload dumps
  - Bot protection in the app (at least on signup)
- **Consequences:**
  - More configuration than a purely simulated billing UI.
  - Demonstrates real integration patterns safely.
  - Requires graceful UX when billing is disabled (not error-looking).

---

## ADR-008: Bot protection is part of the MVP security posture

- **Status:** Accepted
- **Context:** Public demos are targets for spam/automation. Real client apps also need bot mitigation, especially around auth and billing surfaces.
- **Decision:** Implement bot protection at minimum on signup. Extend to login/reset/billing endpoints if needed.
- **Consequences:**
  - Adds provider/config dependency.
  - Protects email + billing infrastructure and reduces abuse.
  - Requires friendly UX for bot failures (clear retry messaging).

---

## ADR-009: Testing strategy uses Vitest + Testing Library + Playwright

- **Status:** Accepted
- **Context:** The repo is part of the portfolio. Tests provide regression protection and “proof” for reviewers.
- **Decision:**
  - Unit/integration: Vitest
  - UI/component tests: React Testing Library (light usage)
  - E2E: Playwright (small number of critical flows)
- **Consequences:**
  - Slightly more upfront work.
  - Strong credibility signal and better long-term maintainability.
  - E2E kept intentionally small to reduce flakiness.

---

## ADR-010: CI runs format check, lint, typecheck, unit tests, and build

- **Status:** Accepted
- **Context:** A professional repo should catch errors early and consistently on PRs.
- **Decision:** Configure CI to run:
  - Prettier format check
  - ESLint
  - TypeScript typecheck
  - Unit/integration tests
  - Build
- **Consequences:**
  - Slightly longer CI runs.
  - Higher confidence in changes and cleaner contributions.
  - E2E strategy can evolve as the project stabilizes.

---

## ADR-011: Postgres + Prisma 7 with config-based datasource and test DB strategy

- **Status:** Accepted
- **Context:** The app needs real persistence for authenticated data and safe, repeatable local/CI workflows. Prisma 7 introduces config-based datasource URLs that must live outside the schema file.
- **Decision:**
  - Use **Postgres + Prisma 7** for the database layer.
  - Keep datasource configuration in `prisma.config.ts` (not `schema.prisma`) per Prisma 7 requirements.
  - Generate Prisma Client into `src/generated/prisma` and keep it out of git.
  - Use **local Postgres via Docker Compose** for development and a **separate CI test database** in GitHub Actions.
- **Consequences:**
  - Requires Docker for local DB and a CI database bootstrap step.
  - Migrations and seeds are standardized via `pnpm db:migrate` and `pnpm db:seed`.
  - Tests can run against isolated data with predictable cleanup.
