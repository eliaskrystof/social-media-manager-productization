# Legacy Workflow Map

Date: 2026-05-14

## Purpose

This document maps the current legacy automation at the workflow-contract level. It is meant to preserve implementation knowledge before the new product architecture is designed.

The goal is not to copy this structure into the new product. The goal is to understand:

- what actions exist,
- which inputs they receive,
- which tables and files they touch,
- which external APIs they call,
- which parts should become product-native concepts,
- which parts can be reused or adapted.

## Scope

Covered sources:

- `appscripts/`
- `Social_media_manager_workflows/`
- `Linkedin_solo_workflows/`
- `Newsletter_workflows/`
- `db_schemas/`

Important framing:

- Main social media workflows are the primary current implementation.
- Solo LinkedIn is an off-branch with useful LinkedIn-specific improvements.
- Newsletter is client-specific reference material, not an MVP foundation.

## Legacy System Boundaries

### UI Boundary

Current UI is Google Sheets plus Apps Script.

Apps Script responsibilities:

- show menu actions,
- open modals,
- read checked rows,
- validate platform/media choices,
- create Google Drive media folders,
- build webhook payloads,
- call n8n,
- update checkbox/status cells,
- write logs,
- validate/update access tokens.

### Orchestration Boundary

n8n handles:

- onboarding automation,
- prompt retrieval,
- AI text generation,
- image generation,
- media discovery,
- media download/upload,
- scheduling,
- platform publishing,
- newsletter generation,
- Odoo handoff,
- error handling.

### Storage Boundary

Current storage is split:

- Google Sheets for visible work state.
- Google Drive for media and prompt workspace.
- Supabase Postgres for users, scheduled posts, tokens, newsletter drafts.
- n8n execution state for transient orchestration.

## Main Social Media Apps Script Contract

Source: `appscripts/SoMe_main.txt`

### Sheet

Sheet name:

- `SoMe_content`

Columns:

- `id`
- `text_ig`
- `credits_ig`
- `hashtags_ig`
- `text_fb`
- `credits_fb`
- `text_li`
- `photos_link`
- `ig_planned_date`
- `fb_planned_date`
- `li_planned_date`
- `ig_post_time`
- `fb_post_time`
- `li_post_time`
- `checked`
- `status`
- `preview`
- `images`

### Menu Actions

Current menu actions:

- Create Posts -> `ext_Create_Post`
- Update Posts -> `ext_Create_Post`
- Schedule Posts -> `ext_Schedule_Post`
- Update Scheduled Posts -> `ext_Update_Scheduled_Post`
- Publish Today's Posts -> `ext_Publish`
- Open Preview -> reads generated Drive HTML preview

### Platform Selection

Current options:

- `facebook_instagram`
- `linkedin`
- `all`

Payload flags:

- `action_for_facebook`
- `action_for_instagram`
- `action_for_linkedin`

### Image Source

Current options:

- `yes`: user has prepared media in Drive folders.
- `no`: no media.
- `create`: n8n should generate image/media.

### Generic Social Payload

Sent by `postRows()` and `continueCreatePosts()`:

```json
{
  "sheetId": "google-sheet-id",
  "row": 2,
  "content": {
    "id": "legacy-row-id",
    "text_ig": "...",
    "credits_ig": "...",
    "hashtags_ig": "...",
    "text_fb": "...",
    "credits_fb": "...",
    "text_li": "...",
    "photos_link": "...",
    "ig_planned_date": "yyyy-mm-dd",
    "fb_planned_date": "yyyy-mm-dd",
    "li_planned_date": "yyyy-mm-dd",
    "ig_post_time": "HH:mm:ss",
    "fb_post_time": "HH:mm:ss",
    "li_post_time": "HH:mm:ss",
    "checked": true,
    "status": "draft",
    "preview": "...",
    "images": true
  },
  "action_name": "Create Posts",
  "user_input": "optional user edit note or image prompt",
  "image_source": "yes|no|create",
  "action_for_facebook": true,
  "action_for_instagram": true,
  "action_for_linkedin": false
}
```

Product mapping:

