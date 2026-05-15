# Legacy Google Sheets Map

Date: 2026-05-15

## Purpose

This document captures the current Google Sheets structure used by the legacy social media automation.

Important framing:

- This is a baseline of the current client-specific working process.
- It should not be copied directly as the universal product model.
- The legacy Sheet was shaped around one client's creative workflow and operational habits.
- The new product should use this as a starting point, then generalize the model around product concepts like content item, platform variant, media asset, approval, and publication job.

## Source Tabs

Captured tabs:

- `SoMe_content`
- `Settings`
- `Log`

## `SoMe_content`

Current purpose:

- main planning and editing table,
- one row roughly represents one content item/campaign idea,
- platform-specific text lives directly in columns,
- dates/times are platform-specific,
- checkbox selects rows for Apps Script actions,
- status column acts as user-visible workflow state,
- preview column links generated preview HTML,
- images column indicates whether media is involved.

## Columns

Legacy headers, written here in ASCII transliteration to avoid encoding ambiguity:

| Column | Meaning |
| --- | --- |
| `RADEK` | logical row/source row |
| `INSTAGRAM TEXT` | Instagram caption |
| `KREDITY IG: FOTO/VIDEO/JINE` | Instagram credits |
| `HASHTAGS # IG` | Instagram/Facebook hashtags |
| `FACEBOOK TEXT` | Facebook caption |
| `KREDITY FB: FOTO/VIDEO/JINE` | Facebook credits |
| `LINKEDIN TEXT` | LinkedIn post text |
| `ODKAZ NA FOTO/VIDEO PRISPEVKU` | Google Drive media folder/link |
| `DATUM POSTU - INSTAGRAM` | Instagram planned date |
| `DATUM POSTU - FACEBOOK` | Facebook planned date |
| `DATUM POSTU - LINKEDIN` | LinkedIn planned date |
| `CAS POSTU INSTAGRAM` | Instagram planned time |
| `CAS POSTU FACEBOOK` | Facebook planned time |
| `CAS POSTU LINKEDIN` | LinkedIn planned time |
| `Checkbox` | user selection for Apps Script actions |
| `FAZE PLANOVANI` | human-readable status |
| `NAHLED` | generated preview link |
| `Obrazky` | media/image mode flag |

## Example Row Shape

The provided example row contains:

- row id: `1`,
- Instagram text,
- hashtags,
- Facebook text,
- LinkedIn text,
- planned date for all three platforms,
- different platform times,
- checkbox `FALSE`,
- status `draft`.

Example platform times:

- Instagram: `16:00`
- Facebook: `17:00`
- LinkedIn: `15:15`

## Product Interpretation

This row should map to several product entities:

- one `content_item`,
- up to three `platform_variants`,
- optional `media_assets`,
- optional `content_media` assignments,
- future `publication_jobs` per selected platform.

### Legacy-To-Product Mapping

| Legacy Sheet Field | Product Concept |
| --- | --- |
| `RADEK` | legacy source row reference |
| `INSTAGRAM TEXT` | Instagram `platform_variant.caption` |
| `KREDITY IG` | Instagram `platform_variant.credits` |
| `HASHTAGS # IG` | hashtags array / platform option |
| `FACEBOOK TEXT` | Facebook `platform_variant.caption` |
| `KREDITY FB` | Facebook `platform_variant.credits` |
| `LINKEDIN TEXT` | LinkedIn `platform_variant.caption` |
| media link | `media_assets` / `legacy_sources` |
| platform dates/times | `platform_variant.scheduled_for` or `publication_job.scheduled_for` |
| checkbox | UI selection state only; should not be persisted as business state |
| `FÁZE PLÁNOVÁNÍ` | derived status + activity log |
| preview | `media_asset` with `media_type = html_preview` or generated preview artifact |
| images flag | media source/mode, not final content state |

## Generalization Notes

The current table has strong platform-specific columns. That worked for a small operational Sheet, but it is not flexible enough for product use.

In the product:

- platform variants should be rows, not fixed columns,
- platforms should be extensible,
- scheduling should be one job per platform,
- status should not include timestamps,
- checkbox selection should be replaced by explicit UI actions,
- preview should be generated from product data,
- media should be assigned explicitly and ordered explicitly.

## `Settings`

Current purpose:

- prompt storage,
- brand voice/context,
- default scheduling times,
- platform tokens and account IDs.

## Columns

Legacy headers:

