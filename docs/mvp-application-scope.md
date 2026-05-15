# MVP Application Scope

Date: 2026-05-15

## Purpose

This document defines the first usable product MVP for the new Social Media Manager application.

The MVP should replace the daily Google Sheets workflow for social media orchestration, while keeping the implementation local-first and separated from the legacy automation.

The MVP is not a complete platform. It is the smallest coherent product surface that proves:

- brand onboarding,
- master content input,
- platform-specific variants,
- media assignment,
- review/approval,
- scheduling,
- automation handoff,
- publication status tracking.

## MVP Positioning

The product is not just a scheduler. The MVP should already reflect the core value:

- one master content source,
- AI-assisted platform variants,
- different behavior per platform,
- controlled approval and scheduling workflow,
- media-aware publishing preparation,
- brand voice as structured context.

## In Scope

### Channels

Initial channels:

- Instagram
- Facebook
- LinkedIn

Prepared for later:

- blog
- newsletter

Newsletter should remain out of MVP implementation.

### Infrastructure

Initial setup:

- local Next.js frontend/backend,
- local Postgres in Docker,
- local self-hosted n8n in Docker,
- GitHub as source control,
- environment-based configuration.

The app should be designed so Postgres and n8n can later move to a remote server.

### Users / Workspaces

MVP should include workspace and brand concepts even if the first run uses only one workspace.

Minimum:

- one seeded/admin user,
- one workspace,
- one or more brands,
- basic role field prepared in DB.

Full team management can wait.

### Brand Onboarding

MVP onboarding should capture:

- brand name,
- website/social links,
- brand description,
- target audience,
- products/services,
- tone of voice,
- preferred style,
- forbidden phrases,
- content pillars,
- CTA preferences,
- language preferences,
- active platforms,
- platform-specific rules.

Optional but useful:

- sample posts,
- approval rules,
- publishing frequency.

### Content Workspace

MVP should include:

- content list,
- content detail page,
- create new content item,
- master content/brief input,
- status,
- platform variant sections,
- media attachments,
- activity log.

### Platform Variants

For each content item, support variants for:

- Instagram
- Facebook
- LinkedIn

Each variant should include:

- caption,
- hashtags where relevant,
- credits where relevant,
- CTA fields where relevant,
- scheduled date/time,
- status,
- attached media.

### Media

MVP media should support:

- upload media asset,
- assign media to content item,
- assign media to a platform variant,
- mark role/order, for example primary or carousel item.

For first implementation, local storage is acceptable. The schema should remain storage-provider agnostic.

### Approvals

MVP should support simple approval:

- request review,
- approve,
- request changes,
- comment.

Recommendation:

- approve at content-item level first,
- keep schema support for platform-specific approval.

### Scheduling

MVP should support:

- schedule approved platform variants,
- create publication jobs,
- show job status,
- allow cancel before publishing.

Publishing can be stubbed at first, then wired to local n8n.

### Automation Runs

MVP should track:

- generate variants,
- edit variant,
- schedule publication,
- publish job.

Each automation run should record:

- run type,
- status,
- input,
- output,
- error,
- timestamps.

### Activity Logs

MVP should show a readable log for:

- content created,
- variants generated,
- media attached,
- approval requested,
- approved,
- scheduled,
- published,
- failed.

## Out Of Scope For MVP

Do not build yet:

- newsletter product,
- full blog publishing,
- billing,
- organization/team admin UI,
- comments thread system,
- notifications,
- advanced analytics,
- content calendar drag-and-drop,
- AI image generation unless easy to reuse,
- OAuth production-grade integration flows,
- production deployment,
- full migration importer from Google Sheets,
- multi-version variant history,
- lifecycle automation like post -> story or repost.

These should remain visible in architecture but not block MVP.

## First Screens

### 1. Workspace / Brand Setup

Purpose:

- establish the brand context before content generation.

Fields:

- brand name,
- description,
- website,
- target audience,
- tone,
- content pillars,
- platform selections.

MVP behavior:

- create/update `brands`,
- create/update `brand_profiles`.

### 2. Content List

Purpose:

- replace the main Google Sheets dashboard.

Visible fields:

- title,
- brand,
- status,
- active platforms,
- scheduled dates,
- latest activity,
- created/updated dates.

Actions:

- create content,
- open detail,
- filter by status/platform.

### 3. Content Detail

Purpose:

- replace the row editor, platform variant editor, preview, media assignment, and approval action area.

Sections:

- master content/brief,
- generation controls,
- platform variants tabs,
- media panel,
- approval panel,
- publication jobs panel,
- activity log.

Actions:

- save draft,
- generate variants,
- edit/regenerate selected variant,
- upload media,
- attach media,
- request approval,
- approve,
- schedule,
- cancel scheduled job.

### 4. Media Library

Purpose:

- replace Drive folder browsing for new product content.

MVP can be simple:

- grid/list of uploaded media,
- upload button,
- metadata,
- attach to content/variant.

### 5. Settings / Integrations

Purpose:

- show platform account setup state.

MVP can be simple and mostly manual:

- list integration accounts,
- platform,
- external account id/name,
- status,
- last validated.

Secrets should not be visible.

### 6. Automation Runs / Logs