- `sheetId` -> legacy workspace reference only.
- `row` -> legacy source row; future product should use `content_item.id`.
- `content` -> split into `content_items` and `platform_variants`.
- `action_name` -> product action/event type.
- `user_input` -> generation/edit instruction.
- `image_source` -> media generation/source mode.
- platform flags -> selected channels for generation/scheduling.

## Main Social Media Workflow Map

### `User_Onboarding`

File: `Social_media_manager_workflows/User_Onboarding.json`

Triggers:

- `POST /webhook/7c278f48-6ae7-48f8-b11f-e536a9402a48`
- n8n form trigger

Supabase:

- creates/updates `SoMe_user_db`

Google Drive/Docs:

- creates root folder,
- creates prompts/images folders,
- copies master Sheet,
- creates prompt document,
- shares folder.

Sub-workflows:

- welcome email/instructions workflow.

Current purpose:

- Provision a Google Drive/Sheets workspace for a new user/client.

Future product mapping:

- Replace with product onboarding and brand/workspace provisioning.
- Do not make Google Drive workspace a core dependency.

Owner input needed:

- final onboarding fields,
- whether local MVP is single-workspace or multi-tenant.

### `Onboarding_get_access_tokens`

File: `Social_media_manager_workflows/Onboarding_get_access_tokens.json`

Trigger:

- n8n form trigger

Supabase:

- updates `SoMe_user_db`

Current purpose:

- Store Facebook and Instagram access tokens collected from a form.

Future product mapping:

- Replace with secure integration connection flow.
- Store encrypted credentials or reference external secret storage.

### `Onboarding_send_instructions`

File: `Social_media_manager_workflows/Onboarding_send_instructions.json`

Trigger:

- execute workflow trigger

Supabase:

- reads `SoMe_user_db`

Current purpose:

- Send welcome email with Google Sheet/Drive workspace links.

Future product mapping:

- Product invite/setup email.
- Links should point to product UI, not Google Sheets.

### `SoMe_Automation_Create_Post_ext`

File: `Social_media_manager_workflows/SoMe_Automation_Create_Post_ext.json`

Webhook:

- `POST /webhook/ext_Create_Post`

Supabase:

- reads `SoMe_user_db`

Google Sheets:

- reads settings,
- writes generated/updated post back to master Sheet.

Google Drive/Docs:

- searches folders,
- uploads preview HTML.

Sub-workflows:

- `Search Image folders`
- `Get Prompts`
- `Generate Images`
- `Log_init`

Current purpose:

- Core create/update flow for platform-specific post variants.
- Uses selected row content, platform flags, optional user instruction, image mode, prompt documents, and media folder state.

Current side effects:

- generated platform text in Google Sheet,
- preview file in Google Drive,
- progress log entries.

Future product mapping:

- Product action: `generate_platform_variants` or `edit_platform_variants`.
- Inputs should come from product DB, not Sheet row.
- Outputs should write `platform_variants`, `media_assets`, `activity_logs`.

Reuse candidate:

- prompt construction logic,
- platform-specific generation logic,
- preview generation idea,
- image-generation branch.

### `SoMe_Create_Image`

File: `Social_media_manager_workflows/SoMe_Create_Image.json`

Trigger:

- execute workflow trigger

Google Drive:

- searches folders,
- uploads generated file.

External APIs:

- OpenRouter/OpenAI-like chat completions,
- image generation,
- Catbox upload in the current flow.

Current purpose:

- Generate an image from a prompt and return usable image/preview data.

Future product mapping:

- Product action: `generate_media_asset`.
- Store generated assets in product storage, not Drive/Catbox.

Owner input needed:

- preferred AI image provider,
- whether generated media is required in MVP.

### `Search_Images_folder`

File: `Social_media_manager_workflows/Search_Images_folder.json`

Trigger:

- execute workflow trigger

Google Drive:

- searches master/media subfolders,
- downloads matching files.

Current purpose:

- Resolve media selected by folder structure and platform.

Future product mapping:

- Replace with product `media_assets` queries.
- Legacy Drive resolver may be kept as import/migration adapter.

