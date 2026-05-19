# Changelog

All notable project changes are tracked here.

This changelog records implementation milestones and product-facing changes. Design reasoning and alternatives are tracked in `docs/product-design-log.md`.

## Unreleased

### Added

- Added local media upload and preview for content detail.
- Added publishing output media assignment from uploaded media.
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

- Documented local development commands and the Drizzle migration workflow in `README.md`.
- Established brand-scoped content as the primary ownership path while deferring global `/content`.
- Renamed the user-facing variant surface toward publishing outputs.
- Removed the one-output-per-platform database constraint from `platform_variants`.
