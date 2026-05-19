import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandContentList } from "@/lib/workspace-data";

export const dynamic = "force-dynamic";

type BrandContentPageProps = {
  params: Promise<{
    brandId: string;
  }>;
};

export default async function BrandContentPage({ params }: BrandContentPageProps) {
  const { brandId } = await params;
  const contentList = await getBrandContentList(brandId);

  if (!contentList.ok) {
    notFound();
  }

  return (
    <main className="shell">
      <section className="page-heading">
        <p className="eyebrow">Content</p>
        <h1>{contentList.brand.name}</h1>
        <p className="lede">Brand-scoped content is the primary path for planning and editing.</p>
        <div className="actions">
          <Link className="button secondary" href={`/brands/${contentList.brand.id}`}>
            Brand detail
          </Link>
        </div>
      </section>

      <section className="list">
        {contentList.contentItems.map((contentItem) => (
          <article className="content-row" key={contentItem.id}>
            <div className="content-row-main">
              <p className="label">{contentItem.status}</p>
              <h2>
                <Link href={`/brands/${contentList.brand.id}/content/${contentItem.id}`}>
                  {contentItem.title ?? "Untitled content"}
                </Link>
              </h2>
              <p>{contentItem.brief ?? contentItem.masterContent ?? "No brief yet."}</p>
              <div className="meta-line">
                <span>Updated {formatDate(contentItem.updatedAt)}</span>
                <span>{contentItem.publicationJobCount} publication job(s)</span>
                <span>{contentItem.latestAutomationRun?.status ?? "automation idle"}</span>
              </div>
            </div>
            <div className="variant-chip-list" aria-label="Platform variants">
              {contentItem.variants.map((variant) => (
                <div className="variant-chip" key={variant.id}>
                  <strong>{variant.platform}</strong>
                  <span>{variant.status}</span>
                </div>
              ))}
            </div>
            <Link className="row-action" href={`/brands/${contentList.brand.id}/content/${contentItem.id}`}>
              Open
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