### `SoMe_Automation_Get_Prompts`

File: `Social_media_manager_workflows/SoMe_Automation_Get_Prompts.json`

Trigger:

- execute workflow trigger

Google Docs:

- reads prompt documents.

Current purpose:

- Load prompt instructions used by generation workflows.

Future product mapping:

- Replace or supplement with structured `brand_profiles`, prompt templates, and channel rules.

### `SoMe_Automation_Schedule_Post_ext`

File: `Social_media_manager_workflows/SoMe_Automation_Schedule_Post_ext.json`

Webhook:

- `POST /webhook/ext_Schedule_Post`

Supabase:

- reads `SoMe_user_db`
- creates `some_post_plan_selfhost_external`

Google Sheets:

- updates master Sheet status,
- writes error status on failure.

Google Drive:

- searches master folder,
- searches platform media subfolders.

Sub-workflows:

- `Log_init`
- `Log_done`
- `Log_error`
- `Download Facebook media`
- `Download Instagram Media`
- `Download LinkedIn media`

Current purpose:

- Convert approved Sheet row into a scheduled post record.

Future product mapping:

- Product action: `schedule_publication_jobs`.
- Should create one `publication_job` per selected platform.

Reuse candidate:

- platform media preparation flow,
- mapping between platform captions/dates/times and scheduled job entries.

### `SoMe_Automation_Update_Planned_Post_ext`

File: `Social_media_manager_workflows/SoMe_Automation_Update_Planned_Post_ext.json`

Webhook:

- `POST /webhook/ext_Update_Scheduled_Post`

Supabase:

- reads `SoMe_user_db`
- updates `some_post_plan_selfhost_external`

Google Sheets:

- updates status in master table.

Sub-workflows:

- `Log_done`
- `Log_error`

Current purpose:

- Update content that was already scheduled.

Future product mapping:

- Product action: `update_publication_job`.
- Needs explicit rules for editable fields after approval/scheduling.

Owner input needed:

- whether scheduled posts can be edited until publish time,
- whether editing should require re-approval.

### `SoMe_Scheduling_Poll_ext`

File: `Social_media_manager_workflows/SoMe_Scheduling_Poll_ext.json`

Triggers:

- daily schedule trigger around 05:00,
- manual trigger,
- webhook `ext_Publish`

Supabase:

- queries `some_post_plan_selfhost_external` by current date/platform,
- updates scheduled row status.

Google Sheets:

- updates final done status.

Sub-workflows:

- `Execute Facebook Posting`
- `Execute Instagram Posting`
- `Execute LinkedIn Posting`

Current purpose:

- Find posts scheduled for today and dispatch platform publishing workflows.

Future product mapping:

- Product scheduler/worker or n8n scheduler that reads `publication_jobs`.
- Product-native job statuses should replace Sheet status updates.

### `SoMe_Automation_Queue_external`

File: `Social_media_manager_workflows/SoMe_Automation_Queue_external.json`

Trigger:

- execute workflow trigger

Supabase:

- reads `some_post_plan_selfhost_external`

Sub-workflows:

- Facebook publisher,
- Instagram publisher,
- LinkedIn publisher.

Current purpose:

- Wait until platform-specific planned times and call platform publishers.

Future product mapping:

- `publication_jobs.scheduled_at` per channel.
- Avoid long wait nodes if a queue/cron approach is more reliable for production.

### `SoMe_Automation_Post_Facebook_ext`

File: `Social_media_manager_workflows/SoMe_Automation_Post_Facebook_ext.json`

Trigger:

- execute workflow trigger
- manual trigger

Supabase:

- reads `SoMe_user_db`
- reads `some_post_plan_selfhost_external`
- updates `some_post_plan_selfhost_external`

Google Sheets:

- updates Sheet status in some branches.

External APIs:

- Facebook Graph API photo/feed/video endpoints.

Current purpose:

- Publish Facebook media and feed posts.

Future product mapping:

- Platform adapter: `facebook_publisher`.
- Should output normalized publication result:
  - `platform_post_id`,
  - `platform_url`,
  - `published_at`,
  - `status`,
  - `error`.

