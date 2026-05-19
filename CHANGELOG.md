# Changelog

All notable project changes are tracked here.

This changelog records implementation milestones and product-facing changes. Design reasoning and alternatives are tracked in `docs/product-design-log.md`.

## Unreleased

### Added

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

### Changed

- Documented local development commands and the Drizzle migration workflow in `README.md`.
- Established brand-scoped content as the primary ownership path while deferring global `/content`.
