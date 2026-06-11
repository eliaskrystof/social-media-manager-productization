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

## 2026-05-19: Publishing Outputs Can Repeat Per Platform

Decision:

Treat `platform_variants` as publishing outputs in the product UI, and allow more than one output for the same platform under one master content item.

Why:

- A master idea may need several outputs on the same platform, such as a teaser story, main post, and reminder story.
- Platform-specific API support differs and will be verified later, but the product model should not prevent repeated or differently formatted outputs.
- The first skeleton can remain simple by creating one `post/main` output per platform while leaving room for story, reel, long-form, and follow-up outputs.

Alternatives Considered:

- Keep exactly one variant per platform.
- Create a new `publishing_outputs` table immediately.
- Model repeated stories as separate content items.

Outcome:

- Removed the unique `(content_item_id, platform)` constraint.
- Added `post_type`, `purpose`, and `sort_order` to `platform_variants`.
- The UI now names this area "Publishing outputs".
- The default create flow still creates three simple outputs: Instagram post/main, Facebook post/main, LinkedIn post/main.

Revisit When:

- A dedicated `publishing_outputs` table would clarify the model more than preserving the existing table name.
- Platform integrations define exact format limits and API capabilities.
- Scheduling and approval need per-output workflows beyond the current skeleton.

## 2026-05-19: Content Status Tracks The Working Bundle

Decision:

Content item status should describe the state of the master idea or working bundle, not mirror each publishing output's operational state.

Why:

- One master idea can have several outputs in different states.
- Output/job state can describe scheduled, publishing, published, or failed work more precisely.
- A master-level `active` status is clearer than `partially_published`.
- `on_hold` is useful for waiting on client input, missing media, product decisions, or other temporary blockers without archiving the work.

Alternatives Considered:

- Use `partially_published` on `content_items`.
- Use campaign-specific statuses such as `campaign_in_progress`.
- Let master content inherit status directly from child outputs.

Outcome:

- Milestone 2 will use this target content status set in the editor:
  - `draft`
  - `in_progress`
  - `on_hold`
  - `ready_for_review`
  - `changes_requested`
  - `approved`
  - `active`
  - `completed`
  - `archived`
- Publishing outputs and publication jobs keep more operational statuses such as `scheduled`, `publishing`, `published`, and `failed`.
- Statuses remain text conventions for now, not hard database enums.

Revisit When:

- Real scheduling/publishing is connected.
- The global `/content` view needs aggregate status filters.
- Approval and scheduling actions reveal unclear transitions.

## 2026-05-20: Media Has Three Roles In The Editor

Decision:

Media should be modeled in the editor as a reusable source, an output assignment, and a preview input.

Why:

- The same uploaded media may be reused across several publishing outputs.
- A master idea may start from media, not text.
- Output previews need to combine selected media with generated or edited copy.
- Platform requirements may force output-specific media transformations such as crop, aspect ratio, video range, or thumbnail selection.

Alternatives Considered:

- Treat uploaded media as only attached to the master idea.
- Duplicate media per output immediately.
- Build a full transformation editor before assigning media to outputs.

Outcome:

- Milestone 2 starts with master-level media upload and per-output media assignment.
- HTML preview templates are planned as local editorial previews, not exact platform renderers.
- Media transformation is documented as a necessary future layer, but not implemented in the first media step.
- Simulated AI should later be able to generate or refine master content from selected media.

Revisit When:

- Output previews are implemented.
- The same source media needs different crops or video ranges per output.
- Real platform publishing exposes exact media requirements.

## 2026-05-29: Simple And Complex Content Modes

Decision:

Keep the current master-content plus publishing-output model, but plan for two user-facing creation modes:

- `simple`: a fast path for one straightforward post/output.
- `complex`: the richer workflow for one idea that may produce multiple outputs across platforms, multiple outputs for the same platform, reposts, or longer content plans.

Why:

- The current model is flexible, but the full content detail workflow can feel heavy when the user only wants to create and schedule one simple post.
- A simple mode can hide complexity without requiring a fundamentally different database model.
- Internally, simple content can still be represented as one `content_item` with one publishing output, which leaves room to promote it into a complex workflow later.
- Complex content remains valuable for multi-output plans, repeated stories, reposting, and reuse of one master idea.