### `SoMe_Automation_Post_Instagram_ext`

File: `Social_media_manager_workflows/SoMe_Automation_Post_Instagram_ext.json`

Trigger:

- execute workflow trigger

Supabase:

- reads `SoMe_user_db`
- reads `some_post_plan_selfhost_external`
- updates `some_post_plan_selfhost_external`

External APIs:

- Instagram Graph API media container and publish endpoints.

Current purpose:

- Publish single images, carousel items, carousel posts, and video flows.

Future product mapping:

- Platform adapter: `instagram_publisher`.
- Preserve carousel/container readiness behavior.

Owner input needed:

- current known IG limitations/failure cases,
- required post types for MVP: image, carousel, reel/video, story.

### `SoMe_Automation_Post_LinkedIn_ext`

File: `Social_media_manager_workflows/SoMe_Automation_Post_LinkedIn_ext.json`

Trigger:

- execute workflow trigger
- manual trigger

Supabase:

- reads `SoMe_user_db`
- reads `some_post_plan_selfhost_external`
- updates `some_post_plan_selfhost_external`

External APIs:

- LinkedIn userinfo,
- asset registration,
- image/video upload,
- UGC post publish.

Current purpose:

- Publish LinkedIn text/image/video content.

Future product mapping:

- Platform adapter: `linkedin_publisher`.
- Compare against solo LinkedIn branch before redesigning this adapter.

Owner input needed:

- which LinkedIn implementation is currently more reliable and why.

### `SoMe_Automation_Donwload_file_ext`

File: `Social_media_manager_workflows/SoMe_Automation_Donwload_file_ext.json`

Trigger:

- execute workflow trigger

Google Drive:

- downloads file.

Local file system:

- writes temporary files.

Current purpose:

- Download Google Drive media before upload/publish.

Future product mapping:

- Not needed if product storage gives direct file URLs or signed URLs.

### `SoMe_Automation_Upload_to_Bucket_ext`

File: `Social_media_manager_workflows/SoMe_Automation_Upload_to_Bucket_ext.json`

Trigger:

- execute workflow trigger

External APIs:

- Supabase Storage REST endpoint.

Current purpose:

- Upload local/binary media to Supabase Storage bucket `SoMe_Automation_media`.

Security note:

- Legacy export originally contained hardcoded Supabase service-role credentials. They are redacted in Git.

Future product mapping:

- Product storage upload should be server-side and credential-safe.

### `SoMe_Automation_Progress_Log`

File: `Social_media_manager_workflows/SoMe_Automation_Progress_Log.json`

Trigger:

- execute workflow trigger

Google Sheets:

- appends to `Log`.

Current purpose:

- Workflow progress logging.

Future product mapping:

- Product `activity_logs` and `job_events`.

### `Global_error_workflow_external`

File: `Social_media_manager_workflows/Global_error_workflow_external.json`

Trigger:

- error trigger

Current purpose:

- Send error notification email/Gmail.

Future product mapping:

- Product error event + optional notification.

## Current Social Data Contract

### `SoMe_user_db`

Used for:

- platform tokens,
- platform account IDs,
- Google workspace IDs,
- prompt/image folder IDs,
- user identity reference.

Future split:

- `workspaces`
- `brands`
- `integration_accounts`
- `integration_credentials`
- `legacy_sources`

### `some_post_plan_selfhost_external`

Used for:

- scheduled post content,
- platform captions,
- attachments,
- planned dates/times,
- publish flags.

Future split:

- `content_items`
- `platform_variants`
- `media_assets`
- `publication_jobs`
- `publication_results`

## Solo LinkedIn Branch Map

Location: `Linkedin_solo_workflows/`

Role:

- off-branch of the main social media automation,
- useful reference for LinkedIn-specific behavior,
- not a separate future product module.

### `LI-Generate`

Webhook:

- `POST /webhook/LI-generate`

Supabase:

- creates `LinkedIn_manager_posts`

Google Sheets:

- updates generate row/status.

Current purpose:

- Generate LinkedIn content from Sheet input.

