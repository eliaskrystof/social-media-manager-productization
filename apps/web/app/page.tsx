import { getLocalOverview } from "@/lib/local-overview";

export const dynamic = "force-dynamic";

const platforms = ["instagram", "facebook", "linkedin"] as const;

export default async function HomePage() {
  const overview = await getLocalOverview();

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Local milestone 1</p>
          <h1>Orchard</h1>
          <p className="lede">
            A local-first skeleton for modelling brands, content, platform variants,
            approval, scheduling intent, and simulated automation status.
          </p>
        </div>
        <div className="status-panel">
          <span className={overview.ok ? "status-dot ok" : "status-dot"} />
          <div>
            <strong>{overview.ok ? "Seeded workspace ready" : "Database not ready"}</strong>
            <p>{overview.message}</p>
          </div>
        </div>
      </section>

      {overview.ok ? (
        <section className="grid">
          <article className="panel">
            <p className="label">Workspace</p>
            <h2>{overview.workspace.name}</h2>
            <p>{overview.brand.name}</p>
          </article>

          <article className="panel">
            <p className="label">Brand profile</p>
            <h2>{overview.profile?.toneOfVoice ?? "Profile draft"}</h2>
            <p>{overview.profile?.targetAudience ?? "No target audience yet."}</p>
          </article>

          <article className="panel wide">
            <p className="label">Demo content</p>
            <h2>{overview.content.title}</h2>
            <p>{overview.content.brief}</p>
            <div className="platforms">
              {platforms.map((platform) => {
                const variant = overview.variants.find((item) => item.platform === platform);
                return (
                  <div className="platform" key={platform}>
                    <strong>{platform}</strong>
                    <span>{variant?.status ?? "draft"}</span>
                    <p>{variant?.caption ?? "Variant placeholder"}</p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="panel">
            <p className="label">Automation</p>
            <h2>{overview.latestRun?.status ?? "idle"}</h2>
            <p>{overview.latestRun?.runType ?? "No automation run recorded."}</p>
          </article>
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
