# Development Roadmap

Date: 2026-06-05

## Purpose

This roadmap defines the product development milestones after the local skeleton.

The MVP target is no longer only a seeded-user prototype. A functional MVP must let a real user onboard, connect publishing accounts, create and approve content, schedule it, and have the system publish it through the correct connected account.

UI/UX polish is intentionally deferred until the key product functions are in place. Each milestone should still be usable and visually verifiable, but the main goal is product capability and state correctness.

## MVP Definition

The MVP is functional when a user can:

- create or log into a real account,
- create or join a workspace,
- create and edit a brand profile,
- connect the relevant publishing platforms for that brand,
- create a publishing idea from a brief,
- prepare simple or complex publishing outputs,
- attach media where needed,
- edit and approve the outputs,
- schedule approved outputs for a concrete date and time,
- have due scheduled jobs publish through the correct connected account/page/profile,
- see scheduled posts waiting for publication,
- see published outputs with success/failure status and source idea,
- inspect publication logs clearly enough to debug failures.

Basic engagement visibility is desirable for MVP if platform APIs make it practical, but it should not block the first live publishing MVP. It becomes required for the first analytics milestone after MVP.

## Milestone 1: Local Orchard Skeleton

Status: complete.

Goal:

Establish the local app, database, seed data, route model, and core content state model.

Closure:

- Local Docker Postgres works.
- Next.js app boots locally.
- Migrations and seed data work.
- Seeded workspace, brand, content item, outputs, automation runs, and activity logs exist.
- Basic brand/content/detail routes exist.
- Manual content and output editing works.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Milestone 2: Idea-First Local Workflow Editor And Scheduler

Status: complete.

Goal:

Make content detail the working surface for one publishing idea: brief, source notes, simple/complex output planning, media, review, approval, scheduling intent, and local scheduling visibility.

In scope:

- Idea brief as the primary canvas.
- Simple mode as one user-facing post output shape across selected platforms.
- Complex mode as multiple planned output formats or publishing moments under one idea.
- Local media upload and assignment.
- Per-output editing, review, approval, and revision history.
- Schedule intent that writes publication jobs without live publishing.
- Planning timeline that shows waiting, ready, scheduled, done, and cancelled outputs.
- Activity and automation logs for local actions.

Closure:

- User can create or open an idea and save a brief.
- User can prepare a simple cross-platform post from the brief.
- User can prepare a complex multi-output plan from the brief.
- User can edit, approve, and schedule outputs.
- Approved outputs can be scheduled comfortably one at a time or in a batch using editable platform defaults, with optional shared-time scheduling while still creating separate platform jobs internally.
- Scheduled outputs are visually verifiable inside content detail.
- Dummy AI and dummy publish paths still work.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.

Deferred:

- Real users/auth.
- Real platform connectors.
- Live publishing.
- Global calendar.
- Engagement metrics.

## Milestone 3: Scheduler Control Plane And Publication Logs

Status: complete for local stub publishing.

Goal:

Turn schedule intent into an operational queue that can be inspected, filtered, and processed locally before live platform APIs are connected.

In scope:

- A scheduled posts view across ideas and brands.
- Filters by brand, platform, status, date range, and source idea.
- A published outputs/log view grouped by idea and platform.
- Stub worker or server action that picks due publication jobs and processes them.
- Clear job states for scheduled, due, publishing, published, failed, cancelled, and skipped.
- Failure logging and retry/cancel behavior for local jobs.
- Published post records created from successful stub publication.

Closure:

- User can see all scheduled posts waiting for publication.
- User can see all published outputs and their source idea.
- Due jobs can be processed without manually opening each output.
- Failed jobs are visible and explain why they failed.
- Published outputs can be filtered by idea, brand, platform, status, and date.
- The scheduler remains stubbed/local but behaves like the real control plane.

Implemented local behavior:

- `/scheduler` shows scheduled publication jobs across brands and ideas.
- Filters support brand, platform, status, date range, and source idea.
- Due scheduled/queued/draft jobs can be processed in bulk or one at a time.
- The local stub publisher keeps approval-before-real-publishing intact and only creates local example external URLs.
- Successful local stub jobs write `publication_results` and `published_posts`.
- Failed local stub jobs write `publication_results`, `automation_runs`, activity logs, `last_error`, and retry timing.
- Failed and skipped jobs can be retried; non-published jobs can be cancelled.
- Published artifacts are grouped by source idea and platform.

Deferred:

- OAuth and platform API publishing.
- Engagement sync.
- Drag-and-drop calendar UX.

## Milestone 4: Real Users, Onboarding, And Platform Connections

Status: accepted locally after product acceptance hardening.

Goal:

Replace the seeded-user assumption with real app identity and prepare the brand/account connection layer required for live publishing.

In scope:

- Real login/session flow.
- User creation.
- Workspace creation or assignment.
- Brand onboarding flow.
- Brand profile editing for voice, rules, platforms, and publishing preferences.
- Integration account records for Facebook, Instagram, and LinkedIn.
- Credential storage strategy for local MVP, with no plaintext tokens exposed to the frontend.
- Connector validation state: connected, needs attention, expired, disabled.
- Settings page where connected profiles/pages can be reviewed and updated.

Closure:

- A non-seeded user can log in and use the app.
- User can create a workspace and brand.
- User can complete and later edit a brand profile.
- User can register or connect the platform accounts needed for publishing tests.
- App knows which connected account/page/profile should be used for each scheduled job.
- Temporary seeded-user helpers are removed or isolated behind the real auth boundary.

