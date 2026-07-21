# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is **pre-implementation**. It currently contains only a
product spec (`docs/PRD.md`) and an empty scaffold — no `package.json`,
no source files, no build/test tooling exist yet. There are no build,
lint, or test commands to run until that tooling is created.

Before writing code here, read `docs/PRD.md` in full — it is the single
source of truth for scope and design decisions. Do not re-derive product
decisions (data model, validation rules, API shape, UX behavior) from
scratch; they are already specified there. If an implementation choice
isn't covered by the PRD, check its "Open decisions / assumptions"
section (§16) before improvising.

## Intended architecture (per PRD)

A single-user, no-auth todo app, local-development-only (not deployed
publicly). Two-service architecture in this scaffold's existing
directories:

- `src/api` — Node.js + Express (or Fastify), TypeScript. REST/JSON API.
  PostgreSQL via Prisma ORM (schema + migrations).
- `src/web` — React + Vite, TypeScript. SPA that talks to `src/api` over
  HTTP.
- `tests/api` — backend unit/integration tests (against a real Postgres
  test DB, not mocks). This is the only test layer in scope per the PRD
  (§14) — no frontend or e2e tests are planned.
- `tests/web` — exists in the scaffold but is explicitly out of scope
  for now (PRD §14, §15).
- Local orchestration: Docker Compose running Postgres + api + web
  together (PRD §4). No CI/CD or deployment target exists — the app is
  never exposed to the internet, which is why it has no auth.

## Key data-model and behavior decisions worth knowing before touching related code

These are easy to get wrong by guessing instead of checking the PRD —
see the referenced sections for full detail:

- **Soft delete, no auto-purge**: deleting a task sets `deletedAt`
  instead of removing the row; the trash view has no automatic
  expiration, only manual permanent-delete (PRD §6.3).
- **Subtasks don't drive parent completion**: completing all subtasks
  never auto-completes the parent task; the UI just shows an `N/M`
  progress indicator (PRD §6.2). Subtasks have no due date/priority/tags
  of their own.
- **`dueDate` is timezone-free** (`YYYY-MM-DD`, no time component);
  overdue status is computed against the browser's local "today" (PRD
  §8). Don't introduce UTC datetime handling for this field.
- **Manual ordering is a single global `order` field**, not per-filter —
  reordering while a filter/tag is applied still mutates the global
  order in a way that keeps hidden tasks' relative order stable (PRD
  §7.4). This is the trickiest piece of logic in the app; read §7.4
  before changing reorder/filter code.
- **Tags** are freeform, user-managed (own CRUD screen), case-insensitive
  unique by name, no color, no per-task limit (PRD §9).
