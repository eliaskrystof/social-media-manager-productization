"use client";

import { useState, type ChangeEvent } from "react";
import {
  assignMediaToOutputAction,
  cancelOutputScheduleAction,
  dummyPublishOutputAction,
  editOutputWithAiAction,
  regenerateOutputDraftAction,
  restoreOutputRevisionAction,
  scheduleOutputAction,
  updateOutputReviewAction,
  updatePlatformVariantAction
} from "./actions";
import { FormActionFeedback } from "./form-action-feedback";

export type OutputEditorVariant = {
  id: string;
  platform: string;
  status: string;
  postType: string;
  purpose: string;
  sortOrder: number;
  title: string | null;
  headline: string | null;
  caption: string | null;
  hashtags: string[] | null;
  scheduledFor: string | null;
};

export type OutputEditorMedia = {
  id: string;
  assetId: string;
  filename: string | null;
  mediaType: string;
  publicUrl: string | null;
  altText: string | null;
};

export type OutputEditorRevision = {
  id: string;
  revisionType: string;
  reason: string | null;
  createdAt: string;
  caption: string | null;
  headline: string | null;
  title: string | null;
};

export type OutputEditorReviewLog = {
  id: string;
  comment: string | null;
  createdAt: string;
  reviewedAt: string | null;
  status: string;
};

type OutputEditorProps = {
  assignedMedia: OutputEditorMedia[];
  brandId: string;
  contentId: string;
  initiallyOpen?: boolean;
  mediaOptions: OutputEditorMedia[];
  reviewLogs: OutputEditorReviewLog[];
  revisions: OutputEditorRevision[];
  scheduleDefaultTime: string;
  variant: OutputEditorVariant;
};

