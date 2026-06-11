# Milestone 2: Idea-First Local Workflow Editor

Date: 2026-05-19

## Goal

Milestone 2 turns the local skeleton into a useful local workflow editor for one publishing idea.

It should make the content detail page feel like the main working surface for preparing an idea brief, media, publishing outputs, review state, schedule intent, and simulated AI actions.

Milestone 2 still does not require live social publishing, real OAuth, production auth, real AI calls, or real n8n execution. AI provider support may exist, but the milestone must remain usable with local/dummy fallback behavior.

## Product Direction

The editor should support the shape of the future product before external integrations are connected.

Core concept:

- `content_items` are publishing ideas, not campaigns by default.
- the brief is the primary authoring canvas for the idea.
- publishing outputs are planned platform/format executions under an idea.
- simple mode represents one user-facing output shape. It may fan out into per-platform variants for Facebook, Instagram, and LinkedIn because scheduling and future publishing are platform-specific.
- complex mode represents multiple planned outputs under one idea, such as a post, short, article, follow-up, repost, or separate schedule moment.
- `platform_variants` remain the technical execution records for platform-specific copy, review state, schedule state, and future publishing.
- published posts are external artifacts created later by real publishing or import.
- media can belong to the idea or specific outputs.
- AI actions can be simulated first, while still writing the same database state that real AI/n8n will write later.

## In Scope

### Editor Surface

- Improve content detail layout and editing ergonomics.
- Lead with an idea brief rather than treating master content as the main canvas.
- Let the user choose a simple output or complex plan shape.
- Keep brief, source notes, media, publishing outputs, approval state, schedule state, automation runs, and published artifacts visible in one workflow.
- Add clearer empty states and validation feedback for local editing.

### Brief-To-Publishing Plan

- Save an idea brief with title, goal, language, and source notes.
- In simple mode, prepare one post output shape across selected platforms.
- Let approved outputs be scheduled comfortably one at a time or in a batch using brand/platform default times, with an optional shared time when several outputs should publish together.
- In complex mode, prepare multiple output formats or schedule moments under the same idea.
- Allow plan-only preparation first, with optional draft generation when AI support is available.
- Keep manual one-off output creation as a secondary path.

### Local Media

- Connect media upload to local filesystem storage under `.local-media`.
- Write `media_assets` and `content_media`.
- Show basic media preview in content detail.
- Allow media to be associated with the idea first.
- Allow media to be assigned to a specific publishing output.
- Keep media transformations as a documented future need.
- Keep media-as-source generation as a simulated AI placeholder first.

### Post Preview

- Add preview placeholders for publishing outputs.
- Use simple HTML templates per platform/type before real API rendering exists.
- Preview should combine selected media, output copy, headline, hashtags, and basic platform/type framing.
- Templates are not authoritative platform previews. They are local editorial previews.

### Media Transformations

Media may need output-specific transformations before real publishing:

- square or vertical crop for image posts/stories,
- video time range selection,
- thumbnail selection,
- platform-specific dimensions,
- AI-assisted auto-crop or resize for higher tiers later.

Milestone 2 should document and prepare the model for this, but does not need a full media transformation editor unless it becomes necessary for local workflow validation.

### Workflow State Actions

Add local state actions without live publishing:

- mark draft,
- move to in progress,
- put on hold,
- submit for review,
- request changes,
- approve,
- schedule stub,
- cancel schedule stub,
- mark active,
- mark completed,
- archive.

These actions should write activity logs and update relevant records.

### Approval And Scheduling Stubs

- Create approval records for submit/review actions.
- Create publication job stubs for scheduled outputs.
- Do not queue real publishing.
- Keep scheduling visible as intent only.

### AI Scaffold

Add app-server actions that simulate or provider-run AI/n8n behavior:

- generate outputs,
- edit output,
- regenerate output,
- generate from media placeholder.
- generate idea from media placeholder.

Simulation should:

- write `automation_runs`,
- use deterministic/static payloads when provider credentials are not configured,
- update output fields in the same shape real AI will update later,
- keep provider boundaries clear so real n8n/OpenAI calls can be swapped in later.

## Status Model

Do not add hard Postgres enums yet. Keep text statuses with application-level conventions while workflow is still moving.

### Content Item Status

- `draft`: idea exists, but work has not meaningfully started.
- `in_progress`: content, media, or outputs are being prepared.
- `on_hold`: temporarily paused, waiting for input or decision.
- `ready_for_review`: ready for review as a working bundle.
- `changes_requested`: review requested changes.
- `approved`: approved as a bundle.
- `active`: publishing plan is running or some outputs are live/scheduled.
- `completed`: workflow around the idea is closed.
- `archived`: hidden from active work.

### Publishing Output Status

- `draft`
- `generating`
- `ready_for_review`
- `changes_requested`
- `approved`
- `scheduled`
- `publishing`
- `published`
- `failed`
- `cancelled`
- `archived`

### Approval Status

- `pending`
- `approved`
- `changes_requested`
- `rejected`
- `cancelled`

### Publication Job Status

- `draft`
- `scheduled`
- `queued`
- `publishing`
- `published`
- `failed`
- `cancelled`
- `skipped`

## Deferred

- Live Facebook/Instagram/LinkedIn publishing.
- OAuth and connected accounts.
- Dependence on real AI provider calls.
- AI planning that infers the full output plan from a natural-language brief.
- Real n8n workflow execution.
- Analytics sync.
- Metrics normalization.
- Production auth.
- Global `/content` if editor work needs more focus first.

## Done Criteria

- User can create or open a publishing idea and use the brief as the primary working surface.
- User can choose simple mode and prepare one post output shape across selected platforms.
- User can approve outputs and schedule them comfortably, either one at a time or through a batch action for approved outputs.
- User can choose complex mode and prepare more than one output format or schedule moment under the same idea.
- Editor can upload and preview local media.
- Editor can assign uploaded media to a publishing output.
- Editor can move content through the agreed local statuses.
- Editor can create approval and schedule stubs.
- Scheduled outputs are visible as waiting, ready, scheduled, done, or cancelled.
- Simulated AI actions write automation runs and update outputs.
- Activity log clearly records editor actions.
- The representative simple path works end to end: brief -> generated or planned platform variants -> approval -> schedule using defaults or explicit times -> waiting publication jobs.
- The representative complex path works end to end: brief -> multiple planned outputs -> per-output editing/review -> per-output schedule intent.
- `npm run db:migrate` succeeds if migrations are added.
- `npm run db:seed` succeeds.
- `npm run typecheck` succeeds.
- `npm run lint` succeeds.
- `npm run build` succeeds.

## First Implementation Candidate

Start with local media upload and preview.

Why:

- It unlocks media-first drafts.
- It exercises existing `media_assets` and `content_media` tables.
- It improves the editor without requiring external integrations.
- It creates a useful foundation for simulated AI from media.
