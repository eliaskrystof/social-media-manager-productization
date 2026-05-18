# Implementation Start Plan

Date: 2026-05-18

## Purpose

This document closes the audit/prep phase and defines the first implementation step for Orchard.

It should be read before creating the first application scaffold. The goal is to start implementation with a narrow, testable milestone rather than accidentally building the entire product at once.

## Implementation Gate

Implementation can start after this plan is accepted.

Accepted foundations:

- working codename: `Orchard`,
- regular Next.js app in `apps/web`,
- light monorepo structure,
- local Postgres first,
- Drizzle for schema and migrations,
- seeded local user/admin first,
- local filesystem media storage first,
- provider-agnostic media model,
- n8n kept as orchestration layer,
- browser does not call n8n directly long term,
- stub-first app before live publishing,
- approval required before real publishing,
- per-platform scheduling,
- technical publisher order later: Facebook, Instagram, LinkedIn,
- project-specific Docker Compose later under `infra/docker/`.

## First Milestone

Milestone name:

> Local Orchard Skeleton

Goal:

Create a local application skeleton that can model the core content workflow without real publishing, real OAuth, or live n8n dependency.

The first milestone proves:

- the repo structure works,
- the app boots locally,
- the database schema can be created through migrations,
- seed data creates a usable local workspace,
- the product can represent brand, content, variants, media, approval, scheduling intent, and mock automation status.

## Scope

### In Scope

Repository/application structure:

- create `apps/web`,
- create `packages/database`,
- create `packages/shared` only if immediately useful,
- create `packages/n8n-client` only as a stub/boundary if immediately useful,
- keep `infra/docker` empty or documented until infra implementation needs it.

Database:

- set up Drizzle,
- define first schema draft,
- create initial migration,
- create seed script for local admin/workspace/brand,
- commit generated migration files.

Application:

- bootable local Next.js app,
- simple server-side current-user helper returning seeded local user,
- minimal app shell,
- basic route structure for future onboarding/content workspace,
- no polished UI requirement in the first scaffold commit.

Media:

- define local filesystem storage convention,
- add `.local-media/` to ignored local files if needed,
- represent media through provider-agnostic records,
- do not implement full production upload flow yet.

Automation:

- define stub automation result flow,
- keep n8n adapter behind a boundary,
- no real n8n workflow execution in the first scaffold unless explicitly chosen later.

Documentation:

- update README with local development commands,
- add `.env.example`,
- document migration commands,
- document seed command.

### Out Of Scope

Do not include in the first milestone:

- production auth,
- Supabase Auth,
- OAuth,
- live Facebook/Instagram/LinkedIn publishing,
- real AI generation,
- real n8n workflow edits,
- production deployment,
- full media upload UX,
- billing,
- multi-user/team management,
- newsletter,
- blog publishing,
- lifecycle automation such as repost/story/blog variants.

## Proposed First Folder Shape

```text
apps/
  web/
    app/
    components/
    lib/
    services/
    styles/
packages/
  database/
    src/
    migrations/
  shared/
  n8n-client/
docs/
infra/
  docker/
```

Keep packages minimal. If a package has no immediate purpose in the first commit, create it only when needed.

## First Schema Slice

The first migration should focus on enough schema to support the local skeleton:

- `users`
- `workspaces`
- `workspace_members`
- `brands`
- `brand_profiles`
- `content_items`
- `platform_variants`
- `media_assets`
- `content_media`
- `approvals`
- `publication_jobs`
- `publication_results`
- `automation_runs`
- `activity_logs`

Allowed simplification:

- start with text/check-validated statuses rather than Postgres enums if that keeps iteration easier.

## First Seed Data

Seed should create:

- local admin user,
- one workspace,
- one demo brand,
- one minimal brand profile,
- optionally one draft content item with Instagram/Facebook/LinkedIn variants.

The app may temporarily assume this seeded user as the current user.

## Local Environment

First implementation should expect:

- local Postgres connection through `DATABASE_URL`,
- local media root through `LOCAL_MEDIA_ROOT`,
- optional n8n base URL through `N8N_BASE_URL`,
- no real platform credentials.

Required files:

- `.env.example`,
- local `.env` ignored by Git,
- README instructions for creating local `.env`.

## Verification For First Milestone

Before considering the first implementation milestone done:

- dependencies install successfully,
- app starts locally,
- Drizzle migration command runs,
- seed command runs,
- app can read seeded workspace/brand data,
- typecheck/lint or equivalent baseline command passes,
- no secrets are committed,
- Git status is clean after commit.

## Open Questions Before Scaffold

These can be answered immediately before or during the first scaffold:

1. Should Supabase Auth remain deferred after the seeded-user milestone?
2. Should the first UI visibly use the `Orchard` codename or stay generic?
3. Should the first visible view be onboarding, content list, or content detail?
4. Should platform variants allow only one active scheduled job in the first schema?
5. Should real local n8n generation wait until after the stub-first skeleton?

Recommended default answers:

- defer Supabase Auth,
- use `Orchard` in internal UI,
- start with content list plus detail skeleton,
- allow one active scheduled publication job per variant initially,
- keep n8n stubbed until the product state model works.

## Stop Point

After the first scaffold milestone, pause and review before adding live integrations.

Review:

- folder structure,
- database schema,
- local dev commands,
- seeded user approach,
- first UI routes,
- whether n8n should be wired next or kept stubbed while the editor/onboarding improves.