| Column | Meaning |
| --- | --- |
| `prompt_instagram` | Instagram generation instruction |
| `prompt_facebook` | Facebook generation instruction |
| `prompt_linkedin` | LinkedIn generation instruction |
| `hashtags_prompt` | hashtag generation instruction |
| `tone_of_voice` | brand tone |
| `target_audience` | target audience |
| `product` | product/category context |
| `time_zone` | time zone |
| `language` | default language |
| `default_post_time_instagram` | default IG post time |
| `default_post_time_facebook` | default FB post time |
| `default_post_time_linkedin` | default LI post time |
| `instagram_access_token` | IG token |
| `facebook_access_token` | FB token |
| `linkedin_access_token` | LI token |
| `instagram_id` | IG account/user ID |
| `facebook_id` | FB page ID |
| `linkedin_id` | LI user ID |

## Example Settings Values

Provided example included:

- platform-specific prompt instructions,
- `tone_of_voice`: warm, confident, refined; avoid exaggeration; focus on quality, craft, design,
- `target_audience`: homeowners, interior designers, architects interested in premium materials/design,
- `product`: furniture,
- `language`: Czech,
- default times:
  - Instagram `15:00`,
  - Facebook `15:00`,
  - LinkedIn `16:00`.

## Product Interpretation

Settings should be split into several product concepts:

- `brand_profiles`,
- `prompt_templates`,
- `integration_accounts`,
- `integration_credentials`,
- platform rules,
- scheduling defaults.

### Legacy-To-Product Mapping

| Legacy Setting | Product Concept |
| --- | --- |
| platform prompts | prompt templates or platform rules |
| hashtags prompt | prompt template / hashtag generation config |
| tone of voice | `brand_profiles.tone_of_voice` |
| target audience | `brand_profiles.target_audience` |
| product | `brand_profiles.products_services` or content context |
| time zone | workspace/brand setting |
| language | brand/content default language |
| default post times | platform scheduling defaults |
| access tokens | server-only credentials |
| account IDs | `integration_accounts.external_account_id` |

## Security Note

The Settings sheet included platform tokens and previously Apps Script contained a Supabase service-role key.

Product rule:

- credentials must never live in frontend-visible configuration,
- credentials must not be committed to Git,
- credentials should be server-only, encrypted, or stored in a secret manager.

## `Log`

Current purpose:

- append workflow/action events,
- give operators some visibility into Apps Script and n8n progress,
- attempted basis for user-facing progress popups.

## Columns

Legacy headers:

| Column | Meaning |
| --- | --- |
| `timestamp` | event timestamp |
| `job_id` | action/job id generated by Apps Script or n8n |
| `task_type` | action category |
| `status` | success/error/info or other status |
| `message` | human-readable message |

## Example Log Events

Provided examples:

- `post_action / success / Post 3 responded: {"message":"Workflow was started"}`
- `post_action / info / Create Posts performed on 1 row(s).`
- `post_prep / [blank status] / Cretion of post started. Please, wait a moment.`

## Reliability Note

Owner note:

- the Log worked roughly 50% reliably,
- original intent was to connect logging with popups for users,
- the goal was to push automation progress back to the user,
- this failed in practice because of Google Sheets trigger and execution limitations.

Product implication:

- logs should be first-class product records,
- user progress should be shown from database-backed `activity_logs` and `automation_runs`,
- progress UI should poll or subscribe to backend state,
- frontend popups/toasts should not depend on Google Sheets triggers.

## Universal Product Model Lessons

The legacy Sheet is useful because it shows the real creative workflow:

- write/master input,
- generate platform variants,
- review/edit,
- schedule per platform,
- attach media,
- see progress/status,
- publish through automation.

But a universal model should not be a spreadsheet-shaped data model.

Recommended product abstractions:

- `content_item`: master idea/brief/content,
- `platform_variant`: per-platform copy and rules,
- `media_asset`: uploaded/generated/imported media,
- `content_media`: assignment and ordering,
- `publication_job`: per-platform scheduled/publish state,
- `automation_run`: AI/n8n execution record,
- `activity_log`: reliable user-visible progress,
- `brand_profile`: voice/context/preferences,
- `integration_account`: platform identity.

## Open Questions

Need later owner input:

1. Are there any hidden Sheet tabs not captured here?
2. Were there dropdown values or validations in `SoMe_content` that are not visible in the export?
3. Did users manually edit generated text mostly in Sheet cells, or through dialogs?
4. Was preview actually used in day-to-day workflow?
5. Which Log messages were most useful when they worked?
6. Should product scheduling default to one shared time or platform-specific times?
