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

## 2026-05-19: First Write Flow Creates Brand-Owned Draft Content

Decision:

The first write flow should create content from `/brands/[brandId]/content`, not from a global route or the content detail page.

Why:

- Brand ownership is the clearest invariant in the product model.
- Creating inside a brand workspace can inherit brand defaults such as language.
- It prepares the later workflow where brand context influences generation, approval, scheduling, and platform rules.
- A narrow create action is easier to validate before adding editing, uploads, n8n, AI generation, or publishing.

Alternatives Considered:

- Start with a global `/content` create flow.
- Start directly on the content detail page with a richer editor.
- Wait until n8n and generation are connected before allowing creation.

Outcome:

- `/brands/[brandId]/content` contains the first creation form.
- Creating content inserts one draft content item.
- Instagram, Facebook, and LinkedIn draft variants are created immediately.
- Activity logs record content creation and variant preparation.

Revisit When:

- Manual editing exists for master content and platform variants.
- Global `/content` exists and needs a cross-brand create affordance.
- Brand/platform defaults become configurable enough to alter which variants are created.

## 2026-05-19: Media-First Ideas Need A Creation Slot Before Storage

Decision:

The draft creation UI should show where media will enter the workflow, but real media storage should remain deferred.

Why:

- Many content ideas may begin from images or video rather than text.
- The product shape should acknowledge media-first creation before AI analysis, publishing, or n8n are active.
- A disabled media input keeps the UI direction visible without creating hidden filesystem or database behavior.

Alternatives Considered:

- Implement local upload storage immediately.
- Keep media entirely out of the create flow until storage is ready.
- Store only filenames or placeholder metadata in the database.

Outcome:

- The brand-scoped create form includes a media input stub.
- No files or media metadata are stored by this stub.
- Real upload handling remains a separate implementation step using the existing media tables and local filesystem storage service.

Revisit When:

- The next skeleton step connects local filesystem media storage.
- Content detail needs to preview attached media.
- Media-first draft generation becomes part of the n8n or AI flow.

## 2026-05-19: Dashboard Should Resume Work, Not Only Summarize It

Decision:

The dashboard should include a continuation path to the latest content item.

Why:

- Returning to the last active draft is a common daily workflow.
- It makes the dashboard useful as an operational starting point without turning it into a full content list.
- The route still respects brand ownership by linking back into `/brands/[brandId]/content/[contentId]`.

Alternatives Considered:

- Keep dashboard purely informational.
- Add a full recent-content list immediately.
- Wait for a global `/content` route.

Outcome:

- Dashboard summary links to the latest content item.
- A compact "Continue editing" panel appears when content exists.
- The selection is based on latest user content activity, falling back to latest updated content.

Revisit When:

- Multiple recent items should be shown.
- Global `/content` introduces cross-brand filters.
- Auth becomes real and "last worked on" can be tracked per authenticated user/session.

## 2026-05-19: Content Detail Becomes The First Manual Editor

Decision:

Content detail should become the first manual editing surface before AI generation, approval, scheduling, or publishing are introduced.

Why:

- Created drafts need an immediate place to be refined.
- Manual editing validates the content and platform variant data model without introducing automation complexity.
- It keeps the workflow understandable: create under a brand, continue on detail, adjust master content and platform-specific copy.

Alternatives Considered:

- Keep detail read-only until generation exists.
- Put editing on the brand content list.
- Build a separate rich editor route immediately.

Outcome:

- `/brands/[brandId]/content/[contentId]` can update title, brief, master content, language, variant status, headline, caption, and hashtags.
- Each edit updates the content timestamp and writes an activity log.
- Generation remains a disabled placeholder action.

Revisit When:

- Validation feedback needs to be shown inline instead of relying on basic form behavior.
- Rich text, media previews, or side-by-side platform previews become necessary.
- AI generation needs to write into the same variant fields.

## 2026-05-19: Published Posts Are Product Artifacts

Decision:

Store published posts as their own product records, separate from publication job results.

Why:

- A publish job is an execution attempt; a published post is an external artifact the product may use later.
- Master ideas should be able to reference live posts for reposting, sharing, reuse, reporting, and metric sync.
- Some published posts may be created outside the app later and still need to be linked back to a master idea.
- Keeping artifacts separate avoids making analytics and reuse depend on technical job history.

Alternatives Considered:

- Use `publication_results` as the only external post record.
- Store external URLs only in variant metadata.
- Wait until real publishing is implemented.

Outcome:

- Added `published_posts` as the product-level record for external posts.
- Each record links to workspace, brand, master content item, and optionally a platform variant/output and publication job.
- The content detail UI includes an empty published artifacts section.
- Real publishing, syncing, metrics, reposting, and external import remain deferred.

Revisit When:

- Platform variants are renamed or expanded into publishing outputs.
- Real publisher integrations start writing external post IDs and URLs.
- Metrics sync needs normalized metric snapshots rather than JSON metadata.
