# SaaS Foundations Demo

A Next.js App Router demo application showcasing SaaS foundations and best practices.

## Prerequisites

- Node.js (see `.nvmrc` for version)
- pnpm
- Docker and Docker Compose (for local Postgres database)

## Getting Started

```bash
# Install dependencies
pnpm install

# Start Postgres database (required for app and integration tests)
docker compose up -d

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For detailed database setup instructions, see [Architecture Documentation](./docs/architecture.md#local-development-setup).

## Available Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Start development server                 |
| `pnpm build`        | Build for production                     |
| `pnpm start`        | Start production server                  |
| `pnpm lint`         | Run ESLint                               |
| `pnpm format`       | Format code with Prettier                |
| `pnpm format:check` | Check code formatting                    |
| `pnpm typecheck`    | Run TypeScript type checking             |
| `pnpm test`         | Run unit tests (one-shot)                |
| `pnpm test:watch`   | Run unit tests in watch mode             |
| `pnpm test:e2e`     | Run E2E tests with Playwright (chromium) |

## Environment Variables

Create a `.env.local` file in the project root for local development:

```bash
# Example environment variables (no secrets in this file)
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

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

## Contributing

1. Create a feature branch from `main`
2. Make changes following the existing code style
3. Ensure all checks pass: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
4. Open a pull request

## License

Private - All rights reserved.
