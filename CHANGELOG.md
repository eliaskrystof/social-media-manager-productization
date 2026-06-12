# Changelog

All notable project changes are tracked here.

This changelog records implementation milestones and product-facing changes. Design reasoning and alternatives are tracked in `docs/product-design-log.md`.

## Unreleased

### Added

- Added a development roadmap that defines post-skeleton milestones and a stricter functional MVP target.
- Added Codex thread goals for starting milestone-specific implementation threads with clean context.
- Added local account signup, login, logout, signed HTTP-only sessions, and first-run onboarding for user-owned workspaces.
- Added brand creation from onboarding and the brands page, plus editable brand name, website, language, and profile settings.
- Added manual Facebook, Instagram, and LinkedIn integration account records with connector states, validation logging, and settings visibility.
- Added encrypted server-side storage for optional local platform test credentials, documented in `docs/local-credential-handling.md`.
- Added publishing job destination routing through `integration_account_id` on outputs and publication jobs while keeping live publishing disabled.
- Added M4 hardening for signup activity logs, forbidden symbols guidance, platform-specific connection cards, token expiration warnings, credential removal, and connection disable controls.
- Accepted M4 after closeout smoke coverage for auth/session routing, brand settings, credential safety, one live destination per platform per brand, and scheduler/content destination fallback.
- Added the M5 publisher service with local, dry-run, and explicitly gated live modes for Facebook, Instagram, and LinkedIn publication jobs.
- Added server-only credential decryption for publisher adapters while keeping stored credential values out of frontend props and logs.
- Added Facebook Graph API feed/photo posting, Instagram Graph API image publishing, and LinkedIn Posts API text publishing adapters behind `PUBLISHER_MODE=live` plus `LIVE_PUBLISHING_ENABLED=true`.
- Added publisher-mode visibility in the scheduler control plane and live-readiness dry-run validation for destinations, credentials, and Instagram public image handoff.
- Added automatic content completion when every planned publishing output has been published.
- Added a global scheduler control plane with brand, platform, status, date-range, and source-idea filters.
- Added local due-job processing from the scheduler, creating `publication_results` and `published_posts` records through a stub publisher.
- Added scheduler retry and cancel controls for failed/skipped local publication jobs.
- Added published-output log visibility grouped by source idea and platform.
- Added a brief-first idea canvas that can prepare a simple publishing output or a complex publishing plan from selected targets and formats.
- Added editable platform scheduling defaults and batch scheduling for approved outputs, with optional shared-time scheduling while preserving per-platform `publication_jobs`.
- Added a content-detail planning timeline that summarizes scheduled, ready, and waiting publishing outputs.
- Added local media upload and preview for content detail.
- Added publishing output media assignment from uploaded media.
- Added local content workflow actions for review, approval, and completion states.
- Added publishing output schedule intent that writes `publication_jobs` records without live publishing.
- Added dummy AI generate/edit actions for publishing outputs with `automation_runs` logging.
- Added local publishing output previews using the media assigned to each output.
- Added publishing output revision history with revert support.
- Added manual publishing output creation and dummy regenerate flow.
- Added manual/generate mode selection when creating a publishing output.
- Added generation instructions and brand-profile context to dummy output generation payloads.
- Added a provider-backed AI output generation service with dummy fallback and OpenAI Responses API support.
- Added AI provider env configuration for `AI_PROVIDER`, `OPENAI_API_KEY`, and `OPENAI_MODEL`.
- Changed the web app config to load root `.env.local` values in the monorepo dev setup.
- Added runtime root env loading inside the AI generation service so server actions use the same local provider config.
- Added form-level pending toasts that lock submit buttons while actions are running.
- Added AI action failure redirects with popup error messages and failed `automation_runs` logging.
- Added an editable brand profile form for AI generation identity, style, platform rules, CTA, emoji, hashtag, and length guidance.
- Moved brand profile editing into a dedicated brand settings page with profile picture and connected profile stubs.
- Changed AI output prompts so brand profile rules take priority over master content wording during generation.
- Added publishing output review actions for submit review, request changes, approve, and dummy publish.
- Added dummy publish records across publication jobs, publication results, and published posts.
- Added internal publishing output titles separate from optional visible headlines for clearer review, revision, and publish logs.
- Added per-output review logs and separated output review state from master content workflow status.
- Changed output actions to prioritize scheduling in the editor, with direct dummy publish moved to a secondary action.
- Improved publication job rows with output titles, status, and scheduled time.
- Changed scheduling to require an approved output.
- Removed the generate action from existing outputs in favor of regenerate and AI edit.
- Changed the content editor output surface from a fixed multi-column layout to expandable output rows.
- Improved publishing output preview framing and editor side panels.
- Changed new content creation to start with an empty publishing output section instead of automatic platform defaults.
- Added the local Orchard skeleton with a Next.js app, Drizzle database package, shared package, n8n stub package, and local Docker Postgres.
- Added initial Orchard database schema, migration, and seed data for a local admin, workspace, brand, content item, platform variants, and automation/activity records.
- Added read-only brand workspace routes:
  - `/`
  - `/brands`
  - `/brands/[brandId]`
  - `/brands/[brandId]/content`
- Added content detail skeleton at `/brands/[brandId]/content/[contentId]`.
- Added frontend implementation notes in `docs/frontend-implementation-notes.md`.
- Added product design log in `docs/product-design-log.md`.
- Added the first brand-scoped content creation flow with automatic draft platform variants and activity logs.
- Added a dashboard continuation path to the latest content item.
- Added a disabled media input stub to the brand-scoped draft creation form.
- Added manual editing for content detail master copy and platform variants.
- Added `published_posts` records for future live post links, reuse, reposting, and metrics.
- Added publishing output planning fields for type, purpose, and order.
- Added Milestone 1 closure documentation.
- Added Milestone 2 Local Workflow Editor planning documentation.

### Changed

- Changed M4 documentation status from pending hardening to accepted after auth, onboarding, brand settings, credentials, connectors, and routing closeout checks.
- Documented local development commands and the Drizzle migration workflow in `README.md`.
- Established brand-scoped content as the primary ownership path while deferring global `/content`.
- Renamed the user-facing variant surface toward publishing outputs.
- Removed the one-output-per-platform database constraint from `platform_variants`.

### Fixed

- Fixed duplicate media rendering when assigning uploaded media to publishing outputs.