Alternatives Considered:

- Split simple and complex content into separate database tables.
- Keep only the current complex editor and rely on UI polish to make it feel lighter.
- Model every simple post as a standalone published artifact without a master content item.

Outcome:

- Treat this as a future UX/information architecture direction.
- Avoid a hard data-model split unless real usage shows the shared model creates confusion or technical limits.
- Future UI can present a quick-create/simple editor while still writing the same underlying content/output records.

Revisit When:

- The current content detail flow supports generate, manual edit, approval, schedule, and dummy publish reliably.
- Users begin creating enough single-output posts that the full editor feels like repeated overhead.
- The product needs a clear quick-create entry point from dashboard, brand workspace, or global content calendar.

## 2026-05-29: Content And Output References For Reuse

Decision:

Plan for future content and output references so a new content item or publishing output can intentionally build on earlier work.

Why:

- Users may want to reuse a successful published post as a new story, repost, follow-up, or recurring content pattern.
- References should give both the user and AI access to persistent context such as original copy, media, platform, publish artifact, schedule history, and eventually engagement metrics.
- This supports workflows like "take this successful post, adapt it for stories, and schedule three variants."

Alternatives Considered:

- Copy old content manually into a new draft.
- Depend only on published post URLs as loose references.
- Delay all reuse behavior until real metrics sync exists.

Outcome:

- Keep this as a future capability rather than an immediate implementation task.
- Likely model references as links between content items and/or specific publishing outputs, with metadata describing the relationship such as `derived_from`, `repost_of`, `follow_up_to`, or `reference`.
- Published artifacts and metrics can later make references more useful for AI-assisted reposting and recurring schedules.

Revisit When:

- Published artifacts have real platform IDs/URLs and synced metrics.
- Scheduler supports more than one-off schedule intents.
- AI generation needs prior content examples beyond the brand profile and current master content.

## 2026-05-29: Scheduling As The Primary Completion Path

Decision:

Prefer scheduling over immediate publishing in the content detail workflow. Direct publish should remain available, but visually and operationally secondary.

Why:

- Most publishing work is expected to be planned rather than published immediately.
- Scheduling gives the product a clearer operational center: users can prepare, approve, and place posts into a visible plan.
- Publication jobs are the natural bridge between approved outputs and future publisher workers or n8n automation.
- A calendar/timeline view can later become a main planning surface across brands and platforms.

Alternatives Considered:

- Keep direct publish beside review as an equally prominent action.
- Delay scheduling UI until a full calendar exists.
- Treat scheduled posts only as hidden database rows until real publisher integrations exist.

Outcome:

- The output editor should present schedule as the primary next action after approval.
- Direct/dummy publish remains a secondary escape hatch for local testing and manual completion.
- `publication_jobs` should stay per output and carry the executable schedule state.

Revisit When:

- The dashboard gains a calendar or timeline view.
- Global content filters need scheduled posts by brand, platform, status, and date.
- Recurring schedules, batch scheduling, or repost scheduling are designed.

Next Step:

- Design the first visual scheduling surface before adding real publisher workers.
- Start small inside content detail with a clearer scheduled outputs/jobs timeline.
- Then introduce a dashboard or global calendar view that can filter scheduled outputs by brand, platform, status, and date range.
- Keep direct publish secondary; the expected completion path should be approve -> schedule -> publication job execution.

## 2026-06-03: Start Scheduling Visibility In Content Detail

Decision:

Add the first scheduling surface as a compact planning timeline on the content detail page.

Why:

- Scheduling already writes output and publication job state, but the existing detail sidebar only counted jobs.
- Content detail is still the main working surface, so showing scheduled, ready, and waiting outputs there helps validate the workflow before a global calendar is introduced.
- The timeline can stay read-only while scheduling actions continue to live inside each publishing output.

Alternatives Considered:

- Build a global calendar route immediately.
- Expand the dashboard with scheduled output cards.
- Keep the publication job sidebar list until live publishing exists.

Outcome:

- Content detail now shows a planning timeline above publishing outputs.
- Outputs are grouped visually as scheduled, ready, waiting, done, or cancelled from existing output/job state.
- Global calendar and cross-brand filters remain deferred.

Revisit When:

- Several brands have scheduled outputs at the same time.
- Publication workers or n8n execution make job state more operational.
- Users need calendar/date-range filtering across content items.

## 2026-06-04: Brief-First Idea Canvas

Decision:

Reframe content detail around an idea brief that can prepare a publishing plan.

Why:

- The legacy Google Sheets flow effectively used one row as the working idea and one free-form prompt/user input as the generation brief.
- The legacy platform dialog selected broad channel groups such as Facebook/Instagram, LinkedIn, or all, while platform-specific columns held the generated results.
- The product should preserve that broader-strokes workflow without copying the spreadsheet-shaped model.
- Content should not be treated as a campaign by default. The normal unit is a publishing idea, which may be a single cross-platform post or a larger multi-output plan.
- Simple and complex content should both start from a brief. Simple means one user-facing output shape, while complex means multiple planned outputs or schedule moments.
- Simple output may still create per-platform variant records because Facebook, Instagram, and LinkedIn need separate copy, review, schedule, and future publishing state.

Alternatives Considered:

- Keep master content as the main copy editor and make users add outputs one by one.
- Build a separate campaign table before proving the workflow.
- Start with a global calendar instead of improving the creation/editing canvas.

Outcome:

- Content detail now leads with an idea brief canvas.
- The brief form can save the brief or prepare publishing outputs from selected targets and formats.
- `simple` and `complex` are captured as workflow modes in content metadata while platform-specific execution records remain `platform_variants`.
- Simple mode is constrained to one post format across selected platforms; shorts, articles, follow-ups, and multiple formats belong to complex mode.
- Simple cross-platform posts should remain easy to schedule across selected platforms, with shared-time scheduling as an optional batch feature rather than the primary workflow.
- Manual single-output creation remains available as a secondary path.

Revisit When:

- The brief-to-output plan action should infer output presets from natural language instead of relying on checkboxes.
- AI planning becomes a paid or advanced tier.
- The shared `content_items` plus `platform_variants` model no longer captures idea planning clearly enough.

## 2026-06-05: Scheduling Defaults And Batch Planning

Decision:

Scheduling should be date-first and comfortable: each approved output can be scheduled separately, and a batch scheduling helper can schedule all approved outputs using platform defaults or one optional shared time. The app still stores one `platform_variants` record and one active `publication_jobs` record per selected platform/output.

Why:

- Publishing times probably vary by platform in normal use, so platform-specific defaults should be the primary convenience.
- Publication and future connector execution still need platform-specific records for copy, review history, account routing, retries, results, and logs.
- Shared-time scheduling is still useful when several outputs should intentionally publish together, but it should be a feature inside batch planning rather than the center of the editor.

Alternatives Considered:

- Add a separate publishing-moments table immediately.
- Hide platform variants entirely in simple mode.
- Keep only per-output approval and scheduling until the global scheduler exists.

Outcome:

- Brand settings expose editable default times for Instagram, Facebook, LinkedIn, and fallback scheduling.
- Individual output scheduling accepts a date and optional time; an empty time resolves to the platform default.
- Content detail offers a batch schedule helper for approved outputs using platform defaults or one explicit shared time.
- Batch scheduling writes or updates one scheduled `publication_jobs` row per platform variant, plus grouped activity and automation logs.

Revisit When:

- Complex plans need grouped schedule moments across selected subsets of outputs.
- The scheduler control plane needs a durable grouping key beyond matching content item, mode, and timestamp.
- Live publishing introduces account routing or retry rules that benefit from a first-class publishing-moment entity.

## 2026-06-05: Scheduler Becomes The Local Operations Queue

Decision:

Add a top-level scheduler control plane before live publishing, using existing `publication_jobs`, `publication_results`, and `published_posts` records rather than introducing a new queue table.

Why:

