# Frontend Implementation Notes

Date: 2026-05-19

## Purpose

This document tracks the frontend implementation direction for Orchard as the local skeleton becomes a usable product surface.

The architecture/audit documents define the product model and technical decisions. This file captures the evolving UI structure, route decisions, and near-term frontend sequence so that implementation choices remain traceable.

## Current Frontend Principle

The first UI should establish the product's core navigation and mental model before adding write actions.

Current implementation remains read-only. It is intentionally focused on:

- dashboard orientation,
- brand workspace context,
- brand-scoped content lists,
- content detail skeleton,
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
- working list for content under one brand.

This route should evolve into a practical operational list with filtering, sorting, status indicators, schedule signals, and links to content detail.

### `/brands/[brandId]/content/[contentId]`

Role:

- content detail skeleton,
- master content / brief,
- platform variants,
- media placeholder,
- approval placeholder,
- publication jobs placeholder,
- activity/automation visibility.

This is the future editing surface, but it is read-only for now.

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
- UI remains read-only until the main navigation flow is validated.

## Next Frontend Steps

Recommended sequence:

1. Improve the brand-scoped content list into a more useful operational list.
2. Improve content detail sections enough to host future write actions.
3. Add the first write flow: create content item under a brand.
4. Automatically create draft platform variants for Instagram, Facebook, and LinkedIn.
5. Add stub variant generation.
6. Add approval/schedule state actions.
7. Add global `/content` once brand-scoped content behavior is clear.

## Current Verification Target

The read-only frontend skeleton is healthy when:

- dashboard loads from seeded data,
- brand list loads seeded brand,
- brand workspace loads brand profile/content summary,
- brand content list loads seeded content item,
- content detail loads platform variants,
- `npm run typecheck` passes,
- `npm run lint` passes,
- `npm run build` passes.
