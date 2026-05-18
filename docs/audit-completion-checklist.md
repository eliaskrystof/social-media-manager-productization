# Audit Completion Checklist

Date: 2026-05-15

## Purpose

This checklist defines what should be completed before implementation starts.

This thread/project phase is focused on preparation, audit, documentation, and architecture decisions. It should not start building the app/frontend yet.

## Current Phase Boundary

In scope now:

- preserve legacy implementation knowledge,
- document current workflows,
- identify reusable logic,
- identify risks,
- define target product concepts,
- define MVP scope at a planning level,
- prepare Git/project structure,
- collect owner inputs,
- prepare future implementation plan.

Out of scope for this phase:

- Next.js app scaffold,
- frontend UI implementation,
- production database setup,
- new n8n workflow implementation,
- local publishing integration,
- OAuth implementation,
- real media upload implementation,
- actual migration/import scripts.

## Completed

- Git repository initialized.
- GitHub remote configured and pushed.
- Legacy files committed as reference material.
- Known hardcoded Supabase service-role JWT redacted before Git tracking.
- Architecture audit documented.
- Current process documentation created.
- Project foundation notes created.
- Owner-input checklist created.
- Legacy workflow map created.
- Target product data model proposed.
- MVP application scope drafted.
- Google Sheets baseline captured.
- LinkedIn solo branch comparison documented.
- Implementation readiness plan drafted.
- Architecture decisions drafted.
- Migration tooling selected: Drizzle.
- Working codename selected: `Orchard`.
- First app structure accepted: regular Next.js app in `apps/web` inside a light monorepo.
- First auth approach accepted: seeded local user/admin first, real auth later.
- First media approach accepted: local filesystem through provider-agnostic storage boundary.
- Approval-before-real-publishing rule accepted.
- Per-platform scheduling accepted.
- Live publisher technical order accepted: Facebook, Instagram, LinkedIn.
- Project-specific Docker Compose direction accepted.

## Still Needed For Audit Completion

### 1. Legacy Workflow Detail Pass

Status: complete enough for implementation start; detailed publisher contracts deferred.

Completed:

- document status field values and transitions more explicitly,
- compare main LinkedIn workflow with solo LinkedIn branch,
- capture current workflow map and known publishing branch behavior at audit level.

Deferred to implementation/publisher contract phase:

- verify exact payload expectations in the main social n8n webhooks,
- document final Facebook image/video/feed publisher contract,
- document final Instagram single/carousel/video publisher contract,
- document final LinkedIn image/video/text publisher contract,
- collect more known publishing failure cases when testing live publisher integrations.

### 2. Google Sheet Structure Capture

Status: complete enough for implementation start.

Completed:

- baseline captured from owner-provided tab exports,
- Sheet responsibilities mapped to product concepts,
- log limitations documented.

Deferred:

- add hidden tabs/dropdowns/validations only if they become relevant,
- add more sample rows only if needed during import/migration planning.

### 3. Brand Onboarding Finalization

Status: drafted for MVP; detailed field validation deferred.

Completed:

- onboarding scope drafted in MVP scope,
- brand profile captured in target data model,
- brand voice/sample post concept included.

Deferred to implementation design:

- exact mandatory vs optional fields,
- exact platform-specific onboarding forms,
- final approval/publishing frequency settings,
- final brand voice sample format and limits.

### 4. Target Data Model Review

Status: accepted as first implementation draft.

Completed:

- core entities proposed,
- seeded user first accepted,
- local filesystem media first accepted,
- approval-before-real-publishing accepted,
- per-platform scheduling accepted,
- Drizzle migrations selected.

Deferred:

- final production auth model,
- final production storage provider,
- exact lifecycle/repurposing model,
- whether variants need full version history in MVP.

### 5. Infrastructure Preparation Plan

Status: accepted at planning level.

Completed:

- local-first direction documented,
- existing personal/local Docker setup stays outside repo,
- project-specific Docker Compose will be added later under `infra/docker/`,
- secrets and local `.env` files stay outside Git.

Deferred to implementation:

- exact environment variable names,
- exact compose ports, volumes, and service names,
- server deployment compose/example.

### 6. Implementation Readiness Plan

Status: complete enough for implementation start.

Completed:

- readiness plan drafted,
- architecture decisions recorded,
- major prep decisions closed or deferred.

Deferred:

- final implementation-start plan document,
- first scaffold commit plan.

## Audit Completion Definition

The audit/prep phase is complete when:

- legacy workflow map is good enough to understand current behavior: done,
- target data model is reviewed as first draft: done,
- MVP scope is reviewed at planning level: done,
- owner inputs for Sheets/LinkedIn are captured or explicitly deferred: done,
- implementation readiness plan exists: done,
- no major unknown blocks the first scaffold: done, with production auth deferred.

Only after this should implementation begin.

## Recommended Next Work In This Phase

1. Create `docs/implementation-start-plan.md`.
2. Confirm whether Supabase Auth remains deferred after the seeded-user milestone.
3. Start implementation scaffold only after the implementation-start plan is accepted.
