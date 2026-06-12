import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentDetail } from "@/lib/workspace-data";
import {
  createOutputPlanFromBriefAction,
  createPublishingOutputAction,
  scheduleApprovedOutputsAction,
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

const outputPlanOptions = [
  {
    defaultModes: ["simple", "complex"],
    meta: "facebook / post / main",
    title: "Facebook post",
    value: "facebook_post"
  },
  {
    defaultModes: ["complex"],
    meta: "facebook / reel / teaser",
    title: "Facebook short",
    value: "facebook_short"
  },
  {
    defaultModes: ["simple", "complex"],
    meta: "instagram / post / main",
    title: "Instagram post",
    value: "instagram_post"
  },
  {
    defaultModes: ["complex"],
    meta: "instagram / reel / teaser",
    title: "Instagram short",
    value: "instagram_short"
  },
  {
    defaultModes: ["simple", "complex"],
    meta: "linkedin / post / main",
    title: "LinkedIn post",
    value: "linkedin_post"
  },
  {
    defaultModes: ["complex"],
    meta: "linkedin / long / deep dive",
    title: "LinkedIn article",
    value: "linkedin_article"
  }
];

export default async function ContentDetailPage({ params, searchParams }: ContentDetailPageProps) {
  const { brandId, contentId } = await params;
  const notice = await searchParams;
  const detail = await getContentDetail(brandId, contentId);

  if (!detail.ok) {
    notFound();
  }

  const masterApprovals = detail.approvals.filter((approval) => approval.platformVariantId === null);
  const latestMasterApproval = masterApprovals[0];
  const scheduleRows = createScheduleRows(detail.variants, detail.publicationJobs, detail.integrationAccounts);
  const scheduledCount = scheduleRows.filter((row) => row.phase === "scheduled").length;
  const readyToScheduleCount = scheduleRows.filter((row) => row.phase === "ready").length;
  const blockedScheduleCount = scheduleRows.filter((row) => row.phase === "waiting").length;
  const approvedOutputCount = detail.variants.filter((variant) => variant.status === "approved" || variant.status === "scheduled").length;
  const hasPreparedOutputs = detail.variants.length > 0;
  const contentMetadata = detail.contentItem.metadata ?? {};
  const workflowMode = getMetadataString(contentMetadata, "workflowMode", detail.variants.length > 1 ? "complex" : "simple");
  const ideaGoal = getMetadataString(contentMetadata, "ideaGoal", getMetadataString(contentMetadata, "campaignGoal", "launch"));
  const scheduleDefaults = getScheduleDefaults(detail.profile?.publishingFrequency);

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
        <article className="panel detail-main brief-canvas-panel">
          <div className="section-title">
            <div>
              <p className="label">Idea brief</p>
              <h2>{detail.contentItem.status}</h2>
            </div>
            <div className="schedule-summary">
              <span>{workflowMode}</span>
              <span>{ideaGoal.replaceAll("_", " ")}</span>
            </div>
          </div>
          <form action={createOutputPlanFromBriefAction} className="content-form brief-canvas-form">
            <input name="brandId" type="hidden" value={detail.brand.id} />
            <input name="contentId" type="hidden" value={detail.contentItem.id} />
            <label>
              Idea title
              <input name="title" required defaultValue={detail.contentItem.title ?? ""} />
            </label>
            <label>
              Brief
              <textarea
                name="brief"
                rows={7}
                defaultValue={detail.contentItem.brief ?? ""}
                placeholder="What should this publishing idea say, who is it for, what angle should it take, what must it avoid..."
              />
            </label>
            <label>
              Source notes
              <textarea
                name="masterContent"
                rows={4}
                defaultValue={detail.contentItem.masterContent ?? ""}
                placeholder="Facts, claims, product details, links, references..."
              />
            </label>
            <div className="brief-settings-grid">
              <label>
                Language
                <input name="language" defaultValue={detail.contentItem.language ?? detail.brand.defaultLanguage ?? ""} />
              </label>
              <label>
                Idea goal
                <select name="ideaGoal" defaultValue={ideaGoal}>
                  <option value="launch">launch</option>
                  <option value="hype">hype</option>
                  <option value="education">education</option>
                  <option value="community">community</option>
                  <option value="conversion">conversion</option>
                </select>
              </label>
            </div>
            <fieldset className="mode-field">
              <legend>Creation shape</legend>
              <label>
                <input name="workflowMode" type="radio" value="simple" defaultChecked={workflowMode === "simple"} />
                Simple output
              </label>
              <label>
                <input name="workflowMode" type="radio" value="complex" defaultChecked={workflowMode !== "simple"} />
                Complex plan
              </label>
            </fieldset>
            <fieldset className="output-plan-field">
              <legend>Publishing targets and formats</legend>
              <div className="output-plan-grid">
                {outputPlanOptions.map((option) => (
                  <label className="output-plan-option" key={option.value}>
                    <input
                      name="plannedOutput"
                      type="checkbox"
                      value={option.value}
                      defaultChecked={detail.variants.length === 0 && option.defaultModes.includes(workflowMode)}
                    />
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.meta}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="mode-field">
              <legend>Draft mode</legend>
              <label>
                <input name="draftMode" type="radio" value="plan" defaultChecked />
                Plan only
              </label>
              <label>
                <input name="draftMode" type="radio" value="generate" />
                Generate drafts
              </label>
            </fieldset>
            <label>
              Generation instruction
              <input name="generationInstruction" placeholder="Tone, product angle, platform variation, article depth, visual emphasis..." />
            </label>
            <div className="brief-actions">
              <button className="button secondary" name="planAction" type="submit" value="save">
                Save idea brief
              </button>
              <button className="button" disabled={hasPreparedOutputs} name="planAction" type="submit" value="prepare">
                Prepare publishing plan
              </button>
              {hasPreparedOutputs ? (
                <p className="plan-lock-note">A publishing plan already exists. Keep edits manual for this idea.</p>
              ) : null}
            </div>
            <FormActionFeedback pendingMessage="Preparing brief..." />
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
                <p>Upload images, videos, or PDFs for this idea.</p>
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
                  const explicitDestination = detail.integrationAccounts.find((account) => account.id === job.integrationAccountId);
                  const fallbackDestination = detail.integrationAccounts.find(
                    (account) => account.platform === job.platform && account.status === "connected"
                  );
                  const destination = explicitDestination?.status === "connected" ? explicitDestination : fallbackDestination;

                  return (
                    <div className="log-row" key={job.id}>
                      <strong>{formatPublicationJobTitle(job, variant)}</strong>
                      <span>
                        {job.scheduledFor ? formatDateTime(job.scheduledFor) : job.status}
                        {job.scheduledFor ? ` / ${job.status}` : ""}
                      </span>
                      <span className={destination ? "" : "warning-text"}>
                        {destination
                          ? `Destination: ${formatAccountLabel(destination)}`
                          : "No connected account for this platform. Add one in Brand settings before live publishing."}
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
            <p className="label">Schedule</p>
            <h2>Ready to publish</h2>
          </div>
          <div className="schedule-summary">
            <span>{scheduledCount} scheduled</span>
            <span>{readyToScheduleCount} ready</span>
            <span>{blockedScheduleCount} waiting</span>
          </div>
        </div>
        <div className="schedule-workbench">
          <article className="panel schedule-panel">
            {scheduleRows.length > 0 ? (
              <div className="schedule-timeline">
                {scheduleRows.map((row) => (
                  <div className={`schedule-row schedule-${row.phase}`} key={row.id}>
                    <div className="schedule-marker" aria-hidden="true" />
                    <div className="schedule-row-main">
                      <strong>{row.title}</strong>
                      <span>
                        {row.platform} / {row.postType} / default {getPlatformScheduleDefault(scheduleDefaults, row.platform)}
                      </span>
                      <span className={row.hasConnectedAccount ? "" : "warning-text"}>
                        {row.hasConnectedAccount
                          ? row.destinationLabel
                          : "No connected account for this platform yet. Scheduling is allowed, live publishing will wait."}
                      </span>
                    </div>
                    <div className="schedule-row-time">
                      <strong>{row.scheduledFor ? formatDateTime(row.scheduledFor) : getSchedulePrompt(row.phase)}</strong>
                      <span>{row.jobStatus ? `job ${row.jobStatus}` : `output ${row.outputStatus}`}</span>
                    </div>
                    <span className={`status-pill status-${row.outputStatus.replaceAll("_", "-")}`}>{row.outputStatus}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>Create a publishing output to start building the schedule.</p>
            )}
          </article>

          <article className="panel batch-schedule-panel">
            <p className="label">Batch schedule</p>
            <h2>{approvedOutputCount} approved</h2>
            <form action={scheduleApprovedOutputsAction} className="content-form">
              <input name="brandId" type="hidden" value={detail.brand.id} />
              <input name="contentId" type="hidden" value={detail.contentItem.id} />
              <label>
                Date
                <input name="scheduleDate" required type="date" />
              </label>
              <fieldset className="mode-field batch-mode-field">
                <legend>Times</legend>
                <label>
                  <input name="scheduleMode" type="radio" value="platform_defaults" defaultChecked />
                  Platform defaults
                </label>
                <label>
                  <input name="scheduleMode" type="radio" value="shared_time" />
                  One shared time
                </label>
              </fieldset>
              <label>
                Shared time
                <input name="sharedTime" type="time" />
              </label>
              <div className="default-time-list">
                <span>Instagram {scheduleDefaults.instagram}</span>
                <span>Facebook {scheduleDefaults.facebook}</span>
                <span>LinkedIn {scheduleDefaults.linkedin}</span>
              </div>
              <button className="button" disabled={approvedOutputCount === 0} type="submit">
                Schedule approved outputs
              </button>
              <FormActionFeedback pendingMessage="Scheduling approved outputs..." />
            </form>
            <p className="form-note">Leave shared time empty to use the fallback default.</p>
          </article>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-title">
          <div>
            <p className="label">Publishing outputs</p>
            <h2>Publishing plan</h2>
          </div>
        </div>
        <article className="panel create-output-panel">
          <div>
            <p className="label">Single output</p>
            <h2>Add one output</h2>
            <p>Use this for one-off additions after the idea brief is already shaped.</p>
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
              Add output
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
                scheduleDefaultTime={getPlatformScheduleDefault(scheduleDefaults, variant.platform)}
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

function getMetadataString(metadata: Record<string, unknown>, key: string, fallback: string) {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

function getScheduleDefaults(publishingFrequency: Record<string, unknown> | null | undefined) {
  const storedDefaults = getRecord(getRecord(publishingFrequency).scheduleDefaults);

  return {
    facebook: getTimeValue(storedDefaults, "facebook") || "12:00",
    fallback: getTimeValue(storedDefaults, "fallback") || "10:00",
    instagram: getTimeValue(storedDefaults, "instagram") || "18:30",
    linkedin: getTimeValue(storedDefaults, "linkedin") || "09:00"
  };
}

function getPlatformScheduleDefault(scheduleDefaults: Record<string, string>, platform: string) {
  return scheduleDefaults[platform] ?? scheduleDefaults.fallback;
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getTimeValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : "";
}

function formatPublicationJobTitle(
  job: { platform: string },
  variant?: { headline: string | null; postType: string; title: string | null }
) {
  return variant?.title || variant?.headline || `${job.platform} / ${variant?.postType ?? "post"}`;
}

function createScheduleRows(
  variants: Array<{
    id: string;
    caption: string | null;
    headline: string | null;
    integrationAccountId: string | null;
    platform: string;
    postType: string;
    scheduledFor: Date | null;
    sortOrder: number;
    status: string;
    title: string | null;
  }>,
  publicationJobs: Array<{
    id: string;
    platform: string;
    platformVariantId: string;
    scheduledFor: Date | null;
    status: string;
    createdAt: Date;
    integrationAccountId: string | null;
  }>,
  integrationAccounts: Array<{
    externalAccountId: string | null;
    externalAccountName: string | null;
    id: string;
    platform: string;
    status: string;
  }>
) {
  const activeJobStatuses = new Set(["draft", "scheduled", "queued", "publishing"]);
  const jobsByVariant = new Map<string, (typeof publicationJobs)[number]>();
  const accountsById = new Map(integrationAccounts.map((account) => [account.id, account]));
  const connectedAccountByPlatform = new Map<string, (typeof integrationAccounts)[number]>();

  for (const account of integrationAccounts) {
    if (account.status === "connected" && !connectedAccountByPlatform.has(account.platform)) {
      connectedAccountByPlatform.set(account.platform, account);
    }
  }

  for (const job of publicationJobs) {
    const current = jobsByVariant.get(job.platformVariantId);

    if (!current || shouldUseScheduleJob(job, current, activeJobStatuses)) {
      jobsByVariant.set(job.platformVariantId, job);
    }
  }

  return variants
    .map((variant) => {
      const job = jobsByVariant.get(variant.id);
      const scheduledFor = job?.scheduledFor ?? variant.scheduledFor;
      const jobStatus = job?.status ?? null;
      const hasActiveJob = job ? activeJobStatuses.has(job.status) : false;
      const integrationAccountId = job?.integrationAccountId ?? variant.integrationAccountId;
      const explicitDestination = integrationAccountId ? accountsById.get(integrationAccountId) : undefined;
      const fallbackDestination = connectedAccountByPlatform.get(variant.platform);
      const destination = explicitDestination?.status === "connected" ? explicitDestination : fallbackDestination;
      const hasConnectedAccount = Boolean(destination);
      const phase = getSchedulePhase({
        hasActiveJob,
        jobStatus,
        outputStatus: variant.status,
        scheduledFor
      });

      return {
        id: `${variant.id}-${job?.id ?? "output"}`,
        destinationLabel: `Destination: ${formatAccountLabel(destination)}`,
        hasConnectedAccount,
        integrationAccountId,
        jobStatus,
        outputStatus: variant.status,
        phase,
        platform: variant.platform,
        postType: variant.postType,
        scheduledFor,
        sortOrder: variant.sortOrder,
        title: variant.title || variant.headline || variant.caption || `${variant.platform} / ${variant.postType}`
      };
    })
    .sort((left, right) => {
      const phaseOrder = getSchedulePhaseOrder(left.phase) - getSchedulePhaseOrder(right.phase);

      if (phaseOrder !== 0) {
        return phaseOrder;
      }

      return getScheduleTime(left) - getScheduleTime(right) || left.sortOrder - right.sortOrder;
    });
}

function formatAccountLabel(account: { externalAccountId: string | null; externalAccountName: string | null; platform: string } | undefined) {
  return account?.externalAccountName ?? account?.externalAccountId ?? account?.platform ?? "connected account";
}

function shouldUseScheduleJob(
  candidate: { createdAt: Date; scheduledFor: Date | null; status: string },
  current: { createdAt: Date; scheduledFor: Date | null; status: string },
  activeJobStatuses: Set<string>
) {
  const candidateIsActive = activeJobStatuses.has(candidate.status);
  const currentIsActive = activeJobStatuses.has(current.status);

  if (candidateIsActive !== currentIsActive) {
    return candidateIsActive;
  }

  return getScheduleTime(candidate) > getScheduleTime(current);
}

function getSchedulePhase({
  hasActiveJob,
  jobStatus,
  outputStatus,
  scheduledFor
}: {
  hasActiveJob: boolean;
  jobStatus: string | null;
  outputStatus: string;
  scheduledFor: Date | null;
}) {
  if (jobStatus === "published" || outputStatus === "published") {
    return "done";
  }

  if (jobStatus === "cancelled" || outputStatus === "cancelled") {
    return "cancelled";
  }

  if (scheduledFor && (hasActiveJob || outputStatus === "scheduled")) {
    return "scheduled";
  }

  if (outputStatus === "approved") {
    return "ready";
  }

  return "waiting";
}

function getSchedulePrompt(phase: string) {
  if (phase === "ready") {
    return "Ready to schedule";
  }

  if (phase === "done") {
    return "Published";
  }

  if (phase === "cancelled") {
    return "Cancelled";
  }

  return "Needs approval";
}

function getSchedulePhaseOrder(phase: string) {
  const order: Record<string, number> = {
    scheduled: 0,
    ready: 1,
    waiting: 2,
    done: 3,
    cancelled: 4
  };

  return order[phase] ?? 5;
}

function getScheduleTime(item: { createdAt?: Date; scheduledFor: Date | null }) {
  return (item.scheduledFor ?? item.createdAt ?? new Date(0)).getTime();
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
