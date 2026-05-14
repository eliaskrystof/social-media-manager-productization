# Social Media Manager Architecture Audit

Date: 2026-05-14

## Purpose

This document captures the current technical state of the internal automation system before productization work starts. It is intentionally descriptive and conservative: the existing automation is valuable operational knowledge, but the future product architecture should be separated from the legacy Google Sheets / Apps Script implementation.

The product should be treated as a separate product project, not as an in-place continuation of the legacy automation. This does not mean ignoring what already works: useful workflows, implementation details, platform-specific behavior, prompts, and process knowledge can be reused where they fit the new architecture.

## Current Architecture

The existing system is a working automation stack composed of:

- Google Sheets as the main user interface and operational dashboard.
- Google Apps Script as UI logic, action menu, validation, webhook caller, logging helper, and media folder helper.
- n8n as the orchestration layer.
- Supabase Postgres as persistent storage for users, post plans, tokens, and newsletter data.
- Google Drive as workspace storage for media folders, prompt documents, preview files, and client assets.
- AI generation inside n8n workflows.
- Platform APIs for Facebook, Instagram, LinkedIn, and Odoo newsletter publishing.

Current main social media user flow:

1. User works in a Google Sheet.
2. Apps Script reads selected rows and dialog inputs.
3. Apps Script calls n8n webhooks.
4. n8n reads credentials and state from Supabase.
5. n8n reads or writes Google Drive/Google Sheets.
6. n8n generates or updates content.
7. n8n schedules content in Supabase.
8. n8n polling workflows publish content through platform APIs.
9. n8n and Apps Script write status/log updates back to Google Sheets and Supabase.

## Strategic Direction

The new product architecture should be separated from the existing automation rather than treated as a direct in-place rewrite. The current implementation should be preserved as:

- a process reference,
- a source of workflow behavior,
- a source of field and status semantics,
- a source of platform-specific edge cases,
- a source of reusable workflow logic,
- a migration reference for existing clients.

The product should use a clean data model and a dedicated frontend/backend boundary. The legacy automations can continue running while the product is built.

New project infrastructure should also be separated:

- new project databases, fully separate from legacy databases,
- separate n8n instance/workflows,
- local self-hosted n8n during the first test phase,
- local or test database during the first test phase,
- Git as the source of truth for documentation, workflow exports, schema proposals, and code,
- future ability to move n8n and the database to a remote server for production.

## Existing Workflow Groups

### Main Social Media Manager

Location: `Social_media_manager_workflows/`

This is the primary automation branch and should be treated as the main source of truth for the current cross-platform social media process.

Important workflows:

- `User_Onboarding.json`: creates a client/user workspace, Google Drive folders, Google Sheet, prompt doc, Supabase user record, and welcome instructions.
- `Onboarding_get_access_tokens.json`: collects Facebook and Instagram tokens through an n8n form and updates Supabase.
- `Onboarding_send_instructions.json`: sends setup instructions and Google workspace links.
- `SoMe_Automation_Create_Post_ext.json`: creates or updates platform variants from a selected Sheet row.
- `SoMe_Create_Image.json`: generates images and creates image previews.
- `Search_Images_folder.json`: finds media inside the Google Drive workspace structure.
- `SoMe_Automation_Get_Prompts.json`: reads prompt content from Google Docs.
- `SoMe_Automation_Schedule_Post_ext.json`: creates a scheduled publication record in Supabase from approved Sheet content.
- `SoMe_Automation_Update_Planned_Post_ext.json`: updates already planned content.
- `SoMe_Scheduling_Poll_ext.json`: daily or manual publishing poll for scheduled posts.
- `SoMe_Automation_Queue_external.json`: waits until platform-specific publish times and dispatches platform workflows.
- `SoMe_Automation_Post_Facebook_ext.json`: publishes Facebook content.
- `SoMe_Automation_Post_Instagram_ext.json`: publishes Instagram content.
- `SoMe_Automation_Post_LinkedIn_ext.json`: publishes LinkedIn content.
- `SoMe_Automation_Donwload_file_ext.json`: downloads files from Google Drive for processing.
- `SoMe_Automation_Upload_to_Bucket_ext.json`: uploads files to Supabase Storage.
- `SoMe_Automation_Progress_Log.json`: writes progress logs to Google Sheets.
- `Global_error_workflow_external.json`: global error notification workflow.

