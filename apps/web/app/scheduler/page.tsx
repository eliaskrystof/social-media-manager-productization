import Link from "next/link";
import { getSchedulerControlPlane, type SchedulerFilters } from "@/lib/scheduler-data";
import {
  cancelPublicationJobAction,
  processDuePublicationJobsAction,
  processPublicationJobAction,
  retryPublicationJobAction
} from "./actions";

export const dynamic = "force-dynamic";

type SchedulerPageProps = {
  searchParams: Promise<
    SchedulerFilters & {
      notice?: string;
      noticeMessage?: string;
      noticeTitle?: string;
    }
  >;
};

const platforms = ["instagram", "facebook", "linkedin"];
const jobStatuses = ["scheduled", "due", "queued", "publishing", "published", "failed", "cancelled", "skipped"];

export default async function SchedulerPage({ searchParams }: SchedulerPageProps) {
  const params = await searchParams;
  const filters = normalizeFilters(params);
  const data = await getSchedulerControlPlane(filters);

  if (!data.ok) {
    return (
      <main className="shell">
        <section className="panel wide">
          <p className="label">Scheduler</p>
          <h1>Scheduler control plane</h1>
          <p>{data.message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      {params.notice && params.noticeMessage ? (
        <div className={`action-toast scheduler-notice ${params.notice === "error" ? "action-toast-error" : ""}`}>
          <span className={params.notice === "error" ? "status-dot" : "status-dot ok"} />
          <div>
            <strong>{params.noticeTitle ?? "Scheduler updated"}</strong>
            <p>{params.noticeMessage}</p>
          </div>
        </div>
      ) : null}

      <section className="page-heading scheduler-heading">
        <div>
          <p className="eyebrow">Milestone 3</p>
          <h1>Scheduler control plane</h1>
          <p className="lede">
            Inspect scheduled publication jobs, process due local stub publishes, and review published outputs by source idea.
          </p>
        </div>
        <form action={processDuePublicationJobsAction}>
          <button className="button" disabled={data.summary.due === 0} type="submit">
            Process due jobs
          </button>
        </form>
      </section>

      <section className="grid scheduler-summary">
        <article className="panel">
          <p className="label">Due now</p>
          <h2>{data.summary.due}</h2>
          <p>Ready for the local stub worker.</p>
        </article>
        <article className="panel">
          <p className="label">Scheduled</p>
          <h2>{data.summary.scheduled}</h2>
          <p>Waiting for their planned time.</p>
        </article>
        <article className="panel">
          <p className="label">Failed</p>
          <h2>{data.summary.failed}</h2>
          <p>Visible with retry and cancel controls.</p>
        </article>
        <article className="panel">
          <p className="label">Published outputs</p>
          <h2>{data.summary.published}</h2>
          <p>Grouped by source idea below.</p>
        </article>
      </section>

      <section className="panel scheduler-filter-panel">
        <form className="content-form scheduler-filters">
          <label>
            Brand
            <select name="brandId" defaultValue={filters.brandId ?? "all"}>
              <option value="all">all brands</option>
              {data.brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Platform
            <select name="platform" defaultValue={filters.platform ?? "all"}>
              <option value="all">all platforms</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={filters.status ?? "all"}>
              <option value="all">all statuses</option>
              {jobStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source idea
            <select name="ideaId" defaultValue={filters.ideaId ?? "all"}>
              <option value="all">all ideas</option>
              {data.ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.title ?? "Untitled idea"}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input name="startDate" type="date" defaultValue={filters.startDate ?? ""} />
          </label>
          <label>
            To
            <input name="endDate" type="date" defaultValue={filters.endDate ?? ""} />
          </label>
          <button className="button secondary" type="submit">
            Apply filters
          </button>
          <Link className="button secondary" href="/scheduler">
            Clear
          </Link>
        </form>
      </section>

      <section className="detail-section">
        <div className="section-title">
          <div>
            <p className="label">Scheduled posts</p>
            <h2>{data.scheduledRows.length} publication job(s)</h2>
          </div>
        </div>
        <div className="scheduler-table">
          {data.scheduledRows.length > 0 ? (
            data.scheduledRows.map((row) => (
              <article className={`scheduler-row scheduler-row-${row.phase}`} key={row.job.id}>
                <div>
                  <span className="scheduler-platform">{row.job.platform}</span>
                  <h3>{row.title}</h3>
                  <p>
                    <Link href={`/brands/${row.brand.id}/content/${row.contentItem.id}`}>{row.contentItem.title ?? "Untitled idea"}</Link>
                    {" / "}
                    {row.brand.name}
                  </p>
                  <p className={row.integrationAccount ? "" : "warning-text"}>
                    Destination:{" "}
                    {row.integrationAccount
                      ? `${row.integrationAccount.externalAccountName ?? row.integrationAccount.externalAccountId} (${row.integrationAccount.status})`
                      : "No connected account for this platform yet. Add one in Brand Settings before live publishing."}
                  </p>
                  {row.job.lastError || row.latestResult?.errorMessage ? (
                    <p className="scheduler-error">{row.job.lastError ?? row.latestResult?.errorMessage}</p>
                  ) : null}
                </div>
                <div className="scheduler-row-meta">
                  <strong>{row.job.scheduledFor ? formatDateTime(row.job.scheduledFor) : "No schedule"}</strong>
                  <span>{row.variant.postType} / {row.variant.purpose}</span>
                  <span>attempts {row.job.attemptCount}</span>
                </div>
                <div className="scheduler-row-actions">
                  <span className={`status-pill status-${row.displayStatus.replaceAll("_", "-")}`}>{row.displayStatus}</span>
                  {row.isDue ? (
                    <form action={processPublicationJobAction}>
                      <input name="jobId" type="hidden" value={row.job.id} />
                      <button className="button secondary" type="submit">
                        Process
                      </button>
                    </form>
                  ) : null}
                  {row.job.status === "failed" || row.job.status === "skipped" ? (
                    <form action={retryPublicationJobAction}>
                      <input name="jobId" type="hidden" value={row.job.id} />
                      <button className="button secondary" type="submit">
                        Retry
                      </button>
                    </form>
                  ) : null}
                  {row.job.status !== "published" && row.job.status !== "cancelled" ? (
                    <form action={cancelPublicationJobAction}>
                      <input name="jobId" type="hidden" value={row.job.id} />
                      <button className="button secondary" type="submit">
                        Cancel
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <article className="panel empty-state">
              <p className="label">No scheduled jobs</p>
              <h2>No publication jobs match these filters.</h2>
              <p>Approved outputs create jobs when they are scheduled from the content editor.</p>
            </article>
          )}
        </div>
      </section>

      <section className="detail-section">
        <div className="section-title">
          <div>
            <p className="label">Published outputs and logs</p>
            <h2>{data.publishedRows.length} published artifact(s)</h2>
          </div>
        </div>
        <div className="published-log-groups">
          {data.publishedGroups.length > 0 ? (
            data.publishedGroups.map((group) => (
              <article className="panel published-log-group" key={group.contentItem.id}>
                <div className="section-title">
                  <div>
                    <p className="label">{group.brand.name}</p>
                    <h2>
                      <Link href={`/brands/${group.brand.id}/content/${group.contentItem.id}`}>
                        {group.contentItem.title ?? "Untitled idea"}
                      </Link>
                    </h2>
                  </div>
                  <span className="status-pill">{group.contentItem.status}</span>
                </div>
                <div className="published-platform-grid">
                  {group.platforms.map((platformGroup) => (
                    <div className="published-platform" key={platformGroup.platform}>
                      <h3>{platformGroup.platform}</h3>
                      {platformGroup.rows.map((row) => (
                        <div className="published-row" key={row.post.id}>
                          <div>
                            <strong>{row.title}</strong>
                            <span>{row.post.publishedAt ? formatDateTime(row.post.publishedAt) : formatDateTime(row.post.createdAt)}</span>
                            {row.latestResult?.errorMessage ? <p className="scheduler-error">{row.latestResult.errorMessage}</p> : null}
                          </div>
                          {row.post.externalUrl ? (
                            <a className="button secondary" href={row.post.externalUrl}>
                              Open
                            </a>
                          ) : (
                            <span className="status-pill">{row.post.status}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <article className="panel empty-state">
              <p className="label">No published outputs</p>
              <h2>No published artifacts match these filters.</h2>
              <p>The local stub worker creates published-post records from successful due jobs.</p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}

function normalizeFilters(params: SchedulerPageProps["searchParams"] extends Promise<infer T> ? T : never): SchedulerFilters {
  return {
    brandId: normalizeFilterValue(params.brandId),
    endDate: normalizeFilterValue(params.endDate),
    ideaId: normalizeFilterValue(params.ideaId),
    platform: normalizeFilterValue(params.platform),
    startDate: normalizeFilterValue(params.startDate),
    status: normalizeFilterValue(params.status)
  };
}

function normalizeFilterValue(value: string | undefined) {
  return value && value !== "all" ? value : undefined;
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
