# Milestone 1: Local Orchard Skeleton

Date: 2026-05-19

## Goal

Milestone 1 establishes a local-first Orchard skeleton that can be used as the foundation for later product workflow work.

It is not a finished publishing product. It proves the local application, database, seed data, route model, and core content state model are coherent enough to build on.

## Completed Scope

- Local Docker Postgres for Orchard, isolated from the existing local n8n database.
- Next.js app in `apps/web`.
- Monorepo packages for database, shared constants, and the n8n client boundary.
- Drizzle schema and SQL migrations committed to the repo.
- Seeded local admin user, workspace, brand, brand profile, content item, publishing outputs, automation run, and activity log.
- Dashboard at `/` with workspace status, seeded user, brand tiles, counts, latest activity, latest automation, and a single continue-editing path.
- Brand routes:
  - `/brands`
  - `/brands/[brandId]`
  - `/brands/[brandId]/content`
  - `/brands/[brandId]/content/[contentId]`
- Brand-scoped create draft flow.
- Default publishing outputs for Instagram, Facebook, and LinkedIn.
- Manual content detail editing for master copy and publishing output copy/status/type/purpose/order.
- Media input placeholder for future media-first draft creation.
- Stub sections for media, approval, publication jobs, automation runs, and published artifacts.
- `published_posts` records prepared for future external post links, reuse, reposting, and metrics.
- Product/design documentation and changelog updated as decisions were made.

## Done Criteria

- `npm run db:migrate` succeeds.
- `npm run db:seed` succeeds.
- `npm run typecheck` succeeds.
- `npm run lint` succeeds.
- `npm run build` succeeds.
- Dashboard loads from seeded data.
- Brand workspace loads seeded brand data.
- Brand content list loads seeded content.
- Content detail loads publishing outputs and skeleton operational sections.
- Creating a draft creates default publishing outputs.
- Manual content and output edits write activity logs.
- Local dev server can run without interfering with local n8n.

## Deferred

- Production authentication.
- OAuth or live social account connections.
- Real n8n workflow execution.
- AI generation.
- Real media upload/storage from the UI.
- Approval workflow actions.
- Scheduling actions.
- Live publishing.
- Analytics and metric sync.
- Global `/content` operational view.
- Production deployment.

## Milestone 2 Candidate Scope

Milestone 2 should turn the skeleton into a more useful local content workflow while keeping live integrations optional.

Candidate focus:

- Improve content detail ergonomics and validation feedback.
- Connect local filesystem media storage to the prepared media input.
- Add stub generation for publishing outputs behind the app server/n8n boundary.
- Add approval and schedule state actions without real publishing.
- Introduce a global `/content` operational view when brand-scoped behavior is stable.

Final Milestone 2 scope should be confirmed after reviewing Milestone 1 in the UI.