- The product needs an operational surface that can inspect all scheduled posts across brands and ideas before real platform connectors are added.
- Local due-job processing proves state transitions, logs, failure handling, retries, and published artifacts without risking accidental external publishing.
- Keeping the route global makes the previously deferred cross-brand view concrete while preserving brand-scoped editing as the authoring path.
- Using the current job/result/post tables keeps future live publishers focused on adapter behavior instead of product-state redesign.

Alternatives Considered:

- Build a drag-and-drop calendar first.
- Add a dedicated publishing-moment table immediately.
- Keep dummy publishing only inside content detail until OAuth and real connectors exist.

Outcome:

- `/scheduler` now shows publication jobs across brands and ideas.
- Filters cover brand, platform, status, date range, and source idea.
- Due jobs can be processed in bulk or one at a time by a local stub worker.
- Successful stub jobs create publication results and published-post records.
- Failed jobs store useful failure detail and can be retried or cancelled from the scheduler.
- Published outputs are grouped by source idea and platform.

Revisit When:

- Real platform account routing is implemented.
- Recurring schedules or grouped publishing moments need durable first-class grouping.
- Drag-and-drop calendar planning becomes more valuable than queue inspection.

## 2026-06-07: Local Accounts And Manual Connector Records

Decision:

Replace the implicit seeded-user lookup with local account signup/login and signed HTTP-only sessions. Add manual Facebook, Instagram, and LinkedIn connection records on brand settings, with optional encrypted local test credentials stored server-side only.

Why:

- Milestone 4 needs a non-seeded user to own workspace, brand, content, and publishing connection state.
- Production OAuth is still deferred, but live publishing cannot start until the app can identify the destination page/profile/account for each job.
- Manual connector records let the product validate routing, settings visibility, and scheduler readiness before platform adapter work begins.
- Credentials need a clear server-only boundary now, before real tokens are introduced.

Alternatives Considered:

- Keep using the seeded admin until OAuth is ready.
- Add Supabase Auth immediately.
- Store only environment variable names and skip encrypted local credential rows.

Outcome:

- `/login` supports local signup/login/logout.
- First-run onboarding creates a user-owned workspace and brand profile.
- Brand settings can create, update, and validate platform connection records with `connected`, `needs_attention`, `expired`, and `disabled` states.
- Optional local test credentials are encrypted before insertion into `integration_credentials` and never selected into page props.
- Scheduling resolves `integration_account_id` onto outputs and publication jobs when a connected account exists.
- Real platform publishing remains blocked until Milestone 5.

Revisit When:

- Production OAuth replaces manual connector entry.
- Team membership and invitation flows become part of the product.
- A real secret manager or hosted auth provider is selected.

## 2026-06-11: M4 Acceptance Hardening Direction

Decision:

Treat the initial M4 implementation as locally implemented but not product-accepted until a short hardening checklist is complete.

Why:

- The seeded user and seeded brand are no longer needed for the real app path.
- The first signed-up user should own a workspace, while future collaboration should use workspace invitations and `workspace_members`.
- A global product admin role is not needed yet; future debug/diagnostic tools should be env-gated and separate from workspace roles.
- Signup should stay shallow because most users will arrive with a brand in mind, while fuller brand onboarding can happen later through an assisted profile-completion flow.
- Manual connector setup is acceptable for local MVP and publishing validation, but it should match the real platform destination shape before live publishing begins.

Outcome:

- Keep the current account model as user plus workspace role.
- Keep brand as the primary connection boundary; multiple same-platform accounts per brand remain schema-supported but are not optimized in the UI yet.
- Target manual connector inputs:
  - Facebook page ID plus page access token.
  - Instagram user ID plus token.
  - LinkedIn personal URN plus token.
- Defer LinkedIn organization publishing because managed-organization permissions are materially stricter.
- Treat OAuth as a future credential acquisition path, not a different destination model.
- Add token expiration warnings and local/manual credential removal or disable controls before live publishing.
- Add optional forbidden symbols to brand profile guidance.
- Allow scheduling without a connected destination during planning, but require valid connected destinations for live publishing.

Revisit When:

- Manual-token publishing tests begin in Milestone 5.
- OAuth app ownership and provider review strategy are selected.
- Workspace invitation and team management move into scope.
