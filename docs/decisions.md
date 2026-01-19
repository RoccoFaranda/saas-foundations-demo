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

---

## ADR-012: Use Auth.js (NextAuth) for authentication

- **Status:** Accepted
- **Context:** We need a production-grade auth framework that fits Next.js App Router and supports email/password credentials with verification and account flows.
- **Decision:** Use **Auth.js (NextAuth)** with a Credentials-based flow for email/password, plus custom verification and reset flows.
- **Consequences:**
  - Aligns with common Next.js ecosystem patterns and docs.
  - Requires Auth.js configuration and adapter integration for persistence.
  - Credentials flow remains custom for verification gating and lifecycle flows.
  - Session strategy is documented separately in ADR-013.

---

## ADR-013: Use Auth.js database sessions via Prisma adapter

- **Status:** Accepted
- **Context:** We need immediate session invalidation for password reset/change, and a professional demo should model real-world revocation patterns.
- **Decision:** Use **database-backed sessions** with the Prisma adapter. Session cookies store only a session token; session state is in the database.
- **Consequences:**
  - Enables server-side session revocation (e.g., after password reset).
  - Adds database tables for sessions/accounts required by Auth.js.
  - Introduces DB lookups for session validation.

---

## ADR-014: Password hashing uses Argon2id

- **Status:** Accepted
- **Context:** We need a modern, secure password hashing algorithm.
- **Decision:** Use **Argon2id** for password hashing and verification.
- **Consequences:**
  - Stronger resistance to GPU/ASIC attacks than legacy hashes.
  - Adds a native dependency and build considerations for CI.
  - Passwords are stored only as Argon2id hashes (never plaintext).

---

## ADR-015: Token storage uses HMAC-SHA-256

- **Status:** Accepted
- **Context:** Email verification, password reset, and email change tokens must be short-lived, single-use, and protected if the database is leaked.
- **Decision:** Store tokens as **HMAC-SHA-256** hashes using a server-side secret "pepper".
- **Consequences:**
  - Prevents raw token disclosure from DB leaks.
  - Requires secure management of a token-hash secret.

---

## ADR-016: Rate limiting uses Upstash Redis

- **Status:** Accepted
- **Context:** Auth endpoints need production-style rate limiting and abuse protection across serverless instances.
- **Decision:** Use **Upstash Redis** for rate limiting, with a lightweight in-memory fallback for local dev if needed.
- **Consequences:**
  - Requires Upstash credentials in production-like environments.
  - Enables consistent limits across multiple instances.

---

## ADR-017: Bot protection via Cloudflare Turnstile

- **Status:** Accepted
- **Context:** Signup needs bot protection with minimal user friction and privacy-friendly UX.
- **Decision:** Use **Cloudflare Turnstile** for bot mitigation on signup.
- **Consequences:**
  - Requires Turnstile site/secret keys.
  - Adds a frontend widget and server-side verification step.

---

## ADR-018: Email provider uses Resend with dev/test adapters

- **Status:** Accepted
- **Context:** We need a production-grade transactional email provider and safe dev/test behavior.
- **Decision:** Use **Resend** for production email delivery, and implement **dev/test adapters** that never log raw tokens or full links.
- **Consequences:**
  - Requires Resend API keys in production-like environments.
  - Enables safe local testing without real email delivery.

---

## ADR-019: Use Server Actions for auth form handling

- **Status:** Accepted
- **Context:** The app uses Next.js App Router and benefits from server-side mutations co-located with UI.
- **Decision:** Use **Server Actions** for auth form submissions and account mutation flows, with route handlers only where necessary.
- **Consequences:**
  - Simplifies request handling and reduces API boilerplate.
  - Requires careful server/client boundary discipline.

---

## ADR-020: Use a free-tier friendly demo hosting stack

- **Status:** Accepted
- **Context:** This is a low-traffic demo app, so we want a professional hosting stack that stays within free tiers and minimizes ops overhead.
- **Decision:** Use the following stack:
  - **Hosting:** Vercel Hobby
  - **Database:** Neon Postgres (via Vercel Marketplace)
  - **Rate limiting:** Upstash Redis (free tier)
  - **Email:** Resend (free tier)
  - **Bot protection:** Cloudflare Turnstile (free tier)
- **Consequences:**
  - Minimizes hosting costs for a low-traffic demo.
  - Requires provider-specific environment variables for integrations.
  - Encourages rate limiting and bot protection to avoid abuse-related usage spikes.