Purpose:

- replace Sheet `Log` and n8n-only visibility.

MVP can be embedded in content detail first, with a separate admin list later.

## Primary User Flows

### Flow A: Brand Onboarding

1. User opens app.
2. User creates workspace/brand.
3. User fills brand profile fields.
4. App saves structured brand context.
5. Brand becomes available for content creation.

### Flow B: Create Master Content

1. User creates content item.
2. User enters brief or master content.
3. User selects target platforms.
4. App creates `content_item`.
5. App creates draft `platform_variants`.

### Flow C: Generate Variants

1. User clicks generate variants.
2. App creates `automation_run`.
3. App calls local n8n adapter or stub.
4. Generated text updates `platform_variants`.
5. Activity log records generation.
6. Status becomes `ready_for_review`.

### Flow D: Edit Variant

1. User edits copy manually or enters edit instruction.
2. App updates variant directly or creates edit automation run.
3. Variant status returns to `draft` or `ready_for_review`.

### Flow E: Attach Media

1. User uploads media.
2. App creates `media_asset`.
3. User attaches asset to master content or specific platform variant.
4. App creates `content_media` records.

### Flow F: Approval

1. User requests approval.
2. App creates `approval` with `pending`.
3. Approver approves or requests changes.
4. App updates content/variant statuses.
5. Activity log records review.

### Flow G: Schedule

1. User schedules approved variants.
2. App creates one `publication_job` per platform variant.
3. Job status becomes `scheduled`.
4. Activity log records scheduling.

### Flow H: Publish

Initial MVP:

1. User triggers publish manually or scheduled worker picks due job.
2. App creates `automation_run`.
3. App calls local n8n or stub publisher.
4. App records `publication_result`.
5. Job status becomes `published` or `failed`.

Later:

- n8n callbacks update job results asynchronously.

## Server Actions / API Surface

Recommended first server actions:

- `createWorkspace`
- `createBrand`
- `updateBrandProfile`
- `createContentItem`
- `updateContentItem`
- `createPlatformVariants`
- `updatePlatformVariant`
- `generatePlatformVariants`
- `uploadMediaAsset`
- `attachMediaAsset`
- `requestApproval`
- `reviewApproval`
- `schedulePublicationJobs`
- `cancelPublicationJob`
- `publishDueJob`
- `recordAutomationCallback`

Implementation note:

- For Next.js, these may start as server actions or route handlers.
- Keep action contracts explicit because local n8n will call back into some of them later.

## n8n MVP Integration

### Phase 1: Stub

Before real local n8n integration:

- `generatePlatformVariants` returns deterministic placeholder platform copy.
- `publishDueJob` marks job as simulated published.

This lets the frontend and DB model progress without waiting for n8n.

### Phase 2: Local n8n Adapter

Add environment variables:

- `N8N_BASE_URL`
- `N8N_WEBHOOK_SECRET`
- `N8N_GENERATE_VARIANTS_WEBHOOK`
- `N8N_PUBLISH_WEBHOOK`

App calls local n8n through server-side code only.

n8n receives:

- content item id,
- brand profile context,
- selected platforms,
- master content/brief,
- media references,
- callback URL.

n8n returns or calls back with:

- generated variants,
- errors,
- publication result.

### Phase 3: Production-Ready Pattern

Later:

- signed callbacks,
- retry/idempotency,
- separate queue,
- remote n8n,
- secret manager.

## Database MVP Behavior

MVP should be migration-driven from the beginning.

Recommended:

- create SQL migrations under a future `db/migrations/`,
- seed local development data,
- keep generated runtime DB data out of Git.

Minimum seed:

- one user,
- one workspace,
- one brand,
- one brand profile,
- example content item.

## Suggested App Folder Shape

When implementation begins:

```text
apps/web/
  app/
  components/
  lib/
  server/
  styles/
db/
  migrations/
  seeds/
infra/
  docker/
  n8n/
docs/
```

Alternative:

- keep single Next.js app at repo root if speed matters.

Recommendation:

- use a simple monorepo-like structure from the start because n8n/db/frontend will coexist.

## MVP Acceptance Criteria

MVP is successful when:

- a brand can be created,
- brand profile can be completed,
- a content item can be created,
- IG/FB/LI variants can be generated or stub-generated,
- variants can be edited,
- media can be uploaded and attached,
- content can be approved,
- publication jobs can be scheduled,
- publish can be simulated or executed through local n8n,
- status and activity logs are visible in the UI.

## Open Questions

Need owner input:

1. Should first implementation include auth, or can MVP start with a seeded local user?
2. Should local media storage be filesystem volume first?
3. Do you want real local n8n generation in the first app iteration, or stub first?
4. Which UI view matters most first: content list, detail editor, or onboarding?
5. Should scheduling be per platform always, or can one schedule apply to all selected platforms by default?
6. Should approval be required before scheduling in MVP?
7. What should the working product name be in the UI?

## Recommended Next Step

Create the implementation scaffold:

1. define stack choices for Next.js package setup,
2. add local environment examples,
3. add Docker/Postgres/n8n notes or compose file only if it matches the existing local setup,
4. create initial DB migrations,
5. create the Next.js app skeleton.