### `LI-Regenerate`

Webhook:

- `POST /webhook/LI-regenerate`

Supabase:

- updates `LinkedIn_manager_posts`

Google Sheets:

- updates regenerate row/status.

Current purpose:

- Regenerate LinkedIn content.

### `LI-Edit`

Webhook:

- `POST /webhook/LI-edit`

Supabase:

- updates `LinkedIn_manager_posts`

Google Sheets:

- updates edit status.

Current purpose:

- Apply edit instruction to LinkedIn content.

### `LI-Confirm`

Webhook:

- `POST /webhook/LI-confirm`

Supabase:

- updates `LinkedIn_manager_posts`

Google Sheets:

- updates confirm status.

Sub-workflow:

- scheduling/publish workflow.

Current purpose:

- Confirm LinkedIn content for publishing.

### `LinkedIn_Scheduling_Poll`

Webhook:

- `POST /webhook/LI-publish`

Supabase:

- reads/updates `LinkedIn_manager_posts`

Google Sheets:

- updates status and result URL.

Sub-workflows:

- LinkedIn post request workflow.

Current purpose:

- Schedule/publish LinkedIn posts.

### `LI_Post_Request_LinkedIn`

Trigger:

- execute workflow trigger

Supabase:

- reads `LinkedIn_manager_profiles`
- reads `LinkedIn_manager_posts`

External APIs:

- LinkedIn userinfo,
- LinkedIn asset registration,
- LinkedIn upload,
- LinkedIn UGC publish.

Current purpose:

- LinkedIn publisher implementation.

Future product mapping:

- Compare this workflow with `SoMe_Automation_Post_LinkedIn_ext`.
- Reuse the stronger LinkedIn publishing path in the unified product adapter.

### `LI_Search_media_folder`

Trigger:

- execute workflow trigger

Supabase:

- reads `LinkedIn_manager_profiles`
- updates `LinkedIn_manager_posts`

Google Drive:

- searches profile media folder and post folder.

Current purpose:

- Resolve media for LinkedIn-only posts.

## Newsletter Workflow Map

Location: `Newsletter_workflows/`

Role:

- client-specific reference/backup.
- not included in first social media MVP.

### Newsletter Apps Script Webhooks

Source: `appscripts/Newsletter_main.txt`

Webhook URLs:

- `Newsletter`
- `edit-newsletter`
- `post_to_odoo`
- `confirm_and_send`
- `strict-edit-newsletter`

### Newsletter Create Payload

Sent by `processNewsletterLanguages()`:

```json
{
  "newsletters": [
    {
      "rowNumber": 2,
      "languages": [
        {
          "language": "czech",
          "...": "row-derived newsletter fields"
        }
      ]
    }
  ]
}
```

### Newsletter Simple Action Payload

Sent to Odoo/confirm webhooks:

```json
{
  "row_number": 2,
  "language": "czech",
  "target_group": "Architects & Designers",
  "month": "May"
}
```

### Newsletter Strict Edit Payload

```json
{
  "source_row": 2,
  "language": "czech",
  "target_languages": [],
  "content_blob": "...",
  "propagate": false
}
```

### Newsletter Edit From Master Payload

```json
{
  "source_row": 2,
  "language": "czech",
  "target_languages": ["english", "german"],
  "content_blob": "...",
  "propagate": true
}
```

### `First_draft`

Webhook:

- `POST /webhook/Newsletter`

Sub-workflows:

- `Newsletter_Each_draft_w/sub`

Current purpose:

- Entry point for batch newsletter draft generation.

### `Newsletter_Each_draft_w_sub`

Supabase:

- reads `newsletter_defaults`
- creates `newsletter_drafts`
- updates generated HTML

Sub-workflows:

- `Draft_from_blog`
- `Draft_from_project`
- `Update_row_Gsheet`
- `Create_Subject`

Current purpose:

- Generate per-language newsletter draft with subject and HTML.

### `Edit Newsletter`

Webhook:

- `POST /webhook/edit-newsletter`

Supabase:

- reads/updates `newsletter_drafts`

Google Sheets:

- updates row status/content.

Current purpose:

- Edit selected newsletter sections.

### `Strict_edit`

Webhook:

- `POST /webhook/strict-edit-newsletter`

Supabase:

- reads/updates `newsletter_drafts`

Sub-workflows:

- `Parse_content_blob`
- `Edit_copy_from_master`

Current purpose:

- Parse existing content blob and rewrite tightly.

### `Post to Odoo`

Trigger:

- execute workflow trigger / manual

Supabase:

- reads `newsletter_creds`
- reads/updates `newsletter_drafts`
- updates `newsletter_campaign_detail`

External APIs:

- Odoo XML-RPC.

Current purpose:

- Create/update Odoo mailing campaign and store Odoo IDs.

### `Confirm_and_Send`

Webhook:

- `POST /webhook/confirm_and_send`

Supabase:

- reads `newsletter_creds`
- reads `newsletter_drafts`

Google Sheets:

- updates row status.

External APIs:

- Odoo XML-RPC queue/send action.

Current purpose:

- Confirm and enqueue/send newsletter in Odoo.

## Current External API Surface

### Public/Internal Webhooks

Social:

- `ext_Create_Post`
- `ext_Schedule_Post`
- `ext_Update_Scheduled_Post`
- `ext_Publish`

Solo LinkedIn:

- `LI-generate`
- `LI-regenerate`
- `LI-edit`
- `LI-confirm`
- `LI-publish`

Newsletter:

- `Newsletter`
- `edit-newsletter`
- `strict-edit-newsletter`
- `post_to_odoo`
- `confirm_and_send`

Product recommendation:

- Put a product API boundary in front of n8n.
- Browser should call product API, not n8n directly.
- API should validate auth, workspace, permissions, payload, idempotency, and logging.

### Third-Party APIs

Current integrations:

- Facebook Graph API,
- Instagram Graph API,
- LinkedIn API,
- Google Sheets API/nodes,
- Google Drive API/nodes,
- Google Docs API/nodes,
- Supabase REST and n8n Supabase nodes,
- Odoo XML-RPC,
- AI provider APIs,
- image hosting/upload endpoints.

## Legacy Concepts To Preserve

Preserve as product concepts:

- master content input,
- platform variants,
- platform-specific media,
- generation instruction,
- edit instruction,
- approval before scheduling,
- per-platform schedule time,
- publication result URL/status,
- activity log,
- brand/prompt context,
- lifecycle/repurposing potential.

Preserve as implementation references:

- LinkedIn media upload/publish logic,
- Instagram carousel readiness flow,
- Facebook media/feed branching,
- image-generation flow,
- prompt retrieval and compilation,
- schedule-to-publish orchestration.

Do not preserve as product architecture:

- Google Sheets as state store,
- Apps Script as backend controller,
- Drive folder structure as primary media model,
- hardcoded service credentials,
- direct browser-to-n8n webhook calls,
- mixed Sheet/Supabase status writes.

## Product Model Implications

The legacy map suggests these target entities:

- `users`
- `workspaces`
- `brands`
- `brand_profiles`
- `brand_voice_samples`
- `integration_accounts`
- `integration_credentials`
- `content_items`
- `platform_variants`
- `media_assets`
- `publication_jobs`
- `publication_results`
- `approvals`
- `activity_logs`
- `automation_runs`
- `legacy_sources`

## Open Questions

Need owner input:

1. Which solo LinkedIn behavior is known to work better than the main branch?
2. Which Instagram post types are required in MVP?
3. Should MVP include generated images, or only uploaded media?
4. Can scheduled posts be edited without re-approval?
5. Is the first MVP single-workspace/internal, or should multi-tenant boundaries be designed from day one?
6. Should blog be modeled as a platform variant in MVP, or kept for later?
7. Should newsletter remain entirely out of MVP?

## Next Documentation Step

Recommended next document:

- `docs/target-data-model.md`

Purpose:

- design the clean product schema based on the mapped legacy behavior,
- keep it portable for local Postgres first,
- allow Supabase later without locking the product model to Supabase-specific assumptions.
