# Frontend Implementation Notes

Date: 2026-05-19

## Purpose

This document tracks the frontend implementation direction for Orchard as the local skeleton becomes a usable product surface.

The architecture/audit documents define the product model and technical decisions. This file captures the evolving UI structure, route decisions, and near-term frontend sequence so that implementation choices remain traceable.

## Current Frontend Principle

The first UI should establish the product's core navigation and mental model, then add write actions only where the product ownership model is already clear.

Current implementation is intentionally focused on:

- dashboard orientation,
- brand workspace context,
- brand-scoped content lists,
- content detail skeleton,
- first brand-scoped content creation flow,
- manual editing for master content and platform variant copy,
- published post artifact records for future reposting and metrics,
- dashboard continuation path to the most recently worked content item,
- prepared media input stub for future draft creation uploads,
- visible placeholders for future media, approvals, scheduling, automation, and activity logs.

Do not add live publishing, real n8n calls, OAuth, or production auth in this phase.

## Route Model

Primary implemented routes:

```text
/
/brands
/brands/[brandId]
/brands/[brandId]/content
/brands/[brandId]/content/[contentId]
```

### `/`

Role:

- main dashboard,
- high-level local workspace snapshot,
- current seeded user,
- workspace status,
- brand count,
- content count,
- continue editing path to the latest content item,
- latest automation/activity,
- brand workspace tiles.

The dashboard should not become a full brand detail page. Brand-specific depth belongs in the brand workspace.

### `/brands`

Role:

- list of managed brands in the current workspace,
- lightweight brand summary,
- entry point into a brand workspace.

This is a workspace navigation surface, not a full operational dashboard.

### `/brands/[brandId]`

Role:

- active brand workspace,
- brand profile summary,
- tone/audience/content pillar context,
- content summary,
- links into brand-scoped content.

Future additions can include settings/options buttons, brand profile editing, platform setup state, and brand-specific defaults.

### `/brands/[brandId]/content`

Role:

- brand-scoped content list,
- content/items focused view,
- working list for content under one brand,
- first manual content creation flow.

The current write flow creates one draft content item and draft platform variants for Instagram, Facebook, and LinkedIn. This route should evolve into a practical operational list with filtering, sorting, status indicators, schedule signals, and links to content detail.

The media input on this route is intentionally a disabled stub. It reserves the creation-flow shape for media-first ideas without storing files or media metadata yet.

### `/brands/[brandId]/content/[contentId]`

Role:

- content detail skeleton,
- master content / brief,
- platform variants,
- media placeholder,
- approval placeholder,
- publication jobs placeholder,
- published post artifact placeholder,
- activity/automation visibility,
- manual master content editing,
- manual platform variant editing.

This is the active editing surface for manual draft work. Generation, approval, scheduling, uploads, and publishing remain deferred.

Published post artifacts are intentionally separated from publication job results. Jobs describe execution attempts; published artifacts describe the external post that the product can later link to, reuse, repost, or sync metrics from.

## Global Content View

A future global content route is expected:

```text
/content
```

Purpose:

- cross-brand operational overview,
- all content for a selected date/range,
- filter by brand,
- filter by platform,
- filter by status,
- show what is scheduled, waiting for approval, failed, or published.

This should not replace brand ownership. It should be a filtered operational view across brand-owned content.

## Current UI Decisions

Accepted for the local skeleton:

- dashboard uses brand tiles, not deep brand detail,
- brand workspace is the primary context for brand-specific work,
- content ownership is brand-scoped,
- global `/content` is deferred,
- content list is list-oriented rather than dashboard-oriented,
- content detail exists before write actions are introduced,
- first write flow starts with manual brand-owned content creation,
- creation automatically prepares draft platform variants for Instagram, Facebook, and LinkedIn,
- activity logging starts with content creation and variant preparation events,
- dashboard offers a continuation path back into the latest content item,
- media can be represented in the create flow UI, but real storage remains deferred,
- content detail supports manual master content and platform variant edits,
- published external posts are product artifacts, not only technical publish results.

## Next Frontend Steps

Recommended sequence:

1. Polish the brand-scoped content creation form and empty/error states.
2. Define the local media storage flow and connect the prepared media input.
3. Improve content detail edit ergonomics and validation feedback.
4. Rename/refine platform variants toward publishing outputs with format/type planning.
5. Add stub variant generation.
6. Add approval/schedule state actions.
7. Add global `/content` once brand-scoped content behavior is clear.

## Current Verification Target

The frontend skeleton is healthy when:

- dashboard loads from seeded data,
- brand list loads seeded brand,
- brand workspace loads brand profile/content summary,
- brand content list loads seeded content item,
- content detail loads platform variants,
- brand content creation creates a draft content item,
- draft platform variants are created automatically,
- creation activity appears in the content detail activity log,
- dashboard links back to the latest content item,
- media input is visible but does not store files yet,
- content detail can save master content changes,
- content detail can save platform variant changes,
- published post artifact table exists and is visible as an empty detail section,
- `npm run typecheck` passes,
- `npm run lint` passes,
- `npm run build` passes.
