# Current Process Documentation

Date: 2026-05-14

## Purpose

This document preserves how the existing automation works today. It is not a recommendation to keep the same architecture. It is a starting point for understanding the current behavior before designing the new product.

The future product should be separated from this legacy automation, but the existing flows contain important information about platform behavior, operational states, user actions, and edge cases.

The current process is therefore documented as source material, not as a direct migration target. New product databases and new n8n workflows should be created separately from the current implementation, while still allowing selective reuse of working logic and proven process patterns.

## System Components

### Google Sheets

Google Sheets is the current operational UI.

Main social media sheet:

- Sheet name: `SoMe_content`
- Managed by: `appscripts/SoMe_main.txt`
- Main user actions are exposed through the `Post Actions` menu.

Settings sheet:

- Sheet name: `Settings`
- Managed by: `appscripts/SoMe_access_tokens.txt`
- Stores platform tokens and IDs before pushing them to Supabase.

Log sheet:

- Sheet name: `Log`
- Receives status, error, and progress messages.

Newsletter sheet:

- Sheet name in script: `Návrh tabulky Newsletterů`
- Managed by: `appscripts/Newsletter_main.txt`

### Apps Script

Apps Script currently acts as a frontend controller:

- creates menus,
- opens dialogs,
- reads selected rows,
- validates selections,
- creates Google Drive media folders,
- builds webhook payloads,
- calls n8n webhooks,
- writes logs,
- opens previews,
- updates access tokens in Supabase.

### n8n

n8n handles orchestration:

- AI content generation,
- image generation,
- prompt loading,
- media discovery/download/upload,
- scheduling,
- platform publishing,
- logging,
- onboarding,
- newsletter drafting and sending.

### Supabase

Supabase stores:

- users/client config,
- post plans,
- token-like credential data,
- newsletter drafts/defaults/credentials,
- some media URLs and publication states.

### Google Drive

Google Drive currently stores:

- client root workspace,
- master planning Sheet,
- prompt documents,
- image/media folders,
- generated preview HTML,
- platform-specific media folders.

## Social Media Process

### 1. User Onboarding

Primary workflow: `Social_media_manager_workflows/User_Onboarding.json`

Current behavior:

1. User submits onboarding data through webhook or n8n form.
2. n8n generates a `user_id`.
3. n8n creates a row in `SoMe_user_db`.
4. n8n creates a Google Drive root folder.
5. n8n creates subfolders for prompts and images.
6. n8n copies/uploads the master Google Sheet.
7. n8n creates a Google Docs prompt document.
8. n8n stores Google IDs back in `SoMe_user_db`.
9. n8n shares the Drive folder.
10. n8n sends welcome instructions.

Current output:

- Supabase user/client record.
- Google Drive workspace.
- Google Sheet user interface.
- Prompt document.
- Images folder.

Product note:

The future onboarding should capture brand profile and product settings first. Google Drive workspace creation should not be a core product dependency.

### 2. Access Token Setup

Current files/workflows:

- `appscripts/SoMe_access_tokens.txt`
- `Social_media_manager_workflows/Onboarding_get_access_tokens.json`

Current behavior:

1. User enters tokens/IDs into the `Settings` Sheet.
2. Apps Script maps Sheet headers to Supabase fields.
3. Apps Script patches `SoMe_user_db` by `master_table_id`.
4. Apps Script can validate Facebook, Instagram, and LinkedIn tokens by calling platform APIs.
5. n8n onboarding form can also write FB/IG tokens to `SoMe_user_db`.

Important mapped fields:

- `instagram_access_token` -> `ig_access_token`
- `facebook_access_token` -> `fb_access_token`
- `linkedin_access_token` -> `linkedin_user_token`
- `instagram_id` -> `ig_user_id`
- `facebook_id` -> `fb_page_id`
- `linkedin_id` -> `linkedin_user_id`

Product note:

Token handling must be moved to a secure server-side/secrets flow. The current Apps Script exposes a Supabase service-role key and should not be copied into the product.

### 3. Content Input

Current file: `appscripts/SoMe_main.txt`

Current Sheet columns:

- `ID`
- `TEXT_IG`
- `CREDITS_IG`
- `HASHTAGS_IG`
- `TEXT_FB`
- `CREDITS_FB`
- `TEXT_LI`
- `PHOTOS_LINK`
- `IG_PLANNED_DATE`
- `FB_PLANNED_DATE`
- `LI_PLANNED_DATE`
- `IG_POST_TIME`
- `FB_POST_TIME`
- `LI_POST_TIME`
- `CHECKBOX`
- `STATUS`
- `PREVIEW`
- `IMAGES`

Current behavior:

1. User adds or edits content in a row.
2. User checks a row.
3. User selects an action from the menu.
4. Apps Script builds a payload from the row and sends it to n8n.

Payload shape from Apps Script:

- `sheetId`
- `row`
- `content`
- `action_name`
- `user_input`
- `image_source`
- `action_for_facebook`
- `action_for_instagram`
- `action_for_linkedin`

Product note:

This maps naturally to:

- `content_items`
- `platform_variants`
- `media_assets`
- `publication_jobs`
- `activity_logs`

### 4. Media Folder Preparation

Current file: `appscripts/SoMe_main.txt`

Current behavior:

1. For create-post actions, Apps Script creates or finds a media folder for the selected row.
2. Folder structure:
   - `Images/{logicalRowId}/Facebook`
   - `Images/{logicalRowId}/Instagram`
   - `Images/{logicalRowId}/LinkedIn`
   - `Images/{logicalRowId}/Preview`
3. Apps Script writes the folder URL to the Sheet.
4. If the user says media is ready, Apps Script checks that required platform folders contain files.

Product note:

Future product should use Supabase Storage as primary media storage. Legacy Google Drive links can remain import/reference data.

### 5. Create or Update Post Variants

Primary workflow: `Social_media_manager_workflows/SoMe_Automation_Create_Post_ext.json`

Webhook:

- `POST /webhook/ext_Create_Post`

Current behavior:

1. Apps Script sends selected row content and platform choices.
2. n8n gets credentials from `SoMe_user_db`.
3. n8n reads current Sheet settings/content.
4. n8n loads prompts from Google Docs.
5. n8n searches media folders or generates images.
6. n8n calls AI generation.
7. n8n creates preview HTML.
8. n8n uploads preview to Google Drive.
9. n8n writes generated content and status back to the master Sheet.
10. n8n logs progress.

Current product meaning:

- This is the core AI-assisted variant generation/editing process.
- It already separates platform choices: Facebook, Instagram, LinkedIn.

Product note:

Future product should call this through a server-side action adapter at first, then gradually replace Sheet reads/writes with Supabase reads/writes.

### 6. Schedule Approved Post

Primary workflow: `Social_media_manager_workflows/SoMe_Automation_Schedule_Post_ext.json`

Webhook:

- `POST /webhook/ext_Schedule_Post`

Current behavior:

1. Apps Script sends selected row and platform selection.
2. n8n searches the Drive media folders.
3. n8n reads credentials from `SoMe_user_db`.
4. n8n downloads selected platform media.
5. n8n creates a row in `some_post_plan_selfhost_external`.
6. n8n updates Sheet status.
7. n8n logs success or error.

Current scheduled table:

- captions per platform,
- dates/times per platform,
- attachment arrays per platform,
- `status`,
- publish flags.

Product note:

This should become a `publication_jobs` creation process in the product.

### 7. Update Planned Post

Primary workflow: `Social_media_manager_workflows/SoMe_Automation_Update_Planned_Post_ext.json`

Webhook:

- `POST /webhook/ext_Update_Scheduled_Post`

Current behavior:

1. Apps Script sends row data.
2. n8n finds the relevant planned post.
3. n8n updates Supabase and Sheet status.

Product note:

This should become editing a scheduled `publication_job`, with clear rules about what can be changed after scheduling.

### 8. Publish Scheduled Posts

Primary workflows:

- `Social_media_manager_workflows/SoMe_Scheduling_Poll_ext.json`
- `Social_media_manager_workflows/SoMe_Automation_Queue_external.json`
- `Social_media_manager_workflows/SoMe_Automation_Post_Facebook_ext.json`
- `Social_media_manager_workflows/SoMe_Automation_Post_Instagram_ext.json`
- `Social_media_manager_workflows/SoMe_Automation_Post_LinkedIn_ext.json`

Webhook/manual trigger:

- `GET/POST /webhook/ext_Publish`
- Daily schedule trigger around 05:00.

Current behavior:

1. Poll workflow finds posts scheduled for the current date.
2. It splits posts by platform.
3. It waits until each platform-specific planned time.
4. It dispatches platform-specific publishing workflows.
5. Platform workflows publish through external APIs.
6. Supabase fields such as `publish_fb`, `publish_ig`, `publish_li` are updated.
7. Overall status is eventually updated to `posted` or `done`.

Facebook publishing:

- Uses Facebook Graph API.
- Supports feed posts, photo posts, multiple images, and videos.

Instagram publishing:

- Uses Instagram Graph API.
- Supports single media, carousel, and video/reel-like paths depending on workflow branch.

LinkedIn publishing:

- Uses LinkedIn asset registration/upload and UGC post publishing.
- The solo LinkedIn branch may contain better current implementation details and should be reviewed before finalizing the product LinkedIn publisher.

Product note:

Publishing should stay in n8n initially, but publication results should write to product-native job/activity tables.

## Current Status Semantics

Status values found or implied in code/workflows:

- `draft`
- `send to some`
- `created`
- `update`
- `updated`
- `scheduled`
- `update scheduled`
- `posted`
- `done`
- `POSTED`
- `READY IN ODOO`

Platform publish flags:

- `publish_fb`
- `publish_ig`
- `publish_li`

Common flag value:

- `done`

Product note:

The future product should define a formal state machine. Current string statuses should be treated as legacy values and mapped to normalized states.

## Solo LinkedIn Process

Location: `Linkedin_solo_workflows/`

This branch appears to be a simplified/updated LinkedIn-only variant of the main system.

Current likely process:

1. Generate LinkedIn post.
2. Edit or regenerate.
3. Confirm.
4. Schedule or publish.
5. Search media folder.
6. Register/upload LinkedIn media assets.
7. Publish LinkedIn UGC post.
8. Update Sheet/Supabase status.

Important product note:

This should not become a separate product module. Use it as a reference to improve the unified LinkedIn publishing path.

## Newsletter Process

Location: `Newsletter_workflows/`

Newsletter is a custom client-specific solution and should be preserved as reference material.

Current behavior includes:

- selecting checked newsletter rows in Google Sheets,
- choosing languages,
- generating drafts from blog/project inputs,
- applying target-group CTA defaults,
- editing existing draft sections,
- strict editing from content blobs,
- generating final HTML,
- posting to Odoo,
- confirming/sending through Odoo.

Important workflows:

- `First_draft.json`
- `Newsletter_Each_draft_w_sub.json`
- `Draft_from_blog.json`
- `Draft_from_project.json`
- `Edit Newsletter.json`
- `Strict_edit.json`
- `Post to Odoo.json`
- `Confirm_and_Send.json`

Product note:

Newsletter should not be included in the first frontend MVP. If it becomes part of the product, design a new channel abstraction and likely integrate with a different email platform.

## Current External Webhooks

Main social media:

- `ext_Create_Post`
- `ext_Schedule_Post`
- `ext_Update_Scheduled_Post`
- `ext_Publish`
- `access_tokens`
- onboarding webhook/form paths

Newsletter:

- `Newsletter`
- `edit-newsletter`
- `strict-edit-newsletter`
- `post_to_odoo`
- `confirm_and_send`

Solo LinkedIn:

- `LI-generate`
- `LI-regenerate`
- `LI-edit`
- `LI-confirm`
- `LI-publish`

Product note:

These should be treated as legacy operational endpoints. Product-grade API contracts should sit in front of them.

## Product-Relevant Lessons From Current System

The current system proves that the core product value is not just scheduling. The valuable behavior is:

- one content source,
- platform-specific variants,
- AI-assisted generation,
- user review and editing,
- approval before scheduling,
- platform-specific media handling,
- scheduled publication,
- lifecycle orchestration,
- reusable brand/prompt context.

The future product should preserve this value while removing accidental complexity from Google Sheets, Apps Script, and Google Drive coupling.

## Open Questions For The Next Design Phase

- What is the exact normalized lifecycle for a content item?
- Should platform variants be generated together or independently?
- How should brand voice be versioned over time?
- How should approvals work for teams?
- Which media transformations should happen before scheduling versus before publishing?
- Should n8n remain the long-term publisher or become replaceable behind a job interface?
- Which LinkedIn solo workflow behavior should be merged into the unified publisher?
- Should blog/newsletter be modeled as platforms, channels, or separate campaign types?
