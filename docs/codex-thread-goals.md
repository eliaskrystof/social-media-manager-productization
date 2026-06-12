# Codex Thread Goals

Date: 2026-06-05

## Purpose

Use this file when starting a fresh Codex thread for a specific development milestone.

Recommended opening pattern:

```text
We are working in the SocialMediaManager workspace root.
Use docs/codex-thread-goals.md as the source of truth.
Start Goal Mx: <goal name>.
First, read the referenced docs and current code state. Then continue implementation until the goal is handled or clearly blocked.
```

Each goal below is intentionally scoped so a separate thread can keep clean context. If a goal changes during work, update this document before opening the next thread.

## Always Read First

- `docs/development-roadmap.md`
- `docs/milestone-2-local-workflow-editor.md`
- `docs/product-design-log.md`
- `CHANGELOG.md`

For implementation threads, also inspect current code and `git status` before editing.

## Global Rules For All Goals

- Do not revert user changes.
- Keep the app local-first unless the goal explicitly introduces real auth, connectors, or publishing.
- Prefer existing app patterns over new abstractions.
- Preserve approval-before-real-publishing.
- Keep platform publication jobs per platform variant, including when the UI schedules multiple approved outputs in one planning action.
- Update `CHANGELOG.md` and product/design docs when product behavior changes.
- Verify with `npm run typecheck` and `npm run lint` for code changes.
- Run `npm run build` only when the dev server/build cache situation is safe, because Next build output has previously conflicted with a running dev server.

## Goal M2: Idea-First Editor And Scheduler

Thread goal:

Finish Milestone 2 by making the content detail page support an idea-centered brief workflow, simple/complex output planning, approval, and local scheduling visibility.

Primary docs:

- `docs/milestone-2-local-workflow-editor.md`
- `docs/development-roadmap.md`
- `docs/product-design-log.md`

In scope:

- Idea brief remains the primary canvas.
- Simple mode prepares one user-facing post output shape across selected platforms.
- Complex mode prepares multiple formats or publishing moments under one idea.
- Approved outputs can be scheduled comfortably one at a time or in a batch using editable platform defaults, with optional shared-time scheduling while still creating per-platform jobs internally.
- Scheduled outputs remain visually verifiable in content detail.

Done when:

- Simple path works end to end: brief -> platform variants -> approval -> schedule using defaults or explicit times -> waiting publication jobs.
- Complex path works end to end: brief -> multiple outputs -> per-output edit/review -> per-output schedule intent.
- Activity logs and automation logs record the important actions.
- Typecheck and lint pass.

Suggested opening prompt:

```text
Start Goal M2 from docs/codex-thread-goals.md. Focus on finishing the idea-first editor and scheduler. The next likely missing piece is comfortable output scheduling with editable platform defaults, batch scheduling for approved outputs, and clear scheduled-post visibility while preserving per-platform publication jobs internally.
```

## Goal M3: Scheduler Control Plane And Publication Logs

Thread goal:

Build the operational scheduler view and publication log layer before live platform publishing.

Primary docs:

- `docs/development-roadmap.md`
- `docs/milestone-2-local-workflow-editor.md`
- `docs/target-data-model.md`

In scope:

- Scheduled posts view across ideas and brands.
- Filters by brand, platform, status, date range, and source idea.
- Published outputs/log view grouped by idea and platform.
- Stub worker or controlled server action that processes due publication jobs.
- Clear job states and failure logging.
- Published post records from successful stub publication.

Done when:

- User can see all scheduled posts waiting for publication.
- User can see all published outputs and their source idea.
- Due jobs can be processed without opening each output.
- Failed jobs show useful failure details.
- Published outputs can be filtered by idea, brand, platform, status, and date.

Suggested opening prompt:

```text
Start Goal M3 from docs/codex-thread-goals.md. Build the scheduler control plane and publication logs using existing publication_jobs, publication_results, and published_posts records. Keep publishing stubbed/local.
```

## Goal M4: Real Users, Onboarding, And Platform Connections

Status: accepted locally after product acceptance hardening.

Thread goal:

Replace the seeded-user assumption with real account/session behavior and prepare the brand/platform connection layer required for live publishing.

Primary docs:

- `docs/development-roadmap.md`
- `docs/architecture-decisions.md`
- `docs/target-data-model.md`
- `docs/mvp-application-scope.md`

In scope:

- Real login/session flow.
- User creation.
- Workspace creation or assignment.
- Brand onboarding flow.
- Brand profile editing.
- Integration account records for Facebook, Instagram, and LinkedIn.
- Credential storage strategy for local MVP.
- Connector validation states.

Done when:

- A non-seeded user can log in and use the app.
- User can create a workspace and brand.
- User can complete and edit a brand profile.
- User can register or connect platform accounts needed for publishing tests.
- App can resolve which connected account/page/profile a scheduled job should use.

Implemented local behavior:

