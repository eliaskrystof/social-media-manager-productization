# Legacy LinkedIn Comparison

Date: 2026-05-15

## Purpose

This document compares the main Social Media Manager LinkedIn flow with the solo LinkedIn branch.

The solo LinkedIn branch is not a separate future product module. It is an off-branch of the main automation that contains useful learnings for the future unified LinkedIn publisher.

## Owner Context

The solo LinkedIn branch is considered more reliable mainly because it was tested more heavily, especially across different types of posted content.

Observed owner notes:

- actual posting worked better in the solo LinkedIn branch,
- it may use a different HTTP endpoint or at least better-defined request parameters,
- it handled some details the original implementation did not handle well,
- media ordering was one important difference,
- the original implementation took all media from one folder and inserted it into a post without enough ordering control,
- networking / people tagging / referencing was planned but not completed,
- theoretically LinkedIn people in connection could be referenced,
- practically the unresolved issue was where to source reliable LinkedIn member IDs (`li_id`) for people.

## Files Compared

Main social LinkedIn flow:

- `Social_media_manager_workflows/SoMe_Automation_Post_LinkedIn_ext.json`
- `Social_media_manager_workflows/SoMe_Automation_Schedule_Post_ext.json`

Solo LinkedIn flow:

- `Linkedin_solo_workflows/LI_Post_Request_LinkedIn.json`
- `Linkedin_solo_workflows/LI_Search_media_folder.json`
- `Linkedin_solo_workflows/LinkedIn_Scheduling_Poll.json`
- `Linkedin_solo_workflows/LI-Generate.json`
- `Linkedin_solo_workflows/LI-Regenerate.json`
- `Linkedin_solo_workflows/LI-Edit.json`
- `Linkedin_solo_workflows/LI-Confirm.json`

## High-Level Difference

The main social flow treats LinkedIn as one of three platforms inside a shared cross-platform automation.

The solo LinkedIn branch treats LinkedIn as the only platform and therefore has:

- simpler state flow,
- simpler payload assumptions,
- more focused testing,
- more LinkedIn-specific post handling,
- clearer generation/edit/confirm/publish lifecycle.

## State Flow Comparison

### Main Social Flow

Main social LinkedIn state is embedded in:

- aggregate `some_post_plan_selfhost_external.status`,
- `publish_li`,
- Sheet status text.

Typical flow:

1. Create/update variants writes Sheet `created (...)` or `updated (...)`.
2. Schedule creates one row in `some_post_plan_selfhost_external`.
3. If LinkedIn selected, `publish_li = yes`.
4. Poll workflow runs LinkedIn publisher.
5. LinkedIn publisher sets `publish_li = done`.
6. Aggregate post becomes `posted` only when all publish flags are `done` or `no`.

### Solo LinkedIn Flow

Solo LinkedIn uses clearer single-platform states:

- `GENERATED`
- `REGENERATED`
- `EDITED`
- `CONFIRMED`
- `DONE`

Typical flow:

1. Generate creates row/status `GENERATED`.
2. Regenerate updates row/status `REGENERATED`.
3. Edit updates row/status `EDITED`.
4. Confirm sets `CONFIRMED`.
5. Scheduling/publishing selects confirmed posts.
6. Success sets `DONE` and stores result URL.

Product lesson:

- future product should use per-platform publication jobs, closer to the solo branch mental model.
- cross-platform aggregation should be derived, not encoded through shared `publish_*` flags.

## LinkedIn Publishing Request Comparison

Both branches use LinkedIn API patterns around:

- `GET https://api.linkedin.com/v2/userinfo`
- `POST https://api.linkedin.com/v2/assets?action=registerUpload`
- upload to LinkedIn-provided upload URL,
- `POST https://api.linkedin.com/v2/ugcPosts`

Main branch:

- builds request from `caption_linkedin`,
- uses `linkedin_user_id`,
- aggregates registered assets,
- publishes image/video content through UGC posts.

Solo branch:

- builds request from `linkedIn_text`,
- uses profile-specific credentials from `LinkedIn_manager_profiles`,
- normalizes aggregated asset URNs more defensively,
- includes `distribution: { linkedInDistributionTarget: {} }` in at least one image publish request,
- was tested more against real content variations.

Important note:

- A future implementation should verify the current LinkedIn API recommendations before finalizing endpoints because LinkedIn APIs evolve. The legacy workflows are useful behavior references, not guaranteed current best practice.

## Media Handling Comparison

### Main Social Flow

Media source:

- LinkedIn media comes from the shared Google Drive workspace structure.
- `SoMe_Automation_Schedule_Post_ext` searches the LinkedIn subfolder and aggregates downloaded media filenames into `linkedin_attachments`.
- `SoMe_Automation_Post_LinkedIn_ext` splits `linkedin_attachments`.

