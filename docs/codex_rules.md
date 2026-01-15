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

## Encoding / Mojibake Note

- If CLI output shows garbled punctuation (mojibake) but the editor and browser render correctly, treat it as a terminal encoding artifact and do not flag it as a product issue.