- Local signup/login/logout with signed HTTP-only sessions.
- User-owned workspace and brand creation through signup, onboarding, and brand creation.
- Brand profile editing from settings.
- Manual Facebook, Instagram, and LinkedIn integration account records with validation states.
- Server-only encrypted local credential storage documented in `docs/local-credential-handling.md`.
- Scheduled outputs and jobs resolve `integration_account_id` when a connected destination exists.

Product acceptance hardening:

Implementation status: accepted after closeout smoke, credential-safety review, seeded-boundary review, typecheck, and lint.

- Treat seeded user and brand data as obsolete for the real app path.
- Keep signup onboarding shallow; add fuller assisted brand onboarding/completion later.
- Add signup activity logging for workspace and brand creation.
- Document local auth limitations and deferred workspace invitations.
- Add optional forbidden symbols guidance.
- Make manual connection setup platform-specific for Facebook page ID, Instagram user ID, and LinkedIn personal URN.
- Treat each brand as having one live destination per platform for M4; use separate brands for separate publishing identities and defer per-output account selection.
- Auto-set credential type by platform.
- Add token expiration warnings and remove/disable credential actions.
- Require `LOCAL_CREDENTIAL_ENCRYPTION_KEY` before storing real manual tokens.
- Allow scheduling without a destination, but warn clearly.
- Document that live publishing blocks missing or invalid destinations.

Suggested opening prompt:

```text
Start Goal M4 from docs/codex-thread-goals.md. Implement real users, onboarding, and platform connection records. Keep credential handling safe and do not expose tokens to the frontend.
```

## Goal M5: Live Publishing Pipeline

Status: in progress with the gated publisher adapter layer started.

Thread goal:

Publish approved scheduled outputs at the correct time through the correct connected account/page/profile.

Primary docs:

- `docs/development-roadmap.md`
- `docs/architecture-decisions.md`
- `docs/current-processes.md`
- `docs/legacy-linkedin-comparison.md`
- `docs/target-data-model.md`

Implementation order:

1. Facebook.
2. Instagram.
3. LinkedIn.

In scope:

- Publisher adapter contract.
- Platform-specific payload mapping.
- Media handoff rules.
- Due job polling or worker command.
- Idempotency.
- Retry/failure handling.
- Publication result mapping.
- Published post artifact creation with external IDs and URLs where available.

Done when:

- Approved scheduled Facebook output publishes through the connected Facebook page/account.
- Approved scheduled Instagram output publishes through the connected Instagram account.
- Approved scheduled LinkedIn output publishes through the connected LinkedIn profile/page.
- Successful jobs become published and create published post records.
- Failed jobs remain inspectable and retryable/cancellable.
- No job publishes before approval.

Implemented local behavior:

- Scheduler processing now uses a shared publisher service.
- Local mode remains the default and does not call external platform APIs.
- Dry-run mode validates live publishing preconditions and records mapped publisher results without external calls.
- Live mode is double-gated by `PUBLISHER_MODE=live` and `LIVE_PUBLISHING_ENABLED=true`.
- Facebook, Instagram, and LinkedIn adapters exist for the first live publishing paths, with Instagram limited to assigned media that has a public/external image URL.

Suggested opening prompt:

```text
Start Goal M5 from docs/codex-thread-goals.md. Implement the live publishing pipeline platform by platform, beginning with Facebook. Preserve approval-before-publish and idempotent publication jobs.
```

## Goal M6: Published Library And Basic Performance Visibility

Thread goal:

Make published content useful after publishing by adding a published library and first performance visibility.

Primary docs:

- `docs/development-roadmap.md`
- `docs/target-data-model.md`
- `docs/product-design-log.md`

In scope:

- Published output library grouped by idea.
- Filters by brand, platform, date range, status, and content type.
- External post links.
- Manual or API-backed engagement sync where practical.
- Basic metrics display.
- High-performing post indicators.

Done when:

- User can review what was published and where.
- User can group published outputs by idea.
- User can identify successful posts at a glance.
- Engagement metrics are synced or explicitly marked unavailable per platform.

Suggested opening prompt:

```text
Start Goal M6 from docs/codex-thread-goals.md. Build the published library and basic performance visibility. Keep advanced analytics out of scope.
```

## Goal M7: MVP Polish And Release Hardening

Thread goal:

Turn the functional system into a coherent MVP experience ready for controlled real-world validation.

Primary docs:

- `docs/development-roadmap.md`
- `docs/mvp-application-scope.md`
- `docs/product-design-log.md`
- `CHANGELOG.md`

In scope:

- UI/UX pass across onboarding, editor, scheduler, connections, and published logs.
- Empty states and validation messages.
- Error handling and recovery paths.
- Local operation docs.
- Security review of credentials and environment variables.
- End-to-end test checklist.
- Deployment decision and production readiness plan.

Done when:

- A user can complete the full MVP flow without developer intervention.
- Key flows have repeatable verification steps.
- Known limitations are documented.
- The app is ready for controlled real-world validation.

Suggested opening prompt:

```text
Start Goal M7 from docs/codex-thread-goals.md. Focus on MVP polish and release hardening after the functional milestones are complete.
```
