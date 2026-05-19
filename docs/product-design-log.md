# Product Design Log

Date started: 2026-05-19

## Purpose

This document records product and UI design decisions as Orchard evolves.

It is different from the changelog:

- `CHANGELOG.md` records what changed.
- This document records why product/UI decisions were made, which alternatives were considered, what was deferred, and when a decision should be revisited.

Use this log for decisions that may matter later when revisiting product direction, user flows, information architecture, or workflow assumptions.

## Entry Format

Recommended format:

```md
## YYYY-MM-DD: Decision Title

Decision:
...

Why:
...

Alternatives Considered:
...

Outcome:
...

Revisit When:
...
```

## 2026-05-19: Brand-Scoped Content As Primary Ownership Path

Decision:

Content editing should primarily live under brand-scoped routes:

```text
/brands/[brandId]/content
/brands/[brandId]/content/[contentId]
```

Why:

- Content belongs to a specific brand.
- Brand profile, tone, platform rules, defaults, and future settings should be immediately available when working on content.
- Creating content under a brand prevents orphaned content and keeps multi-brand ownership clear from the beginning.

Alternatives Considered:

- Use `/content` as the primary content entry point from the start.

Outcome:

- Brand-scoped content is the primary route for creation/editing.
- A future global `/content` route remains planned as a cross-brand operational overview.

Revisit When:

- Multiple brands are active in daily use.
- Users need date-based, platform-based, or status-based filtering across brands.
- The product needs a calendar or global operations queue.

## 2026-05-19: Dashboard Uses Brand Tiles, Brand Detail Owns Depth

Decision:

The main dashboard should show high-level workspace status and brand tiles, not deep brand detail.

Why:

- The dashboard should orient the user quickly.
- Deep brand-specific information belongs in the active brand workspace.
- This keeps `/` from becoming a second brand detail page.

Alternatives Considered:

- Show detailed brand profile and content detail directly on the dashboard.

Outcome:

- `/` shows seeded user/workspace summary, counts, latest activity/automation, and brand workspace tiles.
- `/brands/[brandId]` is the active brand workspace with richer brand context.

Revisit When:

- There are enough operational signals to justify a richer dashboard.
- The dashboard needs daily action lists, overdue approvals, scheduled posts, or failed jobs.

## 2026-05-19: Keep Initial Frontend Read-Only

Decision:

The first frontend routes should remain read-only until the main navigation flow is validated.

Why:

- The project is still in the Local Orchard Skeleton milestone.
- Read-only routes validate data shape, routing, and information architecture without introducing write-flow complexity.
- It keeps n8n, OAuth, publishing, and production auth out of the first UI pass.

Alternatives Considered:

- Start immediately with create/edit actions.

Outcome:

- Implemented dashboard, brand list, brand workspace, brand content list, and content detail as read-only routes.
- Future write actions will be added after the basic flow is reviewed.

Revisit When:

- Content detail skeleton is accepted.
- The first write flow is implemented: create content item under a brand and create draft platform variants.

## 2026-05-19: Global Content View Deferred

Decision:

Global `/content` should be deferred.

Why:

- The first product model should make brand ownership explicit.
- A global content surface is useful, but it should be designed as an operational/filtering view, not as the primary ownership model.

Alternatives Considered:

- Implement `/content` immediately as the main content list.

Outcome:

- `/content` is planned for later.
- Expected future purpose:
  - all content for a date or date range,
  - filter by brand,
  - filter by platform,
  - filter by status,
  - show approvals, scheduled posts, failures, and publication workload.

Revisit When:

- Brand-scoped content flow supports create/edit/generate/approve/schedule.
- There are enough content items to need cross-brand filtering.
