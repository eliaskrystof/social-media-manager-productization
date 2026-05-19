import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentDetail } from "@/lib/workspace-data";

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
        </div>
      </section>

      <section className="detail-layout">
        <article className="panel detail-main">
          <p className="label">Master content</p>
          <h2>{detail.contentItem.status}</h2>
          <p>{detail.contentItem.masterContent ?? "No master content yet."}</p>
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