Observed issue:

- media was effectively taken from a platform folder and inserted into the post without a strong product-level ordering model.

Risk:

- file ordering can depend on Drive/API/node behavior,
- operator intent is hard to preserve,
- carousel/multi-image order is not explicit in product data.

### Solo LinkedIn Flow

Media source:

- `LI_Search_media_folder` searches media for the LinkedIn profile/post.
- It includes a `Sort` node before updating/aggregating media.
- `LI_Post_Request_LinkedIn` splits `attachments` and publishes from that list.

Owner note:

- media order handling was one of the areas where solo branch improved behavior.

Product lesson:

- future `content_media` must have `sort_order`.
- media assignment must be explicit in the UI/model.
- publisher should respect `sort_order`, not storage folder order.

## Content Type Handling

Both branches contain logic for:

- image posts,
- video posts,
- no-media/text-like posts or image category fallback.

Main branch:

- detects video by checking whether any LinkedIn attachment ends with `.mp4`,
- routes to video branch if a video is present,
- otherwise uses image branch.

Solo branch:

- also supports image and video upload/publish branches,
- appears to have been tested more thoroughly with different post content.

Product recommendation:

- model LinkedIn post media mode explicitly:
  - `text_only`,
  - `single_image`,
  - `multi_image`,
  - `video`.
- do not infer mode only from filenames at publish time.

## Profile / Credential Handling

Main branch:

- reads credentials from `SoMe_user_db`.
- LinkedIn fields include `linkedin_user_token`, `linkedin_refresh_token`, `linkedin_user_id`.

Solo branch:

- reads profile data from `LinkedIn_manager_profiles`.
- reads post data from `LinkedIn_manager_posts`.
- this separation may have made testing and account/profile handling clearer.

Product recommendation:

- use `integration_accounts` and server-only credentials.
- keep LinkedIn profile/account data separate from content/job state.

## Networking / Mentions / People References

Owner note:

- networking and referencing people was planned,
- it was not completed,
- theoretically it might be possible to reference people in connection,
- practically the missing piece was where to get reliable LinkedIn IDs (`li_id`) for users.

Product implication:

- do not include LinkedIn mentions/tagging in MVP.
- reserve future model space for mentions, but treat it as a separate research task.

Possible future entities:

- `external_contacts`
- `platform_people`
- `content_mentions`

Possible fields:

- platform,
- external_person_id,
- display_name,
- profile_url,
- relationship/source,
- confidence,
- last_verified_at.

Open research questions:

- Which LinkedIn API permissions are required to search/resolve people?
- Can the app retrieve IDs only for authenticated user's connections?
- Are mentions supported through the selected publishing endpoint?
- What is the correct text annotation format for mentions?
- Can this be done reliably without violating LinkedIn platform policies?

## Reuse Candidates From Solo Branch

Strong reuse candidates:

- tested LinkedIn publish request body structure,
- defensive asset URN normalization,
- media ordering/sort approach,
- profile/post table separation concept,
- explicit generate/edit/confirm/done lifecycle,
- result URL writeback pattern.

Do not reuse directly without review:

- credentials model,
- Google Sheets update logic,
- direct workflow payload shape,
- any hardcoded URLs/IDs,
- old API endpoint assumptions without current verification.

## Product Design Implications

For the new product:

- LinkedIn publisher should be a platform adapter behind a publication job interface.
- It should consume normalized product data:
  - `platform_variants.caption`,
  - `content_media` ordered by `sort_order`,
  - `integration_accounts`,
  - server-side credential reference.
- It should output normalized result data:
  - external post id,
  - external post URL,
  - raw response,
  - status,
  - error details.

Recommended minimum LinkedIn job input:

```json
{
  "publication_job_id": "uuid",
  "platform": "linkedin",
  "author_urn": "urn:li:person:...",
  "caption": "...",
  "media": [
    {
      "media_asset_id": "uuid",
      "url_or_path": "...",
      "mime_type": "image/png",
      "sort_order": 0
    }
  ],
  "post_mode": "text_only|single_image|multi_image|video"
}
```

## Recommended Future LinkedIn Implementation Plan

When implementation starts:

1. Start with no mentions/networking.
2. Support text-only and single-image first.
3. Add multi-image with explicit `sort_order`.
4. Add video after single/multi-image is stable.
5. Record external post id and URL.
6. Keep raw API responses.
7. Add retry/idempotency.
8. Research people mentions separately.

## Open Questions

Need later confirmation/research:

1. Which exact content types were tested successfully in the solo branch?
2. Did solo branch reliably support multi-image posts, video posts, or both?
3. Was media ordering based on filename sorting, Sheet order, or manual post data order?
4. Which LinkedIn endpoint should be used in the new implementation after checking current API docs?
5. Should LinkedIn mentions be a future premium feature or ignored?