export function OutputEditor({
  assignedMedia,
  brandId,
  contentId,
  initiallyOpen = false,
  mediaOptions,
  reviewLogs,
  revisions,
  scheduleDefaultTime,
  variant
}: OutputEditorProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [status, setStatus] = useField(variant.status);
  const [postType, setPostType] = useField(variant.postType);
  const [purpose, setPurpose] = useField(variant.purpose);
  const [sortOrder, setSortOrder] = useField(String(variant.sortOrder));
  const [title, setTitle] = useField(variant.title ?? "");
  const [headline, setHeadline] = useField(variant.headline ?? "");
  const [caption, setCaption] = useField(variant.caption ?? "");
  const [hashtags, setHashtags] = useField(variant.hashtags?.map((tag) => `#${tag}`).join(", ") ?? "");

  const previewVariant = {
    ...variant,
    status,
    postType,
    purpose,
    sortOrder: Number.parseInt(sortOrder, 10) || 0,
    title: title || null,
    headline: headline || null,
    caption: caption || null,
    hashtags: parsePreviewTags(hashtags)
  };
  const canSchedule = status === "approved" || status === "scheduled";
  const canPublish = status === "approved" || status === "scheduled";

  return (
    <article className={`output-row ${isOpen ? "open" : ""}`}>
      <button className="output-row-header" onClick={() => setIsOpen((value) => !value)} type="button">
        <span className="output-row-caret" aria-hidden="true">
          {isOpen ? "v" : ">"}
        </span>
        <span className="output-row-title">
          <strong>{getOutputDisplayTitle(previewVariant)}</strong>
          <small>
            {variant.platform} / {postType} / {purpose}
          </small>
        </span>
        <span className="output-row-caption">{headline || caption || "No copy yet."}</span>
        <span className={`status-pill status-${status.replaceAll("_", "-")}`}>{status}</span>
        <span className="output-row-meta">
          {assignedMedia.length} media
          {variant.scheduledFor ? ` / ${formatDateTime(variant.scheduledFor)}` : " / unscheduled"}
        </span>
      </button>

      {isOpen ? (
        <div className="output-row-body">
          <div className="output-editor-layout">
            <section className="output-editor-main">
              <OutputPreview media={assignedMedia} variant={previewVariant} />

              <form action={updatePlatformVariantAction} className="content-form variant-form">
                <input name="brandId" type="hidden" value={brandId} />
                <input name="contentId" type="hidden" value={contentId} />
                <input name="variantId" type="hidden" value={variant.id} />
                <label>
                  Status
                  <select name="status" onChange={setStatus} value={status}>
                    <option value="draft">draft</option>
                    <option value="generating">generating</option>
                    <option value="ready_for_review">ready_for_review</option>
                    <option value="changes_requested">changes_requested</option>
                    <option value="approved">approved</option>
                    <option value="scheduled">scheduled</option>
                    <option value="publishing">publishing</option>
                    <option value="published">published</option>
                    <option value="failed">failed</option>
                    <option value="cancelled">cancelled</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
                <label>
                  Type
                  <select name="postType" onChange={setPostType} value={postType}>
                    <option value="post">post</option>
                    <option value="story">story</option>
                    <option value="reel">reel</option>
                    <option value="linkedin_long">linkedin_long</option>
                  </select>
                </label>
                <label>
                  Purpose
                  <select name="purpose" onChange={setPurpose} value={purpose}>
                    <option value="main">main</option>
                    <option value="teaser">teaser</option>
                    <option value="reminder">reminder</option>
                    <option value="follow_up">follow_up</option>
                  </select>
                </label>
                <label>
                  Order
                  <input min="0" name="sortOrder" onChange={setSortOrder} type="number" value={sortOrder} />
                </label>
                <label>
                  Output title
                  <input name="title" onChange={setTitle} value={title} />
                </label>
                <label>
                  Headline
                  <input name="headline" onChange={setHeadline} value={headline} />
                </label>
                <label>
                  Caption
                  <textarea name="caption" onChange={setCaption} rows={5} value={caption} />
                </label>
                <label>
                  Hashtags
                  <input name="hashtags" onChange={setHashtags} value={hashtags} />
                </label>
                <button className="button secondary" type="submit">
                  Save output
                </button>
                <FormActionFeedback pendingMessage="Saving output..." />
              </form>
            </section>

            <aside className="output-editor-side">
              <section className="side-card">
                <p className="label">Review</p>
                <form action={updateOutputReviewAction} className="content-form ai-edit-form">
                  <input name="brandId" type="hidden" value={brandId} />
                  <input name="contentId" type="hidden" value={contentId} />
                  <input name="variantId" type="hidden" value={variant.id} />
                  <label>
                    Review note
                    <input name="comment" placeholder="Optional review note..." />
                  </label>
                  <div className="review-actions">
                    <button className="button secondary" name="nextStatus" type="submit" value="ready_for_review">
                      Submit review
                    </button>
                    <button className="button secondary" name="nextStatus" type="submit" value="changes_requested">
                      Request changes
                    </button>
                    <button className="button" name="nextStatus" type="submit" value="approved">
                      Approve
                    </button>
                  </div>
                  <FormActionFeedback pendingMessage="Updating review..." />
                </form>
              </section>

              <section className="side-card revision-list">
                <p className="label">Review log</p>
                {reviewLogs.length > 0 ? (
                  reviewLogs.map((entry) => (
                    <div className="revision-row" key={entry.id}>
                      <div>
                        <strong>{entry.status}</strong>
                        <span>{formatDateTime(entry.reviewedAt ?? entry.createdAt)}</span>
                        <small>{entry.comment ?? "No review note."}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No review notes yet.</p>
                )}
              </section>

              <section className="side-card">
                <p className="label">AI tools</p>
                <form action={regenerateOutputDraftAction} className="content-form ai-edit-form">
                  <input name="brandId" type="hidden" value={brandId} />
                  <input name="contentId" type="hidden" value={contentId} />
                  <input name="variantId" type="hidden" value={variant.id} />
                  <label>
                    Regenerate instruction
                    <input name="instruction" placeholder="New angle, different CTA, stricter tone..." />
                  </label>
                  <button className="button secondary" type="submit">
                    Regenerate
                  </button>
                  <FormActionFeedback pendingMessage="Regenerating output..." />
                </form>
                <form action={editOutputWithAiAction} className="content-form ai-edit-form">
                  <input name="brandId" type="hidden" value={brandId} />
                  <input name="contentId" type="hidden" value={contentId} />
                  <input name="variantId" type="hidden" value={variant.id} />
                  <label>
                    Edit instruction
                    <input name="instruction" placeholder="Shorter, add CTA, more professional..." />
                  </label>
                  <button className="button secondary" type="submit">
                    Apply AI edit
                  </button>
                  <FormActionFeedback pendingMessage="Applying AI edit..." />
                </form>
              </section>

              <section className="side-card">
                <p className="label">Schedule</p>
                <form action={scheduleOutputAction} className="content-form variant-form">
                  <input name="brandId" type="hidden" value={brandId} />
                  <input name="contentId" type="hidden" value={contentId} />
                  <input name="variantId" type="hidden" value={variant.id} />
                  <label>
                    Date
                    <input
                      name="scheduleDate"
                      required
                      type="date"
                      defaultValue={variant.scheduledFor ? formatDateInput(variant.scheduledFor) : ""}
                    />
                  </label>
                  <label>
                    Time
                    <input name="scheduleTime" type="time" defaultValue={variant.scheduledFor ? formatTimeInput(variant.scheduledFor) : ""} />
                  </label>
                  <button className="button" disabled={!canSchedule} type="submit">
                    Schedule output
                  </button>
                  <FormActionFeedback pendingMessage="Scheduling output..." />
                </form>
                <p className="form-note">
                  {canSchedule ? `Leave time empty to use ${scheduleDefaultTime}.` : "Approve this output before scheduling."}
                </p>
                {variant.scheduledFor ? (
                  <form action={cancelOutputScheduleAction} className="content-form variant-form">
                    <input name="brandId" type="hidden" value={brandId} />
                    <input name="contentId" type="hidden" value={contentId} />
                    <input name="variantId" type="hidden" value={variant.id} />
                    <button className="button secondary" type="submit">
                      Cancel schedule
                    </button>
                    <FormActionFeedback pendingMessage="Cancelling schedule..." />
                  </form>
                ) : null}
              </section>

              <section className="side-card secondary-action-card">
                <p className="label">Direct publish</p>
                <form action={dummyPublishOutputAction} className="content-form variant-form">
                  <input name="brandId" type="hidden" value={brandId} />
                  <input name="contentId" type="hidden" value={contentId} />
                  <input name="variantId" type="hidden" value={variant.id} />
                  <button className="button secondary" disabled={!canPublish} type="submit">
                    Dummy publish
                  </button>
                  <FormActionFeedback pendingMessage="Publishing dummy post..." />
                </form>
                {!canPublish ? <p className="form-note">Approve this output before publishing.</p> : null}
              </section>

              <section className="side-card">
                <p className="label">Media</p>
                <form action={assignMediaToOutputAction} className="content-form variant-form">
                  <input name="brandId" type="hidden" value={brandId} />
                  <input name="contentId" type="hidden" value={contentId} />
                  <input name="variantId" type="hidden" value={variant.id} />
                  <label>
                    Assigned asset
                    <select name="mediaAssetId" required defaultValue="">
                      <option disabled value="">
                        Select media
                      </option>
                      {mediaOptions.map((media) => (
                        <option key={media.id} value={media.assetId}>
                          {media.filename ?? media.mediaType}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button secondary" disabled={mediaOptions.length === 0} type="submit">
                    Use media
                  </button>
                  <FormActionFeedback pendingMessage="Assigning media..." />
                </form>
                <div className="output-media-list">
                  {assignedMedia.length > 0 ? (
                    assignedMedia.map((media) => <span key={media.id}>{media.filename ?? media.mediaType}</span>)
                  ) : (
                    <p>No media assigned.</p>
                  )}
                </div>
              </section>

              <section className="side-card revision-list">
                <p className="label">Revisions</p>
                {revisions.length > 0 ? (
                  revisions.map((revision) => (
                    <form action={restoreOutputRevisionAction} className="revision-row" key={revision.id}>
                      <input name="brandId" type="hidden" value={brandId} />
                      <input name="contentId" type="hidden" value={contentId} />
                      <input name="variantId" type="hidden" value={variant.id} />
                      <input name="revisionId" type="hidden" value={revision.id} />
                      <div>
                        <strong>{revision.revisionType}</strong>
                        <span>{formatDateTime(revision.createdAt)}</span>
                        <small>{revision.title ?? revision.headline ?? revision.caption ?? revision.reason ?? "Previous output state"}</small>
                      </div>
                      <button className="button secondary" type="submit">
                        Revert
                      </button>
                      <FormActionFeedback pendingMessage="Reverting output..." />
                    </form>
                  ))
                ) : (
                  <p>No revisions yet.</p>
                )}
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function OutputPreview({ variant, media }: { variant: OutputEditorVariant; media: OutputEditorMedia[] }) {
  const previewType = getPreviewType(variant.postType);

  return (
    <div className={`post-preview ${getPreviewClassName(variant.platform)} ${previewType}`}>
      <div className="post-preview-top">
        <span className="preview-avatar">{variant.platform.slice(0, 1).toUpperCase()}</span>
        <span>
          <strong>{getPreviewAccountName(variant.platform)}</strong>
          <small>
            {variant.postType} / {variant.purpose}
          </small>
        </span>
        <span className="preview-menu">...</span>
      </div>
      <div className="post-preview-media">
        {media.length > 0 ? (
          media.map((item) => <PreviewMediaItem item={item} key={item.id} />)
        ) : (
          <div className="post-preview-empty">No media assigned</div>
        )}
      </div>
      <div className="post-preview-copy">
        {variant.headline ? <strong>{variant.headline}</strong> : null}
        <p>{variant.caption ?? "No caption yet."}</p>
        {variant.hashtags && variant.hashtags.length > 0 ? (
          <div className="post-preview-tags">{variant.hashtags.map((tag) => `#${tag}`).join(" ")}</div>
        ) : null}
      </div>
    </div>
  );
}

function PreviewMediaItem({ item }: { item: OutputEditorMedia }) {
  if (item.mediaType === "image" && item.publicUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={item.altText ?? item.filename ?? "Assigned media"} src={item.publicUrl} />
    );
  }

  if (item.mediaType === "video" && item.publicUrl) {
    return <video controls src={item.publicUrl} />;
  }

  return (
    <a href={item.publicUrl ?? "#"}>
      <strong>{item.filename ?? "Media asset"}</strong>
      <span>{item.mediaType}</span>
    </a>
  );
}

function useField(initialValue: string) {
  const [value, setValue] = useState(initialValue);

  return [
    value,
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValue(event.currentTarget.value);
    }
  ] as const;
}

function parsePreviewTags(value: string) {
  const tags = value
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);

  return tags.length > 0 ? tags : null;
}

function getOutputDisplayTitle(variant: Pick<OutputEditorVariant, "platform" | "postType" | "purpose" | "title">) {
  if (variant.title) {
    return variant.title;
  }

  const purpose = variant.purpose && variant.purpose !== "main" ? ` ${variant.purpose.replaceAll("_", " ")}` : "";

  return `${titleCase(variant.platform)} ${variant.postType.replaceAll("_", " ")}${purpose}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getPreviewClassName(platform: string) {
  if (platform === "instagram" || platform === "facebook" || platform === "linkedin") {
    return `post-preview-${platform}`;
  }

  return "post-preview-generic";
}

function getPreviewType(postType: string) {
  if (postType === "story" || postType === "reel") {
    return "post-preview-vertical";
  }

  return "post-preview-feed";
}

function getPreviewAccountName(platform: string) {
  if (platform === "linkedin") {
    return "Demo Orchard Brand";
  }

  return "@demo_orchard";
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatDateInput(value: Date | string) {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return offsetDate.toISOString().slice(0, 10);
}

function formatTimeInput(value: Date | string) {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return offsetDate.toISOString().slice(11, 16);
}
