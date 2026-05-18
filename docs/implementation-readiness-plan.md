# Implementation Readiness Plan

Date: 2026-05-15

## Purpose

This document defines what must be prepared before the project moves from audit and product planning into actual implementation.

The goal is not to start the frontend yet. The goal is to create a clean bridge between:

- legacy knowledge,
- target product architecture,
- local-first development,
- future production deployment,
- and a safe first implementation milestone.

## Current Readiness Status

The project is ready for final audit closure work, but not yet for application scaffolding.

Already done:

- Git repository is initialized.
- GitHub remote is connected and pushed.
- Working codename is `Orchard`.
- Legacy workflows, Apps Script code, and schema references are preserved.
- Known hardcoded secrets in legacy files were redacted before tracking.
- Current architecture and process documentation exists.
- Legacy Google Sheets responsibilities are documented.
- Legacy status/state behavior is documented.
- LinkedIn solo branch differences are documented.
- Target product data model is drafted.
- MVP application scope is drafted.

Still needed before implementation:

- architecture decisions need to be captured explicitly,
- local environment boundaries need to be written down,
- first implementation milestone needs to be defined,
- database migration strategy needs to be selected,
- n8n integration strategy needs to be split into stub/local/production phases,
- remaining owner inputs need to be accepted or consciously deferred.

## Phase Boundary

This phase should end with documents and decisions, not code.

Do not start yet:

- Next.js scaffold,
- database migrations,
- Docker Compose files,
- n8n workflow edits,
- authentication implementation,
- publishing adapter implementation.

Acceptable in this phase:

- documentation updates,
- architecture decision records,
- local setup notes,
- future file/folder structure proposal,
- environment variable inventory,
- implementation milestone plan,
- risk review.

## Recommended Implementation Sequence

### Phase 0: Audit Closure

Goal: make the current knowledge base stable enough to become the starting point for implementation.

Tasks:

- review current audit documents,
- mark which legacy behavior is reference-only,
- mark which legacy behavior should be reused or adapted,
- confirm MVP boundaries,
- confirm that newsletter remains out of MVP,
- confirm that LinkedIn solo branch is reference material for the unified LinkedIn publisher.

Exit criteria:

- audit checklist is complete or explicitly deferred,
- owner inputs are updated,
- architecture decision document exists.

### Phase 1: Project Skeleton Decision

Goal: decide how the future codebase will be organized before generating files.

Recommended shape:

```text
apps/
  web/              Next.js app later
packages/
  database/         migrations and typed DB helpers later
  shared/           shared domain types later
  n8n-client/       webhook/client boundary later
infra/
  docker/           optional local infra definitions later
docs/
  ...
```

This is only a proposed future structure. It should not be created until the audit phase is closed.

Decision needed:

- monorepo from the start, or single Next.js app first with room to split later.

Recommendation:

- use a small monorepo-style structure once implementation starts, because database, n8n client contracts, and shared domain types will likely become separate concerns quickly.

### Phase 2: Local Environment Plan

Goal: make local development reproducible without binding the product to one machine.

Expected local services:

- local Postgres in Docker,
- local self-hosted n8n in Docker,
- local Next.js app later,
- local `.env` files outside Git.

Recommended env categories:

- app URL and environment,
- database connection,
- n8n base URL and webhook secrets,
- AI provider credentials,
- media storage configuration,
- platform integration credentials,
- session/auth secrets.

Recommended rule:

- this repo should eventually include `.env.example`, but never real `.env` files.

Open decision:

- whether the existing local Docker setup should stay outside this repo, or whether a project-specific Docker Compose file should be added later.

Recommendation:

- keep existing Docker setup as-is during audit,
- add project-specific compose only when implementation actually needs repeatable setup.
- use plain local filesystem media storage for the first milestone, behind a provider-agnostic media storage boundary.

### Phase 3: Database Foundation

Goal: create the first clean product schema from the target model.

Recommended order:

1. choose migration tool,
2. create initial schema migration,
3. create seed data for one local user/workspace/brand,
4. add basic indexes and constraints,
5. add schema documentation,
6. generate or write typed access helpers later.

Migration tool decision options:

- plain SQL migrations,
- Prisma migrations,
- Drizzle migrations,
- Supabase migrations if Supabase becomes the chosen runtime.

Recommendation:

- start with plain SQL or Drizzle-style migrations if portability is the priority,
- avoid depending on Supabase-only features until Supabase is confirmed as a product dependency.

Important:

- legacy database schemas should inform the model, but should not be copied directly.

### Phase 4: Stub-First Application

Goal: build the first app without requiring live platform publishing.

First app should support:

- seeded local user,
- workspace and brand setup,
- brand profile onboarding,
- content item creation,
- platform variant editing,
- media metadata attachment,
- approval status,
- schedule intent,
- automation run records,
- mock publication results.

This lets the product workflow be validated before connecting live n8n and social APIs.

The first app should not require:

- OAuth,
- real Facebook/Instagram/LinkedIn publishing,
- production auth,
- live AI generation,
- final media storage provider.

### Phase 5: n8n Adapter

Goal: connect the app to n8n through a stable boundary.

Recommended pattern:

- frontend calls app server/API,
- app server validates request and writes database records,
- app server triggers n8n webhook,
- n8n performs orchestration,
- n8n writes result back through app API or a controlled database interface,
- app displays run and publication status from product tables.

Avoid as long-term pattern:

- browser calls n8n webhooks directly,
- n8n owns product state,
- Google-Sheets-style status strings as the primary state model,
- service-role secrets inside workflow exports.

### Phase 6: Publishing Integration

Goal: reintroduce live publishing platform by platform.

Recommended order:

1. LinkedIn, using solo branch lessons for media ordering and endpoint parameters.
2. Facebook.
3. Instagram.
4. Blog later.
5. Newsletter only if reintroduced with a new product design.

Each platform should have:

- explicit payload contract,
- media ordering rules,
- supported content types,
- retry/idempotency behavior,
- failure reasons,
- result mapping into `publication_results`.

## Architecture Decisions To Capture

Create `docs/architecture-decisions.md` before coding.

Initial decisions to record:

- local Postgres first, remote Postgres/Supabase later,
- local self-hosted n8n first, movable to remote server later,
- n8n remains orchestration layer, not product state owner,
- browser should not call n8n directly long term,
- database model should be Postgres-native and portable,
- newsletter is outside MVP,
- solo LinkedIn branch is reference for unified LinkedIn publishing,
- Google Sheets is reference material, not product model,
- implementation starts stub-first before live platform publishing.

## Branch And Commit Workflow

Recommended workflow:

- keep `main` as stable baseline,
- use small focused commits,
- prefer documentation commits during audit,
- use feature branches once code starts,
- push after meaningful milestones,
- run a secret scan before commits that include legacy exports or config.

Suggested branch naming later:

- `docs/...`
- `infra/...`
- `app/...`
- `db/...`
- `n8n/...`

## First Implementation Milestone

When implementation starts, the first milestone should be:

> A local product skeleton that can model one brand, one content item, platform variants, approval, schedule intent, and mock automation status without touching real social platforms.

Expected deliverables:

- project scaffold,
- local database connection,
- initial migrations,
- seed script,
- minimal brand onboarding,
- minimal content workspace,
- platform variant editor,
- schedule/approval state,
- mock automation run log,
- local filesystem media handling through a media storage service boundary,
- no live publishing.

This proves the product workflow before adding integration complexity.

The first live publisher integration should be implemented and tested separately from runtime scheduling behavior. The currently accepted technical order is Facebook, Instagram, LinkedIn, while actual content publication remains per platform and per scheduled job.

## Remaining Owner Inputs

Before implementation, the owner should confirm or defer:

- whether first app should use seeded local user or real auth immediately,
- whether Supabase Auth is a desired product dependency or later option,
- whether media should start as metadata-only, local file references, or object storage,
- whether scheduling is per platform or one master schedule with platform overrides,
- whether approval is required before scheduling in MVP,
- whether platform variants can publish independently,
- which LinkedIn content types should be tested first,
- whether the local Docker setup should be committed later as project infra.

## Readiness Exit Criteria

The project is ready to implement when:

- `docs/architecture-decisions.md` exists,
- `docs/audit-completion-checklist.md` is complete or deferred,
- `docs/owner-inputs-needed.md` is updated,
- MVP scope is accepted,
- target data model is accepted as the first draft,
- local infra direction is accepted,
- first milestone is accepted,
- no known secret is tracked in Git.
