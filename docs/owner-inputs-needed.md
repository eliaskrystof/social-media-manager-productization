# Owner Inputs Needed

Date: 2026-05-14

This document lists what is needed from the project owner to continue product work safely and efficiently.

## Access / Local Setup

- Git is available and the repository is initialized.
- This workspace is confirmed as the main working folder.
- GitHub is confirmed as the remote Git host.
- Docker is confirmed as the preferred local infrastructure direction.
- Local n8n and local Postgres are expected to run through Docker.
- First database direction is local Postgres first, with future portability to Supabase or remote Postgres.

## Product Decisions

- Working codename is confirmed as `Orchard`.
- Confirm whether first MVP should focus only on social media orchestration. Current assumption: yes.
- Confirm that newsletter stays out of MVP unless explicitly reintroduced. Current assumption: yes.
- Confirmed: first codebase shape should be a regular application in `apps/web` inside a light monorepo.
- Confirmed: first milestone can use a seeded local user/admin as long as the future auth boundary remains clean.
- Confirmed: posts must be approved before real publishing.
- Confirmed: scheduling should be per platform.
- Confirmed: local media is acceptable for the first milestone, with provider-agnostic design for later best-practice storage.
- Clarified: Facebook, then Instagram, then LinkedIn is the technical implementation/testing order for live publishers, not runtime content publishing order.
- Confirm initial supported channels:
  - Instagram
  - Facebook
  - LinkedIn
  - blog later
  - newsletter later
- Confirm whether multi-user/team approval is needed in MVP or later.
- Confirm whether this is initially single-client/internal MVP or already multi-tenant.

## Infrastructure Direction

- Decide whether Supabase Auth should remain optional after the seeded-user milestone.
- Decide whether first local media implementation should use plain filesystem paths or a local object-storage-like service.
- Decide whether n8n remains a long-term orchestration component or only a transitional execution engine.
- Decide expected future deployment target for n8n:
  - VPS,
  - managed n8n,
  - private server,
  - other.

## Legacy Reference Material

Useful additional inputs:

- Example Google Sheet export with anonymized rows.
- Screenshot or export of current Sheet tabs and column headers.
- Example generated post before/after approval.
- Example scheduled post row from Supabase.
- Example media folder structure with sample filenames.
- Any known failure cases in Facebook/Instagram/LinkedIn publishing.
- Notes on which solo LinkedIn workflow behavior is known to work better.
- Current prompt documents or anonymized prompt content.

## Security / Credentials

Do not paste production secrets directly into documentation or chat.

Needed later through safe local `.env` files or secret managers:

- new test n8n credentials,
- new test database credentials,
- test platform app credentials if publishing will be tested,
- storage credentials,
- AI provider API keys.

Before implementation:

- rotate any exposed legacy Supabase service-role key if it is still active,
- separate test credentials from production credentials,
- define which credentials may be used locally.

## Business / Workflow Clarifications

- Define the desired content lifecycle:
  - idea,
  - draft,
  - generated variants,
  - edited,
  - approved,
  - scheduled,
  - published,
  - failed,
  - repurposed.
- Define approval rules for MVP.
- Define brand onboarding fields that are mandatory vs optional.
- Define content variant rules per platform.
- Define publishing frequency expectations.
- Define how repurposing should work:
  - post to story,
  - story to post,
  - repost,
  - blog variant,
  - reminder.

## Immediate Next Inputs

The most useful next inputs are:

1. Review `docs/target-data-model.md`.
2. Review `docs/mvp-application-scope.md`.
3. Review `docs/implementation-readiness-plan.md`.
4. Review `docs/architecture-decisions.md`.
5. Confirm first local media implementation: filesystem paths vs local object-storage-like service.
6. Confirm migration tooling preference.
