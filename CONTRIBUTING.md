# Contributing

This repository is published for review and portfolio showcase purposes only.

## External Contributions

External contributions are not accepted.

- do not open pull requests for feature work, fixes, or refactors
- do not use GitHub issues for support, roadmap requests, or implementation proposals
- do not assume that forks or copies grant reuse rights

The repository owner may continue to use branches and pull requests internally, but that workflow is not an invitation for public contribution.

## Internal Git Workflow

Internal changes to `main` should use short-lived branches and pull requests.

- keep branch work flexible, but expect local hooks to run before commits and pushes
- use squash merges only when merging into `main`
- write pull request titles in Conventional Commit form because the squash merge title becomes the commit message on `main`
- prefer `type(scope): summary`, for example `fix(auth): handle expired session`

Local hooks in this repository are intended to catch issues early:

- `pre-commit` runs `lint-staged`
- `commit-msg` runs `commitlint`
- `pre-push` runs `pnpm typecheck`

## Security Reports

If you discover a security issue, do not disclose it publicly. Follow the process in [SECURITY.md](./SECURITY.md).

## General Enquiries

For non-security enquiries, see [SUPPORT.md](./SUPPORT.md).
