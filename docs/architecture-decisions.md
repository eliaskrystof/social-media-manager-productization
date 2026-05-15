# Architecture Decisions

Date: 2026-05-15

## Purpose

This document records architectural decisions for the productized Social Media Manager.

It is intentionally separate from the audit. The audit describes how the legacy system works. This file describes what the new product should do differently, what we have already decided, and what still needs owner confirmation.

Decision statuses:

- `Accepted`: use this as the current implementation direction.
- `Proposed`: likely direction, but still needs review before implementation.
- `Open`: decision not made yet.
- `Deferred`: intentionally postponed.

## ADR-001: Build A Separate Product Project

Status: Accepted

Decision:

The new product will be built as a separate project from the legacy client automation.

Legacy workflows, Apps Script code, database schemas, and Google Sheets behavior remain valuable reference material, but they should not define the final product architecture by default.

Rationale:

- The legacy system was shaped around one client's creative process.
- The product needs a more universal content orchestration model.
- A separate codebase prevents accidental coupling to old data structures, tokens, and workflow assumptions.

Consequences:

- Legacy IDs may be stored as references only.
- New databases and n8n instances should be separate from legacy production.
- Useful legacy behavior can be selectively reimplemented.

## ADR-002: Preserve Legacy Knowledge In Git

Status: Accepted

Decision:

All relevant legacy exports and documentation should be preserved in Git after secrets are redacted.

Rationale:

- The current implementation contains practical publishing and workflow knowledge.
- Future product decisions need traceability.
- The audit should remain available even after the product diverges from the legacy implementation.

Consequences:

- Legacy files are reference material, not runtime dependencies.
- Secret scans should be run before commits involving legacy exports or config.
- Production secrets must never be committed.

## ADR-003: Local-First Development With Future Portability

Status: Accepted

Decision:

The first development environment will be local-first. Postgres and n8n can run locally through Docker. The architecture must remain portable enough to move both database and n8n to a remote server later.

Rationale:

- Local-first development reduces risk while the product model is still evolving.
- The owner already has local Docker-based n8n and Postgres prepared.
- Future production should not require rewriting core application assumptions.

Consequences:

- Use environment variables for service URLs and credentials.
- Avoid hardcoding localhost assumptions in domain logic.
- Do not bind the data model to a single hosted provider too early.

## ADR-004: Use Postgres As The Primary Product Store

Status: Accepted

Decision:

The product data model will target Postgres first.

The first implementation can use local Postgres. Supabase remains a future option, especially for hosted Postgres, Auth, Storage, or realtime features, but the base schema should stay Postgres-native and portable.

Rationale:

- The user wants the option to run locally and move to a server later.
- The legacy Supabase schema should inform the product, but new databases will be separate.
- Portable Postgres keeps infrastructure choices open.

Consequences:

- Avoid Supabase-only assumptions in core tables.
- Migrations should work against standard Postgres.
- Supabase-specific features can be added behind clear boundaries if chosen later.

Open follow-up:

- choose migration tooling before the first schema implementation.

## ADR-005: Keep n8n As Orchestration, Not Product State Owner

Status: Accepted

Decision:

n8n will remain the automation/orchestration layer, especially for AI workflows, publishing flows, retries, and platform-specific automation.

The product database should own product state. n8n should consume explicit jobs and write back controlled results.

Rationale:

- n8n already works as an orchestration engine.
- A full backend rewrite is not needed at the first productization step.
- Product UX requires reliable status and logs that Google Sheets could not provide.

Consequences:

- Product tables should represent content, variants, approvals, publication jobs, results, and automation runs.
- n8n workflow status should map into product states instead of replacing them.
- Long-running or external work can still live in n8n.

## ADR-006: Do Not Call n8n Directly From The Browser Long Term

Status: Accepted

Decision:

The long-term product should not rely on direct browser-to-n8n webhook calls.

The frontend should call the application server/API. The application server should validate input, update product state, and then trigger n8n.

Rationale:

- Direct browser webhooks expose integration details.
- It is harder to enforce authorization, idempotency, and audit logging.
- The legacy Google Sheets trigger model was fragile and hard to surface reliably to users.

Consequences:

- n8n webhook URLs and secrets stay server-side.
- The app can provide stable product-facing API contracts.
- n8n can be moved locally/remotely without frontend changes.

## ADR-007: Replace Google Sheets With Product Concepts

Status: Accepted

Decision:

Google Sheets should be treated as a legacy UI and workflow surface, not as the new data model.

The replacement frontend should model:

- brands,
- brand profiles,
- content items,
- platform variants,
- media assets,
- approvals,
- publication jobs,
- automation runs,
- activity logs.

Rationale:

- The Sheet mixed form input, editor, dashboard, trigger surface, settings, and logs.
- That worked for a custom implementation but does not scale well into product UX.
- The new app needs clearer state, permissions, validation, and user feedback.

Consequences:

- Sheet columns are mapped to product fields only where useful.
- Sheet status strings should not be copied directly into core state design.
- Logs and progress should become first-class product records.

## ADR-008: MVP Is Social Media Orchestration, Not Newsletter

Status: Accepted

Decision:

The first MVP focuses on Instagram, Facebook, and LinkedIn social media orchestration.

Newsletter remains out of MVP and is preserved as reference/backup only.

Rationale:

- The newsletter workflow is heavily client-specific.
- The product's core differentiator is cross-platform social content orchestration.
- Adding newsletter too early would blur the core model.

Consequences:

- Newsletter tables, workflows, and UX are not included in first implementation.
- Future newsletter support should be redesigned as a product feature, probably for a different emailing platform.

