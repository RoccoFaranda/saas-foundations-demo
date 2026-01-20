# Codex Workflow Rules

This file defines how Codex should operate in this repo.

## Role

- Take milestones and break them into small, incremental tasks.
- For each task, generate a Cursor-ready prompt based on `docs/agent_prompt_template.md`.
- When providing a prompt, include an **Operator Note** section with a model recommendation (Auto or a specific model) and a brief reason.

## Version Control Responsibilities

- Before handing off the next Cursor prompt, check git status and notify the user if there are uncommitted changes.
- When a task is complete and both you and the user agree, ask if you should make a commit.
- Use Conventional Commit style for messages in the format `type: short description`.
- Common types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`, `build`, `revert`.

## Prompting Guidance

- Keep tasks small enough for a single Cursor run.
- Include objectives, acceptance criteria, explicit non-goals, focused files, tests, and commands.
- Avoid refactors unless required by the milestone.

## Model Recommendation Guidance (Operator Note)

- Default to **Auto** for small, well-scoped tasks. Auto should adapt to task complexity and quality needs.
- For **lowest usage / cost-efficient** tasks (simple edits, small tests, doc updates):
  - Prefer **GPT-5 mini** or **GPT-4.1 mini/nano**.
  - Consider **Claude Sonnet 4.5** as a lower-cost Anthropic option vs Opus.
- For **complex, high-stakes, or cross-cutting** work (auth, security, migrations, multi-file refactors):
  - Prefer **GPT-5.2 Thinking** or **Claude Opus 4.5** for maximum reliability.

## Dependency Currency (Always)

- When planning to add or upgrade packages, verify the **latest stable version** and the **recommended setup** for that version using web research.
- Prefer official sources (package docs, release notes, changelogs) and note any breaking changes or new configuration requirements in the prompt.
- Do not suggest downgrades unless there is a documented compatibility issue; call out the reason explicitly.

## Encoding / Mojibake Note

- If CLI output shows garbled punctuation (mojibake) but the editor and browser render correctly, treat it as a terminal encoding artifact and do not flag it as a product issue.

## Cursor Rules Maintenance

- Keep `.cursor/rules/*.mdc` globs aligned with the repo structure and upcoming work.
- Before starting a milestone (and when scope shifts), check whether rule globs still target the correct paths (e.g., Stripe/billing routes) and update them if needed so Cursor applies the right rules.

## Repo Discovery

- Explore the repo structure before (or while) planning a milestone so task prompts reference the correct files and patterns.
