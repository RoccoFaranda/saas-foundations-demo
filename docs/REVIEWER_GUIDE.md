# Reviewer Guide

This guide is for prospective clients and technical reviewers who want a fast path through the repository.

## Project Intent

SaaS Foundations Demo is a public reference implementation of common SaaS product foundations. The goal is to demonstrate product thinking and engineering execution in one place:

- marketing site quality
- guest and authenticated app flows
- auth lifecycle completeness
- security and abuse-prevention baseline
- testing, CI, and documentation discipline

For fuller product context, start with the [PRD](./PRD.md).

## Suggested Review Order

1. [PRD](./PRD.md) for product scope and constraints
2. [Architecture](./architecture.md) for system shape and key subsystems
3. [Decisions](./decisions.md) for important implementation tradeoffs
4. `app/` and `src/` for route structure and domain logic
5. `e2e/` and test files for critical behavior coverage
6. `.github/workflows/` for CI and regression coverage

## Areas Worth Inspecting

- authentication lifecycle and account management flows
- guest/demo behavior versus authenticated persistence
- consent capture, audit logging, and replay handling
- rate limiting, readiness/liveness, and operational defaults
- legal/privacy content wiring
- test coverage depth across unit, integration, E2E, and visual checks

## Current Status

Implemented today:

- marketing site and technical/product documentation pages
- guest demo mode with demo-data reset behavior
- authenticated app flows and persisted user data
- email verification, password reset, change email, and change password flows
- consent audit persistence and replay token handling
- CI, unit tests, E2E coverage, and visual regression checks

Planned, not yet shipped:

- Stripe billing and webhook processing

That distinction is intentional. The repository is meant to be credible, not overstated.
