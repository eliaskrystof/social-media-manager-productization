import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getAppSummary } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const summary = await getAppSummary();

  if (!summary.ok) {
    redirect("/onboarding");
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Local milestone 1</p>
          <h1>Orchard</h1>
          <p className="lede">
            A local-first skeleton for modelling brands, content, publishing outputs,
            approval, scheduling intent, and simulated automation status.
          </p>
        </div>
        <div className="status-panel">
          <span className={summary.ok ? "status-dot ok" : "status-dot"} />
          <div>
            <strong>{summary.ok ? "Workspace ready" : "Database not ready"}</strong>
            <p>{summary.message}</p>
          </div>
        </div>
      </section>

      {summary.ok ? (
        <section className="grid">
          <article className="panel">
            <p className="label">Current user</p>
            <h2>{summary.user?.displayName ?? "Local user"}</h2>
            <p>{summary.user?.email ?? "No local user found."}</p>
          </article>

          <article className="panel">
            <p className="label">Workspace</p>
            <h2>{summary.workspace.name}</h2>
            <p>{summary.workspace.status}</p>
          </article>

          <article className="panel">
            <p className="label">Brands</p>
            <h2>{summary.brandCount}</h2>
            <p>
              <Link href="/brands">Open all brands</Link>
            </p>
          </article>

          <article className="panel">
            <p className="label">Content items</p>
            <h2>{summary.contentCount}</h2>
            <p>Brand-scoped content is the primary editing path.</p>
          </article>

          <article className="panel">
            <p className="label">Latest automation</p>
            <h2>{summary.latestAutomationRun?.status ?? "idle"}</h2>
            <p>{summary.latestAutomationRun?.runType ?? "No automation run recorded."}</p>
          </article>

          <article className="panel">
            <p className="label">Latest activity</p>
            <h2>{summary.latestActivity?.action ?? "none"}</h2>
            <p>{summary.latestActivity?.message ?? "No activity recorded."}</p>
          </article>

          <section className="panel wide dashboard-section">
            <div className="section-title">
              <div>
                <p className="label">Brand workspaces</p>
                <h2>Active brands</h2>
              </div>
              <Link href="/brands">View list</Link>
            </div>
            <div className="tile-grid">
              {summary.brands.map((brand) => (
                <Link className="brand-tile" href={`/brands/${brand.id}`} key={brand.id}>
                  <span>{brand.status}</span>
                  <strong>{brand.name}</strong>
                  <small>{brand.contentCount} content item(s)</small>
                </Link>
              ))}
            </div>
          </section>

          {summary.latestContentItem ? (
            <article className="panel dashboard-section">
              <p className="label">Continue editing</p>
              <h2>{summary.latestContentItem.contentItem.title ?? "Untitled content"}</h2>
              <p>{summary.latestContentItem.brand.name}</p>
              <Link
                className="button secondary"
                href={`/brands/${summary.latestContentItem.brand.id}/content/${summary.latestContentItem.contentItem.id}`}
              >
                Open draft
              </Link>
            </article>
          ) : null}
        </section>
      ) : (
        <section className="panel wide">
          <p className="label">Setup</p>
          <h2>Run the local database commands</h2>
          <pre>npm run db:migrate{"\n"}npm run db:seed</pre>
        </section>
      )}
    </main>
  );
}