Implemented local behavior:

- `/login` supports local account creation, login, and logout through signed HTTP-only sessions.
- New local users can create a workspace and first brand during signup or onboarding.
- Brand settings can update brand identity/profile fields and scheduling/generation guidance.
- Brand settings can manually register and update Facebook, Instagram, and LinkedIn connection records.
- Connector validation writes `validate_credentials` automation runs and updates connector status.
- Optional local test credentials are encrypted into `integration_credentials` by server actions and are not exposed to frontend props.
- Scheduling resolves connected platform accounts into `integration_account_id` on publishing outputs and publication jobs when a connected destination exists.
- The scheduler shows whether each job has an assigned connected destination.
- Credential handling is documented in `docs/local-credential-handling.md`.

Product acceptance hardening:

Implementation status: accepted after closeout smoke, credential-safety review, seeded-boundary review, typecheck, and lint.

- Treat seeded user and brand data as obsolete for the real app path; local users should create/access their own workspace.
- Keep the first signed-up user as workspace `owner`; defer global admin accounts and use future env-gated dev tools for diagnostics.
- Keep signup onboarding shallow with workspace and first brand creation, then add a fuller assisted brand onboarding/completion path later.
- Add signup activity logging for workspace and brand creation.
- Document local auth limitations: no password reset, no server-side session revocation, no workspace switcher, and no invite flow yet.
- Plan future workspace invitation flow using `workspace_members`; defer brand-level membership until real usage requires it.
- Add optional forbidden symbols guidance to brand profile settings and generation context.
- Keep brand settings as one page for now, but plan future sections or tabs for profile, voice and AI, publishing defaults, connections, and team.
- Make manual connection setup platform-specific:
  - Facebook page ID plus page access token.
  - Instagram user ID plus token.
  - LinkedIn personal URN plus token.
- Defer LinkedIn organization publishing.
- Auto-set credential type by platform instead of asking users to choose it manually.
- Add token expiration warnings for expired, expiring soon, unknown, and healthy states.
- Never display saved credentials; support replace-only behavior plus disable/remove credential actions.
- Store credential provenance metadata, starting with `source = manual`.
- In local/manual mode, require `LOCAL_CREDENTIAL_ENCRYPTION_KEY` before storing real tokens.
- Allow scheduling without a connected destination, but show clear missing-destination warnings.
- Keep brand as the primary connection boundary; M4 supports one live destination per platform per brand and defers explicit per-output account selection unless a later workflow proves one brand needs multiple same-platform destinations.
- Document that live publishing must block missing, disabled, expired, or needs-attention destinations.

Deferred:

- Full team management.
- Billing.
- Production-grade OAuth polish if local/test credentials are enough for first publisher validation.
- Live platform API publishing, which remains Milestone 5.

## Milestone 5: Live Publishing Pipeline

Goal:

Publish approved scheduled outputs at the correct time through the correct connected account/page/profile.

Implementation order:

1. Facebook.
2. Instagram.
3. LinkedIn.

In scope:

- Publisher adapter contract shared by all platforms.
- Platform-specific payload mapping.
- Media handoff rules per platform.
- Due job polling or scheduled worker.
- Idempotency so a job is not accidentally published twice.
- Retry and failure state handling.
- Publication result mapping.
- Published post artifact creation with external IDs and URLs where available.
- Activity and automation logging for each publish attempt.

Closure:

- An approved scheduled Facebook output publishes through the connected Facebook page/account.
- An approved scheduled Instagram output publishes through the connected Instagram account.
- An approved scheduled LinkedIn output publishes through the connected LinkedIn profile/page.
- Due jobs are picked up automatically or by a controlled local worker command.
- Successful jobs become published and create published post records.
- Failed jobs stay inspectable with useful error details and can be retried or cancelled.
- No job publishes before approval.

Deferred:

- Advanced media transformations.
- Bulk publishing optimizations.
- Full production deployment hardening.

## Milestone 6: Published Library And Basic Performance Visibility

Goal:

Make published content useful after publishing, not just a terminal log.

In scope:

- Published output library grouped by idea.
- Filters by brand, platform, date range, status, and content type.
- External post links.
- Manual or API-backed engagement sync where practical.
- Basic metrics display such as impressions, reactions, comments, shares, clicks, and engagement rate when available.
- High-performing post indicators.

Closure:

- User can review what was published and where.
- User can group published outputs by idea.
- User can identify successful posts at a glance.
- Engagement metrics are either synced or explicitly marked unavailable per platform.

Deferred:

- Advanced analytics dashboards.
- AI recommendations from historical performance.
- Repost automation.

## Milestone 7: MVP Polish And Release Hardening

Goal:

Turn the functional system into a coherent MVP experience.

In scope:

- UI/UX pass across onboarding, editor, scheduler, connections, and published logs.
- Empty states and validation messages.
- Error handling and recovery paths.
- Documentation for local operation.
- Security review of credentials and environment variables.
- End-to-end test checklist.
- Deployment decision and production readiness plan.

Closure:

- A user can complete the full MVP flow without developer intervention.
- Key flows have repeatable verification steps.
- Known limitations are documented.
- The app is ready for controlled real-world validation.

## Recommended Immediate Sequence

Finish Milestone 2 first, especially comfortable scheduling with defaults, batch planning, and clear scheduled-output visibility. Then build Milestone 3 before live publishing.

Reason:

The scheduler control plane should be trustworthy before external APIs are connected. Once due jobs, logs, retries, and published records work locally, platform publishing becomes an adapter problem instead of a product-state problem.
