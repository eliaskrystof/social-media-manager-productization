import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandDetail } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

type BrandDetailPageProps = {
  params: Promise<{
    brandId: string;
  }>;
};

export default async function BrandDetailPage({ params }: BrandDetailPageProps) {
  const { brandId } = await params;
  const detail = await getBrandDetail(brandId);

  if (!detail.ok) {
    notFound();
  }

  return (
    <main className="shell">
      <section className="page-heading">
        <p className="eyebrow">Active brand workspace</p>
        <h1>{detail.brand.name}</h1>
        <p className="lede">{detail.profile?.description ?? "Brand profile is ready for onboarding details."}</p>
        <div className="actions">
          <Link className="button" href={`/brands/${detail.brand.id}/content`}>
            View content
          </Link>
          <Link className="button secondary" href={`/brands/${detail.brand.id}/settings`}>
            Brand settings
          </Link>
          <Link className="button secondary" href="/brands">
            All brands
          </Link>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <p className="label">Tone</p>
          <h2>{detail.profile?.toneOfVoice ?? "Not set"}</h2>
          <p>{detail.profile?.preferredStyle ?? "No preferred style yet."}</p>
        </article>

        <article className="panel">
          <p className="label">Audience</p>
          <h2>Target</h2>
          <p>{detail.profile?.targetAudience ?? "No target audience yet."}</p>
        </article>

        <article className="panel">
          <p className="label">Content</p>
          <h2>{detail.contentItems.length}</h2>
          <p>Content items for this brand.</p>
        </article>

        <article className="panel wide">
          <p className="label">Content pillars</p>
          <div className="chips">
            {(detail.profile?.contentPillars ?? ["No pillars yet"]).map((pillar) => (
              <span key={pillar}>{pillar}</span>
            ))}
          </div>
        </article>

        <article className="panel wide">
          <p className="label">Recent content</p>
          <div className="compact-list">
            {detail.contentItems.map((item) => (
              <Link href={`/brands/${detail.brand.id}/content`} key={item.id}>
                <strong>{item.title ?? "Untitled content"}</strong>
                <span>{item.status}</span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
