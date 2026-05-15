# Audit Completion Checklist

Date: 2026-05-15

## Purpose

This checklist defines what should be completed before implementation starts.

This thread/project phase is focused on preparation, audit, documentation, and architecture decisions. It should not start building the app/frontend yet.

## Current Phase Boundary

In scope now:

- preserve legacy implementation knowledge,
- document current workflows,
- identify reusable logic,
- identify risks,
- define target product concepts,
- define MVP scope at a planning level,
- prepare Git/project structure,
- collect owner inputs,
- prepare future implementation plan.

Out of scope for this phase:

- Next.js app scaffold,
- frontend UI implementation,
- production database setup,
- new n8n workflow implementation,
- local publishing integration,
- OAuth implementation,
- real media upload implementation,
- actual migration/import scripts.

## Completed

- Git repository initialized.
- GitHub remote configured and pushed.
- Legacy files committed as reference material.
- Known hardcoded Supabase service-role JWT redacted before Git tracking.
- Architecture audit documented.
- Current process documentation created.
- Project foundation notes created.
- Owner-input checklist created.
- Legacy workflow map created.
- Target product data model proposed.
- MVP application scope drafted.

## Still Needed For Audit Completion

### 1. Legacy Workflow Detail Pass

Status: partially complete.

Needed:

- verify exact payload expectations in the main social n8n webhooks,
- document status field values and transitions more explicitly,
- document platform publisher branches:
  - Facebook image/video/feed,
  - Instagram single/carousel/video,
  - LinkedIn image/video/text,
- compare main LinkedIn workflow with solo LinkedIn branch.

Owner input needed:

- notes on why solo LinkedIn works better,
- known publishing failure cases.

### 2. Google Sheet Structure Capture

Status: waiting for owner input.

Needed:

- anonymized Google Sheet export or screenshots,
- tab names,
- column headers,
- sample rows,
- settings sheet structure,
- log examples.

Purpose:

- verify legacy field mapping,
- avoid missing hidden Sheet behavior.

### 3. Brand Onboarding Finalization

Status: drafted, not finalized.

Needed:

- mandatory vs optional onboarding fields,
- platform-specific onboarding fields,
- approval/publishing frequency rules,
- brand voice sample format.

### 4. Target Data Model Review

Status: proposed.

Needed:

- review whether entities are too broad/narrow,
- decide seeded user vs auth later at planning level,
- decide local media storage direction at planning level,
- decide approval requirement before scheduling.

No implementation should start until these are accepted or consciously deferred.

### 5. Infrastructure Preparation Plan

Status: high-level only.

Needed:

- document existing local Docker n8n/Postgres setup at a high level,
- decide whether this repo will eventually include compose files or only app-specific config,
- define environment variable names,
- define what stays outside Git.

### 6. Implementation Readiness Plan

Status: not started.

Needed before coding:

- implementation sequence,
- first milestone definition,
- first DB migration plan,
- first n8n stub/adapter plan,
- testing/verification approach,
- branching/commit workflow.

## Audit Completion Definition

The audit/prep phase is complete when:

- legacy workflow map is good enough to understand current behavior,
- target data model is reviewed,
- MVP scope is reviewed,
- owner inputs for Sheets/LinkedIn are captured or explicitly deferred,
- implementation plan exists,
- no major unknown blocks the first scaffold.

Only after this should implementation begin.

## Recommended Next Work In This Phase

1. Review `docs/legacy-status-and-state-map.md`.
2. Create `docs/legacy-linkedin-comparison.md` after owner notes are available.
3. Create `docs/implementation-readiness-plan.md`.
4. Update `docs/owner-inputs-needed.md` with any remaining concrete asks.
