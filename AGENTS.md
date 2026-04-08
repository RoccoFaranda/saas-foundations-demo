# AGENTS.md

## Purpose

This file is the canonical agent instructions document for this repository.

SaaS Foundations Demo is a public-facing reference implementation of common SaaS product foundations. Before large or cross-cutting changes, skim these docs for context:

- `docs/PRD.md`
- `docs/architecture.md`
- `docs/decisions.md`
- `docs/REVIEWER_GUIDE.md`

## Commands

- Runtime: Node `24.12.0`
- Package manager: pnpm `10.27.0`
- Dev server: `pnpm dev`
- Format check: `pnpm format:check`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Unit/integration tests: `pnpm test`
- E2E tests: `pnpm test:e2e`
- Theme checks: `pnpm theme:check`
- Production build: `pnpm build`
- Prisma client: `pnpm db:generate`
- Dev migrations: `pnpm db:migrate`

CI parity matters. The shared CI workflow runs format, lint, typecheck, theme checks, tests, and build. E2E and visual regression have separate GitHub Actions workflows.

## Working Style

- Keep diffs small, reviewable, and scoped to the user request.
- Follow existing repo patterns before introducing new abstractions.
- Avoid repo-wide refactors, mass renames, or dependency churn unless the task requires them.
- Preserve unrelated user changes. Do not overwrite or revert work you did not make.
- Add or update tests when behavior changes.
- Prefer the smallest coherent implementation that satisfies the request.
- Keep TypeScript strict and use explicit types at important boundaries.
- Prefer framework-idiomatic patterns over generic abstractions.

## Product And Domain Guardrails

- This is a polished public demo. Favor clear UX, graceful empty/error states, and credible product behavior.
- Never log secrets, tokens, webhook signatures, password-reset links, or sensitive personal data.
- Guest mode must never write business data to the database. Business data resets on refresh; theme preference may persist locally.
- Billing and Stripe are not shipped as core public functionality. Keep billing work gated behind `BILLING_ENABLED`, require authenticated and authorized users, verify webhook signatures, dedupe by `event.id`, and never log raw payloads or secrets.
- API handlers should stay thin: validate input, call a service layer, and return a consistent response.
- API error responses should use the repository standard shape:
  - `{ error: { code: string, message: string } }`
- In Next.js App Router, default to Server Components. Add `"use client"` only when interactivity or browser APIs require it. Never import server-only modules into client components.
- Keep theme and hydration behavior stable. Do not introduce flash-of-wrong-theme or client/server markup mismatches.

## Regression-Sensitive Flows

Take extra care not to regress these flows:

- Guest demo mode: business data is editable in-session, but refresh resets it to seeded state.
- Authentication lifecycle: signup, verify email, login, reset/change credentials.
- Billing toggles and webhook idempotency if billing code is touched.

If you change one of these flows, add or update automated coverage.

## Verification

Run the smallest relevant set of checks for the change, and explicitly note any skipped checks:

- Always after code changes: `pnpm format:check`, `pnpm lint`
- TypeScript or logic changes: `pnpm typecheck`, `pnpm test`
- UI or theme changes: `pnpm theme:check`
- User-flow changes: `pnpm test:e2e`
- Release-safety or CI-sensitive changes: `pnpm build`

If UI or user flows changed, prefer browser verification in addition to automated checks when tooling is available.

## Dependencies

- When adding or upgrading packages, verify the latest stable version and recommended setup using official docs or release notes.
- Call out breaking changes or required config changes.
- Do not downgrade packages without a documented compatibility reason.

## Git And Review

- Use short-lived branches and PRs for internal changes.
- PR titles and squash-merge commit messages should follow Conventional Commits, preferably `type(scope): summary`.
- Local hooks already enforce part of the workflow:
  - `pre-commit`: `lint-staged`
  - `commit-msg`: `commitlint`
  - `pre-push`: `pnpm typecheck`
- For review work, prioritize findings first: correctness, regressions, security issues, and missing verification before style suggestions.

## Windows And Encoding

- If terminal output on Windows shows mojibake but files render correctly in the editor or browser, treat that as a terminal-encoding artifact first.
- Do not change user-facing strings or symbols only to "fix" terminal output.
- Verify suspect text via file contents, editor rendering, or browser output before editing.
