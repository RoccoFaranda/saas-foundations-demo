# SaaS Foundations Demo

A Next.js App Router demo application showcasing SaaS foundations and best practices.

## Prerequisites

- Node.js 24.12.0 (see `.nvmrc`)
- pnpm 10.27.0 (see `packageManager` in `package.json`)
- Docker and Docker Compose (for local Postgres database)

## Local Setup

Use Volta or Corepack to install the pinned pnpm version. With Corepack:

```bash
corepack enable
```

Steps:

1. `pnpm install`
2. `docker compose up -d`
3. Create `.env.local` from `.env.example` (`cp .env.example .env.local` on macOS/Linux)
4. `pnpm dev`

## Getting Started

After Local Setup, open [http://localhost:3000](http://localhost:3000) in your browser.

For detailed database setup instructions, see [Architecture Documentation](./docs/architecture.md#local-development-setup).

## Available Scripts

| Script                | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `pnpm dev`            | Start development server                                  |
| `pnpm build`          | Build for production                                      |
| `pnpm start`          | Start production server                                   |
| `pnpm lint`           | Run ESLint                                                |
| `pnpm format`         | Format code with Prettier                                 |
| `pnpm format:check`   | Check code formatting                                     |
| `pnpm typecheck`      | Run TypeScript type checking                              |
| `pnpm test`           | Run unit tests (one-shot)                                 |
| `pnpm test:watch`     | Run unit tests in watch mode                              |
| `pnpm test:e2e`       | Run all Playwright E2E tests (chromium)                   |
| `pnpm test:e2e:theme` | Run only theme-focused Playwright tests                   |
| `pnpm theme:check`    | Validate theme tokens, contrast, and semantic style rules |
| `pnpm db:generate`    | Generate Prisma client                                    |
| `pnpm db:migrate`     | Run Prisma development migrations                         |
| `pnpm db:reset`       | Reset database via Prisma                                 |
| `pnpm db:seed`        | Seed database data                                        |
| `pnpm db:studio`      | Open Prisma Studio                                        |

## Environment Variables

Create a `.env.local` file in the project root for local development:

```bash
# Example environment variables (no secrets in this file)
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_APP_URL` must be an absolute URL in production/preview so emails can include valid links.
In local dev/test, the app falls back to `http://localhost:3000` if it is not set.
See `.env.example` for all available environment variables (when available).

## Project Structure

```
├── app/              # Next.js App Router pages and layouts
├── src/
│   ├── components/   # Reusable React components
│   └── test/         # Test utilities and setup
├── e2e/              # Playwright E2E tests
├── docs/             # Project documentation
└── public/           # Static assets
```

## Documentation

- [PRD](./docs/PRD.md) - Product Requirements Document
- [Architecture](./docs/architecture.md) - System architecture overview
- [Decisions](./docs/decisions.md) - Architecture Decision Records (ADRs)
- [Theme Tokens](./docs/theme-tokens.md) - Theme token contract, recipes, and quality gates

## Contributing

1. Create a feature branch from `main`
2. Make changes following the existing code style
3. Ensure checks pass:
   - Always: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
   - UI/theme changes: `pnpm theme:check`
   - User-flow changes: `pnpm test:e2e` (or `pnpm test:e2e:theme` for theme-only updates)
4. Open a pull request

## License

Private - All rights reserved.