### Solo LinkedIn Branch

Location: `Linkedin_solo_workflows/`

This is not a separate long-term product module. It is an off-branch of the main social media automation. Some parts are simplified, and some LinkedIn publishing behavior appears to be more up to date or more reliable than the main branch.

Useful workflows to preserve as reference:

- `LI-Generate.json`
- `LI-Regenerate.json`
- `LI-Edit.json`
- `LI-Confirm.json`
- `LinkedIn_Scheduling_Poll.json`
- `LI_Post_Request_LinkedIn.json`
- `LI_Search_media_folder.json`
- `LI_Donwload_each_file.json`
- `Clear_temp_media.json`
- `LinkedIn_error_workflow.json`

Future direction: merge the useful LinkedIn-specific improvements into the unified product workflow. Do not keep a separate LinkedIn product path.

### Newsletter Workflows

Location: `Newsletter_workflows/`

The newsletter workflows are highly custom for a specific client and should be treated as backup/reference material, not as a direct product foundation.

Useful concepts:

- multi-language generation,
- draft/edit/strict-edit lifecycle,
- target group and CTA handling,
- newsletter defaults,
- final HTML generation,
- external publishing handoff.

If newsletter becomes part of the product later, it should likely be redesigned from scratch for a new emailing platform rather than migrated directly from the current Odoo/custom implementation.

## Current Data Model

Known Supabase tables from `db_schemas/`:

### `SoMe_user_db`

Stores current user/client configuration:

- user name and reference email,
- Facebook page ID,
- Instagram user ID,
- Facebook/Instagram/LinkedIn tokens,
- Google master table ID,
- Google master folder ID,
- prompts folder ID,
- images folder ID,
- prompt doc ID,
- internal `user_id`.

Current issue: platform tokens are stored directly in this table.

### `some_post_plan_selfhost_external`

Stores scheduled social posts:

- Instagram, Facebook, and LinkedIn captions,
- Instagram/Facebook credits,
- hashtags,
- platform-specific planned dates and times,
- platform-specific attachment arrays,
- `source_row`,
- `user_id`,
- overall `status`,
- platform flags `publish_fb`, `publish_ig`, `publish_li`.

This is the most important current table for publication scheduling.

### `access_tokens`

General platform-token table with platform enum and token fields. It exists, but the main current flow appears to rely more heavily on `SoMe_user_db`.

### Newsletter Tables

- `newsletter_drafts`
- `newsletter_defaults`
- `newsletter_creds`
- `newsletter_campaign_detail`

These are currently useful mostly as reference for custom newsletter behavior.

### Referenced Tables Without Provided Schema

These appear in workflow exports but do not have schema files in the current workspace:

- `LinkedIn_manager_posts`
- `LinkedIn_manager_profiles`
- `newsletter_segments`

## Google Sheets Responsibilities

Google Sheets currently replaces multiple product modules:

- Input table for content.
- Status dashboard.
- Content editor.
- Approval interface.
- n8n trigger surface.
- Log viewer.
- Settings/token screen.
- Media workspace linker.
- Preview launcher.
- Newsletter language/action selector.

Important Apps Script files:

- `appscripts/SoMe_main.txt`: main social media UI/actions.
- `appscripts/SoMe_access_tokens.txt`: token update and token validation.
- `appscripts/SoMe_create_post_dialog.txt`: create-post dialog.
- `appscripts/SoMe_platform_dialog.txt`: platform selection dialog.
- `appscripts/SoMe_user_manual.txt`: embedded manual.
- `appscripts/Newsletter_main.txt`: newsletter UI/actions.

