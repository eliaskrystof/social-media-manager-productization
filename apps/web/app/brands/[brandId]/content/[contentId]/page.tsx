import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentDetail } from "@/lib/workspace-data";
import {
  createPublishingOutputAction,
  updateContentItemAction,
  updateContentWorkflowAction,
  uploadContentMediaAction
} from "./actions";
import {
  OutputEditor,
  type OutputEditorMedia,
  type OutputEditorReviewLog,
  type OutputEditorRevision,
  type OutputEditorVariant
} from "./output-editor";
import { ActionNotice, FormActionFeedback } from "./form-action-feedback";

export const dynamic = "force-dynamic";

type ContentDetailPageProps = {
  params: Promise<{
    brandId: string;
    contentId: string;
  }>;
  searchParams: Promise<{
    actionMessage?: string;
    actionNotice?: string;
    actionTitle?: string;
  }>;
};

export default async function ContentDetailPage({ params, searchParams }: ContentDetailPageProps) {
  const { brandId, contentId } = await params;
  const notice = await searchParams;
  const detail = await getContentDetail(brandId, contentId);

  if (!detail.ok) {
    notFound();
  }

  const masterApprovals = detail.approvals.filter((approval) => approval.platformVariantId === null);
  const latestMasterApproval = masterApprovals[0];

  return (
    <main className="shell">
      {notice.actionNotice === "error" && notice.actionMessage ? (
        <ActionNotice kind="error" message={notice.actionMessage} title={notice.actionTitle ?? "Action failed"} />
      ) : null}
      <section className="page-heading">
        <p className="eyebrow">Content item</p>
        <h1>{detail.contentItem.title ?? "Untitled content"}</h1>
        <p className="lede">{detail.contentItem.brief ?? "No brief yet."}</p>
        <div className="actions">
          <Link className="button secondary" href={`/brands/${detail.brand.id}/content`}>
            Content list
          </Link>
          <Link className="button secondary" href={`/brands/${detail.brand.id}`}>
            Brand workspace
          </Link>
        </div>
      </section>

      <section className="detail-layout">
        <article className="panel detail-main">
          <p className="label">Master content</p>
          <h2>{detail.contentItem.status}</h2>
          <form action={updateContentItemAction} className="content-form">
            <input name="brandId" type="hidden" value={detail.brand.id} />
            <input name="contentId" type="hidden" value={detail.contentItem.id} />
            <label>
              Title
              <input name="title" required defaultValue={detail.contentItem.title ?? ""} />
            </label>
            <label>
              Brief
              <textarea name="brief" rows={3} defaultValue={detail.contentItem.brief ?? ""} />
            </label>
            <label>
              Master content
              <textarea name="masterContent" rows={8} defaultValue={detail.contentItem.masterContent ?? ""} />
            </label>
            <label>
              Language
              <input name="language" defaultValue={detail.contentItem.language ?? detail.brand.defaultLanguage ?? ""} />
            </label>
            <button className="button" type="submit">
              Save master
            </button>
            <FormActionFeedback pendingMessage="Saving master..." />
          </form>
        </article>

        <aside className="detail-side">
          <article className="panel">
            <p className="label">Media</p>
            <h2>{detail.media.length}</h2>
            <form action={uploadContentMediaAction} className="content-form media-upload-form">
              <input name="brandId" type="hidden" value={detail.brand.id} />
              <input name="contentId" type="hidden" value={detail.contentItem.id} />
              <label>
                File
                <input accept="image/*,video/*,application/pdf" name="media" required type="file" />
              </label>
              <label>
                Alt text
                <input name="altText" placeholder="Short media description" />
              </label>
              <button className="button secondary" type="submit">
                Upload media
              </button>
              <FormActionFeedback pendingMessage="Uploading media..." />
            </form>
            <div className="media-preview-list">
              {detail.media.length > 0 ? (
                detail.media.map((media) => (
                  <div className="media-preview" key={media.id}>
                    {media.asset.mediaType === "image" && media.asset.publicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={media.asset.altText ?? media.asset.filename ?? "Uploaded media"} src={media.asset.publicUrl} />
                    ) : null}
                    {media.asset.mediaType === "video" && media.asset.publicUrl ? (
                      <video controls src={media.asset.publicUrl} />
                    ) : null}
                    <div>
                      <strong>{media.asset.filename ?? "Media asset"}</strong>
                      <span>{media.asset.mediaType}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p>Upload images, videos, or PDFs for this master idea.</p>
              )}
            </div>
          </article>

          <article className="panel">
            <p className="label">Workflow</p>
            <h2>{detail.contentItem.status}</h2>
            <form action={updateContentWorkflowAction} className="content-form workflow-form">
              <input name="brandId" type="hidden" value={detail.brand.id} />
              <input name="contentId" type="hidden" value={detail.contentItem.id} />
              <label>
                Note
                <textarea name="comment" rows={3} placeholder="Review note or reason" />
              </label>
              <div className="workflow-actions">
                <button className="button secondary" name="nextStatus" type="submit" value="in_progress">
                  Start work
                </button>
                <button className="button secondary" name="nextStatus" type="submit" value="ready_for_review">
                  Submit review
                </button>
                <button className="button secondary" name="nextStatus" type="submit" value="changes_requested">
                  Request changes
                </button>
                <button className="button secondary" name="nextStatus" type="submit" value="approved">
                  Approve
                </button>
                <button className="button secondary" name="nextStatus" type="submit" value="on_hold">
                  Hold
                </button>
                <button className="button secondary" name="nextStatus" type="submit" value="completed">
                  Complete
                </button>
              </div>
              <FormActionFeedback pendingMessage="Updating workflow..." />
            </form>
          </article>

          <article className="panel">
            <p className="label">Master review</p>
            <h2>{latestMasterApproval?.status ?? "not requested"}</h2>
            <p>{latestMasterApproval?.comment ?? "Master-level approval is separate from output review."}</p>
          </article>

          <article className="panel">
            <p className="label">Publication jobs</p>
            <h2>{detail.publicationJobs.length}</h2>
            <div className="compact-list">
              {detail.publicationJobs.length > 0 ? (
                detail.publicationJobs.map((job) => {
                  const variant = detail.variants.find((item) => item.id === job.platformVariantId);

                  return (
                    <div className="log-row" key={job.id}>
                      <strong>{formatPublicationJobTitle(job, variant)}</strong>
                      <span>
                        {job.scheduledFor ? formatDateTime(job.scheduledFor) : job.status}
                        {job.scheduledFor ? ` / ${job.status}` : ""}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p>Scheduling and publishing jobs will appear here.</p>
              )}
            </div>
          </article>

          <article className="panel">
            <p className="label">Published posts</p>
            <h2>{detail.publishedPosts.length}</h2>
            <p>Live post links and sync metrics will appear here after publishing is connected.</p>
          </article>
        </aside>
      </section>

      <section className="detail-section">
        <div className="section-title">
          <div>
            <p className="label">Publishing outputs</p>
            <h2>Output plan</h2>
          </div>
        </div>
        <article className="panel create-output-panel">
          <div>
            <p className="label">New output</p>
            <h2>Create output</h2>
            <p>Start from a manual draft or generate a first version from the master.</p>
          </div>
          <form action={createPublishingOutputAction} className="content-form create-output-form">
            <input name="brandId" type="hidden" value={detail.brand.id} />
            <input name="contentId" type="hidden" value={detail.contentItem.id} />
            <fieldset className="mode-field">
              <legend>Mode</legend>
              <label>
                <input name="creationMode" type="radio" value="manual" defaultChecked />
                Manual
              </label>
              <label>
                <input name="creationMode" type="radio" value="generate" />
                Generate
              </label>
            </fieldset>
            <label>
              Output title
              <input name="title" placeholder="Internal name, e.g. Launch teaser" />
            </label>
            <label>
              Platform
              <select name="platform" defaultValue="instagram">
                <option value="instagram">instagram</option>
                <option value="facebook">facebook</option>
                <option value="linkedin">linkedin</option>
              </select>
            </label>
            <label>
              Type
              <select name="postType" defaultValue="post">
                <option value="post">post</option>
                <option value="story">story</option>
                <option value="reel">reel</option>
                <option value="linkedin_long">linkedin_long</option>
              </select>
            </label>
            <label>
              Purpose
              <input name="purpose" defaultValue="main" />
            </label>
            <label className="wide-field">
              Generate instruction
              <input name="generationInstruction" placeholder="This will be a story for a new product..." />
            </label>
            <label className="wide-field">
              Headline
              <input name="headline" placeholder="Optional visible headline" />
            </label>
            <label className="wide-field">
              Caption
              <textarea name="caption" placeholder="Manual draft or optional generation hint..." rows={4} />
            </label>
            <label className="wide-field">
              Hashtags
              <input name="hashtags" placeholder="#launch, #update" />
            </label>
            <button className="button secondary" type="submit">
              Create output
            </button>
            <FormActionFeedback pendingMessage="Creating output..." />
          </form>
        </article>
        <div className="output-list">
          {detail.variants.length > 0 ? (
          detail.variants.map((variant, index) => {
            const assignedMedia = detail.outputMedia.filter((media) => media.platformVariantId === variant.id);
            const revisions = detail.outputRevisions
              .filter((revision) => revision.platformVariantId === variant.id)
              .slice(0, 4)
              .map(toOutputEditorRevision);
            const reviewLogs = detail.approvals
              .filter((approval) => approval.platformVariantId === variant.id)
              .slice(0, 5)
              .map(toOutputEditorReviewLog);
            const editorVariant: OutputEditorVariant = {
              id: variant.id,
              platform: variant.platform,
              status: variant.status,
              postType: variant.postType,
              purpose: variant.purpose,
              sortOrder: variant.sortOrder,
              title: variant.title,
              headline: variant.headline,
              caption: variant.caption,
              hashtags: variant.hashtags,
              scheduledFor: variant.scheduledFor ? variant.scheduledFor.toISOString() : null
            };
            const mediaOptions = detail.media.map(toOutputEditorMedia);
            const assignedEditorMedia = assignedMedia.map(toOutputEditorMedia);

            return (
              <OutputEditor
                assignedMedia={assignedEditorMedia}
                brandId={detail.brand.id}
                contentId={detail.contentItem.id}
                initiallyOpen={index === 0 && detail.variants.length === 1}
                key={variant.id}
                mediaOptions={mediaOptions}
                reviewLogs={reviewLogs}
                revisions={revisions}
                variant={editorVariant}
              />
            );
          })
          ) : (
            <article className="panel empty-state">
              <p className="label">No outputs yet</p>
              <h2>Create the first publishing output.</h2>
              <p>Use the form above to add only the platform and format you need for this master.</p>
            </article>
          )}
        </div>
      </section>

      <section className="grid">
        <article className="panel wide">
          <p className="label">Activity log</p>
          <div className="compact-list">
            {detail.activityLogs.length > 0 ? (
              detail.activityLogs.map((log) => (
                <div className="log-row" key={log.id}>
                  <strong>{log.action}</strong>
                  <span>{log.message ?? formatDateTime(log.createdAt)}</span>
                </div>
              ))
            ) : (
              <p>No activity recorded.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <p className="label">Automation runs</p>
          <h2>{detail.automationRuns[0]?.status ?? "idle"}</h2>
          <p>{detail.automationRuns[0]?.runType ?? "No automation run recorded."}</p>
        </article>

        <article className="panel wide">
          <p className="label">Published artifacts</p>
          <div className="compact-list">
            {detail.publishedPosts.length > 0 ? (
              detail.publishedPosts.map((post) => {
                const variant = detail.variants.find((item) => item.id === post.platformVariantId);

                return (
                  <div className="log-row" key={post.id}>
                    <strong>{formatPublishedPostTitle(post, variant)}</strong>
                    {post.externalUrl ? <a href={post.externalUrl}>{post.status}</a> : <span>{post.status}</span>}
                  </div>
                );
              })
            ) : (
              <p>No published post recorded yet.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function toOutputEditorMedia(media: {
  id: string;
  asset: {
    id: string;
    filename: string | null;
    mediaType: string;
    publicUrl: string | null;
    altText: string | null;
  };
}): OutputEditorMedia {
  return {
    id: media.id,
    assetId: media.asset.id,
    filename: media.asset.filename,
    mediaType: media.asset.mediaType,
    publicUrl: media.asset.publicUrl,
    altText: media.asset.altText
  };
}

function toOutputEditorRevision(revision: {
  id: string;
  revisionType: string;
  reason: string | null;
  createdAt: Date;
  snapshot: {
    caption: string | null;
    headline: string | null;
    title: string | null;
  };
}): OutputEditorRevision {
  return {
    id: revision.id,
    revisionType: revision.revisionType,
    reason: revision.reason,
    createdAt: revision.createdAt.toISOString(),
    caption: revision.snapshot.caption,
    headline: revision.snapshot.headline,
    title: revision.snapshot.title
  };
}

function toOutputEditorReviewLog(approval: {
  id: string;
  comment: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  status: string;
}): OutputEditorReviewLog {
  return {
    id: approval.id,
    comment: approval.comment,
    createdAt: approval.createdAt.toISOString(),
    reviewedAt: approval.reviewedAt ? approval.reviewedAt.toISOString() : null,
    status: approval.status
  };
}

function formatPublishedPostTitle(
  post: { metadata: Record<string, unknown> | null; platform: string; postType: string },
  variant?: { headline: string | null; title: string | null }
) {
  const metadataTitle = post.metadata && typeof post.metadata.title === "string" ? post.metadata.title : null;
  const metadataHeadline = post.metadata && typeof post.metadata.headline === "string" ? post.metadata.headline : null;

  return metadataTitle || variant?.title || metadataHeadline || variant?.headline || `${post.platform} / ${post.postType}`;
}

function formatPublicationJobTitle(
  job: { platform: string },
  variant?: { headline: string | null; postType: string; title: string | null }
) {
  return variant?.title || variant?.headline || `${job.platform} / ${variant?.postType ?? "post"}`;
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
