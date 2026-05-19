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
          <article className="row-card" key={contentItem.id}>
            <div>
              <p className="label">{contentItem.status}</p>
              <h2>{contentItem.title ?? "Untitled content"}</h2>
              <p>{contentItem.brief ?? contentItem.masterContent ?? "No brief yet."}</p>
            </div>
            <div className="platforms compact">
              {contentItem.variants.map((variant) => (
                <div className="platform" key={variant.id}>
                  <strong>{variant.platform}</strong>
                  <span>{variant.status}</span>
                  <p>{variant.caption ?? "No caption yet."}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
