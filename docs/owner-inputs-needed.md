# Owner Inputs Needed

Date: 2026-05-14

This document lists what is needed from the project owner to continue product work safely and efficiently.

## Access / Local Setup

- Install Git or make Git available in PATH.
- Confirm whether this workspace should become the main Git repository.
- Provide preferred remote Git host when ready, for example GitHub/GitLab/Bitbucket.
- Confirm whether future local development should use Docker Desktop.
- Confirm whether local n8n should run through Docker, npm, or another setup.
- Confirm whether local Postgres should run through Docker, native install, Supabase CLI, or a managed test project.

## Product Decisions

- Confirm the product name or working codename.
- Confirm whether first MVP should focus only on social media orchestration.
- Confirm that newsletter stays out of MVP unless explicitly reintroduced.
- Confirm initial supported channels:
  - Instagram
  - Facebook
  - LinkedIn
  - blog later
  - newsletter later
- Confirm whether multi-user/team approval is needed in MVP or later.
- Confirm whether this is initially single-client/internal MVP or already multi-tenant.

## Infrastructure Direction

- Decide first database direction:
  - Supabase test project,
  - local Postgres,
  - both, with local first.
- Decide whether Supabase Auth is preferred for MVP.
- Decide whether Supabase Storage is preferred for MVP media.
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

1. Make Git available so the repository can be initialized and committed.
2. Confirm local stack preference: Docker or non-Docker.
3. Decide first database path: Supabase test project or local Postgres.
4. Provide/anonymize a sample Google Sheet export.
5. Provide notes on the LinkedIn solo branch improvements.
6. Confirm MVP scope: social media only, no newsletter.