## ADR-009: Use Solo LinkedIn Branch As Publishing Reference

Status: Accepted

Decision:

The solo LinkedIn branch should not remain a separate product module, but its publishing behavior should be used as a reference for the future unified LinkedIn integration.

Rationale:

- The branch was tested more heavily for different LinkedIn content types.
- It appears to define HTTP payloads/endpoints more reliably.
- It handles media ordering better than the original main social workflow.

Consequences:

- LinkedIn should be the first live publishing integration to validate.
- Media ordering must be explicit in the product model.
- LinkedIn mentions/networking are deferred until `li_id` sourcing is solved.

## ADR-010: Start Stub-First Before Live Publishing

Status: Accepted

Decision:

The first implementation milestone should be a stub-first local application.

It should model brand onboarding, content items, platform variants, approval, scheduling intent, automation runs, and mock publication results before real platform publishing is connected.

Rationale:

- This validates the product workflow without OAuth and API complexity.
- It keeps the first milestone small and testable.
- It lets the frontend replace the Google Sheets workflow conceptually before live automation risk is added.

Consequences:

- Live Facebook/Instagram/LinkedIn publishing is not part of the first app milestone.
- n8n can initially be represented by a mock adapter or stubbed automation runs.
- Real publishing should be added platform by platform later.

## ADR-011: First Codebase Shape

Status: Proposed

Decision:

Use a small monorepo-style structure once implementation begins:

```text
apps/
  web/
packages/
  database/
  shared/
  n8n-client/
infra/
  docker/
docs/
```

Rationale:

- The app will likely need shared domain types, DB migrations/helpers, and a n8n client boundary.
- A light monorepo keeps these concerns separated without forcing a heavy architecture.

Consequences:

- Initial setup is slightly more structured than a single flat Next.js app.
- The project can grow without a painful early split.

Owner confirmation needed:

- accept monorepo-style structure, or start with a single `apps/web` only and add packages later.

## ADR-012: First Auth Approach

Status: Proposed

Decision:

Start the first local milestone with a seeded/admin user and workspace, then add real auth after the core workflow is validated.

Rationale:

- Auth is important, but it is not the highest-risk unknown in the first workflow prototype.
- Seeded user keeps the first implementation focused on product state and content orchestration.
- Supabase Auth remains an option, but should not be locked in before the portability decision is final.

Consequences:

- The schema should include users, workspaces, and roles from day one.
- The first UI can assume a current user.
- Production auth is deferred.

Owner confirmation needed:

- confirm seeded user first, or require real auth in the first milestone.

## ADR-013: First Media Handling

Status: Proposed

Decision:

Start with provider-agnostic media records and explicit media ordering. The first implementation can use local file references or metadata-only records before committing to Supabase Storage or another object store.

Rationale:

- Media ordering is important, especially for LinkedIn and carousel-like publishing.
- Storage provider choice should stay movable.
- The first product workflow can be validated before final storage infrastructure is chosen.

Consequences:

- `media_assets` should store provider, path/key, media type, metadata, and status.
- `content_media` should store relation, platform scope, role, and order.
- Actual upload/storage can be phased in.

Owner confirmation needed:

- choose metadata-only, local file storage, or object storage for the first milestone.

## ADR-014: Approval And Scheduling Rule

Status: Proposed

Decision:

Require approval before creating real publication jobs. In the stub-first milestone, scheduling intent can be captured before approval, but publication jobs should not become active until approval is granted.

Rationale:

- This maps well to a controlled product workflow.
- It prevents accidental publishing.
- It separates planning from execution.

Consequences:

- Content and variants can have planned dates before approval.
- `publication_jobs` should represent executable scheduled work.
- A later setting can relax this rule per workspace/brand if needed.

Owner confirmation needed:

- confirm strict approval-before-job rule, or allow scheduling without approval for internal users.

## ADR-015: Scheduling Granularity

Status: Proposed

Decision:

Support per-platform scheduling as the primary model, with optional defaults from brand/workspace settings.

Rationale:

- The legacy Sheet already had separate Instagram, Facebook, and LinkedIn date/time columns.
- Different platforms often need different timing and media behavior.
- A single master schedule would be too restrictive for cross-platform orchestration.

Consequences:

- `platform_variants` can carry planned/scheduled time.
- `publication_jobs` should be per variant/platform.
- A content item can be partially scheduled or partially published.

Owner confirmation needed:

- confirm per-platform scheduling as the MVP behavior.

## ADR-016: Platform Publishing Order

Status: Proposed

Decision:

When live publishing starts, validate LinkedIn first, then Facebook, then Instagram.

Rationale:

- The solo LinkedIn branch has the strongest recent testing notes.
- LinkedIn can validate text/media ordering and result tracking without Meta-specific complexity.
- Meta integrations can follow once the publication job model is stable.

Consequences:

- LinkedIn contract should be documented first.
- Meta-specific media/video edge cases can be added after the first live publishing loop works.

Owner confirmation needed:

- confirm LinkedIn-first live publishing order.

## Deferred Decisions

These should not block the first milestone:

- billing,
- multi-workspace self-service onboarding,
- full team management,
- production OAuth,
- Supabase Auth vs custom auth final decision,
- Supabase Storage vs S3-compatible storage final decision,
- blog publishing,
- newsletter redesign,
- LinkedIn networking/mentions,
- automatic content lifecycle rules such as post to story or repost.

## Immediate Decision Checklist

Before implementation starts, confirm:

1. Monorepo-style structure.
2. Seeded local user first.
3. Media handling for milestone one.
4. Approval-before-publication-job rule.
5. Per-platform scheduling.
6. LinkedIn-first live publishing order.

