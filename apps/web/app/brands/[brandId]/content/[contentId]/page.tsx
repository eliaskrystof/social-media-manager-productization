import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentDetail } from "@/lib/workspace-data";
import { updateContentItemAction, updatePlatformVariantAction } from "./actions";

export const dynamic = "force-dynamic";

type ContentDetailPageProps = {
  params: Promise<{
    brandId: string;
    contentId: string;
  }>;
};

export default async function ContentDetailPage({ params }: ContentDetailPageProps) {
  const { brandId, contentId } = await params;
  const detail = await getContentDetail(brandId, contentId);

  if (!detail.ok) {
    notFound();
  }

  return (
    <main className="shell">
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
          <button className="button secondary" disabled type="button">
            Generate variants
          </button>
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
          </form>
        </article>

        <aside className="detail-side">
          <article className="panel">
            <p className="label">Media</p>
            <h2>{detail.media.length}</h2>
            <p>Media attachments will appear here.</p>
          </article>

          <article className="panel">
            <p className="label">Approval</p>
            <h2>{detail.approvals[0]?.status ?? "not requested"}</h2>
            <p>{detail.approvals[0]?.comment ?? "Approval workflow is not active yet."}</p>
          </article>

          <article className="panel">
            <p className="label">Publication jobs</p>
            <h2>{detail.publicationJobs.length}</h2>
            <p>Scheduling and publishing jobs will appear here.</p>
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
            <p className="label">Platform variants</p>
            <h2>Prepared copy</h2>
          </div>
        </div>
        <div className="variant-detail-grid">
          {detail.variants.map((variant) => (
            <article className="panel variant-detail" key={variant.id}>
              <div className="section-title">
                <div>
                  <p className="label">{variant.status}</p>
                  <h2>{variant.platform}</h2>
                </div>
                <span>{variant.scheduledFor ? formatDateTime(variant.scheduledFor) : "unscheduled"}</span>
              </div>
              <p>{variant.caption ?? "No caption yet."}</p>
              <form action={updatePlatformVariantAction} className="content-form variant-form">
                <input name="brandId" type="hidden" value={detail.brand.id} />
                <input name="contentId" type="hidden" value={detail.contentItem.id} />
                <input name="variantId" type="hidden" value={variant.id} />
                <label>
                  Status
                  <select name="status" defaultValue={variant.status}>
                    <option value="draft">draft</option>
                    <option value="ready_for_review">ready_for_review</option>
                    <option value="approved">approved</option>
                  </select>
                </label>
                <label>
                  Headline
                  <input name="headline" defaultValue={variant.headline ?? ""} />
                </label>
                <label>
                  Caption
                  <textarea name="caption" rows={5} defaultValue={variant.caption ?? ""} />
                </label>
                <label>
                  Hashtags
                  <input name="hashtags" defaultValue={variant.hashtags?.map((tag) => `#${tag}`).join(", ") ?? ""} />
                </label>
                <button className="button secondary" type="submit">
                  Save variant
                </button>
              </form>
              {variant.hashtags && variant.hashtags.length > 0 ? (
                <div className="chips">
                  {variant.hashtags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
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
              detail.publishedPosts.map((post) => (
                <div className="log-row" key={post.id}>
                  <strong>
                    {post.platform} / {post.postType}
                  </strong>
                  {post.externalUrl ? <a href={post.externalUrl}>{post.status}</a> : <span>{post.status}</span>}
                </div>
              ))
            ) : (
              <p>No published post recorded yet.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
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