Critical security issue:

- `appscripts/SoMe_access_tokens.txt` contains a Supabase service-role key. A production product must never expose service-role credentials to frontend or user-editable script contexts.

## Proposed Product Architecture

The new architecture should be cleanly separated:

### Frontend

Recommended stack:

- Next.js / React.
- Supabase Auth.
- Product UI for content orchestration.
- No direct exposure of service-role keys or platform tokens.

Frontend responsibilities:

- onboarding,
- brand profile capture,
- content workspace,
- platform variant editor,
- calendar/list views,
- approvals,
- media upload and assignment,
- status and logs,
- user/team settings.

### Supabase

Supabase should become the primary storage layer:

- Auth,
- Postgres,
- Storage,
- Row Level Security,
- product state,
- audit/activity logs,
- media metadata,
- brand profiles.

### n8n

n8n should stay as orchestration where it is useful:

- AI generation,
- platform publishing,
- scheduled jobs,
- media processing,
- webhook-driven automation,
- notifications,
- token validation/refresh.

The product should avoid encoding product UI state inside n8n. n8n should receive explicit jobs and write explicit job results.

### API / Server Layer

A small server boundary is recommended:

- Next.js API routes or Supabase Edge Functions.
- Validates user permissions.
- Validates payloads.
- Calls n8n webhooks securely.
- Hides internal n8n URLs.
- Writes audit logs.
- Keeps service-role operations server-side.

## Frontend MVP Scope

The first MVP should replace the core Google Sheet experience:

- Login.
- Workspace/brand profile.
- Content list.
- Content detail/editor.
- Platform variants for Instagram, Facebook, LinkedIn.
- Media upload and assignment.
- Schedule fields per platform.
- Status dashboard.
- Trigger buttons for create/update/schedule/publish.
- Activity log.
- Basic settings for connected platforms.

Do not include a full newsletter rewrite in the first MVP.

## Onboarding / Brand Capture Scope

New onboarding should capture product-level brand knowledge:

- brand name,
- brand description,
- target audience,
- products/services,
- tone of voice,
- forbidden words/phrases,
- preferred style,
- sample posts,
- website/blog/social links,
- topics/content pillars,
- CTA preferences,
- language variants,
- active platforms,
- approval rules,
- publishing frequency,
- Instagram-specific rules,
- Facebook-specific rules,
- LinkedIn-specific rules,
- blog/newsletter-specific rules if enabled later.

This should become a structured Supabase model and should feed AI prompts.

## Migration Plan

Recommended migration approach:

1. Preserve legacy automation documentation.
2. Define product data model independently from Google Sheets.
3. Map legacy fields and status transitions into the new model.
4. Build a small API boundary for n8n action calls.
5. Build internal frontend MVP against Supabase.
6. Add n8n compatibility endpoints or payload adapters.
7. Keep current Google Sheets workflow running during MVP validation.
8. Use Supabase Storage for all new uploads.
9. Gradually stop writing status/logs to Google Sheets.
10. Retire Google Sheets only after the product UI covers all daily operations.

## Risks

- Exposed Supabase service-role key in Apps Script.
- Platform tokens stored in a general user table.
- Google Sheets acts as hidden application state.
- Google Drive media structure is deeply coupled to workflow logic.
- Status transitions are implicit strings rather than a formal state machine.
- Some workflows write status to both Supabase and Google Sheets.
- Solo LinkedIn branch may contain better behavior than main LinkedIn workflow and should not be ignored.
- Newsletter workflows are client-specific and could distract from the core social media product.
- Existing n8n webhooks are operational endpoints, not product-grade API contracts.

## Recommended Next Tasks

1. Create a detailed current-process documentation file.
2. Extract webhook contracts from Apps Script and n8n exports.
3. Draft a clean target Supabase schema for the product.
4. Define product status/state machine.
5. Define media model and storage rules.
6. Define secure token/secrets model.
7. Create MVP frontend specification.
8. Only after the above, start implementation.
